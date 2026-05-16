import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

let _db: NeonHttpDatabase | null = null;

function getDb(): NeonHttpDatabase {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  _db = drizzle(neon(url));
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as unknown as object, prop, receiver);
  },
});
