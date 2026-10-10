import { createApp } from "./app.js";

const port = Number(process.env.PORT || 3002);
const app = createApp();

app.listen(port, "0.0.0.0", () => {
  console.log(`Bookstore API listening on port ${port}`);
});
