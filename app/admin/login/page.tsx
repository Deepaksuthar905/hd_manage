'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROOT, adminApi } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';

function getRoleFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded?.role ?? null;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || 'Login failed');
        return;
      }
      const token = data.token;
      if (!token) {
        setError('Invalid response');
        return;
      }
      const role = data.user?.role ?? getRoleFromToken(token);
      if (role !== 'admin') {
        setError('Admin access only. Your role: ' + (role || 'customer'));
        return;
      }
      localStorage.setItem('admin_token', token);
      dispatch(adminApi.util.resetApiState());
      router.push('/admin');
    } catch {
      setError('Network error. Is backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-primary-600 text-center mb-2">HD Manage</h1>
        <p className="text-gray-500 text-center mb-6">Admin Login</p>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm break-words">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-3 border rounded-xl text-base"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-3 border rounded-xl text-base"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 text-base font-medium"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
