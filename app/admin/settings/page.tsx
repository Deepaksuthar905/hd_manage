'use client';

export default function SettingsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  return (
    <div className="w-full max-w-full min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-xl">
        <p className="text-gray-600 text-sm sm:text-base">
          API base URL:{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs sm:text-sm break-all">{apiUrl}</code>
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Set <code className="bg-gray-100 px-1 rounded break-all">NEXT_PUBLIC_API_URL</code> in{' '}
          <code className="bg-gray-100 px-1 rounded">.env.local</code> to change.
        </p>
      </div>
    </div>
  );
}
