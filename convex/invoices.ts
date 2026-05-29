import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("overdue"),
  v.literal("paid"),
);

async function requireUserId(ctx: Parameters<typeof getAuthUserId>[0]) {
  const userId = await getAuthUserId(ctx);

  if (userId === null) {
    throw new Error("Authentication required");
  }

  return userId;
}

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      return [];
    }

    return await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(12);
  },
});

export const stats = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      return {
        totalRevenue: 0,
        outstanding: 0,
        invoiceCount: 0,
        paidCount: 0,
        overdueCount: 0,
      };
    }

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return invoices.reduce(
      (totals, invoice) => {
        totals.invoiceCount += 1;

        if (invoice.status === "paid") {
          totals.paidCount += 1;
          totals.totalRevenue += invoice.amount;
        } else {
          totals.outstanding += invoice.amount;
        }

        if (invoice.status === "overdue") {
          totals.overdueCount += 1;
        }

        return totals;
      },
      {
        totalRevenue: 0,
        outstanding: 0,
        invoiceCount: 0,
        paidCount: 0,
        overdueCount: 0,
      },
    );
  },
});

export const create = mutation({
  args: {
    client: v.string(),
    amount: v.number(),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const dueDate = new Date(now + 1000 * 60 * 60 * 24 * 21)
      .toISOString()
      .slice(0, 10);

    return await ctx.db.insert("invoices", {
      userId,
      client: args.client.trim() || "New client",
      amount: Math.max(0, Math.round(args.amount * 100) / 100),
      status: args.status ?? "draft",
      dueDate,
      createdAt: now,
      invoiceNumber: `INV-${new Date(now).getFullYear()}-${String(now).slice(-5)}`,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invoice = await ctx.db.get(args.id);

    if (invoice === null || invoice.userId !== userId) {
      throw new Error("Invoice not found");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
    });
  },
});
