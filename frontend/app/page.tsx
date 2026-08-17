"use client";

import { useEffect, useState } from "react";
import {
  Server as ServerIcon,
  Box as BoxIcon,
  Rocket,
  Archive,
  ArrowUpRight,
  Plus,
  Play,
  RotateCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Cpu,
  Activity,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useServers } from "@/hooks/use-servers";
import { useInstances } from "@/hooks/use-instances";
import { apiClient } from "@/lib/api/client";
import { Deployment, DeploymentLog } from "@/types";

export default function DashboardPage() {
  const { servers, isLoading: serversLoading } = useServers();
  const { instances, isLoading: instancesLoading, restartInstance } = useInstances();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [recentLogs, setRecentLogs] = useState<DeploymentLog[]>([]);

  useEffect(() => {
    async function loadDeployments() {
      try {
        const data = await apiClient<Deployment[]>("/deployments");
        if (Array.isArray(data)) {
          setDeployments(data);
          if (data.length > 0 && data[0].id) {
            const logs = await apiClient<DeploymentLog[]>(`/deployments/${data[0].id}/logs`);
            if (Array.isArray(logs)) setRecentLogs(logs);
          }
        }
      } catch {
        // Fallback handled
      }
    }
    loadDeployments();
  }, []);

  const stats = [
    {
      label: "Managed Servers",
      value: serversLoading ? "..." : servers.length.toString(),
      sub: `${servers.filter((s) => s.status === "Online").length} Online · ${servers.filter((s) => s.status !== "Online").length} Offline`,
      icon: ServerIcon,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Odoo Instances",
      value: instancesLoading ? "..." : instances.length.toString(),
      sub: `${instances.filter((i) => i.status === "Running").length} Running · ${instances.filter((i) => i.status === "Provisioning").length} Deploying`,
      icon: BoxIcon,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
    },
    {
      label: "Deployments",
      value: deployments.length.toString(),
      sub: "Active Pipeline Stream",
      icon: Rocket,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "Control Database",
      value: "Healthy",
      sub: "SQLite / PostgreSQL Engine",
      icon: Archive,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Infrastructure Overview</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Control plane for instances and managed Linux nodes.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/servers/new"
            className="flex items-center gap-2 px-3 py-1.5 rounded-[5px] bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition"
          >
            <ServerIcon className="h-3.5 w-3.5 text-zinc-400" />
            <span>Add Server</span>
          </Link>
          <Link
            href="/instances/new"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-[5px] bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Deploy Instance</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-4 rounded-[5px] bg-zinc-900/60 border border-zinc-800 transition hover:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
                <div className={`p-2 rounded-[5px] ${stat.bg} ${stat.border} border`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-zinc-100 tracking-tight">{stat.value}</div>
                <div className="text-[11px] text-zinc-400 mt-1 font-mono">{stat.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instances Table Card */}
      <div className="rounded-[5px] bg-zinc-900/60 border border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-[4px] bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <BoxIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Active Odoo Instances</h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">Live multi-tenant container workloads</p>
            </div>
          </div>
          <Link
            href="/instances"
            className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition"
          >
            <span>View all</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {instances.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-medium">
                <tr>
                  <th className="px-4 py-3">Instance / Domain</th>
                  <th className="px-4 py-3">Odoo Version</th>
                  <th className="px-4 py-3">Database</th>
                  <th className="px-4 py-3">Resources</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {instances.map((inst, idx) => (
                  <tr key={inst.id || `inst-${idx}`} className="hover:bg-zinc-800/30 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-100">{inst.name}</div>
                      <a
                        href={`https://${inst.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-400 hover:text-violet-300 font-mono text-[11px] mt-0.5 block"
                      >
                        {inst.domain}
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-zinc-800 border border-zinc-700/60 text-zinc-300 font-mono text-[11px]">
                        v{inst.odooVersion}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-zinc-400 text-[11px]">{inst.databaseName}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5 text-zinc-400 text-[11px] font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Cpu className="h-3 w-3 text-zinc-500" />
                          {inst.cpuLimit || "2.0"} Cores
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <HardDrive className="h-3 w-3 text-zinc-500" />
                          {inst.memoryLimit || "4G"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {inst.status === "Running" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Running
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-spin" />
                          {inst.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => restartInstance(inst.id)}
                          className="p-1.5 rounded-[4px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                          title="Restart Instance"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={`https://${inst.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-[4px] bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/30 transition"
                          title="Open Application"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-zinc-500 space-y-3">
            <BoxIcon className="h-7 w-7 mx-auto text-zinc-600" />
            <div className="text-xs text-zinc-400">No Odoo instances deployed yet</div>
            <Link
              href="/instances/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Deploy First Instance</span>
            </Link>
          </div>
        )}
      </div>

      {/* Two Column Grid: Managed Servers & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Managed Servers Card */}
        <div className="p-5 rounded-[5px] bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[4px] bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <ServerIcon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Registered Linux Nodes</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Docker host servers</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-[4px] bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold font-mono">
              {servers.length} Nodes
            </span>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {servers.length > 0 ? (
              servers.map((node, idx) => (
                <div key={node.id || `node-${idx}`} className="p-3 rounded-[5px] bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-zinc-200">{node.name}</div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">{node.host}:{node.sshPort} · {node.operatingSystem}</div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium font-mono">
                      <ShieldCheck className="h-3.5 w-3.5" /> {node.status}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Docker {node.dockerVersion}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-zinc-500 space-y-2">
                <div className="text-xs text-zinc-400">No servers registered</div>
                <Link href="/servers/new" className="text-violet-400 hover:text-violet-300 text-xs font-medium">
                  + Register Linux Server
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Live Activity Stream Card */}
        <div className="p-5 rounded-[5px] bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[4px] bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Recent Activity Stream</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Live orchestration audit events</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </div>

          <div className="mt-3.5 space-y-2 font-mono text-[11px]">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, idx) => (
                <div key={log.id || `log-${idx}`} className="p-2.5 rounded-[4px] bg-zinc-950/60 border border-zinc-800 flex items-start gap-2">
                  <span className="text-zinc-500 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="text-violet-400 font-semibold">{log.level}</span>
                  <span className="text-zinc-300 flex-1 truncate">{log.message}</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-zinc-500 text-xs font-mono">
                No active orchestration logs
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
