import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import seedData from '../../../../data/seed/top-100-spanish.json';

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const { userId, targetLanguage } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
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

    // Create cards in both directions
    const cards = seedData.flatMap((word) => [
      {
        user_id: userId,
        word_l2: word.word_l2,
        word_l1: word.word_l1,
        example_sentence: word.example_sentence,
        image_url: null,
        frequency_rank: word.frequency_rank,
        direction: 'l2-to-l1',
        mastery_level: 0,
        fsrs_state: defaultFsrsState,
        next_review: now,
        first_seen: now,
        last_reviewed: null,
        created_at: now,
      },
      {
        user_id: userId,
        word_l2: word.word_l2,
        word_l1: word.word_l1,
        example_sentence: word.example_sentence,
        image_url: null,
        frequency_rank: word.frequency_rank,
        direction: 'l1-to-l2',
        mastery_level: 0,
        fsrs_state: defaultFsrsState,
        next_review: now,
        first_seen: now,
        last_reviewed: null,
        created_at: now,
      },
    ]);

    // Insert in batches
    let inserted = 0;
    const batchSize = 50;

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const { error } = await supabase.from('cards').upsert(batch, {
        onConflict: 'user_id,word_l2,direction',
        ignoreDuplicates: true,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      inserted += batch.length;
    }

    return NextResponse.json({ success: true, cards_created: inserted });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
