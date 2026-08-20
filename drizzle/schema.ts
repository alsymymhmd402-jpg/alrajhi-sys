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
    contactId: int("contactId"),
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
    index("conversations_contact_idx").on(table.contactId),
  ],
);

/** A persisted message belonging to one customer support conversation. */
export const supportMessages = mysqlTable(
  "support_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId").notNull(),
    sender: mysqlEnum("sender", ["guest", "owner", "system"]).notNull(),
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
    status: mysqlEnum("status", ["active", "used", "revoked", "expired"]).default("active").notNull(),
    usageCount: int("usageCount").default(0).notNull(),
    voiceModelId: int("voiceModelId"),
    expiresAt: timestamp("expiresAt"),
    lastUsedAt: timestamp("lastUsedAt"),
    createdByUserId: int("createdByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("invitations_status_idx").on(table.status),
    index("invitations_expires_idx").on(table.expiresAt),
    index("invitations_voice_model_idx").on(table.voiceModelId),
  ],
);

/** Audit record for a direct WebRTC call or an ElevenLabs voice-agent session. */
export const callLogs = mysqlTable(
  "call_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId"),
    invitationId: int("invitationId"),
    voiceModelId: int("voiceModelId"),
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
    index("call_logs_voice_model_idx").on(table.voiceModelId),
    index("call_logs_created_idx").on(table.createdAt),
  ],
);

/** A customer record that unifies conversations and calls under one support identity. */
export const contacts = mysqlTable(
  "contacts",
  {
    id: int("id").autoincrement().primaryKey(),
    displayName: varchar("displayName", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 40 }),
    avatarUrl: varchar("avatarUrl", { length: 600 }),
    extraData: text("extraData"),
    connectionStatus: mysqlEnum("connectionStatus", ["online", "offline", "away"]).default("offline").notNull(),
    lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("contacts_last_activity_idx").on(table.lastActivityAt)],
);

/** Guest browser session associated with the customer and their support conversation. */
export const guestSessions = mysqlTable(
  "guest_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 24 }).notNull().unique(),
    contactId: int("contactId").notNull(),
    conversationId: int("conversationId").notNull(),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
    endedAt: timestamp("endedAt"),
  },
  table => [
    index("guest_sessions_contact_idx").on(table.contactId),
    index("guest_sessions_conversation_idx").on(table.conversationId),
  ],
);

/** A persisted customer request submitted through the invite flow. */
export const serviceRequests = mysqlTable(
  "service_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    requestNumber: varchar("requestNumber", { length: 32 }).notNull().unique(),
    contactId: int("contactId").notNull(),
    conversationId: int("conversationId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    status: mysqlEnum("status", ["new", "in_progress", "waiting", "completed", "closed"]).default("new").notNull(),
    lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("service_requests_contact_idx").on(table.contactId),
    index("service_requests_conversation_idx").on(table.conversationId),
    index("service_requests_status_idx").on(table.status),
  ],
);

/** A file or image attached to a support message, stored externally in S3. */
export const messageAttachments = mysqlTable(
  "message_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    messageId: int("messageId").notNull(),
    storageKey: varchar("storageKey", { length: 700 }).notNull(),
    url: varchar("url", { length: 900 }).notNull(),
    fileName: varchar("fileName", { length: 260 }).notNull(),
    mimeType: varchar("mimeType", { length: 140 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("message_attachments_message_idx").on(table.messageId)],
);

/** Owner-managed registry of available voice models. No API secrets are stored here. */
export const voiceModels = mysqlTable(
  "voice_models",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 140 }).notNull(),
    provider: varchar("provider", { length: 120 }).notNull(),
    voiceId: varchar("voiceId", { length: 180 }).notNull(),
    status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("voice_models_status_idx").on(table.status)],
);

/** Safe non-secret Owner settings for the product surface. */
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 120 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** A private owner workspace that preserves the application-agent conversation context. */
export const agentThreads = mysqlTable(
  "agent_threads",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("agent_threads_status_updated_idx").on(table.status, table.updatedAt)],
);

/** Message memory for the application agent. System prompts and secrets are never persisted here. */
export const agentMessages = mysqlTable(
  "agent_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    threadId: int("threadId").notNull(),
    role: mysqlEnum("role", ["owner", "assistant", "system"]).notNull(),
    kind: mysqlEnum("kind", ["chat", "proposal", "alert", "execution"]).default("chat").notNull(),
    content: text("content").notNull(),
    proposalId: int("proposalId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("agent_messages_thread_created_idx").on(table.threadId, table.createdAt)],
);

/** A structured, approval-gated proposal generated by the application agent. */
export const agentProposals = mysqlTable(
  "agent_proposals",
  {
    id: int("id").autoincrement().primaryKey(),
    threadId: int("threadId").notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    summary: text("summary").notNull(),
    actionType: mysqlEnum("actionType", ["update_setting", "acknowledge_alert", "manual_development"]).notNull(),
    actionPayload: text("actionPayload").notNull(),
    impact: varchar("impact", { length: 500 }).notNull(),
    status: mysqlEnum("status", ["draft", "approved", "cancelled", "executed", "failed"]).default("draft").notNull(),
    approvedAt: timestamp("approvedAt"),
    executedAt: timestamp("executedAt"),
    executionResult: text("executionResult"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("agent_proposals_thread_status_idx").on(table.threadId, table.status)],
);

/** Operational issues surfaced to the owner as repair suggestions inside the agent workspace. */
export const agentAlerts = mysqlTable(
  "agent_alerts",
  {
    id: int("id").autoincrement().primaryKey(),
    severity: mysqlEnum("severity", ["info", "warning", "error"]).default("warning").notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    detail: text("detail").notNull(),
    source: varchar("source", { length: 120 }).notNull(),
    status: mysqlEnum("status", ["open", "dismissed", "resolved"]).default("open").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    resolvedAt: timestamp("resolvedAt"),
  },
  table => [index("agent_alerts_status_created_idx").on(table.status, table.createdAt)],
);

/** A short-lived phone verification request associated with an invite. The OTP itself is stored as a hash only. */
export const guestPhoneChallenges = mysqlTable(
  "guest_phone_challenges",
  {
    id: int("id").autoincrement().primaryKey(),
    invitationId: int("invitationId").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    codeHash: varchar("codeHash", { length: 180 }),
    providerMessageId: varchar("providerMessageId", { length: 180 }),
    status: mysqlEnum("status", ["pending", "verified", "expired", "blocked"]).default("pending").notNull(),
    attempts: int("attempts").default(0).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    verifiedAt: timestamp("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("guest_phone_challenges_invite_phone_idx").on(table.invitationId, table.phone),
    index("guest_phone_challenges_status_expiry_idx").on(table.status, table.expiresAt),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type ConversationStatus = Conversation["status"];
export type Invitation = typeof invitations.$inferSelect;
export type CallLog = typeof callLogs.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type GuestSession = typeof guestSessions.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type VoiceModel = typeof voiceModels.$inferSelect;
export type AgentThread = typeof agentThreads.$inferSelect;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type AgentProposal = typeof agentProposals.$inferSelect;
export type AgentAlert = typeof agentAlerts.$inferSelect;
export type GuestPhoneChallenge = typeof guestPhoneChallenges.$inferSelect;
