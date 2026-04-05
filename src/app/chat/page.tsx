'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ChatStream, type ChatMessage } from '@/components/ChatStream';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { addCards } from '@/modules/fsrs-engine';
import { getMentorForUser, getMentorPrompt } from '@/modules/chat-mentor';
import { getCharacter } from '@/modules/character-system';
import { getUserProfile } from '@/modules/data-layer';
import { saveConversation, getConversations, getConversation } from '@/modules/chat-mentor';
import type { MentorProfile, ConversationPreview } from '@/modules/chat-mentor';

export default function ChatPage() {
  return (
    <ErrorBoundary module="chat">
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>}>
        <ChatPageInner />
      </Suspense>
    </ErrorBoundary>
  );
}

function ChatPageInner() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const searchParams = useSearchParams();
  const learnParam = searchParams.get('learn');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ConversationPreview[]>([]);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialQuery, setInitialQuery] = useState<string | null>(learnParam);

  useEffect(() => {
    if (authLoading || !user) return;
    async function loadMentor() {
      const [charResult, profile] = await Promise.all([
        getCharacter(user!.id),
        getUserProfile(user!.id),
      ]);
      const character = charResult.ok ? charResult.data : null;
      const themeId = (profile?.theme_id || 'one-piece') as 'one-piece' | 'harry-potter';
      const targetLang = (profile?.target_language || 'es') as 'es' | 'fr';
      const nativeLang = (profile?.native_language || 'fr') as 'es' | 'fr';
      const mentorProfile = getMentorForUser(character?.specialty || null, themeId);
      setMentor(mentorProfile);
      setSystemPrompt(getMentorPrompt(mentorProfile, targetLang, nativeLang));
    }
    loadMentor();
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    getConversations(user.id).then(r => { if (r.ok) setHistory(r.data); });
  }, [user]);

  const handleFlashcardCreate = useCallback(async (word: string, translation: string, context: string) => {
    if (!user) return;
    await addCards(user.id, [
      { word_l2: word, word_l1: translation, example_sentence: context, frequency_rank: 9999, direction: 'l2-to-l1' },
      { word_l2: word, word_l1: translation, example_sentence: context, frequency_rank: 9999, direction: 'l1-to-l2' },
    ]);
  }, [user]);

  const handleMessagesChange = useCallback((messages: ChatMessage[]) => {
    setCurrentMessages(messages);
    if (!user || !mentor || messages.length < 2) return;
    const firstUserMsg = messages.find(m => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
      : 'Conversation';
    saveConversation(user.id, { user_id: user.id, title, messages, mentor_name: mentor.name });
    // Refresh history
    getConversations(user.id).then(r => { if (r.ok) setHistory(r.data); });
  }, [user, mentor]);

  const loadConversation = async (convId: string) => {
    if (!user) return;
    const result = await getConversation(user.id, convId);
    if (result.ok && result.data) {
      setCurrentMessages(result.data.messages);
      setConversationId(convId);
      setShowHistory(false);
    }
  };

  const newConversation = () => {
    setCurrentMessages([]);
    setConversationId(crypto.randomUUID());
    setShowHistory(false);
  };

  if (authLoading) return null;
  if (!user) { router.push('/login'); return null; }
  if (!mentor || !systemPrompt) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading your mentor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="border-b p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="outline" size="sm">Volver</Button></Link>
            <h1 className="text-lg font-bold text-primary">{mentor.emoji} {mentor.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={newConversation}>+ Nuevo</Button>
            <Button variant={showHistory ? 'default' : 'outline'} size="sm" onClick={() => setShowHistory(!showHistory)}>
              Historial
            </Button>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="max-w-2xl mx-auto w-full border-b p-4 bg-muted/30 animate-fade-in">
          <h3 className="font-bold text-sm mb-3">Conversaciones anteriores</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin historial todavia.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate flex-1">{conv.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">{conv.message_count} msgs</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {conv.mentor_name} · {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 max-w-2xl mx-auto w-full">
        <ChatStream
          key={conversationId || 'new'}
          systemPrompt={systemPrompt}
          placeholder={`Parle a ${mentor.name}... traduction, question, correction, tout !`}
          onFlashcardCreate={handleFlashcardCreate}
          initialMessages={currentMessages}
          onMessagesChange={handleMessagesChange}
          autoSendMessage={initialQuery || undefined}
          onAutoSendComplete={() => setInitialQuery(null)}
        />
      </div>
    </main>
  );
}
