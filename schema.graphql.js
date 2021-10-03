const typeDefs = `
    scalar Date

    input NavigatorInput {
        userAgent: String!
        platform: String!
        appVersion: String
        appName: String
    }

    input LocationInput {
        ip: String!
        location: String!
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
        id: Int!
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
        version: String
        osSupport: String
        cpuSupport: String
        gameMode: String
        developer: String
        supportedAntiCheats: String
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
        usedAmount: Int
        isUsed: Boolean!
    }

    input ProductKeyInput {
        name: String
        expiredInDays: Int
        activationsAmount: Int
        usedAmount: Int
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

    input KeyInput {
        name: [String!]!
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
        freezeTime: Date
        wasFreezed: Boolean
    }

    input SubscriptionInput {
        status: StatusInput
        activelyUntil: Date
        title: String
        productFor: String
        imageURL: String
        wasFreezed: Boolean
        freezeTime: Date
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
        email: String
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
        avatar: String
        status: UserStatusInput
    }

    type ProductCost {
        perDay: Int!
        perMonth: Int!
        perYear: Int!
    }

    enum ProductStatus {
        undetect
        onupdate
        detect
    }
    
    input ProductCostInput {
        perDay: Int!
        perMonth: Int!
        perYear: Int!
    }

    type Cost {
        cost: Int!
        costPer: String!
        menuText: String!
        days: Int!
    }

    input CostInput {
        cost: Int!
        costPer: String!
        menuText: String!
        days: Int
    }

    type Product {
        id: Int
        title: String
        productFor: String
        cost: ProductCost
        allCost: [Cost]
        costPerDay: Int
        costPerDayInfo: Int
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
        timeBought: Int
        currentDate: Date
        promocodes: ProductPromocodes
        status: ProductStatus
        locationOnclick: String
    }

    input ProductInput {
        id: Int
        oldTitle: String
        newTitle: String
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
        status: ProductStatus
        cost: ProductCostInput
        allCost: [CostInput]
    }

    type Purchase {
        date: Date
        boughtTime: Int
    }

    input WeekInput {
        from: Date!
        to: Date!
    }

    type ServerResponse {
        success: Boolean!
        message: String!
    }

    type ProfitToday {
        date: Date
        cost: Int
    }

    type Query {
        products: [Product!]!
        popularProducts(amountToGet: Int): [Product!]!
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
        purchases(week: WeekInput): [Purchase]!
        profit(week: WeekInput): [ProfitToday]!
    }

    type Mutation {
        signUp(
            email: String!,
            name: String!,
            password: String!,
            navigator: NavigatorInput,
            locationData: LocationInput
        ): Sign!
        signIn(
            email: String!,
            password: String!,
            rememberMe: Boolean!,
            navigator: NavigatorInput,
            locationData: LocationInput
        ): Sign!
        resetPassword(email: String!): Reset!
        changeAvatar(name: String!, avatar: String!): String!
        logout(navigator: NavigatorInput, locationData: LocationInput): String!
        rateAnswer(title: String!): Answer!
        createLog(
            log: ActionLogInput,
            navigator: NavigatorInput,
            locationData: LocationInput
        ): ActionLog!
        cleanLogs: String!
        createKeys(
            key: KeyInput!,
            title: String!,
            navigator: NavigatorInput,
            username: String!,
            locationData: LocationInput
        ): String!
        deleteKey(
            keyName: String!,
            title: String!,
            navigator: NavigatorInput,
            name: String!,
            locationData: LocationInput
        ): String!
        deleteAllKeys(
            title: String!,
            navigator: NavigatorInput,
            locationData: LocationInput
        ): String!
        changePassword(
            name: String!,
            oldPassword: String!,
            newPassword: String!
        ): ServerResponse!
        buyProduct(
            title: String!,
            name: String!,
            navigator: NavigatorInput,
            productCost: Int!,
            isKey: Boolean,
            issueSub: Boolean,
            days: Int,
            locationData: LocationInput
        ): Product!
        updateBoughtIcon(name: String!): [Product!]!
        freezeSubscription(name: String!, title: String!): ServerResponse!
        unfreezeSubscription(name: String!, title: String!): ServerResponse!
        makeResetRequest(
            name: String!,
            reason: String!,
            navigator: NavigatorInput,
            locationData: LocationInput
        ): ResetRequest!
        deleteUser(
            name: String!,
            navigator: NavigatorInput!,
            adminName: String!,
            locationData: LocationInput
        ): String!
        createPromocode(
            promocode: ProductPromocodeInput!,
            title: String!,
            navigator: NavigatorInput,
            username: String!,
            locationData: LocationInput
        ): ProductPromocode!
        deletePromocode(
            productTitle: String!,
            promocodeTitle: String!,
            navigator: NavigatorInput,
            name: String!,
            locationData: LocationInput
        ): String!
        deleteAllPromocodes(title: String!, navigator: NavigatorInput): Product!
        createAnswerSort(sort: String!): Answers!
        deleteAnswerSort(sort: String!): String!
        createAnswer(sort: String!, answer: AnswerInput!): Answer!
        deleteAnswer(sort: String!, title: String!): String!
        activateKey(
            keyName: String!,
            username: String!,
            navigator: NavigatorInput
        ): ServerResponse!
        acceptResetBinding(name: String!, number: Int!): ResetRequest!
        rejectResetBinding(name: String!, number: Int!): String!
        deleteAllResetRequests: String!
        editProduct(
            product: ProductInput!,
            navigator: NavigatorInput!,
            adminName: String!,
            locationData: LocationInput
        ): Product!
        deleteProduct(
            title: String!,
            navigator: NavigatorInput!,
            name: String!,
            locationData: LocationInput
        ): String!
        createProduct(
            product: ProductInput!,
            navigator: NavigatorInput!,
            adminName: String!,
            locationData: LocationInput
        ): Product!
        createNews(title: String!, change: ProductChangeInput!): String!
        deleteNews(title: String!, changeTitle: Int!): String!
        deleteAllNews(title: String!): String!
        disableProduct(title: String!): String!
        addCost(title: String!, cost: CostInput!): String!
        deleteCost(title: String!, costTitle: String!): String!
        saveCostChanges(
            title: String!,
            costPerDayInfo: Int!,
            locationOnclick: String!
        ): String!
        updateProductBG(title: String!, imageURL: String!): String!
        editUser(
            oldName: String!,
            name: String,
            email: String,
            hwid: String,
            role: String,
            navigator: NavigatorInput!,
            adminName: String,
            locationData: LocationInput
        ): User!
        editUserPassword(
            adminName: String!,
            adminPassword: String!,
            userName: String!,
            newPassword: String!
        ): String!
        updateSubscriptionTime(
            date: String!,
            subscription: SubscriptionInput!,
            name: String!
        ): ServerResponse!
        resetFreezeCooldown(
            title: String!,
            name: String!
        ): ServerResponse!
        issueSubscription(name: String!, subscription: SubscriptionInput!): ServerResponse!
    }
`;

module.exports = typeDefs;
