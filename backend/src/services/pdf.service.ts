import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import { formatCurrency } from '../utils/helpers';

interface PDFTableRow {
  cells: string[];
}

async function drawHeader(page: PDFPage, font: PDFFont, boldFont: PDFFont, title: string, docNumber: string) {
  const { width, height } = page.getSize();

  // Company header
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: rgb(0.102, 0.337, 0.859),
  });

  page.drawText('VendorBridge ERP', {
    x: 50,
    y: height - 45,
    size: 22,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText('Procurement Management System', {
    x: 50,
    y: height - 65,
    size: 10,
    font: font,
    color: rgb(0.85, 0.85, 0.95),
  });

  // Document title
  page.drawText(title, {
    x: 50,
    y: height - 110,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(docNumber, {
    x: 50,
    y: height - 130,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return height - 150;
}

function drawInfoBlock(page: PDFPage, font: PDFFont, boldFont: PDFFont, x: number, y: number, label: string, lines: string[]): number {
  page.drawText(label, {
    x,
    y,
    size: 10,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  let currentY = y - 18;
  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size: 9,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    currentY -= 14;
  }

  return currentY;
}

function drawTable(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  startY: number,
  headers: string[],
  rows: PDFTableRow[],
  colWidths: number[]
) {
  const { width } = page.getSize();
  const tableX = 50;
  let y = startY;
  const rowHeight = 22;

  // Header background
  page.drawRectangle({
    x: tableX,
    y: y - rowHeight + 5,
    width: width - 100,
    height: rowHeight,
    color: rgb(0.93, 0.94, 0.96),
  });

  // Draw headers
  let x = tableX + 5;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x,
      y: y - 12,
      size: 8,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    x += colWidths[i];
  }

  y -= rowHeight;

  // Draw rows
  for (let r = 0; r < rows.length; r++) {
    if (r % 2 === 1) {
      page.drawRectangle({
        x: tableX,
        y: y - rowHeight + 5,
        width: width - 100,
        height: rowHeight,
        color: rgb(0.97, 0.97, 0.98),
      });
    }

    x = tableX + 5;
    for (let c = 0; c < rows[r].cells.length; c++) {
      const text = rows[r].cells[c] || '';
      page.drawText(text.substring(0, 40), {
        x,
        y: y - 12,
        size: 8,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      x += colWidths[c];
    }
    y -= rowHeight;
  }

  // Bottom line
  page.drawLine({
    start: { x: tableX, y: y + 5 },
    end: { x: width - 50, y: y + 5 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  return y;
}

export interface POPdfData {
  poNumber: string;
  date: string;
  vendorName: string;
  vendorEmail: string;
  vendorAddress: string;
  vendorGst: string;
  items: Array<{
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}

export async function generatePurchaseOrderPDF(data: POPdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = await drawHeader(page, font, boldFont, 'PURCHASE ORDER', data.poNumber);

  // Date
  page.drawText(`Date: ${data.date}`, {
    x: 400,
    y: y + 20,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 20;

  // Vendor info
  y = drawInfoBlock(page, font, boldFont, 50, y, 'VENDOR:', [
    data.vendorName,
    data.vendorEmail,
    data.vendorAddress || 'N/A',
    `GST: ${data.vendorGst || 'N/A'}`,
  ]);

  y -= 20;

  // Items table
  const headers = ['#', 'Item', 'Qty', 'Unit', 'Unit Price', 'Total'];
  const colWidths = [30, 180, 60, 60, 80, 85];

  const rows: PDFTableRow[] = data.items.map((item, index) => ({
    cells: [
      String(index + 1),
      item.itemName,
      String(item.quantity),
      item.unit,
      formatCurrency(item.unitPrice),
      formatCurrency(item.totalPrice),
    ],
  }));

  y = drawTable(page, font, boldFont, y, headers, rows, colWidths);

  y -= 20;

  // Totals
  const totalsX = 380;
  page.drawText('Subtotal:', { x: totalsX, y, size: 10, font: font, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(formatCurrency(data.subtotal), { x: totalsX + 100, y, size: 10, font: font, color: rgb(0.1, 0.1, 0.1) });
  y -= 18;

  page.drawText('GST (18%):', { x: totalsX, y, size: 10, font: font, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(formatCurrency(data.gstAmount), { x: totalsX + 100, y, size: 10, font: font, color: rgb(0.1, 0.1, 0.1) });
  y -= 18;

  page.drawRectangle({
    x: totalsX - 5,
    y: y - 5,
    width: 200,
    height: 22,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('Grand Total:', { x: totalsX, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(formatCurrency(data.grandTotal), { x: totalsX + 100, y, size: 11, font: boldFont, color: rgb(0.102, 0.337, 0.859) });

  y -= 60;

  // Terms
  page.drawText('Terms & Conditions:', { x: 50, y, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
  y -= 16;
  const terms = [
    '1. Delivery must be made within the agreed timeline.',
    '2. All items must meet the quality specifications mentioned.',
    '3. Payment will be processed within 30 days of invoice receipt.',
    '4. This PO is subject to our standard terms and conditions.',
  ];
  for (const term of terms) {
    page.drawText(term, { x: 50, y, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export interface InvoicePdfData {
  invoiceNumber: string;
  date: string;
  vendorName: string;
  vendorEmail: string;
  vendorAddress: string;
  vendorGst: string;
  poNumber: string;
  items: Array<{
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    gstAmount: number;
    totalPrice: number;
  }>;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
}

export async function generateInvoicePDF(data: InvoicePdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = await drawHeader(page, font, boldFont, 'INVOICE', data.invoiceNumber);

  page.drawText(`Date: ${data.date}`, {
    x: 400,
    y: y + 20,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 10;

  page.drawText(`PO Reference: ${data.poNumber}`, {
    x: 400,
    y: y + 10,
    size: 9,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 15;

  y = drawInfoBlock(page, font, boldFont, 50, y, 'VENDOR:', [
    data.vendorName,
    data.vendorEmail,
    data.vendorAddress || 'N/A',
    `GST: ${data.vendorGst || 'N/A'}`,
  ]);

  y -= 20;

  const headers = ['#', 'Item', 'Qty', 'Unit', 'Price', 'GST', 'Total'];
  const colWidths = [25, 150, 50, 50, 70, 70, 80];

  const rows: PDFTableRow[] = data.items.map((item, index) => ({
    cells: [
      String(index + 1),
      item.itemName,
      String(item.quantity),
      item.unit,
      formatCurrency(item.unitPrice),
      formatCurrency(item.gstAmount),
      formatCurrency(item.totalPrice),
    ],
  }));

  y = drawTable(page, font, boldFont, y, headers, rows, colWidths);

  y -= 20;

  const totalsX = 370;
  page.drawText('Subtotal:', { x: totalsX, y, size: 10, font: font, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(formatCurrency(data.subtotal), { x: totalsX + 110, y, size: 10, font: font, color: rgb(0.1, 0.1, 0.1) });
  y -= 18;

  page.drawText(`GST (${data.gstRate}%):`, { x: totalsX, y, size: 10, font: font, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(formatCurrency(data.gstAmount), { x: totalsX + 110, y, size: 10, font: font, color: rgb(0.1, 0.1, 0.1) });
  y -= 18;

  page.drawRectangle({
    x: totalsX - 5,
    y: y - 5,
    width: 210,
    height: 22,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('Grand Total:', { x: totalsX, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(formatCurrency(data.grandTotal), { x: totalsX + 110, y, size: 11, font: boldFont, color: rgb(0.102, 0.337, 0.859) });

  y -= 60;

  page.drawText('Payment Terms:', { x: 50, y, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
  y -= 16;
  page.drawText('Payment is due within 30 days of the invoice date.', { x: 50, y, size: 9, font: font, color: rgb(0.4, 0.4, 0.4) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateReportPDF(
  title: string,
  headers: string[],
  rows: string[][],
  summary?: Record<string, string>
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = await drawHeader(page, font, boldFont, title, `Generated: ${new Date().toLocaleDateString()}`);

  y -= 20;

  if (summary) {
    for (const [key, value] of Object.entries(summary)) {
      page.drawText(`${key}: ${value}`, { x: 50, y, size: 10, font: font, color: rgb(0.2, 0.2, 0.2) });
      y -= 16;
    }
    y -= 10;
  }

  const colWidth = Math.floor((595.28 - 100) / headers.length);
  const colWidths = headers.map(() => colWidth);

  const tableRows: PDFTableRow[] = rows.map((row) => ({ cells: row }));
  drawTable(page, font, boldFont, y, headers, tableRows, colWidths);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
