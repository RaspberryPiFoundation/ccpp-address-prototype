import { useState, useRef, useEffect } from 'react'
import './PlacesSearch.css'
import { SearchIcon, ErrorIcon, LocationIcon, SpinnerIcon, InfoIcon, ChevronRightIcon, PinIcon, PlusCodeIcon, CloseIcon } from './icons'
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
  /**
   * Option A fallback. When true, a "Can't see your address?" prompt appears
   * under the results and, when the search fails, an options panel offers ways
   * to place the venue: a nearby landmark, a Plus Code, or coordinates — each
   * re-scoping this same field. Search-first only.
   */
  enableFallbackOptions?: boolean
  /**
   * Show the fallback options panel above the search field at all times, rather
   * than only after a failed search or the "Can't see your address?" prompt.
   * Requires enableFallbackOptions.
   */
  alwaysShowOptions?: boolean
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
export function PlacesSearch({
  onSelect,
  countryCode,
  enableFallbackOptions,
  alwaysShowOptions,
}: PlacesSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [noResults, setNoResults] = useState(false)
  // Option A. The same field, re-scoped: 'address' is the default; 'landmark'
  // and 'pluscode' relabel it (chip + placeholder); 'coords' swaps it for two
  // lat/long inputs. Keeps the fallback linear rather than a side path.
  const [searchMode, setSearchMode] =
    useState<'address' | 'landmark' | 'pluscode' | 'coords'>('address')
  // Manual coordinate entry (searchMode === 'coords').
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')
  const [coordsError, setCoordsError] = useState<string | null>(null)
  // Whether the "ways to find your venue" options panel is showing after the
  // user clicked "Can't see your address?" (as opposed to a zero-results search).
  const [showOptions, setShowOptions] = useState(false)
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
  const inputRef = useRef<HTMLInputElement>(null)

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

  // "Can't see your address?" — dismiss the results and show the ways-to-find
  // options panel (same component as the no-results state).
  const openOptions = () => {
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
    setShowOptions(true)
  }

  // Clear the search/coordinate inputs and the panel. Shared by the mode
  // switches below so every transition starts from a clean slate.
  const clearInputs = () => {
    setQuery('')
    setSuggestions([])
    setActiveIndex(-1)
    setOpen(false)
    setNoResults(false)
    setShowOptions(false)
    setLatInput('')
    setLngInput('')
    setCoordsError(null)
  }

  // Re-scope the same search field to a landmark or Plus Code search.
  const startModeSearch = (mode: 'landmark' | 'pluscode') => {
    clearInputs()
    setSearchMode(mode)
    inputRef.current?.focus()
  }

  // Swap the search field for the two lat/long inputs.
  const startCoordsMode = () => {
    clearInputs()
    setSearchMode('coords')
  }

  // Validate the entered coordinates and drop the pin (reveals the map, which
  // reverse-geocodes the address on confirm, as with a normal search result).
  const submitCoords = () => {
    const lat = Number(latInput.trim())
    const lng = Number(lngInput.trim())
    if (
      latInput.trim() === '' ||
      lngInput.trim() === '' ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setCoordsError('Enter a valid latitude (−90 to 90) and longitude (−180 to 180).')
      return
    }
    setCoordsError(null)
    onSelect({ venueName: '', address: emptyAdrAddress(), lat, lng })
  }

  // Back to the default name/address search.
  const resetSearch = () => {
    clearInputs()
    setSearchMode('address')
    inputRef.current?.focus()
  }

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
    setShowOptions(false)
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

  // The "ways to find your venue" panel. With alwaysShowOptions it sits above the
  // search field and is permanently visible; otherwise it appears below the field
  // only after a failed search or the "Can't see your address?" prompt.
  const optionsPanel =
    enableFallbackOptions &&
    searchMode === 'address' &&
    (alwaysShowOptions || noResults || showOptions) ? (
      <div
        className={`no-results${alwaysShowOptions ? ' no-results-above' : ''}`}
        role="status"
      >
        <p className="no-results-title">
          <span className="no-results-icon">
            <InfoIcon />
          </span>
          {noResults ? 'Your search didn’t return any results' : 'Can’t find your address?'}
        </p>
        <p className="no-results-text">
          {noResults
            ? 'Here are a few ways to find your venue:'
            : 'No problem — try one of these instead:'}
        </p>
        <div className="no-results-options">
          <button type="button" className="result-option" onClick={() => startModeSearch('landmark')}>
            <span className="result-option-icon">
              <PinIcon size={22} />
            </span>
            <span className="result-option-text">
              <span className="result-option-title">Search for a nearby landmark</span>
              <span className="result-option-sub">
                Try a nearby place, town, or landmark — you’ll drag the pin onto your exact venue
                next.
              </span>
            </span>
            <span className="result-option-chevron">
              <ChevronRightIcon />
            </span>
          </button>
          <button type="button" className="result-option" onClick={() => startModeSearch('pluscode')}>
            <span className="result-option-icon">
              <PlusCodeIcon size={22} />
            </span>
            <span className="result-option-text">
              <span className="result-option-title">Use a Google Maps Plus Code</span>
              <span className="result-option-sub">
                A short code that pinpoints your venue — even when it has no address.
              </span>
            </span>
            <span className="result-option-chevron">
              <ChevronRightIcon />
            </span>
          </button>
          <button type="button" className="result-option" onClick={startCoordsMode}>
            <span className="result-option-icon">
              <LocationIcon />
            </span>
            <span className="result-option-text">
              <span className="result-option-title">Enter coordinates</span>
              <span className="result-option-sub">
                Already have latitude and longitude? Enter them to drop the pin directly.
              </span>
            </span>
            <span className="result-option-chevron">
              <ChevronRightIcon />
            </span>
          </button>
        </div>
      </div>
    ) : null

  return (
    <div className="field">
      {alwaysShowOptions && optionsPanel}
      <div className="label-wrapper">
        <label htmlFor="places-search">Search for the address</label>
        {searchMode === 'address' ? (
          <span className="hint">
            Search the venue’s address or paste a <strong>Google Maps Plus Code</strong>.
          </span>
        ) : (
          <span className="search-mode-tag">
            <LocationIcon size={16} />
            {searchMode === 'pluscode'
              ? 'Searching by Plus Code'
              : searchMode === 'coords'
                ? 'Entering coordinates'
                : 'Searching by landmark'}
            <button
              type="button"
              className="search-mode-clear"
              onClick={resetSearch}
              aria-label="Clear and search by name or address"
            >
              <CloseIcon size={16} />
            </button>
          </span>
        )}
      </div>
      {searchMode !== 'coords' && (
        <div className="places" ref={containerRef}>
          <div className={`places-box${noResults && !enableFallbackOptions ? ' error' : ''}`}>
          <span className="search-icon">
            <SearchIcon />
          </span>
          <input
            id="places-search"
            ref={inputRef}
            value={query}
            placeholder={
              unavailable
                ? 'Search unavailable — enter the address below'
                : searchMode === 'pluscode'
                  ? 'Enter a Plus Code, e.g. 9G5H+3M'
                  : searchMode === 'landmark'
                    ? 'Enter a nearby town, place, or landmark'
                    : 'Start typing an address…'
            }
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
              <>
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
                {enableFallbackOptions &&
                  !alwaysShowOptions &&
                  searchMode === 'address' &&
                  suggestions.length > 0 && (
                    <button type="button" className="places-help" onClick={openOptions}>
                      <span className="places-help-icon">
                        <InfoIcon />
                      </span>
                      <span className="places-help-title">Can’t see your address?</span>
                      <span className="places-help-chevron">
                        <ChevronRightIcon />
                      </span>
                    </button>
                  )}
              </>
            )}
          </div>
        )}
        </div>
      )}
      {searchMode === 'coords' && (
        <div className="coords-entry">
          <div className="coords-fields">
            <div className="coords-field">
              <label htmlFor="coord-lat">Latitude</label>
              <input
                id="coord-lat"
                inputMode="decimal"
                value={latInput}
                placeholder="e.g. -1.2921"
                onChange={(e) => {
                  setLatInput(e.target.value)
                  setCoordsError(null)
                }}
              />
            </div>
            <div className="coords-field">
              <label htmlFor="coord-lng">Longitude</label>
              <input
                id="coord-lng"
                inputMode="decimal"
                value={lngInput}
                placeholder="e.g. 36.8219"
                onChange={(e) => {
                  setLngInput(e.target.value)
                  setCoordsError(null)
                }}
              />
            </div>
          </div>
          {coordsError && (
            <p className="coords-error" role="alert">
              {coordsError}
            </p>
          )}
          <div className="search-mode-help">
            <p className="search-mode-help-title">
              <span className="search-mode-help-icon">
                <InfoIcon />
              </span>
              How to find your coordinates
            </p>
            <ol>
              <li>Open Google Maps and find your venue.</li>
              <li>Tap and hold the exact spot to drop a pin.</li>
              <li>Copy the latitude and longitude shown, then enter them above.</li>
            </ol>
          </div>
          <button type="button" className="coords-submit" onClick={submitCoords}>
            Place pin on map
          </button>
        </div>
      )}
      {searchMode === 'pluscode' && (
        <div className="search-mode-help">
          <p className="search-mode-help-title">
            <span className="search-mode-help-icon">
              <InfoIcon />
            </span>
            How to find your Plus Code
          </p>
          <ol>
            <li>Open Google Maps and find your venue.</li>
            <li>Tap and hold the exact spot to drop a pin.</li>
            <li>Copy the Plus Code shown (e.g. 9G5H+3M) and paste it above.</li>
          </ol>
          <a href="https://plus.codes/" target="_blank" rel="noreferrer">
            What’s a Plus Code?
          </a>
        </div>
      )}
      {searchMode === 'address' && (
        <button type="button" className="locate-link" onClick={useMyLocation} disabled={locating}>
          {locating ? <SpinnerIcon /> : <LocationIcon />}
          {locating ? 'Getting your location…' : 'Use my current location'}
        </button>
      )}
      {locateStatus && (
        <p className="locate-status" role="status">
          {locateStatus}
        </p>
      )}
      {noResults && !enableFallbackOptions && (
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
      {!alwaysShowOptions && optionsPanel}
    </div>
  )
}
