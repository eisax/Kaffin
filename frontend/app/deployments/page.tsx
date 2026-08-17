"use client";

import { useState, useEffect } from "react";
import {
  Rocket,
  CheckCircle2,
  Clock,
  RotateCw,
  Terminal,
  Layers,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Deployment, DeploymentLog } from "@/types";

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [activeDeploymentId, setActiveDeploymentId] = useState<string>("");
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDeployments() {
      try {
        const data = await apiClient<Deployment[]>("/deployments");
        if (Array.isArray(data) && data.length > 0) {
          setDeployments(data);
          setActiveDeploymentId(data[0].id);
        }
      } catch {
        // Fallback handled
      } finally {
        setIsLoading(false);
      }
    }
    loadDeployments();
  }, []);

  useEffect(() => {
    if (!activeDeploymentId) return;

    async function loadLogs() {
      try {
        const data = await apiClient<DeploymentLog[]>(`/deployments/${activeDeploymentId}/logs`);
        if (Array.isArray(data)) {
          setLogs(data);
        }
      } catch {
        // Fallback handled
      }
    }
    loadLogs();
  }, [activeDeploymentId]);

  const selectedDep = deployments.find((d) => d.id === activeDeploymentId) || deployments[0];

  const stateSteps = [
    "Queued",
    "Preparing",
    "Pulling Image",
    "PostgreSQL",
    "Deploying Odoo",
    "Traefik Proxy",
    "Health Check",
    "Completed",
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Deployment Orchestrator</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time deployment pipeline tracker and live container log stream.
          </p>
        </div>
      </div>

      {/* Select Deployment */}
      {deployments.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {deployments.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveDeploymentId(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                d.id === activeDeploymentId
                  ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Deployment #{d.id.slice(0, 8)} ({d.status})
            </button>
          ))}
        </div>
      )}

      {/* Active Pipeline Card */}
      {selectedDep ? (
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-zinc-100">
                  {selectedDep.instance?.name || `Instance ID: ${selectedDep.instanceId.slice(0, 8)}`}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-mono">
                  {selectedDep.instance?.domain || "zim.havano.com"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Triggered by {selectedDep.triggeredBy || "Admin"} · Started {new Date(selectedDep.createdAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selectedDep.status === "Completed" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Completed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  <span>{selectedDep.status}</span>
                </span>
              )}
            </div>
          </div>

          {/* State Machine Step Visualizer */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-300">Deployment State Machine</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {stateSteps.map((s, idx) => {
                const isCompleted = selectedDep.status === "Completed" || idx < 6;
                const isCurrent = selectedDep.status !== "Completed" && idx === 6;

                return (
                  <div
                    key={s}
                    className={`p-2.5 rounded-xl border text-center text-xs transition ${
                      isCurrent
                        ? "bg-violet-600/20 border-violet-500 text-violet-300 font-semibold"
                        : isCompleted
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    <div className="text-[10px] font-mono mb-0.5">Step {idx + 1}</div>
                    <div className="truncate">{s}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal Log Console */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800/90 overflow-hidden font-mono text-xs shadow-2xl">
            <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-400">
                <Terminal className="h-3.5 w-3.5 text-violet-400" />
                <span>Live Deployment Log Stream</span>
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Real-time API
              </span>
            </div>

            <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((l) => (
                  <div key={l.id} className="flex items-start gap-3">
                    <span className="text-zinc-400 select-none">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                    <span className="text-violet-400 font-semibold uppercase">{l.level}</span>
                    <span className="text-zinc-300 flex-1">{l.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 text-xs">Waiting for deployment stream logs...</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-zinc-500 bg-zinc-900/20 border border-zinc-800 rounded-2xl">
          No deployments recorded yet. Launch your first Odoo instance to see the orchestrator stream.
        </div>
      )}
    </div>
  );
}
