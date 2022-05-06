const axios = require('axios'); //Make rest requests

async function getCanadaSearch(keyWords, session) {
    const responseData = (await axios.get(
        `https://www.parl.ca/LegisInfo/en/bills/json?keywords=${keyWords}&&parlsession=${session}`,
    )).data;
    return responseData;
}

async function getCanadaBill(parNum, sessionNum, numberCode) {
    const responseData = await axios.get(
        `https://www.parl.ca/LegisInfo/en/bill/${parNum}-${sessionNum}/${numberCode}/json`,
    );
    return responseData;
}

module.exports = { getCanadaSearch, getCanadaBill }