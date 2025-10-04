"use client";

import { useMemo } from "react";
import { Check, ChevronDown, PlusCircle, Trash2 } from "lucide-react";

import { type TableViewDto } from "@/lib/api/tables";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ViewMenuProps {
  views: TableViewDto[];
  activeViewId: string | null;
  onSelect: (viewId: string | null) => void;
  onSaveCurrent: () => void;
  onRename: (viewId: string) => void;
  onDelete: (viewId: string) => void;
  isSaving?: boolean;
}

export function ViewMenu({
  views,
  activeViewId,
  onSelect,
  onSaveCurrent,
  onRename,
  onDelete,
  isSaving
}: ViewMenuProps) {
  const activeView = useMemo(() => views.find((view) => view.id === activeViewId), [views, activeViewId]);
  const label = activeView ? activeView.name : "Default view";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-3 py-1 text-xs font-medium shadow-sm hover:shadow-cardHover"
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="w-56">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          Views
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onSelect(null)}>
          <span className="flex items-center gap-2">
            {activeViewId === null ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
            Default view
          </span>
        </DropdownMenuItem>
        {views.map((view) => (
          <DropdownMenuItem key={view.id} onSelect={() => onSelect(view.id)}>
            <span className="flex items-center gap-2">
              {activeViewId === view.id ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
              {view.name}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSaveCurrent} disabled={isSaving}>
          <PlusCircle className="mr-2 h-4 w-4" /> Save current view
        </DropdownMenuItem>
        {activeViewId ? (
          <>
            <DropdownMenuItem onSelect={() => onRename(activeViewId!)}>
              Rename view
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(activeViewId!)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete view
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
