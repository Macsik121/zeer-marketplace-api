require('dotenv').config();
const router = require('express').Router();
const utf8 = require('utf8');
const { getDb } = require('../db');
const fetchGraphQLServer = require('../fetchGraphQLServer');
const userCorrect = require('./userCorrect');
const createLog = require('../../createLog');
const generateString = require('../../generateString');
const getLocationByIP = require('../../getLocationByIP');

router.post('/auth', async (req, res) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    const db = getDb();
    const {
        login,
        password,
        hwid,
        ip
    } = req.body;
    let { location } = await getLocationByIP(ip);
    if (!location) {
        location = 'failed city'
    }
    if (!password || !login || !hwid || !ip) {
        res.status(400).json({ message: 'argument empty' });
        return;
    }

    const {
        user,
        response: { message, success }
    } = await userCorrect({
        name: login,
        data: { password },
        compareHwid: false,
        title: null,
        ip,
        location,
        logErrorTopic: 'Неудачная авторизация в лоадере'
    });
    if (!success) {
        res.status(500).json({
            message
        });
        return;
    }

    let frozenSubsCount = 0;
    let activeSubsCount = 0;
    const activeSubs = [];
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
            res.status(400).json({
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
        res.status(500).json({
            message: 'no subs'
        });
        return;
    }

    const products = (
        await db
            .collection('products')
            .find()
            .project({ changes: 1, id: 1, title: 1 })
            .toArray()
    );

    for(let i = 0; i < subscriptions.length; i++) {
        const subscription = subscriptions[i];
        let lastUpdate = {
            description: 'Обновлений не было за последнее время'
        };
        const {
            status,
            activelyUntil,
            title,
            productFor
        } = subscription;
        let id = 0;
        let productTitle = '';
        const { isActive, isFreezed } = status;
        for(let j = 0; j < products.length; j++) {
            const currentProduct = products[j];
            if (title == currentProduct.title) {
                id = currentProduct.id;
                productTitle = currentProduct.title;
                const lastUpdateIndex = currentProduct.changes.length;
                const change = currentProduct.changes[lastUpdateIndex - 1];
                if (change) {
                    lastUpdate.description = utf8.decode(change.description);
                }
                break;
            };
        }
        if (isActive || isFreezed) {
            if (isFreezed) {
                frozenSubsCount++;
            }
            activeSubsCount++;
            const slotNumber = activeSubs.length;
            const days = new Date(activelyUntil).getDate();
            const months = new Date(activelyUntil).getMonth();
            const years = new Date(activelyUntil).getFullYear();
            activeSubs[slotNumber] = {
                ['slot_' + slotNumber]: {
                    frozen: typeof isFreezed == 'undefined' ? false : isFreezed,
                    id,
                    title: productTitle,
                    sub: `${days}.${months + 1}.${years}`,
                    typeGame: productFor,
                    update_log: '- ' + encodeURIComponent(lastUpdate.description)
                }
            };
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
        res.status(500).json({
            message: 'subs frozen'
        });
        return;
    }

    if (!userHasHwid) {
        await db.collection('users').updateOne({ name: login }, { $set: { hwid } });
    }

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

    res.status(200).json({
        subsCount: activeSubsCount,
        subscriptions: activeSubs,
    });
});

router.post('/inject_dll_preload', async (req, res) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    const {
        login,
        password,
        hwid,
        select_product,
        ip
    } = req.body;
    if (!login || !password || !hwid || !select_product || !ip) {
        res.status(400).json({ message: 'argument empty' });
        return;
    }
    const { location } = await getLocationByIP(ip);
    const db = getDb();
    const product = await db.collection('products').findOne({ id: +select_product }, { title: 1 })

    if (!product) {
        res.status(400).json({ message: 'product not found' });
        return;
    }
    const { response: { success, message } } = await userCorrect({
        name: login,
        data: { password, hwid },
        compareHwid: true,
        title: product.title,
        ip: ip || 'IP is not provided',
        location: location || 'null',
        logErrorTopic: 'Запуск продукта'
    });

    if (!success) {
        res.status(500).json({
            message
        });
        return;
    }

    createLog({
        log: {
            name: login,
            action: `Запуск продукта: успешно пройдена проверка на лицензию ${product.title}`
        },
        navigator: '',
        locationData: {
            ip,
            location
        },
        browser: null,
        platform: null
    });
    res.status(200).json({
        message: `success for ${product.title}`
    });
});

router.post('/generate_key_product', async (req, res) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    const {
        select_product,
        count_days,
        count_activations,
    } = req.body;
    let { ip } = req.body;
    if (!select_product || !count_days || !count_activations || !ip) {
        res.status(400).json({ message: 'argument empty' });
        return;
    }
    const db = getDb();
    let { location } = await getLocationByIP(ip);
    if (!location) location = 'failed city';
    if (!ip || ip == '') ip = 'wrong IP';

    const product = (
        await db
            .collection('products')
            .findOne({ title: select_product })
    );
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
        res.status(400).json({
            message: 'Failed found product'
        });
        return;
    }

    const key = {
        name: generateString(10, true, 5),
        expiredInDays: +count_days,
        activationsAmount: +count_activations,
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
    res.status(200).json({
        key: key.name
    });
});

router.post('/log_inject_hacks', async (req, res) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    let {
        login,
        password,
        hwid,
        id_steam,
        windows_name,
        select_product,
        ip
    } = req.body;
    select_product = +select_product;
    if (isNaN(select_product) ||
        !login ||
        !password ||
        !hwid ||
        !id_steam ||
        !windows_name ||
        !ip
    ) {
        res.status(400).json({
            message: 'argument empty'
        });
        return;
    }

    if (typeof ip == 'undefined') {
        ip = 'null';
    }
    const {
        response: {
            success,
            message,
            select_product_title
        },
        locationData
    } = await userCorrect({
        name: login,
        data: { password, hwid },
        compareHwid: true,
        title: select_product,
        ip,
        logErrorTopic: 'Запуск продукта'
    });

    if (!success) {
        res.status(500).json({
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
            $action: String!,
            $location: String
        ) {
            logInject(
                name: $name,
                ip: $ip,
                id_steam: $id_steam,
                platform: $platform,
                action: $action,
                location: $location
            ) {
                message
                success
            }
        }
    `;

    const action = `Инжект продукта ${select_product_title}`;
    const vars = {
        name: login,
        id_steam,
        platform: windows_name,
        action,
        ip,
        location: locationData.location
    };
    // name: String!,
    // ip: String!,
    // id_steam: String!,
    // platform: String!,
    // action: String!,
    // location: String!

    const result = await fetchGraphQLServer(query, vars);

    res.status(200).json({
        message: `Successfully created log for ${select_product_title}` 
    });
});

router.post('/crash_logs', async (req, res) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    const {
        login,
        exception_code,
        log_exection,
        time_game,
        full_log_excetion
    } = req.body;
    const db = getDb();
    if (!login || !exception_code || !log_exection || !time_game || !full_log_excetion) {
        res.status(400).json({ message: 'argument empty' });
        return;
    }

    const user = await db.collection('users').findOne({ name: login });
    if (!user) {
        res.status(400).json({
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
    if (result.errors) {
        res.sendStatus(400);
        return;
    }

    res.status(200).json({
        message: 'success log created'
    });
});

router.post('/block_user', async (req, res) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    const {
        login,
        ip
    } = req.body;
    if (!login || !ip) {
        res.status(400).json({ message: 'argument empty' });
        return;
    }
    const db = getDb();
    const user = await db.collection('users').findOne({ name: login });
    let { location } = await getLocationByIP(ip);
    if (!location) location = 'failed city';

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

        res.status(400).json({
            message: 'user not found'
        });
        return;
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

    res.status(200).json({
        message: 'user banned'
    });
});

router.get('/version_loader', async (req, res) => {
    const db = getDb();
    const version = await db.collection('loader_version').findOne();
    res.status(200).json({
        version_loader: version.version_loader
    });
});

module.exports = router;
