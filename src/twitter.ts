require('dotenv').config();
const TwitterApi = require('twitter-api-v2').default;

const client = new TwitterApi({
    //Twitter Client
    appKey: process.env.APP_KEY,
    appSecret: process.env.APP_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET,
});

export function sendTweet(data: string[]) {
    client.readWrite.v1.tweetThread(data);
}

export function sendMessage(id: number, message: string) {
    client.v1.sendDm({
        recipient_id: id,
        text: message,
    });
}
