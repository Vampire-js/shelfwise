export async function getBooks() {
  const response = await fetch("/api/books");
  if (!response.ok) {
    throw new Error("Could not load the catalog");
  }
  return response.json();
}

export async function changeStock(id, change) {
  const response = await fetch(`/api/books/${id}/stock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ change })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not update stock");
  }
  return data;
}
