import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("bookstore API", () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  it("returns the catalog", async () => {
    const response = await request(app).get("/api/books").expect(200);

    assert.equal(response.body.books.length, 6);
    assert.equal(response.body.books[0].id, "clean-code");
  });

  it("updates stock and exposes the new value in Prometheus metrics", async () => {
    const update = await request(app)
      .patch("/api/books/clean-code/stock")
      .send({ change: -2 })
      .expect(200);

    assert.equal(update.body.book.stock, 12);

    const metrics = await request(app).get("/metrics").expect(200);
    assert.match(
      metrics.text,
      /bookstore_book_stock\{book_id="clean-code",title="Clean Code"\} 12/
    );
  });

  it("rejects stock changes below zero", async () => {
    const response = await request(app)
      .patch("/api/books/site-reliability/stock")
      .send({ change: -5 })
      .expect(409);

    assert.equal(response.body.error, "Insufficient stock");
    assert.equal(response.body.book.stock, 4);
  });

  it("validates stock changes", async () => {
    await request(app)
      .patch("/api/books/clean-code/stock")
      .send({ change: 1.5 })
      .expect(400);
  });

  it("provides a health endpoint", async () => {
    const response = await request(app).get("/health").expect(200);
    assert.equal(response.body.status, "ok");
  });
});
