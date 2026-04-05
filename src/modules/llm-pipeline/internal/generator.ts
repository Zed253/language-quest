import { type Result, ok, err } from '@/modules/shared-types';
import type {
  ExerciseGenerationContext,
  LLMExerciseResponse,
  EvaluationParams,
  GradingHint,
  NarrativeContext,
  NarrativeResponse,
} from '../types';
import { callLLM } from './openai-adapter';
import { buildExercisePrompt, buildEvaluationPrompt, buildNarrativePrompt } from './prompt-templates';

// ============================================================
// LLM Pipeline -- all AI interactions go through here
// ============================================================

export async function generateExercises(
  context: ExerciseGenerationContext
): Promise<Result<LLMExerciseResponse>> {
  try {
    const messages = buildExercisePrompt(context);
    const raw = await callLLM(messages, { json: true, maxRetries: 2 });

    if (!raw.ok) return raw;

    const parsed = JSON.parse(raw.data) as LLMExerciseResponse;

    // Validate minimum structure
    if (!parsed.exercises || !Array.isArray(parsed.exercises) || parsed.exercises.length === 0) {
      return err({
        code: 'LLM_MALFORMED_RESPONSE',
        message: 'LLM response missing exercises array',
        module: 'llm-pipeline',
      });
    }

    return ok(parsed);
  } catch (e) {
    return err({
      code: 'LLM_GENERATION_FAILED',
      message: 'Failed to generate exercises',
      module: 'llm-pipeline',
      cause: e,
    });
  }
}

export async function evaluateAnswer(
  params: EvaluationParams
): Promise<Result<GradingHint>> {
  try {
    const messages = buildEvaluationPrompt(params);
    const raw = await callLLM(messages, { json: true, maxRetries: 1 });

    if (!raw.ok) {
      // Fallback: if LLM eval fails, give partial credit
      return ok({
        score: 0.5,
        feedback: 'Could not evaluate -- partial credit given.',
      });
    }

    const parsed = JSON.parse(raw.data) as GradingHint;
    return ok(parsed);
  } catch (e) {
    // Graceful fallback on any error
    return ok({
      score: 0.5,
      feedback: 'Evaluation error -- partial credit given.',
    });
  }
}

export async function generateNarrative(
  context: NarrativeContext
): Promise<Result<NarrativeResponse>> {
  try {
    const messages = buildNarrativePrompt(context);
    const raw = await callLLM(messages, { json: true, maxRetries: 1 });

    if (!raw.ok) {
      // Fallback narrative
      return ok({
        text: context.type === 'session-intro'
          ? '¡Vamos a aprender!'
          : '¡Buen trabajo hoy!',
        translation: context.type === 'session-intro'
          ? "C'est parti !"
          : 'Bon travail aujourd\'hui !',
      });
    }

    const parsed = JSON.parse(raw.data) as NarrativeResponse;
    return ok(parsed);
  } catch (e) {
    return ok({
      text: '¡Vamos!',
      translation: "C'est parti !",
    });
  }
}
