const { getDb } = require('./db');

function createLog(_, { log }) {
    try {
        const db = getDb();


    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    createLog
};
