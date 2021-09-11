const { getDb } = require('./db');

async function getPurchases() {
    try {
        const db = getDb();

        const purchases = await db.collection('purchases').find().toArray();
        return purchases;
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getPurchases
};
