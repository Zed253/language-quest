'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/modules/data-layer';

interface CountdownQuest {
  id: string;
  name: string;
  target_date: string;
  objective_description: string;
  is_shared: boolean;
  created_at: string;
}

export default function CountdownPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [countdowns, setCountdowns] = useState<CountdownQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', target_date: '', objective: '', shared: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    loadCountdowns();
  }, [user, authLoading, router]);

  async function loadCountdowns() {
    const { data } = await supabase
      .from('countdown_quests')
      .select('*')
      .order('target_date', { ascending: true });
    setCountdowns((data || []) as CountdownQuest[]);
    setLoading(false);
  }

  async function createCountdown() {
    if (!user || !form.name || !form.target_date) return;
    setSaving(true);

    await supabase.from('countdown_quests').insert({
      user_id: user.id,
      name: form.name,
      target_date: form.target_date,
      objective_description: form.objective,
      is_shared: form.shared,
    });

    setForm({ name: '', target_date: '', objective: '', shared: true });
    setShowForm(false);
    setSaving(false);
    await loadCountdowns();
  }

  function daysUntil(date: string): number {
    const target = new Date(date);
    const now = new Date();
    return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  if (authLoading || !user) return null;

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Countdown Quests</h1>
            <p className="text-muted-foreground">Real deadlines, real motivation</p>
          </div>
          <Link href="/"><Button variant="outline" size="sm">Dashboard</Button></Link>
        </div>

        {/* Active countdowns */}
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : countdowns.length === 0 && !showForm ? (
          <div className="text-center py-12 rounded-lg border border-dashed space-y-4">
            <div className="text-4xl">&#127758;</div>
            <p className="text-lg">No countdown yet.</p>
            <p className="text-muted-foreground">Set a deadline for your next trip or meeting!</p>
            <Button onClick={() => setShowForm(true)}>Create Countdown</Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {countdowns.map(cd => {
                const days = daysUntil(cd.target_date);
                const urgency = days <= 7 ? 'border-red-500 bg-red-50' : days <= 30 ? 'border-amber-500 bg-amber-50' : 'border-primary bg-primary/5';

                return (
                  <div key={cd.id} className={`rounded-xl border-2 p-6 ${urgency} animate-fade-in`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{cd.name}</h3>
                        <p className="text-sm text-muted-foreground">{cd.objective_description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold">{days}</div>
                        <div className="text-sm text-muted-foreground">days left</div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.max(5, 100 - (days / 90) * 100)}%` }}
                      />
                    </div>
                    {cd.is_shared && (
                      <div className="text-xs text-muted-foreground mt-2">&#128101; Shared with partner</div>
                    )}
                  </div>
                );
              })}
            </div>

            {!showForm && (
              <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
                + New Countdown
              </Button>
            )}
          </>
        )}

        {/* Create form */}
        {showForm && (
          <div className="rounded-xl border p-6 space-y-4 animate-slide-up">
            <h3 className="font-bold text-lg">New Countdown Quest</h3>

            <input
              type="text"
              placeholder="Name (e.g., 'Trip to Colombia')"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              type="date"
              value={form.target_date}
              onChange={e => setForm({ ...form, target_date: e.target.value })}
              className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <textarea
              placeholder="Objective (e.g., 'Be able to order food and ask directions')"
              value={form.objective}
              onChange={e => setForm({ ...form, objective: e.target.value })}
              className="w-full p-3 rounded-lg border min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.shared}
                onChange={e => setForm({ ...form, shared: e.target.checked })}
              />
              Share with partner (visible on their dashboard)
            </label>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={createCountdown} disabled={saving || !form.name || !form.target_date} className="flex-1">
                {saving ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
