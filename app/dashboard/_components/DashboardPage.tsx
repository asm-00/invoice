"use client";

import {
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSignature,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Send,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type Invoice = Doc<"invoices">;
type ViewFilter = "all" | "esign" | "overdue" | "paid";
type ChartPeriod = "3m" | "30d" | "7d";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const statusLabels: Record<Invoice["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  overdue: "Overdue",
  paid: "Paid",
};

const allStatuses = ["draft", "sent", "overdue", "paid"] as const;

function effectiveStatus(invoice: Invoice): Invoice["status"] {
  if (invoice.status === "sent") {
    const today = new Date().toISOString().slice(0, 10);
    if (invoice.dueDate < today) return "overdue";
  }
  return invoice.status;
}

function statusStyle(status: Invoice["status"]) {
  if (status === "paid")
    return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100";
  if (status === "overdue")
    return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-100";
  if (status === "sent")
    return "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-100";
  return "bg-slate-50 text-slate-600 border-slate-200 ring-slate-100";
}

function signatureLabel(status: Invoice["status"]) {
  if (status === "paid") return "Signed";
  if (status === "overdue") return "Follow up";
  if (status === "sent") return "Awaiting";
  return "Not sent";
}

const periodMs: Record<ChartPeriod, number> = {
  "7d": 7 * 864e5,
  "30d": 30 * 864e5,
  "3m": 90 * 864e5,
};

const periodLabels: Record<ChartPeriod, string> = {
  "3m": "3 months",
  "30d": "30 days",
  "7d": "7 days",
};

export function DashboardPage() {
  const invoices = useQuery(api.invoices.list);
  const stats = useQuery(api.invoices.stats);
  const createInvoice = useMutation(api.invoices.create);
  const updateStatus = useMutation(api.invoices.updateStatus);
  const updateInvoice = useMutation(api.invoices.update);
  const removeInvoice = useMutation(api.invoices.remove);

  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("1250");
  const [dueDate, setDueDate] = useState("");
  const [pending, setPending] = useState(false);
  const [activeView, setActiveView] = useState<ViewFilter>("all");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("3m");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<Id<"invoices"> | null>(null);
  const [editClient, setEditClient] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPending, setEditPending] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"invoices"> | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const isLoading = invoices === undefined || stats === undefined;
  const rows = useMemo(() => (invoices ?? []) as Invoice[], [invoices]);

  const totalLedger = (stats?.totalRevenue ?? 0) + (stats?.outstanding ?? 0);
  const paidRate = stats?.invoiceCount
    ? Math.round((stats.paidCount / stats.invoiceCount) * 100)
    : 0;

  const rowsWithEffective = useMemo(
    () => rows.map((inv) => ({ ...inv, _eff: effectiveStatus(inv) })),
    [rows],
  );

  const awaitingESign = rowsWithEffective.filter(
    (inv) => inv._eff === "sent" || inv._eff === "overdue",
  ).length;

  const filteredRows = useMemo(() => {
    let result = rowsWithEffective;
    if (activeView === "esign")
      result = result.filter((i) => i._eff === "sent" || i._eff === "overdue");
    else if (activeView === "overdue")
      result = result.filter((i) => i._eff === "overdue");
    else if (activeView === "paid")
      result = result.filter((i) => i._eff === "paid");

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.client.toLowerCase().includes(q) ||
          i.invoiceNumber.toLowerCase().includes(q) ||
          i._eff.includes(q),
      );
    }
    return result;
  }, [activeView, rowsWithEffective, searchQuery]);

  const tabs: { id: ViewFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: rows.length },
    { id: "esign", label: "eSign Queue", count: awaitingESign },
    { id: "overdue", label: "Past Due", count: stats?.overdueCount ?? 0 },
    { id: "paid", label: "Paid", count: stats?.paidCount ?? 0 },
  ];

  const chart = useMemo(() => {
    const now = Date.now();
    const cutoff = now - periodMs[chartPeriod];
    const fallback = [920, 1380, 1040, 1900, 1320, 2460, 1580, 2780, 1730, 3200, 2050, 3650];
    const source = rows.length
      ? rows.slice().reverse().filter((inv) => inv.createdAt >= cutoff).map((inv) => inv.amount)
      : fallback;
    const values = source.length ? source.slice(-12) : fallback;
    const max = Math.max(...values, 1);
    const W = 880, H = 200, top = 16, bot = 170;
    const step = values.length > 1 ? W / (values.length - 1) : W;
    const points = values.map((v, i) => ({
      x: Math.round(i * step),
      y: Math.round(bot - (v / max) * (bot - top)),
      value: v,
    }));
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
    return { areaPath, linePath, points, W, H };
  }, [rows, chartPeriod]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      await createInvoice({
        client: client || "New Client",
        amount: Number(amount) || 0,
        status: "draft",
        dueDate: dueDate || undefined,
      });
      setClient("");
      setAmount("1250");
      setDueDate("");
      setShowCreate(false);
    } finally {
      setPending(false);
    }
  }

  function startEdit(invoice: Invoice) {
    setEditingId(invoice._id);
    setEditClient(invoice.client);
    setEditAmount(String(invoice.amount));
    setEditDueDate(invoice.dueDate);
  }

  function cancelEdit() { setEditingId(null); }

  async function saveEdit(id: Id<"invoices">) {
    setEditPending(true);
    try {
      await updateInvoice({ id, client: editClient, amount: Number(editAmount) || 0, dueDate: editDueDate || undefined });
      setEditingId(null);
    } finally {
      setEditPending(false);
    }
  }

  function handleEditKey(e: KeyboardEvent, id: Id<"invoices">) {
    if (e.key === "Enter") saveEdit(id);
    if (e.key === "Escape") cancelEdit();
  }

  async function handleDelete(id: Id<"invoices">) {
    if (deletingId === id) {
      await removeInvoice({ id });
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId((c) => (c === id ? null : c)), 3000);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Top bar ── */}
      <header className="flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-[11px] text-slate-400">Invoice operations workspace</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="search"
              placeholder="Search invoices…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate((s) => !s)}
            className="h-8 gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 text-xs font-semibold shadow-sm shadow-indigo-500/20"
          >
            <Plus className="size-3.5" />
            New Invoice
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/80">

        {/* ── Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Ledger"
            value={money.format(totalLedger)}
            trend="+12.5%"
            trendUp
            icon={WalletCards}
            accent="indigo"
          />
          <StatCard
            label="Awaiting eSign"
            value={String(awaitingESign)}
            trend={awaitingESign ? "Needs action" : "All clear"}
            trendUp={!awaitingESign}
            icon={FileSignature}
            accent={awaitingESign ? "amber" : "emerald"}
          />
          <StatCard
            label="Total Invoices"
            value={String(stats?.invoiceCount ?? 0)}
            trend={`${stats?.overdueCount ?? 0} overdue`}
            trendUp={!(stats?.overdueCount)}
            icon={ReceiptText}
            accent={stats?.overdueCount ? "rose" : "slate"}
          />
          <StatCard
            label="Paid Rate"
            value={`${paidRate}%`}
            trend={paidRate >= 50 ? "On track" : "Below target"}
            trendUp={paidRate >= 50}
            icon={CheckCircle2}
            accent={paidRate >= 50 ? "emerald" : "amber"}
          />
        </div>

        {/* ── Chart ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-800">Revenue Trend</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Invoice value over selected period</p>
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
              {(["3m", "30d", "7d"] as ChartPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    chartPeriod === p
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="h-52 px-4 py-4">
            <svg
              viewBox={`0 0 ${chart.W} ${chart.H}`}
              className="h-full w-full"
              preserveAspectRatio="none"
              aria-label="Revenue trend chart"
            >
              <defs>
                <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" x2={chart.W} y1={y} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              ))}
              <path d={chart.areaPath} fill="url(#grad)" />
              <path
                d={chart.linePath}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chart.points.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={i === chart.points.length - 1 ? 4 : 2.5}
                  fill={i === chart.points.length - 1 ? "#6366f1" : "#a5b4fc"}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* ── Invoice Table ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" id="invoices">

          {/* Table toolbar */}
          <div className="flex flex-col gap-3 p-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                    activeView === tab.id
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    activeView === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500",
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            {/* Mobile search */}
            <div className="relative sm:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="search"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Create form */}
          {showCreate && (
            <form
              id="quick-create"
              onSubmit={handleCreate}
              className="grid gap-3 border-b border-slate-100 bg-indigo-50/50 p-4 sm:grid-cols-[minmax(0,1fr)_130px_160px_auto]"
            >
              <div>
                <label htmlFor="inv-client" className="sr-only">Client</label>
                <Input
                  id="inv-client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Client name"
                  className="h-9 border-slate-200 bg-white text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="inv-amount" className="sr-only">Amount</label>
                <Input
                  id="inv-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1250"
                  className="h-9 border-slate-200 bg-white text-sm"
                />
              </div>
              <div>
                <label htmlFor="inv-due" className="sr-only">Due date</label>
                <Input
                  id="inv-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 border-slate-200 bg-white text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={pending}
                  size="sm"
                  className="h-9 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-xs flex-1"
                >
                  {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Create
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2"
                  onClick={() => setShowCreate(false)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </form>
          )}

          {/* Table content */}
          {isLoading ? (
            <div className="grid gap-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filteredRows.length ? (
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-slate-100 hover:bg-slate-50/80">
                  <TableHead className="w-8 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span className="sr-only">Select</span>
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Invoice</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">eSign</TableHead>
                  <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Due</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="w-24"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((invoice) => {
                  const eff = invoice._eff;
                  const isEditing = editingId === invoice._id;
                  const isDeleting = deletingId === invoice._id;

                  if (isEditing) {
                    return (
                      <TableRow key={invoice._id} className="bg-indigo-50/50 border-slate-100">
                        <TableCell className="px-4" />
                        <TableCell>
                          <div className="font-semibold text-slate-700">{invoice.invoiceNumber}</div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editClient}
                            onChange={(e) => setEditClient(e.target.value)}
                            onKeyDown={(e) => handleEditKey(e, invoice._id)}
                            className="h-7 w-36 border-indigo-200 text-xs focus:ring-indigo-200"
                            autoFocus
                          />
                        </TableCell>
                        <TableCell>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusStyle(eff))}>
                            {statusLabels[eff]}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500">{signatureLabel(eff)}</TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            onKeyDown={(e) => handleEditKey(e, invoice._id)}
                            className="h-7 w-32 border-indigo-200 text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            inputMode="decimal"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onKeyDown={(e) => handleEditKey(e, invoice._id)}
                            className="h-7 w-20 border-indigo-200 text-right text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(invoice._id)}
                              disabled={editPending}
                              className="h-7 px-2.5 text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white"
                            >
                              {editPending ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 px-1.5">
                              <X className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={invoice._id} className="border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="px-4">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-slate-300 accent-indigo-500"
                          aria-label={`Select ${invoice.invoiceNumber}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{invoice.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">{invoice.client}</TableCell>
                      <TableCell>
                        <select
                          value={eff}
                          onChange={(e) =>
                            updateStatus({ id: invoice._id, status: e.target.value as Invoice["status"] })
                          }
                          className={cn(
                            "cursor-pointer appearance-none rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all",
                            statusStyle(eff),
                          )}
                          aria-label={`Status for ${invoice.invoiceNumber}`}
                        >
                          {allStatuses.map((s) => (
                            <option key={s} value={s}>{statusLabels[s]}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-slate-500">{signatureLabel(eff)}</TableCell>
                      <TableCell className={cn(
                        "tabular-nums text-slate-500",
                        eff === "overdue" && "font-semibold text-amber-600",
                      )}>
                        {invoice.dueDate}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-slate-800">
                        {money.format(invoice.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(invoice)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            aria-label={`Edit ${invoice.invoiceNumber}`}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(invoice._id)}
                            className={cn(
                              "h-7 px-1.5 text-[10px] transition-all",
                              isDeleting
                                ? "bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold"
                                : "text-slate-400 hover:text-rose-500 hover:bg-rose-50",
                            )}
                            aria-label={isDeleting ? "Confirm delete" : `Delete ${invoice.invoiceNumber}`}
                          >
                            {isDeleting ? "Confirm?" : <Trash2 className="size-3" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="grid place-items-center gap-4 px-5 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100">
                <FileText className="size-7 text-slate-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {searchQuery ? "No results found" : "No invoices yet"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {searchQuery
                    ? `No invoices match "${searchQuery}"`
                    : "Create your first invoice to get started."}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  size="sm"
                  onClick={() => setShowCreate(true)}
                  className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold"
                >
                  <Plus className="size-3.5 mr-1" />
                  New Invoice
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendUp,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: ComponentType<{ className?: string }>;
  accent: "indigo" | "emerald" | "amber" | "rose" | "slate";
}) {
  const accentMap = {
    indigo: "from-indigo-500 to-violet-500 text-indigo-600 bg-indigo-50",
    emerald: "from-emerald-500 to-teal-500 text-emerald-600 bg-emerald-50",
    amber: "from-amber-500 to-orange-500 text-amber-600 bg-amber-50",
    rose: "from-rose-500 to-red-500 text-rose-600 bg-rose-50",
    slate: "from-slate-500 to-slate-600 text-slate-600 bg-slate-100",
  };

  const [gradFrom, gradTo, textColor, iconBg] = accentMap[accent].split(" ");
  const TrendIcon = trendUp ? ArrowUpRight : ArrowDownRight;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex size-10 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("size-5", textColor)} />
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
          trendUp
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700",
        )}>
          <TrendIcon className="size-3" />
          {trend}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-slate-800">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
      </div>
      <div className={cn("mt-4 h-1 w-full rounded-full bg-gradient-to-r", gradFrom, gradTo, "opacity-30")} />
    </article>
  );
}
