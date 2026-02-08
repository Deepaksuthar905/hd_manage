'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          localStorage.removeItem('admin_token');
          router.replace('/admin/login');
          return;
        }
        const data = await res.json();
        if (data.user?.role !== 'admin') {
          localStorage.removeItem('admin_token');
          router.replace('/admin/login');
        }
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        router.replace('/admin/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">{children}</main>
    </div>
  );
}
