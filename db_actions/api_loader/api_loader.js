require('dotenv').config();
const router = require('express').Router();
const { getDb } = require('../db');
const fetchGraphQLServer = require('../fetchGraphQLServer');
const userCorrect = require('./userCorrect');
const { createLog } = require('../action-logs');
const generateString = require('../../generateString');

router.post('/auth', async (req, res) => {
    const db = getDb();
    const {
        login,
        password,
        hwid
    } = req.body;

    const {
        user,
        response
    } = await userCorrect(login, { password }, false);
    const { success, message } = response;
    if (!success) {
        res.status(500).send({
            message
        });
        return;
    }

    let frozenSubsCount = 0;
    let userHasHwid = false;
    if (user.hwid != '') {
        userHasHwid = true;
        if (user.hwid != hwid) {
            res.status(400).send({
                message: 'error hwid'
            });
            return;
        }
    }

    const { subscriptions } = user;

    if (subscriptions.length == 0) {
        res.status(500).send({
            message: 'no subs'
        });
        return;
    }

    for(let i = 0; i < subscriptions.length; i++) {
        const subscription = subscriptions[i];
        if (subscription.status.isFreezed) {
            frozenSubsCount++;
        }
    }

    if (frozenSubsCount == subscriptions.length) {
        res.status(500).send({
            message: 'subs frozen'
        });
        return;
    }

    if (!userHasHwid) {
        await db.collection('users').updateOne({ name: login }, { $set: { hwid } });
    }

    const sub = subscriptions[Math.round(Math.random() * subscriptions.length)];
    const {
        title,
        activelyUntil,
        productFor,
        status: { isFreezed }
    } = sub;

    res.status(200).send({
        subsCount: subscriptions.length,
        subName: title,
        subExpired: new Date(activelyUntil).toLocaleDateString(),
        gameType: productFor,
        frozen: typeof isFreezed == 'undefined' ? false : isFreezed
    });
});

router.post('/inject_dll_preload', async (req, res) => {
    const {
        login,
        password,
        hwid,
        select_product
    } = req.body;

    const { response } = await userCorrect(login, { password, hwid }, true, select_product);

    const { success, message } = response;
    if (!success) {
        res.status(500).send({
            message
        });
        return;
    }

    res.status(200).send({
        message: `success for ${select_product}`
    });
});

router.post('/log_inject_hacks', async (req, res) => {
    const {
        login,
        password,
        hwid,
        id_steam,
        windows_name,
        select_product
    } = req.body;

    const {
        response
    } = await userCorrect(login, { password, hwid }, true, select_product);

    const { success, message } = response;
    if (!success) {
        res.status(500).send({
            message
        });
        return;
    }

    const query = `
        mutation logInject(
            $name: String!,
            $ip: String!,
            $id_steam: String!,
            $platform: String!,
            $action: String!
        ) {
            logInject(
                name: $name,
                ip: $ip,
                id_steam: $id_steam,
                platform: $platform,
                action: $action
            )
        }
    `;
    const vars = {
        name: login,
        id_steam,
        platform: windows_name
    };

    await fetchGraphQLServer(query, vars);

    res.status(200).send({
        message: `Successfully created log for ${select_product}` 
    });
});

router.post('/generate_key_product', async (req, res) => {
    const {
        select_product,
        count_days,
        count_activations
    } = req.body;
    const db = getDb();

    const product = await db.collection('products').findOne({ title: select_product });
    if (!product) {
        res.status(400).send({
            message: 'Failed found product'
        });
    }

    const key = {
        name: generateString(10, true, 5),
        expiredInDays: count_days,
        activationsAmount: count_activations,
        isUsed: false,
        usedAmount: 0
    };

    await db
        .collection('products')
        .updateOne(
            { title: select_product },
            {
                $push: {
                    'keys.all': key,
                    'keys.active': key
                }
            }
        );

    res.status(200).send({
        key: key.name
    });
});

module.exports = router;
