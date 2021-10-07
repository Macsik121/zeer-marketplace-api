const { getDb } = require('./db');
const getLocationByIP = require('../getLocationByIP');

async function injectLogs() {
    try {
        const db = getDb();
        const logs = (
            await db
                .collection('injectLogs')
                .find()
                .sort({ id: -1 })
                .toArray()
        );
        return logs;
    } catch (error) {
        console.log(error);
    }
}

async function logInject(_, {
    name,
    ip,
    id_steam,
    platform,
    action
}) {
    try {
        const db = getDb();
        const { location } = await getLocationByIP(ip);
        const id = await db.collection('injectLogs').countDocuments();

        await db.collection('injectLogs').insertOne({
            id: id + 1,
            name,
            ip,
            location,
            idSteam: id_steam,
            platform,
            action,
            date: new Date()
        });
        return {
            success: true,
            message: 'Inject has successfully logged!'
        };
    } catch (error) {
        console.log(error);
    }
}

async function cleanLogs() {
    try {
        const db = getDb();
        await db.collection('injectLogs').deleteMany({});
        return {
            success: true,
            message: 'Логи инжекта очищены'
        };
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    injectLogs,
    logInject,
    cleanLogs
};
