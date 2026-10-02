'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiSearch, FiShoppingCart, FiUserPlus } from 'react-icons/fi';
import PhoneSheet from '@/components/PhoneSheet';
import {
  useGetCreditCustomersQuery,
  useCreateCreditCustomerMutation,
  useDeleteCreditCustomerMutation,
} from '@/store/api';

type CreditCustomer = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  balance: number;
  status?: string;
  created_at?: string;
};

export default function CreditCustomersPage() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState<string | undefined>(undefined);
  const { data, isLoading: loading } = useGetCreditCustomersQuery(appliedSearch);
  const list: CreditCustomer[] = data?.data ?? [];
  const totalDue = data?.summary?.totalDue ?? 0;

  const [createCreditCustomer, { isLoading: saving }] = useCreateCreditCustomerMutation();
  const [deleteCreditCustomer] = useDeleteCreditCustomerMutation();

  const [showAdd, setShowAdd] = useState(false);

  function doSearch() {
    setAppliedSearch(search.trim() || undefined);
  }

  async function createCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await createCreditCustomer({
        name: fd.get('name'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        notes: fd.get('notes'),
        openingBalance: parseFloat(String(fd.get('openingBalance') || '0')) || 0,
      }).unwrap();
      setShowAdd(false);
      form.reset();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || 'Failed to create');
    }
  }

  async function del(id: string, balance: number) {
    const msg =
      balance > 0
        ? `This customer has ₹${balance} pending. Delete anyway?`
        : 'Delete this credit customer?';
    if (!confirm(msg)) return;
    try {
      await deleteCreditCustomer({ id, force: balance > 0 }).unwrap();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      alert(msg || 'Delete failed');
    }
  }

  if (loading) {
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
          <h1 className="text-xl sm:text-2xl font-bold">Credit</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track balances, sales on credit, and payments
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doSearch();
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
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Link
              href="/admin/sales"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow-sm active:scale-95 transition whitespace-nowrap"
            >
              <FiShoppingCart size={16} />
              New Sale
            </Link>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium shadow-sm active:scale-95 transition whitespace-nowrap"
            >
              <FiUserPlus size={16} />
              Add Customer
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wide">Customers</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{list.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wide">Total Due</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-amber-700 truncate">₹{totalDue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {list.length === 0 && (
          <div className="bg-white rounded-lg shadow py-10 text-center text-gray-500 text-sm px-4">
            No credit customers yet. Tap &quot;Add Customer&quot; to start.
          </div>
        )}
        {list.map((c) => (
          <div key={c._id} className="bg-white rounded-lg shadow p-4">
            <div className="min-w-0">
              <p className="font-semibold text-base truncate">{c.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{c.phone || 'No phone'}</p>
              {c.address ? (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.address}</p>
              ) : null}
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500">Balance due</p>
              <p
                className={`font-semibold text-lg ${
                  c.balance > 0 ? 'text-amber-700' : 'text-green-700'
                }`}
              >
                ₹{(c.balance || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link
                href={`/admin/credit/${c._id}`}
                className="text-center py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium"
              >
                Ledger
              </Link>
              <button
                type="button"
                onClick={() => del(c._id, c.balance || 0)}
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
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Phone</th>
                <th className="text-left py-3 px-4">Address</th>
                <th className="text-right py-3 px-4">Balance (Due)</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    No credit customers yet. Use &quot;Add Customer&quot; to start.
                  </td>
                </tr>
              )}
              {list.map((c) => (
                <tr key={c._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{c.name}</td>
                  <td className="py-3 px-4">{c.phone || '—'}</td>
                  <td className="py-3 px-4 max-w-[200px] truncate">{c.address || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-semibold ${
                        c.balance > 0 ? 'text-amber-700' : 'text-green-700'
                      }`}
                    >
                      ₹{(c.balance || 0).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Link
                      href={`/admin/credit/${c._id}`}
                      className="text-primary-600 mr-3 hover:underline"
                    >
                      Ledger
                    </Link>
                    <button
                      type="button"
                      onClick={() => del(c._id, c.balance || 0)}
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
          title="New Credit Customer"
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
                form="credit-add-form"
                disabled={saving}
                className="py-3 bg-primary-600 text-white rounded-xl text-base disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          }
        >
          <form id="credit-add-form" onSubmit={createCustomer} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Name *</label>
              <input
                name="name"
                required
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                name="phone"
                inputMode="tel"
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Address</label>
              <input name="address" className="w-full px-3 py-2.5 border rounded-lg text-base" />
            </div>
            <div>
              <label className="block text-sm mb-1">Opening balance</label>
              <input
                name="openingBalance"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                inputMode="decimal"
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <textarea
                name="notes"
                rows={2}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              />
            </div>
          </form>
        </PhoneSheet>
      )}
    </div>
  );
}
