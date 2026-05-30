"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "convex/react";
import { Settings, User, Bell, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type Tab = "profile" | "notifications" | "security" | "appearance";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
];

export default function SettingsPage() {
  const user = useQuery(api.users.current);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const initials = (user?.name ?? user?.email ?? "I")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-6 shrink-0">
        <Settings className="size-4 text-slate-400" />
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">Settings</h1>
          <p className="text-[11px] text-slate-400">Manage your account and preferences</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Tabs sidebar */}
        <nav className="w-48 shrink-0 border-r border-slate-100 bg-white p-3 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all text-left",
                activeTab === tab.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              )}
            >
              <tab.icon className="size-3.5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "profile" && (
            <form onSubmit={handleSave} className="max-w-lg space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Profile Information</h2>
                <p className="mt-1 text-xs text-slate-500">Update your name and company details.</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/20">
                  {initials}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{user?.name ?? "Invoice User"}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Display Name</label>
                  <Input
                    value={displayName || user?.name || ""}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="h-10 border-slate-200 bg-slate-50 text-sm focus:border-indigo-300 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
                  <Input
                    value={user?.email ?? ""}
                    disabled
                    className="h-10 border-slate-200 bg-slate-100 text-sm opacity-60 cursor-not-allowed"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Email cannot be changed</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Company</label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company name"
                    className="h-10 border-slate-200 bg-slate-50 text-sm focus:border-indigo-300 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Dubai">Dubai</option>
                    <option value="Asia/Singapore">Singapore</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                className={cn(
                  "h-10 px-6 font-semibold text-sm transition-all",
                  saved
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90",
                )}
              >
                {saved ? "✓ Saved!" : "Save changes"}
              </Button>
            </form>
          )}

          {activeTab === "notifications" && (
            <div className="max-w-lg space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Notification Preferences</h2>
                <p className="mt-1 text-xs text-slate-500">Choose what you want to be notified about.</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Invoice overdue", desc: "When an invoice passes its due date", on: true },
                  { label: "Payment received", desc: "When a client marks an invoice as paid", on: true },
                  { label: "eSign completed", desc: "When a document is signed", on: false },
                  { label: "Weekly summary", desc: "A weekly digest of your receivables", on: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
                        item.on ? "bg-indigo-500" : "bg-slate-200",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition",
                          item.on ? "translate-x-4" : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="max-w-lg space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Security</h2>
                <p className="mt-1 text-xs text-slate-500">Manage your password and account security.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-700">Change Password</h3>
                <div className="grid gap-3">
                  <Input type="password" placeholder="Current password" className="h-10 text-sm" />
                  <Input type="password" placeholder="New password" className="h-10 text-sm" />
                  <Input type="password" placeholder="Confirm new password" className="h-10 text-sm" />
                </div>
                <Button className="h-9 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold">
                  Update password
                </Button>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-5">
                <h3 className="text-xs font-bold text-rose-800">Danger Zone</h3>
                <p className="mt-1 text-[11px] text-rose-600">
                  Permanently delete your account and all data.
                </p>
                <Button variant="outline" className="mt-3 h-8 border-rose-200 text-rose-600 hover:bg-rose-100 text-xs">
                  Delete account
                </Button>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="max-w-lg space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Appearance</h2>
                <p className="mt-1 text-xs text-slate-500">Customize how Invoice Ledger looks.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Light", preview: "bg-white border-indigo-400" },
                  { label: "Dark", preview: "bg-slate-900" },
                ].map((theme, i) => (
                  <button
                    key={theme.label}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-all",
                      i === 0 ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div className={cn("h-16 rounded-lg mb-3", theme.preview)} />
                    <p className="text-xs font-semibold text-slate-700">{theme.label}</p>
                    {i === 0 && <p className="text-[10px] text-indigo-500 mt-0.5">Active</p>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
