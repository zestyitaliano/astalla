"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { useTables } from "@/lib/api/tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableGrid } from "@/components/tables/TableGrid";
import { TablesCreateModal } from "@/components/tables/TablesCreateModal";

interface TablesClientProps {
  canManage: boolean;
}

export function TablesClient({ canManage }: TablesClientProps) {
  const { data, isLoading } = useTables();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-white/80 p-4 shadow-card">
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
                          ? "border-brand-primary bg-brand-primary/10 text-brand-primary shadow-cardHover"
                          : "border-border/60 bg-white/80 text-foreground hover:border-brand-primary/50 hover:shadow-card"
                      }`}
                    >
                      <div className="font-medium">{table.name}</div>
                      {table.description ? (
                        <div className="text-xs text-muted-foreground">{table.description}</div>
                      ) : null}
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
            <TableGrid tableId={selectedTableId} />
          ) : (
            <div className="flex h-[480px] items-center justify-center rounded-3xl border border-dashed border-border/70 bg-white/80 p-10 text-center shadow-card">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Create a table to get started</h3>
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
    </div>
  );
}
