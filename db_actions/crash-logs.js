const { getDb } = require('./db');

async function crashLogs() {
    try {
        const db = getDb();
        const logs = (
            await db
                .collection('crashLogs')
                .find()
                .sort({ id: -1 })
                .toArray()
        );
        return logs;
    } catch (error) {
        console.log(error);
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
        const id = await db.collection('crashLogs').countDocuments();

        await db.collection('crashLogs').insertOne({
            id: id + 1,
            date: new Date(),
            name: login,
            playingTime: time_game,
            codeError: exception_code,
            errorDesc: log_exection,
            full_log_excetion
        });

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
        await db.collection('crashLogs').deleteMany({});

        return {
            success: true,
            message: 'Логи крашей очищены'
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    crashLogs,
    cleanLogs,
    logCrash
};
