'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

// ============================================================
// TappableText -- tap any word to see translation + add to deck
// Used across the entire app (narratives, exercises, feedback)
// ============================================================

interface TappableTextProps {
  text: string;
  language: 'es' | 'fr';
  onAddToDeck?: (word: string, translation: string) => void;
  className?: string;
}

interface WordPopup {
  word: string;
  translation: string;
  x: number;
  y: number;
}

// Simple dictionary for common words (expanded by LLM lookup for unknowns)
const QUICK_DICT: Record<string, string> = {
  // Spanish → French basics
  'hola': 'bonjour', 'gracias': 'merci', 'por': 'par/pour', 'favor': 'faveur',
  'bien': 'bien', 'mal': 'mal', 'casa': 'maison', 'agua': 'eau',
  'comer': 'manger', 'beber': 'boire', 'hablar': 'parler', 'ir': 'aller',
  'ser': 'etre', 'estar': 'etre (etat)', 'tener': 'avoir', 'hacer': 'faire',
  'querer': 'vouloir', 'poder': 'pouvoir', 'saber': 'savoir', 'decir': 'dire',
  'ver': 'voir', 'dar': 'donner', 'tiempo': 'temps', 'dia': 'jour',
  'hoy': "aujourd'hui", 'manana': 'demain', 'ayer': 'hier',
  'bueno': 'bon', 'grande': 'grand', 'nuevo': 'nouveau', 'mucho': 'beaucoup',
  // French → Spanish basics
  'bonjour': 'hola', 'merci': 'gracias', 'maison': 'casa', 'eau': 'agua',
  'manger': 'comer', 'boire': 'beber', 'parler': 'hablar', 'aller': 'ir',
};

export function TappableText({ text, language, onAddToDeck, className }: TappableTextProps) {
  const [popup, setPopup] = useState<WordPopup | null>(null);
  const [loading, setLoading] = useState(false);

  const words = text.split(/(\s+|[.,!?;:¡¿"'()—])/);

  const handleWordClick = async (word: string, event: React.MouseEvent) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:¡¿"'()—]/g, '').trim();
    if (!cleanWord || cleanWord.length < 2) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();

    // Check quick dictionary first
    const quickTranslation = QUICK_DICT[cleanWord];
    if (quickTranslation) {
      setPopup({
        word: cleanWord,
        translation: quickTranslation,
        x: rect.left,
        y: rect.bottom + 8,
      });
      return;
    }

    // LLM lookup for unknown words
    setLoading(true);
    try {
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `Translate this single word from ${language === 'es' ? 'Spanish' : 'French'} to ${language === 'es' ? 'French' : 'Spanish'}. Return JSON: {"translation": "word"}` },
            { role: 'user', content: cleanWord },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);
        setPopup({
          word: cleanWord,
          translation: content.translation || '?',
          x: rect.left,
          y: rect.bottom + 8,
        });
      }
    } catch {
      setPopup({
        word: cleanWord,
        translation: '(lookup failed)',
        x: rect.left,
        y: rect.bottom + 8,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToDeck = () => {
    if (popup && onAddToDeck) {
      onAddToDeck(popup.word, popup.translation);
      setPopup(null);
    }
  };

  return (
    <span className={`relative ${className || ''}`}>
      {words.map((segment, i) => {
        const isWord = /^[a-zA-ZáéíóúüñàâçèêëïôùûÀÂÇÈÊËÏÔÙÛ]+$/.test(segment);
        if (!isWord) return <span key={i}>{segment}</span>;

        return (
          <span
            key={i}
            onClick={(e) => handleWordClick(segment, e)}
            className="cursor-pointer hover:bg-primary/10 hover:text-primary rounded px-0.5 transition-colors"
          >
            {segment}
            {loading && popup === null && segment.toLowerCase().replace(/[.,!?]/g, '') === segment.toLowerCase() && (
              <span className="text-xs text-muted-foreground">...</span>
            )}
          </span>
        );
      })}

      {/* Popup */}
      {popup && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setPopup(null)} />

          {/* Popup card */}
          <div
            className="fixed z-50 bg-card border-2 border-primary rounded-xl shadow-lg p-4 min-w-[200px] animate-fade-in"
            style={{ left: Math.min(popup.x, window.innerWidth - 220), top: popup.y }}
          >
            <div className="text-lg font-bold text-primary">{popup.word}</div>
            <div className="text-base mt-1">{popup.translation}</div>

            <div className="flex gap-2 mt-3">
              {onAddToDeck && (
                <Button size="sm" onClick={handleAddToDeck} className="flex-1">
                  + Add to deck
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setPopup(null)}>
                Close
              </Button>
            </div>
          </div>
        </>
      )}
    </span>
  );
}
