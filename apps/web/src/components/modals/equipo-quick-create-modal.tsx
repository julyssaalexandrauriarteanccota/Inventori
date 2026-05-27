"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  TipoCliente,
  TipoProducto,
  type ClienteEquipoFormPayload,
  type ClienteListItem,
} from "@erp/shared";

import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/searchable-select";
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useClientes } from "@/hooks/use-clientes";
import { useCreateClienteEquipo } from "@/hooks/use-equipos";
import {
  useCreateMarca,
  useCreateModeloCatalogo,
  useMarcas,
  useModelosCatalogo,
  useProductos,
} from "@/hooks/use-productos";

type CreatedEquipo = {
  id: string;
  numeroSerie: string;
  nombre?: string | null;
  marca?: string | null;
  modelo?: string | null;
};

interface EquipoQuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  clienteId?: string;
  onCreated: (equipo: CreatedEquipo) => void;
}

const INITIAL_FORM = {
  productoId: "",
  marcaId: "",
  modeloId: "",
  nombre: "",
  numeroSerie: "",
  ubicacion: "",
  notas: "",
};

function formatClienteLabel(cliente: ClienteListItem) {
  if (cliente.tipo === TipoCliente.EMPRESA) {
    return [cliente.razonSocial, cliente.ruc ? `RUC ${cliente.ruc}` : null]
      .filter(Boolean)
      .join(" · ");
  }

  return [
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" "),
    cliente.dni ? `DNI ${cliente.dni}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function EquipoQuickCreateModal({
  open,
  onClose,
  clienteId,
  onCreated,
}: EquipoQuickCreateModalProps) {
  const createMut = useCreateClienteEquipo();
  const createMarcaMut = useCreateMarca();
  const createModeloMut = useCreateModeloCatalogo();
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedClienteId, setSelectedClienteId] = useState(clienteId ?? "");
  const [clienteSearch, setClienteSearch] = useState("");
  const [useCatalogProduct, setUseCatalogProduct] = useState(false);

  const { data: clientesRes } = useClientes({
    search: clienteSearch,
    limit: 20,
  });
  const { data: productosRes } = useProductos({
    tipo: TipoProducto.EQUIPO,
    activo: true,
    limit: 100,
  });
  const { data: marcasRes } = useMarcas(TipoProducto.EQUIPO);
  const { data: modelosRes } = useModelosCatalogo({
    tipo: TipoProducto.EQUIPO,
    marcaId: form.marcaId || undefined,
    activo: true,
  });

  const productos = productosRes?.data ?? [];
  const marcas = marcasRes?.data ?? [];
  const modelos = modelosRes?.data ?? [];
  const clientes = clientesRes?.data ?? [];

  const clienteOptions = useMemo<SearchableSelectOption[]>(
    () =>
      clientes.map((cliente) => ({
        value: cliente.id,
        label: formatClienteLabel(cliente),
      })),
    [clientes],
  );

  const productoOptions = useMemo<SearchableSelectOption[]>(
    () =>
      productos.map((producto) => ({
        value: producto.id,
        label: `${producto.sku} · ${producto.nombre}`,
      })),
    [productos],
  );
  const marcaOptions = useMemo<SearchableSelectOption[]>(
    () => marcas.map((marca) => ({ value: marca.id, label: marca.nombre })),
    [marcas],
  );
  const modeloOptions = useMemo<SearchableSelectOption[]>(
    () =>
      modelos.map((modelo) => ({
        value: modelo.id,
        label:
          !form.marcaId && modelo.marca
            ? `${modelo.marca.nombre} · ${modelo.nombre}`
            : modelo.nombre,
      })),
    [form.marcaId, modelos],
  );

  const selectedProducto = productos.find(
    (producto) => producto.id === form.productoId,
  );
  const selectedMarca = marcas.find((marca) => marca.id === form.marcaId);
  const selectedModelo = modelos.find((modelo) => modelo.id === form.modeloId);

  const updateField = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCatalogToggle = (checked: boolean) => {
    setUseCatalogProduct(checked);
    if (!checked) {
      setForm((current) => ({ ...current, productoId: "" }));
    }
  };

  const handleProductoChange = (productoId: string) => {
    const producto = productos.find((item) => item.id === productoId);
    setForm((current) => ({
      ...current,
      productoId,
      nombre: current.nombre || producto?.nombre || "",
      marcaId: producto?.marca?.id ?? current.marcaId,
      modeloId: producto?.modeloCatalogo?.id ?? current.modeloId,
    }));
  };

  const handleMarcaChange = (marcaId: string) => {
    setForm((current) => ({ ...current, marcaId, modeloId: "" }));
  };

  const handleModeloChange = (modeloId: string) => {
    const modelo = modelos.find((item) => item.id === modeloId);
    setForm((current) => ({
      ...current,
      modeloId,
      marcaId: current.marcaId || modelo?.marca?.id || "",
    }));
  };

  const handleCreateMarca = async (nombre: string) => {
    try {
      const created = await createMarcaMut.mutateAsync({
        nombre,
        tipos: [TipoProducto.EQUIPO],
      });
      const marca = (created as { data?: { id: string } })?.data;
      if (marca?.id) {
        setForm((current) => ({ ...current, marcaId: marca.id, modeloId: "" }));
        toast.success("Marca creada y seleccionada.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear la marca.",
      );
      throw error;
    }
  };

  const handleCreateModelo = async (nombre: string) => {
    if (!form.marcaId) {
      toast.error("Selecciona o crea una marca antes de crear el modelo.");
      throw new Error("Marca requerida para crear modelo");
    }

    try {
      const created = await createModeloMut.mutateAsync({
        nombre,
        tipo: TipoProducto.EQUIPO,
        marcaId: form.marcaId,
        activo: true,
      });
      const modelo = created.data;
      setForm((current) => ({
        ...current,
        modeloId: modelo.id,
        marcaId: current.marcaId || modelo.marca?.id || "",
      }));
      toast.success("Modelo creado y seleccionado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el modelo.",
      );
      throw error;
    }
  };

  const handleClose = () => {
    if (!createMut.isPending) {
      setForm(INITIAL_FORM);
      setSelectedClienteId(clienteId ?? "");
      setClienteSearch("");
      setUseCatalogProduct(false);
      onClose();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nombre = form.nombre.trim();
    if (!nombre) {
      toast.error("Ingresa un nombre visible para identificar el equipo.");
      return;
    }

    const resolvedClienteId = clienteId || selectedClienteId;
    if (!resolvedClienteId) {
      toast.error("Selecciona el cliente propietario del equipo.");
      return;
    }

    const payload: ClienteEquipoFormPayload = {
      clienteId: resolvedClienteId,
      productoId:
        useCatalogProduct && form.productoId ? form.productoId : undefined,
      numeroSerie: form.numeroSerie.trim() || undefined,
      nombre,
      marca: selectedMarca?.nombre,
      modelo:
        selectedModelo?.nombre ??
        (useCatalogProduct ? selectedProducto?.modelo || undefined : undefined),
      ubicacion: form.ubicacion.trim() || undefined,
      notas: form.notas.trim() || undefined,
    };

    createMut.mutate(payload, {
      onSuccess: (resp: unknown) => {
        const equipo = (resp as { data: CreatedEquipo })?.data;
        if (!equipo?.id || !equipo?.numeroSerie) {
          toast.error("Equipo creado, pero la respuesta fue inesperada.");
          handleClose();
          return;
        }
        toast.success("Equipo del cliente registrado.");
        onCreated(equipo);
        setForm(INITIAL_FORM);
        setSelectedClienteId(clienteId ?? "");
        setClienteSearch("");
        setUseCatalogProduct(false);
        onClose();
      },
      onError: (err: Error) => {
        toast.error(err.message || "No se pudo registrar el equipo.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="w-full sm:max-w-3xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <Plus className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-semibold">
                  Nuevo equipo externo del cliente
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Se usará para soporte y mantenimiento, sin afectar el stock
                  interno.
                </DialogDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createMut.isPending}
                className="h-9 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="cliente-equipo-quick-form"
                disabled={createMut.isPending}
                className="h-9 rounded-xl text-xs"
              >
                {createMut.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                Registrar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form
          id="cliente-equipo-quick-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5"
        >
          <FieldGroup className="gap-4 rounded-xl border border-border/60 bg-card/60 p-4 sm:p-5">
            {!clienteId ? (
              <Field>
                <FieldLabel>Cliente propietario *</FieldLabel>
                <SearchableSelect
                  value={selectedClienteId}
                  onChange={setSelectedClienteId}
                  options={clienteOptions}
                  placeholder="Seleccionar cliente"
                  searchPlaceholder="Buscar por nombre, RUC o DNI..."
                  emptyLabel="No hay clientes para esa búsqueda."
                  ariaLabel="Cliente propietario del equipo externo"
                  onSearchChange={setClienteSearch}
                />
                <FieldDescription>
                  El equipo quedará disponible para futuros tickets de este
                  cliente.
                </FieldDescription>
              </Field>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Nombre visible *</FieldLabel>
                <Input
                  value={form.nombre}
                  onChange={(event) =>
                    updateField("nombre", event.target.value)
                  }
                  placeholder="Ej: Impresora recepción"
                  autoFocus
                  required
                />
                <FieldDescription>
                  Nombre práctico para reconocerlo en tickets e historial.
                </FieldDescription>
              </Field>
              <Field>
                <div className="flex h-full items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <FieldLabel>Vincular producto del catálogo</FieldLabel>
                    <FieldDescription className="mt-0.5">
                      Opcional; activa esto solo si ya existe un producto
                      equivalente.
                    </FieldDescription>
                  </div>
                  <Switch
                    checked={useCatalogProduct}
                    onCheckedChange={handleCatalogToggle}
                    aria-label="Vincular producto del catálogo"
                  />
                </div>
              </Field>
            </div>

            {useCatalogProduct ? (
              <Field>
                <FieldLabel>Producto equivalente</FieldLabel>
                <SearchableSelect
                  value={form.productoId}
                  onChange={handleProductoChange}
                  options={productoOptions}
                  placeholder="Seleccionar producto del catálogo"
                  searchPlaceholder="Buscar por SKU o nombre..."
                  emptyLabel="No hay productos tipo equipo."
                  ariaLabel="Producto equivalente"
                  clearable
                  clearLabel="Sin producto vinculado"
                />
                <FieldDescription>
                  Si no existe el producto, deja esta opción apagada y registra
                  marca/modelo.
                </FieldDescription>
              </Field>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Marca</FieldLabel>
                <SearchableSelect
                  value={form.marcaId}
                  onChange={handleMarcaChange}
                  options={marcaOptions}
                  placeholder="Seleccionar o crear marca"
                  searchPlaceholder="Buscar o crear marca..."
                  emptyLabel="No hay marcas registradas."
                  ariaLabel="Marca del equipo externo"
                  clearable
                  clearLabel="Sin marca"
                  createLabel="Crear marca"
                  creatingLabel="Creando marca..."
                  onCreateOption={handleCreateMarca}
                />
              </Field>
              <Field>
                <FieldLabel>Modelo</FieldLabel>
                <SearchableSelect
                  value={form.modeloId}
                  onChange={handleModeloChange}
                  options={modeloOptions}
                  placeholder="Seleccionar o crear modelo"
                  searchPlaceholder="Buscar o crear modelo..."
                  emptyLabel={
                    form.marcaId
                      ? "No hay modelos para esta marca."
                      : "Selecciona una marca para ver sus modelos."
                  }
                  ariaLabel="Modelo del equipo externo"
                  disabled={!form.marcaId || createModeloMut.isPending}
                  clearable
                  clearLabel="Sin modelo"
                  createLabel="Crear modelo"
                  creatingLabel="Creando modelo..."
                  onCreateOption={handleCreateModelo}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Serie del equipo</FieldLabel>
              <Input
                value={form.numeroSerie}
                onChange={(event) =>
                  updateField("numeroSerie", event.target.value)
                }
                placeholder="Opcional si el cliente no la conoce"
              />
              <FieldDescription>
                Si se deja vacía, el sistema generará un código interno.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Referencia para atención</FieldLabel>
              <Input
                value={form.ubicacion}
                onChange={(event) =>
                  updateField("ubicacion", event.target.value)
                }
                placeholder="Opcional: oficina, área o punto de visita"
              />
              <FieldDescription>
                Sirve para ubicarlo durante el servicio; no es almacén interno.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Notas</FieldLabel>
              <Textarea
                value={form.notas}
                onChange={(event) => updateField("notas", event.target.value)}
                placeholder="Observaciones técnicas iniciales"
                rows={3}
              />
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
