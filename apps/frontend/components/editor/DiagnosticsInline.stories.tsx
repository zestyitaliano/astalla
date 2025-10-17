import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { DiagnosticsInline } from "./DiagnosticsInline";
import type { ReferenceDiagnostic } from "@/lib/references/diagnostics";

const sampleDiagnostics: ReferenceDiagnostic[] = [
  {
    code: "unknown_table",
    message: "Unknown table \"Lease\"",
    range: { start: 4, end: 9 },
    severity: "error",
    fix: {
      label: 'Use "Leases"',
      apply: () => "sum(@Leases.TotalRent)",
    },
  },
  {
    code: "unknown_column",
    message: "Unknown column \"TotalRnt\"",
    range: { start: 16, end: 24 },
    severity: "warning",
  },
];

const meta: Meta<typeof DiagnosticsInline> = {
  title: "References/DiagnosticsInline",
  component: DiagnosticsInline,
  args: {
    value: "sum(@Lease.TotalRnt)",
    diagnostics: sampleDiagnostics,
    onChange: fn(),
  },
  argTypes: {
    onChange: { action: "change" },
  },
};

type Story = StoryObj<typeof DiagnosticsInline>;

export const WithDiagnostics: Story = {};

export const Clean: Story = {
  args: {
    diagnostics: [],
  },
};

export default meta;
