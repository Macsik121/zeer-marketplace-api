const { getDb } = require('./db');

module.exports = async function updateSubscriptions({
    user,
    returnUser = false
}) {
    try {
        const db = getDb();
        const {
            subscriptions,
            name
        } = user;

        let userHasExpiredSub = false;
        let userHasExtended = false;
        subscriptions.map(sub => {
            const {
                status,
                activelyUntil
            } = sub;
            const dateDifference = new Date(activelyUntil) - new Date();
            if (dateDifference < 0 && !status.isFreezed) {
                userHasExpiredSub = true;
            } else if (dateDifference > 0) {
                userHasExtended = true;
            }
        });
        console.log(userHasExpiredSub);
        console.log(userHasExtended);
        if (userHasExpiredSub) {
            user = await db
                .collection('users')
                .findOneAndUpdate(
                    { name },
                    {
                        $set: {
                            'subscriptions.$[subscription].status': {
                                isActive: false,
                                isFreezed: false,
                                isExpired: true
                            }
                        }
                    },
                    {
                        arrayFilters: [
                            {
                                'subscription.activelyUntil': {
                                    $lt: new Date()
                                }
                            }
                        ],
                        returnOriginal: false
                    }
                )
        }
        if (userHasExtended) {
            user = await db
                .collection('users')
                .findOneAndUpdate(
                    { name },
                    {
                        $set: {
                            'subscriptions.$[subscription].status': {
                                isActive: true,
                                isFreezed: false,
                                isExpired: false
                            }
                        }
                    },
                    {
                        arrayFilters: [
                            {
                                'subscription.activelyUntil': {
                                    $gt: new Date()
                                }
                            }
                        ],
                        returnOriginal: false
                    }
                )
        }
        if (returnUser) return user.value;
    } catch (error) {
        console.log(error);
    }
};
