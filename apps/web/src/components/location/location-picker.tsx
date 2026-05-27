"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ClipboardPaste,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  X,
} from "lucide-react";
import type { LocationPayload, LocationSearchResult } from "@erp/shared";

import {
  useBuscarUbicaciones,
  useUbicacionReversa,
} from "@/hooks/use-ubicaciones";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationMap } from "./location-map";

interface LocationPickerProps {
  value: LocationPayload;
  onChange: (patch: Partial<LocationPayload>) => void;
  disabled?: boolean;
  autoApplyReverse?: boolean;
}

function tryParseCoordinates(rawValue: string) {
  const normalized = rawValue.trim().replace(/[()]/g, "");
  const match = normalized.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/,
  );

  if (!match) {
    return null;
  }

  const latitud = Number(match[1]);
  const longitud = Number(match[2]);

  if (
    Number.isNaN(latitud) ||
    Number.isNaN(longitud) ||
    latitud < -90 ||
    latitud > 90 ||
    longitud < -180 ||
    longitud > 180
  ) {
    return null;
  }

  return { latitud, longitud };
}

export function LocationPicker({
  value,
  onChange,
  disabled = false,
  autoApplyReverse = false,
}: LocationPickerProps) {
  const buscarMutation = useBuscarUbicaciones();
  const reverseMutation = useUbicacionReversa();
  const currentDireccion = value.direccion ?? "";
  const [searchText, setSearchText] = useState(currentDireccion);
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  const [reverseSuggestion, setReverseSuggestion] =
    useState<LocationSearchResult | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitud: number; longitud: number } | null>(null);
  const activeSearchText = isEditingSearch ? searchText : currentDireccion;
  const canPasteFromClipboard =
    typeof navigator !== "undefined" && Boolean(navigator.clipboard?.readText);

  const marker = useMemo(() => {
    if (value.latitud == null || value.longitud == null) {
      return null;
    }

    return {
      latitud: value.latitud,
      longitud: value.longitud,
    };
  }, [value.latitud, value.longitud]);

  const searchResults = buscarMutation.data?.data ?? [];

  function applyResult(result: LocationSearchResult) {
    onChange({
      direccion: result.direccion,
      latitud: result.latitud,
      longitud: result.longitud,
      departamento: result.departamento ?? "",
      provincia: result.provincia ?? "",
      distrito: result.distrito ?? "",
    });
    setSearchText(result.direccion);
    setIsEditingSearch(false);
    setReverseSuggestion(null);
    setMapCenter(null);
    buscarMutation.reset();
  }

  function handleCoordinatePick(coordinates: {
    latitud: number;
    longitud: number;
  }) {
    onChange(coordinates);
    setReverseSuggestion(null);
    setMapCenter(null);

    reverseMutation.mutate(coordinates, {
      onSuccess: (response) => {
        if (autoApplyReverse) {
          applyResult(response.data);
          return;
        }

        setReverseSuggestion(response.data);
      },
    });
  }

  async function handlePasteFromClipboard() {
    if (disabled || !canPasteFromClipboard) {
      return;
    }

    const clipboardText = await navigator.clipboard.readText();
    const nextText = clipboardText.trim();
    if (!nextText) {
      return;
    }

    setSearchText(nextText);
    setIsEditingSearch(true);

    const coordinates = tryParseCoordinates(nextText);
    if (coordinates) {
      handleCoordinatePick(coordinates);
    }
  }

  function handleSearch() {
    const query = activeSearchText.trim();

    if (query.length < 3) {
      return;
    }

    const coordinates = tryParseCoordinates(query);
    if (coordinates) {
      handleCoordinatePick(coordinates);
      return;
    }

    buscarMutation.mutate({ q: query, limit: 5 }, {
      onSuccess: (response) => {
        const results = response.data ?? [];
        if (results.length > 0) {
          setMapCenter({
            latitud: results[0].latitud,
            longitud: results[0].longitud,
          });
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Buscar dirección o pegar coordenadas
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={activeSearchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setIsEditingSearch(true);
              }}
              placeholder="Av. Ejemplo 123 o -15.840221, -70.021881"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 gap-2 sm:w-auto"
              onClick={() => void handlePasteFromClipboard()}
              disabled={disabled || !canPasteFromClipboard}
            >
              <ClipboardPaste className="size-4" />
              Pegar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 gap-2 sm:w-auto"
              onClick={handleSearch}
              disabled={
                disabled ||
                activeSearchText.trim().length < 3 ||
                buscarMutation.isPending
              }
            >
              {buscarMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Buscar
            </Button>
          </div>
        </div>
        {marker ? (
          <div className="sm:min-w-55">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start gap-2 sm:justify-center"
              onClick={() => {
                setReverseSuggestion(null);
                setMapCenter(null);
                onChange({ latitud: null, longitud: null });
              }}
              disabled={disabled}
            >
              <X className="size-4" />
              Quitar punto del mapa
            </Button>
          </div>
        ) : null}
      </div>

      {searchResults.length > 0 ? (
        <div className="grid gap-2">
          {searchResults.map((result) => (
            <button
              key={`${result.latitud}-${result.longitud}-${result.direccion}`}
              type="button"
              className={cn(
                "rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left transition-colors",
                "hover:border-orange-300 hover:bg-orange-50/60 dark:hover:bg-orange-950/20",
              )}
              onClick={() => applyResult(result)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-orange-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {result.direccion}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.departamento ?? "Sin departamento"} ·{" "}
                    {result.provincia ?? "Sin provincia"} ·{" "}
                    {result.distrito ?? "Sin distrito"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {buscarMutation.isError ? (
        <p className="text-xs text-destructive">
          {buscarMutation.error instanceof Error
            ? buscarMutation.error.message
            : "No se pudo buscar la ubicacion en este momento."}
        </p>
      ) : null}

      {reverseSuggestion ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <LocateFixed className="size-3.5 text-primary" />
                Dirección detectada para el punto
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {reverseSuggestion.direccion}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {[
                  reverseSuggestion.distrito,
                  reverseSuggestion.provincia,
                  reverseSuggestion.departamento,
                ]
                  .filter(Boolean)
                  .join(" / ") || "Sin ubigeo administrativo detectado"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setReverseSuggestion(null)}
                disabled={disabled}
              >
                Solo punto
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-lg"
                onClick={() => applyResult(reverseSuggestion)}
                disabled={disabled}
              >
                <Check className="size-3.5" />
                Usar datos
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <LocationMap
        marker={marker}
        center={mapCenter}
        interactive={!disabled}
        onSelect={handleCoordinatePick}
        className="h-80"
      />
      {reverseMutation.isPending ? (
        <p className="text-xs text-muted-foreground">
          Buscando una dirección sugerida para el punto seleccionado...
        </p>
      ) : reverseMutation.isError ? (
        <p className="text-xs text-destructive">
          {reverseMutation.error instanceof Error
            ? reverseMutation.error.message
            : "No se pudo resolver la direccion del punto seleccionado."}
        </p>
      ) : null}
    </div>
  );
}
