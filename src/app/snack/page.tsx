'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { getNextCards, reviewCard } from '@/modules/fsrs-engine';
import type { Card, FsrsRating } from '@/modules/shared-types';

// ============================================================
// Snack Mode -- 5 flashcards, under 60 seconds
// Keeps the streak alive without a full session
// ============================================================

export default function SnackPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    async function load() {
      const result = await getNextCards(user!.id, 5);
      if (result.ok) {
        setCards(result.data);
        if (result.data.length === 0) setDone(true);
      }
      setLoading(false);
    }
    load();
  }, [user, authLoading, router]);

  const handleGrade = async (rating: FsrsRating) => {
    if (!user || !cards[currentIndex]) return;

    await reviewCard(cards[currentIndex].id, user.id, rating);
    if (rating >= 3) setCorrect(c => c + 1);

    const next = currentIndex + 1;
    if (next >= cards.length) {
      setDone(true);
    } else {
      setCurrentIndex(next);
      setRevealed(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading snack...</div>
      </main>
    );
  }

  if (done) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-md mx-auto text-center space-y-6 pt-20 animate-fade-in">
          <div className="text-5xl">&#9889;</div>
          <h1 className="text-2xl font-bold">Snack Complete!</h1>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-green-500">{correct}/{cards.length}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{elapsed}s</div>
              <div className="text-sm text-muted-foreground">Time</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Streak maintained! Your brain thanks you.</p>
          <Link href="/">
            <Button size="lg" className="w-full">Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    );
  }

  const card = cards[currentIndex];
  if (!card) return null;

  const front = card.direction === 'l2-to-l1' ? card.word_l2 : card.word_l1;
  const back = card.direction === 'l2-to-l1' ? card.word_l1 : card.word_l2;

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < currentIndex ? 'bg-green-500' : i === currentIndex ? 'bg-primary scale-125' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          &#9889; Snack Mode &middot; {currentIndex + 1}/{cards.length}
        </div>

        {/* Card */}
        <div
          className="rounded-xl border-2 p-10 min-h-[250px] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 animate-slide-up"
          onClick={() => !revealed && setRevealed(true)}
        >
          <div className="text-xs text-muted-foreground mb-4">
            {card.direction === 'l2-to-l1' ? '&#127466;&#127480; → &#127467;&#127479;' : '&#127467;&#127479; → &#127466;&#127480;'}
          </div>
          <div className="text-4xl font-bold">{front}</div>

          {revealed ? (
            <div className="mt-6 text-center border-t pt-4 w-full animate-fade-in">
              <div className="text-2xl text-primary font-bold">{back}</div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-6">Tap to reveal</p>
          )}
        </div>

        {/* Grade buttons */}
        {revealed && (
          <div className="grid grid-cols-4 gap-2 animate-fade-in">
            {[
              { r: 1 as FsrsRating, label: '&#10060;', color: 'bg-red-500' },
              { r: 2 as FsrsRating, label: '&#128528;', color: 'bg-orange-500' },
              { r: 3 as FsrsRating, label: '&#128077;', color: 'bg-green-500' },
              { r: 4 as FsrsRating, label: '&#9889;', color: 'bg-blue-500' },
            ].map(({ r, label, color }) => (
              <button
                key={r}
                onClick={() => handleGrade(r)}
                className={`${color} text-white rounded-lg p-4 text-2xl transition-transform hover:scale-110`}
                dangerouslySetInnerHTML={{ __html: label }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
