import { registry, type GradingContext, type GradeResult } from '../registry';
import { evaluateAnswer } from '@/modules/llm-pipeline';
import { toFsrsGrade } from '../grading-utils';

// Free Speaking: user speaks in response to a prompt
// Whisper transcribes, then LLM evaluates content + grammar
registry.register({
  type: 'free-speaking',
  channel: 'oral-production',
  supportsTenses: true,
  supportsAudio: true,
  minPhase: 2,
  grader: async (
    userAnswer: string, // Whisper transcription of user's speech
    expected: string,   // expected content/topic
    variants: string[],
    context?: GradingContext
  ): Promise<GradeResult> => {
    if (!userAnswer || userAnswer.trim().length < 2) {
      return {
        score: 0,
        fsrsGrade: 1,
        feedback: "I couldn't hear you. Try speaking more clearly.",
      };
    }

    // Use LLM to evaluate the spoken content
    const result = await evaluateAnswer({
      exerciseType: 'free-speaking',
      userAnswer,
      expectedAnswer: expected,
      acceptableVariants: variants,
      targetLanguage: context?.targetLanguage || 'es',
      context: context?.exerciseContext,
    });

    if (result.ok) {
      return {
        score: result.data.score,
        fsrsGrade: toFsrsGrade(result.data.score, context),
        feedback: result.data.feedback,
        correction: result.data.correction,
        grammarNote: result.data.grammarNote,
      };
    }

    // Fallback: partial credit for attempting to speak
    return {
      score: 0.5,
      fsrsGrade: 2,
      feedback: 'Good attempt! Keep practicing speaking.',
    };
  },
});
