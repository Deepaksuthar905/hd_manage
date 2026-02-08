'use client';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow p-6 max-w-xl">
        <p className="text-gray-600">
          API base URL: <code className="bg-gray-100 px-1 rounded">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}</code>
        </p>
        <p className="text-sm text-gray-500 mt-4">Set <code>NEXT_PUBLIC_API_URL</code> in .env.local to change.</p>
      </div>
    </div>
  );
}
