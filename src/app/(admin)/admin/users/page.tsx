import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { Ban, CheckCircle } from 'lucide-react';

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">User Management</h1>
        <p className="text-text-secondary">View and manage registered users.</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border text-text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-surface flex items-center justify-center text-primary font-bold">
                        {user.displayName?.[0] || user.email?.[0] || 'U'}
                      </div>
                      <div className="font-semibold text-text-primary">{user.displayName || user.username || 'User'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="rounded bg-surface px-2 py-1 text-xs font-semibold text-text-secondary">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isBanned ? (
                      <span className="rounded bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-500">Banned</span>
                    ) : (
                      <span className="rounded bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-500">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.isBanned ? (
                        <button className="rounded-lg p-2 text-green-500 hover:bg-green-500/10 transition-colors" title="Unban">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      ) : (
                        <button className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 transition-colors" title="Ban">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
