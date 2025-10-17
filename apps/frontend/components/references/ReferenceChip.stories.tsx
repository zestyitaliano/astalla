import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { ReferenceChip } from "./ReferenceChip";

const meta: Meta<typeof ReferenceChip> = {
  title: "References/ReferenceChip",
  component: ReferenceChip,
  args: {
    label: "Leases.TotalRent",
    kind: "column",
    onClick: fn(),
    onRemove: fn(),
  },
  argTypes: {
    onClick: { action: "click" },
    onRemove: { action: "remove" },
  },
};

type Story = StoryObj<typeof ReferenceChip>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const Removable: Story = {
  args: {
    onRemove: fn(),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export default meta;
