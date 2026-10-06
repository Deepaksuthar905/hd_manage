'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiClock, FiEdit2, FiFileText, FiPhone, FiPlus, FiTrash2 } from 'react-icons/fi';
import PhoneSheet from '@/components/PhoneSheet';
import {
  API_ROOT,
  useGetVendorQuery,
  useUpdateVendorMutation,
  useAddVendorPurchaseMutation,
  useAddVendorPaymentMutation,
  useAddVendorAdvanceMutation,
  useAddVendorBillMutation,
  useDeleteVendorLedgerMutation,
} from '@/store/api';

type LedgerItem = { name: string; quantity: number; rate: number; amount: number; unit?: string };
type LedgerEntry = {
  _id: string;
  type: 'purchase' | 'payment' | 'advance';
  amount: number;
  paidAmount?: number;
  paymentMethod?: string;
  items: LedgerItem[];
  note?: string;
  date: string;
  goodsDate?: string;
  parchiImage?: string;
  billImage?: string;
  billStatus?: 'pending' | 'received';
  billDate?: string;
  balanceAfter: number;
  advanceAfter?: number;
};

function isBillPending(row: LedgerEntry) {
  return row.type === 'purchase' && row.billStatus === 'pending';
}

type Line = { name: string; quantity: string; rate: string };

function fmtDate(d?: string) {
  if (!d) return '—';
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

function toLocalInput(d: string | Date) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fmtMoney(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function emptyLine(): Line {
  return { name: '', quantity: '1', rate: '' };
}

function methodLabel(m?: string) {
  if (m === 'udhar') return 'Credit';
  if (m === 'mixed') return 'Partial';
  if (m === 'online') return 'Online';
  if (m === 'cash') return 'Cash';
  return m || '—';
}

function typeBadge(row: LedgerEntry) {
  if (isBillPending(row)) {
    return { text: 'Goods · Bill pending', cls: 'bg-orange-100 text-orange-800' };
  }
  if (row.type === 'purchase') {
    return { text: `Goods · ${methodLabel(row.paymentMethod || 'udhar')}`, cls: 'bg-amber-100 text-amber-800' };
  }
  if (row.type === 'advance') {
    return { text: `Advance · ${methodLabel(row.paymentMethod || 'cash')}`, cls: 'bg-blue-100 text-blue-800' };
  }
  return { text: `Payment · ${methodLabel(row.paymentMethod === 'online' ? 'online' : 'cash')}`, cls: 'bg-green-100 text-green-800' };
}

/** Vendor books: goods → Credit (we owe); payment/advance → Debit */
function creditDebit(row: LedgerEntry) {
  if (row.type === 'purchase') {
    return { credit: row.amount || 0, debit: row.paidAmount || 0 };
  }
  return { credit: 0, debit: row.amount || 0 };
}

async function uploadVendorImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('files', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_ROOT}/api/upload?folder=vendors`, {
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

export default function VendorDetailPage() {
  const params = useParams();
  const id = String(params?.id || '');

  const { data, isLoading } = useGetVendorQuery(id, { skip: !id });
  const vendor = data?.vendor;
  const ledger: LedgerEntry[] = data?.ledger ?? [];

  const [updateVendor] = useUpdateVendorMutation();
  const [addPurchase] = useAddVendorPurchaseMutation();
  const [addPayment] = useAddVendorPaymentMutation();
  const [addAdvance] = useAddVendorAdvanceMutation();
  const [addBill] = useAddVendorBillMutation();
  const [deleteLedger] = useDeleteVendorLedgerMutation();

  const pendingBills = ledger.filter(isBillPending);

  const [modal, setModal] = useState<'purchase' | 'payment' | 'advance' | 'edit' | null>(null);
  const [receiptOnly, setReceiptOnly] = useState(false);
  const [billEntry, setBillEntry] = useState<LedgerEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [simpleAmount, setSimpleAmount] = useState('');
  const [paidNow, setPaidNow] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'online' | 'udhar' | 'mixed'>('udhar');
  const [useAdvance, setUseAdvance] = useState(false);
  const [goodsDate, setGoodsDate] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [note, setNote] = useState('');
  const [parchiImage, setParchiImage] = useState('');
  const [billImage, setBillImage] = useState('');
  const [uploading, setUploading] = useState<'parchi' | 'bill' | null>(null);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'online'>('cash');

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  function resetPhotos() {
    setParchiImage('');
    setBillImage('');
  }

  function openBill(row: LedgerEntry) {
    setBillEntry(row);
    setReceiptOnly(false);
    setLines(
      row.items?.length
        ? row.items.map((it) => ({ name: it.name, quantity: String(it.quantity), rate: '' }))
        : [emptyLine()]
    );
    setSimpleAmount('');
    setPaidNow('');
    setPayMethod('udhar');
    setUseAdvance(false);
    setEntryDate(toLocalInput(new Date()));
    setNote(row.note || '');
    setParchiImage(row.parchiImage || '');
    setBillImage('');
    setModal('purchase');
  }

  function openPurchase() {
    setBillEntry(null);
    setReceiptOnly(false);
    setLines([emptyLine()]);
    setSimpleAmount('');
    setPaidNow('');
    setPayMethod('udhar');
    setUseAdvance(false);
    const now = toLocalInput(new Date());
    setGoodsDate(now);
    setEntryDate(now);
    setNote('');
    resetPhotos();
    setModal('purchase');
  }

  function openPayment() {
    setAmount('');
    setMethod('cash');
    setEntryDate(toLocalInput(new Date()));
    setNote('');
    resetPhotos();
    setModal('payment');
  }

  function openAdvance() {
    setAmount('');
    setMethod('cash');
    setEntryDate(toLocalInput(new Date()));
    setNote('');
    resetPhotos();
    setModal('advance');
  }

  function openEdit() {
    if (!vendor) return;
    setEditName(vendor.name);
    setEditPhone(vendor.phone || '');
    setEditAddress(vendor.address || '');
    setEditNotes(vendor.notes || '');
    setModal('edit');
  }

  const purchaseTotal = (() => {
    const fromLines = lines.reduce((sum, l) => {
      if (!l.name.trim()) return sum;
      return sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.rate) || 0);
    }, 0);
    if (fromLines > 0) return fromLines;
    return parseFloat(simpleAmount) || 0;
  })();

  async function onUpload(kind: 'parchi' | 'bill', file?: File | null) {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadVendorImage(file);
      if (kind === 'parchi') setParchiImage(url);
      else setBillImage(url);
    } catch (err: any) {
      alert(err?.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  async function submitPurchase(e: React.FormEvent) {
    e.preventDefault();
    const valid = lines.filter((l) => l.name.trim() && (parseFloat(l.quantity) || 0) > 0);

    if (receiptOnly && !billEntry) {
      if (!valid.length && !parchiImage) {
        alert('Add items or upload the receipt photo');
        return;
      }
      setSaving(true);
      try {
        await addPurchase({
          id,
          body: {
            billPending: true,
            items: valid.map((l) => ({ name: l.name.trim(), quantity: parseFloat(l.quantity) || 1 })),
            note,
            date: entryDate || undefined,
            goodsDate: goodsDate || undefined,
            parchiImage,
          },
        }).unwrap();
        setModal(null);
      } catch (err: any) {
        alert(err?.data?.message || 'Failed');
      } finally {
        setSaving(false);
      }
      return;
    }

    const paid =
      payMethod === 'udhar'
        ? 0
        : parseFloat(paidNow) || (payMethod === 'cash' || payMethod === 'online' ? purchaseTotal : 0);

    if (billEntry) {
      const priced = valid.filter((l) => (parseFloat(l.rate) || 0) > 0);
      const linesTotal = priced.reduce(
        (s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.rate) || 0),
        0
      );
      const billBody: Record<string, unknown> = {
        paymentMethod: payMethod,
        paidAmount: paid,
        useAdvance,
        billImage,
        billDate: entryDate || undefined,
        note,
      };
      if (linesTotal > 0) {
        billBody.items = valid.map((l) => ({
          name: l.name.trim(),
          quantity: parseFloat(l.quantity) || 1,
          rate: parseFloat(l.rate) || 0,
          amount: (parseFloat(l.quantity) || 1) * (parseFloat(l.rate) || 0),
        }));
      } else if (purchaseTotal > 0) {
        billBody.amount = purchaseTotal;
      } else {
        alert('Enter item rates or the bill total');
        return;
      }
      setSaving(true);
      try {
        await addBill({ entryId: billEntry._id, vendorId: id, body: billBody }).unwrap();
        setModal(null);
        setBillEntry(null);
      } catch (err: any) {
        alert(err?.data?.message || 'Failed to add bill');
      } finally {
        setSaving(false);
      }
      return;
    }

    const body: Record<string, unknown> = {
      note,
      date: entryDate || undefined,
      goodsDate: goodsDate || undefined,
      paymentMethod: payMethod,
      paidAmount: payMethod === 'udhar' ? 0 : parseFloat(paidNow) || (payMethod === 'cash' || payMethod === 'online' ? purchaseTotal : 0),
      useAdvance,
      parchiImage,
      billImage,
    };
    if (valid.length) {
      body.items = valid.map((l) => ({
        name: l.name.trim(),
        quantity: parseFloat(l.quantity) || 1,
        rate: parseFloat(l.rate) || 0,
        amount: (parseFloat(l.quantity) || 1) * (parseFloat(l.rate) || 0),
      }));
    } else if (purchaseTotal > 0) {
      body.amount = purchaseTotal;
    } else {
      alert('Please add items or an amount');
      return;
    }

    setSaving(true);
    try {
      await addPurchase({ id, body }).unwrap();
      setModal(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await addPayment({
        id,
        body: {
          amount: amt,
          paymentMethod: method,
          note,
          date: entryDate || undefined,
          parchiImage,
          billImage,
        },
      }).unwrap();
      setModal(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function submitAdvance(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await addAdvance({
        id,
        body: {
          amount: amt,
          paymentMethod: method,
          note,
          date: entryDate || undefined,
          parchiImage,
          billImage,
        },
      }).unwrap();
      setModal(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateVendor({
        id,
        body: { name: editName, phone: editPhone, address: editAddress, notes: editNotes },
      }).unwrap();
      setModal(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function delEntry(entryId: string) {
    if (!confirm('Delete this entry? Balance will be recalculated.')) return;
    try {
      await deleteLedger({ entryId, vendorId: id }).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Delete failed');
    }
  }

  const photoFields = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-sm mb-1">Slip / note photo</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onUpload('parchi', e.target.files?.[0])}
          className="w-full text-sm"
        />
        {uploading === 'parchi' && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
        {parchiImage && (
          <button type="button" onClick={() => setPreview(parchiImage)} className="mt-1">
            <img src={parchiImage} alt="Slip" className="h-16 rounded border object-cover" />
          </button>
        )}
      </div>
      <div>
        <label className="block text-sm mb-1">Bill screenshot</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onUpload('bill', e.target.files?.[0])}
          className="w-full text-sm"
        />
        {uploading === 'bill' && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
        {billImage && (
          <button type="button" onClick={() => setPreview(billImage)} className="mt-1">
            <img src={billImage} alt="Bill" className="h-16 rounded border object-cover" />
          </button>
        )}
      </div>
    </div>
  );

  if (isLoading && !vendor) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-gray-600 mb-4">Vendor not found</p>
        <Link href="/admin/vendors" className="text-primary-600 hover:underline">
          ← All vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="mb-3">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
        >
          <FiArrowLeft size={15} />
          All vendors
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{vendor.name}</h1>
            {vendor.phone ? (
              <a
                href={`tel:${vendor.phone}`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 mt-1 hover:text-primary-600"
              >
                <FiPhone size={14} />
                {vendor.phone}
              </a>
            ) : (
              <p className="text-sm text-gray-400 mt-1">No phone</p>
            )}
            {vendor.address ? (
              <p className="text-sm text-gray-500 mt-0.5 break-words">{vendor.address}</p>
            ) : null}
            {vendor.notes ? (
              <p className="text-xs text-gray-400 mt-1 break-words">{vendor.notes}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={openEdit}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm text-gray-700 hover:bg-gray-50 active:scale-95 transition"
          >
            <FiEdit2 size={14} />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className={`rounded-xl px-4 py-3 ${vendor.balance > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Due to vendor</p>
            <p
              className={`text-xl sm:text-3xl font-bold mt-0.5 break-all ${
                vendor.balance > 0 ? 'text-amber-700' : 'text-green-700'
              }`}
            >
              {fmtMoney(vendor.balance || 0)}
            </p>
          </div>
          <div className={`rounded-xl px-4 py-3 ${vendor.advance > 0 ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Advance given</p>
            <p
              className={`text-xl sm:text-3xl font-bold mt-0.5 break-all ${
                vendor.advance > 0 ? 'text-blue-700' : 'text-gray-700'
              }`}
            >
              {fmtMoney(vendor.advance || 0)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 md:flex md:justify-end">
          <button
            type="button"
            onClick={openPurchase}
            className="flex items-center justify-center gap-1 px-3 md:px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium shadow-sm active:scale-95 transition whitespace-nowrap"
          >
            <FiPlus size={16} />
            Goods
          </button>
          <button
            type="button"
            onClick={openPayment}
            className="flex items-center justify-center gap-1 px-3 md:px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow-sm active:scale-95 transition whitespace-nowrap"
          >
            <FiPlus size={16} />
            Payment
          </button>
          <button
            type="button"
            onClick={openAdvance}
            className="flex items-center justify-center gap-1 px-3 md:px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm active:scale-95 transition whitespace-nowrap"
          >
            <FiPlus size={16} />
            Advance
          </button>
        </div>
      </div>

      {pendingBills.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 mb-5">
          <div className="flex items-center gap-2 text-orange-800">
            <FiClock size={16} />
            <p className="font-semibold text-sm">
              {pendingBills.length} bill{pendingBills.length > 1 ? 's' : ''} pending
            </p>
          </div>
          <p className="text-xs text-orange-700/80 mt-0.5">
            Receipt aa gayi hai, bill aane par amount bharein. Tab tak due mein nahi juda.
          </p>
          <div className="mt-2.5 space-y-2">
            {pendingBills.map((row) => (
              <div
                key={row._id}
                className="flex items-center gap-3 bg-white rounded-xl border border-orange-100 px-3 py-2"
              >
                {row.parchiImage ? (
                  <button type="button" onClick={() => setPreview(row.parchiImage!)} className="shrink-0">
                    <img src={row.parchiImage} alt="Receipt" className="h-10 w-10 object-cover rounded-lg border" />
                  </button>
                ) : (
                  <span className="shrink-0 h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <FiFileText size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {row.items?.length
                      ? row.items.map((it) => `${it.name} × ${it.quantity}`).join(', ')
                      : 'Receipt photo only'}
                  </p>
                  <p className="text-[11px] text-gray-500">Goods: {fmtDate(row.goodsDate || row.date)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openBill(row)}
                  className="shrink-0 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium active:scale-95 transition"
                >
                  Add bill
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2 md:hidden">
        <h2 className="font-semibold">Vendor Ledger</h2>
        <p className="text-xs text-gray-400">{ledger.length} entries</p>
      </div>

      {/* Mobile ledger cards */}
      <div className="md:hidden space-y-2.5">
        {ledger.length === 0 && (
          <div className="bg-white rounded-xl border py-10 text-center text-gray-500 text-sm px-4">
            No entries yet. Add goods, payment, or advance.
          </div>
        )}
        {ledger.map((row) => {
          const badge = typeBadge(row);
          const { credit, debit } = creditDebit(row);
          return (
            <div key={row._id} className="bg-white rounded-xl border shadow-sm p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.cls}`}>
                    {badge.text}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{fmtDate(row.date)}</p>
                  {row.type === 'purchase' && row.goodsDate ? (
                    <p className="text-[11px] text-gray-400">Goods: {fmtDate(row.goodsDate)}</p>
                  ) : null}
                </div>
                <div className="text-right whitespace-nowrap">
                  {isBillPending(row) ? (
                    <p className="text-xs font-semibold text-orange-700">Amount pending</p>
                  ) : null}
                  {credit > 0 ? (
                    <p className="text-base font-bold text-amber-700">+{fmtMoney(credit)}</p>
                  ) : null}
                  {debit > 0 ? (
                    <p className={`font-bold text-green-700 ${credit > 0 ? 'text-xs' : 'text-base'}`}>
                      {credit > 0 ? 'Paid ' : '−'}
                      {fmtMoney(debit)}
                    </p>
                  ) : null}
                </div>
              </div>

              {(row.items?.length > 0 || row.note || row.parchiImage || row.billImage) && (
                <div className="flex items-start gap-3 mt-2.5">
                  <div className="flex-1 min-w-0 text-sm text-gray-700">
                    {row.items?.length > 0 && (
                      <ul className="space-y-0.5">
                        {row.items.map((it, i) => (
                          <li key={i} className="break-words">
                            {it.name} × {it.quantity}
                            {isBillPending(row) ? '' : ` @ ₹${it.rate}`}
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.note ? (
                      <p className="text-gray-500 text-xs mt-1 break-words">{row.note}</p>
                    ) : null}
                  </div>
                  {row.parchiImage || row.billImage ? (
                    <div className="shrink-0 flex gap-1.5">
                      {row.parchiImage ? (
                        <button type="button" onClick={() => setPreview(row.parchiImage!)}>
                          <img src={row.parchiImage} alt="Slip" className="h-12 w-12 object-cover rounded-lg border" />
                        </button>
                      ) : null}
                      {row.billImage ? (
                        <button type="button" onClick={() => setPreview(row.billImage!)}>
                          <img src={row.billImage} alt="Bill" className="h-12 w-12 object-cover rounded-lg border" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t text-sm">
                <p className="text-gray-500">
                  Balance:{' '}
                  <span className="font-semibold text-gray-800">{fmtMoney(row.balanceAfter || 0)}</span>
                </p>
                <div className="flex items-center gap-1">
                  {isBillPending(row) ? (
                    <button
                      type="button"
                      onClick={() => openBill(row)}
                      className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 text-xs font-medium px-2 py-1 rounded-lg hover:bg-orange-100"
                    >
                      <FiFileText size={13} />
                      Add bill
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => delEntry(row._id)}
                    className="inline-flex items-center gap-1 text-red-500 text-xs px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    <FiTrash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
          <h2 className="font-semibold">Vendor Ledger</h2>
          <p className="text-xs text-gray-400">{ledger.length} entries</p>
        </div>

        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-3 whitespace-nowrap">Date</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Type</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Particulars</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Photos</th>
                <th className="text-right py-3 px-3 whitespace-nowrap">Credit</th>
                <th className="text-right py-3 px-3 whitespace-nowrap">Debit</th>
                <th className="text-right py-3 px-3 whitespace-nowrap">Balance</th>
                <th className="text-left py-3 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500">
                    No entries yet. Add goods, payment, or advance.
                  </td>
                </tr>
              )}
              {ledger.map((row) => {
                const badge = typeBadge(row);
                const { credit, debit } = creditDebit(row);
                return (
                  <tr key={row._id} className="border-b hover:bg-gray-50 align-top">
                    <td className="py-3 px-3 whitespace-nowrap text-gray-600">
                      <div>{fmtDate(row.date)}</div>
                      {row.type === 'purchase' && row.goodsDate ? (
                        <div className="text-xs text-gray-400">Goods: {fmtDate(row.goodsDate)}</div>
                      ) : null}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${badge.cls}`}>{badge.text}</span>
                    </td>
                    <td className="py-3 px-3 min-w-[140px] max-w-[220px]">
                      {row.items?.length > 0 ? (
                        <ul className="space-y-0.5">
                          {row.items.map((it, i) => (
                            <li key={i} className="truncate" title={`${it.name} × ${it.quantity}`}>
                              {it.name} × {it.quantity}
                              {isBillPending(row) ? '' : ` @ ₹${it.rate}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                      {row.note ? <p className="text-gray-500 text-xs mt-1">{row.note}</p> : null}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        {row.parchiImage ? (
                          <button type="button" onClick={() => setPreview(row.parchiImage!)}>
                            <img src={row.parchiImage} alt="Slip" className="h-10 w-10 object-cover rounded border" />
                          </button>
                        ) : null}
                        {row.billImage ? (
                          <button type="button" onClick={() => setPreview(row.billImage!)}>
                            <img src={row.billImage} alt="Bill" className="h-10 w-10 object-cover rounded border" />
                          </button>
                        ) : null}
                        {!row.parchiImage && !row.billImage ? <span className="text-gray-400">—</span> : null}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-amber-700 whitespace-nowrap">
                      {isBillPending(row) ? (
                        <span className="text-xs text-orange-700">Pending</span>
                      ) : credit > 0 ? (
                        fmtMoney(credit)
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-green-700 whitespace-nowrap">
                      {debit > 0 ? fmtMoney(debit) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                      {fmtMoney(row.balanceAfter || 0)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {isBillPending(row) ? (
                        <button
                          type="button"
                          onClick={() => openBill(row)}
                          className="text-orange-700 text-xs font-medium hover:underline mr-3"
                        >
                          Add bill
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => delEntry(row._id)}
                        className="text-red-500 text-xs hover:underline whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'purchase' && (
        <PhoneSheet
          title={billEntry ? 'Add bill' : receiptOnly ? 'Goods receipt (bill pending)' : 'Add Goods'}
          wide
          onClose={() => setModal(null)}
          footer={
            <div className="flex flex-col gap-2">
              {receiptOnly ? (
                <p className="text-sm text-gray-500">Amount will be added when the bill arrives</p>
              ) : (
                <p className="font-semibold text-base">Total: {fmtMoney(purchaseTotal)}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setModal(null)} className="py-3 border rounded-xl text-base">
                  Cancel
                </button>
                <button
                  type="submit"
                  form="vendor-purchase-form"
                  disabled={saving || uploading !== null}
                  className={`py-3 text-white rounded-xl text-base disabled:opacity-50 ${
                    billEntry || receiptOnly ? 'bg-orange-600' : 'bg-amber-600'
                  }`}
                >
                  {saving ? 'Saving...' : billEntry ? 'Save bill' : 'Save'}
                </button>
              </div>
            </div>
          }
        >
          <form id="vendor-purchase-form" onSubmit={submitPurchase} className="space-y-4">
            {billEntry ? (
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl p-3">
                {billEntry.parchiImage ? (
                  <button type="button" onClick={() => setPreview(billEntry.parchiImage!)} className="shrink-0">
                    <img
                      src={billEntry.parchiImage}
                      alt="Receipt"
                      className="h-14 w-14 object-cover rounded-lg border"
                    />
                  </button>
                ) : null}
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-orange-800">Receipt from {fmtDate(billEntry.goodsDate || billEntry.date)}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Bill ke hisaab se har item ka rate bharein, ya neeche sirf total amount daalein.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl">
                {[
                  { v: false, label: 'Bill aa gaya' },
                  { v: true, label: 'Sirf receipt aayi' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setReceiptOnly(opt.v)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition ${
                      receiptOnly === opt.v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {receiptOnly && !billEntry ? (
              <p className="text-xs text-gray-500 -mt-2">
                Maal ki entry + receipt photo save hogi. Amount baad mein &quot;Add bill&quot; se bharein — tab tak
                due mein nahi judega.
              </p>
            ) : null}

            <div className="space-y-3">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 items-end border-b pb-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Item</label>
                    <input
                      value={line.name}
                      onChange={(e) =>
                        setLines((prev) => {
                          const n = [...prev];
                          n[i] = { ...n[i], name: e.target.value };
                          return n;
                        })
                      }
                      className="w-full px-3 py-3 border rounded-xl text-base"
                      placeholder="Product name"
                    />
                  </div>
                  <div className={receiptOnly ? 'col-span-2' : ''}>
                    <label className="text-xs text-gray-500">Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) => {
                          const n = [...prev];
                          n[i] = { ...n[i], quantity: e.target.value };
                          return n;
                        })
                      }
                      className="w-full px-3 py-3 border rounded-xl text-base"
                    />
                  </div>
                  <div className={receiptOnly ? 'hidden' : ''}>
                    <label className="text-xs text-gray-500">Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={line.rate}
                      onChange={(e) =>
                        setLines((prev) => {
                          const n = [...prev];
                          n[i] = { ...n[i], rate: e.target.value };
                          return n;
                        })
                      }
                      className="w-full px-3 py-3 border rounded-xl text-base"
                    />
                  </div>
                  {lines.length > 1 ? (
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                        className="w-full py-2.5 text-red-600 text-sm border border-red-200 rounded-xl"
                      >
                        Remove line
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLines((p) => [...p, emptyLine()])}
              className="text-sm text-primary-600 font-medium"
            >
              + Add line
            </button>

            {!receiptOnly && (
            <>
            <div>
              <label className="text-xs text-gray-500">Or total amount only</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={simpleAmount}
                onChange={(e) => setSimpleAmount(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
                placeholder="₹ Amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Payment</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {(['udhar', 'cash', 'online', 'mixed'] as const).map((m) => (
                  <label
                    key={m}
                    className={`px-3 py-3 border rounded-xl text-sm cursor-pointer text-center font-medium ${
                      payMethod === m ? 'border-primary-500 bg-primary-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={payMethod === m}
                      onChange={() => {
                        setPayMethod(m);
                        if (m === 'udhar') setPaidNow('0');
                        if (m === 'cash' || m === 'online') setPaidNow(String(purchaseTotal || ''));
                      }}
                    />
                    {m === 'udhar' ? 'Credit' : m === 'mixed' ? 'Partial' : m === 'online' ? 'Online' : 'Cash'}
                  </label>
                ))}
              </div>
              {(payMethod === 'mixed' || payMethod === 'cash' || payMethod === 'online') && (
                <div>
                  <label className="text-xs text-gray-500">Paid now</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={paidNow}
                    onChange={(e) => setPaidNow(e.target.value)}
                    className="w-full px-3 py-3 border rounded-xl text-base"
                  />
                </div>
              )}
              {(vendor.advance || 0) > 0 && (
                <label className="flex items-center gap-2 mt-3 text-sm">
                  <input type="checkbox" checked={useAdvance} onChange={(e) => setUseAdvance(e.target.checked)} className="w-4 h-4" />
                  Use advance ({fmtMoney(vendor.advance || 0)})
                </label>
              )}
            </div>
            </>
            )}

            {billEntry ? (
              <div>
                <label className="block text-sm mb-1">Bill date</label>
                <input
                  type="datetime-local"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-3 border rounded-xl text-base"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Goods date</label>
                  <input
                    type="datetime-local"
                    value={goodsDate}
                    onChange={(e) => setGoodsDate(e.target.value)}
                    className="w-full px-3 py-3 border rounded-xl text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Entry date</label>
                  <input
                    type="datetime-local"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-3 border rounded-xl text-base"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm mb-1">Note</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>

            {billEntry ? (
              <div>
                <label className="block text-sm mb-1">Bill photo</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => onUpload('bill', e.target.files?.[0])}
                  className="w-full text-sm"
                />
                {uploading === 'bill' && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
                {billImage && (
                  <button type="button" onClick={() => setPreview(billImage)} className="mt-1">
                    <img src={billImage} alt="Bill" className="h-16 rounded border object-cover" />
                  </button>
                )}
              </div>
            ) : receiptOnly ? (
              <div>
                <label className="block text-sm mb-1">Receipt photo</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => onUpload('parchi', e.target.files?.[0])}
                  className="w-full text-sm"
                />
                {uploading === 'parchi' && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
                {parchiImage && (
                  <button type="button" onClick={() => setPreview(parchiImage)} className="mt-1">
                    <img src={parchiImage} alt="Receipt" className="h-16 rounded border object-cover" />
                  </button>
                )}
              </div>
            ) : (
              photoFields
            )}
          </form>
        </PhoneSheet>
      )}

      {modal === 'payment' && (
        <PhoneSheet
          title="Payment to vendor"
          onClose={() => setModal(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModal(null)} className="py-3 border rounded-xl text-base">
                Cancel
              </button>
              <button
                type="submit"
                form="vendor-payment-form"
                disabled={saving}
                className="py-3 bg-green-600 text-white rounded-xl text-base disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          }
        >
          <form id="vendor-payment-form" onSubmit={submitPayment} className="space-y-4">
            <p className="text-sm text-gray-500">Pending due: {fmtMoney(vendor.balance || 0)}</p>
            <div>
              <label className="block text-sm mb-1">Amount *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'online'] as const).map((m) => (
                <label
                  key={m}
                  className={`text-center px-3 py-3 border rounded-xl cursor-pointer text-sm font-medium ${
                    method === m ? 'border-green-500 bg-green-50' : ''
                  }`}
                >
                  <input type="radio" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
                  {m === 'cash' ? 'Cash' : 'Online'}
                </label>
              ))}
            </div>
            <div>
              <label className="block text-sm mb-1">Date</label>
              <input
                type="datetime-local"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Note</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>
            {photoFields}
          </form>
        </PhoneSheet>
      )}

      {modal === 'advance' && (
        <PhoneSheet
          title="Advance to vendor"
          onClose={() => setModal(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModal(null)} className="py-3 border rounded-xl text-base">
                Cancel
              </button>
              <button
                type="submit"
                form="vendor-advance-form"
                disabled={saving}
                className="py-3 bg-blue-600 text-white rounded-xl text-base disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          }
        >
          <form id="vendor-advance-form" onSubmit={submitAdvance} className="space-y-4">
            <p className="text-sm text-gray-500">Current advance: {fmtMoney(vendor.advance || 0)}</p>
            <div>
              <label className="block text-sm mb-1">Amount *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'online'] as const).map((m) => (
                <label
                  key={m}
                  className={`text-center px-3 py-3 border rounded-xl cursor-pointer text-sm font-medium ${
                    method === m ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <input type="radio" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
                  {m === 'cash' ? 'Cash' : 'Online'}
                </label>
              ))}
            </div>
            <div>
              <label className="block text-sm mb-1">Date</label>
              <input
                type="datetime-local"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Note</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
                placeholder="Purpose of advance"
              />
            </div>
            {photoFields}
          </form>
        </PhoneSheet>
      )}

      {modal === 'edit' && (
        <PhoneSheet
          title="Edit Vendor"
          onClose={() => setModal(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModal(null)} className="py-3 border rounded-xl text-base">
                Cancel
              </button>
              <button
                type="submit"
                form="vendor-edit-form"
                disabled={saving}
                className="py-3 bg-primary-600 text-white rounded-xl text-base disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          }
        >
          <form id="vendor-edit-form" onSubmit={submitEdit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Name *</label>
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                inputMode="tel"
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Address</label>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3 py-3 border rounded-xl text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-3 border rounded-xl text-base"
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
          <img src={preview} alt="Preview" className="max-h-[90dvh] max-w-full rounded shadow-lg" />
        </div>
      )}
    </div>
  );
}
