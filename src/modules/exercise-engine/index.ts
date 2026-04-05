export { registry } from './internal/registry';
export { gradeExercise } from './internal/grader-factory';
export type { ExerciseTypeDefinition, ExerciseProps, GradeResult, GradingContext } from './internal/registry';

// Auto-register all built-in exercise types
import './internal/types/flashcard-rich';
import './internal/types/cloze';
import './internal/types/translation-l1-to-l2';
import './internal/types/translation-l2-to-l1';
import './internal/types/sentence-building';
import './internal/types/qcm';
import './internal/types/shadowing';
import './internal/types/listen-transcribe';
import './internal/types/free-speaking';
