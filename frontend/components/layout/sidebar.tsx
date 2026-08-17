"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Box,
  Rocket,
  Puzzle,
  Layers,
  Globe,
  Archive,
  Users,
  Building2,
  Settings,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Servers", href: "/servers", icon: Server },
  { title: "Instances", href: "/instances", icon: Box },
  { title: "Deployments", href: "/deployments", icon: Rocket },
  { title: "Addons", href: "/addons", icon: Puzzle },
  { title: "Images", href: "/images", icon: Layers },
  { title: "Domains & SSL", href: "/domains", icon: Globe },
  { title: "Backups", href: "/backups", icon: Archive },
  { title: "Users & RBAC", href: "/users", icon: Users },
  { title: "Organizations", href: "/organizations", icon: Building2 },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="w-60 border-r border-zinc-800 bg-zinc-950 flex flex-col h-screen sticky top-0 selection:bg-violet-600 selection:text-white">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-[4px] bg-violet-600 flex items-center justify-center text-white">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-zinc-100 tracking-tight">Kaffin</h1>
          <p className="text-[10px] text-zinc-500 font-medium font-mono">Control Plane v1.0</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-[5px] text-xs font-medium transition",
                isActive
                  ? "bg-violet-600/15 text-violet-300 border border-violet-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-violet-400" : "text-zinc-500")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-2.5 border-t border-zinc-800">
        <div className="p-2.5 rounded-[5px] bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-[4px] bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 flex-shrink-0">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-200 truncate">
                {user?.name || "Super Admin"}
              </div>
              <div className="text-[10px] text-zinc-500 truncate font-mono">
                {user?.email || "admin@odoo-deployer.local"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-[4px] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition ml-1 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
