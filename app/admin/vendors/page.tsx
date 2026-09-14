'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    <div className="w-full max-w-full">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vendor Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">
            Goods, credit, cash/online payments, and advance — full vendor account
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="text"
            placeholder="Search name / phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(search.trim() || undefined)}
            className="px-3 py-2.5 border rounded-lg w-full sm:w-56 text-base"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={() => setAppliedSearch(search.trim() || undefined)}
              className="px-3 py-2.5 border rounded-lg text-sm hover:bg-gray-50"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="px-3 py-2.5 bg-primary-600 text-white rounded-lg text-sm"
            >
              + Add Vendor
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-4 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Vendors</p>
          <p className="text-2xl font-bold mt-1">{list.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Due</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-amber-700 break-all">
            ₹{totalDue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Advance</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-blue-700 break-all">
            ₹{totalAdvance.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {list.length === 0 && (
          <div className="bg-white rounded-lg shadow py-10 text-center text-gray-500 text-sm px-4">
            No vendors yet. Tap &quot;Add Vendor&quot; to start.
          </div>
        )}
        {list.map((v) => (
          <div key={v._id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between gap-3 items-start">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-base truncate">{v.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{v.phone || 'No phone'}</p>
                {v.address ? (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{v.address}</p>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
              <div>
                <p className="text-xs text-gray-500">Due</p>
                <p className="font-semibold text-amber-700">
                  ₹{(v.balance || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Advance</p>
                <p className="font-semibold text-blue-700">
                  ₹{(v.advance || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link
                href={`/admin/vendors/${v._id}`}
                className="text-center py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium"
              >
                Ledger
              </Link>
              <button
                type="button"
                onClick={() => del(v._id, v.balance || 0, v.advance || 0)}
                className="py-2.5 border border-red-200 text-red-600 rounded-lg text-sm"
              >
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
                  <td className="py-3 px-4 font-medium">{v.name}</td>
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
