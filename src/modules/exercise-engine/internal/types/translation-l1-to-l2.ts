import { registry, type GradingContext, type GradeResult } from '../registry';
import { evaluateAnswer } from '@/modules/llm-pipeline';
import { toFsrsGrade } from '../grading-utils';

// Translation L1→L2 (productive): LLM-as-judge grading
// This is the hardest direction -- producing in the target language
registry.register({
  type: 'translation-l1-to-l2',
  channel: 'written-production',
  supportsTenses: true,
  supportsAudio: false,
  minPhase: 2,
  grader: async (
    userAnswer: string,
    expected: string,
    variants: string[],
    context?: GradingContext
  ): Promise<GradeResult> => {
    const result = await evaluateAnswer({
      exerciseType: 'translation-l1-to-l2',
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

    // LLM grading failed -- fallback to partial credit
    return {
      score: 0.5,
      fsrsGrade: 2,
      feedback: 'Could not evaluate fully. Partial credit given.',
    };
  },
});
