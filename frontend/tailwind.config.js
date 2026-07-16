/** Paleta institucional del hospital: azul / celeste / blanco */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hospital: {
          azul: '#0b5394',
          azulOscuro: '#073763',
          celeste: '#4a90d9',
          celesteClaro: '#e8f2fc',
          blanco: '#ffffff',
          verde: '#16a34a',
          amarillo: '#f0b429',
          rojo: '#dc2626'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
