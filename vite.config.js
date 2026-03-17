import { defineConfig } from 'vite';

//我是vite
export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist'
  }
});
