require('dotenv').config()
const express = require('express');
const db = require('./db');
const installHandler = require('./api_handler');
const app = express();
const port = process.env.PORT || 3000;

installHandler(app);

(async function() {
    try {
        await db.connectToDb();
        app.listen(port, () => console.log(`Server has been started with port ${port}`));
    } catch (error) {
        console.log(error);
        await client.close();
    }
})()
