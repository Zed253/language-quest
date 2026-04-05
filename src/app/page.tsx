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
            {/* Adventure Map */}
            <div className="rounded-2xl border-2 p-6 bg-gradient-to-b from-blue-50 to-amber-50 dark:from-blue-950 dark:to-amber-950 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">🗺️ Grand Line</h2>
                <span className="text-sm text-muted-foreground">Phase 1 : East Blue</span>
              </div>

              {/* Islands / Meso-cycles */}
              <div className="relative">
                {/* Path line */}
                <div className="absolute top-8 left-4 right-4 h-1 bg-primary/20 rounded-full" />

                <div className="flex justify-between relative">
                  {[
                    { name: 'Se presenter', island: 'Shells Town', weeks: '1-3', active: true },
                    { name: 'Vie quotidienne', island: 'Orange Town', weeks: '4-6', locked: false },
                    { name: 'Nourriture', island: 'Baratie', weeks: '7-8', locked: true },
                  ].map((stop, i) => (
                    <div key={i} className="flex flex-col items-center text-center z-10">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-3 transition-all ${
                        stop.active
                          ? 'bg-primary text-white border-primary scale-110 animate-pulse-glow'
                          : stop.locked
                            ? 'bg-muted text-muted-foreground border-muted'
                            : 'bg-white text-foreground border-primary/50'
                      }`}>
                        {stop.active ? '🚢' : stop.locked ? '🔒' : '🏝️'}
                      </div>
                      <span className={`text-xs mt-2 font-medium ${stop.active ? 'text-primary' : stop.locked ? 'text-muted-foreground' : ''}`}>
                        {stop.island}
                      </span>
                      <span className="text-xs text-muted-foreground">{stop.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats compact */}
            <div className="grid grid-cols-4 gap-2">
              <StatCard label="A revoir" value={stats.due} highlight />
              <StatCard label="Total" value={stats.total} />
              <StatCard label="En cours" value={stats.learning} />
              <StatCard label="Maitrises" value={stats.mastered} />
            </div>

            {/* Session CTA */}
            <Link href="/session">
              <Button size="lg" className="w-full text-lg py-8 animate-pulse-glow font-bold tracking-wide">
                ⚓ Commencer la session du jour
              </Button>
            </Link>

            {/* Two main tools */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/translate">
                <Button variant="outline" className="w-full py-5">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🔄</div>
                    <div className="font-bold">Traduire</div>
                    <div className="text-xs text-muted-foreground">Rapide</div>
                  </div>
                </Button>
              </Link>
              <Link href="/chat">
                <Button variant="outline" className="w-full py-5">
                  <div className="text-center">
                    <div className="text-2xl mb-1">👨‍🍳</div>
                    <div className="font-bold">Mentor</div>
                    <div className="text-xs text-muted-foreground">Apprendre</div>
                  </div>
                </Button>
              </Link>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-4 gap-2">
              <Link href="/snack">
                <Button variant="outline" className="w-full py-3 text-xs">
                  ⚡ Snack
                </Button>
              </Link>
              <Link href="/review">
                <Button variant="outline" className="w-full py-3 text-xs">
                  📚 Reviser
                </Button>
              </Link>
              <Link href="/countdown">
                <Button variant="outline" className="w-full py-3 text-xs">
                  🌍 Compte
                </Button>
              </Link>
              <Link href="/crew">
                <Button variant="outline" className="w-full py-3 text-xs">
                  👥 Crew
                </Button>
              </Link>
            </div>

            {/* Progress bar */}
            {stats.total > 0 && (
              <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progression</span>
                  <span>{stats.mastered} / {stats.total} maitrises</span>
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
