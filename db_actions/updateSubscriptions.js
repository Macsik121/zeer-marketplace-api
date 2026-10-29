// --- db_actions/updateSubscriptions.js ---
const { getDb } = require('./db');
const { buildFullUser } = require('./user');

module.exports = async function updateSubscriptions({
    user,
    returnUser = false
}) {
    try {
        const db = getDb();
        if (!user || !user.name) return;

        const { name } = user;
        const { rows: uRows } = await db.query('SELECT * FROM users WHERE name = $1', [name]);
        if (!uRows[0]) return;
        const userId = uRows[0].id;

        // 1. Переводим истекшие активные подписки в статус 'expired'
        await db.query(`
            UPDATE subscription
            SET status = 'expired'
            WHERE user_id = $1 AND status = 'active' AND active_until < NOW()
        `, [userId]);

        // 2. Переводим продленные подписки из 'expired' обратно в 'active'
        await db.query(`
            UPDATE subscription
            SET status = 'active'
            WHERE user_id = $1 AND status = 'expired' AND active_until > NOW()
        `, [userId]);

        if (returnUser) {
            return await buildFullUser(db, uRows[0]);
        }
    } catch (error) {
        console.log(error);
    }
};
