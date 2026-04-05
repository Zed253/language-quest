'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createQuest } from '@/modules/game-master';
import type { QuestType } from '@/modules/game-master';

const QUEST_TYPES: { id: QuestType; label: string; emoji: string; description: string }[] = [
  { id: 'vocabulary-hunt', label: 'Vocabulary Hunt', emoji: '&#128218;', description: 'Learn X words from a category in Y days' },
  { id: 'translation-dare', label: 'Translation Dare', emoji: '&#128172;', description: 'Translate a personal sentence you write' },
  { id: 'mystery-word', label: 'Mystery Word', emoji: '&#128270;', description: '3 clues across 3 days, guess the word' },
  { id: 'survival-challenge', label: 'Survival Challenge', emoji: '&#128170;', description: 'Complete X sessions above Y% accuracy' },
  { id: 'speed-run', label: 'Speed Run', emoji: '&#9889;', description: 'Finish a session under X minutes' },
  { id: 'sentence-forge', label: 'Sentence Forge', emoji: '&#128296;', description: 'Build X sentences using specific words' },
];

export default function CreateQuestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<QuestType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreate = async () => {
    if (!user || !selectedType || !title) return;
    setSaving(true);

    const result = await createQuest(user.id, {
      type: selectedType,
      title,
      description,
      parameters: {},
      reward_text: reward,
      deadline: deadline || undefined,
    });

    setSaving(false);
    if (result.ok) setCreated(true);
  };

  if (created) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-md mx-auto text-center space-y-6 pt-20 animate-fade-in">
          <div className="text-5xl">&#128220;</div>
          <h1 className="text-2xl font-bold">Quest Created!</h1>
          <p className="text-muted-foreground">Your partner will receive a mysterious notification...</p>
          <Button onClick={() => router.push('/crew')} className="w-full">
            Back to Crew
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Create Quest</h1>
          <Button variant="outline" size="sm" onClick={() => router.push('/crew')}>Back</Button>
        </div>

        {/* Quest type selection */}
        {!selectedType ? (
          <div className="space-y-3">
            <p className="text-muted-foreground">What kind of challenge?</p>
            {QUEST_TYPES.map(qt => (
              <button
                key={qt.id}
                onClick={() => setSelectedType(qt.id)}
                className="w-full text-left rounded-xl border-2 p-4 hover:border-primary transition animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" dangerouslySetInnerHTML={{ __html: qt.emoji }} />
                  <div>
                    <div className="font-bold">{qt.label}</div>
                    <div className="text-sm text-muted-foreground">{qt.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            <button onClick={() => setSelectedType(null)} className="text-sm text-primary underline">
              Change type
            </button>

            <div className="rounded-lg border p-3 bg-muted/50">
              <span className="font-bold">{QUEST_TYPES.find(q => q.id === selectedType)?.label}</span>
            </div>

            <input
              type="text"
              placeholder="Quest title (e.g., 'Kitchen Vocabulary Challenge')"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />

            <textarea
              placeholder="Description (what your partner needs to do)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 rounded-lg border min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              type="text"
              placeholder="Reward (e.g., 'I'll cook dinner tonight' or '+100 Berrys')"
              value={reward}
              onChange={e => setReward(e.target.value)}
              className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div>
              <label className="text-sm text-muted-foreground">Deadline (optional)</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button onClick={handleCreate} disabled={saving || !title} className="w-full" size="lg">
              {saving ? 'Creating...' : 'Send Quest &#128220;'}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
