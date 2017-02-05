const linkify = require('linkify-it')();

linkify
    .tlds(require('tlds'));

const admin = require('firebase-admin');
const serviceAccount = require('./priv/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mancave-statistics.firebaseio.com"
});

var charCount = {};
var msgCount = {};
var wordCount = {};

const db = admin.database();
const dbRef = db.ref();
dbRef.on("value", gotData, errorData);

function gotData(snapshot) {
    var data = snapshot.val();
    if (data) {
        if (data.charCount)
            charCount = data.charCount;
        if (data.msgCount)
            msgCount = data.msgCount;
        if (data.wordCount)
            wordCount = data.wordCount;
    }
}

function errorData(error) {
    console.log('Database error:' + errorObject.code);
}

const Discord = require('discord.js');
const client = new Discord.Client();
const discordKey = require('./priv/discordKey.json');

function upMsgCount(username) {
    if (msgCount[username]) {
        msgCount[username]++;
    } else {
        msgCount[username] = 1;
    }

    const msgCountRef = dbRef.child('msgCount');
    msgCountRef.set(msgCount);
}

function upCharCount(username, msg) {
    if (charCount[username]) {
        charCount[username] += msg.length;
    }
    else {
        charCount[username] = msg.length;
    }

    const charCountRef = dbRef.child('charCount');
    charCountRef.set(charCount);
}

function upWordCount(msg) {
    const wordList = filterAndSplit(msg);

    wordList.forEach(function (word) {
        if (wordCount[word]) {
            wordCount[word]++;
        }
        else {
            wordCount[word] = 1;
        }
    });

    const wordCountRef = dbRef.child('wordCount');
    wordCountRef.set(wordCount);

}

function filterAndSplit(string) {
    const detectLinks = linkify.match(string);

    if (detectLinks) {
        for (let i = 0; i < detectLinks.length; i++) {
            string = string.replace(detectLinks[i].raw, '');
        }
    }

    string = string.replace(/[.,\/\\#!\?$%\^&\*;:"{}=\-_`~()]/g, '').replace(/<@.{0,32}>/, '').replace(/\s{2,}/g, " ").toLowerCase();
    const wordList = string.split(' ').filter(Boolean);
    return wordList;
}

client.on('message', message => {
    if (message.author.username == "IRC-Bridge") {
        const regex = /<(.*)>/;
        const username = regex.exec(message.content.split(' ')[0])[1];
        const content = message.content.replace(regex, '').substring(1);
        upMsgCount(username);
        upCharCount(username, content);
        upWordCount(content);
    }
    else {
        if (!message.author.bot) {
            upMsgCount(message.author.username);
            upCharCount(message.author.username, message.content);
            upWordCount(message.content);
        }
    }
});

client.login(discordKey.key);