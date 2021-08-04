const { getDb } = require('./db');

async function getAnswers() {
    const db = getDb();
    const answers = await db.collection('answersFAQ').find({}).toArray();
    return answers;
}

async function rateAnswer(_, {title}) {
    const db = getDb();
    const answer = await db.collection('answersFAQ').findOne({title});
    await db.collection('answersFAQ').updateOne({title}, {$set: {}});
}

module.exports = {getAnswers};
