'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiChevronRight, FiPhone, FiSearch, FiTrash2, FiUserPlus } from 'react-icons/fi';
import PhoneSheet from '@/components/PhoneSheet';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useDeleteVendorMutation,
} from '@/store/api';

type Vendor = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  balance: number;
  advance: number;
  status?: string;
  pendingBills?: number;
};

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState<string | undefined>(undefined);
  const { data, isLoading: loading } = useGetVendorsQuery(appliedSearch);
  const list: Vendor[] = data?.data ?? [];
  const totalDue = data?.summary?.totalDue ?? 0;
  const totalAdvance = data?.summary?.totalAdvance ?? 0;

  const [createVendor, { isLoading: saving }] = useCreateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();
  const [showAdd, setShowAdd] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await createVendor({
        name: fd.get('name'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        notes: fd.get('notes'),
        openingBalance: parseFloat(String(fd.get('openingBalance') || '0')) || 0,
        openingAdvance: parseFloat(String(fd.get('openingAdvance') || '0')) || 0,
      }).unwrap();
      setShowAdd(false);
      form.reset();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create');
    }
  }

  async function del(id: string, balance: number, advance: number) {
    const has = balance > 0 || advance > 0;
    const msg = has
      ? `This vendor has Due ₹${balance} / Advance ₹${advance}. Delete anyway?`
      : 'Delete this vendor?';
    if (!confirm(msg)) return;
    try {
      await deleteVendor({ id, force: has }).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || 'Delete failed');
    }
  }

  if (loading && !list.length) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 mb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vendor Ledger</h1>
          <p className="text-sm text-gray-500 mt-0.5">Goods, payments and advance with vendors</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedSearch(search.trim() || undefined);
            }}
            className="flex items-center w-full md:w-72 bg-white border rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 overflow-hidden"
          >
            <FiSearch className="ml-3 shrink-0 text-gray-400" size={18} />
            <input
              type="search"
              placeholder="Search name / phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 px-2 py-2.5 text-base outline-none bg-transparent"
            />
            <button
              type="submit"
              className="m-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium active:scale-95 transition"
            >
              Search
            </button>
          </form>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium shadow-sm active:scale-95 transition whitespace-nowrap"
          >
            <FiUserPlus size={16} />
            Add Vendor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 min-w-0">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wide">Vendors</p>
          <p className="text-lg sm:text-2xl font-bold mt-1">{list.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 min-w-0">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wide">Total Due</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 text-amber-700 truncate">
            ₹{totalDue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 min-w-0">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wide">Advance</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 text-blue-700 truncate">
            ₹{totalAdvance.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2.5">
        {list.length === 0 && (
          <div className="bg-white rounded-xl border py-10 text-center text-gray-500 text-sm px-4">
            No vendors yet. Tap &quot;Add Vendor&quot; to start.
          </div>
        )}
        {list.map((v) => (
          <div key={v._id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <Link href={`/admin/vendors/${v._id}`} className="block p-3.5 active:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="shrink-0 w-10 h-10 rounded-full bg-primary-50 text-primary-700 font-bold flex items-center justify-center">
                  {v.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base truncate">{v.name}</p>
                  <p className="text-sm text-gray-500 truncate">{v.phone || 'No phone'}</p>
                </div>
                {v.pendingBills ? (
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-medium">
                    {v.pendingBills} bill pending
                  </span>
                ) : null}
                <FiChevronRight className="shrink-0 text-gray-400" size={20} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className={`rounded-lg px-3 py-2 ${v.balance > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <p className="text-[11px] text-gray-500">Due</p>
                  <p className={`font-semibold truncate ${v.balance > 0 ? 'text-amber-700' : 'text-gray-700'}`}>
                    ₹{(v.balance || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className={`rounded-lg px-3 py-2 ${v.advance > 0 ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <p className="text-[11px] text-gray-500">Advance</p>
                  <p className={`font-semibold truncate ${v.advance > 0 ? 'text-blue-700' : 'text-gray-700'}`}>
                    ₹{(v.advance || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </Link>
            <div className="flex items-center justify-between px-3.5 py-2 border-t bg-gray-50/60">
              {v.phone ? (
                <a
                  href={`tel:${v.phone}`}
                  className="inline-flex items-center gap-1 text-primary-600 text-xs px-2 py-1 rounded-lg hover:bg-primary-50"
                >
                  <FiPhone size={13} />
                  Call
                </a>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => del(v._id, v.balance || 0, v.advance || 0)}
                className="inline-flex items-center gap-1 text-red-500 text-xs px-2 py-1 rounded-lg hover:bg-red-50"
              >
                <FiTrash2 size={13} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4">Vendor</th>
                <th className="text-left py-3 px-4">Phone</th>
                <th className="text-right py-3 px-4">Due</th>
                <th className="text-right py-3 px-4">Advance</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    No vendors yet. Tap &quot;Add Vendor&quot; to start.
                  </td>
                </tr>
              )}
              {list.map((v) => (
                <tr key={v._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">
                    {v.name}
                    {v.pendingBills ? (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-medium">
                        {v.pendingBills} bill pending
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 px-4">{v.phone || '—'}</td>
                  <td className="py-3 px-4 text-right font-semibold text-amber-700">
                    ₹{(v.balance || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-blue-700">
                    ₹{(v.advance || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Link
                      href={`/admin/vendors/${v._id}`}
                      className="text-primary-600 mr-3 hover:underline"
                    >
                      Ledger
                    </Link>
                    <button
                      type="button"
                      onClick={() => del(v._id, v.balance || 0, v.advance || 0)}
                      className="text-red-600"
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

      {showAdd && (
        <PhoneSheet
          title="New Vendor"
          onClose={() => setShowAdd(false)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="py-3 border rounded-xl text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-vendor-form"
                disabled={saving}
                className="py-3 bg-primary-600 text-white rounded-xl text-base disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          }
        >
          <form id="add-vendor-form" onSubmit={create} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Name *</label>
              <input name="name" required className="w-full px-3 py-2.5 border rounded-lg text-base" />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input name="phone" inputMode="tel" className="w-full px-3 py-2.5 border rounded-lg text-base" />
            </div>
            <div>
              <label className="block text-sm mb-1">Address</label>
              <input name="address" className="w-full px-3 py-2.5 border rounded-lg text-base" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Opening due</label>
                <input
                  name="openingBalance"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full px-3 py-2.5 border rounded-lg text-base"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Opening advance</label>
                <input
                  name="openingAdvance"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="w-full px-3 py-2.5 border rounded-lg text-base"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <textarea name="notes" rows={2} className="w-full px-3 py-2.5 border rounded-lg text-base" />
            </div>
          </form>
        </PhoneSheet>
      )}
    </div>
  );
}
