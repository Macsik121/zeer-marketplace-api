const { getDb } = require('./db');

async function getPurchases(_, { week }) {
    try {
        const db = getDb();
        const result = await db.collection('purchases').find().toArray();
        let purchases = Array.from(Array(7).keys());
        let { from, to } = week;
        from = new Date(from).getTime();
        to = new Date(to).getTime();
        for (let i = 0; i < 7; i++) {
            const purchase = result[i];
            let purchaseDate;
            if (purchase) {
                purchaseDate = new Date(purchase.date).getTime();
                if (from <= purchaseDate && purchaseDate <= to) {
                    purchases[new Date(purchaseDate).getDay()] = purchase;
                }
            };
        }

        return purchases;
    } catch (error) {
        console.log(error);
    }
}

async function createPurchase(_, { boughtTime, days }) {
    try {
        const db = getDb();

        await db
            .collection('purchases')
            .insertOne({
                boughtTime,
                // date: new Date(`2021-09-${new Date().getDate()}`)
                date: new Date(`2021-09-${days}`)
            });
        return 'Purchase is successfully added';
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getPurchases,
    createPurchase
};
