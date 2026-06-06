import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!config.smtp.user || !config.smtp.pass) {
      console.log('SMTP not configured. Email skipped:', options.subject);
      return false;
    }

    await transporter.sendMail({
      from: config.smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    console.log(`Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function buildPurchaseOrderEmail(poNumber: string, vendorName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a56db; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">VendorBridge</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2>Purchase Order: ${poNumber}</h2>
        <p>Dear ${vendorName},</p>
        <p>A new purchase order <strong>${poNumber}</strong> has been created for your company.</p>
        <p>Please find the purchase order document attached to this email.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated email from VendorBridge ERP.</p>
      </div>
    </div>
  `;
}

export function buildInvoiceEmail(invoiceNumber: string, vendorName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a56db; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">VendorBridge</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2>Invoice: ${invoiceNumber}</h2>
        <p>Dear ${vendorName},</p>
        <p>Please find the invoice <strong>${invoiceNumber}</strong> attached to this email.</p>
        <p>Kindly review and process the payment at your earliest convenience.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated email from VendorBridge ERP.</p>
      </div>
    </div>
  `;
}

export function buildRFQInvitationEmail(rfqNumber: string, rfqTitle: string, deadline: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a56db; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">VendorBridge</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2>New RFQ Invitation: ${rfqNumber}</h2>
        <p>You have been invited to submit a quotation for:</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>RFQ:</strong> ${rfqTitle}</p>
          <p><strong>Deadline:</strong> ${deadline}</p>
        </div>
        <p>Please log in to VendorBridge to view the full details and submit your quotation.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated email from VendorBridge ERP.</p>
      </div>
    </div>
  `;
}
