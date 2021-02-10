// Construction
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const { toNamespacedPath } = require('path');
const { send } = require('process');
require('dotenv').config();

// Discord Initialization
client.once('ready', () => {
	console.log('Ready!');
});

client.login(process.env.TOKEN);

// Global Variables
const ambassadorsPath = 'JSON/ambassadors.json';
const prefix = '\\';
let serverOwner;
let ambassadors = {roles: [],
                   members: []};

// Load JSON file
if(fs.existsSync(ambassadorsPath)) {
    ambassadors = JSON.parse(fs.readFileSync(ambassadorsPath));
} else {
    fs.writeFileSync(ambassadorsPath, JSON.stringify(ambassadors));
}

client.on('message', message => {
    // Check server owner change
    if (serverOwner != message.guild.ownerID) {
        if (ambassadors.members.includes(serverOwner)) {
            ambassadors.members.pop(serverOwner);
        }
        if (!ambassadors.members.includes(message.guild.ownerID)) {
            ambassadors.members.push(message.guild.ownerID);
        }
        serverOwner = message.guild.ownerID;
        fs.writeFileSync(ambassadorsPath, JSON.stringify(ambassadors));
    }

    // Filter messages
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(' ');
    if(args.length == 0) return;

    // Search through commands
    if(args[0] == 'listAmbassadors') {
        listAmbassadors(message);
    } else if(args[0] == 'addAmbassadors') {
        alterAmbassadors(message, args, true);
    } else if(args[0] == 'removeAmbassadors') {
        alterAmbassadors(message, args, false);
    }
});

function checkAmbassador(member) {
    return ambassadors.members.includes(member.user.id) || member.roles.cache.some(obj => {
        console.log(ambassadors);
        return ambassadors.roles.includes(obj.id);
    });
}

function listAmbassadors(message) {
    let memberOutput = [...ambassadors.members];
    Promise.resolve(message.guild.members.fetch())
        .then(members => {
            members.forEach(member => {
                ambassadors.members.forEach((id, index) => {
                    if (member.user.id == id) {
                        memberOutput[index] = member;
                    }
                })
            })
            memberOutput.forEach((member, index) => {
                if (typeof member == 'object') {
                    memberOutput[index] = formatName(member);
                } else {
                    memberOutput[index] = member + ' (user not found)';
                }
            })
            message.channel.send('```\nAMBASSADORS\nRoles:\n' + ambassadors.roles.join('\n') + '\nMembers:\n' + memberOutput.sort().join('\n') + '```');
        }).catch(err => {
            console.error(err);
            message.channel.send('```Fetching member list from guild failed. Try again later.```');
        })
}

function alterAmbassadors(message, args, add) {
    if (checkAmbassador(message.member)) {
        if(args.length < 3 || !['member', 'role'].includes(args[1])) {
            message.channel.send("```Wrong format. Type '\\help alterAmbassadors' for more info.```");
            return;
        }

        let arg = args.slice(2, args.length).join(' ');
        let id;

        if (args[1] == 'member') {
            let member;
            Promise.resolve(message.guild.members.fetch())
                .then(members => {
                    if (args.length >= 4 && ['--name', '-n'].includes(args[2])) {
                        arg = args.slice(3, args.length).join(' ');
                        member = members.find(member => member.user.username == arg || member.user.nickname == arg);
                        if (member) {
                            id = member.user.id;
                        } else {
                            message.channel.send('```' + arg + ' not found.```');
                            return;
                        }
                    } else {
                        member = members.find(member => member.user.id == arg || member.user.id == unwrapID(arg));
                        if (member) {
                            id = member.user.id;
                        } else {
                            message.channel.send('``` Member with ID ' + (unwrapID(arg) ? unwrapID(arg) : arg) + ' not found.```');
                            return;
                        }
                    }

                    if (add) {
                        if (ambassadors.members.includes(id)) {
                            message.channel.send("```" + formatName(member) + " is already an ambassador.```");
                        } else {
                            ambassadors.members.push(id);
                            ambassadors.members.sort();
                            fs.writeFileSync(ambassadorsPath, JSON.stringify(ambassadors));
                            message.channel.send("```" + formatName(member) + " has been added to the list of ambassadors.```");
                        }
                    } else {
                        if (id == serverOwner) {
                            message.channel.send("```" + formatName(member) + " cannot be removed.```");
                        } else if (id == message.author.id) {
                            message.channel.send("```You cannot revoke your own access.```");
                        } else if (ambassadors.members.includes(id)) {
                            ambassadors.members = ambassadors.members.filter(memberID => {return memberID != id});
                            fs.writeFileSync(ambassadorsPath, JSON.stringify(ambassadors));
                            message.channel.send("```" + formatName(member) + " has been removed from the list of ambassadors.```");
                        } else {
                            message.channel.send("```" + formatName(member) + " is not an ambassadors.```");
                        }
                    }
                }).catch(err => {
                    console.error(err);
                    message.channel.send('```Fetching member list from guild failed. Try again later.```');
                    return;
                })
        } else if (args[1] == 'role') {
        }
    } else {
        message.channel.send("```Permission denied.```");
    }
}

function isID(id, type=undefined) {
    const idTypes = {user: '!',
                     role: '&'};
    
    if (type == undefined) {
        return id.length == 22 && id.substring(0, 2) == '<@' && Object.values(idTypes).includes(id.substring(2, 3)) && id.substring(21, 22) == '>' && !isNaN(id.substring(3, 21));
    } else if (Object.keys(idTypes).includes(type)) {
        return id.length == 22 && id.substring(0, 3) == '<@' + idTypes[type] && id.substring(21, 22) == '>' && !isNaN(id.substring(3, 21));
    }
    return false;
}

function unwrapID(id, type=undefined) {
    if (isID(id, type)) {
        return id.substring(3, 21);
    }
    return undefined;
}

function wrapID(id, type) {
    const idTypes = {user: '!',
                     role: '&'};

    if (id.length == 18 && !isNaN(id)) {
        return "<@" + idTypes[type] + id + ">";
    }
    return undefined;
}

function formatName(member) { // Formats the name of a member
    return member.nickname ? `${member.nickname} (Tag: ${member.user.tag}, ID: ${member.user.id})` : `${member.user.tag} (ID: ${member.user.id})`;
}