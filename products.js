const {getDb} = require('./db');

async function getProducts() {
    try {
        const db = getDb();
        const products = await db.collection('products').find().toArray();
        // let isUpdated = false;
        // products.map(product => {
        //     if (new Date(product.currentDate).getDate() - new Date().getDate() <= 1) {
        //         isUpdated = true;
        //         product.currentDate = new Date();
        //         product.timeBought = 0;
        //     }
        // });
        // if (isUpdated) {
        //     await db.collection('products').updateMany({}, { $set: { timeBought: 0 } })
        // }
        return products;
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
            // const popularProductsCopy = popularProducts.slice();
            // let notBoughtTimes = popularProductsCopy.length;
            // let resultTimes = 0;
            // popularProductsCopy.map(product => {
            //     if (product.timeBought < 1) {
            //         resultTimes++;
            //     }
            // });
            // if (resultTimes == notBoughtTimes) {
            //     popularProductsCopy.map((product, i) => {
            //         popularProducts.unshift(product);
            //     });
            // }
        }
        // let updateProducts = false;
        // popularProducts.map(product => {
        //     product.subscriptions.map(sub => {
        //         if () {

        //         }
        //     });
        // });
        console.log(popularProducts);
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
            console.log(res.value);
        }
        return boughtProduct ? boughtProduct.value : product;
    } catch(e) {
        console.log(e);
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
        console.log();
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

module.exports = {
    getProducts,
    getPopularProducts,
    getProduct,
    buyProduct,
    updateBoughtIcon,
    freezeSubscripiton,
    unfreezeSubscription
};