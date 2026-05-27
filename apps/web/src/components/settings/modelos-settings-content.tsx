"use client";

import * as React from "react";
import {
  Check,
  Eye,
  Layers,
  LifeBuoy,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Stamp,
  Trash2,
  Wrench,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RolUsuario, TipoProducto } from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import {
  type ModeloCatalogoItem,
  useCreateModeloCatalogo,
  useMarcas,
  useModelosCatalogo,
  useUpdateModeloCatalogo,
} from "@/hooks/use-productos";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { RealtimeStatus } from "@/components/layout/realtime-status";

const PRODUCTO_TIPO_LABELS: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Equipo",
  [TipoProducto.REPUESTO]: "Repuesto",
  [TipoProducto.INSUMO]: "Insumo",
  [TipoProducto.SERVICIO]: "Servicio",
  [TipoProducto.ACCESORIO]: "Accesorio",
};

type ProductTypeFilterValue = TipoProducto | "all";

function ProductTypeTabs({
  value,
  onChange,
}: {
  value: ProductTypeFilterValue;
  onChange: (value: ProductTypeFilterValue) => void;
}) {
  return (
    <div className="min-w-0 flex-1 overflow-x-auto">
      <Tabs
        value={value}
        onValueChange={(next) => onChange(next as ProductTypeFilterValue)}
      >
        <TabsList className="inline-flex h-auto min-w-max flex-nowrap gap-1 rounded-xl p-1">
          <TabsTrigger value="all" className="h-8 rounded-lg px-3 text-xs">
            Todos
          </TabsTrigger>
          {Object.values(TipoProducto).map((tipo) => (
            <TabsTrigger
              key={tipo}
              value={tipo}
              className="h-8 rounded-lg px-3 text-xs"
            >
              {PRODUCTO_TIPO_LABELS[tipo]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

const modeloSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  tipo: z.nativeEnum(TipoProducto),
  marcaId: z.string().nullable().optional(),
  activo: z.boolean().optional(),
});

type ModeloFormValues = z.infer<typeof modeloSchema>;

export function ModelosSettingsContent({
  onRequestDeleteAction,
}: {
  onRequestDeleteAction: (id: string) => void;
}) {
  const { user } = useAuth();
  const canManage =
    user?.rol === RolUsuario.ADMIN || user?.rol === RolUsuario.ENCARGADO;
  const [selectedTipo, setSelectedTipo] =
    React.useState<ProductTypeFilterValue>("all");
  const [selectedMarcaFilter, setSelectedMarcaFilter] =
    React.useState<string>("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingItem, setEditingItem] =
    React.useState<ModeloCatalogoItem | null>(null);
  const [viewingItem, setViewingItem] =
    React.useState<ModeloCatalogoItem | null>(null);

  const tipoFilter = selectedTipo === "all" ? undefined : selectedTipo;
  const { data: modelosRes, isLoading } = useModelosCatalogo({
    tipo: tipoFilter,
  });
  const { data: marcasRes } = useMarcas(tipoFilter);
  const createMutation = useCreateModeloCatalogo();

  const marcas = marcasRes?.data ?? [];
  const todosModelos = modelosRes?.data ?? [];
  const modelos = todosModelos.filter((modelo) =>
    selectedMarcaFilter === "all"
      ? true
      : selectedMarcaFilter === "none"
        ? !modelo.marca
        : modelo.marca?.id === selectedMarcaFilter,
  );

  const columns = React.useMemo<ColumnDef<ModeloCatalogoItem, unknown>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Nombre",
        size: 240,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/30 dark:bg-sky-600 dark:shadow-none">
              <Package className="size-4" />
            </div>
            <span className="truncate font-medium text-foreground">
              {row.original.nombre}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "marca",
        header: "Marca",
        size: 180,
        cell: ({ row }) =>
          row.original.marca ? (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Stamp className="size-3" />
              {row.original.marca.nombre}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              Sin marca
            </Badge>
          ),
      },
      {
        accessorKey: "descripcion",
        header: "Descripción",
        size: 340,
        cell: ({ row }) => (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {row.original.descripcion || "Modelo reutilizable para productos."}
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
                    onClick={() => onRequestDeleteAction(row.original.id)}
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
    [canManage, onRequestDeleteAction],
  );

  const countByTipo = React.useMemo(() => {
    const acc: Partial<Record<TipoProducto, number>> = {};
    for (const m of todosModelos) {
      acc[m.tipo] = (acc[m.tipo] ?? 0) + 1;
    }
    return acc;
  }, [todosModelos]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {canManage && (
          <TopbarActions>
            <RealtimeStatus />
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nuevo modelo</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </TopbarActions>
        )}

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={isLoading ? undefined : todosModelos.length}
            icon={Package}
            theme="sky"
            subtitle="Modelos catalogados"
            isLoading={isLoading}
          />
          <StatCard
            label="Equipos"
            value={isLoading ? undefined : countByTipo[TipoProducto.EQUIPO] ?? 0}
            icon={Layers}
            theme="indigo"
            subtitle="Para equipos"
            isLoading={isLoading}
          />
          <StatCard
            label="Repuestos"
            value={
              isLoading ? undefined : countByTipo[TipoProducto.REPUESTO] ?? 0
            }
            icon={Wrench}
            theme="amber"
            subtitle="Piezas e insumos"
            isLoading={isLoading}
          />
          <StatCard
            label="Servicios"
            value={
              isLoading ? undefined : countByTipo[TipoProducto.SERVICIO] ?? 0
            }
            icon={LifeBuoy}
            theme="emerald"
            subtitle="Soporte y mantenimiento"
            isLoading={isLoading}
          />
        </div>

        <div className="flex flex-col gap-3 md:pr-8">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">
              Modelos
            </h2>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Gestiona modelos reutilizables por tipo y marca para no
              escribirlos repetidos.
            </p>
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <ProductTypeTabs
              value={selectedTipo}
              onChange={(value) => {
                setSelectedTipo(value);
                setSelectedMarcaFilter("all");
                setShowCreate(false);
                setEditingItem(null);
                setViewingItem(null);
              }}
            />

            <Select
              value={selectedMarcaFilter}
              onValueChange={(v) => {
                setSelectedMarcaFilter(v);
                setEditingItem(null);
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-xl lg:w-55">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                <SelectItem value="none">Sin marca</SelectItem>
                {marcas.map((marca) => (
                  <SelectItem key={marca.id} value={marca.id}>
                    {marca.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SettingsDataTable
          columns={columns}
          data={modelos}
          isLoading={isLoading}
          emptyMessage="Sin modelos"
          emptyDescription={
            selectedTipo === "all"
              ? "Registra modelos y reutilízalos en productos del catálogo."
              : `Registra modelos para ${PRODUCTO_TIPO_LABELS[selectedTipo].toLowerCase()} y reutilízalos en productos.`
          }
          storageKey="settings:modelos:columns"
        />
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo modelo</DialogTitle>
            <DialogDescription>
              Selecciona el tipo y marca, luego define el nombre del modelo.
            </DialogDescription>
          </DialogHeader>
          <ModeloCreateFormContent
            defaultTipo={
              selectedTipo === "all" ? TipoProducto.EQUIPO : selectedTipo
            }
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
            <DialogTitle>Editar modelo</DialogTitle>
            <DialogDescription>
              Modifica los datos del modelo seleccionado.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <ModeloEditFormContent
              modelo={editingItem}
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
            <DialogTitle>Detalle de modelo</DialogTitle>
            <DialogDescription>
              Información del modelo seleccionado.
            </DialogDescription>
          </DialogHeader>
          {viewingItem ? <ModeloDetailsContent modelo={viewingItem} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModeloDetailsContent({ modelo }: { modelo: ModeloCatalogoItem }) {
  const rows = [
    { label: "Nombre", value: modelo.nombre },
    { label: "Tipo", value: PRODUCTO_TIPO_LABELS[modelo.tipo] },
    { label: "Marca", value: modelo.marca?.nombre ?? "Sin marca" },
    { label: "Descripción", value: modelo.descripcion || "—" },
    { label: "Estado", value: modelo.activo ? "Activo" : "Inactivo" },
    { label: "ID", value: modelo.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Package className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {modelo.nombre}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {PRODUCTO_TIPO_LABELS[modelo.tipo]} ·{" "}
            {modelo.marca?.nombre ?? "Sin marca"}
          </p>
        </div>
        <Badge variant={modelo.activo ? "default" : "outline"}>
          {modelo.activo ? "Activo" : "Inactivo"}
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

function ModeloCreateFormContent({
  defaultTipo,
  createMutation,
  onSuccess,
  onCancel,
}: {
  defaultTipo: TipoProducto;
  createMutation: ReturnType<typeof useCreateModeloCatalogo>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ModeloFormValues>({
    resolver: zodResolver(modeloSchema),
    defaultValues: { tipo: defaultTipo, marcaId: null, activo: true },
  });

  const activo = watch("activo");
  const tipo = watch("tipo") ?? defaultTipo;
  const marcaId = watch("marcaId") ?? "none";

  const { data: marcasRes } = useMarcas(tipo);
  const marcas = marcasRes?.data ?? [];

  React.useEffect(() => {
    setValue("marcaId", null);
  }, [tipo, setValue]);

  const onSubmit = (data: ModeloFormValues) => {
    createMutation.mutate(
      {
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo,
        marcaId: data.marcaId ?? null,
        activo: data.activo ?? true,
      },
      {
        onSuccess: () => {
          toast.success("Modelo creado correctamente");
          onSuccess();
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al crear modelo"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={errors.tipo ? true : undefined}>
            <FieldLabel>Tipo *</FieldLabel>
            <Select
              value={tipo}
              onValueChange={(v) =>
                setValue("tipo", v as TipoProducto, { shouldDirty: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TipoProducto).map((t) => (
                  <SelectItem key={t} value={t}>
                    {PRODUCTO_TIPO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.tipo?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.marcaId ? true : undefined}>
            <FieldLabel>Marca</FieldLabel>
            <Select
              value={marcaId}
              onValueChange={(v) =>
                setValue("marcaId", v === "none" ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin marca</SelectItem>
                {marcas.map((marca) => (
                  <SelectItem key={marca.id} value={marca.id}>
                    {marca.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.marcaId?.message}</FieldError>
          </Field>
        </div>

        <Field data-invalid={errors.nombre ? true : undefined}>
          <FieldLabel>Nombre *</FieldLabel>
          <Input
            {...register("nombre")}
            placeholder="Modelo Pro 14"
            autoFocus
          />
          <FieldError>{errors.nombre?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.descripcion ? true : undefined}>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea
            {...register("descripcion")}
            placeholder="Compatibilidad, familia o nota comercial del modelo"
            rows={2}
          />
          <FieldError>{errors.descripcion?.message}</FieldError>
        </Field>

        <Field orientation="horizontal" className="self-start">
          <FieldLabel>Activo</FieldLabel>
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
            Crear modelo
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function ModeloEditFormContent({
  modelo,
  onDone,
}: {
  modelo: ModeloCatalogoItem;
  onDone: () => void;
}) {
  const updateMutation = useUpdateModeloCatalogo(modelo.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ModeloFormValues>({
    resolver: zodResolver(modeloSchema),
    defaultValues: {
      nombre: modelo.nombre,
      descripcion: modelo.descripcion ?? undefined,
      tipo: modelo.tipo,
      marcaId: modelo.marca?.id ?? null,
      activo: modelo.activo,
    },
  });

  const activo = watch("activo");
  const tipo = watch("tipo") ?? modelo.tipo;
  const marcaId = watch("marcaId") ?? "none";

  const { data: marcasRes } = useMarcas(tipo);
  const marcas = marcasRes?.data ?? [];

  React.useEffect(() => {
    setValue("marcaId", null);
  }, [tipo, setValue]);

  const onSubmit = (data: ModeloFormValues) => {
    updateMutation.mutate(
      {
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo,
        marcaId: data.marcaId ?? null,
        activo: data.activo ?? true,
      },
      {
        onSuccess: () => {
          toast.success("Modelo actualizado");
          onDone();
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al actualizar modelo"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={errors.tipo ? true : undefined}>
            <FieldLabel>Tipo *</FieldLabel>
            <Select
              value={tipo}
              onValueChange={(v) =>
                setValue("tipo", v as TipoProducto, { shouldDirty: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TipoProducto).map((t) => (
                  <SelectItem key={t} value={t}>
                    {PRODUCTO_TIPO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.tipo?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.marcaId ? true : undefined}>
            <FieldLabel>Marca</FieldLabel>
            <Select
              value={marcaId}
              onValueChange={(v) =>
                setValue("marcaId", v === "none" ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin marca</SelectItem>
                {marcas.map((marca) => (
                  <SelectItem key={marca.id} value={marca.id}>
                    {marca.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.marcaId?.message}</FieldError>
          </Field>
        </div>

        <Field data-invalid={errors.nombre ? true : undefined}>
          <FieldLabel>Nombre *</FieldLabel>
          <Input {...register("nombre")} autoFocus />
          <FieldError>{errors.nombre?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.descripcion ? true : undefined}>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea {...register("descripcion")} rows={2} />
          <FieldError>{errors.descripcion?.message}</FieldError>
        </Field>

        <Field orientation="horizontal" className="self-start">
          <FieldLabel>Activo</FieldLabel>
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
            Guardar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
