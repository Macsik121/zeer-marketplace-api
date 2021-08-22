const { createLog } = require('./action-logs');

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
