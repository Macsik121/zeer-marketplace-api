require('dotenv').config();
const apiEndpoint = process.env.apiEndpoint;

module.exports = async function fetchGraphQLServer(query, variables) {
    await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
    });
}
