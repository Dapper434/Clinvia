import { useEffect, useState } from 'react'
import { LocateFixed, MapPin, Navigation } from 'lucide-react'
import { getFacilitiesApi } from '../../api/portal.js'

const SHOW = 3
const EARTH_KM = 6371

function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

function formatKm(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
}

function directionsUrl(f) {
  return `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`
}

/** The closest health facilities to the patient's home (or, if not on file, their current location). */
export default function NearestClinic({ patient }) {
  const home = patient?.lat != null && patient?.lng != null ? { lat: patient.lat, lng: patient.lng } : null
  const [facilities, setFacilities] = useState(null)
  const [here, setHere] = useState(null)
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const origin = here || home

  useEffect(() => {
    let alive = true
    getFacilitiesApi()
      .then((list) => alive && setFacilities(list.filter((f) => f.lat != null && f.lng != null)))
      .catch(() => alive && setError('Couldn’t load health facilities. Try again later.'))
    return () => { alive = false }
  }, [])

  function locate() {
    if (!navigator.geolocation) {
      setError('This browser can’t share your location.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => { setError('Location is off. Allow it in your browser to find the nearest facility.'); setLocating(false) },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }

  const nearest = origin && facilities
    ? facilities.map((f) => ({ ...f, km: distanceKm(origin, f) })).sort((a, b) => a.km - b.km).slice(0, SHOW)
    : []

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Nearest health centres</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {origin ? <p className="text-xs text-gray-500">{here ? 'From where you are now' : 'From your home address'}</p> : <span />}
        <button type="button" onClick={locate} disabled={locating} className="-mr-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50">
          <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />{locating ? 'Finding…' : here ? 'Update location' : 'Use my location'}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {!origin && !error ? <p className="mt-3 text-sm text-gray-500">Share your location to see the health facilities closest to you.</p> : null}
      {origin && !facilities && !error ? <p className="mt-3 text-sm text-gray-500">Finding facilities…</p> : null}

      {nearest.length ? (
        <ul className="mt-3 space-y-2">
          {nearest.map((f) => (
            <li key={f.slug} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600"><MapPin className="h-4 w-4" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-gray-900">
                  {f.name}
                  {f.name === patient?.facility ? <span className="ml-1.5 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">Your clinic</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{formatKm(f.km)}{f.county ? ` · ${f.county}` : ''}{f.level ? ` · ${f.level}` : ''}</p>
              </div>
              <a href={directionsUrl(f)} target="_blank" rel="noopener noreferrer" title="Directions" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-teal-700 hover:bg-teal-50" aria-label={`Directions to ${f.name}`}>
                <Navigation className="h-4 w-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
