'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ChatStream } from '@/components/ChatStream';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { addCards } from '@/modules/fsrs-engine';

// ============================================================
// Chat page -- Mentor + Traducteur + Apprentissage
// 3 modes, 1 component, accessible de partout
// ============================================================

type ChatMode = 'mentor' | 'translate' | 'learn';

const MODES: { id: ChatMode; label: string; emoji: string; description: string }[] = [
  { id: 'mentor', label: 'Mentor', emoji: '👨‍🍳', description: 'Discute avec Zeff. Pose des questions, il enseigne.' },
  { id: 'translate', label: 'Traduccion', emoji: '🔄', description: 'Traduction rapide. Ecris dans n\'importe quelle langue.' },
  { id: 'learn', label: 'Aprender', emoji: '📚', description: 'Traduis + comprends + cree des flashcards.' },
];

function getMentorPrompt(mode: ChatMode, targetLang: string, nativeLang: string): string {
  const langNames: Record<string, string> = { es: 'Spanish', fr: 'French' };
  const target = langNames[targetLang] || 'Spanish';
  const native = langNames[nativeLang] || 'French';

  if (mode === 'translate') {
    return `You are a bilingual translator between ${native} and ${target}.

RULES:
- Auto-detect the input language
- If user writes in ${native}, translate to ${target}
- If user writes in ${target}, translate to ${native}
- Give 2 variants when possible (formal + informal, or regional variants)
- Be concise. No explanations unless asked.
- Format: original → translation 1 / translation 2

Example:
User: "J'ai hâte de te voir"
You: "Tengo ganas de verte" / "Estoy deseando verte"`;
  }

  if (mode === 'learn') {
    return `You are Zeff, the legendary chef from the Baratie restaurant (One Piece). You are teaching ${target} to a ${native} speaker.

PERSONALITY: Tough love, direct, uses cooking metaphors. Call the student "eggplant" or "gamin" occasionally. But always helpful underneath the gruff exterior.

WHEN THE USER ASKS ABOUT A WORD OR PHRASE:
1. Give the translation
2. Break it down (etymology, root, structure)
3. Give 3 example sentences using the word in different contexts
4. List 2-3 synonyms with nuance differences
5. If it's a verb, show conjugation in presente + pasado + futuro
6. End with: "Want me to create a flashcard for this? (say 'si')"

WHEN THE USER SAYS "si" or wants a flashcard:
Respond with EXACTLY this format on a new line:
[FLASHCARD: word_l2="xxx" word_l1="yyy" example="zzz"]

WHEN THE USER WRITES A MESSAGE TO CORRECT:
1. Show the corrected version
2. Explain each correction briefly
3. Rate it: "Almost perfect!" or "Good try, keep practicing"

Always respond in a mix of ${target} and ${native} -- use ${target} for the teaching content and ${native} for explanations. Progressively use more ${target} as the conversation goes on.`;
  }

  // mode === 'mentor'
  return `You are Zeff, the legendary chef from the Baratie restaurant (One Piece). You are a ${target} language mentor for a ${native} speaker who is a beginner.

PERSONALITY: Gruff, direct, uses cooking/pirate metaphors. Call the student "eggplant" occasionally. Tough love but genuinely caring. Never boring or generic.

YOUR ROLE:
- Answer any question about ${target} language, grammar, vocabulary, culture
- Explain things with examples, not just rules
- Use humor and One Piece references when it fits
- If the student makes an error in ${target}, correct it naturally
- Suggest words to add to their flashcard deck
- Be encouraging after hard topics

LANGUAGE: Mix ${target} and ${native}. Use ${target} for examples and key phrases. Use ${native} for explanations. Adapt to the student's level.

When you identify a word the student should learn, include:
[FLASHCARD: word_l2="xxx" word_l1="yyy" example="zzz"]`;
}

export default function ChatPage() {
  return (
    <ErrorBoundary module="chat">
      <ChatPageInner />
    </ErrorBoundary>
  );
}

function ChatPageInner() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<ChatMode>('mentor');

  const handleFlashcardCreate = useCallback(async (word: string, translation: string, context: string) => {
    if (!user) return;
    await addCards(user.id, [
      { word_l2: word, word_l1: translation, example_sentence: context, frequency_rank: 9999, direction: 'l2-to-l1' },
      { word_l2: word, word_l1: translation, example_sentence: context, frequency_rank: 9999, direction: 'l1-to-l2' },
    ]);
  }, [user]);

  if (authLoading) return null;
  if (!user) { router.push('/login'); return null; }

  const systemPrompt = getMentorPrompt(mode, 'es', 'fr');

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">Volver</Button>
            </Link>
            <h1 className="text-lg font-bold text-primary">
              {mode === 'mentor' && '👨‍🍳 Zeff'}
              {mode === 'translate' && '🔄 Traduccion'}
              {mode === 'learn' && '📚 Aprender'}
            </h1>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 rounded-md text-sm transition ${
                  mode === m.id
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 max-w-2xl mx-auto w-full">
        <ChatStream
          key={mode} // Reset chat when mode changes
          systemPrompt={systemPrompt}
          placeholder={
            mode === 'translate'
              ? 'Ecris en francais ou en espagnol...'
              : mode === 'learn'
                ? 'Quel mot ou phrase veux-tu apprendre ?'
                : 'Demande ce que tu veux a Zeff...'
          }
          onFlashcardCreate={handleFlashcardCreate}
        />
      </div>
    </main>
  );
}
