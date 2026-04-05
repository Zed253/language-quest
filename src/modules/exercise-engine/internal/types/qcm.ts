import { registry, type GradingContext, type GradeResult } from '../registry';
import { normalizeLoose, toFsrsGrade } from '../grading-utils';

// QCM (multiple choice): Phase 1 scaffolding only, phased out after
// Per research: recognition tasks produce weaker learning than free recall
registry.register({
  type: 'qcm',
  channel: 'vocabulary',
  supportsTenses: false,
  supportsAudio: false,
  minPhase: 1,
  maxPhase: 1, // only in Phase 1 (scaffolding)
  grader: async (
    userAnswer: string,
    expected: string,
    _variants: string[],
    context?: GradingContext
  ): Promise<GradeResult> => {
    const correct = normalizeLoose(userAnswer) === normalizeLoose(expected);

    return {
      score: correct ? 1.0 : 0,
      fsrsGrade: correct ? toFsrsGrade(1.0, context) : 1,
      feedback: correct ? 'Correct!' : `The answer was: ${expected}`,
      correction: correct ? undefined : expected,
    };
  },
});
