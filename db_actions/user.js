const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');
const { sendMail } = require('../nodemailer');
const createActionLog = require('../createLog');
const createLog = require('../createLog');
const updateSubscriptions = require('./updateSubscriptions');
const generateString = require('../generateString');

async function getUser(_, { name }) {
    try {
        const db = getDb();
        const user = (
            await db.collection('users').findOne({ name }) ||
            await db.collection('users').findOne({ email: name })
        )
        if (!user) {
            return {
                name: '',
                id: 0,
                email: '',
                subscriptions: [],
                resetRequests: []
            }
        }
    
        return user;    
    } catch (error) {
        console.log(error);
    }
}

async function signUp(_, {
    email,
    name,
    password,
    navigator,
    locationData
}) {
    try {
        const db = getDb();
        const existingUser = (
            await db.collection('users').findOne({ email }) ||
            await db.collection('users').findOne({ name })
        );
        const allUsers = await db.collection('users').find().toArray();
        const hashedPassword = await bcrypt.hash(password, 12);

        if (existingUser && existingUser.name == name) {
            return {
                user: existingUser,
                token: '',
                message: 'Пользователь с данным именем уже существует.'
            }
        }

        if (existingUser && existingUser.email == email) {
            return {
                user: existingUser,
                token: '',
                message: 'Пользователь с такой почтой уже существует'
            }
        }

        const avatarBGs = ['#c00', '#f60', '#6f6', '#03c', '#33f', '#60c', '#1E75FF'];

        const id = ++allUsers[allUsers.length - 1].id || 1;

        const createdUser = await db.collection('users').insertOne({
            id,
            name,
            email,
            password: hashedPassword,
            subscriptions: [],
            avatar: avatarBGs[Math.floor(Math.random() * avatarBGs.length)],
            status: {
                simpleUser: true,
                isAdmin: false,
                isBanned: false
            },
            registeredDate: new Date(),
            resetRequests: [],
            hwid: '',
            usedPromocodes: [],
            usedKeys: []
        });

        const insertedId = createdUser.insertedId;

        const user = await db.collection('users').findOne({ _id: insertedId });

        createLog({
            log: {
                name: user.name,
                action: 'Регистрация на сайте'
            },
            navigator,
            locationData
        });

        token = jwt.sign(
            {
                email: user.email,
                id: user._id,
                name: user.name,
                avatar: user.avatar,
                status: user.status,
                hwid: user.hwid,
                subscriptions: user.subscriptions
            },
            '!@secretKey: Morgenshtern - Show@!',
            { expiresIn: '3d' }
        );
    
        return {
            user,
            token,
            message: `You successfully Registered as "${user.name}"`
        };
    } catch (error) {
        console.log(error);
    }
}

async function signIn(_, {
    email,
    password,
    rememberMe,
    navigator,
    locationData
}) {
    try {
        const db = getDb();
        const user = (
            await db.collection('users').findOne({ email }) ||
            await db.collection('users').findOne({ name: email })
        )

        if (!user) {
            return {
                user,
                token: '',
                message: 'Такого пользователя не существует'
            }
        }

        const isPasswordcorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordcorrect) return {
            user,
            token: '',
            message: 'Вы ввели неправильный пароль'
        };

        if (rememberMe) {
            token = jwt.sign(
                {
                    email: user.email,
                    id: user._id,
                    name: user.name,
                    avatar: user.avatar,
                    status: user.status,
                    hwid: user.hwid,
                    subscriptions: user.subscriptions
                },
                '!@secretKey: Morgenshtern - Show@!'
            );
        } else {
            token = jwt.sign(
                {
                    email: user.email,
                    id: user._id,
                    name: user.name,
                    avatar: user.avatar,
                    status: user.status,
                    hwid: user.hwid,
                    subscriptions: user.subscriptions
                },
                '!@secretKey: Morgenshtern - Show@!',
                { expiresIn: '3d' }
            )
        }

        console.log(locationData);
        createLog({
            log: {
                name: user.name,
                action: 'Вход в аккаунт на сайте'
            },
            navigator,
            locationData
        });

        return {
            user,
            token,
            message: 'You seccessfully logged in!'
        };
    } catch (error) {
        console.log(error);
    }
}

async function resetPassword(_, {
    email,
    navigator,
    locationData
}) {
    try {
        const db = getDb();
        let user = (
            await db.collection('users').findOne({ email })
        );
        if (!user) {
            user = await db.collection('users').findOne({ name: email });
            email = user.email;
        }
        if (!user) {
            return {
                message: 'Этого пользователя не существует',
                success: false
            };
        }
        const generatedPassword = generateString(15, false);
        sendMail({
            email,
            generatedPassword,
            navigator,
            locationData
        });
        const newHashedPassword = await bcrypt.hash(generatedPassword, 12);

        await db
            .collection('users')
            .updateOne(
                { email },
                { $set: { password: newHashedPassword } }
            ) || (
                await db
                    .collection('users')
                    .updateOne(
                        { name: email },
                        { $set: { password: newHashedPassword } }
                    )
            )
        return {
            // user,
            message: 'На указанную почту отправленно сообщение',
            success: true
        };
    } catch (error) {
        console.log(error);
    }
}

function getToken() {
    return token;
}

function verifyToken(_, { token }) {
    try {
        let error;
        if (token) {
            const decodedData = jwt.verify(
                token,
                '!@secretKey: Morgenshtern - Show@!',
                function(err, decoded) {
                    if (err) {
                        error = err;
                    }
                }
            );
        }
        if (error) {
            token = '';
            return error.message;
        }
        return token;
    } catch (error) {
        console.log(error);
    }
}

async function changeAvatar(_, { name, avatar }) {
    try {
        const db = getDb();
        let user = await db.collection('users').findOneAndUpdate(
            { name },
            { $set: { avatar } },
            { returnOriginal: false }
        );

        user = user.value
        const newToken = (
            jwt.sign(
                {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    status: user.status,
                    hwid: user.hwid,
                    subscriptions: user.subscriptions
                },
                '!@secretKey: Morgenshtern - Show@!',
                { expiresIn: '3d' }
            )
        )
        return newToken;
    } catch (error) {
        console.log(error);
    }
}

async function changePassword(_, { name, oldPassword, newPassword }) {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ name });

        if (!await bcrypt.compare(oldPassword, user.password)) {
            return {
                success: false,
                message: 'Ваш старый пароль неверный'
            };
        }

        if (await bcrypt.compare(newPassword, user.password)) {
            return {
                success: false,
                message: 'Вы успешно поменяли пароль'
            };
        }

        await db.collection('users').updateOne(
            { name },
            { $set: { password: await bcrypt.hash(newPassword, 12) } }
        );

        return {
            success: true,
            message: 'Вы успешно поменяли пароль'
        }
    } catch (error) {
        console.log(error);
    }
}

async function getSubscriptions(_, { name }) {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ name });
        const activeSubs = [];
        const overdueSubs = [];
        let userHasExpiredSub = false;
        let userHasExtended = false;
        user.subscriptions.map(sub => {
            const {
                status,
                activelyUntil
            } = sub;
            const dateDifference = new Date(activelyUntil) - new Date();
            if (status.isActive || status.isFreezed) {
                if (dateDifference < 0 && !status.isFreezed) {
                    userHasExpiredSub = true;
                    sub.status = { isExpired: true, isActive: false, isFreezed: false }
                    overdueSubs.push(sub);
                    return;
                }
                activeSubs.push(sub);
            } else if (status.isExpired) {
                if (dateDifference > 0) {
                    userHasExtended = true;
                    sub.status = { isExpired: false, isActive: true, isFreezed: false }
                    activeSubs.push(sub);
                    return;
                }
                overdueSubs.push(sub);
            }
        });
        const subscriptions = {
            all: user.subscriptions,
            active: activeSubs,
            overdue: overdueSubs
        };
        if (userHasExpiredSub) {
            await db
                .collection('users')
                .updateOne(
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
                        ]
                    }
                )
        }
        if (userHasExtended) {
            await db
                .collection('users')
                .updateOne(
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
                        ]
                    }
                )
        }
        return subscriptions;
    } catch (error) {
        console.log(error);
    }
}

async function getUsers() {
    const db = getDb();

    return (
        await db
            .collection('users')
            .aggregate([
                {
                    $sort: {
                        id: -1
                    }
                }
            ])
            .toArray()
    );
}

async function getResetRequests(_, { name }) {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({ name });

        return user.resetRequests;
    } catch (error) {
        console.log(error);
    }
}

async function makeResetRequest(
    _,
    {
        name,
        reason,
        navigator,
        locationData
    }
) {
    try {
        const db = getDb();

        const users = await db.collection('users').find().toArray();
        let id = 1;
        let user = {};
        users.map(currentUser => {
            if (currentUser.name == name) {
                user = currentUser;
            }
            currentUser.resetRequests && currentUser.resetRequests.map(request => id++);
        });
        const { ip, location } = locationData;
        user.resetRequests.unshift({
            id,
            owner: name,
            number: ++user.resetRequests.slice().length,
            reason,
            date: new Date(),
            status: 'waiting',
            ip,
            location
        });

        const updatedUser = (
            await db
                .collection('users')
                .findOneAndUpdate(
                    { name },
                    {
                        $set: {
                            resetRequests: user.resetRequests
                        }
                    },
                    { returnOriginal: false }
                )
        );
        const { resetRequests } = updatedUser.value;

        createLog({
            log: {
                name: user.name,
                action: 'Подача заявки на сброс привязки'
            },
            navigator,
            locationData
        });

        return resetRequests[resetRequests.length - 1];
    } catch (error) {
        console.log(error);
    }
}

async function deleteUser(_, {
    name,
    navigator,
    adminName,
    locationData
}) {
    try {
        const db = getDb();
        await db.collection('users').deleteOne({ name });

        createLog({
            log: {
                name: adminName,
                action: `Удаление пользователя ${name}`
            },
            navigator,
            locationData
        });

        return `Вы успешно удалили пользователя с именем ${name}`
    } catch (error) {
        console.log(error);
    }
}

async function getResetBindings() {
    try {
        const db = getDb();

        const users = (
            await db
                .collection('users')
                .aggregate([
                    {
                        $sort: {
                            id: -1
                        }
                    }
                ])
                .toArray()
        );
        const resetBindings = [];
        users.map(user => {
            user.resetRequests.map(reset => {
                resetBindings.unshift(reset);
            });
        });
        
        return resetBindings;
    } catch (error) {
        console.log(error);
    }
}

async function acceptResetBinding(_, { name, number }) {
    try {
        const db = getDb();

        const updatedUser = (
            await db
                .collection('users')
                .findOneAndUpdate(
                    { name },
                    {
                        $set: {
                            'resetRequests.$[request].status': 'done',
                            'hwid': ''
                        }
                    },
                    {
                        returnOriginal: false,
                        arrayFilters: [
                            {
                                'request.number': number
                            }
                        ]
                    }
                )
        );

        const { resetRequests } = updatedUser.value;
        return resetRequests[resetRequests.length - 1];
    } catch (error) {
        console.log(error);
    }
}

async function rejectResetRequest(_, { name, number }) {
    try {
        const db = getDb();

        await db
            .collection('users')
            .updateOne(
                { name },
                {
                    $set: {
                        'resetRequests.$[request].status': 'unsuccessful'
                    }
                },
                {
                    arrayFilters: [
                        {
                            'request.number': {
                                $eq: number
                            }
                        }
                    ]
                }
            );
        
        return 'Сброс привязки был успешно отколнён';
    } catch (error) {
        console.log(error);
    }
}

async function deleteAllResetRequests() {
    try {
        const db = getDb();

        await db
            .collection('users')
            .updateMany(
                {},
                {
                    $set: {
                        resetRequests: []
                    }
                }
            );

        return 'Все запросы на сброс привязки успешно удалены';
    } catch (error) {
        console.log(error);
    }
}

async function editUser(_, {
    oldName,
    name,
    email,
    hwid,
    role,
    navigator,
    adminName,
    locationData
}) {
    try {
        const db = getDb();
        const users = await db.collection('users').find().toArray();
        let userExists = false;
        for(let i = 0; i < users.length; i++) {
            const user = users[i];
            if (user == name) {
                userExists = true;
            }
        }
        if (userExists) {
            return '';
        }
        const status = {
            isAdmin: null,
            isBanned: null,
            simpleUser: null
        };

        for (const possibleRole in status) {
            if (possibleRole == role) {
                status[role] = true;
            }
        }
        const newUser = await db
            .collection('users')
            .findOneAndUpdate(
                { name: oldName },
                {
                    $set: {
                        name,
                        email,
                        status,
                        hwid
                    }
                },
                {
                    returnOriginal: false
                }
            );

        createLog({
            log: {
                name: adminName,
                action: `Редактирование пользователя ${oldName}`
            },
            navigator,
            locationData
        });

        return newUser.value;
    } catch (error) {
        console.log(error);
    }
}

async function editUserPassword(_, {
    userName,
    adminName,
    newPassword,
    adminPassword
}) {
    try {
        const db = getDb();

        const admin = await db.collection('users').findOne({ name: adminName });

        if (!await bcrypt.compare(adminPassword, admin.password)) {
            return 'Вы ввели неправильный пароль.';
        }

        const salt = await bcrypt.genSalt(12);
        newPassword = await bcrypt.hash(newPassword, salt);

        await db
            .collection('users')
            .updateOne(
                { name: userName },
                {
                    $set: {
                        password: newPassword
                    }
                }
            );

        return `${userName}'s password is successfully changed.`;
    } catch (error) {
        console.log(error);
    }
}

async function updateSubscriptionTime(_, {
    date,
    subscription,
    name
}) {
    try {
        const db = getDb();
        const { title } = subscription;
        if (!new Date(date).getTime()) {
            return {
                success: false,
                message: 'Вы ввели дату неверно. Дата должна быть в формате yyyy-mm-dd.'
            }
        }
        let subscriptionExists = false;
        const user = await db.collection('users').findOne({ name });
        for(let i = 0; i < user.subscriptions.length; i++) {
            const sub = user.subscriptions[i];
            if (sub.title.toLowerCase() == title.toLowerCase()) {
                subscriptionExists = true;
                break;
            }
        }
        let successfullyChangedSub = false;
        if (subscriptionExists) {
            await db
                .collection('users')
                .updateOne(
                    { name },
                    {
                        $set: {
                            'subscriptions.$[subscription].activelyUntil': new Date(date)
                        }
                    },
                    {
                        arrayFilters: [
                            {
                                'subscription.title': title
                            }
                        ]
                    }
                );

            successfullyChangedSub = true;
        } else {
            subscription.activelyUntil = new Date(date);
            await db
                .collection('users')
                .updateOne(
                    { name },
                    {
                        $push: subscription
                    }
                );
        }

        await updateSubscriptions({
            user
        });
        if (successfullyChangedSub) {
            return {
                success: true,
                message: `Подписка продукта ${title} у пользователя ${name} успешно изменена`
            };
        }
    } catch (error) {
        console.log(error);
    }
}

async function resetFreezeCooldown(_, { name, title }) {
    try {
        const db = getDb();
        await db
            .collection('users')
            .updateOne(
                { name },
                {
                    $set: {
                        'subscriptions.$[subscription].wasFreezed': false
                    }
                },
                {
                    arrayFilters: [{
                        'subscription.title': {
                            $eq: title
                        }
                    }]
                }
            );
        
        return {
            success: true,
            message: 'Кулдаун заморозки успешно сброшен!'
        };
    } catch (e) {
        console.log(e);
    }
}

async function issueSubscription(_, {
    name,
    subscription
}) {
    try {
        const db = getDb();

        await db
            .collection('users')
            .updateOne(
                { name },
                {
                    $push: {
                        subscriptions: subscription
                    }
                }
            );

        return {
            success: true,
            message: `Вы успешно добавили подписку ${subscription.title} пользователю ${name}!`
        };
    } catch (error) {
        console.log(error);
    }
}

async function refuseSub(_, { name, title }) {
    try {
        const db = getDb();
        await db.collection('users').updateOne(
            { name },
            {
                $pull: {
                    subscriptions: {
                        title
                    }
                }
            }
        );

        return {
            success: true,
            message: `Вы отказались от подписки ${title}`
        };
    } catch (error) {
        console.log(error);
    }
}

async function activatePromo(_, {
    name,
    title,
    username,
    navigator,
    locationData
}) {
    try {
        const db = getDb();
        const product = (
            await db
                .collection('products')
                .findOne(
                    { title },
                    { projection: { promocodes: 1 } }
                )
        );
        const user = (
            await db
                .collection('users')
                .findOne(
                    { name: username },
                    {
                        projection: {
                            usedPromocodes: 1
                        }
                    }
                )
        );
        let promocodeExists = false;
        let incrementActivations = true;
        let promocodeExpired = false;
        let promocodeUsed = false;
        let promocode = {};
        const {
            promocodes: {
                all
            }
        } = product;
        for(let i = 0; i < user.usedPromocodes.length; i++) {
            if (user.usedPromocodes[i] == name) {
                promocodeUsed = true;
                break;
            }
        }
        if (promocodeUsed) {
            return {
                response: {
                    message: 'Вы уже использовали этот промокод',
                    success: false
                },
                discountPercent: 1
            }
        }
        for(let i = 0; i < all.length; i++) {
            const currentPromo = all[i];
            if (currentPromo.name == name) {
                promocodeExists = true;
                promocode = currentPromo;
                if (new Date(currentPromo.expirationDays) - new Date() < 0) {
                    promocodeExpired = true;
                } else if (currentPromo.activationsAmount + 1 > currentPromo.promocodesAmount) {
                    incrementActivations = false;
                }
                break;
            }
        }

        if (!promocodeExists) {
            return {
                response: {
                    success: false,
                    message: 'Такого промокода не существует'
                },
                discountPercent: 1
            }
        }

        if (promocodeExpired) {
            await db
                .collection('products')
                .updateOne(
                    { title },
                    {
                        $pull: {
                            'promocodes.active': { name }
                        },
                        $push: {
                            'promocodes.unactive': promocode
                        }
                    }
                )

            return {
                response: {
                    success: false,
                    message: 'Промокод неактивен, поэтому не может быть активирован'
                },
                discountPercent: 1
            };
        } else if (incrementActivations) {
            await db
                .collection('products')
                .updateOne(
                    { title },
                    {
                        $inc: {
                            'promocodes.all.$[promocode].activationsAmount': 1,
                            'promocodes.active.$[promocode].activationsAmount': 1
                        },
                        $set: {
                            'promocodes.all.$[promocode].isUsed': true,
                            'promocodes.active.$[promocode].isUsed': true
                        },
                        $push: {
                            'usedPromocodes': name
                        }
                    },
                    {
                        arrayFilters: [
                            {
                                'promocode.name': name
                            }
                        ]
                    }
                )

            await db
                .collection('users')
                .updateOne(
                    { name: username },
                    {
                        $push: {
                            usedPromocodes: name
                        }
                    }
                )

            createLog({
                log: {
                    name: username,
                    action: `Успешная активация промокода ${name}`
                },
                navigator,
                locationData
            });

            return {
                response: {
                    message: 'Вы успешно активировали промокод',
                    success: true
                },
                discountPercent: promocode.discountPercent
            };
        } else {
            await db
                .collection('products')
                .updateOne(
                    { title },
                    {
                        $push: {
                            'promocodes.unactive': promocode
                        },
                        $pull: {
                            'promocodes.active': { title }
                        }
                    }
                );

            createLog({
                log: {
                    name: username,
                    action: `Неудачная активация промокода ${name}. Превышен лимит активации`
                },
                navigator,
                locationData
            });

            return {
                response: {
                    message: 'Превышен лимит использования введёного промокода',
                    success: false
                },
                discountPercent: 1
            }
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getUser,
    getUsers,
    signUp,
    signIn,
    resetPassword,
    getToken,
    verifyToken,
    changePassword,
    changeAvatar,
    getSubscriptions,
    makeResetRequest,
    getResetRequests,
    deleteUser,
    getResetBindings,
    acceptResetBinding,
    rejectResetRequest,
    deleteAllResetRequests,
    editUser,
    editUserPassword,
    updateSubscriptionTime,
    resetFreezeCooldown,
    issueSubscription,
    refuseSub,
    activatePromo
};
