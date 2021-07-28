const { getDb } = require('./db');

async function createLog(_, { log }) {
    try {
        const db = getDb();

        console.log(log);
        const insertedItem = await db.collection('actionLogs').insertOne(log);
        console.log(await db.collection('actionLogs').find().toArray());
        return await db.collection('actionLogs').findOne({ _id: insertedItem.insertedId });
    } catch (error) {
        console.log(error);
    }
}

async function getActionsLogs() {
    try {
        const db = getDb();
        console.log(await db.collection('actionLogs').find().toArray())
        return await db.collection('actionLogs').find().toArray();    
    } catch (error) {
        console.log(error);
    }
}

async function createKey(_, { key }) {
    return key;
}

module.exports = {
    createLog,
    getActionsLogs
};
