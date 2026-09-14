'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import PhoneSheet from '@/components/PhoneSheet';
import {
  useGetTodaySalesQuery,
  useGetProductsQuery,
  useGetCreditCustomersQuery,
  useCreateOrderMutation,
  useAddCreditPaymentMutation,
} from '@/store/api';

type Product = {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  unit?: string;
  supportsOpenSale?: boolean;
  supportsPacketSale?: boolean;
  openRate?: number | null;
  openRateUnit?: string;
  packetPrice?: number | null;
};
type LineItem = {
  productId: string;
  name: string;
  quantity: string;
  price: string;
  size: string;
  saleType: 'open' | 'packet';
};
type SoldItem = {
  orderId: string;
  productName: string;
  quantity: number;
  sellPrice: number;
  purchasePrice: number;
  lineTotal: number;
  profit: number;
  customer: string;
  paymentMethod?: string;
  paymentMode?: string | null;
  paymentStatus?: string;
};

type OrderItem = {
  product?: { name?: string; price?: number } | string;
  quantity?: number;
  price?: number;
  selectedSize?: string;
  saleType?: string;
};

type SaleOrder = {
  _id: string;
  total?: number;
  paymentMethod?: string;
  paymentMode?: string | null;
  paymentStatus?: string;
  created_at?: string;
  items?: OrderItem[];
  shippingAddress?: { name?: string; phone?: string };
  user?: { name?: string };
};

type Report = {
  date: string;
  orderCount: number;
  totalSales: number;
  totalProfit: number;
  soldItems: SoldItem[];
  orders?: SaleOrder[];
};

type CreditCustomer = {
  _id: string;
  name: string;
  phone?: string;
  balance: number;
};

type BillData = {
  billNo: string;
  date: string;
  customer: string;
  paymentLabel: string;
  items: { name: string; qty: number; rate: number; amount: number; size?: string; saleType?: string }[];
  total: number;
};

type PayMode = 'cash' | 'online' | 'udhar';

const SHOP_NAME = 'Bhagwati Enterprises';
const SHOP_PHONE = '8769035925';
const SHOP_ADDRESS = 'Shop No. 5, Main C Road, Opposite Ankur Hospital, Jodhpur 342006';

function emptyLine(): LineItem {
  return { productId: '', name: '', quantity: '1', price: '', size: '', saleType: 'packet' };
}

function getPacketPrice(p: Product) {
  return p.packetPrice != null ? p.packetPrice : p.price;
}

function getOpenRate(p: Product) {
  return p.openRate != null ? p.openRate : p.price;
}

function getQtyLabel(p: Product | undefined, saleType: 'open' | 'packet') {
  if (saleType === 'open' && p?.openRateUnit) {
    if (p.openRateUnit === 'kg') return 'Qty (kg)';
    if (p.openRateUnit === '100g') return 'Qty (×100g)';
    if (p.openRateUnit === 'g') return 'Qty (g)';
    return `Qty (${p.openRateUnit})`;
  }
  return 'Qty (packets)';
}

function payBadge(item: { paymentMethod?: string; paymentMode?: string | null }) {
  if (item.paymentMethod === 'udhar') return { text: 'Udhar', cls: 'bg-amber-100 text-amber-800' };
  if (item.paymentMethod === 'retail') {
    if (item.paymentMode === 'online') return { text: 'Online', cls: 'bg-blue-100 text-blue-800' };
    return { text: 'Cash', cls: 'bg-green-100 text-green-800' };
  }
  if (item.paymentMethod === 'qr') return { text: 'QR', cls: 'bg-blue-100 text-blue-800' };
  if (item.paymentMethod === 'cod') return { text: 'COD', cls: 'bg-gray-100 text-gray-700' };
  return { text: item.paymentMethod || '—', cls: 'bg-gray-100 text-gray-600' };
}

function paymentLabelFor(order: SaleOrder) {
  if (order.paymentMethod === 'udhar') return 'UDHAR (Credit)';
  if (order.paymentMethod === 'retail') {
    return order.paymentMode === 'online' ? 'Online (UPI / Bank)' : 'Cash';
  }
  if (order.paymentMethod === 'qr') return 'QR Payment';
  if (order.paymentMethod === 'cod') return 'Cash on Delivery';
  return order.paymentMethod || '—';
}

function formatBillDate(d?: string) {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return d || '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

function orderToBill(order: SaleOrder): BillData {
  const items = (order.items || []).map((it) => {
    const name =
      typeof it.product === 'object' && it.product?.name
        ? it.product.name
        : 'Product';
    const qty = it.quantity || 0;
    const rate = it.price ?? 0;
    return {
      name,
      qty,
      rate,
      amount: qty * rate,
      size: it.selectedSize || undefined,
      saleType: it.saleType === 'open' ? 'Khula' : it.saleType === 'packet' ? 'Packet' : undefined,
    };
  });
  return {
    billNo: String(order._id).slice(-8).toUpperCase(),
    date: formatBillDate(order.created_at),
    customer:
      order.shippingAddress?.name ||
      order.user?.name ||
      (order.paymentMethod === 'retail' || order.paymentMethod === 'udhar' ? 'Walk-in Customer' : 'Customer'),
    paymentLabel: paymentLabelFor(order),
    items,
    total: order.total ?? items.reduce((s, i) => s + i.amount, 0),
  };
}

function BillPrint({ bill, onClose }: { bill: BillData; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const receiptCss = `
    .rcpt{font-family:"Courier New",Courier,monospace;width:72mm;max-width:100%;margin:0 auto;color:#000;font-size:11px;line-height:1.25}
    .rcpt .center{text-align:center}
    .rcpt .shop-name{font-size:14px;font-weight:700;letter-spacing:.3px;text-transform:uppercase}
    .rcpt .addr{font-size:9px;margin-top:3px;line-height:1.35}
    .rcpt .phone{font-size:10px;font-weight:700;margin-top:3px}
    .rcpt .dash{border:none;border-top:1px dashed #000;margin:6px 0}
    .rcpt .meta{font-size:10px}
    .rcpt .meta-row{display:flex;justify-content:space-between;gap:6px}
    .rcpt table{width:100%;border-collapse:collapse;font-size:10px}
    .rcpt th{text-align:left;border-bottom:1px solid #000;padding:2px 0;font-size:9px}
    .rcpt th.r,.rcpt td.r{text-align:right}
    .rcpt td{padding:3px 1px;vertical-align:top;border-bottom:1px dotted #999}
    .rcpt .iname{word-break:break-word}
    .rcpt .sub{display:block;font-size:8px;color:#444}
    .rcpt .total-row{display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:2px}
    .rcpt .thanks{text-align:center;font-size:9px;margin-top:8px}
  `;

  function print() {
    const html = ref.current?.innerHTML;
    if (!html) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Bill - ${SHOP_NAME}</title>
      <meta charset="utf-8" />
      <style>
        @page{size:80mm auto;margin:2mm}
        *{box-sizing:border-box;margin:0;padding:0}
        body{margin:0;padding:2mm}
        ${receiptCss}
        @media print{body{width:72mm}}
      </style>
    </head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 200);
  }

  const showCustomer =
    !!bill.customer &&
    bill.customer !== 'Walk-in Customer' &&
    bill.customer !== 'Walk-in' &&
    bill.customer !== 'Retail';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-lg w-full max-w-[min(100%,300px)] max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-3 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="font-bold text-sm">Bill preview</h2>
          <div className="flex gap-2">
            <button type="button" onClick={print} className="px-3 py-1.5 bg-primary-600 text-white rounded text-sm">
              Print
            </button>
            <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded text-sm">
              Close
            </button>
          </div>
        </div>

        <div className="p-3 bg-gray-50">
          <div ref={ref}>
            <style dangerouslySetInnerHTML={{ __html: receiptCss }} />
            <div className="rcpt">
              <div className="center">
                <div className="shop-name">{SHOP_NAME}</div>
                <div className="addr">{SHOP_ADDRESS}</div>
                <div className="phone">Ph: {SHOP_PHONE}</div>
              </div>

              <hr className="dash" />

              <div className="meta">
                <div className="meta-row">
                  <span>Bill: {bill.billNo}</span>
                  <span>{bill.date}</span>
                </div>
                {showCustomer ? <div>Cust: {bill.customer}</div> : null}
                <div>Pay: {bill.paymentLabel}</div>
              </div>

              <hr className="dash" />

              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="r">Qty</th>
                    <th className="r">Rate</th>
                    <th className="r">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((it, i) => (
                    <tr key={i}>
                      <td className="iname">
                        {it.name}
                        {it.saleType || it.size ? (
                          <span className="sub">{[it.saleType, it.size].filter(Boolean).join(' · ')}</span>
                        ) : null}
                      </td>
                      <td className="r">{it.qty}</td>
                      <td className="r">{it.rate}</td>
                      <td className="r">{it.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <hr className="dash" />

              <div className="total-row">
                <span>TOTAL</span>
                <span>₹{bill.total.toLocaleString('en-IN')}</span>
              </div>

              <p className="thanks">Thank you</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const { data: report = null, isLoading: salesLoading, isFetching, refetch } = useGetTodaySalesQuery();
  const { data: products = [] } = useGetProductsQuery();
  const { data: creditResp } = useGetCreditCustomersQuery();
  const creditCustomers: CreditCustomer[] = creditResp?.data ?? [];
  const orders: SaleOrder[] = report?.orders ?? [];
  const loading = salesLoading && !report;

  const [createOrder, { isLoading: savingOrder }] = useCreateOrderMutation();
  const [addCreditPayment, { isLoading: savingPayment }] = useAddCreditPaymentMutation();

  const [showForm, setShowForm] = useState(false);
  const [showPayIn, setShowPayIn] = useState(false);
  const [customer, setCustomer] = useState('');
  const [payMode, setPayMode] = useState<PayMode>('cash');
  const [creditCustomerId, setCreditCustomerId] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [bill, setBill] = useState<BillData | null>(null);
  const saving = savingOrder || savingPayment;

  // Pay-in form
  const [payInCustomerId, setPayInCustomerId] = useState('');
  const [payInAmount, setPayInAmount] = useState('');
  const [payInMethod, setPayInMethod] = useState<'cash' | 'online'>('cash');
  const [payInNote, setPayInNote] = useState('');

  function openBillForOrder(order: SaleOrder) {
    setBill(orderToBill(order));
  }

  function openBillById(orderId: string) {
    const order = orders.find((o) => o._id === orderId);
    if (order) openBillForOrder(order);
    else alert('Bill not found — refresh and try again');
  }

  function openSaleForm() {
    setCustomer('');
    setPayMode('cash');
    setCreditCustomerId('');
    setLines([emptyLine()]);
    setShowForm(true);
  }

  function openPayIn() {
    setPayInCustomerId('');
    setPayInAmount('');
    setPayInMethod('cash');
    setPayInNote('');
    setShowPayIn(true);
  }

  function onProductPick(index: number, productId: string) {
    const p = products.find((x) => x._id === productId);
    setLines((prev) => {
      const next = [...prev];
      const saleType = next[index].saleType || 'packet';
      const rate = saleType === 'open' && p?.supportsOpenSale
        ? getOpenRate(p)
        : p ? getPacketPrice(p) : 0;
      next[index] = {
        ...next[index],
        productId,
        name: p?.name || '',
        price: p ? String(rate) : '',
      };
      return next;
    });
  }

  function onSaleTypeChange(index: number, saleType: 'open' | 'packet') {
    const p = products.find((x) => x._id === lines[index]?.productId);
    setLines((prev) => {
      const next = [...prev];
      const rate = saleType === 'open' && p?.supportsOpenSale
        ? getOpenRate(p)
        : p ? getPacketPrice(p) : parseFloat(next[index].price) || 0;
      next[index] = { ...next[index], saleType, price: p ? String(rate) : next[index].price };
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  const formTotal = lines.reduce((sum, l) => {
    const q = parseFloat(l.quantity) || 0;
    const r = parseFloat(l.price) || 0;
    return sum + q * r;
  }, 0);

  const selectedCredit = creditCustomers.find((c) => c._id === creditCustomerId);
  const payInSelected = creditCustomers.find((c) => c._id === payInCustomerId);

  async function createRetailSale(e: React.FormEvent) {
    e.preventDefault();
    const valid = lines.filter((l) => l.productId && (parseFloat(l.quantity) || 0) > 0);
    if (!valid.length) {
      alert('Add at least one product');
      return;
    }
    if (payMode === 'udhar' && !creditCustomerId) {
      alert('Select a credit customer for Udhar');
      return;
    }

    try {
      const items = valid.map((l) => ({
        product: l.productId,
        quantity: parseFloat(l.quantity) || 1,
        price: parseFloat(l.price) || 0,
        selectedSize: l.size.trim() || undefined,
        saleType: l.saleType,
      }));
      const total = items.reduce((s, it) => s + it.price * it.quantity, 0);

      const isUdhar = payMode === 'udhar';
      const custName = isUdhar
        ? (selectedCredit?.name || customer.trim() || 'Credit Customer')
        : (customer.trim() || 'Walk-in Customer');

      const body: Record<string, unknown> = {
        paymentMethod: isUdhar ? 'udhar' : 'retail',
        items,
        total,
        shippingAddress: {
          name: custName,
          phone: isUdhar ? selectedCredit?.phone || '' : '',
        },
      };
      if (!isUdhar) body.paymentMode = payMode;
      if (isUdhar) body.creditCustomerId = creditCustomerId;

      const data = await createOrder(body).unwrap();
      const orderId = data?.data?._id || Date.now().toString();
      const billItems = valid.map((l) => ({
        name: l.name,
        qty: parseFloat(l.quantity) || 1,
        rate: parseFloat(l.price) || 0,
        amount: (parseFloat(l.quantity) || 1) * (parseFloat(l.price) || 0),
        size: l.size.trim() || undefined,
        saleType: l.saleType === 'open' ? 'Khula' : 'Packet',
      }));
      const paymentLabel = isUdhar
        ? 'UDHAR (Credit)'
        : payMode === 'online'
          ? 'Online (UPI / Bank)'
          : 'Cash';
      setBill({
        billNo: String(orderId).slice(-8).toUpperCase(),
        date: formatBillDate(),
        customer: custName,
        paymentLabel,
        items: billItems,
        total,
      });
      setShowForm(false);
      setCustomer('');
      setPayMode('cash');
      setCreditCustomerId('');
      setLines([emptyLine()]);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || 'Order failed');
    }
  }

  async function submitPayIn(e: React.FormEvent) {
    e.preventDefault();
    if (!payInCustomerId) {
      alert('Select a customer');
      return;
    }
    const amt = parseFloat(payInAmount);
    if (!amt || amt <= 0) {
      alert('Enter a valid amount');
      return;
    }
    try {
      await addCreditPayment({
        id: payInCustomerId,
        body: {
          amount: amt,
          paymentMethod: payInMethod,
          note: payInNote,
        },
      }).unwrap();
      alert(`Pay-in saved: ₹${amt.toLocaleString('en-IN')} (${payInMethod})`);
      setShowPayIn(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || 'Pay-in failed');
    }
  }

  if (loading && !report) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const r = report as Report | null;

  return (
    <div className="w-full max-w-full min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Today&apos;s Sales</h1>
          <p className="text-sm text-gray-500 mt-1">
            {r?.date ? new Date(r.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Today'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-wrap">
          <button type="button" onClick={openSaleForm} className="w-full sm:w-auto px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium">
            + Create Retail Sale
          </button>
          <button type="button" onClick={openPayIn} className="w-full sm:w-auto px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium">
            + Pay-in (Credit)
          </button>
          <Link href="/admin/credit" className="w-full sm:w-auto px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50 inline-flex items-center justify-center">
            Credit Ledger
          </Link>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="w-full sm:w-auto px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">{isFetching ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Orders today</p>
          <p className="text-3xl font-bold">{r?.orderCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-primary-500">
          <p className="text-sm text-gray-500">Total sales</p>
          <p className="text-3xl font-bold text-primary-600">₹{(r?.totalSales ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Total profit</p>
          <p className={`text-3xl font-bold ${(r?.totalProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{(r?.totalProfit ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="p-4 border-b flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold">Today&apos;s Bills / Receipts</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tap a row to view the full receipt — you can print later
            </p>
          </div>
        </div>
        {!orders.length ? (
          <div className="py-12 text-center text-gray-500">No bills yet — create a retail sale above</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {orders.map((order) => {
                const badge = payBadge(order);
                const itemCount = order.items?.length ?? 0;
                const cust =
                  order.shippingAddress?.name ||
                  order.user?.name ||
                  'Walk-in';
                return (
                  <div
                    key={order._id}
                    className="p-4 space-y-2"
                    onClick={() => openBillForOrder(order)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') openBillForOrder(order);
                    }}
                  >
                    <div className="flex justify-between gap-3 items-start">
                      <div className="min-w-0">
                        <p className="font-mono font-medium">
                          {String(order._id).slice(-8).toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600 truncate">{cust}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs ${badge.cls}`}>{badge.text}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>
                        {order.created_at
                          ? new Date(order.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                        {' · '}
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </span>
                      <span className="font-semibold text-gray-900">
                        ₹{(order.total ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBillForOrder(order);
                      }}
                      className="w-full py-2.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
                    >
                      View / Print
                    </button>
                  </div>
                );
              })}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4">Bill No</th>
                    <th className="text-left py-3 px-4">Time</th>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Items</th>
                    <th className="text-left py-3 px-4">Pay</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-left py-3 px-4">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const badge = payBadge(order);
                    const itemCount = order.items?.length ?? 0;
                    const cust =
                      order.shippingAddress?.name ||
                      order.user?.name ||
                      'Walk-in';
                    return (
                      <tr
                        key={order._id}
                        onClick={() => openBillForOrder(order)}
                        className="border-b hover:bg-primary-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-medium">
                          {String(order._id).slice(-8).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-3 px-4">{cust}</td>
                        <td className="py-3 px-4">{itemCount} item{itemCount === 1 ? '' : 's'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs ${badge.cls}`}>{badge.text}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          ₹{(order.total ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openBillForOrder(order);
                            }}
                            className="text-primary-600 hover:underline font-medium"
                          >
                            View / Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Items sold today (line-wise)</h2>
          <p className="text-xs text-gray-500 mt-0.5">Tap an item to open that bill&apos;s receipt</p>
        </div>
        {!r?.soldItems?.length ? (
          <div className="py-16 text-center text-gray-500">No sales today yet — create a retail sale above</div>
        ) : (
          <>
            <div className="md:hidden divide-y">
              {r.soldItems.map((item, i) => {
                const badge = payBadge(item);
                return (
                  <div
                    key={`${item.orderId}-${i}`}
                    className="p-4 space-y-2"
                    onClick={() => openBillById(item.orderId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') openBillById(item.orderId);
                    }}
                  >
                    <div className="flex justify-between gap-3 items-start">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.productName}</p>
                        <p className="text-sm text-gray-600 truncate">{item.customer}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs ${badge.cls}`}>{badge.text}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Qty</p>
                        <p>{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Sale</p>
                        <p>₹{item.lineTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Profit</p>
                        <p className={`font-medium ${item.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          ₹{item.profit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBillById(item.orderId);
                      }}
                      className="w-full py-2.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
                    >
                      Receipt
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4">Product</th>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Pay</th>
                    <th className="text-left py-3 px-4">Qty</th>
                    <th className="text-left py-3 px-4">Sale</th>
                    <th className="text-left py-3 px-4">Cost</th>
                    <th className="text-left py-3 px-4">Profit</th>
                    <th className="text-left py-3 px-4">Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {r.soldItems.map((item, i) => {
                    const badge = payBadge(item);
                    return (
                      <tr
                        key={`${item.orderId}-${i}`}
                        onClick={() => openBillById(item.orderId)}
                        className="border-b hover:bg-primary-50 cursor-pointer"
                      >
                        <td className="py-3 px-4 font-medium">{item.productName}</td>
                        <td className="py-3 px-4 text-gray-600">{item.customer}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs ${badge.cls}`}>{badge.text}</span>
                        </td>
                        <td className="py-3 px-4">{item.quantity}</td>
                        <td className="py-3 px-4">₹{item.lineTotal.toLocaleString()}</td>
                        <td className="py-3 px-4">₹{(item.purchasePrice * item.quantity).toLocaleString()}</td>
                        <td className={`py-3 px-4 font-medium ${item.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          ₹{item.profit.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openBillById(item.orderId);
                            }}
                            className="text-primary-600 hover:underline text-xs"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <PhoneSheet
          title={`${SHOP_NAME} — Retail Sale`}
          xwide
          onClose={() => setShowForm(false)}
          footer={
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold">Total: ₹{formTotal.toLocaleString()}</p>
                {payMode === 'udhar' && (
                  <span className="text-xs text-amber-700 font-medium">Added to customer credit</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="py-3 border rounded-xl text-base">
                  Cancel
                </button>
                <button
                  type="submit"
                  form="create-sale-form"
                  disabled={saving}
                  className={`py-3 text-white rounded-xl text-base disabled:opacity-50 ${payMode === 'udhar' ? 'bg-amber-600' : 'bg-primary-600'}`}
                >
                  {saving ? 'Saving...' : payMode === 'udhar' ? 'Save Udhar Bill' : 'Create Sale & Bill'}
                </button>
              </div>
            </div>
          }
        >
          <p className="text-sm text-gray-500 mb-4">Cash / Online / Credit — generate bill here</p>
          <form id="create-sale-form" onSubmit={createRetailSale} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Payment type *</label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'cash', label: 'Cash' },
                    { id: 'online', label: 'Online (UPI)' },
                    { id: 'udhar', label: 'Udhar / Credit' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer text-sm ${
                      payMode === opt.id
                        ? opt.id === 'udhar'
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-primary-500 bg-primary-50 text-primary-800'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMode"
                      checked={payMode === opt.id}
                      onChange={() => setPayMode(opt.id)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {payMode === 'udhar' ? (
              <div>
                <label className="block text-sm mb-1">Credit customer *</label>
                <select
                  value={creditCustomerId}
                  onChange={(e) => setCreditCustomerId(e.target.value)}
                  className="w-full px-3 py-3 border rounded-xl text-base"
                  required
                >
                  <option value="">— Select customer —</option>
                  {creditCustomers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.phone ? ` (${c.phone})` : ''} — due ₹{(c.balance || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                {creditCustomers.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    Add a customer first under{' '}
                    <Link href="/admin/credit" className="underline">
                      Credit
                    </Link>
                    .
                  </p>
                )}
                {selectedCredit && (
                  <p className="text-xs text-gray-500 mt-1">
                    Current due: ₹{(selectedCredit.balance || 0).toLocaleString('en-IN')} → after bill ≈ ₹
                    {(selectedCredit.balance + formTotal).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm mb-1">Customer name (optional)</label>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full px-3 py-3 border rounded-xl text-base"
                  placeholder="Walk-in customer"
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Products</label>
                <button type="button" onClick={addLine} className="text-sm text-primary-600 hover:underline">+ Add row</button>
              </div>
              {lines.map((line, i) => {
                const picked = products.find((p) => p._id === line.productId);
                const canOpen = picked?.supportsOpenSale && picked?.openRate != null;
                const canPacket = picked?.supportsPacketSale !== false;
                return (
                <div key={i} className="grid grid-cols-12 gap-2 items-end border-b pb-3">
                  <div className="col-span-12 sm:col-span-3">
                    <label className="text-xs text-gray-500">Product</label>
                    <select value={line.productId} onChange={(e) => onProductPick(i, e.target.value)} className="w-full px-3 py-3 border rounded-xl text-base" required={i === 0}>
                      <option value="">Select</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>{p.name} (stock: {p.stock ?? 0})</option>
                      ))}
                    </select>
                  </div>
                  {picked && (canOpen || canPacket) && (
                    <div className="col-span-6 sm:col-span-2">
                      <label className="text-xs text-gray-500">Sell as</label>
                      <select
                        value={line.saleType}
                        onChange={(e) => onSaleTypeChange(i, e.target.value as 'open' | 'packet')}
                        className="w-full px-3 py-3 border rounded-xl text-base"
                      >
                        {canPacket && <option value="packet">Packet</option>}
                        {canOpen && <option value="open">Open (loose)</option>}
                      </select>
                    </div>
                  )}
                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-xs text-gray-500">{getQtyLabel(picked, line.saleType)}</label>
                    <input type="number" step="0.01" min="0.01" value={line.quantity} onChange={(e) => setLines((prev) => { const n = [...prev]; n[i] = { ...n[i], quantity: e.target.value }; return n; })} className="w-full px-3 py-3 border rounded-xl text-base" required />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-xs text-gray-500">
                      Rate (₹{line.saleType === 'open' && picked?.openRateUnit ? `/${picked.openRateUnit}` : '/pkt'})
                    </label>
                    <input type="number" step="0.01" min="0" value={line.price} onChange={(e) => setLines((prev) => { const n = [...prev]; n[i] = { ...n[i], price: e.target.value }; return n; })} className="w-full px-3 py-3 border rounded-xl text-base" required />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-xs text-gray-500">Size (optional)</label>
                    <input value={line.size} onChange={(e) => setLines((prev) => { const n = [...prev]; n[i] = { ...n[i], size: e.target.value }; return n; })} className="w-full px-3 py-3 border rounded-xl text-base" placeholder="e.g. 500 gm" />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex justify-end">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="w-full sm:w-auto text-red-600 text-sm py-3 border border-red-200 rounded-xl sm:border-0">Remove</button>
                    )}
                  </div>
                </div>
              );})}
            </div>
          </form>
        </PhoneSheet>
      )}

      {showPayIn && (
        <PhoneSheet
          title="Pay-in (Credit recovery)"
          onClose={() => setShowPayIn(false)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setShowPayIn(false)} className="py-3 border rounded-xl text-base">
                Cancel
              </button>
              <button
                type="submit"
                form="pay-in-form"
                disabled={saving}
                className="py-3 bg-green-600 text-white rounded-xl text-base disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Pay-in'}
              </button>
            </div>
          }
        >
          <p className="text-sm text-gray-500 mb-4">Record cash or online payment against credit</p>
          <form id="pay-in-form" onSubmit={submitPayIn} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Credit customer *</label>
              <select
                value={payInCustomerId}
                onChange={(e) => setPayInCustomerId(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
                required
              >
                <option value="">— Select —</option>
                {creditCustomers
                  .filter((c) => (c.balance || 0) > 0)
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} — due ₹{(c.balance || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
              </select>
              {payInSelected && (
                <p className="text-xs text-gray-500 mt-1">
                  Pending: ₹{(payInSelected.balance || 0).toLocaleString('en-IN')}
                </p>
              )}
              {creditCustomers.filter((c) => (c.balance || 0) > 0).length === 0 && (
                <p className="text-xs text-gray-500 mt-1">No customers with pending credit.</p>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">Amount *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={payInAmount}
                onChange={(e) => setPayInAmount(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Received as *</label>
              <div className="flex gap-2">
                <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 border rounded-xl cursor-pointer text-sm ${payInMethod === 'cash' ? 'border-green-500 bg-green-50' : ''}`}>
                  <input type="radio" checked={payInMethod === 'cash'} onChange={() => setPayInMethod('cash')} />
                  Cash
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 border rounded-xl cursor-pointer text-sm ${payInMethod === 'online' ? 'border-blue-500 bg-blue-50' : ''}`}>
                  <input type="radio" checked={payInMethod === 'online'} onChange={() => setPayInMethod('online')} />
                  Online
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Note</label>
              <input
                value={payInNote}
                onChange={(e) => setPayInNote(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
                placeholder="UPI ref / optional"
              />
            </div>
          </form>
        </PhoneSheet>
      )}

      {bill && <BillPrint bill={bill} onClose={() => setBill(null)} />}
    </div>
  );
}
