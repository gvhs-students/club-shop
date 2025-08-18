import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://gvhs-students.github.io',
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