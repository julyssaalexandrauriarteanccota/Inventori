import { describe, expect, it } from "vitest";

import { getPrimaryProductImage, getProductImageCandidates } from "./product-images";

describe("product image helpers", () => {
  it("prioriza la imagen marcada como principal", () => {
    expect(
      getPrimaryProductImage({
        imagen: "/uploads/public/legacy.jpg",
        imagenes: [
          { url: "/uploads/public/second.jpg", esPrincipal: false, orden: 2 },
          { url: "/uploads/public/main.jpg", esPrincipal: true, orden: 9 },
        ],
      }),
    ).toBe("/uploads/public/main.jpg");
  });

  it("usa la primera imagen ordenada cuando no hay principal", () => {
    expect(
      getPrimaryProductImage({
        imagenes: [
          { url: "/uploads/public/two.jpg", orden: 2 },
          { url: "/uploads/public/one.jpg", orden: 1 },
        ],
      }),
    ).toBe("/uploads/public/one.jpg");
  });

  it("deduplica candidatos y deja imagen legacy como respaldo", () => {
    expect(
      getProductImageCandidates({
        imagen: "/uploads/public/main.jpg",
        imagenes: [
          { url: "/uploads/public/main.jpg", esPrincipal: true, orden: 1 },
          { url: "/uploads/public/backup.jpg", orden: 2 },
        ],
      }),
    ).toEqual(["/uploads/public/main.jpg", "/uploads/public/backup.jpg"]);
  });
});
