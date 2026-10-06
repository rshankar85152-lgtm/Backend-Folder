const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { timingSafeEqual } = require('node:crypto');

dotenv.config();

const { pool, initializeDatabase } = require('./wallet');
const app = express();
const PORT = Number(process.env.PORT) || 5000;
const walletUsername = process.env.WALLET_USERNAME;
const walletPassword = process.env.WALLET_PASSWORD;

app.use(express.json());
app.use(['/wallet', '/api/wallet'], requireWalletAuth);
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.send('Mera Backend Server Successfully Start Ho Gya And How are you everyone !');
});

app.get('/wallet', (req, res) => {
    res.sendFile(path.join(__dirname, 'wallet.html'));
});

function validateWalletCredentials() {
    if (!walletUsername || walletUsername.includes(':')
        || !walletPassword || walletPassword.length < 16) {
        throw new Error(
            'Set WALLET_USERNAME and a WALLET_PASSWORD of at least 16 characters before starting the server.'
        );
    }
}

function requireWalletAuth(req, res, next) {
    if (!walletUsername || walletUsername.includes(':')
        || !walletPassword || walletPassword.length < 16) {
        return res.status(503).json({ error: 'Wallet authentication is not configured.' });
    }

    const authorization = req.get('authorization') || '';
    const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
    const expectedCredentials = Buffer.from(`${walletUsername}:${walletPassword}`, 'utf8');
    const providedCredentials = match ? Buffer.from(match[1], 'base64') : Buffer.alloc(0);
    const credentialsMatch = match
        && providedCredentials.toString('base64') === match[1]
        && providedCredentials.length === expectedCredentials.length
        && timingSafeEqual(providedCredentials, expectedCredentials);

    if (!credentialsMatch) {
        res.set('WWW-Authenticate', 'Basic realm="Wallet", charset="UTF-8"');
        return res.status(401).json({ error: 'Wallet authentication required.' });
    }

    next();
}

app.get('/api/wallet', async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';

    if ((req.query.search !== undefined && typeof req.query.search !== 'string')
        || (req.query.from !== undefined && typeof req.query.from !== 'string')
        || (req.query.to !== undefined && typeof req.query.to !== 'string')
        || search.length > 100
        || (from && !isCalendarDate(from))
        || (to && !isCalendarDate(to))
        || (from && to && from > to)) {
        return res.status(400).json({ error: 'Enter a valid search and date range.' });
    }

    const filters = [];
    const values = [];
    if (search) {
        values.push(search);
        filters.push(`POSITION(LOWER($${values.length}) IN LOWER(receiver)) > 0`);
    }
    if (from) {
        values.push(from);
        filters.push(`created_at::date >= $${values.length}::date`);
    }
    if (to) {
        values.push(to);
        filters.push(`created_at::date <= $${values.length}::date`);
    }

    const resultLimit = filters.length ? 100 : 20;
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    try {
        const [walletResult, transactionsResult, summaryResult] = await Promise.all([
            pool.query('SELECT balance FROM wallets WHERE id = 1'),
            pool.query(
                `SELECT id, receiver, amount, status, transaction_type, created_at
                 FROM wallet_transactions
                 ${whereClause}
                 ORDER BY created_at DESC, id DESC
                 LIMIT ${resultLimit + 1}`,
                values
            ),
            pool.query(
                `SELECT
                    COALESCE(SUM(amount) FILTER (
                        WHERE transaction_type = 'send' AND status = 'success'
                    ), 0) AS monthly_spent,
                    COUNT(*) FILTER (
                        WHERE transaction_type = 'send' AND status = 'success'
                    ) AS monthly_send_count
                 FROM wallet_transactions
                 WHERE created_at >= date_trunc('month', CURRENT_TIMESTAMP)
                   AND created_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'`
            )
        ]);
        const summary = summaryResult.rows[0];

        res.json({
            balance: Number(walletResult.rows[0].balance),
            transactions: transactionsResult.rows.slice(0, resultLimit),
            hasMore: transactionsResult.rows.length > resultLimit,
            limit: resultLimit,
            summary: {
                monthlySpent: Number(summary.monthly_spent),
                monthlySendCount: Number(summary.monthly_send_count)
            }
        });
    } catch (error) {
        console.error('Failed to load wallet:', error);
        res.status(500).json({ error: 'Wallet data could not be loaded.' });
    }
});

function isCalendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

app.post('/api/wallet/topups', async (req, res) => {
    const amount = req.body.amount;

    if (typeof amount !== 'number' || !Number.isFinite(amount)
        || amount <= 0 || amount > 9999999999.99) {
        return res.status(400).json({ error: 'Enter a valid demo top-up amount.' });
    }

    const amountInCents = Math.round(amount * 100);
    if (amountInCents <= 0) {
        return res.status(400).json({ error: 'Amount must be at least ₹0.01.' });
    }

    let client;
    let transactionStarted = false;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        const walletResult = await client.query(
            'SELECT balance FROM wallets WHERE id = 1 FOR UPDATE'
        );
        const balanceInCents = Math.round(Number(walletResult.rows[0].balance) * 100);
        const maximumBalanceInCents = 999999999999;

        if (balanceInCents + amountInCents > maximumBalanceInCents) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(400).json({
                error: 'Demo top-up is too large for the wallet balance limit.'
            });
        }

        const updatedWallet = await client.query(
            `UPDATE wallets
             SET balance = balance + $1
             WHERE id = 1
             RETURNING balance`,
            [amountInCents / 100]
        );
        const transactionResult = await client.query(
            `INSERT INTO wallet_transactions (receiver, amount, status, transaction_type)
             VALUES ('Demo wallet', $1, 'success', 'topup')
             RETURNING id, receiver, amount, status, transaction_type, created_at`,
            [amountInCents / 100]
        );
        await client.query('COMMIT');
        transactionStarted = false;

        res.status(201).json({
            balance: Number(updatedWallet.rows[0].balance),
            transaction: transactionResult.rows[0],
            message: 'Demo balance added. No real payment was made.'
        });
    } catch (error) {
        if (client && transactionStarted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Failed to roll back demo wallet top-up:', rollbackError);
            }
        }
        console.error('Failed to add demo wallet balance:', error);
        res.status(500).json({ error: 'Demo balance could not be added.' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

app.post('/api/wallet/transactions', async (req, res) => {
    const receiver = typeof req.body.receiver === 'string' ? req.body.receiver.trim() : '';
    const amount = req.body.amount;

    if (!receiver || receiver.length > 100 || typeof amount !== 'number'
        || !Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
        return res.status(400).json({ error: 'Enter a receiver and a valid amount.' });
    }

    const amountInCents = Math.round(amount * 100);
    if (amountInCents <= 0) {
        return res.status(400).json({ error: 'Amount must be at least ₹0.01.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const walletResult = await client.query(
            'SELECT balance FROM wallets WHERE id = 1 FOR UPDATE'
        );
        const balanceInCents = Math.round(Number(walletResult.rows[0].balance) * 100);

        if (amountInCents > balanceInCents) {
            await client.query(
                `INSERT INTO wallet_transactions (receiver, amount, status, transaction_type)
                 VALUES ($1, $2, 'failed', 'send')`,
                [receiver, amountInCents / 100]
            );
            await client.query('COMMIT');
            return res.status(400).json({
                error: 'Failed: balance kam hai.',
                balance: balanceInCents / 100
            });
        }

        const updatedWallet = await client.query(
            `UPDATE wallets
             SET balance = balance - $1
             WHERE id = 1
             RETURNING balance`,
            [amountInCents / 100]
        );
        const transactionResult = await client.query(
            `INSERT INTO wallet_transactions (receiver, amount, status, transaction_type)
             VALUES ($1, $2, 'success', 'send')
             RETURNING id, receiver, amount, status, transaction_type, created_at`,
            [receiver, amountInCents / 100]
        );
        await client.query('COMMIT');

        res.status(201).json({
            balance: Number(updatedWallet.rows[0].balance),
            transaction: transactionResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to send wallet transaction:', error);
        res.status(500).json({ error: 'Transaction could not be completed.' });
    } finally {
        client.release();
    }
});

async function startServer() {
    validateWalletCredentials();
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error('Could not start server. Check that PostgreSQL and wallet authentication are configured.', error);
        process.exitCode = 1;
    });
}

module.exports = { app, startServer };
