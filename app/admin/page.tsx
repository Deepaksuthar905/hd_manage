'use client';

import Link from 'next/link';
import { FiUsers, FiShoppingCart, FiDollarSign, FiPackage, FiAlertTriangle } from 'react-icons/fi';
import { useGetUsersQuery, useGetProductsQuery, useGetOrdersQuery, useGetInventoryQuery } from '@/store/api';

type Order = { _id: string; total?: number; status?: string; created_at?: string; user?: { name?: string } };

export default function Dashboard() {
  const { data: users = [], isLoading: uLoading } = useGetUsersQuery();
  const { data: products = [], isLoading: pLoading } = useGetProductsQuery();
  const { data: allOrders = [], isLoading: oLoading } = useGetOrdersQuery();
  const { data: inv, isLoading: iLoading } = useGetInventoryQuery();

  const loading = uLoading || pLoading || oLoading || iLoading;

  const today = new Date().toDateString();
  const todayList = (allOrders as Order[]).filter(
    (o) => new Date(o.created_at || 0).toDateString() === today
  );
  const todayCollection = todayList.reduce((sum, o) => sum + (o.total || 0), 0);
  const invSummary = inv?.summary ?? {};
  const lowStockItems = (inv?.data ?? [])
    .filter((i: { isLowStock?: boolean; isOutOfStock?: boolean }) => i.isLowStock || i.isOutOfStock)
    .slice(0, 8);

  const stats = {
    users: users.length,
    products: products.length,
    todayOrders: todayList.length,
    todayCollection,
    lowStock: invSummary.lowStock ?? 0,
    outOfStock: invSummary.outOfStock ?? 0,
  };

  const cards = [
    { label: 'Total Users', value: stats.users, icon: FiUsers, color: 'bg-blue-500' },
    { label: "Today's Orders", value: stats.todayOrders, icon: FiShoppingCart, color: 'bg-green-500' },
    { label: "Today's Collection", value: `₹${stats.todayCollection.toLocaleString()}`, icon: FiDollarSign, color: 'bg-amber-500' },
    { label: 'Total Products', value: stats.products, icon: FiPackage, color: 'bg-purple-500' },
  ];

  if (loading && !users.length && !products.length) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg shadow p-5 flex items-center gap-4 min-w-0">
            <div className={`${color} text-white p-3 rounded-lg shrink-0`}>
              <Icon size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xl font-bold break-all">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Today&apos;s Orders</h2>
            <Link href="/admin/orders" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {!todayList.length ? (
            <p className="p-6 text-gray-500 text-sm">No orders today</p>
          ) : (
            <ul className="divide-y">
              {todayList.slice(0, 6).map((o) => (
                <li key={o._id} className="px-4 py-3 flex justify-between text-sm">
                  <span>{o.user?.name || o._id.slice(-6)}</span>
                  <span className="font-medium">₹{(o.total || 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <FiAlertTriangle className="text-amber-500" /> Stock alerts
            </h2>
            <Link href="/admin/inventory" className="text-sm text-primary-600 hover:underline">Inventory</Link>
          </div>
          <div className="px-4 py-2 text-xs text-gray-500">
            Low: {stats.lowStock} · Out: {stats.outOfStock}
          </div>
          {!lowStockItems.length ? (
            <p className="p-6 text-gray-500 text-sm">All stock levels OK</p>
          ) : (
            <ul className="divide-y">
              {lowStockItems.map((item: { _id: string; name: string; stock?: number; minimumQuantity?: number }) => (
                <li key={item._id} className="px-4 py-3 flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="text-amber-700 font-medium">
                    {item.stock ?? 0} / min {item.minimumQuantity ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
