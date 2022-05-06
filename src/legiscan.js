require('dotenv').config();
const axios = require('axios'); //Make rest requests

const apiKeyLegiscan = process.env.API_KEY; //Legiscan api key

async function legiScanSearchBill(state, bill) {
    const responseData = await axios.get(
        `https://api.legiscan.com/?key=${apiKeyLegiscan}&op=getSearch&state=${state}&bill=${bill}`,
    );
    return responseData;
}

async function legiScanSearchQuery(
    year,
    state,
    query,
) {
    const responseData = await axios.get(
        `https://api.legiscan.com/?key=${apiKeyLegiscan}&op=getSearch&year=${year}&state=${state}&query=${encodeURIComponent(
            query,
        )}`,
    );
    return responseData;
}

async function legiScanGetBill(id) {
    let responseData = (
        await axios.get(
            `https://api.legiscan.com/?key=${apiKeyLegiscan}&op=getBill&id=${id}`,
        )
    ).data.bill;
    return responseData;
}

module.exports = { legiScanSearchBill, legiScanSearchQuery, legiScanGetBill }