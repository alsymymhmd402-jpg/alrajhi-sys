export const chatEmojiGroups = [
  { label: "الأكثر استخداماً", emojis: ["🙂", "😊", "👍", "🙏", "❤️", "😂", "✨", "🎉", "🌿", "🤝", "👋", "✅"] },
  { label: "المشاعر", emojis: ["😀", "😄", "😍", "🥹", "😌", "😔", "😢", "😮", "🤔", "😅", "🙌", "💚"] },
  { label: "الردود السريعة", emojis: ["📌", "📎", "📞", "🗓️", "📍", "📝", "🔔", "💬", "📩", "🕊️", "🌟", "🤲"] },
] as const;

export function appendChatEmoji(draft: string, emoji: string) {
  return `${draft}${emoji}`;
}
