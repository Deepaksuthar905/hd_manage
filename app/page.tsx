'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/login'); }, [router]);
  return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;
}
