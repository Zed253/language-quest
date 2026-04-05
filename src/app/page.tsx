'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStats } from '@/modules/fsrs-engine';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [stats, setStats] = useState<{
    total: number;
    due: number;
    new_cards: number;
    learning: number;
    mastered: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    async function load() {
      const result = await getStats(user!.id);
      if (result.ok) {
        setStats(result.data);
      }
      setLoading(false);
    }
    load();
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <main className="min-h-screen bg-background p-8"><div className="text-muted-foreground">Loading...</div></main>;
  }

  const userId = user.id;

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary">
              Language Quest
            </h1>
            <p className="text-muted-foreground mt-2">
              Your daily training awaits, Captain.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/crew">
              <Button variant="outline" size="sm">&#x1F6A2; Crew</Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="outline" size="sm">&#x1F9ED; Profile</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : stats ? (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Due Today" value={stats.due} highlight />
              <StatCard label="Total Cards" value={stats.total} />
              <StatCard label="Learning" value={stats.learning} />
              <StatCard label="Mastered" value={stats.mastered} />
            </div>

            {/* Start session button (AI-powered) */}
            <Link href="/session">
              <Button size="lg" className="w-full text-lg py-8 animate-pulse-glow font-bold tracking-wide">
                &#x2693; Start Today&apos;s Session
              </Button>
            </Link>

            {/* Flashcard review */}
            {stats.due > 0 && (
              <Link href="/review">
                <Button size="lg" variant="outline" className="w-full text-lg py-6">
                  Quick Review ({stats.due} flashcards)
                </Button>
              </Link>
            )}

            {/* Progress bar */}
            {stats.total > 0 && (
              <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Mastery Progress</span>
                  <span>{stats.mastered} / {stats.total} mastered</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No cards yet. Set up your Supabase database and seed some vocabulary.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <div className={`text-3xl font-bold ${highlight ? 'text-primary' : ''}`}>
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
