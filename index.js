const fs = require('fs'); //Read files
const AWSS3 = require('aws-sdk/clients/s3');
const CONTENT_INDEX_FILENAME = 'data.json';
const s3 = new AWSS3();
// Create client outside of handler to reuse
const legiScanFuncs = require('./src/legiscan.js');
const sheetsFuncs = require('./src/sheets.js');
const utilityFuncs = require('./src/utility.js');
const twitterFuncs = require('./src/twitter.js');
//import { getCanadaSearch } from './src/openCa';

let saveToGoogleSheets = []; //Global save to sheets var to save on api requests

exports.handler = function () {
    //https://stackoverflow.com/questions/54066524/aws-s3-lambda-event-get-update-then-put-json-file-from-same-bucket
    // if (process.env.NODE_ENV == "dev") {
    //     // scrapeData();
    //     // processEndingSessions();
    //     const data = await getCanadaSearch("transgender", "all");
    //     console.log(data)
    //     let list = []
    //     for (const row of data) {
    //         const formattedData = {
    //             id: row.NumberCode,
    //             parlimentNumber: row.ParliamentNumber,
    //             sessionNumber: row.SessionNumber,
    //             link: `https://www.parl.ca/LegisInfo/en/bill/${row.ParliamentNumber}-${row.SessionNumber}/${row.NumberCode}`
    //         }
    //         list.push(formattedData);
    //     }
    //     console.log(list)
    //     addGoogleSheetsRow(list, 2);
    // }
    scrapeData();
    processEndingSessions();

    //NEW COMMENT
    //Scrape data needed
    async function scrapeData() {
        const watchList = [];
        //Sets watchList to empty
        const watchListRow = await sheetsFuncs.getGoogleSheetsData(0);
        //Grabs all data from google sheets to add them to the watchlist
        updateDataFromSheets(watchListRow);
        //Updates description and category based on the latest google sheets

        //Loops through every sheets item and checks to see if it has a legiscan_id. If it does not have a legiscan
        //id, we can assume it's not on the watchlist. We then scrape the data and add it to the watchlist
        for (const row of watchListRow) {
            if (!row.legiscan_id) {
                const legiScanData = (await legiScanFuncs.legiScanSearchBill(
                    row.bill_id.split(' ')[0],
                    row.bill_id.split(' ')[1],
                ));
                // @ts-ignore
                if (legiScanData.data.searchresult['summary'].count > 0) {
                    watchList.push(legiScanData.data.searchresult['0'].bill_id);
                    sheetsFuncs.updateBillFromSheets(row.bill_id, legiScanData.data.searchresult['0'].bill_id);
                }
            } else {
                watchList.push(row.legiscan_id);
            }
        }

        console.log("Starting scrape at " + new Date().getTime());

        //Grab api results for 'transgender'
        const searchResults = await legiScanFuncs.legiScanSearchQuery(
            '3',
            'all',
            "action:day AND (transgender OR (gender AND affirming AND care) OR (biological AND sex))",
        );

        //Loop through results
        for (let i = 0; i < watchList.length; i++) {
            await processBillUS(parseInt(watchList[i]));
        }
        for (
            let i = 0;
            i < Object.keys(searchResults.data.searchresult).length - 1;
            i++
        ) {
            if (searchResults.data.searchresult[i].relevance > 95) {
                //For each bill, search for the individual bill data
                await processBillUS(parseInt(searchResults.data.searchresult[i].bill_id));
            }
        }
        console.log("Finished scrape at " + new Date().getTime());
        console.log('\n');

        if (process.env.NODE_ENV == "prod") {
            sheetsFuncs.addGoogleSheetsRow(saveToGoogleSheets, 0);
        }
    }

    async function processBillUS(bill_id) {
        //Grab stored data for use in avoiding duplicate tweets
        const legiscanResponse = await legiScanFuncs.legiScanGetBill(bill_id);


        let rawdata = await s3.getObject({
            Bucket: "tracktransbills",
            Key: CONTENT_INDEX_FILENAME
        }).promise();
        rawdata = rawdata.Body.toString('utf-8');

        let bills = JSON.parse(rawdata);

        //Has bill already been tweeted?
        //Counts history in response and if history is the same as the data, it has already been tweeted
        var currentBill = utilityFuncs.getItemInArray(
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
            const jsonStoreData = {
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

            const sheetStoreData = {
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
            await s3.putObject({
                Bucket: "tracktransbills",
                Key: CONTENT_INDEX_FILENAME,
                Body: JSON.stringify(bills),
                ContentType: 'application/json'
            }).promise();
        }

        if (currentBill.description == "" || currentBill.category == "") {
            const watchListRow = await sheetsFuncs.getGoogleSheetsData(0);
            await updateDataFromSheets(watchListRow);
            rawdata = await s3.getObject({
                Bucket: "tracktransbills",
                Key: CONTENT_INDEX_FILENAME
            }).promise();
            rawdata = rawdata.Body.toString('utf-8');
            bills = JSON.parse(rawdata);
            currentBill = utilityFuncs.getItemInArray(
                bills,
                'id',
                legiscanResponse.bill_id,
            );
        }


        //Start generating tweet
        const historyId = Object.keys(legiscanResponse.history).length - 1;
        const votesId = Object.keys(legiscanResponse.votes).length - 1;
        const legislature = await getLegislature(
            legiscanResponse.state,
        );

        //Generate text intro
        const intro = `🏳️‍⚧️⚖️ ${legiscanResponse.state} ${legiscanResponse.bill_number}`;

        let status = '';
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
                sheetsFuncs.removeBillFromSheets(legiscanResponse.bill_id);
            }
        }

        //Generate title
        const title = `, ${currentBill.category}, ${status}`;

        //Generate description
        const description = '\n\n' + currentBill.description;

        const link = `Link to bill: https://legiscan.com/${legiscanResponse.state}/bill/${legiscanResponse.bill_number}/${legiscanResponse.session.year_start}`;

        //Write relevant data about bill to json
        //Create JSON data

        //Update bill status and history ready for save
        currentBill.status = String(legiscanResponse.status);
        currentBill.historyCount = String(
            Object.keys(legiscanResponse.history).length,
        );

        //Tweet
        const tweetData = utilityFuncs.chunkSubstr(intro + title + description, 275);
        tweetData.push(
            `${legiscanResponse.state} House: ${legislature.House}\n${legiscanResponse.state} Senate: ${legislature.Senate}\n${legiscanResponse.state} Governor: ${legislature.Governor}\n${legislature['Representative Contact Link']}`,
        );

        tweetData.push(link);

        if (currentBill.description != "" && currentBill.category != "") {
            if (process.env.NODE_ENV == "prod") {
                twitterFuncs.sendTweet(tweetData);
            }
        } else {
            //sendMessage(, "test")
        }

        console.log(tweetData);
    }

    //Update data.json from google sheets
    async function updateDataFromSheets(sheetsData) {
        let data = await s3.getObject({
            Bucket: "tracktransbills",
            Key: CONTENT_INDEX_FILENAME
        }).promise();
        data = JSON.parse(data.Body.toString('utf-8'));
        for (const row of sheetsData) {
            for (let i = 0; i < data.length; i++) {
                if (data[i].id == String(row.legiscan_id)) {
                    data[i].description = row.description;
                    data[i].category = row.category;
                }
            }
        }
        await s3.putObject({
            Bucket: "tracktransbills",
            Key: CONTENT_INDEX_FILENAME,
            Body: JSON.stringify(data),
            ContentType: 'application/json'
        }).promise();
    }

    async function getLegislature(id) {
        const legislatures = await sheetsFuncs.getGoogleSheetsData(1);
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
        const legislatureData = await sheetsFuncs.getGoogleSheetsData(1);
        const watchList = await sheetsFuncs.getGoogleSheetsData(0);
        let testDate = new Date();
        // add a day
        testDate.setDate(testDate.getDate() - 1);
        for (const state of legislatureData) {
            const legisDate = new Date(state["End of Legislative Session"])
            console.log(legisDate)
            if ((testDate.getDay() == legisDate.getDay()) && (testDate.getMonth() == legisDate.getMonth()) && (testDate.getFullYear() == legisDate.getFullYear())) {
                let tweetList = `The ${state.State} Legislative Session has ended. The following bills have failed to pass in time : \n`
                var billCount = 0;
                for (const bill of watchList) {
                    if (bill.bill_id.split(" ")[0] == state.Short) {
                        tweetList += `\n${bill.bill_id}, ${bill.description}`
                        billCount++;
                        if (process.env.NODE_ENV == "prod") {
                            sheetsFuncs.removeBillFromSheets(bill.legiscan_id);
                        }
                    }
                }
                const tweetData = utilityFuncs.chunkSubstr(tweetList, 275);
                console.log(tweetData)
                if (billCount > 0) {
                    if (process.env.NODE_ENV == "prod") {
                        twitterFuncs.sendTweet(tweetData);
                    }
                }
            }
        }
    }
}