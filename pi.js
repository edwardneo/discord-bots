// Construction
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const { toNamespacedPath } = require('path');
const { send } = require('process');
require('dotenv').config();

// Discord Initialization
client.login(process.env.PI_TOKEN);

// Global Variables
const paths = {
    digits: 'data/pi_digits.txt',
    stats: 'data/pi_stats.txt'
};
const piDigits = fs.readFileSync(paths.digits).toString('utf-8');
let stats = {
    channelID: '', // Enter channel ID here
    piIndex: 0,
    lastMessage: { // Attributes of lastMessage are filler to prevent errors being thrown from calling them
        author: { id: undefined },
        id: undefined
    },
    lastMemberID: undefined
};

// Client ready
client.once('ready', () => {
    // Load data files
    if(fs.existsSync(paths.stats)) {
        stats = JSON.parse(fs.readFileSync(paths.stats));
    } else {
        fs.writeFileSync(paths.stats, JSON.stringify(stats));
    }

    console.log('Ready!');
});

// Message sent
client.on('message', message => {
    if(message.channel.id == stats.channelID && !message.author.bot) { // Message can contain a digit of pi tracked by the bot
        if(message.content == piDigits.substring(stats.piIndex, stats.piIndex+1) && message.author.id != stats.lastMemberID) { // Correct digit
            console.log(piDigits.substring(stats.piIndex, stats.piIndex+1));

            stats.lastMessage = message;
            stats.lastMemberID = message.author.id;
            stats.piIndex++;

            fs.writeFileSync(paths.stats, JSON.stringify(stats));
        } else { // Incorrect digit
            Promise.resolve(message.delete())
                .then(msg => console.log(`Deleted message sent at ${msg.createdAt.toString()} from ${msg.author.username}.`))
                .catch(err => errorMsg(err, message));
        }
    }
});

// Message deleted --> Add back message
client.on("messageDelete", message => {
    if(message.channel.id == stats.channelID && message.id == stats.lastMessage.id) {
        Promise.resolve(message.channel.send(`<@!${stats.lastMemberID}>: ${piDigits.substring(stats.piIndex-1, stats.piIndex)}`))
            .then(msg => stats.lastMessage = msg)
            .catch(err => errorMsg(err, message));
    }
});

// Message updated --> Delete message (automatically prompts message deleted block)
client.on('messageUpdate', (oldMessage, newMessage) => {
    if(oldMessage.channel.id == stats.channelID && !oldMessage.author.bot && oldMessage.id == stats.lastMessage.id) {
        Promise.resolve(newMessage.delete()) // Note this also runs the deletion script
            .then(msg => console.log(`Deleted message sent at ${msg.createdAt.toString()} from ${msg.author.username}.`))
            .catch(err => errorMsg(err, oldMessage));
    }
});

// Error message formatting
function errorMsg(err, msg) {
    console.err();
    console.err(new Date().toString());
    console.err(`ID: ${msg.id}`);
    console.error(err);
}