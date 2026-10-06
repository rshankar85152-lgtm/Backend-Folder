const { Pool } = require('pg');

const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.PGHOST || 'localhost',
            port: Number(process.env.PGPORT) || 5432,
            database: process.env.PGDATABASE || 'wallet_db',
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'postgres'
        }
);

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS wallets (
            id SMALLINT PRIMARY KEY CHECK (id = 1),
            balance NUMERIC(12, 2) NOT NULL CHECK (balance >= 0)
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS wallet_transactions (
            id BIGSERIAL PRIMARY KEY,
            receiver VARCHAR(100) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
            status VARCHAR(10) NOT NULL CHECK (status IN ('success', 'failed')),
            transaction_type VARCHAR(10) NOT NULL DEFAULT 'send'
                CHECK (transaction_type IN ('send', 'topup')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`
        ALTER TABLE wallet_transactions
        ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(10) NOT NULL DEFAULT 'send'
            CHECK (transaction_type IN ('send', 'topup'))
    `);
    await pool.query(
        'INSERT INTO wallets (id, balance) VALUES (1, 100000.00) ON CONFLICT (id) DO NOTHING'
    );
}

module.exports = { pool, initializeDatabase };
