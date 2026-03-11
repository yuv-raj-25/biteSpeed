import { Pool, QueryResult } from "pg";

let pool: Pool;

const getPool = (): Pool => {
  if (!pool) {
    const dbUrl = new URL(process.env.DATABASE_URL!);
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

export const query = (text: string, params?: unknown[]): Promise<QueryResult> => {
  return getPool().query(text, params);
};

export const initDb = async (): Promise<void> => {
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
