// Construction
const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const dotenv = require('dotenv');
dotenv.config();

// Discord Initialization
client.login(process.env.BOUNCER_TOKEN);

// Global Variables
const prefix = '$';
const authUser = [];
const dataPath = 'data.json';
let data = {
	vcID: '',
	roleID: '',
	entryAudio: '',
	kickAudio: '',
};
let botConnection = undefined;
let originalUserLimit = undefined;

// Client ready
client.once('ready', () => {
	if(fs.existsSync(dataPath)) {
		data = JSON.parse(fs.readFileSync(dataPath));
	} else {
		fs.writeFileSync(dataPath, JSON.stringify(data));
	}

	console.log('Ready!');
});

// Message sent
client.on('message', message => {
	// Filter messages
	if(!message.content.startsWith(prefix) || message.author.bot) return;

	// Commands
	if(authUser.includes(message.author.id)) {
		if(message.content == '$join') {
			if(message.member.voice.channel == undefined) {
				console.log('Member is not in a voice channel');
				message.channel.send('Member is not in a voice channel');
			} else {
				message.member.voice.channel.join()
					.then(connection => {
						message.guild.me.voice.setMute(true);
						message.guild.me.voice.setDeaf(true);
						message.guild.me.voice.setSelfMute(true);
						message.guild.me.voice.setSelfDeaf(true);

						botConnection = connection;
						originalUserLimit = message.member.voice.channel.userLimit;
						message.member.voice.channel.setUserLimit(2);

						console.log('Voice channel joined');
						message.channel.send('Voice channel joined');
					}).catch(err => {
						console.error('Voice channel connection failed');
						console.error(err);
						message.channel.send('Voice channel connection failed');
					});
			}
		} else if(message.content == '$leave') {
			if(message.guild.me.voice.channel == undefined) {
				console.log('Not in a voice channel');
				message.channel.send('Not in a voice channel');
			} else {
				message.guild.me.voice.channel.leave();
				botConnection = undefined;
				message.member.voice.channel.setUserLimit(originalUserLimit);
				originalUserLimit = undefined;

				console.log('Voice channel left');
				message.channel.send('Voice channel left');
			}
		} else if(message.content == '$channel') {
			console.log(data.vcID);
			message.channel.send(data.vcID ? data.vcID : 'undefined');
		} else if(message.content == '$role') {
			console.log(data.roleID);
			message.channel.send(data.roleID ? data.roleID : 'undefined');
		} else if(message.content == '$entryAudio') {
			console.log(data.entryAudio);
			message.channel.send(data.entryAudio ? `<${data.entryAudio}>` : 'undefined');
		} else if(message.content == '$kickAudio') {
			console.log(data.kickAudio);
			message.channel.send(data.kickAudio ? `<${data.kickAudio}>` : 'undefined');
		} else if(message.content.startsWith('$setChannel ')) {
			const args = message.content.split(' ');
			if(args.length == 2 && !isNaN(args[1]) && args[1].length == 18) {
				const channel = message.guild.channels.cache.find(guildChannel => guildChannel.id == args[1]);
				if(channel && channel.type == 'voice') {
					data.vcID = channel.id;
					fs.writeFileSync(dataPath, JSON.stringify(data));

					console.log(`${formatName(channel)} set`);
					message.channel.send(`${formatName(channel)} set`);
				} else {
					console.error('Voice channel not found');
					message.channel.send('Voice channel not found');
				}
			} else {
				console.error('Incorrect voice channel ID');
				message.channel.send('Incorrect voice channel ID');
			}
		} else if(message.content.startsWith('$setRole ')) {
			const args = message.content.split(' ');
			if(args.length == 2 && !isNaN(args[1]) && args[1].length == 18) {
				Promise.resolve(message.guild.roles.fetch(args[1]))
					.then(role => {
						if(!role) {
							console.error('Role not found');
							message.channel.send('Role not found');
							return;
						}

						data.roleID = role.id;
						fs.writeFileSync(dataPath, JSON.stringify(data));

						console.log(`${formatName(role)} set`);
						message.channel.send(`${formatName(role)} set`);
					}).catch(err => {
						console.error('Role promise failed');
						console.error(err);
						message.channel.send('Role promise failed');
					});
			} else {
				console.error('Incorrect role ID');
				message.channel.send('Incorrect role ID');
			}
		} else if(message.content.startsWith('$setEntryAudio ')) {
			const args = message.content.split(' ');
			if(args.length == 2 && ytdl.validateURL(args[1])) {
				data.entryAudio = args[1];
				fs.writeFileSync(dataPath, JSON.stringify(data));

				console.log(`Audio set to ${data.entryAudio}`);
				message.channel.send(`Audio set to <${data.entryAudio}>`);
			} else {
				console.log('Incorrect YT URL');
				message.channel.send('Incorrect YT URL');
			}
		} else if(message.content.startsWith('$setKickAudio ')) {
			const args = message.content.split(' ');
			if(args.length == 2 && ytdl.validateURL(args[1])) {
				data.kickAudio = args[1];
				fs.writeFileSync(dataPath, JSON.stringify(data));

				console.log(`Audio set to ${data.kickAudio}`);
				message.channel.send(`Audio set to <${data.kickAudio}>`);
			} else {
				console.log('Incorrect YT URL');
				message.channel.send('Incorrect YT URL');
			}
		}
	}
});

client.on('voiceStateUpdate', (oldState, newState) => {
	if(newState.member.user.bot) return;
	if(newState.channelID && newState.channelID == newState.guild.me.voice.channelID) {
		if(newState.member.roles.cache.find(role => role.id == data.roleID)) {
			const channel = newState.guild.channels.cache.find(guildChannel => guildChannel.id == data.vcID);
			if(channel && channel.type == 'voice') {
				if(ytdl.validateURL(data.entryAudio)) {
					newState.guild.me.voice.setMute(false);
					newState.guild.me.voice.setSelfMute(false);
					const dispatcher = botConnection.play(ytdl(data.entryAudio), { volume: 0.1 });
					dispatcher.on('finish', () => {
						newState.guild.me.voice.setMute(true);
						newState.guild.me.voice.setSelfMute(true);
						newState.member.voice.setChannel(channel);
						console.log('Played audio clip');
						console.log(`Moved ${formatName(newState.member)} to ${formatName(channel)}`);
					});
				} else {
					console.log(`${data.entryAudio} not found`);
					newState.guild.me.voice.setMute(true);
					newState.guild.me.voice.setSelfMute(true);
					newState.member.voice.setChannel(channel);
					console.log('Played audio clip');
					console.log(`Moved ${formatName(newState.member)} to ${formatName(channel)}`);
				}
			} else {
				console.error('Channel not found');
			}
		} else if(ytdl.validateURL(data.kickAudio)) {
			newState.guild.me.voice.setMute(false);
			newState.guild.me.voice.setSelfMute(false);
			const dispatcher = botConnection.play(ytdl(data.kickAudio), { volume: 0.1 });
			dispatcher.on('finish', () => {
				newState.guild.me.voice.setMute(true);
				newState.guild.me.voice.setSelfMute(true);
				newState.member.voice.kick();
				console.log(`Kicked ${formatName(newState.member)} from ${newState.channel}`);
			});
		} else {
			console.log(`${data.kickAudio} not found`);
			newState.guild.me.voice.setMute(true);
			newState.guild.me.voice.setSelfMute(true);
			newState.member.voice.kick();
			console.log(`Kicked ${formatName(newState.member)} from ${newState.channel}`);
		}
	}
});

function formatName(target) { // Formats the name of a member or a role
	if(target.constructor.name == 'GuildMember') { // Format guild member name
		return target.nickname ? `${target.nickname} (Tag: ${target.user.tag}, ID: ${target.user.id})` : `${target.user.tag} (ID: ${target.user.id})`;
	} else if (target.constructor.name == 'Role') { // Format role name
		return `${target.name} (ID: ${target.id})`;
	} else if (target.constructor.name == 'GuildChannel') { // Format channel name
		return `${target} (Type: ${target.type}, ID: ${target.id})`;
	} else if (target.constructor.name == 'VoiceChannel') { // Format channel name
		return `${target} (ID: ${target.id})`;
	} else { // No valid format found for target
		console.log(`${target.constructor.name} is not accepted`);
		return `${target} (not known)`;
	}
}