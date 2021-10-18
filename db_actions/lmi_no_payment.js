const { getDb } = require('./db');

async function paymentNumber() {
    try {
        const db = getDb();
        const { number } = await db.collection('lmi_payment_no').findOne();
        return number;
    } catch (error) {
        console.log(error);
    }
}

async function updatePaymentNumber() {
    try {
        const db = getDb();
        await db
            .collection('lmi_payment_no')
            .updateOne(
                {},
                {
                    $inc: {
                        number: 1
                    }
                }
            );

        return {
            message: 'Номер оплаты успешно увеличен на 1',
            success: true
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    paymentNumber,
    updatePaymentNumber
};
