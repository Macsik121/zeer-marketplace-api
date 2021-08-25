const typeDefs = `
    scalar Date

    input NavigatorInput {
        userAgent: String!
        platform: String!
    }

    type Status {
        isActive: Boolean
        isFreezed: Boolean
        isExpired: Boolean
    }

    input StatusInput {
        isActive: Boolean
        isFreezed: Boolean
        isExpired: Boolean
    }

    type ProductChange {
        version: String!
        created: Date!
        description: String!
    }

    input ProductChangeInput {
        version: String!
        created: Date!
        description: String!
    }

    type ActionLog {
        id: Int!
        date: Date!
        name: String!
        location: String!
        IP: String!
        browser: String!
        platform: String!
        action: String!
    }

    input ActionLogInput {
        date: Date!
        name: String!
        location: String!
        IP: String!
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

    input AnswerInput {
        title: String!
        answer: String!
    }

    type Answer {
        title: String!
        answer: String!
        usefulRate: Int
        rateCount: Int!
        dateOfCreation: Date!
    }

    type Answers {
        sort: String!
        answers: [Answer]
    }

    type Characteristics {
        version: String!
        osSupport: String!
        cpuSupport: String!
        gameMode: String!
        developer: String!
        supportedAntiCheats: String!
    }

    input CharacteristicsInput {
        version: String!
        osSupport: String!
        cpuSupport: String!
        gameMode: String!
        developer: String!
        supportedAntiCheats: String!
    }

    type ProductStatistics {
        allUsersAmount: Int!
        activeSubsOnproduct: Int!
        locks: Float!
        earnedToday: Int!
    }

    type ProductPromocode {
        name: String!
        discountPercent: Int!
        activationsAmount: Int!
        promocodesAmount: Int!
        expirationDays: Date!
        isUsed: Boolean!
    }

    input ProductPromocodeInput {
        name: String!
        discountPercent: Int!
        activationsAmount: Int!
        promocodesAmount: Int!
        expirationDays: Date!
        isUsed: Boolean!
    }
    
    type ProductPromocodes {
        all: [ProductPromocode]
        active: [ProductPromocode]
        unactive: [ProductPromocode]
    }

    input ProductPromocodesInput {
        all: [ProductPromocodeInput]
        active: [ProductPromocodeInput]
        unactive: [ProductPromocodeInput]
    }

    type ProductKey {
        name: String
        expiredInDays: Int
        activationsAmount: Int
        keysAmount: Int
        isUsed: Boolean!
    }

    input ProductKeyInput {
        name: String
        expiredInDays: Int
        activationsAmount: Int
        keysAmount: Int
        isUsed: Boolean!
    }

    type ProductsKeyTypes {
        active: [ProductKey]
        unactive: [ProductKey]
        all: [ProductKey]
    }

    input ProductsKeyTypesInput {
        active: [ProductKeyInput]
        unactive: [ProductKeyInput]
        all: [ProductKeyInput]
    }

    type CreateKey {
        key: ProductKey
        message: String
    }

    input KeyInput {
        name: String!
        daysAmount: Int!
        activationsAmount: Int!
        keysToAddAmount: Int!
    }

    enum ResetStatus {
        waiting
        done
        unsuccessful
    }

    type ResetRequest {
        id: Int!
        number: Int!
        reason: String!
        date: Date!
        status: ResetStatus!
        owner: String!
        ip: String!
        location: String!
    }

    input ResetRequestInput {
        id: Int!
        number: Int!
        reason: String!
        date: Date!
        status: ResetStatus!
        owner: String!
        ip: String!
        location: String!
    }

    type Subscription {
        status: Status!
        activelyUntil: Date!
        title: String!
        productFor: String!
        imageURL: String
    }

    input SubscriptionInput {
        status: StatusInput!
        activelyUntil: Date!
        title: String!
        productFor: String!
        imageURL: String
    }

    type Subscriptions {
        all: [Subscription]
        active: [Subscription]
        overdue: [Subscription]
    }

    type UserStatus {
        isAdmin: Boolean
        simpleUser: Boolean
        isBanned: Boolean
    }

    input UserStatusInput {
        isAdmin: Boolean
        simpleUser: Boolean
        isBanned: Boolean
    }

    type User {
        id: Int
        name: String!
        email: String!
        password: String
        avatar: String
        registeredDate: Date
        subscriptions: [Subscription]
        status: UserStatus
        resetRequests: [ResetRequest]
    }

    input UserInput {
        id: Int
        name: String!
        email: String!
        password: String
        avatar: String
        registeredDate: Date
        subscriptions: [SubscriptionInput]
        status: UserStatusInput
        resetRequests: [ResetRequestInput]
    }

    type Product {
        id: String
        title: String
        productFor: String
        costPerDay: Int
        imageURL: String
        imageURLdashboard: String
        logo: String
        reloading: String
        workingTime: String
        characteristics: Characteristics
        description: String
        changes: [ProductChange]
        locks: String
        keys: ProductsKeyTypes
        peopleBought: [User]!
        timeBought: Float
        currentDate: Date
        promocodes: ProductPromocodes
    }

    input ProductInput {
        id: String
        title: String
        productFor: String
        costPerDay: Int!
        imageURL: String
        imageURLdashboard: String
        logo: String
        reloading: String
        workingTime: String
        characteristics: CharacteristicsInput
        description: String
        changes: [ProductChangeInput]
        locks: String
        keys: ProductsKeyTypesInput
        peopleBought: [UserInput]!
        timeBought: Int
        currentDate: Date
        promocodes: ProductPromocodesInput
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
        getKeys: [ProductKey!]!
        getResetRequests(name: String!): [ResetRequest]!
        getPromocodes: [Product]!
        getSort(sort: String!): Answers!
        getActionLogs: [ActionLog]!
        getAllBindings: [ResetRequest]!
    }

    type Mutation {
        signUp(
            email: String!,
            name: String!,
            password: String!,
            navigator: NavigatorInput,
            IP: String!
        ): Sign!
        signIn(
            email: String!,
            password: String!,
            rememberMe: Boolean!,
            navigator: NavigatorInput
        ): Sign!
        resetPassword(email: String!): Reset!
        changeAvatar(name: String!, avatar: String!): String!
        logout(navigator: NavigatorInput): String!
        rateAnswer(title: String!): Answer!
        createLog(log: ActionLogInput, navigator: NavigatorInput): ActionLog!
        cleanLogs: String!
        editUser(name: String!): User!
        createKey(
            key: KeyInput!,
            title: String!,
            navigator: NavigatorInput,
            username: String!
        ): CreateKey
        deleteKey(
            keyName: String!,
            title: String!,
            navigator: NavigatorInput,
            name: String!
        ): String!
        deleteAllKeys(title: String!, navigator: NavigatorInput): String!
        changePassword(name: String!, oldPassword: String!, newPassword: String!): String!
        buyProduct(title: String!, name: String!, navigator: NavigatorInput): Product!
        updateBoughtIcon(name: String!): [Product!]!
        freezeSubscription(name: String!, title: String!): User!
        unfreezeSubscription(name: String!, title: String!): User!
        makeResetRequest(name: String!, reason: String!, navigator: NavigatorInput): ResetRequest!
        deleteUser(name: String!): String!
        createPromocode(
            promocode: ProductPromocodeInput!,
            title: String!,
            navigator: NavigatorInput,
            username: String!
        ): ProductPromocode!
        deletePromocode(
            productTitle: String!,
            promocodeTitle: String!,
            navigator: NavigatorInput,
            name: String!
        ): String!
        deleteAllPromocodes(title: String!, navigator: NavigatorInput): Product!
        createAnswerSort(sort: String!): Answers!
        deleteAnswerSort(sort: String!): String!
        createAnswer(sort: String!, answer: AnswerInput!): Answer!
        deleteAnswer(sort: String!, title: String!): String!
        activateKey(keyName: String!, username: String!, navigator: NavigatorInput): String!
        acceptResetBinding(name: String!, number: Int!): ResetRequest!
        rejectResetBinding(name: String!, number: Int!): String!
        deleteAllResetRequests: String!
        editProduct(product: ProductInput!): Product!
        deleteProduct(title: String!): String!
        createProduct(product: ProductInput!): Product!
    }
`;

module.exports = typeDefs;
