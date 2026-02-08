'use client';

import { useEffect, useState } from 'react';
import { FiUsers, FiShoppingCart, FiDollarSign, FiPackage } from 'react-icons/fi';

type Order = { _id: string; total?: number; status?: string; created_at?: string; user?: { name?: string } };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, products: 0, todayOrders: 0, todayCollection: 0 });
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = getToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [uRes, pRes, oRes] = await Promise.all([
          fetch(`${API_BASE}/api/users`, { headers }),
          fetch(`${API_BASE}/api/products`, { headers }),
          fetch(`${API_BASE}/api/orders/all`, { headers }),
        ]);

        const uData = await uRes.json();
        const pData = await pRes.json();
        const oData = await oRes.json();

        const users = uData?.users ?? uData?.data ?? [];
        const products = pData?.data ?? [];
        const allOrders = oData?.data ?? [];

        const today = new Date().toDateString();
        const todayList = allOrders.filter((o: Order) => new Date(o.created_at || 0).toDateString() === today);
        const todayCollection = todayList.reduce((sum: number, o: Order) => sum + (o.total || 0), 0);

        setStats({
          users: Array.isArray(users) ? users.length : 0,
          products: Array.isArray(products) ? products.length : 0,
          todayOrders: todayList.length,
          todayCollection,
        });
        setTodayOrders(todayList);
      } catch {
        setTodayOrders([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: 'Total Users', value: stats.users, icon: FiUsers, color: 'bg-blue-500' },
    { label: "Today's Orders", value: stats.todayOrders, icon: FiShoppingCart, color: 'bg-green-500' },
    { label: "Today's Collection", value: `₹${stats.todayCollection.toLocaleString()}`, icon: FiDollarSign, color: 'bg-amber-500' },
    { label: 'Total Products', value: stats.products, icon: FiPackage, color: 'bg-purple-500' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className="text-xl font-bold">{c.value}</p>
              </div>
              <div className={`${c.color} p-3 rounded-full`}><Icon className="text-white" size={24} /></div>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-bold mb-4">Today&apos;s Orders</h2>
        {todayOrders.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No orders today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">ID</th><th className="text-left py-2">Customer</th><th className="text-left py-2">Amount</th><th className="text-left py-2">Status</th></tr></thead>
              <tbody>
                {todayOrders.map((o) => (
                  <tr key={o._id} className="border-b">
                    <td className="py-2">#{String(o._id).slice(-6)}</td>
                    <td className="py-2">{o.user?.name || 'N/A'}</td>
                    <td className="py-2">₹{Number(o.total || 0).toLocaleString()}</td>
                    <td className="py-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{o.status || 'pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
