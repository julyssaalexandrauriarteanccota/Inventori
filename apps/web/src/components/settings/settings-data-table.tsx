"use client";

import * as React from "react";

import {
  ServerDataTable,
  type ColumnDef,
} from "@/components/tables/ServerDataTable";
import { cn } from "@/lib/utils";

type SettingsDataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  storageKey: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
};

export function SettingsDataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage,
  emptyDescription,
  storageKey,
  pageSizeOptions = [10, 20, 50],
  defaultPageSize = 10,
}: SettingsDataTableProps<TData, TValue>) {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(defaultPageSize);

  React.useEffect(() => {
    setPage(1);
  }, [data.length, limit]);

  const pageCount = Math.max(1, Math.ceil(data.length / limit));
  const safePage = Math.min(page, pageCount);

  React.useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const pageData = React.useMemo(() => {
    const start = (safePage - 1) * limit;
    return data.slice(start, start + limit);
  }, [data, limit, safePage]);

  return (
    <div className="flex min-h-90 flex-1 flex-col">
      <ServerDataTable
        columns={columns}
        data={pageData}
        total={data.length}
        page={safePage}
        limit={limit}
        isLoading={isLoading}
        onPageChange={setPage}
        onLimitChange={setLimit}
        pageSizeOptions={pageSizeOptions}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        enableColumnVisibility
        enableColumnResizing
        columnVisibilityStorageKey={storageKey}
      />
    </div>
  );
}

export function SettingsStatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-3">{children}</div>;
}

export function SettingsStatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "active" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "active" && "text-primary",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export type { ColumnDef };
