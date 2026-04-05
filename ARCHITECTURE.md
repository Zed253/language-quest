# Language Quest -- Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP                          │
│  app/ pages (thin UI layer, imports from modules + stores)  │
│  stores/ (Zustand, thin adapters to modules)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  EVENT BUS  │ (typed pub/sub, error-isolated)
                    └──────┬──────┘
                           │
    ┌──────────────────────┼──────────────────────────┐
    │                      │                          │
    ▼                      ▼                          ▼
┌─────────┐  ┌──────────────────────┐  ┌──────────────────┐
│ TIER 3  │  │       TIER 2         │  │     TIER 1       │
│Engagement│  │   Orchestration      │  │   Core Engines   │
│         │  │                      │  │                  │
│gamificat│  │ session-orchestrator │  │ fsrs-engine      │
│character│  │ exercise-engine      │  │ llm-pipeline     │
│theme    │  │ periodization-engine │  │ audio-engine     │
│couple   │  │ assessment-system    │  │                  │
│game-mstr│  │ monitoring-system    │  │                  │
│delight  │  │                      │  │                  │
└────┬────┘  └──────────┬───────────┘  └────────┬─────────┘
     │                  │                       │
     │                  ▼                       │
     │          ┌──────────────┐                │
     └─────────►│   TIER 0     │◄───────────────┘
                │  Foundation  │
                │              │
                │ shared-types │
                │ data-layer   │
                │ event-bus    │
                └──────────────┘
```

## Golden Rules

1. **Arrows point DOWN only.** Tier 3 → Tier 2 → Tier 1 → Tier 0. Never up.
2. **Upward communication = event bus ONLY.** Lower tiers emit events, higher tiers listen.
3. **No cross-module internal imports.** Only `index.ts` is public. `internal/` is private.
4. **All functions return `Result<T, E>`.** Never throw across module boundaries.
5. **Event bus catches handler errors.** A Tier 3 crash never kills Tier 1/2.
6. **Theme is cosmetic.** Theme-system never imports learning modules. Learning modules never import theme.
7. **Exercise registry is the only extension point.** New exercise type = 1 file + register().
8. **Zustand stores are thin.** They call module functions. Business logic lives in modules.

## Module Map

### Tier 0: Foundation

| Module | Responsibility | Depends On | State Owned |
|---|---|---|---|
| [shared-types](src/modules/shared-types/SPEC.md) | Types, schemas, Result pattern | Nothing | None |
| [event-bus](src/modules/event-bus/SPEC.md) | Typed pub/sub | shared-types | In-memory handlers |
| [data-layer](src/modules/data-layer/SPEC.md) | Supabase client, queries, RLS | shared-types | DB tables: users |

### Tier 1: Core Engines

| Module | Responsibility | Depends On | State Owned |
|---|---|---|---|
| [fsrs-engine](src/modules/fsrs-engine/SPEC.md) | SRS scheduling, card management | shared-types, data-layer, event-bus | DB: cards, review_logs |
| [llm-pipeline](src/modules/llm-pipeline/SPEC.md) | OpenAI abstraction, prompts, retry | shared-types | None (stateless) |
| audio-engine (Phase 2) | TTS, STT, recording | shared-types | None |

### Tier 2: Orchestration

| Module | Responsibility | Depends On | State Owned |
|---|---|---|---|
| [exercise-engine](src/modules/exercise-engine/SPEC.md) | Exercise types, grading, registry | shared-types, llm-pipeline | In-memory registry |
| [session-orchestrator](src/modules/session-orchestrator/SPEC.md) | Session flow, phases | shared-types, fsrs-engine, exercise-engine, llm-pipeline, event-bus, data-layer | DB: sessions; In-memory: active sessions |
| periodization-engine (Phase 3) | Curriculum, cycles | shared-types, data-layer | DB: cycles, daily_plans |
| assessment-system (Phase 3) | Initial evaluation | shared-types, data-layer | DB: assessments |
| monitoring-system (Phase 3) | 4 signals, decisions | shared-types, data-layer, event-bus | DB: signal_snapshots |

### Tier 3: Engagement

| Module | Responsibility | Depends On | State Owned |
|---|---|---|---|
| gamification (Phase 4) | XP, currency, streaks, ranks | shared-types, event-bus, data-layer | DB: xp_ledger, streaks |
| character-system (Phase 4) | Traits, evolution | shared-types, event-bus | DB: characters |
| theme-system (Phase 4) | Visual themes, assets | shared-types | JSON config files |
| couple-collab (Phase 5) | Shared vitality, SOS | shared-types, event-bus, data-layer | DB: couples, postcards |
| game-master (Phase 6) | Quest creation | shared-types, event-bus, data-layer | DB: quests |
| delight (Phase 6) | Time capsule, wrapped | shared-types, event-bus, data-layer | DB: time_capsules |

## Data Flow: A Complete Session

```
User taps "Start Session"
  │
  ▼
session-orchestrator.buildSession()
  ├── fsrs-engine.getNextCards()          → 5 FSRS cards for warm-up
  ├── llm-pipeline.generateExercises()   → 4 LLM exercises for main block
  ├── llm-pipeline.generateNarrative()   → intro + outro in target language
  └── Returns SessionPlan
  │
  ▼
UI shows intro narrative (in target language, translate button)
  │
  ▼
User taps "Start" → phase = exercising
  │
  ▼
For each exercise:
  ├── UI renders exercise (flashcard, cloze, translation, etc.)
  ├── User submits answer
  ├── session-orchestrator.advanceSession()
  │     ├── exercise-engine.gradeExercise()    → score + feedback
  │     ├── fsrs-engine.reviewCard() (if FSRS) → schedule next review
  │     ├── eventBus.emit(ExerciseGraded)      → Tier 3 listens
  │     └── Returns NextStep or SessionComplete
  ├── UI shows feedback (correct/incorrect + grammar note)
  └── Next exercise
  │
  ▼
SessionComplete
  ├── eventBus.emit(SessionCompleted)
  │     ├── gamification listens → update XP, currency, streak
  │     ├── couple-collab listens → update shared vitality
  │     └── delight listens → check milestones
  ├── UI shows outro narrative + stats + Berrys earned
  └── Optional: "Un mot pour [partner] ?"
```

## Debugging Guide

| Symptom | Where to look |
|---|---|
| Cards not appearing | data-layer → cards query, check RLS, check next_review dates |
| FSRS scheduling wrong | fsrs-engine → scheduler.ts, check toFsrsCard/fromFsrsCard conversion |
| Exercises not generating | llm-pipeline → check API key, check prompt-templates, check /api/llm route |
| Wrong grading | exercise-engine → specific type file in internal/types/, check grading-utils |
| Session stuck | session-orchestrator → orchestrator.ts, check phase transitions |
| Events not firing | event-bus → check handler registration, check console for caught errors |
| Theme not applying | theme-system → check ThemeProvider context, check theme pack JSON |
| Partner data wrong | couple-collab → check Supabase RLS allows reading partner's public stats |

## File Structure

```
src/
  app/                    # Next.js pages (THIN -- imports modules + stores)
    page.tsx              # Dashboard
    review/page.tsx       # Flashcard review
    session/page.tsx      # Full AI session
    api/llm/route.ts      # OpenAI proxy (keeps API key server-side)

  modules/                # CORE -- each module is independent
    <module>/
      index.ts            # PUBLIC API (only file imported by others)
      types.ts            # Module-specific types
      SPEC.md             # Micro-spec (responsibility, API, deps, errors)
      internal/           # PRIVATE (import-restricted)
        ...implementation
      __tests__/           # Co-located tests

  stores/                 # Zustand (thin adapters, no business logic)
    review-store.ts
    session-store.ts

  components/             # Shared React components
    ui/                   # shadcn primitives

  lib/                    # Utilities
    utils.ts

data/                     # Static data
  seed/                   # Vocabulary seed files

supabase/
  migrations/             # SQL migrations
```

## Adding a New Feature: Checklist

1. Identify which module owns this feature (or if a new module is needed)
2. Write/update the module's SPEC.md
3. Implement in `internal/`
4. Export through `index.ts`
5. If it reacts to events: register handler in the module's init
6. If it emits events: add event type to shared-types/events.ts
7. Verify: no upward imports, no cross-module internal imports
8. Test: unit test in `__tests__/`, contract test if cross-module
