import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { ReferencePopover, type ReferenceSuggestionItem } from "./ReferencePopover";

const suggestions: ReferenceSuggestionItem[] = [
  {
    id: "leases.total_rent",
    label: "Leases • Total Rent",
    breadcrumb: ["Leases"],
    description: "Numeric column",
    scoreBreakdown: { schema: 0.9, context: 0.3, semantic: 0.2, data: 0.1 },
    kind: "column",
  },
  {
    id: "leases.status",
    label: "Leases • Status",
    breadcrumb: ["Leases"],
    description: "Text column",
    scoreBreakdown: { schema: 0.7, context: 0.1, semantic: 0.05, data: 0 },
    kind: "column",
  },
  {
    id: "leases.unit::units.name",
    label: "Unit › Units › Name",
    breadcrumb: ["Leases", "Unit"],
    description: "Reference column → Units",
    scoreBreakdown: { schema: 0.65, context: 0.2, semantic: 0.1, data: 0.15 },
    kind: "column",
  },
  {
    id: "leases.unit::configure",
    label: "Set target table…",
    description: "Configure the reference target table",
    kind: "action",
  },
];

const meta: Meta<typeof ReferencePopover> = {
  title: "References/ReferencePopover",
  component: ReferencePopover,
  args: {
    triggerLabel: "Show suggestions",
    suggestions,
    onSelect: fn(),
    onActionSelect: fn(),
  },
  argTypes: {
    onSelect: { action: "select" },
    onActionSelect: { action: "action" },
  },
};

type Story = StoryObj<typeof ReferencePopover>;

export const WithResults: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    suggestions: [],
  },
};

export default meta;
