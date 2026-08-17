"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  ArrowLeft,
  Server,
  Layers,
  Puzzle,
  Globe,
  Database,
  CheckCircle2,
  RotateCw,
  Rocket,
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  Phone,
  Languages,
  Flag,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";
import { useServers } from "@/hooks/use-servers";
import { useInstances } from "@/hooks/use-instances";
import { apiClient } from "@/lib/api/client";

interface AddonItem {
  id: string;
  name: string;
  technicalName: string;
  version: string;
  description: string;
}

export default function NewInstancePage() {
  const router = useRouter();
  const { servers, isLoading: serversLoading } = useServers();
  const { createInstance } = useInstances();

  const [step, setStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [addonsList, setAddonsList] = useState<AddonItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showMasterPass, setShowMasterPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  const [availableDomains, setAvailableDomains] = useState<string[]>([
    "saas.havano.pro",
    "havano.pro",
    "zim.havano.com",
  ]);
  const [domainMode, setDomainMode] = useState<"subdomain" | "custom">("subdomain");
  const [subdomainPrefix, setSubdomainPrefix] = useState("");
  const [selectedBaseDomain, setSelectedBaseDomain] = useState("saas.havano.pro");

  const [form, setForm] = useState({
    name: "",
    version: "19.0",
    imageSource: "ghcr",
    imageTag: "ghcr.io/havano/odoo-base:19.0",
    serverId: "",
    dbName: "",
    dbUser: "odoo",
    adminMasterPassword: "admin",
    adminEmail: "admin@havano.pro",
    adminPassword: "Admin123!",
    adminPhone: "+263 77 123 4567",
    language: "en_US",
    countryCode: "zw",
    demoData: false,
    domain: "",
    selectedAddons: [] as string[],
    cpuLimit: "2.0",
    memoryLimit: "4G",
  });

  useEffect(() => {
    if (servers.length > 0 && !form.serverId) {
      setForm((prev) => ({ ...prev, serverId: servers[0].id }));
    }
  }, [servers, form.serverId]);

  useEffect(() => {
    async function loadAddonsAndDomains() {
      try {
        const [addonsData, domainsData] = await Promise.all([
          apiClient<AddonItem[]>("/addons").catch(() => []),
          apiClient<any[]>("/domains").catch(() => []),
        ]);
        if (Array.isArray(addonsData) && addonsData.length > 0) {
          setAddonsList(addonsData);
        }
        if (Array.isArray(domainsData) && domainsData.length > 0) {
          const registered = domainsData
            .map((d: any) => d.hostname?.replace(/^https?:\/\//, "").trim())
            .filter(Boolean);
          const unique = Array.from(new Set([...registered, "saas.havano.pro", "havano.pro", "zim.havano.com"]));
          setAvailableDomains(unique);
          if (unique.length > 0) {
            setSelectedBaseDomain(unique[0]);
          }
        }
      } catch {
        // Handled
      }
    }
    loadAddonsAndDomains();
  }, []);

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 24);
    const subSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 24);
    
    setSubdomainPrefix(subSlug);
    setForm((prev) => {
      const generatedDomain = domainMode === "subdomain" && subSlug
        ? `${subSlug}.${selectedBaseDomain}`
        : prev.domain;

      return {
        ...prev,
        name,
        dbName: prev.dbName ? prev.dbName : slug ? `${slug}_db` : "",
        domain: generatedDomain
      };
    });
  };

  const handleSubdomainPrefixChange = (prefix: string) => {
    const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomainPrefix(cleanPrefix);
    setForm((prev) => ({
      ...prev,
      domain: cleanPrefix ? `${cleanPrefix}.${selectedBaseDomain}` : "",
    }));
  };

  const handleBaseDomainChange = (baseDom: string) => {
    setSelectedBaseDomain(baseDom);
    if (domainMode === "subdomain") {
      setForm((prev) => ({
        ...prev,
        domain: subdomainPrefix ? `${subdomainPrefix}.${baseDom}` : "",
      }));
    }
  };

  const handleDomainModeChange = (mode: "subdomain" | "custom") => {
    setDomainMode(mode);
    if (mode === "subdomain") {
      setForm((prev) => ({
        ...prev,
        domain: subdomainPrefix ? `${subdomainPrefix}.${selectedBaseDomain}` : "",
      }));
    }
  };

  const handleToggleAddon = (technicalName: string) => {
    if (form.selectedAddons.includes(technicalName)) {
      setForm({ ...form, selectedAddons: form.selectedAddons.filter((a) => a !== technicalName) });
    } else {
      setForm({ ...form, selectedAddons: [...form.selectedAddons, technicalName] });
    }
  };

  const handleDeploy = async () => {
    if (!form.name || !form.domain || !form.dbName || !form.adminEmail || !form.adminPassword) {
      setError("Please fill in all required fields (Name, Database Name, Domain, Admin Email, Admin Password).");
      return;
    }

    if (!form.serverId && servers.length === 0) {
      setError("No target server registered. Please register a server first.");
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      await createInstance({
        name: form.name,
        version: form.version,
        imageTag: form.imageTag,
        serverId: form.serverId || servers[0]?.id,
        databaseName: form.dbName,
        databaseUser: form.dbUser,
        domain: form.domain,
        addons: form.selectedAddons,
        adminMasterPassword: form.adminMasterPassword,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        adminPhone: form.adminPhone,
        language: form.language,
        countryCode: form.countryCode,
        demoData: form.demoData,
        cpuLimit: form.cpuLimit,
        memoryLimit: form.memoryLimit
      });

      router.push("/deployments");
    } catch (err: any) {
      setError(err.message || "Failed to trigger deployment");
      setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/instances"
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Deploy Instance</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Zero-touch deployment: Auto-provisions database, admin credentials, language, country, and SSL routing.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Step Indicators */}
      <div className="grid grid-cols-4 gap-2 border-b border-zinc-800/80 pb-4">
        {[
          { num: 1, title: "1. Version & Server" },
          { num: 2, title: "2. Database & Super Admin" },
          { num: 3, title: "3. Custom Addons" },
          { num: 4, title: "4. Domain & Deploy" },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setStep(s.num)}
            className={`text-left p-2.5 rounded-lg text-xs font-semibold transition ${
              step === s.num
                ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                : step > s.num
                ? "text-emerald-400 bg-zinc-900/40"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Wizard Steps */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-6">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/60 pb-3">
              <Layers className="h-4 w-4 text-violet-400" />
              <span>Instance Name & Target Node</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Instance Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Havano Retail Prod"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 placeholder:text-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Target Managed Server</label>
                  {servers.length > 0 ? (
                    <select
                      value={form.serverId}
                      onChange={(e) => setForm({ ...form, serverId: e.target.value })}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                    >
                      {servers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.host})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
                      <span>No servers registered yet</span>
                      <Link href="/servers/new" className="text-violet-400 hover:underline">Register Server</Link>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Odoo Version</label>
                  <select
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value, imageTag: form.imageSource === "ghcr" ? `ghcr.io/havano/odoo-base:${e.target.value}` : `odoo:${e.target.value}` })}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 font-mono"
                  >
                    <option value="19.0">Odoo 19.0 (Latest)</option>
                    <option value="18.0">Odoo 18.0</option>
                    <option value="17.0">Odoo 17.0</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Container Base Image Source</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setForm({ ...form, imageSource: "ghcr", imageTag: `ghcr.io/havano/odoo-base:${form.version}` })}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      form.imageSource === "ghcr"
                        ? "bg-violet-600/15 border-violet-500 text-violet-200"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold text-xs text-zinc-100">GHCR Base Image</div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-1">ghcr.io/havano/odoo-base:{form.version}</div>
                  </div>
                  <div
                    onClick={() => setForm({ ...form, imageSource: "official", imageTag: `odoo:${form.version}` })}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      form.imageSource === "official"
                        ? "bg-violet-600/15 border-violet-500 text-violet-200"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold text-xs text-zinc-100">Official Docker Hub</div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-1">odoo:{form.version}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-violet-400" />
                <span>Automated Database & Super Admin Setup</span>
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <Sparkles className="h-3.5 w-3.5" /> Bypasses Odoo setup wizard
              </span>
            </h2>

            {/* Database & Master Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Database Name</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. havano_prod_db"
                  value={form.dbName}
                  onChange={(e) => setForm({ ...form, dbName: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Master Password</span>
                    <span className="text-rose-400">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMasterPass(!showMasterPass)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                  >
                    {showMasterPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showMasterPass ? "Hide" : "Show"}</span>
                  </button>
                </label>
                <input
                  type={showMasterPass ? "text" : "password"}
                  required
                  placeholder="Master Admin Password"
                  value={form.adminMasterPassword}
                  onChange={(e) => setForm({ ...form, adminMasterPassword: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Admin Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Admin Email / Login</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@havano.pro"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Admin Password</span>
                    <span className="text-rose-400">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                  >
                    {showAdminPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showAdminPass ? "Hide" : "Show"}</span>
                  </button>
                </label>
                <input
                  type={showAdminPass ? "text" : "password"}
                  required
                  placeholder="Admin Password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  placeholder="+263 77 123 4567"
                  value={form.adminPhone}
                  onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
            </div>

            {/* Language, Country & Demo Data */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Language</span>
                </label>
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="fr_FR">French (Français)</option>
                  <option value="es_ES">Spanish (Español)</option>
                  <option value="de_DE">German (Deutsch)</option>
                  <option value="ar_001">Arabic (العربية)</option>
                  <option value="pt_BR">Portuguese (Português)</option>
                  <option value="zh_CN">Chinese (Simplified)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Country</span>
                </label>
                <select
                  value={form.countryCode}
                  onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="zw">Zimbabwe (ZW)</option>
                  <option value="za">South Africa (ZA)</option>
                  <option value="us">United States (US)</option>
                  <option value="gb">United Kingdom (GB)</option>
                  <option value="bw">Botswana (BW)</option>
                  <option value="zm">Zambia (ZM)</option>
                  <option value="ke">Kenya (KE)</option>
                  <option value="ng">Nigeria (NG)</option>
                  <option value="ae">United Arab Emirates (AE)</option>
                  <option value="de">Germany (DE)</option>
                  <option value="fr">France (FR)</option>
                  <option value="ca">Canada (CA)</option>
                  <option value="au">Australia (AU)</option>
                  <option value="in">India (IN)</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Demo Data</label>
                <div
                  onClick={() => setForm({ ...form, demoData: !form.demoData })}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-lg border cursor-pointer transition ${
                    form.demoData
                      ? "bg-violet-600/20 border-violet-500 text-violet-200"
                      : "bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-xs font-medium">{form.demoData ? "Demo Data Enabled" : "No Demo Data"}</span>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition ${form.demoData ? "bg-violet-500" : "bg-zinc-700"}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${form.demoData ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Automated Zero-Touch Initialization</span>
              </div>
              <p className="text-[11px]">
                Upon deployment, the engine creates the database and configures super admin credentials automatically. When the site opens, you land directly on Odoo without being asked for database setup.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800/60 pb-3">
              <Puzzle className="h-4 w-4 text-violet-400" />
              <span>Mount Custom Odoo Addons (/mnt/extra-addons)</span>
            </h2>

            {addonsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addonsList.map((addon) => {
                  const isSelected = form.selectedAddons.includes(addon.technicalName);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => handleToggleAddon(addon.technicalName)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "bg-violet-600/15 border-violet-500/60 text-violet-200"
                          : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-zinc-100">{addon.name}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-violet-400" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">{addon.description}</p>
                      <span className="inline-block mt-2 font-mono text-[10px] text-zinc-400">/{addon.technicalName}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/60">
                No custom addons registered yet. You can register addon Git repositories under the Addons tab or deploy standard Odoo.
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Globe className="h-4 w-4 text-violet-400" />
                <span>Domain & Traefik Reverse Proxy Routing</span>
              </h2>
              <Link href="/domains" target="_blank" className="text-[11px] text-violet-400 hover:underline flex items-center gap-1">
                <span>Manage Base Domains</span>
              </Link>
            </div>

            {/* Domain Selection Tabs */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDomainModeChange("subdomain")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  domainMode === "subdomain"
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/40"
                    : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Subdomain on Base Domain
              </button>
              <button
                type="button"
                onClick={() => handleDomainModeChange("custom")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  domainMode === "custom"
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/40"
                    : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Custom Full FQDN Domain
              </button>
            </div>

            {domainMode === "subdomain" ? (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-300">
                  Pick Base Domain & Subdomain <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. erp1201 or client1"
                      value={subdomainPrefix}
                      onChange={(e) => handleSubdomainPrefixChange(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500 placeholder:text-zinc-600"
                    />
                  </div>
                  <div>
                    <select
                      value={selectedBaseDomain}
                      onChange={(e) => handleBaseDomainChange(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500"
                    >
                      {availableDomains.map((dom) => (
                        <option key={dom} value={dom}>
                          .{dom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <span>Resolved Hostname:</span>
                  <strong className="text-violet-300 font-mono">{form.domain || "—"}</strong>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-300">
                  Custom Domain Hostname (FQDN) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. odoo.yourcompany.com"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500 placeholder:text-zinc-600"
                />
              </div>
            )}

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3 text-xs">
              <div className="font-semibold text-zinc-200">Final Deployment Configuration:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-zinc-400 text-[11px]">
                <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-zinc-500 text-[10px]">Instance</div>
                  <div className="text-zinc-200 font-medium truncate">{form.name || "—"}</div>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-zinc-500 text-[10px]">Database Name</div>
                  <div className="text-zinc-200 font-medium font-mono truncate">{form.dbName || "—"}</div>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-zinc-500 text-[10px]">Admin Login</div>
                  <div className="text-zinc-200 font-medium truncate">{form.adminEmail}</div>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                  <div className="text-zinc-500 text-[10px]">Domain / SSL</div>
                  <div className="text-violet-300 font-medium font-mono truncate">{form.domain || "—"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
                <span>Language: <strong className="text-zinc-200">{form.language}</strong></span>
                <span>·</span>
                <span>Country: <strong className="text-zinc-200">{form.countryCode.toUpperCase()}</strong></span>
                <span>·</span>
                <span>Demo Data: <strong className="text-zinc-200">{form.demoData ? "Yes" : "No"}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Bottom Controls */}
        <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={isDeploying}
              onClick={handleDeploy}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 disabled:opacity-50"
            >
              {isDeploying ? <RotateCw className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              <span>{isDeploying ? "Deploying & Initializing..." : "Deploy & Initialize Instance"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


