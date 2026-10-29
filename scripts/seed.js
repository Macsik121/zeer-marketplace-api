// --- scripts/seed.js ---
// Скрипт генерации тестовых данных для нагрузочного тестирования
// Запуск: node scripts/seed.js

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/zeer_db',
    max: 10
});

const TOTAL_USERS = 50000;
const BATCH_SIZE = 1000;

async function seed() {
    console.log(`Starting seed: ${TOTAL_USERS} users...`);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Генерация пользователей
        console.log('Generating users...');
        for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
            const values = [];
            const params = [];
            for (let j = 0; j < BATCH_SIZE && i + j < TOTAL_USERS; j++) {
                const idx = j * 6;
                values.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6})`);
                params.push(
                    `user_${i + j}`, // name
                    `user_${i + j}@test.com`, // email
                    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4wqO.4aYbYBMYyAe', // password (test123)
                    ['#c00', '#f60', '#6f6', '#03c', '#33f', '#60c', '#1E75FF'][j % 7], // avatar
                    new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // registered_at
                    'simple' // role
                );
            }

            await client.query(`
                INSERT INTO users (name, email, password, avatar, registered_at, role)
                VALUES ${values.join(', ')}
            `, params);

            console.log(`  Users: ${Math.min(i + BATCH_SIZE, TOTAL_USERS)}/${TOTAL_USERS}`);
        }

        // 2. Генерация подписок (каждый 3-й пользователь имеет подписку)
        console.log('Generating subscriptions...');
        const products = (await client.query('SELECT id FROM products')).rows;
        let subCount = 0;

        for (let i = 0; i < TOTAL_USERS; i += 3) {
            const userId = i + 1;
            const productId = products[Math.floor(Math.random() * products.length)].id;
            const days = [30, 90, 365][Math.floor(Math.random() * 3)];
            const activeUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

            await client.query(`
                INSERT INTO subscription (product_id, user_id, status, active_until, was_freezed)
                VALUES ($1, $2, 'active', $3, false)
            `, [productId, userId, activeUntil]);

            subCount++;
            if (subCount % 1000 === 0) console.log(`  Subscriptions: ${subCount}`);
        }

        // 3. Генерация ключей
        console.log('Generating keys...');
        for (const product of products) {
            for (let i = 0; i < 100; i++) {
                await client.query(`
                    INSERT INTO products_keys (product_id, key, days_to_add, activations_amount, used_amount, is_used)
                    VALUES ($1, $2, $3, 1, 0, false)
                `, [product.id, `KEY-${product.id}-${i}-${Math.random().toString(36).substring(7)}`, 30]);
            }
        }

        // 4. Генерация промокодов
        console.log('Generating promocodes...');
        for (const product of products) {
            for (let i = 0; i < 20; i++) {
                await client.query(`
                    INSERT INTO products_promocodes (product_id, promocode, discount_percent, expired_at, activations_amount, used_amount, is_used)
                    VALUES ($1, $2, $3, $4, 100, 0, false)
                `, [
                    product.id,
                    `PROMO-${product.id}-${i}`,
                    Math.floor(Math.random() * 30) + 5,
                    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                ]);
            }
        }

        // 5. Генерация логов
        console.log('Generating logs...');
        for (let i = 0; i < 5000; i++) {
            await client.query(`
                INSERT INTO action_logs (happened_at, user_name, action, ip, location)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                `user_${Math.floor(Math.random() * TOTAL_USERS)}`,
                ['Вход в систему', 'Покупка продукта', 'Активация ключа'][Math.floor(Math.random() * 3)],
                `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                'Moscow, Russia'
            ]);
        }

        await client.query('COMMIT');
        console.log('Seed completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Seed failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
