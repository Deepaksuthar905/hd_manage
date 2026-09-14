'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useGetMeQuery, usePrefetch } from '@/store/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const { data, isLoading, isError } = useGetMeQuery(undefined, {
    skip: !hasToken,
  });

  const prefetchProducts = usePrefetch('getProducts');
  const prefetchCategories = usePrefetch('getCategories');
  const prefetchOrders = usePrefetch('getOrders');
  const prefetchUsers = usePrefetch('getUsers');
  const prefetchCredit = usePrefetch('getCreditCustomers');

  useEffect(() => {
    const t = !!localStorage.getItem('admin_token');
    setHasToken(t);
    setReady(true);
    if (!t) router.replace('/admin/login');
  }, [router]);

  useEffect(() => {
    if (isError) {
      localStorage.removeItem('admin_token');
      router.replace('/admin/login');
    }
  }, [isError, router]);

  useEffect(() => {
    if (data?.user && data.user.role !== 'admin') {
      localStorage.removeItem('admin_token');
      router.replace('/admin/login');
    }
  }, [data, router]);

  useEffect(() => {
    if (data?.user?.role === 'admin') {
      prefetchProducts();
      prefetchCategories();
      prefetchOrders();
      prefetchUsers();
      prefetchCredit();
    }
  }, [
    data?.user?.role,
    prefetchProducts,
    prefetchCategories,
    prefetchOrders,
    prefetchUsers,
    prefetchCredit,
  ]);

  if (!ready || (hasToken && isLoading && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasToken || !data?.user || data.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 min-h-screen lg:ml-64 px-3 py-4 sm:p-4 lg:p-8 pt-[4.25rem] lg:pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
