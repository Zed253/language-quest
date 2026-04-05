import { type Result, ok, err } from '@/modules/shared-types';
import { registry, type GradeResult, type GradingContext } from './registry';

// ============================================================
// Grader Factory -- delegates to the correct type's grader
// ============================================================

export async function gradeExercise(
  type: string,
  userAnswer: string,
  expectedAnswer: string,
  acceptableVariants: string[] = [],
  context?: GradingContext
): Promise<Result<GradeResult>> {
  const definition = registry.getType(type);

  if (!definition) {
    // Fallback: unknown type gets partial credit
    return ok({
      score: 0.5,
      fsrsGrade: 2 as const,
      feedback: 'Unknown exercise type -- partial credit given.',
    });
  }

  try {
    const result = await definition.grader(userAnswer, expectedAnswer, acceptableVariants, context);
    return ok(result);
  } catch (e) {
    return err({
      code: 'GRADING_FAILED',
      message: `Grading failed for type ${type}`,
      module: 'exercise-engine',
      cause: e,
    });
  }
}
