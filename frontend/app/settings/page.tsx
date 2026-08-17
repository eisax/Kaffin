"use client";

import { Settings, Save, ShieldCheck, Key, Server, Database, Globe } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Control Plane Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure registry secrets, default container tags, ACME Let's Encrypt TLS settings, and background queue parameters.
        </p>
      </div>

      <div className="space-y-6">
        {/* GHCR Settings */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800/60 pb-3 flex items-center gap-2">
            <Key className="h-4 w-4 text-violet-400" />
            <span>GitHub Container Registry (GHCR) Credentials</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Registry Endpoint</label>
              <input
                type="text"
                defaultValue="ghcr.io/havano"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Personal Access Token (PAT)</label>
              <input
                type="password"
                defaultValue="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Traefik & ACME Settings */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 border-b border-zinc-800/60 pb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-violet-400" />
            <span>Traefik & SSL Automated Provisioning</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">ACME Registration Email</label>
              <input
                type="email"
                defaultValue="admin@example.com"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Default Traefik Public Network</label>
              <input
                type="text"
                defaultValue="traefik_public"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition"
          >
            <Save className="h-4 w-4" />
            <span>Save Configurations</span>
          </button>
        </div>
      </div>
    </div>
  );
}
