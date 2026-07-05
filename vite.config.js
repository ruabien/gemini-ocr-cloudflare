import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'agent-discovery-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urlPath = req.url?.split('?')[0] || '';
          if (urlPath === '/' || urlPath === '/index.html') {
            res.setHeader('Link', '</.well-known/api-catalog>; rel="api-catalog"');
          } else if (urlPath === '/.well-known/api-catalog') {
            try {
              const filePath = path.join(__dirname, 'public/.well-known/api-catalog');
              const content = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/linkset+json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
              return;
            } catch (err) {
              console.error(err);
            }
          } else if (urlPath === '/.well-known/openid-configuration') {
            try {
              const filePath = path.join(__dirname, 'public/.well-known/openid-configuration');
              const content = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
              return;
            } catch (err) {
              console.error(err);
            }
          } else if (urlPath === '/.well-known/oauth-protected-resource') {
            try {
              const filePath = path.join(__dirname, 'public/.well-known/oauth-protected-resource');
              const content = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
              return;
            } catch (err) {
              console.error(err);
            }
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const urlPath = req.url?.split('?')[0] || '';
          if (urlPath === '/' || urlPath === '/index.html') {
            res.setHeader('Link', '</.well-known/api-catalog>; rel="api-catalog"');
          } else if (urlPath === '/.well-known/api-catalog') {
            try {
              const filePath = path.join(__dirname, 'public/.well-known/api-catalog');
              const content = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/linkset+json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
              return;
            } catch (err) {
              console.error(err);
            }
          } else if (urlPath === '/.well-known/openid-configuration') {
            try {
              const filePath = path.join(__dirname, 'public/.well-known/openid-configuration');
              const content = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
              return;
            } catch (err) {
              console.error(err);
            }
          } else if (urlPath === '/.well-known/oauth-protected-resource') {
            try {
              const filePath = path.join(__dirname, 'public/.well-known/oauth-protected-resource');
              const content = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(content);
              return;
            } catch (err) {
              console.error(err);
            }
          }
          next();
        });
      }
    },
    {
      name: 'markdown-negotiation',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const acceptHeader = req.headers['accept'] || '';
          if (acceptHeader.includes('text/markdown')) {
            const urlPath = req.url?.split('?')[0] || '';
            const isApi = urlPath.startsWith('/api');
            const isStatic = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webmanifest|json|txt|xml|woff|woff2|ttf|eot)$/i.test(urlPath);
            
            if (!isApi && !isStatic) {
              const markdown = `# Trợ lý số hóa hồ sơ tư pháp bằng AI (LexOCR)\n\nLexOCR là công cụ chuyển đổi hình ảnh, tài liệu scan sang định dạng văn bản (OCR) chuyên biệt cho ngành tư pháp Việt Nam.\n\n## Bắt đầu sử dụng\nTruy cập [LexOCR](https://lexocr.com/) để tải lên tài liệu của bạn.`;
              const tokenCount = Math.ceil(markdown.length / 4);
              
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
              res.setHeader('x-markdown-tokens', String(tokenCount));
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(markdown);
              return;
            }
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const acceptHeader = req.headers['accept'] || '';
          if (acceptHeader.includes('text/markdown')) {
            const urlPath = req.url?.split('?')[0] || '';
            const isApi = urlPath.startsWith('/api');
            const isStatic = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webmanifest|json|txt|xml|woff|woff2|ttf|eot)$/i.test(urlPath);
            
            if (!isApi && !isStatic) {
              const markdown = `# Trợ lý số hóa hồ sơ tư pháp bằng AI (LexOCR)\n\nLexOCR là công cụ chuyển đổi hình ảnh, tài liệu scan sang định dạng văn bản (OCR) chuyên biệt cho ngành tư pháp Việt Nam.\n\n## Bắt đầu sử dụng\nTruy cập [LexOCR](https://lexocr.com/) để tải lên tài liệu của bạn.`;
              const tokenCount = Math.ceil(markdown.length / 4);
              
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
              res.setHeader('x-markdown-tokens', String(tokenCount));
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(markdown);
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].${Date.now()}.js`,
        chunkFileNames: `assets/[name].[hash].${Date.now()}.js`,
        assetFileNames: `assets/[name].[hash].${Date.now()}.[ext]`
      }
    }
  }
})
