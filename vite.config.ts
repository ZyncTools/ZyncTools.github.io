import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        manualChunks: {
          'vendor-pdf': ['pdf-lib', 'pdfjs-dist'],
          'vendor-utils': ['jszip'],
          'components': [
            './src/components/navbar.ts',
            './src/components/footer.ts',
            './src/components/modal.ts',
            './src/components/toast.ts',
            './src/components/command-palette.ts',
            './src/components/toolbar.ts',
            './src/components/dropdown.ts',
          ],
          'core': [
            './src/core/app.ts',
            './src/core/document-manager.ts',
            './src/core/annotation-manager.ts',
            './src/core/history-manager.ts',
            './src/core/workspace-manager.ts',
          ],
          'utils': [
            './src/utils/event-emitter.ts',
            './src/utils/theme-manager.ts',
            './src/utils/shortcut-manager.ts',
            './src/utils/uuid.ts',
          ],
          'storage': ['./src/storage/storage-manager.ts'],
          'workers': ['./src/workers/pdf-worker.ts'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`;
          }
          if (/\.css$/.test(assetInfo.name)) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    target: 'es2022',
    cssCodeSplit: true,
    modulePreload: {
      polyfill: true,
    },
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  optimizeDeps: {
    include: ['pdf-lib', 'pdfjs-dist', 'jszip'],
    exclude: [],
  },
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
      modernPolyfills: true,
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@core': '/src/core',
      '@utils': '/src/utils',
      '@storage': '/src/storage',
      '@pages': '/src/pages',
      '@workers': '/src/workers',
      '@types': '/src/types',
      '@styles': '/src/styles',
      '@assets': '/assets',
    },
  },
  css: {
    devSourcemap: true,
  },
});