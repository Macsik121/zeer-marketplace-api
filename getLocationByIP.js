module.exports = async function getLocationByIP(ip) {
    let result = await fetch(`https://ipinfo.io/${ip}?token=c02c29cd1f1bb4`);
    result = await result.json();
    const { city } = result;
    return {
        data: result,
        location: city
    };
}
