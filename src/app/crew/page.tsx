'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { getSharedVitality, getPartnerStats, getPostcards } from '@/modules/couple-collab';
import { getActiveQuests } from '@/modules/game-master';
import type { VitalityState, PartnerStats, Postcard } from '@/modules/couple-collab';
import type { Quest } from '@/modules/game-master';

export default function CrewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [vitality, setVitality] = useState<VitalityState | null>(null);
  const [partner, setPartner] = useState<PartnerStats | null>(null);
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    async function load() {
      const [vRes, pRes, pcRes, qRes] = await Promise.all([
        getSharedVitality(user!.id),
        getPartnerStats(user!.id),
        getPostcards(user!.id),
        getActiveQuests(user!.id),
      ]);

      if (vRes.ok) setVitality(vRes.data);
      if (pRes.ok) setPartner(pRes.data);
      if (pcRes.ok) setPostcards(pcRes.data);
      if (qRes.ok) setQuests(qRes.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto pt-10 text-muted-foreground">Loading crew data...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">The Crew</h1>
            <p className="text-muted-foreground">Your learning partnership</p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">Dashboard</Button>
          </Link>
        </div>

        {/* Shared Vitality */}
        {vitality && (
          <div className="rounded-xl border p-6 space-y-3">
            <h2 className="font-bold text-lg">Ship Health</h2>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${vitality.health}%`,
                  backgroundColor: vitality.health > 70 ? '#22c55e' : vitality.health > 40 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{vitality.health}% health</span>
              <span>{vitality.streak_together} days sailing together</span>
            </div>
          </div>
        )}

        {/* Partner Stats */}
        {partner && (
          <div className="rounded-xl border p-6 space-y-3">
            <h2 className="font-bold text-lg">{partner.partner_name}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{partner.streak_current}</div>
                <div className="text-xs text-muted-foreground">Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{partner.words_known}</div>
                <div className="text-xs text-muted-foreground">Words</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{partner.xp}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>
            <div className={`text-sm ${partner.is_active_today ? 'text-green-500' : 'text-muted-foreground'}`}>
              {partner.is_active_today ? 'Active today' : 'Not yet active today'}
            </div>
          </div>
        )}

        {/* Active Quests */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Active Quests</h2>
            <Link href="/crew/create-quest">
              <Button size="sm">Create Quest</Button>
            </Link>
          </div>
          {quests.length === 0 ? (
            <div className="text-center py-8 rounded-lg border border-dashed text-muted-foreground">
              No active quests. Create one for your partner!
            </div>
          ) : (
            quests.map(quest => (
              <div key={quest.id} className="rounded-lg border p-4">
                <div className="font-bold">{quest.title}</div>
                <div className="text-sm text-muted-foreground">{quest.description}</div>
                <div className="text-xs text-primary mt-2">{quest.type} &middot; {quest.reward_text}</div>
              </div>
            ))
          )}
        </div>

        {/* Recent Postcards */}
        <div className="space-y-3">
          <h2 className="font-bold text-lg">Postcards</h2>
          {postcards.length === 0 ? (
            <div className="text-center py-8 rounded-lg border border-dashed text-muted-foreground">
              No postcards yet. Finish a session and send one!
            </div>
          ) : (
            postcards.slice(0, 5).map(pc => (
              <div key={pc.id} className="rounded-lg border p-4">
                <p className="italic">&ldquo;{pc.message}&rdquo;</p>
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(pc.created_at).toLocaleDateString()}
                  {pc.reaction && ` &middot; ${pc.reaction}`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
