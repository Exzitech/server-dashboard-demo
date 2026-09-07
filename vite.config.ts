import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Recharts + d3 sortent dans leur propre chunk, chargé en lazy par les
        // graphiques : le squelette et les chiffres s'affichent sans l'attendre.
        manualChunks: {
          charts: ['recharts'],
        },
      },
    },
  },
});
