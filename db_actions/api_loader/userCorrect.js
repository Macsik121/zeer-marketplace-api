const bcrypt = require('bcrypt');
const { getDb } = require('../db');

module.exports = async function userCorrect(
    name,
    data,
    compareHwid = true,
    title = null
) {
    const db = getDb();
    const user = await db.collection('users').findOne({ name });
    let response = {
        success: true
    };

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
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
        console.log('user is banned')
        return {
            response: {
                success: false,
                message: 'user banned'
            }
        };
    }

    if (compareHwid && user.hwid != data.hwid) {
        console.log('hwid is not correct')
        return {
            response: {
                success: false,
                message: 'error hwid'
            }
        };
    }

    if (title) {
        let subscriptionExists = false;
        let subscriptionFreezed = false;
        for(let i = 0; i < subscriptions.length; i++) {
            const subscription = subscriptions[i];
            if (title == subscription.title) {
                subscriptionExists = true;
                if (typeof subscription.status.isFreezed == 'undefined') {
                    subscription.status.isFreezed = false;
                }
                if (subscription.status.isFreezed) {
                    subscriptionFreezed = true;
                }
                break;
            }
        }
        if (!subscriptionExists) {
            console.log('there is no sub for the product')
            return {
                response: {
                    success: false,
                    message: 'no license sub'
                }
            };
        }
        if (subscriptionFreezed) {
            console.log('sub exists, but frozen')
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
        response
    };
}
