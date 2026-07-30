import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './GoogleMap.css'
import { PinIcon, EditIcon } from './icons'
import type { MapProps } from './GoogleMap'

/**
 * Leaflet + OpenStreetMap alternative to GoogleMap, with the same props so it's
 * a drop-in swap. Like GoogleMap it uses a fixed centre pin (the map pans
 * beneath it) so no marker is needed. OSM raster tiles carry no clickable
 * features, so `onPoiSelect` isn't supported; tap-to-place, drag, zoom and edit
 * all work.
 */
export function LeafletMap({
  variant,
  coordinates,
  interactive = false,
  onCoordinatesChange,
  onEdit,
  onMapClick,
}: MapProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Keep the latest handlers in refs so the once-bound listeners aren't stale.
  const onCoordinatesChangeRef = useRef(onCoordinatesChange)
  onCoordinatesChangeRef.current = onCoordinatesChange
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick

  // Initialise the map once.
  useEffect(() => {
    if (!canvasRef.current) return
    const map = L.map(canvasRef.current, {
      center: [coordinates.lat, coordinates.lng],
      zoom: 16,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      touchZoom: interactive,
      keyboard: interactive,
      attributionControl: true,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    // Leaflet needs a size recalculation once the container has laid out.
    setTimeout(() => map.invalidateSize(), 0)

    if (interactive) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      map.on('moveend', () => {
        const c = map.getCenter()
        onCoordinatesChangeRef.current?.({ lat: c.lat, lng: c.lng })
      })
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (!onMapClickRef.current) return
        map.setView(e.latlng, map.getZoom(), { animate: !reduceMotion })
        onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
      })
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-centre when the coordinates prop changes from outside (search, etc.),
  // skipping when the map is already there so we don't fight a user drag.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const c = map.getCenter()
    if (Math.abs(c.lat - coordinates.lat) < 1e-6 && Math.abs(c.lng - coordinates.lng) < 1e-6) {
      return
    }
    map.setView([coordinates.lat, coordinates.lng], map.getZoom(), { animate: false })
  }, [coordinates])

  return (
    <div className={`gmap ${variant}`}>
      <div ref={canvasRef} className="gmap-canvas" aria-label="Venue location map (OpenStreetMap)" />
      <div className="gmap-pin">
        <PinIcon size={variant === 'full' ? 42 : 34} />
      </div>
      {variant === 'preview' && onEdit && (
        <button type="button" className="gmap-edit-button" onClick={onEdit}>
          <EditIcon />
          Edit map location
        </button>
      )}
    </div>
  )
}
