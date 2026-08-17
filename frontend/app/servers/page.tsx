"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Server as ServerIcon,
  Plus,
  ShieldCheck,
  Cpu,
  HardDrive,
  Activity,
  RotateCw,
  Search,
} from "lucide-react";
import { useServers } from "@/hooks/use-servers";

export default function ServersPage() {
  const { servers, isLoading, testServerConnection } = useServers();
  const [search, setSearch] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    await testServerConnection(id);
    setTestingId(null);
  };

  const filteredServers = (servers || []).filter(
    (s) =>
      Boolean(s) &&
      Boolean(
        (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
        (s.host && s.host.includes(search))
      )
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Managed Linux Servers</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Register and monitor host nodes running Docker, Traefik, and tenant Odoo containers.
          </p>
        </div>
        <Link
          href="/servers/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Register Server</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by server name or IP..."
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 self-end sm:self-auto">
          <span>Total Nodes: <strong className="text-zinc-200">{servers.length}</strong></span>
          <span>·</span>
          <span className="text-emerald-400">{servers.filter((s) => s.status === "Online").length} Online</span>
        </div>
      </div>

      {/* Server Cards Grid */}
      {filteredServers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {filteredServers.map((server) => {
            const isTesting = testingId === server.id;

            return (
              <div
                key={server.id}
                className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Header & Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <ServerIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-zinc-100">{server.name}</h3>
                        <p className="text-xs font-mono text-zinc-400">{server.host}:{server.sshPort}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {server.status}
                    </span>
                  </div>

                  {/* System Specs */}
                  <div className="mt-4 pt-4 border-t border-zinc-800/60 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Operating System:</span>
                      <span className="text-zinc-200 font-medium">{server.operatingSystem || "Ubuntu Linux"}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Docker Daemon:</span>
                      <span className="text-zinc-200 font-mono text-[11px]">{server.dockerVersion || "26.1.3"}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>SSH Port & User:</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px]">{server.sshUser}@{server.sshPort}</span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="mt-4 space-y-3 pt-3 border-t border-zinc-800/60">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Cpu className="h-3 w-3 text-zinc-400" /> CPU Cores
                        </span>
                        <span className="text-zinc-200 font-medium">{server.cpuCores || 8} Cores</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Activity className="h-3 w-3 text-zinc-400" /> Host Status
                        </span>
                        <span className="text-emerald-400 font-medium">Active & Monitored</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(server.id)}
                    disabled={isTesting}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition disabled:opacity-50"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin text-violet-400" : ""}`} />
                    <span>{isTesting ? "Testing..." : "Test SSH"}</span>
                  </button>

                  <Link
                    href={`/servers/${server.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 text-xs font-medium transition text-center"
                  >
                    <span>Manage Server</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-zinc-500 space-y-3 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl">
          <ServerIcon className="h-8 w-8 mx-auto text-zinc-600" />
          <div className="text-xs text-zinc-400">No managed servers registered yet</div>
          <Link
            href="/servers/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register First Server</span>
          </Link>
        </div>
      )}
    </div>
  );
}
