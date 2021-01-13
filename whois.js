// Construction
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
require('dotenv').config();

// Discord Initialization
client.once('ready', () => {
	console.log('Ready!');
});

client.login(process.env.TOKEN);

// Global Variables
const namesPath = 'JSON/names.json';
const prefix = '&';
let names = {};

// Load JSON file
if(fs.existsSync(namesPath)) {
    names = JSON.parse(fs.readFileSync(namesPath));
}

client.on('message', message => {
    // Filter messages
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/\s+/);
    if(args.length == 0) return;

    // Search through commands
    if(args[0] == 'whois') {
        request(message, args);
    } else if(args[0] == 'scanall') {
        scanAll(message);
    }
});

function parseID(id) { // Makes id an ID if possible
    if(id.length == 22 && id.substring(0, 3) == '<@!' && id.substring(21, 22) == '>' && !isNaN(id.substring(3, 21))) { // ID with formatting
      return id.substring(3, 21)
    } else if(!isNaN(id) && id.length == 18) { // ID without formatting
      return id;
    } else { // Not an ID
      return false;
    }
}

function formatName(member) { // Formats the name of a member
  return member.nickname ? `${member.nickname} (Tag: ${member.user.tag}, ID: ${member.user.id})` : `${member.user.tag} (ID: ${member.user.id})`;
}

function getName(guild, id, name='') {
    try {
        return formatName(guild.members.cache.get(id));
    } catch(err) {
        return name;
    }
}

function request(message, args) {
  if(args.length != 2 || !parseID(args[1])) { // Filter improper syntax
      message.channel.send(`\`Improper syntax. Type ${prefix}help for help.\``);
  } else {
      let id = parseID(args[1]); // Parse ID

      // Search for ID
      if(!names.hasOwnProperty(id)) {
          message.channel.send(`\`${getName(message.guild, id, message.content.slice(7))} not found.\``);
      } else {
          message.channel.send(`\`${getName(message.guild, id, args[1])} is ${names[id].name}.\``);
      }
  }
}

function scanAll(message) {
    var output='`Missing Users:\n'; // Initialize message
    const idList = Object.keys(names); // Get user list

    // Add each user not in names.json
    Promise.resolve(message.guild.members.fetch()).then((r) => {
        r.forEach((obj) => {
            if (!idList.includes(obj.user.id)) output += formatName(obj) + '\n';
        });
        message.channel.send(output+'`');
    });
}
