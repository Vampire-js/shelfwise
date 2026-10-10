import client from "prom-client";

export function createMetrics(register = new client.Registry()) {
  client.collectDefaultMetrics({ register, prefix: "bookstore_" });

  const httpRequests = new client.Counter({
    name: "bookstore_http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register]
  });

  const httpDuration = new client.Histogram({
    name: "bookstore_http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [register]
  });

  const httpTraffic = new client.Counter({
    name: "bookstore_http_response_bytes_total",
    help: "Total HTTP response traffic in bytes",
    labelNames: ["method", "route", "status_code"],
    registers: [register]
  });

  const bookStock = new client.Gauge({
    name: "bookstore_book_stock",
    help: "Current remaining stock for each book",
    labelNames: ["book_id", "title"],
    registers: [register]
  });

  return {
    register,
    observeRequest({ method, route, statusCode, durationSeconds, responseBytes }) {
      const labels = { method, route, status_code: String(statusCode) };
      httpRequests.inc(labels);
      httpDuration.observe(labels, durationSeconds);
      httpTraffic.inc(labels, responseBytes);
    },
    setStock(books) {
      for (const book of books) {
        bookStock.set({ book_id: book.id, title: book.title }, book.stock);
      }
    }
  };
}
