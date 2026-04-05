# Module: theme-system

## Responsibility
Pure presentation layer. Provides themed names, colors, assets, and narrative mapping. NEVER imports from learning modules. Learning modules NEVER import from theme.

## Public API
```typescript
getThemePack(themeId): ThemePack
getThemedRankName(themeId, rankLevel): string
getThemedCurrencyName(themeId): string
getThemedPhaseName(themeId, phaseId): string
```

## Dependencies
- shared-types (ThemeId type only)
- Theme JSON files (data/themes/)

## Deployment Phase
Phase 4
