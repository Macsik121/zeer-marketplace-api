const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');
const { sendMail } = require('../nodemailer');
const createActionLog = require('../createLog');
const createLog = require('../createLog');

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

async function signUp(_, { email, name, password, navigator, locationData }) {
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
            hwid: ''
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
                status: user.status
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
            await db.collection('users').findOne({email}) ||
            await db.collection('users').findOne({name: email})
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
                    status: user.status
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
                    status: user.status
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

async function resetPassword(_, { email }) {
    try {
        const db = getDb();
        const characters = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z", 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'g', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        let newPassword = '';
        characters.map(character => {
            const addOrNot = Math.floor(Math.random() * 2) == 1 ? true : false;
            if (addOrNot && newPassword.length < 11) {
                newPassword += character;
            }
        });
        const user = (
            await db.collection('users').findOne({email}) ||
            await db.collection('users').findOne({name: email})
        );
        
        if (!user) {
            return 'Этого пользователя не существует';
        }
        
        sendMail(user.email);
        
        const newHashedPassword = await bcrypt.hash(newPassword, 12);

        await db.collection('users').findOneAndUpdate({email}, {$set: {password: newHashedPassword}}) ||
        await db.collection('users').findOneAndUpdate({name: email}, {$set: {password: newHashedPassword}})
    
        return {
            user,
            message: 'You successfully reseted the password'
        }
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
                    status: user.status
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

        const user = await db.collection('users').findOne({ name });
        user.resetRequests.map(request => {
            if (request.number == number) {
                request.status = 'done';
            }
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
        if (new Date().getTime() > new Date(date).getTime()) {
            subscription.status = {
                isActive: true
            }
        } else {
            subscription.status = {
                isExpired: true,
                isActive: false,
                isFreezed: false
            }
        }
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
                                'subscription.title': { $eq: title }
                            }
                        ]
                    }
                );

            return {
                success: true,
                message: `Подписка продукта ${title} у пользователя ${name} успешно изменена`
            };
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
    issueSubscription
};
