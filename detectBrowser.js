module.exports = function detectBrowser(navigator) {
    const ua = navigator.userAgent;
    console.log(ua);
    let browser = 'Unknown Browser';
    let version = 1.0;
    function strContained(str, strToCompare = ua) {
        if (strToCompare.indexOf(str) != -1) return true;
        return false;
    }
    function splitVersion(str, split = ' ', usagent = ua) {
        return usagent.split(str)[1].split(split)[0];
    }
    if (strContained('Firefox')) {
        browser = 'Firefox';
        version = ua.split('Firefox/')[1];
    } else if (strContained('YaBrowser')) {
        browser = 'Yandex';
        version = splitVersion('YaBrowser/');
    } else if (strContained('Opera') || strContained('OPR')) {
        browser = 'Opera';
        if (strContained('opr')) {
            if (strContained(' ')) version = ua.split('OPR/')[1].split(' ')[0];
            else version = ua.split('OPR/')[1];
        } else if (strContained('opera')) {
            if (strContained('opera/')) {
                if (strContained(' ')) version = ua.split('Version/')[1].split(' ')[0];
                else version = ua.split('Version/')[1];
            } else if (strContained('opera')) {
                version = ua.split('Opera')[1].trim();
            }
        }
    } else if (strContained('Edge')) {
        browser = 'Edge';
        if (strContained('Edge')) version = ua.split('Edge/')[1];
        else if (strContained('Edg')) version = ua.split('Edge/')[1];
    } else if (strContained('Chrome')) {
        browser = 'Chrome';
        version = splitVersion('Chrome/');
    } else if (strContained('safari')) {
        browser = 'Safari';
        version = splitVersion('Version/');
    } else if (strContained('MSIE')) {
        browser = 'Internet Explorer';
        if (strContained('rv:')) {
            version = ua.split('MSIE')[1].split(';')[0].split(',')[0].trim();
        } else {
            version = ua.split('MSIE')[1].split(';')[0].trim();
        }
    }
    return `${browser} ${version}`;
}
