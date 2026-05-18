'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

import type { LocationMapCanvasProps } from './location-map-canvas'

export type { LocationCoordinates } from './location-map-canvas'

const LazyLocationMap = dynamic(
  () => import('./location-map-canvas').then((mod) => mod.LocationMapCanvas),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[280px] w-full rounded-2xl border border-border/70" />
    ),
  },
)

export function LocationMap(props: LocationMapCanvasProps) {
  return <LazyLocationMap {...props} />
}
