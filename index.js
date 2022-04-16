require('dotenv').config()
const TwitterApi = require('twitter-api-v2').default;
const axios = require('axios'); //Make rest requests
const fs = require('fs'); //Read files
const csv = require('fast-csv');

const client = new TwitterApi({
    appKey: process.env.APP_KEY,
    appSecret: process.env.APP_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET,
});
const apiKey = process.env.API_KEY;

(async function () {
    await scrapeData();
    setInterval(function () { scrapeData() }, 20 * 60000)
})();

async function scrapeData() {
    csvScrape = false
    billNumbers = []
    fs.createReadStream('bills.csv')
        .pipe(csv.parse({ headers: true }))
        .on('error', error => console.error(error))
        .on('data', async row => {
            if (row.Status == "Active") {
                await axios.get(`https://api.legiscan.com/?key=${apiKey}&op=getSearch&state=${row['Case Name'].split(' ')[0]}&bill=${row['Case Name'].split(' ')[1]}`).then(async function (response) {
                    billNumbers.push(response.data.searchresult['0'].bill_id)
                    fs.writeFileSync('customBills.json', JSON.stringify(billNumbers));
                })
            }
        }).on('end', rowCount => console.log(billNumbers)
        )

    console.log("Starting scrape")
    //Grab api results for 'transgender'
    axios.get(`https://api.legiscan.com/?key=${apiKey}&year=3&op=getSearch&state=all&query=action:week+AND+%22transgender%22`).then(function (response) {
        let customBills = JSON.parse(fs.readFileSync('customBills.json'));
        //Loop through results
        for (let i = 0; i < customBills.length - 1; i++) {
            processBill(customBills[i]);
        }
        for (let i = 0; i < Object.keys(response.data.searchresult).length - 1; i++) {
            if (response.data.searchresult[i].relevance > 95) {
                //For each bill, search for the individual bill data
                processBill(response.data.searchresult[i].bill_id);
            }
        }
        console.log("Finished Scrape")
        console.log("\n\n\n")
    })
}

async function processBill(bill_id) {
    await axios.get(`https://api.legiscan.com/?key=${apiKey}&op=getBill&id=${bill_id}`).then(async function (response) {
        //Grab stored data for use in avoiding duplicate tweets
        let rawdata = fs.readFileSync('data.json');
        let bills = JSON.parse(rawdata);
        let exit = false;

        //Has bill already been tweeted?
        for (let i = 0; i < bills.length; i++) {
            if (bills[i].id == String(response.data.bill.bill_id) && bills[i].historyCount == String(Object.keys(response.data.bill.history).length)) {
                exit = true;
                break
            }
        }
        if (exit == true) {
            return false
        }

        //Generate text intro
        const intro = `🏳️‍⚧️'${response.data.bill.state} ${response.data.bill.bill_number}'`
        const link = `\n${response.data.bill.state_link}`

        //Generate title
        let title = `\n⚖️ ${response.data.bill.title}`

        let status = ''
        switch (response.data.bill.status) {
            case 1:
                status = `\nStatus : Introduced`
                break;
            case 2:
                status = `\nStatus : Engrossed`
                break;
            case 3:
                status = `\nStatus : Enrolled`
                break;
            case 4:
                status = `\nStatus : Passed`
                break;
            case 5:
                status = `\nStatus : Vetoed`
                break;
            case 6:
                status = `\nStatus : Failed`
                break;
        }

        //Generate description
        let description = response.data.bill.description

        //Generate history
        let history = `\n🗒️ ${response.data.bill.history[Object.keys(response.data.bill.history).length - 1].action}`

        //Write relevant data about bill to json
        //Create JSON data
        billExists = false
        hasDescription = false
        for (let i = 0; i < bills.length; i++) {
            if (bills[i].id == String(response.data.bill.bill_id)) {
                storeData = {
                    status: String(response.data.bill.status),
                    historyCount: String(Object.keys(response.data.bill.history).length)
                }
                bills[i] = storeData
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
        }
        fs.writeFileSync('data.json', JSON.stringify(bills));

        //Tweet
        console.log((intro + history + description + status + link))
        if (hasDescription) {
            const tweetData = (intro + title + history).match(/.{1,275}/g).push(link)
            //client.readWrite.v1.tweetThread(tweetData)
        } else {

        }
    })
}