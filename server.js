require('dotenv').config()
const express = require('express');
const cors = require('cors');
const db = require('./db_actions/db');
const installHandler = require('./api_handler');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

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
