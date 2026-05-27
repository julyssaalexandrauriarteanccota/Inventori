"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useForm,
  useWatch,
  useFieldArray,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  Barcode,
  Boxes,
  Cable,
  Clock,
  DollarSign,
  FileText,
  Hash,
  ImagePlus,
  Laptop,
  Layers,
  Loader2,
  Package,
  Plus,
  QrCode,
  Sparkles,
  Tag,
  Wrench,
  X,
  RefreshCcw,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  CondicionProducto,
  productoFormSchema,
  SUNAT_UNIDAD_MEDIDA_CODES,
  TipoProducto,
  type ProductoFormPayload,
  type ProductoImagenPayload,
} from "@erp/shared";

import { getApiAssetUrl } from "@/lib/api";
import {
  getUploadAcceptAttr,
  revokeObjectPreviewUrl,
  uploadSelectedFiles,
  validateRemoteImageUrl,
} from "@/lib/file-uploads";
import { cn } from "@/lib/utils";
import {
  useCategorias,
  useCreateMarca,
  useCreateModeloCatalogo,
  useCreateUnidadMedida,
  useMarcas,
  useModelosCatalogo,
  useNextProductoSku,
  useUnidadesMedida,
} from "@/hooks/use-productos";
import { useAlmacenes } from "@/hooks/use-inventario";
import {
  SearchableMultiSelect,
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { RichDescriptionEditor } from "@/components/forms/rich-description-editor";

export interface ProductoFormSubmitContext {
  initialStock?: {
    cantidad: number;
    almacenId: string;
  };
}

interface ProductoFormProps {
  defaultValues?: Partial<ProductoFormPayload>;
  onSubmit: (
    data: ProductoFormPayload,
    context?: ProductoFormSubmitContext,
  ) => void;
  onCancel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  isLoading?: boolean;
  mode: "create" | "edit";
  canViewInternalCosts?: boolean;
  hideBottomActions?: boolean;
  /**
   * Si se define, el selector de tipo queda oculto y el formulario se inicializa
   * con ese tipo. Útil para pantallas dedicadas (ej. /erp/servicios).
   */
  lockedTipo?: TipoProducto;
}

const TIPO_LABELS: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Equipo",
  [TipoProducto.REPUESTO]: "Repuesto",
  [TipoProducto.INSUMO]: "Insumo",
  [TipoProducto.SERVICIO]: "Servicio",
  [TipoProducto.ACCESORIO]: "Accesorio",
};

const TIPO_ICONS: Record<TipoProducto, React.ComponentType<{ className?: string }>> = {
  [TipoProducto.EQUIPO]: Laptop,
  [TipoProducto.REPUESTO]: Wrench,
  [TipoProducto.INSUMO]: Layers,
  [TipoProducto.SERVICIO]: Sparkles,
  [TipoProducto.ACCESORIO]: Cable,
};

const CONDICION_LABELS: Record<CondicionProducto, string> = {
  [CondicionProducto.NUEVO]: "Nuevo",
  [CondicionProducto.SEMINUEVO]: "Seminuevo",
  [CondicionProducto.USADO]: "Usado",
  [CondicionProducto.REACONDICIONADO]: "Reacondicionado",
  [CondicionProducto.RECUPERADO]: "Recuperado",
};

const DEFAULT_UNIDAD_CODES_BY_TIPO: Record<TipoProducto, string[]> = {
  [TipoProducto.EQUIPO]: ["NIU"],
  [TipoProducto.REPUESTO]: ["NIU"],
  [TipoProducto.INSUMO]: ["NIU", "BX", "PK", "LTR", "KGM"],
  [TipoProducto.SERVICIO]: ["ZZ", "HUR", "DAY"],
  [TipoProducto.ACCESORIO]: ["NIU", "SET"],
};

type AttributePreset = { clave: string; valor: string };
type AttributeUiConfig = {
  title: string;
  description: string;
  emptyText: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  buttonLabel: string;
  presets: AttributePreset[];
};

const ATTRIBUTE_UI_BY_TIPO: Record<TipoProducto, AttributeUiConfig> = {
  [TipoProducto.EQUIPO]: {
    title: "Ficha técnica del modelo",
    description:
      "Datos comunes del modelo vendible. La serie, QR, contador, ubicación y estado real se registran en Equipos.",
    emptyText:
      "Agrega características del modelo como velocidad, dúplex, conectividad o voltaje.",
    keyPlaceholder: "Dato técnico (ej. dúplex)",
    valuePlaceholder: "Valor (ej. Sí, A3, 220V)",
    buttonLabel: "Agregar dato técnico",
    presets: [
      { clave: "Velocidad", valor: "" },
      { clave: "Formato", valor: "" },
      { clave: "Dúplex", valor: "" },
      { clave: "Conectividad", valor: "" },
      { clave: "Voltaje", valor: "" },
    ],
  },
  [TipoProducto.REPUESTO]: {
    title: "Compatibilidad y especificación",
    description:
      "Datos para identificar si el repuesto sirve para un modelo, parte o mantenimiento específico.",
    emptyText:
      "Agrega compatibilidad, código OEM, rendimiento, color o tipo de pieza.",
    keyPlaceholder: "Dato (ej. código OEM)",
    valuePlaceholder: "Valor (ej. TN-324K, Bizhub 808)",
    buttonLabel: "Agregar especificación",
    presets: [
      { clave: "Compatible con", valor: "" },
      { clave: "Código OEM", valor: "" },
      { clave: "Color", valor: "" },
      { clave: "Rendimiento", valor: "" },
    ],
  },
  [TipoProducto.INSUMO]: {
    title: "Presentación y consumo",
    description:
      "Datos de empaque, rendimiento o uso del material consumible. El stock se controla por inventario.",
    emptyText:
      "Agrega presentación, capacidad, rendimiento o unidad de consumo.",
    keyPlaceholder: "Dato (ej. presentación)",
    valuePlaceholder: "Valor (ej. caja x 10, 1L)",
    buttonLabel: "Agregar dato de consumo",
    presets: [
      { clave: "Presentación", valor: "" },
      { clave: "Capacidad", valor: "" },
      { clave: "Rendimiento", valor: "" },
      { clave: "Uso recomendado", valor: "" },
    ],
  },
  [TipoProducto.ACCESORIO]: {
    title: "Características comerciales",
    description:
      "Datos visibles para venta: compatibilidad, medidas, material, color o contenido del kit.",
    emptyText:
      "Agrega compatibilidad, medidas, color, material o contenido incluido.",
    keyPlaceholder: "Dato (ej. compatibilidad)",
    valuePlaceholder: "Valor (ej. Bizhub series 8)",
    buttonLabel: "Agregar característica",
    presets: [
      { clave: "Compatible con", valor: "" },
      { clave: "Color", valor: "" },
      { clave: "Material", valor: "" },
      { clave: "Incluye", valor: "" },
    ],
  },
  [TipoProducto.SERVICIO]: {
    title: "Alcance del servicio",
    description:
      "Datos opcionales para describir duración, cobertura o condiciones del servicio.",
    emptyText: "Agrega duración, cobertura, requisitos o condiciones.",
    keyPlaceholder: "Dato (ej. duración)",
    valuePlaceholder: "Valor (ej. 2 horas)",
    buttonLabel: "Agregar alcance",
    presets: [
      { clave: "Duración", valor: "" },
      { clave: "Cobertura", valor: "" },
      { clave: "Incluye", valor: "" },
    ],
  },
};

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function flattenCategorias(
  categorias: Array<{
    id: string;
    nombre: string;
    hijos?: Array<{
      id: string;
      nombre: string;
      hijos?: Array<{ id: string; nombre: string }>;
    }>;
  }>,
): SearchableSelectOption[] {
  return categorias.flatMap((categoria) => [
    { value: categoria.id, label: categoria.nombre },
    ...(categoria.hijos ?? []).flatMap((subcategoria) => [
      {
        value: subcategoria.id,
        label: `${categoria.nombre} / ${subcategoria.nombre}`,
      },
      ...(subcategoria.hijos ?? []).map((tercerNivel) => ({
        value: tercerNivel.id,
        label: `${categoria.nombre} / ${subcategoria.nombre} / ${tercerNivel.nombre}`,
      })),
    ]),
  ]);
}

function buildLocalCodeSuffix() {
  return `${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function normalizeInitialImages(defaultValues?: Partial<ProductoFormPayload>) {
  if (defaultValues?.imagenes?.length) {
    return defaultValues.imagenes;
  }

  if (defaultValues?.imagen) {
    return [
      {
        url: defaultValues.imagen,
        nombre: "Imagen principal",
        esPrincipal: true,
        orden: 0,
      },
    ];
  }

  return [];
}

export function ProductoForm({
  defaultValues,
  onSubmit,
  onCancel,
  onDirtyChange,
  isLoading = false,
  mode,
  canViewInternalCosts = true,
  hideBottomActions = false,
  lockedTipo,
}: ProductoFormProps) {
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<
    Record<string, string>
  >({});
  const imagePreviewUrlsRef = useRef<Record<string, string>>({});
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(
    () => mode === "edit" || Boolean(defaultValues?.sku),
  );
  const [barcodeManuallyEdited, setBarcodeManuallyEdited] = useState(
    () => mode === "edit" || Boolean(defaultValues?.codigoBarras),
  );
  const [qrManuallyEdited, setQrManuallyEdited] = useState(
    () => mode === "edit" || Boolean(defaultValues?.codigoQr),
  );
  const [manualSelectedImageUrl, setManualSelectedImageUrl] = useState<
    string | null
  >(null);
  const [unidadDialogOpen, setUnidadDialogOpen] = useState(false);
  const [unidadDialogCodigo, setUnidadDialogCodigo] = useState("");
  const [unidadDialogNombre, setUnidadDialogNombre] = useState("");
  const [stockInicial, setStockInicial] = useState("");
  const [almacenInicialId, setAlmacenInicialId] = useState("");
  const [stockInicialError, setStockInicialError] = useState<string | null>(
    null,
  );
  const [showUrlInput, setShowUrlInput] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<ProductoFormPayload>({
    resolver: zodResolver(
      productoFormSchema,
    ) as unknown as Resolver<ProductoFormPayload>,
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      tipo: lockedTipo ?? TipoProducto.REPUESTO,
      manejaInventario: lockedTipo === TipoProducto.SERVICIO ? false : true,
      tieneNumeroSerie: false,
      esConsumible: false,
      requiereRepuestos: false,
      activo: true,
      stockMinimo: 0,
      precioCompra: 0,
      precioVenta: 0,
      precioMinimo: 0,
      mesesGarantia: 12,
      garantiaMaxCopias: null,
      ...defaultValues,
      // Si el formulario está bloqueado a un tipo específico, forzar siempre.
      ...(lockedTipo ? { tipo: lockedTipo } : {}),
      modeloIds:
        defaultValues?.modeloIds ??
        (defaultValues?.modeloId ? [defaultValues.modeloId] : []),
      imagenes: normalizeInitialImages(defaultValues),
    },
  });

  const tipo = useWatch({ control, name: "tipo" }) ?? TipoProducto.REPUESTO;
  const sku = useWatch({ control, name: "sku" });
  const unidadMedidaId = useWatch({ control, name: "unidadMedidaId" });
  const categoriaId = useWatch({ control, name: "categoriaId" });
  const marcaId = useWatch({ control, name: "marcaId" });
  const modeloId = useWatch({ control, name: "modeloId" });
  const watchedModeloIds = useWatch({ control, name: "modeloIds" });
  const modeloIds = useMemo(
    () => [...new Set(watchedModeloIds ?? [])],
    [watchedModeloIds],
  );
  const watchedImagenes = useWatch({ control, name: "imagenes" });
  const watchedAtributos = useWatch({ control, name: "atributos" });
  const imagenes = useMemo(() => watchedImagenes ?? [], [watchedImagenes]);
  const atributos = useMemo(() => watchedAtributos ?? [], [watchedAtributos]);
  const {
    fields: atributoFields,
    append: appendAtributo,
    remove: removeAtributo,
    move: moveAtributo,
  } = useFieldArray({ control, name: "atributos" });
  const manejaInventario = watch("manejaInventario");
  const tieneNumeroSerie = watch("tieneNumeroSerie");
  const esConsumible = watch("esConsumible");
  const requiereRepuestos = watch("requiereRepuestos");
  const activo = watch("activo");
  const isServicio = tipo === TipoProducto.SERVICIO;
  const isEquipo = tipo === TipoProducto.EQUIPO;
  const modeloCatalogoTipo = isEquipo ? tipo : TipoProducto.EQUIPO;
  const attributeUi = ATTRIBUTE_UI_BY_TIPO[tipo];
  const descripcion = useWatch({ control, name: "descripcion" }) ?? "";
  const canViewServicioCostoReferencial = !isServicio || canViewInternalCosts;

  const { data: categoriasRes } = useCategorias(tipo);
  const { data: marcasRes } = useMarcas(tipo);
  const { data: modelosRes } = useModelosCatalogo({
    tipo: modeloCatalogoTipo,
    activo: true,
  });
  const { data: unidadesMedidaRes } = useUnidadesMedida();
  const { data: almacenesRes } = useAlmacenes();
  const {
    data: suggestedSkuRes,
    refetch: refetchSuggestedSku,
    isFetching: isFetchingSuggestedSku,
  } = useNextProductoSku(
    tipo,
    categoriaId || undefined,
    mode === "create" && !skuManuallyEdited,
  );
  const createModeloMutation = useCreateModeloCatalogo();
  const createMarcaMutation = useCreateMarca();
  const createUnidadMutation = useCreateUnidadMedida();

  const categorias = useMemo(
    () => categoriasRes?.data ?? [],
    [categoriasRes?.data],
  );
  const marcas = useMemo(() => marcasRes?.data ?? [], [marcasRes?.data]);
  const modelos = useMemo(() => modelosRes?.data ?? [], [modelosRes?.data]);
  const unidadesMedida = useMemo(
    () => (unidadesMedidaRes?.data ?? []).filter((unidad) => unidad.activo),
    [unidadesMedidaRes?.data],
  );
  const almacenesActivos = useMemo(
    () => (almacenesRes?.data ?? []).filter((almacen) => almacen.activo),
    [almacenesRes?.data],
  );
  const stockInicialValue = useMemo(() => {
    const parsed = Number.parseInt(stockInicial, 10);
    return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
  }, [stockInicial]);
  const hasInitialStockDraft =
    mode === "create" && !isServicio && !isEquipo && stockInicialValue > 0;

  const categoriaOptions = useMemo(
    () => flattenCategorias(categorias),
    [categorias],
  );
  const modeloOptions = useMemo(
    () =>
      modelos
        .filter(
          (modeloItem) =>
            !isEquipo ||
            !marcaId ||
            !modeloItem.marca ||
            modeloItem.marca.id === marcaId,
        )
        .map((modeloItem) => ({
          value: modeloItem.id,
          label:
            (!marcaId || !isEquipo) && modeloItem.marca
              ? `${modeloItem.marca.nombre} · ${modeloItem.nombre}`
              : modeloItem.nombre,
        })),
    [isEquipo, marcaId, modelos],
  );
  const selectedModeloOptions = useMemo(
    () => modeloOptions.filter((option) => modeloIds.includes(option.value)),
    [modeloIds, modeloOptions],
  );

  useEffect(() => {
    imagePreviewUrlsRef.current = imagePreviewUrls;
  }, [imagePreviewUrls]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrlsRef.current).forEach((previewUrl) =>
        revokeObjectPreviewUrl(previewUrl),
      );
    };
  }, []);

  const nombreWatch = watch("nombre");
  const categoriaIdWatch = watch("categoriaId");
  const precioVentaWatch = watch("precioVenta");
  const precioCompraWatch = watch("precioCompra");
  const precioMinimoWatch = watch("precioMinimo");
  const stockMinimoWatch = watch("stockMinimo");
  const tiempoEstimadoMinWatch = watch("tiempoEstimadoMin");
  const mesesGarantiaWatch = watch("mesesGarantia");
  const garantiaMaxCopiasWatch = watch("garantiaMaxCopias");
  const stockInicialWatch = stockInicialValue;
  const descripcionWatch = watch("descripcion");

  const isReallyDirty = useMemo(() => {
    if (nombreWatch && nombreWatch.trim() !== "") return true;
    if (categoriaIdWatch && categoriaIdWatch !== "") return true;
    if (marcaId || modeloId || modeloIds.length > 0) return true;
    if ((precioVentaWatch ?? 0) > 0 || (precioCompraWatch ?? 0) > 0 || (precioMinimoWatch ?? 0) > 0) return true;
    if ((stockMinimoWatch ?? 0) > 0 || (tiempoEstimadoMinWatch ?? 0) > 0) return true;
    if (mesesGarantiaWatch !== 12 && mesesGarantiaWatch !== undefined) return true;
    if (garantiaMaxCopiasWatch !== null && garantiaMaxCopiasWatch !== undefined) return true;
    if (stockInicialWatch > 0) return true;
    if (descripcionWatch && descripcionWatch.trim() !== "") return true;
    if (atributos.length > 0) return true;
    if (imagenes.length > 0) return true;
    if (skuManuallyEdited || barcodeManuallyEdited || qrManuallyEdited) return true;
    return false;
  }, [
    nombreWatch,
    categoriaIdWatch,
    marcaId,
    modeloId,
    modeloIds,
    precioVentaWatch,
    precioCompraWatch,
    precioMinimoWatch,
    stockMinimoWatch,
    tiempoEstimadoMinWatch,
    mesesGarantiaWatch,
    garantiaMaxCopiasWatch,
    stockInicialWatch,
    descripcionWatch,
    atributos,
    imagenes,
    skuManuallyEdited,
    barcodeManuallyEdited,
    qrManuallyEdited,
  ]);

  const isFormDirty = mode === "create" ? isReallyDirty : isDirty;

  useEffect(() => {
    onDirtyChange?.(isFormDirty || hasInitialStockDraft);
  }, [hasInitialStockDraft, isFormDirty, onDirtyChange]);

  useEffect(() => {
    if (!isFormDirty && !hasInitialStockDraft) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasInitialStockDraft, isFormDirty]);

  useEffect(() => {
    if (mode !== "create" || isServicio || isEquipo || almacenInicialId) {
      return;
    }

    if (almacenesActivos.length === 0) {
      return;
    }

    const almacenPreferido =
      almacenesActivos.find((almacen) => almacen.esPrincipal) ??
      almacenesActivos[0];
    setAlmacenInicialId(almacenPreferido.id);
  }, [almacenInicialId, almacenesActivos, isEquipo, isServicio, mode]);

  useEffect(() => {
    if (!isServicio && !isEquipo) {
      return;
    }

    if (stockInicial) {
      setStockInicial("");
    }
    if (stockInicialError) {
      setStockInicialError(null);
    }
  }, [isEquipo, isServicio, stockInicial, stockInicialError]);

  // Force tipo-driven boolean rules so UI and payload stay in sync.
  useEffect(() => {
    if (tipo === TipoProducto.SERVICIO) {
      if (manejaInventario)
        setValue("manejaInventario", false, { shouldDirty: false });
      if (tieneNumeroSerie)
        setValue("tieneNumeroSerie", false, { shouldDirty: false });
      if (esConsumible) setValue("esConsumible", false, { shouldDirty: false });
      if (marcaId) setValue("marcaId", null, { shouldDirty: false });
      return;
    }
    if (tipo === TipoProducto.EQUIPO) {
      if (!manejaInventario)
        setValue("manejaInventario", true, { shouldDirty: false });
      if (!tieneNumeroSerie)
        setValue("tieneNumeroSerie", true, { shouldDirty: false });
      if (esConsumible) setValue("esConsumible", false, { shouldDirty: false });
      return;
    }
    if (tipo === TipoProducto.INSUMO) {
      if (!manejaInventario)
        setValue("manejaInventario", true, { shouldDirty: false });
      if (!esConsumible) setValue("esConsumible", true, { shouldDirty: false });
      if (tieneNumeroSerie)
        setValue("tieneNumeroSerie", false, { shouldDirty: false });
      return;
    }

    if (!manejaInventario)
      setValue("manejaInventario", true, { shouldDirty: false });
    if (tieneNumeroSerie)
      setValue("tieneNumeroSerie", false, { shouldDirty: false });
    if (esConsumible) setValue("esConsumible", false, { shouldDirty: false });
  }, [
    tipo,
    manejaInventario,
    tieneNumeroSerie,
    esConsumible,
    marcaId,
    setValue,
  ]);

  useEffect(() => {
    if (unidadMedidaId || unidadesMedida.length === 0) {
      return;
    }

    const defaultUnidad =
      DEFAULT_UNIDAD_CODES_BY_TIPO[tipo]
        .map((codigo) =>
          unidadesMedida.find((unidad) => unidad.codigo === codigo),
        )
        .find(Boolean) ??
      unidadesMedida.find((unidad) => unidad.codigo === "NIU") ??
      unidadesMedida.find((unidad) =>
        (SUNAT_UNIDAD_MEDIDA_CODES as readonly string[]).includes(
          unidad.codigo,
        ),
      ) ??
      unidadesMedida[0];

    if (!defaultUnidad) {
      return;
    }

    setValue("unidadMedidaId", defaultUnidad.id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [setValue, tipo, unidadMedidaId, unidadesMedida]);

  useEffect(() => {
    if (!categoriasRes || !categoriaId) {
      return;
    }

    const categoryExistsForType = categoriaOptions.some(
      (option) => option.value === categoriaId,
    );
    if (!categoryExistsForType) {
      setValue("categoriaId", "", {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [categoriaId, categoriaOptions, categoriasRes, setValue]);

  useEffect(() => {
    if (!marcasRes || !marcaId) {
      return;
    }

    const brandExistsForType = marcas.some((marca) => marca.id === marcaId);
    if (!brandExistsForType) {
      setValue("marcaId", null, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [marcaId, marcas, marcasRes, setValue]);

  useEffect(() => {
    if (!modelosRes) {
      return;
    }

    const optionIds = new Set(modeloOptions.map((option) => option.value));
    const nextModeloIds = modeloIds.filter((id) => optionIds.has(id));

    if (nextModeloIds.length !== modeloIds.length) {
      setValue("modeloIds", nextModeloIds, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }

    if (!modeloId) {
      return;
    }

    const modelExistsForContext = optionIds.has(modeloId);
    if (!modelExistsForContext) {
      const nextModeloId = nextModeloIds[0] ?? null;
      const selectedModelo =
        modelos.find((modeloItem) => modeloItem.id === nextModeloId) ?? null;
      setValue("modeloId", nextModeloId, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
      setValue("modelo", selectedModelo?.nombre ?? "", {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [modeloId, modeloIds, modeloOptions, modelos, modelosRes, setValue]);

  useEffect(() => {
    if (isEquipo || modeloIds.length > 0 || !modeloId) {
      return;
    }

    setValue("modeloIds", [modeloId], {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [isEquipo, modeloId, modeloIds.length, setValue]);

  useEffect(() => {
    if (isEquipo || modeloId === (modeloIds[0] ?? null)) {
      return;
    }

    const nextModeloId = modeloIds[0] ?? null;
    const selectedModelo =
      modelos.find((modeloItem) => modeloItem.id === nextModeloId) ?? null;

    setValue("modeloId", nextModeloId, {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
    setValue("modelo", selectedModelo?.nombre ?? "", {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [isEquipo, modeloId, modeloIds, modelos, setValue]);

  useEffect(() => {
    if (!isEquipo || !modeloId) {
      return;
    }

    if (modeloIds.length === 1 && modeloIds[0] === modeloId) {
      return;
    }

    setValue("modeloIds", [modeloId], {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [isEquipo, modeloId, modeloIds, setValue]);

  useEffect(() => {
    const suggestedSku = suggestedSkuRes?.data.sku;
    if (mode !== "create" || skuManuallyEdited || !suggestedSku) {
      return;
    }

    setValue("sku", suggestedSku, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [mode, setValue, skuManuallyEdited, suggestedSkuRes?.data.sku]);

  useEffect(() => {
    if (mode !== "create" || barcodeManuallyEdited) {
      return;
    }

    setValue("codigoBarras", sku?.trim() ?? "", {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [barcodeManuallyEdited, mode, setValue, sku]);

  useEffect(() => {
    if (mode !== "create" || qrManuallyEdited) {
      return;
    }

    setValue("codigoQr", sku?.trim() ? `PRD:${sku.trim()}` : "", {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [qrManuallyEdited, mode, setValue, sku]);

  function handleTipoChange(nextTipo: TipoProducto) {
    setValue("tipo", nextTipo, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    setValue("categoriaId", "", {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
    setValue("marcaId", null, {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
    setValue("modeloId", null, {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
    setValue("modelo", "", {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });

    if (!skuManuallyEdited) {
      setValue("sku", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }

    if (!barcodeManuallyEdited) {
      setValue("codigoBarras", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }

    if (!qrManuallyEdited) {
      setValue("codigoQr", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }

    if (nextTipo === TipoProducto.EQUIPO) {
      setValue("manejaInventario", true, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("tieneNumeroSerie", true, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("esConsumible", false, {
        shouldDirty: true,
        shouldValidate: false,
      });
      return;
    }

    if (nextTipo === TipoProducto.INSUMO) {
      setValue("manejaInventario", true, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("tieneNumeroSerie", false, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("esConsumible", true, {
        shouldDirty: true,
        shouldValidate: false,
      });
      return;
    }

    if (nextTipo === TipoProducto.SERVICIO) {
      setValue("manejaInventario", false, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("tieneNumeroSerie", false, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("esConsumible", false, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("stockMinimo", 0, { shouldDirty: true, shouldValidate: false });
      return;
    }

    setValue("manejaInventario", true, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("tieneNumeroSerie", false, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("esConsumible", false, {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  function handleAppendAttributePreset(preset: AttributePreset) {
    if (atributoFields.length >= 30) return;
    const alreadyExists = atributos.some(
      (atributo) =>
        atributo?.clave?.trim().toLowerCase() ===
        preset.clave.trim().toLowerCase(),
    );
    if (alreadyExists) {
      toast.info(`"${preset.clave}" ya está en la ficha.`);
      return;
    }
    appendAtributo(preset);
  }

  function handleModeloChange(nextModeloId: string) {
    const selectedModelo =
      modelos.find((modeloItem) => modeloItem.id === nextModeloId) ?? null;
    setValue("modeloId", nextModeloId ? nextModeloId : null, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    setValue("modelo", selectedModelo?.nombre ?? "", {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });

    if (isEquipo && !marcaId && selectedModelo?.marca?.id) {
      setValue("marcaId", selectedModelo.marca.id, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }

  function handleModelosChange(nextModeloIds: string[]) {
    const uniqueModeloIds = [...new Set(nextModeloIds)];
    const selectedModelo =
      modelos.find((modeloItem) => modeloItem.id === uniqueModeloIds[0]) ??
      null;

    setValue("modeloIds", uniqueModeloIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    setValue("modeloId", uniqueModeloIds[0] ?? null, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    setValue("modelo", selectedModelo?.nombre ?? "", {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
  }

  function handleRemoveModelo(nextModeloId: string) {
    handleModelosChange(modeloIds.filter((id) => id !== nextModeloId));
  }

  async function handleGenerateSku() {
    const result = await refetchSuggestedSku();
    const nextSku = result.data?.data.sku;

    if (!nextSku) {
      toast.error("No se pudo generar un SKU sugerido");
      return;
    }

    setSkuManuallyEdited(true);
    setValue("sku", nextSku, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    if (!barcodeManuallyEdited) {
      setValue("codigoBarras", nextSku, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: true,
      });
    }

    toast.success("SKU generado");
  }

  function handleGenerateBarcode() {
    const nextBarcode =
      sku?.trim() ||
      suggestedSkuRes?.data.sku ||
      `BAR-${buildLocalCodeSuffix()}`;

    setBarcodeManuallyEdited(true);
    setValue("codigoBarras", nextBarcode, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    toast.success("Código de barras generado");
  }

  function handleGenerateQr() {
    const base = sku?.trim() || suggestedSkuRes?.data.sku;
    const nextQr = base
      ? `PRD:${base}`
      : `PRD:${tipo}-${buildLocalCodeSuffix()}`;

    setQrManuallyEdited(true);
    setValue("codigoQr", nextQr, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    toast.success("Código QR generado");
  }

  async function handleCreateModelo(nombre: string) {
    try {
      const response = await createModeloMutation.mutateAsync({
        nombre,
        tipo: modeloCatalogoTipo,
        marcaId: isEquipo ? (marcaId ?? null) : null,
        activo: true,
      });
      const createdModelo = response.data;

      setValue("modeloId", createdModelo.id, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
      setValue("modelo", createdModelo.nombre, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });

      if (isEquipo && !marcaId && createdModelo.marca?.id) {
        setValue("marcaId", createdModelo.marca.id, {
          shouldDirty: true,
          shouldTouch: false,
          shouldValidate: false,
        });
      }

      toast.success("Modelo creado y seleccionado");
      return createdModelo.id;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el modelo",
      );
      throw error;
    }
  }

  function setImages(nextImages: ProductoImagenPayload[]) {
    const normalized = nextImages.map((image, index) => ({
      ...image,
      esPrincipal: nextImages.some((item) => item.esPrincipal)
        ? image.esPrincipal
        : index === 0,
      orden: index,
    }));
    setValue("imagenes", normalized, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue(
      "imagen",
      normalized.find((image) => image.esPrincipal)?.url ??
        normalized[0]?.url ??
        "",
      {
        shouldDirty: true,
        shouldValidate: false,
      },
    );
  }

  async function handleImageFiles(selectedFiles: FileList | File[] | null) {
    const files = Array.from(selectedFiles ?? []);
    if (!files.length) {
      return;
    }

    setIsUploadingImages(true);
    try {
      const uploadedFiles = await uploadSelectedFiles(files, {
        preset: "image",
        maxFiles: Math.max(0, 12 - imagenes.length),
      });

      const uploadedImages: ProductoImagenPayload[] = uploadedFiles.map(
        (file, index) => ({
          url: file.path,
          nombre: file.originalName,
          tipo: file.mimeType,
          tamano: file.size,
          esPrincipal: imagenes.length === 0 && index === 0,
        }),
      );

      const nextPreviewUrls = uploadedFiles.reduce<Record<string, string>>(
        (carry, file) => {
          if (file.previewUrl) {
            carry[file.path] = file.previewUrl;
          }

          return carry;
        },
        {},
      );

      setImagePreviewUrls((current) => ({
        ...current,
        ...nextPreviewUrls,
      }));

      setImages([...imagenes, ...uploadedImages]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron subir las imágenes",
      );
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function addManualImage(nextUrl?: string) {
    const url = (nextUrl ?? manualImageUrl).trim();
    if (!url) {
      return;
    }

    if (!isHttpUrl(url)) {
      toast.error("Ingresa una URL válida para la imagen");
      return;
    }

    if (imagenes.some((image) => image.url === url)) {
      toast.info("Ese enlace ya está agregado en la galería");
      if (!nextUrl) {
        setManualImageUrl("");
      }
      return;
    }

    try {
      await validateRemoteImageUrl(url);

      const urlName = (() => {
        try {
          const parsed = new URL(url);
          const fileName = parsed.pathname.split("/").filter(Boolean).at(-1);
          return fileName || "Imagen externa";
        } catch {
          return "Imagen externa";
        }
      })();

      setImages([
        ...imagenes,
        {
          url,
          nombre: urlName,
          esPrincipal: imagenes.length === 0,
        },
      ]);

      if (!nextUrl) {
        setManualImageUrl("");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo validar el enlace de la imagen",
      );
    }
  }

  function removeImageAt(index: number) {
    const image = imagenes[index];
    const previewUrl = imagePreviewUrls[image.url];

    if (previewUrl) {
      revokeObjectPreviewUrl(previewUrl);
      setImagePreviewUrls((current) => {
        const next = { ...current };
        delete next[image.url];
        return next;
      });
    }

    setImages(imagenes.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleImageDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingImages(false);

    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length > 0) {
      await handleImageFiles(droppedFiles);
      return;
    }

    const droppedUrl =
      event.dataTransfer.getData("text/uri-list") ||
      event.dataTransfer.getData("text/plain");

    if (droppedUrl && isHttpUrl(droppedUrl.trim())) {
      await addManualImage(droppedUrl);
    }
  }

  function submitForm(data: ProductoFormPayload) {
    const normalizedImages = imagenes.map((image, index) => ({
      ...image,
      orden: index,
      esPrincipal: imagenes.some((item) => item.esPrincipal)
        ? image.esPrincipal
        : index === 0,
    }));

    const isServicioSubmit = tipo === TipoProducto.SERVICIO;
    const isEquipoSubmit = tipo === TipoProducto.EQUIPO;
    const isInsumoSubmit = tipo === TipoProducto.INSUMO;

    let stockInicialPayload: ProductoFormPayload["stockInicial"];
    if (
      mode === "create" &&
      !isServicioSubmit &&
      !isEquipoSubmit &&
      stockInicialValue > 0
    ) {
      if (!almacenInicialId) {
        setStockInicialError("Selecciona un almacén destino");
        return;
      }
      stockInicialPayload = [
        {
          almacenId: almacenInicialId,
          cantidad: stockInicialValue,
        },
      ];
    }

    onSubmit({
      ...data,
      tipo,
      sku: data.sku?.trim() || undefined,
      marcaId: data.marcaId ?? null,
      modeloIds: isEquipoSubmit ? (data.modeloId ? [data.modeloId] : []) : modeloIds,
      modeloId: isEquipoSubmit ? (data.modeloId ?? null) : (modeloIds[0] ?? null),
      modelo: data.modelo?.trim() ?? "",
      codigoBarras: data.codigoBarras || undefined,
      codigoQr: isEquipoSubmit ? undefined : data.codigoQr || undefined,
      condicion: data.condicion || undefined,
      imagen:
        normalizedImages.find((image) => image.esPrincipal)?.url ??
        normalizedImages[0]?.url,
      imagenes: normalizedImages,
      manejaInventario: !isServicioSubmit,
      tieneNumeroSerie: isEquipoSubmit,
      esConsumible: isInsumoSubmit,
      stockMinimo: isServicioSubmit ? 0 : data.stockMinimo,
      precioMinimo: isServicioSubmit ? data.precioVenta : data.precioMinimo,
      stockInicial: stockInicialPayload,
    });
  }

  const defaultSelectedImageUrl =
    imagenes.find((image) => image.esPrincipal)?.url ??
    imagenes[0]?.url ??
    null;
  const selectedImageUrl =
    manualSelectedImageUrl &&
    imagenes.some((image) => image.url === manualSelectedImageUrl)
      ? manualSelectedImageUrl
      : defaultSelectedImageUrl;
  const selectedImage =
    imagenes.find((image) => image.url === selectedImageUrl) ?? null;
  const selectedImageIndex = selectedImage
    ? imagenes.findIndex((image) => image.url === selectedImage.url)
    : -1;

  function markSelectedImageAsPrincipal() {
    if (selectedImageIndex < 0) {
      return;
    }

    setImages(
      imagenes.map((image, index) => ({
        ...image,
        esPrincipal: index === selectedImageIndex,
      })),
    );
  }

  function moveSelectedImage(direction: "up" | "down") {
    if (selectedImageIndex < 0) {
      return;
    }

    const targetIndex =
      direction === "up" ? selectedImageIndex - 1 : selectedImageIndex + 1;

    if (targetIndex < 0 || targetIndex >= imagenes.length) {
      return;
    }

    const next = [...imagenes];
    [next[selectedImageIndex], next[targetIndex]] = [
      next[targetIndex],
      next[selectedImageIndex],
    ];
    setManualSelectedImageUrl(next[targetIndex].url);
    setImages(next);
  }

  return (
    <form
      id="producto-form"
      onSubmit={handleSubmit(submitForm)}
      noValidate
      className="w-full"
    >
      {lockedTipo ? null : (
        <div className="mb-6 flex w-full gap-1 p-1 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/40 overflow-x-auto scrollbar-none">
          {Object.values(TipoProducto)
            .filter(
              (tipoOption) =>
                tipoOption !== TipoProducto.SERVICIO ||
                lockedTipo === TipoProducto.SERVICIO,
            )
            .map((tipoOption) => {
              const isActive = tipo === tipoOption;
              const Icon = TIPO_ICONS[tipoOption];
              return (
                <button
                  key={tipoOption}
                  type="button"
                  className={cn(
                    "flex flex-1 sm:flex-initial shrink-0 items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-semibold transition-all duration-300 relative select-none",
                    isActive
                      ? "bg-background text-primary shadow-xs border border-border/80 font-bold scale-[1.01]"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-[0.99]"
                  )}
                  onClick={() => handleTipoChange(tipoOption)}
                >
                  {Icon && <Icon className={cn("size-3.5 transition-transform duration-300", isActive ? "scale-110 text-primary" : "text-muted-foreground/75")} />}
                  <span>{TIPO_LABELS[tipoOption]}</span>
                </button>
              );
            })}
        </div>
      )}

      <div className="sm:overflow-hidden sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-6">
          <div className="space-y-4 p-3 sm:p-5">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <Package className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Clasificación y Datos Base</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={errors.nombre ? true : undefined} className="sm:col-span-2">
                <FieldLabel>{isServicio ? "Nombre del servicio *" : "Nombre *"}</FieldLabel>
                <Input {...register("nombre")} startIcon={FileText} placeholder={isServicio ? "Servicio de mantenimiento preventivo" : "Nombre del producto"} aria-invalid={!!errors.nombre} />
                <FieldError>{errors.nombre?.message}</FieldError>
              </Field>
              <Field data-invalid={errors.categoriaId ? true : undefined}>
                <FieldLabel>Categoría / subcategoría *</FieldLabel>
                <SearchableSelect value={categoriaId} onChange={(value) => setValue("categoriaId", value, { shouldValidate: true })} options={categoriaOptions} placeholder="Seleccionar categoría" searchPlaceholder="Buscar categoría..." emptyLabel="No hay categorías para este tipo." ariaLabel="Seleccionar categoría" disabled={categoriaOptions.length === 0} invalid={!!errors.categoriaId} clearable clearLabel="Quitar categoría" />
                <FieldError>{errors.categoriaId?.message}</FieldError>
              </Field>
              {!isServicio ? (
                <Field data-invalid={errors.marcaId ? true : undefined}>
                  <FieldLabel>Marca</FieldLabel>
                  <SearchableSelect value={watch("marcaId") ?? undefined} onChange={(value) => setValue("marcaId", value || null, { shouldValidate: true, shouldDirty: true })} options={marcas.map((marca) => ({ value: marca.id, label: marca.nombre }))} placeholder="Seleccionar marca" searchPlaceholder="Buscar o crear marca..." emptyLabel="No hay marcas registradas" ariaLabel="Seleccionar marca" invalid={!!errors.marcaId} clearable clearLabel="Sin marca" createLabel="Crear marca" onCreateOption={async (nombre) => { try { const created = await createMarcaMutation.mutateAsync({ nombre, tipos: [tipo] }); const newMarca = (created as { data?: { id: string } })?.data; if (newMarca?.id) { setValue("marcaId", newMarca.id, { shouldValidate: true, shouldDirty: true }); toast.success("Marca creada y seleccionada"); } } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo crear la marca"); throw error; } }} />
                  <FieldError>{errors.marcaId?.message}</FieldError>
                </Field>
              ) : null}
              <Field data-invalid={errors.unidadMedidaId ? true : undefined}>
                <FieldLabel>Unidad de medida *</FieldLabel>
                <SearchableSelect value={unidadMedidaId} onChange={(value) => setValue("unidadMedidaId", value, { shouldValidate: true, shouldDirty: true })} options={unidadesMedida.map((unidad) => ({ value: unidad.id, label: unidad.codigo + " · " + unidad.nombre }))} placeholder="Seleccionar unidad" searchPlaceholder="Buscar o crear unidad..." emptyLabel="No se encontraron unidades" ariaLabel="Seleccionar unidad de medida" invalid={!!errors.unidadMedidaId} createLabel="Crear unidad" onCreateOption={(label) => { const trimmed = label.trim(); setUnidadDialogCodigo(trimmed.slice(0, 16).toUpperCase()); setUnidadDialogNombre(trimmed); setUnidadDialogOpen(true); }} />
                <FieldError>{errors.unidadMedidaId?.message}</FieldError>
              </Field>
              {!isServicio ? (
                <Field data-invalid={errors.modeloId || errors.modelo ? true : undefined}>
                  <FieldLabel>{isEquipo ? "Modelo" : "Modelos compatibles"}</FieldLabel>
                  {isEquipo ? (
                    <SearchableSelect value={modeloId ?? undefined} onChange={handleModeloChange} options={modeloOptions} placeholder="Seleccionar modelo" searchPlaceholder="Buscar o crear modelo..." emptyLabel="No hay modelos todavía para este tipo." ariaLabel="Seleccionar modelo" disabled={createModeloMutation.isPending} invalid={!!errors.modeloId || !!errors.modelo} clearable clearLabel="Quitar modelo" onCreateOption={async (nombre) => { await handleCreateModelo(nombre); }} createLabel="Crear modelo" />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <SearchableMultiSelect values={modeloIds} onChange={handleModelosChange} options={modeloOptions} placeholder="Seleccionar modelos de equipo" searchPlaceholder="Buscar modelos de equipo..." emptyLabel="No hay modelos de equipo todavía." ariaLabel="Seleccionar modelos de equipo compatibles" disabled={createModeloMutation.isPending} invalid={!!errors.modeloId || !!errors.modelo} onCreateOption={handleCreateModelo} createLabel="Crear modelo" />
                      {selectedModeloOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto rounded-xl border border-border bg-muted/20 p-2 scrollbar-thin">
                          {selectedModeloOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-destructive/40 hover:text-destructive hover:scale-[1.02] active:scale-95"
                              onClick={() => handleRemoveModelo(option.value)}
                            >
                              <span className="truncate">{option.label}</span>
                              <X className="size-3 shrink-0" />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <FieldError>{errors.modeloId?.message || errors.modelo?.message}</FieldError>
                </Field>
              ) : null}
              {!isServicio && tipo !== TipoProducto.INSUMO ? (
                <Field data-invalid={errors.condicion ? true : undefined}>
                  <FieldLabel>Condición</FieldLabel>
                  <Select value={watch("condicion") ?? "none"} onValueChange={(value) => setValue("condicion", value === "none" ? undefined : (value as CondicionProducto), { shouldValidate: true })}>
                    <SelectTrigger aria-invalid={!!errors.condicion}><SelectValue placeholder="Seleccionar condición" /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectItem value="none">Sin condición</SelectItem>{Object.values(CondicionProducto).map((condicion) => (<SelectItem key={condicion} value={condicion}>{CONDICION_LABELS[condicion]}</SelectItem>))}</SelectGroup></SelectContent>
                  </Select>
                  <FieldError>{errors.condicion?.message}</FieldError>
                </Field>
              ) : null}
            </div>
          </div>
          <div className="border-t border-border/40" />
          <div className="space-y-4 p-3 sm:p-5">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3"><DollarSign className="size-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Precios y Finanzas</h3></div>
            <div className="space-y-4">
              {canViewServicioCostoReferencial ? (<Field data-invalid={errors.precioCompra ? true : undefined}><FieldLabel>{isServicio ? "Costo referencial (S/) *" : "Precio compra (S/) *"}</FieldLabel><Input type="number" step="0.01" min="0" startIcon={DollarSign} {...register("precioCompra", { valueAsNumber: true })} aria-invalid={!!errors.precioCompra} /><FieldError>{errors.precioCompra?.message}</FieldError></Field>) : null}
              <Field data-invalid={errors.precioVenta ? true : undefined}><FieldLabel>{isServicio ? "Precio base (S/) *" : "Precio venta (S/) *"}</FieldLabel><Input type="number" step="0.01" min="0" startIcon={DollarSign} {...register("precioVenta", { valueAsNumber: true })} aria-invalid={!!errors.precioVenta} /><FieldError>{errors.precioVenta?.message}</FieldError></Field>
              {!isServicio ? (<Field data-invalid={errors.precioMinimo ? true : undefined}><FieldLabel>Precio mínimo (S/) *</FieldLabel><Input type="number" step="0.01" min="0" startIcon={DollarSign} {...register("precioMinimo", { valueAsNumber: true })} aria-invalid={!!errors.precioMinimo} /><FieldError>{errors.precioMinimo?.message}</FieldError></Field>) : null}
            </div>
          </div>
          <div className="border-t border-border/40" />
          <div className="space-y-4 p-3 sm:p-5">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3"><Boxes className="size-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Inventario y Códigos</h3></div>
            <div className="space-y-4">
              {!isServicio ? (<Field data-invalid={errors.sku ? true : undefined}><FieldLabel>SKU</FieldLabel><div className="relative"><Input startIcon={Hash} {...register("sku", { onChange: () => setSkuManuallyEdited(true) })} className="pr-10 text-left font-mono text-xs sm:text-sm" placeholder="Auto: SKU-0001" aria-invalid={!!errors.sku} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground" title="Autogenerar SKU" disabled={isFetchingSuggestedSku} onClick={() => void handleGenerateSku()}>{isFetchingSuggestedSku ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}</Button></div><FieldError>{errors.sku?.message}</FieldError></Field>) : null}
              {!isServicio ? (<Field data-invalid={errors.codigoBarras ? true : undefined}><FieldLabel>Código de barras</FieldLabel><div className="relative"><Input startIcon={Barcode} {...register("codigoBarras", { onChange: () => setBarcodeManuallyEdited(true) })} className="pr-10 text-left font-mono text-xs sm:text-sm" placeholder="Se autocompleta con el SKU" aria-invalid={!!errors.codigoBarras} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground" title="Autogenerar código" onClick={handleGenerateBarcode}><RefreshCcw className="size-4" /></Button></div><FieldError>{errors.codigoBarras?.message}</FieldError></Field>) : null}
              {!isEquipo && !isServicio ? (<Field data-invalid={errors.codigoQr ? true : undefined}><FieldLabel>Código QR</FieldLabel><div className="relative"><Input startIcon={QrCode} {...register("codigoQr", { onChange: () => setQrManuallyEdited(true) })} className="pr-10 text-left font-mono text-xs sm:text-sm" placeholder="QR automático" aria-invalid={!!errors.codigoQr} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground" title="Autogenerar QR" onClick={handleGenerateQr}><RefreshCcw className="size-4" /></Button></div><FieldError>{errors.codigoQr?.message}</FieldError></Field>) : null}
              {!isServicio ? (<Field data-invalid={errors.stockMinimo ? true : undefined}><FieldLabel>Stock mínimo de alerta</FieldLabel><Input type="number" min="0" step="1" startIcon={Hash} {...register("stockMinimo", { valueAsNumber: true })} aria-invalid={!!errors.stockMinimo} /><FieldError>{errors.stockMinimo?.message}</FieldError></Field>) : (<Field data-invalid={errors.tiempoEstimadoMin ? true : undefined}><FieldLabel>Tiempo estimado (min)</FieldLabel><Input type="number" min="0" step="1" startIcon={Clock} {...register("tiempoEstimadoMin", { valueAsNumber: true })} aria-invalid={!!errors.tiempoEstimadoMin} /><FieldError>{errors.tiempoEstimadoMin?.message}</FieldError></Field>)}
              {tieneNumeroSerie ? (<><Field data-invalid={errors.mesesGarantia ? true : undefined}><FieldLabel>Meses de garantía</FieldLabel><Input type="number" min="0" max="120" step="1" placeholder="12" startIcon={Clock} {...register("mesesGarantia", { setValueAs: (value) => value === "" || value === null || value === undefined ? undefined : Number(value) })} aria-invalid={!!errors.mesesGarantia} /><FieldError>{errors.mesesGarantia?.message}</FieldError></Field><Field data-invalid={errors.garantiaMaxCopias ? true : undefined}><FieldLabel>Garantía máxima por copias</FieldLabel><Input type="number" min="0" step="1" placeholder="Ej: 50000" startIcon={Hash} {...register("garantiaMaxCopias", { setValueAs: (value) => value === "" || value === null || value === undefined ? null : Number(value) })} aria-invalid={!!errors.garantiaMaxCopias} /><FieldError>{errors.garantiaMaxCopias?.message}</FieldError></Field></>) : null}
              {mode === "create" && !isServicio && !isEquipo ? (<><Field data-invalid={stockInicialError ? true : undefined}><FieldLabel>Stock inicial (opcional)</FieldLabel><Input type="number" min="0" step="1" placeholder="0" startIcon={Boxes} value={stockInicial} onChange={(event) => { setStockInicial(event.target.value); if (stockInicialError) setStockInicialError(null); }} aria-invalid={!!stockInicialError} /><FieldError>{stockInicialError ?? undefined}</FieldError></Field><Field><FieldLabel>Almacén destino</FieldLabel><SearchableSelect value={almacenInicialId || undefined} onChange={(value) => setAlmacenInicialId(value || "")} options={almacenesActivos.map((almacen) => ({ value: almacen.id, label: almacen.esPrincipal ? almacen.nombre + " · principal" : almacen.nombre }))} placeholder={almacenesActivos.length === 0 ? "Sin almacenes" : "Seleccionar almacén"} searchPlaceholder="Buscar almacén..." emptyLabel="No hay almacenes activos" ariaLabel="Almacén destino del stock inicial" disabled={almacenesActivos.length === 0} /></Field></>) : mode === "create" && isEquipo ? (<div className="rounded-xl border border-border bg-muted/20 p-3 text-[10px] leading-relaxed text-muted-foreground">En Productos solo se crea la ficha del equipo. Las series y almacenes reales se registran desde el módulo Equipos.</div>) : null}
            </div>
          </div>
        </div>
          <div className="border-t border-border/40 lg:col-span-6 lg:border-l lg:border-t-0">
          {!isServicio && (<div className="space-y-4 p-3 sm:p-5"><div className="flex items-center gap-2 border-b border-border/40 pb-3"><ImagePlus className="size-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Imágenes del producto</h3></div><div className="space-y-4"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-muted/10">{selectedImageUrl ? (<><img src={imagePreviewUrls[selectedImageUrl] ?? getApiAssetUrl(selectedImageUrl)} alt={selectedImage?.nombre ?? "Vista previa"} className="size-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" /><div className="absolute inset-x-0 top-0 flex justify-between bg-gradient-to-b from-black/50 to-transparent p-2"><span className="rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">{selectedImage?.esPrincipal ? "Principal" : "Secundaria"}</span><Button type="button" variant="destructive" size="icon" className="size-6 rounded-lg bg-red-600 text-white hover:bg-red-700" onClick={() => selectedImageIndex >= 0 && removeImageAt(selectedImageIndex)}><Trash2 className="size-3" /></Button></div>{!selectedImage?.esPrincipal && (<div className="absolute bottom-2 left-2"><Button type="button" variant="secondary" size="sm" className="h-6 rounded-lg bg-white/95 text-[9px] font-bold text-foreground hover:bg-white" onClick={() => { setTimeout(() => markSelectedImageAsPrincipal(), 0); }}>Principal</Button></div>)}</>) : (<div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground/60"><ImagePlus className="mb-2 size-8 stroke-[1.5]" /><p className="text-xs font-semibold text-foreground">Sin imágenes</p><p className="text-[10px] text-muted-foreground">Sube archivos a la galería</p></div>)}</div><Field><label className={cn("flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-center transition-all duration-300 hover:border-primary/50", isDraggingImages ? "scale-[1.01] border-primary bg-primary/5" : "border-border/80 bg-muted/20 text-muted-foreground hover:bg-muted/30")} onDragOver={(event) => { event.preventDefault(); setIsDraggingImages(true); }} onDragLeave={(event) => { event.preventDefault(); setIsDraggingImages(false); }} onDrop={(event) => void handleImageDrop(event)}><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{isUploadingImages ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}</div><div className="space-y-0.5"><p className="text-xs font-semibold text-foreground">{isUploadingImages ? "Subiendo..." : "Arrastra o haz clic"}</p><p className="text-[9px] text-muted-foreground">Formatos: JPG, PNG, WEBP.</p></div><Input type="file" accept={getUploadAcceptAttr("image")} multiple className="hidden" disabled={isUploadingImages || isLoading} onChange={(event) => void handleImageFiles(event.target.files)} /></label></Field></div>{imagenes.length > 0 && (<div className="space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Galería ({imagenes.length})</span><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">{imagenes.map((image, index) => (<div key={image.url + "-" + index} onClick={() => setManualSelectedImageUrl(image.url)} className={cn("relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-card transition-all", image.url === selectedImageUrl ? "scale-95 border-primary ring-2 ring-primary/20" : "border-border/70 hover:border-primary/40")}><img src={imagePreviewUrls[image.url] ?? getApiAssetUrl(image.url)} alt={image.nombre ?? "Imagen"} className="size-full object-cover mix-blend-multiply" referrerPolicy="no-referrer" />{image.esPrincipal && (<div className="absolute right-1 top-1 size-2 rounded-full bg-primary" />)}</div>))}</div></div>)}<div className="border-t border-border/40 pt-2">{!showUrlInput ? (<button type="button" className="text-[10px] font-bold text-primary hover:underline" onClick={() => setShowUrlInput(true)}>+ Agregar imagen por URL</button>) : (<div className="space-y-2"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-foreground">Agregar imagen por URL</span><button type="button" className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => { setShowUrlInput(false); setManualImageUrl(""); }}>Ocultar</button></div><div className="flex gap-2"><Input value={manualImageUrl} onChange={(event) => setManualImageUrl(event.target.value)} placeholder="https://ejemplo.com/imagen.jpg" className="h-8 flex-1 text-xs" /><Button type="button" variant="secondary" size="sm" className="h-8 shrink-0 px-3 text-xs font-semibold" onClick={() => void addManualImage()}>Añadir</Button></div></div>)}</div></div></div>)}
          {!isServicio && <div className="border-t border-border/40" />}
          <div className="space-y-4 p-3 sm:p-5"><div className="flex items-center gap-2 border-b border-border/40 pb-3"><ImagePlus className="size-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Descripción comercial</h3></div><Field data-invalid={errors.descripcion ? true : undefined}>{(() => { const { ref: registeredRef, onBlur, name } = register("descripcion"); return (<RichDescriptionEditor ref={registeredRef} name={name} value={descripcion} onBlur={onBlur} onValueChange={(nextValue) => setValue("descripcion", nextValue, { shouldDirty: true, shouldTouch: true, shouldValidate: false })} aria-invalid={!!errors.descripcion} />); })()}<FieldError>{errors.descripcion?.message}</FieldError></Field></div>
          {!isServicio && (<><div className="border-t border-border/40" /><div className="space-y-4 p-3 sm:p-5"><div className="flex items-center gap-2 border-b border-border/40 pb-3"><Sparkles className="size-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">{attributeUi.title}</h3></div><div className="space-y-4"><div className="rounded-xl border border-border/70 bg-muted/15 p-3.5"><p className="text-xs font-semibold text-foreground">{TIPO_LABELS[tipo]}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{attributeUi.description}</p><div className="mt-2.5 flex flex-wrap gap-1.5">{attributeUi.presets.map((preset) => (<Button key={preset.clave} type="button" variant="outline" size="sm" className="h-7 rounded-full px-2.5 text-[10px]" onClick={() => handleAppendAttributePreset(preset)} disabled={atributoFields.length >= 30}><Plus className="size-3" />{preset.clave}</Button>))}</div></div><div className="space-y-2">{atributoFields.length === 0 ? (<div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-center"><Sparkles className="size-4 text-muted-foreground/50" /><p className="text-xs font-semibold text-foreground">Sin datos adicionales</p><p className="max-w-md text-[10px] text-muted-foreground">{attributeUi.emptyText}</p></div>) : (atributoFields.map((field, index) => { const claveError = errors.atributos?.[index]?.clave?.message; const valorError = errors.atributos?.[index]?.valor?.message; const claveName = `atributos.${index}.clave` as const; const valorName = `atributos.${index}.valor` as const; return (<div key={field.id} className="group flex items-start gap-2 sm:grid sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,2fr)_auto]"><div className="flex flex-col gap-0.5 pt-1.5 opacity-0 transition-opacity group-hover:opacity-100"><button type="button" className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" onClick={() => moveAtributo(index, index - 1)} disabled={index <= 0}><ArrowUp className="size-3" /></button><button type="button" className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" onClick={() => moveAtributo(index, index + 1)} disabled={index >= atributoFields.length - 1}><ArrowDown className="size-3" /></button></div><div className="min-w-0 flex-1"><Input {...register(claveName)} placeholder={attributeUi.keyPlaceholder} />{claveError ? (<p className="mt-1 text-[10px] text-destructive">{claveError}</p>) : null}</div><div className="min-w-0 flex-[2]"><Input {...register(valorName)} placeholder={attributeUi.valuePlaceholder} />{valorError ? (<p className="mt-1 text-[10px] text-destructive">{valorError}</p>) : null}</div><Button type="button" variant="ghost" size="icon" onClick={() => removeAtributo(index)} className="size-9 shrink-0 self-start text-muted-foreground hover:text-destructive"><X className="size-4" /></Button></div>); }))}</div><Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => appendAtributo({ clave: "", valor: "" })} disabled={atributoFields.length >= 30}><Plus className="size-3.5" />{attributeUi.buttonLabel}</Button></div></div></>)}
          <div className="border-t border-border/40" />
          <div className="space-y-3 p-3 sm:p-5"><div className="flex items-center gap-2 border-b border-border/40 pb-3"><Settings2 className="size-4 text-primary" /><h3 className="text-sm font-semibold text-foreground">Ficha activa</h3></div><div className="space-y-2"><Field orientation="horizontal" className="justify-between"><FieldLabel>Ficha activa</FieldLabel><Switch checked={Boolean(activo)} onCheckedChange={(value) => setValue("activo", value, { shouldValidate: true, shouldDirty: true })} /></Field>{isServicio && (<Field orientation="horizontal" className="justify-between"><FieldLabel>Requiere repuestos</FieldLabel><Switch checked={Boolean(requiereRepuestos)} onCheckedChange={(value) => setValue("requiereRepuestos", value, { shouldValidate: true })} /></Field>)}</div></div>
        </div>
        </div>
        {!hideBottomActions && (<div className="flex w-full flex-wrap justify-end gap-2.5 border-t border-border/40 p-3 sm:p-5">{onCancel ? (<Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isUploadingImages} className="h-9 rounded-xl px-4 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted active:scale-95 active:duration-150">Cancelar</Button>) : null}<Button type="submit" disabled={isLoading || isUploadingImages} className="h-9 min-w-36 gap-2 rounded-xl px-4 text-xs transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150">{isLoading || isUploadingImages ? (<><Loader2 className="size-4 animate-spin" />{mode === "create" ? "Creando..." : "Guardando..."}</>) : mode === "create" ? (<><Boxes className="size-4" />Crear registro</>) : (<><Settings2 className="size-4" />Guardar cambios</>)}</Button></div>)}
      </div>

      <Dialog open={unidadDialogOpen} onOpenChange={setUnidadDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.25,1.5,0.5,1)]">
          <DialogHeader>
            <DialogTitle>Crear unidad de medida</DialogTitle>
            <DialogDescription>
              Define un código corto y un nombre. Quedará disponible para todos
              los productos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field>
              <FieldLabel>Código *</FieldLabel>
              <Input
                value={unidadDialogCodigo}
                maxLength={16}
                onChange={(event) =>
                  setUnidadDialogCodigo(event.target.value.toUpperCase())
                }
                placeholder="NIU, BX, KGM..."
              />
            </Field>
            <Field>
              <FieldLabel>Nombre *</FieldLabel>
              <Input
                value={unidadDialogNombre}
                maxLength={80}
                onChange={(event) => setUnidadDialogNombre(event.target.value)}
                placeholder="Unidad, Caja, Kilogramo..."
              />
            </Field>
          </div>
          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-0 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnidadDialogOpen(false)}
              className="w-full sm:w-auto rounded-xl hover:bg-muted transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto rounded-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] active:scale-95 active:duration-150"
              disabled={
                createUnidadMutation.isPending ||
                !unidadDialogCodigo.trim() ||
                !unidadDialogNombre.trim()
              }
              onClick={async () => {
                try {
                  const created = await createUnidadMutation.mutateAsync({
                    codigo: unidadDialogCodigo.trim(),
                    nombre: unidadDialogNombre.trim(),
                    activo: true,
                  });
                  const newUnidad = (created as { data?: { id: string } })
                    ?.data;
                  if (newUnidad?.id) {
                    setValue("unidadMedidaId", newUnidad.id, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    toast.success("Unidad creada y seleccionada");
                  }
                  setUnidadDialogOpen(false);
                  setUnidadDialogCodigo("");
                  setUnidadDialogNombre("");
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "No se pudo crear la unidad",
                  );
                }
              }}
            >
              {createUnidadMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear unidad"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
