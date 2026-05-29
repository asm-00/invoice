"use client";

import { useMemo, useState, type ComponentType, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Columns3,
  FileSignature,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  Send,
  WalletCards,
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
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type Invoice = Doc<"invoices">;
type ViewFilter = "all" | "esign" | "overdue" | "paid";

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

function statusVariant(
  status: Invoice["status"],
): "success" | "warning" | "outline" {
  if (status === "paid") {
    return "success";
  }

  if (status === "overdue") {
    return "warning";
  }

  return "outline";
}

function statusBadgeClassName(status: Invoice["status"]) {
  if (status === "paid") {
    return "border-emerald-500/25 bg-emerald-50 text-emerald-700";
  }

  if (status === "overdue") {
    return "border-amber-500/25 bg-amber-50 text-amber-700";
  }

  return "border-[#dfe6e3] bg-white text-[#4a5653]";
}

function signatureLabel(status: Invoice["status"]) {
  if (status === "paid") {
    return "Signed";
  }

  if (status === "overdue") {
    return "Follow up";
  }

  if (status === "sent") {
    return "Awaiting eSign";
  }

  return "Not sent";
}

function actionLabel(status: Invoice["status"]) {
  if (status === "draft") {
    return "Send eSign";
  }

  if (status === "paid") {
    return "Reopen";
  }

  return "Mark signed";
}

export function DashboardPage() {
  const invoices = useQuery(api.invoices.list);
  const stats = useQuery(api.invoices.stats);
  const user = useQuery(api.users.current);
  const createInvoice = useMutation(api.invoices.create);
  const updateStatus = useMutation(api.invoices.updateStatus);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("1250");
  const [pending, setPending] = useState(false);
  const [activeView, setActiveView] = useState<ViewFilter>("all");
  const [compactColumns, setCompactColumns] = useState(false);

  const isLoading = invoices === undefined || stats === undefined;
  const rows = useMemo(() => (invoices ?? []) as Invoice[], [invoices]);

  const totalLedger = (stats?.totalRevenue ?? 0) + (stats?.outstanding ?? 0);
  const paidRate = stats?.invoiceCount
    ? Math.round((stats.paidCount / stats.invoiceCount) * 100)
    : 0;
  const awaitingESign = rows.filter(
    (invoice) => invoice.status === "sent" || invoice.status === "overdue",
  ).length;

  const filteredRows = useMemo(() => {
    if (activeView === "esign") {
      return rows.filter(
        (invoice) => invoice.status === "sent" || invoice.status === "overdue",
      );
    }

    if (activeView === "overdue") {
      return rows.filter((invoice) => invoice.status === "overdue");
    }

    if (activeView === "paid") {
      return rows.filter((invoice) => invoice.status === "paid");
    }

    return rows;
  }, [activeView, rows]);

  const tabs: { id: ViewFilter; label: string; count: number }[] = [
    { id: "all", label: "Outline", count: rows.length },
    { id: "esign", label: "eSign Queue", count: awaitingESign },
    { id: "overdue", label: "Past Due", count: stats?.overdueCount ?? 0 },
    { id: "paid", label: "Signed & Paid", count: stats?.paidCount ?? 0 },
  ];

  const chart = useMemo(() => {
    const fallback = [920, 1380, 1040, 1900, 1320, 2460, 1580, 2780, 1730, 3200, 2050, 3650];
    const source = rows.length
      ? rows
          .slice()
          .reverse()
          .map((invoice) => invoice.amount)
      : fallback;
    const values = source.slice(-12);
    const max = Math.max(...values, 1);
    const width = 880;
    const height = 210;
    const top = 24;
    const bottom = 178;
    const step = values.length > 1 ? width / (values.length - 1) : width;
    const points = values.map((value, index) => {
      const x = Math.round(index * step);
      const y = Math.round(bottom - (value / max) * (bottom - top));

      return { x, y, value };
    });
    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");
    const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

    return { areaPath, linePath, points, width, height };
  }, [rows]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      await createInvoice({
        client: client || "Acme Operations",
        amount: Number(amount) || 0,
        status: "draft",
      });
      setClient("");
      setAmount("1250");
    } finally {
      setPending(false);
    }
  }

  async function advanceInvoice(invoice: Invoice) {
    const nextStatus =
      invoice.status === "draft"
        ? "sent"
        : invoice.status === "paid"
          ? "sent"
          : "paid";

    await updateStatus({
      id: invoice._id,
      status: nextStatus,
    });
  }

  return (
    <div className="grid h-[calc(100dvh-1rem)] min-h-0 grid-rows-[56px_1fr]">
      <header className="flex min-w-0 items-center justify-between gap-4 border-b border-[#dfe6e3] bg-white px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#dfe6e3] bg-[#f7faf9]">
            <FileSignature className="size-4 text-[#111]" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#151515]">
              Invoice command center
            </p>
            <p className="truncate text-xs text-[#64736f]">
              Branded receivables and eSign workflow
            </p>
          </div>
        </div>
        <a
          href="/"
          className="hidden rounded-full border border-[#dfe6e3] bg-[#f7faf9] px-3 py-1 text-xs font-semibold text-[#4a5653] transition-colors hover:border-[#08dfc2] hover:bg-[#ccfbf2] hover:text-[#052b26] sm:inline-flex"
        >
          Landing brand
        </a>
      </header>

      <div className="min-h-0 overflow-y-auto bg-[#f7faf9] px-4 py-5 sm:px-5 lg:px-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Ledger value"
            value={money.format(totalLedger)}
            trend="+12.5%"
            title="Invoice pipeline"
            detail="Drafts, sent invoices, and paid revenue"
            icon={WalletCards}
          />
          <MetricCard
            label="Awaiting eSign"
            value={String(awaitingESign)}
            trend={awaitingESign ? "Needs action" : "Clear"}
            trendTone={awaitingESign ? "warning" : "positive"}
            title="Signature packets"
            detail="Sent or overdue invoices in review"
            icon={FileSignature}
          />
          <MetricCard
            label="Active invoices"
            value={String(stats?.invoiceCount ?? 0)}
            trend={`${stats?.overdueCount ?? 0} overdue`}
            trendTone={stats?.overdueCount ? "warning" : "positive"}
            title="Open workspace"
            detail="Recent ledger documents in this account"
            icon={ReceiptText}
          />
          <MetricCard
            label="Paid rate"
            value={`${paidRate}%`}
            trend={paidRate >= 50 ? "+4.5%" : "-20%"}
            trendTone={paidRate >= 50 ? "positive" : "negative"}
            title="Close performance"
            detail="Invoices signed and marked paid"
            icon={CheckCircle2}
          />
        </section>

        <section className="mt-5 rounded-lg border border-[#dfe6e3] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif text-2xl font-normal leading-none text-[#151515]">
                Receivables trend
              </h1>
              <p className="mt-2 text-sm text-[#4a5653]">
                Invoice value and signature activity across recent ledger work.
              </p>
            </div>
            <div className="flex w-full rounded-md border border-[#dfe6e3] bg-[#eef4f2] p-1 sm:w-auto">
              {["Last 3 months", "Last 30 days", "Last 7 days"].map(
                (item, index) => (
                  <button
                    key={item}
                    type="button"
                    className={cn(
                      "min-h-8 flex-1 rounded px-3 text-xs font-semibold text-[#4a5653] transition-colors hover:bg-white hover:text-[#151515] sm:flex-none",
                      index === 1 && "bg-[#111] text-white hover:bg-[#111] hover:text-white",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="mt-8 h-[250px] min-w-0 overflow-hidden rounded-md border border-[#dfe6e3] bg-[#fbfdfc] px-2 py-4">
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="h-full w-full"
              role="img"
              aria-label="Receivables trend chart"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="invoice-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#08dfc2" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#08dfc2" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              {[38, 78, 118, 158].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2={chart.width}
                  y1={y}
                  y2={y}
                  stroke="rgba(17,17,17,0.08)"
                />
              ))}
              <path d={chart.areaPath} fill="url(#invoice-area)" />
              <path
                d={chart.linePath}
                fill="none"
                stroke="#151515"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
              />
              {chart.points.map((point, index) => (
                <circle
                  key={`${point.x}-${point.y}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  fill={index === chart.points.length - 1 ? "#08dfc2" : "#87aca5"}
                  r={index === chart.points.length - 1 ? 4 : 2.2}
                />
              ))}
            </svg>
          </div>
        </section>

        <section
          id="invoices"
          className="mt-5 overflow-hidden rounded-lg border border-[#dfe6e3] bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-[#eef4f2] p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id)}
                  className={cn(
                    "inline-flex min-h-8 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-semibold text-[#4a5653] transition-colors hover:bg-white hover:text-[#151515]",
                    activeView === tab.id && "bg-[#111] text-white hover:bg-[#111] hover:text-white",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px]",
                      activeView === tab.id
                        ? "bg-[#08dfc2] text-[#001f1b]"
                        : "bg-white text-[#4a5653]",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-[#dfe6e3] bg-white text-xs text-[#151515] hover:bg-[#eef4f2] hover:text-[#151515]"
                onClick={() => setCompactColumns((current) => !current)}
              >
                <Columns3 />
                {compactColumns ? "Show Details" : "Compact Columns"}
                <ChevronDown />
              </Button>
              <Button
                asChild
                size="sm"
                className="h-8 bg-[#08dfc2] text-xs text-[#001f1b] hover:bg-[#111] hover:text-white"
              >
                <a href="#quick-create">
                  <Plus />
                  Add Invoice
                </a>
              </Button>
            </div>
          </div>

          <form
            id="quick-create"
            onSubmit={handleCreate}
            className="grid gap-3 border-y border-[#dfe6e3] bg-[#f7faf9] p-3 md:grid-cols-[minmax(0,1fr)_160px_auto]"
          >
            <div className="min-w-0">
              <label htmlFor="client" className="sr-only">
                Client
              </label>
              <Input
                id="client"
                value={client}
                onChange={(event) => setClient(event.target.value)}
                placeholder="Client or eSign recipient"
                className="h-9 border-[#cbd7d3] bg-[#eef4f2] text-[#15201e] placeholder:text-[#64736f]"
              />
            </div>
            <div>
              <label htmlFor="amount" className="sr-only">
                Amount
              </label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="1250"
                className="h-9 border-[#cbd7d3] bg-[#eef4f2] text-[#15201e] placeholder:text-[#64736f]"
              />
            </div>
            <Button
              type="submit"
              disabled={pending}
              className="h-9 bg-[#08dfc2] text-[#001f1b] hover:bg-[#111] hover:text-white"
            >
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
              Create draft
            </Button>
          </form>

          {isLoading ? (
            <div className="grid gap-2 p-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-11 rounded-md bg-[#eef4f2]"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : filteredRows.length ? (
            <Table className="text-xs">
              <TableHeader className="bg-[#eef4f2]">
                <TableRow className="border-[#dfe6e3] hover:bg-transparent">
                  <TableHead className="w-8 px-4 text-[#151515]">
                    <span className="sr-only">Select</span>
                  </TableHead>
                  <TableHead className="text-[#151515]">Invoice</TableHead>
                  <TableHead className="text-[#151515]">Client</TableHead>
                  {!compactColumns && (
                    <TableHead className="text-[#151515]">Workflow</TableHead>
                  )}
                  <TableHead className="text-[#151515]">Status</TableHead>
                  <TableHead className="text-[#151515]">eSign</TableHead>
                  {!compactColumns && (
                    <TableHead className="text-[#151515]">Due</TableHead>
                  )}
                  <TableHead className="text-right text-[#151515]">Amount</TableHead>
                  <TableHead className="w-10 text-right text-[#151515]">
                    <span className="sr-only">Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((invoice) => (
                  <TableRow
                    key={invoice._id}
                    className="border-[#dfe6e3] hover:bg-[#f7faf9]"
                  >
                    <TableCell className="px-4">
                      <input
                        type="checkbox"
                        className="size-3.5 rounded border-[#cbd7d3] bg-white accent-[#08dfc2]"
                        aria-label={`Select ${invoice.invoiceNumber}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-[#151515]">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-[#64736f]">
                        Created {new Date(invoice.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#4a5653]">{invoice.client}</TableCell>
                    {!compactColumns && (
                      <TableCell>
                        <Badge variant="outline" className="border-[#dfe6e3] bg-white text-[#4a5653]">
                          Invoice approval
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant={statusVariant(invoice.status)}
                        className={statusBadgeClassName(invoice.status)}
                      >
                        {statusLabels[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#4a5653]">
                      {signatureLabel(invoice.status)}
                    </TableCell>
                    {!compactColumns && (
                      <TableCell className="text-[#64736f]">
                        {invoice.dueDate}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-semibold text-[#151515]">
                      {money.format(invoice.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-[#4a5653] hover:bg-[#ccfbf2] hover:text-[#052b26]"
                        onClick={() => advanceInvoice(invoice)}
                      >
                        {actionLabel(invoice.status)}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid place-items-center gap-3 px-5 py-12 text-center">
              <FileText className="size-10 text-[#87aca5]" />
              <div>
                <h3 className="font-serif text-2xl font-normal text-[#151515]">
                  No matching invoices
                </h3>
                <p className="mt-1 text-sm text-[#4a5653]">
                  Create a draft, send it for eSign, then close the payment.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  trendTone = "positive",
  title,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: string;
  trendTone?: "positive" | "negative" | "warning";
  title: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const TrendIcon = trendTone === "negative" ? ArrowDownRight : ArrowUpRight;

  return (
    <article className="min-h-[170px] rounded-lg border border-[#dfe6e3] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#64736f]">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#151515]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold",
            trendTone === "positive" &&
              "border-[#08dfc2]/40 bg-[#ccfbf2] text-[#052b26]",
            trendTone === "warning" &&
              "border-amber-400/30 bg-amber-50 text-amber-700",
            trendTone === "negative" &&
              "border-rose-400/30 bg-rose-50 text-rose-700",
          )}
        >
          <TrendIcon className="size-3" />
          {trend}
        </span>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <p className="font-semibold text-[#151515]">{title}</p>
          <p className="mt-1 text-sm text-[#4a5653]">{detail}</p>
        </div>
        <Icon className="size-4 shrink-0 text-[#08dfc2]" />
      </div>
    </article>
  );
}
