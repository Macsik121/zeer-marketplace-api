const { createLog } = require('./db_actions/action-logs');

module.exports = async function createActionLog(log, navigator) {
    try {
        await createLog(
            '',
            {
                log,
                navigator
            }
        );
    } catch (error) {
        console.log(error);
    }
}
