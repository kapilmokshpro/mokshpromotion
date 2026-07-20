const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        await client.connect();
        const res = await client.query('SELECT id, email, role FROM "User" WHERE email = $1', ['gohypemediatech@gmail.com']);
        console.log('Result for gohypemediatech@gmail.com:', res.rows);
        const res2 = await client.query('SELECT id, email, role FROM "User" LIMIT 10');
        console.log('First 10 users in DB:', res2.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}

check();
