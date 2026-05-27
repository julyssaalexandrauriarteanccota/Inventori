import {
  type ConfigurationSectionId,
  configurationSectionsList,
} from "@/components/settings/settings-sections";

export const DEFAULT_CONFIGURATION_SECTION: ConfigurationSectionId = "empresa";

export const CONFIGURATION_SECTION_GROUPS: Array<{
  label: string;
  items: ConfigurationSectionId[];
}> = [
  {
    label: "Empresa",
    items: ["empresa"],
  },
  {
    label: "Tributario",
    items: ["fiscal", "padron-sunat"],
  },
  {
    label: "Seguridad y personas",
    items: ["usuarios"],
  },
  {
    label: "Operación",
    items: [
      "almacenes",
      "metodos-pago",
      "tipos-movimiento",
      "unidades-medida",
      "cajas",
    ],
  },
  {
    label: "Catálogo",
    items: ["categorias", "marcas", "modelos"],
  },
];

export const CONFIGURATION_SECTION_MAP = new Map(
  configurationSectionsList.map((section) => [section.id, section]),
);

export function isConfigurationSectionId(
  value: string | null,
): value is ConfigurationSectionId {
  return (
    value != null &&
    CONFIGURATION_SECTION_MAP.has(value as ConfigurationSectionId)
  );
}

export function getConfigurationSectionHref(sectionId: ConfigurationSectionId) {
  return `/configuracion?section=${sectionId}`;
}
