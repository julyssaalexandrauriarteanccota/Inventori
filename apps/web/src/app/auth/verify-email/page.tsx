"use client";

import { Suspense } from "react";

import { AuthProvider } from "@/components/auth-context";
import { AuthLegalFooter } from "@/components/auth-legal-footer";
import { VerifyEmailForm } from "@/components/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <AuthProvider>
      <div className="flex min-h-svh flex-col items-center justify-center p-4 pt-12 sm:p-6 md:p-10 bg-background text-foreground">
        <div className="flex w-full max-w-5xl flex-col gap-6">
          <Suspense fallback={null}>
            <VerifyEmailForm />
          </Suspense>
          <AuthLegalFooter />
        </div>
      </div>
    </AuthProvider>
  );
}
