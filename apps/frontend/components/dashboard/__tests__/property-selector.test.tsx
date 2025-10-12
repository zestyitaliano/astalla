import { render } from "@testing-library/react";

import { PropertySelector } from "../property-selector";

describe("PropertySelector", () => {
  it("matches snapshot", () => {
    const { container } = render(
      <PropertySelector
        properties={[
          {
            id: "prop-1",
            name: "Atrium Center",
            city: "Austin",
            state: "TX",
            propertyCode: "ATRIUM",
            region: "Central"
          },
          {
            id: "prop-2",
            name: "Harbor Tower",
            city: "Seattle",
            state: "WA",
            propertyCode: "HARBOR",
            region: "Pacific Northwest"
          }
        ]}
        selectedPropertyId="prop-1"
        onPropertyChange={() => {}}
        timeRange={30}
        onTimeRangeChange={() => {}}
      />
    );

    const select = container.querySelector("select");
    const optionTexts = select
      ? Array.from(select.querySelectorAll("option"), (option) => option.textContent)
      : [];
    expect(optionTexts).toMatchInlineSnapshot(`
      [
        "Atrium Center · Austin, TX",
        "Harbor Tower · Seattle, WA"
      ]
    `);
  });
});
