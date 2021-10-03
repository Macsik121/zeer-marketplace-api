const { getDb } = require('./db');
const fetch = require('isomorphic-fetch');
const detectBrowser = require('../detectBrowser');

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
            action
        },
        navigator,
        locationData: {
            ip,
            location
        }
    }
) {
    try {
        const db = getDb();

        let date = new Date();
        const browser = detectBrowser(navigator);
        const actionLogs = await db.collection('actionLogs').find().toArray();
        let platform = "Unknown OS";
        if (navigator.userAgent.indexOf("Windows NT 10.0")!= -1) platform="Windows 10";
        if (navigator.userAgent.indexOf("Windows NT 6.3") != -1) platform="Windows 8.1";
        if (navigator.userAgent.indexOf("Windows NT 6.2") != -1) platform="Windows 8";
        if (navigator.userAgent.indexOf("Windows NT 6.1") != -1) platform="Windows 7";
        if (navigator.userAgent.indexOf("Windows NT 6.0") != -1) platform="Windows Vista";
        if (navigator.userAgent.indexOf("Windows NT 5.1") != -1) platform="Windows XP";
        if (navigator.userAgent.indexOf("Windows NT 5.0") != -1) platform="Windows 2000";
        if (navigator.userAgent.indexOf("Mac")            != -1) platform="Mac/iOS";
        if (navigator.userAgent.indexOf("X11")            != -1) platform="UNIX";
        if (navigator.userAgent.indexOf("Linux")          != -1) platform="Linux";

        const actionLog = {
            id: ++actionLogs.length,
            date,
            location,
            name,
            IP: ip,
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
