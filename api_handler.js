const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./schema.graphql');
const products = require('./products');
const user = require('./user');
const answers = require('./answersFAQ');
const admin = require('./admin');
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
        getActionsLogs: admin.getActionsLogs
    },
    Mutation: {
        signUp: user.signUp,
        signIn: user.signIn,
        viewProduct: products.viewProduct,
        changeAvatar: user.changeAvatar,
        changePassword: user.changePassword,
        resetPassword: user.resetPassword,
        createLog: admin.createLog,
        buyProduct: products.buyProduct
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