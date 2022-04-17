require('dotenv').config();
const axios = require('axios'); //Make rest requests
import { bill, legiScanSearchResult } from './types';

const apiKeyLegiscan = process.env.API_KEY; //Legiscan api key

export async function legiScanSearchBill(state: string, bill: string) {
    const responseData: legiScanSearchResult = await axios.get(
        `https://api.legiscan.com/?key=${apiKeyLegiscan}&op=getSearch&state=${state}&bill=${bill}`,
    );
    return responseData;
}

export async function legiScanSearchQuery(
    year: string,
    state: string,
    query: string,
) {
    const responseData: legiScanSearchResult = await axios.get(
        `https://api.legiscan.com/?key=${apiKeyLegiscan}&op=getSearch&year=${year}&state=${state}&query=${encodeURIComponent(
            query,
        )}`,
    );
    return responseData;
}

export async function legiScanGetBill(id: number) {
    let responseData: bill = (
        await axios.get(
            `https://api.legiscan.com/?key=${apiKeyLegiscan}&op=getBill&id=${id}`,
        )
    ).data.bill;
    return responseData;
}
