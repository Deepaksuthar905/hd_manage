'use client';

import { useEffect, useState } from 'react';

type User = { _id: string; name: string; email: string; phone?: string; role?: string; created_at?: string };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://backend-jc8p.onrender.com/api').replace(/\/api\/?$/, '');

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

export default function UsersPage() {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<User | null>(null);

  async function load() {
    try {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/users`, { headers });
      const data = await res.json();
      setList(data?.users ?? data?.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const form = e.target as HTMLFormElement;
    const name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value;
    const email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value;
    const phone = (form.querySelector('[name="phone"]') as HTMLInputElement)?.value;
    const role = (form.querySelector('[name="role"]') as HTMLSelectElement)?.value;
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_BASE}/users/${edit._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name, email, phone, role }),
      });
      if (res.ok) {
        setEdit(null);
        load();
      } else {
        alert('Update failed');
      }
    } catch {
      alert('Update failed');
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this user?')) return;
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE', headers });
      if (res.ok) load();
      else alert('Delete failed');
    } catch {
      alert('Delete failed');
    }
  }

  const filtered = list.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

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
        <h1 className="text-2xl font-bold">Users</h1>
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border rounded-lg w-full sm:w-64" />
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Phone</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{u.name}</td>
                  <td className="py-3 px-4">{u.email}</td>
                  <td className="py-3 px-4">{u.phone || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {u.role || 'customer'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => setEdit(u)} className="text-primary-600 mr-3">Edit</button>
                    <button onClick={() => del(u._id)} className="text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-gray-500">No users</div>}
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Edit User</h2>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input name="name" defaultValue={edit.name} className="w-full px-3 py-2 border rounded" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input name="email" type="email" defaultValue={edit.email} className="w-full px-3 py-2 border rounded" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <input name="phone" type="tel" defaultValue={edit.phone ?? ''} className="w-full px-3 py-2 border rounded" placeholder="Phone number" />
              </div>
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select name="role" defaultValue={edit.role ?? 'customer'} className="w-full px-3 py-2 border rounded">
                  <option value="customer">customer</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEdit(null)} className="flex-1 py-2 border rounded">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
