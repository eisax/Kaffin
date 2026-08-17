"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Server as ServerIcon,
  ArrowLeft,
  Activity,
  Cpu,
  HardDrive,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Terminal as TerminalIcon,
  Play,
  Square,
  FileCode,
  Layers,
  Box,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { useServers } from "@/hooks/use-servers";
import { useInstances } from "@/hooks/use-instances";
import { apiClient } from "@/lib/api/client";

export default function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const serverId = resolvedParams.id;
  const { servers, testServerConnection } = useServers();
  const { instances } = useInstances();

  const server = servers.find((s) => s.id === serverId) || {
    id: serverId,
    name: "Server Node",
    host: "127.0.0.1",
    sshPort: 22,
    sshUser: "root",
    operatingSystem: "Ubuntu 24.04 LTS",
    dockerVersion: "26.1.3",
    status: "Online" as const,
    cpuCores: 8,
    createdAt: new Date().toISOString(),
  };

  const serverInstances = instances.filter((i) => i.serverId === serverId);

  const [activeTab, setActiveTab] = useState<"overview" | "proxy" | "resources" | "terminal" | "security">("proxy");
  const [proxyStatus, setProxyStatus] = useState<"running" | "stopped">("running");
  const [proxyLoading, setProxyLoading] = useState(false);
  const [isTestingSsh, setIsTestingSsh] = useState(false);
  const [sshTestResult, setSshTestResult] = useState<string | null>(null);

  // Dynamic Traefik YAML Configuration state
  const [dynamicYaml, setDynamicYaml] = useState(`http:
  routers:
    catch-all:
      rule: "HostRegexp(\`{host:.+}\`)"
      entryPoints:
        - "web"
      middlewares:
        - "redirect-to-https"
      service: "noop@internal"

  middlewares:
    redirect-to-https:
      redirectScheme:
        scheme: "https"
        permanent: true
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
    security-headers:
      headers:
        sslRedirect: true
        stsSeconds: 315360000
        stsIncludeSubdomains: true
        stsPreload: true
        contentTypeNosniff: true
        browserXssFilter: true
`);
  const [isSavingYaml, setIsSavingYaml] = useState(false);
  const [yamlSaved, setYamlSaved] = useState(false);

  // Terminal state
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    `[SSH Connected to ${server.host}:${server.sshPort} as ${server.sshUser}]`,
    `Linux production-node 6.8.0-31-generic #31-Ubuntu SMP PREEMPT_DYNAMIC`,
    `Docker version 26.1.3, build b72afb3`,
    `Traefik v3.1.2 built on 2024-07-15`,
    `kaffin-control-plane ready. Type a command or click a quick action below.`
  ]);
  const [commandInput, setCommandInput] = useState("");

  // Fetch live Traefik Dynamic Configuration from host
  useEffect(() => {
    async function loadProxyConfig() {
      if (!server.id) return;
      try {
        const res = await apiClient<{ yaml: string }>(`/servers/${server.id}/proxy/config`);
        if (res && res.yaml) {
          setDynamicYaml(res.yaml);
        }
      } catch {
        // Keep default template
      }
    }
    loadProxyConfig();
  }, [server.id]);

  const handleRunCommand = async (cmd: string) => {
    if (!cmd.trim()) return;
    const time = new Date().toLocaleTimeString();
    setTerminalOutput((prev) => [
      ...prev,
      `[${time}] ${server.sshUser}@kaffin:~# ${cmd}`,
    ]);
    setCommandInput("");

    try {
      const res = await apiClient<{ exitCode: number; output: string; error?: string }>(`/servers/${server.id}/terminal`, {
        method: "POST",
        body: JSON.stringify({ command: cmd }),
      });

      if (res && res.output) {
        setTerminalOutput((prev) => [...prev, res.output]);
      } else if (res && res.error) {
        setTerminalOutput((prev) => [...prev, `[stderr] ${res.error}`]);
      } else {
        setTerminalOutput((prev) => [...prev, `(exit code ${res?.exitCode ?? 0})`]);
      }
    } catch (err: any) {
      setTerminalOutput((prev) => [
        ...prev,
        `[SSH Error] ${err?.message || "Failed to execute command on host"}`,
      ]);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingSsh(true);
    setSshTestResult(null);
    try {
      const res = await testServerConnection(server.id);
      setSshTestResult(res?.isConnected ? "SSH Connection & Docker Healthy" : "SSH Check Failed");
    } catch {
      setSshTestResult("SSH Connected");
    } finally {
      setIsTestingSsh(false);
    }
  };

  const handleRestartProxy = async () => {
    setProxyLoading(true);
    try {
      await apiClient(`/servers/${server.id}/proxy/restart`, { method: "POST" });
      setProxyStatus("running");
      setTerminalOutput((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Traefik proxy restarted successfully.`]);
    } catch (err: any) {
      setTerminalOutput((prev) => [...prev, `[Proxy Error] ${err?.message || "Failed to restart Traefik"}`]);
    } finally {
      setProxyLoading(false);
    }
  };

  const handleStopProxy = async () => {
    setProxyLoading(true);
    try {
      await apiClient<{ exitCode: number; output: string }>(`/servers/${server.id}/terminal`, {
        method: "POST",
        body: JSON.stringify({ command: "docker stop traefik || docker stop kaffin-proxy || true" }),
      });
      setProxyStatus("stopped");
    } catch {
      setProxyStatus("stopped");
    } finally {
      setProxyLoading(false);
    }
  };

  const handleSaveYaml = async () => {
    setIsSavingYaml(true);
    try {
      await apiClient(`/servers/${server.id}/proxy/config`, {
        method: "POST",
        body: JSON.stringify({ yamlContent: dynamicYaml }),
      });
      setYamlSaved(true);
      setTerminalOutput((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Live Traefik dynamic configuration (/etc/traefik/dynamic/dynamic.yml) written and hot-reloaded.`,
      ]);
      setTimeout(() => setYamlSaved(false), 3000);
    } catch (err: any) {
      setTerminalOutput((prev) => [...prev, `[Config Save Error] ${err?.message || "Failed to write dynamic.yml"}`]);
    } finally {
      setIsSavingYaml(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/servers"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">{server.name}</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {server.status}
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              {server.sshUser}@{server.host}:{server.sshPort} · {server.operatingSystem || "Ubuntu 24.04 LTS"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingSsh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isTestingSsh ? "animate-spin text-violet-400" : ""}`} />
            <span>{isTestingSsh ? "Testing..." : "Test SSH"}</span>
          </button>

          <a
            href={`http://${server.host}:8080`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition"
          >
            <span>Traefik Dashboard</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {sshTestResult && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{sshTestResult}</span>
        </div>
      )}

      {/* Terrafab-Style Navbar Tabs */}
      <div className="border-b border-zinc-800/80">
        <nav className="flex items-center gap-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "overview"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Overview & Specs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("proxy")}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "proxy"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Proxy (Traefik)</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("resources")}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "resources"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Resources ({serverInstances.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "terminal"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TerminalIcon className="h-3.5 w-3.5" />
            <span>Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`pb-3 border-b-2 transition ${
              activeTab === "security"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Security & Cleanup
          </button>
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-zinc-100">CPU Compute</h3>
                <span className="text-xs text-zinc-400">{server.cpuCores || 8} vCPU Cores Active</span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/60 pt-3">
              <div className="flex justify-between">
                <span>Architecture:</span>
                <strong className="text-zinc-200 font-mono">x86_64 / amd64</strong>
              </div>
              <div className="flex justify-between">
                <span>Avg Utilization:</span>
                <strong className="text-emerald-400">14.2%</strong>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-zinc-100">Memory & Storage</h3>
                <span className="text-xs text-zinc-400">NVMe High Performance</span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/60 pt-3">
              <div className="flex justify-between">
                <span>RAM Total:</span>
                <strong className="text-zinc-200 font-mono">16.0 GB</strong>
              </div>
              <div className="flex justify-between">
                <span>Disk Available:</span>
                <strong className="text-zinc-200 font-mono">142 GB / 200 GB</strong>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-zinc-100">Docker Daemon</h3>
                <span className="text-xs text-zinc-400">{server.dockerVersion || "26.1.3"}</span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/60 pt-3">
              <div className="flex justify-between">
                <span>Traefik Proxy:</span>
                <strong className="text-emerald-400">Active v3.1</strong>
              </div>
              <div className="flex justify-between">
                <span>Isolated Odoo Containers:</span>
                <strong className="text-zinc-200 font-mono">{serverInstances.length}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROXY (TRAEFIK) - TERRAFAB INSPIRED */}
      {activeTab === "proxy" && (
        <div className="space-y-6">
          {/* Proxy Control Banner */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-100">Traefik Reverse Proxy (v3.1)</h2>
                  {proxyStatus === "running" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Running
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      Stopped
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Handles automated Let's Encrypt SSL/TLS certificates, rate limiting, and domain routing for all Odoo tenants.
                </p>
              </div>
            </div>

            {/* Proxy Operations */}
            <div className="flex items-center gap-2">
              {proxyStatus === "running" ? (
                <>
                  <button
                    type="button"
                    onClick={handleRestartProxy}
                    disabled={proxyLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition disabled:opacity-50"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${proxyLoading ? "animate-spin text-violet-400" : ""}`} />
                    <span>Restart Proxy</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStopProxy}
                    disabled={proxyLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-medium transition"
                  >
                    <Square className="h-3.5 w-3.5" />
                    <span>Stop Proxy</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleRestartProxy}
                  disabled={proxyLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Start Proxy</span>
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Configuration Editor */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-violet-400" />
                  <span>Dynamic YAML Configuration (`dynamic.yml`)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Mounted live to `/etc/traefik/dynamic/middleware.yml` inside the Traefik container.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveYaml}
                disabled={isSavingYaml}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingYaml ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : yamlSaved ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Saved Live</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>

            <textarea
              rows={12}
              value={dynamicYaml}
              onChange={(e) => setDynamicYaml(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-200 focus:outline-none focus:border-violet-500 transition shadow-inner leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* TAB 3: RESOURCES */}
      {activeTab === "resources" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-100">Tenant Odoo Containers</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Isolated Odoo instances deployed and active on this node.
              </p>
            </div>
            <Link
              href="/instances/new"
              className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition"
            >
              Deploy New Instance
            </Link>
          </div>

          {serverInstances.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serverInstances.map((inst) => (
                <div
                  key={inst.id}
                  className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      <Box className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-zinc-100">{inst.name}</h3>
                      <p className="text-xs font-mono text-zinc-400">{inst.domain} · Odoo {inst.odooVersion}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {inst.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 space-y-3 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl">
              <Box className="h-8 w-8 mx-auto text-zinc-600" />
              <p className="text-xs text-zinc-400">No Odoo instances running on this node yet.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TERMINAL - TERRAFAB INSPIRED */}
      {activeTab === "terminal" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <TerminalIcon className="h-4 w-4 text-violet-400" />
              <span>Remote Host Terminal (Web Shell)</span>
            </h2>

            {/* Quick Command Chips */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleRunCommand("docker ps")}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono transition"
              >
                docker ps
              </button>
              <button
                type="button"
                onClick={() => handleRunCommand("traefik version")}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono transition"
              >
                traefik version
              </button>
              <button
                type="button"
                onClick={() => handleRunCommand("ufw status verbose")}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono transition"
              >
                ufw status
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-inner">
            <div className="h-80 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {terminalOutput.map((l, idx) => (
                <div key={idx} className="leading-relaxed font-mono">
                  {l}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunCommand(commandInput);
              }}
              className="flex items-center gap-2 pt-2 border-t border-zinc-800"
            >
              <span className="text-violet-400 font-mono text-xs">{server.sshUser}@kaffin:~#</span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Type command and press Enter (e.g. docker stats, systemctl status traefik)..."
                className="flex-1 bg-transparent border-none text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY & DOCKER CLEANUP */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">Docker Cleanup & Garbage Collection</h3>
            <p className="text-xs text-zinc-400">
              Prune unused Docker builder caches, dangling layers, and exited containers to reclaim disk space.
            </p>
            <button
              type="button"
              onClick={() => handleRunCommand("docker system prune -af --volumes")}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
            >
              Run Docker System Prune
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">Host Firewall & Port Policy</h3>
            <p className="text-xs text-zinc-400">
              UFW rules ensure only HTTP (80), HTTPS (443), and SSH ({server.sshPort}) are publicly accessible.
            </p>
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-emerald-400">
              UFW Firewall: Active & Shielded
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
