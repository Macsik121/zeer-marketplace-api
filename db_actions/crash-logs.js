// --- db_actions/crash-logs.js ---
const { getDb } = require('./db');

async function crashLogs() {
    try {
        const db = getDb();
        const { rows } = await db.query(`
            SELECT
                id,
                user_name AS "name",
                happened_at AS "date",
                COALESCE(error_code::text, '') AS "codeError",
                COALESCE(error_description, '') AS "errorDesc",
                COALESCE(time_played::text, '0') AS "playingTime",
                action AS "full_log_excetion"
            FROM crash_logs
            ORDER BY id DESC
        `);
        return rows;
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function logCrash(_, {
    login,
    exception_code,
    log_exection,
    time_game,
    full_log_excetion
}) {
    try {
        const db = getDb();
        const errorCodeInt = parseInt(exception_code, 10) || 0;
        const timePlayedInt = parseInt(time_game, 10) || 0;

        await db.query(`
            INSERT INTO crash_logs (happened_at, user_name, error_code, error_description, time_played, action)
            VALUES (NOW(), $1, $2, $3, $4, $5)
        `, [login, errorCodeInt, log_exection, timePlayedInt, full_log_excetion]);

        return {
            success: true,
            message: 'Crash is successfully logged'
        };
    } catch (error) {
        console.log(error);
    }
}

async function cleanLogs() {
    try {
        const db = getDb();
        await db.query('TRUNCATE TABLE crash_logs RESTART IDENTITY');

        return {
            success: true,
            message: 'Логи крашей очищены'
        };
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    crashLogs,
    cleanLogs,
    logCrash
};
