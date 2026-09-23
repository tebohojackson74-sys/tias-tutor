import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export async function healthcheck(): Promise<void> {
  await pool.query("SELECT 1");
}
