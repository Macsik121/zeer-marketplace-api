const {getDb} = require('./db');

async function getProducts() {
    try {
        const db = getDb();
        return await db.collection('products').find().toArray();
    } catch (error) {
        console.log(error);
    }
}

async function getPopularProducts(_, { name }) {
    try {
        const db = getDb();
        let popularProducts = (
            await db
                .collection('products')
                .aggregate([
                    {
                        $match: {
                            $or: [ { timeBought: { $gte: 30 } } ]
                        }
                    },
                    {
                        $sort: {
                            timeBought: -1
                        }
                    }
                ])
                .toArray()
        );
        if (popularProducts.length < 1) {
            popularProducts = (
                await db
                    .collection('products')
                    .aggregate([
                        {
                            $sort: {
                                timeBought: -1
                            }
                        }
                    ])
                    .toArray()
            );
        }
        return popularProducts;
    } catch (error) {
        console.log(error);
    }
}

async function buyProduct(_, { title, name }) {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ name });
        const product = await db.collection('products').findOne({ title });
        let userExists = false;
        let boughtProduct;
        if (product.peopleBought.length > 0) {
            for(let i = 0; i < product.peopleBought.length; i++) {
                if (product.peopleBought[i] && product.peopleBought[i].name == name) {
                    userExists = true;
                    break;
                }
            }
        }
        if (!userExists) {
            boughtProduct = await db.collection('products').findOneAndUpdate(
                    { title },
                    { $push: { peopleBought: user } },
                    {
                        returnOriginal: false
                    }
            );
            const activelyUntil = new Date();
            activelyUntil.setDate(activelyUntil.getDate() + 7);
            await db.collection('users').updateOne(
                { name },
                { $push: {
                    subscriptions: {
                        status: {
                            isActive: true
                        },
                        activelyUntil,
                        title,
                        productFor: product.productFor,
                        imageURL: product.imageURLdashboard
                    }
                } }
            );
            const res = await db.collection('products').findOneAndUpdate(
                { title },
                { $inc: { timeBought: 1 } },
                { returnOriginal: false }
            );
        }
        return boughtProduct ? boughtProduct.value : product;
    } catch (error) {
        console.log(error);
    }
}

async function getProduct(_, { title }) {
    const db = getDb();
    return await db.collection('products').findOne({title});
}

async function updateBoughtIcon(_, { name }) {
    try {
        const db = getDb();
        const products = await db.collection('products').find().toArray();
        const user = await db.collection('users').findOne({ name });
        products.map(product => {
            for(let i = 0; i < product.peopleBought.length; i++) {
                const person = product.peopleBought[i];
                if (person.name == name && person.avatar != user.avatar) {
                    person.avatar = user.avatar;
                    break;
                }
            }
        });
        await db.collection('products').drop();
        const newProductsCollection = await db.collection('products').insertMany(products)
        return newProductsCollection;
    } catch (error) {
        console.log(error);
    }
}

async function freezeSubscripiton(_, { name, title }) {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ name });
        user.subscriptions = user.subscriptions.map(sub => {
            if (sub.title == title) {
                sub.status = {
                    isActive: false,
                    isExpired: false,
                    isFreezed: true
                };
            }
            return sub;
        });
        const newUser = (
            await db.collection('users').findOneAndUpdate(
                { name },
                { $set: { subscriptions: user.subscriptions } },
                { returnNewDocument: true }
            )
        )
        return newUser.value;
    } catch (error) {
        console.log(error);
    }
}

async function unfreezeSubscription(_, { name, title }) {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ name });
        console.log(user);
        user.subscriptions.map(sub => {
            console.log(sub.title);
            if (sub.title == title) {
                sub.status = {
                    isActive: true,
                    isExpired: false,
                    isFreezed: false
                };
            }
            return sub;
        });
        const newUser = (
            await db.collection('users').findOneAndUpdate(
                { name },
                { $set: { subscriptions: user.subscriptions } },
                { returnNewDocument: true }
            )
        )
        return newUser.value;
    } catch (error) {
        console.log(error);
    }
}

async function createKey(_, { key, title }) {
    try {
        const db = getDb();
        let {
            name,
            daysAmount,
            activationsAmount,
            keysToAddAmount
        } = key;

        const product = await db.collection('products').findOne({ title });
        let isKeyExist = false;
        console.log(product.keys)
        if (product.keys.all.length > 0) {
            for(let i = 0; i < product.keys.all.length; i++) {
                const currentProduct = product.keys.all[i];
                if (currentProduct.name == name) isKeyExist = true;
            }
        } else {
            isKeyExist = false;
        }

        if (isKeyExist) {
            return {
                key: { name: '', daysAmount: 0, activationsAmount: 0, keysToAddAmount: 0 },
                message: 'Такой ключ уже существует'
            }
        }

        let expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + daysAmount);
        
        const keysToAdd = {
            name,
            expiredInDays: expirationDate,
            activationsAmount,
            keysAmount: keysToAddAmount,
            isUsed: false
        };

        const updatedProduct = (
            await db
                .collection('products')
                .findOneAndUpdate(
                    { title },
                    {
                        $push: {
                            "keys.all": keysToAdd,
                            "keys.active": keysToAdd
                        }
                    },
                    {
                        returnOriginal: false,
                        multi: true
                    }
                )
        )
        const { all } = updatedProduct.value.keys;
        return {
            key: all[all.length - 1],
            message: 'Вы успешно создали ключ'
        };
    } catch (error) {
        console.log(error);
    }
}

async function deleteKey(_, { keyName, title }) {
    try {
        const db = getDb();

        await db
            .collection('products')
            .updateOne(
                { title },
                {
                    $pull: {
                        'keys.all': { name: keyName },
                        'keys.active': { name: keyName },
                        'keys.unactive': { name: keyName }
                    }
                }
            );
        return 'Ключь успешно удалён';
    } catch (error) {
        console.log(error);
    }
}

async function deleteAllKeys(_, { title }) {
    try {
        const db = getDb();

        await db
            .collection('products')
            .updateOne(
                { title },
                {
                    $set: {
                        keys: {
                            all: [],
                            active: [],
                            unactive: []
                        }
                    }
                }
            );
        
        return `Вы успешно удалил все ключи у продукта ${title}`
    } catch (error) {
        console.log(error);
    }
}

async function createPromocode() {
    try {
        const db = getDb();

        
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getProducts,
    getPopularProducts,
    getProduct,
    buyProduct,
    updateBoughtIcon,
    freezeSubscripiton,
    unfreezeSubscription,
    createKey,
    deleteKey,
    deleteAllKeys,
    createPromocode
};