const { ApolloServer } = require('apollo-server-express');
const { GraphQLScalarType, Kind } = require('graphql');
const typeDefs = require('./schema.graphql');
const products = require('./db_actions/products');
const user = require('./db_actions/user');
const answers = require('./db_actions/answersFAQ');
const actionLogs = require('./db_actions/action-logs');
const purchases = require('./db_actions/purchases');
const profit = require('./db_actions/profit');
const injectLogs = require('./db_actions/inject-logs');
const crashLogs = require('./db_actions/crash-logs');
const lmi_payment_no = require('./db_actions/lmi_no_payment');

const dateScalar = new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    serialize(value) {
        return value.toISOString();
    },
    parseValue(value) {
        return new Date(value);
    },
    parseLiteral(ast) {
        return (ast.kind == Kind.STRING) ? new Date(ast.value) : undefined;
    }
});

const resolvers = {
    Date: dateScalar,
    Query: {
        products: products.getProducts,
        popularProducts: products.getPopularProducts,
        getProduct: products.getProduct,
        user: user.getUser,
        verifyToken: user.verifyToken,
        getSubscriptions: user.getSubscriptions,
        getAnswers: answers.getAnswers,
        getUsers: user.getUsers,
        getResetRequests: user.getResetRequests,
        getSort: answers.getSort,
        getActionLogs: actionLogs.actionLogs,
        getAllBindings: user.getResetBindings,
        purchases: purchases.getPurchases,
        profit: profit.getAllProfit,
        injectLogs: injectLogs.injectLogs,
        crashLogs: crashLogs.crashLogs,
        isPromocodeRight: products.isPromocodeRight,
        paymentNumber: lmi_payment_no.paymentNumber
    },
    Mutation: {
        signUp: user.signUp,
        signIn: user.signIn,
        changeAvatar: user.changeAvatar,
        changePassword: user.changePassword,
        resetPassword: user.resetPassword,
        buyProduct: products.buyProduct,
        updateBoughtIcon: products.updateBoughtIcon,
        freezeSubscription: products.freezeSubscription,
        unfreezeSubscription: products.unfreezeSubscription,
        makeResetRequest: user.makeResetRequest,
        deleteUser: user.deleteUser,
        createKeys: products.createKeys,
        deleteKey: products.deleteKey,
        deleteAllKeys: products.deleteAllKeys,
        createPromocode: products.createPromocode,
        deletePromocode: products.deletePromocode,
        deleteAllPromocodes: products.deleteAllPromocodes,
        createAnswerSort: answers.createAnswerSort,
        deleteAnswerSort: answers.deleteAnswerSort,
        createAnswer: answers.createAnswer,
        deleteAnswer: answers.deleteAnswer,
        activateKey: products.activateKey,
        createLog: actionLogs.createLog,
        cleanLogs: actionLogs.cleanLogs,
        acceptResetBinding: user.acceptResetBinding,
        rejectResetBinding: user.rejectResetRequest,
        deleteAllResetRequests: user.deleteAllResetRequests,
        editProduct: products.editProduct,
        createProduct: products.createProduct,
        deleteProduct: products.deleteProduct,
        createNews: products.createNews,
        deleteNews: products.deleteNews,
        deleteAllNews: products.deleteAllNews,
        disableProduct: products.disableProduct,
        addCost: products.addCost,
        deleteCost: products.deleteCost,
        saveCostChanges: products.saveCostChanges,
        updateProductBG: products.updateProductBG,
        editUser: user.editUser,
        editUserPassword: user.editUserPassword,
        updateSubscriptionTime: user.updateSubscriptionTime,
        resetFreezeCooldown: user.resetFreezeCooldown,
        issueSubscription: user.issueSubscription,
        logInject: injectLogs.logInject,
        cleanInjectLogs: injectLogs.cleanLogs,
        logCrash: crashLogs.logCrash,
        cleanCrashLogs: crashLogs.cleanLogs,
        refuseSub: user.refuseSub,
        activatePromo: user.activatePromo,
        changeLoaderVersion: products.changeLoaderVersion,
        updatePaymentNumber: lmi_payment_no.updatePaymentNumber,
        issueSubForEverybody: products.issueSubForEverybody
    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: true,
    introspection: true
});

function installHandler(app) {
    server.applyMiddleware({ app, path: '/graphql' })
}

module.exports = installHandler;
