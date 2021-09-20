const { getDb } = require('./db');

async function getAllProfit(_, { week }) {
    try {
        const db = getDb();
        const allProfit = await db.collection('profit').find().toArray();
        const weeklyProfit = Array.from(Array(7).keys());
        let { from, to } = week;
        from = new Date(new Date(from).toISOString().substr(0, 10)).getTime();
        to = new Date(new Date(to).toISOString().substr(0, 10)).getTime();

        allProfit.map((profit, i) => {
            const profitDate = (
                new Date(
                    new Date(profit.date)
                        .toISOString()
                        .substr(0, 10)
                ).getTime()
            );
            if (from <= profitDate && profitDate <= to) {
                const dayOfWeek = new Date(profitDate).getDay();
                weeklyProfit[dayOfWeek] = profit;
            }
        });

        weeklyProfit.map(profit => {
            if (Object.prototype.toString.call(profit) != '[object Object]') {
                profit = { date: null, cost: null };
            }
        });

        return weeklyProfit;
    } catch (error) {
        console.log(error);
    }
}

async function createProfit(cost) {
    try {
        const db = getDb();
        let date = new Date(new Date().toISOString().substr(0, 10));
        let profitExists = false;
        const profit = await db.collection('profit').find().toArray();
        for (let i = 0; i < profit.length; i++) {
            const currentProfit = profit[i];
            const profitDate = new Date(new Date(currentProfit.date).toISOString().substr(0, 10)).getTime();
            if (new Date(date).getTime() == profitDate) {
                profitExists = true;
                break;
            }
        }

        if (profitExists) {
            await db
                .collection('profit')
                .updateOne(
                    { date: new Date(date) },
                    {
                        $inc: {
                            cost
                        }
                    }
                );
        } else {
            await db.collection('profit').insertOne({
                date: new Date(date),
                cost
            });
        }

        return 'Кто-то купил товар сегодня.';
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getAllProfit,
    createProfit
};
