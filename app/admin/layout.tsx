'use client';

import { usePathname } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === '/admin/login') return <>{children}</>;
  return <AdminLayout>{children}</AdminLayout>;
}
