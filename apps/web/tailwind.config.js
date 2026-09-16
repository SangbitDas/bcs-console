/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#F6F5F1',
        surface: '#FFFFFF',
        ink: '#0A0A0A',
        accent: '#EA0000',
        ok: '#0A7A3D',
      },
      fontFamily: {
        sans: ['NotoSansBengali_400Regular', 'Noto Sans Bengali', 'sans-serif'],
        ui: ['NotoSansBengali_400Regular', 'Noto Sans Bengali', 'sans-serif'],
        display: ['NotoSansBengali_700Bold', 'Noto Sans Bengali', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
