import {
  type ConfigurationSectionId,
  configurationSectionsList,
} from "@/components/settings/settings-sections";
import { RolUsuario } from "@erp/shared";

export const DEFAULT_CONFIGURATION_SECTION: ConfigurationSectionId = "empresa";
const CATALOG_CONFIGURATION_SECTIONS = [
  "categorias",
  "marcas",
  "modelos",
] satisfies ConfigurationSectionId[];

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

export function getConfigurationSectionsForRole(
  rol?: RolUsuario | null,
): ConfigurationSectionId[] {
  if (rol === RolUsuario.ADMIN) {
    return configurationSectionsList.map((section) => section.id);
  }

  if (rol === RolUsuario.ENCARGADO) {
    return [...CATALOG_CONFIGURATION_SECTIONS];
  }

  return [];
}

export function canAccessConfigurationSection(
  sectionId: ConfigurationSectionId,
  rol?: RolUsuario | null,
) {
  return getConfigurationSectionsForRole(rol).includes(sectionId);
}

export function getDefaultConfigurationSectionForRole(
  rol?: RolUsuario | null,
): ConfigurationSectionId | null {
  return getConfigurationSectionsForRole(rol)[0] ?? null;
}

export function resolveConfigurationSectionForRole(
  section: string | null,
  rol?: RolUsuario | null,
): ConfigurationSectionId | null {
  if (isConfigurationSectionId(section) && canAccessConfigurationSection(section, rol)) {
    return section;
  }

  return getDefaultConfigurationSectionForRole(rol);
}

export function getConfigurationSectionGroupsForRole(rol?: RolUsuario | null) {
  const allowedSections = new Set(getConfigurationSectionsForRole(rol));

  return CONFIGURATION_SECTION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((sectionId) => allowedSections.has(sectionId)),
  })).filter((group) => group.items.length > 0);
}
