const {getDb} = require('./db');

async function getProducts() {
    try {
        const db = getDb();
        const products = db.collection('products').find().toArray();
        return products;    
    } catch (error) {
        console.log(error);
    }
}

async function getPopularProducts(_, {viewedToday}) {
    try {
        const db = getDb();
        const filter = { viewedToday: {} }
        filter.viewedToday.$gte = viewedToday;
        const popularProducts = await db.collection('products').find(filter).toArray();
        return popularProducts;    
    } catch (error) {
        console.log(error);
    }
}

async function viewProduct(_, { title }) {
    try {
        const db = getDb();
        const product = await db
            .collection('products')
            .updateOne({title}, {$inc: {viewedToday: 1}}) || null;
    
        if (product) {
            return await db.collection('products').findOne({title});
        };
        return product;
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
                        imageURL: product.imageURLdashboard
                    }
                } }
            );
        }
        return boughtProduct ? boughtProduct.value : product;
    } catch(e) {
        console.log(e);
    }
}

async function getProduct(_, {title}) {
    const db = getDb();
    return await db.collection('products').findOne({title});
}

module.exports = {
    getProducts,
    getPopularProducts,
    viewProduct,
    getProduct,
    buyProduct
};