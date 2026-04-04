import { create } from 'zustand';
import type { Card, FsrsRating, SessionStats } from '@/modules/shared-types';
import { getNextCards, reviewCard } from '@/modules/fsrs-engine';

interface ReviewState {
  // Deck
  deck: Card[];
  currentIndex: number;
  isRevealed: boolean;
  isLoading: boolean;
  error: string | null;

  // Session stats
  cardsReviewed: number;
  cardsCorrect: number;
  cardsIncorrect: number;
  sessionStartTime: number | null;
  isSessionComplete: boolean;

  // Actions
  loadDeck: (userId: string, count?: number) => Promise<void>;
  revealCard: () => void;
  gradeCard: (userId: string, rating: FsrsRating) => Promise<void>;
  resetSession: () => void;
  getSessionStats: () => SessionStats;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  deck: [],
  currentIndex: 0,
  isRevealed: false,
  isLoading: false,
  error: null,
  cardsReviewed: 0,
  cardsCorrect: 0,
  cardsIncorrect: 0,
  sessionStartTime: null,
  isSessionComplete: false,

  loadDeck: async (userId, count = 20) => {
    set({ isLoading: true, error: null });
    const result = await getNextCards(userId, count);
    if (result.ok) {
      set({
        deck: result.data,
        currentIndex: 0,
        isRevealed: false,
        isLoading: false,
        isSessionComplete: result.data.length === 0,
        sessionStartTime: Date.now(),
        cardsReviewed: 0,
        cardsCorrect: 0,
        cardsIncorrect: 0,
      });
    } else {
      set({ isLoading: false, error: result.error.message });
    }
  },

  revealCard: () => {
    set({ isRevealed: true });
  },

  gradeCard: async (userId, rating) => {
    const { deck, currentIndex } = get();
    const card = deck[currentIndex];
    if (!card) return;

    set({ isLoading: true });

    const result = await reviewCard(card.id, userId, rating);
    if (result.ok) {
      const isCorrect = rating >= 3;
      const nextIndex = currentIndex + 1;
      const isComplete = nextIndex >= deck.length;

      set({
        currentIndex: nextIndex,
        isRevealed: false,
        isLoading: false,
        cardsReviewed: get().cardsReviewed + 1,
        cardsCorrect: get().cardsCorrect + (isCorrect ? 1 : 0),
        cardsIncorrect: get().cardsIncorrect + (isCorrect ? 0 : 1),
        isSessionComplete: isComplete,
      });
    } else {
      set({ isLoading: false, error: result.error.message });
    }
  },

  resetSession: () => {
    set({
      deck: [],
      currentIndex: 0,
      isRevealed: false,
      isLoading: false,
      error: null,
      cardsReviewed: 0,
      cardsCorrect: 0,
      cardsIncorrect: 0,
      sessionStartTime: null,
      isSessionComplete: false,
    });
  },

  getSessionStats: () => {
    const state = get();
    const durationMs = state.sessionStartTime
      ? Date.now() - state.sessionStartTime
      : 0;

    return {
      cards_reviewed: state.cardsReviewed,
      cards_correct: state.cardsCorrect,
      cards_incorrect: state.cardsIncorrect,
      duration_seconds: Math.round(durationMs / 1000),
      new_cards_seen: state.deck.filter(
        (c) => c.fsrs_state.state === 0
      ).length,
      review_cards_seen: state.deck.filter(
        (c) => c.fsrs_state.state !== 0
      ).length,
    };
  },
}));
