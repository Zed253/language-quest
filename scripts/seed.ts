/**
 * Seed script -- populate a user's deck with the top 100 Spanish words
 *
 * Usage:
 *   npx tsx scripts/seed.ts <user_id>
 *
 * Prerequisites:
 *   - .env.local must have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - The user must exist in the users table
 *   - Run the SQL migration first (supabase/migrations/001_initial_schema.sql)
 */

import { createClient } from '@supabase/supabase-js';
import seedData from '../data/seed/top-100-spanish.json';

// Load env manually since this runs outside Next.js
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: npx tsx scripts/seed.ts <user_id>');
  process.exit(1);
}

async function seed() {
  console.log(`Seeding ${seedData.length} words for user ${userId}...`);
  console.log('Creating cards in both directions (receptive + productive)...\n');

  const now = new Date().toISOString();
  const defaultFsrsState = {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0,
  };

  const cards = seedData.flatMap((word) => [
    // Receptive: Spanish → French (easier, learn first)
    {
      user_id: userId,
      word_l2: word.word_l2,
      word_l1: word.word_l1,
      example_sentence: word.example_sentence,
      image_url: null,
      frequency_rank: word.frequency_rank,
      direction: 'l2-to-l1' as const,
      mastery_level: 0,
      fsrs_state: defaultFsrsState,
      next_review: now,
      first_seen: now,
      last_reviewed: null,
      created_at: now,
    },
    // Productive: French → Spanish (harder, also needed)
    {
      user_id: userId,
      word_l2: word.word_l2,
      word_l1: word.word_l1,
      example_sentence: word.example_sentence,
      image_url: null,
      frequency_rank: word.frequency_rank,
      direction: 'l1-to-l2' as const,
      mastery_level: 0,
      fsrs_state: defaultFsrsState,
      next_review: now,
      first_seen: now,
      last_reviewed: null,
      created_at: now,
    },
  ]);

  // Insert in batches of 50 to avoid hitting limits
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    const { error } = await supabase.from('cards').upsert(batch, {
      onConflict: 'user_id,word_l2,direction',
      ignoreDuplicates: true,
    });

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
      continue;
    }

    inserted += batch.length;
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} cards`);
  }

  console.log(`\nDone! ${inserted} cards created (${seedData.length} words x 2 directions).`);
  console.log('You can now start reviewing at http://localhost:3000');
}

seed().catch(console.error);
