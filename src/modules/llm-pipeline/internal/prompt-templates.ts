import type {
  ExerciseGenerationContext,
  EvaluationParams,
  NarrativeContext,
} from '../types';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================================
// Exercise Generation Prompt
// ============================================================

export function buildExercisePrompt(ctx: ExerciseGenerationContext): LLMMessage[] {
  const langNames = { es: 'Spanish', fr: 'French' };
  const targetLang = langNames[ctx.targetLanguage];
  const nativeLang = langNames[ctx.nativeLanguage];

  return [
    {
      role: 'system',
      content: `You are a ${targetLang} language tutor for a ${nativeLang} speaker. You generate exercises as JSON.

RULES:
- Target difficulty: ${ctx.difficultyTarget}/10
- Current phase: ${ctx.currentPhase}/5
- Session dominance: ${ctx.dominance}
- Theme: ${ctx.mesoTheme}
- Target tenses: ${ctx.targetTenses.join(', ') || 'presente only'}
- Universe: ${ctx.themeId} (use themed context in prompts)
- Generate ${ctx.exerciseCount} exercises
- EVERY exercise must practice at least one word from target_vocabulary
- For verb exercises, conjugate in the target tenses
- Include hints (progressive: first hint = category/context, second = first letter, third = sentence with blank)
- Generate fun/memorable sentences when possible (Von Restorff effect)
- Vary exercise types based on dominance:
  - accumulation: more listening, reading, recognition exercises
  - intensification: more production, translation, free-form exercises

VOCABULARY TO PRACTICE: ${ctx.targetVocabulary.join(', ')}
RECENTLY LEARNED (reinforce): ${ctx.recentlyLearnedWords.join(', ')}
WEAK AREAS (focus): ${ctx.weakAreas.join(', ')}

Respond with a JSON object matching this schema:
{
  "exercises": [
    {
      "type": "cloze" | "translation-l1-to-l2" | "translation-l2-to-l1" | "sentence-building" | "qcm" | "flashcard-rich",
      "channel": "oral-comprehension" | "oral-production" | "written-comprehension" | "written-production" | "vocabulary" | "grammar",
      "prompt": "what the user sees",
      "expected_answer": "the correct answer",
      "acceptable_variants": ["synonym1", "alt word order"],
      "difficulty_level": 1-10,
      "hints": ["hint1", "hint2", "hint3"],
      "word_bank": ["for", "sentence", "building"] | null,
      "distractors": ["wrong1", "wrong2", "wrong3"] | null,
      "target_vocabulary": ["word1"],
      "target_grammar": "grammar point or null",
      "target_tense": "tense name or null"
    }
  ],
  "narrative_intro": "Session intro in ${targetLang} (adapted to phase ${ctx.currentPhase} level, themed as ${ctx.themeId})",
  "narrative_outro": "Session outro preview in ${targetLang}"
}`,
    },
    {
      role: 'user',
      content: `Generate ${ctx.exerciseCount} ${targetLang} exercises for the theme "${ctx.mesoTheme}". Dominance: ${ctx.dominance}. ${ctx.narrativeContext ? `Narrative context: ${ctx.narrativeContext}` : ''}`,
    },
  ];
}

// ============================================================
// Answer Evaluation Prompt
// ============================================================

export function buildEvaluationPrompt(params: EvaluationParams): LLMMessage[] {
  const langNames = { es: 'Spanish', fr: 'French' };

  return [
    {
      role: 'system',
      content: `You are a ${langNames[params.targetLanguage]} language evaluator. Grade the student's answer.

RULES:
- Score 1.0: meaning preserved, grammar correct, natural phrasing
- Score 0.5: meaning preserved but grammar errors or unnatural phrasing
- Score 0.0: meaning lost or unintelligible
- Be encouraging but honest
- If score < 1.0, provide the corrected version
- If there's a grammar pattern worth noting, include a brief grammarNote

Respond with JSON:
{
  "score": 0.0 | 0.5 | 1.0,
  "feedback": "encouragement + explanation in student's native language",
  "correction": "corrected answer if score < 1.0",
  "grammarNote": "brief grammar tip if relevant"
}`,
    },
    {
      role: 'user',
      content: `Exercise type: ${params.exerciseType}
Context: ${params.context || 'none'}
Expected answer: ${params.expectedAnswer}
Acceptable variants: ${params.acceptableVariants.join(', ')}
Student's answer: ${params.userAnswer}

Grade this answer.`,
    },
  ];
}

// ============================================================
// Narrative Generation Prompt
// ============================================================

export function buildNarrativePrompt(ctx: NarrativeContext): LLMMessage[] {
  const langNames = { es: 'Spanish', fr: 'French' };
  const targetLang = langNames[ctx.targetLanguage];
  const nativeLang = ctx.targetLanguage === 'es' ? 'French' : 'Spanish';

  const levelGuide: Record<number, string> = {
    1: 'Use only present tense, very simple vocabulary (A1). Short sentences (5-8 words max).',
    2: 'Use present + past tenses, common vocabulary (A2). Sentences up to 10 words.',
    3: 'Use varied tenses, richer vocabulary (B1). Natural sentence length.',
    4: 'Use complex structures, idiomatic expressions (B2). Near-native.',
    5: 'Write naturally as a native speaker would (C1). Full expression.',
  };

  let contextDetails = '';

  if (ctx.type === 'session-intro') {
    contextDetails = `Generate a session INTRO message.
Weave together:
1. Quest context: where the user is in the ${ctx.themeId} narrative (arc: "${ctx.narrativeArc}", theme: "${ctx.mesoTheme}")
2. Today's learning focus (the theme)
3. User state: streak ${ctx.streakDays || 0} days
4. An engagement hook (question, mystery, or challenge)`;
  } else if (ctx.type === 'session-outro') {
    contextDetails = `Generate a session OUTRO message.
Weave together:
1. Session results framed narratively: ${ctx.sessionStats?.correct || 0}/${ctx.sessionStats?.total || 0} correct
2. Story progression beat (the narrative advances)
3. Emotional payoff (celebration or encouragement)
4. Tomorrow's teaser (cliffhanger)
5. If evening: subtle sleep nudge`;
  } else if (ctx.type === 'couple-message') {
    contextDetails = `Generate a COUPLE CONNECTION message.
Partner: ${ctx.partnerName || 'your ally'}
Partner streak: ${ctx.partnerStats?.streakDays || 0} days
Partner last score: ${ctx.partnerStats?.lastScore || 0}%
Partner active today: ${ctx.partnerStats?.isActive ? 'yes' : 'no'}
${ctx.countdownDays ? `Countdown: ${ctx.countdownDays} days until ${ctx.countdownDestination}` : ''}
Tone: collaborative, encouraging, never shaming`;
  }

  return [
    {
      role: 'system',
      content: `You generate narrative messages for a ${targetLang} learning app themed around ${ctx.themeId}.

The message must be written IN ${targetLang}, adapted to the user's level.
Level guide: ${levelGuide[ctx.userLevel] || levelGuide[1]}

Also provide a ${nativeLang} translation for the "translate" button.

${contextDetails}

Respond with JSON:
{
  "text": "the message in ${targetLang}",
  "translation": "the same message in ${nativeLang}"
}`,
    },
    {
      role: 'user',
      content: `Generate the ${ctx.type} message now.`,
    },
  ];
}
