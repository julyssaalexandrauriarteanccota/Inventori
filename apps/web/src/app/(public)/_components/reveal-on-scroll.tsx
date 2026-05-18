"use client";

import { useCallback, useEffect, useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function RevealOnScroll({ children, className }: Props) {
  const ref = useRef<HTMLElement | null>(null);

  const observe = useCallback((el: HTMLElement | null) => {
    ref.current = el;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("iv-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("iv-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={observe}
      className={["iv-reveal", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
