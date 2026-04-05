'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStats } from '@/modules/fsrs-engine';
import { Button } from '@/components/ui/button';

// Temporary: hardcoded user ID until auth is wired
const TEMP_USER_ID = '00000000-0000-0000-0000-000000000001';

export default function Dashboard() {
  const [stats, setStats] = useState<{
    total: number;
    due: number;
    new_cards: number;
    learning: number;
    mastered: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getStats(TEMP_USER_ID);
      if (result.ok) {
        setStats(result.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Language Quest
          </h1>
          <p className="text-muted-foreground mt-2">
            Your daily Spanish training awaits.
          </p>
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
              <Button size="lg" className="w-full text-lg py-6">
                Start Today&apos;s Session
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
