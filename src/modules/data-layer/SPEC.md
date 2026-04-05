# Module: data-layer

## Responsibility
Manages all Supabase interactions: client initialization, database queries, auth. This is the ONLY module that imports `@supabase/supabase-js`. All other modules access the database through data-layer's public API.

Does NOT: contain business logic, FSRS scheduling, or exercise grading. Pure data access.

## Public API

```typescript
// Supabase client
supabase: SupabaseClient

// Card queries
getCardsDueForUser(userId, limit?) → Card[]
getCardsByUser(userId) → Card[]
getCardById(cardId) → Card | null
insertCards(userId, cards: NewCard[]) → Card[]
updateCard(cardId, updates) → Card
getCardStats(userId) → { total, due, new_cards, learning, mastered }

// User queries
getUserProfile(userId) → UserProfile | null
updateUserProfile(userId, updates) → UserProfile

// Review log queries
insertReviewLog(log) → ReviewLog
```

## Dependencies
- shared-types (Card, UserProfile, etc.)
- @supabase/supabase-js (external)

## State Owned
- Database tables: users, cards, review_logs (Phase 1a)
- Future tables added by other modules go through data-layer queries

## Error Modes
- Supabase errors are thrown (callers wrap in Result via their own module)
- Missing env vars: warning logged, placeholder client created
- Not found (PGRST116): returns null instead of throwing

## Security
- All tables have RLS enabled: `auth.uid() = user_id`
- Supabase anon key used client-side (public, safe)
- Service role key NOT used (no server-side admin access needed for 2 users)

## Deployment Phase
Phase 1a

## Testing Checklist
- [ ] Integration: insert card → read card → verify match
- [ ] Integration: RLS blocks cross-user access
- [ ] Integration: getCardsDueForUser returns only cards where next_review <= now
- [ ] Unit: getCardById returns null for nonexistent ID
