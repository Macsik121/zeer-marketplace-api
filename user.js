const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');
const { sendMail } = require('./nodemailer');
let token = '';

async function getUser(_, { name }) {
    try {
        const db = getDb();
        const user = (
            await db.collection('users').findOne({name}) ||
            await db.collection('users').findOne({email: name})
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

async function signUp(_, { email, name, password }) {
    try {
        const db = getDb();
        const existingUser = (
            await db.collection('users').findOne({email}) ||
            await db.collection('users').findOne({name})
        );
        const allUsers = await db.collection('users').find({}).toArray();
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
        console.log(id);

        const createdUser = await db.collection('users').insertOne({
            id,
            name,
            email,
            password: hashedPassword,
            subscriptions: [],
            avatar: avatarBGs[Math.floor(Math.random() * avatarBGs.length)],
            isAdmin: false,
            registeredDate: new Date(),
            resetRequests: []
        });

        const insertedId = createdUser.insertedId;

        const user = await db.collection('users').findOne({_id: insertedId})

        token = jwt.sign(
            {
                email: user.email,
                id: user._id,
                name: user.name,
                avatar: user.avatar,
                isAdmin: user.isAdmin
            },
            '!@secretKey: Morgenshtern - Show@!',
            {expiresIn: '3d'}
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

async function signIn(_, {email, password, rememberMe}) {
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
                    isAdmin: user.isAdmin
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
                    isAdmin: user.isAdmin
                },
                '!@secretKey: Morgenshtern - Show@!',
                {expiresIn: '3d'}
            )
        }

        return {
            user,
            token,
            message: 'You seccessfully logged in!'
        };
    } catch (error) {
        console.log(error);
    }
}

async function resetPassword(_, {email}) {
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
                    email: user.email,
                    id: user._id,
                    name: user.name,
                    avatar: user.avatar,
                    isAdmin: user.isAdmin
                },
                '!@secretKey: Morgenshtern - Show@!',
                {expiresIn: '3d'}
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
            return 'Ваш старый пароль неверный';
        }

        if (await bcrypt.compare(newPassword, user.password)) {
            return 'Вы успешно поменяли пароль';
        }

        await db.collection('users').updateOne(
            { name },
            { $set: { password: await bcrypt.hash(newPassword, 12) } }
        );

        return 'Вы успешно поменяли пароль'
    } catch (error) {
        console.log(error);
    }
}

async function getSubscriptions(_, { name }) {
    try {
        const db = getDb();
        const user = await db.collection('users').findOne({name});
        const activeSubs = [];
        user.subscriptions.map(sub => {
            if (sub && sub.status.isActive) activeSubs.push(sub);
        });
        const overdueSubs = [];
        user.subscriptions.map(sub => {
            if (sub && sub.status.isExpired) overdueSubs.push(sub);
        })
        const subscriptions = {
            all: user.subscriptions,
            active: activeSubs,
            overdue: overdueSubs
        };
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

async function makeResetRequest(_, { name, reason }) {
    try {
        const db = getDb();

        const user = await db.collection('users').findOne({ name });
        user.resetRequests.unshift({
            number: ++user.resetRequests.slice().length,
            reason,
            date: new Date(),
            status: 'waiting'
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

async function deleteUser(_, { name }) {
    try {
        const db = getDb();
        await db.collection('users').deleteOne({ name });

        return `Вы успешно удалили пользователя с именем ${name}`
    } catch (error) {
        console.log(error);
    }
}

async function editUser(_, args) {
    try {
        const db = getDb();
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
    deleteUser
};
