import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { useReferenceAutocomplete } from "../useReferenceAutocomplete";

const createFetchResponse = (payload: unknown) => ({
  ok: true,
  json: async () => payload,
});

describe("useReferenceAutocomplete", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_API_BASE_URL = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    if (originalFetch) {
      global.fetch = originalFetch;
    }
  });

  it("fetches suggestions after the debounce interval", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({
        suggestions: [
          { id: "leases", kind: "table", label: "Leases" },
          { id: "rent", kind: "column", label: "Rent", breadcrumb: ["Leases"] },
        ],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useReferenceAutocomplete({ editorText: "@Le", cursorContext: { tableId: "leases" } }),
    );

    act(() => {
      result.current.openAt({ query: "Le" });
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(2);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/references/suggest",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ tokensSoFar: "Le", cursorContext: { tableId: "leases" } }),
      }),
    );
  });

  it("supports static suggestions and selection via keyboard", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useReferenceAutocomplete({ editorText: "average rent", cursorContext: undefined }),
    );

    const staticSuggestion = {
      id: "human",
      label: "avg(@Leases.Rent)",
      description: "Translate human phrase",
      source: "static" as const,
    };

    act(() => {
      result.current.openAt({ staticSuggestions: [staticSuggestion] });
    });

    expect(result.current.suggestions).toEqual([staticSuggestion]);

    const preventDefault = vi.fn();
    let accepted: any = null;
    act(() => {
      accepted = result.current.onKeyDown({ key: "Enter", preventDefault } as any);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(accepted).toEqual(staticSuggestion);
    expect(result.current.isOpen).toBe(false);
  });

  it("closes the popover on Escape", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useReferenceAutocomplete({ editorText: "@Le", cursorContext: undefined }),
    );

    act(() => {
      result.current.openAt({
        staticSuggestions: [
          { id: "leases", label: "Leases", source: "static" as const },
        ],
      });
    });

    expect(result.current.isOpen).toBe(true);

    const preventDefault = vi.fn();

    act(() => {
      result.current.onKeyDown({ key: "Escape", preventDefault } as any);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });
});
