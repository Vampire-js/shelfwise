import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

const books = [
  {
    id: "clean-code",
    title: "Clean Code",
    author: "Robert C. Martin",
    category: "Software Engineering",
    price: 42.99,
    stock: 2,
    accent: "#333",
    description: "Readable software."
  },
  {
    id: "kubernetes",
    title: "Kubernetes: Up & Running",
    author: "Brendan Burns",
    category: "DevOps",
    price: 46.25,
    stock: 8,
    accent: "#555",
    description: "Kubernetes systems."
  }
];

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("App", () => {
  it("loads and filters the catalog", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ books })
    });

    render(<App />);
    expect((await screen.findAllByText("Clean Code")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText(/search title/i), {
      target: { value: "Kubernetes" }
    });

    expect(screen.queryAllByText("Clean Code")).toHaveLength(0);
    expect(screen.getAllByText("Kubernetes: Up & Running").length).toBeGreaterThan(0);
    expect(screen.getByText(/showing/i)).toHaveTextContent("Showing 1 of 2 titles");

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(screen.getAllByText("Clean Code").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/search title/i)).toHaveValue("");
  });

  it("updates stock", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ books })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ book: { ...books[0], stock: 1 } })
      });

    render(<App />);
    await screen.findByText("2 copies");
    fireEvent.click(screen.getByRole("button", { name: /sell one copy of clean code/i }));

    await waitFor(() => expect(screen.getByText("1 copies")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/books/clean-code/stock",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("switches to dark theme and remembers the choice", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ books })
    });

    render(<App />);
    const toggle = screen.getByRole("button", { name: /switch to dark theme/i });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("shelfwise-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: /switch to light theme/i })).toBeInTheDocument();
  });
});
