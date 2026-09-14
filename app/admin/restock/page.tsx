'use client';

import { useEffect, useState } from 'react';
import PhoneSheet from '@/components/PhoneSheet';
import { useGetProductsQuery, useRestockProductMutation } from '@/store/api';

type Product = {
  _id: string;
  name: string;
  stock?: number;
  purchasePrice?: number;
  price?: number;
  category?: { name?: string } | string;
};

function getName(obj: { name?: string } | string | undefined) {
  if (!obj) return '';
  return typeof obj === 'object' && obj && 'name' in obj ? obj.name : String(obj || '');
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);
  return isMobile;
}

export default function RestockPage() {
  const { data: products = [], isLoading: loading } = useGetProductsQuery();
  const [restockProduct] = useRestockProductMutation();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function openRestock(p: Product) {
    setSelected(p);
    setQuantity('');
    setPurchasePrice(String(p.purchasePrice ?? ''));
    setMessage('');
  }

  function closeRestock() {
    setSelected(null);
    setQuantity('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const qty = parseInt(quantity);
    if (!qty || qty < 1) {
      alert('Enter valid quantity');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const body: { quantity: number; purchasePrice?: number } = { quantity: qty };
      if (purchasePrice !== '') body.purchasePrice = parseFloat(purchasePrice) || 0;
      const data = await restockProduct({ id: selected._id, body }).unwrap();
      setMessage(
        `✓ ${selected.name}: +${qty} added. New stock: ${data?.data?.newStock ?? 'updated'}`
      );
      setSelected(null);
      setQuantity('');
    } catch (err: any) {
      alert(err?.data?.message || 'Restock failed');
    } finally {
      setSaving(false);
    }
  }

  const list = products as Product[];
  const filtered = list.filter(
    (p) => !search || (p.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const lowOrOut = filtered.filter((p) => (p.stock ?? 0) === 0 || (p.stock ?? 0) <= 5);

  const formFields = selected ? (
    <>
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="font-medium">{selected.name}</p>
        <p className="text-sm text-gray-500">
          Current stock: {selected.stock ?? 0} · Last rate: ₹{selected.purchasePrice ?? 0}
        </p>
      </div>
      <div>
        <label className="block text-sm mb-1">Quantity received *</label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full px-3 py-2.5 border rounded-lg text-base"
          placeholder="How many units received?"
          required
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Purchase rate (this batch) *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
          className="w-full px-3 py-2.5 border rounded-lg text-base"
          placeholder="Rate for this batch"
          required
        />
      </div>
    </>
  ) : null;

  if (loading && !list.length) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Stock In</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add received quantity and the purchase rate for this batch
        </p>
      </div>

      {message && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desktop side panel */}
        <div className="hidden md:block bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold mb-4">Add stock to product</h2>
          {selected ? (
            <form onSubmit={submit} className="space-y-4">
              {formFields}
              <div className="flex gap-2">
                <button type="button" onClick={closeRestock} className="flex-1 py-2 border rounded">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-primary-600 text-white rounded disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Stock'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-500 text-sm">Select a product below using the Stock In button</p>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h2 className="font-semibold text-amber-900 mb-2">Need restock?</h2>
          <p className="text-sm text-amber-800 mb-3">Out of stock or low stock products:</p>
          {lowOrOut.length === 0 ? (
            <p className="text-sm text-amber-700">All products have healthy stock levels</p>
          ) : (
            <ul className="space-y-2">
              {lowOrOut.slice(0, 8).map((p) => (
                <li key={p._id} className="flex justify-between items-center gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {p.name} <span className="text-amber-700">({p.stock ?? 0} left)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openRestock(p)}
                    className="shrink-0 text-primary-600 font-medium hover:underline"
                  >
                    Stock In
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6">
        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2.5 border rounded-lg w-full sm:w-64 mb-4 text-base"
        />

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-lg shadow py-10 text-center text-gray-500 text-sm">
              No products
            </div>
          )}
          {filtered.map((p) => (
            <div
              key={p._id}
              className={`bg-white rounded-lg shadow p-4 ${(p.stock ?? 0) === 0 ? 'ring-1 ring-red-100' : ''}`}
            >
              <div className="flex justify-between gap-3 items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{getName(p.category) || '—'}</p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${(p.stock ?? 0) === 0 ? 'text-red-600' : (p.stock ?? 0) <= 5 ? 'text-amber-700' : 'text-gray-800'}`}
                >
                  {p.stock ?? 0} in stock
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Purchase rate: ₹{p.purchasePrice ?? 0}</p>
              <button
                type="button"
                onClick={() => openRestock(p)}
                className="mt-3 w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium"
              >
                Stock In
              </button>
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
                  <th className="text-left py-3 px-4">Purchase rate</th>
                  <th className="text-left py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p._id}
                    className={`border-b hover:bg-gray-50 ${(p.stock ?? 0) === 0 ? 'bg-red-50/40' : ''}`}
                  >
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-gray-600">{getName(p.category)}</td>
                    <td className="py-3 px-4">{p.stock ?? 0}</td>
                    <td className="py-3 px-4">₹{p.purchasePrice ?? 0}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => openRestock(p)}
                        className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700"
                      >
                        Stock In
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="py-12 text-center text-gray-500">No products</div>}
        </div>
      </div>

      {/* Mobile restock sheet — mount only on mobile to avoid body scroll lock on desktop */}
      {selected && isMobile && (
        <PhoneSheet
          title="Stock In"
          onClose={closeRestock}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={closeRestock} className="py-3 border rounded-xl text-base">
                Cancel
              </button>
              <button
                type="submit"
                form="restock-mobile-form"
                disabled={saving}
                className="py-3 bg-primary-600 text-white rounded-xl text-base disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Stock'}
              </button>
            </div>
          }
        >
          <form id="restock-mobile-form" onSubmit={submit} className="space-y-4">
            {formFields}
          </form>
        </PhoneSheet>
      )}
    </div>
  );
}
