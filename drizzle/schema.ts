import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Customer support conversation initiated by an unauthenticated visitor. */
export const conversations = mysqlTable(
  "conversations",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 24 }).notNull().unique(),
    accessToken: varchar("accessToken", { length: 64 }).notNull().unique(),
    invitationId: int("invitationId"),
    guestName: varchar("guestName", { length: 120 }).notNull(),
    issue: text("issue").notNull(),
    status: mysqlEnum("status", ["open", "in_progress", "closed"]).default("open").notNull(),
    lastMessagePreview: varchar("lastMessagePreview", { length: 280 }).notNull(),
    lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
    ownerUnread: boolean("ownerUnread").default(true).notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("conversations_last_message_idx").on(table.lastMessageAt),
    index("conversations_status_idx").on(table.status),
    index("conversations_archived_idx").on(table.archived),
    index("conversations_invitation_idx").on(table.invitationId),
  ],
);

/** A persisted message belonging to one customer support conversation. */
export const supportMessages = mysqlTable(
  "support_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull(),
    sender: mysqlEnum("sender", ["guest", "owner"]).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("support_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
  ],
);

/** Owner-issued link governing a guest's access to the support workspace. */
export const invitations = mysqlTable(
  "invitations",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 24 }).notNull().unique(),
    label: varchar("label", { length: 120 }).notNull(),
    type: mysqlEnum("type", ["reusable", "one_time"]).default("reusable").notNull(),
    status: mysqlEnum("status", ["active", "revoked", "expired"]).default("active").notNull(),
    usageCount: int("usageCount").default(0).notNull(),
    expiresAt: timestamp("expiresAt"),
    lastUsedAt: timestamp("lastUsedAt"),
    createdByUserId: int("createdByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("invitations_status_idx").on(table.status),
    index("invitations_expires_idx").on(table.expiresAt),
  ],
);

/** Audit record for a direct WebRTC call or an ElevenLabs voice-agent session. */
export const callLogs = mysqlTable(
  "call_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId"),
    invitationId: int("invitationId"),
    mode: mysqlEnum("mode", ["direct", "agent"]).notNull(),
    status: mysqlEnum("status", ["requested", "ringing", "connected", "ended", "failed", "cancelled"]).default("requested").notNull(),
    providerConversationId: varchar("providerConversationId", { length: 160 }),
    failureReason: varchar("failureReason", { length: 300 }),
    startedAt: timestamp("startedAt"),
    endedAt: timestamp("endedAt"),
    durationSeconds: int("durationSeconds").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("call_logs_conversation_idx").on(table.conversationId),
    index("call_logs_invitation_idx").on(table.invitationId),
    index("call_logs_created_idx").on(table.createdAt),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type ConversationStatus = Conversation["status"];
export type Invitation = typeof invitations.$inferSelect;
export type CallLog = typeof callLogs.$inferSelect;
