"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  Barcode,
  Boxes,
  Clock,
  DollarSign,
  ImagePlus,
  Loader2,
  Package,
  type LucideIcon,
  Plus,
  QrCode,
  Sparkles,
  X,
  RefreshCcw,
  Settings2,
  Trash2,
  Upload,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  CondicionProducto,
  productoFormSchema,
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
import { ProductCodePreview } from "@/components/products/product-code-preview";
import {
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

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

const TIPO_DESCRIPTIONS: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Unidades o activos físicos serializables.",
  [TipoProducto.REPUESTO]:
    "Piezas o componentes usados en soporte, reparación o mantenimiento.",
  [TipoProducto.INSUMO]: "Materiales consumibles generales.",
  [TipoProducto.SERVICIO]:
    "Concepto vendible sin inventario propio. Si usa repuestos o insumos, estos se descuentan por separado.",
  [TipoProducto.ACCESORIO]: "Complementos y accesorios comerciales.",
};

const CONDICION_LABELS: Record<CondicionProducto, string> = {
  [CondicionProducto.NUEVO]: "Nuevo",
  [CondicionProducto.SEMINUEVO]: "Seminuevo",
  [CondicionProducto.USADO]: "Usado",
  [CondicionProducto.REACONDICIONADO]: "Reacondicionado",
  [CondicionProducto.RECUPERADO]: "Recuperado",
};

const DEFAULT_UNIDAD_CODES_BY_TIPO: Record<TipoProducto, string[]> = {
  [TipoProducto.EQUIPO]: ["UND"],
  [TipoProducto.REPUESTO]: ["UND"],
  [TipoProducto.INSUMO]: ["UND", "CAJ", "PQT", "RES", "LT", "KG"],
  [TipoProducto.SERVICIO]: ["SERV", "HR", "HRS"],
  [TipoProducto.ACCESORIO]: ["UND", "KIT"],
};

const UNIDAD_HINTS: Record<TipoProducto, string> = {
  [TipoProducto.EQUIPO]: "Suele usarse UND para un equipo individual.",
  [TipoProducto.REPUESTO]:
    "Normalmente UND, KIT o piezas según cómo lo vendas.",
  [TipoProducto.INSUMO]:
    "Puede ser UND, CAJA, PAQUETE, RESMA, LITRO o KG según el insumo.",
  [TipoProducto.SERVICIO]: "Para servicios suele usarse SERV, HORA o VISITA.",
  [TipoProducto.ACCESORIO]: "Usa UND o KIT según cómo se comercialice.",
};

type ProductSectionTone = "blue" | "green" | "orange" | "purple";

const PRODUCT_SECTION_STYLES: Record<
  ProductSectionTone,
  {
    container: string;
    number: string;
    icon: string;
  }
> = {
  blue: {
    container: "border-l-sky-400/75",
    number:
      "bg-sky-500/12 text-sky-700 ring-sky-500/14 dark:bg-sky-400/16 dark:text-sky-100 dark:ring-sky-400/18",
    icon: "bg-sky-500/12 text-sky-700 ring-sky-500/14 dark:bg-sky-400/16 dark:text-sky-100 dark:ring-sky-400/18",
  },
  green: {
    container: "border-l-emerald-400/75",
    number:
      "bg-emerald-500/12 text-emerald-700 ring-emerald-500/14 dark:bg-emerald-400/16 dark:text-emerald-100 dark:ring-emerald-400/18",
    icon: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/14 dark:bg-emerald-400/16 dark:text-emerald-100 dark:ring-emerald-400/18",
  },
  orange: {
    container: "border-l-amber-400/80",
    number:
      "bg-amber-500/12 text-amber-700 ring-amber-500/14 dark:bg-amber-400/16 dark:text-amber-100 dark:ring-amber-400/18",
    icon: "bg-amber-500/12 text-amber-700 ring-amber-500/14 dark:bg-amber-400/16 dark:text-amber-100 dark:ring-amber-400/18",
  },
  purple: {
    container: "border-l-violet-400/75",
    number:
      "bg-violet-500/12 text-violet-700 ring-violet-500/14 dark:bg-violet-400/16 dark:text-violet-100 dark:ring-violet-400/18",
    icon: "bg-violet-500/12 text-violet-700 ring-violet-500/14 dark:bg-violet-400/16 dark:text-violet-100 dark:ring-violet-400/18",
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

function ProductSectionHeader({
  step,
  title,
  tone,
  icon: Icon,
}: {
  step: string;
  title: string;
  tone: ProductSectionTone;
  icon: LucideIcon;
}) {
  const styles = PRODUCT_SECTION_STYLES[tone];

  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1",
          styles.number,
        )}
      >
        {step}
      </span>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-xl ring-1 shadow-sm",
          styles.icon,
        )}
      >
        <Icon className="size-4" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

export function ProductoForm({
  defaultValues,
  onSubmit,
  onCancel,
  onDirtyChange,
  isLoading = false,
  mode,
  canViewInternalCosts = true,
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
      imagenes: normalizeInitialImages(defaultValues),
    },
  });

  const tipo = useWatch({ control, name: "tipo" }) ?? TipoProducto.REPUESTO;
  const sku = useWatch({ control, name: "sku" });
  const unidadMedidaId = useWatch({ control, name: "unidadMedidaId" });
  const categoriaId = useWatch({ control, name: "categoriaId" });
  const marcaId = useWatch({ control, name: "marcaId" });
  const modeloId = useWatch({ control, name: "modeloId" });
  const watchedImagenes = useWatch({ control, name: "imagenes" });
  const imagenes = useMemo(() => watchedImagenes ?? [], [watchedImagenes]);
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
  const canViewServicioCostoReferencial = !isServicio || canViewInternalCosts;

  const { data: categoriasRes } = useCategorias(tipo);
  const { data: marcasRes } = useMarcas(tipo);
  const { data: modelosRes } = useModelosCatalogo({ tipo, activo: true });
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

  const unidadesMedidaForTipo = useMemo(() => {
    const recommended = DEFAULT_UNIDAD_CODES_BY_TIPO[tipo] ?? [];
    if (recommended.length === 0) return unidadesMedida;
    const recommendedSet = new Set(recommended);
    const filtered = unidadesMedida.filter((unidad) =>
      recommendedSet.has(unidad.codigo),
    );
    // Always include the currently-selected unit even if it doesn't match the tipo (edit mode).
    if (unidadMedidaId) {
      const current = unidadesMedida.find(
        (unidad) => unidad.id === unidadMedidaId,
      );
      if (current && !filtered.some((unidad) => unidad.id === current.id)) {
        filtered.push(current);
      }
    }
    return filtered.length > 0 ? filtered : unidadesMedida;
  }, [tipo, unidadesMedida, unidadMedidaId]);

  const categoriaOptions = useMemo(
    () => flattenCategorias(categorias),
    [categorias],
  );
  const modeloOptions = useMemo(
    () =>
      modelos
        .filter(
          (modeloItem) =>
            !marcaId || !modeloItem.marca || modeloItem.marca.id === marcaId,
        )
        .map((modeloItem) => ({
          value: modeloItem.id,
          label:
            !marcaId && modeloItem.marca
              ? `${modeloItem.marca.nombre} · ${modeloItem.nombre}`
              : modeloItem.nombre,
        })),
    [marcaId, modelos],
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

  useEffect(() => {
    onDirtyChange?.(isDirty || hasInitialStockDraft);
  }, [hasInitialStockDraft, isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty && !hasInitialStockDraft) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasInitialStockDraft, isDirty]);

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

  const previousTipoRef = useRef<TipoProducto>(tipo);
  useEffect(() => {
    if (previousTipoRef.current === tipo) return;
    previousTipoRef.current = tipo;
    if (!unidadMedidaId) return;
    const recommended = DEFAULT_UNIDAD_CODES_BY_TIPO[tipo] ?? [];
    if (recommended.length === 0) return;
    const current = unidadesMedida.find(
      (unidad) => unidad.id === unidadMedidaId,
    );
    if (current && !recommended.includes(current.codigo)) {
      setValue("unidadMedidaId", "", {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [tipo, unidadMedidaId, unidadesMedida, setValue]);

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
      unidadesMedida.find((unidad) => unidad.codigo === "UND") ??
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
    if (!modelosRes || !modeloId) {
      return;
    }

    const modelExistsForContext = modeloOptions.some(
      (option) => option.value === modeloId,
    );
    if (!modelExistsForContext) {
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
    }
  }, [modeloId, modeloOptions, modelosRes, setValue]);

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

    if (!marcaId && selectedModelo?.marca?.id) {
      setValue("marcaId", selectedModelo.marca.id, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
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
        tipo,
        marcaId: marcaId ?? null,
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

      if (!marcaId && createdModelo.marca?.id) {
        setValue("marcaId", createdModelo.marca.id, {
          shouldDirty: true,
          shouldTouch: false,
          shouldValidate: false,
        });
      }

      toast.success("Modelo creado y seleccionado");
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
      modeloId: data.modeloId ?? null,
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
    <form onSubmit={handleSubmit(submitForm)} noValidate>
      <FieldGroup className="gap-3 sm:gap-7">
        <div
          className={cn(
            "rounded-2xl border border-border/60 border-l-[3px] bg-card/95 p-4 shadow-sm sm:p-5",
            PRODUCT_SECTION_STYLES.blue.container,
          )}
        >
          <ProductSectionHeader
            step="1"
            title="Clasificación y datos base"
            tone="blue"
            icon={Package}
          />

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {lockedTipo ? null : (
            <Field
              data-invalid={errors.tipo ? true : undefined}
              className="md:col-span-2 lg:col-span-3"
            >
              <FieldLabel>Tipo *</FieldLabel>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {Object.values(TipoProducto)
                  .filter(
                    (tipoOption) =>
                      tipoOption !== TipoProducto.SERVICIO ||
                      lockedTipo === TipoProducto.SERVICIO,
                  )
                  .map((tipoOption) => (
                  <button
                    key={tipoOption}
                    type="button"
                    className={cn(
                      "group relative flex min-h-20 flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all",
                      tipo === tipoOption
                        ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                        : "border-border/80 bg-muted/20 hover:border-primary/30 hover:bg-muted/50 text-foreground",
                    )}
                    onClick={() => handleTipoChange(tipoOption)}
                  >
                    <span className={cn("text-sm font-bold", tipo === tipoOption ? "text-primary" : "")}>
                      {TIPO_LABELS[tipoOption]}
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {TIPO_DESCRIPTIONS[tipoOption]}
                    </span>
                    {tipo === tipoOption ? (
                      <div className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
              <FieldError>{errors.tipo?.message}</FieldError>
            </Field>
            )}

            {!isServicio ? (
              <Field data-invalid={errors.sku ? true : undefined}>
                <FieldLabel>SKU</FieldLabel>
                <div className="relative">
                  <Input
                    {...register("sku", {
                      onChange: () => setSkuManuallyEdited(true),
                    })}
                    className="pr-10"
                    placeholder="Auto: SKU-0001"
                    aria-invalid={!!errors.sku}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Autogenerar SKU"
                    disabled={isFetchingSuggestedSku}
                    onClick={() => void handleGenerateSku()}
                  >
                    {isFetchingSuggestedSku ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="size-4" />
                    )}
                    <span className="sr-only">Autogenerar SKU</span>
                  </Button>
                </div>
                <FieldDescription>
                  {sku
                    ? "Puedes editarlo si usas un código propio. Usa el botón para traer el sugerido por tipo y categoría."
                    : "Si lo dejas vacío, el sistema lo genera por tipo y categoría."}
                </FieldDescription>
                <FieldError>{errors.sku?.message}</FieldError>
              </Field>
            ) : null}

            <Field
              data-invalid={errors.nombre ? true : undefined}
              className="lg:col-span-2"
            >
              <FieldLabel>
                {isServicio ? "Nombre del servicio *" : "Nombre *"}
              </FieldLabel>
              <Input
                {...register("nombre")}
                placeholder={
                  isServicio
                    ? "Servicio de mantenimiento preventivo"
                    : "Nombre del producto"
                }
                aria-invalid={!!errors.nombre}
              />
              <FieldError>{errors.nombre?.message}</FieldError>
            </Field>

            <Field data-invalid={errors.categoriaId ? true : undefined}>
              <FieldLabel>Categoría / subcategoría *</FieldLabel>
              <SearchableSelect
                value={categoriaId}
                onChange={(value) =>
                  setValue("categoriaId", value, { shouldValidate: true })
                }
                options={categoriaOptions}
                placeholder="Seleccionar categoría"
                searchPlaceholder="Buscar categoría..."
                emptyLabel="No hay categorías para este tipo."
                ariaLabel="Seleccionar categoría"
                disabled={categoriaOptions.length === 0}
                invalid={!!errors.categoriaId}
                clearable
                clearLabel="Quitar categoría"
              />
              <FieldError>{errors.categoriaId?.message}</FieldError>
            </Field>

            {!isServicio ? (
              <Field data-invalid={errors.marcaId ? true : undefined}>
                <FieldLabel>Marca</FieldLabel>
                <SearchableSelect
                  value={watch("marcaId") ?? undefined}
                  onChange={(value) =>
                    setValue("marcaId", value || null, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  options={marcas.map((marca) => ({
                    value: marca.id,
                    label: marca.nombre,
                  }))}
                  placeholder="Seleccionar marca"
                  searchPlaceholder="Buscar o crear marca..."
                  emptyLabel="No hay marcas registradas"
                  ariaLabel="Seleccionar marca"
                  invalid={!!errors.marcaId}
                  clearable
                  clearLabel="Sin marca"
                  createLabel="Crear marca"
                  onCreateOption={async (nombre) => {
                    try {
                      const created = await createMarcaMutation.mutateAsync({
                        nombre,
                        tipos: [tipo],
                      });
                      const newMarca = (created as { data?: { id: string } })
                        ?.data;
                      if (newMarca?.id) {
                        setValue("marcaId", newMarca.id, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        toast.success("Marca creada y seleccionada");
                      }
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "No se pudo crear la marca",
                      );
                      throw error;
                    }
                  }}
                />
                <FieldError>{errors.marcaId?.message}</FieldError>
              </Field>
            ) : null}

            <Field data-invalid={errors.unidadMedidaId ? true : undefined}>
              <FieldLabel>Unidad de medida *</FieldLabel>
              <SearchableSelect
                value={unidadMedidaId}
                onChange={(value) =>
                  setValue("unidadMedidaId", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                options={unidadesMedidaForTipo.map((unidad) => ({
                  value: unidad.id,
                  label: `${unidad.codigo} · ${unidad.nombre}`,
                }))}
                placeholder="Seleccionar unidad"
                searchPlaceholder="Buscar o crear unidad..."
                emptyLabel="No se encontraron unidades"
                ariaLabel="Seleccionar unidad de medida"
                invalid={!!errors.unidadMedidaId}
                createLabel="Crear unidad"
                onCreateOption={(label) => {
                  const trimmed = label.trim();
                  setUnidadDialogCodigo(trimmed.slice(0, 16).toUpperCase());
                  setUnidadDialogNombre(trimmed);
                  setUnidadDialogOpen(true);
                }}
              />
              <FieldDescription>{UNIDAD_HINTS[tipo]}</FieldDescription>
              <FieldError>{errors.unidadMedidaId?.message}</FieldError>
            </Field>

            {!isServicio ? (
              <Field
                data-invalid={
                  errors.modeloId || errors.modelo ? true : undefined
                }
              >
                <FieldLabel>
                  {isEquipo ? "Modelo" : "Modelo / compatibilidad"}
                </FieldLabel>
                <SearchableSelect
                  value={modeloId ?? undefined}
                  onChange={handleModeloChange}
                  options={modeloOptions}
                  placeholder={
                    isEquipo ? "Seleccionar modelo" : "Seleccionar modelo base"
                  }
                  searchPlaceholder={
                    isEquipo
                      ? "Buscar o crear modelo..."
                      : "Buscar o crear compatibilidad base..."
                  }
                  emptyLabel="No hay modelos todavía para este tipo."
                  ariaLabel={
                    isEquipo
                      ? "Seleccionar modelo"
                      : "Seleccionar modelo o compatibilidad"
                  }
                  disabled={createModeloMutation.isPending}
                  invalid={!!errors.modeloId || !!errors.modelo}
                  clearable
                  clearLabel="Quitar modelo"
                  onCreateOption={handleCreateModelo}
                  createLabel="Crear modelo"
                />
                <FieldDescription>
                  Busca un modelo ya registrado o créalo ahí mismo. Si un
                  repuesto aplica a varios, luego puedes ampliar
                  compatibilidades.
                </FieldDescription>
                <FieldError>
                  {errors.modeloId?.message || errors.modelo?.message}
                </FieldError>
              </Field>
            ) : null}

            {!isServicio && tipo !== TipoProducto.INSUMO ? (
              <Field data-invalid={errors.condicion ? true : undefined}>
                <FieldLabel>Condición</FieldLabel>
                <Select
                  value={watch("condicion") ?? "none"}
                  onValueChange={(value) =>
                    setValue(
                      "condicion",
                      value === "none"
                        ? undefined
                        : (value as CondicionProducto),
                      { shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger aria-invalid={!!errors.condicion}>
                    <SelectValue placeholder="Seleccionar condición" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">Sin condición</SelectItem>
                      {Object.values(CondicionProducto).map((condicion) => (
                        <SelectItem key={condicion} value={condicion}>
                          {CONDICION_LABELS[condicion]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError>{errors.condicion?.message}</FieldError>
              </Field>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border border-border/60 border-l-[3px] bg-card/95 p-4 shadow-sm sm:p-5",
            PRODUCT_SECTION_STYLES.green.container,
          )}
        >
          <ProductSectionHeader
            step="2"
            title="Precios, stock y reglas"
            tone="green"
            icon={DollarSign}
          />

          <div
            className={cn(
              "grid gap-4 sm:gap-6",
              isServicio && !canViewServicioCostoReferencial
                ? "md:grid-cols-2"
                : "md:grid-cols-3",
            )}
          >
            {canViewServicioCostoReferencial ? (
              <Field data-invalid={errors.precioCompra ? true : undefined}>
                <FieldLabel>
                  {isServicio
                    ? "Costo referencial (S/) *"
                    : "Precio compra (S/) *"}
                </FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("precioCompra", { valueAsNumber: true })}
                  aria-invalid={!!errors.precioCompra}
                />
                <FieldError>{errors.precioCompra?.message}</FieldError>
              </Field>
            ) : null}

            <Field data-invalid={errors.precioVenta ? true : undefined}>
              <FieldLabel>
                {isServicio ? "Precio base (S/) *" : "Precio venta (S/) *"}
              </FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("precioVenta", { valueAsNumber: true })}
                aria-invalid={!!errors.precioVenta}
              />
              <FieldError>{errors.precioVenta?.message}</FieldError>
            </Field>

            {!isServicio ? (
              <Field data-invalid={errors.precioMinimo ? true : undefined}>
                <FieldLabel>Precio mínimo (S/) *</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("precioMinimo", { valueAsNumber: true })}
                  aria-invalid={!!errors.precioMinimo}
                />
                <FieldDescription>
                  Precio piso autorizado para descuentos.
                </FieldDescription>
                <FieldError>{errors.precioMinimo?.message}</FieldError>
              </Field>
            ) : null}

            {!isServicio ? (
              <Field data-invalid={errors.stockMinimo ? true : undefined}>
                <FieldLabel>Stock mínimo de alerta</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  {...register("stockMinimo", { valueAsNumber: true })}
                  aria-invalid={!!errors.stockMinimo}
                />
                <FieldDescription>
                  No es stock inicial. Sirve como umbral para alertas; el stock
                  real ingresa por compras o movimientos de inventario.
                </FieldDescription>
                <FieldError>{errors.stockMinimo?.message}</FieldError>
              </Field>
            ) : (
              <Field data-invalid={errors.tiempoEstimadoMin ? true : undefined}>
                <FieldLabel>Tiempo estimado (min)</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  {...register("tiempoEstimadoMin", { valueAsNumber: true })}
                  aria-invalid={!!errors.tiempoEstimadoMin}
                />
                <FieldError>{errors.tiempoEstimadoMin?.message}</FieldError>
              </Field>
            )}

            {tieneNumeroSerie ? (
              <>
                <Field data-invalid={errors.mesesGarantia ? true : undefined}>
                  <FieldLabel>Meses de garantía</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    step="1"
                    placeholder="12"
                    {...register("mesesGarantia", {
                      setValueAs: (value) => {
                        if (value === "" || value === null || value === undefined) {
                          return undefined;
                        }
                        const num = Number(value);
                        return Number.isFinite(num) ? num : undefined;
                      },
                    })}
                    aria-invalid={!!errors.mesesGarantia}
                  />
                  <FieldDescription>
                    Cobertura estándar al vender este equipo. Por defecto 12
                    meses.
                  </FieldDescription>
                  <FieldError>{errors.mesesGarantia?.message}</FieldError>
                </Field>

                <Field
                  data-invalid={errors.garantiaMaxCopias ? true : undefined}
                >
                  <FieldLabel>Garantía máxima por copias (opcional)</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ej: 50000"
                    {...register("garantiaMaxCopias", {
                      setValueAs: (value) => {
                        if (value === "" || value === null || value === undefined) {
                          return null;
                        }
                        const num = Number(value);
                        return Number.isFinite(num) ? num : null;
                      },
                    })}
                    aria-invalid={!!errors.garantiaMaxCopias}
                  />
                  <FieldDescription>
                    Tope de copias cubiertas. Si se alcanza antes de vencer la
                    garantía por tiempo, esta se considera consumida. Déjalo
                    vacío si la garantía solo depende del tiempo.
                  </FieldDescription>
                  <FieldError>{errors.garantiaMaxCopias?.message}</FieldError>
                </Field>
              </>
            ) : null}

            {mode === "create" && !isServicio && !isEquipo ? (
              <>
                <Field data-invalid={stockInicialError ? true : undefined}>
                  <FieldLabel>Stock inicial (opcional)</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="0"
                    value={stockInicial}
                    onChange={(event) => {
                      setStockInicial(event.target.value);
                      if (stockInicialError) setStockInicialError(null);
                    }}
                    aria-invalid={!!stockInicialError}
                  />
                  <FieldDescription>
                    Genera un movimiento AJUSTE_POSITIVO al guardar. Déjalo en 0
                    si vas a registrar la entrada por compras.
                  </FieldDescription>
                  <FieldError>{stockInicialError ?? undefined}</FieldError>
                </Field>

                <Field>
                  <FieldLabel>Almacén destino</FieldLabel>
                  <SearchableSelect
                    value={almacenInicialId || undefined}
                    onChange={(value) => setAlmacenInicialId(value || "")}
                    options={almacenesActivos.map((almacen) => ({
                      value: almacen.id,
                      label: almacen.esPrincipal
                        ? `${almacen.nombre} · principal`
                        : almacen.nombre,
                    }))}
                    placeholder={
                      almacenesActivos.length === 0
                        ? "Sin almacenes activos"
                        : "Seleccionar almacén"
                    }
                    searchPlaceholder="Buscar almacén..."
                    emptyLabel="No hay almacenes activos"
                    ariaLabel="Almacén destino del stock inicial"
                    disabled={almacenesActivos.length === 0}
                  />
                  <FieldDescription>
                    Por defecto se elige el almacén principal.
                  </FieldDescription>
                </Field>
              </>
            ) : mode === "create" && isEquipo ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground md:col-span-2">
                En Productos solo se crea la ficha de catálogo del equipo. Las
                unidades físicas, series, almacén real y garantía se registran
                después desde el módulo Equipos.
              </div>
            ) : null}

            {!isServicio ? (
              <Field data-invalid={errors.codigoBarras ? true : undefined}>
                <FieldLabel>Código de barras</FieldLabel>
                <div className="relative">
                  <Barcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    {...register("codigoBarras", {
                      onChange: () => setBarcodeManuallyEdited(true),
                    })}
                    className="pl-9 pr-10"
                    placeholder="Se autocompleta con el SKU o escanéalo"
                    aria-invalid={!!errors.codigoBarras}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Autogenerar código de barras"
                    onClick={handleGenerateBarcode}
                  >
                    <RefreshCcw className="size-4" />
                    <span className="sr-only">Autogenerar código de barras</span>
                  </Button>
                </div>
                <FieldDescription>
                  Si el proveedor ya trae código, escanéalo. Si no, el sistema usa
                  el SKU como código interno.
                </FieldDescription>
                <FieldError>{errors.codigoBarras?.message}</FieldError>
              </Field>
            ) : null}

            {!isEquipo && !isServicio ? (
              <Field data-invalid={errors.codigoQr ? true : undefined}>
                <FieldLabel>Código QR</FieldLabel>
                <div className="relative">
                  <QrCode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    {...register("codigoQr")}
                    className="pl-9 pr-10"
                    placeholder="Se autogenera si lo dejas vacío"
                    aria-invalid={!!errors.codigoQr}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Autogenerar código QR"
                    onClick={handleGenerateQr}
                  >
                    <RefreshCcw className="size-4" />
                    <span className="sr-only">Autogenerar código QR</span>
                  </Button>
                </div>
                <FieldError>{errors.codigoQr?.message}</FieldError>
              </Field>
            ) : isEquipo ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground md:col-span-2">
                El producto tipo equipo usa SKU y código de barras como ficha de
                catálogo. El QR operativo se genera en cada unidad física desde
                Equipos.
              </div>
            ) : null}
          </div>

          {!isServicio ? (
            <ProductCodePreview
              sku={sku}
              barcodeValue={watch("codigoBarras")}
              qrValue={isEquipo ? undefined : watch("codigoQr")}
              showQr={!isEquipo}
              className="mt-4"
              compact
            />
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Regla de stock</p>
              <p>
                {isServicio
                  ? "No maneja inventario."
                  : isEquipo
                    ? "El stock físico se controla por unidades registradas en Equipos."
                  : "Maneja inventario y movimientos de stock."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Serialización</p>
              <p>
                {isEquipo
                  ? "Cada unidad física se registra luego en Equipos."
                  : "No usa número de serie por unidad."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Consumo</p>
              <p>
                {tipo === TipoProducto.INSUMO
                  ? "Se consume en operación o soporte."
                  : "No se marca como consumible."}
              </p>
            </div>

            <Field orientation="horizontal">
              <FieldLabel>Activo</FieldLabel>
              <Switch
                checked={Boolean(activo)}
                onCheckedChange={(value) =>
                  setValue("activo", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            </Field>
          </div>

          {isServicio ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field orientation="horizontal">
                <FieldLabel>Requiere repuestos</FieldLabel>
                <Switch
                  checked={Boolean(requiereRepuestos)}
                  onCheckedChange={(value) =>
                    setValue("requiereRepuestos", value, {
                      shouldValidate: true,
                    })
                  }
                />
              </Field>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <Clock className="size-4" />
                Los servicios quedan fuera del stock y pueden venderse como
                actividad.
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "rounded-2xl border border-border/60 border-l-[3px] bg-card/95 p-4 shadow-sm sm:p-5",
            PRODUCT_SECTION_STYLES.orange.container,
          )}
        >
          <ProductSectionHeader
            step="3"
            title="Imágenes y descripción"
            tone="orange"
            icon={ImagePlus}
          />

          <div className="space-y-4">
            <Field data-invalid={errors.descripcion ? true : undefined}>
              <FieldLabel>Descripción</FieldLabel>
              <Textarea
                {...register("descripcion")}
                placeholder="Descripción, compatibilidad, observaciones comerciales o alcance del servicio"
                rows={4}
                aria-invalid={!!errors.descripcion}
              />
              <FieldError>{errors.descripcion?.message}</FieldError>
            </Field>

            {!isServicio && (
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="upload" className="text-xs">Subir archivo</TabsTrigger>
                  <TabsTrigger value="url" className="text-xs">Por URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-0 space-y-3">
                  <Field>
                    <label
                      className={cn(
                        "flex h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
                        isDraggingImages
                          ? "border-primary bg-primary/6 text-foreground"
                          : "border-border/80 bg-muted/25 text-muted-foreground hover:bg-muted/40",
                      )}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDraggingImages(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        setIsDraggingImages(false);
                      }}
                      onDrop={(event) => void handleImageDrop(event)}
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                        {isUploadingImages ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-foreground">
                          {isUploadingImages
                            ? "Subiendo..."
                            : "Arrastra o haz clic aquí"}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          JPG, PNG, WEBP hasta 5MB.
                        </p>
                      </div>
                      <Input
                        type="file"
                        accept={getUploadAcceptAttr("image")}
                        multiple
                        className="hidden"
                        disabled={isUploadingImages || isLoading}
                        onChange={(event) =>
                          void handleImageFiles(event.target.files)
                        }
                      />
                    </label>
                  </Field>
                </TabsContent>
                <TabsContent value="url" className="mt-0 space-y-3">
                  <Field>
                    <div className="flex h-[180px] flex-col justify-center gap-3 rounded-xl border border-border/80 bg-muted/10 px-4 py-5">
                      <FieldLabel className="text-xs">URL directa de la imagen</FieldLabel>
                      <div className="flex flex-col gap-2">
                        <Input
                          value={manualImageUrl}
                          onChange={(event) =>
                            setManualImageUrl(event.target.value)
                          }
                          placeholder="https://..."
                          className="text-xs h-9"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 w-full text-xs"
                          onClick={() => void addManualImage()}
                        >
                          Agregar imagen
                        </Button>
                      </div>
                    </div>
                  </Field>
                </TabsContent>
              </Tabs>

              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Archivos cargados
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {imagenes.length > 0
                        ? `${imagenes.length} imagen${imagenes.length === 1 ? "" : "es"} lista${imagenes.length === 1 ? "" : "s"} para este producto.`
                        : "Las imágenes que subas aparecerán aquí para elegir la principal."}
                    </p>
                  </div>
                  {imagenes.length > 0 ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {imagenes.length}
                    </span>
                  ) : null}
                </div>

                {imagenes.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {imagenes.map((image, index) => {
                      return (
                        <div
                          key={`${image.url}-${index}`}
                          className={cn(
                            "group relative w-36 shrink-0 overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all",
                            image.esPrincipal
                              ? "border-primary ring-1 ring-primary/20"
                              : "border-border/70 hover:border-primary/40",
                          )}
                        >
                          <div className="aspect-square bg-muted/30">
                            <img
                              src={
                                imagePreviewUrls[image.url] ??
                                getApiAssetUrl(image.url)
                              }
                              alt={image.nombre ?? "Imagen"}
                              className="size-full object-cover mix-blend-multiply"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="absolute inset-x-0 top-0 flex justify-between p-1.5 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-b from-black/50 to-transparent">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon-sm"
                                className="h-6 w-6 rounded text-[10px] bg-white/90 text-foreground hover:bg-white"
                                disabled={index <= 0}
                                aria-label="Mover a la izquierda"
                                onClick={() => {
                                  setManualSelectedImageUrl(image.url);
                                  moveSelectedImage("up");
                                }}
                              >
                                <ArrowUp className="size-3 -rotate-90" />
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon-sm"
                                className="h-6 w-6 rounded text-[10px] bg-white/90 text-foreground hover:bg-white"
                                disabled={index >= imagenes.length - 1}
                                aria-label="Mover a la derecha"
                                onClick={() => {
                                  setManualSelectedImageUrl(image.url);
                                  moveSelectedImage("down");
                                }}
                              >
                                <ArrowDown className="size-3 -rotate-90" />
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon-sm"
                                className="h-6 w-6 rounded text-[10px] bg-white/90 text-foreground hover:bg-white ml-1"
                                onClick={() => {
                                  window.open(imagePreviewUrls[image.url] ?? getApiAssetUrl(image.url), '_blank');
                                }}
                                aria-label="Ver imagen completa"
                              >
                                <Eye className="size-3" />
                              </Button>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon-sm"
                              className="h-6 w-6 rounded"
                              aria-label="Eliminar"
                              onClick={() => removeImageAt(index)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                          <div className="flex flex-col gap-1.5 p-2">
                            <span className="truncate text-[10px] font-medium text-foreground">
                              {image.nombre ?? `Img ${index + 1}`}
                            </span>
                            <Button
                              type="button"
                              variant={image.esPrincipal ? "secondary" : "outline"}
                              size="sm"
                              className={cn("h-6 w-full text-[10px] font-semibold px-2", image.esPrincipal && "bg-primary/10 text-primary hover:bg-primary/20 border-0")}
                              onClick={() => {
                                setManualSelectedImageUrl(image.url);
                                setTimeout(() => markSelectedImageAsPrincipal(), 0);
                              }}
                            >
                              {image.esPrincipal ? "Principal" : "Marcar"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground">
                      <ImagePlus className="size-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Todavía no hay imágenes cargadas
                    </p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      Puedes arrastrarlas, elegir varias a la vez o pegar un
                      enlace directo para completar la ficha visual del
                      producto.
                    </p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>

        {!isServicio && (
        <div
          className={cn(
            "rounded-2xl border border-border/60 border-l-[3px] bg-card/95 p-4 shadow-sm sm:p-5",
            PRODUCT_SECTION_STYLES.purple.container,
          )}
        >
          <ProductSectionHeader
            step="4"
            title="Atributos técnicos"
            tone="purple"
            icon={Sparkles}
          />

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Agrega características flexibles del producto: USB, táctil,
              dúplex, conexión Wi-Fi, voltaje, etc. Se mostrarán en la ficha del
              producto y en el catálogo público.
            </p>

            <div className="space-y-2">
              {atributoFields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-4 text-center text-xs text-muted-foreground">
                  Aún no agregaste atributos. Pulsa “Agregar atributo” para
                  empezar.
                </div>
              ) : (
                atributoFields.map((field, index) => {
                  const claveError =
                    errors.atributos?.[index]?.clave?.message;
                  const valorError =
                    errors.atributos?.[index]?.valor?.message;
                  return (
                    <div
                      key={field.id}
                      className="group flex gap-2 sm:grid sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,2fr)_auto] items-start"
                    >
                      <div className="flex flex-col gap-0.5 pt-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                          onClick={() => moveAtributo(index, index - 1)}
                          disabled={index <= 0}
                          aria-label="Mover atributo hacia arriba"
                        >
                          <ArrowUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                          onClick={() => moveAtributo(index, index + 1)}
                          disabled={index >= atributoFields.length - 1}
                          aria-label="Mover atributo hacia abajo"
                        >
                          <ArrowDown className="size-3" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Input
                          {...register(`atributos.${index}.clave` as const)}
                          placeholder="Clave (ej. usb, tactil)"
                          aria-invalid={!!claveError}
                        />
                        {claveError ? (
                          <p className="mt-1 text-xs text-destructive">
                            {claveError}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex-[2] min-w-0">
                        <Input
                          {...register(`atributos.${index}.valor` as const)}
                          placeholder="Valor (ej. sí, 3.0, 220V)"
                          aria-invalid={!!valorError}
                        />
                        {valorError ? (
                          <p className="mt-1 text-xs text-destructive">
                            {valorError}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAtributo(index)}
                        aria-label={`Eliminar atributo ${index + 1}`}
                        className="size-9 self-start text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                appendAtributo({ clave: "", valor: "" })
              }
              disabled={atributoFields.length >= 30}
            >
              <Plus className="size-4" />
              Agregar atributo
            </Button>

            {errors.atributos &&
            typeof errors.atributos.message === "string" ? (
              <p className="text-xs text-destructive">
                {errors.atributos.message}
              </p>
            ) : null}
          </div>
        </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading || isUploadingImages}
            >
              Cancelar
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={isLoading || isUploadingImages}
            className="min-w-36 gap-2"
          >
            {isLoading || isUploadingImages ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {mode === "create" ? "Creando..." : "Guardando..."}
              </>
            ) : mode === "create" ? (
              <>
                <Boxes className="size-4" />
                Crear registro
              </>
            ) : (
              <>
                <Settings2 className="size-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </FieldGroup>

      <Dialog open={unidadDialogOpen} onOpenChange={setUnidadDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
                placeholder="UND, CAJ, KG..."
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnidadDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
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
