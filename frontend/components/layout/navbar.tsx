"use client";

import { Bell, Search, Plus, Terminal } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 max-w-md w-full">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search servers, instances, domains..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-[5px] pl-9 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-800 transition"
        >
          <Terminal className="h-3.5 w-3.5 text-zinc-400" />
          <span>CLI</span>
        </button>

        <button
          type="button"
          className="p-2 rounded-[5px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition relative"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-violet-500" />
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

        <Link
          href="/instances/new"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Deploy Instance</span>
        </Link>
      </div>
    </header>
  );
}
