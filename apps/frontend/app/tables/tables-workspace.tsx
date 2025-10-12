import { TablesClient } from "./tables-client";

interface TablesWorkspaceProps {
  canManage: boolean;
}

export function TablesWorkspace({ canManage }: TablesWorkspaceProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-text">Tables workspace</h1>
            <p className="text-sm text-muted-foreground">
              Design collaborative grids for leasing, operations, and marketing workflows. Configure columns, views, and CSV
              flows without leaving the dashboard.
            </p>
          </div>
        </div>
      </div>
      <TablesClient canManage={canManage} />
    </div>
  );
}
