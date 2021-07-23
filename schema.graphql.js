// working in Product is how much time a subscription exists

const typeDefs = `
    scalar Date

    type AnswerSort {
        base: Boolean
        paymentActivation: Boolean
        config: Boolean
    }

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

    type User {
        name: String!
        email: String!
        password: String
        avatar: String
        subscriptions: [Subscription!]!
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
        sort: AnswerSort!
        title: String!
        answer: String!
        usefulRate: Int!
        rateCount: Int!
    }

    type Characteristics {
        version: String!
        osSupport: String!
        cpuSupport: [String!]!
        gameMode: String!
        developer: String!
        supportedAntiCheats: String!
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
        buyings: [User]
        workingTime: Date
        characteristics: Characteristics
        isBought: Boolean
        description: String
        changes: [ProductChange]
    }

    type Query {
        products: [Product!]!
        popularProducts(viewedToday: Int!): [Product!]!
        user(name: String!): User!
        verifyToken(token: String!): String!
        getSubscriptions(name: String!): Subscriptions
        getProduct(title: String!): Product!
        getAnswers: [Answer!]!
    }

    type Mutation {
        signUp(email: String!, name: String!, password: String!): Sign!
        signIn(email: String!, password: String!, rememberMe: Boolean!): Sign!
        resetPassword(email: String!): Reset!
        viewProduct(title: String!): Product
        changeAvatar(name: String!, avatar: String!): User!
        logout: String!
        rateAnswer(title: String!): Answer!
    }
`;

module.exports = typeDefs;
