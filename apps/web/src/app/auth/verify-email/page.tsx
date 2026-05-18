"use client";

import { Suspense } from "react";

import { AuthProvider } from "@/components/auth-context";
import { AuthLegalFooter } from "@/components/auth-legal-footer";
import { VerifyEmailForm } from "@/components/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <AuthProvider>
      <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
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
