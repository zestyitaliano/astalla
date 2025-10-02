import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  dense?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardCard({
  title,
  description,
  action,
  children,
  dense,
  className,
  contentClassName
}: DashboardCardProps) {
  return (
    <Card
      className={cn(
        "rounded-3xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all",
        "supports-[backdrop-filter]:bg-card/90 supports-[backdrop-filter]:backdrop-blur",
        "hover:shadow-md focus-within:shadow-md",
        className
      )}
    >
      <div className={cn("flex flex-col", dense ? "p-5" : "p-6")}> 
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground/90">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0 space-y-2 text-sm text-muted-foreground">{action}</div> : null}
        </div>
        <Separator className="mt-4" />
        <div className={cn("pt-4", dense ? "space-y-4" : "space-y-5", contentClassName)}>{children}</div>
      </div>
    </Card>
  );
}
