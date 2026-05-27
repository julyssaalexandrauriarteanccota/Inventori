"use client";

import * as React from "react";
import {
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RolUsuario } from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import {
  type CajaDef,
  useCajas,
  useCreateCaja,
  useUpdateCaja,
} from "@/hooks/use-caja";
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
import { StatCard } from "@/components/layout/stat-card";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { RealtimeStatus } from "@/components/layout/realtime-status";

type EstadoFiltro = "all" | "activas" | "inactivas";

export function CajasSettingsContent() {
  const { user } = useAuth();
  const canManage =
    user?.rol === RolUsuario.ADMIN || user?.rol === RolUsuario.ENCARGADO;
  const [estadoFiltro, setEstadoFiltro] = React.useState<EstadoFiltro>("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<CajaDef | null>(null);
  const [viewingItem, setViewingItem] = React.useState<CajaDef | null>(null);

  const { data, isLoading } = useCajas();
  const todasCajas = data?.data ?? [];
  const cajas = todasCajas.filter((c) => {
    if (estadoFiltro === "activas") return c.activa;
    if (estadoFiltro === "inactivas") return !c.activa;
    return true;
  });

  const columns = React.useMemo<ColumnDef<CajaDef, unknown>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Nombre",
        size: 260,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/30 dark:bg-sky-600 dark:shadow-none">
              <Wallet className="size-4" />
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
        size: 380,
        cell: ({ row }) => (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {row.original.descripcion || "Sin descripción."}
          </span>
        ),
      },
      {
        accessorKey: "activa",
        header: "Estado",
        size: 110,
        cell: ({ row }) => (
          <Badge
            variant={row.original.activa ? "default" : "outline"}
            className="text-[10px]"
          >
            {row.original.activa ? "Activa" : "Inactiva"}
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null,
      },
    ],
    [canManage],
  );

  const totalCount = todasCajas.length;
  const activasCount = React.useMemo(
    () => todasCajas.filter((c) => c.activa).length,
    [todasCajas],
  );
  const inactivasCount = totalCount - activasCount;

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
              <span className="hidden sm:inline">Nueva caja</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </TopbarActions>
        )}

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total"
            value={isLoading ? undefined : totalCount}
            icon={Wallet}
            theme="sky"
            subtitle="Cajas registradas"
            isLoading={isLoading}
          />
          <StatCard
            label="Activas"
            value={isLoading ? undefined : activasCount}
            icon={CheckCircle2}
            theme="emerald"
            subtitle="Habilitadas para apertura"
            isLoading={isLoading}
          />
          <StatCard
            label="Inactivas"
            value={isLoading ? undefined : inactivasCount}
            icon={X}
            theme="slate"
            subtitle="No disponibles en POS"
            isLoading={isLoading}
          />
        </div>

        <div className="flex flex-col gap-3 md:pr-8 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-foreground">
              Cajas
            </h2>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Cajas físicas registradas para apertura de turnos del POS.
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
              <SelectItem value="activas">Solo activas</SelectItem>
              <SelectItem value="inactivas">Solo inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SettingsDataTable
          columns={columns}
          data={cajas}
          isLoading={isLoading}
          emptyMessage="Sin cajas"
          emptyDescription="Registra al menos una caja para habilitar el punto de venta."
          storageKey="settings:cajas:columns"
        />
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva caja</DialogTitle>
            <DialogDescription>
              Registra una caja física para habilitarla en el punto de venta.
            </DialogDescription>
          </DialogHeader>
          <CajaCreateFormContent
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
            <DialogTitle>Editar caja</DialogTitle>
            <DialogDescription>
              Modifica los datos de la caja registrada.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <CajaEditFormContent
              caja={editingItem}
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
            <DialogTitle>Detalle de caja</DialogTitle>
            <DialogDescription>
              Información de la caja seleccionada.
            </DialogDescription>
          </DialogHeader>
          {viewingItem ? <CajaDetailsContent caja={viewingItem} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CajaDetailsContent({ caja }: { caja: CajaDef }) {
  const rows = [
    { label: "Nombre", value: caja.nombre },
    { label: "Descripción", value: caja.descripcion || "—" },
    { label: "Estado", value: caja.activa ? "Activa" : "Inactiva" },
    { label: "ID", value: caja.id },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Wallet className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {caja.nombre}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {caja.descripcion || "Sin descripción registrada"}
          </p>
        </div>
        <Badge variant={caja.activa ? "default" : "outline"}>
          {caja.activa ? "Activa" : "Inactiva"}
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

function CajaCreateFormContent({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const create = useCreateCaja();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);
    create.mutate(
      { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Caja creada");
          onSuccess();
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al crear caja"),
      },
    );
  };

  return (
    <form onSubmit={submit}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel>Nombre *</FieldLabel>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Caja principal"
            autoFocus
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel>Descripción (opcional)</FieldLabel>
          <Textarea
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Mostrador principal de tienda…"
          />
        </Field>
      </FieldGroup>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={create.isPending}
          className="rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={create.isPending}
          className="rounded-xl"
        >
          {create.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Crear caja
        </Button>
      </div>
    </form>
  );
}

function CajaEditFormContent({
  caja,
  onDone,
}: {
  caja: CajaDef;
  onDone: () => void;
}) {
  const [nombre, setNombre] = React.useState(caja.nombre);
  const [descripcion, setDescripcion] = React.useState(caja.descripcion ?? "");
  const [activa, setActiva] = React.useState(caja.activa);
  const [error, setError] = React.useState<string | null>(null);
  const update = useUpdateCaja(caja.id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);
    update.mutate(
      {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        activa,
      },
      {
        onSuccess: () => {
          toast.success("Caja actualizada");
          onDone();
        },
        onError: (err: Error) =>
          toast.error(err.message || "Error al actualizar caja"),
      },
    );
  };

  return (
    <form onSubmit={submit}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel>Nombre *</FieldLabel>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Field>
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3">
          <div>
            <p className="text-sm font-medium">Caja activa</p>
            <p className="text-xs text-muted-foreground">
              Las cajas inactivas no se pueden abrir en un nuevo turno.
            </p>
          </div>
          <Switch checked={activa} onCheckedChange={setActiva} />
        </div>
      </FieldGroup>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={update.isPending}
          className="rounded-xl"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={update.isPending}
          className="rounded-xl"
        >
          {update.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
