import { render } from "@testing-library/react";

import { AlertsPanel } from "../alerts-panel";

describe("AlertsPanel", () => {
  it("matches snapshot", () => {
    const { container } = render(
      <AlertsPanel
        alerts={[
          {
            id: "alert-1",
            label: "Maintenance backlog",
            detail: "Three tickets have exceeded SLA for more than 24 hours.",
            severity: "high",
            occurredAt: new Date().toISOString()
          },
          {
            id: "alert-2",
            label: "Review spike",
            detail: "Two new reviews mention HVAC noise during evenings.",
            severity: "medium",
            occurredAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
          }
        ]}
        isLoading={false}
        isError={false}
        onRetry={() => {}}
      />
    );

    const alertTitles = Array.from(
      container.querySelectorAll("button p.text-sm.font-semibold.text-text"),
      (node) => node.textContent
    );

    expect(alertTitles).toMatchInlineSnapshot(`
      [
        "Maintenance backlog",
        "Review spike"
      ]
    `);
  });
});
