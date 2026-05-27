"use client";

import * as React from "react";
import { Check, X, Shield } from "lucide-react";
import { RolUsuario } from "@erp/shared";

import {
  ERP_NAVIGATION,
  hasRouteAccess,
  type ErpNavigationItem,
} from "@/lib/erp-navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROL_LABEL: Record<RolUsuario, string> = {
  [RolUsuario.ADMIN]: "Administrador",
  [RolUsuario.ENCARGADO]: "Encargado",
  [RolUsuario.TECNICO]: "Técnico",
};

const ROL_DESCRIPTION: Record<RolUsuario, string> = {
  [RolUsuario.ADMIN]:
    "Acceso completo a todos los módulos, configuración y auditoría del sistema.",
  [RolUsuario.ENCARGADO]:
    "Gestión operativa: ventas, inventario, compras, equipos y reportes.",
  [RolUsuario.TECNICO]:
    "Acceso a soporte técnico, clientes, servicios y garantías.",
};

function countAccessibleModules(rol: RolUsuario): {
  accessible: number;
  total: number;
} {
  const total = ERP_NAVIGATION.length;
  const accessible = ERP_NAVIGATION.filter((item) =>
    hasRouteAccess(item, rol),
  ).length;
  return { accessible, total };
}

/* ── Compact: for forms (select preview) ── */

export function RoleAccessCompact({ rol }: { rol: RolUsuario }) {
  const { accessible, total } = countAccessibleModules(rol);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Shield className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {ROL_LABEL[rol]}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {ROL_DESCRIPTION[rol]}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {accessible}/{total} módulos
        </Badge>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {ERP_NAVIGATION.map((item) => {
          const allowed = hasRouteAccess(item, rol);
          return (
            <Badge
              key={item.url}
              variant={allowed ? "default" : "outline"}
              className={cn(
                "gap-1 text-[10px] transition-opacity",
                !allowed && "opacity-40",
              )}
            >
              {allowed ? (
                <Check className="size-2.5" />
              ) : (
                <X className="size-2.5" />
              )}
              {item.title}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

/* ── Full: for detail view ── */

function ModuleAccessRow({
  item,
  rol,
}: {
  item: ErpNavigationItem;
  rol: RolUsuario;
}) {
  const allowed = hasRouteAccess(item, rol);
  const Icon = item.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
        allowed
          ? "bg-emerald-500/5 dark:bg-emerald-500/10"
          : "bg-muted/30 opacity-50",
      )}
    >
      {Icon ? (
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            allowed
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            allowed ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {item.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {item.description}
        </p>
      </div>
      {allowed ? (
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5" />
        </div>
      ) : (
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <X className="size-3.5" />
        </div>
      )}
    </div>
  );
}

export function RoleAccessFull({ rol }: { rol: RolUsuario }) {
  const { accessible, total } = countAccessibleModules(rol);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Accesos por rol
          </h4>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {accessible} de {total} módulos
        </Badge>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/10 p-2">
        <div className="flex items-center gap-2 px-2 pb-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {ROL_LABEL[rol]}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {ROL_DESCRIPTION[rol]}
            </p>
          </div>
        </div>

        <div className="grid gap-1">
          {ERP_NAVIGATION.map((item) => (
            <ModuleAccessRow key={item.url} item={item} rol={rol} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Badge count helper ── */

export function RoleModuleCountBadge({ rol }: { rol: RolUsuario }) {
  const { accessible, total } = countAccessibleModules(rol);
  return (
    <Badge variant="outline" className="gap-1 text-[10px]">
      {accessible}/{total}
    </Badge>
  );
}
