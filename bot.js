const linkify = require('linkify-it')();
var crypto = require('crypto');

linkify.tlds(require('tlds'));

const admin = require('firebase-admin');
const serviceAccount = require('./priv/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mancave-statistics.firebaseio.com"
});

const database = admin.database();
const dbRef = database.ref('/');
dbRef.on('value', gotData, errorData);

let charCount = {};
let msgCount = {};
let wordCount = {};

function gotData(snapshot) {
    var data = snapshot.val();
    if (data) {
        charCount = data.charCount || {};
        msgCount = data.msgCount || {};
        wordCount = data.wordCount || {};
    }
}

function errorData(error) {
    console.log('Database error:' + errorObject.code);
}

const Discord = require('discord.js');
const client = new Discord.Client();
const discordKey = require('./priv/discordKey.json');

client.on('message', message => {
    if (!message.author.bot) {
        upMsgCount(message.author.username);
        upCharCount(message.author.username, message.content);
        upWordCount(message.content);
    }
});

client.login(discordKey.key);

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

    wordList.forEach((word) => {
        if (word === "") {
            return;
        }
        const id = seededID(word);
        if (wordCount[id]) {
            wordCount[id].score++;
        } else {
            wordCount[id] = {};
            wordCount[id].score = 1;
            wordCount[id].word = word;
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

    string = string
        .replace(/[.,\/\\#!\?$%\^&\*;:"{}=\-_`~()]/g, '')
        .replace(/<@.{0,32}>/, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/'.*'/g, '$1').toLowerCase();
    const wordList = string.split(' ');
    return wordList;
}

function seededID(seed) {
    return crypto.createHash('md5').update(seed).digest('hex');
}
