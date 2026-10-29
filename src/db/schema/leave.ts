import { index, pgTable, text, timestamp, uuid, boolean, date, pgEnum } from "drizzle-orm/pg-core";

export const leaveStatus = pgEnum("leave_status", ["pending", "approved", "rejected", "cancelled"]);

export const leaveTypes = pgTable("leave_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  isPaid: boolean("is_paid").notNull().default(false),
  requiresAttachment: boolean("requires_attachment").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  storeId: uuid("store_id").notNull(),
  leaveTypeId: uuid("leave_type_id").notNull().references(() => leaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason").notNull(),
  attachmentUrl: text("attachment_url"),
  status: leaveStatus("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("leave_requests_store_status_start_idx").on(table.storeId, table.status, table.startDate),
  index("leave_requests_user_start_idx").on(table.userId, table.startDate),
]);

export type LeaveRequestRow = typeof leaveRequests.$inferSelect;
export type LeaveTypeRow = typeof leaveTypes.$inferSelect;
