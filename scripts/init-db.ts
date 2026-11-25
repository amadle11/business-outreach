import { db } from "../lib/db";
db().then(() => {
  console.log("Database ready:", process.env.DATABASE_URL || "file:local.db");
  process.exit(0);
});
