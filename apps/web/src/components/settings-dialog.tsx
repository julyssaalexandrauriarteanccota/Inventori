"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  DatabaseBackup,
  Warehouse,
  Plus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  FolderTree,
  Stamp,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Search,
  Shield,
  ShieldCheck,
  FileText,
  SlidersHorizontal,
  LifeBuoy,
  UserRound,
  Mail,
  Phone,
  Palette,
  Globe,
  Wand2,
  UserCheck,
  UserX,
  Power,
  PowerOff,
  Layers,
  Wrench,
  Building2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  RolUsuario,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
  PASSWORD_REQUIREMENTS_TEXT,
  TipoProducto,
  almacenFormSchema,
  type AlmacenFormPayload,
  type ConfigEmpresaPayload,
  type UpdateOwnProfilePayload,
} from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import {
  useConfigEmpresa,
  useUpdateConfigEmpresa,
  useUsuarios,
  useCreateUsuario,
  useUpdateUsuario,
  useChangeUsuarioPassword,
  useActivarUsuario,
  useDesactivarUsuario,
  type UsuarioItem,
  type CreateUsuarioPayload,
  type UpdateUsuarioPayload,
} from "@/hooks/use-configuracion";
import {
  RoleAccessCompact,
  RoleAccessFull,
  RoleModuleCountBadge,
} from "@/components/settings/role-access-preview";
import {
  useAlmacenes,
  useCreateAlmacen,
  useUpdateAlmacen,
} from "@/hooks/use-inventario";
import {
  useCategorias,
  useCreateCategoria,
  useUpdateCategoria,
  useMarcas,
  useCreateMarca,
  useUpdateMarca,
  type CategoriaItem,
} from "@/hooks/use-productos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetodosPagoSettingsContent } from "@/components/settings/metodos-pago-settings-content";
import { PreferenciasSettingsContent } from "@/components/settings/preferencias-settings-content";
import { TiposMovimientoSettingsContent } from "@/components/settings/tipos-movimiento-settings-content";
import { UnidadesMedidaSettingsContent } from "@/components/settings/unidades-medida-settings-content";
import { ModelosSettingsContent } from "@/components/settings/modelos-settings-content";
import { CajasSettingsContent } from "@/components/settings/cajas-settings-content";
import { FiscalSettingsContent } from "@/components/settings/fiscal-settings-content";
import { PadronSunatSettingsContent } from "@/components/settings/padron-sunat-settings-content";
import {
  SettingsDataTable,
  type ColumnDef,
} from "@/components/settings/settings-data-table";
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { RealtimeStatus } from "@/components/layout/realtime-status";
import { cn } from "@/lib/utils";
import { getApiAssetUrl } from "@/lib/api";
import { getUploadAcceptAttr, uploadSelectedFiles } from "@/lib/file-uploads";
import { generateSecurePassword } from "@/lib/passwords";
import type { QuickSettingsSectionId } from "@/components/settings-dialog-provider";
import {
  settingsSectionsList as sectionsList,
  type SectionId,
} from "@/components/settings/settings-sections";

type AlmacenItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  esPrincipal: boolean;
  activo: boolean;
};

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

/* ═══════════════════════════════════════════════════════
   ALMACENES SECTION — Full CRUD inside Settings
   ═══════════════════════════════════════════════════════ */

function AlmacenesContent({
  onRequestDelete,
}: {
  onRequestDelete: (id: string) => void;
}) {
  const { hasRole } = useAuth();
  const { data: almacenesRes, isLoading } = useAlmacenes();
  const createAlmacen = useCreateAlmacen();

  const [showCreate, setShowCreate] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AlmacenItem | null>(
    null,
  );
  const [viewingItem, setViewingItem] = React.useState<AlmacenItem | null>(
    null,
  );

  const almacenes = almacenesRes?.data ?? [];
  const canManage = hasRole(RolUsuario.ADMIN, RolUsuario.ENCARGADO);

  const activos = React.useMemo(
    () => almacenes.filter((a) => a.activo).length,
    [almacenes],
  );
  const principales = React.useMemo(
    () => almacenes.filter((a) => a.esPrincipal).length,
    [almacenes],
  );

  return (
    <>
      <div className="flex flex-col gap-4">
        {canManage && (
          <TopbarActions>
            <RealtimeStatus />
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nuevo almacén</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </TopbarActions>
        )}

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total almacenes"
            value={isLoading ? undefined : almacenes.length}
            icon={Warehouse}
            theme="sky"
            subtitle="Ubicaciones registradas"
            isLoading={isLoading}
          />
          <StatCard
            label="Activos"
            value={isLoading ? undefined : activos}
            icon={Check}
            theme="emerald"
            subtitle="En operación"
            isLoading={isLoading}
          />
          <StatCard
            label="Principal"
            value={isLoading ? undefined : principales}
            icon={Building2}
            theme="amber"
            subtitle="Marcado como sede principal"
            isLoading={isLoading}
          />
        </div>

        <div className="flex items-center gap-2 md:pr-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground truncate">
              Almacenes
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Gestiona las ubicaciones de almacenamiento del inventario
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/40 bg-card/50 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : almacenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-dashed border-border">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/40">
              <Warehouse className="size-7 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="font-medium text-muted-foreground">Sin almacenes</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Crea tu primer almacén para gestionar el inventario
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreate(true)}
                className="rounded-xl mt-1"
              >
                <Plus className="size-4" />
                Crear almacén
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {almacenes.map((almacen) => (
              <AlmacenCard
                key={almacen.id}
                almacen={almacen}
                canManage={canManage}
                onView={() => setViewingItem(almacen)}
                onEdit={() => setEditingItem(almacen)}
                onDelete={() => onRequestDelete(almacen.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo almacén</DialogTitle>
            <DialogDescription>
              Registra una ubicación de almacenamiento para el inventario.
            </DialogDescription>
          </DialogHeader>
          <AlmacenCreateForm
            onSuccess={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
            createMutation={createAlmacen}
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
            <DialogTitle>Editar almacén</DialogTitle>
            <DialogDescription>
              Modifica los datos del almacén seleccionado.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <AlmacenEditForm
              almacen={editingItem}
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
            <DialogTitle>Detalle de almacén</DialogTitle>
            <DialogDescription>
              Información del almacén seleccionado.
            </DialogDescription>
          </DialogHeader>
          {viewingItem ? <AlmacenDetailsContent almacen={viewingItem} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Almacen Card ── */

function AlmacenCard({
  almacen,
  canManage,
  onView,
  onEdit,
  onDelete,
}: {
  almacen: AlmacenItem;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:border-ring/50 hover:shadow-md">
      {canManage && !almacen.esPrincipal ? (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}

      <div className="flex items-center gap-3 pr-7">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-orange-700 text-white shadow-sm dark:from-orange-700 dark:to-orange-900">
          <Warehouse className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold leading-tight"
            title={almacen.nombre}
          >
            {almacen.nombre}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {almacen.descripcion || "Sin descripción"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {almacen.esPrincipal ? (
          <Badge variant="secondary" className="text-[10px]">
            Principal
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            Secundario
          </Badge>
        )}
        <Badge
          variant={almacen.activo ? "default" : "outline"}
          className="text-[10px]"
        >
          {almacen.activo ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <div className="border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Warehouse className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="truncate">
            {almacen.esPrincipal
              ? "Almacén principal del inventario"
              : "Ubicación de almacenamiento"}
          </span>
        </div>
      </div>

      <div className="mt-auto flex gap-2 pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 flex-1 gap-1.5 rounded-lg text-xs font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          onClick={onView}
        >
          <Eye className="size-3.5" />
          Ver detalles
        </Button>
        {canManage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 flex-1 gap-1.5 rounded-lg text-xs"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ── Create Form ── */

function AlmacenCreateForm({
  onSuccess,
  onCancel,
  createMutation,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  createMutation: ReturnType<typeof useCreateAlmacen>;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AlmacenFormPayload>({
    resolver: zodResolver(almacenFormSchema),
    defaultValues: { nombre: "", activo: true, esPrincipal: false },
  });

  const activo = watch("activo");
  const esPrincipal = watch("esPrincipal");

  const onSubmit = (data: AlmacenFormPayload) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Almacén creado correctamente");
        onSuccess();
      },
      onError: (err: Error) => toast.error(err.message || "Error al crear"),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input
              {...register("nombre")}
              placeholder="Almacén principal"
              aria-invalid={!!errors.nombre}
              autoFocus
            />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>

          <Field orientation="horizontal" className="self-end pb-1">
            <FieldLabel>Activo</FieldLabel>
            <Switch
              checked={activo ?? true}
              onCheckedChange={(v) => setValue("activo", v)}
            />
          </Field>

          <Field orientation="horizontal" className="self-end pb-1">
            <FieldLabel>Principal</FieldLabel>
            <Switch
              checked={esPrincipal ?? false}
              onCheckedChange={(v) => {
                setValue("esPrincipal", v);
                if (v) setValue("activo", true);
              }}
            />
          </Field>
        </div>

        <Field data-invalid={errors.descripcion ? true : undefined}>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea
            {...register("descripcion")}
            placeholder="Descripción del almacén (opcional)"
            rows={2}
            aria-invalid={!!errors.descripcion}
          />
          <FieldError>{errors.descripcion?.message}</FieldError>
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
            {createMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Crear almacén
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function AlmacenEditForm({
  almacen,
  onDone,
}: {
  almacen: AlmacenItem;
  onDone: () => void;
}) {
  const updateMutation = useUpdateAlmacen(almacen.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AlmacenFormPayload>({
    resolver: zodResolver(almacenFormSchema),
    defaultValues: {
      nombre: almacen.nombre,
      descripcion: almacen.descripcion ?? undefined,
      activo: almacen.activo,
      esPrincipal: almacen.esPrincipal,
    },
  });

  const activo = watch("activo");
  const esPrincipal = watch("esPrincipal");

  const onSubmit = (data: AlmacenFormPayload) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Almacén actualizado");
        onDone();
      },
      onError: (err: Error) =>
        toast.error(err.message || "Error al actualizar"),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input
              {...register("nombre")}
              placeholder="Almacén principal"
              aria-invalid={!!errors.nombre}
              autoFocus
            />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>

          <Field orientation="horizontal" className="self-end pb-1">
            <FieldLabel>Activo</FieldLabel>
            <Switch
              checked={activo ?? true}
              onCheckedChange={(v) => setValue("activo", v)}
              disabled={almacen.esPrincipal}
            />
          </Field>

          <Field orientation="horizontal" className="self-end pb-1">
            <FieldLabel>Principal</FieldLabel>
            <Switch
              checked={esPrincipal ?? false}
              onCheckedChange={(v) => {
                setValue("esPrincipal", v);
                if (v) setValue("activo", true);
              }}
              disabled={almacen.esPrincipal}
            />
          </Field>
        </div>

        <Field data-invalid={errors.descripcion ? true : undefined}>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea
            {...register("descripcion")}
            placeholder="Descripción del almacén (opcional)"
            rows={2}
            aria-invalid={!!errors.descripcion}
          />
          <FieldError>{errors.descripcion?.message}</FieldError>
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
            {updateMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            <Check className="size-4" />
            Guardar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════
   CATEGORÍAS CONTENT
   ═══════════════════════════════════════════════════════ */

/** Flatten nested CategoriaItem tree into a flat array preserving depth info */
function flattenCategorias(
  cats: CategoriaItem[],
  depth = 0,
): Array<CategoriaItem & { _depth: number }> {
  const result: Array<CategoriaItem & { _depth: number }> = [];
  for (const c of cats) {
    result.push({ ...c, _depth: depth });
    if (c.hijos?.length) result.push(...flattenCategorias(c.hijos, depth + 1));
  }
  return result;
}

/** Find ancestor chain for a category by its padreId, returns [rootId, level1Id?] */
function findAncestorChain(
  padreId: string | null | undefined,
  flatCats: Array<CategoriaItem & { _depth: number }>,
): { level1Id?: string; level2Id?: string } {
  if (!padreId) return {};
  const parent = flatCats.find((c) => c.id === padreId);
  if (!parent) return {};
  if (parent._depth === 0) return { level1Id: parent.id };
  if (parent._depth === 1) {
    // parent is level 2, find its root parent
    const grandparent = flatCats.find((c) => c.id === parent.padreId);
    return { level1Id: grandparent?.id, level2Id: parent.id };
  }
  return {};
}

const categoriaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  padreId: z.string().optional(),
});
type CategoriaFormValues = z.infer<typeof categoriaSchema>;

function CategoriasContent({
  onRequestDelete,
}: {
  onRequestDelete: (id: string) => void;
}) {
  const { user } = useAuth();
  const canManage =
    user?.rol === RolUsuario.ADMIN || user?.rol === RolUsuario.ENCARGADO;
  const [selectedTipo, setSelectedTipo] =
    React.useState<ProductTypeFilterValue>("all");
  const tipoFilter = selectedTipo === "all" ? undefined : selectedTipo;
  const { data: categoriasRes, isLoading } = useCategorias(tipoFilter);
  const createCategoria = useCreateCategoria();
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<CategoriaItem | null>(
    null,
  );
  const [viewingItem, setViewingItem] = React.useState<CategoriaItem | null>(
    null,
  );

  const categorias = (categoriasRes?.data ?? []) as CategoriaItem[];
  const rootCategorias = categorias.filter((c: CategoriaItem) => !c.padreId);
  const flatAll = React.useMemo(() => flattenCategorias(categorias), [categorias]);
  const countByTipo = React.useMemo(() => {
    const acc: Partial<Record<TipoProducto, number>> = {};
    for (const c of flatAll) acc[c.tipo] = (acc[c.tipo] ?? 0) + 1;
    return acc;
  }, [flatAll]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {canManage && (
          <TopbarActions>
            <RealtimeStatus />
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nueva categoría</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </TopbarActions>
        )}

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={isLoading ? undefined : flatAll.length}
            icon={FolderTree}
            theme="sky"
            subtitle="Categorías + subcategorías"
            isLoading={isLoading}
          />
          <StatCard
            label="Equipos"
            value={isLoading ? undefined : countByTipo[TipoProducto.EQUIPO] ?? 0}
            icon={Layers}
            theme="indigo"
            subtitle="Para inventario de equipos"
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
            subtitle="Mantenimiento y soporte"
            isLoading={isLoading}
          />
        </div>

        <div className="flex flex-col gap-3 md:pr-8">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              Categorías
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Gestiona categorías y subcategorías por tipo de catálogo
            </p>
          </div>
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <ProductTypeTabs
              value={selectedTipo}
              onChange={(value) => {
                setSelectedTipo(value);
                setEditingItem(null);
                setViewingItem(null);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/40 bg-card/50 p-5 shadow-sm"
              >
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24 mt-2" />
              </div>
            ))}
          </div>
        ) : rootCategorias.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-dashed border-border">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/40">
              <FolderTree className="size-7 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="font-medium text-muted-foreground">
                Sin categorías
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {selectedTipo === "all"
                  ? "Crea tu primera categoría para comenzar el catálogo."
                  : `Crea tu primera categoría para ${PRODUCTO_TIPO_LABELS[selectedTipo].toLowerCase()}`}
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreate(true)}
                className="rounded-xl mt-1"
              >
                <Plus className="size-4" />
                Crear categoría
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rootCategorias.map((cat: CategoriaItem) => (
              <CategoriaRow
                key={cat.id}
                categoria={cat}
                depth={0}
                canManage={canManage}
                editingItem={editingItem}
                onView={setViewingItem}
                onEdit={setEditingItem}
                onDelete={onRequestDelete}
                allCategorias={categorias}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>
              Selecciona el tipo y define la jerarquía de la categoría.
            </DialogDescription>
          </DialogHeader>
          <CategoriaCreateForm
            allCategorias={categorias}
            defaultTipo={
              selectedTipo === "all" ? TipoProducto.REPUESTO : selectedTipo
            }
            onSuccess={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
            createMutation={createCategoria}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
            <DialogDescription>
              {editingItem
                ? `${editingItem.nombre} · ${PRODUCTO_TIPO_LABELS[editingItem.tipo]}`
                : "Modifica los datos de la categoría."}
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <CategoriaEditForm
              categoria={editingItem}
              allCategorias={categorias}
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
            <DialogTitle>Detalle de categoría</DialogTitle>
            <DialogDescription>
              Información de la categoría seleccionada.
            </DialogDescription>
          </DialogHeader>
          {viewingItem ? (
            <CategoriaDetailsContent categoria={viewingItem} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoriaRow({
  categoria,
  depth,
  canManage,
  editingItem,
  onView,
  onEdit,
  onDelete,
  allCategorias,
}: {
  categoria: CategoriaItem;
  depth: number;
  canManage: boolean;
  editingItem: CategoriaItem | null;
  onView: (cat: CategoriaItem) => void;
  onEdit: (cat: CategoriaItem) => void;
  onDelete: (id: string) => void;
  allCategorias: CategoriaItem[];
}) {
  const [expanded, setExpanded] = React.useState(true);
  const hijos = categoria.hijos ?? [];

  return (
    <>
      <div
        className="group flex items-center gap-2 rounded-xl border border-border/40 bg-card/50 px-3 py-2 shadow-sm transition-all hover:shadow-md hover:border-border/60"
        style={{ marginLeft: depth * 20 }}
      >
        {hijos.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            <ChevronRight
              className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="size-4.5" />
        )}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-500/30 dark:bg-sky-600 dark:shadow-none">
          <FolderTree className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-sm text-foreground truncate">
            {categoria.nombre}
          </span>
          {categoria.descripcion && (
            <p className="text-xs text-muted-foreground truncate">
              {categoria.descripcion}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className="hidden shrink-0 text-[10px] sm:inline-flex"
        >
          {PRODUCTO_TIPO_LABELS[categoria.tipo]}
        </Badge>
        {hijos.length > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 shrink-0"
          >
            {hijos.length} sub
          </Badge>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-lg px-2 text-xs"
          onClick={() => onView(categoria)}
        >
          <Eye className="size-3.5" />
          Ver
        </Button>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(categoria)}>
                <Pencil className="size-4" />
                Editar
              </DropdownMenuItem>
              {hijos.length === 0 && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(categoria.id)}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {expanded &&
        hijos.map((hijo: CategoriaItem) => (
          <CategoriaRow
            key={hijo.id}
            categoria={hijo}
            depth={depth + 1}
            canManage={canManage}
            editingItem={editingItem}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            allCategorias={allCategorias}
          />
        ))}
    </>
  );
}

function CategoriaDetailsContent({ categoria }: { categoria: CategoriaItem }) {
  const rows = [
    { label: "Nombre", value: categoria.nombre },
    { label: "Tipo", value: PRODUCTO_TIPO_LABELS[categoria.tipo] },
    { label: "Descripción", value: categoria.descripcion || "—" },
    { label: "Subcategorías", value: String(categoria.hijos?.length ?? 0) },
    { label: "ID", value: categoria.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FolderTree className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {categoria.nombre}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {PRODUCTO_TIPO_LABELS[categoria.tipo]}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {categoria.hijos?.length ?? 0} sub
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

function CategoriaCreateForm({
  allCategorias,
  defaultTipo,
  onSuccess,
  onCancel,
  createMutation,
}: {
  allCategorias: CategoriaItem[];
  defaultTipo: TipoProducto;
  onSuccess: () => void;
  onCancel: () => void;
  createMutation: ReturnType<typeof useCreateCategoria>;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nombre: "", descripcion: "" },
  });

  const [tipo, setTipo] = React.useState<TipoProducto>(defaultTipo);
  const [selectedLevel1, setSelectedLevel1] = React.useState<string>("");
  const [enableLevel3, setEnableLevel3] = React.useState(false);
  const [selectedLevel2, setSelectedLevel2] = React.useState<string>("");

  const flat = React.useMemo(
    () => flattenCategorias(allCategorias),
    [allCategorias],
  );
  const rootCats = React.useMemo(
    () => flat.filter((c) => c._depth === 0 && c.tipo === tipo),
    [flat, tipo],
  );
  const level2Cats = React.useMemo(
    () =>
      selectedLevel1
        ? flat.filter((c) => c.padreId === selectedLevel1 && c._depth === 1)
        : [],
    [flat, selectedLevel1],
  );
  const showLevel3Switch = selectedLevel1 && level2Cats.length > 0;

  React.useEffect(() => {
    if (enableLevel3 && selectedLevel2 && selectedLevel2 !== "__none__") {
      setValue("padreId", selectedLevel2);
    } else if (selectedLevel1) {
      setValue("padreId", selectedLevel1);
    } else {
      setValue("padreId", undefined);
    }
  }, [selectedLevel1, enableLevel3, selectedLevel2, setValue]);

  const onSubmit = (data: CategoriaFormValues) => {
    createMutation.mutate(
      {
        nombre: data.nombre,
        descripcion: data.descripcion || undefined,
        tipo,
        padreId: data.padreId || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Categoría creada");
          onSuccess();
        },
        onError: (err: Error) => toast.error(err.message || "Error al crear"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input
              {...register("nombre")}
              placeholder="Ej: Equipos"
              autoFocus
            />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Tipo</FieldLabel>
            <Select
              value={tipo}
              onValueChange={(v) => {
                setTipo(v as TipoProducto);
                setSelectedLevel1("");
                setSelectedLevel2("");
                setEnableLevel3(false);
              }}
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
          </Field>
        </div>

        <Field>
          <FieldLabel>Categoría padre</FieldLabel>
          <Select
            value={selectedLevel1 || "__none__"}
            onValueChange={(v) => {
              const val = v === "__none__" ? "" : v;
              setSelectedLevel1(val);
              setSelectedLevel2("");
              setEnableLevel3(false);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ninguna (raíz)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Ninguna (raíz)</SelectItem>
              {rootCats.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea
            {...register("descripcion")}
            placeholder="Descripción (opcional)"
            rows={2}
          />
        </Field>

        {showLevel3Switch && (
          <div className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id="enable-level3-create"
                checked={enableLevel3}
                onCheckedChange={(checked: boolean) => {
                  setEnableLevel3(checked);
                  if (!checked) setSelectedLevel2("");
                }}
              />
              <label
                htmlFor="enable-level3-create"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Asignar a subcategoría (nivel 3)
              </label>
            </div>
            {enableLevel3 && (
              <Field>
                <FieldLabel>Subcategoría padre</FieldLabel>
                <Select
                  value={selectedLevel2}
                  onValueChange={setSelectedLevel2}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguna (hijo directo)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Ninguna (hijo directo)
                    </SelectItem>
                    {level2Cats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Máximo 3 niveles de profundidad
                </p>
              </Field>
            )}
          </div>
        )}

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
            {createMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Crear categoría
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function CategoriaEditForm({
  categoria,
  allCategorias,
  onDone,
}: {
  categoria: CategoriaItem;
  allCategorias: CategoriaItem[];
  onDone: () => void;
}) {
  const updateMutation = useUpdateCategoria(categoria.id);

  const flat = React.useMemo(
    () => flattenCategorias(allCategorias),
    [allCategorias],
  );
  const ancestors = React.useMemo(
    () => findAncestorChain(categoria.padreId, flat),
    [categoria.padreId, flat],
  );

  // Pre-populate: level1 = root ancestor, level2 = parent if it's depth 1
  const [selectedLevel1, setSelectedLevel1] = React.useState<string>(
    ancestors.level1Id ?? "",
  );
  const [enableLevel3, setEnableLevel3] = React.useState(!!ancestors.level2Id);
  const [selectedLevel2, setSelectedLevel2] = React.useState<string>(
    ancestors.level2Id ?? "",
  );

  // Exclude the current category and its descendants from parent options
  const selfAndDescendantIds = React.useMemo(() => {
    const ids = new Set<string>();
    function collect(cat: CategoriaItem) {
      ids.add(cat.id);
      cat.hijos?.forEach(collect);
    }
    collect(categoria);
    return ids;
  }, [categoria]);

  const rootCats = React.useMemo(
    () => flat.filter((c) => c._depth === 0 && !selfAndDescendantIds.has(c.id)),
    [flat, selfAndDescendantIds],
  );
  const level2Cats = React.useMemo(
    () =>
      selectedLevel1
        ? flat.filter(
            (c) =>
              c.padreId === selectedLevel1 &&
              c._depth === 1 &&
              !selfAndDescendantIds.has(c.id),
          )
        : [],
    [flat, selectedLevel1, selfAndDescendantIds],
  );
  const showLevel3Switch = selectedLevel1 && level2Cats.length > 0;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: categoria.nombre,
      descripcion: categoria.descripcion ?? "",
      padreId: categoria.padreId ?? undefined,
    },
  });

  // Sync padreId
  React.useEffect(() => {
    if (enableLevel3 && selectedLevel2 && selectedLevel2 !== "__none__") {
      setValue("padreId", selectedLevel2);
    } else if (selectedLevel1) {
      setValue("padreId", selectedLevel1);
    } else {
      setValue("padreId", undefined);
    }
  }, [selectedLevel1, enableLevel3, selectedLevel2, setValue]);

  const onSubmit = (data: CategoriaFormValues) => {
    const payload = {
      nombre: data.nombre,
      descripcion: data.descripcion || undefined,
      tipo: categoria.tipo,
      padreId: data.padreId || undefined,
    };
    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Categoría actualizada");
        onDone();
      },
      onError: (err: Error) =>
        toast.error(err.message || "Error al actualizar"),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input {...register("nombre")} autoFocus />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Categoría padre</FieldLabel>
            <Select
              value={selectedLevel1 || "__none__"}
              onValueChange={(v) => {
                const val = v === "__none__" ? "" : v;
                setSelectedLevel1(val);
                setSelectedLevel2("");
                setEnableLevel3(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ninguna (raíz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ninguna (raíz)</SelectItem>
                {rootCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea {...register("descripcion")} rows={2} />
        </Field>

        {showLevel3Switch && (
          <div className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id={`enable-level3-edit-${categoria.id}`}
                checked={enableLevel3}
                onCheckedChange={(checked: boolean) => {
                  setEnableLevel3(checked);
                  if (!checked) setSelectedLevel2("");
                }}
              />
              <label
                htmlFor={`enable-level3-edit-${categoria.id}`}
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Asignar a subcategoría (nivel 3)
              </label>
            </div>
            {enableLevel3 && (
              <Field>
                <FieldLabel>Subcategoría padre</FieldLabel>
                <Select
                  value={selectedLevel2}
                  onValueChange={setSelectedLevel2}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguna (hijo directo)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Ninguna (hijo directo)
                    </SelectItem>
                    {level2Cats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Máximo 3 niveles de profundidad
                </p>
              </Field>
            )}
          </div>
        )}

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
            {updateMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            <Check className="size-4" />
            Guardar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════
   MARCAS CONTENT
   ═══════════════════════════════════════════════════════ */

type SettingsMarcaItem = { id: string; nombre: string; tipos: TipoProducto[] };

const marcaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  tipos: z
    .array(z.nativeEnum(TipoProducto))
    .min(1, "Selecciona al menos un tipo"),
});
type MarcaFormValues = z.infer<typeof marcaSchema>;

function MarcasContent({
  onRequestDelete,
}: {
  onRequestDelete: (id: string) => void;
}) {
  const { user } = useAuth();
  const canManage =
    user?.rol === RolUsuario.ADMIN || user?.rol === RolUsuario.ENCARGADO;
  const [selectedTipo, setSelectedTipo] =
    React.useState<ProductTypeFilterValue>("all");
  const tipoFilter = selectedTipo === "all" ? undefined : selectedTipo;
  const { data: marcasRes, isLoading } = useMarcas(tipoFilter);
  const marcas = (marcasRes?.data ?? []) as SettingsMarcaItem[];
  const createMarca = useCreateMarca();
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingItem, setEditingItem] =
    React.useState<SettingsMarcaItem | null>(null);
  const [viewingItem, setViewingItem] =
    React.useState<SettingsMarcaItem | null>(null);

  const countByTipo = React.useMemo(() => {
    const acc: Partial<Record<TipoProducto, number>> = {};
    for (const m of marcas) {
      for (const t of m.tipos) acc[t] = (acc[t] ?? 0) + 1;
    }
    return acc;
  }, [marcas]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {canManage && (
          <TopbarActions>
            <RealtimeStatus />
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nueva marca</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </TopbarActions>
        )}

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={isLoading ? undefined : marcas.length}
            icon={Stamp}
            theme="sky"
            subtitle="Marcas registradas"
            isLoading={isLoading}
          />
          <StatCard
            label="Para equipos"
            value={
              isLoading ? undefined : countByTipo[TipoProducto.EQUIPO] ?? 0
            }
            icon={Layers}
            theme="indigo"
            subtitle="Disponibles en catálogo de equipos"
            isLoading={isLoading}
          />
          <StatCard
            label="Para repuestos"
            value={
              isLoading ? undefined : countByTipo[TipoProducto.REPUESTO] ?? 0
            }
            icon={Wrench}
            theme="amber"
            subtitle="Piezas e insumos"
            isLoading={isLoading}
          />
          <StatCard
            label="Para servicios"
            value={
              isLoading ? undefined : countByTipo[TipoProducto.SERVICIO] ?? 0
            }
            icon={LifeBuoy}
            theme="emerald"
            subtitle="Marcas vinculadas a servicios"
            isLoading={isLoading}
          />
        </div>

        <div className="flex flex-col gap-3 md:pr-8">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              Marcas
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Gestiona las marcas según el tipo de catálogo
            </p>
          </div>
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <ProductTypeTabs
              value={selectedTipo}
              onChange={(value) => {
                setSelectedTipo(value);
                setEditingItem(null);
                setViewingItem(null);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/40 bg-card/50 p-5 shadow-sm"
              >
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
        ) : marcas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-dashed border-border">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/40">
              <Stamp className="size-7 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="font-medium text-muted-foreground">Sin marcas</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {selectedTipo === "all"
                  ? "Crea tu primera marca para comenzar el catálogo."
                  : `Crea tu primera marca para ${PRODUCTO_TIPO_LABELS[selectedTipo].toLowerCase()}`}
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreate(true)}
                className="rounded-xl mt-1"
              >
                <Plus className="size-4" />
                Crear marca
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {marcas.map((m: SettingsMarcaItem) => (
              <MarcaCard
                key={m.id}
                marca={m}
                canManage={canManage}
                onView={() => setViewingItem(m)}
                onEdit={() => setEditingItem(m)}
                onDelete={() => onRequestDelete(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva marca</DialogTitle>
            <DialogDescription>
              Selecciona los tipos de producto a los que aplica esta marca.
            </DialogDescription>
          </DialogHeader>
          <MarcaCreateForm
            defaultTipo={
              selectedTipo === "all" ? TipoProducto.EQUIPO : selectedTipo
            }
            onSuccess={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
            createMutation={createMarca}
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
            <DialogTitle>Editar marca</DialogTitle>
            <DialogDescription>
              Modifica el nombre y los tipos aplicables de la marca.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <MarcaEditForm
              marca={editingItem}
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
            <DialogTitle>Detalle de marca</DialogTitle>
            <DialogDescription>
              Información de la marca seleccionada.
            </DialogDescription>
          </DialogHeader>
          {viewingItem ? <MarcaDetailsContent marca={viewingItem} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function MarcaCard({
  marca,
  canManage,
  onView,
  onEdit,
  onDelete,
}: {
  marca: SettingsMarcaItem;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:border-ring/50 hover:shadow-md">
      {canManage ? (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}

      <div className="flex items-center gap-3 pr-7">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-amber-700 text-white shadow-sm dark:from-amber-700 dark:to-amber-900">
          <Stamp className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold leading-tight"
            title={marca.nombre}
          >
            {marca.nombre}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Marca reutilizable para catálogo
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {marca.tipos.map((tipo) => (
          <Badge key={tipo} variant="outline" className="text-[10px]">
            {PRODUCTO_TIPO_LABELS[tipo]}
          </Badge>
        ))}
      </div>

      <div className="border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Stamp className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="truncate">
            {marca.tipos.length} tipo{marca.tipos.length === 1 ? "" : "s"}{" "}
            asociado{marca.tipos.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="mt-auto flex gap-2 pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 flex-1 gap-1.5 rounded-lg text-xs font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          onClick={onView}
        >
          <Eye className="size-3.5" />
          Ver detalles
        </Button>
        {canManage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 flex-1 gap-1.5 rounded-lg text-xs"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function MarcaDetailsContent({ marca }: { marca: SettingsMarcaItem }) {
  const rows = [
    { label: "Nombre", value: marca.nombre },
    {
      label: "Tipos aplicables",
      value: marca.tipos.map((tipo) => PRODUCTO_TIPO_LABELS[tipo]).join(", "),
    },
    { label: "ID", value: marca.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Stamp className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {marca.nombre}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {marca.tipos.map((tipo) => (
              <Badge key={tipo} variant="outline" className="text-[10px]">
                {PRODUCTO_TIPO_LABELS[tipo]}
              </Badge>
            ))}
          </div>
        </div>
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

function MarcaCreateForm({
  defaultTipo,
  onSuccess,
  onCancel,
  createMutation,
}: {
  defaultTipo: TipoProducto;
  onSuccess: () => void;
  onCancel: () => void;
  createMutation: ReturnType<typeof useCreateMarca>;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MarcaFormValues>({
    resolver: zodResolver(marcaSchema),
    defaultValues: { nombre: "", tipos: [defaultTipo] },
  });
  const tipos = watch("tipos") ?? [defaultTipo];

  const onSubmit = (data: MarcaFormValues) => {
    createMutation.mutate(
      {
        nombre: data.nombre,
        tipos: data.tipos,
      },
      {
        onSuccess: () => {
          toast.success("Marca creada");
          onSuccess();
        },
        onError: (err: Error) => toast.error(err.message || "Error al crear"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <Field data-invalid={errors.nombre ? true : undefined}>
          <FieldLabel>Nombre *</FieldLabel>
          <Input
            {...register("nombre")}
            placeholder="Ej: Marca Demo"
            autoFocus
          />
          <FieldError>{errors.nombre?.message}</FieldError>
        </Field>
        <Field data-invalid={errors.tipos ? true : undefined}>
          <FieldLabel>Tipos aplicables *</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {Object.values(TipoProducto).map((tipo) => {
              const selected = tipos.includes(tipo);
              return (
                <Button
                  key={tipo}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => {
                    const nextTipos = selected
                      ? tipos.length > 1
                        ? tipos.filter((item) => item !== tipo)
                        : tipos
                      : [...tipos, tipo];

                    setValue("tipos", nextTipos, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                >
                  {PRODUCTO_TIPO_LABELS[tipo]}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            La marca solo aparecerá en productos de los tipos seleccionados.
          </p>
          <FieldError>{errors.tipos?.message}</FieldError>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
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
            Crear marca
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function MarcaEditForm({
  marca,
  onDone,
}: {
  marca: SettingsMarcaItem;
  onDone: () => void;
}) {
  const updateMutation = useUpdateMarca(marca.id);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MarcaFormValues>({
    resolver: zodResolver(marcaSchema),
    defaultValues: { nombre: marca.nombre, tipos: marca.tipos },
  });
  const tipos = watch("tipos") ?? marca.tipos;

  const onSubmit = (data: MarcaFormValues) => {
    updateMutation.mutate(
      {
        nombre: data.nombre,
        tipos: data.tipos,
      },
      {
        onSuccess: () => {
          toast.success("Marca actualizada");
          onDone();
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al actualizar"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <Field data-invalid={errors.nombre ? true : undefined}>
          <FieldLabel>Nombre *</FieldLabel>
          <Input {...register("nombre")} autoFocus />
          <FieldError>{errors.nombre?.message}</FieldError>
        </Field>
        <Field data-invalid={errors.tipos ? true : undefined}>
          <FieldLabel>Tipos aplicables *</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {Object.values(TipoProducto).map((tipo) => {
              const selected = tipos.includes(tipo);
              return (
                <Button
                  key={tipo}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => {
                    const nextTipos = selected
                      ? tipos.length > 1
                        ? tipos.filter((item) => item !== tipo)
                        : tipos
                      : [...tipos, tipo];

                    setValue("tipos", nextTipos, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                >
                  {PRODUCTO_TIPO_LABELS[tipo]}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            La marca seguirá visible solo en los tipos seleccionados.
          </p>
          <FieldError>{errors.tipos?.message}</FieldError>
        </Field>
        <div className="flex justify-end gap-2 pt-1">
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
            {updateMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            <Check className="size-4" />
            Guardar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════
   EMPRESA CONTENT
   ═══════════════════════════════════════════════════════ */

const optionalTextInput = z.string().optional();
const optionalEmailInput = z
  .string()
  .email("Email inválido")
  .optional()
  .or(z.literal(""));
const optionalHexColorInput = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Usa un color HEX válido")
  .optional()
  .or(z.literal(""));

const empresaSchema = z.object({
  razonSocial: z.string().min(1, "Requerido").optional(),
  ruc: z
    .string()
    .regex(/^\d{11}$/, "El RUC debe tener 11 dígitos")
    .optional()
    .or(z.literal("")),
  direccion: optionalTextInput,
  telefono: optionalTextInput,
  email: optionalEmailInput,
  porcentajeIGV: z.number().min(0).max(100).optional(),
  nombreComercial: optionalTextInput,
  slogan: optionalTextInput,
  descripcionCorta: optionalTextInput,
  descripcionSeo: optionalTextInput,
  rubro: optionalTextInput,
  website: optionalTextInput,
  telefonoVentas: optionalTextInput,
  telefonoSoporte: optionalTextInput,
  whatsapp: optionalTextInput,
  emailVentas: optionalEmailInput,
  emailSoporte: optionalEmailInput,
  logo: optionalTextInput,
  logoDark: optionalTextInput,
  favicon: optionalTextInput,
  colorPrimario: optionalHexColorInput,
  colorSecundario: optionalHexColorInput,
  heroTitulo: optionalTextInput,
  heroSubtitulo: optionalTextInput,
  catalogoDescripcion: optionalTextInput,
  contactoDescripcion: optionalTextInput,
  garantiaDescripcion: optionalTextInput,
  ticketDescripcion: optionalTextInput,
  pwaDescripcion: optionalTextInput,
});
type EmpresaFormValues = z.infer<typeof empresaSchema>;
type EmpresaFormSource = Partial<Record<keyof EmpresaFormValues, unknown>>;

function textFormValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberFormValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toEmpresaFormValues(
  values?: EmpresaFormSource | null,
): EmpresaFormValues {
  return {
    razonSocial: textFormValue(values?.razonSocial),
    ruc: textFormValue(values?.ruc),
    direccion: textFormValue(values?.direccion),
    telefono: textFormValue(values?.telefono),
    email: textFormValue(values?.email),
    porcentajeIGV: numberFormValue(values?.porcentajeIGV),
    nombreComercial: textFormValue(values?.nombreComercial),
    slogan: textFormValue(values?.slogan),
    descripcionCorta: textFormValue(values?.descripcionCorta),
    descripcionSeo: textFormValue(values?.descripcionSeo),
    rubro: textFormValue(values?.rubro),
    website: textFormValue(values?.website),
    telefonoVentas: textFormValue(values?.telefonoVentas),
    telefonoSoporte: textFormValue(values?.telefonoSoporte),
    whatsapp: textFormValue(values?.whatsapp),
    emailVentas: textFormValue(values?.emailVentas),
    emailSoporte: textFormValue(values?.emailSoporte),
    logo: textFormValue(values?.logo),
    logoDark: textFormValue(values?.logoDark),
    favicon: textFormValue(values?.favicon),
    colorPrimario: textFormValue(values?.colorPrimario),
    colorSecundario: textFormValue(values?.colorSecundario),
    heroTitulo: textFormValue(values?.heroTitulo),
    heroSubtitulo: textFormValue(values?.heroSubtitulo),
    catalogoDescripcion: textFormValue(values?.catalogoDescripcion),
    contactoDescripcion: textFormValue(values?.contactoDescripcion),
    garantiaDescripcion: textFormValue(values?.garantiaDescripcion),
    ticketDescripcion: textFormValue(values?.ticketDescripcion),
    pwaDescripcion: textFormValue(values?.pwaDescripcion),
  };
}

type BrandingAssetFieldProps = {
  label: string;
  description: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  error?: string;
  compact?: boolean;
};

type BrandColorPreset = {
  value: string;
  label: string;
};

const PRIMARY_COLOR_PRESETS: BrandColorPreset[] = [
  { value: "#EA580C", label: "Naranja" },
  { value: "#2563EB", label: "Azul" },
  { value: "#059669", label: "Verde" },
  { value: "#7C3AED", label: "Violeta" },
  { value: "#E11D48", label: "Rosa" },
  { value: "#0EA5E9", label: "Celeste" },
];

const SECONDARY_COLOR_PRESETS: BrandColorPreset[] = [
  { value: "#0F172A", label: "Slate" },
  { value: "#111827", label: "Grafito" },
  { value: "#374151", label: "Gris" },
  { value: "#1E3A8A", label: "Azul oscuro" },
  { value: "#064E3B", label: "Verde oscuro" },
  { value: "#7C2D12", label: "Marrón" },
];

function normalizeHexColor(value: string | undefined, fallback: string) {
  const trimmed = value?.trim() ?? "";
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`;
  }
  return fallback;
}

function BrandingAssetField({
  label,
  description,
  value,
  placeholder,
  onChange,
  error,
  compact = false,
}: BrandingAssetFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const previewUrl = value.trim() ? getApiAssetUrl(value) : null;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const [uploaded] = await uploadSelectedFiles([file], {
        preset: "image",
        maxFiles: 1,
      });
      onChange(uploaded.path);
      toast.success(`${label} actualizado`);
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la imagen",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <div
        className={cn(
          "grid gap-3 rounded-2xl border border-border/50 bg-background/60 p-3",
          compact ? "sm:grid-cols-[72px_1fr]" : "sm:grid-cols-[112px_1fr]",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/30 bg-contain bg-center bg-no-repeat text-[10px] font-medium text-muted-foreground",
            compact ? "size-18" : "h-24 w-full sm:w-28",
          )}
          style={
            previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined
          }
        >
          {!previewUrl ? "Preview" : null}
        </div>
        <div className="min-w-0 space-y-2">
          <Input
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={getUploadAcceptAttr("image")}
              className="sr-only"
              onChange={handleUpload}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {isUploading ? "Subiendo..." : "Subir PNG/JPG/WebP"}
            </Button>
            {value ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg"
                onClick={() => onChange("")}
              >
                Limpiar
              </Button>
            ) : null}
            {previewUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg"
                asChild
              >
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  Abrir
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function BrandColorField({
  label,
  description,
  value,
  fallback,
  presets,
  onChange,
  error,
}: {
  label: string;
  description: string;
  value: string;
  fallback: string;
  presets: BrandColorPreset[];
  onChange: (value: string) => void;
  error?: string;
}) {
  const colorValue = normalizeHexColor(value, fallback);

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="flex gap-2">
        <Input
          type="color"
          value={colorValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-14 shrink-0 cursor-pointer rounded-xl p-1"
          aria-label={`${label} visual`}
        />
        <Input
          value={value}
          placeholder={fallback}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px] text-muted-foreground transition hover:border-primary/50 hover:text-foreground",
              normalizeHexColor(value, fallback).toLowerCase() ===
                preset.value.toLowerCase() &&
                "border-primary/60 text-foreground ring-2 ring-primary/20",
            )}
            onClick={() => onChange(preset.value)}
            aria-label={`Usar color ${preset.label}`}
          >
            <span
              className="size-4 rounded-full border border-black/10"
              style={{ backgroundColor: preset.value }}
            />
            {preset.label}
          </button>
        ))}
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function BrandingPreview({
  displayName,
  logo,
  logoDark,
  primaryColor,
  secondaryColor,
}: {
  displayName: string;
  logo: string;
  logoDark: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  const lightLogoUrl = logo.trim() ? getApiAssetUrl(logo) : null;
  const darkLogoUrl = logoDark.trim() ? getApiAssetUrl(logoDark) : lightLogoUrl;
  const primary = normalizeHexColor(primaryColor, "#EA580C");
  const secondary = normalizeHexColor(secondaryColor, "#0F172A");

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Vista previa pública
          </p>
          <p className="text-xs text-muted-foreground">
            Así se verán marca, logos y botones principales en el portal.
          </p>
        </div>
        <div className="flex gap-1.5">
          <span
            className="size-5 rounded-full border border-border"
            style={{ backgroundColor: primary }}
          />
          <span
            className="size-5 rounded-full border border-border"
            style={{ backgroundColor: secondary }}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-background p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Claro
          </p>
          <div className="flex h-16 items-center gap-3">
            {lightLogoUrl ? (
              <div
                className="h-10 w-24 shrink-0 rounded-lg bg-contain bg-left bg-no-repeat"
                style={{ backgroundImage: `url(${lightLogoUrl})` }}
              />
            ) : null}
            <span className="truncate text-base font-bold text-foreground">
              {displayName}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-white">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Oscuro
          </p>
          <div className="flex h-16 items-center gap-3">
            {darkLogoUrl ? (
              <div
                className="h-10 w-24 shrink-0 rounded-lg bg-contain bg-left bg-no-repeat"
                style={{ backgroundImage: `url(${darkLogoUrl})` }}
              />
            ) : null}
            <span className="truncate text-base font-bold">{displayName}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className="rounded-full px-4 py-2 text-xs font-semibold text-white"
          style={{ backgroundColor: primary }}
        >
          Botón principal
        </span>
        <span
          className="rounded-full border px-4 py-2 text-xs font-semibold"
          style={{ borderColor: secondary, color: secondary }}
        >
          Acción secundaria
        </span>
      </div>
    </div>
  );
}

function EmpresaContent() {
  const { data, isLoading } = useConfigEmpresa();
  const updateMutation = useUpdateConfigEmpresa();
  const formValues = React.useMemo(
    () => toEmpresaFormValues(data?.data),
    [data?.data],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<EmpresaFormValues>({
    resolver: zodResolver(empresaSchema),
    values: formValues,
  });

  const watchedNombreComercial = watch("nombreComercial") ?? "";
  const watchedRazonSocial = watch("razonSocial") ?? "";
  const watchedLogo = watch("logo") ?? "";
  const watchedLogoDark = watch("logoDark") ?? "";
  const watchedFavicon = watch("favicon") ?? "";
  const watchedColorPrimario = watch("colorPrimario") ?? "";
  const watchedColorSecundario = watch("colorSecundario") ?? "";
  const brandingDisplayName =
    watchedNombreComercial.trim() || watchedRazonSocial.trim() || "Tu empresa";

  const setEmpresaField = React.useCallback(
    (field: keyof EmpresaFormValues, value: string) => {
      setValue(field, value, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const onSubmit = (values: EmpresaFormValues) => {
    const payload: ConfigEmpresaPayload = values;

    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Configuración guardada");
        reset(values);
      },
      onError: (err: Error) => toast.error(err.message || "Error al guardar"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-72 rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <Tabs defaultValue="datos" className="flex flex-col gap-5">
        <TabsList className="sticky top-0 z-10 -mx-4 h-auto w-[calc(100%+2rem)] justify-start gap-0 rounded-none border-b border-border/60 bg-card px-4 p-0 sm:-mx-5 sm:w-[calc(100%+2.5rem)] sm:px-5">
          <TabsTrigger
            value="datos"
            className="relative h-10 gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <FileText className="size-3.5" />
            Datos
          </TabsTrigger>
          <TabsTrigger
            value="contacto"
            className="relative h-10 gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <Phone className="size-3.5" />
            Contacto
          </TabsTrigger>
          <TabsTrigger
            value="branding"
            className="relative h-10 gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <Palette className="size-3.5" />
            Branding
          </TabsTrigger>
          <TabsTrigger
            value="contenido"
            className="relative h-10 gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <Globe className="size-3.5" />
            Contenido
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Datos visibles ── */}
        <TabsContent value="datos" className="mt-0 pt-2">
          <FieldGroup>
            <div className="space-y-4">
              <div className="border-l-2 border-l-primary/50 pl-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Datos visibles de empresa
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Estos datos alimentan el portal público, metadata, branding y
                  contacto visible. No son credenciales fiscales ni reemplazan
                  el emisor SUNAT configurado en Tributario.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  className="sm:col-span-2"
                  data-invalid={errors.razonSocial ? true : undefined}
                >
                  <FieldLabel>Razón social</FieldLabel>
                  <Input
                    placeholder="Ej: Mi Empresa S.A.C."
                    {...register("razonSocial")}
                  />
                  <FieldError>{errors.razonSocial?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.nombreComercial ? true : undefined}>
                  <FieldLabel>Nombre comercial</FieldLabel>
                  <Input
                    placeholder="Ej: Inventori"
                    {...register("nombreComercial")}
                  />
                  <FieldError>{errors.nombreComercial?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.ruc ? true : undefined}>
                  <FieldLabel>RUC</FieldLabel>
                  <Input
                    placeholder="20XXXXXXXXX"
                    maxLength={11}
                    {...register("ruc")}
                  />
                  <FieldError>{errors.ruc?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.rubro ? true : undefined}>
                  <FieldLabel>Rubro</FieldLabel>
                  <Input
                    placeholder="Ej: Servicios tecnológicos"
                    {...register("rubro")}
                  />
                  <FieldError>{errors.rubro?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.slogan ? true : undefined}>
                  <FieldLabel>Slogan</FieldLabel>
                  <Input
                    placeholder="Ej: Gestión simple para tu operación"
                    {...register("slogan")}
                  />
                  <FieldError>{errors.slogan?.message}</FieldError>
                </Field>
                <Field
                  className="sm:col-span-2"
                  data-invalid={errors.descripcionCorta ? true : undefined}
                >
                  <FieldLabel>Descripción corta</FieldLabel>
                  <Textarea
                    rows={2}
                    placeholder="Resumen breve para landing, tarjetas y mensajes públicos"
                    {...register("descripcionCorta")}
                  />
                  <FieldError>{errors.descripcionCorta?.message}</FieldError>
                </Field>
                <Field
                  className="sm:col-span-2"
                  data-invalid={errors.descripcionSeo ? true : undefined}
                >
                  <FieldLabel>Descripción SEO</FieldLabel>
                  <Textarea
                    rows={2}
                    placeholder="Descripción usada como fallback para metadata y buscadores"
                    {...register("descripcionSeo")}
                  />
                  <FieldError>{errors.descripcionSeo?.message}</FieldError>
                </Field>
                <Field
                  className="sm:col-span-2"
                  data-invalid={errors.porcentajeIGV ? true : undefined}
                >
                  <FieldLabel>IGV (%)</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      placeholder="18"
                      className="max-w-35"
                      {...register("porcentajeIGV", {
                        setValueAs: (value) => {
                          if (value === "") return undefined;
                          const parsed = Number(value);
                          return Number.isFinite(parsed) ? parsed : undefined;
                        },
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Porcentaje aplicado a ventas y facturas. Estándar Perú:{" "}
                      <strong className="font-medium text-foreground">
                        18%
                      </strong>
                    </p>
                  </div>
                  <FieldError>{errors.porcentajeIGV?.message}</FieldError>
                </Field>
              </div>
            </div>
          </FieldGroup>
        </TabsContent>

        {/* ── Tab: Contacto ── */}
        <TabsContent value="contacto" className="mt-0 pt-2">
          <FieldGroup>
            <div className="space-y-4">
              <div className="border-l-2 border-l-blue-500/50 pl-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Contacto público y comercial
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Canales usados por páginas públicas, catálogo, garantía y
                  atención de tickets.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  className="sm:col-span-2"
                  data-invalid={errors.direccion ? true : undefined}
                >
                  <FieldLabel>Dirección</FieldLabel>
                  <Input
                    placeholder="Av. Ejemplo 123"
                    {...register("direccion")}
                  />
                  <FieldError>{errors.direccion?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.telefono ? true : undefined}>
                  <FieldLabel>Teléfono general</FieldLabel>
                  <Input
                    placeholder="+51 999 999 999"
                    {...register("telefono")}
                  />
                  <FieldError>{errors.telefono?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.email ? true : undefined}>
                  <FieldLabel>Email general</FieldLabel>
                  <Input
                    type="email"
                    placeholder="contacto@empresa.com"
                    {...register("email")}
                  />
                  <FieldError>{errors.email?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.website ? true : undefined}>
                  <FieldLabel>Sitio web</FieldLabel>
                  <Input
                    placeholder="https://empresa.com"
                    {...register("website")}
                  />
                  <FieldError>{errors.website?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.whatsapp ? true : undefined}>
                  <FieldLabel>WhatsApp</FieldLabel>
                  <Input
                    placeholder="+51 999 999 999"
                    {...register("whatsapp")}
                  />
                  <FieldError>{errors.whatsapp?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.telefonoVentas ? true : undefined}>
                  <FieldLabel>Teléfono de ventas</FieldLabel>
                  <Input
                    placeholder="+51 999 999 999"
                    {...register("telefonoVentas")}
                  />
                  <FieldError>{errors.telefonoVentas?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.telefonoSoporte ? true : undefined}>
                  <FieldLabel>Teléfono de soporte</FieldLabel>
                  <Input
                    placeholder="+51 999 999 999"
                    {...register("telefonoSoporte")}
                  />
                  <FieldError>{errors.telefonoSoporte?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.emailVentas ? true : undefined}>
                  <FieldLabel>Email de ventas</FieldLabel>
                  <Input
                    type="email"
                    placeholder="ventas@empresa.com"
                    {...register("emailVentas")}
                  />
                  <FieldError>{errors.emailVentas?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.emailSoporte ? true : undefined}>
                  <FieldLabel>Email de soporte</FieldLabel>
                  <Input
                    type="email"
                    placeholder="soporte@empresa.com"
                    {...register("emailSoporte")}
                  />
                  <FieldError>{errors.emailSoporte?.message}</FieldError>
                </Field>
              </div>
            </div>
          </FieldGroup>
        </TabsContent>

        {/* ── Tab: Branding ── */}
        <TabsContent value="branding" className="mt-0 pt-2">
          <FieldGroup>
            <div className="space-y-4">
              <div className="border-l-2 border-l-violet-500/50 pl-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Branding visual
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Estos recursos sí se guardan en ConfigEmpresa y se consumen en
                  el portal público, metadata y PWA. Puedes subir imágenes o
                  pegar rutas públicas/URLs absolutas.
                </p>
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-xs text-violet-900 dark:text-violet-100">
                <strong className="font-semibold">Importante:</strong> la subida
                acepta PNG/JPG/WebP. Si necesitas SVG o ICO, déjalos en
                `public/` o usa una URL externa segura y pega la ruta aquí.
              </div>

              <BrandingPreview
                displayName={brandingDisplayName}
                logo={watchedLogo}
                logoDark={watchedLogoDark}
                primaryColor={watchedColorPrimario}
                secondaryColor={watchedColorSecundario}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <BrandingAssetField
                  label="Logo principal"
                  description="Se usa como marca pública en cabeceras y vistas claras. Ruta sugerida: /logo.svg o archivo subido."
                  placeholder="/logo.svg"
                  value={watchedLogo}
                  onChange={(value) => setEmpresaField("logo", value)}
                  error={errors.logo?.message}
                />
                <BrandingAssetField
                  label="Logo modo oscuro"
                  description="Opcional. Si se deja vacío, se reutiliza el logo principal."
                  placeholder="/logo-dark.svg"
                  value={watchedLogoDark}
                  onChange={(value) => setEmpresaField("logoDark", value)}
                  error={errors.logoDark?.message}
                />
                <div className="lg:col-span-2">
                  <BrandingAssetField
                    label="Favicon"
                    description="Icono de pestaña/metadata. Para ICO/SVG usa ruta manual; para subir desde aquí usa PNG/JPG/WebP."
                    placeholder="/favicon.ico"
                    value={watchedFavicon}
                    onChange={(value) => setEmpresaField("favicon", value)}
                    error={errors.favicon?.message}
                    compact
                  />
                </div>
              </div>

              {normalizeHexColor(
                watchedColorPrimario,
                "#EA580C",
              ).toLowerCase() ===
              normalizeHexColor(
                watchedColorSecundario,
                "#0F172A",
              ).toLowerCase() ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:text-amber-100">
                  <p>
                    Primario y secundario están iguales. Funciona, pero se
                    recomienda que el secundario sea más oscuro/neutro para que
                    botones, textos y bordes tengan jerarquía visual.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 rounded-lg"
                    onClick={() =>
                      setEmpresaField("colorSecundario", "#0F172A")
                    }
                  >
                    Usar contraste recomendado
                  </Button>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <BrandColorField
                  label="Color primario público"
                  description="Acento principal: botones, llamados a la acción y elementos destacados del portal."
                  fallback="#EA580C"
                  presets={PRIMARY_COLOR_PRESETS}
                  value={watchedColorPrimario}
                  onChange={(value) => setEmpresaField("colorPrimario", value)}
                  error={errors.colorPrimario?.message}
                />
                <BrandColorField
                  label="Color secundario público"
                  description="Color de contraste: textos fuertes, botones secundarios, bordes y detalles institucionales."
                  fallback="#0F172A"
                  presets={SECONDARY_COLOR_PRESETS}
                  value={watchedColorSecundario}
                  onChange={(value) =>
                    setEmpresaField("colorSecundario", value)
                  }
                  error={errors.colorSecundario?.message}
                />
              </div>
            </div>
          </FieldGroup>
        </TabsContent>

        {/* ── Tab: Contenido público ── */}
        <TabsContent value="contenido" className="mt-0 pt-2">
          <FieldGroup>
            <div className="space-y-4">
              <div className="border-l-2 border-l-emerald-500/50 pl-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Contenido público
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Textos configurables para landing, catálogo, contacto,
                  garantía, tickets y PWA.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  className="sm:col-span-2"
                  data-invalid={errors.heroTitulo ? true : undefined}
                >
                  <FieldLabel>Título principal de landing</FieldLabel>
                  <Input
                    placeholder="Título comercial para la portada pública"
                    {...register("heroTitulo")}
                  />
                  <FieldError>{errors.heroTitulo?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.heroSubtitulo ? true : undefined}>
                  <FieldLabel>Subtítulo de landing</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Mensaje breve debajo del título principal"
                    {...register("heroSubtitulo")}
                  />
                  <FieldError>{errors.heroSubtitulo?.message}</FieldError>
                </Field>
                <Field
                  data-invalid={errors.catalogoDescripcion ? true : undefined}
                >
                  <FieldLabel>Descripción de catálogo</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Texto introductorio para el catálogo público"
                    {...register("catalogoDescripcion")}
                  />
                  <FieldError>{errors.catalogoDescripcion?.message}</FieldError>
                </Field>
                <Field
                  data-invalid={errors.contactoDescripcion ? true : undefined}
                >
                  <FieldLabel>Descripción de contacto</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Texto para orientar solicitudes comerciales o de soporte"
                    {...register("contactoDescripcion")}
                  />
                  <FieldError>{errors.contactoDescripcion?.message}</FieldError>
                </Field>
                <Field
                  data-invalid={errors.garantiaDescripcion ? true : undefined}
                >
                  <FieldLabel>Descripción de garantía</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Texto para la consulta pública de garantías"
                    {...register("garantiaDescripcion")}
                  />
                  <FieldError>{errors.garantiaDescripcion?.message}</FieldError>
                </Field>
                <Field
                  data-invalid={errors.ticketDescripcion ? true : undefined}
                >
                  <FieldLabel>Descripción de tickets</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Texto para crear o consultar tickets públicos"
                    {...register("ticketDescripcion")}
                  />
                  <FieldError>{errors.ticketDescripcion?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.pwaDescripcion ? true : undefined}>
                  <FieldLabel>Descripción PWA</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Descripción usada en el manifest instalable"
                    {...register("pwaDescripcion")}
                  />
                  <FieldError>{errors.pwaDescripcion?.message}</FieldError>
                </Field>
              </div>
            </div>
          </FieldGroup>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end border-t border-border/50 pt-4">
        <Button
          type="submit"
          disabled={updateMutation.isPending || !isDirty}
          className="rounded-xl"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════
   USUARIOS SECTION — Full CRUD inside Settings (ADMIN only)
   ═══════════════════════════════════════════════════════ */

const ROL_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  ENCARGADO: "Encargado",
  TECNICO: "Técnico",
};

const USERS_PAGE_SIZE = 100;

type UsuariosViewMode = "table" | "cards";

function usuarioFullName(usuario: Pick<UsuarioItem, "nombre" | "apellido">) {
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ").trim();
}

function usuarioInitials(usuario: Pick<UsuarioItem, "nombre" | "apellido">) {
  const initials = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`;
  return initials.toUpperCase() || "US";
}

function formatUsuarioDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const createUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
  rol: z.nativeEnum(RolUsuario),
  activo: z.boolean(),
});
type CreateUsuarioForm = z.infer<typeof createUsuarioSchema>;

const editUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Ingresa un correo válido"),
  rol: z.nativeEnum(RolUsuario),
  activo: z.boolean(),
});
type EditUsuarioForm = z.infer<typeof editUsuarioSchema>;

const changePasswordSchema = z
  .object({
    password: z.string().regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
    confirmPassword: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

function UsuariosContent({
  onRequestDelete,
}: {
  onRequestDelete: (id: string) => void;
}) {
  const { hasRole, user: currentUser } = useAuth();
  const canManage = hasRole(RolUsuario.ADMIN);
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<UsuarioItem | null>(
    null,
  );
  const [changingPasswordItem, setChangingPasswordItem] =
    React.useState<UsuarioItem | null>(null);
  const [viewingItem, setViewingItem] = React.useState<UsuarioItem | null>(
    null,
  );
  const [viewMode, setViewMode] = React.useState<UsuariosViewMode>("table");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: res, isLoading } = useUsuarios(
    page,
    debouncedSearch || undefined,
    USERS_PAGE_SIZE,
  );
  const createMutation = useCreateUsuario();
  const activarMutation = useActivarUsuario();
  const desactivarMutation = useDesactivarUsuario();

  const handleToggleActive = React.useCallback(
    (usuario: UsuarioItem) => {
      if (usuario.activo) {
        desactivarMutation.mutate(usuario.id, {
          onSuccess: () => toast.success(`${usuario.nombre} desactivado`),
          onError: (err: Error) =>
            toast.error(err.message || "Error al desactivar"),
        });
      } else {
        activarMutation.mutate(usuario.id, {
          onSuccess: () => toast.success(`${usuario.nombre} activado`),
          onError: (err: Error) =>
            toast.error(err.message || "Error al activar"),
        });
      }
    },
    [activarMutation, desactivarMutation],
  );

  const usuarios = res?.data ?? [];
  const meta = res?.meta;

  const totalUsuarios = meta?.total ?? usuarios.length;
  const activosCount = React.useMemo(
    () => usuarios.filter((u) => u.activo).length,
    [usuarios],
  );
  const adminsCount = React.useMemo(
    () => usuarios.filter((u) => u.rol === RolUsuario.ADMIN).length,
    [usuarios],
  );
  const tecnicosCount = React.useMemo(
    () => usuarios.filter((u) => u.rol === RolUsuario.TECNICO).length,
    [usuarios],
  );

  const activeViewingItem = viewingItem
    ? usuarios.find((u) => u.id === viewingItem.id) || viewingItem
    : null;

  const columns = React.useMemo<ColumnDef<UsuarioItem, unknown>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Usuario",
        size: 260,
        cell: ({ row }) => {
          const usuario = row.original;
          const isSelf = currentUser?.id === usuario.id;
          return (
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {usuarioInitials(usuario)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium text-foreground">
                    {usuarioFullName(usuario)}
                  </span>
                  {isSelf ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Tú
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {usuario.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        size: 220,
        cell: ({ row }) => (
          <span className="block truncate text-sm text-muted-foreground">
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: "rol",
        header: "Rol",
        size: 150,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px]">
            <Shield className="mr-1 size-3" />
            {ROL_LABELS[row.original.rol] ?? row.original.rol}
          </Badge>
        ),
      },
      {
        id: "modules",
        header: "Módulos",
        size: 90,
        enableSorting: false,
        cell: ({ row }) => (
          <RoleModuleCountBadge rol={row.original.rol} />
        ),
      },
      {
        accessorKey: "activo",
        header: "Estado",
        size: 120,
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
        accessorKey: "mustChangePassword",
        header: "Seguridad",
        size: 160,
        cell: ({ row }) => (
          <Badge
            variant={row.original.mustChangePassword ? "outline" : "secondary"}
            className="text-[10px]"
          >
            {row.original.mustChangePassword ? "Cambio requerido" : "OK"}
          </Badge>
        ),
      },
      {
        accessorKey: "ultimoAcceso",
        header: "Último acceso",
        size: 160,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatUsuarioDateTime(row.original.ultimoAcceso)}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Creado",
        size: 150,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatUsuarioDateTime(row.original.createdAt)}
          </span>
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
        cell: ({ row }) => {
          if (!canManage) return null;

          const usuario = row.original;
          const isSelf = currentUser?.id === usuario.id;
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
                  {canManage ? (
                    <>
                      <DropdownMenuItem onClick={() => setEditingItem(usuario)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setChangingPasswordItem(usuario)}
                      >
                        <KeyRound className="size-4" />
                        Cambiar contraseña
                      </DropdownMenuItem>
                      {!isSelf ? (
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(usuario)}
                        >
                          {usuario.activo ? (
                            <>
                              <PowerOff className="size-4" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <Power className="size-4" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                      ) : null}
                      {!isSelf ? (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onRequestDelete(usuario.id)}
                        >
                          <Trash2 className="size-4" />
                          Eliminar
                        </DropdownMenuItem>
                      ) : null}
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canManage, currentUser?.id, onRequestDelete, handleToggleActive],
  );

  return (
    <>
      <div className="flex flex-col gap-4">
        {canManage && (
          <TopbarActions>
            <RealtimeStatus />
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="erp-page-primary-cta rounded-xl gap-2 h-9 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nuevo usuario</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </TopbarActions>
        )}

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={isLoading ? undefined : totalUsuarios}
            icon={Users}
            theme="sky"
            subtitle="Cuentas registradas"
            isLoading={isLoading}
          />
          <StatCard
            label="Activos"
            value={isLoading ? undefined : activosCount}
            icon={UserCheck}
            theme="emerald"
            subtitle="Con acceso al sistema"
            isLoading={isLoading}
          />
          <StatCard
            label="Administradores"
            value={isLoading ? undefined : adminsCount}
            icon={ShieldCheck}
            theme="indigo"
            subtitle="Permisos totales"
            isLoading={isLoading}
          />
          <StatCard
            label="Técnicos"
            value={isLoading ? undefined : tecnicosCount}
            icon={Wrench}
            theme="amber"
            subtitle="Operación de soporte"
            isLoading={isLoading}
          />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 md:pr-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground truncate">
              Usuarios
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Gestiona las cuentas de usuario del sistema
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-border bg-background hover:border-sky-400/60 dark:hover:border-sky-500/60 focus-visible:border-sky-500 dark:focus-visible:border-sky-400 focus-visible:ring-sky-400/25 dark:focus-visible:ring-sky-500/25 shadow-sm"
          />
        </div>

        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as UsuariosViewMode)}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {meta?.total ?? usuarios.length} usuarios encontrados
            </p>
            <TabsList className="h-9 rounded-xl">
              <TabsTrigger value="table" className="h-8 rounded-lg text-xs">
                Tabla
              </TabsTrigger>
              <TabsTrigger value="cards" className="h-8 rounded-lg text-xs">
                Tarjetas
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="table" className="mt-0">
            <SettingsDataTable
              columns={columns}
              data={usuarios}
              isLoading={isLoading}
              emptyMessage={debouncedSearch ? "Sin resultados" : "Sin usuarios"}
              emptyDescription={
                debouncedSearch
                  ? "Intenta con otro término de búsqueda."
                  : "Crea el primer usuario para comenzar."
              }
              storageKey="settings:usuarios:columns"
              defaultPageSize={10}
            />
          </TabsContent>

          <TabsContent value="cards" className="mt-0">
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border/40 bg-card/50 p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1.5" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : usuarios.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-dashed border-border">
                <div className="flex size-14 items-center justify-center rounded-full bg-muted/40">
                  <Users className="size-7 text-muted-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-muted-foreground">
                    {debouncedSearch ? "Sin resultados" : "Sin usuarios"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {debouncedSearch
                      ? "Intenta con otro término de búsqueda"
                      : "Crea el primer usuario para comenzar"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {usuarios.map((usuario) => (
                  <UsuarioCard
                    key={usuario.id}
                    usuario={usuario}
                    canManage={canManage}
                    isSelf={currentUser?.id === usuario.id}
                    onView={() => setViewingItem(usuario)}
                    onEdit={() => setEditingItem(usuario)}
                    onChangePassword={() => setChangingPasswordItem(usuario)}
                    onDelete={() => onRequestDelete(usuario.id)}
                    onToggleActive={() => handleToggleActive(usuario)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {meta && meta.total > USERS_PAGE_SIZE && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Página {meta.page} de{" "}
              {Math.ceil(meta.total / (meta.limit || USERS_PAGE_SIZE))}
              {" · "}
              {meta.total} usuarios
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-7 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-7 text-xs"
                disabled={
                  page >=
                  Math.ceil(meta.total / (meta.limit || USERS_PAGE_SIZE))
                }
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Crea una cuenta de acceso al sistema con el rol correspondiente.
            </DialogDescription>
          </DialogHeader>
          <UsuarioCreateForm
            onSuccess={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
            createMutation={createMutation}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos de la cuenta seleccionada.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <UsuarioEditForm
              usuario={editingItem}
              onDone={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      <Dialog
        open={!!changingPasswordItem}
        onOpenChange={(open) => {
          if (!open) setChangingPasswordItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              {changingPasswordItem
                ? `Define una nueva contraseña para ${changingPasswordItem.nombre} ${changingPasswordItem.apellido}.`
                : "Define una nueva contraseña para este usuario."}
            </DialogDescription>
          </DialogHeader>
          {changingPasswordItem && (
            <UsuarioChangePasswordForm
              usuarioId={changingPasswordItem.id}
              onDone={() => setChangingPasswordItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => {
          if (!open) setViewingItem(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de usuario</DialogTitle>
            <DialogDescription>
              Información completa de la cuenta seleccionada.
            </DialogDescription>
          </DialogHeader>
          {activeViewingItem ? (
            <UsuarioDetailsContent
              usuario={activeViewingItem}
              isSelf={currentUser?.id === activeViewingItem.id}
              canManage={canManage}
              onToggleActive={() => handleToggleActive(activeViewingItem)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Usuario Card ── */

function UsuarioCard({
  usuario,
  canManage,
  isSelf,
  onView,
  onEdit,
  onChangePassword,
  onDelete,
  onToggleActive,
}: {
  usuario: UsuarioItem;
  canManage: boolean;
  isSelf: boolean;
  onView: () => void;
  onEdit: () => void;
  onChangePassword: () => void;
  onDelete: () => void;
  onToggleActive?: () => void;
}) {
  const profileImage =
    usuario.avatarUrl ??
    usuario.fotoPerfilUrl ??
    usuario.fotoPerfil ??
    usuario.imagen ??
    null;
  const profileImageUrl = profileImage ? getApiAssetUrl(profileImage) : null;
  const primaryPhone = usuario.whatsapp ?? usuario.celular ?? usuario.telefono;

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:border-ring/50 hover:shadow-md">
      {canManage && !isSelf ? (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}

      <div className="flex items-center gap-3 pr-7">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-violet-700 bg-cover bg-center text-sm font-bold text-white shadow-sm dark:from-violet-700 dark:to-violet-900"
          style={
            profileImageUrl
              ? { backgroundImage: `url(${profileImageUrl})` }
              : undefined
          }
        >
          {profileImageUrl ? null : usuarioInitials(usuario)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold leading-tight"
            title={usuarioFullName(usuario)}
          >
            {usuarioFullName(usuario)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {usuario.email}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Shield className="size-3" />
          {ROL_LABELS[usuario.rol] ?? usuario.rol}
        </Badge>
        <RoleModuleCountBadge rol={usuario.rol} />
        <Badge
          variant={usuario.activo ? "default" : "outline"}
          className="text-[10px]"
        >
          {usuario.activo ? "Activo" : "Inactivo"}
        </Badge>
        {isSelf ? (
          <Badge variant="secondary" className="text-[10px]">
            Tú
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <Mail className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="truncate">{usuario.email}</span>
        </div>
        {primaryPhone ? (
          <div className="flex items-center gap-2">
            <Phone className="size-3 shrink-0 text-muted-foreground/60" />
            <span>{primaryPhone}</span>
            <span className="ml-auto text-[10px] text-muted-foreground/50">
              contacto
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-40">
            <Phone className="size-3 shrink-0" />
            <span className="italic">Sin teléfono</span>
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-2 pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 flex-1 gap-1.5 rounded-lg text-xs font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
          onClick={onView}
        >
          <Eye className="size-3.5" />
          Ver detalles
        </Button>
        {canManage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 flex-1 gap-1.5 rounded-lg text-xs"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 justify-start gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted"
            onClick={onChangePassword}
          >
            <KeyRound className="size-3.5" />
            Cambiar contr.
          </Button>
          {!isSelf && onToggleActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 justify-end gap-1.5 rounded-lg px-2 text-xs font-medium hover:bg-muted",
                usuario.activo
                  ? "text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
              )}
              onClick={onToggleActive}
            >
              {usuario.activo ? (
                <>
                  <PowerOff className="size-3.5" />
                  Desactivar
                </>
              ) : (
                <>
                  <Power className="size-3.5" />
                  Activar
                </>
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function UsuarioDetailsContent({
  usuario,
  isSelf,
  canManage,
  onToggleActive,
}: {
  usuario: UsuarioItem;
  isSelf: boolean;
  canManage: boolean;
  onToggleActive: () => void;
}) {
  const profileImage =
    usuario.avatarUrl ??
    usuario.fotoPerfilUrl ??
    usuario.fotoPerfil ??
    usuario.imagen ??
    null;
  const profileImageUrl = profileImage ? getApiAssetUrl(profileImage) : null;
  const sections: Array<{
    title: string;
    rows: Array<{ label: string; value: React.ReactNode }>;
  }> = [
    {
      title: "Cuenta",
      rows: [
        { label: "Nombre", value: usuario.nombre },
        { label: "Apellido", value: usuario.apellido },
        { label: "Email", value: usuario.email },
        { label: "Rol", value: ROL_LABELS[usuario.rol] ?? usuario.rol },
        { label: "Estado", value: usuario.activo ? "Activo" : "Inactivo" },
      ],
    },
    {
      title: "Perfil personal",
      rows: [
        { label: "Teléfono", value: usuario.telefono ?? "—" },
        { label: "Celular", value: usuario.celular ?? "—" },
        { label: "WhatsApp", value: usuario.whatsapp ?? "—" },
        { label: "Cargo / área", value: usuario.cargo ?? "—" },
        { label: "Dirección", value: usuario.direccion ?? "—" },
        { label: "Bio", value: usuario.bio ?? "—" },
      ],
    },
    {
      title: "Seguridad y auditoría",
      rows: [
        {
          label: "Cambio de contraseña",
          value: usuario.mustChangePassword ? "Requerido" : "No requerido",
        },
        {
          label: "Último acceso",
          value: formatUsuarioDateTime(usuario.ultimoAcceso),
        },
        { label: "Creado", value: formatUsuarioDateTime(usuario.createdAt) },
        {
          label: "Actualizado",
          value: formatUsuarioDateTime(usuario.updatedAt),
        },
        {
          label: "ID",
          value: <span className="font-mono text-[11px]">{usuario.id}</span>,
        },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 bg-cover bg-center text-sm font-semibold text-primary"
            style={
              profileImageUrl
                ? { backgroundImage: `url(${profileImageUrl})` }
                : undefined
            }
          >
            {profileImageUrl ? null : usuarioInitials(usuario)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {usuarioFullName(usuario)}
              </h3>
              {isSelf ? (
                <Badge variant="secondary" className="text-[10px]">
                  Tú
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px]">
                {ROL_LABELS[usuario.rol] ?? usuario.rol}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {usuario.email}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Los datos de contacto y foto de perfil los completa el usuario desde
              su perfil personal.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Badge variant={usuario.activo ? "default" : "outline"} className="text-[10px]">
            {usuario.activo ? "Activo" : "Inactivo"}
          </Badge>
          {canManage && !isSelf ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-7 rounded-lg text-xs gap-1.5",
                usuario.activo
                  ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                  : "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
              )}
              onClick={onToggleActive}
            >
              {usuario.activo ? (
                <>
                  <PowerOff className="size-3" />
                  Desactivar
                </>
              ) : (
                <>
                  <Power className="size-3" />
                  Activar
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-border/40 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h4>
            <div className="space-y-2">
              {section.rows.map((row, i) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-3 py-1.5",
                    i % 2 === 0 ? "bg-muted/30" : "",
                  )}
                >
                  <span className="text-[11px] text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="text-right text-sm text-foreground">
                    {row.value || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <RoleAccessFull rol={usuario.rol} />
    </div>
  );
}

function AlmacenDetailsContent({ almacen }: { almacen: AlmacenItem }) {
  const rows = [
    { label: "Nombre", value: almacen.nombre },
    { label: "Descripción", value: almacen.descripcion || "—" },
    { label: "Tipo", value: almacen.esPrincipal ? "Principal" : "Secundario" },
    { label: "Estado", value: almacen.activo ? "Activo" : "Inactivo" },
    { label: "ID", value: almacen.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Warehouse className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {almacen.nombre}
            </h3>
            {almacen.esPrincipal ? (
              <Badge variant="secondary" className="text-[10px]">
                Principal
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {almacen.descripcion || "Sin descripción registrada"}
          </p>
        </div>
        <Badge variant={almacen.activo ? "default" : "outline"}>
          {almacen.activo ? "Activo" : "Inactivo"}
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

/* ── Create User Form ── */

function UsuarioCreateForm({
  onSuccess,
  onCancel,
  createMutation,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  createMutation: ReturnType<typeof useCreateUsuario>;
}) {
  const [showPw, setShowPw] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUsuarioForm>({
    resolver: zodResolver(createUsuarioSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      email: "",
      password: "",
      rol: RolUsuario.TECNICO,
      activo: true,
    },
  });

  const activo = watch("activo");
  const rol = watch("rol");

  const handleGeneratePassword = () => {
    const password = generateSecurePassword();
    setValue("password", password, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setShowPw(true);
  };

  const onSubmit = (data: CreateUsuarioForm) => {
    createMutation.mutate(data as CreateUsuarioPayload, {
      onSuccess: () => {
        toast.success("Usuario creado correctamente");
        onSuccess();
      },
      onError: (err: Error) =>
        toast.error(err.message || "Error al crear usuario"),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input
              {...register("nombre")}
              placeholder="Juan"
              aria-invalid={!!errors.nombre}
              autoFocus
            />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>
          <Field data-invalid={errors.apellido ? true : undefined}>
            <FieldLabel>Apellido *</FieldLabel>
            <Input
              {...register("apellido")}
              placeholder="Pérez"
              aria-invalid={!!errors.apellido}
            />
            <FieldError>{errors.apellido?.message}</FieldError>
          </Field>
        </div>

        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel>Email *</FieldLabel>
          <Input
            type="email"
            {...register("email")}
            placeholder="juan@empresa.com"
            aria-invalid={!!errors.email}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={errors.password ? true : undefined}>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>Contraseña *</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-lg px-2 text-xs"
                onClick={handleGeneratePassword}
              >
                <Wand2 className="mr-1 size-3.5" />
                Generar
              </Button>
            </div>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                {...register("password")}
                placeholder="Contraseña segura"
                aria-invalid={!!errors.password}
                className="pr-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 size-9 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw(!showPw)}
                tabIndex={-1}
              >
                {showPw ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {PASSWORD_REQUIREMENTS_TEXT}
            </p>
            <FieldError>{errors.password?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.rol ? true : undefined}>
            <FieldLabel>Rol *</FieldLabel>
            <Select
              value={rol}
              onValueChange={(v) => setValue("rol", v as RolUsuario)}
            >
              <SelectTrigger aria-invalid={!!errors.rol}>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(RolUsuario).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROL_LABELS[r] ?? r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.rol?.message}</FieldError>
          </Field>
        </div>

        <Field orientation="horizontal">
          <FieldLabel>Activo</FieldLabel>
          <Switch
            checked={activo ?? true}
            onCheckedChange={(v) => setValue("activo", v)}
          />
        </Field>

        {rol ? (
          <div className="space-y-1.5 border-t border-border/40 pt-3 mt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preview de accesos</span>
            <RoleAccessCompact rol={rol} />
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
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
            {createMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Crear usuario
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function UsuarioEditForm({
  usuario,
  onDone,
}: {
  usuario: UsuarioItem;
  onDone: () => void;
}) {
  const updateMutation = useUpdateUsuario(usuario.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditUsuarioForm>({
    resolver: zodResolver(editUsuarioSchema),
    defaultValues: {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
    },
  });

  const rol = watch("rol");
  const activo = watch("activo");

  const onSubmit = (data: EditUsuarioForm) => {
    updateMutation.mutate(data as UpdateUsuarioPayload, {
      onSuccess: () => {
        toast.success("Usuario actualizado correctamente");
        onDone();
      },
      onError: (err: Error) =>
        toast.error(err.message || "Error al actualizar usuario"),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={errors.nombre ? true : undefined}>
            <FieldLabel>Nombre *</FieldLabel>
            <Input
              {...register("nombre")}
              placeholder="Juan"
              aria-invalid={!!errors.nombre}
              autoFocus
            />
            <FieldError>{errors.nombre?.message}</FieldError>
          </Field>
          <Field data-invalid={errors.apellido ? true : undefined}>
            <FieldLabel>Apellido *</FieldLabel>
            <Input
              {...register("apellido")}
              placeholder="Pérez"
              aria-invalid={!!errors.apellido}
            />
            <FieldError>{errors.apellido?.message}</FieldError>
          </Field>
        </div>

        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel>Email *</FieldLabel>
          <Input
            type="email"
            {...register("email")}
            placeholder="juan@empresa.com"
            aria-invalid={!!errors.email}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={errors.rol ? true : undefined}>
            <FieldLabel>Rol *</FieldLabel>
            <Select
              value={rol}
              onValueChange={(v) => setValue("rol", v as RolUsuario)}
            >
              <SelectTrigger aria-invalid={!!errors.rol}>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(RolUsuario).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROL_LABELS[r] ?? r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.rol?.message}</FieldError>
          </Field>

          <Field orientation="horizontal" className="self-end pb-1">
            <FieldLabel>Activo</FieldLabel>
            <Switch
              checked={activo}
              onCheckedChange={(v) => setValue("activo", v)}
            />
          </Field>
        </div>

        {rol ? (
          <div className="space-y-1.5 border-t border-border/40 pt-3 mt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preview de accesos</span>
            <RoleAccessCompact rol={rol} />
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
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
            {updateMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            <Check className="size-4" />
            Guardar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

/* ── Change Password Form ── */

function UsuarioChangePasswordForm({
  usuarioId,
  onDone,
}: {
  usuarioId: string;
  onDone: () => void;
}) {
  const mutation = useChangeUsuarioPassword(usuarioId);
  const [showPw, setShowPw] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const handleGeneratePassword = () => {
    const password = generateSecurePassword();
    setValue("password", password, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("confirmPassword", password, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setShowPw(true);
  };

  const onSubmit = (data: ChangePasswordForm) => {
    mutation.mutate(
      { password: data.password },
      {
        onSuccess: () => {
          toast.success("Contraseña actualizada");
          onDone();
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al cambiar contraseña"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-3">
        <Field data-invalid={errors.password ? true : undefined}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel>Nueva contraseña *</FieldLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-xs"
              onClick={handleGeneratePassword}
            >
              <Wand2 className="mr-1 size-3.5" />
              Generar
            </Button>
          </div>
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              {...register("password")}
              placeholder="Contrasena segura"
              aria-invalid={!!errors.password}
              autoFocus
              className="pr-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 size-9 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPw(!showPw)}
              tabIndex={-1}
            >
              {showPw ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {PASSWORD_REQUIREMENTS_TEXT}
          </p>
          <FieldError>{errors.password?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.confirmPassword ? true : undefined}>
          <FieldLabel>Confirmar contraseña *</FieldLabel>
          <Input
            type={showPw ? "text" : "password"}
            {...register("confirmPassword")}
            placeholder="Repite la contraseña"
            aria-invalid={!!errors.confirmPassword}
          />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </Field>

        <div className="flex justify-end gap-2 pt-1">
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
            disabled={mutation.isPending}
            className="rounded-xl"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Cambiar contraseña
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

const profileSchema = z.object({
  telefono: z.string().trim().max(40, "Máximo 40 caracteres").optional(),
  celular: z.string().trim().max(40, "Máximo 40 caracteres").optional(),
  whatsapp: z.string().trim().max(40, "Máximo 40 caracteres").optional(),
  cargo: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
  direccion: z.string().trim().max(220, "Máximo 220 caracteres").optional(),
  bio: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  avatarUrl: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function toProfileFormValues(
  user: ReturnType<typeof useAuth>["user"],
): ProfileFormValues {
  return {
    telefono: user?.telefono ?? "",
    celular: user?.celular ?? "",
    whatsapp: user?.whatsapp ?? "",
    cargo: user?.cargo ?? "",
    direccion: user?.direccion ?? "",
    bio: user?.bio ?? "",
    avatarUrl: user?.avatarUrl ?? "",
  };
}

function buildProfilePayload(values: ProfileFormValues) {
  const payload: UpdateOwnProfilePayload = {};
  (Object.keys(values) as Array<keyof ProfileFormValues>).forEach((field) => {
    const value = values[field]?.trim();
    payload[field] = value || undefined;
  });
  return payload;
}

function ProfileSettingsContent() {
  const { user, updateProfile } = useAuth();
  const [isUploading, setIsUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const formValues = React.useMemo(() => toProfileFormValues(user), [user]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: formValues,
  });

  const avatarUrl = watch("avatarUrl") ?? "";
  const previewUrl = avatarUrl ? getApiAssetUrl(avatarUrl) : null;

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const updated = await updateProfile(buildProfilePayload(values));
      reset(toProfileFormValues(updated));
      toast.success("Perfil actualizado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo actualizar perfil",
      );
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const [uploaded] = await uploadSelectedFiles([file], {
        preset: "image",
        maxFiles: 1,
      });
      setValue("avatarUrl", uploaded.path, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success("Foto de perfil cargada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo subir la foto",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        Inicia sesión para editar tu perfil.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 bg-cover bg-center text-sm font-semibold text-primary"
          style={
            previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined
          }
        >
          {previewUrl ? null : usuarioInitials(user)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            {usuarioFullName(user)}
          </h3>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Estos datos los completas tú y se muestran a los administradores en
            el detalle de usuario.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={getUploadAcceptAttr("image")}
              className="sr-only"
              onChange={handleAvatarUpload}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {isUploading ? "Subiendo..." : "Subir foto"}
            </Button>
            {avatarUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg"
                onClick={() =>
                  setValue("avatarUrl", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                Quitar foto
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <FieldGroup className="grid gap-3 sm:grid-cols-2">
        <Field data-invalid={errors.telefono ? true : undefined}>
          <FieldLabel>Teléfono</FieldLabel>
          <Input placeholder="+51 999 888 777" {...register("telefono")} />
          <FieldError>{errors.telefono?.message}</FieldError>
        </Field>
        <Field data-invalid={errors.celular ? true : undefined}>
          <FieldLabel>Celular</FieldLabel>
          <Input placeholder="+51 999 888 777" {...register("celular")} />
          <FieldError>{errors.celular?.message}</FieldError>
        </Field>
        <Field data-invalid={errors.whatsapp ? true : undefined}>
          <FieldLabel>WhatsApp</FieldLabel>
          <Input placeholder="+51 999 888 777" {...register("whatsapp")} />
          <FieldError>{errors.whatsapp?.message}</FieldError>
        </Field>
        <Field data-invalid={errors.cargo ? true : undefined}>
          <FieldLabel>Cargo / área</FieldLabel>
          <Input placeholder="Soporte técnico" {...register("cargo")} />
          <FieldError>{errors.cargo?.message}</FieldError>
        </Field>
        <Field
          className="sm:col-span-2"
          data-invalid={errors.direccion ? true : undefined}
        >
          <FieldLabel>Dirección</FieldLabel>
          <Input placeholder="Av. Principal 123" {...register("direccion")} />
          <FieldError>{errors.direccion?.message}</FieldError>
        </Field>
        <Field
          className="sm:col-span-2"
          data-invalid={errors.bio ? true : undefined}
        >
          <FieldLabel>Bio / notas de perfil</FieldLabel>
          <Textarea
            rows={3}
            placeholder="Cuéntanos tu rol o datos de contacto internos."
            {...register("bio")}
          />
          <FieldError>{errors.bio?.message}</FieldError>
        </Field>
        <Field
          className="sm:col-span-2"
          data-invalid={errors.avatarUrl ? true : undefined}
        >
          <FieldLabel>Ruta de foto de perfil</FieldLabel>
          <Input
            placeholder="/uploads/public/avatar.webp"
            {...register("avatarUrl")}
          />
          <FieldError>{errors.avatarUrl?.message}</FieldError>
        </Field>
      </FieldGroup>

      <div className="flex justify-end border-t border-border/50 pt-4">
        <Button
          type="submit"
          className="rounded-xl"
          disabled={!isDirty || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar perfil
        </Button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════
   GENERIC PLACEHOLDER
   ═══════════════════════════════════════════════════════ */

function PlaceholderContent({ sectionId }: { sectionId: SectionId }) {
  const section = sectionsList.find((s) => s.id === sectionId)!;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {section.name}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configuración de {section.name.toLowerCase()}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/40 bg-muted/20 p-4 h-20"
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION ROUTER
   ═══════════════════════════════════════════════════════ */

export function SectionContent({
  sectionId,
  onRequestDeleteAction,
}: {
  sectionId: SectionId;
  onRequestDeleteAction: (id: string) => void;
}) {
  if (sectionId === "empresa") return <EmpresaContent />;
  if (sectionId === "preferencias") return <PreferenciasSettingsContent />;
  if (sectionId === "fiscal") return <FiscalSettingsContent />;
  if (sectionId === "padron-sunat") return <PadronSunatSettingsContent />;
  if (sectionId === "series")
    return <FiscalSettingsContent initialTab="series" />;
  if (sectionId === "usuarios")
    return <UsuariosContent onRequestDelete={onRequestDeleteAction} />;
  if (sectionId === "almacenes")
    return <AlmacenesContent onRequestDelete={onRequestDeleteAction} />;
  if (sectionId === "categorias")
    return <CategoriasContent onRequestDelete={onRequestDeleteAction} />;
  if (sectionId === "marcas")
    return <MarcasContent onRequestDelete={onRequestDeleteAction} />;
  if (sectionId === "modelos")
    return (
      <ModelosSettingsContent onRequestDeleteAction={onRequestDeleteAction} />
    );
  if (sectionId === "metodos-pago") return <MetodosPagoSettingsContent />;
  if (sectionId === "tipos-movimiento")
    return <TiposMovimientoSettingsContent />;
  if (sectionId === "unidades-medida") return <UnidadesMedidaSettingsContent />;
  if (sectionId === "cajas") return <CajasSettingsContent />;
  return <PlaceholderContent sectionId={sectionId} />;
}

/* ═══════════════════════════════════════════════════════
   SETTINGS DIALOG
   ═══════════════════════════════════════════════════════ */

type SettingsDialogProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChangeAction?: (open: boolean) => void;
  showTrigger?: boolean;
  initialSection?: QuickSettingsSectionId;
};

const quickDialogSections = [
  {
    id: "preferencias",
    name: "Preferencias",
    description: "Tema y atmósfera",
    icon: SlidersHorizontal,
    available: true,
  },
  {
    id: "perfil",
    name: "Perfil",
    description: "Contacto y foto personal",
    icon: UserRound,
    available: true,
  },
  {
    id: "copias",
    name: "Copia de seguridad",
    description: "Respaldos del ERP",
    icon: DatabaseBackup,
    available: false,
  },
  {
    id: "soporte",
    name: "Ayuda y soporte",
    description: "Guías y asistencia",
    icon: LifeBuoy,
    available: false,
  },
] as const;

type QuickDialogSectionId = (typeof quickDialogSections)[number]["id"];

function QuickDialogPlaceholder({
  sectionId,
}: {
  sectionId: QuickDialogSectionId;
}) {
  const section = quickDialogSections.find((item) => item.id === sectionId)!;
  const Icon = section.icon;

  return (
    <div className="flex min-h-90 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-foreground">
          {section.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta sección quedará dentro de ajustes rápidos cuando definamos sus
          campos y permisos.
        </p>
      </div>
      <Badge variant="outline" className="rounded-lg">
        Próximamente
      </Badge>
    </div>
  );
}

export function SettingsDialog({
  children,
  open: openProp,
  onOpenChangeAction,
  showTrigger = true,
  initialSection = "preferencias",
}: SettingsDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [activeSection, setActiveSection] =
    React.useState<QuickDialogSectionId>(initialSection);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (openProp === undefined) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChangeAction?.(nextOpen);
    },
    [onOpenChangeAction, openProp],
  );

  React.useEffect(() => {
    if (open) {
      setActiveSection(initialSection);
      return;
    }
    setActiveSection("preferencias");
  }, [initialSection, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          {children || <Button size="sm">Ajustes rápidos</Button>}
        </DialogTrigger>
      ) : null}
      <DialogContent className="overflow-hidden p-0 w-[calc(100vw-2rem)] sm:max-w-5xl">
        <DialogTitle className="sr-only">Ajustes rápidos</DialogTitle>
        <DialogDescription className="sr-only">
          Preferencias personales de apariencia e interfaz.
        </DialogDescription>

        <div className="grid h-[min(84vh,720px)] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-none">
          <aside className="flex min-h-0 max-h-64 flex-col border-b border-border/70 bg-muted/30 p-3 md:max-h-none md:border-b-0 md:border-r md:border-border/70">
            <div className="px-2 py-2">
              <h2 className="text-sm font-semibold text-foreground">Ajustes</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Preferencias frecuentes y herramientas personales.
              </p>
            </div>

            <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
              {quickDialogSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                      "hover:bg-background/70 hover:text-foreground",
                      isActive
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                        : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 dark:shadow-none"
                          : "bg-muted text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" strokeWidth={1.85} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {section.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {section.description}
                      </span>
                    </span>
                    {!section.available ? (
                      <Badge
                        variant="outline"
                        className="hidden text-[10px] lg:inline-flex"
                      >
                        Próx.
                      </Badge>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="mt-3 rounded-2xl border border-border/70 bg-background/70 p-3">
              <h3 className="text-xs font-semibold text-foreground">
                Configuración estructural
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Empresa, series, usuarios y catálogos viven en su página
                dedicada.
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-3 w-full rounded-xl"
              >
                <Link href="/configuracion" onClick={() => setOpen(false)}>
                  Abrir configuración
                </Link>
              </Button>
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="border-b border-border/70 px-4 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-foreground">
                {quickDialogSections.find((item) => item.id === activeSection)
                  ?.name ?? "Ajustes rápidos"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeSection === "preferencias"
                  ? "Cambia el tema y la atmósfera de trabajo sin salir de tu flujo."
                  : activeSection === "perfil"
                    ? "Completa tus datos personales visibles en el detalle de usuario."
                    : "Este espacio queda reservado para las próximas herramientas rápidas."}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {activeSection === "preferencias" ? (
                <PreferenciasSettingsContent />
              ) : activeSection === "perfil" ? (
                <ProfileSettingsContent />
              ) : (
                <QuickDialogPlaceholder sectionId={activeSection} />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
