export function getCustomerChatPath(conversationId?: number | null) {
  return conversationId ? `/dashboard/chats?conversation=${conversationId}` : "/dashboard/chats";
}
