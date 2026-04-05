import { registry, type GradingContext, type GradeResult } from '../registry';
import { buildExactMatchResult } from '../grading-utils';

// Translation L2→L1 (receptive): exact match + variants
// Easier direction -- understanding the target language
registry.register({
  type: 'translation-l2-to-l1',
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
