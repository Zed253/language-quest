import { registry, type GradingContext, type GradeResult } from '../registry';
import { normalizeStrict, toFsrsGrade } from '../grading-utils';

// Sentence building: reorder words from a word bank
registry.register({
  type: 'sentence-building',
  channel: 'written-production',
  supportsTenses: true,
  supportsAudio: false,
  minPhase: 1,
  maxPhase: 3, // phased out at advanced levels
  grader: async (
    userAnswer: string,
    expected: string,
    variants: string[],
    context?: GradingContext
  ): Promise<GradeResult> => {
    const userNorm = normalizeStrict(userAnswer);
    const expectedNorm = normalizeStrict(expected);

    // Exact match
    if (userNorm === expectedNorm) {
      return {
        score: 1.0,
        fsrsGrade: toFsrsGrade(1.0, context),
        feedback: 'Perfect sentence!',
      };
    }

    // Check variants
    for (const variant of variants) {
      if (userNorm === normalizeStrict(variant)) {
        return {
          score: 1.0,
          fsrsGrade: toFsrsGrade(1.0, context),
          feedback: 'Correct! (alternative word order)',
        };
      }
    }

    // Check if same words, different order (partial credit)
    const userWords = userNorm.split(/\s+/).sort();
    const expectedWords = expectedNorm.split(/\s+/).sort();

    if (JSON.stringify(userWords) === JSON.stringify(expectedWords)) {
      return {
        score: 0.5,
        fsrsGrade: 2,
        feedback: 'Right words, wrong order.',
        correction: expected,
      };
    }

    return {
      score: 0,
      fsrsGrade: 1,
      feedback: `The correct sentence was: ${expected}`,
      correction: expected,
    };
  },
});
