import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Preview · Diseño nuevo",
  description: "Preview aislado del diseño de Claude Design para Inventori.",
  robots: { index: false, follow: false },
};

const PREVIEW_URL = "/design-preview/index.html";

export default function PreviewDesignPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="rounded-lg">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Volver al sitio
            </Link>
          </Button>
          <div className="hidden text-xs text-muted-foreground sm:block">
            Preview aislado · no afecta producción ·{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              public/design-preview/
            </code>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-lg">
          <a href={PREVIEW_URL} target="_blank" rel="noreferrer">
            Abrir en pestaña nueva
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
      <iframe
        src={PREVIEW_URL}
        title="Inventori · Preview de diseño"
        className="flex-1 w-full border-0"
      />
    </div>
  );
}
