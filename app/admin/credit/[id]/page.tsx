'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PhoneSheet from '@/components/PhoneSheet';
import {
  API_ROOT,
  useGetCreditCustomerQuery,
  useGetProductsQuery,
  useAddCreditSaleMutation,
  useAddCreditPaymentMutation,
  useUpdateCreditCustomerMutation,
  useDeleteCreditLedgerMutation,
} from '@/store/api';

type Product = {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  supportsOpenSale?: boolean;
  supportsPacketSale?: boolean;
  openRate?: number | null;
  packetPrice?: number | null;
  openRateUnit?: string;
};

type LedgerItem = {
  product?: { _id: string; name: string } | string | null;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  unit?: string;
  saleType?: string;
};

type LedgerEntry = {
  _id: string;
  type: 'sale' | 'payment';
  amount: number;
  paymentMethod?: 'cash' | 'online' | null;
  items: LedgerItem[];
  note?: string;
  parchiImage?: string;
  date: string;
  balanceAfter: number;
  created_at?: string;
};

type CreditCustomer = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  balance: number;
};

type SaleLine = {
  productId: string;
  name: string;
  quantity: string;
  rate: string;
  saleType: 'open' | 'packet';
};

function emptyLine(): SaleLine {
  return { productId: '', name: '', quantity: '1', rate: '', saleType: 'packet' };
}

async function uploadCreditImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('files', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_ROOT}/api/upload?folder=credit`, {
    method: 'POST',
    headers,
    body: fd,
  });
  const data = await res.json();
  if (!res.ok || !data?.urls?.[0]) {
    throw new Error(data?.error || data?.details || 'Upload failed');
  }
  return data.urls[0] as string;
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

export default function CreditCustomerDetailPage() {
  const params = useParams();
  const id = String(params?.id || '');

  const { data, isLoading: loading } = useGetCreditCustomerQuery(id, { skip: !id });
  const customer: CreditCustomer | null = data?.customer ?? null;
  const ledger: LedgerEntry[] = data?.ledger ?? [];
  const { data: products = [] } = useGetProductsQuery();

  const [addCreditSale, { isLoading: savingSale }] = useAddCreditSaleMutation();
  const [addCreditPayment, { isLoading: savingPayment }] = useAddCreditPaymentMutation();
  const [updateCreditCustomer, { isLoading: savingEdit }] = useUpdateCreditCustomerMutation();
  const [deleteCreditLedger] = useDeleteCreditLedgerMutation();
  const saving = savingSale || savingPayment || savingEdit;

  const [modal, setModal] = useState<'sale' | 'payment' | 'edit' | null>(null);

  // Sale form
  const [lines, setLines] = useState<SaleLine[]>([emptyLine()]);
  const [saleNote, setSaleNote] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [simpleAmount, setSimpleAmount] = useState('');
  const [parchiImage, setParchiImage] = useState('');
  const [uploadingParchi, setUploadingParchi] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'online'>('cash');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  function openEdit() {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone || '');
    setEditAddress(customer.address || '');
    setEditNotes(customer.notes || '');
    setModal('edit');
  }

  function openSale() {
    setLines([emptyLine()]);
    setSaleNote('');
    setSaleDate(new Date().toISOString().slice(0, 16));
    setSimpleAmount('');
    setParchiImage('');
    setModal('sale');
  }

  async function onParchiUpload(file?: File | null) {
    if (!file) return;
    setUploadingParchi(true);
    try {
      const url = await uploadCreditImage(file);
      setParchiImage(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingParchi(false);
    }
  }

  function openPayment() {
    setPayAmount('');
    setPayMethod('cash');
    setPayNote('');
    setPayDate(new Date().toISOString().slice(0, 16));
    setModal('payment');
  }

  function onProductPick(index: number, productId: string) {
    const p = products.find((x) => x._id === productId);
    setLines((prev) => {
      const next = [...prev];
      const saleType = next[index].saleType || 'packet';
      const rate =
        saleType === 'open' && p?.supportsOpenSale
          ? p.openRate != null
            ? p.openRate
            : p.price
          : p
            ? p.packetPrice != null
              ? p.packetPrice
              : p.price
            : 0;
      next[index] = {
        ...next[index],
        productId,
        name: p?.name || '',
        rate: p ? String(rate) : '',
      };
      return next;
    });
  }

  const saleTotal = (() => {
    const fromLines = lines.reduce((sum, l) => {
      if (!l.name && !l.productId) return sum;
      return sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.rate) || 0);
    }, 0);
    if (fromLines > 0) return fromLines;
    return parseFloat(simpleAmount) || 0;
  })();

  async function submitSale(e: React.FormEvent) {
    e.preventDefault();
    const valid = lines.filter(
      (l) => (l.name.trim() || l.productId) && (parseFloat(l.quantity) || 0) > 0
    );
    const body: Record<string, unknown> = {
      note: saleNote,
      date: saleDate || undefined,
      parchiImage: parchiImage || undefined,
    };
    if (valid.length) {
      body.items = valid.map((l) => ({
        product: l.productId || undefined,
        name: l.name.trim() || 'Item',
        quantity: parseFloat(l.quantity) || 1,
        rate: parseFloat(l.rate) || 0,
        amount: (parseFloat(l.quantity) || 1) * (parseFloat(l.rate) || 0),
        saleType: l.saleType,
      }));
    } else if (parseFloat(simpleAmount) > 0) {
      body.amount = parseFloat(simpleAmount);
    } else {
      alert('Add items or an amount');
      return;
    }

    try {
      await addCreditSale({ id, body }).unwrap();
      setModal(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || 'Failed to add sale');
    }
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      alert('Enter a valid amount');
      return;
    }
    try {
      await addCreditPayment({
        id,
        body: {
          amount: amt,
          paymentMethod: payMethod,
          note: payNote,
          date: payDate || undefined,
        },
      }).unwrap();
      setModal(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || 'Failed to record payment');
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateCreditCustomer({
        id,
        body: {
          name: editName,
          phone: editPhone,
          address: editAddress,
          notes: editNotes,
        },
      }).unwrap();
      setModal(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || 'Update failed');
    }
  }

  async function deleteEntry(entryId: string) {
    if (!confirm('Delete this entry? Balance will be adjusted.')) return;
    try {
      await deleteCreditLedger({ entryId, customerId: id }).unwrap();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || 'Delete failed');
    }
  }

  if (loading && !customer) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 mb-4">Customer not found</p>
        <Link href="/admin/credit" className="text-primary-600 hover:underline">
          ← All credit customers
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="mb-4">
        <Link href="/admin/credit" className="text-sm text-primary-600 hover:underline">
          ← All credit customers
        </Link>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold break-words">{customer.name}</h1>
          <p className="text-sm text-gray-500 mt-1 break-words">
            {customer.phone || 'No phone'}
            {customer.address ? ` · ${customer.address}` : ''}
          </p>
          {customer.notes ? <p className="text-sm text-gray-400 mt-1">{customer.notes}</p> : null}
        </div>

        <div className="hidden md:flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEdit}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={openSale}
            className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm"
          >
            + Credit sale
          </button>
          <button
            type="button"
            onClick={openPayment}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"
          >
            + Payment
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 md:hidden">
          <button
            type="button"
            onClick={openSale}
            className="py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium"
          >
            + Credit sale
          </button>
          <button
            type="button"
            onClick={openPayment}
            className="py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium"
          >
            + Payment
          </button>
          <button
            type="button"
            onClick={openEdit}
            className="py-2.5 border rounded-lg text-sm font-medium"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-5 mb-6 max-w-sm">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Current Due Balance</p>
        <p
          className={`text-2xl sm:text-3xl font-bold mt-1 break-all ${
            customer.balance > 0 ? 'text-amber-700' : 'text-green-700'
          }`}
        >
          ₹{(customer.balance || 0).toLocaleString('en-IN')}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
          <h2 className="font-semibold">Ledger</h2>
          <p className="text-xs text-gray-400 md:hidden">Swipe for columns</p>
        </div>
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Details</th>
                <th className="text-left py-3 px-4">Parchi</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-right py-3 px-4">Balance</th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    No entries yet. Add a credit sale or payment.
                  </td>
                </tr>
              )}
              {ledger.map((row) => (
                <tr key={row._id} className="border-b hover:bg-gray-50 align-top">
                  <td className="py-3 px-4 whitespace-nowrap text-gray-600">{fmtDate(row.date)}</td>
                  <td className="py-3 px-4">
                    {row.type === 'sale' ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">
                        Credit sale
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                        Payment · {row.paymentMethod === 'online' ? 'Online' : 'Cash'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    {row.items?.length > 0 ? (
                      <ul className="space-y-0.5">
                        {row.items.map((it, i) => (
                          <li key={i}>
                            {it.name} × {it.quantity} @ ₹{it.rate}
                            {it.saleType ? (
                              <span className="text-gray-400 text-xs"> ({it.saleType})</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {row.note ? <p className="text-gray-500 text-xs mt-1">{row.note}</p> : null}
                    {!row.items?.length && !row.note ? (
                      <span className="text-gray-400">—</span>
                    ) : null}
                  </td>
                  <td className="py-3 px-4">
                    {row.parchiImage ? (
                      <button type="button" onClick={() => setPreview(row.parchiImage!)}>
                        <img
                          src={row.parchiImage}
                          alt="Parchi"
                          className="h-10 w-10 object-cover rounded border"
                        />
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-medium ${
                      row.type === 'sale' ? 'text-amber-700' : 'text-green-700'
                    }`}
                  >
                    {row.type === 'sale' ? '+' : '−'}₹{row.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right">₹{row.balanceAfter.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => deleteEntry(row._id)}
                      className="text-red-500 text-xs hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'sale' && (
        <PhoneSheet
          title="Credit sale"
          wide
          onClose={() => setModal(null)}
          footer={
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-base">Total: ₹{saleTotal.toLocaleString('en-IN')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="py-3 border rounded-xl text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="credit-sale-form"
                  disabled={saving || uploadingParchi}
                  className="py-3 bg-amber-600 text-white rounded-xl text-base disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          }
        >
          <form id="credit-sale-form" onSubmit={submitSale} className="space-y-4">
            <div className="space-y-3">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 items-end border-b pb-3">
                  <div className="col-span-2">
                    <label className="block text-xs mb-1">Product / Item</label>
                    <select
                      value={line.productId}
                      onChange={(e) => onProductPick(i, e.target.value)}
                      className="w-full px-3 py-2.5 border rounded-lg text-base"
                    >
                      <option value="">— Select product —</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Or type name manually"
                      value={line.name}
                      onChange={(e) =>
                        setLines((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], name: e.target.value };
                          return next;
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-base mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], quantity: e.target.value };
                          return next;
                        })
                      }
                      className="w-full px-3 py-2.5 border rounded-lg text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={line.rate}
                      onChange={(e) =>
                        setLines((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], rate: e.target.value };
                          return next;
                        })
                      }
                      className="w-full px-3 py-2.5 border rounded-lg text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Type</label>
                    <select
                      value={line.saleType}
                      onChange={(e) =>
                        setLines((prev) => {
                          const next = [...prev];
                          next[i] = {
                            ...next[i],
                            saleType: e.target.value as 'open' | 'packet',
                          };
                          return next;
                        })
                      }
                      className="w-full px-3 py-2.5 border rounded-lg text-base"
                    >
                      <option value="packet">Packet</option>
                      <option value="open">Open</option>
                    </select>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
                      }
                      className="w-full py-2.5 text-red-600 text-sm border border-red-100 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="text-sm text-primary-600 hover:underline"
            >
              + Add line
            </button>

            <div className="border-t pt-3">
              <label className="block text-xs mb-1 text-gray-500">
                Or total amount only (no item breakdown)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="₹ Amount"
                value={simpleAmount}
                onChange={(e) => setSimpleAmount(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Date</label>
                <input
                  type="datetime-local"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-base"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Note</label>
                <input
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-base"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Parchi photo</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => onParchiUpload(e.target.files?.[0])}
                className="w-full text-sm"
              />
              {uploadingParchi && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
              {parchiImage && (
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" onClick={() => setPreview(parchiImage)}>
                    <img
                      src={parchiImage}
                      alt="Parchi preview"
                      className="h-16 w-16 object-cover rounded border"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setParchiImage('')}
                    className="text-sm text-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </form>
        </PhoneSheet>
      )}

      {modal === 'payment' && (
        <PhoneSheet
          title="Payment Received"
          onClose={() => setModal(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="py-3 border rounded-xl text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="credit-payment-form"
                disabled={saving}
                className="py-3 bg-green-600 text-white rounded-xl text-base disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          }
        >
          <form id="credit-payment-form" onSubmit={submitPayment} className="space-y-3">
            <p className="text-sm text-gray-500">
              Pending due: ₹{(customer.balance || 0).toLocaleString('en-IN')}
            </p>
            <div>
              <label className="block text-sm mb-1">Amount *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Payment mode *</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 px-3 py-2.5 border rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={payMethod === 'cash'}
                    onChange={() => setPayMethod('cash')}
                  />
                  Cash
                </label>
                <label className="flex items-center gap-2 px-3 py-2.5 border rounded-lg cursor-pointer">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={payMethod === 'online'}
                    onChange={() => setPayMethod('online')}
                  />
                  Online
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Date</label>
              <input
                type="datetime-local"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Note</label>
              <input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
                placeholder="e.g. UPI ref / cheque no"
              />
            </div>
          </form>
        </PhoneSheet>
      )}

      {modal === 'edit' && (
        <PhoneSheet
          title="Edit Customer"
          onClose={() => setModal(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="py-3 border rounded-xl text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="credit-edit-form"
                disabled={saving}
                className="py-3 bg-primary-600 text-white rounded-xl text-base disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          }
        >
          <form id="credit-edit-form" onSubmit={submitEdit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Name *</label>
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                inputMode="tel"
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Address</label>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
          </form>
        </PhoneSheet>
      )}

      {preview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-3"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="Parchi" className="max-h-[90vh] max-w-full rounded shadow-lg" />
        </div>
      )}
    </div>
  );
}
