import cors from "cors";
import express from "express";
import { createBookStore } from "./books.js";
import { createMetrics } from "./metrics.js";

export function createApp({ store = createBookStore(), metrics = createMetrics() } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "16kb" }));

  app.use((request, response, next) => {
    const startedAt = process.hrtime.bigint();

    response.on("finish", () => {
      const route = request.route?.path
        ? `${request.baseUrl}${request.route.path}`
        : request.path;
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
      const responseBytes = Number(response.getHeader("content-length") || 0);

      metrics.observeRequest({
        method: request.method,
        route,
        statusCode: response.statusCode,
        durationSeconds,
        responseBytes
      });
    });

    next();
  });

  metrics.setStock(store.all());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "bookstore-api" });
  });

  app.get("/api/books", (_request, response) => {
    response.json({ books: store.all() });
  });

  app.patch("/api/books/:id/stock", (request, response) => {
    const { change } = request.body;
    if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 100) {
      return response.status(400).json({
        error: "change must be a non-zero integer between -100 and 100"
      });
    }

    const result = store.updateStock(request.params.id, change);
    if (!result) {
      return response.status(404).json({ error: "Book not found" });
    }
    if (result.error) {
      return response.status(409).json({ error: result.error, book: result.book });
    }

    metrics.setStock([result.book]);
    return response.json({ book: result.book });
  });

  app.get("/metrics", async (_request, response) => {
    response.set("Content-Type", metrics.register.contentType);
    response.end(await metrics.register.metrics());
  });

  app.use((request, response) => {
    response.status(404).json({ error: `Route ${request.method} ${request.path} not found` });
  });

  return app;
}
