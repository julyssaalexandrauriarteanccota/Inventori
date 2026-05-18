'use client'

import { useEffect } from 'react'
import L, { type DragEndEvent } from 'leaflet'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import { cn } from '@/lib/utils'

export type LocationCoordinates = {
  latitud: number
  longitud: number
}

export interface LocationMapCanvasProps {
  marker?: LocationCoordinates | null
  interactive?: boolean
  onSelect?: (coordinates: LocationCoordinates) => void
  className?: string
  zoom?: number
}

const DEFAULT_CENTER: LocationCoordinates = {
  latitud: -15.8402,
  longitud: -70.0219,
}

const markerIcon = L.divIcon({
  className: 'erp-location-marker',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;transform:translate(-50%,-100%);">
      <span style="display:block;width:18px;height:18px;border-radius:9999px;background:#c76f2b;border:3px solid #ffffff;box-shadow:0 6px 18px rgba(0,0,0,.25);"></span>
    </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
})

function MapViewport({
  marker,
  zoom,
}: {
  marker?: LocationCoordinates | null
  zoom: number
}) {
  const map = useMap()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize()

      if (marker) {
        map.flyTo([marker.latitud, marker.longitud], zoom, {
          animate: false,
        })
        map.setZoom(zoom)
      }

      window.setTimeout(() => {
        map.invalidateSize()
        if (marker) {
          map.setView([marker.latitud, marker.longitud], zoom, {
            animate: false,
          })
        }
      }, 80)
    }, 120)

    return () => window.clearTimeout(timeoutId)
  }, [map, marker, zoom])

  return null
}

function MapSelectionEvents({
  interactive,
  onSelect,
}: {
  interactive: boolean
  onSelect?: (coordinates: LocationCoordinates) => void
}) {
  useMapEvents({
    click(event) {
      if (!interactive || !onSelect) {
        return
      }

      onSelect({
        latitud: event.latlng.lat,
        longitud: event.latlng.lng,
      })
    },
  })

  return null
}

export function LocationMapCanvas({
  marker,
  interactive = false,
  onSelect,
  className,
  zoom = 16,
}: LocationMapCanvasProps) {
  const center = marker ?? DEFAULT_CENTER
  const mapKey = marker
    ? `${marker.latitud.toFixed(6)}-${marker.longitud.toFixed(6)}`
    : 'location-map-default'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/70 bg-muted/20',
        className,
      )}
    >
      <MapContainer
        key={mapKey}
        center={[center.latitud, center.longitud]}
        zoom={marker ? zoom : 13}
        scrollWheelZoom={interactive}
        dragging
        doubleClickZoom={interactive}
        zoomControl={interactive}
        attributionControl
        className="h-full min-h-[280px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport marker={marker} zoom={zoom} />
        <MapSelectionEvents interactive={interactive} onSelect={onSelect} />
        {marker ? (
          <Marker
            position={[marker.latitud, marker.longitud]}
            draggable={interactive}
            icon={markerIcon}
            eventHandlers={
              interactive && onSelect
                ? {
                    dragend: (event) => {
                      const nextPosition = (event as DragEndEvent).target.getLatLng()
                      onSelect({
                        latitud: nextPosition.lat,
                        longitud: nextPosition.lng,
                      })
                    },
                  }
                : undefined
            }
          />
        ) : null}
      </MapContainer>
    </div>
  )
}
