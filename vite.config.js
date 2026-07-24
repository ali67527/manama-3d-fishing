import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    modulePreload: false
  },
  plugins: [
    {
      name: 'remove-crossorigin-for-file-protocol',
      transformIndexHtml(html) {
        return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '');
      }
    }
  ]
});
