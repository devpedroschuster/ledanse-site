import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@emailjs/browser')) {
            return 'emailjs';
          }
        },
      },
    },

    assetsInlineLimit: 4096,

    sourcemap: false,       
    chunkSizeWarningLimit: 1000, 
  },
  
  optimizeDeps: {
    include: ['@emailjs/browser'] 
  }
});