import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { buildApiUrl } from "@/lib/env";

type ReferenceKind = "table" | "column" | "function" | "view" | "translation";

type CursorContext = {
  tableId?: string;
  editingFieldType?: "expr" | "filter" | "value";
};

interface ApiSuggestion {
  id: string;
  kind: ReferenceKind;
  label: string;
  breadcrumb?: string[];
  preview?: string;
  description?: string;
  scoreBreakdown?: {
    schema: number;
    context: number;
    semantic: number;
    data: number;
  };
}

export interface ReferenceAutocompleteSuggestion {
  id: string;
  label: string;
  description?: string;
  breadcrumb?: string[];
  preview?: string;
  kind?: ReferenceKind;
  scoreBreakdown?: ApiSuggestion["scoreBreakdown"];
  source: "api" | "static";
  data?: unknown;
}

interface UseReferenceAutocompleteOptions {
  editorText: string;
  cursorContext?: CursorContext;
}

interface OpenOptions {
  query?: string;
  staticSuggestions?: ReferenceAutocompleteSuggestion[];
}

export interface ReferenceAutocompleteResult {
  suggestions: ReferenceAutocompleteSuggestion[];
  isOpen: boolean;
  selectedIndex: number;
  onKeyDown: (event: KeyboardEvent) => ReferenceAutocompleteSuggestion | null;
  onSelect: (suggestion: ReferenceAutocompleteSuggestion) => ReferenceAutocompleteSuggestion;
  openAt: (options?: OpenOptions) => void;
  close: () => void;
}

const DEBOUNCE_MS = 120;

export function useReferenceAutocomplete({
  editorText,
  cursorContext,
}: UseReferenceAutocompleteOptions): ReferenceAutocompleteResult {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState<string>("");
  const [staticSuggestions, setStaticSuggestions] = useState<ReferenceAutocompleteSuggestion[]>([]);
  const [remoteSuggestions, setRemoteSuggestions] = useState<ReferenceAutocompleteSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchIdRef = useRef(0);

  const suggestions = useMemo(
    () => [...staticSuggestions, ...remoteSuggestions],
    [staticSuggestions, remoteSuggestions],
  );

  const resetRemote = useCallback(() => {
    setRemoteSuggestions([]);
  }, []);

  const cancelPendingFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    fetchControllerRef.current?.abort();
    fetchControllerRef.current = null;
  }, []);

  const close = useCallback(() => {
    cancelPendingFetch();
    setIsOpen(false);
    setQuery("");
    setStaticSuggestions([]);
    resetRemote();
    setSelectedIndex(0);
  }, [cancelPendingFetch, resetRemote]);

  const openAt = useCallback(
    (options?: OpenOptions) => {
      cancelPendingFetch();
      setIsOpen(true);
      setQuery(options?.query ?? "");
      if (options?.staticSuggestions) {
        setStaticSuggestions(
          options.staticSuggestions.map((item) => ({
            ...item,
            source: "static" as const,
          })),
        );
      } else {
        setStaticSuggestions([]);
      }
      resetRemote();
      setSelectedIndex(0);
    },
    [cancelPendingFetch, resetRemote],
  );

  useEffect(() => {
    if (!isOpen) {
      cancelPendingFetch();
      resetRemote();
      return;
    }

    if (!query || query.trim().length === 0) {
      cancelPendingFetch();
      resetRemote();
      return;
    }

    cancelPendingFetch();
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    const fetchId = ++lastFetchIdRef.current;

    debounceTimerRef.current = setTimeout(() => {
      const performFetch = async () => {
        try {
          const response = await fetch(buildApiUrl("/api/references/suggest"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tokensSoFar: query,
              cursorContext,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            return;
          }

          const payload = (await response.json()) as { suggestions?: ApiSuggestion[] };
          if (lastFetchIdRef.current !== fetchId) {
            return;
          }

          const apiSuggestions: ReferenceAutocompleteSuggestion[] = Array.isArray(payload.suggestions)
            ? payload.suggestions.map((item) => ({
                id: item.id,
                label: item.label,
                description: item.description,
                breadcrumb: item.breadcrumb,
                preview: item.preview,
                kind: item.kind,
                scoreBreakdown: item.scoreBreakdown,
                source: "api" as const,
                data: item,
              }))
            : [];

          setRemoteSuggestions(apiSuggestions);
        } catch (error) {
          if (process.env.NODE_ENV !== "production" && !(error instanceof DOMException && error.name === "AbortError")) {
            console.warn("[references] Failed to fetch suggestions", error);
          }
        }
      };

      void performFetch();
    }, DEBOUNCE_MS);

    return () => {
      cancelPendingFetch();
    };
  }, [cancelPendingFetch, cursorContext, isOpen, query, resetRemote]);

  useEffect(() => {
    if (!editorText && isOpen) {
      close();
    }
  }, [close, editorText, isOpen]);

  useEffect(() => {
    if (suggestions.length === 0) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex((current) => {
      if (current < 0) {
        return 0;
      }
      if (current >= suggestions.length) {
        return suggestions.length - 1;
      }
      return current;
    });
  }, [suggestions.length]);

  const onSelect = useCallback(
    (suggestion: ReferenceAutocompleteSuggestion) => {
      close();
      return suggestion;
    },
    [close],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) {
        return null;
      }

      const total = suggestions.length;
      if (event.key === "ArrowDown" && total > 0) {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % total);
        return null;
      }

      if (event.key === "ArrowUp" && total > 0) {
        event.preventDefault();
        setSelectedIndex((current) => (current - 1 + total) % total);
        return null;
      }

      if (event.key === "Tab" || event.key === "Enter") {
        if (total === 0) {
          return null;
        }
        event.preventDefault();
        const selected = suggestions[selectedIndex] ?? suggestions[0];
        if (selected) {
          close();
          return selected;
        }
        return null;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return null;
      }

      return null;
    },
    [close, isOpen, selectedIndex, suggestions],
  );

  return {
    suggestions,
    isOpen,
    selectedIndex,
    onKeyDown,
    onSelect,
    openAt,
    close,
  };
}
