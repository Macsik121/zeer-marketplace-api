const { getDb } = require('./db');
const fetch = require('isomorphic-fetch');
const detectBrowser = require('./detectBrowser');

async function actionLogs() {
    try {
        const db = getDb();
        return (
            await db
                .collection('actionLogs')
                .aggregate([
                    {
                        $sort: {
                            id: -1
                        }
                    }
                ])
                .toArray()
        );
    } catch (error) {
        console.log(error);
    }
}

async function createLog(
    _,
    {
        log: {
            name,
            action,
            date = new Date(),
            IP = 'localhost',
            location = 'Москва'
        },
        navigator: {
            userAgent,
            platform
        }
    }
) {
    try {
        const db = getDb();

        const browser = detectBrowser(userAgent);
        const actionLogs = await db.collection('actionLogs').find().toArray();
        let result = await fetch('https://api.ipgeolocation.io/ipgeo?apiKey=146a180ed0c74c7283d34c95c717aaaa');
        result = await result.json();
        console.log(result);
        IP = result.ip;
        location = result.city;

        const actionLog = {
            id: ++actionLogs.length,
            date,
            location,
            name,
            IP,
            browser,
            platform,
            action
        };

        await db.collection('actionLogs').insertOne(actionLog);
        return actionLog;
    } catch (error) {
        console.log(error);
    }
}

async function cleanLogs() {
    try {
        const db = getDb();

        await db.collection('actionLogs').deleteMany({});
        return 'Логи усешно очищены';
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    actionLogs,
    createLog,
    cleanLogs
}
