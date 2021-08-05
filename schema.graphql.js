// working in Product is how much time a subscription exists

const typeDefs = `
    scalar Date

    type Status {
        isActive: Boolean
        isFreezed: Boolean
        isExpired: Boolean
    }

    type ProductChange {
        version: String!
        created: Date!
        description: String!
    }

    type ActionLog {
        date: Date!
        userName: String!
        location: String!
        IP: String!
        browser: String!
        OS: String!
        action: String!
    }

    input ActionLogInput {
        date: Date!
        userName: String!
        location: String!
        IP: String!
        browser: String!
        OS: String!
        action: String!
    }

    type Sign {
        user: User
        token: String!
        message: String!
    }
    
    type Reset {
        user: User
        message: String!
    }

    type Answer {
        title: String!
        answer: String!
        usefulRate: Int
        rateCount: Int!
    }

    type Answers {
        sort: String!
        answers: [Answer]
    }

    type Characteristics {
        version: String!
        osSupport: String!
        cpuSupport: [String!]!
        gameMode: String!
        developer: String!
        supportedAntiCheats: String!
    }

    type ProductStatistics {
        allUsersAmount: Int!
        activeSubsOnproduct: Int!
        locks: Int!
        earnedToday: Int!
    }

    type ProductKey {
        name: String!
        expiredInDays: Int!
        activationsAmount: Int!
        amountKeysToAdd: Int!
    }

    type ProductsKeyTypes {
        active: [ProductKey]
        unactive: [ProductKey]
        all: [ProductKey]
    }

    input KeyInput {
        name: String!
        daysAmount: Int!
        activationsAmount: Int!
        keysToAddAmount: Int!
    }

    type Subscription {
        status: Status!
        activelyUntil: Date!
        title: String!
        productFor: String!
        imageURL: String!
    }

    type Subscriptions {
        all: [Subscription]
        active: [Subscription]
        overdue: [Subscription]
    }

    type User {
        id: Int
        name: String!
        email: String!
        password: String
        avatar: String
        registeredDate: Date
        subscriptions: [Subscription!]!
        isAdmin: Boolean
    }

    type Product {
        id: Int
        title: String
        productFor: String
        costPerDay: Int
        imageURL: String
        imageURLdashboard: String
        avatar: String
        reloading: String
        workingTime: Date
        characteristics: Characteristics
        description: String
        changes: [ProductChange]
        locks: Int
        keys: [ProductKey]
        header: String!
        peopleBought: [User]!
        timeBought: Int
    }

    type Query {
        products: [Product!]!
        popularProducts: [Product!]!
        user(name: String!): User!
        verifyToken(token: String!): String!
        getSubscriptions(name: String!): Subscriptions
        getProduct(title: String!): Product!
        getAnswers: [Answers]
        getUsers: [User!]!
        getActionsLogs: [ActionLog!]!
        getKeys: [ProductKey!]!
    }

    type Mutation {
        signUp(email: String!, name: String!, password: String!): Sign!
        signIn(email: String!, password: String!, rememberMe: Boolean!): Sign!
        resetPassword(email: String!): Reset!
        changeAvatar(name: String!, avatar: String!): String!
        logout: String!
        rateAnswer(title: String!): Answer!
        createLog(log: ActionLogInput): ActionLog!
        cleanLogs: String!
        editUser(name: String!): User!
        createKey(key: KeyInput!): ProductKey!
        changePassword(name: String!, oldPassword: String!, newPassword: String!): String!
        buyProduct(title: String!, name: String!): Product!
        updateBoughtIcon(name: String!): [Product!]!
    }
`;

module.exports = typeDefs;
