const { GoogleSpreadsheet } = require('google-spreadsheet'); //Google Spreadsheet

const googleSheetId = process.env.GOOGLE_SHEET_ID; //Google Sheet ID

//Get google sheets data
async function getGoogleSheetsData(page_id) {
    const doc = new GoogleSpreadsheet(googleSheetId);
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    });

    await doc.loadInfo(); // loads document properties and worksheets

    const sheet = doc.sheetsByIndex[page_id];
    const rows = await sheet.getRows({ offset: 0 /*limit:5*/ });
    return rows;
}

//Write google sheets data
async function addGoogleSheetsRow(
    row,
    page_id,
) {
    const doc = new GoogleSpreadsheet(googleSheetId);
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    });

    await doc.loadInfo(); // loads document properties and worksheets

    const sheet = doc.sheetsByIndex[page_id];

    const data = await sheet.addRows(row);
    return data;
}

//Write google sheets data
async function removeBillFromSheets(id) {
    const doc = new GoogleSpreadsheet(googleSheetId);
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    });

    await doc.loadInfo(); // loads document properties and worksheets

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    for (const row of rows) {
        if (row.legiscan_id == id) {
            await row.delete();
            return;
        }
    }
}

//Write google sheets data
async function updateBillFromSheets(bill_id, id) {
    const doc = new GoogleSpreadsheet(googleSheetId);
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    });

    await doc.loadInfo(); // loads document properties and worksheets

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    for (const row of rows) {
        if (row.bill_id == bill_id) {
            row.legiscan_id = id;
            await row.save();
            return;
        }
    }
}


module.exports = { getGoogleSheetsData, addGoogleSheetsRow, removeBillFromSheets, updateBillFromSheets }