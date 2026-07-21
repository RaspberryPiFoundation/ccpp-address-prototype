import { useState, useRef, useEffect } from 'react'
import './PlacesSearch.css'
import { SearchIcon, ErrorIcon, LocationIcon, SpinnerIcon } from './icons'
import {
  loadGoogleMaps,
  parseAdrAddress,
  adrAddressForPlaceId,
  emptyAdrAddress,
  type AdrAddress,
} from '../lib/googleMaps'

export interface PlaceSelection {
  venueName: string
  address: AdrAddress
  lat: number
  lng: number
}

interface PlacesSearchProps {
  onSelect: (selection: PlaceSelection) => void
  /** ISO alpha-2 (lowercase) to limit predictions to; undefined = worldwide. */
  countryCode?: string
}

// A menu row plus how to turn it into a full selection when chosen.
interface Suggestion {
  key: string
  description: string
  resolve: () => Promise<PlaceSelection | null>
}

// Plus Codes ("849VCWC8+R9", "CWC8+R9 Mountain View") use a 20-character base-20
// alphabet and a '+'. Autocomplete doesn't return predictions for them, so we
// route anything that looks like one through the geocoder instead.
const PLUS_CODE_RE = /[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i
function looksLikePlusCode(value: string): boolean {
  return PLUS_CODE_RE.test(value.trim())
}

/**
 * Google Places Autocomplete. Predictions come from the AutocompleteSuggestion
 * API; the address is read from the place's adr microformat (adrFormatAddress).
 * Plus Codes are resolved via the Geocoder. A selection re-centres the map and
 * autofills the address form.
 */
export function PlacesSearch({ onSelect, countryCode }: PlacesSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateStatus, setLocateStatus] = useState<string | null>(null)
  // Index of the keyboard-highlighted suggestion (-1 = none).
  const [activeIndex, setActiveIndex] = useState(-1)

  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const readyRef = useRef(false)
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadGoogleMaps()
      .then((google) => {
        geocoderRef.current = new google.maps.Geocoder()
        sessionRef.current = new google.maps.places.AutocompleteSessionToken()
        readyRef.current = true
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

  // Resolve a Place prediction to a full selection via the new Place API.
  const resolvePlacePrediction = async (
    prediction: google.maps.places.PlacePrediction,
  ): Promise<PlaceSelection | null> => {
    try {
      const place = prediction.toPlace()
      await place.fetchFields({ fields: ['displayName', 'location', 'adrFormatAddress'] })
      // Start a fresh session token once a details request completes.
      const g = await loadGoogleMaps()
      sessionRef.current = new g.maps.places.AutocompleteSessionToken()
      if (!place.location) return null
      return {
        venueName: place.displayName ?? '',
        address: parseAdrAddress(place.adrFormatAddress),
        lat: place.location.lat(),
        lng: place.location.lng(),
      }
    } catch {
      return null
    }
  }

  const runSearch = (value: string) => {
    setQuery(value)
    setNoResults(false)
    setActiveIndex(-1)
    window.clearTimeout(debounceRef.current)
    if (value.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    setOpen(true)
    debounceRef.current = window.setTimeout(async () => {
      if (!readyRef.current) return
      // Plus Codes aren't handled by autocomplete — geocode them directly.
      if (looksLikePlusCode(value)) {
        geocoderRef.current!.geocode(
          {
            address: value,
            componentRestrictions: countryCode ? { country: countryCode } : undefined,
          },
          (results, status) => {
            setLoading(false)
            const ok = status === google.maps.GeocoderStatus.OK && results && results.length > 0
            setSuggestions(
              ok
                ? results!.map((r, i) => ({
                    key: r.place_id || `geo-${i}`,
                    description: r.formatted_address,
                    resolve: async () => ({
                      venueName: '',
                      address: r.place_id ? await adrAddressForPlaceId(r.place_id) : emptyAdrAddress(),
                      lat: r.geometry.location.lat(),
                      lng: r.geometry.location.lng(),
                    }),
                  }))
                : [],
            )
            setNoResults(!ok)
          },
        )
        return
      }

      try {
        const { suggestions: results } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: value,
            sessionToken: sessionRef.current ?? undefined,
            // Limit predictions to the chosen country, when one is selected.
            includedRegionCodes: countryCode ? [countryCode] : undefined,
          })
        setLoading(false)
        const predictions = results
          .map((s) => s.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => p != null)
        setSuggestions(
          predictions.map((p) => ({
            key: p.placeId,
            description: p.text.text,
            resolve: () => resolvePlacePrediction(p),
          })),
        )
        setNoResults(predictions.length === 0)
      } catch {
        setLoading(false)
        setSuggestions([])
        setNoResults(true)
      }
    }, 300)
  }

  const choose = async (suggestion: Suggestion) => {
    setQuery(suggestion.description)
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
    const selection = await suggestion.resolve()
    if (selection) onSelect(selection)
    else setNoResults(true)
  }

  // Keyboard support for the suggestions list (WCAG 2.1.1): arrow keys move the
  // highlight, Enter selects, Escape closes.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault()
        void choose(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
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
          const placeId = results[0]?.place_id
          const address = placeId ? await adrAddressForPlaceId(placeId) : emptyAdrAddress()
          if (results[0]) setQuery(results[0].formatted_address)
          onSelect({ venueName: '', address, lat, lng })
          setLocateStatus(
            results[0]
              ? 'Filled in your current location. Check the details below and adjust if needed.'
              : 'We found your location but couldn’t match an address — check the details below.',
          )
        } catch {
          // Reverse geocoding needs Google; without it we still pass coordinates.
          onSelect({ venueName: '', address: emptyAdrAddress(), lat, lng })
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
            onFocus={() => suggestions.length && setOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            disabled={unavailable}
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="places-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `places-option-${activeIndex}` : undefined
            }
          />
        </div>
        {open && (
          <div className="places-menu">
            {loading ? (
              <div className="places-spinner">Searching…</div>
            ) : (
              <ul role="listbox" id="places-listbox">
                {suggestions.map((s, i) => (
                  <li
                    key={s.key}
                    id={`places-option-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onClick={() => choose(s)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <SearchIcon />
                    {s.description}
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
