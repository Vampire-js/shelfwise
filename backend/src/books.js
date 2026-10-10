export const initialBooks = [
  {
    id: "clean-code",
    title: "Clean Code",
    author: "Robert C. Martin",
    category: "Software Engineering",
    price: 42.99,
    stock: 14,
    accent: "#f4b860",
    description: "Practical principles for writing readable, maintainable software."
  },
  {
    id: "pragmatic-programmer",
    title: "The Pragmatic Programmer",
    author: "David Thomas & Andrew Hunt",
    category: "Software Engineering",
    price: 48.5,
    stock: 9,
    accent: "#6e9e8f",
    description: "A field guide to becoming a more effective and adaptable developer."
  },
  {
    id: "designing-data-intensive",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    category: "Distributed Systems",
    price: 55,
    stock: 6,
    accent: "#d97b66",
    description: "The ideas behind reliable, scalable, and maintainable systems."
  },
  {
    id: "you-dont-know-js",
    title: "You Don't Know JS Yet",
    author: "Kyle Simpson",
    category: "JavaScript",
    price: 36.75,
    stock: 18,
    accent: "#e4c35a",
    description: "A deep exploration of JavaScript's core mechanisms."
  },
  {
    id: "kubernetes-up-running",
    title: "Kubernetes: Up & Running",
    author: "Brendan Burns et al.",
    category: "DevOps",
    price: 46.25,
    stock: 11,
    accent: "#7186c7",
    description: "Build and operate reliable distributed systems with Kubernetes."
  },
  {
    id: "site-reliability",
    title: "Site Reliability Engineering",
    author: "Betsy Beyer et al.",
    category: "DevOps",
    price: 51.4,
    stock: 4,
    accent: "#9b72aa",
    description: "How Google runs production systems with reliability at scale."
  }
];

export function createBookStore() {
  let books = structuredClone(initialBooks);

  return {
    all() {
      return structuredClone(books);
    },
    updateStock(id, change) {
      const book = books.find((item) => item.id === id);
      if (!book) {
        return null;
      }

      const nextStock = book.stock + change;
      if (nextStock < 0) {
        return { error: "Insufficient stock", book: structuredClone(book) };
      }

      book.stock = nextStock;
      return { book: structuredClone(book) };
    }
  };
}
