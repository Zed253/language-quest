'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReviewStore } from '@/stores/review-store';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import type { FsrsRating } from '@/modules/shared-types';

const GRADE_BUTTONS: { rating: FsrsRating; label: string; sublabel: string; color: string }[] = [
  { rating: 1, label: 'Again', sublabel: "Didn't know", color: 'bg-red-500 hover:bg-red-600' },
  { rating: 2, label: 'Hard', sublabel: 'Struggled', color: 'bg-orange-500 hover:bg-orange-600' },
  { rating: 3, label: 'Good', sublabel: 'Recalled', color: 'bg-green-500 hover:bg-green-600' },
  { rating: 4, label: 'Easy', sublabel: 'Instant', color: 'bg-blue-500 hover:bg-blue-600' },
];

export default function ReviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    deck,
    currentIndex,
    isRevealed,
    isLoading,
    error,
    isSessionComplete,
    cardsReviewed,
    cardsCorrect,
    cardsIncorrect,
    loadDeck,
    revealCard,
    gradeCard,
    resetSession,
    getSessionStats,
  } = useReviewStore();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    loadDeck(user.id);
  }, [user, authLoading, router, loadDeck]);

  const currentCard = deck[currentIndex];
  const progress = deck.length > 0 ? ((currentIndex) / deck.length) * 100 : 0;

  // Session complete screen
  if (isSessionComplete && cardsReviewed > 0) {
    const stats = getSessionStats();
    const accuracy = stats.cards_reviewed > 0
      ? Math.round((stats.cards_correct / stats.cards_reviewed) * 100)
      : 0;

    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-md mx-auto text-center space-y-8 pt-20">
          <div className="text-6xl">&#127881;</div>
          <h1 className="text-3xl font-bold">Session Complete!</h1>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{stats.cards_reviewed}</div>
              <div className="text-sm text-muted-foreground">Reviewed</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-green-500">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{Math.floor(stats.duration_seconds / 60)}m</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
          </div>

          <Link href="/">
            <Button
              size="lg"
              className="w-full"
              onClick={() => resetSession()}
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  // No cards due
  if (!isLoading && deck.length === 0) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-md mx-auto text-center space-y-8 pt-20">
          <h1 className="text-3xl font-bold">No cards due!</h1>
          <p className="text-muted-foreground">Come back later for more review.</p>
          <Link href="/">
            <Button size="lg">Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{currentIndex + 1} / {deck.length}</span>
            <span>{cardsCorrect} correct, {cardsIncorrect} incorrect</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Card */}
        {currentCard && (
          <div
            className="rounded-xl border-2 p-8 min-h-[300px] flex flex-col items-center justify-center cursor-pointer select-none transition-all"
            onClick={() => !isRevealed && revealCard()}
          >
            {/* Front: word in target language */}
            <div className="text-center space-y-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {currentCard.direction === 'l2-to-l1' ? 'Spanish → French' : 'French → Spanish'}
              </div>
              <div className="text-4xl font-bold">
                {currentCard.direction === 'l2-to-l1'
                  ? currentCard.word_l2
                  : currentCard.word_l1}
              </div>

              {/* Back: translation + example (shown when revealed) */}
              {isRevealed ? (
                <div className="space-y-4 pt-4 border-t">
                  <div className="text-2xl text-primary">
                    {currentCard.direction === 'l2-to-l1'
                      ? currentCard.word_l1
                      : currentCard.word_l2}
                  </div>
                  <div className="text-sm text-muted-foreground italic">
                    {currentCard.example_sentence}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pt-4">
                  Tap to reveal
                </p>
              )}
            </div>
          </div>
        )}

        {/* Grade buttons (shown only when revealed) */}
        {isRevealed && currentCard && (
          <div className="grid grid-cols-4 gap-2">
            {GRADE_BUTTONS.map(({ rating, label, sublabel, color }) => (
              <button
                key={rating}
                disabled={isLoading}
                onClick={() => gradeCard(user!.id, rating)}
                className={`${color} text-white rounded-lg p-3 transition-all disabled:opacity-50`}
              >
                <div className="font-bold text-sm">{label}</div>
                <div className="text-xs opacity-80">{sublabel}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
