'use client';

import { useState } from 'react';
import PhoneSheet from '@/components/PhoneSheet';
import { useGetUsersQuery, useUpdateUserMutation, useDeleteUserMutation } from '@/store/api';

type User = { _id: string; name: string; email: string; phone?: string; role?: string; created_at?: string };

export default function UsersPage() {
  const { data: list = [], isLoading: loading, isFetching } = useGetUsersQuery();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<User | null>(null);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const form = e.target as HTMLFormElement;
    const name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value;
    const email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value;
    const phone = (form.querySelector('[name="phone"]') as HTMLInputElement)?.value;
    const role = (form.querySelector('[name="role"]') as HTMLSelectElement)?.value;
    try {
      await updateUser({ id: edit._id, body: { name, email, phone, role } }).unwrap();
      setEdit(null);
    } catch {
      alert('Update failed');
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this user?')) return;
    try {
      await deleteUser(id).unwrap();
    } catch {
      alert('Delete failed');
    }
  }

  const filtered = (list as User[]).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && !list.length) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Users</h1>
          {isFetching && list.length > 0 ? (
            <p className="text-xs text-gray-400">Updating…</p>
          ) : (
            <p className="text-xs text-gray-400">Cached — no extra API until data goes stale</p>
          )}
        </div>
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2.5 border rounded-lg w-full sm:w-64 text-base"
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow py-10 text-center text-gray-500 text-sm">
            No users
          </div>
        )}
        {filtered.map((u) => (
          <div key={u._id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between gap-3 items-start">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-base truncate">{u.name}</p>
                <p className="text-sm text-gray-500 mt-0.5 break-all">{u.email}</p>
                <p className="text-sm text-gray-500 mt-0.5">{u.phone || 'No phone'}</p>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded text-xs ${
                  u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}
              >
                {u.role || 'customer'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEdit(u)}
                className="py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => del(u._id)}
                className="py-2.5 border border-red-200 text-red-600 rounded-lg text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
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
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {u.role || 'customer'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button type="button" onClick={() => setEdit(u)} className="text-primary-600 mr-3">
                      Edit
                    </button>
                    <button type="button" onClick={() => del(u._id)} className="text-red-600">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-gray-500">No users</div>}
      </div>

      {edit && (
        <PhoneSheet
          title="Edit User"
          onClose={() => setEdit(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="py-3 border rounded-xl text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="user-edit-form"
                className="py-3 bg-primary-600 text-white rounded-xl text-base"
              >
                Save
              </button>
            </div>
          }
        >
          <form id="user-edit-form" onSubmit={saveEdit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                name="name"
                defaultValue={edit.name}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={edit.email}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={edit.phone ?? ''}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Role</label>
              <select
                name="role"
                defaultValue={edit.role ?? 'customer'}
                className="w-full px-3 py-2.5 border rounded-lg text-base"
              >
                <option value="customer">customer</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </form>
        </PhoneSheet>
      )}
    </div>
  );
}
