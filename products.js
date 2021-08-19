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

async function buyProduct(
        _,
        {
            title,
            name,
            dateToSet = 7,
            subscriptionExists = false
        }
    ) {
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
            boughtProduct = (
                await db.collection('products').findOneAndUpdate(
                    { title },
                    { $push: { peopleBought: user } },
                    {
                        returnOriginal: false
                    }
                )
            );
            let activelyUntil = new Date();
            activelyUntil.setDate(activelyUntil.getDate() + dateToSet);
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
            await db.collection('products').findOneAndUpdate(
                { title },
                { $inc: { timeBought: 1 } },
                { returnOriginal: false }
            );
        } else {
            let subIndex = 0;
            for(let i = 0; i < user.subscriptions.length; i++) {
                const currentSub = user.subscriptions[i];
                if (currentSub.title == product.title) {
                    subIndex = i;
                    break;
                }
            }
            let activelyUntil;
            activelyUntil = new Date(user.subscriptions[subIndex].activelyUntil);
            activelyUntil.setDate(activelyUntil.getDate() + 30);
            product.activelyUntil = activelyUntil;
            await db
                .collection('users')
                .updateOne(
                    { name },
                    {
                        $set: {
                            'subscriptions.$[key].activelyUntil': activelyUntil
                        }
                    },
                    {
                        arrayFilters: [{
                            'key.title': {
                                $eq: product.title
                            }
                        }]
                    }
                )
        }
        return boughtProduct ? boughtProduct.value : product;
    } catch (error) {
        console.log(error);
    }
}

async function getProduct(_, { title }) {
    const db = getDb();
    return await db.collection('products').findOne({ title });;
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
        user.subscriptions.map(sub => {
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

        if (product.keys.all.length > 0) {
            for(let i = 0; i < product.keys.all.length; i++) {
                const currentProduct = product.keys.all[i];
                if (currentProduct.name == name) isKeyExist = true;
            }
        } else {
            isKeyExist = false;
        }
        
        const keysToAdd = {
            name,
            expiredInDays: daysAmount,
            activationsAmount: 0,
            keysAmount: keysToAddAmount,
            isUsed: false
        };

        if (isKeyExist) {
            const result = (
                await db
                    .collection('products')
                    .findOneAndUpdate(
                        { title },
                        {
                            $inc: {
                                'keys.all.$[key].keysAmount': keysToAddAmount
                            }
                        },
                        {
                            returnOriginal: false,
                            arrayFilters: [
                                {
                                    key: name
                                }
                            ]
                        }
                    )
            )

            const { all } = result.value.keys;

            return {
                key: all[all.length - 1],
                message: `Вы успешно добавили ${keysToAddAmount} ключей`
            };
        }

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

async function createPromocode(_, { promocode, title }) {
    try {
        const db = getDb();

        const {
            name,
            discountPercent,
            activationsAmount,
            expirationDays,
            isUsed
        } = promocode;

        const product = await db.collection('products').findOne({ title });
        let promocodeExists = false;

        if (product && product.promocodes) {
            for (let i = 0; i < product.promocodes.all.length; i++) {
                const promo = product.promocodes.all[i];
                if (promo.name == promocode.name) promocodeExists = true;
            }
        }

        if (promocodeExists) {
            return {
                name: '',
                discountPercent: 0,
                activationsAmount: 0,
                expirationDays: 0,
                isUsed: false
            };    
        }

        const updatedProduct = (
            await db
                .collection('products')
                .findOneAndUpdate(
                    { title },
                    {
                        $push: {
                            'promocodes.all': {
                                name,
                                discountPercent,
                                activationsAmount,
                                expirationDays,
                                isUsed
                            },
                            'promocodes.active': {
                                name,
                                discountPercent,
                                activationsAmount,
                                expirationDays,
                                isUsed
                            }
                        }
                    },
                    { returnOriginal: false }
                )
        )

        const newPromos = updatedProduct.value.promocodes.all;

        return newPromos[newPromos.length - 1];
    } catch (error) {
        console.log(error);
    }
}

async function activateKey(_, { keyName, username }) {
    try {
        const db = getDb();

        const allProducts = await db.collection('products').find().toArray();
        let keyExists = false;
        let message = '';
        let matchedProduct = {};
        let matchedKey = {};
        for(let i = 0; i < allProducts.length; i++) {
            const product = allProducts[i];
            for(let j = 0; j < product.keys.all.length; j++) {
                const key = product.keys.all[j];
                let name;
                if (!key) name = '';
                else name = key.name;

                if (name == keyName && key.activationsAmount < key.keysAmount) {
                    keyExists = true;
                    matchedProduct = product;
                    matchedKey = key;
                    matchedKey.activationsAmount++;
                    matchedKey.isUsed = true;
                    product.keys.unactive.map(unactiveKey => {
                        if (message != '' && unactiveKey.name == keyName) {
                            message = 'Этот ключ уже нельзя активировать, так как количество ключей ограничено';
                        }
                    });
                } else if (key.activationsAmount > key.keysAmount) {
                    message = 'Количество активаций на этот ключ законичлось';
                }
            }
        }

        if (message == '' && keyExists) {
            buyProduct(
                _,
                {
                    title: matchedProduct.title,
                    name: username,
                    dateToSet: 30,
                    subscriptionExists: true
                }
            );
            await db
                .collection('products')
                .updateOne(
                    { title: matchedProduct.title },
                    {
                        $set: {
                            'keys.all.$[key]': {
                                ...matchedKey
                            }
                        }
                    },
                    {
                        arrayFilters: [
                            {
                                'key.name': {
                                    $eq: matchedKey.name
                                }
                            }
                        ]
                    }
                )

            await db
                .collection('products')
                .updateOne(
                    { title: matchedProduct.title },
                    {
                        $set: {
                            'keys.active.$[key]': {
                                ...matchedKey
                            }
                        }
                    },
                    {
                        arrayFilters: [
                            {
                                'key.name': {
                                    $eq: matchedKey.name
                                }
                            }
                        ]
                    }
                )
            
            if (matchedKey.activationsAmount >= matchedKey.keysAmount) {
                await db
                    .collection('products')
                    .updateOne(
                        { title: matchedProduct.title },
                        {
                            $pull: {
                                'keys.active': {
                                    name: matchedKey.name
                                }
                            }
                        }
                    )
                await db
                    .collection('products')
                    .updateOne(
                        { title: matchedProduct.title },
                        {
                            $push: {
                                'keys.unactive': matchedKey
                            }
                        }
                    )
            }
            message = `Поздравляем, вы успешно активировали ключ. Теперь у вас появилась подписка на ${matchedProduct.title}`;
        }

        if (keyExists) {
            return message;
        } else {
            return 'Такого ключа не существует';
        }
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
    createPromocode,
    activateKey
};