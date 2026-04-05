'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { TappableText } from '@/components/TappableText';
import { PostSessionMessage } from '@/components/PostSessionMessage';
import { addCards } from '@/modules/fsrs-engine';

export default function SessionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    plan,
    currentExercise,
    currentPhase,
    overallProgress,
    isLoading,
    error,
    phase,
    showTranslation,
    lastFeedback,
    completeData,
    startSession,
    dismissIntro,
    submitAnswer,
    dismissFeedback,
    toggleTranslation,
    reset,
  } = useSessionStore();

  const [userInput, setUserInput] = useState('');

  const handleAddToDeck = useCallback(async (word: string, translation: string) => {
    if (!user) return;
    await addCards(user.id, [
      { word_l2: word, word_l1: translation, example_sentence: '', frequency_rank: 9999, direction: 'l2-to-l1' },
      { word_l2: word, word_l1: translation, example_sentence: '', frequency_rank: 9999, direction: 'l1-to-l2' },
    ]);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    startSession(user.id);
  }, [user, authLoading, router, startSession]);

  // ============ LOADING ============
  if (isLoading && phase === 'idle') {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto text-center pt-20">
          <div className="text-4xl mb-4 animate-pulse">&#9881;&#65039;</div>
          <p className="text-lg text-muted-foreground">Building your session...</p>
          <p className="text-sm text-muted-foreground mt-2">The AI is preparing your exercises</p>
        </div>
      </main>
    );
  }

  // ============ ERROR ============
  if (error) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto text-center pt-20 space-y-4">
          <p className="text-destructive">{error}</p>
          <Link href="/">
            <Button onClick={reset}>Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    );
  }

  // ============ INTRO ============
  if (phase === 'intro' && plan) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto space-y-6 pt-10">
          <div className="text-sm uppercase tracking-wider text-muted-foreground">
            Session Intro
          </div>

          <div className="rounded-xl border-2 p-6 space-y-4">
            <p className="text-lg leading-relaxed">
              <TappableText
                text={plan.narrativeIntro}
                language="es"
                onAddToDeck={handleAddToDeck}
              />
            </p>

            {showTranslation && plan.narrativeIntroTranslation && (
              <p className="text-sm text-muted-foreground italic border-t pt-3">
                {plan.narrativeIntroTranslation}
              </p>
            )}

            <button
              onClick={toggleTranslation}
              className="text-xs text-primary underline"
            >
              {showTranslation ? 'Hide translation' : 'Translate'}
            </button>
          </div>

          <div className="text-sm text-muted-foreground">
            {plan.totalExercises} exercises &middot; ~{plan.estimatedMinutes} min &middot; {plan.dominance}
          </div>

          <Button size="lg" className="w-full" onClick={dismissIntro}>
            Start
          </Button>
        </div>
      </main>
    );
  }

  // ============ FEEDBACK ============
  if (phase === 'feedback' && lastFeedback) {
    const isCorrect = lastFeedback.score >= 0.5;
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto space-y-6 pt-10">
          <ProgressBar progress={overallProgress} />

          <div className={`rounded-xl border-2 p-6 space-y-3 ${
            isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'
          }`}>
            <div className="text-2xl">{isCorrect ? '&#10004;&#65039;' : '&#10060;'}</div>
            <p className="text-lg font-medium">{lastFeedback.feedback}</p>
            {lastFeedback.correction && (
              <p className="text-sm">
                Correct answer: <strong>{lastFeedback.correction}</strong>
              </p>
            )}
            {lastFeedback.grammarNote && (
              <p className="text-sm text-muted-foreground italic">
                &#128161; {lastFeedback.grammarNote}
              </p>
            )}
          </div>

          <Button size="lg" className="w-full" onClick={dismissFeedback}>
            Continue
          </Button>
        </div>
      </main>
    );
  }

  // ============ EXERCISING ============
  if (phase === 'exercising' && currentExercise) {
    const exercise = currentExercise.exercise;
    const card = currentExercise.card;

    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto space-y-6">
          <ProgressBar progress={overallProgress} />

          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {currentPhase} &middot; {exercise?.type || 'flashcard'}
          </div>

          {/* FSRS Card (flashcard from warm-up) */}
          {card && !exercise && (
            <FlashcardExercise
              card={card}
              onGrade={(rating) => submitAnswer(String(rating))}
              isLoading={isLoading}
            />
          )}

          {/* LLM Exercise */}
          {exercise && (
            <LLMExercise
              exercise={exercise}
              userInput={userInput}
              setUserInput={setUserInput}
              onSubmit={() => {
                submitAnswer(userInput);
                setUserInput('');
              }}
              isLoading={isLoading}
            />
          )}
        </div>
      </main>
    );
  }

  // ============ OUTRO / COMPLETE ============
  if ((phase === 'outro' || phase === 'complete') && completeData) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto space-y-6 pt-10 text-center">
          <div className="text-5xl">&#127881;</div>
          <h1 className="text-3xl font-bold">Session Complete!</h1>

          {/* Narrative outro */}
          <div className="rounded-xl border p-6 text-left space-y-3">
            <p className="text-lg leading-relaxed">
              <TappableText
                text={completeData.narrativeOutro}
                language="es"
                onAddToDeck={handleAddToDeck}
              />
            </p>
            {completeData.narrativeOutroTranslation && (
              <>
                <button onClick={toggleTranslation} className="text-xs text-primary underline">
                  {showTranslation ? 'Hide' : 'Translate'}
                </button>
                {showTranslation && (
                  <p className="text-sm text-muted-foreground italic">
                    {completeData.narrativeOutroTranslation}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{completeData.stats.exercisesCompleted}</div>
              <div className="text-sm text-muted-foreground">Exercises</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-green-500">{completeData.stats.successRate}%</div>
              <div className="text-sm text-muted-foreground">Success</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-amber-500">+{completeData.currencyEarned}</div>
              <div className="text-sm text-muted-foreground">Berrys</div>
            </div>
          </div>

          {/* Post-session message to partner */}
          <div className="rounded-xl border p-6">
            <PostSessionMessage
              userId={user!.id}
              targetLanguage="es"
              phase={1}
              onDone={() => {}}
            />
          </div>

          <Link href="/">
            <Button size="lg" className="w-full" onClick={reset}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  // Fallback
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-lg mx-auto text-center pt-20">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    </main>
  );
}

// ============ Sub-components ============

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}

function FlashcardExercise({
  card,
  onGrade,
  isLoading,
}: {
  card: { word_l2: string; word_l1: string; example_sentence: string; direction: string };
  onGrade: (rating: number) => void;
  isLoading: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [hintLevel, setHintLevel] = useState(0); // 0=none, 1=context, 2=first letter, 3=full sentence
  const [audioPlaying, setAudioPlaying] = useState(false);

  const front = card.direction === 'l2-to-l1' ? card.word_l2 : card.word_l1;
  const back = card.direction === 'l2-to-l1' ? card.word_l1 : card.word_l2;
  const isSpanishFront = card.direction === 'l2-to-l1';

  const playAudio = async (text: string) => {
    setAudioPlaying(true);
    try {
      const res = await fetch('/api/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => setAudioPlaying(false);
        await audio.play();
      }
    } catch { /* silent fail */ }
    setAudioPlaying(false);
  };

  const hints = [
    card.example_sentence ? `Context: "${card.example_sentence.replace(card.word_l2, '___')}"` : null,
    back ? `First letter: ${back[0]}...` : null,
    card.example_sentence || null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4 animate-slide-up">
      <div
        className="rounded-xl border-2 p-8 min-h-[280px] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50"
        onClick={() => !revealed && setRevealed(true)}
      >
        <div className="text-xs text-muted-foreground mb-2">
          {card.direction === 'l2-to-l1' ? '&#127466;&#127480; → &#127467;&#127479;' : '&#127467;&#127479; → &#127466;&#127480;'}
        </div>

        {/* Audio button */}
        <button
          onClick={(e) => { e.stopPropagation(); playAudio(card.word_l2); }}
          className="text-2xl mb-3 hover:scale-110 transition-transform"
          disabled={audioPlaying}
        >
          {audioPlaying ? '&#128266;' : '&#128264;'}
        </button>

        <div className="text-4xl font-bold mb-4">{front}</div>

        {/* Progressive hints */}
        {!revealed && hintLevel > 0 && hints.slice(0, hintLevel).map((hint, i) => (
          <p key={i} className="text-sm text-amber-600 italic mt-2">&#128161; {hint}</p>
        ))}

        {revealed ? (
          <div className="space-y-3 text-center border-t pt-4 w-full animate-fade-in">
            <div className="text-2xl text-primary font-bold">{back}</div>
            {card.example_sentence && (
              <div className="text-sm text-muted-foreground italic">{card.example_sentence}</div>
            )}
            {/* Play example sentence */}
            {card.example_sentence && (
              <button
                onClick={(e) => { e.stopPropagation(); playAudio(card.example_sentence); }}
                className="text-xs text-primary underline"
              >
                &#128264; Listen to example
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            <p className="text-sm text-muted-foreground">Tap to reveal</p>
            {hintLevel < hints.length && (
              <button
                onClick={(e) => { e.stopPropagation(); setHintLevel(h => h + 1); }}
                className="text-xs text-primary underline"
              >
                Need a hint? ({hintLevel + 1}/{hints.length})
              </button>
            )}
          </div>
        )}
      </div>

      {revealed && (
        <div className="grid grid-cols-4 gap-2 animate-fade-in">
          {[
            { r: 1, label: 'Again', sub: "Didn't know", color: 'bg-red-500 hover:bg-red-600' },
            { r: 2, label: 'Hard', sub: 'Struggled', color: 'bg-orange-500 hover:bg-orange-600' },
            { r: 3, label: 'Good', sub: 'Recalled', color: 'bg-green-500 hover:bg-green-600' },
            { r: 4, label: 'Easy', sub: 'Instant', color: 'bg-blue-500 hover:bg-blue-600' },
          ].map(({ r, label, sub, color }) => (
            <button
              key={r}
              disabled={isLoading}
              onClick={() => { onGrade(r); setRevealed(false); setHintLevel(0); }}
              className={`${color} text-white rounded-lg p-3 disabled:opacity-50 transition-transform hover:scale-105`}
            >
              <div className="font-bold text-sm">{label}</div>
              <div className="text-xs opacity-80">{sub}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LLMExercise({
  exercise,
  userInput,
  setUserInput,
  onSubmit,
  isLoading,
}: {
  exercise: { type: string; prompt: string; hints: string[]; word_bank?: string[]; distractors?: string[] };
  userInput: string;
  setUserInput: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  const [hintIndex, setHintIndex] = useState(-1);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const showNextHint = () => {
    if (hintIndex < exercise.hints.length - 1) {
      setHintIndex(hintIndex + 1);
    }
  };

  // QCM
  if (exercise.type === 'qcm' && exercise.distractors) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border p-6">
          <p className="text-lg font-medium">{exercise.prompt}</p>
        </div>
        <div className="space-y-2">
          {exercise.distractors.map((choice, i) => (
            <button
              key={i}
              disabled={isLoading}
              onClick={() => {
                setSelectedChoice(choice);
                setUserInput(choice);
              }}
              className={`w-full text-left p-4 rounded-lg border transition ${
                selectedChoice === choice ? 'border-primary bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
        {selectedChoice && (
          <Button className="w-full" onClick={onSubmit} disabled={isLoading}>
            Confirm
          </Button>
        )}
      </div>
    );
  }

  // Sentence building
  if (exercise.type === 'sentence-building' && exercise.word_bank) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border p-6">
          <p className="text-lg font-medium">{exercise.prompt}</p>
        </div>
        <div className="min-h-[50px] rounded-lg border-2 border-dashed p-3">
          <p className="text-lg">{userInput || <span className="text-muted-foreground">Build your sentence...</span>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {exercise.word_bank.map((word, i) => (
            <button
              key={i}
              onClick={() => setUserInput(userInput ? userInput + ' ' + word : word)}
              className="px-3 py-2 rounded-lg border bg-muted hover:bg-primary/10 text-sm font-medium"
            >
              {word}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUserInput('')} className="flex-1">
            Clear
          </Button>
          <Button onClick={onSubmit} disabled={isLoading || !userInput} className="flex-1">
            Submit
          </Button>
        </div>
      </div>
    );
  }

  // Default: text input (cloze, translation, etc.)
  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-6 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {exercise.type.replace(/-/g, ' ')}
        </div>
        <p className="text-lg font-medium">{exercise.prompt}</p>

        {/* Hints */}
        {hintIndex >= 0 && exercise.hints.slice(0, hintIndex + 1).map((hint, i) => (
          <p key={i} className="text-sm text-amber-600 italic">&#128161; {hint}</p>
        ))}
      </div>

      <input
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && userInput && onSubmit()}
        placeholder="Type your answer..."
        className="w-full p-4 rounded-lg border text-lg focus:outline-none focus:ring-2 focus:ring-primary"
        autoFocus
      />

      <div className="flex gap-2">
        {exercise.hints.length > 0 && hintIndex < exercise.hints.length - 1 && (
          <Button variant="outline" onClick={showNextHint} className="flex-1">
            Hint ({hintIndex + 2}/{exercise.hints.length})
          </Button>
        )}
        <Button onClick={onSubmit} disabled={isLoading || !userInput} className="flex-1">
          Submit
        </Button>
      </div>
    </div>
  );
}
