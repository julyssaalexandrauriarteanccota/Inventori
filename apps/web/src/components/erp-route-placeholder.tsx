import { RolUsuario } from "@erp/shared"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getRoleLabel } from "@/lib/erp-navigation"

type ErpRoutePlaceholderProps = {
  title: string
  description: string
  path: string
  roles: RolUsuario[]
}

export function ErpRoutePlaceholder({
  title,
  description,
  path,
  roles,
}: ErpRoutePlaceholderProps) {
  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
          <CardDescription className="text-base leading-7">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Ruta
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{path}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4 md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Roles habilitados
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {roles.map((rol) => (
                <span
                  key={rol}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
                >
                  {getRoleLabel(rol)}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed border-border/80 bg-card/70">
        <CardHeader>
          <CardTitle className="text-lg">Base del modulo lista</CardTitle>
          <CardDescription className="leading-7">
            Esta pantalla ya existe para que el shell ERP no rompa navegacion y
            para que otros sprints implementen aqui la logica real del modulo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <p>
            La ruta esta registrada, el acceso por rol ya se valida desde el
            layout del ERP y el modulo puede evolucionar sin volver a caer en
            enlaces rotos o permisos inconsistentes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
