/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

import { getApiAssetUrl } from "@/lib/api";
import type { PublicBranding } from "@/lib/public-branding";
import { cn } from "@/lib/utils";

export function PublicBrandLink({
  branding,
  className,
}: {
  branding: PublicBranding;
  className?: string;
}) {
  const logo = branding.assets.logo
    ? getApiAssetUrl(branding.assets.logo)
    : null;
  const logoDark = branding.assets.logoDark
    ? getApiAssetUrl(branding.assets.logoDark)
    : null;
  const hasDarkVariant = Boolean(logo && logoDark && logoDark !== logo);

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-foreground",
        className,
      )}
      aria-label={`${branding.identity.displayName} - Inicio`}
    >
      {logo ? (
        <>
          <img
            src={logo}
            alt={branding.identity.displayName}
            className={cn(
              "h-8 max-w-40 object-contain object-left",
              hasDarkVariant && "dark:hidden",
            )}
            referrerPolicy="no-referrer"
          />
          {hasDarkVariant ? (
            <img
              src={logoDark ?? logo}
              alt={branding.identity.displayName}
              className="hidden h-8 max-w-40 object-contain object-left dark:block"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <span className="truncate text-base font-semibold sm:text-lg">
            {branding.identity.displayName}
          </span>
        </>
      ) : (
        <span className="truncate">{branding.identity.displayName}</span>
      )}
    </Link>
  );
}
