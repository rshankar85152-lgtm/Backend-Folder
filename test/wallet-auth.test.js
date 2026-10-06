const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

process.env.WALLET_USERNAME = 'wallet-test-user';
process.env.WALLET_PASSWORD = 'test-password-long-enough';

const { app } = require('../server');
let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});

test('wallet page and API reject unauthenticated requests', async () => {
    for (const path of ['/wallet', '/api/wallet']) {
        const response = await fetch(`${baseUrl}${path}`);
        assert.equal(response.status, 401);
        assert.match(response.headers.get('www-authenticate'), /^Basic realm="Wallet"/);
    }
});

test('wallet page rejects invalid credentials and accepts valid credentials', async () => {
    const invalidResponse = await fetch(`${baseUrl}/wallet`, {
        headers: { Authorization: `Basic ${Buffer.from('wallet-test-user:wrong-password').toString('base64')}` }
    });
    assert.equal(invalidResponse.status, 401);

    const validResponse = await fetch(`${baseUrl}/wallet`, {
        headers: {
            Authorization: `Basic ${Buffer.from('wallet-test-user:test-password-long-enough').toString('base64')}`
        }
    });
    assert.equal(validResponse.status, 200);
    assert.match(await validResponse.text(), /Demo Wallet/);
});
