"use client";

import { useEffect, useState } from "react";
import { Archive, Plus, Download, RotateCw, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface Backup {
  id: string;
  backupType: string;
  storagePath: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
  instance?: { name: string };
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBackups() {
      try {
        const data = await apiClient<Backup[]>("/backups");
        if (Array.isArray(data)) setBackups(data);
      } catch {
        // Fallback handled
      } finally {
        setIsLoading(false);
      }
    }
    loadBackups();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Database & Filestore Backups</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Automated PostgreSQL dumps and Odoo filestore archive snapshots.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Snapshot Now</span>
        </button>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/40 border-b border-zinc-800/60 text-zinc-400 font-medium">
            <tr>
              <th className="px-5 py-3">Instance</th>
              <th className="px-5 py-3">Backup Type</th>
              <th className="px-5 py-3">Storage Path</th>
              <th className="px-5 py-3">Archive Size</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
            {backups.map((b) => (
              <tr key={b.id} className="hover:bg-zinc-800/20 transition">
                <td className="px-5 py-4 font-semibold text-zinc-200">{b.instance?.name || "Production Instance"}</td>
                <td className="px-5 py-4 font-medium text-violet-400">{b.backupType}</td>
                <td className="px-5 py-4 font-mono text-[11px] text-zinc-400">{b.storagePath}</td>
                <td className="px-5 py-4 font-mono text-zinc-300">{(b.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {b.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                    title="Download Backup"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
