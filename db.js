require('dotenv').config();
const { MongoClient } = require('mongodb');
const dbUri = process.env.DB_URL || 'mongodb+srv://Macsick121:AsDf1234@cluster0.dtorr.mongodb.net/zeer-marketplace?retryWrites=true&w=majority';

let db;

async function connectToDb() {
    const client = new MongoClient(dbUri, {useNewUrlParser: true, useUnifiedTopology: true});
    await client.connect();
    console.log(`MongoDB has successfully connected on ${dbUri}`);
    db = client.db();
}

function getDb() {
    return db;
}

module.exports = { connectToDb, getDb };