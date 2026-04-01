/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        wm: {
          orange: '#E65300',      // Pantone 166C
          superblack: '#010101',  // Negro Corporativo
          gray1: '#3D3D3D',
          gray2: '#666666',
          gray3: '#B1B1B1',
          gray4: '#E4E4E4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
