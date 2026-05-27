"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Inbox,
  RefreshCcw,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface ServerDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  total: number;
  page: number;
  limit: number;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  emptyDescription?: string;
  enableRowSelection?: boolean;
  bulkActionsBar?: (
    selectedRows: TData[],
    clearSelection: () => void,
  ) => React.ReactNode;
  enableColumnVisibility?: boolean;
  columnVisibilityStorageKey?: string;
  enableColumnResizing?: boolean;
  fillAvailableHeight?: boolean;
}

function getDefaultColumnVisibility<TData, TValue>(
  columns: ColumnDef<TData, TValue>[],
) {
  return columns.reduce<VisibilityState>((visibility, column) => {
    const meta = column.meta as { defaultHidden?: boolean } | undefined;
    if (!meta?.defaultHidden) {
      return visibility;
    }

    const columnId =
      column.id ??
      ("accessorKey" in column && column.accessorKey
        ? String(column.accessorKey)
        : undefined);

    if (columnId) {
      visibility[columnId] = false;
    }

    return visibility;
  }, {});
}

function DataTableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
        <div className="border-b border-border/50 bg-muted/30 px-4 py-3.5">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4" />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, row) => (
          <div
            key={row}
            className="border-b border-border/45 px-4 py-3.5 last:border-0"
          >
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, col) => (
                <Skeleton key={col} className="h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServerDataTable<TData, TValue>({
  columns,
  data,
  total,
  page,
  limit,
  isLoading = false,
  isError = false,
  errorMessage = "No se pudo cargar la informacion.",
  onRetry,
  onPageChange,
  onLimitChange,
  pageSizeOptions,
  emptyMessage = "Sin resultados",
  emptyDescription = "No se encontraron registros para mostrar.",
  enableRowSelection = false,
  bulkActionsBar,
  enableColumnVisibility = false,
  columnVisibilityStorageKey,
  enableColumnResizing = false,
  fillAvailableHeight = true,
}: ServerDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const hasLoadedColumnVisibility = useRef(false);

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  const allColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!enableRowSelection) return columns;

    const selectionCol: ColumnDef<TData, TValue> = {
      id: "__select__",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
          className="translate-y-px"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
          className="translate-y-px"
          onClick={(event) => event.stopPropagation()}
        />
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false,
    };

    return [selectionCol, ...columns];
  }, [columns, enableRowSelection]);

  const defaultColumnVisibility = useMemo(
    () => getDefaultColumnVisibility(allColumns),
    [allColumns],
  );

  useEffect(() => {
    if (hasLoadedColumnVisibility.current) {
      return;
    }

    let nextVisibility = defaultColumnVisibility;

    if (columnVisibilityStorageKey) {
      try {
        const storedVisibility = window.localStorage.getItem(
          columnVisibilityStorageKey,
        );
        if (storedVisibility) {
          nextVisibility = {
            ...defaultColumnVisibility,
            ...(JSON.parse(storedVisibility) as VisibilityState),
          };
        }
      } catch {
        nextVisibility = defaultColumnVisibility;
      }
    }

    setColumnVisibility(nextVisibility);
    hasLoadedColumnVisibility.current = true;
  }, [columnVisibilityStorageKey, defaultColumnVisibility]);

  useEffect(() => {
    if (!columnVisibilityStorageKey || !hasLoadedColumnVisibility.current) {
      return;
    }

    window.localStorage.setItem(
      columnVisibilityStorageKey,
      JSON.stringify(columnVisibility),
    );
  }, [columnVisibility, columnVisibilityStorageKey]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      rowSelection: enableRowSelection ? rowSelection : {},
      columnVisibility,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount,
    enableRowSelection,
    ...(enableColumnResizing && {
      columnResizeMode: "onChange" as const,
      enableColumnResizing: true,
    }),
  });

  useEffect(() => {
    if (!enableRowSelection) {
      setRowSelection({});
    }
  }, [enableRowSelection]);

  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);
  const clearSelection = () => setRowSelection({});

  const handlePageChange = (nextPage: number) => {
    clearSelection();
    onPageChange(nextPage);
  };

  const handleLimitChange = (nextLimit: number) => {
    clearSelection();
    onLimitChange?.(nextLimit);
  };

  const paginationItems = useMemo<(number | "ellipsis")[]>(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    const items: (number | "ellipsis")[] = [1];
    const windowStart = Math.max(2, page - 1);
    const windowEnd = Math.min(pageCount - 1, page + 1);

    if (windowStart > 2) {
      items.push("ellipsis");
    }

    for (
      let currentPage = windowStart;
      currentPage <= windowEnd;
      currentPage += 1
    ) {
      items.push(currentPage);
    }

    if (windowEnd < pageCount - 1) {
      items.push("ellipsis");
    }

    items.push(pageCount);
    return items;
  }, [page, pageCount]);

  if (isLoading) {
    return <DataTableSkeleton columns={allColumns.length} />;
  }

  const toggleableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanHide() && column.id !== "__select__");

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-col gap-3",
        fillAvailableHeight && "flex-1",
      )}
    >
      {enableRowSelection && selectedRows.length > 0 && bulkActionsBar && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border/60 bg-card/94 px-2 py-1.5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.52)] ring-1 ring-black/5 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center gap-1.5 px-1 sm:px-2 py-0.5">
            <div className="flex size-6 min-w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {selectedRows.length}
            </div>
            <span className="whitespace-nowrap text-sm font-medium hidden sm:inline">
              seleccionado{selectedRows.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="mx-0.5 h-5 w-px bg-border" />
          {bulkActionsBar(selectedRows, clearSelection)}
          <div className="mx-0.5 h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={clearSelection}
            title="Cancelar"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      <div
        className={cn(
          "flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm shadow-[0_14px_34px_-34px_rgba(15,23,42,0.42)]",
          fillAvailableHeight && "flex-1",
        )}
      >
        <div
          className={cn(
            "w-full min-w-0 overflow-x-auto",
            fillAvailableHeight && "flex-1 overflow-y-auto",
          )}
        >
          <table
            className="w-full text-sm"
            style={
              enableColumnResizing
                ? { width: `max(100%, ${table.getCenterTotalSize()}px)` }
                : undefined
            }
          >
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-border/40 bg-muted/30 backdrop-blur-sm"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="relative whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80 border-r border-border/10 last:border-r-0"
                      style={
                        enableColumnResizing
                          ? { width: header.getSize() }
                          : header.column.columnDef.size
                            ? { width: header.column.columnDef.size }
                            : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <>
                          <div
                            className={
                              header.column.getCanSort()
                                ? "flex cursor-pointer select-none items-center gap-1.5 transition-colors hover:text-foreground/90"
                                : ""
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getCanSort() ? (
                                <ArrowUpDown className="size-3.5 opacity-60 text-muted-foreground" />
                            ) : null}
                          </div>
                          {enableColumnResizing &&
                            header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className={cn(
                                  "absolute right-0 top-0 z-10 h-full w-0.75 cursor-col-resize select-none touch-none",
                                  "bg-border opacity-0 transition-opacity hover:opacity-100",
                                  header.column.getIsResizing() &&
                                    "bg-primary opacity-100",
                                )}
                              />
                            )}
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isError ? (
                <tr>
                  <td colSpan={allColumns.length} className="px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                      <AlertTriangle className="size-10 text-destructive/70" />
                      <div className="flex flex-col gap-1">
                        <p className="font-medium text-foreground">
                          No se pudo cargar la informacion
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {errorMessage}
                        </p>
                      </div>
                      {onRetry ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={onRetry}
                          className="rounded-lg"
                        >
                          <RefreshCcw data-icon="inline-start" />
                          Reintentar
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    data-selected={row.getIsSelected()}
                    className={cn(
                      "border-b border-border/30 dark:border-border/20 transition-colors duration-200 last:border-0",
                      idx % 2 === 0 ? "bg-card" : "bg-muted/5 dark:bg-muted/10",
                      "hover:bg-muted/12 dark:hover:bg-muted/20 data-[selected=true]:bg-primary/[0.04] dark:data-[selected=true]:bg-primary/[0.08]",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2.5 align-middle text-foreground/90 border-r border-border/5 last:border-r-0"
                        style={
                          enableColumnResizing
                            ? { width: cell.column.getSize() }
                            : cell.column.columnDef.size
                              ? { width: cell.column.columnDef.size }
                              : undefined
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={allColumns.length} className="px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 py-20">
                      <Inbox className="size-10 text-muted-foreground/30" />
                      <p className="font-medium text-muted-foreground">
                        {emptyMessage}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {emptyDescription}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(total > 0 || onLimitChange) && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/75 backdrop-blur-sm px-4 py-3 shadow-[0_12px_24px_-34px_rgba(15,23,42,0.38)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {onLimitChange && pageSizeOptions?.length ? (
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  Filas por pagina
                </span>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => handleLimitChange(Number(value))}
                >
                  <SelectTrigger className="h-8 min-w-22 rounded-md border-border/80 bg-muted/55 text-xs shadow-none hover:bg-muted/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {pageSizeOptions.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {rangeStart}-{rangeEnd} de {total} registro
              {total !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {enableColumnVisibility && toggleableColumns.length > 0 && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-md border-border/80 bg-muted/55 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
                    >
                      <Columns3 className="size-3.5" />
                      Columnas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {toggleableColumns.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="text-xs capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {typeof column.columnDef.header === "string"
                          ? column.columnDef.header
                          : column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {pageCount > 1 && <div className="h-5 w-px bg-border" />}
              </>
            )}

            {pageCount > 1 ? (
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={page <= 1}
                  className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95"
                  title="Primera pagina"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95"
                >
                  <ChevronLeft className="size-3.5" />
                  Anterior
                </Button>
                {paginationItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={item}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(item)}
                      className={cn(
                        "h-8 w-8 rounded-md border-border/80 px-0 text-xs shadow-none transition-all duration-150 active:scale-95",
                        item === page
                          ? "border-primary/20 bg-primary/10 text-foreground pointer-events-none"
                          : "bg-muted/55 hover:bg-muted/80",
                      )}
                    >
                      {item}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pageCount}
                  className="h-8 gap-1 rounded-md border-border/80 bg-muted/55 px-2.5 text-xs hover:bg-muted/80 transition-all duration-150 active:scale-95"
                >
                  Siguiente
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pageCount)}
                  disabled={page >= pageCount}
                  className="h-8 rounded-md border-border/80 bg-muted/55 px-2 hover:bg-muted/80 transition-all duration-150 active:scale-95"
                  title="Ultima pagina"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export { type ColumnDef } from "@tanstack/react-table";
