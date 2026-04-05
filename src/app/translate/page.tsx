'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ============================================================
// Traducteur rapide -- pour communiquer MAINTENANT
// Minimaliste, rapide, copier-coller, vocal
// Pas de cours, pas de Zeff. Juste la traduction.
// ============================================================

interface TranslationEntry {
  input: string;
  output: string;
  timestamp: number;
}

export default function TranslatePage() {
  return (
    <ErrorBoundary module="translate">
      <TranslateInner />
    </ErrorBoundary>
  );
}

function TranslateInner() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<TranslationEntry[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load recent translations from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('lq_recent_translations');
      if (stored) setRecentTranslations(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveRecent = (entry: TranslationEntry) => {
    const updated = [entry, ...recentTranslations.filter(t => t.input !== entry.input)].slice(0, 20);
    setRecentTranslations(updated);
    localStorage.setItem('lq_recent_translations', JSON.stringify(updated));
  };

  const translate = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setOutput('');
    setCopied(false);

    try {
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Translate between French and Spanish. Auto-detect the input language. If French → translate to Colombian Spanish. If Spanish → translate to French.

RULES:
- If the input has typos, fix them silently and translate the corrected version
- Give 1 main translation (informal, natural, how you'd say it to your partner)
- If there's a notably different formal version, add it on a second line with (formal)
- Be CONCISE. No explanations, no greetings, no filler. Just the translation.
- For Spanish, prefer Colombian/Latin American expressions`,
            },
            { role: 'user', content: input },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || 'Error';
      setOutput(result);
      saveRecent({ input: input.trim(), output: result, timestamp: Date.now() });
    } catch {
      setOutput('Error de traduccion. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearInput = () => {
    setInput('');
    setOutput('');
    setCopied(false);
    inputRef.current?.focus();
  };

  if (authLoading) return null;
  if (!user) { router.push('/login'); return null; }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header minimal */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" size="sm">Volver</Button>
          </Link>
          <h1 className="text-lg font-bold text-primary">🔄 Traduccion</h1>
          <div className="w-16" /> {/* spacer */}
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                translate();
              }
            }}
            placeholder="Ecris en francais ou en espagnol..."
            className="w-full p-4 rounded-xl border-2 min-h-[100px] text-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            autoFocus
          />
          {input && (
            <button
              onClick={clearInput}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xl"
            >
              ✕
            </button>
          )}
        </div>

        {/* Translate + Mic buttons */}
        <div className="flex gap-2">
          <Button
            onClick={translate}
            disabled={loading || !input.trim()}
            className="flex-1 py-6 text-lg font-bold"
            size="lg"
          >
            {loading ? 'Traduciendo...' : '🔄 Traducir'}
          </Button>
          <MicButton onTranscript={(text) => setInput(prev => prev ? prev + ' ' + text : text)} />
        </div>

        {/* Output */}
        {output && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-3 animate-fade-in">
            <p className="text-xl leading-relaxed whitespace-pre-wrap">{output}</p>

            <div className="flex gap-2">
              <Button onClick={copyToClipboard} className="flex-1" variant={copied ? 'default' : 'outline'}>
                {copied ? '✅ Copiado!' : '📋 Copiar'}
              </Button>
              <Link href={`/chat?learn=${encodeURIComponent(input)}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  👨‍🍳 Aprender con Zeff
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Recent translations */}
        {recentTranslations.length > 0 && !output && (
          <div className="space-y-2 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-muted-foreground">Recientes</h3>
              <button
                onClick={() => {
                  setRecentTranslations([]);
                  localStorage.removeItem('lq_recent_translations');
                }}
                className="text-xs text-muted-foreground hover:text-red-500"
              >
                Tout effacer
              </button>
            </div>
            {recentTranslations.slice(0, 8).map((t, i) => (
              <div key={i} className="flex gap-2 items-stretch">
                <button
                  onClick={() => {
                    setInput(t.input);
                    setOutput(t.output);
                  }}
                  className="flex-1 text-left p-3 rounded-lg border hover:bg-muted/50 transition"
                >
                  <div className="text-sm truncate">{t.input}</div>
                  <div className="text-sm text-primary truncate">{t.output}</div>
                </button>
                <button
                  onClick={() => {
                    const updated = recentTranslations.filter((_, idx) => idx !== i);
                    setRecentTranslations(updated);
                    localStorage.setItem('lq_recent_translations', JSON.stringify(updated));
                  }}
                  className="px-2 rounded-lg border text-muted-foreground hover:text-red-500 hover:border-red-300 transition text-sm"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function MicButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false);

  const toggle = () => {
    if (recording) {
      setRecording(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w._translateSpeechRec?.stop();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      const SpeechRecAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SpeechRecAPI) { alert('Reconnaissance vocale non supportee'); return; }
      const recognition = new SpeechRecAPI();
      recognition.lang = ''; // Auto-detect
      recognition.continuous = false;
      recognition.interimResults = false;
      w._translateSpeechRec = recognition;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        onTranscript(transcript);
      };
      recognition.onend = () => setRecording(false);
      recognition.onerror = () => setRecording(false);
      recognition.start();
      setRecording(true);
    }
  };

  return (
    <Button
      variant={recording ? 'default' : 'outline'}
      onClick={toggle}
      className={`py-6 px-6 text-xl ${recording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}`}
      size="lg"
    >
      {recording ? '⏹️' : '🎤'}
    </Button>
  );
}
