'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStats } from '@/modules/fsrs-engine';
import { useAuth } from '@/lib/auth';
import { initAllListeners } from '@/lib/init-listeners';
import { Button } from '@/components/ui/button';

// Initialize event listeners on first load
if (typeof window !== 'undefined') {
  initAllListeners();
}

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
        ) : stats && stats.total === 0 ? (
          /* First time user -- no cards yet */
          <FirstTimeSetup userId={userId} onSeeded={() => {
            // Reload stats after seeding
            getStats(userId).then(r => { if (r.ok) setStats(r.data); });
          }} />
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

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              {stats.due > 0 && (
                <Link href="/snack">
                  <Button variant="outline" className="w-full py-4">
                    &#9889; Snack Mode<br/>
                    <span className="text-xs text-muted-foreground">5 cards, 60 sec</span>
                  </Button>
                </Link>
              )}
              {stats.due > 0 && (
                <Link href="/review">
                  <Button variant="outline" className="w-full py-4">
                    &#128218; Full Review<br/>
                    <span className="text-xs text-muted-foreground">{stats.due} cards due</span>
                  </Button>
                </Link>
              )}
              <Link href="/countdown">
                <Button variant="outline" className="w-full py-4">
                  &#127758; Countdowns<br/>
                  <span className="text-xs text-muted-foreground">Real deadlines</span>
                </Button>
              </Link>
              <Link href="/crew">
                <Button variant="outline" className="w-full py-4">
                  &#128101; Crew<br/>
                  <span className="text-xs text-muted-foreground">Partner & quests</span>
                </Button>
              </Link>
            </div>

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

function FirstTimeSetup({ userId, onSeeded }: { userId: string; onSeeded: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetLanguage: 'es' }),
      });
      if (res.ok) {
        setSeeded(true);
        onSeeded();
      }
    } catch { /* silent */ }
    setSeeding(false);
  };

  if (seeded) {
    return (
      <div className="text-center py-12 rounded-xl border-2 border-green-500 bg-green-50 space-y-4 animate-fade-in">
        <div className="text-4xl">&#127881;</div>
        <h2 className="text-xl font-bold">200 flashcards loaded!</h2>
        <p className="text-muted-foreground">You can now start learning. Take the assessment or jump straight in.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/assessment">
            <Button>Take Assessment</Button>
          </Link>
          <Link href="/session">
            <Button variant="outline">Start Session</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 rounded-xl border-2 border-dashed space-y-4 animate-fade-in">
      <div className="text-4xl">&#127758;</div>
      <h2 className="text-xl font-bold">Welcome aboard, Captain!</h2>
      <p className="text-muted-foreground">Let&apos;s load your first vocabulary deck and calibrate your level.</p>
      <div className="flex gap-3 justify-center">
        <Button size="lg" onClick={handleSeed} disabled={seeding}>
          {seeding ? 'Loading vocabulary...' : 'Load 200 Flashcards'}
        </Button>
      </div>
    </div>
  );
}
