export default function DoseToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
      <button
        type="button"
        className={`rounded-md px-3 py-1 text-xs font-semibold ${
          value === true ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'
        }`}
        onClick={() => onChange(true)}
      >
        Taken
      </button>
      <button
        type="button"
        className={`rounded-md px-3 py-1 text-xs font-semibold ${
          value === false ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'
        }`}
        onClick={() => onChange(false)}
      >
        Missed
      </button>
    </div>
  )
}
