const { getDb } = require('./db');
const createLog = require('../createLog');
const updateDate = require('../update-date');
const { createPurchase } = require('./purchases');
const { createProfit } = require('./profit');
const updateSubscriptions = require('./updateSubscriptions');

async function getProducts() {
    try {
        const db = getDb();
        const products = (
            await db
                .collection('products')
                .aggregate([
                    {
                        $sort: { id: 1 }
                    }
                ])
                .toArray()
        );
        updateDate(products, db);
        return products;
    } catch (error) {
        console.log(error);
    }
}

async function getPopularProducts(_, { amountToGet = 3 }) {
    try {
        const db = getDb();
        let popularProducts = (
            await db
                .collection('products')
                .aggregate([
                    {
                        $match: {
                            timeBought: {
                                $gte: 30
                            }
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
        updateDate(popularProducts, db);
        if (popularProducts.length < amountToGet) {
            const theRestPopularProducts = (
                await db
                    .collection('products')
                    .aggregate([
                        {
                            $sort: {
                                id: 1
                            }
                        }
                    ])
                    .toArray()
            );
            theRestPopularProducts.map(product => {
                if (popularProducts.length < amountToGet) {
                    popularProducts.push(product);
                }
            });
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
        navigator,
        isKey = false,
        productCost,
        issueSub = false,
        days = 30,
        locationData
    }
) {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ name });
        const product = await db.collection('products').findOne({ title });
        let userSub = {
            activelyUntil: new Date()
        };
        let subExists = false;
        let userExists = false;
        let boughtProduct;
        if (product.peopleBought.length > 0) {
            for(let i = 0; i < product.peopleBought.length; i++) {
                const currentProduct = product.peopleBought[i];
                if (currentProduct && currentProduct.name == name) {
                    userExists = true;
                    break;
                }
            }
        }
        for(let i = 0; i < user.subscriptions.length; i++) {
            const subscription = user.subscriptions[i];
            if (subscription.title == title) {
                subExists = true;
                userSub = subscription;
                break;
            }
        }
        let activelyUntil = new Date().setDate(new Date().getDate() + days);
        activelyUntil = new Date(activelyUntil);
        console.log(subExists, userExists);
        if (!userExists || !subExists) {
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
            }
            if (!subExists) {
                let subExpired = new Date(activelyUntil) - new Date() > 0 ? false : true;
                await db.collection('users').updateOne(
                    { name },
                    {
                        $push: {
                            subscriptions: {
                                status: {
                                    isFreezed: false,
                                    isActive: subExpired ? false : true,
                                    isExpired: subExpired ? true : false
                                },
                                activelyUntil,
                                title,
                                productFor: product.productFor,
                                imageURL: product.imageURLdashboard,
                                freezeTime: new Date(),
                                wasFreezed: false
                            }
                        }
                    }
                );
            }
        } else {
            userSub.activelyUntil = (
                new Date(
                    userSub.activelyUntil
                )
            );
            userSub.activelyUntil.setDate(userSub.activelyUntil.getDate() + days);
            await db
                .collection('users')
                .updateOne(
                    { name },
                    {
                        $set: {
                            'subscriptions.$[key].activelyUntil': new Date(userSub.activelyUntil)
                        }
                    },
                    {
                        arrayFilters: [
                            {
                                'key.title': product.title
                            }
                        ]
                    }
                )
        }
        if (!isKey) {
            await db.collection('products').updateOne(
                { title },
                { $inc: { timeBought: 1 } },
                { returnOriginal: false }
            );
            if (!issueSub) {
                createPurchase();
                createProfit(productCost);
                createLog({
                    log: {
                        name: user.name,
                        action: `Покупка продукта ${title}`
                    },
                    navigator,
                    locationData
                });
            }
        }
        return boughtProduct ? boughtProduct.value : product;
    } catch (error) {
        console.log(error);
    }
}

async function getProduct(_, { title }) {
    const db = getDb();
    const product = await db.collection('products').findOne({ title });
    updateDate(product, db);
    return product;
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

async function freezeSubscription(_, { name, title }) {
    try {
        const db = getDb();
        await db.collection('users').updateOne(
            { name },
            {
                $set: {
                    'subscriptions.$[subscription].status': {
                        isActive: false,
                        isExpired: false,
                        isFreezed: true
                    },
                    'subscriptions.$[subscription].wasFreezed': true,
                    'subscriptions.$[subscription].freezeTime': new Date()
                }
            },
            {
                arrayFilters: [
                    {
                        'subscription.title': title
                    }
                ]
            }
        )
        return {
            success: true,
            message: 'Подписка успешно заморожена!'
        };
    } catch (error) {
        console.log(error);
    }
}

async function unfreezeSubscription(_, { name, title }) {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ name });
        let updateSubscription = {};
        for(let i = 0; i < user.subscriptions.length; i++) {
            const sub = user.subscriptions[i];
            if (sub.title == title) {
                sub.status = {
                    isActive: true,
                    isExpired: false,
                    isFreezed: false
                };
                // feezeTime = new Date('2021-09-25')
                // currentDate = new Date('2021-09-24')
                const freezeTime = new Date(sub.freezeTime).getTime();
                const currentDate = new Date().getTime();
                const activelyUntil = new Date(sub.activelyUntil).getTime();
                let difference = currentDate - freezeTime;
                if (currentDate - freezeTime >= 0) {
                    sub.activelyUntil = new Date(activelyUntil + difference);
                } else if (currentDate - freezeTime < 0) {
                    difference = freezeTime - currentDate;
                    sub.activelyUntil = new Date(activelyUntil + difference);
                }
                updateSubscription = sub;
                break;
            }
        }
        await db.collection('users').updateOne(
            { name },
            {
                $set: {
                    'subscriptions.$[subscription]': updateSubscription
                }
            },
            {
                returnNewDocument: true,
                arrayFilters: [
                    {
                        'subscription.title': {
                            $eq: title
                        }
                    }
                ]
            }
        )

        return {
            success: true,
            message: 'Подписка успешно разморожена!'
        };
    } catch (error) {
        console.log(error);
    }
}

async function createKeys(_, {
    key,
    title,
    navigator,
    username,
    locationData
}) {
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
                                    'key.name': name
                                }
                            ]
                        }
                    )
            )

            createLog({
                log: {
                    name: username,
                    action: `Добавление ключа ${name}`
                },
                navigator,
                locationData
            });

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

            createLog({
                log: {
                    name: username,
                    action: `Добавление ключей ${name.map((currName, i) => {
                        if (i == 0) return currName;
                        return ` ${currName}`
                    })}`
                },
                navigator,
                locationData
            });

            return 'Вы успешно создали ключ';
        }
    } catch (error) {
        console.log(error);
    }
}

async function deleteKey(_, {
    keyName,
    title,
    navigator,
    name,
    locationData
}) {
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
        
        createLog({
            log: {
                name,
                action: `Удаление ключа ${keyName}`
            },
            navigator,
            locationData
        });
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

async function createPromocode(_, {
    promocode,
    title,
    navigator,
    username,
    locationData
}) {
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
                                activationsAmount: 0,
                                promocodesAmount: activationsAmount,
                                expirationDays,
                                isUsed
                            }
                        }
                    },
                    { returnOriginal: false }
                )
        )

        const newPromos = updatedProduct.value.promocodes.all;

        createLog({
            log: {
                name: username,
                action: `Создание промокода ${name}`
            },
            navigator,
            locationData
        });

        return newPromos[newPromos.length - 1];
    } catch (error) {
        console.log(error);
    }
}

async function deletePromocode(_, {
    productTitle,
    promocodeTitle,
    navigator,
    name,
    locationData
}) {
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

        createLog({
            log: {
                name,
                action: `Удаление промокода ${promocodeTitle}`
            },
            navigator,
            locationData
        });

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

async function activateKey(
    _,
    {
        keyName,
        username,
        navigator,
        locationData
    }
) {
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
                    navigator,
                    isKey: true,
                    days: matchedKey.expiredInDays,
                    locationData
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
                                'key.name': matchedKey.name
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
                                'key.name': matchedKey.name
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
            createLog({
                log: {
                    name: username,
                    action: `Активация ключа ${matchedKey.name}`
                },
                navigator,
                locationData
            });
            return {
                success: true,
                message
            };
        } else {
            return {
                success: false,
                message: 'Такого ключа не существует'
            }
        }
    } catch (error) {
        console.log(error);
    }
}

async function editProduct(_, {
    product,
    navigator,
    adminName,
    locationData
}) {
    try {
        const db = getDb();
        const {
            oldTitle,
        } = product;
        product.title = product.newTitle;

        const result = await db.collection('products').findOneAndUpdate(
            { title: oldTitle },
            {
                $set: { ...product }
            },
            { returnOriginal: false }
        );

        createLog({
            log: {
                name: adminName,
                action: `Изменение продукта ${oldTitle}`
            },
            navigator,
            locationData
        });

        return result.value;
    } catch (error) {
        console.log(error); 
    }
}

async function deleteProduct(_, {
    title,
    navigator,
    name,
    locationData
}) {
    try {
        const db = getDb();
        await db.collection('products').deleteOne({ title });
        await db
            .collection('users')
            .updateMany(
                {},
                {
                    $pull: {
                        'subscriptions': {
                            title
                        }
                    }
                }
            )

        createLog({
            log: {
                name,
                action: `Удаление продукта ${title}`
            },
            navigator,
            locationData
        });

        return 'Продукт успешно удалён';
    } catch (error) {
        console.log(error);
    }
}

async function createProduct(_, {
    product,
    navigator,
    adminName,
    locationData
}) {
    try {
        const db = getDb();
        const products = await db.collection('products').find().toArray();
        product.id = products[products.length - 1].id + 1;
        product.status = 'undetect';
        product.allCost = [
            {
                menuText: 'Ежемесячно',
                cost: 0,
                costPer: 'Месяц'
            }
        ];
        product.currentDate = new Date();
        product.locationOnclick = '/dashboard/products/' + product.title;
        product.costPerDayInfo = 0;
        product.timeBought = 0;
        product.freezeTime = new Date();
        product.wasFreezed = false;

        const result = await db.collection('products').insertOne(product);

        createLog({
            log: {
                name: adminName,
                action: `Создание продукта ${product.title}`
            },
            navigator,
            locationData
        });
        return result.ops[0];
    } catch (error) {
        console.log(error);
    }
}

async function createNews(_, { title, change }) {
    try {
        const db = getDb();
        const product = await db.collection('products').findOne({ title });
        change.id = product.changes.length + 1;

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
                        id: changeTitle
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

async function disableProduct(_, { title }) {
    try {
        const db = getDb();

        await db
            .collection('products')
            .updateOne(
                { title },
                {
                    $set: {
                        status: 'onupdate'
                    }
                }
            )
    } catch (error) {
        console.log(error);
    }
}

async function addCost(_, { cost, title }) {
    try {
        const db = getDb();
        const {
            costPer,
            menuText,
            days
        } = cost;

        if (!cost.cost) {
            return {
                success: false,
                message: 'Вы не ввели цену за продукт'
            };
        }

        if (costPer == '') {
            return {
                success: false,
                message: 'Вы не ввели поле "Цена за", оно является обязательным'
            }
        }

        if (!days) {
            return {
                success: false,
                message: 'Вы не ввели поле "Дни". Это поле обязательное'
            }
        }

        if (menuText == '') {
            return {
                success: false,
                message: 'Вы не ввели "Надпись в меню", нужно ввести для добавления цены'
            };
        }

        await db
            .collection('products')
            .updateOne(
                { title },
                {
                    $push: {
                        allCost: cost
                    }
                }
            )

        return {
            success: true,
            message: "Цена за продукт успешно добавлена"
        };
    } catch (error) {
        console.log(error);
    }
}

async function deleteCost(_, { costTitle, title }) {
    try {
        const db = getDb();

        await db
            .collection('products')
            .updateOne(
                { title },
                {
                    $pull: {
                        allCost: {
                            menuText: costTitle
                        }
                    }
                }
            );

        return 'Everything happened pretty well';
    } catch (error) {
        console.log(error);
    }
}

async function saveCostChanges(_, { title, costPerDayInfo, locationOnclick }) {
    try {
        const db = getDb();
        await db.collection('products').updateOne({ title }, { $set: {
            costPerDayInfo,
            locationOnclick
        } });

        return 'Evertyhing is successfully done';
    } catch (error) {
        console.log(error);
    }
}

async function updateProductBG(_, { title, imageURL }) {
    try {
        const db = getDb();
        await db.collection('products').updateOne({ title }, { $set: { imageURL } });

        return 'BG is successfully updated';
    } catch (error) {
        console.log(error);
    }
}

async function isPromocodeRight(_, { name, title }) {
    try {
        const db = getDb();
        const { promocodes: { active } } = (
            await db
                .collection('products')
                .findOne({ title }, { projection: { promocodes: 1 } })
        );
        let response = {
            response: {
                success: false,
                message: 'Вы ввели неверное имя промокода'
            },
            discountPercent: 1
        };
        for(let i = 0; i < active.length; i++) {
            const promo = active[i];
            if (promo.name == name) {
                console.log(promo);
                if (promo.activationsAmount + 1 > promo.promocodesAmount) {
                    response = {
                        response: {
                            success: false,
                            message: 'Лимит использования этого промокода превышен'
                        },
                        discountPercent: 1
                    }
                } else {
                    response = {
                        response: {
                            success: true,
                            message: `Вы успешно ввели промокод! Теперь вы можете купить продукт ${title} со скидкой ${promo.discountPercent}%!`
                        },
                        discountPercent: promo.discountPercent
                    }
                }
                break;
            }
        }
        return response;
    } catch (error) {
        console.log(error);
    }
}

async function changeLoaderVersion(_, { version }) {
    try {
        const db = getDb();
        await db.collection('loader_version').updateOne({}, { $set: { version_loader: version } });
        console.log({
            message: "message",
            success: true
        });

        return {
            message: 'Вы успешно обновили версию лоадера',
            success: true
        };
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
    freezeSubscription,
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
    deleteAllNews,
    disableProduct,
    addCost,
    deleteCost,
    saveCostChanges,
    updateProductBG,
    isPromocodeRight,
    changeLoaderVersion
};
