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

client.login(process.env.AMBASSADOR_TOKEN);

// Global Variables
const ambassadorsPath = 'data/ambassadors.json';
const prefix = '\\';
let serverOwner;
let ambassadors = {
    roles: [],
    members: []
};

// Command line replies
const replies = {
    successes: { // Ambassador added or removed
        addedAmbassador: target => {return `${target} has been successfully added.`},
        removedAmbassador: target => {return `${target} has been successfully removed.`},
        removedNonexistentAmbassador: (type, target) => {return `${type.charAt(0).toUpperCase()+type.slice(1, type.length-1)} with ID ${target} has been successfully removed (nonexistent).`}
    },
    errors: { // Incorrect format, permissions, or command
        format: add => {return `Wrong format. Type '\\help ` + (add ? 'add' : 'remove') + `Ambassadors' for more info.`},
        invalidID: type => {return `Invalid ID for ${type}.`},
        alreadyExistent: target => {return `${target} is already an ambassador.`},
        nonexistent: target => {return `${target} does not exist.`},
        noTargets: type => {return `No ${type.slice(0, type.length-1)} with that identifier.`},
        multipleTargets: type => {return `Multiple ${type} with that identifier. Try using an ID.`},
        isBot: `Bots cannot be ambassadors.`,
        isOwner: `Owners must be ambassadors.`,
        failedGuildMembersFetch: `Guild members fetch failed. Try again in a moment.`,
        failedGuildRolesFetch: `Guild roles fetch failed. Try again in a moment.`,
        invalidPermissions: `You don't have permission to run this command.`,
        removingOwnPermissions: `You cannot remove your own permissions.`
    }
}

// Load JSON file
if(fs.existsSync(ambassadorsPath)) {
    ambassadors = JSON.parse(fs.readFileSync(ambassadorsPath));
} else {
    fs.writeFileSync(ambassadorsPath, JSON.stringify(ambassadors));
}

// Message sent
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

    // Break up command
    const args = message.content.slice(prefix.length).trim().split(' ');
    if(args.length == 0) return;

    // Search through commands
    if(args[0] == 'listAmbassadors') {
        listAmbassadors(message);
    } else if(args[0] == 'addAmbassadors') {
        processAmbassadorsChange(message, args, true);
    } else if(args[0] == 'removeAmbassadors') {
        processAmbassadorsChange(message, args, false);
    }
});

function listAmbassadors(message) { // Sends list of ambassadors (roles and members) sorted by member of server and alphabetically
    let formattedAmbassadors = {
        roles: [],
        members: []
    }

    Promise.resolve(message.guild.roles.fetch())
        .then(guildRoleManager => {
            formattedAmbassadors.roles = formatAmbassadors('roles', guildRoleManager.cache) // Construct role ambassadors array using guild roles

            Promise.resolve(message.guild.members.fetch())
                .then(guildMemberManager => {
                    formattedAmbassadors.members = formatAmbassadors('members', guildMemberManager); // Construct member ambassadors array using guild members

                    // Use role and member ambassador arrays to construct and send message
                    message.channel.send('```\nAMBASSADORS\nRoles:\n'
                        + (formattedAmbassadors.roles.length == 0 ? 'None' : formattedAmbassadors.roles.join('\n'))
                        + '\n\nMembers:\n'
                        + (formattedAmbassadors.members.length == 0 ? 'None' : formattedAmbassadors.members.join('\n'))
                        + '```'
                    );
                }).catch(err => {
                    message.channel.send(replies.errors.failedGuildMembersFetch);
                    console.error(replies.errors.failedGuildMembersFetch);
                    console.error(err);
                });
        }).catch(err => {
            message.channel.send(replies.errors.failedGuildRolesFetch);
            console.error(replies.errors.failedGuildRolesFetch);
            console.error(err);
        });
}

function formatAmbassadors(type, guildData) { // Returns list of ambassadors formatted for a given type using guildData
    let known = [];
    let unknown = [];

    // Sorts through ambassador IDs for specified type
    ambassadors[type].forEach(id => {
        if([...guildData.keys()].includes(id)) { // Ambassador found
            known.push(formatName(guildData.get(id.toString())));
        } else { // Ambassador not found
            unknown.push(formatName(id, type));
        }
    });

    return known.sort().concat(unknown.sort());
}

function processAmbassadorsChange(message, args, add) {
    // Check for correct formatting
    if(args.length < 3 || !['members', 'roles'].includes(args[1])) {
        message.channel.send(replies.errors.format(add));
        console.error(replies.errors.format(add));
        return;
    }

    if(checkAmbassador(message.member)) { // Check for permissions
        let command = { // Parse command
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            add: add,
            type: args[1],
            isName: args.length >= 4 && ['--name', '-n'].includes(args[2]),
            identifier: args.length >= 4 && ['--name', '-n'].includes(args[2]) ? args.slice(3, args.length).join(' ') : args.slice(2, args.length).join(' '),
            target: []
        }

        // Parse different kinds of command formats
        if(command.isName) { // If name as identifier, parse possible quotes around identifier and make identifier array
            command.identifier = command.identifier.length >= 3 && command.identifier.slice(0, 1) == '"' && command.identifier.slice(command.identifier.length-1, command.identifier.length) == '"' ?
                [command.identifier, command.identifier.slice(1, command.identifier.length-1)] : [command.identifier];
        } else { // If numeric ID, check if ID is valid
            command = unwrapID(command);
            if(!command.identifier) {
                command.channel.send(replies.errors.invalidID(command.type));
                console.error(replies.errors.invalidID(command.type));
                return;
            }
        }
        
        // Find targets depending on member or role command
        if(command.type == 'members') {
            Promise.resolve(command.guild.members.fetch())
                .then(memberList => {
                    if(command.isName) { // Find members with username, nickname, or tag that match identifiers (with or without quotations)
                        command.target = memberList.filter(member => [member.user.username, member.nickname, member.user.tag].some(nameID => command.identifier.includes(nameID)));
                    } else { // Find members with matching numeric ID
                        command.target = memberList.filter(member => member.id == command.identifier);
                    }

                    alterAmbassadors(command);
                }).catch(err => {
                    command.channel.send(replies.errors.failedGuildMembersFetch);
                    console.error(replies.errors.failedGuildMembersFetch);
                    console.error(err);
                    return;
            });
        } else {
            Promise.resolve(command.guild.roles.fetch())
                .then(roleList => {
                    if(command.isName) { // Find roles with matching identifiers (with or without quotations)
                        command.target = roleList.cache.filter(role => command.identifier.includes(role.name));
                    } else { // Find roles with matching numeric ID
                        command.target = roleList.cache.filter(role => role.id == command.identifier);
                    }

                    alterAmbassadors(command);
                }).catch(err => {
                    command.channel.send(replies.errors.failedGuildRolesFetch);
                    console.error(replies.errors.failedGuildRolesFetch);
                    console.error(err);
                    return;
                });
            }
    } else {
        message.channel.send(replies.errors.invalidPermissions);
        console.error(replies.errors.invalidPermissions);
        return;
    }
}

function alterAmbassadors(command) { // Verify and use targets to edit ambassadors
    // Handle number of targets found
    if(command.target.size == 0) { // No targets found
        // If ambassador listed but not in guild, allow removal
        let location = command.isName ? -1 : ambassadors[command.type].findIndex(id => id == command.identifier);
        if(location != -1 && !command.add) {
            // Remove ambassador
            ambassadors[command.type].splice(location, location+1);
            fs.writeFileSync(ambassadorsPath, JSON.stringify(ambassadors));

            command.channel.send(replies.successes.removedNonexistentAmbassador(command.type, command.identifier));
            console.log(replies.successes.removedNonexistentAmbassador(command.type, command.identifier));
            return;
        } else {
            command.channel.send(replies.errors.noTargets(command.type));
            console.error(replies.errors.noTargets(command.type));
            return;
        }
    } else if(command.target.size >= 2) { // Multiple targets found
        command.channel.send(replies.errors.multipleTargets(command.type));
        console.error(replies.errors.multipleTargets(command.type));
        return;
    } else { // One target found
        command.target = command.target.values().next().value; // Remove array wrapper
    }

    // Check if ambassador is a bot
    if(command.type == 'members' && command.target.user.bot) {
        command.channel.send(replies.errors.isBot);
        console.error(replies.errors.isBot);
        return;
    }

    // Handle editing of ambassadors
    if(command.add) { // Add
        if(ambassadors[command.type].includes(command.target.id)) {
            command.channel.send(replies.errors.alreadyExistent(formatName(command.target)));
            console.error(replies.errors.alreadyExistent(formatName(command.target)));
            return;
        } else { // Adding allowed
            // Add ambassador and store change
            ambassadors[command.type].push(command.target.id);
            ambassadors[command.type].sort();
            fs.writeFileSync(ambassadorsPath, JSON.stringify(ambassadors));

            command.channel.send(replies.successes.addedAmbassador(formatName(command.target)));
            console.log(replies.successes.addedAmbassador(formatName(command.target)));
            return;
        }
    } else { // Remove
        // Check if ambassador present in respective array
        let location = ambassadors[command.type].findIndex(id => id == command.target.id);
        if(location == -1) {
            command.channel.send(replies.errors.nonexistent(formatName(command.target)));
            console.error(replies.errors.nonexistent(formatName(command.target)));
            return;
        } else {
            if(command.type == 'members' && command.target.id == command.target.guild.ownerID) { // Check if trying to remove owner
                command.channel.send(replies.errors.isOwner);
                console.error(replies.errors.isOwner);
                return;
            } else {
                // Test if ambassador requesting change still has permissions after change
                ambassadors[command.type].splice(location, location+1); // Change ambassadors
                if(checkAmbassador(command.member)) {
                    // Store change
                    fs.writeFileSync(ambassadorsPath, JSON.stringify(ambassadors));

                    command.channel.send(replies.successes.removedAmbassador(formatName(command.target)));
                    console.log(replies.successes.removedAmbassador(formatName(command.target)));
                    return;
                } else {
                    // Reverse change
                    ambassadors[command.type].push(command.target.id);
                    ambassadors[command.type].sort();

                    command.channel.send(replies.errors.removingOwnPermissions);
                    console.error(replies.errors.removingOwnPermissions);
                    return;
                }
            }
        }
    }
}

function checkAmbassador(member) { // Check if given membber is ambassador
    return ambassadors.members.includes(member.user.id) || member.roles.cache.some(obj => {
        return ambassadors.roles.includes(obj.id);
    });
}

function unwrapID(command) { // Unwrap numeric ID of given command
    const idTypes = {members: '!',
                     roles: '&'};
    
    // Check for quotations
    if(command.identifier.length >= 20 && command.identifier.slice(0, 1) == '"' && command.identifier.slice(command.identifier.length-1, command.identifier.length) == '"') {
        command.identifier = command.identifier.slice(1, command.identifier.length-1);
    }
    
    // Find numeric ID
    if(Object.keys(idTypes).includes(command.type) && command.identifier.length == 22 && command.identifier.substring(0, 3) == '<@' + idTypes[command.type] && command.identifier.substring(21, 22) == '>' && !isNaN(command.identifier.substring(3, 21))) { // Numeric ID wrapped with type-specific wrapper
        command.identifier = command.identifier.substring(3, 21);
    } else if (!(command.identifier.length == 18 && !isNaN(command.identifier))){ // Numeric ID not already unwrapped (no numeric ID found)
        command.identifier = undefined;
    }

    return command;
}

function formatName(target, type=undefined) { // Formats the name of a member or a role
    if(target.constructor.name == 'GuildMember') { // Format guild member name
        return target.nickname ? `${target.nickname} (Tag: ${target.user.tag}, ID: ${target.user.id})` : `${target.user.tag} (ID: ${target.user.id})`
    } else if (target.constructor.name == 'Role') { // Format role name
        return `${target.name} (ID: ${target.id})`;
    } else { // No valid format found for target
        return `${target} (not known)`;
    }
}