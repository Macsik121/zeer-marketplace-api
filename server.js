require('dotenv').config()
const express = require('express');
const db = require('./db_actions/db');
const installHandler = require('./api_handler');
const loaderAPIRouter = require('./db_actions/api_loader/api_loader');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');

app.use(cors());
app.set('trusted proxy', true);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api_loader', loaderAPIRouter);
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
