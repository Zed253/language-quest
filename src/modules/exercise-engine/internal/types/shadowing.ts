import { registry, type GradingContext, type GradeResult } from '../registry';
import { normalizeLoose, toFsrsGrade } from '../grading-utils';

// Shadowing: listen to audio, repeat simultaneously
// Graded by comparing Whisper transcription to target text
// Similarity threshold: 70% of words correct = pass
registry.register({
  type: 'shadowing',
  channel: 'oral-production',
  supportsTenses: true,
  supportsAudio: true,
  minPhase: 1,
  grader: async (
    userAnswer: string, // Whisper transcription of user's speech
    expected: string,
    _variants: string[],
    context?: GradingContext
  ): Promise<GradeResult> => {
    const userWords = normalizeLoose(userAnswer).split(/\s+/).filter(Boolean);
    const expectedWords = normalizeLoose(expected).split(/\s+/).filter(Boolean);

    if (expectedWords.length === 0) {
      return { score: 0, fsrsGrade: 1, feedback: 'No expected text to compare.' };
    }

    // Count matching words (order-independent for leniency)
    let matches = 0;
    const remainingExpected = [...expectedWords];
    for (const word of userWords) {
      const idx = remainingExpected.indexOf(word);
      if (idx !== -1) {
        matches++;
        remainingExpected.splice(idx, 1);
      }
    }

    const similarity = matches / expectedWords.length;

    if (similarity >= 0.9) {
      return {
        score: 1.0,
        fsrsGrade: toFsrsGrade(1.0, context),
        feedback: 'Excellent shadowing! Nearly perfect.',
      };
    } else if (similarity >= 0.7) {
      return {
        score: 0.5,
        fsrsGrade: 2,
        feedback: `Good effort! ${matches}/${expectedWords.length} words caught.`,
        correction: expected,
      };
    } else {
      return {
        score: 0,
        fsrsGrade: 1,
        feedback: `Keep practicing. ${matches}/${expectedWords.length} words caught.`,
        correction: expected,
      };
    }
  },
});
