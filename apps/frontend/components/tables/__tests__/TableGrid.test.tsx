import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";

import { TableGrid } from "../TableGrid";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
}

describe("TableGrid", () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it("renders an error alert when the table payload is invalid", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/admin/tables/broken")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ id: "broken", name: "Broken table", columns: null }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          )
        );
      }

      return Promise.reject(new Error(`Unhandled request for ${url}`));
    });

    renderWithClient(<TableGrid tableId="broken" />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/unable to load table/i);
    expect(alert).toHaveTextContent(/invalid table data/i);
    expect(screen.getByText(/please try again/i)).toBeInTheDocument();
  });
});
