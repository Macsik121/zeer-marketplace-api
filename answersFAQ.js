const { getDb } = require('./db');

async function getAnswers() {
    const db = getDb();
    return await db.collection('answersFAQ').find().toArray();
}

async function rateAnswer(_, { title }) {
    const db = getDb();
    const answer = await db.collection('answersFAQ').findOne({title});
    await db.collection('answersFAQ').updateOne({title}, {$set: {}});
}

async function createAnswerSort(_, { sort }) {
    try {
        const db = getDb();
        
        const newAnswerSort = (
            await db.collection('answersFAQ').insertOne({
                sort,
                answers: []
            })
        )
        
        return newAnswerSort.ops[0];
    } catch (error) {
        console.log(error);
    }
}

async function deleteAnswerSort(_, { sort }) {
    try {
        const db = getDb();
        await db.collection('answersFAQ').deleteOne({ sort });

        return `Раздел ${sort} успешно удалён`;
    } catch (error) {
        console.log(error);
    }
}

async function createAnswer(_, { sort, answer }) {
    try {
        const db = getDb();

        const updatedSort = (
            await db
                .collection('answersFAQ')
                .findOneAndUpdate(
                    { sort },
                    {
                        $push: {
                            answers: answer
                        }
                    },
                    { returnOriginal: false }
                )
        )

        const answers = updatedSort.value.answers;

        return answers[answers.length - 1];
    } catch (error) {
        console.log(error);
    }
}

async function deleteAnswer(_, { sort, title }) {
    try {
        const db = getDb();

        await db
            .collection('answersFAQ')
            .updateOne(
                { sort },
                {
                    $pull: {
                        answers: {
                            title
                        }
                    }
                }
            )
        
        return `Ответ с названием ${title} был успешно удалён`;
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    getAnswers,
    createAnswerSort,
    deleteAnswerSort,
    createAnswer,
    deleteAnswer
};
