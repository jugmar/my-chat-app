// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
    plugins: [tailwindcss()]
  },

  adapter: node({
    mode: 'standalone'
  }),
  security: {
    checkOrigin: false
  },
  server: {
    host: '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT) : 4321,
  }
});