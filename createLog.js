const { createLog } = require('./db_actions/action-logs');

module.exports = async function createActionLog(log, navigator, locationData) {
    try {
        await createLog(
            '',
            {
                log,
                navigator,
                locationData
            }
        );
    } catch (error) {
        console.log(error);
    }
}
