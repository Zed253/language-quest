import type { GradeResult, GradingContext } from './registry';

/**
 * Normalize a string for comparison:
 * - lowercase
 * - trim whitespace
 * - normalize unicode accents for fuzzy matching
 * - remove trailing punctuation
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.!?¡¿,;:]+$/g, '')
    .trim();
}

/**
 * Strict normalize: keeps accents (for Spanish accent-sensitive matching)
 */
export function normalizeStrict(s: string): string {
  return normalize(s);
}

/**
 * Loose normalize: strips accents (for lenient matching)
 */
export function normalizeLoose(s: string): string {
  return normalize(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Check if user answer matches expected or any variant
 */
export function matchesAny(
  userAnswer: string,
  expected: string,
  variants: string[],
  strict: boolean = false
): boolean {
  const norm = strict ? normalizeStrict : normalizeLoose;
  const userNorm = norm(userAnswer);
  const candidates = [expected, ...variants];

  return candidates.some((c) => norm(c) === userNorm);
}

/**
 * Map score + response time to FSRS grade
 */
export function toFsrsGrade(
  score: number,
  context?: GradingContext
): 1 | 2 | 3 | 4 {
  if (score === 0) return 1; // Again
  if (score === 0.5) return 2; // Hard

  // Score is 1.0
  if (context && context.responseTimeMs < context.medianResponseTimeMs) {
    return 4; // Easy (fast + correct)
  }
  return 3; // Good (correct but not fast)
}

/**
 * Build a simple GradeResult for exact-match exercises
 */
export function buildExactMatchResult(
  userAnswer: string,
  expected: string,
  variants: string[],
  context?: GradingContext
): GradeResult {
  // Try strict match first (with accents)
  if (matchesAny(userAnswer, expected, variants, true)) {
    return {
      score: 1.0,
      fsrsGrade: toFsrsGrade(1.0, context),
      feedback: 'Correct!',
    };
  }

  // Try loose match (without accents) -- partial credit
  if (matchesAny(userAnswer, expected, variants, false)) {
    return {
      score: 0.5,
      fsrsGrade: 2,
      feedback: 'Almost! Check the accents.',
      correction: expected,
    };
  }

  // No match
  return {
    score: 0,
    fsrsGrade: 1,
    feedback: `The correct answer was: ${expected}`,
    correction: expected,
  };
}
