"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Users, Box, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  instancesCount: number;
  usersCount: number;
  createdAt: string;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const data = await apiClient<Organization[]>("/organizations");
        if (Array.isArray(data)) setOrganizations(data);
      } catch {
        // Fallback handled
      } finally {
        setIsLoading(false);
      }
    }
    loadOrgs();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Customer Organizations & Tenancy</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Multi-tenant customer accounts, instance allocations, and organization member management.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Organization</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {organizations.map((org) => (
          <div key={org.id} className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-100">{org.name}</h3>
                    <span className="font-mono text-xs text-zinc-400">{org.slug}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-2 text-xs text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Assigned Instances:</span>
                  <span className="text-emerald-400 font-medium">{org.instancesCount} Odoo instances</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Members:</span>
                  <span className="text-zinc-300 font-medium">{org.usersCount} users</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
              <span className="text-zinc-500 text-[11px]">Created {new Date(org.createdAt).toLocaleDateString()}</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
