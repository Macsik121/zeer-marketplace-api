const { createLog } = require('./db_actions/action-logs');

module.exports = async function createActionLog({
    log,
    navigator,
    locationData,
    browser = null,
    platform = null
}) {
    console.log('navigator in createActionLog:', navigator)
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
