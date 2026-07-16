import { useEffect, useRef, useState } from 'react'
import './GoogleMap.css'
import { PinIcon, EditIcon, ErrorIcon } from './icons'
import { loadGoogleMaps } from '../lib/googleMaps'

export interface Coordinates {
  lat: number
  lng: number
}

interface GoogleMapProps {
  variant: 'preview' | 'full'
  coordinates: Coordinates
  interactive?: boolean
  /** Fires (debounced on idle) as the map centre changes when interactive. */
  onCoordinatesChange?: (c: Coordinates) => void
  onEdit?: () => void
  /** Reports load failure so parents can fall back to the manual form. */
  onLoadError?: () => void
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
}: GoogleMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [center, setCenter] = useState<Coordinates>(coordinates)

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
          clickableIcons: false,
          mapId: 'DEMO_MAP_ID',
        })
        mapRef.current = map

        map.addListener('idle', () => {
          const c = map.getCenter()
          if (!c) return
          const next = { lat: c.lat(), lng: c.lng() }
          setCenter(next)
          if (interactive) onCoordinatesChange?.(next)
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
    setCenter(coordinates)
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
          <div className="gmap-coords">
            {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
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
