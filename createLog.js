const { createLog } = require('./db_actions/action-logs');

module.exports = async function createActionLog({
    log,
    navigator,
    locationData,
    browser = null,
    platform = null
}) {
    try {
        await createLog(
            '',
            {
                log,
                navigator,
                locationData,
                browser,
                platform
            }
        );
    } catch (error) {
        console.log(error);
    }
}
