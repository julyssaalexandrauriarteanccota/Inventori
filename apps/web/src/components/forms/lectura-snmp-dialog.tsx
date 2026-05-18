"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, Loader2, RadioTower } from "lucide-react";
import { toast } from "sonner";

import { lecturaSNMPSchema, type LecturaSNMPPayload } from "@erp/shared";

import {
  useRegistrarLecturaSNMP,
  useSyncLecturaSNMP,
} from "@/hooks/use-equipos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

interface FormValues extends LecturaSNMPPayload {
  erroresActivosTexto?: string;
  [key: string]: unknown;
}

interface LecturaSnmpDialogProps {
  serie: string;
  hasIp: boolean;
  trigger?: React.ReactNode;
}

export function LecturaSnmpDialog({
  serie,
  hasIp,
  trigger,
}: LecturaSnmpDialogProps) {
  const [open, setOpen] = useState(false);
  const registrar = useRegistrarLecturaSNMP(serie);
  const sync = useSyncLecturaSNMP(serie);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      lecturaSNMPSchema.passthrough(),
    ) as unknown as Resolver<FormValues>,
    defaultValues: {},
  });

  const onSubmit = handleSubmit(async (values) => {
    const erroresActivos = (values.erroresActivosTexto ?? "")
      .split("\n")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const payload: LecturaSNMPPayload = {
      paginasTotales: values.paginasTotales,
      nivelTonerNegro: values.nivelTonerNegro,
      nivelTonerCian: values.nivelTonerCian,
      nivelTonerMagenta: values.nivelTonerMagenta,
      nivelTonerAmarillo: values.nivelTonerAmarillo,
      estadoFusor: values.estadoFusor || undefined,
      erroresActivos:
        erroresActivos && erroresActivos.length > 0 ? erroresActivos : undefined,
    };
    try {
      await registrar.mutateAsync(payload);
      toast.success("Lectura SNMP registrada");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al registrar lectura",
      );
    }
  });

  const onSync = async () => {
    try {
      await sync.mutateAsync();
      toast.success("Lectura SNMP capturada del equipo");
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudo capturar la lectura SNMP",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Activity className="size-3.5" />
            Registrar lectura
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lectura SNMP</DialogTitle>
          <DialogDescription>
            Captura automática desde el equipo o registro manual.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <Button
            type="button"
            variant="default"
            className="w-full gap-1.5"
            disabled={!hasIp || sync.isPending}
            onClick={onSync}
          >
            {sync.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RadioTower className="size-3.5" />
            )}
            {hasIp ? "Capturar ahora desde el equipo (SNMP)" : "Sin IP configurada"}
          </Button>
          {!hasIp && (
            <p className="mt-2 text-xs text-muted-foreground">
              Configura la IP del equipo en su edición para habilitar la captura
              automática.
            </p>
          )}
        </div>

        <div className="relative my-2 text-center text-xs uppercase tracking-wider text-muted-foreground">
          <span className="bg-background px-2">o ingresa manualmente</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGroup className="grid grid-cols-2 gap-3">
            <Field data-invalid={errors.paginasTotales ? true : undefined}>
              <FieldLabel>Páginas totales</FieldLabel>
              <Input
                type="number"
                min={0}
                {...register("paginasTotales", { valueAsNumber: true })}
              />
              <FieldError>{errors.paginasTotales?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Estado fusor</FieldLabel>
              <Input {...register("estadoFusor")} placeholder="OK / Atención" />
            </Field>
            <Field data-invalid={errors.nivelTonerNegro ? true : undefined}>
              <FieldLabel>Tóner negro (%)</FieldLabel>
              <Input
                type="number"
                min={0}
                max={100}
                {...register("nivelTonerNegro", { valueAsNumber: true })}
              />
              <FieldError>{errors.nivelTonerNegro?.message}</FieldError>
            </Field>
            <Field data-invalid={errors.nivelTonerCian ? true : undefined}>
              <FieldLabel>Tóner cian (%)</FieldLabel>
              <Input
                type="number"
                min={0}
                max={100}
                {...register("nivelTonerCian", { valueAsNumber: true })}
              />
              <FieldError>{errors.nivelTonerCian?.message}</FieldError>
            </Field>
            <Field data-invalid={errors.nivelTonerMagenta ? true : undefined}>
              <FieldLabel>Tóner magenta (%)</FieldLabel>
              <Input
                type="number"
                min={0}
                max={100}
                {...register("nivelTonerMagenta", { valueAsNumber: true })}
              />
              <FieldError>{errors.nivelTonerMagenta?.message}</FieldError>
            </Field>
            <Field data-invalid={errors.nivelTonerAmarillo ? true : undefined}>
              <FieldLabel>Tóner amarillo (%)</FieldLabel>
              <Input
                type="number"
                min={0}
                max={100}
                {...register("nivelTonerAmarillo", { valueAsNumber: true })}
              />
              <FieldError>{errors.nivelTonerAmarillo?.message}</FieldError>
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel>Errores activos</FieldLabel>
            <Textarea
              rows={3}
              placeholder="Un error por línea"
              {...register("erroresActivosTexto")}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={registrar.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={registrar.isPending}>
              {registrar.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : null}
              Guardar lectura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
