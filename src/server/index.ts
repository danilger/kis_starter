import { app } from "./app";

const port = Number(process.env.PORT ?? 8787);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`API listening on http://localhost:${server.port}`);
