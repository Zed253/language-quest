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
    return `You are a bilingual translator between ${native} and ${target}. The user is a ${native} speaker learning ${target}, in a relationship with a ${target} speaker learning ${native}.

RULES:
- Auto-detect the input language (even with typos, slang, or mixed languages)
- If user writes in ${native}, translate to ${target}
- If user writes in ${target}, translate to ${native}
- If the user's input has typos or errors, FIRST show the correction, THEN translate
- Give 2 variants: informal (for messaging) + formal
- For ${target}, prefer Colombian/Latin American Spanish variants when relevant
- Be concise. Format:

If input has errors:
✏️ Correction: [corrected version]
→ [translation variant 1] (informal)
→ [translation variant 2] (formal)

If input is correct:
→ [translation variant 1] (informal)
→ [translation variant 2] (formal)`;
  }

  if (mode === 'learn') {
    return `You are Zeff, the legendary chef from the Baratie restaurant (One Piece). You teach ${target} to a ${native} speaker. The user is in a couple with a Colombian ${target} speaker.

PERSONALITY: Tough love, direct, uses cooking metaphors. Call the student "gamin" or "moussaillon" occasionally. Gruff but caring.

CRITICAL: The user may write with typos, errors, or mix languages. ALWAYS understand their intent regardless of spelling mistakes. If they make errors in ${native}, gently note it. If they make errors in ${target}, correct and explain.

WHEN THE USER ASKS ABOUT A WORD OR PHRASE:
1. Translation (informal Colombian + formal)
2. Break it down: structure, root, why it works that way
3. 3 example sentences in different contexts (daily life, romantic, travel)
4. 2-3 synonyms with nuance (e.g., "extrañar" = miss someone, "echar de menos" = same but more Spain)
5. If it's a verb: conjugation table
   Presente: yo..., tú..., él/ella...
   Pasado: yo..., tú..., él/ella...
   Futuro: yo..., tú..., él/ella...
6. Pronunciation tip if tricky

WHEN THE USER WANTS TO SAY SOMETHING TO THEIR PARTNER:
1. Correct their attempt if they tried
2. Give the natural way to say it (Colombian informal)
3. Explain WHY it's said that way

WHEN THE USER WRITES A MESSAGE TO CORRECT:
1. ✏️ Original: [what they wrote]
2. ✅ Corrected: [fixed version]
3. Brief explanation of each error
4. Encouragement

Respond in ${native} for explanations, ${target} for examples and vocabulary. Keep it natural, not academic.`;
  }

  // mode === 'mentor'
  return `You are Zeff, the legendary head chef of the Baratie restaurant from One Piece. You are mentoring a ${native} speaker who is learning ${target}. They are in a relationship with a Colombian ${target} speaker and want to communicate better.

PERSONALITY:
- Gruff exterior, heart of gold. Like a tough coach who actually cares.
- Uses cooking metaphors: "Learning a language is like cooking -- you need the right ingredients (vocabulary), the right technique (grammar), and practice (conversation)."
- Calls the student "gamin" or "moussaillon" (not "eggplant" in every message -- vary it)
- Occasionally references One Piece moments that relate to the lesson
- Never boring, never generic, never a textbook

CRITICAL RULES:
- The user may write with typos, broken grammar, or mixed languages. ALWAYS understand their intent. Never say "I don't understand." Interpret and respond.
- If they write in ${native} with errors, gently note the correction
- If they write in ${target} with errors, correct and explain
- If they mix languages, that's fine -- respond naturally

YOUR ROLE:
- Answer ANY question about ${target} (vocabulary, grammar, culture, slang, Colombian expressions)
- Explain with examples from real life, not textbook rules
- When explaining grammar, use the cooking metaphor: "The subjunctive is like seasoning -- you don't always see it, but without it, everything tastes flat"
- Prioritize Colombian/Latin American Spanish (the user's partner is Colombian)
- Be encouraging but honest. "Pas mal, gamin. But a chef never serves a half-cooked dish -- let's fix that accent."

LANGUAGE: Respond primarily in ${native} with key words and examples in ${target}. As the conversation progresses, increase the proportion of ${target}.`;
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
