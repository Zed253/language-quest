import { type Result, ok, err } from '@/modules/shared-types';

// ============================================================
// OpenAI Adapter -- the ONLY file that touches the OpenAI API
// To swap providers: write a new adapter, change the import in generator.ts
// ============================================================

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CallOptions {
  json?: boolean;
  maxRetries?: number;
  model?: string;
  temperature?: number;
}

// Simple circuit breaker
let failureCount = 0;
let circuitOpenUntil = 0;
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30_000;

export async function callLLM(
  messages: LLMMessage[],
  options: CallOptions = {}
): Promise<Result<string>> {
  const {
    json = false,
    maxRetries = 1,
    model = 'gpt-4o-mini',
    temperature = 0.7,
  } = options;

  // Circuit breaker check
  if (Date.now() < circuitOpenUntil) {
    return err({
      code: 'LLM_CIRCUIT_OPEN',
      message: `Circuit breaker open until ${new Date(circuitOpenUntil).toISOString()}`,
      module: 'llm-pipeline',
    });
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          response_format: json ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited -- wait and retry
          await sleep(2000 * (attempt + 1));
          continue;
        }
        throw new Error(`LLM API returned ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('LLM returned empty content');
      }

      // Success -- reset circuit breaker
      failureCount = 0;
      return ok(content);
    } catch (e) {
      if (attempt === maxRetries) {
        // Final failure -- update circuit breaker
        failureCount++;
        if (failureCount >= CIRCUIT_THRESHOLD) {
          circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
          failureCount = 0;
        }

        return err({
          code: 'LLM_CALL_FAILED',
          message: e instanceof Error ? e.message : 'Unknown LLM error',
          module: 'llm-pipeline',
          cause: e,
        });
      }
      // Retry
      await sleep(1000 * (attempt + 1));
    }
  }

  // Should never reach here
  return err({
    code: 'LLM_CALL_FAILED',
    message: 'Exhausted all retries',
    module: 'llm-pipeline',
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
