const {ApolloServer} = require('apollo-server-express');
const typeDefs = require('./schema.graphql');
const products = require('./products');
const user = require('./user');
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
        if (ast.kind === Kind.INT) {
            return new Date(parseInt(ast.kind, 10));
        }
        return null;
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
        token: user.getToken,
        verifyToken: user.verifyToken,
        getSubscriptions: user.getSubscriptions,
    },
    Mutation: {
        signUp: user.signUp,
        signIn: user.signIn,
        viewProduct: products.viewProduct,
        changeAvatar: user.changeAvatar,
        logout: user.logout,
        resetPassword: user.resetPassword
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