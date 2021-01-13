const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
require('dotenv').config();

const namesPath = 'JSON/names.json';
const prefix = '&';
let names;

if(fs.existsSync(namesPath)) {
    names = JSON.parse(fs.readFileSync(namesPath));
}

client.login(process.env.TOKEN);

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', message => {
    if(!message.content.startsWith(prefix) || message.author.bot) return;
    const channel = message.channel;
    const args = message.content.slice(prefix.length).split(/\s+/);
    if(args.length < 2) return;
    if(args[0] == 'whois') {
        if(args.length != 2 || !isID(args[1])) {
            channel.send(`\`Improper syntax. Type ${prefix}help for help.\``);
        } else {
            id = args[1].substring(3,21);
            if(!names.hasOwnProperty(id)) {
                channel.send(`\`${getName(message.guild, id, message.content.slice(7))} not found.\``);
            } else {
                channel.send(`\`${getName(message.guild, id, args[1])} is ${names[id].name}.\``);
            }
        }
    }

});

function isID(id) {
    return id.length == 22 && id.substring(0, 3) == '<@!' && id.substring(21, 22) == '>' && !isNaN(id.substring(3, 21));
}
function getName(guild, id, request) {
    try {
        let member = guild.members.cache.get(id);
        return member.nickname ? `${member.nickname} (${member.user.tag})` : member.user.tag;
    } catch(err) {
        return request;
    }
}