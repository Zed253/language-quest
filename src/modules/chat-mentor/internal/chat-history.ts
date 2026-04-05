import { type Result, ok, err } from '@/modules/shared-types';
import { supabase } from '@/modules/data-layer';

// ============================================================
// Chat History -- persistent conversations
// ============================================================

export interface Conversation {
  id: string;
  user_id: string;
  title: string; // Auto-generated from first message
  messages: ChatMessage[];
  mentor_name: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationPreview {
  id: string;
  title: string;
  mentor_name: string;
  message_count: number;
  updated_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// For now, use localStorage (Supabase table can be added later)
// This keeps it simple and works offline too

const STORAGE_KEY = 'lq_chat_history';

function getStoredConversations(userId: string): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredConversations(userId: string, conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  // Keep only last 50 conversations
  const trimmed = conversations.slice(0, 50);
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(trimmed));
}

export async function saveConversation(
  userId: string,
  conversation: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>
): Promise<Result<Conversation>> {
  try {
    const existing = getStoredConversations(userId);

    // Check if updating existing conversation
    const existingIdx = existing.findIndex(c => c.title === conversation.title && c.mentor_name === conversation.mentor_name);

    const now = new Date().toISOString();
    const conv: Conversation = {
      id: existingIdx >= 0 ? existing[existingIdx].id : crypto.randomUUID(),
      ...conversation,
      created_at: existingIdx >= 0 ? existing[existingIdx].created_at : now,
      updated_at: now,
    };

    if (existingIdx >= 0) {
      existing[existingIdx] = conv;
    } else {
      existing.unshift(conv); // Add to beginning
    }

    setStoredConversations(userId, existing);
    return ok(conv);
  } catch (e) {
    return err({
      code: 'CHAT_SAVE_FAILED',
      message: 'Failed to save conversation',
      module: 'chat-mentor',
      cause: e,
    });
  }
}

export async function getConversations(
  userId: string
): Promise<Result<ConversationPreview[]>> {
  try {
    const conversations = getStoredConversations(userId);
    const previews: ConversationPreview[] = conversations.map(c => ({
      id: c.id,
      title: c.title,
      mentor_name: c.mentor_name,
      message_count: c.messages.length,
      updated_at: c.updated_at,
    }));
    return ok(previews);
  } catch (e) {
    return err({
      code: 'CHAT_LIST_FAILED',
      message: 'Failed to list conversations',
      module: 'chat-mentor',
      cause: e,
    });
  }
}

export async function getConversation(
  userId: string,
  conversationId: string
): Promise<Result<Conversation | null>> {
  try {
    const conversations = getStoredConversations(userId);
    const conv = conversations.find(c => c.id === conversationId);
    return ok(conv || null);
  } catch (e) {
    return err({
      code: 'CHAT_GET_FAILED',
      message: 'Failed to get conversation',
      module: 'chat-mentor',
      cause: e,
    });
  }
}
