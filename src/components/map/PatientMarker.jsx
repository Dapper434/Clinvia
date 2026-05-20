import { CircleMarker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'

export default function PatientMarker({ patient, position, color, adherence }) {
  return (
    <CircleMarker
      center={position}
      radius={9}
      pathOptions={{
        color: '#0f172a',
        fillColor: color,
        fillOpacity: 0.9,
        weight: 1,
      }}
    >
      <Popup>
        <div className="min-w-[200px] space-y-1 text-sm">
          <p className="font-semibold text-gray-900">{patient.name}</p>
          {patient.tb_type === 'facility' ? (
            <p className="text-gray-600">Health facility</p>
          ) : (
            <>
              <p className="text-gray-600 capitalize">{patient.tb_type?.replace('-', ' ')}</p>
              <p className="text-gray-700">Adherence: {adherence}%</p>
              <Link className="text-teal-700 underline" to={`/patients/${patient.id}`}>
                Open profile
              </Link>
            </>
          )}
        </div>
      </Popup>
    </CircleMarker>
  )
}
