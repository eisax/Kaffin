"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Plus,
  RotateCw,
  Search,
  ExternalLink,
  Cpu,
  HardDrive,
  Play,
  Square,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useInstances } from "@/hooks/use-instances";

export default function InstancesPage() {
  const { instances, isLoading, restartInstance, stopInstance, deleteInstance } = useInstances();
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [instanceToDelete, setInstanceToDelete] = useState<{ id: string; name: string; domain: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRestart = async (id: string) => {
    setActionLoadingId(id);
    await restartInstance(id);
    setActionLoadingId(null);
  };

  const handleStop = async (id: string) => {
    setActionLoadingId(id);
    await stopInstance(id);
    setActionLoadingId(null);
  };

  const confirmDelete = async () => {
    if (!instanceToDelete) return;
    setIsDeleting(true);
    setActionLoadingId(instanceToDelete.id);
    await deleteInstance(instanceToDelete.id);
    setActionLoadingId(null);
    setIsDeleting(false);
    setInstanceToDelete(null);
  };

  const filteredInstances = (instances || []).filter(
    (i) =>
      Boolean(i) &&
      Boolean(
        (i.name && i.name.toLowerCase().includes(search.toLowerCase())) ||
        (i.domain && i.domain.toLowerCase().includes(search.toLowerCase())) ||
        (i.databaseName && i.databaseName.toLowerCase().includes(search.toLowerCase()))
      )
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Odoo Instances</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage multi-tenant Odoo container instances, custom addon mounts, and isolated PostgreSQL databases.
          </p>
        </div>
        <Link
          href="/instances/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Deploy New Odoo</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by instance, domain, or db..."
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 self-end sm:self-auto">
          <span>Total Instances: <strong className="text-zinc-200">{instances.length}</strong></span>
          <span>·</span>
          <span className="text-emerald-400">{instances.filter((i) => i.status === "Running").length} Running</span>
        </div>
      </div>

      {/* Instances Grid */}
      {filteredInstances.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredInstances.map((inst) => {
            const isLoadingAction = actionLoadingId === inst.id;

            return (
              <div
                key={inst.id}
                className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Section */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        <Box className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-zinc-100">{inst.name}</h3>
                        <a
                          href={`https://${inst.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-0.5"
                        >
                          <span>{inst.domain}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    {inst.status === "Running" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Running
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-spin" />
                        {inst.status}
                      </span>
                    )}
                  </div>

                  {/* Specs */}
                  <div className="mt-4 pt-4 border-t border-zinc-800/60 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[11px]">Odoo Version</span>
                      <p className="font-mono text-zinc-200 font-semibold mt-0.5">{inst.odooVersion}</p>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[11px]">Database Name</span>
                      <p className="font-mono text-zinc-200 font-semibold mt-0.5">{inst.databaseName}</p>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[11px]">Image Tag</span>
                      <p className="font-mono text-zinc-300 text-[11px] mt-0.5 truncate">{inst.imageTag}</p>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[11px]">Database User</span>
                      <p className="font-mono text-zinc-300 mt-0.5">{inst.databaseUser}</p>
                    </div>
                  </div>

                  {/* Resource Limits */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5 text-zinc-400" /> CPU: <strong className="text-zinc-200">{inst.cpuLimit || "2.0"} Cores</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3.5 w-3.5 text-zinc-400" /> RAM Limit: <strong className="text-zinc-200">{inst.memoryLimit || "4G"}</strong>
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleRestart(inst.id)}
                    disabled={isLoadingAction}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${isLoadingAction ? "animate-spin text-violet-400" : ""}`} />
                    <span>Restart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStop(inst.id)}
                    disabled={isLoadingAction}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-800 transition"
                    title="Stop instance and cancel any queued deployments"
                  >
                    <Square className="h-3.5 w-3.5 text-amber-400" />
                    <span>Stop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInstanceToDelete({ id: inst.id, name: inst.name, domain: inst.domain })}
                    disabled={isLoadingAction}
                    className="flex items-center justify-center p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer"
                    title="Purge containers, volumes, and instance"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <a
                    href={`https://${inst.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 text-xs font-medium transition"
                  >
                    <Play className="h-3 w-3" />
                    <span>Open</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-zinc-500 space-y-3 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl">
          <Box className="h-8 w-8 mx-auto text-zinc-600" />
          <div className="text-xs text-zinc-400">No Odoo instances created yet</div>
          <Link
            href="/instances/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Deploy First Instance</span>
          </Link>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {instanceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-100">Purge & Delete Instance</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Destructive action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setInstanceToDelete(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 transition rounded-lg hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <p>
                Are you sure you want to permanently delete{" "}
                <strong className="text-white font-semibold">"{instanceToDelete.name}"</strong> (
                <span className="font-mono text-violet-400">{instanceToDelete.domain}</span>)?
              </p>
              <div className="p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl text-rose-300 text-[11px] space-y-1">
                <p className="font-semibold">This action will immediately:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-400">
                  <li>Stop and force-remove the Odoo and PostgreSQL Docker containers</li>
                  <li>Permanently purge database storage and filestore volumes</li>
                  <li>Cancel pending deployment tasks and remove all history logs</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setInstanceToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{isDeleting ? "Purging Resources..." : "Yes, Purge & Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
