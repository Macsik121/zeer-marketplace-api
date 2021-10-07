const { getDb } = require('./db');
const getLocationByIP = require('../getLocationByIP');

async function injectLogs() {
    try {
        const db = getDb();
        const logs = await db.collection('injectLogs').find().toArray();
        return logs;
    } catch (error) {
        console.log(error);
    }
}

async function logInject(_, {
    name,
    ip,
    idSteam,
    platform,
    action
}) {
    try {
        const db = getDb();
        const { location } = getLocationByIP(ip);

        await db.collection('injectLogs').insertOne({
            name,
            ip,
            location,
            idSteam,
            platform,
            action,
            date: new Date()
        });
        return 'Inject has successfully logged!';
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    injectLogs,
    logInject
};
