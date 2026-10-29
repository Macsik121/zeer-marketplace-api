// --- db_actions/products.js ---
const { getDb } = require('./db');
const createLog = require('../createLog');
const updateDate = require('../update-date');
const { createPurchase } = require('./purchases');
const { createProfit } = require('./profit');
const updateSubscriptions = require('./updateSubscriptions');

// Собирает полный объект Product из 8 связанных таблиц PostgreSQL
async function buildFullProduct(db, productRow) {
    if (!productRow) return null;
    const productId = productRow.id;

    // 1. Общая информация (products_general_info)
    const { rows: genRows } = await db.query(
        'SELECT * FROM products_general_info WHERE product_id = $1',
        [productId]
    );
    const gen = genRows[0] || {};

    // 2. Информация для главной страницы (products_homepage_info)
    const { rows: homeRows } = await db.query(
        'SELECT * FROM products_homepage_info WHERE product_id = $1',
        [productId]
    );
    const home = homeRows[0] || {};

    // 3. Характеристики (products_characteristics)
    const { rows: charRows } = await db.query(
        'SELECT * FROM products_characteristics WHERE product_id = $1',
        [productId]
    );
    const ch = charRows[0] || {};
    const characteristics = {
        version: ch.version || '',
        osSupport: ch.os_support || '',
        cpuSupport: ch.cpu_support || '',
        gameMode: ch.game_mode || '',
        developer: ch.developer || '',
        supportedAntiCheats: ch.supported_anti_cheats || ''
    };

    // 4. Цены (products_costs)
    const { rows: costRows } = await db.query(
        'SELECT cost, cost_per_period AS "costPer", menu_text AS "menuText", days FROM products_costs WHERE product_id = $1',
        [productId]
    );
    const findCostByDays = (d) => {
        const found = costRows.find(c => c.days === d);
        return found ? found.cost : 0;
    };
    const cost = {
        perDay: findCostByDays(1) || gen.cost_per_day || 0,
        perMonth: findCostByDays(30),
        perYear: findCostByDays(365)
    };

    // 5. История изменений / Новости (products_changes)
    const { rows: changeRows } = await db.query(`
        SELECT change_id AS id, version, created_at AS created, description
        FROM products_changes
        WHERE product_id = $1
        ORDER BY change_id ASC
    `, [productId]);

    // 6. Ключи (products_keys)
    const { rows: keyRows } = await db.query(`
        SELECT
            key AS name,
            days_to_add AS "expiredInDays",
            activations_amount AS "activationsAmount",
            COALESCE(used_amount, 0) AS "usedAmount",
            COALESCE(is_used, false) AS "isUsed"
        FROM products_keys
        WHERE product_id = $1
        ORDER BY id ASC
    `, [productId]);

    const keys = {
        all: keyRows,
        active: keyRows.filter(k => k.usedAmount < k.activationsAmount),
        unactive: keyRows.filter(k => k.usedAmount >= k.activationsAmount)
    };

    // 7. Промокоды (products_promocodes)
    const { rows: promoRows } = await db.query(`
        SELECT
            promocode AS name,
            discount_percent AS "discountPercent",
            COALESCE(used_amount, 0) AS "activationsAmount",
            COALESCE(activations_amount, 1) AS "promocodesAmount",
            expired_at AS "expirationDays",
            COALESCE(is_used, false) AS "isUsed"
        FROM products_promocodes
        WHERE product_id = $1
        ORDER BY id ASC
    `, [productId]);

    const now = new Date();
    const promocodes = {
        all: promoRows,
        active: promoRows.filter(p => !p.isUsed && new Date(p.expirationDays) >= now && p.activationsAmount < p.promocodesAmount),
        unactive: promoRows.filter(p => p.isUsed || new Date(p.expirationDays) < now || p.activationsAmount >= p.promocodesAmount)
    };

    // 8. Покупатели (products_people_bought + users)
    const { rows: boughtRows } = await db.query(`
        SELECT DISTINCT u.id, u.name, u.avatar
        FROM products_people_bought ppb
        JOIN users u ON u.id = ppb.user_id
        WHERE ppb.product_id = $1
    `, [productId]);

    return {
        id: productRow.id,
        title: productRow.title,
        productFor: productRow.product_for,
        cost,
        allCost: costRows,
        costPerDay: gen.cost_per_day || 0,
        costPerDayInfo: home.cost_from || 0,
        imageURL: home.image_homepage || '',
        imageURLdashboard: productRow.image_dashboard || '',
        logo: productRow.image_logo || '',
        reloading: gen.update_frequency || '',
        workingTime: gen.working_time || '',
        characteristics,
        description: productRow.description || '',
        changes: changeRows,
        locks: String(gen.bans_count ?? 0),
        keys,
        peopleBought: boughtRows,
        timeBought: productRow.bought_times || 0,
        currentDate: new Date(),
        promocodes,
        status: productRow.status || 'undetect',
        locationOnclick: productRow.location_onclick || `/dashboard/products/${productRow.title}`
    };
}

async function getProducts() {
    try {
        const db = getDb();
        const { rows } = await db.query('SELECT * FROM products ORDER BY id ASC');
        const products = await Promise.all(rows.map(r => buildFullProduct(db, r)));
        if (typeof updateDate === 'function') updateDate(products, db);
        return products;
    } catch (error) {
        console.log(error);
    }
}

async function getPopularProducts(_, { amountToGet = 3 }) {
    try {
        const db = getDb();
        const { rows: popRows } = await db.query(`
            SELECT * FROM products
            WHERE bought_times >= 30
            ORDER BY bought_times DESC
            LIMIT $1
        `, [amountToGet]);

        let finalRows = [...popRows];

        if (finalRows.length < amountToGet) {
            const existingIds = finalRows.map(r => r.id);
            const { rows: restRows } = await db.query(`
                SELECT * FROM products
                WHERE NOT (id = ANY($1::int[]))
                ORDER BY id ASC
                LIMIT $2
            `, [existingIds.length ? existingIds : [0], amountToGet - finalRows.length]);
            finalRows = finalRows.concat(restRows);
        }

        const popularProducts = await Promise.all(finalRows.map(r => buildFullProduct(db, r)));
        if (typeof updateDate === 'function') updateDate(popularProducts, db);
        return popularProducts;
    } catch (error) {
        console.log(error);
    }
}

async function buyProduct(_, {
    title,
    name,
    navigator,
    isKey = false,
    productCost,
    issueSub = false,
    days = 30,
    locationData
}) {
    try {
        const db = getDb();
        const { rows: uRows } = await db.query('SELECT * FROM users WHERE name = $1', [name]);
        const { rows: pRows } = await db.query('SELECT * FROM products WHERE title = $1', [title]);
        if (!uRows[0] || !pRows[0]) return null;

        const user = uRows[0];
        const product = pRows[0];

        // 1. Проверяем, покупал ли уже этот пользователь данный продукт
        const { rows: boughtCheck } = await db.query(
            'SELECT 1 FROM products_people_bought WHERE product_id = $1 AND user_id = $2 LIMIT 1',
            [product.id, user.id]
        );
        if (!boughtCheck[0]) {
            await db.query(
                'INSERT INTO products_people_bought (product_id, user_id, bought_at) VALUES ($1, $2, NOW())',
                [product.id, user.id]
            );
        }

        // 2. Проверяем наличие подписки на этот продукт
        const { rows: subRows } = await db.query(
            'SELECT * FROM subscription WHERE user_id = $1 AND product_id = $2 LIMIT 1',
            [user.id, product.id]
        );

        if (!subRows[0]) {
            const activelyUntil = new Date();
            activelyUntil.setDate(activelyUntil.getDate() + days);

            await db.query(`
                INSERT INTO subscription (product_id, user_id, status, freezed_at, active_until, was_freezed)
                VALUES ($1, $2, 'active', NULL, $3, false)
            `, [product.id, user.id, activelyUntil]);
        } else {
            const existingSub = subRows[0];
            let baseDate = new Date(existingSub.active_until);
            if (baseDate - new Date() < 0) {
                baseDate = new Date();
            }
            baseDate.setDate(baseDate.getDate() + days);

            await db.query(`
                UPDATE subscription
                SET active_until = $1, status = 'active'
                WHERE subscription_id = $2
            `, [baseDate, existingSub.subscription_id]);
        }

        // 3. Если покупка за деньги (не активация ключа) — увеличиваем счетчик покупок и пишем статистику
        if (!isKey) {
            await db.query(
                'UPDATE products SET bought_times = COALESCE(bought_times, 0) + 1 WHERE id = $1',
                [product.id]
            );
            if (!issueSub) {
                await createPurchase();
                await createProfit(productCost);
                createLog({
                    log: { name: user.name, action: `Покупка продукта ${title}` },
                    navigator,
                    locationData
                });
            }
        }

        const { rows: updatedProd } = await db.query('SELECT * FROM products WHERE id = $1', [product.id]);
        return await buildFullProduct(db, updatedProd[0]);
    } catch (error) {
        console.log(error);
    }
}

async function getProduct(_, { title }) {
    try {
        const db = getDb();
        const { rows } = await db.query('SELECT * FROM products WHERE title = $1 LIMIT 1', [title]);
        if (!rows[0]) return null;
        const product = await buildFullProduct(db, rows[0]);
        if (typeof updateDate === 'function') updateDate(product, db);
        return product;
    } catch (error) {
        console.log(error);
    }
}

async function updateBoughtIcon(_, { name, newAvatar }) {
    try {
        const db = getDb();
        // В реляционной БД достаточно обновить аватар в таблице users,
        // так как peopleBought собирается через JOIN с users!
        await db.query('UPDATE users SET avatar = $1 WHERE name = $2', [newAvatar, name]);
        return {
            success: true,
            message: 'Иконка успешно обновилась'
        };
    } catch (error) {
        console.log(error);
    }
}

async function freezeSubscription(_, { name, title }) {
    try {
        const db = getDb();
        await db.query(`
            UPDATE subscription s
            SET status = 'freezed',
                was_freezed = true,
                freezed_at = NOW()
            FROM users u, products p
            WHERE s.user_id = u.id AND s.product_id = p.id
              AND u.name = $1 AND p.title = $2
        `, [name, title]);

        return {
            success: true,
            message: 'Подписка успешно заморожена!'
        };
    } catch (error) {
        console.log(error);
    }
}

async function unfreezeSubscription(_, { name, title }) {
    try {
        const db = getDb();
        const { rows } = await db.query(`
            SELECT s.*
            FROM subscription s
            JOIN users u ON u.id = s.user_id
            JOIN products p ON p.id = s.product_id
            WHERE u.name = $1 AND p.title = $2
            LIMIT 1
        `, [name, title]);

        if (rows[0]) {
            const sub = rows[0];
            const freezeTime = sub.freezed_at ? new Date(sub.freezed_at).getTime() : Date.now();
            const currentDate = Date.now();
            const activelyUntil = new Date(sub.active_until).getTime();
            const difference = Math.abs(currentDate - freezeTime);
            const newActiveUntil = new Date(activelyUntil + difference);

            await db.query(`
                UPDATE subscription
                SET status = 'active',
                    active_until = $1
                WHERE subscription_id = $2
            `, [newActiveUntil, sub.subscription_id]);
        }

        return {
            success: true,
            message: 'Подписка успешно разморожена!'
        };
    } catch (error) {
        console.log(error);
    }
}

async function createKeys(_, { key, title, navigator, username, locationData }) {
    try {
        const db = getDb();
        const { name, daysAmount, activationsAmount } = key;
        const { rows: pRows } = await db.query('SELECT id FROM products WHERE title = $1', [title]);
        if (!pRows[0]) return 'Продукт не найден';
        const productId = pRows[0].id;

        const keyNames = Array.isArray(name) ? name : [name];

        for (const kName of keyNames) {
            await db.query(`
                INSERT INTO products_keys (product_id, key, days_to_add, activations_amount, used_amount, is_used)
                VALUES ($1, $2, $3, $4, 0, false)
            `, [productId, kName, daysAmount, activationsAmount]);
        }

        createLog({
            log: {
                name: username,
                action: `Добавление ключей ${keyNames.join(', ')}`
            },
            navigator,
            locationData
        });

        return 'Вы успешно создали ключ';
    } catch (error) {
        console.log(error);
    }
}

async function deleteKey(_, { keyName, title, navigator, name, locationData }) {
    try {
        const db = getDb();
        await db.query(`
            DELETE FROM products_keys pk
            USING products p
            WHERE pk.product_id = p.id AND p.title = $1 AND pk.key = $2
        `, [title, keyName]);

        createLog({
            log: { name, action: `Удаление ключа ${keyName}` },
            navigator,
            locationData
        });
        return 'Ключь успешно удалён';
    } catch (error) {
        console.log(error);
    }
}

async function deleteAllKeys(_, { title }) {
    try {
        const db = getDb();
        await db.query(`
            DELETE FROM products_keys pk
            USING products p
            WHERE pk.product_id = p.id AND p.title = $1
        `, [title]);

        return `Вы успешно удалил все ключи у продукта ${title}`;
    } catch (error) {
        console.log(error);
    }
}

async function createPromocode(_, { promocode, title, navigator, username, locationData }) {
    try {
        const db = getDb();
        const { name, discountPercent, activationsAmount, expirationDays, isUsed } = promocode;

        const { rows: pRows } = await db.query('SELECT id FROM products WHERE title = $1', [title]);
        if (!pRows[0]) return null;
        const productId = pRows[0].id;

        const { rows: existing } = await db.query(
            'SELECT 1 FROM products_promocodes WHERE product_id = $1 AND promocode = $2',
            [productId, name]
        );

        if (existing[0]) {
            return {
                name: '',
                discountPercent: 0,
                activationsAmount: 0,
                promocodesAmount: 0,
                expirationDays: new Date(0),
                isUsed: false
            };
        }

        const { rows: inserted } = await db.query(`
            INSERT INTO products_promocodes (
                product_id, promocode, discount_percent, expired_at, activations_amount, used_amount, is_used
            )
            VALUES ($1, $2, $3, $4, $5, 0, $6)
            RETURNING
                promocode AS name,
                discount_percent AS "discountPercent",
                used_amount AS "activationsAmount",
                activations_amount AS "promocodesAmount",
                expired_at AS "expirationDays",
                is_used AS "isUsed"
        `, [productId, name, discountPercent, new Date(expirationDays), activationsAmount, Boolean(isUsed)]);

        createLog({
            log: { name: username, action: `Создание промокода ${name}` },
            navigator,
            locationData
        });

        return inserted[0];
    } catch (error) {
        console.log(error);
    }
}

async function deletePromocode(_, { productTitle, promocodeTitle, navigator, name, locationData }) {
    try {
        const db = getDb();
        await db.query(`
            DELETE FROM products_promocodes pp
            USING products p
            WHERE pp.product_id = p.id AND p.title = $1 AND pp.promocode = $2
        `, [productTitle, promocodeTitle]);

        createLog({
            log: { name, action: `Удаление промокода ${promocodeTitle}` },
            navigator,
            locationData
        });

        return 'Промокод успешно удалён';
    } catch (error) {
        console.log(error);
    }
}

async function deleteAllPromocodes(_, { title }) {
    try {
        const db = getDb();
        const { rows: pRows } = await db.query('SELECT * FROM products WHERE title = $1', [title]);
        if (!pRows[0]) return null;

        await db.query('DELETE FROM products_promocodes WHERE product_id = $1', [pRows[0].id]);
        return await buildFullProduct(db, pRows[0]);
    } catch (error) {
        console.log(error);
    }
}

async function activateKey(_, { keyName, username, navigator, locationData }) {
    try {
        const db = getDb();
        const { rows: uRows } = await db.query('SELECT * FROM users WHERE name = $1', [username]);
        if (!uRows[0]) return { success: false, message: 'Пользователь не найден' };
        const user = uRows[0];

        const { rows: keyRows } = await db.query(`
            SELECT pk.*, p.title AS product_title
            FROM products_keys pk
            JOIN products p ON p.id = pk.product_id
            WHERE pk.key = $1
            LIMIT 1
        `, [keyName]);

        if (!keyRows[0]) {
            return { success: false, message: 'Такого ключа не существует' };
        }

        const matchedKey = keyRows[0];

        if ((matchedKey.used_amount || 0) >= matchedKey.activations_amount) {
            return {
                success: false,
                message: 'Количество активаций на этот ключ законичлось'
            };
        }

        // Проверяем, активировал ли пользователь этот ключ ранее
        const { rows: usedRows } = await db.query(`
            SELECT * FROM users_used_keys
            WHERE user_id = $1 AND key_id = $2
            LIMIT 1
        `, [user.id, matchedKey.id]);

        if (usedRows[0]) {
            const hoursDiff = Math.abs(Date.now() - new Date(usedRows[0].activated_at).getTime()) / 36e5;
            if (hoursDiff < 12) {
                return {
                    success: false,
                    message: 'Активировать следующий ключ, можно только через 12ч'
                };
            }
        }

        // Выдаем подписку через buyProduct (с флагом isKey: true)
        await buyProduct(_, {
            title: matchedKey.product_title,
            name: username,
            navigator,
            isKey: true,
            days: matchedKey.days_to_add,
            locationData
        });

        // Увеличиваем счетчик использований ключа
        await db.query(`
            UPDATE products_keys
            SET used_amount = COALESCE(used_amount, 0) + 1,
                is_used = true
            WHERE id = $1
        `, [matchedKey.id]);

        if (!usedRows[0]) {
            await db.query(
                'INSERT INTO users_used_keys (key_id, user_id, activated_at) VALUES ($1, $2, NOW())',
                [matchedKey.id, user.id]
            );
        } else {
            await db.query(
                'UPDATE users_used_keys SET activated_at = NOW() WHERE key_id = $1 AND user_id = $2',
                [matchedKey.id, user.id]
            );
        }

        createLog({
            log: { name: username, action: `Активация ключа ${matchedKey.key}` },
            navigator,
            locationData
        });

        return {
            success: true,
            message: `Поздравляем, вы успешно активировали ключ. Теперь у вас появилась подписка на ${matchedKey.product_title}`
        };
    } catch (error) {
        console.log(error);
    }
}

async function editProduct(_, { product, navigator, adminName, locationData }) {
    try {
        const db = getDb();
        const { oldTitle, newTitle } = product;
        const targetTitle = newTitle || product.title || oldTitle;

        const { rows: pRows } = await db.query('SELECT * FROM products WHERE title = $1', [oldTitle]);
        if (!pRows[0]) return null;
        const productId = pRows[0].id;

        // 1. Обновляем базовую таблицу products
        await db.query(`
            UPDATE products
            SET title = COALESCE($1, title),
                product_for = COALESCE($2, product_for),
                image_dashboard = COALESCE($3, image_dashboard),
                image_logo = COALESCE($4, image_logo),
                description = COALESCE($5, description),
                status = COALESCE($6, status),
                location_onclick = COALESCE($7, location_onclick)
            WHERE id = $8
        `, [
            targetTitle,
            product.productFor,
            product.imageURLdashboard,
            product.logo,
            product.description,
            product.status,
            `/dashboard/products/${targetTitle}`,
            productId
        ]);

        // 2. Обновляем products_general_info
        await db.query(`
            UPDATE products_general_info
            SET working_time = COALESCE($1, working_time),
                bans_count = COALESCE($2, bans_count),
                update_frequency = COALESCE($3, update_frequency),
                cost_per_day = COALESCE($4, cost_per_day)
            WHERE product_id = $5
        `, [
            product.workingTime,
            product.locks !== undefined ? parseInt(product.locks, 10) || 0 : null,
            product.reloading,
            product.costPerDay,
            productId
        ]);

        // 3. Обновляем products_homepage_info
        if (product.imageURL !== undefined || product.costPerDayInfo !== undefined) {
            await db.query(`
                UPDATE products_homepage_info
                SET image_homepage = COALESCE($1, image_homepage),
                    cost_from = COALESCE($2, cost_from)
                WHERE product_id = $3
            `, [product.imageURL, product.costPerDayInfo, productId]);
        }

        // 4. Обновляем характеристики
        if (product.characteristics) {
            const ch = product.characteristics;
            await db.query(`
                UPDATE products_characteristics
                SET version = COALESCE($1, version),
                    os_support = COALESCE($2, os_support),
                    cpu_support = COALESCE($3, cpu_support),
                    game_mode = COALESCE($4, game_mode),
                    developer = COALESCE($5, developer),
                    supported_anti_cheats = COALESCE($6, supported_anti_cheats)
                WHERE product_id = $7
            `, [
                ch.version,
                ch.osSupport,
                ch.cpuSupport,
                ch.gameMode,
                ch.developer,
                ch.supportedAntiCheats,
                productId
            ]);
        }

        createLog({
            log: { name: adminName, action: `Изменение продукта ${oldTitle}` },
            navigator,
            locationData
        });

        const { rows: updated } = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
        return await buildFullProduct(db, updated[0]);
    } catch (error) {
        console.log(error);
    }
}

async function deleteProduct(_, { title, navigator, name, locationData }) {
    try {
        const db = getDb();
        // Благодаря ON DELETE CASCADE все связанные записи (включая подписки) удалятся сами
        await db.query('DELETE FROM products WHERE title = $1', [title]);

        createLog({
            log: { name, action: `Удаление продукта ${title}` },
            navigator,
            locationData
        });

        return 'Продукт успешно удалён';
    } catch (error) {
        console.log(error);
    }
}

async function createProduct(_, { product, navigator, adminName, locationData }) {
    try {
        const db = getDb();
        const { rows: existing } = await db.query('SELECT id FROM products WHERE title = $1', [product.title]);
        if (existing[0]) {
            return {
                response: {
                    success: false,
                    message: 'Продукт с таким названием уже существует'
                },
                product: { title: 'unknown' }
            };
        }

        const locationOnclick = '/dashboard/products/' + product.title;

        // 1. Вставляем в products
        const { rows: inserted } = await db.query(`
            INSERT INTO products (title, product_for, image_dashboard, image_logo, description, bought_times, status, location_onclick)
            VALUES ($1, $2, $3, $4, $5, 0, 'onupdate', $6)
            RETURNING *
        `, [
            product.title,
            product.productFor || '',
            product.imageURLdashboard || '',
            product.logo || '',
            product.description || '',
            locationOnclick
        ]);
        const newProd = inserted[0];

        // 2. Вставляем в products_general_info
        await db.query(`
            INSERT INTO products_general_info (product_id, working_time, bans_count, update_frequency, cost_per_day)
            VALUES ($1, $2, 0, $3, $4)
        `, [newProd.id, product.workingTime || '', product.reloading || '', product.costPerDay || 0]);

        // 3. Вставляем в products_homepage_info
        await db.query(`
            INSERT INTO products_homepage_info (product_id, image_homepage, cost_from)
            VALUES ($1, $2, 0)
        `, [newProd.id, product.imageURL || '']);

        // 4. Вставляем в products_characteristics
        const ch = product.characteristics || {};
        await db.query(`
            INSERT INTO products_characteristics (product_id, version, os_support, cpu_support, game_mode, developer, supported_anti_cheats)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            newProd.id,
            ch.version || '',
            ch.osSupport || '',
            ch.cpuSupport || '',
            ch.gameMode || '',
            ch.developer || '',
            ch.supportedAntiCheats || ''
        ]);

        // 5. Вставляем дефолтную цену в products_costs
        await db.query(`
            INSERT INTO products_costs (product_id, cost, cost_per_period, menu_text, days)
            VALUES ($1, 0, 'Месяц', 'Ежемесячно', 30)
        `, [newProd.id]);

        createLog({
            log: { name: adminName, action: `Создание продукта ${product.title}` },
            navigator,
            locationData
        });

        return {
            response: {
                success: true,
                message: `Продукт с названием ${product.title} успешно создан`
            },
            product: await buildFullProduct(db, newProd)
        };
    } catch (error) {
        console.log(error);
    }
}

async function createNews(_, { title, change }) {
    try {
        const db = getDb();
        const { rows: pRows } = await db.query('SELECT id FROM products WHERE title = $1', [title]);
        if (!pRows[0]) return 'Продукт не найден';

        await db.query(`
            INSERT INTO products_changes (product_id, version, created_at, description)
            VALUES ($1, $2, COALESCE($3, NOW()), $4)
        `, [pRows[0].id, change.version, change.created ? new Date(change.created) : new Date(), change.description]);

        return `Новость у продукта ${title} успешно создана`;
    } catch (error) {
        console.log(error);
    }
}

async function deleteNews(_, { title, changeTitle }) {
    try {
        const db = getDb();
        await db.query(`
            DELETE FROM products_changes pc
            USING products p
            WHERE pc.product_id = p.id AND p.title = $1 AND pc.change_id = $2
        `, [title, changeTitle]);

        return 'Новость успешно удалена';
    } catch (error) {
        console.log(error);
    }
}

async function deleteAllNews(_, { title }) {
    try {
        const db = getDb();
        await db.query(`
            DELETE FROM products_changes pc
            USING products p
            WHERE pc.product_id = p.id AND p.title = $1
        `, [title]);
        return `Новости у продукта ${title} были успешно удалены`;
    } catch (error) {
        console.log(error);
    }
}

async function disableProduct(_, { title }) {
    try {
        const db = getDb();
        await db.query("UPDATE products SET status = 'onupdate' WHERE title = $1", [title]);
        return `Продукт ${title} переведен на обновление`;
    } catch (error) {
        console.log(error);
    }
}

async function addCost(_, { cost, title }) {
    try {
        const db = getDb();
        const { costPer, menuText, days } = cost;

        if (!cost.cost) return { success: false, message: 'Вы не ввели цену за продукт' };
        if (costPer == '') return { success: false, message: 'Вы не ввели поле "Цена за", оно является обязательным' };
        if (!days) return { success: false, message: 'Вы не ввели поле "Дни". Это поле обязательное' };
        if (menuText == '') return { success: false, message: 'Вы не ввели "Надпись в меню", нужно ввести для добавления цены' };

        const { rows: pRows } = await db.query('SELECT id FROM products WHERE title = $1', [title]);
        if (!pRows[0]) return { success: false, message: 'Продукт не найден' };

        await db.query(`
            INSERT INTO products_costs (product_id, cost, cost_per_period, menu_text, days)
            VALUES ($1, $2, $3, $4, $5)
        `, [pRows[0].id, cost.cost, costPer, menuText, days]);

        return {
            success: true,
            message: 'Цена за продукт успешно добавлена'
        };
    } catch (error) {
        console.log(error);
    }
}

async function deleteCost(_, { costTitle, title }) {
    try {
        const db = getDb();
        await db.query(`
            DELETE FROM products_costs pc
            USING products p
            WHERE pc.product_id = p.id AND p.title = $1 AND pc.menu_text = $2
        `, [title, costTitle]);

        return 'Everything happened pretty well';
    } catch (error) {
        console.log(error);
    }
}

async function saveCostChanges(_, { title, costPerDayInfo, locationOnclick }) {
    try {
        const db = getDb();
        const { rows: pRows } = await db.query(
            'UPDATE products SET location_onclick = $1 WHERE title = $2 RETURNING id',
            [locationOnclick, title]
        );
        if (pRows[0]) {
            await db.query(
                'UPDATE products_homepage_info SET cost_from = $1 WHERE product_id = $2',
                [costPerDayInfo, pRows[0].id]
            );
        }
        return 'Evertyhing is successfully done';
    } catch (error) {
        console.log(error);
    }
}

async function updateProductBG(_, { title, imageURL }) {
    try {
        const db = getDb();
        await db.query(`
            UPDATE products_homepage_info phi
            SET image_homepage = $1
            FROM products p
            WHERE phi.product_id = p.id AND p.title = $2
        `, [imageURL, title]);

        return 'BG is successfully updated';
    } catch (error) {
        console.log(error);
    }
}

async function isPromocodeRight(_, { name, title }) {
    try {
        const db = getDb();
        const { rows } = await db.query(`
            SELECT pp.*
            FROM products_promocodes pp
            JOIN products p ON p.id = pp.product_id
            WHERE p.title = $1 AND pp.promocode = $2 AND COALESCE(pp.is_used, false) = false
            LIMIT 1
        `, [title, name]);

        if (!rows[0]) {
            return {
                response: { success: false, message: 'Вы ввели неверное имя промокода' },
                discountPercent: 1
            };
        }

        const promo = rows[0];
        if ((promo.used_amount || 0) + 1 > promo.activations_amount) {
            return {
                response: { success: false, message: 'Лимит использования этого промокода превышен' },
                discountPercent: 1
            };
        }

        return {
            response: {
                success: true,
                message: `Вы успешно ввели промокод! Теперь вы можете купить продукт ${title} со скидкой ${promo.discount_percent}%!`
            },
            discountPercent: promo.discount_percent
        };
    } catch (error) {
        console.log(error);
    }
}

async function changeLoaderVersion(_, { version }) {
    try {
        const db = getDb();
        await db.query('UPDATE loader_version SET version = $1 WHERE id = 1', [version]);
        return {
            message: 'Вы успешно обновили версию лоадера',
            success: true
        };
    } catch (error) {
        console.log(error);
    }
}

async function issueSubForEverybody(_, { days, title }) {
    try {
        const db = getDb();
        await db.query(`
            UPDATE subscription s
            SET active_until = s.active_until + ($1 || ' days')::interval
            FROM products p
            WHERE s.product_id = p.id AND p.title = $2 AND s.status = 'active'
        `, [days, title]);

        return {
            success: true,
            message: `Успешно добавлено + ${days} дней ко всем пользователям продукта ${title}`
        };
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getProducts,
    getPopularProducts,
    getProduct,
    buyProduct,
    updateBoughtIcon,
    freezeSubscription,
    unfreezeSubscription,
    createKeys,
    deleteKey,
    deleteAllKeys,
    deleteAllPromocodes,
    activateKey,
    createPromocode,
    deletePromocode,
    editProduct,
    deleteProduct,
    createProduct,
    createNews,
    deleteNews,
    deleteAllNews,
    disableProduct,
    addCost,
    deleteCost,
    saveCostChanges,
    updateProductBG,
    isPromocodeRight,
    changeLoaderVersion,
    issueSubForEverybody,
    buildFullProduct
};
