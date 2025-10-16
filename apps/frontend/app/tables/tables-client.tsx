"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Edit3, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";

import { useDeleteTableMutation, useTables, useUpdateTableMutation } from "@/lib/api/tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { TableGrid } from "@/components/tables/TableGrid";
import { TablesCreateModal } from "@/components/tables/TablesCreateModal";
import type { DataTableDto } from "@shared/api";

interface TablesClientProps {
  canManage: boolean;
}

export function TablesClient({ canManage }: TablesClientProps) {
  const { data, isLoading } = useTables();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const deleteTableMutation = useDeleteTableMutation();
  const updateTableMutation = useUpdateTableMutation();

  const selectedTable = useMemo(() => {
    if (!data || !selectedTableId) {
      return null;
    }
    return data.find((table) => table.id === selectedTableId) ?? null;
  }, [data, selectedTableId]);

  useEffect(() => {
    if (!selectedTableId && data && data.length) {
      setSelectedTableId(data[0].id);
    }
  }, [data, selectedTableId]);

  const filteredTables = useMemo(() => {
    if (!data) {
      return [];
    }
    const query = search.trim().toLowerCase();
    if (!query) {
      return data;
    }
    return data.filter((table) => table.name.toLowerCase().includes(query));
  }, [data, search]);

  const handleDeleteTable = async () => {
    if (!selectedTableId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this table? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    const tableId = selectedTableId;

    try {
      await deleteTableMutation.mutateAsync(tableId);
      const remainingTables = (data ?? []).filter((table) => table.id !== tableId);
      setSelectedTableId(remainingTables[0]?.id ?? null);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Failed to delete table");
    }
  };

  const handleRenameTable = async (payload: { name: string; description: string | null }) => {
    if (!selectedTableId) {
      return;
    }

    try {
      await updateTableMutation.mutateAsync({ id: selectedTableId, payload });
      setIsRenameDialogOpen(false);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Failed to rename table");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <div className="space-y-4 min-w-0">
          <div className="rounded-3xl border border-border bg-card/80 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">Tables</h2>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => setIsModalOpen(true)}
                disabled={!canManage}
              >
                <Plus className="mr-2 h-4 w-4" /> New table
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tables"
                className="h-8 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="mt-4 space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-10 w-full animate-pulse rounded-2xl bg-muted/50" />
                  ))}
                </div>
              ) : filteredTables.length ? (
                filteredTables.map((table) => {
                  const isSelected = table.id === selectedTableId;
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => setSelectedTableId(table.id)}
                      className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-cardHover"
                          : "border-border/60 bg-card/80 text-text hover:border-primary/50 hover:shadow-card"
                      }`}
                      title={`ID: ${table.id}`}
                    >
                      <div className="font-medium">{table.name}</div>
                      {table.description ? (
                        <div className="text-xs text-muted-foreground">{table.description}</div>
                      ) : null}
                      <div className="mt-1 text-[11px] font-mono text-muted-foreground/80">ID: {table.id}</div>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No tables found.</p>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {selectedTableId ? (
            <>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full border border-border/60 bg-card/80 shadow-sm"
                      disabled={!selectedTableId}
                      aria-label="Table actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-[10rem]" align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        if (!canManage) {
                          return;
                        }
                        setIsRenameDialogOpen(true);
                      }}
                      disabled={!canManage}
                    >
                      <Edit3 className="mr-2 h-4 w-4" /> Rename table…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        if (!canManage) {
                          return;
                        }
                        void handleDeleteTable();
                      }}
                      disabled={!canManage || deleteTableMutation.isPending}
                      className="text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete table…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <TableGrid tableId={selectedTableId} />
            </>
          ) : (
            <div className="flex h-[480px] items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/80 p-10 text-center shadow-card">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-text">Create a table to get started</h3>
                <p className="text-sm text-muted-foreground">
                  Tables let you design custom workflows, capture updates, and share context with your team.
                </p>
                <Button type="button" onClick={() => setIsModalOpen(true)} className="rounded-full" disabled={!canManage}>
                  <Plus className="mr-2 h-4 w-4" /> New table
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <TablesCreateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onCreated={(tableId) => setSelectedTableId(tableId)}
      />
      <RenameTableDialog
        open={isRenameDialogOpen && Boolean(selectedTable)}
        table={selectedTable}
        onOpenChange={(next) => setIsRenameDialogOpen(next)}
        onSubmit={handleRenameTable}
        isSubmitting={updateTableMutation.isPending}
      />
    </div>
  );
}

interface RenameTableDialogProps {
  open: boolean;
  table: DataTableDto | null;
  onOpenChange: (next: boolean) => void;
  onSubmit: (payload: { name: string; description: string | null }) => void | Promise<void>;
  isSubmitting: boolean;
}

function RenameTableDialog({ open, table, onOpenChange, onSubmit, isSubmitting }: RenameTableDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && table) {
      setName(table.name ?? "");
      setDescription(table.description ?? "");
    }
  }, [open, table?.name, table?.description, table]);

  if (!mounted || !open || !table) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim() ? description.trim() : null
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4 backdrop-blur">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text">Rename table</h3>
          <p className="text-sm text-muted-foreground">
            Update the table name and description to help your team identify it.
          </p>
        </div>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text" htmlFor="table-name">
              Table name
            </label>
            <Input
              id="table-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Growth experiments"
              autoFocus
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text" htmlFor="table-description">
              Description (optional)
            </label>
            <textarea
              id="table-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a short summary for your teammates"
              className="min-h-[96px] w-full rounded-2xl border border-border/60 bg-card/80 px-3 py-2 text-sm text-text shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
