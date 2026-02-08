'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { FiHome, FiUsers, FiPackage, FiShoppingCart, FiSettings, FiLogOut, FiMenu, FiX } from 'react-icons/fi';

const links = [
  { href: '/admin', label: 'Dashboard', icon: FiHome },
  { href: '/admin/users', label: 'Users', icon: FiUsers },
  { href: '/admin/products', label: 'Products', icon: FiPackage },
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
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded shadow">
        {open ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>
      {open && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-white shadow z-40 transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-primary-600">HD Manage</h1>
          <p className="text-xs text-gray-500">Admin Panel</p>
        </div>
        <nav className="p-4 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${path === href ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'}`}>
              <Icon size={20} /> <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg">
            <FiLogOut size={20} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
