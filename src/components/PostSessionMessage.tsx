'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { sendPostcard } from '@/modules/couple-collab';

interface PostSessionMessageProps {
  userId: string;
  targetLanguage: 'es' | 'fr';
  phase: number;
  onDone: () => void;
}

// Templates for beginners (Phase 1)
const TEMPLATES_ES = [
  'Hoy he aprendido ___. Espero que ___ bien.',
  'Me gusta aprender ___. Y tu, ¿como estas?',
  'Hola! Hoy fue un buen dia para ___.',
];

const TEMPLATES_FR = [
  "Aujourd'hui j'ai appris ___. J'espere que tu vas ___.",
  "J'aime apprendre ___. Et toi, comment vas-tu ?",
  "Salut ! Aujourd'hui c'etait bien pour ___.",
];

export function PostSessionMessage({ userId, targetLanguage, phase, onDone }: PostSessionMessageProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [correction, setCorrection] = useState<string | null>(null);

  const templates = targetLanguage === 'es' ? TEMPLATES_ES : TEMPLATES_FR;
  const showTemplates = phase <= 2;

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    // Get LLM correction (gentle, only shown to writer)
    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You correct ${targetLanguage === 'es' ? 'Spanish' : 'French'} messages from a learner. Be encouraging. Return JSON: {"correction": "corrected text or null if perfect", "note": "brief encouraging tip or praise"}`,
            },
            { role: 'user', content: message },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        if (parsed.correction && parsed.correction !== message) {
          setCorrection(parsed.note || 'Almost perfect!');
        }
      }
    } catch { /* silent */ }

    // Send postcard
    await sendPostcard(userId, message);

    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="text-center">
          <div className="text-3xl mb-2">&#9993;&#65039;</div>
          <p className="font-bold">Message sent!</p>
          {correction && (
            <p className="text-sm text-amber-600 mt-2 italic">&#128161; {correction}</p>
          )}
        </div>
        <Button className="w-full" onClick={onDone}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <p className="font-bold">A word for your partner?</p>
        <p className="text-sm text-muted-foreground">
          Write in {targetLanguage === 'es' ? 'Spanish' : 'French'} (+10 Berrys)
        </p>
      </div>

      {/* Templates for beginners */}
      {showTemplates && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Templates:</p>
          {templates.map((t, i) => (
            <button
              key={i}
              onClick={() => setMessage(t)}
              className="w-full text-left text-sm p-2 rounded border hover:bg-muted/50 transition"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={targetLanguage === 'es' ? 'Escribe algo...' : 'Ecris quelque chose...'}
        className="w-full p-3 rounded-lg border min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
        autoFocus
      />

      <div className="flex gap-2">
        <Button variant="outline" onClick={onDone} className="flex-1">
          Skip
        </Button>
        <Button onClick={handleSend} disabled={sending || !message.trim()} className="flex-1">
          {sending ? 'Sending...' : 'Send &#9993;&#65039;'}
        </Button>
      </div>
    </div>
  );
}
