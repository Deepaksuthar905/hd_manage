'use client';

import { useEffect, useState } from 'react';

type ShippingAddress = { phone?: string; city?: string; state?: string; pincode?: string; address?: string };
type OrderItem = { _id?: string; product?: { name?: string; price?: number }; quantity?: number; price?: number; selectedSize?: string };
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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://backend-jc8p.onrender.com/api').replace(/\/api\/?$/, '');

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

function getImageUrl(img: string) {
  if (!img || img.startsWith('http')) return img;
  return `${API_BASE}${img.startsWith('/') ? '' : '/'}${img}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState<Order | null>(null);

  async function load() {
    try {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/orders/all`, { headers });
      const data = await res.json();
      setOrders(data?.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    try {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status }),
      });
      if (res.ok) load();
      else alert('Update failed');
    } catch {
      alert('Update failed');
    }
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border rounded-lg w-full sm:w-40">
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    <select value={o.status || 'pending'} onChange={(e) => updateStatus(o._id, e.target.value)} className="px-2 py-1 rounded text-xs border">
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs">{o.paymentMethod || '-'} / {o.paymentStatus || '-'}</span>
                  </td>
                  <td className="py-3 px-4">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</td>
                  <td className="py-3 px-4"><button onClick={() => setDetail(o)} className="text-primary-600">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-gray-500">No orders</div>}
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Order Details</h2>
            <div className="space-y-2 text-sm">
              <p><strong>ID:</strong> #{String(detail._id).slice(-6)}</p>
              <p><strong>Customer:</strong> {detail.user?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {detail.user?.email || '-'}</p>
              <p><strong>Phone:</strong> {detail.user?.phone || detail.shippingAddress?.phone || '-'}</p>
              <p><strong>Total:</strong> ₹{Number(detail.total || 0).toLocaleString()}</p>
              <p><strong>Status:</strong> {detail.status || 'pending'}</p>
              <p><strong>Payment:</strong> {detail.paymentMethod || '-'} / {detail.paymentStatus || '-'}</p>
              <p><strong>Date:</strong> {detail.created_at ? new Date(detail.created_at).toLocaleString() : '-'}</p>
            </div>

            {detail.shippingAddress && (detail.shippingAddress.city || detail.shippingAddress.state) && (
              <div className="mt-4">
                <strong className="text-sm">Shipping Address:</strong>
                <p className="text-sm text-gray-600 mt-1">
                  {[detail.shippingAddress.address, detail.shippingAddress.city, detail.shippingAddress.state, detail.shippingAddress.pincode].filter(Boolean).join(', ')}
                </p>
                {detail.shippingAddress.phone && <p className="text-sm text-gray-600">Phone: {detail.shippingAddress.phone}</p>}
              </div>
            )}

            {detail.paymentScreenshot && (
              <div className="mt-4">
                <strong className="text-sm">Payment Screenshot:</strong>
                <a href={getImageUrl(detail.paymentScreenshot)} target="_blank" rel="noopener noreferrer" className="block mt-1">
                  <img src={getImageUrl(detail.paymentScreenshot)} alt="Payment" className="max-h-32 rounded border" />
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
                      {it.selectedSize && <span className="text-gray-600 ml-1">| Size: {it.selectedSize}</span>}
                      <span className="text-gray-600 ml-1">| Qty: {it.quantity || 0} @ ₹{it.price}</span>
                      <span className="font-medium ml-1">= ₹{((it.quantity || 0) * (it.price || 0)).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button onClick={() => setDetail(null)} className="mt-4 w-full py-2 bg-primary-600 text-white rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
