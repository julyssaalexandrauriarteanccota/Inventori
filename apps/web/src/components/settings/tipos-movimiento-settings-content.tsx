"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  AlertTriangle,
  ArrowRightLeft,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  BASE_TIPOS_MOVIMIENTO,
  BASE_TIPOS_MOVIMIENTO_BY_CODE,
  MovimientoComportamiento,
  createTipoMovimientoConfigSchema,
  type CreateTipoMovimientoConfigPayload,
  type TipoMovimientoConfigListItem,
  type UpdateTipoMovimientoConfigPayload,
} from "@erp/shared";

import {
  useCreateTipoMovimientoConfig,
  useDeleteTipoMovimientoConfig,
  useTiposMovimientoConfig,
  useUpdateTipoMovimientoConfig,
} from "@/hooks/use-configuracion";
import { getTiposMovimientoConfig } from "@/lib/tipos-movimiento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  SettingsDataTable,
  type ColumnDef,
} from "@/components/settings/settings-data-table";

const COMPORTAMIENTO_LABELS: Record<MovimientoComportamiento, string> = {
  [MovimientoComportamiento.ENTRADA]: "Entrada",
  [MovimientoComportamiento.SALIDA]: "Salida",
  [MovimientoComportamiento.TRANSFERENCIA]: "Transferencia",
};

type TipoMovimientoFormValues = CreateTipoMovimientoConfigPayload;
type EstadoFiltro = "all" | "activos" | "inactivos";

function getBaseDefaults(item: TipoMovimientoConfigListItem) {
  return BASE_TIPOS_MOVIMIENTO_BY_CODE[
    item.codigo as keyof typeof BASE_TIPOS_MOVIMIENTO_BY_CODE
  ];
}

function TipoMovimientoDetailsContent({
  item,
}: {
  item: TipoMovimientoConfigListItem;
}) {
  const isBase = !!getBaseDefaults(item);
  const rows = [
    { label: "Nombre visible", value: item.nombre },
    { label: "Código interno", value: item.codigo },
    { label: "Origen", value: isBase ? "Base" : "Personalizado" },
    {
      label: "Comportamiento",
      value: COMPORTAMIENTO_LABELS[item.comportamiento],
    },
    { label: "Orden", value: String(item.orden) },
    { label: "Estado", value: item.activo ? "Activo" : "Inactivo" },
    {
      label: "Requiere justificación",
      value: item.requiereJustificacion ? "Sí" : "No",
    },
    {
      label: "Requiere evidencia",
      value: item.requiereEvidencia ? "Sí" : "No",
    },
    {
      label: "Disponible para técnico",
      value: item.disponibleTecnico ? "Sí" : "No",
    },
    { label: "ID", value: item.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ArrowRightLeft className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {item.nombre}
          </h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {item.codigo}
          </p>
        </div>
        <Badge variant={item.activo ? "default" : "outline"}>
          {item.activo ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-border/50 bg-background/60 px-3 py-2"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {row.label}
            </p>
            <p className="mt-1 wrap-break-word text-sm text-foreground">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TipoMovimientoRowActions({
  item,
  onEdit,
  onDelete,
}: {
  item: TipoMovimientoConfigListItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const updateMutation = useUpdateTipoMovimientoConfig(item.id);
  const isBase = !!getBaseDefaults(item);

  const handleQuickUpdate = useCallback(
    (values: UpdateTipoMovimientoConfigPayload, successMessage: string) => {
      updateMutation.mutate(values, {
        onSuccess: () => toast.success(successMessage),
        onError: (err: Error) =>
          toast.error(
            err.message || "Error al actualizar el tipo de movimiento",
          ),
      });
    },
    [updateMutation],
  );

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handleQuickUpdate(
                { activo: !item.activo },
                item.activo
                  ? "Tipo de movimiento desactivado"
                  : "Tipo de movimiento activado",
              )
            }
          >
            <ArrowRightLeft className="size-4" />
            {item.activo ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
          {isBase ? (
            <DropdownMenuItem
              onClick={() => {
                const base = getBaseDefaults(item);
                if (!base) return;
                const baseIndex = BASE_TIPOS_MOVIMIENTO.findIndex(
                  (config) => config.codigo === item.codigo,
                );

                handleQuickUpdate(
                  {
                    nombre: base.nombre,
                    orden: baseIndex >= 0 ? baseIndex + 1 : item.orden,
                    activo: true,
                    comportamiento: base.comportamiento,
                    requiereJustificacion: base.requiereJustificacion,
                    requiereEvidencia: base.requiereEvidencia,
                    disponibleTecnico: base.disponibleTecnico,
                  },
                  "Tipo de movimiento restablecido",
                );
              }}
            >
              <RotateCcw className="size-4" />
              Restablecer
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function TiposMovimientoSettingsContent() {
  const { data, isLoading } = useTiposMovimientoConfig();
  const createMutation = useCreateTipoMovimientoConfig();
  const deleteMutation = useDeleteTipoMovimientoConfig();
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("all");
  const [editItem, setEditItem] = useState<TipoMovimientoConfigListItem | null>(
    null,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewingItem, setViewingItem] =
    useState<TipoMovimientoConfigListItem | null>(null);
  const [deleteItem, setDeleteItem] =
    useState<TipoMovimientoConfigListItem | null>(null);
  const updateMutation = useUpdateTipoMovimientoConfig(editItem?.id ?? "");

  const items = useMemo(
    () => getTiposMovimientoConfig(data?.data),
    [data?.data],
  );
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (estadoFiltro === "activos") return item.activo;
        if (estadoFiltro === "inactivos") return !item.activo;
        return true;
      }),
    [estadoFiltro, items],
  );

  const columns = useMemo<ColumnDef<TipoMovimientoConfigListItem, unknown>[]>(
    () => [
      {
        id: "origen",
        header: "Origen",
        size: 120,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px]">
            {getBaseDefaults(row.original) ? "Base" : "Personalizado"}
          </Badge>
        ),
      },
      {
        accessorKey: "nombre",
        header: "Nombre visible",
        size: 280,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowRightLeft className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="block truncate font-medium text-foreground">
                {row.original.nombre}
              </span>
              <span className="block truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {row.original.codigo}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "comportamiento",
        header: "Comportamiento",
        size: 180,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {COMPORTAMIENTO_LABELS[row.original.comportamiento]}
          </span>
        ),
      },
      {
        accessorKey: "orden",
        header: "Orden",
        size: 90,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.orden}
          </span>
        ),
      },
      {
        accessorKey: "activo",
        header: "Estado",
        size: 110,
        cell: ({ row }) => (
          <Badge
            variant={row.original.activo ? "default" : "outline"}
            className="text-[10px]"
          >
            {row.original.activo ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        id: "flags",
        header: "Reglas",
        size: 220,
        enableSorting: false,
        cell: ({ row }) => {
          const flags = [
            row.original.requiereJustificacion ? "Justificación" : null,
            row.original.requiereEvidencia ? "Evidencia" : null,
            row.original.disponibleTecnico ? "Técnico" : null,
          ].filter(Boolean);

          return flags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {flags.map((flag) => (
                <Badge key={flag} variant="secondary" className="text-[10px]">
                  {flag}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sin reglas</span>
          );
        },
      },
      {
        id: "details",
        header: "Detalle",
        size: 90,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg px-2 text-xs"
            onClick={() => setViewingItem(row.original)}
          >
            <Eye className="size-3.5" />
            Ver
          </Button>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        size: 90,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <TipoMovimientoRowActions
            item={row.original}
            onEdit={() => {
              setShowCreateForm(false);
              setEditItem(row.original);
            }}
            onDelete={() => setDeleteItem(row.original)}
          />
        ),
      },
    ],
    [],
  );

  const form = useForm<TipoMovimientoFormValues>({
    resolver: zodResolver(createTipoMovimientoConfigSchema),
    defaultValues: {
      nombre: "",
      comportamiento: MovimientoComportamiento.SALIDA,
      orden: items.length + 1,
      activo: true,
      requiereJustificacion: false,
      requiereEvidencia: false,
      disponibleTecnico: false,
    },
  });

  useEffect(() => {
    if (editItem) {
      form.reset({
        nombre: editItem.nombre,
        comportamiento: editItem.comportamiento,
        orden: editItem.orden,
        activo: editItem.activo,
        requiereJustificacion: editItem.requiereJustificacion,
        requiereEvidencia: editItem.requiereEvidencia,
        disponibleTecnico: editItem.disponibleTecnico,
      });
      return;
    }

    form.reset({
      nombre: "",
      comportamiento: MovimientoComportamiento.SALIDA,
      orden: items.length + 1,
      activo: true,
      requiereJustificacion: false,
      requiereEvidencia: false,
      disponibleTecnico: false,
    });
  }, [editItem, form, items.length, showCreateForm]);

  const isBaseEditing = editItem ? !!getBaseDefaults(editItem) : false;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const dialogOpen = showCreateForm || !!editItem;

  const handleSubmit = useCallback(
    (values: TipoMovimientoFormValues) => {
      const payload = {
        nombre: values.nombre.trim(),
        comportamiento: values.comportamiento,
        orden: values.orden,
        activo: values.activo ?? true,
        requiereJustificacion: values.requiereJustificacion ?? false,
        requiereEvidencia: values.requiereEvidencia ?? false,
        disponibleTecnico: values.disponibleTecnico ?? false,
      };

      const options = {
        onSuccess: () => {
          toast.success(
            editItem
              ? "Tipo de movimiento actualizado"
              : "Tipo de movimiento creado",
          );
          setEditItem(null);
          setShowCreateForm(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Error al guardar el tipo de movimiento");
        },
      };

      if (editItem) {
        updateMutation.mutate(
          payload as UpdateTipoMovimientoConfigPayload,
          options,
        );
        return;
      }

      createMutation.mutate(payload, options);
    },
    [createMutation, editItem, updateMutation],
  );

  const handleDelete = useCallback(() => {
    if (!deleteItem) return;
    deleteMutation.mutate(deleteItem.id, {
      onSuccess: () => {
        toast.success("Tipo de movimiento eliminado");
        if (editItem?.id === deleteItem.id) setEditItem(null);
        setDeleteItem(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || "Error al eliminar el tipo de movimiento");
      },
    });
  }, [deleteItem, deleteMutation, editItem?.id]);

  const comportamiento = form.watch("comportamiento");
  const requiereEvidencia = form.watch("requiereEvidencia") ?? false;

  useEffect(() => {
    if (
      comportamiento !== MovimientoComportamiento.SALIDA &&
      requiereEvidencia
    ) {
      form.setValue("requiereEvidencia", false);
    }
  }, [comportamiento, form, requiereEvidencia]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-3 md:pr-8 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-foreground">
              Tipos de movimiento
            </h2>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Crea tipos nuevos y ajusta el comportamiento de inventario sin
              escribir IDs.
            </p>
          </div>

          <Select
            value={estadoFiltro}
            onValueChange={(value) => setEstadoFiltro(value as EstadoFiltro)}
          >
            <SelectTrigger className="h-9 w-full rounded-xl lg:w-45">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="activos">Solo activos</SelectItem>
              <SelectItem value="inactivos">Solo inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SettingsDataTable
          columns={columns}
          data={filteredItems}
          isLoading={isLoading}
          emptyMessage="Sin tipos configurados"
          emptyDescription="Aplica la migración o crea un tipo personalizado para ajustar los movimientos de inventario."
          storageKey="settings:tipos-movimiento:columns"
        />
      </div>

      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => {
          if (!open) setViewingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de tipo de movimiento</DialogTitle>
            <DialogDescription>
              Información del tipo seleccionado.
            </DialogDescription>
          </DialogHeader>
          {viewingItem ? (
            <TipoMovimientoDetailsContent item={viewingItem} />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
            setShowCreateForm(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <DialogTitle>
                  {editItem
                    ? "Editar tipo de movimiento"
                    : "Nuevo tipo de movimiento"}
                </DialogTitle>
                <DialogDescription>
                  {editItem
                    ? `Editando: ${editItem.nombre}${isBaseEditing ? " (Base)" : " (Personalizado)"}`
                    : "El código interno y el ID se generan automáticamente."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            <FieldGroup>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_120px]">
                <Field
                  data-invalid={form.formState.errors.nombre ? true : undefined}
                >
                  <FieldLabel>Nombre visible *</FieldLabel>
                  <Input
                    placeholder="Reubicación por conteo"
                    {...form.register("nombre")}
                  />
                  <FieldError>
                    {form.formState.errors.nombre?.message}
                  </FieldError>
                </Field>

                <Field
                  data-invalid={
                    form.formState.errors.comportamiento ? true : undefined
                  }
                >
                  <FieldLabel>Comportamiento *</FieldLabel>
                  <Select
                    value={form.watch("comportamiento")}
                    onValueChange={(value) =>
                      form.setValue(
                        "comportamiento",
                        value as MovimientoComportamiento,
                        {
                          shouldValidate: true,
                        },
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona comportamiento" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(MovimientoComportamiento).map((value) => (
                        <SelectItem key={value} value={value}>
                          {COMPORTAMIENTO_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>
                    {form.formState.errors.comportamiento?.message}
                  </FieldError>
                </Field>

                <Field
                  data-invalid={form.formState.errors.orden ? true : undefined}
                >
                  <FieldLabel>Orden *</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    {...form.register("orden", { valueAsNumber: true })}
                  />
                  <FieldError>
                    {form.formState.errors.orden?.message}
                  </FieldError>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field orientation="horizontal">
                  <FieldLabel>Activo</FieldLabel>
                  <Switch
                    checked={form.watch("activo") ?? true}
                    onCheckedChange={(v) => form.setValue("activo", v)}
                  />
                </Field>

                <Field orientation="horizontal">
                  <FieldLabel>Requiere justificación</FieldLabel>
                  <Switch
                    checked={form.watch("requiereJustificacion") ?? false}
                    onCheckedChange={(v) =>
                      form.setValue("requiereJustificacion", v)
                    }
                  />
                </Field>

                <Field
                  orientation="horizontal"
                  data-disabled={
                    comportamiento !== MovimientoComportamiento.SALIDA ||
                    undefined
                  }
                >
                  <FieldLabel>Requiere evidencia</FieldLabel>
                  <Switch
                    checked={form.watch("requiereEvidencia") ?? false}
                    disabled={
                      comportamiento !== MovimientoComportamiento.SALIDA
                    }
                    onCheckedChange={(v) =>
                      form.setValue("requiereEvidencia", v)
                    }
                  />
                </Field>

                <Field orientation="horizontal">
                  <FieldLabel>Disponible para técnico</FieldLabel>
                  <Switch
                    checked={form.watch("disponibleTecnico") ?? false}
                    onCheckedChange={(v) =>
                      form.setValue("disponibleTecnico", v)
                    }
                  />
                </Field>
              </div>
            </FieldGroup>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setEditItem(null);
                  setShowCreateForm(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="rounded-xl">
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                {editItem ? "Guardar cambios" : "Crear tipo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div className="space-y-1 text-left">
                <AlertDialogTitle>
                  ¿Eliminar tipo de movimiento?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteItem
                    ? `Se eliminará "${deleteItem.nombre}". El ID y el código interno seguirán siendo automáticos para los tipos nuevos.`
                    : "Esta acción no se puede deshacer."}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
