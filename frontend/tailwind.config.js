/** @type {import('tailwindcss').Config} */
// Colour tokens mirror the approved design (src/styles/clinvia.css :root) so components use
// names, not hex. Indigo is reserved for data that came from the patient.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        paper: '#F4F6F5',
        surface: '#FFFFFF',
        line: { DEFAULT: '#DCE4E1', 2: '#EAF0EE' },
        ink: { DEFAULT: '#16302B', 2: '#4D625D', 3: '#7F918C' },
        teal: { DEFAULT: '#0E7C70', 2: '#0A6259', wash: '#E3F1EE' },
        red: { DEFAULT: '#B83A26', wash: '#FBEAE6' },
        amber: { DEFAULT: '#A26612', wash: '#FBF1DF' },
        indigo: { DEFAULT: '#3E53A6', wash: '#E8EBF7' },
        facility: '#2F6FB5',
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
      },
      borderRadius: { panel: '10px' },
    },
  },
  plugins: [],
}
