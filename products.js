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

async function getProduct(_, {title}) {
    const db = getDb();
    return await db.collection('products').findOne({title});
}

module.exports = {getProducts, getPopularProducts, viewProduct, getProduct};