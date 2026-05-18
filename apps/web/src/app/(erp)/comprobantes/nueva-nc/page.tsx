import { NuevaNotaCreditoClient } from "./nueva-nota-credito-client";

interface PageProps {
  searchParams: Promise<{
    origen?: string;
    motivo?: string;
    excepcional?: string;
    anula?: string;
  }>;
}

export default async function NuevaNotaCreditoPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <NuevaNotaCreditoClient
      origenId={params.origen}
      motivoCodigo={params.motivo ?? "01"}
      esExcepcionalInicial={params.excepcional === "1"}
      anulaTotalmenteInicial={params.anula === "1"}
    />
  );
}
