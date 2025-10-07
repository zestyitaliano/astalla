"use client";

import { ArrowLeft, ArrowRight, Check, Edit3, Eye, EyeOff, MoreHorizontal, Type, Trash2 } from "lucide-react";

import { ColumnType } from "@shared/api";
import { type TableColumnDto } from "@/lib/api/tables";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ColumnMenuProps {
  column: TableColumnDto;
  onRename: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  isHidden: boolean;
  onChangeType: (type: TableColumnDto["type"]) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}

const COLUMN_TYPE_ENUM = ColumnType.enum;

const COLUMN_TYPE_OPTIONS: Array<{ label: string; value: TableColumnDto["type"] }> = [
  { label: "Text", value: COLUMN_TYPE_ENUM.TEXT },
  { label: "Number", value: COLUMN_TYPE_ENUM.NUMBER },
  { label: "Date", value: COLUMN_TYPE_ENUM.DATE },
  { label: "Boolean", value: COLUMN_TYPE_ENUM.BOOLEAN },
  { label: "Select", value: COLUMN_TYPE_ENUM.SELECT },
  { label: "Reference", value: COLUMN_TYPE_ENUM.REFERENCE }
];

export function ColumnMenu({
  column,
  onRename,
  onToggleVisibility,
  onDelete,
  isHidden,
  onChangeType,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight
}: ColumnMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="min-w-[12rem]">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          {column.name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRename}>
          <Edit3 className="mr-2 h-4 w-4" /> Rename
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Type className="mr-2 h-4 w-4" /> Change type
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {COLUMN_TYPE_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onSelect={() => onChangeType(option.value)}>
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                  {column.type === option.value ? <Check className="h-4 w-4" /> : null}
                </span>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onMoveLeft} disabled={!canMoveLeft}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Move left
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onMoveRight} disabled={!canMoveRight}>
          <ArrowRight className="mr-2 h-4 w-4" /> Move right
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onToggleVisibility}>
          {isHidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
          {isHidden ? "Show column" : "Hide column"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete column
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
