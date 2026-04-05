# Module: character-system

## Responsibility
Manages character traits (secretly calibrate learning engine), specialty selection, and visual evolution per narrative arc. Listens to events for milestone-based evolution.

## Public API
```typescript
createCharacter(userId, traits, specialty): Promise<Result<Character>>
getCharacter(userId): Promise<Result<Character>>
getTraitModifiers(traits): LearningModifiers
checkEvolution(userId): Promise<Result<EvolutionEvent | null>>
```

## Traits → Learning Modifiers
- Brave: difficulty tolerance +1, less hints
- Analytical: grammar weight +20%, pattern exercises
- Creative: more free production, varied formats
- Patient: longer SRS intervals, deeper dives
- Social: more conversation exercises
- Curious: more reading, cultural content

## Dependencies
- shared-types, data-layer, event-bus

## Deployment Phase
Phase 4
