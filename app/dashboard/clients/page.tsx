"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Users, TrendingUp, DollarSign, FileText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

type Invoice = Doc<"invoices">;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function ClientsPage() {
  const invoices = useQuery(api.invoices.list);

  const clients = useMemo(() => {
    if (!invoices) return [];
    const map = new Map<
      string,
      { name: string; total: number; paid: number; invoices: Invoice[]; lastDate: number }
    >();
    for (const inv of invoices) {
      const existing = map.get(inv.client) ?? {
        name: inv.client,
        total: 0,
        paid: 0,
        invoices: [],
        lastDate: 0,
      };
      existing.total += inv.amount;
      if (inv.status === "paid") existing.paid += inv.amount;
      existing.invoices.push(inv);
      existing.lastDate = Math.max(existing.lastDate, inv.createdAt);
      map.set(inv.client, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [invoices]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">Clients</h1>
          <p className="text-[11px] text-slate-400">All billing relationships</p>
        </div>
        <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
          {clients.length} clients
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        {!invoices ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="grid place-items-center gap-4 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="size-8 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No clients yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Clients will appear here once you create invoices.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => {
              const paidPct = client.total > 0
                ? Math.round((client.paid / client.total) * 100)
                : 0;
              const outstanding = client.total - client.paid;
              const overdueCount = client.invoices.filter((i) => i.status === "overdue").length;

              return (
                <article
                  key={client.name}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                      {client.name[0].toUpperCase()}
                    </div>
                    {overdueCount > 0 && (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        {overdueCount} overdue
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <h3 className="font-bold text-slate-800">{client.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {client.invoices.length} invoice{client.invoices.length !== 1 ? "s" : ""} ·{" "}
                      Last: {new Date(client.lastDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{money.format(client.total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Outstanding</p>
                      <p className={`text-sm font-bold mt-0.5 ${outstanding > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {money.format(outstanding)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Paid</span>
                      <span className="text-[10px] font-bold text-slate-600">{paidPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
