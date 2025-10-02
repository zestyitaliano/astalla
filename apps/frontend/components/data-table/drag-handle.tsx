import { GripVertical } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export const DragHandle = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground/80 transition hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
        aria-label="Drag to reorder"
        {...props}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Drag to reorder</span>
      </button>
    );
  }
);

DragHandle.displayName = "DragHandle";
