// --- db_actions/user.js ---
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');
const { sendMail } = require('../nodemailer');
const createLog = require('../createLog');
const updateSubscriptions = require('./updateSubscriptions');
const generateString = require('../generateString');

let token = '';

// Вспомогательные мапперы SQL <-> GraphQL
function roleToStatus(role) {
    return {
        isAdmin: role === 'admin',
        simpleUser: role === 'simple',
        isBanned: role === 'banned'
    };
}

function statusFromRoleParam(roleParam) {
    if (roleParam === 'isAdmin' || roleParam === 'admin') return 'admin';
    if (roleParam === 'isBanned' || roleParam === 'banned') return 'banned';
    return 'simple';
}

function subStatusToGql(statusStr) {
    return {
        isActive: statusStr === 'active',
        isFreezed: statusStr === 'freezed',
        isExpired: statusStr === 'expired'
    };
}

function gqlSubStatusToSql(statusObj) {
    if (!statusObj) return 'active';
    if (statusObj.isFreezed) return 'freezed';
    if (statusObj.isExpired) return 'expired';
    return 'active';
}

// Собирает полный объект User из реляционных таблиц (точная копия документа Mongo)
async function buildFullUser(db, userRow) {
    if (!userRow) return null;

    // 1. Подписки пользователя (JOIN с products и products_homepage_info)
    const { rows: subRows } = await db.query(`
        SELECT
            s.subscription_id AS id,
            s.status,
            s.active_until AS "activelyUntil",
            s.freezed_at AS "freezeTime",
            COALESCE(s.was_freezed, s.freezed_at IS NOT NULL) AS "wasFreezed",
            p.title,
            p.product_for AS "productFor",
            phi.image_homepage AS "imageURL"
        FROM subscription s
        JOIN products p ON p.id = s.product_id
        LEFT JOIN products_homepage_info phi ON phi.product_id = p.id
        WHERE s.user_id = $1
        ORDER BY s.subscription_id ASC
    `, [userRow.id]);

    const subscriptions = subRows.map(r => ({
        id: r.id,
        status: subStatusToGql(r.status),
        activelyUntil: r.activelyUntil,
        title: r.title,
        productFor: r.productFor,
        imageURL: r.imageURL,
        freezeTime: r.freezeTime,
        wasFreezed: r.wasFreezed
    }));

    // 2. Заявки на сброс привязки (HWID)
    const { rows: resetRows } = await db.query(`
        SELECT
            id,
            num AS number,
            reason,
            requested_at AS date,
            status,
            $2::text AS owner,
            COALESCE(ip, '') AS ip,
            COALESCE(location, '') AS location
        FROM reset_binding_requests
        WHERE owner_id = $1
        ORDER BY id DESC
    `, [userRow.id, userRow.name]);

    // 3. Использованные промокоды
    const { rows: promoRows } = await db.query(`
        SELECT pp.promocode
        FROM users_used_promocodes uup
        JOIN products_promocodes pp ON pp.id = uup.promo_id
        WHERE uup.user_id = $1
    `, [userRow.id]);

    // 4. Использованные ключи
    const { rows: keyRows } = await db.query(`
        SELECT pk.key AS name, uuk.activated_at AS "activatedDate"
        FROM users_used_keys uuk
        JOIN products_keys pk ON pk.id = uuk.key_id
        WHERE uuk.user_id = $1
    `, [userRow.id]);

    return {
        _id: userRow.id, // Для обратной совместимости с JWT
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        password: userRow.password,
        avatar: userRow.avatar,
        registeredDate: userRow.registered_at,
        status: roleToStatus(userRow.role),
        hwid: userRow.hwid || '',
        subscriptions,
        resetRequests: resetRows,
        usedPromocodes: promoRows.map(r => r.promocode),
        usedKeys: keyRows
    };
}

async function getUser(_, { name }) {
    try {
        const db = getDb();
        const { rows } = await db.query(
            'SELECT * FROM users WHERE name = $1 OR email = $1 LIMIT 1',
            [name]
        );
        if (!rows[0]) {
            return {
                name: '',
                id: 0,
                email: '',
                subscriptions: [],
                resetRequests: []
            };
        }
        return await buildFullUser(db, rows[0]);
    } catch (error) {
        console.log(error);
    }
}

async function signUp(_, { email, name, password, navigator, locationData }) {
    try {
        const db = getDb();
        const { rows: existing } = await db.query(
            'SELECT * FROM users WHERE email = $1 OR name = $2 LIMIT 1',
            [email, name]
        );

        if (existing[0]) {
            const existingUser = await buildFullUser(db, existing[0]);
            if (existingUser.name === name) {
                return {
                    user: existingUser,
                    token: '',
                    message: 'Пользователь с данным именем уже существует.'
                };
            }
            if (existingUser.email === email) {
                return {
                    user: existingUser,
                    token: '',
                    message: 'Пользователь с такой почтой уже существует'
                };
            }
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const avatarBGs = ['#c00', '#f60', '#6f6', '#03c', '#33f', '#60c', '#1E75FF'];
        const avatar = avatarBGs[Math.floor(Math.random() * avatarBGs.length)];

        const { rows: inserted } = await db.query(`
            INSERT INTO users (name, email, password, avatar, registered_at, hwid, role)
            VALUES ($1, $2, $3, $4, NOW(), '', 'simple')
            RETURNING *
        `, [name, email, hashedPassword, avatar]);

        const user = await buildFullUser(db, inserted[0]);

        createLog({
            log: { name: user.name, action: 'Регистрация на сайте' },
            navigator,
            locationData
        });

        token = jwt.sign(
            {
                email: user.email,
                id: user._id,
                name: user.name,
                avatar: user.avatar,
                status: user.status,
                hwid: user.hwid,
                subscriptions: user.subscriptions
            },
            '!@secretKey: Morgenshtern - Show@!',
            { expiresIn: '3d' }
        );

        return {
            user,
            token,
            message: `You successfully Registered as "${user.name}"`
        };
    } catch (error) {
        console.log(error);
    }
}

async function signIn(_, { email, password, rememberMe, navigator, locationData }) {
    try {
        const db = getDb();
        const { rows } = await db.query(
            'SELECT * FROM users WHERE email = $1 OR name = $1 LIMIT 1',
            [email]
        );

        if (!rows[0]) {
            return {
                user: null,
                token: '',
                message: 'Такого пользователя не существует'
            };
        }

        const user = await buildFullUser(db, rows[0]);
        const isPasswordcorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordcorrect) {
            return {
                user,
                token: '',
                message: 'Вы ввели неправильный пароль'
            };
        }

        const payload = {
            email: user.email,
            id: user._id,
            name: user.name,
            avatar: user.avatar,
            status: user.status,
            hwid: user.hwid,
            subscriptions: user.subscriptions
        };

        token = rememberMe
            ? jwt.sign(payload, '!@secretKey: Morgenshtern - Show@!')
            : jwt.sign(payload, '!@secretKey: Morgenshtern - Show@!', { expiresIn: '3d' });

        createLog({
            log: { name: user.name, action: 'Вход в аккаунт на сайте' },
            navigator,
            locationData
        });

        return {
            user,
            token,
            message: 'You seccessfully logged in!'
        };
    } catch (error) {
        console.log(error);
    }
}

async function resetPassword(_, { email, navigator, locationData }) {
    try {
        const db = getDb();
        const { rows } = await db.query(
            'SELECT * FROM users WHERE email = $1 OR name = $1 LIMIT 1',
            [email]
        );
        const user = rows[0];
        if (!user) {
            return {
                message: 'Этого пользователя не существует',
                success: false
            };
        }

        const targetEmail = user.email;
        const generatedPassword = generateString(15, false);
        sendMail({
            email: targetEmail,
            generatedPassword,
            navigator,
            locationData
        });
        const newHashedPassword = await bcrypt.hash(generatedPassword, 12);

        await db.query('UPDATE users SET password = $1 WHERE id = $2', [newHashedPassword, user.id]);

        return {
            message: 'На указанную почту отправленно сообщение',
            success: true
        };
    } catch (error) {
        console.log(error);
    }
}

function getToken() {
    return token;
}

function verifyToken(_, { token }) {
    try {
        let error;
        if (token) {
            jwt.verify(
                token,
                '!@secretKey: Morgenshtern - Show@!',
                function(err) {
                    if (err) error = err;
                }
            );
        }
        if (error) {
            token = '';
            return error.message;
        }
        return token;
    } catch (error) {
        console.log(error);
    }
}

async function changeAvatar(_, { name, avatar }) {
    try {
        const db = getDb();
        const { rows } = await db.query(
            'UPDATE users SET avatar = $1 WHERE name = $2 RETURNING *',
            [avatar, name]
        );
        const user = await buildFullUser(db, rows[0]);

        return jwt.sign(
            {
                id: user._id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                status: user.status,
                hwid: user.hwid,
                subscriptions: user.subscriptions
            },
            '!@secretKey: Morgenshtern - Show@!',
            { expiresIn: '3d' }
        );
    } catch (error) {
        console.log(error);
    }
}

async function changePassword(_, { name, oldPassword, newPassword }) {
    try {
        const db = getDb();
        const { rows } = await db.query('SELECT * FROM users WHERE name = $1', [name]);
        const user = rows[0];

        if (!await bcrypt.compare(oldPassword, user.password)) {
            return { success: false, message: 'Ваш старый пароль неверный' };
        }

        if (await bcrypt.compare(newPassword, user.password)) {
            return { success: false, message: 'Вы успешно поменяли пароль' };
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user.id]);

        return { success: true, message: 'Вы успешно поменяли пароль' };
    } catch (error) {
        console.log(error);
    }
}

async function getSubscriptions(_, { name }) {
    try {
        const db = getDb();
        const { rows: uRows } = await db.query('SELECT * FROM users WHERE name = $1', [name]);
        if (!uRows[0]) return { all: [], active: [], overdue: [] };

        // Автоматически обновляем статусы истекших и продленных подписок прямо в SQL
        await db.query(`
            UPDATE subscription
            SET status = 'expired'
            WHERE user_id = $1 AND status = 'active' AND active_until < NOW()
        `, [uRows[0].id]);

        await db.query(`
            UPDATE subscription
            SET status = 'active'
            WHERE user_id = $1 AND status = 'expired' AND active_until > NOW()
        `, [uRows[0].id]);

        const user = await buildFullUser(db, uRows[0]);
        const activeSubs = [];
        const overdueSubs = [];

        user.subscriptions.forEach(sub => {
            if (sub.status.isActive || sub.status.isFreezed) {
                activeSubs.push(sub);
            } else {
                overdueSubs.push(sub);
            }
        });

        return {
            all: user.subscriptions,
            active: activeSubs,
            overdue: overdueSubs
        };
    } catch (error) {
        console.log(error);
    }
}

async function getUsers() {
    const db = getDb();
    const { rows } = await db.query('SELECT * FROM users ORDER BY id DESC');
    return Promise.all(rows.map(r => buildFullUser(db, r)));
}

async function getResetRequests(_, { name }) {
    try {
        const db = getDb();
        const { rows } = await db.query(`
            SELECT
                r.id,
                r.num AS number,
                r.reason,
                r.requested_at AS date,
                r.status,
                u.name AS owner,
                COALESCE(r.ip, '') AS ip,
                COALESCE(r.location, '') AS location
            FROM reset_binding_requests r
            JOIN users u ON u.id = r.owner_id
            WHERE u.name = $1
            ORDER BY r.id DESC
        `, [name]);
        return rows;
    } catch (error) {
        console.log(error);
    }
}

async function makeResetRequest(_, { name, reason, navigator, locationData }) {
    try {
        const db = getDb();
        const { rows: uRows } = await db.query('SELECT id, name FROM users WHERE name = $1', [name]);
        const user = uRows[0];

        const { rows: countRows } = await db.query(
            'SELECT COUNT(*) AS cnt FROM reset_binding_requests WHERE owner_id = $1',
            [user.id]
        );
        const nextNumber = (countRows[0]?.cnt || 0) + 1;
        const { ip, location } = locationData || { ip: '', location: '' };

        const { rows: inserted } = await db.query(`
            INSERT INTO reset_binding_requests (num, reason, requested_at, status, owner_id, ip, location)
            VALUES ($1, $2, NOW(), 'waiting', $3, $4, $5)
            RETURNING id, num AS number, reason, requested_at AS date, status, ip, location
        `, [nextNumber, reason, user.id, ip, location]);

        createLog({
            log: { name: user.name, action: 'Подача заявки на сброс привязки' },
            navigator,
            locationData
        });

        return { ...inserted[0], owner: user.name };
    } catch (error) {
        console.log(error);
    }
}

async function deleteUser(_, { name, navigator, adminName, locationData }) {
    try {
        const db = getDb();
        await db.query('DELETE FROM users WHERE name = $1', [name]);

        createLog({
            log: { name: adminName, action: `Удаление пользователя ${name}` },
            navigator,
            locationData
        });

        return `Вы успешно удалили пользователя с именем ${name}`;
    } catch (error) {
        console.log(error);
    }
}

async function getResetBindings() {
    try {
        const db = getDb();
        const { rows } = await db.query(`
            SELECT
                r.id,
                r.num AS number,
                r.reason,
                r.requested_at AS date,
                r.status,
                u.name AS owner,
                COALESCE(r.ip, '') AS ip,
                COALESCE(r.location, '') AS location
            FROM reset_binding_requests r
            JOIN users u ON u.id = r.owner_id
            ORDER BY r.id DESC
        `);
        return rows;
    } catch (error) {
        console.log(error);
    }
}

async function acceptResetBinding(_, { name, number }) {
    try {
        const db = getDb();
        const { rows: uRows } = await db.query(
            "UPDATE users SET hwid = '' WHERE name = $1 RETURNING id, name",
            [name]
        );
        const user = uRows[0];

        const { rows: updated } = await db.query(`
            UPDATE reset_binding_requests
            SET status = 'done'
            WHERE owner_id = $1 AND num = $2
            RETURNING id, num AS number, reason, requested_at AS date, status, ip, location
        `, [user.id, number]);

        return { ...updated[0], owner: user.name };
    } catch (error) {
        console.log(error);
    }
}

async function rejectResetRequest(_, { name, number }) {
    try {
        const db = getDb();
        await db.query(`
            UPDATE reset_binding_requests r
            SET status = 'unsuccessful'
            FROM users u
            WHERE r.owner_id = u.id AND u.name = $1 AND r.num = $2
        `, [name, number]);

        return 'Сброс привязки был успешно отколнён';
    } catch (error) {
        console.log(error);
    }
}

async function deleteAllResetRequests() {
    try {
        const db = getDb();
        await db.query('TRUNCATE TABLE reset_binding_requests RESTART IDENTITY');
        return 'Все запросы на сброс привязки успешно удалены';
    } catch (error) {
        console.log(error);
    }
}

async function editUser(_, { oldName, name, email, hwid, role, navigator, adminName, locationData }) {
    try {
        const db = getDb();
        if (name && name !== oldName) {
            const { rows: existing } = await db.query('SELECT id FROM users WHERE name = $1', [name]);
            if (existing[0]) return '';
        }

        const sqlRole = statusFromRoleParam(role);
        const { rows: updated } = await db.query(`
            UPDATE users
            SET name = COALESCE($1, name),
                email = COALESCE($2, email),
                hwid = COALESCE($3, hwid),
                role = $4
            WHERE name = $5
            RETURNING *
        `, [name, email, hwid, sqlRole, oldName]);

        createLog({
            log: { name: adminName, action: `Редактирование пользователя ${oldName}` },
            navigator,
            locationData
        });

        return await buildFullUser(db, updated[0]);
    } catch (error) {
        console.log(error);
    }
}

async function editUserPassword(_, { userName, adminName, newPassword, adminPassword }) {
    try {
        const db = getDb();
        const { rows: adminRows } = await db.query('SELECT password FROM users WHERE name = $1', [adminName]);
        if (!adminRows[0] || !await bcrypt.compare(adminPassword, adminRows[0].password)) {
            return 'Вы ввели неправильный пароль.';
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await db.query('UPDATE users SET password = $1 WHERE name = $2', [hashed, userName]);

        return `${userName}'s password is successfully changed.`;
    } catch (error) {
        console.log(error);
    }
}

async function updateSubscriptionTime(_, { date, subscription, name }) {
    try {
        const db = getDb();
        const { title } = subscription;
        if (!new Date(date).getTime()) {
            return {
                success: false,
                message: 'Вы ввели дату неверно. Дата должна быть в формате yyyy-mm-dd.'
            };
        }

        const { rows: uRows } = await db.query('SELECT * FROM users WHERE name = $1', [name]);
        const { rows: pRows } = await db.query('SELECT id FROM products WHERE LOWER(title) = LOWER($1)', [title]);
        if (!uRows[0] || !pRows[0]) return { success: false, message: 'Пользователь или продукт не найден' };

        const userId = uRows[0].id;
        const productId = pRows[0].id;

        const { rows: existingSub } = await db.query(
            'SELECT subscription_id FROM subscription WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );

        let successfullyChangedSub = false;
        if (existingSub[0]) {
            await db.query(
                'UPDATE subscription SET active_until = $1 WHERE subscription_id = $2',
                [new Date(date), existingSub[0].subscription_id]
            );
            successfullyChangedSub = true;
        } else {
            await db.query(`
                INSERT INTO subscription (product_id, user_id, status, active_until)
                VALUES ($1, $2, $3, $4)
            `, [productId, userId, gqlSubStatusToSql(subscription.status), new Date(date)]);
        }

        const fullUser = await buildFullUser(db, uRows[0]);
        await updateSubscriptions({ user: fullUser });

        if (successfullyChangedSub) {
            return {
                success: true,
                message: `Подписка продукта ${title} у пользователя ${name} успешно изменена`
            };
        }
        return {
            success: true,
            message: `Подписка продукта ${title} добавлена пользователю ${name}`
        };
    } catch (error) {
        console.log(error);
    }
}

async function resetFreezeCooldown(_, { name, title }) {
    try {
        const db = getDb();
        await db.query(`
            UPDATE subscription s
            SET was_freezed = false, freezed_at = NULL
            FROM users u, products p
            WHERE s.user_id = u.id AND s.product_id = p.id
              AND u.name = $1 AND p.title = $2
        `, [name, title]);

        return {
            success: true,
            message: 'Кулдаун заморозки успешно сброшен!'
        };
    } catch (e) {
        console.log(e);
    }
}

async function issueSubscription(_, { name, subscription }) {
    try {
        const db = getDb();
        const { rows: uRows } = await db.query('SELECT id FROM users WHERE name = $1', [name]);
        const { rows: pRows } = await db.query('SELECT id FROM products WHERE title = $1', [subscription.title]);

        await db.query(`
            INSERT INTO subscription (product_id, user_id, status, freezed_at, active_until, was_freezed)
            VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), COALESCE($6, false))
        `, [
            pRows[0].id,
            uRows[0].id,
            gqlSubStatusToSql(subscription.status),
            subscription.freezeTime || null,
            subscription.activelyUntil || new Date(),
            subscription.wasFreezed || false
        ]);

        return {
            success: true,
            message: `Вы успешно добавили подписку ${subscription.title} пользователю ${name}!`
        };
    } catch (error) {
        console.log(error);
    }
}

async function refuseSub(_, { name, title }) {
    try {
        const db = getDb();
        await db.query(`
            DELETE FROM subscription s
            USING users u, products p
            WHERE s.user_id = u.id AND s.product_id = p.id
              AND u.name = $1 AND p.title = $2
        `, [name, title]);

        return {
            success: true,
            message: `Вы отказались от подписки ${title}`
        };
    } catch (error) {
        console.log(error);
    }
}

async function activatePromo(_, { name, title, username, navigator, locationData }) {
    try {
        const db = getDb();
        const { rows: uRows } = await db.query('SELECT id FROM users WHERE name = $1', [username]);
        const { rows: pRows } = await db.query('SELECT id FROM products WHERE title = $1', [title]);
        if (!uRows[0] || !pRows[0]) {
            return { response: { success: false, message: 'Ошибка данных' }, discountPercent: 1 };
        }

        const userId = uRows[0].id;
        const productId = pRows[0].id;

        // Ищем промокод продукта
        const { rows: promoRows } = await db.query(`
            SELECT * FROM products_promocodes
            WHERE product_id = $1 AND promocode = $2
            LIMIT 1
        `, [productId, name]);

        if (!promoRows[0]) {
            return {
                response: { success: false, message: 'Такого промокода не существует' },
                discountPercent: 1
            };
        }

        const promo = promoRows[0];

        // Проверяем, использовал ли уже этот пользователь данный промокод
        const { rows: usedRows } = await db.query(`
            SELECT 1 FROM users_used_promocodes
            WHERE user_id = $1 AND promo_id = $2
        `, [userId, promo.id]);

        if (usedRows[0]) {
            return {
                response: { message: 'Вы уже использовали этот промокод', success: false },
                discountPercent: 1
            };
        }

        // Проверяем срок действия
        if (new Date(promo.expired_at) - new Date() < 0) {
            await db.query('UPDATE products_promocodes SET is_used = true WHERE id = $1', [promo.id]);
            return {
                response: { success: false, message: 'Промокод неактивен, поэтому не может быть активирован' },
                discountPercent: 1
            };
        }

        // В SQL: used_amount - сколько раз активировали, activations_amount - лимит активаций
        if ((promo.used_amount || 0) + 1 > promo.activations_amount) {
            await db.query('UPDATE products_promocodes SET is_used = true WHERE id = $1', [promo.id]);
            createLog({
                log: { name: username, action: `Неудачная активация промокода ${name}. Превышен лимит активации` },
                navigator,
                locationData
            });
            return {
                response: { message: 'Превышен лимит использования введёного промокода', success: false },
                discountPercent: 1
            };
        }

        // Активируем промокод
        await db.query(`
            UPDATE products_promocodes
            SET used_amount = COALESCE(used_amount, 0) + 1,
                is_used = CASE WHEN COALESCE(used_amount, 0) + 1 >= activations_amount THEN true ELSE is_used END
            WHERE id = $1
        `, [promo.id]);

        await db.query(`
            INSERT INTO users_used_promocodes (promo_id, user_id)
            VALUES ($1, $2)
        `, [promo.id, userId]);

        createLog({
            log: { name: username, action: `Успешная активация промокода ${name}` },
            navigator,
            locationData
        });

        return {
            response: { message: 'Вы успешно активировали промокод', success: true },
            discountPercent: promo.discount_percent
        };
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getUser,
    getUsers,
    signUp,
    signIn,
    resetPassword,
    getToken,
    verifyToken,
    changePassword,
    changeAvatar,
    getSubscriptions,
    makeResetRequest,
    getResetRequests,
    deleteUser,
    getResetBindings,
    acceptResetBinding,
    rejectResetRequest,
    deleteAllResetRequests,
    editUser,
    editUserPassword,
    updateSubscriptionTime,
    resetFreezeCooldown,
    issueSubscription,
    refuseSub,
    activatePromo,
    buildFullUser // Экспортируем, так как пригодится в products.js и updateSubscriptions.js!
};
