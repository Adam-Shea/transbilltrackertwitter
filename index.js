const TwitterApi = require('twitter-api-v2').default;
const axios = require('axios'); //Make rest requests
const fs = require('fs'); //Read files
const client = new TwitterApi({
    appKey: "",
    appSecret: "",
    accessToken: "",
    accessSecret: "",
});

const apiKey = "" //Api Key

scrapeData();
setInterval(function () { scrapeData() }, 20 * 60000)



function scrapeData() {
    console.log("Starting scrape")
    //Grab api results for 'transgender'
    axios.get(`https://api.legiscan.com/?key=${apiKey}&year=3&op=getSearch&state=all&query=action:month+AND+%22transgender%22`).then(function (response) {
        //Loop through results
        for (let i = 0; i < Object.keys(response.data.searchresult).length - 1; i++) {
            if (response.data.searchresult[i].relevance > 95) {
                //For each bill, search for the individual bill data
                axios.get(`https://api.legiscan.com/?key=${apiKey}&op=getBill&id=${response.data.searchresult[i].bill_id}`).then(async function (response) {
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
                    const intro = `🏳️‍⚧️ Bill Update '${response.data.bill.bill_number}'`
                    const link = `\n${response.data.bill.state_link}`

                    //Generate title
                    let title = `\n⚖️ ${response.data.bill.title}`
                    //Shorten title if it goes on for more than 100 character
                    if (title.length > 100) {
                        title = title.substring(0, 100) + "...";
                    }

                    //Generate description
                    let description = response.data.bill.description
                    //Shortern description based on other character lenghts
                    if (270 < (intro + title + description + link).length) {
                        description = description.substring(0, 265 - (intro.length + title.length + link.length)) + "...";
                    }

                    //Generate history
                    let history = `\n🗒️ ${response.data.bill.history[Object.keys(response.data.bill.history).length - 1].action}`
                    //Shortern history based on other character lenghts
                    if (270 < (intro + title + history + link).length) {
                        if ((270 - (intro + title + link).length) > 0) {
                            history = history.substring(0, (265 - (intro + title + link).length)) + "...";
                        } else {
                            history = ""
                        }
                    }

                    //Write relevant data about bill to json
                    //Create JSON data
                    storeData = {
                        id: String(response.data.bill.bill_id),
                        status: String(response.data.bill.status),
                        historyCount: String(Object.keys(response.data.bill.history).length)
                    }
                    //Write data
                    bills.push(storeData)
                    fs.writeFileSync('data.json', JSON.stringify(bills));

                    //Tweet
                    console.log((intro + title + history + link))
                    client.readWrite.v1.tweet((intro + title + history + link))
                })
            }
        }
        console.log("Finished Scrape")
        console.log("\n\n\n")
    });
}