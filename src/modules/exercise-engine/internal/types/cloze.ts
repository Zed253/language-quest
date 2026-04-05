import { registry, type GradingContext, type GradeResult } from '../registry';
import { buildExactMatchResult } from '../grading-utils';

// Cloze (fill-in-the-blank): exact match with accent normalization
registry.register({
  type: 'cloze',
  channel: 'written-comprehension',
  supportsTenses: true,
  supportsAudio: false,
  minPhase: 1,
  grader: async (
    userAnswer: string,
    expected: string,
    variants: string[],
    context?: GradingContext
  ): Promise<GradeResult> => {
    return buildExactMatchResult(userAnswer, expected, variants, context);
  },
});
