export function getCustomerChatPath(conversationId?: number | null) {
  return conversationId ? `/dashboard/chats/${conversationId}` : "/dashboard/chats";
}
