'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiEdit2, FiImage, FiPhone, FiPlus, FiShare2, FiTrash2 } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import PhoneSheet from '@/components/PhoneSheet';
import {
  buildLedgerText,
  buildShareFiles,
  canShareFiles,
  downloadFiles,
  whatsappUrl,
} from '@/lib/ledgerShare';
import {
  API_ROOT,
  useGetCreditCustomerQuery,
  useGetProductsQuery,
  useAddCreditSaleMutation,
  useAddCreditPaymentMutation,
  useUpdateCreditCustomerMutation,
  useDeleteCreditLedgerMutation,
  useUpdateCreditLedgerMutation,
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

function toLocalInput(d: string | Date) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
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
  const [updateCreditLedger, { isLoading: savingEntry }] = useUpdateCreditLedgerMutation();
  const saving = savingSale || savingPayment || savingEdit || savingEntry;

  const [modal, setModal] = useState<'sale' | 'payment' | 'edit' | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [includeParchi, setIncludeParchi] = useState(true);
  const [sharing, setSharing] = useState(false);

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
    setEditingEntryId(null);
    setLines([emptyLine()]);
    setSaleNote('');
    setSaleDate(toLocalInput(new Date()));
    setSimpleAmount('');
    setParchiImage('');
    setModal('sale');
  }

  function openEditEntry(row: LedgerEntry) {
    setEditingEntryId(row._id);
    if (row.type === 'sale') {
      setLines(
        row.items?.length
          ? row.items.map((it) => ({
              productId:
                it.product && typeof it.product === 'object'
                  ? it.product._id
                  : typeof it.product === 'string'
                    ? it.product
                    : '',
              name: it.name,
              quantity: String(it.quantity),
              rate: String(it.rate),
              saleType: it.saleType === 'open' ? 'open' : 'packet',
            }))
          : [emptyLine()]
      );
      setSimpleAmount(row.items?.length ? '' : String(row.amount));
      setSaleNote(row.note || '');
      setSaleDate(toLocalInput(row.date));
      setParchiImage(row.parchiImage || '');
      setModal('sale');
    } else {
      setPayAmount(String(row.amount));
      setPayMethod(row.paymentMethod === 'online' ? 'online' : 'cash');
      setPayNote(row.note || '');
      setPayDate(toLocalInput(row.date));
      setModal('payment');
    }
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
    setEditingEntryId(null);
    setPayAmount('');
    setPayMethod('cash');
    setPayNote('');
    setPayDate(toLocalInput(new Date()));
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
      date: saleDate ? new Date(saleDate).toISOString() : undefined,
      parchiImage: editingEntryId ? parchiImage : parchiImage || undefined,
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
      if (editingEntryId) {
        await updateCreditLedger({ entryId: editingEntryId, customerId: id, body }).unwrap();
      } else {
        await addCreditSale({ id, body }).unwrap();
      }
      setModal(null);
      setEditingEntryId(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || (editingEntryId ? 'Failed to update entry' : 'Failed to add sale'));
    }
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      alert('Enter a valid amount');
      return;
    }
    const body = {
      amount: amt,
      paymentMethod: payMethod,
      note: payNote,
      date: payDate ? new Date(payDate).toISOString() : undefined,
    };
    try {
      if (editingEntryId) {
        await updateCreditLedger({ entryId: editingEntryId, customerId: id, body }).unwrap();
      } else {
        await addCreditPayment({ id, body }).unwrap();
      }
      setModal(null);
      setEditingEntryId(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || (editingEntryId ? 'Failed to update entry' : 'Failed to record payment'));
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

  function shareTextOnWhatsapp() {
    if (!customer) return;
    const text = buildLedgerText(customer, ledger);
    window.open(whatsappUrl(customer.phone, text), '_blank');
    setShowShare(false);
  }

  async function shareAsImages() {
    if (!customer) return;
    setSharing(true);
    try {
      const files = await buildShareFiles(customer, ledger, includeParchi);
      const text = `${customer.name} — ledger statement. Current due: ₹${(
        customer.balance || 0
      ).toLocaleString('en-IN')}`;
      if (canShareFiles(files)) {
        try {
          await navigator.share({ files, title: `${customer.name} ledger`, text });
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          throw err;
        }
      } else {
        downloadFiles(files);
        alert(
          'Sharing files is not supported in this browser. Images have been downloaded — attach them in WhatsApp.'
        );
      }
      setShowShare(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setSharing(false);
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
      <div className="mb-3">
        <Link
          href="/admin/credit"
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
        >
          <FiArrowLeft size={15} />
          All credit customers
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{customer.name}</h1>
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 mt-1 hover:text-primary-600"
              >
                <FiPhone size={14} />
                {customer.phone}
              </a>
            ) : (
              <p className="text-sm text-gray-400 mt-1">No phone</p>
            )}
            {customer.address ? (
              <p className="text-sm text-gray-500 mt-0.5 break-words">{customer.address}</p>
            ) : null}
            {customer.notes ? (
              <p className="text-xs text-gray-400 mt-1 break-words">{customer.notes}</p>
            ) : null}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShare(true)}
              aria-label="Share ledger"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-green-200 bg-green-50 rounded-xl text-sm text-green-700 hover:bg-green-100 active:scale-95 transition"
            >
              <FiShare2 size={14} />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              type="button"
              onClick={openEdit}
              className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm text-gray-700 hover:bg-gray-50 active:scale-95 transition"
            >
              <FiEdit2 size={14} />
              Edit
            </button>
          </div>
        </div>

        <div
          className={`mt-4 rounded-xl px-4 py-3 ${
            customer.balance > 0 ? 'bg-amber-50' : 'bg-green-50'
          }`}
        >
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Current due balance</p>
          <p
            className={`text-2xl sm:text-3xl font-bold mt-0.5 break-all ${
              customer.balance > 0 ? 'text-amber-700' : 'text-green-700'
            }`}
          >
            ₹{(customer.balance || 0).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 md:flex md:justify-end">
          <button
            type="button"
            onClick={openSale}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium shadow-sm active:scale-95 transition whitespace-nowrap"
          >
            <FiPlus size={16} />
            Credit sale
          </button>
          <button
            type="button"
            onClick={openPayment}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow-sm active:scale-95 transition whitespace-nowrap"
          >
            <FiPlus size={16} />
            Payment
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 md:hidden">
        <h2 className="font-semibold">Ledger</h2>
        <p className="text-xs text-gray-400">{ledger.length} entries</p>
      </div>

      {/* Mobile ledger cards */}
      <div className="md:hidden space-y-2.5">
        {ledger.length === 0 && (
          <div className="bg-white rounded-xl border py-10 text-center text-gray-500 text-sm px-4">
            No entries yet. Add a credit sale or payment.
          </div>
        )}
        {ledger.map((row) => (
          <div key={row._id} className="bg-white rounded-xl border shadow-sm p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {row.type === 'sale' ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                    Credit sale
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-800">
                    Payment · {row.paymentMethod === 'online' ? 'Online' : 'Cash'}
                  </span>
                )}
                <p className="text-xs text-gray-500 mt-1">{fmtDate(row.date)}</p>
              </div>
              <p
                className={`text-base font-bold whitespace-nowrap ${
                  row.type === 'sale' ? 'text-amber-700' : 'text-green-700'
                }`}
              >
                {row.type === 'sale' ? '+' : '−'}₹{row.amount.toLocaleString('en-IN')}
              </p>
            </div>

            {(row.items?.length > 0 || row.note || row.parchiImage) && (
              <div className="flex items-start gap-3 mt-2.5">
                <div className="flex-1 min-w-0 text-sm text-gray-700">
                  {row.items?.length > 0 && (
                    <ul className="space-y-0.5">
                      {row.items.map((it, i) => (
                        <li key={i} className="break-words">
                          {it.name} × {it.quantity} @ ₹{it.rate}
                          {it.saleType ? (
                            <span className="text-gray-400 text-xs"> ({it.saleType})</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {row.note ? (
                    <p className="text-gray-500 text-xs mt-1 break-words">{row.note}</p>
                  ) : null}
                </div>
                {row.parchiImage ? (
                  <button
                    type="button"
                    onClick={() => setPreview(row.parchiImage!)}
                    className="shrink-0"
                  >
                    <img
                      src={row.parchiImage}
                      alt="Parchi"
                      className="h-12 w-12 object-cover rounded-lg border"
                    />
                  </button>
                ) : null}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t text-sm">
              <p className="text-gray-500">
                Balance:{' '}
                <span className="font-semibold text-gray-800">
                  ₹{row.balanceAfter.toLocaleString('en-IN')}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditEntry(row)}
                  className="inline-flex items-center gap-1 text-primary-600 text-xs px-2 py-1 rounded-lg hover:bg-primary-50"
                >
                  <FiEdit2 size={13} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteEntry(row._id)}
                  className="inline-flex items-center gap-1 text-red-500 text-xs px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  <FiTrash2 size={13} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Ledger</h2>
        </div>
        <div className="overflow-x-auto">
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
                  <td className="py-3 px-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditEntry(row)}
                      className="text-primary-600 text-xs hover:underline mr-3"
                    >
                      Edit
                    </button>
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
          title={editingEntryId ? 'Edit credit sale' : 'Credit sale'}
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
                  {saving ? 'Saving...' : editingEntryId ? 'Update' : 'Save'}
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
          title={editingEntryId ? 'Edit payment' : 'Payment Received'}
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
                {saving ? 'Saving...' : editingEntryId ? 'Update' : 'Save'}
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

      {showShare && (
        <PhoneSheet title="Share ledger" onClose={() => !sharing && setShowShare(false)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Send {customer.name}&apos;s full ledger ({ledger.length} entries) on WhatsApp.
            </p>

            <button
              type="button"
              onClick={shareTextOnWhatsapp}
              disabled={sharing}
              className="w-full flex items-start gap-3 p-4 border rounded-xl text-left hover:bg-green-50 active:scale-[0.99] transition disabled:opacity-50"
            >
              <span className="shrink-0 w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                <FaWhatsapp size={22} />
              </span>
              <span>
                <span className="block font-semibold">WhatsApp message</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Opens {customer.phone ? `chat with ${customer.phone}` : 'WhatsApp'} with the full
                  ledger as text. Parchi photos are included as links.
                </span>
              </span>
            </button>

            <div className="border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center">
                  <FiImage size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">Share as image</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ledger statement image + parchi photos. Choose WhatsApp from the share menu.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 mt-3 text-sm">
                <input
                  type="checkbox"
                  checked={includeParchi}
                  onChange={(e) => setIncludeParchi(e.target.checked)}
                  className="w-4 h-4"
                />
                Include parchi photos ({ledger.filter((e) => e.parchiImage).length})
              </label>
              <button
                type="button"
                onClick={shareAsImages}
                disabled={sharing}
                className="w-full mt-3 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-60"
              >
                {sharing ? 'Preparing images…' : 'Share images'}
              </button>
            </div>
          </div>
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
