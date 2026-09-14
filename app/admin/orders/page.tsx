'use client';

import { useState } from 'react';
import PhoneSheet from '@/components/PhoneSheet';
import { API_ROOT, useGetOrdersQuery, useUpdateOrderStatusMutation } from '@/store/api';

type ShippingAddress = { phone?: string; city?: string; state?: string; pincode?: string; address?: string };
type OrderItem = {
  _id?: string;
  product?: { name?: string; price?: number };
  quantity?: number;
  price?: number;
  selectedSize?: string;
};
type Order = {
  _id: string;
  total?: number;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentScreenshot?: string;
  created_at?: string;
  user?: { _id?: string; name?: string; email?: string; phone?: string };
  items?: OrderItem[];
  shippingAddress?: ShippingAddress;
};

function getImageUrl(img: string) {
  if (!img || img.startsWith('http')) return img;
  return `${API_ROOT}${img.startsWith('/') ? '' : '/'}${img}`;
}

export default function OrdersPage() {
  const { data: orders = [], isLoading: loading } = useGetOrdersQuery();
  const [updateStatusMut] = useUpdateOrderStatusMutation();
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState<Order | null>(null);

  async function updateStatus(id: string, status: string) {
    try {
      await updateStatusMut({ id, status }).unwrap();
    } catch {
      alert('Update failed');
    }
  }

  const filtered =
    filter === 'all' ? (orders as Order[]) : (orders as Order[]).filter((o) => o.status === filter);

  if (loading && !orders.length) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Orders</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2.5 border rounded-lg w-full sm:w-40 text-base"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow py-10 text-center text-gray-500 text-sm">
            No orders
          </div>
        )}
        {filtered.map((o) => (
          <div key={o._id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between gap-3 items-start">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-base">#{String(o._id).slice(-6)}</p>
                <p className="text-sm text-gray-600 mt-0.5 truncate">{o.user?.name || 'N/A'}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}
                </p>
              </div>
              <p className="font-semibold shrink-0">₹{Number(o.total || 0).toLocaleString()}</p>
            </div>
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-500">Status</span>
                <select
                  value={o.status || 'pending'}
                  onChange={(e) => updateStatus(o._id, e.target.value)}
                  className="px-2 py-1.5 rounded border text-sm max-w-[55%]"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <p className="text-xs text-gray-500">
                {o.paymentMethod || '-'} / {o.paymentStatus || '-'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetail(o)}
              className="mt-3 w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium"
            >
              View
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
                <th className="text-left py-3 px-4">ID</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Payment</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">#{String(o._id).slice(-6)}</td>
                  <td className="py-3 px-4">{o.user?.name || 'N/A'}</td>
                  <td className="py-3 px-4">₹{Number(o.total || 0).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <select
                      value={o.status || 'pending'}
                      onChange={(e) => updateStatus(o._id, e.target.value)}
                      className="px-2 py-1 rounded text-xs border"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs">
                      {o.paymentMethod || '-'} / {o.paymentStatus || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <button type="button" onClick={() => setDetail(o)} className="text-primary-600">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-gray-500">No orders</div>}
      </div>

      {detail && (
        <PhoneSheet
          title="Order Details"
          wide
          onClose={() => setDetail(null)}
          footer={
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="w-full py-3 bg-primary-600 text-white rounded-xl text-base"
            >
              Close
            </button>
          }
        >
          <div className="space-y-2 text-sm">
            <p>
              <strong>ID:</strong> #{String(detail._id).slice(-6)}
            </p>
            <p>
              <strong>Customer:</strong> {detail.user?.name || 'N/A'}
            </p>
            <p>
              <strong>Email:</strong> {detail.user?.email || '-'}
            </p>
            <p>
              <strong>Phone:</strong> {detail.user?.phone || detail.shippingAddress?.phone || '-'}
            </p>
            <p>
              <strong>Total:</strong> ₹{Number(detail.total || 0).toLocaleString()}
            </p>
            <p>
              <strong>Status:</strong> {detail.status || 'pending'}
            </p>
            <p>
              <strong>Payment:</strong> {detail.paymentMethod || '-'} / {detail.paymentStatus || '-'}
            </p>
            <p>
              <strong>Date:</strong>{' '}
              {detail.created_at ? new Date(detail.created_at).toLocaleString() : '-'}
            </p>
          </div>

          {detail.shippingAddress && (detail.shippingAddress.city || detail.shippingAddress.state) && (
            <div className="mt-4">
              <strong className="text-sm">Shipping Address:</strong>
              <p className="text-sm text-gray-600 mt-1">
                {[
                  detail.shippingAddress.address,
                  detail.shippingAddress.city,
                  detail.shippingAddress.state,
                  detail.shippingAddress.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}

          {detail.paymentScreenshot && (
            <div className="mt-4">
              <strong className="text-sm">Payment Screenshot:</strong>
              <a
                href={getImageUrl(detail.paymentScreenshot)}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-1"
              >
                <img
                  src={getImageUrl(detail.paymentScreenshot)}
                  alt="Payment"
                  className="max-h-32 rounded border"
                />
              </a>
            </div>
          )}

          {detail.items?.length ? (
            <div className="mt-4">
              <strong className="text-sm">Items:</strong>
              <ul className="mt-2 space-y-2 text-sm">
                {detail.items.map((it, i) => (
                  <li key={it._id || i} className="border-b pb-2 last:border-0">
                    <span className="font-medium">{it.product?.name || 'Product'}</span>
                    {it.selectedSize && (
                      <span className="text-gray-600 ml-1">| Size: {it.selectedSize}</span>
                    )}
                    <span className="text-gray-600 ml-1">
                      | Qty: {it.quantity || 0} @ ₹{it.price}
                    </span>
                    <span className="font-medium ml-1">
                      = ₹{((it.quantity || 0) * (it.price || 0)).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </PhoneSheet>
      )}
    </div>
  );
}
