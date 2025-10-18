import type { SchemaTable } from '@shared/api';

export type ReferenceKind = 'table' | 'column' | 'function' | 'view';
export type ReferenceSuggestionKind = ReferenceKind | 'action';

export interface ReferenceCandidate {
  id: string;
  kind: ReferenceKind;
  name: string;
  label: string;
  breadcrumb?: string[];
  preview?: string;
  tableId?: string;
  tableName?: string;
  dataType?: string;
}

export interface ReferenceCursorContext {
  tableId?: string;
  editingFieldType?: 'expr' | 'filter' | 'value';
}

export interface RankedReferenceSuggestion {
  id: string;
  kind: ReferenceKind;
  label: string;
  breadcrumb?: string[];
  preview?: string;
  scoreBreakdown: {
    schema: number;
    context: number;
    semantic: number;
    data: number;
  };
  totalScore: number;
}

export type ReferenceSuggestion =
  | RankedReferenceSuggestion
  | {
      id: string;
      kind: 'action';
      label: string;
      description?: string;
      breadcrumb?: string[];
      preview?: string;
    };

export interface RankReferencesInput {
  candidates: ReferenceCandidate[];
  tokensSoFar: string;
  cursorContext?: ReferenceCursorContext;
}

const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const normalizeTerm = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const SYNONYM_GROUPS: readonly string[][] = [
  ['rent', 'total_rent'],
  ['move in', 'move_in_date'],
  ['property', 'site', 'community'],
];

const synonymMap: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();

  for (const group of SYNONYM_GROUPS) {
    const normalized = group.map(normalizeTerm);
    for (const term of normalized) {
      const others = normalized.filter((item) => item !== term);
      map.set(term, new Set(others));
    }
  }

  return map;
})();

const isBooleanColumn = (type?: string): boolean =>
  Boolean(type && /bool/i.test(type));

const isDateColumn = (type?: string): boolean =>
  Boolean(type && /(date|time)/i.test(type));

const isEnumColumn = (type?: string): boolean =>
  Boolean(type && /enum/i.test(type));

const computeSchemaScore = (query: string, variants: string[]): number => {
  if (!query) {
    return 0.1;
  }

  let best = 0;
  for (const variant of variants) {
    if (!variant) continue;
    const normalizedVariant = variant.toLowerCase();
    const prefixMatch = normalizedVariant.startsWith(query);
    if (prefixMatch) {
      best = Math.max(best, 1.1);
    }

    if (normalizedVariant.includes(query)) {
      best = Math.max(best, 0.8);
    }

    const distance = levenshtein(query, normalizedVariant.slice(0, Math.max(query.length, 1)));
    if (distance <= 2) {
      const fuzzy = 0.75 - distance * 0.15 + (prefixMatch ? 0.1 : 0);
      best = Math.max(best, fuzzy);
    }
  }

  return Math.max(best, 0);
};

const computeSemanticScore = (query: string, variants: string[]): number => {
  if (!query) {
    return 0;
  }

  const normalizedQuery = normalizeTerm(query);

  for (const variant of variants) {
    const normalizedVariant = normalizeTerm(variant);
    if (normalizedVariant === normalizedQuery) {
      continue;
    }

    const querySynonyms = synonymMap.get(normalizedQuery);
    if (querySynonyms?.has(normalizedVariant)) {
      return 0.25;
    }

    const variantSynonyms = synonymMap.get(normalizedVariant);
    if (variantSynonyms?.has(normalizedQuery)) {
      return 0.25;
    }
  }

  return 0;
};

const computeContextScore = (
  candidate: ReferenceCandidate,
  context?: ReferenceCursorContext,
): number => {
  if (!context) {
    return 0;
  }

  if (candidate.kind === 'column' && context.tableId && candidate.tableId === context.tableId) {
    return 0.3;
  }

  if (candidate.kind === 'table' && context.tableId && candidate.id === context.tableId) {
    return 0.2;
  }

  return 0;
};

const computeDataScore = (
  candidate: ReferenceCandidate,
  context?: ReferenceCursorContext,
): number => {
  if (candidate.kind !== 'column') {
    return 0;
  }

  if (context?.editingFieldType === 'filter') {
    if (isBooleanColumn(candidate.dataType) || isDateColumn(candidate.dataType) || isEnumColumn(candidate.dataType)) {
      return 0.2;
    }
  }

  return 0;
};

export const rankReferences = ({
  candidates,
  tokensSoFar,
  cursorContext,
}: RankReferencesInput): RankedReferenceSuggestion[] => {
  const query = tokensSoFar.trim().toLowerCase();

  const suggestions = candidates.map<RankedReferenceSuggestion>((candidate) => {
    const variants = [candidate.name, candidate.label].filter(Boolean) as string[];
    const schema = computeSchemaScore(query, variants);
    const context = computeContextScore(candidate, cursorContext);
    const semantic = computeSemanticScore(query, variants);
    const data = computeDataScore(candidate, cursorContext);
    const totalScore = schema + context + semantic + data;

    return {
      id: candidate.id,
      kind: candidate.kind,
      label: candidate.label,
      breadcrumb: candidate.breadcrumb,
      preview: candidate.preview,
      scoreBreakdown: { schema, context, semantic, data },
      totalScore,
    };
  });

  return suggestions
    .filter((suggestion) => suggestion.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore || a.label.localeCompare(b.label));
};

export const buildSchemaCandidates = (tables: SchemaTable[]): ReferenceCandidate[] => {
  const candidates: ReferenceCandidate[] = [];

  for (const table of tables) {
    const tableLabel = table.label ?? table.name;
    candidates.push({
      id: table.id,
      kind: 'table',
      name: table.name,
      label: tableLabel,
      tableId: table.id,
      tableName: table.name,
    });

    for (const column of table.columns) {
      candidates.push({
        id: column.id,
        kind: 'column',
        name: column.name,
        label: column.name,
        breadcrumb: [tableLabel],
        tableId: table.id,
        tableName: table.name,
        dataType: column.type,
      });
    }
  }

  return candidates;
};
