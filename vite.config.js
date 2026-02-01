import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // 1. Minificação Otimizada
    // (Certifique-se de ter rodado: npm install -D terser)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,    // Remove console.log em produção
        drop_debugger: true,   // Remove debugger
      },
    },

    // 2. Code Splitting (CORRIGIDO PARA FUNÇÃO)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Se o arquivo sendo processado for do emailjs, separa ele
          if (id.includes('@emailjs/browser')) {
            return 'emailjs';
          }
          // Você pode adicionar outras regras aqui se precisar no futuro
        },
      },
    },

    // 3. Otimização de Assets
    assetsInlineLimit: 4096, // Arquivos < 4kb viram base64

    // 4. Configurações extras
    sourcemap: false,       
    chunkSizeWarningLimit: 1000, 
  },
  
  optimizeDeps: {
    include: ['@emailjs/browser'] 
  }
});