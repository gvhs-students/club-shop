// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config'; // ✅ add this

export default defineConfig({
  site: 'https://gvhs-students.github.io/club-shop',
  base: '/club-shop',                                
  trailingSlash: 'never',                             

  vite: {
    plugins: [tailwindcss()]
  },
  devToolbar: {
    enabled: false,
  },
});
``