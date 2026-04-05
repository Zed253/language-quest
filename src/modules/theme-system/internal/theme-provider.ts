import type { ThemeId } from '@/modules/shared-types';

// ============================================================
// Theme System -- pure presentation, zero learning logic
// ============================================================

export interface ThemePack {
  id: ThemeId;
  name: string;
  currency: { name: string; icon: string };
  ranks: { level: number; name: string }[];
  phases: { id: number; name: string; description: string }[];
  colors: { primary: string; secondary: string; accent: string; bg: string };
}

const ONE_PIECE: ThemePack = {
  id: 'one-piece',
  name: 'One Piece',
  currency: { name: 'Berrys', icon: 'B' },
  ranks: [
    { level: 1, name: 'Moussaillon' },
    { level: 2, name: 'Matelot' },
    { level: 3, name: 'Navigateur' },
    { level: 4, name: 'Capitaine' },
    { level: 5, name: 'Commandant' },
    { level: 6, name: 'Empereur' },
    { level: 7, name: 'Roi des Pirates' },
  ],
  phases: [
    { id: 1, name: 'East Blue', description: 'Les premiers pas sur la Route de Tous les Perils' },
    { id: 2, name: 'Reverse Mountain', description: 'Le passage vers Grand Line' },
    { id: 3, name: 'Grand Line - Paradise', description: "L'aventure au coeur du Nouveau Monde" },
    { id: 4, name: 'Nouveau Monde', description: 'Les eaux les plus dangereuses' },
    { id: 5, name: 'Raftel', description: "L'ile finale, le tresor ultime" },
  ],
  colors: {
    primary: '#DC2626',   // Red (Luffy's hat)
    secondary: '#F59E0B', // Gold (treasure)
    accent: '#2563EB',    // Blue (sea)
    bg: '#FEF3C7',        // Warm sand
  },
};

const HARRY_POTTER: ThemePack = {
  id: 'harry-potter',
  name: 'Harry Potter',
  currency: { name: 'Gallions', icon: 'G' },
  ranks: [
    { level: 1, name: 'Premiere Annee' },
    { level: 2, name: 'Prefet' },
    { level: 3, name: 'Capitaine de Quidditch' },
    { level: 4, name: 'Membre de l\'Ordre' },
    { level: 5, name: 'Auror' },
    { level: 6, name: 'Directeur Adjoint' },
    { level: 7, name: 'Directeur' },
  ],
  phases: [
    { id: 1, name: 'Premiere Annee', description: 'Decouvrir le monde magique' },
    { id: 2, name: 'Deuxieme-Troisieme Annee', description: 'Maitriser les sortileges de base' },
    { id: 3, name: 'Quatrieme-Cinquieme Annee', description: 'Preparer les B.U.S.E.' },
    { id: 4, name: 'Sixieme Annee', description: 'Magie avancee et specialisation' },
    { id: 5, name: 'Septieme Annee', description: 'Maitre sorcier, pret pour le monde' },
  ],
  colors: {
    primary: '#7C3AED',   // Purple (magic)
    secondary: '#D97706', // Gold (Gryffindor)
    accent: '#059669',    // Green (Slytherin)
    bg: '#F5F3FF',        // Light purple mist
  },
};

const THEMES: Record<ThemeId, ThemePack> = {
  'one-piece': ONE_PIECE,
  'harry-potter': HARRY_POTTER,
};

// ============================================================
// Public API
// ============================================================

export function getThemePack(themeId: ThemeId): ThemePack {
  return THEMES[themeId] || ONE_PIECE;
}

export function getThemedRankName(themeId: ThemeId, rankLevel: number): string {
  const pack = getThemePack(themeId);
  const rank = pack.ranks.find(r => r.level === rankLevel);
  return rank?.name || 'Unknown';
}

export function getThemedCurrencyName(themeId: ThemeId): string {
  return getThemePack(themeId).currency.name;
}

export function getThemedPhaseName(themeId: ThemeId, phaseId: number): string {
  const pack = getThemePack(themeId);
  const phase = pack.phases.find(p => p.id === phaseId);
  return phase?.name || `Phase ${phaseId}`;
}
