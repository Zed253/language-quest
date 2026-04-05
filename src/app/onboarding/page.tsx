'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { createCharacter } from '@/modules/character-system';
import { updateUserProfile } from '@/modules/data-layer';
import type { CharacterTrait, Specialty } from '@/modules/character-system';

type Step = 'welcome' | 'universe' | 'language' | 'traits' | 'specialty' | 'name' | 'first-word' | 'done';

const TRAITS: { id: CharacterTrait; label: string; description: string; emoji: string }[] = [
  { id: 'brave', label: 'Brave', description: 'Tu aimes les defis. Moins d\'indices, plus de difficulte.', emoji: '🔥' },
  { id: 'analytical', label: 'Analytique', description: 'Tu veux comprendre les regles. Plus de grammaire, plus de patterns.', emoji: '🧠' },
  { id: 'creative', label: 'Creatif', description: 'Tu preferes t\'exprimer librement. Plus de production, plus de variete.', emoji: '🎨' },
  { id: 'patient', label: 'Patient', description: 'Tu prends ton temps. Revision plus profonde, intervalles plus longs.', emoji: '🧘' },
  { id: 'social', label: 'Social', description: 'Tu veux parler. Plus de conversations, plus de dialogues.', emoji: '💬' },
  { id: 'curious', label: 'Curieux', description: 'Tu veux decouvrir. Plus de lecture, plus de culture.', emoji: '🔍' },
];

const OP_SPECIALTIES: { id: Specialty; label: string; bonus: string }[] = [
  { id: 'navigator', label: 'Navigateur', bonus: 'Bonus XP: voyages, directions' },
  { id: 'cook', label: 'Cuisinier', bonus: 'Bonus XP: cuisine, alimentation' },
  { id: 'doctor', label: 'Medecin', bonus: 'Bonus XP: sante, corps' },
  { id: 'shipwright', label: 'Charpentier', bonus: 'Bonus XP: technique, outils' },
];

const HP_SPECIALTIES: { id: Specialty; label: string; bonus: string }[] = [
  { id: 'charms', label: 'Sortileges', bonus: 'Indices supplementaires en grammaire' },
  { id: 'potions', label: 'Potions', bonus: 'Bonus XP: science, nature' },
  { id: 'defense', label: 'Defense', bonus: 'Plus fort dans les boss battles' },
  { id: 'herbology', label: 'Herbologie', bonus: 'Bonus XP: nature, environnement' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>('welcome');
  const [universe, setUniverse] = useState<'one-piece' | 'harry-potter' | null>(null);
  const [language, setLanguage] = useState<'es' | 'fr' | null>(null);
  const [selectedTraits, setSelectedTraits] = useState<CharacterTrait[]>([]);
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [displayName, setDisplayName] = useState('');

  const toggleTrait = (trait: CharacterTrait) => {
    if (selectedTraits.includes(trait)) {
      setSelectedTraits(selectedTraits.filter(t => t !== trait));
    } else if (selectedTraits.length < 3) {
      setSelectedTraits([...selectedTraits, trait]);
    }
  };

  // ============ WELCOME ============
  if (step === 'welcome') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-8">
          <p className="text-lg text-muted-foreground italic animate-fade-in">
            Every great journey begins with a single word.
          </p>
          <Button size="lg" className="text-lg py-6 px-12" onClick={() => setStep('universe')}>
            Begin
          </Button>
        </div>
      </main>
    );
  }

  // ============ UNIVERSE ============
  if (step === 'universe') {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto space-y-8 pt-10">
          <h2 className="text-2xl font-bold text-center">Choose your universe</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setUniverse('one-piece'); setStep('language'); }}
              className={`rounded-xl border-2 p-8 text-center hover:border-primary transition ${
                universe === 'one-piece' ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="text-4xl mb-3">&#x1F3F4;&#x200D;&#x2620;&#xFE0F;</div>
              <div className="text-xl font-bold">One Piece</div>
              <div className="text-sm text-muted-foreground mt-2">Sail the Grand Line</div>
            </button>
            <button
              onClick={() => { setUniverse('harry-potter'); setStep('language'); }}
              className={`rounded-xl border-2 p-8 text-center hover:border-primary transition ${
                universe === 'harry-potter' ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="text-4xl mb-3">&#x1FA84;</div>
              <div className="text-xl font-bold">Harry Potter</div>
              <div className="text-sm text-muted-foreground mt-2">Master the magical arts</div>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ============ LANGUAGE ============
  if (step === 'language') {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto space-y-8 pt-10">
          <h2 className="text-2xl font-bold text-center">What tongue will you master?</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setLanguage('es'); setStep('traits'); }}
              className="rounded-xl border-2 p-8 text-center hover:border-primary transition"
            >
              <div className="text-4xl mb-3">&#127466;&#127480;</div>
              <div className="text-xl font-bold">Espanol</div>
              <div className="text-sm text-muted-foreground mt-2">Spanish</div>
            </button>
            <button
              onClick={() => { setLanguage('fr'); setStep('traits'); }}
              className="rounded-xl border-2 p-8 text-center hover:border-primary transition"
            >
              <div className="text-4xl mb-3">&#127467;&#127479;</div>
              <div className="text-xl font-bold">Francais</div>
              <div className="text-sm text-muted-foreground mt-2">French</div>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ============ TRAITS ============
  if (step === 'traits') {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto space-y-6 pt-10">
          <div>
            <h2 className="text-2xl font-bold">Who are you?</h2>
            <p className="text-muted-foreground">Pick 3 traits that define you.</p>
          </div>

          <div className="space-y-3">
            {TRAITS.map(trait => (
              <button
                key={trait.id}
                onClick={() => toggleTrait(trait.id)}
                className={`w-full text-left rounded-xl border-2 p-4 transition ${
                  selectedTraits.includes(trait.id)
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{trait.emoji}</span>
                  <div>
                    <div className="font-bold">{trait.label}</div>
                    <div className="text-sm text-muted-foreground">{trait.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            {selectedTraits.length}/3 selected
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={selectedTraits.length !== 3}
            onClick={() => setStep('specialty')}
          >
            Continue
          </Button>
        </div>
      </main>
    );
  }

  // ============ SPECIALTY ============
  if (step === 'specialty') {
    const specialties = universe === 'one-piece' ? OP_SPECIALTIES : HP_SPECIALTIES;

    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto space-y-6 pt-10">
          <div>
            <h2 className="text-2xl font-bold">Choose your specialty</h2>
            <p className="text-muted-foreground">This determines your vocabulary bonus.</p>
          </div>

          <div className="space-y-3">
            {specialties.map(spec => (
              <button
                key={spec.id}
                onClick={() => setSpecialty(spec.id)}
                className={`w-full text-left rounded-xl border-2 p-4 transition ${
                  specialty === spec.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                }`}
              >
                <div className="font-bold">{spec.label}</div>
                <div className="text-sm text-muted-foreground">{spec.bonus}</div>
              </button>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!specialty}
            onClick={() => setStep('name')}
          >
            Continue
          </Button>
        </div>
      </main>
    );
  }

  // ============ NAME ============
  if (step === 'name') {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto space-y-6 pt-10">
          <h2 className="text-2xl font-bold">What is your name, adventurer?</h2>

          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name..."
            className="w-full p-4 rounded-lg border text-lg focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />

          <Button
            size="lg"
            className="w-full"
            disabled={displayName.length < 2}
            onClick={() => setStep('first-word')}
          >
            Continue
          </Button>
        </div>
      </main>
    );
  }

  // ============ FIRST WORD ============
  if (step === 'first-word') {
    const word = language === 'es'
      ? { l2: 'hola', l1: 'bonjour', sentence: '¡Hola! ¿Cómo estás?' }
      : { l2: 'bonjour', l1: 'hola', sentence: 'Bonjour ! Comment ça va ?' };

    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-lg mx-auto text-center space-y-8 pt-10">
          <p className="text-muted-foreground">Your first word:</p>

          <div className="rounded-xl border-2 p-12">
            <div className="text-6xl font-bold mb-4">{word.l2}</div>
            <div className="text-2xl text-primary mb-2">{word.l1}</div>
            <div className="text-sm text-muted-foreground italic">{word.sentence}</div>
          </div>

          <div className="text-4xl">&#127881;&#127881;&#127881;</div>

          <p className="text-lg font-medium">
            {displayName}, your journey begins now.
          </p>

          <Button
            size="lg"
            className="w-full text-lg py-6"
            disabled={saving}
            onClick={async () => {
              if (!user) return;
              setSaving(true);

              // Persist character
              await createCharacter(user.id, selectedTraits, specialty);

              // Update user profile with language + theme
              await updateUserProfile(user.id, {
                display_name: displayName,
                target_language: language!,
                native_language: language === 'es' ? 'fr' : 'es',
                theme_id: universe!,
              });

              setSaving(false);
              router.push('/');
            }}
          >
            {saving ? 'Saving...' : 'Return tomorrow and your journey continues'}
          </Button>
        </div>
      </main>
    );
  }

  return null;
}
