'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  FiHome,
  FiUsers,
  FiPackage,
  FiShoppingCart,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiLayers,
  FiTrendingUp,
  FiPlusCircle,
  FiBookOpen,
  FiTruck,
} from 'react-icons/fi';

const links = [
  { href: '/admin', label: 'Dashboard', icon: FiHome },
  { href: '/admin/users', label: 'Users', icon: FiUsers },
  { href: '/admin/products', label: 'Products', icon: FiPackage },
  { href: '/admin/restock', label: 'Stock In', icon: FiPlusCircle },
  { href: '/admin/inventory', label: 'Inventory', icon: FiLayers },
  { href: '/admin/sales', label: 'Today Sales', icon: FiTrendingUp },
  { href: '/admin/credit', label: 'Udhar / Credit', icon: FiBookOpen },
  { href: '/admin/vendors', label: 'Vendor Ledger', icon: FiTruck },
  { href: '/admin/orders', label: 'Orders', icon: FiShoppingCart },
  { href: '/admin/settings', label: 'Settings', icon: FiSettings },
];

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login';
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 bg-white rounded-lg shadow-md border border-gray-100"
        aria-label="Menu"
      >
        {open ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>
      {open ? (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      ) : null}
      <aside
        className={`fixed left-0 top-0 h-[100dvh] w-[min(16rem,85vw)] bg-white shadow z-40 transform transition-transform lg:translate-x-0 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b shrink-0">
          <h1 className="text-xl font-bold text-primary-600">HD Manage</h1>
          <p className="text-xs text-gray-500">Admin Panel</p>
        </div>
        <nav className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-0.5 pb-4">
          {links.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== '/admin' && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                  active ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 p-3 border-t pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg text-sm"
          >
            <FiLogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
