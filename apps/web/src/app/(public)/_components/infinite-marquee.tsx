"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { IvIcon } from "@/components/iv";
import type { IvIconName } from "@/components/iv";

export type MarqueeItem = {
  num: string;
  icon: IvIconName;
  title: string;
  body: string;
  href: string;
};

type Props = {
  items: MarqueeItem[];
  /** Speed in pixels per second (default 40) */
  speed?: number;
};

/**
 * Infinite horizontal marquee with gradient-masked edges.
 * Cards scroll continuously left-to-right, pause on hover,
 * and resume smoothly. Uses pure CSS translate + requestAnimationFrame
 * for buttery 60fps.
 */
export function InfiniteMarquee({ items, speed = 40 }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  const assignRef = useCallback((el: HTMLDivElement | null) => {
    trackRef.current = el;
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Observe visibility so we don't waste cycles offscreen
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    io.observe(track);

    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !isVisible) return;

    // Half-width is the point where we seamlessly loop
    const halfWidth = track.scrollWidth / 2;

    function tick(now: number) {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (!pausedRef.current) {
        offsetRef.current += speed * dt;
        if (offsetRef.current >= halfWidth) {
          offsetRef.current -= halfWidth;
        }
        track!.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isVisible, speed]);

  const onEnter = () => {
    pausedRef.current = true;
  };
  const onLeave = () => {
    pausedRef.current = false;
    lastTimeRef.current = 0; // Reset dt so it doesn't jump
  };

  // Duplicate for seamless loop
  const allCards = [...items, ...items];

  return (
    <div
      className="iv-marquee-wrap"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="iv-marquee-track" ref={assignRef}>
        {allCards.map((item, i) => (
          <Link
            key={`${item.num}-${i}`}
            href={item.href}
            className="iv-marquee-card"
            aria-hidden={i >= items.length ? true : undefined}
            tabIndex={i >= items.length ? -1 : undefined}
          >
            <span className="iv-marquee-tag">
              {item.num}
            </span>
            <span className="iv-marquee-icon">
              <IvIcon name={item.icon} size={32} stroke={1.4} />
            </span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <span className="iv-arrow">
              EXPLORAR
              <IvIcon name="arrow" size={14} stroke={2.2} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
