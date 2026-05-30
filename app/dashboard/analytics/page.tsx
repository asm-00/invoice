"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { BarChart3, TrendingUp, DollarSign, Clock } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

type Invoice = Doc<"invoices">;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function AnalyticsPage() {
  const invoices = useQuery(api.invoices.list);
  const stats = useQuery(api.invoices.stats);

  const monthlyData = useMemo(() => {
    if (!invoices) return [];
    const map = new Map<string, { revenue: number; count: number }>();
    for (const inv of invoices) {
      const d = new Date(inv.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const ex = map.get(key) ?? { revenue: 0, count: 0 };
      ex.revenue += inv.amount;
      ex.count += 1;
      map.set(key, ex);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({ month, ...data }));
  }, [invoices]);

  const maxRevenue = Math.max(...monthlyData.map((d) => d.revenue), 1);

  const avgDaysToClose = useMemo(() => {
    if (!invoices) return 0;
    const paid = invoices.filter((i) => i.status === "paid");
    if (!paid.length) return 0;
    const total = paid.reduce((sum, inv) => {
      const due = new Date(inv.dueDate).getTime();
      const created = inv.createdAt;
      return sum + (due - created) / 864e5;
    }, 0);
    return Math.round(total / paid.length);
  }, [invoices]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-6 shrink-0">
        <BarChart3 className="size-4 text-slate-400" />
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">Analytics</h1>
          <p className="text-[11px] text-slate-400">Revenue and performance insights</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: "Total Revenue", value: money.format(stats?.totalRevenue ?? 0), icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
            { label: "Outstanding", value: money.format(stats?.outstanding ?? 0), icon: Clock, color: "text-amber-600 bg-amber-50" },
            { label: "Paid Invoices", value: String(stats?.paidCount ?? 0), icon: TrendingUp, color: "text-indigo-600 bg-indigo-50" },
            { label: "Avg. Days to Close", value: `${avgDaysToClose}d`, icon: Clock, color: "text-violet-600 bg-violet-50" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`inline-flex size-9 items-center justify-center rounded-lg ${kpi.color}`}>
                <kpi.icon className="size-4" />
              </div>
              <p className="mt-3 text-xl font-bold text-slate-800">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Monthly bar chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800">Monthly Revenue</h2>
          <p className="text-xs text-slate-500 mt-0.5">Last 6 months</p>
          <div className="mt-6 flex items-end gap-3 h-40">
            {monthlyData.length === 0 ? (
              <p className="text-xs text-slate-400 m-auto">No data yet — create invoices to see trends</p>
            ) : (
              monthlyData.map((d) => {
                const pct = (d.revenue / maxRevenue) * 100;
                const [year, month] = d.month.split("-");
                const label = new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "short" });
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-[10px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {money.format(d.revenue)}
                    </span>
                    <div className="w-full flex items-end justify-center" style={{ height: "120px" }}>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400 transition-all group-hover:from-indigo-600 group-hover:to-violet-500"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Invoice Status</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: "Paid", count: stats?.paidCount ?? 0, color: "bg-emerald-500", total: stats?.invoiceCount ?? 0 },
                { label: "Outstanding", count: (stats?.invoiceCount ?? 0) - (stats?.paidCount ?? 0) - (stats?.overdueCount ?? 0), color: "bg-indigo-500", total: stats?.invoiceCount ?? 0 },
                { label: "Overdue", count: stats?.overdueCount ?? 0, color: "bg-amber-500", total: stats?.invoiceCount ?? 0 },
              ].map((item) => {
                const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-600">{item.label}</span>
                      <span className="font-semibold text-slate-700">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Revenue Split</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: "Collected", value: stats?.totalRevenue ?? 0, color: "bg-emerald-500" },
                { label: "Outstanding", value: stats?.outstanding ?? 0, color: "bg-amber-500" },
              ].map((item) => {
                const total = (stats?.totalRevenue ?? 0) + (stats?.outstanding ?? 0);
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-600">{item.label}</span>
                      <span className="font-semibold text-slate-700">{money.format(item.value)} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
