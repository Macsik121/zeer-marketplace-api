require('dotenv').config();
const router = require('express').Router();
const { getDb } = require('../db');
const fetchGraphQLServer = require('../fetchGraphQLServer');
const userCorrect = require('./userCorrect');
const createLog = require('../../createLog');
const generateString = require('../../generateString');
const getLocationByIP = require('../../getLocationByIP');

router.post('/auth', async (req, res) => {
    const db = getDb();
    const {
        login,
        password,
        hwid,
        ip,
        browser
    } = req.body;
    const { location } = await getLocationByIP(ip);

    const {
        user,
        response
    } = await userCorrect({
        name: login,
        data: { password },
        compareHwid: false,
        title: null,
        ip,
        logErrorTopic: 'Неудачная авторизация в лоадере'
    });
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
            createLog({
                log: {
                    name: login,
                    action: 'Неудачная авторизация в лоадере: неверный HWID'
                },
                navigator: '',
                locationData: {
                    ip,
                    location
                },
                browser: null,
                platform: null
            });
            res.status(400).send({
                message: 'error hwid'
            });
            return;
        }
    }

    const { subscriptions } = user;

    if (subscriptions.length == 0) {
        createLog({
            log: {
                name: login,
                action: 'Неудачная авторизация в лоадере: не обнаружено подписок на продукты'
            },
            navigator: '',
            locationData: {
                ip,
                location
            },
            browser: null,
            platform: null
        });
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
        createLog({
            log: {
                name: login,
                action: 'Неудачная авторизация в лоадере: все подписки заморожены'
            },
            navigator: '',
            locationData: {
                ip,
                location
            },
            browser: null,
            platform: null
        });
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

    createLog({
        log: {
            name: login,
            action: `Успешная авторизация в лоадере: пользователь ${login} успешно авторизовался в лоадере`
        },
        navigator: '',
        locationData: {
            ip,
            location
        },
        browser: null,
        platform: null
    });

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
        select_product,
        ip
    } = req.body;
    const { location } = await getLocationByIP(ip);

    const { response } = await userCorrect({
        name: login,
        data: { password, hwid },
        compareHwid: true,
        title: select_product,
        ip,
        logErrorTopic: 'Запуск продукта'
    });

    const { success, message } = response;
    if (!success) {
        res.status(500).send({
            message
        });
        return;
    }

    createLog({
        log: {
            name: login,
            action: `Запуск продукта: успешно пройдена проверка на лицензию ${select_product}`
        },
        navigator: '',
        locationData: {
            ip,
            location
        },
        browser: null,
        platform: null
    });
    res.status(200).send({
        message: `success for ${select_product}`
    });
});

router.post('/generate_key_product', async (req, res) => {
    const {
        select_product,
        count_days,
        count_activations,
        ip
    } = req.body;
    const db = getDb();
    const { location } = await getLocationByIP(ip);

    const product = await db.collection('products').findOne({ title: select_product });
    if (!product) {
        await createLog({
            log: {
                name: 'Админ',
                action: `Генерация ключа через API: продукт не найден ${select_product}`
            },
            navigator: '',
            locationData: {
                ip,
                location
            },
            browser: null,
            platform: null
        });
        res.status(400).send({
            message: 'Failed found product'
        });
        return;
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

    await createLog({
        log: {
            name: 'Админ',
            action: `Генерация ключа через API: успшеная генерация ключа ${key.name} на ${count_days} дней`
        },
        navigator: '',
        locationData: {
            ip,
            location
        },
        browser: null,
        platform: null
    });
    res.status(200).send({
        key: key.name
    });
});

router.post('/log_inject_hacks', async (req, res) => {
    const {
        login,
        password,
        hwid,
        id_steam,
        windows_name,
        select_product,
        ip
    } = req.body;

    const {
        response
    } = await userCorrect({
        name: login,
        data: { password, hwid },
        compareHwid: true,
        title: select_product,
        ip,
        logErrorTopic: 'Запуск продукта'
    });

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
            ) {
                message
                success
            }
        }
    `;

    const action = `Инжект продукта ${select_product}`;
    const vars = {
        name: login,
        id_steam,
        platform: windows_name,
        action,
        ip
    };

    let result = await fetchGraphQLServer(query, vars);
    console.log('result:', result);

    res.status(200).send({
        message: `Successfully created log for ${select_product}` 
    });
});

router.post('/crash_logs', async (req, res) => {
    const {
        login,
        exception_code,
        log_exection,
        time_game,
        full_log_excetion
    } = req.body;
    const db = getDb();

    const user = await db.collection('users').findOne({ name: login });
    if (!user) {
        res.send(400).send({
            message: 'wrong user parameters'
        });
        return;
    }

    const query = `
        mutation logCrash(
            $login: String!,
            $exception_code: String!,
            $time_game: String!,
            $log_exection: String!,
            $full_log_excetion: String!
        ) {
            logCrash (
                login: $login,
                exception_code: $exception_code,
                time_game: $time_game,
                log_exection: $log_exection,
                full_log_excetion: $full_log_excetion
            ) {
                message
                success
            }
        }
    `;
    const vars = {
        login,
        exception_code,
        time_game,
        log_exection,
        full_log_excetion
    };

    const result = await fetchGraphQLServer(query, vars);
    console.log(result);

    res.status(200).send({
        message: 'Crash is successfully logged'
    });
});

router.post('/block_user', async (req, res) => {
    const {
        login,
        ip
    } = req.body;
    const db = getDb();
    const user = await db.collection('users').findOne({ name: login });
    const { location } = await getLocationByIP(ip);

    if (!user) {
        createLog({
            log: {
                name: login,
                action: 'Блокировка: пользователя не существует'
            },
            navigator: '',
            locationData: {
                ip,
                location
            },
            browser: null,
            platform: null
        });

        res.status(400).send({
            message: 'user not found'
        });
    }

    await db
        .collection('users')
        .updateOne(
            { name: login },
            {
                $set: {
                    status: {
                        isBanned: true,
                        isActive: false,
                        simpleUser: false
                    }
                }
            }
        );

    createLog({
        log: {
            name: login,
            action: 'Блокировка: пользователь заблокирован'
        },
        navigator: '',
        locationData: {
            ip,
            location
        },
        browser: null,
        platform: null
    });

    res.status(200).send({
        message: 'user banned'
    });
});

module.exports = router;
