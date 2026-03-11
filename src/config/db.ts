import { Pool, QueryResult } from "pg";

let pool: Pool;

const getPool = (): Pool => {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.warn("⚠️ DATABASE_URL environment variable is not set.");
      // Render sometimes runs `npm start` or similar during build without env vars.
      // We throw inside the query execution rather than at pool creation time.
      return null as any; 
    }
    const dbUrl = new URL(process.env.DATABASE_URL);
    pool = new Pool({
      host: dbUrl.hostname,
      port: Number(dbUrl.port) || 5432,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
    });
  }
  return pool;
};

export const query = async (text: string, params?: unknown[]): Promise<QueryResult> => {
  const p = getPool();
  if (!p) throw new Error("Database not connected (DATABASE_URL missing)");
  return p.query(text, params);
};

export const initDb = async (): Promise<void> => {
  const p = getPool();
  if (!p) {
    console.warn("⚠️ Skipping table creation because DATABASE_URL is not set.");
    return;
  }
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS contacts (
      id              SERIAL PRIMARY KEY,
      phone_number    VARCHAR(20),
      email           VARCHAR(255),
      linked_id       INT REFERENCES contacts(id),
      link_precedence VARCHAR(10) NOT NULL CHECK (link_precedence IN ('primary', 'secondary')),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at      TIMESTAMPTZ
    );
  `;
  await getPool().query(createTableQuery);

  await getPool().query(`
    CREATE INDEX IF NOT EXISTS idx_contacts_email        ON contacts (email)        WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts (phone_number) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_contacts_linked_id    ON contacts (linked_id)    WHERE deleted_at IS NULL;
  `);

  console.log("Database initialised — contacts table and indexes ready");
};

export default getPool;
