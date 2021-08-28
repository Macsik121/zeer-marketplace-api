const { getDb } = require('./db');
const createLog = require('./createLog');

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
            dateToSet = 30,
            navigator
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
                    {
                        $push: {
                            peopleBought: {
                                avatar: user.avatar,
                                name: user.name
                            }
                        }
                    },
                    { returnOriginal: false }
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
            activelyUntil.setDate(activelyUntil.getDate() + dateToSet);
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
        createLog(
            {
                name: user.name,
                action: `Покупка продукта ${title}`
            },
            navigator
        );
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

async function createKeys(_, { key, title, navigator, username }) {
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

        // if (product.keys.all.length > 0) {
        //     for(let i = 0; i < product.keys.all.length; i++) {
        //         const currentProductName = product.keys.all[i].name;
        //         const currentName 
        //         if (currentProduct.name == name) isKeyExist = true;
        //     }
        // }
        
        const keysToAdd = {
            name,
            expiredInDays: daysAmount,
            activationsAmount,
            usedAmount: 0,
            isUsed: false
        };

        let updatedProduct = {};

        if (isKeyExist) {
            updatedProduct = (
                await db
                    .collection('products')
                    .findOneAndUpdate(
                        { title },
                        {
                            $inc: {
                                'keys.all.$[key].usedAmount': 1
                            }
                        },
                        {
                            returnOriginal: false,
                            arrayFilters: [
                                {
                                    'key.name': {
                                        $eq: name
                                    }
                                }
                            ]
                        }
                    )
            )

            const { all } = updatedProduct.value.keys;
            
            createLog(
                {
                    name: username,
                    action: `Добавление ключа ${name}`
                },
                navigator
            );

            return `Вы успешно добавили ${keysToAddAmount} ключей`
        } else {
            for (let i = 0; i < name.length; i++) {
                keysToAdd.name = name[i];
                await db
                    .collection('products')
                    .updateOne(
                        { title },
                        {
                            $push: {
                                "keys.all": keysToAdd,
                                "keys.active": keysToAdd
                            }
                        }
                    )
            }

            createLog(
                {
                    name: username,
                    action: `Добавление ключей ${name.map(currName => `${currName}, `)}`
                },
                navigator
            );

            return 'Вы успешно создали ключ'
        }
    } catch (error) {
        console.log(error);
    }
}

async function deleteKey(_, { keyName, title, navigator, name }) {
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
        
        createLog(
            {
                name,
                action: `Удаление ключа ${keyName}`
            },
            navigator
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

async function createPromocode(_, { promocode, title, navigator, username }) {
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
                                activationsAmount: 0,
                                promocodesAmount: activationsAmount,
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

        createLog(
            {
                name: username,
                action: `Создание промокода ${name}`
            },
            navigator
        );

        return newPromos[newPromos.length - 1];
    } catch (error) {
        console.log(error);
    }
}

async function deletePromocode(_, { productTitle, promocodeTitle, navigator, name }) {
    try {
        const db = getDb();

        await db
            .collection('products')
            .updateOne(
                { title: productTitle },
                {
                    $pull: {
                        'promocodes.all': {
                            name: promocodeTitle
                        },
                        'promocodes.active': {
                            name: promocodeTitle
                        }
                    }
                }
            )

        createLog(
            {
                name,
                action: `Удаление промокода ${promocodeTitle}`
            },
            navigator
        );
        
        return 'Промокод успешно удалён'
    } catch (error) {
        console.log(error);
    }
}

async function deleteAllPromocodes(_, { title }) {
    try {
        const db = getDb();

        const result = (
            await db
                .collection('products')
                .findOneAndUpdate(
                    { title },
                    {
                        $set: {
                            promocodes: {
                                all: [],
                                active: [],
                                unactive: []
                            }
                        }
                    },
                    { returnOriginal: false }
                )
        );
        
        return result.value;
    } catch (error) {
        console.log(error);
    }
}

async function activateKey(_, { keyName, username, navigator }) {
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

                if (name == keyName && key.usedAmount < key.activationsAmount) {
                    keyExists = true;
                    matchedProduct = product;
                    matchedKey = key;
                    matchedKey.usedAmount++;
                    matchedKey.isUsed = true;
                    product.keys.unactive.map(unactiveKey => {
                        if (message != '' && unactiveKey.name == keyName) {
                            message = 'Этот ключ уже нельзя активировать, так как количество ключей ограничено';
                        }
                    });
                } else if (key.usedAmount > key.activationsAmount) {
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
                    dateToSet: matchedKey.expiredInDays,
                    subscriptionExists: true,
                    navigator,
                    inActivateKey: true
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
            
            if (matchedKey.usedAmount >= matchedKey.activationsAmount) {
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
            createLog(
                {
                    name: username,
                    action: 'Активирование ключа'
                },
                navigator
            );
            return message;
        } else {
            return 'Такого ключа не существует';
        }
    } catch (error) {
        console.log(error);
    }
}

async function editProduct(_, { product }) {
    try {
        const db = getDb();
        const {
            description,
            characteristics,
            reloading,
            oldTitle,
            newTitle,
            costPerDay,
            productFor,
            imageURLdashboard,
            logo,
            workingTime
        } = product;

        const result = await db.collection('products').findOneAndUpdate(
            { title: oldTitle },
            {
                $set: {
                    description,
                    characteristics,
                    reloading,
                    title: newTitle,
                    costPerDay,
                    productFor,
                    imageURLdashboard,
                    logo,
                    workingTime
                }
            },
            { returnOriginal: false }
        );

        return result.value;
    } catch (error) {
        console.log(error);
    }
}

async function deleteProduct(_, { title }) {
    try {
        const db = getDb();

        await db.collection('products').deleteOne({ title });
        return 'Продукт успешно удалён';
    } catch (error) {
        console.log(error);
    }
}

async function createProduct(_, { product }) {
    try {
        const db = getDb();
        const products = await db.collection('products').find().toArray();
        product.id = products.length + 1;

        const result = await db.collection('products').insertOne(product);
        return result.ops[0];
    } catch (error) {
        console.log(error);
    }
}

async function createNews(_, { title, change }) {
    try {
        const db = getDb();

        await db
            .collection('products')
            .updateOne(
                { title },
                {
                    $push: {
                        changes: change
                    }
                }
            )
        
        return `Новость у продукта ${title} успешно создана`;
    } catch (error) {
        console.log(error);
    }
}

async function deleteNews(_, { title, changeTitle }) {
    try {
        const db = getDb();

        await db.collection('products').updateOne(
            { title },
            {
                $pull: {
                    changes: {
                        description: changeTitle
                    }
                }
            }
        );

        return `Новость успешно удалена`;
    } catch (error) {
        console.log(error);
    }
}

async function deleteAllNews(_, { title }) {
    try {
        const db = getDb();

        await db.collection('products').updateOne({ title }, { $set: { changes: [] } });
        return `Новости у продукта ${title} были успешно удалены`;
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
    createKeys,
    deleteKey,
    deleteAllKeys,
    deleteAllPromocodes,
    activateKey,
    createPromocode,
    deletePromocode,
    editProduct,
    deleteProduct,
    createProduct,
    createNews,
    deleteNews,
    deleteAllNews
};
