import { useState } from 'react';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, PlusCircle, Search, Star, Award, CheckCircle, Scale, Eye, Loader2, ArrowRight } from 'lucide-react';

interface QuotationItem {
  id: string;
  rfqItem: {
    itemName: string;
    quantity: number;
    unit: string;
    expectedPrice: number | null;
  };
  unitPrice: number;
  totalPrice: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  totalAmount: number;
  deliveryDays: number;
  notes: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  rfq: {
    id: string;
    rfqNumber: string;
    title: string;
    status: string;
    deadline: string;
    items: Array<{
      id: string;
      itemName: string;
      quantity: number;
      unit: string;
      expectedPrice: number | null;
    }>;
  };
  vendor: {
    id: string;
    companyName: string;
    email: string;
    rating: number;
    performanceScore: number;
  };
  items: QuotationItem[];
}

interface ComparisonResult {
  rfq: {
    id: string;
    rfqNumber: string;
    title: string;
    category: string;
    deadline: string;
  };
  comparisons: Array<{
    vendorId: string;
    vendorName: string;
    quotationId: string;
    totalAmount: number;
    deliveryDays: number;
    rating: number;
    performanceScore: number;
    priceScore: number;
    ratingScore: number;
    deliveryScore: number;
    totalScore: number;
    rank: number;
    isRecommended: boolean;
    items: Array<{
      rfqItemName: string;
      rfqItemQuantity: number;
      rfqItemUnit: string;
      unitPrice: number;
      totalPrice: number;
    }>;
  }>;
  recommendedVendor: any | null;
}

export default function Quotations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Submit Quote States
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [deliveryDays, setDeliveryDays] = useState(1);
  const [notes, setNotes] = useState('');
  const [quoteItems, setQuoteItems] = useState<Array<{ rfqItemId: string; itemName: string; unitPrice: number; quantity: number }>>([]);

  // Selected details
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  
  // Compare State
  const [compareRfqId, setCompareRfqId] = useState('');

  // Fetch Quotations list
  const { data: quoteData, isLoading, refetch } = useApi<{ data: Quotation[] }>({
    url: '/quotations',
    params: { search: search || undefined },
  });

  // Fetch RFQs for dropdown (Vendors can only see published RFQs they're invited to)
  const { data: rfqData } = useApi<{ data: any[] }>({
    url: '/rfqs',
    params: { status: 'PUBLISHED' },
  });

  // Fetch comparison stats when compare dialog is open
  const { data: comparisonData, refetch: refetchComparison } = useApi<ComparisonResult>({
    url: `/quotations/rfq/${compareRfqId}/compare`,
    immediate: false,
  });

  const { mutate, isLoading: isMutating } = useApiMutation();

  const quotations = Array.isArray(quoteData) ? quoteData : (quoteData as any)?.data || [];
  const rfqs = Array.isArray(rfqData) ? rfqData : (rfqData as any)?.data || [];
  const comparison = comparisonData as ComparisonResult;

  const isVendor = user?.role === 'vendor';
  const isPO = user?.role === 'procurement_officer' || user?.role === 'admin';

  // When vendor selects RFQ to quote, populate item fields
  const handleRfqSelect = (rfqId: string) => {
    setSelectedRfqId(rfqId);
    const selectedRfq = rfqs.find((r: any) => r.id === rfqId);
    if (selectedRfq && selectedRfq.items) {
      setQuoteItems(
        selectedRfq.items.map((item: any) => ({
          rfqItemId: item.id,
          itemName: item.itemName,
          unitPrice: 0,
          quantity: item.quantity,
        }))
      );
    }
  };

  const handleUnitPriceChange = (index: number, val: number) => {
    const newItems = [...quoteItems];
    newItems[index].unitPrice = val;
    setQuoteItems(newItems);
  };

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        rfqId: selectedRfqId,
        deliveryDays: Number(deliveryDays),
        notes,
        items: quoteItems.map((item) => ({
          rfqItemId: item.rfqItemId,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.unitPrice) * item.quantity,
        })),
      };

      const res: any = await mutate('post', '/quotations', payload);
      const quoteId = res.data?.id || res.id;

      // Automatically submit the quotation (instead of leaving as draft)
      await mutate('post', `/quotations/${quoteId}/submit`);

      toast({ title: 'Success', description: 'Quotation submitted successfully!' });
      setIsSubmitOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to submit quotation.', variant: 'destructive' });
    }
  };

  const handleSendApprovalRequest = async (rfqId: string, quotationId: string) => {
    try {
      await mutate('post', '/approvals', {
        rfqId,
        quotationId,
        comments: 'Recommended via weighted pricing comparison engine.',
      });
      toast({ title: 'Sent for Approval', description: 'Quotation sent to manager approval queue.' });
      setIsCompareOpen(false);
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to submit approval request.', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedRfqId('');
    setDeliveryDays(1);
    setNotes('');
    setQuoteItems([]);
  };

  const openComparison = (rfqId: string) => {
    setCompareRfqId(rfqId);
    setIsCompareOpen(true);
    setTimeout(() => {
      refetchComparison();
    }, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'ACCEPTED':
        return 'bg-emerald-100 text-emerald-800';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit pricing, analyze side-by-side matrices, and send selections for management approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isVendor && (
            <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={resetForm}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Submit Quotation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Submit Quotation</DialogTitle>
                  <DialogDescription>Input pricing details and delivery timelines for the invited RFQ.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitQuotation} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rfqSelect">Select Invited RFQ</Label>
                    <Select value={selectedRfqId} onValueChange={handleRfqSelect}>
                      <SelectTrigger id="rfqSelect">
                        <SelectValue placeholder="Choose an RFQ" />
                      </SelectTrigger>
                      <SelectContent>
                        {rfqs.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.rfqNumber} — {r.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {quoteItems.length > 0 && (
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <Label className="font-semibold text-slate-700 text-sm">Quote Unit Prices (INR)</Label>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {quoteItems.map((item, index) => (
                          <div key={item.rfqItemId} className="flex items-center justify-between gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div className="flex-grow">
                              <span className="text-xs font-semibold text-slate-800 block">{item.itemName}</span>
                              <span className="text-xs text-slate-400">Required: {item.quantity} units</span>
                            </div>
                            <div className="flex items-center gap-1.5 w-1/3">
                              <span className="text-sm font-semibold text-slate-500">₹</span>
                              <Input
                                type="number"
                                placeholder="Unit Price"
                                value={item.unitPrice}
                                onChange={(e) => handleUnitPriceChange(index, Number(e.target.value))}
                                required
                                className="h-8"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="deliveryDays">Delivery Timeline (Days)</Label>
                      <Input id="deliveryDays" type="number" min="1" value={deliveryDays} onChange={(e) => setDeliveryDays(Number(e.target.value))} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="notes">Notes/Comments</Label>
                      <Textarea id="notes" placeholder="Any warranty, discount or specifications info..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                    </div>
                  </div>

                  <DialogFooter className="pt-2 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => setIsSubmitOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isMutating || quoteItems.length === 0}>
                      {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Submit Quotation
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Quotations List Table */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" /> Loading quotations...
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-3" /> No quotations submitted yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                  <TableHead className="font-semibold text-slate-700">Quote Number</TableHead>
                  <TableHead className="font-semibold text-slate-700">RFQ Reference</TableHead>
                  {!isVendor && <TableHead className="font-semibold text-slate-700">Supplier</TableHead>}
                  <TableHead className="font-semibold text-slate-700 text-right">Total Amount</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Delivery (Days)</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((quote: Quotation) => (
                  <TableRow key={quote.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium font-mono text-slate-900">{quote.quotationNumber}</TableCell>
                    <TableCell>
                      <div>{quote.rfq.rfqNumber}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{quote.rfq.title}</div>
                    </TableCell>
                    {!isVendor && (
                      <TableCell className="font-semibold text-slate-800">
                        {quote.vendor.companyName}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-bold text-slate-900">₹{quote.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-slate-700">{quote.deliveryDays} days</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => { setSelectedQuote(quote); setIsDetailOpen(true); }} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isPO && quote.rfq.status === 'PUBLISHED' && (
                          <Button size="sm" variant="outline" className="text-indigo-600 hover:text-indigo-700 font-semibold border-indigo-200" onClick={() => openComparison(quote.rfq.id)}>
                            <Scale className="mr-1.5 h-3.5 w-3.5" /> Compare Quotes
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quote Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {selectedQuote && (
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div>
                  <Badge variant="secondary" className="font-mono text-xs">{selectedQuote.quotationNumber}</Badge>
                  <DialogTitle className="text-lg font-bold mt-1">Quotation Specifications</DialogTitle>
                </div>
                <Badge className={`${getStatusColor(selectedQuote.status)}`}>{selectedQuote.status}</Badge>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">Supplier Company</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedQuote.vendor.companyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">RFQ Requisition</span>
                  <span className="font-bold text-slate-800 block mt-0.5 font-mono">{selectedQuote.rfq.rfqNumber}</span>
                </div>
              </div>

              <div>
                <Label className="font-semibold text-slate-700 text-sm">Quoted Pricing Breakdown</Label>
                <div className="border border-slate-200 rounded-lg overflow-hidden mt-1.5">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-xs py-2">Item Details</TableHead>
                        <TableHead className="font-semibold text-xs py-2 text-right">Unit Price</TableHead>
                        <TableHead className="font-semibold text-xs py-2 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuote.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-900">
                            <div>{item.rfqItem.itemName}</div>
                            <div className="text-xs text-slate-400">Qty: {item.rfqItem.quantity} {item.rfqItem.unit}</div>
                          </TableCell>
                          <TableCell className="text-right text-slate-700">₹{item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900">₹{item.totalPrice.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                        <TableCell className="font-bold text-slate-900">Grand Total</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-black text-slate-950 text-base">₹{selectedQuote.totalAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-lg border">
                <div>Delivery Days: <span className="font-black text-slate-900">{selectedQuote.deliveryDays} Days</span></div>
                <div>Supplier Rating: <span className="text-amber-500 font-bold flex items-center gap-0.5 mt-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {selectedQuote.vendor.rating.toFixed(1)}/5.0</span></div>
              </div>

              {selectedQuote.notes && (
                <div>
                  <Label className="text-slate-400 text-xs font-semibold">Special Notes</Label>
                  <p className="p-2.5 border border-slate-100 rounded bg-slate-50/50 text-slate-700 italic text-xs mt-1">{selectedQuote.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Quotation Comparison Matrix Dialog */}
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Scale className="h-6 w-6 text-indigo-600" />
              Side-by-Side Quotation Comparison Matrix
            </DialogTitle>
            <DialogDescription>
              Weighed recommendation scores calculated from Price (40%), Rating (30%), Delivery (20%), and Performance (10%).
            </DialogDescription>
          </DialogHeader>

          {!comparison ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-2" /> Evaluating quotations...
            </div>
          ) : comparison.comparisons?.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No submitted quotes found for this RFQ yet.</div>
          ) : (
            <div className="space-y-6 py-2">
              {/* Recommended Panel */}
              {comparison.recommendedVendor && (
                <div className="bg-emerald-50 border-2 border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                  <div>
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black mb-1.5 flex items-center gap-1 w-fit">
                      <CheckCircle className="h-3.5 w-3.5 fill-white text-emerald-600" /> Auto-Recommended Supplier
                    </Badge>
                    <h3 className="text-lg font-bold text-slate-900">{comparison.recommendedVendor.vendorName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Highest total compatibility score of <span className="font-bold text-emerald-700">{comparison.recommendedVendor.totalScore} points</span>.</p>
                  </div>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 shadow font-bold text-sm shrink-0" onClick={() => handleSendApprovalRequest(comparison.rfq.id, comparison.recommendedVendor.quotationId)}>
                    Send Selection for Approval <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Side-by-Side Grid */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700">Metrics & Items</TableHead>
                      {comparison.comparisons.map((c) => (
                        <TableHead key={c.vendorId} className="font-bold text-slate-900 text-center border-l border-slate-100 min-w-[200px]">
                          <div>{c.vendorName}</div>
                          <div className="mt-1 text-xs">
                            {c.isRecommended ? (
                              <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold">Recommended</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-bold">Rank #{c.rank}</Badge>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold text-xs text-slate-500 uppercase">Grand Total Price</TableCell>
                      {comparison.comparisons.map((c) => (
                        <TableCell key={c.vendorId} className="text-center font-black text-slate-900 text-base border-l border-slate-100 bg-slate-50/20">
                          ₹{c.totalAmount.toLocaleString()}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-xs text-slate-500 uppercase">Delivery Timeline</TableCell>
                      {comparison.comparisons.map((c) => (
                        <TableCell key={c.vendorId} className="text-center font-bold text-slate-800 border-l border-slate-100">
                          {c.deliveryDays} Days
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-xs text-slate-500 uppercase">Supplier Star Rating</TableCell>
                      {comparison.comparisons.map((c) => (
                        <TableCell key={c.vendorId} className="text-center font-semibold text-slate-800 border-l border-slate-100">
                          <div className="flex items-center justify-center gap-1 text-amber-500">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {c.rating.toFixed(1)}/5.0
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-xs text-slate-500 uppercase">Previous Performance</TableCell>
                      {comparison.comparisons.map((c) => (
                        <TableCell key={c.vendorId} className="text-center font-bold text-slate-800 border-l border-slate-100">
                          <div className="flex items-center justify-center gap-1 text-indigo-600">
                            <Award className="h-4 w-4" /> {c.performanceScore}%
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="bg-indigo-50/35">
                      <TableCell className="font-bold text-xs text-indigo-800 uppercase">Weighted Total Score</TableCell>
                      {comparison.comparisons.map((c) => (
                        <TableCell key={c.vendorId} className="text-center font-black text-indigo-700 text-lg border-l border-slate-100 bg-indigo-50/20">
                          {c.totalScore} pts
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Item by Item comparison */}
                    <TableRow className="bg-slate-50/75 font-semibold text-xs text-slate-500">
                      <TableCell colSpan={comparison.comparisons.length + 1} className="py-2.5 uppercase tracking-wide">
                        Itemized Pricing Breakdown
                      </TableCell>
                    </TableRow>
                    {comparison.comparisons[0]?.items.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/20">
                        <TableCell className="font-medium text-slate-800">
                          <div>{item.rfqItemName}</div>
                          <div className="text-xs text-slate-400">Qty: {item.rfqItemQuantity} {item.rfqItemUnit}</div>
                        </TableCell>
                        {comparison.comparisons.map((c) => {
                          const cItem = c.items[idx];
                          return (
                            <TableCell key={c.vendorId} className="text-center border-l border-slate-100 text-xs text-slate-700">
                              <div className="font-semibold">₹{cItem.unitPrice} / unit</div>
                              <div className="text-slate-400 mt-0.5">Total: ₹{cItem.totalPrice.toLocaleString()}</div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Action grid for all options */}
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsCompareOpen(false)}>Cancel</Button>
                {comparison.comparisons.map((c) => (
                  <Button key={c.vendorId} variant="outline" size="sm" className="font-semibold text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => handleSendApprovalRequest(comparison.rfq.id, c.quotationId)}>
                    Approve {c.vendorName}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
