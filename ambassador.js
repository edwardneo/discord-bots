// Construction
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const { toNamespacedPath } = require('path');
require('dotenv').config();

// Discord Initialization
client.once('ready', () => {
	console.log('Ready!');
});

client.login(process.env.TOKEN);

// Global Variables
const ambassadorsPath = 'JSON/ambassadors.json';
const prefix = '\\';
let ambassadors = ['Server Owner'];

// Load JSON file
if(fs.existsSync(ambassadorsPath)) {
    ambassadors = JSON.parse(fs.readFileSync(ambassadorsPath)).roles;
} else {
    fs.writeFileSync(ambassadorsPath, JSON.stringify({'roles': ambassadors}));
}

client.on('message', message => {
    // Filter messages
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/\s+/);
    if(args.length == 0) return;

    // Search through commands
    if(args[0] == 'checkAmbassadors') {
        checkAmbassadors(message);
    } else if(args[0] == 'addAmbassadors') {
        addAmbassadors(message, args);
    } else if(args[0] == 'removeAmbassadors') {
        removeAmbassadors(message, args);
    }
});

function checkAmbassadors(message) {
    message.channel.send('```' + formatName(message.guild.owner) + ambassadors.slice(1, ambassadors.length).join('\n') + '```');
}

function addAmbassadors(message, args) {

}

function removeAmbassadors(message, args) {
    
}

function formatName(member) { // Formats the name of a member
    return member.nickname ? `${member.nickname} (Tag: ${member.user.tag}, ID: ${member.user.id})` : `${member.user.tag} (ID: ${member.user.id})`;
}