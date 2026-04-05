import { registry, type GradingContext, type GradeResult } from '../registry';

// Rich flashcard: user self-grades (same as FSRS native grading)
// The grader receives the rating as the "userAnswer" (1-4 as string)
registry.register({
  type: 'flashcard-rich',
  channel: 'vocabulary',
  supportsTenses: true,
  supportsAudio: true,
  minPhase: 1,
  grader: async (
    userAnswer: string,
    _expected: string,
    _variants: string[],
    _context?: GradingContext
  ): Promise<GradeResult> => {
    const rating = parseInt(userAnswer) as 1 | 2 | 3 | 4;
    const scoreMap: Record<number, number> = { 1: 0, 2: 0.5, 3: 1, 4: 1 };
    const feedbackMap: Record<number, string> = {
      1: "No worries -- you'll see this again soon.",
      2: 'Getting there!',
      3: 'Good recall!',
      4: 'Perfect!',
    };

    return {
      score: scoreMap[rating] ?? 0,
      fsrsGrade: rating,
      feedback: feedbackMap[rating] ?? '',
    };
  },
});
