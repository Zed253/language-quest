'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// ============================================================
// ChatStream -- streaming chat component
// Used for: Mentor, Traducteur, Apprentissage
// Reusable across the entire app
// ============================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatStreamProps {
  systemPrompt: string;
  placeholder?: string;
  onFlashcardCreate?: (word: string, translation: string, context: string) => void;
  className?: string;
  initialMessages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
  autoSendMessage?: string;
  onAutoSendComplete?: () => void;
}

export function ChatStream({
  systemPrompt,
  placeholder = 'Escribe algo...',
  onFlashcardCreate,
  className,
  initialMessages,
  onMessagesChange,
  autoSendMessage,
  onAutoSendComplete,
}: ChatStreamProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-send message from URL parameter (Traduire → Zeff bridge)
  useEffect(() => {
    if (autoSendMessage && !autoSent && !streaming) {
      setAutoSent(true);
      setInput(autoSendMessage);
      // Small delay to let the component mount
      setTimeout(() => {
        sendMessageDirect(`Enseigne-moi cette expression en detail: "${autoSendMessage}"`);
        onAutoSendComplete?.();
      }, 500);
    }
  }, [autoSendMessage, autoSent, streaming]);

  const sendMessageDirect = async (directMessage: string) => {
    if (!directMessage.trim() || streaming) return;
    const userMessage: ChatMessage = { role: 'user', content: directMessage.trim() };
    await processMessage(userMessage);
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    setInput('');
    await processMessage(userMessage);
  };

  const processMessage = async (userMessage: ChatMessage) => {
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setStreaming(true);

    // Add empty assistant message that we'll stream into
    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          stream: true,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API error ${response.status}: ${errorData}`);
      }
      if (!response.body) {
        throw new Error('No response body (streaming not supported)');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = ''; // Buffer for incomplete SSE lines

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append decoded chunk to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split buffer by double newline (SSE event separator) or single newline
        const lines = buffer.split('\n');
        // Keep the last line in buffer (might be incomplete)
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim(); // Remove "data:" prefix
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullContent += delta;

              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullContent };
                return updated;
              });
            }
          } catch {
            // Incomplete JSON chunk -- will be completed in next read
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim().startsWith('data:')) {
        const data = buffer.trim().slice(5).trim();
        if (data && data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullContent += delta;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullContent };
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[Chat] Error:', errorMsg);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Error: ${errorMsg}\n\nIntenta de nuevo o verifica la clave API.`,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
      // Notify parent that messages changed (for auto-save)
      if (onMessagesChange) {
        setMessages(prev => {
          onMessagesChange(prev);
          return prev;
        });
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg">Tu mentor esta listo.</p>
            <p className="text-sm mt-2">Pregunta lo que quieras, en cualquier idioma.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
                {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                  <span className="animate-pulse ml-1">|</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={placeholder}
            disabled={streaming}
            className="flex-1 p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            autoFocus
          />
          <Button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="px-6 rounded-xl"
          >
            {streaming ? '...' : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
