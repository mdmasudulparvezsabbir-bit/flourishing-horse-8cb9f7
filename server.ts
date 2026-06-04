import "dotenv/config";
import path from "path";
import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import apiApp from "./api/index";

const PORT = 3000;

async function startServer() {
  const app = express();

  // Mount API routes
  app.use(apiApp);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started and listening on 0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Self-pinging mechanism to keep the app awake (every 30 seconds)
    setInterval(() => {
      http.get(`http://localhost:${PORT}/api/health`, (res) => {
        // Only log failures to avoid cluttering logs
        if (res.statusCode !== 200) {
          console.warn(`[Keep-Alive] Ping returned status: ${res.statusCode}`);
        }
      }).on('error', (err) => {
        console.error(`[Keep-Alive] Ping failed: ${err.message}`);
      });
    }, 30 * 1000);
  });
}

startServer().catch((err) => {
  console.error("Critical: Failed to start server:", err);
  process.exit(1);
});
