// Construction
const Discord = require('discord.js');
const client = new Discord.Client();
const { send } = require('process');
require('dotenv').config();

// Discord Initialization
client.once('ready', () => {
    Promise.resolve(client.user.setStatus('invisible'))
        .then(msg => {
            console.log('Ready!');
            console.log(msg);
        }).catch(err => console.error(err));
});

client.login(process.env.SNIPER_TOKEN);

// Message sent
client.on('message', message => {
    if(message.content.startsWith('419')) {
        message.channel.send('420');
    }
});