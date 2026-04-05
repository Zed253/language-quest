/**
 * Full seed: 500 words (50 + 450) for any user
 * Usage: npx tsx scripts/seed-full.ts <user_id>
 */
import { createClient } from '@supabase/supabase-js';
import words50 from '../data/seed/top-100-spanish.json';
import words450 from '../data/seed/top-51-500-spanish.json';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = process.argv[2];
if (!userId) { console.error('Usage: npx tsx scripts/seed-full.ts <user_id>'); process.exit(1); }

async function seed() {
  const allWords = [...words50, ...words450];
  console.log(`Seeding ${allWords.length} words for user ${userId}...`);

  const now = new Date().toISOString();
  const defaultFsrs = { due: now, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: 0 };

  const cards = allWords.flatMap(w => [
    { user_id: userId, word_l2: w.word_l2, word_l1: w.word_l1, example_sentence: w.example_sentence, image_url: null, frequency_rank: w.frequency_rank, direction: 'l2-to-l1', mastery_level: 0, fsrs_state: defaultFsrs, next_review: now, first_seen: now, last_reviewed: null, created_at: now },
    { user_id: userId, word_l2: w.word_l2, word_l1: w.word_l1, example_sentence: w.example_sentence, image_url: null, frequency_rank: w.frequency_rank, direction: 'l1-to-l2', mastery_level: 0, fsrs_state: defaultFsrs, next_review: now, first_seen: now, last_reviewed: null, created_at: now },
  ]);

  let inserted = 0;
  for (let i = 0; i < cards.length; i += 50) {
    const batch = cards.slice(i, i + 50);
    const { error } = await supabase.from('cards').upsert(batch, { onConflict: 'user_id,word_l2,direction', ignoreDuplicates: true });
    if (error) { console.error(`Batch ${Math.floor(i/50)+1} error:`, error.message); continue; }
    inserted += batch.length;
    process.stdout.write(`\r  ${inserted}/${cards.length} cards...`);
  }
  console.log(`\nDone! ${inserted} cards (${allWords.length} words x 2 directions).`);
}

seed().catch(console.error);
