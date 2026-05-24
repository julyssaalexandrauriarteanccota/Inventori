"use client";

import * as React from "react";
import {
  Check,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Ruler,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  RolUsuario,
  sunatUnidadMedidaHelpText,
  type UnidadMedidaPayload,
  unidadMedidaFormSchema,
} from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import {
  type UnidadMedidaItem,
  useCreateUnidadMedida,
  useDeleteUnidadMedida,
  useUnidadesMedida,
  useUpdateUnidadMedida,
} from "@/hooks/use-productos";
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
  Field,
  FieldDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  SettingsDataTable,
  type ColumnDef,
} from "@/components/settings/settings-data-table";

type EstadoFiltro = "all" | "activos" | "inactivos";

export function UnidadesMedidaSettingsContent() {
  const { user } = useAuth();
  const canManage =
    user?.rol === RolUsuario.ADMIN || user?.rol === RolUsuario.ENCARGADO;
  const [estadoFiltro, setEstadoFiltro] = React.useState<EstadoFiltro>("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<UnidadMedidaItem | null>(
    null,
  );
  const [viewingItem, setViewingItem] = React.useState<UnidadMedidaItem | null>(
    null,
  );
  const [deleteItem, setDeleteItem] = React.useState<UnidadMedidaItem | null>(
    null,
  );

  const { data, isLoading } = useUnidadesMedida();
  const createMutation = useCreateUnidadMedida();
  const deleteMutation = useDeleteUnidadMedida();

  const todasUnidades = data?.data ?? [];
  const unidades = todasUnidades.filter((u) => {
    if (estadoFiltro === "activos") return u.activo;
    if (estadoFiltro === "inactivos") return !u.activo;
    return true;
  });

  const columns = React.useMemo<ColumnDef<UnidadMedidaItem, unknown>[]>(
    () => [
      {
        accessorKey: "codigo",
        header: "Código",
        size: 120,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase tracking-wider"
          >
            {row.original.codigo}
          </Badge>
        ),
      },
      {
        accessorKey: "nombre",
        header: "Nombre",
        size: 220,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ruler className="size-4" />
            </div>
            <span className="truncate font-medium text-foreground">
              {row.original.nombre}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "descripcion",
        header: "Descripción",
        size: 360,
        cell: ({ row }) => (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {row.original.descripcion ||
              "Unidad reutilizable en productos e inventario."}
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
            {row.original.activo ? "Activa" : "Inactiva"}
          </Badge>
        ),
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
        cell: ({ row }) =>
          canManage ? (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Acciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setEditingItem(row.original)}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteItem(row.original)}
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null,
      },
    ],
    [canManage],
  );

  const handleConfirmDelete = () => {
    if (!deleteItem) return;
    deleteMutation.mutate(deleteItem.id, {
      onSuccess: () => {
        toast.success("Unidad eliminada");
        setDeleteItem(null);
      },
      onError: (err: Error) =>
        toast.error(err.message || "Error al eliminar unidad"),
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-3 md:pr-8 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-foreground">
              Unidades de medida
            </h2>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Catálogo maestro de unidades reutilizables para productos e
              inventario.
            </p>
          </div>

          <Select
            value={estadoFiltro}
            onValueChange={(v) => setEstadoFiltro(v as EstadoFiltro)}
          >
            <SelectTrigger className="h-9 w-full rounded-xl lg:w-45">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="activos">Solo activas</SelectItem>
              <SelectItem value="inactivos">Solo inactivas</SelectItem>
            </SelectContent>
          </Select>

          {canManage && (
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="shrink-0 rounded-xl"
            >
              <Plus className="size-4" />
              Nueva unidad
            </Button>
          )}
        </div>

        <SettingsDataTable
          columns={columns}
          data={unidades}
          isLoading={isLoading}
          emptyMessage="Sin unidades"
          emptyDescription="Registra las unidades de medida que usarás en productos e inventario."
          storageKey="settings:unidades-medida:columns"
        />
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva unidad de medida</DialogTitle>
            <DialogDescription>
              Define el código y nombre de la unidad para usarla en productos e
              inventario.
            </DialogDescription>
          </DialogHeader>
          <UnidadCreateFormContent
            createMutation={createMutation}
            onSuccess={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar unidad de medida</DialogTitle>
            <DialogDescription>
              Modifica los datos de la unidad de medida.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <UnidadEditFormContent
              unidad={editingItem}
              onDone={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => {
          if (!open) setViewingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de unidad de medida</DialogTitle>
            <DialogDescription>
              Información de la unidad seleccionada.
            </DialogDescription>
          </DialogHeader>
          {viewingItem ? <UnidadDetailsContent unidad={viewingItem} /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent className="w-full rounded-2xl p-6 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar unidad de medida?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem
                ? `Se eliminará ${deleteItem.codigo} · ${deleteItem.nombre}. Esta acción no se puede deshacer.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function UnidadDetailsContent({ unidad }: { unidad: UnidadMedidaItem }) {
  const rows = [
    { label: "Código", value: unidad.codigo },
    { label: "Nombre", value: unidad.nombre },
    { label: "Descripción", value: unidad.descripcion || "—" },
    { label: "Estado", value: unidad.activo ? "Activa" : "Inactiva" },
    { label: "ID", value: unidad.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Ruler className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {unidad.nombre}
          </h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {unidad.codigo}
          </p>
        </div>
        <Badge variant={unidad.activo ? "default" : "outline"}>
          {unidad.activo ? "Activa" : "Inactiva"}
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

function UnidadCreateFormContent({
  createMutation,
  onSuccess,
  onCancel,
}: {
  createMutation: ReturnType<typeof useCreateUnidadMedida>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UnidadMedidaPayload>({
    resolver: zodResolver(unidadMedidaFormSchema),
    defaultValues: { codigo: "", nombre: "", descripcion: "", activo: true },
  });

  const activo = watch("activo");

  const onSubmit = (data: UnidadMedidaPayload) => {
    createMutation.mutate(
      {
        codigo: data.codigo.trim().toUpperCase(),
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || undefined,
        activo: data.activo ?? true,
      },
      {
        onSuccess: () => {
          toast.success("Unidad creada correctamente");
          onSuccess();
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al crear unidad"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
          <Field data-invalid={errors.codigo ? true : undefined}>
            <FieldLabel>Código *</FieldLabel>
            <Input
              {...register("codigo")}
              placeholder="NIU"
              autoFocus
              maxLength={16}
              className="font-mono uppercase"
            />
            <FieldDescription>{sunatUnidadMedidaHelpText()}</FieldDescription>
            <FieldError>{errors.codigo?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input
              {...register("nombre")}
              placeholder="Unidad"
              maxLength={80}
            />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>
        </div>

        <Field data-invalid={errors.descripcion ? true : undefined}>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea
            {...register("descripcion")}
            rows={2}
            maxLength={160}
            placeholder="Descripción opcional para identificar la unidad"
          />
          <FieldError>{errors.descripcion?.message}</FieldError>
        </Field>

        <Field orientation="horizontal" className="self-start">
          <FieldLabel>Activa</FieldLabel>
          <Switch
            checked={activo ?? true}
            onCheckedChange={(v) => setValue("activo", v)}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending}
            className="rounded-xl"
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Crear unidad
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function UnidadEditFormContent({
  unidad,
  onDone,
}: {
  unidad: UnidadMedidaItem;
  onDone: () => void;
}) {
  const updateMutation = useUpdateUnidadMedida(unidad.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UnidadMedidaPayload>({
    resolver: zodResolver(unidadMedidaFormSchema),
    defaultValues: {
      codigo: unidad.codigo,
      nombre: unidad.nombre,
      descripcion: unidad.descripcion ?? "",
      activo: unidad.activo,
    },
  });

  const activo = watch("activo");

  const onSubmit = (data: UnidadMedidaPayload) => {
    updateMutation.mutate(
      {
        codigo: data.codigo.trim().toUpperCase(),
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || undefined,
        activo: data.activo ?? true,
      },
      {
        onSuccess: () => {
          toast.success("Unidad actualizada");
          onDone();
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al actualizar unidad"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
          <Field data-invalid={errors.codigo ? true : undefined}>
            <FieldLabel>Código *</FieldLabel>
            <Input
              {...register("codigo")}
              maxLength={16}
              autoFocus
              className="font-mono uppercase"
            />
            <FieldDescription>{sunatUnidadMedidaHelpText()}</FieldDescription>
            <FieldError>{errors.codigo?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input {...register("nombre")} maxLength={80} />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>
        </div>

        <Field data-invalid={errors.descripcion ? true : undefined}>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea {...register("descripcion")} rows={2} maxLength={160} />
          <FieldError>{errors.descripcion?.message}</FieldError>
        </Field>

        <Field orientation="horizontal" className="self-start">
          <FieldLabel>Activa</FieldLabel>
          <Switch
            checked={activo ?? true}
            onCheckedChange={(v) => setValue("activo", v)}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDone}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={updateMutation.isPending}
            className="rounded-xl"
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
