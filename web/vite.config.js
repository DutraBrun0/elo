import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Em desenvolvimento o Vite repassa /api e /socket.io para o back-end: o navegador vê
// uma única origem, então não há CORS nem URL de API para configurar.
const API_URL = process.env.VITE_API_PROXY ?? 'http://localhost:3333';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': API_URL,
      '/socket.io': { target: API_URL, ws: true },
    },
  },
});
