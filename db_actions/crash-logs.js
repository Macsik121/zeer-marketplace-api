const { getDb } = require('./db');

async function crashLogs() {
    try {
        const db = getDb();
        const logs = await db.collection('crashLogs').find().toArray();
        return logs;
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    crashLogs
};
