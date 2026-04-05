import { registry, type GradingContext, type GradeResult } from '../registry';
import { normalizeLoose, toFsrsGrade } from '../grading-utils';

// Listen + Transcribe: hear audio in target language, type what you heard
// Graded by Levenshtein-like word comparison (fuzzy match)
registry.register({
  type: 'listen-transcribe',
  channel: 'oral-comprehension',
  supportsTenses: true,
  supportsAudio: true,
  minPhase: 1,
  grader: async (
    userAnswer: string, // what user typed
    expected: string,
    _variants: string[],
    context?: GradingContext
  ): Promise<GradeResult> => {
    const userNorm = normalizeLoose(userAnswer);
    const expectedNorm = normalizeLoose(expected);

    // Exact match
    if (userNorm === expectedNorm) {
      return {
        score: 1.0,
        fsrsGrade: toFsrsGrade(1.0, context),
        feedback: 'Perfect transcription!',
      };
    }

    // Word-level comparison
    const userWords = userNorm.split(/\s+/).filter(Boolean);
    const expectedWords = expectedNorm.split(/\s+/).filter(Boolean);

    let matches = 0;
    for (let i = 0; i < expectedWords.length; i++) {
      if (userWords[i] === expectedWords[i]) {
        matches++;
      } else if (userWords[i] && levenshteinRatio(userWords[i], expectedWords[i]) > 0.7) {
        matches += 0.5; // close enough (typo)
      }
    }

    const accuracy = expectedWords.length > 0 ? matches / expectedWords.length : 0;

    if (accuracy >= 0.85) {
      return {
        score: 1.0,
        fsrsGrade: toFsrsGrade(1.0, context),
        feedback: 'Almost perfect! Minor differences.',
        correction: expected,
      };
    } else if (accuracy >= 0.5) {
      return {
        score: 0.5,
        fsrsGrade: 2,
        feedback: `Partial: ${Math.round(accuracy * 100)}% accurate.`,
        correction: expected,
      };
    } else {
      return {
        score: 0,
        fsrsGrade: 1,
        feedback: `The sentence was: "${expected}"`,
        correction: expected,
      };
    }
  },
});

// Simple Levenshtein ratio (0-1)
function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
