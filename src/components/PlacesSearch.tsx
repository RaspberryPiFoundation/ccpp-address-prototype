import { useState, useRef, useEffect } from 'react'
import './PlacesSearch.css'
import { SearchIcon, ErrorIcon, LocationIcon, SpinnerIcon } from './icons'
import { loadGoogleMaps, parseAddressComponents, type ParsedAddress } from '../lib/googleMaps'

export interface PlaceSelection {
  venueName: string
  address: ParsedAddress
  lat: number
  lng: number
}

interface PlacesSearchProps {
  onSelect: (selection: PlaceSelection) => void
  /** ISO alpha-2 (lowercase) to limit predictions to; undefined = worldwide. */
  countryCode?: string
}

/**
 * Google Places Autocomplete. Predictions come from AutocompleteService and
 * full details (address components + geometry) from PlacesService, so the
 * selection re-centres the map and autofills the address form.
 */
export function PlacesSearch({ onSelect, countryCode }: PlacesSearchProps) {
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateStatus, setLocateStatus] = useState<string | null>(null)

  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesRef = useRef<google.maps.places.PlacesService | null>(null)
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadGoogleMaps()
      .then((google) => {
        autocompleteRef.current = new google.maps.places.AutocompleteService()
        placesRef.current = new google.maps.places.PlacesService(document.createElement('div'))
        sessionRef.current = new google.maps.places.AutocompleteSessionToken()
      })
      .catch(() => setUnavailable(true))
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const runSearch = (value: string) => {
    setQuery(value)
    setNoResults(false)
    window.clearTimeout(debounceRef.current)
    if (!autocompleteRef.current || value.trim().length < 3) {
      setPredictions([])
      setOpen(false)
      return
    }
    setLoading(true)
    setOpen(true)
    debounceRef.current = window.setTimeout(() => {
      autocompleteRef.current!.getPlacePredictions(
        {
          input: value,
          sessionToken: sessionRef.current ?? undefined,
          // Limit predictions to the chosen country, when one is selected.
          componentRestrictions: countryCode ? { country: countryCode } : undefined,
        },
        (results, status) => {
          setLoading(false)
          const ok = status === google.maps.places.PlacesServiceStatus.OK && results
          setPredictions(ok ? results! : [])
          setNoResults(!ok)
        },
      )
    }, 300)
  }

  const choose = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesRef.current) return
    setQuery(prediction.description)
    setOpen(false)
    setPredictions([])
    placesRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['name', 'address_components', 'geometry'],
        sessionToken: sessionRef.current ?? undefined,
      },
      (place, status) => {
        // Refresh the session token after a details request completes.
        loadGoogleMaps().then((g) => {
          sessionRef.current = new g.maps.places.AutocompleteSessionToken()
        })
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !place ||
          !place.geometry?.location
        ) {
          setNoResults(true)
          return
        }
        const address = parseAddressComponents(place.address_components ?? [])
        onSelect({
          venueName: place.name ?? '',
          address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        })
      },
    )
  }

  // Use the browser Geolocation API to get the user's position, then reverse
  // geocode it with Google to autofill the address form and re-centre the map.
  const useMyLocation = () => {
    setNoResults(false)
    setLocateStatus(null)
    if (!('geolocation' in navigator)) {
      setLocateStatus('Location isn’t supported by your browser. Enter the address manually below.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        try {
          const google = await loadGoogleMaps()
          const geocoder = new google.maps.Geocoder()
          const { results } = await geocoder.geocode({ location: { lat, lng } })
          const address: ParsedAddress = results[0]
            ? parseAddressComponents(results[0].address_components)
            : { addressLine1: '', townCity: '', county: '', postcode: '', country: '' }
          if (results[0]) setQuery(results[0].formatted_address)
          onSelect({ venueName: '', address, lat, lng })
          setLocateStatus(
            results[0]
              ? 'Filled in your current location. Check the details below and adjust if needed.'
              : 'We found your location but couldn’t match an address — check the details below.',
          )
        } catch {
          // Reverse geocoding needs Google; without it we still pass coordinates.
          onSelect({
            venueName: '',
            address: { addressLine1: '', townCity: '', county: '', postcode: '', country: '' },
            lat,
            lng,
          })
          setLocateStatus('We saved your coordinates but couldn’t look up the address. Enter it manually below.')
        } finally {
          setLocating(false)
        }
      },
      (error) => {
        setLocating(false)
        setLocateStatus(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access, or search or enter the address manually.'
            : 'We couldn’t get your location. Try again, or search or enter the address manually.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  return (
    <div className="field">
      <div className="label-wrapper">
        <label htmlFor="places-search">Search for the address</label>
        <span className="hint">
          Search the venue’s address or paste a <strong>Google Maps Plus Code</strong>.
        </span>
      </div>
      <div className="places" ref={containerRef}>
        <div className={`places-box${noResults ? ' error' : ''}`}>
          <span className="search-icon">
            <SearchIcon />
          </span>
          <input
            id="places-search"
            value={query}
            placeholder={unavailable ? 'Search unavailable — enter the address below' : 'Start typing an address…'}
            onChange={(e) => runSearch(e.target.value)}
            onFocus={() => predictions.length && setOpen(true)}
            autoComplete="off"
            disabled={unavailable}
          />
        </div>
        {open && (
          <div className="places-menu">
            {loading ? (
              <div className="places-spinner">Searching…</div>
            ) : (
              <ul role="listbox">
                {predictions.map((p) => (
                  <li key={p.place_id} role="option" onClick={() => choose(p)}>
                    <SearchIcon />
                    {p.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <button type="button" className="locate-link" onClick={useMyLocation} disabled={locating}>
        {locating ? <SpinnerIcon /> : <LocationIcon />}
        {locating ? 'Getting your location…' : 'Use my current location'}
      </button>
      {locateStatus && (
        <p className="locate-status" role="status">
          {locateStatus}
        </p>
      )}
      {noResults && (
        <div className="error-message" role="alert">
          <span className="icon">
            <ErrorIcon />
          </span>
          <span>
            Error: We couldn’t find that address. Try a different search, or use one of the options
            below.
          </span>
        </div>
      )}
    </div>
  )
}
