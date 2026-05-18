"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { AuthSidePanel } from "@/components/auth-side-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

type VerifyResponse = {
  data?: {
    message: string;
    alreadyVerified: boolean;
  };
};

type ResendResponse = {
  data?: { message: string };
};

const COOLDOWN_SECONDS = 60;

export function VerifyEmailForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState<{ message: string } | null>(null);

  // Si llegan sin email en query → vuelve a login
  useEffect(() => {
    if (!email) router.replace("/auth/login");
  }, [email, router]);

  // Cooldown del botón "Reenviar"
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  // Auto-submit cuando se completan los 6 dígitos
  useEffect(() => {
    if (codigo.length === 6 && !submitting && !success) {
      void onSubmit(codigo);
    }
  }, [codigo, submitting, success]);

  async function onSubmit(code: string) {
    if (!email || code.length !== 6) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<VerifyResponse>(
        "/auth/verify-email",
        { email, codigo: code },
        { skipAuth: true },
      );
      const message =
        res.data?.message ?? "Correo verificado correctamente.";
      setSuccess({ message });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Error de conexión al servidor.";
      setError(msg);
      setCodigo("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending || !email) return;
    setResending(true);
    setError(null);
    try {
      await api.post<ResendResponse>(
        "/auth/resend-email-otp",
        { email },
        { skipAuth: true },
      );
      setResendCooldown(COOLDOWN_SECONDS);
      setCodigo("");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Error de conexión al servidor.";
      setError(msg);
    } finally {
      setResending(false);
    }
  }

  if (success) {
    return (
      <div className={cn("flex w-full flex-col", className)} {...props}>
        <Card className="rounded-2xl border-border/70 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
          <CardContent className="flex flex-col items-center gap-4 px-8 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                Correo verificado
              </h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                {success.message}
              </p>
            </div>
            <Link href="/auth/login">
              <Button variant="outline" className="mt-2 rounded-xl">
                Volver al inicio de sesión
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col", className)} {...props}>
      <Card className="overflow-hidden rounded-2xl border-border/70 py-0 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
        <CardContent className="grid p-0 md:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex items-center justify-center p-6 md:p-9">
            <div className="w-full max-w-[380px]">
              <CardHeader className="px-0 pb-0">
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  Confirma tu correo
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Te enviamos un código de 6 dígitos a{" "}
                  <strong className="text-foreground">{email}</strong>.
                  Ingrésalo aquí para confirmar tu correo.
                </CardDescription>
              </CardHeader>

              <div className="mt-8 space-y-5">
                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div className="flex flex-col items-center gap-3">
                  <InputOTP
                    maxLength={6}
                    value={codigo}
                    onChange={(v) => setCodigo(v)}
                    disabled={submitting}
                    containerClassName="gap-3"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-xs text-muted-foreground">
                    El código vence en 15 minutos.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => void onSubmit(codigo)}
                  disabled={codigo.length !== 6 || submitting}
                  className="h-11 w-full rounded-xl text-sm font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Verificando…
                    </>
                  ) : (
                    "Verificar correo"
                  )}
                </Button>

                <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    disabled={resending || resendCooldown > 0}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition",
                      resendCooldown > 0
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {resending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3" />
                    )}
                    {resendCooldown > 0
                      ? `Reenviar en ${resendCooldown}s`
                      : "Reenviar código"}
                  </button>
                  <Link
                    href="/auth/login"
                    className="hover:text-foreground hover:underline"
                  >
                    Volver al inicio
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <AuthSidePanel
            title="Verificación segura"
            description="Confirmar tu correo nos asegura que podemos contactarte y protege la cuenta frente a accesos no autorizados."
          />
        </CardContent>
      </Card>
    </div>
  );
}
