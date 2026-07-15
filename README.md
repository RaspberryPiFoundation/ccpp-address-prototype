# Code Club — Partner Portal: Venue Registration Flow

A React + TypeScript + Vite implementation of the Code Club Partner Portal
"Find venue" user flow, built from the Figma designs and flow chart.

## The flow

1. **Start your application** — choose country + venue type, see the safeguarding
   notice, confirm you are 18+.
2. **Where is the club venue?** — find the venue three ways:
   - **Search** the address via Google Places Autocomplete (autofills the form + map).
   - **Drag the map** to drop a pin (reverse-geocodes to autofill the form).
   - Enter the address **manually**.
   Required-field validation, "no results" and "map could not load" error states
   are all handled, per the flow chart.
3. **Registration complete** — confirmation with a summary of the submitted venue.

## Google Maps setup

The map and address search use the **Google Maps JavaScript API** (Maps, Places
and Geocoding). Provide a key via an `.env` file:

```bash
cp .env.example .env
# then edit .env:
# VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

Enable these APIs on the key in Google Cloud:

- Maps JavaScript API
- Places API
- Geocoding API

Without a key the app still runs end-to-end: the search is disabled and the map
shows a "Map unavailable" panel, so the manual address entry path can be used.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes `dist/` to GitHub Pages.

The Google Maps key is injected at build time from a **repository secret** — the
`.env` file is never committed. To enable the map on the live site:

1. Repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `VITE_GOOGLE_MAPS_API_KEY`, value: your key
3. Re-run the **Deploy to GitHub Pages** workflow (Actions tab → Run workflow)

Until the secret is set, the deployed site works but shows the "Map unavailable"
fallback. Restrict the key to your Pages domain (HTTP referrer) in Google Cloud.

## Where things live

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Screen state machine + autofill / reverse-geocode logic |
| `src/steps/` | The four screens (Start, FindVenue, MapPicker, Complete) |
| `src/components/GoogleMap.tsx` | Map with a fixed centre pin (drag to move) |
| `src/components/PlacesSearch.tsx` | Places Autocomplete with a custom dropdown |
| `src/components/Fields.tsx` | Text / select / textarea / checkbox inputs |
| `src/lib/googleMaps.ts` | API loader + address-component parsing |
| `src/styles/tokens.css` | Design tokens pulled from the Figma design system |
