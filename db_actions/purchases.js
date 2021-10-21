const { getDb } = require('./db');

async function getPurchases(_, { week }) {
    try {
        console.log('getPurhcases is triggered');
        const db = getDb();
        const result = await db.collection('purchases').find().toArray();
        let purchases = Array.from(Array(7).keys());
        let { from, to } = week;
        from = new Date(from).getTime();
        to = new Date(to).getTime();
        for (let i = 0; i < 7; i++) {
            const purchase = result[result.length - i + 1];
            let purchaseDate;
            if (purchase) {
                purchaseDate = new Date(purchase.date);
                if (from <= purchaseDate.getTime() && purchaseDate.getTime() <= to) {
                    purchases[new Date(purchaseDate).getDay()] = purchase;
                }
            };
        }

        return purchases;
    } catch (error) {
        console.log(error);
    }
}

async function createPurchase(currentDate = new Date()) {
    try {
        const db = getDb();
        const purchases = await db.collection('purchases').find().toArray();
        currentDate = new Date(new Date(currentDate).toISOString().substr(0, 10));
        let purchaseExists = false;

        purchases.map(purchase => {
            const purchaseDate = new Date(purchase.date).toISOString().substr(0, 10);
            if (new Date(purchaseDate).getTime() - new Date(currentDate).getTime() == 0) {
                purchaseExists = true;
            }
        });
        if (purchaseExists) {
            await db
                .collection('purchases')
                .updateOne(
                    { date: new Date(currentDate) },
                    {
                        $inc: {
                            boughtTime: 1
                        }
                    }
                );
        } else {
            await db
                .collection('purchases')
                .insertOne({
                    boughtTime: 1,
                    date: new Date(currentDate)
                });
        }

        return 'Purchase is successfully added';
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getPurchases,
    createPurchase
};
