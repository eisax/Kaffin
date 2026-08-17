"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/lib/auth/auth-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  useEffect(() => {
    if (!isLoading && !user && !isAuthRoute) {
      router.push("/login");
    }
  }, [user, isLoading, isAuthRoute, router]);

  // For Auth pages (Login / Register / Forgot Password), render cleanly full-screen
  if (isAuthRoute) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  // If loading or unauthenticated on protected routes, show a sleek loading state while redirecting
  if (isLoading || (!user && !isAuthRoute)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <span className="text-xs font-medium">Please wait...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
