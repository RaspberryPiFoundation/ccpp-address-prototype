import { useEffect, useRef, useState } from 'react'
import './GoogleMap.css'
import { PinIcon, EditIcon, ErrorIcon } from './icons'
import { loadGoogleMaps } from '../lib/googleMaps'

export interface Coordinates {
  lat: number
  lng: number
}

// Tune which points of interest show, so venues relevant to a Code Club stand
// out. Google groups POIs into a fixed set of categories. We keep the civic ones
// (schools, places of worship, parks, and "government" — which covers libraries,
// community centres and town halls) at full prominence, and show the rest
// "simplified" so they still appear but yield to the civic venues when labels
// collide in busy areas.
const POI_MAP_STYLES: google.maps.MapTypeStyle[] = [
  // Priority venues — full prominence.
  { featureType: 'poi.school', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  // Everything else — still shown, but de-emphasised.
  { featureType: 'poi.business', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'simplified' }] },
]

/** Shared props for the map components (GoogleMap and LeafletMap). */
export interface MapProps {
  variant: 'preview' | 'full'
  coordinates: Coordinates
  interactive?: boolean
  /** Fires (debounced on idle) as the map centre changes when interactive. */
  onCoordinatesChange?: (c: Coordinates) => void
  onEdit?: () => void
  /** Reports load failure so parents can fall back to the manual form. */
  onLoadError?: () => void
  /** When set, points of interest become clickable and report their place ID. */
  onPoiSelect?: (placeId: string) => void
  /** Fires when the user taps anywhere on the map (not a POI), with the point. */
  onMapClick?: (c: Coordinates) => void
}

type Status = 'loading' | 'ready' | 'no-key' | 'error'

/**
 * Real Google Maps view with a fixed centre pin. The map pans beneath the pin,
 * so the pin always marks the map centre — matching the design's
 * "drag the map to move the pin" interaction.
 */
export function GoogleMap({
  variant,
  coordinates,
  interactive = false,
  onCoordinatesChange,
  onEdit,
  onLoadError,
  onPoiSelect,
  onMapClick,
}: MapProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  // Keep the latest click handlers in refs so the once-only map listener isn't
  // stuck with a stale closure.
  const onPoiSelectRef = useRef(onPoiSelect)
  onPoiSelectRef.current = onPoiSelect
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !canvasRef.current) return
        const map = new google.maps.Map(canvasRef.current, {
          center: coordinates,
          zoom: 16,
          disableDefaultUI: !interactive,
          gestureHandling: interactive ? 'greedy' : 'none',
          keyboardShortcuts: interactive,
          clickableIcons: !!onPoiSelect,
          styles: POI_MAP_STYLES,
        })
        mapRef.current = map

        map.addListener('idle', () => {
          const c = map.getCenter()
          if (!c) return
          if (interactive) onCoordinatesChange?.({ lat: c.lat(), lng: c.lng() })
        })

        // Clicking a point of interest reports its place ID; tapping anywhere
        // else reports the point. Either way the map recentres so the pin lands
        // where the user tapped.
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const recentre = (latLng: google.maps.LatLng) =>
          reduceMotion ? map.setCenter(latLng) : map.panTo(latLng)
        map.addListener('click', (e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
          const placeId = (e as google.maps.IconMouseEvent).placeId
          if (placeId) {
            e.stop() // suppress the default POI info window
            if (e.latLng) recentre(e.latLng)
            onPoiSelectRef.current?.(placeId)
            return
          }
          if (e.latLng && onMapClickRef.current) {
            recentre(e.latLng)
            onMapClickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() })
          }
        })

        setStatus('ready')
      })
      .catch((err: Error) => {
        if (cancelled) return
        setStatus(err.message === 'missing-api-key' ? 'no-key' : 'error')
        onLoadError?.()
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-centre when the coordinates prop changes from outside (a Places
  // selection, "use my location", etc.). Skip if the map is already centred
  // there — that means the change came from the user's own drag, and calling
  // setCenter would fight the interaction.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const c = map.getCenter()
    if (
      c &&
      Math.abs(c.lat() - coordinates.lat) < 1e-6 &&
      Math.abs(c.lng() - coordinates.lng) < 1e-6
    ) {
      return
    }
    map.setCenter(coordinates)
  }, [coordinates])

  if (status === 'no-key' || status === 'error') {
    return (
      <div className={`gmap ${variant}`}>
        <div className="gmap-status">
          <div className="gmap-status-inner">
            <span className="icon-lg">
              <ErrorIcon size={32} />
            </span>
            <p className="title-sm">
              {status === 'no-key' ? 'Map unavailable' : 'Oops! Something went wrong.'}
            </p>
            <p className="body muted">
              {status === 'no-key'
                ? 'Add a Google Maps API key to VITE_GOOGLE_MAPS_API_KEY in your .env file to enable the map. You can still enter the address manually below.'
                : 'The map could not load. You can go back to enter the address manually or describe where it is.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`gmap ${variant}`}>
      <div ref={canvasRef} className="gmap-canvas" aria-label="Venue location map" />
      {status === 'loading' && (
        <div className="gmap-status">
          <div className="gmap-status-inner">
            <span className="gmap-spinner" />
            <p className="body muted">Loading map…</p>
          </div>
        </div>
      )}
      {status === 'ready' && (
        <>
          <div className="gmap-pin">
            <PinIcon size={variant === 'full' ? 42 : 34} />
          </div>
          {variant === 'preview' && onEdit && (
            <button type="button" className="gmap-edit-button" onClick={onEdit}>
              <EditIcon />
              Edit map location
            </button>
          )}
        </>
      )}
    </div>
  )
}
