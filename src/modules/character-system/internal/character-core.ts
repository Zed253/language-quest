import { type Result, ok, err } from '@/modules/shared-types';
import { supabase } from '@/modules/data-layer';

// ============================================================
// Character System -- traits, specialty, evolution
// ============================================================

export type CharacterTrait = 'brave' | 'analytical' | 'creative' | 'patient' | 'social' | 'curious';

export type Specialty =
  | 'navigator' | 'cook' | 'doctor' | 'shipwright'       // One Piece
  | 'charms' | 'potions' | 'defense' | 'herbology';       // Harry Potter

export interface Character {
  user_id: string;
  traits: CharacterTrait[];
  specialty: Specialty | null;
  origin_story: string;
  current_costume: string; // changes per arc
  accessories: string[];
  created_at: string;
}

export interface LearningModifiers {
  difficultyAdjust: number;      // added to difficulty target
  grammarWeight: number;         // multiplier (1.0 = normal)
  productionWeight: number;      // multiplier for free production exercises
  conversationWeight: number;    // multiplier for conversation exercises
  readingWeight: number;         // multiplier for reading exercises
  srsIntervalMultiplier: number; // multiplier on FSRS intervals
  hintAvailability: number;      // 0-1 (0 = no hints, 1 = all hints)
}

const TRAIT_MODIFIERS: Record<CharacterTrait, Partial<LearningModifiers>> = {
  brave:      { difficultyAdjust: 1, hintAvailability: 0.5 },
  analytical: { grammarWeight: 1.2 },
  creative:   { productionWeight: 1.3 },
  patient:    { srsIntervalMultiplier: 1.2 },
  social:     { conversationWeight: 1.3 },
  curious:    { readingWeight: 1.3 },
};

const DEFAULT_MODIFIERS: LearningModifiers = {
  difficultyAdjust: 0,
  grammarWeight: 1.0,
  productionWeight: 1.0,
  conversationWeight: 1.0,
  readingWeight: 1.0,
  srsIntervalMultiplier: 1.0,
  hintAvailability: 1.0,
};

export function getTraitModifiers(traits: CharacterTrait[]): LearningModifiers {
  const modifiers = { ...DEFAULT_MODIFIERS };

  for (const trait of traits) {
    const traitMod = TRAIT_MODIFIERS[trait];
    if (traitMod) {
      for (const [key, value] of Object.entries(traitMod)) {
        const k = key as keyof LearningModifiers;
        if (k === 'difficultyAdjust') {
          modifiers[k] += value as number;
        } else {
          modifiers[k] *= value as number;
        }
      }
    }
  }

  return modifiers;
}

export async function createCharacter(
  userId: string,
  traits: CharacterTrait[],
  specialty: Specialty | null
): Promise<Result<Character>> {
  try {
    const character: Omit<Character, 'created_at'> = {
      user_id: userId,
      traits,
      specialty,
      origin_story: '',
      current_costume: 'default',
      accessories: [],
    };

    const { data, error } = await supabase
      .from('characters')
      .upsert({ ...character, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return ok(data as Character);
  } catch (e) {
    return err({ code: 'CHARACTER_CREATE_FAILED', message: 'Failed to create character', module: 'character-system', cause: e });
  }
}

export async function getCharacter(userId: string): Promise<Result<Character | null>> {
  try {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return ok(null);
      throw error;
    }
    return ok(data as Character);
  } catch (e) {
    return err({ code: 'CHARACTER_GET_FAILED', message: 'Failed to get character', module: 'character-system', cause: e });
  }
}
