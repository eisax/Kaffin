"use client";

import { useEffect, useState } from "react";
import { Puzzle, GitBranch, Plus, CheckCircle2, RotateCw, ExternalLink } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface Addon {
  id: string;
  name: string;
  technicalName: string;
  version: string;
  description: string;
  gitRepositoryUrl?: string;
  branch?: string;
}

export default function AddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAddons() {
      try {
        const data = await apiClient<Addon[]>("/addons");
        if (Array.isArray(data)) setAddons(data);
      } catch {
        // Fallback handled
      } finally {
        setIsLoading(false);
      }
    }
    loadAddons();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Custom Odoo Addons</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Registered Git repositories mounted dynamically to tenant containers at <code className="text-violet-400">/mnt/extra-addons</code>.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Register Addon Repository</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addons.map((addon) => (
          <div
            key={addon.id}
            className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <Puzzle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-100">{addon.name}</h3>
                    <span className="font-mono text-xs text-zinc-400 font-medium">/{addon.technicalName}</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300">
                  v{addon.version}
                </span>
              </div>

              <p className="text-xs text-zinc-400 mt-4 leading-relaxed">{addon.description}</p>

              {addon.gitRepositoryUrl && (
                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <GitBranch className="h-3.5 w-3.5 text-violet-400" />
                    <span className="truncate">{addon.gitRepositoryUrl}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Available for Mount
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
