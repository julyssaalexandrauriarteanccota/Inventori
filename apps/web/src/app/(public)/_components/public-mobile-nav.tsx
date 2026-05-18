"use client";

import { useState } from "react";
import Link from "next/link";

import { IvIcon } from "@/components/iv";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = { href: string; label: string };

export function PublicMobileNav({ links }: { links: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <span className="inline-flex md:hidden">
        <SheetTrigger asChild>
          <button
            className="iv-icon-btn"
            aria-label="Abrir menú"
          >
            <IvIcon name="menu" size={18} />
          </button>
        </SheetTrigger>
      </span>
      <SheetContent
        side="right"
        className="iv w-72 border-l p-0"
        style={{
          background: "var(--bg)",
          color: "var(--ink)",
          borderColor: "var(--line)",
        }}
      >
        <SheetTitle
          className="px-6 pt-6"
          style={{
            fontFamily: "var(--iv-font-display)",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--ink)",
          }}
        >
          Menú
        </SheetTitle>
        <nav className="flex flex-col gap-1 px-3 pt-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              {link.label}
            </Link>
          ))}
          <div
            className="mx-3 mt-4 border-t pt-4"
            style={{ borderColor: "var(--line)" }}
          >
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="iv-btn iv-btn-accent w-full"
              style={{ justifyContent: "center" }}
            >
              Iniciar sesión
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
