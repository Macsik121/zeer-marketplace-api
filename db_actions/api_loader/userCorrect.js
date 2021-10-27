const bcrypt = require('bcrypt');
const { getDb } = require('../db');
const createLog = require('../../createLog');
const getLocationByIP = require('../../getLocationByIP');
const updateSubscriptions = require('../updateSubscriptions');

module.exports = async function userCorrect({
    name,
    data,
    compareHwid = true,
    title = null,
    ip,
    location = null,
    logErrorTopic
}) {
    const db = getDb();
    let user = await db.collection('users').findOne({ name });
    let response = {
        success: true,
        message: '',
        select_product_title: title
    };
    if (ip) {
        const result = await getLocationByIP(ip);
        location = result.location;
    } else {
        location = 'failed';
        ip = 'IP is not provided'
    }

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
        createLog({
            log: {
                name,
                action: logErrorTopic + ': неверные данные пользователя'
            },
            navigator: '',
            locationData: {
                ip,
                location
            },
            browser: null,
            platform: null
        });
        console.log('wrong user params');
        return {
            response: {
                success: false,
                message: 'wrong user parameters'
            }
        };
    }

    const { status, subscriptions } = user;

    if (typeof status.isBanned == 'undefined') status.isBanned = false;

    if (status.isBanned) {
        createLog({
            log: {
                name,
                action: logErrorTopic + ': пользователь заблокирован'
            },
            navigator: '',
            locationData: {
                ip,
                location
            },
            browser: null,
            platform: null
        });
        console.log('user is banned');
        return {
            response: {
                success: false,
                message: 'user banned'
            }
        };
    }

    if (compareHwid && user.hwid != data.hwid) {
        createLog({
            log: {
                name,
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
        console.log('hwid is incorrect');
        return {
            response: {
                success: false,
                message: 'error hwid'
            }
        };
    }

    user = await updateSubscriptions({
        user,
        returnUser: true
    });
    if (title) {
        let subscriptionExists = false;
        let subscriptionFreezed = false;
        let matchedTitle = title;
        for(let i = 0; i < user.subscriptions.length; i++) {
            const subscription = user.subscriptions[i];
            if (title == subscription.id || title == subscription.title) {
                subscriptionExists = true;
                matchedTitle = subscription.title;
                response.select_product_title = matchedTitle;
                if (subscription.status.isExpired) {
                    subscriptionExists = false;
                }
                if (subscription.status.isFreezed) {
                    subscriptionFreezed = true;
                }
                break;
            }
        }
        if (!subscriptionExists) {
            console.log('there is no sub for the product');
            createLog({
                log: {
                    name,
                    action: logErrorTopic + `: нету подписки на продукт ${matchedTitle}`
                },
                navigator: '',
                locationData: {
                    ip,
                    location
                },
                browser: null,
                platform: null
            });
            return {
                response: {
                    success: false,
                    message: 'no license sub',
                    select_product_title: matchedTitle
                }
            };
        }
        if (subscriptionFreezed) {
            createLog({
                log: {
                    name,
                    action: logErrorTopic + `: подписка заморожена на продукт ${matchedTitle}`
                },
                navigator: '',
                locationData: {
                    ip,
                    location
                },
                browser: null,
                platform: null
            });
            console.log('sub exists, but frozen');
            return {
                response: {
                    success: false,
                    message: 'frozen'
                }
            };
        }
    }

    return {
        user,
        response,
        locationData: {
            ip,
            location
        }
    };
}
