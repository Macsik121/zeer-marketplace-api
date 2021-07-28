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

    type Subscription {
        status: Status!
        activelyUntil: Date!
        title: String!
        imageURL: String!
    }

    type Subscriptions {
        all: [Subscription]
        active: [Subscription]
        overdue: [Subscription]
    }

    type ActionLog {
        date: Date!
        name: String!
        location: String!
        IP: String!
        browser: String!
        OS: String!
        action: String!
    }

    input ActionLogInput {
        date: Date!
        name: String!
        location: String!
        IP: String!
        browser: String!
        OS: String!
        action: String!
    }

    type User {
        id: Int!
        name: String!
        email: String!
        password: String
        avatar: String
        registeredDate: Date
        subscriptions: [Subscription!]!
        isAdmin: Boolean
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
        expiredIn: Int!
        activationsAmount: Int!
        amountKeysToAdd: Int!
    }

    enum ProductsKeyTypes {
        active
        unactive
        all
    }

    type Product {
        id: Int
        title: String
        productFor: String
        costPerDay: Int
        viewedToday: Int
        imageURL: String
        imageURLdashboard: String
        avatar: String
        reloading: String
        workingTime: Date
        buyings: [User]
        characteristics: Characteristics
        isBought: Boolean
        description: String
        changes: [ProductChange]
        locks: Int
        keys: [ProductKey]
    }

    type Query {
        products: [Product!]!
        popularProducts(viewedToday: Int!): [Product!]!
        user(name: String!): User!
        verifyToken(token: String!): String!
        getSubscriptions(name: String!): Subscriptions
        getProduct(title: String!): Product!
        getAnswers: [Answers]
        getUsers: [User!]!
        actionsLogs: [ActionLog!]!
        getKeys: [ProductKey!]!
    }

    type Mutation {
        signUp(email: String!, name: String!, password: String!): Sign!
        signIn(email: String!, password: String!, rememberMe: Boolean!): Sign!
        resetPassword(email: String!): Reset!
        viewProduct(title: String!): Product
        changeAvatar(name: String!, avatar: String!): User!
        logout: String!
        rateAnswer(title: String!): Answer!
        createLog(log: ActionLogInput): ActionLog!
        cleanLogs: String!
        editUser(name: String!): User!
    }
`;

module.exports = typeDefs;
