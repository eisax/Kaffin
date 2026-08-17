"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Server as ServerIcon,
  ArrowLeft,
  Key,
  Lock,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  Cloud,
  XCircle
} from "lucide-react";
import { apiClient } from "@/lib/api/client";

type SetupStep = {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "error";
  details?: string;
};

interface ValidationResponse {
  success: boolean;
  operatingSystem?: string;
  dockerVersion?: string;
  cpuCores?: number;
  totalMemoryBytes?: number;
  steps: { id: string; name: string; success: boolean; output: string; error?: string }[];
  logs: string[];
  errorMessage?: string;
  server?: any;
}

export default function NewServerPage() {
  const router = useRouter();

  const [connectionMethod, setConnectionMethod] = useState<"ip" | "hetzner">("ip");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    host: "",
    sshPort: 22,
    sshUser: "root",
    authType: "password" as "key" | "password",
    privateKey: "",
    password: "",
    isBuildServer: false,
    installDockerIfMissing: true,
  });

  const [isValidating, setIsValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [steps, setSteps] = useState<SetupStep[]>([
    { id: "ssh", name: "SSH Handshake & Host Reachability", status: "pending" },
    { id: "os", name: "Supported Linux OS Check (Ubuntu / Debian)", status: "pending" },
    { id: "deps", name: "Prerequisites Verification (curl, git, jq, openssl)", status: "pending" },
    { id: "docker", name: "Docker Engine & Compose Runtime", status: "pending" },
    { id: "traefik", name: "Traefik Reverse Proxy & ACME TLS Setup", status: "pending" },
  ]);

  const handleValidateAndInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.host) return;

    setIsValidating(true);
    setErrorMessage(null);
    setValidationSuccess(false);
    setLogs([`[${new Date().toLocaleTimeString()}] Contacting backend validation engine for ${formData.host}:${formData.sshPort}...`]);

    // Mark step 1 running
    setSteps((prev) => prev.map((s, idx) => (idx === 0 ? { ...s, status: "running" } : { ...s, status: "pending" })));

    try {
      const res = await apiClient<ValidationResponse>("/servers/validate-and-install", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          host: formData.host,
          sshPort: Number(formData.sshPort) || 22,
          sshUser: formData.sshUser,
          privateKey: formData.authType === "key" ? formData.privateKey : undefined,
          password: formData.authType === "password" ? formData.password : undefined,
          installDockerIfMissing: formData.installDockerIfMissing,
        }),
      });

      if (res && res.success) {
        setLogs(res.logs || []);
        setSteps([
          { id: "ssh", name: "SSH Handshake & Host Reachability", status: "success", details: "Connected" },
          { id: "os", name: "Supported Linux OS Check", status: "success", details: res.operatingSystem || "Linux Verified" },
          { id: "deps", name: "Prerequisites Verification", status: "success", details: "CLI tools verified" },
          { id: "docker", name: "Docker Engine & Compose Runtime", status: "success", details: res.dockerVersion || "Docker active" },
          { id: "traefik", name: "Traefik Reverse Proxy & ACME TLS Setup", status: "success", details: "Traefik Ready" },
        ]);
        setValidationSuccess(true);

        // Sync local storage state
        if (res.server) {
          const localSaved = localStorage.getItem("odoo_saved_servers");
          const existing = localSaved ? JSON.parse(localSaved) : [];
          localStorage.setItem("odoo_saved_servers", JSON.stringify([res.server, ...existing.filter((s: any) => s.id !== res.server.id)]));
        }
      } else {
        const errorText = res?.errorMessage || "Server validation failed.";
        setErrorMessage(errorText);
        setLogs(res?.logs || [`[${new Date().toLocaleTimeString()}] Error: ${errorText}`]);
        setSteps((prev) => prev.map((s) => ({ ...s, status: s.status === "running" ? "error" : s.status })));
      }
    } catch (err: any) {
      const errorText = err?.message || "Connection refused or SSH authentication failed.";
      setErrorMessage(errorText);
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] SSH FAILURE: ${errorText}`]);
      setSteps((prev) => prev.map((s) => (s.id === "ssh" ? { ...s, status: "error", details: "Connection Failed" } : s)));
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/servers"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Register New Server</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Connect a real Linux host node via SSH to manage Docker and multi-tenant Odoo instances.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert if Validation Failed */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-200">SSH Connection or Validation Failed</p>
            <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Connection Method Tabs (Terrafab Inspired) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setConnectionMethod("ip")}
          className={`p-4 rounded-2xl border text-left transition flex items-start gap-4 ${
            connectionMethod === "ip"
              ? "bg-violet-600/10 border-violet-500/40 text-violet-300 shadow-lg shadow-violet-600/10"
              : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400"
          }`}
        >
          <div className={`p-3 rounded-xl ${connectionMethod === "ip" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
            <ServerIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-zinc-100">Add by IP Address / Domain</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Connect any VPS or bare metal server running Ubuntu/Debian via SSH.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setConnectionMethod("hetzner")}
          className={`p-4 rounded-2xl border text-left transition flex items-start gap-4 ${
            connectionMethod === "hetzner"
              ? "bg-violet-600/10 border-violet-500/40 text-violet-300 shadow-lg shadow-violet-600/10"
              : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400"
          }`}
        >
          <div className={`p-3 rounded-xl ${connectionMethod === "hetzner" ? "bg-rose-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-zinc-100">Connect Hetzner Cloud Server</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Deploy nodes directly from your Hetzner Cloud API token.
            </p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleValidateAndInstall} className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-5">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Server Host Parameters
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Server Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Node EU-01"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary cluster for retail tenants"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  IP Address / Domain <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="38.242.133.196 or node.yourdomain.com"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  SSH Port <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.sshPort}
                  onChange={(e) => setFormData({ ...formData, sshPort: parseInt(e.target.value) || 22 })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                SSH Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sshUser}
                onChange={(e) => setFormData({ ...formData, sshUser: e.target.value })}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-violet-500 transition"
              />
              <p className="text-[11px] text-amber-400/90 pt-0.5">
                Note: Non-root user requires passwordless sudo privileges to install Docker and manage Traefik proxy.
              </p>
            </div>

            {/* Auth Selection */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-medium text-zinc-300">
                SSH Authentication Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, authType: "password" })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                    formData.authType === "password"
                      ? "bg-violet-600/15 border-violet-500 text-violet-300"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <span>Root Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, authType: "key" })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                    formData.authType === "key"
                      ? "bg-violet-600/15 border-violet-500 text-violet-300"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Key className="h-4 w-4" />
                  <span>SSH Private Key</span>
                </button>
              </div>

              {formData.authType === "key" ? (
                <div className="space-y-1.5 pt-1">
                  <textarea
                    rows={4}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    value={formData.privateKey}
                    onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition shadow-inner"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <input
                    type="password"
                    placeholder="Enter SSH password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition shadow-inner"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={isValidating || validationSuccess}
                className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isValidating ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>Connecting SSH & Validating Real Host...</span>
                  </>
                ) : validationSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Server Validated & Saved</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Validate & Connect Server</span>
                  </>
                )}
              </button>

              {validationSuccess && (
                <button
                  type="button"
                  onClick={() => router.push("/servers")}
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  View Servers List
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Pipeline & Terminal Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step Progress Card */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center justify-between">
              <span>Validation Pipeline</span>
              <span className="text-xs font-mono text-zinc-500 lowercase">
                {steps.filter((s) => s.status === "success").length}/{steps.length} completed
              </span>
            </h2>

            <div className="space-y-3">
              {steps.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-start justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-zinc-500 mt-0.5">{idx + 1}.</span>
                    <div>
                      <p className={`font-medium ${s.status === "success" ? "text-zinc-200" : s.status === "error" ? "text-rose-400" : "text-zinc-400"}`}>
                        {s.name}
                      </p>
                      {s.details && (
                        <p className={`text-[11px] font-mono mt-0.5 ${s.status === "error" ? "text-rose-400" : "text-emerald-400"}`}>
                          {s.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {s.status === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                    {s.status === "error" && (
                      <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    )}
                    {s.status === "running" && (
                      <RotateCw className="h-4 w-4 text-violet-400 animate-spin shrink-0" />
                    )}
                    {s.status === "pending" && (
                      <span className="h-2 w-2 rounded-full bg-zinc-700 block m-1 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal Logs Monitor */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 text-xs text-zinc-400">
              <div className="flex items-center gap-2 font-mono">
                <Terminal className="h-3.5 w-3.5 text-violet-400" />
                <span>Live SSH Execution Output</span>
              </div>
              <span className={`inline-block h-2 w-2 rounded-full ${isValidating ? "bg-amber-400 animate-ping" : validationSuccess ? "bg-emerald-400" : "bg-zinc-600"}`} />
            </div>

            <div className="h-48 overflow-y-auto font-mono text-[11px] text-zinc-300 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {logs.length > 0 ? (
                logs.map((l, i) => (
                  <div key={i} className={`leading-relaxed ${l.includes("FAILURE") || l.includes("FATAL") ? "text-rose-400 font-semibold" : ""}`}>
                    {l}
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 italic py-8 text-center">
                  Waiting for SSH validation to begin...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
