'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { saveRadar, mapRadarToStartingState } from '@/modules/assessment-system';
import { updateUserProfile } from '@/modules/data-layer';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ============================================================
// Initial Assessment -- self-evaluation (quick version)
// Full LLM-powered assessment is a future enhancement
// ============================================================

const CHANNELS = [
  { key: 'vocabulary_score', label: 'Vocabulary', question: 'How many Spanish words can you recognize?', levels: ['Almost none (0-50 words)', 'Some basics (50-200)', 'Daily vocabulary (200-500)', 'Comfortable (500-1000)', 'Extensive (1000+)'] },
  { key: 'reading_score', label: 'Reading', question: 'Can you read Spanish text?', levels: ['Cannot read at all', 'Simple signs/labels', 'Short simple texts', 'News articles with effort', 'Books and articles easily'] },
  { key: 'listening_score', label: 'Listening', question: 'Can you understand spoken Spanish?', levels: ['Almost nothing', 'A few common words', 'Simple slow sentences', 'Normal conversation (most)', 'Native speed easily'] },
  { key: 'grammar_score', label: 'Grammar', question: 'How well do you know Spanish grammar?', levels: ['No knowledge', 'Basic present tense', 'Present + past tense', 'Multiple tenses + subjunctive', 'Near-native grammar'] },
  { key: 'writing_score', label: 'Writing', question: 'Can you write in Spanish?', levels: ['Cannot write', 'Single words', 'Simple sentences', 'Paragraphs with errors', 'Fluent writing'] },
  { key: 'speaking_score', label: 'Speaking', question: 'Can you speak Spanish?', levels: ['Cannot speak', 'Memorized phrases', 'Simple slow sentences', 'Conversation with pauses', 'Fluent conversation'] },
];

export default function AssessmentPage() {
  return (
    <ErrorBoundary module="assessment">
      <AssessmentInner />
    </ErrorBoundary>
  );
}

function AssessmentInner() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentChannel, setCurrentChannel] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ phase: number; startWeek: number } | null>(null);

  const channel = CHANNELS[currentChannel];

  const handleSelect = (levelIndex: number) => {
    const score = levelIndex * 25; // 0, 25, 50, 75, 100
    const newScores = { ...scores, [channel.key]: score };
    setScores(newScores);

    if (currentChannel < CHANNELS.length - 1) {
      setCurrentChannel(currentChannel + 1);
    } else {
      // All channels assessed
      finalize(newScores);
    }
  };

  const finalize = async (allScores: Record<string, number>) => {
    if (!user) return;
    setSaving(true);

    const radar = {
      vocabulary_score: allScores.vocabulary_score || 0,
      reading_score: allScores.reading_score || 0,
      listening_score: allScores.listening_score || 0,
      grammar_score: allScores.grammar_score || 0,
      writing_score: allScores.writing_score || 0,
      speaking_score: allScores.speaking_score || 0,
    };

    // Save radar
    await saveRadar(user.id, radar);

    // Map to starting state
    const startingState = mapRadarToStartingState({ ...radar, assessed_at: '' });

    // Update user profile
    await updateUserProfile(user.id, {
      current_phase: startingState.phase,
      current_day: (startingState.startWeek - 1) * 7 + 1,
    });

    setResult(startingState);
    setSaving(false);
  };

  // Result screen
  if (result) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-md mx-auto text-center space-y-6 pt-10 animate-fade-in">
          <div className="text-5xl">&#128200;</div>
          <h1 className="text-2xl font-bold">Assessment Complete!</h1>

          {/* Radar display */}
          <div className="rounded-xl border p-6 space-y-3 text-left">
            {CHANNELS.map(ch => {
              const score = scores[ch.key] || 0;
              return (
                <div key={ch.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{ch.label}</span>
                    <span className="text-muted-foreground">{score}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-muted-foreground">
            Starting at Phase {result.phase}, Week {result.startWeek}
          </p>

          <Button size="lg" className="w-full" onClick={() => router.push('/')}>
            Start Learning
          </Button>
        </div>
      </main>
    );
  }

  // Assessment questions
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto space-y-6 pt-10">
        {/* Progress */}
        <div className="flex gap-1">
          {CHANNELS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= currentChannel ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          {currentChannel + 1} / {CHANNELS.length} — {channel.label}
        </div>

        <h2 className="text-xl font-bold animate-fade-in">{channel.question}</h2>

        <div className="space-y-3 animate-slide-up">
          {channel.levels.map((level, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={saving}
              className="w-full text-left p-4 rounded-xl border-2 hover:border-primary transition"
            >
              <div className="font-medium">{level}</div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
