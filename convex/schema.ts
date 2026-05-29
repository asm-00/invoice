import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  invoices: defineTable({
    userId: v.id("users"),
    invoiceNumber: v.string(),
    client: v.string(),
    amount: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("overdue"),
      v.literal("paid"),
    ),
    dueDate: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),
});
