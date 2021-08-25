const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./schema.graphql');
const products = require('./products');
const user = require('./user');
const answers = require('./answersFAQ');
const actionLogs = require('./action-logs');
const { GraphQLScalarType, Kind } = require('graphql');

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

const about = 'About message';

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
        getAllBindings: user.getResetBindings
    },
    Mutation: {
        signUp: user.signUp,
        signIn: user.signIn,
        changeAvatar: user.changeAvatar,
        changePassword: user.changePassword,
        resetPassword: user.resetPassword,
        buyProduct: products.buyProduct,
        updateBoughtIcon: products.updateBoughtIcon,
        freezeSubscription: products.freezeSubscripiton,
        unfreezeSubscription: products.unfreezeSubscription,
        makeResetRequest: user.makeResetRequest,
        deleteUser: user.deleteUser,
        createKey: products.createKey,
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
        editProduct: products.editProduct
    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: true,
    introspection: true
});

function installHandler(app) {
    server.applyMiddleware({app})
}

module.exports = installHandler;