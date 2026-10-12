import { useEffect, useMemo, useState } from "react";
import { changeStock, getBooks } from "./api.js";

const stockLabel = (stock) => {
  if (stock === 0) return "Out of stock";
  if (stock <= 5) return "Low stock";
  return "In stock";
};

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem("shelfwise-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

function BookCard({ book, pending, onStockChange }) {
  return (
    <article className="book-card">
      <div className="cover" style={{ "--accent": book.accent }}>
        <span className="cover-mark">SW</span>
        <div>
          <p>{book.category}</p>
          <h3>{book.title}</h3>
        </div>
        <span className="cover-author">{book.author}</span>
      </div>
      <div className="book-details">
        <div className="book-heading">
          <div>
            <p className="eyebrow">{book.category}</p>
            <h2>{book.title}</h2>
          </div>
          <span className="price">${book.price.toFixed(2)}</span>
        </div>
        <p className="author">by {book.author}</p>
        <p className="description">{book.description}</p>
        <div className="stock-row">
          <div>
            <span className={`status status-${stockLabel(book.stock).replaceAll(" ", "-").toLowerCase()}`}>
              {stockLabel(book.stock)}
            </span>
            <strong>{book.stock} copies</strong>
          </div>
          <div className="stock-actions" aria-label={`Change stock for ${book.title}`}>
            <button
              type="button"
              onClick={() => onStockChange(book.id, -1)}
              disabled={pending || book.stock === 0}
              aria-label={`Sell one copy of ${book.title}`}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => onStockChange(book.id, 1)}
              disabled={pending}
              aria-label={`Restock one copy of ${book.title}`}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    getBooks()
      .then(({ books: catalog }) => setBooks(catalog))
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("shelfwise-theme", theme);
  }, [theme]);

  const categories = useMemo(
    () => ["All", ...new Set(books.map((book) => book.category))],
    [books]
  );

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesCategory = category === "All" || book.category === category;
      const matchesQuery =
        !normalizedQuery ||
        [book.title, book.author, book.category].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        );
      return matchesCategory && matchesQuery;
    });
  }, [books, category, query]);

  const inventoryCount = books.reduce((total, book) => total + book.stock, 0);

  async function handleStockChange(id, change) {
    setPendingId(id);
    setError("");
    try {
      const { book: updatedBook } = await changeStock(id, change);
      setBooks((current) =>
        current.map((book) => (book.id === id ? updatedBook : book))
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Shelfwise home">
          <span className="brand-icon">S</span>
          <span>Shelfwise</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#catalog">Catalog</a>
          <a href="#operations">Operations</a>
        </nav>
        <div className="header-actions">
          <span className="live-badge"><i /> System live</span>
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            aria-pressed={theme === "dark"}
            onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">A modern engineering library</p>
          <h1>Build better systems.<br /><em>One page at a time.</em></h1>
          <p className="hero-description">
            A curated catalog for curious engineers, backed by an observable,
            containerized platform built to stay available.
          </p>
          <a className="primary-action" href="#catalog">Explore the collection <span>→</span></a>
        </div>
        <div className="hero-panel" id="operations">
          <div className="metric">
            <span>Titles</span>
            <strong>{books.length || "—"}</strong>
          </div>
          <div className="metric">
            <span>Copies available</span>
            <strong>{books.length ? inventoryCount : "—"}</strong>
          </div>
          <div className="platform-note">
            <span className="pulse" />
            <div>
              <strong>Platform operational</strong>
              <p>Metrics exported continuously to Prometheus</p>
            </div>
          </div>
        </div>
      </section>

      <section className="catalog" id="catalog">
        <div className="section-heading">
          <div>
            <p className="kicker">The collection</p>
            <h2>Books worth keeping close</h2>
          </div>
          <label className="search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search title, author, or topic"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="catalog-toolbar">
          <div className="filters" aria-label="Filter by category">
            {categories.map((item) => (
              <button
                className={category === item ? "active" : ""}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="results-summary" aria-live="polite">
            <span>Showing <strong>{visibleBooks.length}</strong> of {books.length} titles</span>
            {(query || category !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {error && <div className="error" role="alert">{error}</div>}

        <div className="book-grid">
          {visibleBooks.map((book) => (
            <BookCard
              book={book}
              key={book.id}
              pending={pendingId === book.id}
              onStockChange={handleStockChange}
            />
          ))}
        </div>

        {!error && books.length > 0 && visibleBooks.length === 0 && (
          <p className="empty-state">No books match that search.</p>
        )}
      </section>

      <footer>
        <a className="brand" href="/">
          <span className="brand-icon">S</span>
          <span>Shelfwise</span>
        </a>
        <p>React · Node.js · Docker · Kubernetes · Prometheus · Grafana</p>
      </footer>
    </main>
  );
}
