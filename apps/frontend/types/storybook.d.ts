declare module "@storybook/react" {
  import type { ComponentType } from "react";

  export type Meta<TComponent> = {
    title: string;
    component: TComponent;
    args?: Record<string, unknown>;
    argTypes?: Record<string, unknown>;
  };

  export type StoryObj<TComponent> = {
    args?: Partial<TComponent extends ComponentType<infer P> ? P : unknown>;
  };
}

declare module "@storybook/test" {
  export function fn<TArgs extends unknown[]>(
    implementation?: (...args: TArgs) => void,
  ): (...args: TArgs) => void;
}
