import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// First 20 words inlined for fast seed. Full seed done via script.
const SEED_WORDS = [
  { word_l2: "de", word_l1: "de", example_sentence: "El libro es de María.", frequency_rank: 1 },
  { word_l2: "la", word_l1: "la", example_sentence: "La casa es grande.", frequency_rank: 2 },
  { word_l2: "que", word_l1: "que", example_sentence: "Creo que es bueno.", frequency_rank: 3 },
  { word_l2: "el", word_l1: "le", example_sentence: "El gato duerme en la cama.", frequency_rank: 4 },
  { word_l2: "en", word_l1: "dans / en", example_sentence: "Vivo en una ciudad pequeña.", frequency_rank: 5 },
  { word_l2: "y", word_l1: "et", example_sentence: "Tengo un perro y un gato.", frequency_rank: 6 },
  { word_l2: "a", word_l1: "à", example_sentence: "Voy a la tienda.", frequency_rank: 7 },
  { word_l2: "ser", word_l1: "être", example_sentence: "Quiero ser médico.", frequency_rank: 8 },
  { word_l2: "no", word_l1: "non / ne...pas", example_sentence: "No quiero ir.", frequency_rank: 9 },
  { word_l2: "un", word_l1: "un", example_sentence: "Tengo un hermano.", frequency_rank: 10 },
  { word_l2: "por", word_l1: "par / pour", example_sentence: "Gracias por todo.", frequency_rank: 11 },
  { word_l2: "con", word_l1: "avec", example_sentence: "Voy con mi amigo.", frequency_rank: 12 },
  { word_l2: "para", word_l1: "pour", example_sentence: "Esto es para ti.", frequency_rank: 13 },
  { word_l2: "estar", word_l1: "être (état)", example_sentence: "Estoy muy contento.", frequency_rank: 14 },
  { word_l2: "tener", word_l1: "avoir", example_sentence: "Tengo mucha hambre.", frequency_rank: 15 },
  { word_l2: "hacer", word_l1: "faire", example_sentence: "Voy a hacer la comida.", frequency_rank: 16 },
  { word_l2: "yo", word_l1: "je / moi", example_sentence: "Yo soy estudiante.", frequency_rank: 17 },
  { word_l2: "ir", word_l1: "aller", example_sentence: "Quiero ir al cine.", frequency_rank: 18 },
  { word_l2: "poder", word_l1: "pouvoir", example_sentence: "¿Puedo ayudarte?", frequency_rank: 19 },
  { word_l2: "decir", word_l1: "dire", example_sentence: "¿Qué quieres decir?", frequency_rank: 20 },
  { word_l2: "este", word_l1: "ce / cet", example_sentence: "Este libro es interesante.", frequency_rank: 21 },
  { word_l2: "saber", word_l1: "savoir", example_sentence: "No sé la respuesta.", frequency_rank: 22 },
  { word_l2: "querer", word_l1: "vouloir", example_sentence: "Quiero aprender español.", frequency_rank: 23 },
  { word_l2: "ver", word_l1: "voir", example_sentence: "Quiero ver una película.", frequency_rank: 24 },
  { word_l2: "dar", word_l1: "donner", example_sentence: "Te voy a dar un regalo.", frequency_rank: 25 },
  { word_l2: "hablar", word_l1: "parler", example_sentence: "¿Hablas español?", frequency_rank: 26 },
  { word_l2: "comer", word_l1: "manger", example_sentence: "Vamos a comer juntos.", frequency_rank: 27 },
  { word_l2: "beber", word_l1: "boire", example_sentence: "Quiero beber agua.", frequency_rank: 28 },
  { word_l2: "vivir", word_l1: "vivre", example_sentence: "Vivo en Madrid.", frequency_rank: 29 },
  { word_l2: "casa", word_l1: "maison", example_sentence: "Mi casa es pequeña.", frequency_rank: 30 },
  { word_l2: "tiempo", word_l1: "temps", example_sentence: "No tengo tiempo.", frequency_rank: 31 },
  { word_l2: "día", word_l1: "jour", example_sentence: "Hoy es un buen día.", frequency_rank: 32 },
  { word_l2: "hombre", word_l1: "homme", example_sentence: "El hombre camina por la calle.", frequency_rank: 33 },
  { word_l2: "mujer", word_l1: "femme", example_sentence: "La mujer lee un libro.", frequency_rank: 34 },
  { word_l2: "bueno", word_l1: "bon", example_sentence: "Es un buen amigo.", frequency_rank: 35 },
  { word_l2: "grande", word_l1: "grand", example_sentence: "La ciudad es muy grande.", frequency_rank: 36 },
  { word_l2: "agua", word_l1: "eau", example_sentence: "Necesito un vaso de agua.", frequency_rank: 37 },
  { word_l2: "mundo", word_l1: "monde", example_sentence: "Es el mejor del mundo.", frequency_rank: 38 },
  { word_l2: "hoy", word_l1: "aujourd'hui", example_sentence: "Hoy hace buen tiempo.", frequency_rank: 39 },
  { word_l2: "muy", word_l1: "très", example_sentence: "Estoy muy cansado.", frequency_rank: 40 },
  { word_l2: "bien", word_l1: "bien", example_sentence: "Todo está bien.", frequency_rank: 41 },
  { word_l2: "también", word_l1: "aussi", example_sentence: "Yo también quiero ir.", frequency_rank: 42 },
  { word_l2: "ahora", word_l1: "maintenant", example_sentence: "Tengo que irme ahora.", frequency_rank: 43 },
  { word_l2: "siempre", word_l1: "toujours", example_sentence: "Siempre llego a tiempo.", frequency_rank: 44 },
  { word_l2: "nunca", word_l1: "jamais", example_sentence: "Nunca he estado allí.", frequency_rank: 45 },
  { word_l2: "trabajo", word_l1: "travail", example_sentence: "Me gusta mi trabajo.", frequency_rank: 46 },
  { word_l2: "vida", word_l1: "vie", example_sentence: "La vida es bella.", frequency_rank: 47 },
  { word_l2: "nuevo", word_l1: "nouveau", example_sentence: "Tengo un coche nuevo.", frequency_rank: 48 },
  { word_l2: "pequeño", word_l1: "petit", example_sentence: "El niño es pequeño.", frequency_rank: 49 },
  { word_l2: "nombre", word_l1: "nom", example_sentence: "¿Cuál es tu nombre?", frequency_rank: 50 },
];

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();

    const defaultFsrsState = {
      due: now, stability: 0, difficulty: 0,
      elapsed_days: 0, scheduled_days: 0,
      reps: 0, lapses: 0, state: 0,
    };

    const cards = SEED_WORDS.flatMap((word) => [
      {
        user_id: userId, word_l2: word.word_l2, word_l1: word.word_l1,
        example_sentence: word.example_sentence, image_url: null,
        frequency_rank: word.frequency_rank, direction: 'l2-to-l1',
        mastery_level: 0, fsrs_state: defaultFsrsState,
        next_review: now, first_seen: now, last_reviewed: null, created_at: now,
      },
      {
        user_id: userId, word_l2: word.word_l2, word_l1: word.word_l1,
        example_sentence: word.example_sentence, image_url: null,
        frequency_rank: word.frequency_rank, direction: 'l1-to-l2',
        mastery_level: 0, fsrs_state: defaultFsrsState,
        next_review: now, first_seen: now, last_reviewed: null, created_at: now,
      },
    ]);

    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const { error } = await supabase.from('cards').upsert(batch, {
        onConflict: 'user_id,word_l2,direction',
        ignoreDuplicates: true,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
