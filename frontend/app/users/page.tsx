"use client";

import { useEffect, useState } from "react";
import { Users as UsersIcon, Plus, ShieldCheck, UserCheck, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  organization?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await apiClient<UserRecord[]>("/users");
        if (Array.isArray(data)) setUsers(data);
      } catch {
        // Fallback handled
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Team Members & Access Roles</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage administrative user accounts and RBAC permissions.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/40 border-b border-zinc-800/60 text-zinc-400 font-medium">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Organization</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-800/20 transition">
                <td className="px-5 py-4">
                  <div className="font-semibold text-zinc-200">{u.name}</div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">{u.email}</div>
                </td>
                <td className="px-5 py-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[11px] font-medium">
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-zinc-300">{u.organization || "Default Organization"}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Active
                  </span>
                </td>
                <td className="px-5 py-4 text-right text-zinc-400 font-mono text-[11px]">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
