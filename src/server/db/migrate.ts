import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./index";

migrate(db, { migrationsFolder: "./src/server/db/migrations" });
console.log("Migrations applied");
