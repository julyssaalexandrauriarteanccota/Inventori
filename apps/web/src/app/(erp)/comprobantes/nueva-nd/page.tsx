import { NuevaNotaDebitoClient } from "./nueva-nota-debito-client";

interface PageProps {
  searchParams: Promise<{
    origen?: string;
    motivo?: string;
  }>;
}

export default async function NuevaNotaDebitoPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <NuevaNotaDebitoClient
      origenId={params.origen}
      motivoCodigo={params.motivo ?? "03"}
    />
  );
}
