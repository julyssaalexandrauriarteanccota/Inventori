export type ProductImageEntry = {
  url?: string | null;
  esPrincipal?: boolean | null;
  orden?: number | null;
};

export type ProductImageSource = {
  imagen?: string | null;
  imagenes?: readonly ProductImageEntry[] | null;
};

function cleanImageUrl(url?: string | null) {
  const normalized = url?.trim();
  return normalized ? normalized : null;
}

function pushUnique(target: string[], value?: string | null) {
  const normalized = cleanImageUrl(value);
  if (normalized && !target.includes(normalized)) {
    target.push(normalized);
  }
}

function orderedImages(source: ProductImageSource) {
  return (source.imagenes ?? [])
    .map((image, index) => ({
      ...image,
      index,
      url: cleanImageUrl(image.url),
    }))
    .filter((image) => image.url)
    .sort((a, b) => {
      if (a.esPrincipal !== b.esPrincipal) {
        return a.esPrincipal ? -1 : 1;
      }
      return (a.orden ?? a.index) - (b.orden ?? b.index);
    });
}

export function getProductImageCandidates(
  ...sources: Array<ProductImageSource | null | undefined>
) {
  const candidates: string[] = [];

  for (const source of sources) {
    if (!source) continue;

    for (const image of orderedImages(source)) {
      pushUnique(candidates, image.url);
    }

    pushUnique(candidates, source.imagen);
  }

  return candidates;
}

export function getPrimaryProductImage(
  ...sources: Array<ProductImageSource | null | undefined>
) {
  return getProductImageCandidates(...sources)[0] ?? null;
}
