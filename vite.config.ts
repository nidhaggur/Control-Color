import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const pagesBase = process.env.BASE_URL || '/';

export default defineConfig({
  base: pagesBase,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
});
