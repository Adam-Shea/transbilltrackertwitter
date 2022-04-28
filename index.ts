const fs = require('fs'); //Read files
import {
    watchListSheet,
    legislatureSheet,
    dataStore,
    bill,
    legiScanSearchResult,
} from './src/types';
import {
    legiScanSearchBill,
    legiScanSearchQuery,
    legiScanGetBill,
} from './src/legiscan';
import {
    removeBillFromSheets,
    getGoogleSheetsData,
    addGoogleSheetsRow,
    updateBillFromSheets,
} from './src/sheets';
var CronJob = require('cron').CronJob;
import { chunkSubstr, getItemInArray } from './src/utility';
import { sendTweet, sendMessage } from './src/twitter';

let saveToGoogleSheets: watchListSheet[] = []; //Global save to sheets var to save on api requests
(async function () {
    var scrape = new CronJob('0 0 9,12,17 * * MON,TUE,WED,THU,FRI,SAT,SUN', function () {
        scrapeData();
    }, null, true, 'America/Boise');
    scrape.start();
    var endingSessions = new CronJob('0 0 12 * * *', function () {
        processEndingSessions();
    }, null, true, 'America/Boise');
    endingSessions.start();
})();
//NEW COMMENT
//Scrape data needed
async function scrapeData() {
    const watchList: string[] = [];
    //Sets watchList to empty
    const watchListRow: watchListSheet[] = await getGoogleSheetsData(0);
    //Grabs all data from google sheets to add them to the watchlist
    updateDataFromSheets(watchListRow);
    //Updates description and category based on the latest google sheets

    //Loops through every sheets item and checks to see if it has a legiscan_id. If it does not have a legiscan
    //id, we can assume it's not on the watchlist. We then scrape the data and add it to the watchlist
    for (const row of watchListRow) {
        if (!row.legiscan_id) {
            const legiScanData: legiScanSearchResult = (await legiScanSearchBill(
                row.bill_id.split(' ')[0],
                row.bill_id.split(' ')[1],
            ));
            // @ts-expect-error
            if (legiScanData.data.searchresult['summary'].count > 0) {
                watchList.push(legiScanData.data.searchresult['0'].bill_id);
                updateBillFromSheets(row.bill_id, legiScanData.data.searchresult['0'].bill_id);
            }
        } else {
            watchList.push(row.legiscan_id);
        }
    }

    fs.writeFileSync('data/watchList.json', JSON.stringify(watchList));

    console.log("Starting scrape at " + new Date().getTime());

    //Grab api results for 'transgender'
    const searchResults: legiScanSearchResult = await legiScanSearchQuery(
        '3',
        'all',
        "action:day AND (transgender OR (gender AND affirming AND care) OR (biological AND sex))",
    );
    let customBills: number[] = JSON.parse(
        fs.readFileSync('data/watchList.json'),
    );

    //Loop through results
    for (let i = 0; i < customBills.length; i++) {
        await processBill(customBills[i]);
    }
    for (
        let i = 0;
        i < Object.keys(searchResults.data.searchresult).length - 1;
        i++
    ) {
        if (searchResults.data.searchresult[i].relevance > 95) {
            //For each bill, search for the individual bill data
            await processBill(parseInt(searchResults.data.searchresult[i].bill_id));
        }
    }
    console.log("Finished scrape at " + new Date().getTime());
    console.log('\n');

    if (process.env.NODE_ENV == "prod") {
        addGoogleSheetsRow(saveToGoogleSheets, 0);
    }
}

async function processBill(bill_id: number) {
    //Grab stored data for use in avoiding duplicate tweets
    const legiscanResponse: bill = await legiScanGetBill(bill_id);

    let rawdata = fs.readFileSync('data/data.json');

    let bills: dataStore[] = JSON.parse(rawdata);

    //Has bill already been tweeted?
    //Counts history in response and if history is the same as the data, it has already been tweeted
    var currentBill: dataStore = getItemInArray(
        bills,
        'id',
        legiscanResponse.bill_id,
    );
    if (
        currentBill.status ==
        String(legiscanResponse.status)
    ) {
        return false;
    }

    //If bill is not already in data json, fill all data stores
    if (currentBill.id != String(legiscanResponse.bill_id)) {
        const jsonStoreData: dataStore = {
            id: String(legiscanResponse.bill_id),
            title: String(legiscanResponse.title),
            description: '',
            category: '',
            status: String(legiscanResponse.status),
            historyCount: String(Object.keys(legiscanResponse.history).length),
        };
        //Write data to json
        bills.push(jsonStoreData);
        currentBill = jsonStoreData;

        const sheetStoreData: watchListSheet = {
            legiscan_id: String(legiscanResponse.bill_id),
            bill_id:
                String(legiscanResponse.state) +
                ' ' +
                String(legiscanResponse.bill_number),
            link: String(legiscanResponse.state_link),
            category: '',
            description: '',
        };
        //Write data to sheets
        if (process.env.NODE_ENV == "prod") {
            saveToGoogleSheets.push(sheetStoreData);
        }
        //Save Json
        await fs.writeFileSync('data/data.json', JSON.stringify(bills));
    }

    if (currentBill.description == "" || currentBill.category == "") {
        const watchListRow: watchListSheet[] = await getGoogleSheetsData(0);
        await updateDataFromSheets(watchListRow);
        rawdata = await fs.readFileSync('data/data.json');
        bills = JSON.parse(rawdata);
        currentBill = getItemInArray(
            bills,
            'id',
            legiscanResponse.bill_id,
        );
    }


    //Start generating tweet
    const historyId: number = Object.keys(legiscanResponse.history).length - 1;
    const votesId: number = Object.keys(legiscanResponse.votes).length - 1;
    const legislature: legislatureSheet = await getLegislature(
        legiscanResponse.state,
    );

    //Generate text intro
    const intro: string = `🏳️‍⚧️⚖️ ${legiscanResponse.state} ${legiscanResponse.bill_number}`;

    let status: string = '';
    switch (legiscanResponse.status) {
        case 1:
            if (legiscanResponse.sponsors.length > 0) {
                status = `has been introduced by ${legiscanResponse.sponsors[0].role}. ${legiscanResponse.sponsors[0].last_name}, (${legiscanResponse.sponsors[0].party})`;
            } else {
                status = `has been introduced`
            }
            break;
        case 2:
            status = `has passed the ${legiscanResponse.history[historyId].chamber == "H" ? "House" : "Senate"} by a vote of ${legiscanResponse.votes[votesId].yea}-${legiscanResponse.votes[votesId].nay}-${legiscanResponse.votes[votesId].absent}.`;
            break;
        case 3:
            status = `has passed the ${legiscanResponse.history[historyId].chamber == "H" ? "House" : "Senate"} by a vote of ${legiscanResponse.votes[votesId].yea}-${legiscanResponse.votes[votesId].nay}-${legiscanResponse.votes[votesId].absent} and moves to the desk of ${legislature.Governor}`;
            break;
        case 4:
            status = `has been signed by ${legislature.Governor} `;
            break;
        case 5:
            status = `has been vetoed by ${legislature.Governor}`;
            break;
        case 6:
            status = `has failed. Link to bill below for more infomation.`;
            break;
    }

    //Remove from sheet if failed
    if (legiscanResponse.status == 6) {
        if (process.env.NODE_ENV == "prod") {
            removeBillFromSheets(legiscanResponse.bill_id);
        }
    }

    //Generate title
    const title: string = `, ${currentBill.category}, ${status}`;

    //Generate description
    const description: string = '\n\n' + currentBill.description;

    const link: string = `Link to bill: https://legiscan.com/${legiscanResponse.state}/bill/${legiscanResponse.bill_number}/${legiscanResponse.session.year_start}`;

    //Write relevant data about bill to json
    //Create JSON data

    //Update bill status and history ready for save
    currentBill.status = String(legiscanResponse.status);
    currentBill.historyCount = String(
        Object.keys(legiscanResponse.history).length,
    );

    //Tweet
    const tweetData: string[] = chunkSubstr(intro + title + description, 275);
    tweetData.push(
        `${legiscanResponse.state} House: ${legislature.House}\n${legiscanResponse.state} Senate: ${legislature.Senate}\n${legiscanResponse.state} Governor: ${legislature.Governor}\n${legislature['Representative Contact Link']}`,
    );

    tweetData.push(link);

    if (currentBill.description != "" && currentBill.category != "") {
        if (process.env.NODE_ENV == "prod") {
            sendTweet(tweetData);
        }
    } else {
        //sendMessage(, "test")
    }

    console.log(tweetData);
}

//Update data.json from google sheets
async function updateDataFromSheets(sheetsData: any[]) {
    let data = JSON.parse(fs.readFileSync('data/data.json'));
    for (const row of sheetsData) {
        for (let i = 0; i < data.length; i++) {
            if (data[i].id == String(row.legiscan_id)) {
                data[i].description = row.description;
                data[i].category = row.category;
            }
        }
    }
    await fs.writeFileSync('data/data.json', JSON.stringify(data));
}

async function getLegislature(id: string) {
    const legislatures = await getGoogleSheetsData(1);
    for (let i = 0; i < 50; i++) {
        if (legislatures[i].Short == id) {
            return legislatures[i];
        }
    }
    return {
        House: '',
        Senate: '',
        Governor: '',
        'Representative Contact Link': '',
        Short: '',
        State: '',
    };
}


async function processEndingSessions() {
    console.log("Started ending sessions process at " + new Date().getTime());
    const legislatureData: legislatureSheet[] = await getGoogleSheetsData(1);
    const watchList: watchListSheet[] = await getGoogleSheetsData(0);
    let testDate: any = new Date();
    // add a day
    testDate.setDate(testDate.getDate() - 1);
    for (const state of legislatureData) {
        const legisDate = new Date(state["End of Legislative Session"])
        console.log(legisDate)
        if ((testDate.getDay() == legisDate.getDay()) && (testDate.getMonth() == legisDate.getMonth()) && (testDate.getFullYear() == legisDate.getFullYear())) {
            let tweetList: string = `The ${state.State} Legislative Session has ended. The following bills have failed to pass in time : \n`
            var billCount = 0;
            for (const bill of watchList) {
                if (bill.bill_id.split(" ")[0] == state.Short) {
                    tweetList += `\n${bill.bill_id}, ${bill.description}`
                    billCount++;
                    if (process.env.NODE_ENV == "prod") {
                        removeBillFromSheets(bill.legiscan_id);
                    }
                }
            }
            const tweetData: string[] = chunkSubstr(tweetList, 275);
            console.log(tweetData)
            if (billCount > 0) {
                if (process.env.NODE_ENV == "prod") {
                    sendTweet(tweetData);
                }
            }
        }
    }
}
