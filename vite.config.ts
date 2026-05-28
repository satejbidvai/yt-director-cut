import { defineConfig, type Plugin } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json" with { type: "json" };

// CRXJS dev-mode popup fetches from a chrome-extension:// origin,
// which triggers CORS preflight. Vite's `server.headers` only covers
// normal responses; this plugin also handles OPTIONS requests.
function crxCorsPlugin(): Plugin {
  return {
    name: "crx-cors",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "*");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [crxCorsPlugin(), crx({ manifest })],
  build: {
    target: "esnext",
    sourcemap: !!process.env.VITE_SOURCEMAP,
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
});
