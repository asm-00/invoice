"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  BarChart3,
  Building2,
  ChevronUp,
  CircleDollarSign,
  FileSignature,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const workspaceNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { label: "eSign Queue", href: "/dashboard/esign", icon: FileSignature },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Collections", href: "/dashboard/collections", icon: CircleDollarSign },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

const documentNav = [
  { label: "Company", href: "/dashboard/company", icon: Building2 },
  { label: "More", href: "/dashboard/more", icon: MoreHorizontal },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.current);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const initials = (user?.name ?? user?.email ?? "I")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-dvh bg-[#f1f5f9]">
      <div className="flex min-h-dvh">
        {/* ── Sidebar ── */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col bg-[#0f172a] transition-transform duration-200 lg:translate-x-0 lg:static lg:flex",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Logo */}
          <div className="flex h-14 items-center justify-between px-4 border-b border-white/5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 min-w-0"
              onClick={() => setMobileNavOpen(false)}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
                <ReceiptText className="size-3.5 text-white" />
              </span>
              <span className="truncate text-sm font-bold tracking-tight text-white">
                Invoice Ledger
              </span>
            </Link>
            <button
              className="lg:hidden text-white/40 hover:text-white"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Quick Create */}
          <div className="px-3 pt-4">
            <Button
              asChild
              size="sm"
              className="w-full h-9 justify-start gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-500/20 font-semibold text-xs"
            >
              <Link href="/dashboard#quick-create" onClick={() => setMobileNavOpen(false)}>
                <Plus className="size-3.5" />
                New Invoice
              </Link>
            </Button>
          </div>

          {/* Workspace Nav */}
          <nav className="mt-4 px-2 flex-1 overflow-y-auto" aria-label="Workspace">
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              Workspace
            </p>
            <div className="grid gap-0.5">
              {workspaceNav.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all",
                      active
                        ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/20"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80",
                    )}
                  >
                    <item.icon className={cn("size-3.5 shrink-0", active && "text-indigo-400")} />
                    {item.label}
                    {active && (
                      <span className="ml-auto size-1.5 rounded-full bg-indigo-400" />
                    )}
                  </Link>
                );
              })}
            </div>

            <p className="px-2 mt-6 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              Documents
            </p>
            <div className="grid gap-0.5">
              {documentNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-all"
                >
                  <item.icon className="size-3.5 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 grid gap-0.5">
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all",
                  isActive("/dashboard/settings")
                    ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/20"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80",
                )}
              >
                <Settings className="size-3.5 shrink-0" />
                Settings
              </Link>
              <a
                href="https://convex.dev/community"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-all"
              >
                <HelpCircle className="size-3.5 shrink-0" />
                Get help
              </a>
            </div>
          </nav>

          {/* Profile section */}
          <div className="p-3 border-t border-white/5">
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/5 transition-all"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-[11px] font-bold text-white shadow-md">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white/80">
                    {user?.name ?? "Invoice user"}
                  </p>
                  <p className="truncate text-[10px] text-white/35">
                    {user?.email ?? "Loading…"}
                  </p>
                </div>
                <ChevronUp
                  className={cn(
                    "size-3.5 text-white/30 shrink-0 transition-transform",
                    profileOpen && "rotate-180",
                  )}
                />
              </button>

              {/* Profile dropdown */}
              {profileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-white/8 bg-[#1e293b] shadow-2xl overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-white/6">
                    <p className="text-[11px] font-semibold text-white/70">
                      {user?.name ?? "Invoice user"}
                    </p>
                    <p className="text-[10px] text-white/35 mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white/90 transition-all"
                    >
                      <Settings className="size-3.5" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
                    >
                      <LogOut className="size-3.5" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Mobile header */}
          <div className="lg:hidden flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <ReceiptText className="size-4" />
            </button>
            <span className="text-sm font-bold tracking-tight text-slate-800">
              Invoice Ledger
            </span>
            <div className="size-9" />
          </div>

          <div className="flex-1 min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
