import { and, asc, desc, eq, getTableColumns, gt, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  agentAlerts,
  agentMessages,
  agentProposals,
  agentThreads,
  callLogs,
  contacts,
  conversations,
  ConversationStatus,
  customerUiAuditLogs,
  customerUiConfigs,
  customerUiNotifications,
  customerUiRevisions,
  customerUiTemplates,
  invitations,
  guestPhoneChallenges,
  guestSessions,
  institutionStatuses,
  institutionStatusViews,
  InsertUser,
  messageAttachments,
  serviceRequests,
  supportMessages,
  systemSettings,
  users,
  voiceModels,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

const preview = (content: string) => content.trim().replace(/\s+/g, " ").slice(0, 280);

export async function createSupportConversation(input: {
  publicId: string;
  accessToken: string;
  guestName: string;
  issue: string;
  invitationId?: number;
  email?: string;
  phone?: string;
  extraData?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");

  const issue = input.issue.trim();
  const contactInserted = await db.insert(contacts).values({
    displayName: input.guestName.trim(),
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    extraData: input.extraData?.trim() || undefined,
    lastActivityAt: new Date(),
  });
  const contactId = Number(contactInserted[0].insertId);
  const inserted = await db.insert(conversations).values({
    publicId: input.publicId,
    accessToken: input.accessToken,
    invitationId: input.invitationId,
    contactId,
    guestName: input.guestName.trim(),
    issue,
    lastMessagePreview: preview(issue),
    ownerUnread: true,
  });
  const conversationId = Number(inserted[0].insertId);

  await db.insert(guestSessions).values({
    publicId: input.publicId,
    contactId,
    conversationId,
  });

  await db.insert(supportMessages).values({
    conversationId,
    sender: "guest",
    content: issue,
  });

  await db.insert(serviceRequests).values({
    requestNumber: `REQ-${input.publicId.toUpperCase()}`,
    contactId,
    conversationId,
    title: issue.slice(0, 180),
    description: issue,
  });

  return getSupportConversationById(conversationId);
}

export async function getSupportConversationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ ...getTableColumns(conversations), avatarUrl: contacts.avatarUrl })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(eq(conversations.id, id))
    .limit(1);
  return rows[0];
}

export async function getGuestConversation(publicId: string, accessToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.publicId, publicId), eq(conversations.accessToken, accessToken)))
    .limit(1);
  return rows[0];
}

export async function getGuestProfile(publicId: string, accessToken: string) {
  const conversation = await getGuestConversation(publicId, accessToken);
  if (!conversation) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const contact = conversation.contactId
    ? (await db.select().from(contacts).where(eq(contacts.id, conversation.contactId)).limit(1))[0]
    : undefined;
  return { conversation, contact };
}

export async function updateGuestProfile(input: { publicId: string; accessToken: string; email?: string | null; phone?: string | null; extraData?: string | null }) {
  const conversation = await getGuestConversation(input.publicId, input.accessToken);
  if (!conversation?.contactId) return undefined;
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(contacts).set({ email: input.email, phone: input.phone, extraData: input.extraData, lastActivityAt: new Date() }).where(eq(contacts.id, conversation.contactId));
  return getGuestProfile(input.publicId, input.accessToken);
}

export async function listGuestServiceRequests(publicId: string, accessToken: string) {
  const conversation = await getGuestConversation(publicId, accessToken);
  if (!conversation?.contactId) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const requests = await db.select().from(serviceRequests).where(eq(serviceRequests.contactId, conversation.contactId)).orderBy(desc(serviceRequests.lastUpdatedAt));
  return { conversation, requests };
}

export async function listSupportConversations(input: {
  search?: string;
  status?: ConversationStatus | "all";
  archived?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(conversations.archived, input.archived ?? false)];
  if (input.status && input.status !== "all") {
    conditions.push(eq(conversations.status, input.status));
  }

  const search = input.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        like(conversations.guestName, pattern),
        like(conversations.issue, pattern),
        like(conversations.lastMessagePreview, pattern),
        like(conversations.publicId, pattern),
      )!,
    );
  }

  return db
    .select({ ...getTableColumns(conversations), avatarUrl: contacts.avatarUrl })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(and(...conditions))
    .orderBy(desc(conversations.ownerUnread), desc(conversations.lastMessageAt));
}

export async function listSupportMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.conversationId, conversationId))
    .orderBy(asc(supportMessages.createdAt), asc(supportMessages.id));
}

export async function addGuestMessage(input: {
  publicId: string;
  accessToken: string;
  content: string;
}) {
  const conversation = await getGuestConversation(input.publicId, input.accessToken);
  if (!conversation) return { conversation: undefined, message: undefined, reason: "not_found" as const };
  if (conversation.status === "closed") {
    return { conversation, message: undefined, reason: "closed" as const };
  }

  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const content = input.content.trim();
  const inserted = await db.insert(supportMessages).values({
    conversationId: conversation.id,
    sender: "guest",
    content,
  });
  const messageId = Number(inserted[0].insertId);
  await db
    .update(conversations)
    .set({ lastMessagePreview: preview(content), lastMessageAt: new Date(), ownerUnread: true })
    .where(eq(conversations.id, conversation.id));
  if (conversation.contactId) {
    await db.update(contacts).set({ lastActivityAt: new Date() }).where(eq(contacts.id, conversation.contactId));
    await db.update(guestSessions).set({ lastSeenAt: new Date() }).where(eq(guestSessions.conversationId, conversation.id));
  }
  const messages = await db.select().from(supportMessages).where(eq(supportMessages.id, messageId)).limit(1);
  return { conversation: await getSupportConversationById(conversation.id), message: messages[0], reason: undefined };
}

export async function addOwnerMessage(conversationId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const cleanContent = content.trim();
  const inserted = await db.insert(supportMessages).values({
    conversationId,
    sender: "owner",
    content: cleanContent,
  });
  const messageId = Number(inserted[0].insertId);
  await db
    .update(conversations)
    .set({ lastMessagePreview: preview(cleanContent), lastMessageAt: new Date(), ownerUnread: false })
    .where(eq(conversations.id, conversationId));
  const conversation = await getSupportConversationById(conversationId);
  if (conversation?.contactId) {
    await db.update(contacts).set({ lastActivityAt: new Date() }).where(eq(contacts.id, conversation.contactId));
  }
  const messages = await db.select().from(supportMessages).where(eq(supportMessages.id, messageId)).limit(1);
  return messages[0];
}

/** Records an automated event such as a call ending without attributing it to either participant. */
export async function addSystemMessage(conversationId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const cleanContent = content.trim();
  const inserted = await db.insert(supportMessages).values({
    conversationId,
    sender: "system",
    content: cleanContent,
  });
  const messageId = Number(inserted[0].insertId);
  await db
    .update(conversations)
    .set({ lastMessagePreview: preview(cleanContent), lastMessageAt: new Date(), ownerUnread: false })
    .where(eq(conversations.id, conversationId));
  const conversation = await getSupportConversationById(conversationId);
  if (conversation?.contactId) {
    await db.update(contacts).set({ lastActivityAt: new Date() }).where(eq(contacts.id, conversation.contactId));
  }
  const messages = await db.select().from(supportMessages).where(eq(supportMessages.id, messageId)).limit(1);
  return messages[0];
}

export async function updateSupportConversation(
  conversationId: number,
  input: { status?: ConversationStatus; archived?: boolean; ownerUnread?: boolean },
) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(conversations).set(input).where(eq(conversations.id, conversationId));
  return getSupportConversationById(conversationId);
}

export async function getSupportStats() {
  const list = await listSupportConversations({ archived: false, status: "all" });
  return {
    total: list.length,
    open: list.filter(item => item.status === "open").length,
    inProgress: list.filter(item => item.status === "in_progress").length,
    unread: list.filter(item => item.ownerUnread).length,
  };
}

export async function createInvitation(input: {
  code: string;
  label: string;
  type: "reusable" | "one_time";
  voiceModelId?: number | null;
  expiresAt?: Date;
  createdByUserId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(invitations).values(input);
  const id = Number(inserted[0].insertId);
  const rows = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
  return rows[0];
}

export async function listInvitations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invitations).orderBy(desc(invitations.createdAt));
}

export async function getInvitationByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(invitations).where(eq(invitations.code, code)).limit(1);
  return rows[0];
}

export async function getInvitationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
  return rows[0];
}

export async function validateInvitation(code: string) {
  const invitation = await getInvitationByCode(code);
  if (!invitation) return { invitation: undefined, reason: "not_found" as const };
  if (invitation.status !== "active") return { invitation, reason: "inactive" as const };
  if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
    await updateInvitation(invitation.id, { status: "expired" });
    return { invitation: { ...invitation, status: "expired" as const }, reason: "expired" as const };
  }
  return { invitation, reason: undefined };
}

export async function consumeInvitation(invitationId: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const invitationRows = await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1);
  const invitation = invitationRows[0];
  if (!invitation) return undefined;
  const nextStatus = invitation.type === "one_time" ? "used" : invitation.status;
  await db
    .update(invitations)
    .set({ usageCount: invitation.usageCount + 1, lastUsedAt: new Date(), status: nextStatus })
    .where(and(eq(invitations.id, invitationId), eq(invitations.status, "active")));
  return invitation;
}

export async function updateInvitation(
  id: number,
  input: { label?: string; status?: "active" | "used" | "revoked" | "expired"; expiresAt?: Date | null; voiceModelId?: number | null },
) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(invitations).set(input).where(eq(invitations.id, id));
  const rows = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
  return rows[0];
}

export async function deleteInvitation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.delete(invitations).where(eq(invitations.id, id));
}

export async function createCallLog(input: {
  conversationId?: number;
  invitationId?: number;
  voiceModelId?: number | null;
  mode: "direct";
  status?: "requested" | "ringing" | "connected" | "ended" | "failed" | "cancelled";
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(callLogs).values(input);
  const id = Number(inserted[0].insertId);
  const rows = await db.select().from(callLogs).where(eq(callLogs.id, id)).limit(1);
  return rows[0];
}

export async function updateCallLog(
  id: number,
  input: {
    status?: "requested" | "ringing" | "connected" | "ended" | "failed" | "cancelled";
    providerConversationId?: string;
    failureReason?: string;
    startedAt?: Date;
    endedAt?: Date;
    durationSeconds?: number;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(callLogs).set(input).where(eq(callLogs.id, id));
  const rows = await db.select().from(callLogs).where(eq(callLogs.id, id)).limit(1);
  return rows[0];
}

export async function getCallLog(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(callLogs).where(eq(callLogs.id, id)).limit(1);
  return rows[0];
}

export async function listCallLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(callLogs).orderBy(desc(callLogs.createdAt)).limit(limit);
}

export async function listContacts(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const term = search?.trim();
  if (term) {
    return db.select().from(contacts).where(like(contacts.displayName, `%${term}%`)).orderBy(desc(contacts.lastActivityAt));
  }
  return db.select().from(contacts).orderBy(desc(contacts.lastActivityAt));
}

export async function getContactDetails(contactId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const contactRows = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  const contact = contactRows[0];
  if (!contact) return undefined;
  const contactConversations = await db
    .select()
    .from(conversations)
    .where(eq(conversations.contactId, contactId))
    .orderBy(desc(conversations.lastMessageAt));
  const sessions = await db
    .select()
    .from(guestSessions)
    .where(eq(guestSessions.contactId, contactId))
    .orderBy(desc(guestSessions.lastSeenAt));
  const conversationIds = contactConversations.map(conversation => conversation.id);
  const calls = conversationIds.length
    ? await db.select().from(callLogs).where(inArray(callLogs.conversationId, conversationIds)).orderBy(desc(callLogs.createdAt))
    : [];
  const requests = await db.select().from(serviceRequests).where(eq(serviceRequests.contactId, contactId)).orderBy(desc(serviceRequests.lastUpdatedAt));
  return { contact, conversations: contactConversations, sessions, calls, requests };
}

export async function updateContact(
  id: number,
  input: { displayName?: string; email?: string | null; phone?: string | null; avatarUrl?: string | null; extraData?: string | null; connectionStatus?: "online" | "offline" | "away" },
) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(contacts).set(input).where(eq(contacts.id, id));
  const rows = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return rows[0];
}

export async function listServiceRequests(input: { search?: string; status?: "new" | "in_progress" | "waiting" | "completed" | "closed" | "all" }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [] as ReturnType<typeof eq>[];
  if (input.status && input.status !== "all") conditions.push(eq(serviceRequests.status, input.status));
  const term = input.search?.trim();
  if (term) {
    return db
      .select()
      .from(serviceRequests)
      .where(and(...conditions, or(like(serviceRequests.requestNumber, `%${term}%`), like(serviceRequests.title, `%${term}%`))!))
      .orderBy(desc(serviceRequests.lastUpdatedAt));
  }
  return conditions.length
    ? db.select().from(serviceRequests).where(and(...conditions)).orderBy(desc(serviceRequests.lastUpdatedAt))
    : db.select().from(serviceRequests).orderBy(desc(serviceRequests.lastUpdatedAt));
}

export async function updateServiceRequest(
  id: number,
  input: { status?: "new" | "in_progress" | "waiting" | "completed" | "closed"; title?: string; description?: string },
) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(serviceRequests).set({ ...input, lastUpdatedAt: new Date() }).where(eq(serviceRequests.id, id));
  const rows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  return rows[0];
}

export async function createMessageAttachment(input: { messageId: number; storageKey: string; url: string; fileName: string; mimeType: string; sizeBytes: number }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(messageAttachments).values(input);
  const rows = await db.select().from(messageAttachments).where(eq(messageAttachments.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}

export async function listMessageAttachments(messageIds: number[]) {
  const db = await getDb();
  if (!db || messageIds.length === 0) return [];
  return db.select().from(messageAttachments).where(inArray(messageAttachments.messageId, messageIds));
}

export async function listVoiceModels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(voiceModels).orderBy(desc(voiceModels.createdAt));
}

export async function getVoiceModel(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(voiceModels).where(eq(voiceModels.id, id)).limit(1);
  return rows[0];
}

export async function getVoiceModelByProviderId(provider: string, voiceId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(voiceModels).where(and(eq(voiceModels.provider, provider), eq(voiceModels.voiceId, voiceId))).limit(1);
  return rows[0];
}

export async function createVoiceModel(input: { name: string; provider: string; voiceId: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(voiceModels).values(input);
  const rows = await db.select().from(voiceModels).where(eq(voiceModels.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}

export async function updateVoiceModel(id: number, input: { name?: string; provider?: string; voiceId?: string; status?: "active" | "disabled" }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(voiceModels).set(input).where(eq(voiceModels.id, id));
  const rows = await db.select().from(voiceModels).where(eq(voiceModels.id, id)).limit(1);
  return rows[0];
}

export async function deleteVoiceModel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.delete(voiceModels).where(eq(voiceModels.id, id));
}

export async function listSafeSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemSettings).orderBy(asc(systemSettings.settingKey));
}

export async function setSafeSetting(settingKey: string, settingValue: string, userId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.insert(systemSettings).values({ settingKey, settingValue, updatedByUserId: userId }).onDuplicateKeyUpdate({ set: { settingValue, updatedByUserId: userId } });
}

export async function getSafeSetting(settingKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, settingKey)).limit(1);
  return rows[0];
}

export async function createAgentThread(title: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(agentThreads).values({ title: title.trim().slice(0, 180) || "محادثة وكيل التطبيق" });
  const rows = await db.select().from(agentThreads).where(eq(agentThreads.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}

export async function listAgentThreads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentThreads).orderBy(desc(agentThreads.updatedAt), desc(agentThreads.id));
}

export async function getAgentThread(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(agentThreads).where(eq(agentThreads.id, id)).limit(1);
  return rows[0];
}

export async function updateAgentThread(id: number, input: { title?: string; status?: "active" | "archived" }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(agentThreads).set(input).where(eq(agentThreads.id, id));
  return getAgentThread(id);
}

export async function listAgentMessages(threadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentMessages).where(eq(agentMessages.threadId, threadId)).orderBy(asc(agentMessages.createdAt), asc(agentMessages.id));
}

export async function createAgentMessage(input: { threadId: number; role: "owner" | "assistant" | "system"; kind?: "chat" | "proposal" | "alert" | "execution"; content: string; proposalId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(agentMessages).values({ ...input, content: input.content.trim() });
  const id = Number(inserted[0].insertId);
  await db.update(agentThreads).set({ updatedAt: new Date() }).where(eq(agentThreads.id, input.threadId));
  const rows = await db.select().from(agentMessages).where(eq(agentMessages.id, id)).limit(1);
  return rows[0];
}

export async function createAgentProposal(input: {
  threadId: number;
  title: string;
  summary: string;
  actionType: "update_setting" | "acknowledge_alert" | "manual_development";
  actionPayload: string;
  impact: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(agentProposals).values(input);
  const rows = await db.select().from(agentProposals).where(eq(agentProposals.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}

export async function listAgentProposals(threadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentProposals).where(eq(agentProposals.threadId, threadId)).orderBy(desc(agentProposals.createdAt), desc(agentProposals.id));
}

export async function getAgentProposal(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(agentProposals).where(eq(agentProposals.id, id)).limit(1);
  return rows[0];
}

export async function updateAgentProposal(id: number, input: {
  status?: "draft" | "approved" | "cancelled" | "executed" | "failed";
  approvedAt?: Date | null;
  executionStartedAt?: Date | null;
  executedAt?: Date | null;
  executionProgress?: number;
  executionStage?: string | null;
  executionResult?: string | null;
  verificationResult?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(agentProposals).set(input).where(eq(agentProposals.id, id));
  return getAgentProposal(id);
}

export async function createAgentAlert(input: { severity: "info" | "warning" | "error"; title: string; detail: string; source: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(agentAlerts).values(input);
  const rows = await db.select().from(agentAlerts).where(eq(agentAlerts.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}

export async function listAgentAlerts(status: "open" | "dismissed" | "resolved" | "all" = "open") {
  const db = await getDb();
  if (!db) return [];
  return status === "all"
    ? db.select().from(agentAlerts).orderBy(desc(agentAlerts.createdAt), desc(agentAlerts.id))
    : db.select().from(agentAlerts).where(eq(agentAlerts.status, status)).orderBy(desc(agentAlerts.createdAt), desc(agentAlerts.id));
}

export async function getOpenAgentAlertBySource(source: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(agentAlerts)
    .where(and(eq(agentAlerts.source, source), eq(agentAlerts.status, "open")))
    .orderBy(desc(agentAlerts.createdAt), desc(agentAlerts.id))
    .limit(1);
  return rows[0];
}

export async function updateAgentAlert(id: number, input: { status: "open" | "dismissed" | "resolved"; resolvedAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(agentAlerts).set(input).where(eq(agentAlerts.id, id));
  const rows = await db.select().from(agentAlerts).where(eq(agentAlerts.id, id)).limit(1);
  return rows[0];
}

export async function createGuestPhoneChallenge(input: { invitationId: number; phone: string; codeHash?: string; providerMessageId?: string; expiresAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(guestPhoneChallenges).values(input);
  const rows = await db.select().from(guestPhoneChallenges).where(eq(guestPhoneChallenges.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}

export async function getLatestGuestPhoneChallenge(invitationId: number, phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(guestPhoneChallenges).where(and(eq(guestPhoneChallenges.invitationId, invitationId), eq(guestPhoneChallenges.phone, phone))).orderBy(desc(guestPhoneChallenges.createdAt), desc(guestPhoneChallenges.id)).limit(1);
  return rows[0];
}

export async function updateGuestPhoneChallenge(id: number, input: { status?: "pending" | "verified" | "expired" | "blocked"; attempts?: number; verifiedAt?: Date | null; providerMessageId?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(guestPhoneChallenges).set(input).where(eq(guestPhoneChallenges.id, id));
  const rows = await db.select().from(guestPhoneChallenges).where(eq(guestPhoneChallenges.id, id)).limit(1);
  return rows[0];
}

export async function getOperationsSummary() {
  const db = await getDb();
  if (!db) return { customers: 0, requests: 0, activeChats: 0, calls: 0, activeInvites: 0, usedInvites: 0 };
  const [allContacts, allRequests, activeChats, allCalls, activeInvites, usedInvites] = await Promise.all([
    db.select({ id: contacts.id }).from(contacts),
    db.select({ id: serviceRequests.id }).from(serviceRequests),
    db.select({ id: conversations.id }).from(conversations).where(eq(conversations.status, "open")),
    db.select({ id: callLogs.id }).from(callLogs),
    db.select({ id: invitations.id }).from(invitations).where(eq(invitations.status, "active")),
    db.select({ id: invitations.id }).from(invitations).where(eq(invitations.status, "used")),
  ]);
  return { customers: allContacts.length, requests: allRequests.length, activeChats: activeChats.length, calls: allCalls.length, activeInvites: activeInvites.length, usedInvites: usedInvites.length };
}

export async function getOperationsActivity() {
  const db = await getDb();
  if (!db) return [];
  const [recentContacts, recentRequests, recentMessages, recentCalls] = await Promise.all([
    db.select({ id: contacts.id, name: contacts.displayName, at: contacts.createdAt }).from(contacts).orderBy(desc(contacts.createdAt)).limit(4),
    db.select({ id: serviceRequests.id, number: serviceRequests.requestNumber, at: serviceRequests.createdAt }).from(serviceRequests).orderBy(desc(serviceRequests.createdAt)).limit(4),
    db.select({ id: supportMessages.id, sender: supportMessages.sender, at: supportMessages.createdAt }).from(supportMessages).orderBy(desc(supportMessages.createdAt)).limit(4),
    db.select({ id: callLogs.id, status: callLogs.status, at: callLogs.createdAt }).from(callLogs).orderBy(desc(callLogs.createdAt)).limit(4),
  ]);
  return [
    ...recentContacts.map(item => ({ id: `contact-${item.id}`, kind: "customer" as const, title: `عميل جديد: ${item.name}`, at: item.at })),
    ...recentRequests.map(item => ({ id: `request-${item.id}`, kind: "request" as const, title: `طلب جديد: ${item.number}`, at: item.at })),
    ...recentMessages.map(item => ({ id: `message-${item.id}`, kind: "message" as const, title: item.sender === "guest" ? "رسالة جديدة من عميل" : "رد جديد من فريق الدعم", at: item.at })),
    ...recentCalls.map(item => ({ id: `call-${item.id}`, kind: "call" as const, title: `مكالمة: ${item.status}`, at: item.at })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10);
}

export type InstitutionStatusDraft = {
  mediaType: "image" | "video";
  storageKey: string;
  mediaUrl: string;
  fileName: string;
  mimeType: string;
  textContent?: string | null;
  textColor?: string;
  textFont?: "modern" | "classic" | "handwritten" | "bold";
  textAlign?: "right" | "center" | "left";
  textPositionX?: number;
  textPositionY?: number;
  mediaFilter?: "none" | "warm" | "cool" | "mono" | "vivid" | "fade";
};

export async function createInstitutionStatus(input: InstitutionStatusDraft) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(institutionStatuses).values(input);
  const rows = await db.select().from(institutionStatuses).where(eq(institutionStatuses.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}

export async function listInstitutionStatuses() {
  const db = await getDb();
  if (!db) return [];
  const statuses = await db.select().from(institutionStatuses).orderBy(desc(institutionStatuses.createdAt), desc(institutionStatuses.id));
  const ids = statuses.map(status => status.id);
  const views = ids.length ? await db.select().from(institutionStatusViews).where(inArray(institutionStatusViews.statusId, ids)) : [];
  return statuses.map(status => ({ ...status, viewCount: views.filter(view => view.statusId === status.id).length }));
}

export async function listPublishedInstitutionStatuses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(institutionStatuses)
    .where(and(eq(institutionStatuses.isPublished, true), gt(institutionStatuses.expiresAt, new Date())))
    .orderBy(asc(institutionStatuses.createdAt), asc(institutionStatuses.id));
}

export async function updateInstitutionStatus(id: number, input: Partial<InstitutionStatusDraft> & { isPublished?: boolean; expiresAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(institutionStatuses).set(input).where(eq(institutionStatuses.id, id));
  const rows = await db.select().from(institutionStatuses).where(eq(institutionStatuses.id, id)).limit(1);
  return rows[0];
}

export async function removeInstitutionStatus(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.delete(institutionStatusViews).where(eq(institutionStatusViews.statusId, id));
  await db.delete(institutionStatuses).where(eq(institutionStatuses.id, id));
}

export async function markInstitutionStatusViewed(statusId: number, contactId: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const existing = await db.select({ id: institutionStatusViews.id }).from(institutionStatusViews)
    .where(and(eq(institutionStatusViews.statusId, statusId), eq(institutionStatusViews.contactId, contactId))).limit(1);
  if (!existing[0]) await db.insert(institutionStatusViews).values({ statusId, contactId });
}

export async function getCustomerUiConfig(contactId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(customerUiConfigs).where(eq(customerUiConfigs.contactId, contactId)).orderBy(desc(customerUiConfigs.updatedAt), desc(customerUiConfigs.id)).limit(1);
  return rows[0];
}

export async function ensureCustomerUiConfig(input: { contactId: number; name: string; document: string }) {
  const current = await getCustomerUiConfig(input.contactId);
  if (current) return current;
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(customerUiConfigs).values({ contactId: input.contactId, name: input.name, draftDocument: input.document });
  const rows = await db.select().from(customerUiConfigs).where(eq(customerUiConfigs.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}

export async function listCustomerUiRevisions(contactId: number) {
  const config = await getCustomerUiConfig(contactId);
  if (!config) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerUiRevisions).where(eq(customerUiRevisions.configId, config.id)).orderBy(desc(customerUiRevisions.version), desc(customerUiRevisions.id));
}

export async function saveCustomerUiRevision(input: { contactId: number; name: string; document: string; summary: string; publish?: boolean; restored?: boolean; auditAction?: "draft_saved" | "published" | "restored" | "template_applied" }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const config = await ensureCustomerUiConfig({ contactId: input.contactId, name: input.name, document: input.document });
  const version = Math.max(config.draftVersion, config.publishedVersion) + 1;
  const [inserted] = await db.insert(customerUiRevisions).values({
    configId: config.id,
    version,
    document: input.document,
    changeSummary: input.summary,
    status: input.publish ? "published" : input.restored ? "restored" : "draft",
    publishedAt: input.publish ? new Date() : null,
  });
  const revisionId = Number(inserted.insertId);
  await db.update(customerUiConfigs).set({
    name: input.name,
    draftDocument: input.document,
    draftVersion: version,
    ...(input.publish ? { publishedVersion: version } : {}),
  }).where(eq(customerUiConfigs.id, config.id));
  await db.insert(customerUiAuditLogs).values({
    contactId: input.contactId,
    configId: config.id,
    revisionId,
    action: input.auditAction ?? (input.publish ? "published" : input.restored ? "restored" : "draft_saved"),
    summary: input.summary,
  });
  if (input.publish) {
    await db.insert(customerUiNotifications).values({
      contactId: input.contactId,
      title: "تم تحديث واجهة المراسلة",
      body: "نُشرت واجهة جديدة مخصصة لك داخل مراسلة المؤسسة.",
      route: "/institution",
    });
  }
  const revisionRows = await db.select().from(customerUiRevisions).where(eq(customerUiRevisions.id, revisionId)).limit(1);
  return { config: { ...config, name: input.name, draftDocument: input.document, draftVersion: version, publishedVersion: input.publish ? version : config.publishedVersion }, revision: revisionRows[0] };
}

export async function getPublishedCustomerUiDocument(contactId: number) {
  const config = await getCustomerUiConfig(contactId);
  if (!config?.publishedVersion) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(customerUiRevisions).where(and(eq(customerUiRevisions.configId, config.id), eq(customerUiRevisions.version, config.publishedVersion))).limit(1);
  return rows[0];
}

export async function getCustomerUiRevision(contactId: number, revisionId: number) {
  const config = await getCustomerUiConfig(contactId);
  if (!config) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(customerUiRevisions).where(and(eq(customerUiRevisions.id, revisionId), eq(customerUiRevisions.configId, config.id))).limit(1);
  return rows[0];
}

export async function listCustomerUiTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerUiTemplates).orderBy(desc(customerUiTemplates.updatedAt), desc(customerUiTemplates.id));
}

export async function createCustomerUiTemplate(input: { name: string; description?: string | null; document: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  const inserted = await db.insert(customerUiTemplates).values(input);
  const rows = await db.select().from(customerUiTemplates).where(eq(customerUiTemplates.id, Number(inserted[0].insertId))).limit(1);
  return rows[0];
}

export async function removeCustomerUiTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.delete(customerUiTemplates).where(eq(customerUiTemplates.id, id));
}

export async function listCustomerUiNotifications(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerUiNotifications).where(eq(customerUiNotifications.contactId, contactId)).orderBy(desc(customerUiNotifications.createdAt), desc(customerUiNotifications.id)).limit(20);
}

export async function markCustomerUiNotificationRead(contactId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  await db.update(customerUiNotifications).set({ isRead: true }).where(and(eq(customerUiNotifications.id, notificationId), eq(customerUiNotifications.contactId, contactId)));
}

export async function listCustomerUiAuditLogs(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerUiAuditLogs).where(eq(customerUiAuditLogs.contactId, contactId)).orderBy(desc(customerUiAuditLogs.createdAt), desc(customerUiAuditLogs.id)).limit(40);
}
