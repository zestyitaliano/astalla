"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ImportCsvModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onSubmit: (file: File) => Promise<void> | void;
  isSubmitting?: boolean;
  summary?: { createdColumns: number; createdRows: number } | null;
}

export function ImportCsvModal({ open, onOpenChange, onSubmit, isSubmitting, summary }: ImportCsvModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      return;
    }
    await onSubmit(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card/95 p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary/10">
            <UploadCloud className="h-5 w-5 text-brand-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Import CSV</h2>
            <p className="text-sm text-muted-foreground">
              Upload a CSV file. Headers will be matched to existing columns and new columns will be created as needed.
            </p>
          </div>
        </div>
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-6 text-center">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              id="table-import-input"
              onChange={(event) => {
                const target = event.target;
                const nextFile = target.files?.[0];
                setFile(nextFile ?? null);
              }}
            />
            <label htmlFor="table-import-input" className="cursor-pointer text-sm font-medium text-brand-primary hover:underline">
              {file ? file.name : "Choose a CSV file"}
            </label>
            <p className="mt-2 text-xs text-muted-foreground">UTF-8 encoded files work best.</p>
          </div>
          {summary ? (
            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 text-sm text-foreground">
              Imported {summary.createdRows} rows and {summary.createdColumns} new columns.
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || isSubmitting} className="gap-2">
              {isSubmitting ? "Importing…" : "Start import"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
