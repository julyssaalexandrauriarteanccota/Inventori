"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Check,
  CreditCard,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  useCreateMetodoPago,
  useDeleteMetodoPago,
  useMetodosPago,
  useUpdateMetodoPago,
} from "@/hooks/use-configuracion";
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SettingsDataTable,
  type ColumnDef,
} from "@/components/settings/settings-data-table";

const metodoPagoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .max(30, "Máximo 30 caracteres"),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(80, "Máximo 80 caracteres"),
  activo: z.boolean().optional(),
});

type MetodoPagoForm = z.infer<typeof metodoPagoSchema>;

type MetodoPagoItem = {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
};

function normalizeCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

export function MetodosPagoSettingsContent() {
  const { data, isLoading } = useMetodosPago();
  const createMutation = useCreateMetodoPago();
  const deleteMutation = useDeleteMetodoPago();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<MetodoPagoItem | null>(null);
  const [viewingItem, setViewingItem] = useState<MetodoPagoItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MetodoPagoItem | null>(null);

  const metodosPago = useMemo(
    () => data?.data ?? [],
    [data],
  ) as MetodoPagoItem[];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return metodosPago;
    return metodosPago.filter(
      (item) =>
        item.nombre.toLowerCase().includes(term) ||
        item.codigo.toLowerCase().includes(term),
    );
  }, [metodosPago, search]);

  const columns = useMemo<ColumnDef<MetodoPagoItem, unknown>[]>(
    () => [
      {
        accessorKey: "codigo",
        header: "Código",
        size: 150,
        cell: ({ row }) => (
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {row.original.codigo}
          </span>
        ),
      },
      {
        accessorKey: "nombre",
        header: "Nombre",
        size: 260,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="size-4" />
            </div>
            <span className="truncate font-medium text-foreground">
              {row.original.nombre}
            </span>
          </div>
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
          <MetodoPagoRowActions
            metodo={row.original}
            onEdit={() => setEditingItem(row.original)}
            onDelete={() => setDeleteTarget(row.original)}
          />
        ),
      },
    ],
    [],
  );

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Método de pago eliminado");
        setDeleteTarget(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || "No se pudo eliminar el método de pago");
      },
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">
              Métodos de pago
            </h2>
            <p className="text-xs text-muted-foreground">
              Gestiona las opciones disponibles para ventas y cobros.
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="size-4" />
            Nuevo método
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="rounded-xl pl-9"
          />
        </div>

        <SettingsDataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={search ? "Sin coincidencias" : "Sin métodos de pago"}
          emptyDescription={
            search
              ? "Prueba otro término de búsqueda."
              : "Crea el primero para habilitarlo en ventas."
          }
          storageKey="settings:metodos-pago:columns"
        />
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo método de pago</DialogTitle>
            <DialogDescription>
              Completa los campos para agregar un nuevo método.
            </DialogDescription>
          </DialogHeader>
          <MetodoPagoCreateFormContent
            mutation={createMutation}
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
            <DialogTitle>Editar método de pago</DialogTitle>
            <DialogDescription>
              Modifica los datos del método de pago.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <MetodoPagoEditFormContent
              metodo={editingItem}
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
            <DialogTitle>Detalle de método de pago</DialogTitle>
            <DialogDescription>
              Información del método seleccionado.
            </DialogDescription>
          </DialogHeader>
          {viewingItem ? (
            <MetodoPagoDetailsContent metodo={viewingItem} />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
          <AlertDialogCancel
            variant="ghost"
            size="icon"
            onClick={() => setDeleteTarget(null)}
            className="absolute right-4 top-4 mt-0 size-6 border-0 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </div>
            <div className="text-left">
              <AlertDialogTitle className="text-xl">
                ¿Eliminar método de pago?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {deleteTarget ? (
                  <>
                    Se eliminará <strong>{deleteTarget.nombre}</strong>. Si ya
                    fue usado en ventas o caja, el sistema te pedirá dejarlo
                    inactivo.
                  </>
                ) : null}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 w-full rounded-xl sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MetodoPagoDetailsContent({ metodo }: { metodo: MetodoPagoItem }) {
  const rows = [
    { label: "Nombre", value: metodo.nombre },
    { label: "Código", value: metodo.codigo },
    { label: "Estado", value: metodo.activo ? "Activo" : "Inactivo" },
    { label: "ID", value: metodo.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CreditCard className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {metodo.nombre}
          </h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {metodo.codigo}
          </p>
        </div>
        <Badge variant={metodo.activo ? "default" : "outline"}>
          {metodo.activo ? "Activo" : "Inactivo"}
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

function MetodoPagoRowActions({
  metodo,
  onEdit,
  onDelete,
}: {
  metodo: MetodoPagoItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const updateMutation = useUpdateMetodoPago(metodo.id);

  const toggleActivo = () => {
    updateMutation.mutate(
      { activo: !metodo.activo },
      {
        onSuccess: () => {
          toast.success(
            metodo.activo
              ? "Método de pago desactivado"
              : "Método de pago activado",
          );
        },
        onError: (err: Error) => {
          toast.error(err.message || "No se pudo actualizar el método de pago");
        },
      },
    );
  };

  return (
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
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleActivo}>
            <Check className="size-4" />
            {metodo.activo ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MetodoPagoCreateFormContent({
  mutation,
  onCancel,
  onSuccess,
}: {
  mutation: ReturnType<typeof useCreateMetodoPago>;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MetodoPagoForm>({
    resolver: zodResolver(metodoPagoSchema),
    defaultValues: { codigo: "", nombre: "", activo: true },
  });

  const activo = watch("activo") ?? true;

  const onSubmit = (values: MetodoPagoForm) => {
    mutation.mutate(
      { ...values, codigo: normalizeCode(values.codigo) },
      {
        onSuccess: () => {
          toast.success("Método de pago creado");
          onSuccess();
        },
        onError: (err: Error) => {
          toast.error(err.message || "No se pudo crear el método de pago");
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
          <Field data-invalid={errors.codigo ? true : undefined}>
            <FieldLabel>Código *</FieldLabel>
            <Input
              {...register("codigo")}
              placeholder="EFECTIVO"
              autoFocus
              onBlur={(e) =>
                setValue("codigo", normalizeCode(e.target.value), {
                  shouldDirty: true,
                })
              }
            />
            <FieldError>{errors.codigo?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input {...register("nombre")} placeholder="Efectivo" />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>
        </div>

        <Field orientation="horizontal" className="self-start">
          <FieldLabel>Activo</FieldLabel>
          <Switch
            checked={activo}
            onCheckedChange={(value) => setValue("activo", value)}
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
            disabled={mutation.isPending}
            className="rounded-xl"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Crear método
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function MetodoPagoEditFormContent({
  metodo,
  onDone,
}: {
  metodo: MetodoPagoItem;
  onDone: () => void;
}) {
  const updateMutation = useUpdateMetodoPago(metodo.id);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MetodoPagoForm>({
    resolver: zodResolver(metodoPagoSchema),
    defaultValues: {
      codigo: metodo.codigo,
      nombre: metodo.nombre,
      activo: metodo.activo,
    },
  });

  const activo = watch("activo") ?? true;

  const onSubmit = (values: MetodoPagoForm) => {
    updateMutation.mutate(
      { ...values, codigo: normalizeCode(values.codigo) },
      {
        onSuccess: () => {
          toast.success("Método de pago actualizado");
          onDone();
        },
        onError: (err: Error) => {
          toast.error(err.message || "No se pudo actualizar el método de pago");
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
          <Field data-invalid={errors.codigo ? true : undefined}>
            <FieldLabel>Código *</FieldLabel>
            <Input
              {...register("codigo")}
              placeholder="EFECTIVO"
              autoFocus
              onBlur={(e) =>
                setValue("codigo", normalizeCode(e.target.value), {
                  shouldDirty: true,
                })
              }
            />
            <FieldError>{errors.codigo?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input {...register("nombre")} placeholder="Efectivo" />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>
        </div>

        <Field orientation="horizontal" className="self-start">
          <FieldLabel>Activo</FieldLabel>
          <Switch
            checked={activo}
            onCheckedChange={(value) => setValue("activo", value)}
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
            Guardar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
