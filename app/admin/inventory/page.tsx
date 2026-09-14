'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGetInventoryQuery } from '@/store/api';

type InventoryItem = {
  _id: string;
  name: string;
  price?: number;
  purchasePrice?: number;
  stock?: number;
  minimumQuantity?: number;
  category?: { name?: string } | string;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
};

function getName(obj: { name?: string } | string | undefined) {
  if (!obj) return '';
  return typeof obj === 'object' && obj && 'name' in obj ? obj.name : String(obj || '');
}

function statusBadge(p: InventoryItem) {
  if (p.isOutOfStock) {
    return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">Out of stock</span>;
  }
  if (p.isLowStock) {
    return <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">Low stock</span>;
  }
  return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">OK</span>;
}

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const q = filter !== 'all' ? `?status=${filter}` : '';
  const { data, isLoading: loading } = useGetInventoryQuery(q);
  const items = (data?.data ?? []) as InventoryItem[];
  const summary = data?.summary ?? null;

  const filtered = items.filter(
    (p) =>
      !search ||
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (getName(p.category) || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading && !items.length) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Stock levels, minimums, and purchase vs sell rates</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2.5 border rounded-lg flex-1 sm:w-56 text-base min-w-0"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'low' | 'out')}
            className="px-3 py-2.5 border rounded-lg text-base"
          >
            <option value="all">All items</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 min-w-0">
            <p className="text-sm text-gray-500">Total products</p>
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 min-w-0">
            <p className="text-sm text-gray-500">In stock</p>
            <p className="text-2xl font-bold text-green-600">{summary.inStock}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 min-w-0">
            <p className="text-sm text-gray-500">Low stock</p>
            <p className="text-2xl font-bold text-amber-600">{summary.lowStock}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 min-w-0">
            <p className="text-sm text-gray-500">Out of stock</p>
            <p className="text-2xl font-bold text-red-600">{summary.outOfStock}</p>
          </div>
        </div>
      )}

      {(summary?.lowStock ?? 0) > 0 || (summary?.outOfStock ?? 0) > 0 ? (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="font-semibold text-amber-800">Attention needed</p>
          <p className="text-sm text-amber-900 mt-1">
            {summary?.outOfStock ? `${summary.outOfStock} product(s) out of stock. ` : ''}
            {summary?.lowStock ? `${summary.lowStock} product(s) below minimum quantity.` : ''}{' '}
            When new stock arrives, use{' '}
            <Link href="/admin/restock" className="underline font-medium">
              Stock In
            </Link>{' '}
            to add quantity.
          </p>
        </div>
      ) : null}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow py-10 text-center text-gray-500 text-sm">
            No inventory items
          </div>
        )}
        {filtered.map((p) => (
          <div
            key={p._id}
            className={`bg-white rounded-lg shadow p-4 ${
              p.isOutOfStock ? 'ring-1 ring-red-100' : p.isLowStock ? 'ring-1 ring-amber-100' : ''
            }`}
          >
            <div className="flex justify-between gap-3 items-start">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{getName(p.category) || '—'}</p>
              </div>
              {statusBadge(p)}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t text-sm">
              <div>
                <p className="text-xs text-gray-500">Stock</p>
                <p className="font-semibold">{p.stock ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Min qty</p>
                <p className="font-semibold">{p.minimumQuantity ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Purchase</p>
                <p className="font-medium">₹{p.purchasePrice ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sell</p>
                <p className="font-medium">₹{p.price ?? 0}</p>
              </div>
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
                <th className="text-left py-3 px-4">Product</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-left py-3 px-4">Stock</th>
                <th className="text-left py-3 px-4">Min qty</th>
                <th className="text-left py-3 px-4">Purchase</th>
                <th className="text-left py-3 px-4">Sell</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p._id}
                  className={`border-b hover:bg-gray-50 ${
                    p.isOutOfStock ? 'bg-red-50/50' : p.isLowStock ? 'bg-amber-50/50' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-medium">{p.name}</td>
                  <td className="py-3 px-4 text-gray-600">{getName(p.category)}</td>
                  <td className="py-3 px-4">{p.stock ?? 0}</td>
                  <td className="py-3 px-4">{p.minimumQuantity ?? 0}</td>
                  <td className="py-3 px-4">₹{p.purchasePrice ?? 0}</td>
                  <td className="py-3 px-4">₹{p.price ?? 0}</td>
                  <td className="py-3 px-4">{statusBadge(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-gray-500">No inventory items</div>}
      </div>
    </div>
  );
}
