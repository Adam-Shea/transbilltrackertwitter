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
} from './src/sheets';
import { chunkSubstr, getItemInArray } from './src/utility';
import { sendTweet } from './src/twitter';

let saveToGoogleSheets: watchListSheet[] = []; //Global save to sheets var to save on api requests

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
    }, 1440 * 60000);
})();

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
            watchList.push(legiScanData.data.searchresult['0'].bill_id);
            fs.writeFileSync('data/watchList.json', JSON.stringify(watchList));
        } else {
            watchList.push(row.legiscan_id);
        }
    }

    console.log('Starting scrape');

    //Grab api results for 'transgender'
    const searchResults: legiScanSearchResult = await legiScanSearchQuery(
        '3',
        'all',
        "action:day AND ('transgender' OR ('biological' AND 'sex'))",
    );
    let customBills: number[] = JSON.parse(
        fs.readFileSync('data/watchList.json'),
    );

    //Loop through results
    for (let i = 0; i < customBills.length - 1; i++) {
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
    console.log('Finished Scrape');
    console.log('\n\n\n');

    addGoogleSheetsRow(saveToGoogleSheets, 0);
}

async function processBill(bill_id: number) {
    //Grab stored data for use in avoiding duplicate tweets
    const legiscanResponse: bill = await legiScanGetBill(bill_id);
    let rawdata = fs.readFileSync('data/data.json');
    let bills: dataStore[] = JSON.parse(rawdata);

    //Has bill already been tweeted?
    //Counts history in response and if history is the same as the data, it has already been tweeted
    const currentBill: dataStore = getItemInArray(
        bills,
        'id',
        legiscanResponse.bill_id,
    );
    if (
        currentBill.historyCount ==
        String(Object.keys(legiscanResponse.history).length)
    ) {
        return false;
    }

    //Start generating tweet
    const historyId: number = Object.keys(legiscanResponse.history).length - 1;
    const votesId: number = Object.keys(legiscanResponse.votes).length - 1;
    const legislature: legislatureSheet = await getLegislature(
        legiscanResponse.state,
    );

    //Generate text intro
    const intro: string = `🏳️‍⚧️⚖️'${legiscanResponse.state} ${legiscanResponse.bill_number}'`;

    let status: string = '';
    switch (legiscanResponse.status) {
        case 1:
            status = ` has been introduced by ${legiscanResponse.sponsors[0].role}. ${legiscanResponse.sponsors[0].last_name}, (${legiscanResponse.sponsors[0].party})`;
            break;
        case 2:
            status = ` has passed the ${legiscanResponse.history[historyId].chamber} by a vote of ${legiscanResponse.votes[votesId].yea}-${legiscanResponse.votes[votesId].nay}-${legiscanResponse.votes[votesId].absent}.`;
            break;
        case 3:
            status = ` has passed the ${legiscanResponse.history[historyId].chamber} by a vote of ${legiscanResponse.votes[votesId].yea}-${legiscanResponse.votes[votesId].nay}-${legiscanResponse.votes[votesId].absent} and moves to the desk of ${legislature.Governor}`;
            break;
        case 4:
            status = ` has been signed by ${legislature.Governor} `;
            break;
        case 5:
            status = ` has been vetoed by ${legislature.Governor}`;
            break;
        case 6:
            status = ` Failed`;
            break;
    }

    //Remove from sheet if failed
    if (legiscanResponse.status == 6) {
        removeBillFromSheets(legiscanResponse.bill_id);
    }

    //Generate title
    const title: string = `\n${currentBill.category}, ${status}`;

    //Generate description
    const description: string = '\n' + currentBill.description;

    const link: string = `${legiscanResponse.state_link}`;

    //Write relevant data about bill to json
    //Create JSON data

    //Update bill status and history ready for save
    currentBill.status = String(legiscanResponse.status);
    currentBill.historyCount = String(
        Object.keys(legiscanResponse.history).length,
    );

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
        saveToGoogleSheets.push(sheetStoreData);
    }

    //Save Json
    fs.writeFileSync('data/data.json', JSON.stringify(bills));

    //Tweet
    const tweetData: string[] = chunkSubstr(intro + title + description, 275);
    tweetData.push(
        `${legislature.House}\n${legislature.Senate}\n${legislature.Governor}\n${legislature['Representative Contact Link']}`,
    );
    tweetData.push(link);
    console.log(tweetData);
    sendTweet(tweetData);
}

//Update data.json from google sheets
function updateDataFromSheets(sheetsData: any[]) {
    let data = JSON.parse(fs.readFileSync('data/data.json'));
    for (const row of sheetsData) {
        for (let i = 0; i < data.length; i++) {
            if (data[i].id == String(row.legiscan_id)) {
                data[i].description = row.description;
                data[i].category = row.category;
            }
        }
    }
    fs.writeFileSync('data/data.json', JSON.stringify(data));
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
