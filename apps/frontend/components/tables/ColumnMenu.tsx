"use client";

import { MoreHorizontal } from "lucide-react";
import { type TableColumnDto } from "@/lib/api/tables";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ColumnMenuProps {
  column: TableColumnDto;
  onRename: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  isHidden: boolean;
}

export function ColumnMenu({ column, onRename, onToggleVisibility, onDelete, isHidden }: ColumnMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="min-w-[10rem]">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          {column.name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleVisibility}>
          {isHidden ? "Show column" : "Hide column"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
          Delete column
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
