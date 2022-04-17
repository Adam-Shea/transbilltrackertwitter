require('dotenv').config()
const { GoogleSpreadsheet } = require('google-spreadsheet') //Google Spreadsheet
const TwitterApi = require('twitter-api-v2').default;
const axios = require('axios'); //Make rest requests
const fs = require('fs'); //Read files

const googleSheetId = process.env.GOOGLE_SHEET_ID //Google Sheet ID
const client = new TwitterApi({ //Twitter Client
    appKey: process.env.APP_KEY,
    appSecret: process.env.APP_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET,
});
const apiKeyLegiscan = process.env.API_KEY; //Legiscan api key
//Pulls from .ENV


let saveToGoogleSheets = []; //Global save to sheets var to save on api requests

(async function () {
    scrapeData();
    setTimeout(function () {
        scrapeData();
        setTimeout(function () {
            scrapeData();
            setTimeout(function () {
                scrapeData();
            }, 720 * 60000);
        }, 240 * 60000);
    }, 240 * 60000);
    setInterval(function () {
        scrapeData();
        setTimeout(function () {
            scrapeData();
            setTimeout(function () {
                scrapeData();
                setTimeout(function () {
                    scrapeData();
                }, 720 * 60000);
            }, 240 * 60000);
        }, 240 * 60000);
    }, 1440 * 60000)
})();


//Scrape data needed
async function scrapeData() {
    watchList = fs.readFileSync('watchList.json');
    //Sets watchList to empty

    watchListRow = await getGoogleSheetsData(0) //Grabs all data from google sheets to add them to the watchlist
    updateDataFromSheets(watchListRow)
    for (const row of watchListRow) {
        if (!row.legiscan_id) {
            await axios.get(`https://api.legiscan.com/?key=${apiKeyLegiscan}&op=getSearch&state=${row.bill_id.split(' ')[0]}&bill=${row.bill_id.split(' ')[1]}`).then(async function (response) {
                watchList.push(response.data.searchresult['0'].bill_id)
                fs.writeFileSync('watchList.json', JSON.stringify(watchList));
            })
        }
    }
    //Save legiscan id


    console.log("Starting scrape")
    //Grab api results for 'transgender'
    await axios.get(`https://api.legiscan.com/?key=${apiKeyLegiscan}&year=3&op=getSearch&state=all&query=action:day+AND+%28%22transgender%22+OR+%28%22biological%22+AND+%sex%22%29%29`).then(async function (response) {
        let customBills = JSON.parse(fs.readFileSync('watchList.json'));
        //Loop through results
        for (let i = 0; i < customBills.length - 1; i++) {
            await processBill(customBills[i]);
        }
        for (let i = 0; i < Object.keys(response.data.searchresult).length - 1; i++) {
            if (response.data.searchresult[i].relevance > 95) {
                //For each bill, search for the individual bill data
                await processBill(response.data.searchresult[i].bill_id);
            }
        }
        console.log("Finished Scrape")
        console.log("\n\n\n")
    })
    addGoogleSheetsRow(saveToGoogleSheets, 0);
}

async function processBill(bill_id) {

    await axios.get(`https://api.legiscan.com/?key=${apiKeyLegiscan}&op=getBill&id=${bill_id}`).then(async function (response) {
        //Grab stored data for use in avoiding duplicate tweets
        let rawdata = fs.readFileSync('data.json');
        let bills = JSON.parse(rawdata);
        let currentBill = "";

        let exit = false;

        //Has bill already been tweeted?
        for (let i = 0; i < bills.length; i++) {
            if (bills[i].id == String(response.data.bill.bill_id)) {
                currentBill = bills[i];
                if (bills[i].historyCount == String(Object.keys(response.data.bill.history).length)) {
                    exit = true;
                    return false
                }
            }
        }

        const historyId = Object.keys(response.data.bill.history).length - 1;
        const votesId = Object.keys(response.data.bill.votes).length - 1;
        const legislature = await getLegislature(response.data.bill.state);

        //Generate text intro
        const intro = `🏳️‍⚧️⚖️'${response.data.bill.state} ${response.data.bill.bill_number}'`

        let status = ''
        switch (response.data.bill.status) {
            case 1:
                status = ` has been introduced by ${response.data.bill.sponsors[0].role}. ${response.data.bill.sponsors[0].last_name}, (${response.data.bill.sponsors[0].party})`
                break;
            case 2:
                status = ` has passed the ${response.data.bill.history[historyId].chamber} by a vote of ${response.data.bill.votes[votesId].yea}-${response.data.bill.votes[votesId].nay}-${response.data.bill.votes[votesId].absent} and now moves onto the [Senate/House].`
                break;
            case 3:
                status = ` has passed the ${response.data.bill.history[historyId].chamber} by a vote of ${response.data.bill.votes[votesId].yea}-${response.data.bill.votes[votesId].nay}-${response.data.bill.votes[votesId].absent} and moves to the desk of ${legislature.Governor}`
                break;
            case 4:
                status = ` has been signed by ${legislature.Governor} `
                break;
            case 5:
                status = ` has been vetoed by ${legislature.Governor}`
                break;
            case 6:
                status = ` Failed`
                break;
        }

        //Generate title
        let title = `\n${currentBill.category}, ${status}`

        //Generate description
        let description = "\n" + currentBill.description

        const link = `${response.data.bill.state_link}`

        //Write relevant data about bill to json
        //Create JSON data
        billExists = false
        hasDescription = false
        for (let i = 0; i < bills.length; i++) {
            if (bills[i].id == String(response.data.bill.bill_id)) {
                bills[i].status = String(response.data.bill.status)
                bills[i].historyCount = String(Object.keys(response.data.bill.history).length)
                billExists = true
                if (bills[i].description) {
                    hasDescription = true
                }
                break
            }
        }
        if (billExists == false) {
            storeData = {
                id: String(response.data.bill.bill_id),
                title: String(response.data.bill.title),
                description: "",
                status: String(response.data.bill.status),
                historyCount: String(Object.keys(response.data.bill.history).length)
            }
            //Write data
            bills.push(storeData)

            storeData = {
                "legiscan_id": String(response.data.bill.bill_id),
                "bill_id": String(response.data.bill.state) + " " + String(response.data.bill.bill_number),
                "link": String(response.data.bill.state_link)
            }
            saveToGoogleSheets.push(storeData)
        }
        fs.writeFileSync('data.json', JSON.stringify(bills));

        //Tweet
        const tweetData = chunkSubstr((intro + title + description), 275)
        tweetData.push(`${legislature.House}\n${legislature.Senate}\n${legislature.Governor}\n${legislature['Representative Contact Link']}`);
        tweetData.push(link);
        console.log(tweetData)
        client.readWrite.v1.tweetThread(tweetData)

    })
}


//Get google sheets data
async function getGoogleSheetsData(page_id) {
    const doc = new GoogleSpreadsheet(googleSheetId)
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    });

    await doc.loadInfo() // loads document properties and worksheets

    const sheet = doc.sheetsByIndex[page_id]
    const rows = await sheet.getRows({ offset: 0, /*limit:5*/ })
    return rows;

}

//Write google sheets data
async function addGoogleSheetsRow(row, page_id) {
    const doc = new GoogleSpreadsheet(googleSheetId)
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    });

    await doc.loadInfo() // loads document properties and worksheets

    const sheet = doc.sheetsByIndex[page_id]

    const data = await sheet.addRows(row);
    return data

}

//Update data.json from google sheets
function updateDataFromSheets(sheetsData) {
    let data = JSON.parse(fs.readFileSync('data.json'));
    for (const row of sheetsData) {
        for (let i = 0; i < data.length; i++) {
            if (data[i].id == String(row.legiscan_id)) {
                data[i].description = row.description
                data[i].category = row.category
            }
        }
    }
    fs.writeFileSync('data.json', JSON.stringify(data));
}

async function getLegislature(id) {
    const legislatures = await getGoogleSheetsData(1);
    for (let i = 0; i < 50; i++) {
        if (legislatures[i].Short == id) {
            return legislatures[i]
        }
    }
    return { "House": "", "Senate": "", "Governor": "", "Representative Contact Link": "", "Short": "", "State": "" }
}

function chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size) + "..."
    }

    return chunks
};