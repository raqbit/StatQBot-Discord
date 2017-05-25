const linkify = require('linkify-it')();
var crypto = require('crypto');

linkify.tlds(require('tlds'));

const admin = require('firebase-admin');
const serviceAccount = require('./priv/serviceAccountKey.json');

const settings = require('./settings.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mancave-statistics.firebaseio.com"
});

const database = admin.database();
const dbRef = database.ref('/');
dbRef.on('value', gotData, errorData);

const globalRef = dbRef.child('global');

const charCountRef = dbRef.child('charCount');
const globalCharCountRef = globalRef.child('charCount');

const msgCountRef = dbRef.child('msgCount');
const globalMsgCountRef = globalRef.child('msgCount')

const wordCountRef = dbRef.child('wordCount');


let charCount = {};

let globalCharCount = 0;

let msgCount = {};

let globalMsgCount = 0;

let wordCount = {};



function gotData(snapshot) {
    var data = snapshot.val();
    if (data) {
        charCount = data.charCount;
        globalCharCount = data.global.charCount;
        msgCount = data.msgCount;
        globalMsgCount = data.global.msgCount;
        wordCount = data.wordCount;
    }
}

function errorData(error) {
    console.log('Database error:' + errorObject.code);
}

const Discord = require('discord.js');
const client = new Discord.Client();
const discordKey = require('./priv/discordKey.json');

client.on('message', message => {
    if (message.content === '&stats') {
        message.channel.sendMessage('', {
            embed: new Discord.RichEmbed()
                .setTitle('Mancave-Statistics')
                .setDescription('**Global Stats:**\n' + formatStats())
                .setURL('https://mancave-statistics.firebaseapp.com')
                .setColor('#ffc800')
                .setThumbnail('https://mancave-statistics.firebaseapp.com/favicon/mstile-310x310.png')
                .setFooter('Click link for all statistics.')
        });
        return;
    }

    if (!message.author.bot && !message.channel.name === 'bot-testing' && !settings.dev) {
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

    globalMsgCount++;
    msgCountRef.set(msgCount);
    globalMsgCountRef.set(globalMsgCount);
}

function upCharCount(username, msg) {
    if (charCount[username]) {
        charCount[username] += msg.length;
    }
    else {
        charCount[username] = msg.length;
    }
    globalCharCount += msg.length;

    charCountRef.set(charCount);
    globalCharCountRef.set(globalCharCount);
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

function formatStats() {
    return 'Messages sent: ' + globalMsgCount + '\nCharacters sent: ' + globalCharCount + '\n';
}
