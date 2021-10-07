require('dotenv').config();
const fetch = require('isomorphic-fetch');
const apiEndpoint = process.env.apiEndpoint;

module.exports = async function fetchGraphQLServer(query, variables) {
    const result = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
    });
    return await result.json();
}
