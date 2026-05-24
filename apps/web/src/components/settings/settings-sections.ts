import {
  ArrowRightLeft,
  CreditCard,
  Database,
  FileText,
  FolderTree,
  Home,
  Landmark,
  Package,
  Ruler,
  Truck,
  SlidersHorizontal,
  Stamp,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

export const quickSettingsSectionsList = [
  { id: "preferencias", name: "Preferencias", icon: SlidersHorizontal },
] as const;

export const configurationSectionsList = [
  { id: "empresa", name: "Empresa", icon: Home },
  { id: "fiscal", name: "Tributario", icon: Landmark },
  { id: "padron-sunat", name: "Padrón SUNAT", icon: Database },
  { id: "series", name: "Series", icon: FileText },
  { id: "usuarios", name: "Usuarios", icon: Users },
  { id: "almacenes", name: "Almacenes", icon: Warehouse },
  { id: "proveedores", name: "Proveedores", icon: Truck },
  { id: "categorias", name: "Categorías", icon: FolderTree },
  { id: "marcas", name: "Marcas", icon: Stamp },
  { id: "modelos", name: "Modelos", icon: Package },
  { id: "metodos-pago", name: "Métodos de pago", icon: CreditCard },
  { id: "tipos-movimiento", name: "Tipos de movimiento", icon: ArrowRightLeft },
  { id: "unidades-medida", name: "Unidades de medida", icon: Ruler },
  { id: "cajas", name: "Cajas", icon: Wallet },
] as const;

export const settingsSectionsList = [
  ...quickSettingsSectionsList,
  ...configurationSectionsList,
] as const;

export type QuickSettingsSectionId =
  (typeof quickSettingsSectionsList)[number]["id"];
export type ConfigurationSectionId =
  (typeof configurationSectionsList)[number]["id"];
export type SectionId = (typeof settingsSectionsList)[number]["id"];
