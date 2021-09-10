module.exports = async function updateDate(product, db) {
    let isUpdated = false;
    async function update(product) {
        let todayDate = new Date().toISOString().substr(0, 10);
        let { currentDate } = product;
        currentDate = new Date(currentDate).toISOString().substr(0, 10);
        currentDate = new Date(currentDate);
        todayDate = new Date(todayDate);
        let ok = false;

        if (todayDate.getDate() - currentDate.getDate() >= 1) {
            await db
                .collection('products')
                .updateMany(
                    {},
                    {
                        $set: {
                            currentDate: todayDate,
                            timeBought: 0
                        }
                    }
                );
            
            ok = true;
        }
        isUpdated = ok;
        return ok;
    }

    if (Array.isArray(product)) {
        for(let i = 0; i < product.length; i++) {
            const currentProduct = product[i];
            let result = update(currentProduct);
            if (result) {
                break;
            }
        }
    } else if (Object.prototype.toString.call(product) == '[object Object]') {
        update(product);
    }
    return isUpdated;
}
