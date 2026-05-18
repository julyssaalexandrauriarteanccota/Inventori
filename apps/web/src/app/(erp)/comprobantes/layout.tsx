import { PageHeader } from "@/components/layout/page-header";

export default function ComprobantesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Comprobantes"
        description="Hub central de boletas, facturas, notas y comunicaciones de baja SUNAT."
      />
      <div>{children}</div>
    </div>
  );
}
