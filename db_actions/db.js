// --- db_actions/db.js ---
require('dotenv').config();
const { Pool, types } = require('pg');

// Заставляем pg возвращать BIGINT (например, COUNT(*)) как обычное число, а не строку
types.setTypeParser(20, (val) => parseInt(val, 10));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/zeer_db',
    max: 20, // Лимит соединений в пуле (важно для нагрузочного тестирования k6!)
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function connectToDb() {
    const client = await pool.connect();
    console.log('PostgreSQL has successfully connected');
    client.release();
}

function getDb() {
    return pool;
}

module.exports = { connectToDb, getDb, pool };
