const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
require('dotenv').config()
const users = require("./names.json");
client.once('ready', () => { console.log("ready"); })
client.on('message', message => {
    if (message.content==="scanAll") {
        scanAll(message);
    }
});
client.login(process.env.LOGIN_TOKEN);

function scanAll(message) {
    var output="`Missing Users:\n";
    const idList = Object.keys(users);
    Promise.resolve(message.guild.members.fetch()).then((r) => {
        r.forEach((obj)=>{
            if (!idList.includes(obj.user.id)) {
                output+=`${obj.user.username} (${obj.user.id})\n`;
            }
        });
        message.channel.send(output+"`");
    });
}