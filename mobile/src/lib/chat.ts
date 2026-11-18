import type { ChatMessage } from '@/types/api';

export function localChatMessage(role: ChatMessage['role'], content: string, sequence: number): ChatMessage {
  const created_at = new Date().toISOString();
  return { id: `local-${Date.now()}-${sequence}`, role, content, created_at };
}

/** Server IDs stay stable through list inversion, keyboard changes and new replies. */
export function chatMessageKey(message: ChatMessage, index: number): string {
  return message.id ?? `${message.role}-${message.created_at ?? 'history'}-${index}`;
}
