/**
 * System commands
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * These are system commands - commands required for Pokemon Showdown
 * to run. A lot of these are sent by the client.
 *
 * System commands should not be modified, added, or removed. If you'd
 * like to modify or add commands, add or edit files in chat-plugins/
 *
 * For the API, see chat-plugins/COMMANDS.md
 *
 * @license MIT license
 */

var crypto = require('crypto');
var fs = require('fs');
var parseEmoticons = require('./chat-plugins/emoticons').parseEmoticons;

const MAX_REASON_LENGTH = 300;
const MUTE_LENGTH = 7 * 60 * 1000;
const HOURMUTE_LENGTH = 60 * 60 * 1000;

var commands = exports.commands = {

	version: function (target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox("Server version: <b>" + CommandParser.package.version + "</b>");
	},

	auth: 'authority',
	stafflist: 'authority',
	globalauth: 'authority',
	authlist: 'authority',
	authority: function (target, room, user, connection) {
		var rankLists = {};
		var ranks = Object.keys(Config.groups);
		for (var u in Users.usergroups) {
			var rank = Users.usergroups[u].charAt(0);
			if (rank === ' ') continue;
			// In case the usergroups.csv file is not proper, we check for the server ranks.
			if (ranks.indexOf(rank) >= 0) {
				var name = Users.usergroups[u].substr(1);
				if (!rankLists[rank]) rankLists[rank] = [];
				if (name) rankLists[rank].push(name);
			}
		}

		var buffer = [];
		Object.keys(rankLists).sort(function (a, b) {
			return (Config.groups[b] || {rank: 0}).rank - (Config.groups[a] || {rank: 0}).rank;
		}).forEach(function (r) {
			var usersRanked = rankLists[r].sortBy(toId);
			var nickList = [];
			var auxUser;
			for (var i = 0; i < usersRanked.length; i++) {
				auxUser = Users.getExact(usersRanked[i]);
				if (auxUser && auxUser.connected) nickList.push('**' + usersRanked[i].trim() + '**');
				else nickList.push( usersRanked[i].trim());
			}
			buffer.push((Config.groups[r] ? Config.groups[r].name + "s (" + r + ")" : r) + ":\n" + nickList.join(", "));
		});

		if (!buffer.length) buffer = "This server has no global authority.";
		connection.popup(buffer.join("\n\n"));
	},

	me: function (target, room, user, connection) {
		// By default, /me allows a blank message
		if (target) target = this.canTalk(target);
		if (!target) return;

		return '/me ' + target;
	},

	mee: function (target, room, user, connection) {
		// By default, /mee allows a blank message
		if (target) target = this.canTalk(target);
		if (!target) return;

		return '/mee ' + target;
	},

	avatar: function (target, room, user) {
		if (!target) return this.parse('/avatars');
		var parts = target.split(',');
		var avatar = parseInt(parts[0]);
		if (parts[0] === '#bw2elesa') {
			avatar = parts[0];
		}
		if (typeof avatar === 'number' && (!avatar || avatar > 294 || avatar < 1)) {
			if (!parts[1]) {
				this.sendReply("Invalid avatar.");
			}
			return false;
		}

		user.avatar = avatar;
		if (!parts[1]) {
			this.sendReply("Tu avatar a cambiado a:\n" +
				'|raw|<img src="//play.pokemonshowdown.com/sprites/trainers/' + (typeof avatar === 'string' ? avatar.substr(1) : avatar) + '.png" alt="" width="80" height="80" />');
		}
	},
	avatarhelp: ["/avatar [avatar number 1 to 293] - Change your trainer sprite."],

	signout: 'logout',
	logout: function (target, room, user) {
		user.resetName();
	},

	requesthelp: 'report',
	report: function (target, room, user) {
		if (room.id === 'help') {
			this.sendReply("Ask one of the Moderators (@) in the Help room.");
		} else {
			this.parse('/join help');
		}
	},

	r: 'reply',
	reply: function (target, room, user) {
		if (!target) return this.parse('/help reply');
		if (!user.lastPM) {
			return this.sendReply("No one has PMed you yet.");
		}
		return this.parse('/msg ' + (user.lastPM || '') + ', ' + target);
	},
	replyhelp: ["/reply OR /r [message] - Send a private message to the last person you received a message from, or sent a message to."],

	mp: 'msg'
	pm: 'msg',
	whisper: 'msg',
	w: 'msg',
	msg: function (target, room, user, connection) {
		if (!target) return this.parse('/help msg');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!target) {
			this.sendReply("Te falto una coma(,)");
			return this.parse('/help msg');
		}
		this.pmTarget = (targetUser || this.targetUsername);
		if (!targetUser || !targetUser.connected) {
			if (targetUser && !targetUser.connected) {
				this.errorReply("El usuario " + this.targetUsername + " esta desconectado.");
				return;
			} else {
				this.errorReply("El usuario "  + this.targetUsername + " no esta disponible. ¿Escribistes bien su nombre?");
				return this.parse('/help msg');
			}
			return;
		}

		if (Config.pmmodchat) {
			var userGroup = user.group;
			if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(Config.pmmodchat)) {
				var groupName = Config.groups[Config.pmmodchat].name || Config.pmmodchat;
				this.errorReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to PM users.");
				return false;
			}
		}

		if (user.locked && !targetUser.can('lock')) {
			return this.errorReply("You can only private message members of the moderation team (users marked by %, @, &, or ~) when locked.");
		}
		if (targetUser.locked && !user.can('lock')) {
			return this.errorReply("Este usuario esta lockeado y no puede recibir mensajes.");
		}
		if (targetUser.ignorePMs && targetUser.ignorePMs !== user.group && !user.can('lock')) {
			if (!targetUser.can('lock')) {
				return this.errorReply("Este usuario está bloqueando mensajes privados ahora.");
			} else if (targetUser.can('bypassall')) {
				return this.errorReply("Este admin no esta dispoblie ahora mismo para responder mensajes privados.Por favor contacta a un miembro diferente del staff");
			}
		}
		if (user.ignorePMs && user.ignorePMs !== targetUser.group && !targetUser.can('lock')) {
			return this.errorReply("No puedes enviar MPs ya que los tienes bloqueado");
		}

		target = this.canTalk(target, null, targetUser);
		if (!target) return false;

		if (target.charAt(0) === '/' && target.charAt(1) !== '/') {
			// PM command
			var innerCmdIndex = target.indexOf(' ');
			var innerCmd = (innerCmdIndex >= 0 ? target.slice(1, innerCmdIndex) : target.slice(1));
			var innerTarget = (innerCmdIndex >= 0 ? target.slice(innerCmdIndex + 1) : '');
			switch (innerCmd) {
			case 'me':
			case 'mee':
			case 'announce':
				break;
			case 'invite':
			case 'inv':
				var targetRoom = Rooms.search(innerTarget);
				if (!targetRoom || targetRoom === Rooms.global) return this.errorReply('The room "' + innerTarget + '" does not exist.');
				if (targetRoom.staffRoom && !targetUser.isStaff) return this.errorReply('User "' + this.targetUsername + '" requires global auth to join room "' + targetRoom.id + '".');
				if (targetRoom.isPrivate === true && targetRoom.modjoin && targetRoom.auth) {
					if (Config.groupsranking.indexOf(targetRoom.auth[targetUser.userid] || ' ') < Config.groupsranking.indexOf(targetRoom.modjoin) && !targetUser.can('bypassall')) {
						return this.errorReply('The room "' + innerTarget + '" does not exist.');
					}
				}

				target = '/invite ' + targetRoom.id;
				break;
			default:
				return this.errorReply("El comando '/" + innerCmd + "' no fue reconocido. Para enviar un mensaje que empiece por '/" + innerCmd + "', escriba  '//" + innerCmd + "'.");
			}
		}

		var message = '|pm|' + user.getIdentity() + '|' + targetUser.getIdentity() + '|' + target;
		user.send(message);
		if (targetUser !== user) targetUser.send(message);
		targetUser.lastPM = user.userid;
		user.lastPM = targetUser.userid;
	},
	msghelp: ["/mp o /msg [username],[mensaje] - envia un mensaje privado."],

	blockpm: 'ignorepms',
	blockpms: 'ignorepms',
	ignorepm: 'ignorepms',
	ignorepms: function (target, room, user) {
		if (user.ignorePMs === (target || true)) return this.sendReply("You are already blocking private messages!");
		if (user.locked && !user.can('bypassall')) return this.sendReply("You are not allowed to block private messages.");
		user.ignorePMs = true;
		if (target in Config.groups) {
			user.ignorePMs = target;
			return this.sendReply("You are now blocking private messages, except from staff and " + target + ".");
		}
		return this.sendReply("You are now blocking private messages, except from staff.");
	},
	ignorepmshelp: ["/blockpms - Blocks private messages. Unblock them with /unignorepms."],

	unblockpm: 'unignorepms',
	unblockpms: 'unignorepms',
	unignorepm: 'unignorepms',
	unignorepms: function (target, room, user) {
		if (!user.ignorePMs) return this.sendReply("Usted no está bloqueando mensajes privados! Para bloquearlos use:/blockpms");
		user.ignorePMs = false;
		return this.sendReply("You are no longer blocking private messages.");
	},
	unignorepmshelp: ["/unblockpms - Unblocks private messages. Block them with /blockpms."],

	idle: 'away',
	afk: 'away',
	away: function (target, room, user) {
		this.parse('/blockchallenges');
		this.parse('/blockpms ' + target);
	},
	awayhelp: ["/away - Blocks challenges and private messages. Unblock them with /back."],

	unaway: 'back',
	unafk: 'back',
	back: function () {
		this.parse('/unblockpms');
		this.parse('/unblockchallenges');
	},
	backhelp: ["/back - Unblocks challenges and/or private messages, if either are blocked."],

	crearsala:'makechatroom',
	makeprivatechatroom: 'makechatroom',
	makechatroom: function (target, room, user, connection, cmd) {
		if (!this.can('makeroom')) return;

		// `,` is a delimiter used by a lot of /commands
		// `|` and `[` are delimiters used by the protocol
		// `-` has special meaning in roomids
		if (target.includes(',') || target.includes('|') || target.includes('[') || target.includes('-')) {
			return this.sendReply("Room titles can't contain any of: ,|[-");
		}

		var id = toId(target);
		if (!id) return this.parse('/help makechatroom');
		// Check if the name already exists as a room or alias
		if (Rooms.search(id)) return this.sendReply("La sala '" + target + "' ya existe.");
		if (Rooms.global.addChatRoom(target)) {
			if (cmd === 'makeprivatechatroom') {
				var targetRoom = Rooms.search(target);
				targetRoom.isPrivate = true;
				targetRoom.chatRoomData.isPrivate = true;
				Rooms.global.writeChatRoomData();
				return this.sendReply("La sala de chat privada '" + target + "'ha sido creada exitosamente.");
			} else {
				return this.sendReply("La sala de chat '" + target + "' ha sido creada exitosamente.");
			}
		}
		return this.sendReply("An error occurred while trying to create the room '" + target + "'.");
	},
	makechatroomhelp: ["/makechatroom o /crearsala [nombre] - Crea una nueva sala denominada [nombre].Requiere: ~"],

	borrarsala: 'deregisterchatroom',
	deregisterchatroom: function (target, room, user) {
		if (!this.can('makeroom')) return;
		var id = toId(target);
		if (!id) return this.parse('/help deregisterchatroom');
		var targetRoom = Rooms.search(id);
		if (!targetRoom) return this.sendReply("La sala de chat '" + target + "' no existe.");
		target = targetRoom.title || targetRoom.id;
		if (Rooms.global.deregisterChatRoom(id)) {
			this.sendReply("La sala de chat '" + target + "'ha sido borrada exitosamente.");
			this.sendReply("Los cambios se haran efectivos apartir del proximo reinicio del servidor.");
			return;
		}
		return this.sendReply("La sala de chat '" + target + "' no esta registrada.");
	},
	deregisterchatroomhelp: ["/deregisterchatroom o /borrarsala [nombre] - Elimina una sala de chat [nombre] y los cambios se haran efectivos despues del reinicio del servidor. Requiere: ~"],

	hideroom: 'privateroom',
	hiddenroom: 'privateroom',
	secretroom: 'privateroom',
	privateroom: function (target, room, user, connection, cmd) {
		var setting;
		switch (cmd) {
		case 'privateroom':
		case 'secretroom':
			if (!this.can('makeroom')) return;
			setting = true;
			break;
		default:
			if (!this.can('privateroom', null, room)) return;
			if (room.isPrivate === true && target !== 'force') {
				return this.sendReply("This room is a secret room. Use /privateroom to toggle, or /hiddenroom force to force hidden.");
			}
			setting = 'hidden';
			break;
		}

		if (target === 'off') {
			delete room.isPrivate;
			this.addModCommand("" + user.name + " ha echo esta sala publica.");
			if (room.chatRoomData) {
				delete room.chatRoomData.isPrivate;
				Rooms.global.writeChatRoomData();
			}
		} else {
			room.isPrivate = setting;
			this.addModCommand("" + user.name + " a hecho esta sala " + (setting === true ? 'secreta' : setting) + ".");
			if (room.chatRoomData) {
				room.chatRoomData.isPrivate = setting;
				Rooms.global.writeChatRoomData();
			}
		}
	},
	privateroomhelp: ["/privateroom [on/off] - Makes or unmakes a room private. Requires: ~",
		"/hiddenroom [on/off] - Makes or unmakes a room hidden. Hidden rooms will maintain global ranks of users. Requires: \u2605 ~"],

	modjoin: function (target, room, user) {
		if (!this.can('privateroom', null, room)) return;
		if (target === 'off' || target === 'false') {
			delete room.modjoin;
			this.addModCommand("" + user.name + " ha desactivado el modjoin.");
			if (room.chatRoomData) {
				delete room.chatRoomData.modjoin;
				Rooms.global.writeChatRoomData();
			}
		} else {
			if ((target === 'on' || target === 'true' || !target) || !user.can('privateroom')) {
				room.modjoin = true;
				this.addModCommand("" + user.name + " ha activado el modjoin.");
			} else if (target in Config.groups) {
				room.modjoin = target;
				this.addModCommand("" + user.name + " ha configurado el modjoin a " + target + ".");
			} else {
				this.sendReply("Configuracion de modjoin no reconocida.");
				return false;
			}
			if (room.chatRoomData) {
				room.chatRoomData.modjoin = room.modjoin;
				Rooms.global.writeChatRoomData();
			}
			if (!room.modchat) this.parse('/modchat ' + Config.groupsranking[1]);
			if (!room.isPrivate) this.parse('/hiddenroom');
		}
	},

	hacersalaoficial: 'officialroom',
	officialchatroom: 'officialroom',
	officialroom: function (target, room, user) {
		if (!this.can('makeroom')) return;
		if (!room.chatRoomData) {
			return this.sendReply("/officialroom - This room can't be made official");
		}
		if (target === 'off') {
			delete room.isOfficial;
			this.addModCommand("" + user.name + " a echo esta sala no oficial");
			delete room.chatRoomData.isOfficial;
			Rooms.global.writeChatRoomData();
		} else {
			room.isOfficial = true;
			this.addModCommand("" + user.name + " a echo esta sala oficial.");
			room.chatRoomData.isOfficial = true;
			Rooms.global.writeChatRoomData();
		}
	},
	
	roomdescripcion: 'roomdesc',
	roomdesc: function (target, room, user) {
		if (!target) {
			if (!this.canBroadcast()) return;
			var re = /(https?:\/\/(([-\w\.]+)+(:\d+)?(\/([\w/_\.]*(\?\S+)?)?)?))/g;
			if (!room.desc) return this.sendReply("Esta sala no tiene descipción.");
			this.sendReplyBox("La descipción de la sala es: " + room.desc.replace(re, '<a href="$1">$1</a>'));
			return;
		}
		if (!this.can('declare')) return false;
		if (target.length > 80) return this.sendReply("Error: La descipción es demasiado larga (debe ser un máximo de 80 caracteres).");
		var normalizedTarget = ' ' + target.toLowerCase().replace('[^a-zA-Z0-9]+', ' ').trim() + ' ';

		if (normalizedTarget.includes(' welcome ')) {
			return this.sendReply("Error: La descripción de la sala no debe contener la palabra 'welcome'.");
		}
		if (normalizedTarget.slice(0, 9) === ' discuss ') {
			return this.sendReply("Error: La descripción de la sala no debe comenzar con la palabra 'discuss'.");
		}
		if (normalizedTarget.slice(0, 12) === ' talk about ' || normalizedTarget.slice(0, 17) === ' talk here about ') {
			return this.sendReply("Error: La descripción de la sala no debe comenzar con la palabra 'talk about'.");
		}

		room.desc = target;
		this.sendReply("(La nueva descripción de la sala es: " + target + ")");

		this.privateModCommand("(" + user.name + " a cambiado la descipción de la sala a: \"" + target + "\".)");

		if (room.chatRoomData) {
			room.chatRoomData.desc = room.desc;
			Rooms.global.writeChatRoomData();
		}
	},

	topic: 'roomintro',
	roomintro: function (target, room, user) {
		if (!target) {
			if (!this.canBroadcast()) return;
			if (!room.introMessage) return this.sendReply("Esta sala no tiene una roomintro establecida.");
			this.sendReply('|raw|<div class="infobox infobox-limited">' + room.introMessage + '</div>');
			if (!this.broadcasting && user.can('declare', null, room)) {
				this.sendReply('Source:');
				this.sendReplyBox('<code>/roomintro ' + Tools.escapeHTML(room.introMessage) + '</code>');
			}
			return;
		}
		target = target.trim();
		if (!this.can('declare', null, room)) return false;
		if (!this.canHTML(target)) return;
		if (!/</.test(target)) {
			// not HTML, do some simple URL linking
			var re = /(https?:\/\/(([-\w\.]+)+(:\d+)?(\/([\w/_\.]*(\?\S+)?)?)?))/g;
			target = target.replace(re, '<a href="$1">$1</a>');
		}
		if (target.substr(0, 11) === '/roomintro ') target = target.substr(11);

		room.introMessage = target;
		this.sendReply("(La introduccion de la Sala a sido cambiada a:)");
		this.sendReply('|raw|<div class="infobox infobox-limited">' + target + '</div>');

		this.privateModCommand("(" + user.name + " ha cambiado la introducción.)");

		if (room.chatRoomData) {
			room.chatRoomData.introMessage = room.introMessage;
			Rooms.global.writeChatRoomData();
		}
	},

	roomalias: function (target, room, user) {
		if (!room.chatRoomData) return this.sendReply("Esta sala no esta diseñada para tener un Alias");
		if (!target) {
			if (!this.canBroadcast()) return;
			if (!room.chatRoomData.aliases || !room.chatRoomData.aliases.length) return this.sendReplyBox("Esta habitación no tiene ningún alias.");
			return this.sendReplyBox("Esta sala cuenta con los siguientes alias: " + room.chatRoomData.aliases.join(", ") + "");
		}
		if (!this.can('setalias')) return false;
		var alias = toId(target);
		if (!alias.length) return this.sendReply("Sólo caracteres alfanuméricos son válidos en un alias.");
		if (Rooms.get(alias) || Rooms.aliases[alias]) return this.sendReply("You cannot set an alias to an existing room or alias.");

		Rooms.aliases[alias] = room;
		this.privateModCommand("(" + user.name + " added the room alias '" + target + "'.)");

		if (!room.aliases) room.aliases = room.chatRoomData.aliases || [];
		room.aliases.push(alias);
		if (room.chatRoomData) {
			room.chatRoomData.aliases = room.aliases;
			Rooms.global.writeChatRoomData();
		}
	},

	removeroomalias: function (target, room, user) {
		if (!room.chatRoomData) return this.sendReply("Esta sala no esta diseñada para tener un Alias");
		if (!room.chatRoomData.aliases) return this.sendReply("Esta sala no tiene un alias establecido");
		if (!this.can('setalias')) return false;
		var alias = toId(target);
		if (!alias.length || !Rooms.aliases[alias]) return this.sendReply("Por favor, especifique un alias existente.");
		if (toId(Rooms.aliases[alias]) !== room.id) return this.sendReply("Sólo puede eliminar un alias de la sala actual.");

		this.privateModCommand("(" + user.name + " ha eliminado el alias '" + target + "'.)");

		var aliases = room.aliases || room.chatRoomData.aliases;
		var aliasIndex = aliases.indexOf(alias);
		if (aliasIndex >= 0) {
			aliases.splice(aliasIndex, 1);
			delete Rooms.aliases[alias];
			Rooms.global.writeChatRoomData();
		}
	},

	jefedesala: 'roomowner', 
	roomowner: function (target, room, user) {
		if (!room.chatRoomData) {
			return this.sendReply("/roomowner - Esta habitación no está diseñado para la moderación por la habitación que se añadirán");
		}
		if (!target) return this.parse('/help roomowner');
		target = this.splitTarget(target, true);
		var targetUser = this.targetUser;

		if (!targetUser) return this.sendReply("El usuario '" + this.targetUsername + "' no esta conectado.");

		if (!this.can('makeroom', targetUser, room)) return false;

		if (!room.auth) room.auth = room.chatRoomData.auth = {};

		var name = targetUser.name;

		room.auth[targetUser.userid] = '#';
		this.addModCommand("" + name + " a sido promovido a Jefe de Sala por " + user.name + ".");
		room.onUpdateIdentity(targetUser);
		Rooms.global.writeChatRoomData();
	},
	roomownerhelp: ["/roomowner [username] - Nombra [nombre de usuario] como propietario de una habitación. Elimina estatus oficial. Requiere: ~"],

	quitarjefedesala: 'deroomowner',
	roomdeowner: 'deroomowner',
	deroomowner: function (target, room, user) {
		if (!room.auth) {
			return this.sendReply("/roomdeowner - This room isn't designed for per-room moderation");
		}
		if (!target) return this.parse('/help roomdeowner');
		target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var name = this.targetUsername;
		var userid = toId(name);
		if (!userid || userid === '') return this.sendReply("El usuario '" + name + "' no existe.");

		if (room.auth[userid] !== '#') return this.sendReply("El usuario '" + name + "'no es Jefe de Sala.");
		if (!this.can('makeroom', null, room)) return false;

		delete room.auth[userid];
		this.sendReply("(" + name + " ya no es Jefe de Sala.)");
		if (targetUser) targetUser.updateIdentity();
		if (room.chatRoomData) {
			Rooms.global.writeChatRoomData();
		}
	},
	deroomownerhelp: ["/roomdeowner [username] - Elimina a [User] del rango Jefe de Sala. Requiere: ~"],

	roomdemote: 'roompromote',
	roompromote: function (target, room, user, connection, cmd) {
		if (!room.auth) {
			this.sendReply("/roompromote - Esta Salano está diseñada para la moderación por habitación");
			return this.sendReply("Antes de poder darle a alguien Roomod(@) Tienes que ser Jefe de Sala");
		}
		if (!target) return this.parse('/help roompromote');

		target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var userid = toId(this.targetUsername);
		var name = targetUser ? targetUser.name : this.targetUsername;

		if (!userid) return this.parse('/help roompromote');
		if (!room.auth || !room.auth[userid]) {
			if (!targetUser) {
				return this.sendReply(" El usuario '" + name + "' está desconectado y así no puede ser promovido.");
			}
			if (!targetUser.registered) {
				return this.sendReply("El usuario '" + name + "' no esta registrado y asi no puede ser promovido.");
			}
		}

		var currentGroup = ((room.auth && room.auth[userid]) || (room.isPrivate !== true && targetUser.group) || ' ');
		var nextGroup = target;
		if (target === 'deauth') nextGroup = Config.groupsranking[0];
		if (!nextGroup) {
			return this.sendReply("Por favor especifique un grupo como /roomvoice /roomdriver");
		}
		if (!Config.groups[nextGroup]) {
			return this.sendReply("Grupo '" + nextGroup + "' no existe.");
		}

		if (Config.groups[nextGroup].globalonly) {
			return this.sendReply("Grupo " + Config.groups[nextGroup].id + "' no esta registrado como un rango de sala");
		}

		var groupName = Config.groups[nextGroup].name || "regular user";
		if ((room.auth[userid] || Config.groupsranking[0]) === nextGroup) {
			return this.sendReply("El usuario'" + name + "' ya es " + groupName + " en esta sala");
		}
		if (currentGroup !== ' ' && !user.can('room' + (Config.groups[currentGroup] ? Config.groups[currentGroup].id : 'voice'), null, room)) {
			return this.sendReply("/" + cmd + " - Acceso denegado para promover / degradar desde " + (Config.groups[currentGroup] ? Config.groups[currentGroup].name : "an undefined group") + ".");
		}
		if (nextGroup !== ' ' && !user.can('room' + Config.groups[nextGroup].id, null, room)) {
			return this.sendReply("/" + cmd + " - Acceso denegado para promover / degradar a " + Config.groups[nextGroup].name + ".");
		}

		if (nextGroup === ' ') {
			delete room.auth[userid];
		} else {
			room.auth[userid] = nextGroup;
		}

		if (Config.groups[nextGroup].rank < Config.groups[currentGroup].rank) {
			this.privateModCommand("(" + name + " Fue degradado a" + groupName + " por " + user.name + ".)");
			if (targetUser && Rooms.rooms[room.id].users[targetUser.userid]) targetUser.popup("Usted fue degradado a  " + groupName + " por " + user.name + ".");
		} else if (nextGroup === '#') {
			this.addModCommand("" + name + " Fue promovido a " + groupName + " por " + user.name + ".");
		} else {
			this.addModCommand("" + name + " Fue promovido a " + groupName + " por " + user.name + ".");
		}

		if (targetUser) targetUser.updateIdentity(room.id);
		if (room.chatRoomData) Rooms.global.writeChatRoomData();
	},
	roompromotehelp: ["/roompromote OR /roomdemote [username], [group symbol] - Promotes/demotes the user to the specified room rank. Requires: @ # & ~",
		"/room[group] [username] - Promotes/demotes the user to the specified room rank. Requires: @ # & ~",
		"/roomdeauth [username] - Removes all room rank from the user. Requires: @ # & ~"],

	roomstaff: 'roomauth',
	roomauth: function (target, room, user, connection) {
		var targetRoom = room;
		if (target) targetRoom = Rooms.search(target);
		if (!targetRoom || (targetRoom !== room && targetRoom.modjoin && !user.can('bypassall'))) return this.sendReply("The room '" + target + "' does not exist.");
		if (!targetRoom.auth) return this.sendReply("/roomauth - The room '" + (targetRoom.title ? targetRoom.title : target) + "' isn't designed for per-room moderation and therefore has no auth list.");

		var rankLists = {};
		for (var u in targetRoom.auth) {
			if (!rankLists[targetRoom.auth[u]]) rankLists[targetRoom.auth[u]] = [];
			rankLists[targetRoom.auth[u]].push(u);
		}

		var buffer = [];
		Object.keys(rankLists).sort(function (a, b) {
			return (Config.groups[b] || {rank:0}).rank - (Config.groups[a] || {rank:0}).rank;
		}).forEach(function (r) {
			buffer.push((Config.groups[r] ? Config.groups[r] .name + "s (" + r + ")" : r) + ":\n" + rankLists[r].sort().join(", "));
		});

		if (!buffer.length) {
			connection.popup("La sala '" + targetRoom.title + "' No tiene un staff establecido.");
			return;
		}
		if (targetRoom !== room) buffer.unshift("" + targetRoom.title + " room auth:");
		connection.popup(buffer.join("\n\n"));
	},

	userauth: function (target, room, user, connection) {
		var targetId = toId(target) || user.userid;
		var targetUser = Users.getExact(targetId);
		var targetUsername = (targetUser ? targetUser.name : target);

		var buffer = [];
		var innerBuffer = [];
		var group = Users.usergroups[targetId];
		if (group) {
			buffer.push('Global auth: ' + group.charAt(0));
		}
		for (var i = 0; i < Rooms.global.chatRooms.length; i++) {
			var curRoom = Rooms.global.chatRooms[i];
			if (!curRoom.auth || curRoom.isPrivate) continue;
			group = curRoom.auth[targetId];
			if (!group) continue;
			innerBuffer.push(group + curRoom.id);
		}
		if (innerBuffer.length) {
			buffer.push('Room auth: ' + innerBuffer.join(', '));
		}
		if (targetId === user.userid || user.can('makeroom')) {
			innerBuffer = [];
			for (var i = 0; i < Rooms.global.chatRooms.length; i++) {
				var curRoom = Rooms.global.chatRooms[i];
				if (!curRoom.auth || !curRoom.isPrivate) continue;
				var auth = curRoom.auth[targetId];
				if (!auth) continue;
				innerBuffer.push(auth + curRoom.id);
			}
			if (innerBuffer.length) {
				buffer.push('Private room auth: ' + innerBuffer.join(', '));
			}
		}
		if (!buffer.length) {
			buffer.push("No global or room auth.");
		}

		buffer.unshift("" + targetUsername + " user auth:");
		connection.popup(buffer.join("\n\n"));
	},

	rb: 'roomban',
	roomban: function (target, room, user, connection) {
		if (!target) return this.parse('/help roomban');
		if (room.isMuted(user) && !user.can('bypassall')) return this.sendReply("No se puede hacer esto mientras que no puede hablar.");

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		var name = this.targetUsername;
		var userid = toId(name);

		if (!userid || !targetUser) return this.sendReply("E usuario '" + name + "' no existe.");
		if (!this.can('ban', targetUser, room)) return false;
		if (!room.bannedUsers || !room.bannedIps) {
			return this.sendReply("El roomban no están destinado a ser utilizado en la Sala " + room.id + ".");
		}
		if (room.bannedUsers[userid] && room.bannedIps[targetUser.latestIp]) return this.sendReply("User " + targetUser.name + " is already banned from room " + room.id + ".");
		if (targetUser in room.users) {
			targetUser.popup(
				"|html|<p>" + Tools.escapeHTML(user.name) + "a sido baneado de la sala" + room.id + ".</p>" + (target ? "<p>Rason: " + Tools.escapeHTML(target) + "</p>"  : "") +
				"<p>Para apelar a que seas desbaneado puedes mandarle un mensaje a un Staff" + (room.auth ? " o a un Jefe de Sala. </p><p><button name=\"send\" value=\"/roomauth " + room.id + "\">Lista del Staff de la Sala</button></p>" : ".</p>")
			);
		}
		this.addModCommand("" + targetUser.name + " was banned from room " + room.id + " by " + user.name + "." + (target ? " (" + target + ")" : ""));
		var acAccount = (targetUser.autoconfirmed !== targetUser.userid && targetUser.autoconfirmed);
		var alts = room.roomBan(targetUser);
		if (alts.length) {
			this.privateModCommand("(" + targetUser.name + "'s " + (acAccount ? " ac account: " + acAccount + ", " : "") + "roombanned alts: " + alts.join(", ") + ")");
			for (var i = 0; i < alts.length; ++i) {
				this.add('|unlink|' + toId(alts[i]));
			}
		} else if (acAccount) {
			this.privateModCommand("(" + targetUser.name + "'s ac account: " + acAccount + ")");
		}
		this.add('|unlink|' + this.getLastIdOf(targetUser));
	},
	roombanhelp: ["/roomban [username] - Bans the user from the room you are in. Requires: @ # & ~"],

	unroomban: 'roomunban',
	roomunban: function (target, room, user, connection) {
		if (!target) return this.parse('/help roomunban');
		if (!room.bannedUsers || !room.bannedIps) {
			return this.sendReply("El roomban no están destinado a ser utilizado en la sala " + room.id + ".");
		}
		if (room.isMuted(user) && !user.can('bypassall')) return this.sendReply("No se puede hacer esto mientras sea incapaz de hablar.");

		this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var userid = room.isRoomBanned(targetUser) || toId(target);

		if (!userid) return this.sendReply("El nombre de usuario: '" + target + "' es invalido.");
		if (targetUser && !this.can('ban', targetUser, room)) return false;
		var unbannedUserid = room.unRoomBan(userid);
		if (!unbannedUserid) return this.sendReply("El usuario " + userid + "no estaba baneado de la sala " + room.id + ".");

		this.addModCommand("" + unbannedUserid + " ha sido desbaneado de la sala  " + room.id + " por " + user.name + ".");
	},
	roomunbanhelp: ["/roomunban [username] - Banea a un usuario de tu sala. Requiere: @ # & ~"],

	autojoin: function (target, room, user, connection) {
		Rooms.global.autojoinRooms(user, connection);
		var targets = target.split(',');
		var autojoins = [];
		if (targets.length > 9 || Object.keys(connection.rooms).length > 1) return;
		for (var i = 0; i < targets.length; i++) {
			if (user.tryJoinRoom(targets[i], connection) === null) {
				autojoins.push(targets[i]);
			}
		}
		connection.autojoins = autojoins.join(',');
	},

	joim: 'join',
	j: 'join',
	join: function (target, room, user, connection) {
		if (!target) return false;
		if (user.tryJoinRoom(target, connection) === null) {
			connection.sendTo(target, "|noinit|namerequired|La sala '" + target + "' no existe o no tiene permiso para entrar a ella");
		}
	},

	leave: 'part',
	part: function (target, room, user, connection) {
		if (room.id === 'global') return false;
		var targetRoom = Rooms.search(target);
		if (target && !targetRoom) {
			return this.sendReply("La sala '" + target + "' no existe.");
		}
		user.leaveRoom(targetRoom || room, connection);
	},

	/*********************************************************
	 * Moderating: Punishments
	 *********************************************************/
	
	advertir: 'warn',
	w:'warn',
	kick: 'warn',
	k: 'warn',
	warn: function (target, room, user) {
		if (!target) return this.parse('/help warn');
		if (room.isMuted(user) && !user.can('bypassall')) return this.sendReply("No puedes hacer esto mientras no puedas hablar.");

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) return this.sendReply("El usuario '" + this.targetUsername + "' no existe.");
		if (!(targetUser in room.users)) {
			return this.sendReply("El usuario " + this.targetUsername + " no esta en la sala " + room.id + ".");
		}
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("La razón es demasiado larga. No puede exceder los" + MAX_REASON_LENGTH + " caracteres.");
		}
		if (!this.can('warn', targetUser, room)) return false;

		this.addModCommand("" + targetUser.name + " a sido advertido por " + user.name + "." + (target ? " (" + target + ")" : ""));
		targetUser.send('|c|~|/warn ' + target);
		this.add('|unlink|' + this.getLastIdOf(targetUser));
	},
	warnhelp: ["/warn OR /w [username], [reason] - Warns a user showing them the Pok\u00e9mon Showdown Rules and [reason] in an overlay. Requires: % @ # & ~"],

	redireccionar: 'redir',
	redirect: 'redir',
	redir: function (target, room, user, connection) {
		if (!target) return this.parse('/help redirect');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		var targetRoom = Rooms.search(target);
		if (!targetRoom) {
			return this.sendReply("La sala '" + target + "' no existe.");
		}
		if (!this.can('warn', targetUser, room) || !this.can('warn', targetUser, targetRoom)) return false;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply("El usuario " + this.targetUsername + " no esta disponible.");
		}
		if (targetRoom.id === "global") return this.sendReply("El usuario no puede ser redirigido a una sala Global.");
		if (Rooms.rooms[targetRoom.id].users[targetUser.userid]) {
			return this.sendReply("El usuario " + targetUser.name + " Ya esta en la sala " + targetRoom.title + "!");
		}
		if (!Rooms.rooms[room.id].users[targetUser.userid]) {
			return this.sendReply("El usuario " + this.targetUsername + " no esta presente en la sala " + room.id + ".");
		}
		if (targetUser.joinRoom(targetRoom.id) === false) return this.sendReply("El usuario " + targetUser.name + "no pudo unirse a la sala " + targetRoom.title + ". porque esta baneado de ella.");
		var roomName = (targetRoom.isPrivate) ? "a una habitacion privada" : "room " + targetRoom.title;
		this.addModCommand("" + targetUser.name + " a sido redirigido a la sala " + roomName + " por " + user.name + ".");
		targetUser.leaveRoom(room);
	},
	redirhelp: ["/redirecionar O /redir [username], [roomname] - Redirecciona a un usuario de una sala a otra. Requires: % @ & ~"],

	silenciar: 'mute',
	m: 'mute',
	mute: function (target, room, user, connection, cmd) {
		if (!target) return this.parse('/help mute');
		if (room.isMuted(user) && !user.can('bypassall')) return this.sendReply("No puedes hacer esto mientras no puedas hablar.");

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) return this.sendReply("El usuario '" + this.targetUsername + "' no existe.");
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("La razón es demasiado larga. No puede exceder los " + MAX_REASON_LENGTH + " caracteres.");
		}

		var muteDuration = ((cmd === 'hm' || cmd === 'hourmute') ? HOURMUTE_LENGTH : MUTE_LENGTH);
		if (!this.can('mute', targetUser, room)) return false;
		var canBeMutedFurther = ((room.getMuteTime(targetUser) || 0) <= (muteDuration * 5 / 6));
		if ((room.isMuted(targetUser) && !canBeMutedFurther) || targetUser.locked || !targetUser.connected) {
			var problem = " pero ya era " + (!targetUser.connected ? "offline" : targetUser.locked ? "locked" : "muted");
			if (!target) {
				return this.privateModCommand("(" + targetUser.name + " Fue silenciado por " + user.name + problem + ".)");
			}
			return this.addModCommand("" + targetUser.name + " Fue silenciado por " + user.name + problem + "." + (target ? " (" + target + ")" : ""));
		}

		if (targetUser in room.users) targetUser.popup("|modal|" + user.name + " Has sido silenciado en la sala " + room.id + " por " + muteDuration.duration() + ". " + target);
		this.addModCommand("" + targetUser.name + " ha sido silenciado " + user.name + " por " + muteDuration.duration() + "." + (target ? " (" + target + ")" : ""));
		if (targetUser.autoconfirmed && targetUser.autoconfirmed !== targetUser.userid) this.privateModCommand("(" + targetUser.name + "'s ac account: " + targetUser.autoconfirmed + ")");
		this.add('|unlink|' + this.getLastIdOf(targetUser));

		room.mute(targetUser, muteDuration, false);
	},
	mutehelp: ["/mute OR /m [username], [reason] - Mutes a user with reason for 7 minutes. Requires: % @ # & ~"],

	hm: 'hourmute',
	hourmute: function (target) {
		if (!target) return this.parse('/help hourmute');
		this.run('mute');
	},
	hourmutehelp: ["/hourmute OR /hm [username], [reason] - Mutes a user with reason for an hour. Requires: % @ # & ~"],

	um: 'unmute',
	unmute: function (target, room, user) {
		if (!target) return this.parse('/help unmute');
		target = this.splitTarget(target);
		if (room.isMuted(user) && !user.can('bypassall')) return this.sendReply("no puedes hacer esto mientras no puedas hablar.");
		if (!this.can('mute', null, room)) return false;

		var targetUser = this.targetUser;
		var successfullyUnmuted = room.unmute(targetUser ? targetUser.userid : this.targetUsername);

		if (successfullyUnmuted) {
			this.addModCommand("" + (targetUser ? targetUser.name : successfullyUnmuted) + " a sido reincorporado al chat por " + user.name + ".");
		} else {
			this.sendReply("" + (targetUser ? targetUser.name : this.targetUsername) + "no eta silenciado.");
		}
	},
	unmutehelp: ["/unmute [username] - Removes mute from user. Requires: % @ # & ~"],

	bloquear: 'lock',
	forcelock: 'lock',
	l: 'lock',
	ipmute: 'lock',
	lock: function (target, room, user, connection, cmd) {
		if (!target) return this.parse('/help lock');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) return this.sendReply("El usuario '" + this.targetUsername + "' no existe.");
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("La razón es demasiado larga. No puede exceder los " + MAX_REASON_LENGTH + " caracteres.");
		}
		if (!this.can('lock', targetUser)) return false;

		if ((targetUser.locked || Users.checkBanned(targetUser.latestIp)) && !target) {
			var problem = " ya era " + (targetUser.locked ? "locked" : "banned");
			return this.privateModCommand("(" + targetUser.name + "ha sido blequeado por" + user.name + problem + ".)");
		}

		if (targetUser.confirmed) {
			if (cmd === 'forcelock') {
				var from = targetUser.deconfirm();
				ResourceMonitor.log("[CrisisMonitor] " + targetUser.name + " a sido loqueado por " + user.name + " y ha sido demoteado en las siguientes salas " + from.join(", ") + ".");
			} else {
				return this.sendReply("" + targetUser.name + " es un usuario confirmado. Si esta seguro de que lo quiere Bloquear use /forcelock.");
			}
		} else if (cmd === 'forcelock') {
			return this.sendReply("Usa /lock; " + targetUser.name + " no es un usuario confirmado.");
		}

		targetUser.popup("|modal|" + user.name + "has sido bloqueado de las salas de chat,salas de batallas y pms (menos con staff) y te ha quitado el privilegio de hablar" + (target ? "\n\nReason: " + target : "") + "\n\nSi usted siente que su bloqueo fue injusto, todavía puede hablan con miembros del personal  por PM (%, @, &, y ~) para discutirlo" + (Config.appealurl ? " O puedes apelar a que tu desbloqueo sea en:\n" + Config.appealurl : ".") + "\n\n10 o 5 dias.");

		this.addModCommand("" + targetUser.name + " has sido bloqueado por" + user.name + "." + (target ? " (" + target + ")" : ""));
		var alts = targetUser.getAlts();
		var acAccount = (targetUser.autoconfirmed !== targetUser.userid && targetUser.autoconfirmed);
		if (alts.length) {
			this.privateModCommand("(" + targetUser.name + "'s " + (acAccount ? " ac account: " + acAccount + ", " : "") + "locked alts: " + alts.join(", ") + ")");
		} else if (acAccount) {
			this.privateModCommand("(" + targetUser.name + "'s ac account: " + acAccount + ")");
		}
		var userid = this.getLastIdOf(targetUser);
		this.add('|unlink|hide|' + userid);
		if (userid !== toId(this.inputUsername)) this.add('|unlink|hide|' + toId(this.inputUsername));

		this.globalModlog("LOCK", targetUser, " by " + user.name + (target ? ": " + target : ""));
		targetUser.lock(false, userid);
		return true;
	},
	lockhelp: ["/lock OR /l [username], [reason] - Bloquea a un usuario de las salas de batalla, MPs y su derecho de hablar . Requires: % @ & ~"],

	desbloquear: 'unlock',
	unlock: function (target, room, user) {
		if (!target) return this.parse('/help unlock');
		if (!this.can('lock')) return false;

		var targetUser = Users.get(target);
		var reason = '';
		if (targetUser && targetUser.locked && targetUser.locked.charAt(0) === '#') {
			reason = ' (' + targetUser.locked + ')';
		}

		var unlocked = Users.unlock(target);

		if (unlocked) {
			var names = Object.keys(unlocked);
			this.addModCommand(names.join(", ") + " " + ((names.length > 1) ? "were" : "was") +
				"Has sido desploqueado por " + user.name + "." + reason);
			if (!reason) this.globalModlog("has sido desbloqueado", target, " por " + user.name);
			if (targetUser) targetUser.popup("" + user.name + "te desbloqueo.");
		} else {
			this.sendReply("El usuario '" + target + "' no estaba bloqueado.");
		}
	},
	unlockhelp: ["/debloquear [username] - Desbloquea a un usuario. Requires: % @ & ~"],

	banear: 'ban',
	forceban: 'ban',
	b: 'ban',
	ban: function (target, room, user, connection, cmd) {
		if (!target) return this.parse('/help ban');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) return this.sendReply("El usuario '" + this.targetUsername + "' no existe.");
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("La razón es demasiado larga. No puede exceder los " + MAX_REASON_LENGTH + " caracteres.");
		}
		if (!this.can('ban', targetUser)) return false;

		if (Users.checkBanned(targetUser.latestIp) && !target && !targetUser.connected) {
			var problem = " ya ha sido baneado";
			return this.privateModCommand("(" + targetUser.name + " ha sido baneado por " + user.name + problem + ".)");
		}

		if (targetUser.confirmed) {
			if (cmd === 'forceban') {
				var from = targetUser.deconfirm();
				ResourceMonitor.log("[CrisisMonitor] " + targetUser.name + " ha sido baneado por " + user.name + " y ha sido demoteado en las siguientes salas " + from.join(", ") + ".");
			} else {
				return this.sendReply("" + targetUser.name + " es un usuario confirmado. Si esta seguro de que lo quiere Bannear use /forceban.");
			}
		} else if (cmd === 'forceban') {
			return this.sendReply("Usa /ban; " + targetUser.name + " no es un usuario confirmado.");
		}

		targetUser.popup("|modal|" + user.name + " te ha banneado." + (target ? "\n\nRason: " + target : "") + (Config.appealurl ? "\n\nSi usted siente que su ban fue injusto, puedes apelar a que tu desbaneo sea en:\n" + Config.appealurl : "") + "\n\nalgunos dias.");

		this.addModCommand("" + targetUser.name + " fue baneado por " + user.name + "." + (target ? " (" + target + ")" : ""), " (" + targetUser.latestIp + ")");
		var alts = targetUser.getAlts();
		var acAccount = (targetUser.autoconfirmed !== targetUser.userid && targetUser.autoconfirmed);
		if (alts.length) {
			var guests = 0;
			alts = alts.filter(function (alt) {
				if (alt.substr(0, 6) !== 'Guest ') return true;
				guests++;
				return false;
			});
			this.privateModCommand("(" + targetUser.name + "'s " + (acAccount ? " ac account: " + acAccount + ", " : "") + "alts banneadas: " + alts.join(", ") + (guests ? " [" + guests + " guests]" : "") + ")");
			for (var i = 0; i < alts.length; ++i) {
				this.add('|unlink|' + toId(alts[i]));
			}
		} else if (acAccount) {
			this.privateModCommand("(" + targetUser.name + "'s ac account: " + acAccount + ")");
		}

		var userid = this.getLastIdOf(targetUser);
		this.add('|unlink|hide|' + userid);
		if (userid !== toId(this.inputUsername)) this.add('|unlink|hide|' + toId(this.inputUsername));
		targetUser.ban(false, userid);
		this.globalModlog("BAN", targetUser, " por " + user.name + (target ? ": " + target : ""));
		return true;
	},
	banhelp: ["/banear o /ban [usuario], [razon] - Banea al user de todas las salas y banea su dirección IP. Requiere: @ & ~"],

	desbanear: 'unban',
	unban: function (target, room, user) {
		if (!target) return this.parse('/help unban');
		if (!this.can('ban')) return false;

		var name = Users.unban(target);

		if (name) {
			this.addModCommand("" + name + " fue desbaneado por " + user.name + ".");
			this.globalModlog("UNBAN", name, " por " + user.name);
		} else {
			this.sendReply("El usuario '" + target + "' no esta baneado.");
		}
	},
	unbanhelp: ["/desbanear o /unban [usuario] - Desbanea a un usuario. Requiere: @ & ~"],

	desbaneartodos: 'unbanall',
	unbanall: function (target, room, user) {
		if (!this.can('rangeban')) return false;
		// we have to do this the hard way since it's no longer a global
		var punishKeys = ['bannedIps', 'bannedUsers', 'lockedIps', 'lockedUsers', 'lockedRanges', 'rangeLockedUsers'];
		for (var i = 0; i < punishKeys.length; i++) {
			var dict = Users[punishKeys[i]];
			for (var entry in dict) delete dict[entry];
		}
		this.addModCommand("Todos los bans y locks fueron removidos por " + user.name + ".");
	},
	unbanallhelp: ["/unbanall - Desbanea todas las IP. Requiere: & ~"],

	banip: function (target, room, user) {
		target = target.trim();
		if (!target) {
			return this.parse('/help banip');
		}
		if (!this.can('rangeban')) return false;
		if (Users.bannedIps[target] === '#ipban') return this.sendReply("La IP " + (target.charAt(target.length - 1) === '*' ? "range " : "") + target + " ya esta temporalmente baneada.");

		Users.bannedIps[target] = '#ipban';
		this.addModCommand("" + user.name + " baneo temporalmente " + (target.charAt(target.length - 1) === '*' ? "IP range" : "IP") + ": " + target);
	},
	baniphelp: ["/banip [ip] - Banea la ip de un usuario. Requires: & ~"],

	unbanip: function (target, room, user) {
		target = target.trim();
		if (!target) {
			return this.parse('/help unbanip');
		}
		if (!this.can('rangeban')) return false;
		if (!Users.bannedIps[target]) {
			return this.sendReply("" + target + " no es un rango de IP o IP prohibido.");
		}
		delete Users.bannedIps[target];
		this.addModCommand("" + user.name + " ha desbaneado " + (target.charAt(target.length - 1) === '*' ? "La ip" : "IP") + ": " + target);
	},
	unbaniphelp: ["/unbanip [ip] - Kick users on this IP or IP range from all rooms and bans it. Accepts wildcards to ban ranges. Requires: & ~"],

	rangelock: function (target, room, user) {
		if (!target) return this.sendReply("Please specify a range to lock.");
		if (!this.can('rangeban')) return false;

		var isIp = (target.slice(-1) === '*' ? true : false);
		var range = (isIp ? target : Users.shortenHost(target));
		if (Users.lockedRanges[range]) return this.sendReply("The range " + range + " has already been temporarily locked.");

		Users.lockRange(range, isIp);
		this.addModCommand("" + user.name + " temporarily locked the range: " + range);
	},

	unrangelock: 'rangeunlock',
	rangeunlock: function (target, room, user) {
		if (!target) return this.sendReply("Please specify a range to unlock.");
		if (!this.can('rangeban')) return false;

		var range = (target.slice(-1) === '*' ? target : Users.shortenHost(target));
		if (!Users.lockedRanges[range]) return this.sendReply("The range " + range + " is not locked.");

		Users.unlockRange(range);
		this.addModCommand("" + user.name + " unlocked the range " + range + ".");
	},

	/*********************************************************
	 * Moderating: Other
	 *********************************************************/

	nota:'modnote',
	mn: 'modnote',
	modnote: function (target, room, user, connection) {
		if (!target) return this.parse('/help modnote');
		if ((user.locked || room.isMuted(user)) && !user.can('bypassall')) return this.sendReply("No puedes hacer esto mientras no puedas hablar.");

		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("La nota es demasiado larga. No puede exceder Los " + MAX_REASON_LENGTH + " caracteres.");
		}
		if (!this.can('receiveauthmessages', null, room)) return false;
		return this.privateModCommand("(" + user.name + " ha añadido la nota: " + target + ")");
	},
	modnotehelp: ["/modnote [note] - Añade una nota al modlog. Requires: % @ # & ~"],

	globalpromote: 'promote',
	promote: function (target, room, user, connection, cmd) {
		if (!target) return this.parse('/help promote');

		target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var userid = toId(this.targetUsername);
		var name = targetUser ? targetUser.name : this.targetUsername;

		if (!userid) return this.parse('/help promote');

		var currentGroup = ((targetUser && targetUser.group) || Users.usergroups[userid] || ' ')[0];
		var nextGroup = target;
		if (target === 'deauth') nextGroup = Config.groupsranking[0];
		if (!nextGroup) {
			return this.sendReply("Por favor especificar un grupo valido como / globalvoice o / globaldeauth");
		}
		if (!Config.groups[nextGroup]) {
			return this.sendReply("El grupo '" + nextGroup + "' no existe.");
		}
		if (Config.groups[nextGroup].roomonly) {
			return this.sendReply("El grupo '" + nextGroup + "' no existe como un rango global.");
		}

		var groupName = Config.groups[nextGroup].name || "regular user";
		if (currentGroup === nextGroup) {
			return this.sendReply("El usuario '" + name + "' ya era " + groupName);
		}
		if (!user.canPromote(currentGroup, nextGroup)) {
			return this.sendReply("/" + cmd + " - Acceso denegado.");
		}

		if (!Users.setOfflineGroup(name, nextGroup)) {
			return this.sendReply("/promote - ADVERTENCIA: Este usuario no esta conectado y puede que no este registrado. Si lo quiere subir de rango utilice /forcepromote.");
		}
		if (Config.groups[nextGroup].rank < Config.groups[currentGroup].rank) {
			this.privateModCommand("(" + name + " ha sido degradado a  " + groupName + " por " + user.name + ".)");
			if (targetUser) targetUser.popup("Has sido degradado a  " + groupName + " por " + user.name + ".");
		} else {
			this.addModCommand("" + name + " ha sido promovido a " + groupName + " por " + user.name + ".");
		}

		if (targetUser) targetUser.updateIdentity();
	},
	promotehelp: ["/promote [username], [group] - Promueve a un usuario al grupo especificado Requiere: & ~"],

	globaldemote: 'demote',
	demote: function (target) {
		if (!target) return this.parse('/help demote');
		this.run('promote');
	},
	demotehelp: ["/demote [username], [group] - Degrada a un usuario al grupo especificado Requiere: & ~"],

	forcepromote: function (target, room, user) {
		// warning: never document this command in /help
		if (!this.can('forcepromote')) return false;
		target = this.splitTarget(target, true);
		var name = this.targetUsername;
		var nextGroup = target;
		if (!Config.groups[nextGroup]) return this.sendReply("Group '" + nextGroup + "' does not exist.");

		if (!Users.setOfflineGroup(name, nextGroup, true)) {
			return this.sendReply("/forcepromote - Fuerza a promover a un usuario.");
		}

		this.addModCommand("" + name + " ha sido promovido a  " + (Config.groups[nextGroup].name || "regular user") + " por " + user.name + ".");
	},

	devoice: 'deauth',
	deauth: function (target, room, user) {
		return this.parse('/demote ' + target + ', deauth');
	},

	deroomvoice: 'roomdeauth',
	roomdevoice: 'roomdeauth',
	deroomauth: 'roomdeauth',
	roomdeauth: function (target, room, user) {
		return this.parse('/roomdemote ' + target + ', deauth');
	},

	modchat: function (target, room, user) {
		if (!target) return this.sendReply("La charla moderada está configurado actualmente para: " + room.modchat);
		if ((user.locked || room.isMuted(user)) && !user.can('bypassall')) return this.sendReply("No se puede hacer esto mientras que no puede hablar.");
		if (!this.can('modchat', null, room)) return false;

		if (room.modchat && room.modchat.length <= 1 && Config.groupsranking.indexOf(room.modchat) > 1 && !user.can('modchatall', null, room)) {
			return this.sendReply("/modchat - Acceso denegado para eliminar un ajuste mayor que " + Config.groupsranking[1] + ".");
		}

		target = target.toLowerCase();
		var currentModchat = room.modchat;
		switch (target) {
		case 'off':
		case 'false':
		case 'no':
		case ' ':
			room.modchat = false;
			break;
		case 'ac':
		case 'autoconfirmed':
			room.modchat = 'autoconfirmed';
			break;
		case '*':
		case 'player':
			target = '\u2605';
			/* falls through */
		default:
			if (!Config.groups[target]) {
				return this.parse('/help modchat');
			}
			if (Config.groupsranking.indexOf(target) > 1 && !user.can('modchatall', null, room)) {
				return this.sendReply("/modchat - Acceso denegado para eliminar un ajuste mayor que " + Config.groupsranking[1] + ".");
			}
			room.modchat = target;
			break;
		}
		if (currentModchat === room.modchat) {
			return this.sendReply("La charla moderadaya esta establecida en " + currentModchat + ".");
		}
		if (!room.modchat) {
			this.add("|raw|<div class=\"broadcast-green\"><b>Charla moderada desactivada!</b><br />Todos pueden hablar</div>");
		} else {
			var modchat = Tools.escapeHTML(room.modchat);
			this.add("|raw|<div class=\"broadcast-red\"><b>La charla moderada esta configurada a " + modchat + "!</b><br />Solo los usuarios con el rango " + modchat + " o mayor, pueden hablark.</div>");
		}
		this.logModCommand(user.name + " ha configurado la charla moderada a " + room.modchat);

		if (room.chatRoomData) {
			room.chatRoomData.modchat = room.modchat;
			Rooms.global.writeChatRoomData();
		}
	},
	modchathelp: ["/modchat [off/autoconfirmed/+/%/@/#/&/~] - Ajuste el nivel de charla moderada. Requiere: @ para / autoconfirmed / + opciones fuera, # y ~ para todas las opciones"],

	declare: function (target, room, user) {
		if (!target) return this.parse('/help declare');
		if (!this.can('declare', null, room)) return false;

		if (!this.canTalk()) return;

		this.add('|raw|<div class="broadcast-blue"><b>' + Tools.escapeHTML(target) + '</b></div>');
		this.logModCommand(user.name + " declaro " + target);
	},
	declarehelp: ["/declare [message] - Declara un mensaje. Requiere: # & ~"],

	declare:'htmldeclare',
	htmldeclare: function (target, room, user) {
		if (!target) return this.parse('/help htmldeclare');
		if (!this.can('gdeclare', null, room)) return false;

		if (!this.canTalk()) return;

		this.add('|raw|<div class="broadcast-blue"><b>' + target + '</b></div>');
		this.logModCommand(user.name + " ha declarado " + target);
	},
	htmldeclarehelp: ["/htmldeclare [message] - Anonymously announces a message using safe HTML. Requires: ~"],

	
	gdeclare: 'globaldeclare',
	globaldeclare: function (target, room, user) {
		if (!target) return this.parse('/help globaldeclare');
		if (!this.can('gdeclare')) return false;

		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw('<div class="broadcast-blue"><b>' + target + '</b></div>');
		}
		this.logModCommand(user.name + " ha declarado globalmente " + target);
	},
	globaldeclarehelp: ["/globaldeclare [message] - Anonymously announces a message to every room on the server. Requires: ~"],

	cdeclare: 'chatdeclare',
	chatdeclare: function (target, room, user) {
		if (!target) return this.parse('/help chatdeclare');
		if (!this.can('gdeclare')) return false;

		for (var id in Rooms.rooms) {
			if (id !== 'global') if (Rooms.rooms[id].type !== 'battle') Rooms.rooms[id].addRaw('<div class="broadcast-blue"><b>' + target + '</b></div>');
		}
		this.logModCommand(user.name + "ha declarado globalmente " + target);
	},
	chatdeclarehelp: ["/cdeclare [message] - Anonymously announces a message to all chatrooms on the server. Requires: ~"],

	anuncio: 'announce',
	wall: 'announce',
	announce: function (target, room, user) {
		if (!target) return this.parse('/help announce');

		if (!this.can('announce', null, room)) return false;

		target = this.canTalk(target);
		if (!target) return;

		return '/announce ' + target;
	},
	announcehelp: ["/announce OR /wall [message] - has un anuncio. Requires: % @ # & ~"],

	cambiatunombre: 'forcerename'
	fr: 'forcerename',
	forcerename: function (target, room, user) {
		if (!target) return this.parse('/help forcerename');

		var reason = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		if (!targetUser) {
			this.splitTarget(target);
			if (this.targetUser) {
				return this.sendReply("Usuario ya ha cambiado su nombre por el de '" + this.targetUser.name + "'.");
			}
			return this.sendReply("El usuario '" + target + "'no esta conectado.");
		}
		if (!this.can('forcerename', targetUser)) return false;

		var entry = targetUser.name + " ha sido forzado a cambiar su nombre por " + user.name + (reason ? ": " + reason : "");
		this.privateModCommand("(" + entry + ")");
		Rooms.global.cancelSearch(targetUser);
		targetUser.resetName();
		targetUser.send("|nametaken||" + user.name + " ha considerado que tu nombre es inapropiado por:" + (reason ? ": " + reason : "."));
		return true;
	},
	forcerenamehelp: ["/forcerename OR /fr [username], [reason] - Forcibly change a user's name and shows them the [reason]. Requires: % @ & ~"],

	modlog: function (target, room, user, connection) {
		var lines = 0;
		// Specific case for modlog command. Room can be indicated with a comma, lines go after the comma.
		// Otherwise, the text is defaulted to text search in current room's modlog.
		var roomId = (room.id === 'staff' ? 'global' : room.id);
		var hideIps = !user.can('lock');
		var path = require('path');
		var isWin = process.platform === 'win32';
		var logPath = LOGS_DIR + 'modlog/';

		if (target.includes(',')) {
			var targets = target.split(',');
			target = targets[1].trim();
			roomId = toId(targets[0]) || room.id;
		}

		// Let's check the number of lines to retrieve or if it's a word instead
		if (!target.match('[^0-9]')) {
			lines = parseInt(target || 20, 10);
			if (lines > 100) lines = 100;
		}
		var wordSearch = (!lines || lines < 0);

		// Control if we really, really want to check all modlogs for a word.
		var roomNames = '';
		var filename = '';
		var command = '';
		if (roomId === 'all' && wordSearch) {
			if (!this.can('modlog')) return;
			roomNames = "all rooms";
			// Get a list of all the rooms
			var fileList = fs.readdirSync(LOGS_DIR + 'modlog/');
			for (var i = 0; i < fileList.length; ++i) {
				filename += path.normalize(logPath + fileList[i]) + ' ';
			}
		} else {
			if (!this.can('modlog', null, Rooms.get(roomId))) return;
			roomNames = "the room " + roomId;
			filename = path.normalize(logPath + 'modlog_' + roomId + '.txt');
		}

		// Seek for all input rooms for the lines or text
		if (isWin) {
			command = path.normalize(__dirname + '/lib/winmodlog') + ' tail ' + lines + ' ' + filename;
		} else {
			command = 'tail -' + lines + ' ' + filename;
		}
		var grepLimit = 100;
		if (wordSearch) { // searching for a word instead
			if (target.match(/^["'].+["']$/)) target = target.substring(1, target.length - 1);
			if (isWin) {
				command = path.normalize(__dirname + '/lib/winmodlog') + ' ws ' + grepLimit + ' "' + target.replace(/%/g, "%%").replace(/([\^"&<>\|])/g, "^$1") + '" ' + filename;
			} else {
				command = "awk '{print NR,$0}' " + filename + " | sort -nr | cut -d' ' -f2- | grep -m" + grepLimit + " -i '" + target.replace(/\\/g, '\\\\\\\\').replace(/["'`]/g, '\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g, '[$&]') + "'";
			}
		}

		// Execute the file search to see modlog
		require('child_process').exec(command, function (error, stdout, stderr) {
			if (error && stderr) {
				connection.popup("/modlog empty on " + roomNames + " or erred");
				console.log("/modlog error: " + error);
				return false;
			}
			if (stdout && hideIps) {
				stdout = stdout.replace(/\([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\)/g, '');
			}
			stdout = stdout.split('\n').map(function (line) {
				var bracketIndex = line.indexOf(']');
				var parenIndex = line.indexOf(')');
				if (bracketIndex < 0) return Tools.escapeHTML(line);
				var time = line.slice(1, bracketIndex);
				var timestamp = new Date(time).format('{yyyy}-{MM}-{dd} {hh}:{mm}{tt}');
				var parenIndex = line.indexOf(')');
				var roomid = line.slice(bracketIndex + 3, parenIndex);
				if (!hideIps && Config.modloglink) {
					var url = Config.modloglink(time, roomid);
					if (url) timestamp = '<a href="' + url + '">' + timestamp + '</a>';
				}
				return '<small>[' + timestamp + '] (' + roomid + ')</small>' + Tools.escapeHTML(line.slice(parenIndex + 1));
			}).join('<br />');
			if (lines) {
				if (!stdout) {
					connection.popup("The modlog is empty. (Weird.)");
				} else {
					connection.popup("|wide||html|<p>The last " + lines + " lines of the Moderator Log of " + roomNames + ":</p>" + stdout);
				}
			} else {
				if (!stdout) {
					connection.popup("No moderator actions containing '" + target + "' were found on " + roomNames + ".");
				} else {
					connection.popup("|wide||html|<p>The last " + grepLimit + " logged actions containing '" + target + "' on " + roomNames + ":</p>" + stdout);
				}
			}
		});
	},
	modloghelp: ["/modlog [roomid|all], [n] - Roomid defaults to current room.",
		"If n is a number or omitted, display the last n lines of the moderator log. Defaults to 15.",
		"If n is not a number, search the moderator log for 'n' on room's log [roomid]. If you set [all] as [roomid], searches for 'n' on all rooms's logs. Requires: % @ # & ~"],

	/*********************************************************
	 * Server management commands
	 *********************************************************/

	hotpatch: function (target, room, user) {
		if (!target) return this.parse('/help hotpatch');
		if (!this.can('hotpatch')) return false;

		this.logEntry(user.name + " used /hotpatch " + target);

		if (target === 'chat' || target === 'commands') {
			try {
				CommandParser.uncacheTree('./command-parser.js');
				delete require.cache[require.resolve('./commands.js')];
				delete require.cache[require.resolve('./chat-plugins/info.js')];
				global.CommandParser = require('./command-parser.js');

				var runningTournaments = Tournaments.tournaments;
				CommandParser.uncacheTree('./tournaments');
				global.Tournaments = require('./tournaments');
				Tournaments.tournaments = runningTournaments;

				return this.sendReply("Chat commands have been hot-patched.");
			} catch (e) {
				return this.sendReply("Something failed while trying to hotpatch chat: \n" + e.stack);
			}
		} else if (target === 'tournaments') {
			try {
				var runningTournaments = Tournaments.tournaments;
				CommandParser.uncacheTree('./tournaments');
				global.Tournaments = require('./tournaments');
				Tournaments.tournaments = runningTournaments;
				return this.sendReply("Tournaments have been hot-patched.");
			} catch (e) {
				return this.sendReply("Something failed while trying to hotpatch tournaments: \n" + e.stack);
			}
		} else if (target === 'battles') {
			Simulator.SimulatorProcess.respawn();
			return this.sendReply("Battles have been hotpatched. Any battles started after now will use the new code; however, in-progress battles will continue to use the old code.");
		} else if (target === 'formats') {
			try {
				var toolsLoaded = !!Tools.isLoaded;
				// uncache the tools.js dependency tree
				CommandParser.uncacheTree('./tools.js');
				// reload tools.js
				global.Tools = require('./tools.js')[toolsLoaded ? 'includeData' : 'includeFormats'](); // note: this will lock up the server for a few seconds
				// rebuild the formats list
				Rooms.global.formatListText = Rooms.global.getFormatListText();
				// respawn validator processes
				TeamValidator.ValidatorProcess.respawn();
				// respawn simulator processes
				Simulator.SimulatorProcess.respawn();
				// broadcast the new formats list to clients
				Rooms.global.send(Rooms.global.formatListText);

				return this.sendReply("Formats have been hotpatched.");
			} catch (e) {
				return this.sendReply("Something failed while trying to hotpatch formats: \n" + e.stack);
			}
		} else if (target === 'learnsets') {
			try {
				var toolsLoaded = !!Tools.isLoaded;
				// uncache the tools.js dependency tree
				CommandParser.uncacheTree('./tools.js');
				// reload tools.js
				global.Tools = require('./tools.js')[toolsLoaded ? 'includeData' : 'includeFormats'](); // note: this will lock up the server for a few seconds

				return this.sendReply("Learnsets have been hotpatched.");
			} catch (e) {
				return this.sendReply("Something failed while trying to hotpatch learnsets: \n" + e.stack);
			}
		}
		this.sendReply("Your hot-patch command was unrecognized.");
	},
	hotpatchhelp: ["Hot-patching the game engine allows you to update parts of Showdown without interrupting currently-running battles. Requires: ~",
		"Hot-patching has greater memory requirements than restarting.",
		"/hotpatch chat - reload commands.js and the chat-plugins",
		"/hotpatch battles - spawn new simulator processes",
		"/hotpatch formats - reload the tools.js tree, rebuild and rebroad the formats list, and also spawn new simulator processes"],

	savelearnsets: function (target, room, user) {
		if (!this.can('hotpatch')) return false;
		fs.writeFile('data/learnsets.js', 'exports.BattleLearnsets = ' + JSON.stringify(Tools.data.Learnsets) + ";\n");
		this.sendReply("learnsets.js saved.");
	},

	disableladder: function (target, room, user) {
		if (!this.can('disableladder')) return false;
		if (LoginServer.disabled) {
			return this.sendReply("/disableladder - Ladder is already disabled.");
		}
		LoginServer.disabled = true;
		this.logModCommand("The ladder was disabled by " + user.name + ".");
		this.add("|raw|<div class=\"broadcast-red\"><b>Due to high server load, the ladder has been temporarily disabled</b><br />Rated games will no longer update the ladder. It will be back momentarily.</div>");
	},

	enableladder: function (target, room, user) {
		if (!this.can('disableladder')) return false;
		if (!LoginServer.disabled) {
			return this.sendReply("/enable - Ladder is already enabled.");
		}
		LoginServer.disabled = false;
		this.logModCommand("The ladder was enabled by " + user.name + ".");
		this.add("|raw|<div class=\"broadcast-green\"><b>The ladder is now back.</b><br />Rated games will update the ladder now.</div>");
	},

	reiniciar:'lockdown'
	lockdown: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		Rooms.global.lockdown = true;
		for (var id in Rooms.rooms) {
			if (id === 'global') continue;
			var curRoom = Rooms.rooms[id];
			curRoom.addRaw("<div class=\"broadcast-red\"><b>El Servidor Dropp se reiniciara pronto.</b><br />Por favor terminen sus batallas lo mas pronto posible... Y no inicien mas batallas hasta que el Servidor se reestablezca</div>");
			if (curRoom.requestKickInactive && !curRoom.battle.ended) {
				curRoom.requestKickInactive(user, true);
				if (curRoom.modchat !== '+') {
					curRoom.modchat = '+';
					curRoom.addRaw("<div class=\"broadcast-red\"><b>La Charla moderada se establece en +!</b><br />Sólo los usuarios con rango + o superior pueden hablar.</div>");
				}
			}
		}

		this.logEntry(user.name + " used /lockdown");
	},
	lockdownhelp: ["/lockdown - locks down the server, which prevents new battles from starting so that the server can eventually be restarted. Requires: ~"],

	prelockdown: function (target, room, user) {
		if (!this.can('lockdown')) return false;
		Rooms.global.lockdown = 'pre';
		this.sendReply("Los Torneos se han deshabilitado en la preparación para el reinicio del servidor Dropp.");
		this.logEntry(user.name + " used /prelockdown");
	},

	slowlockdown: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		Rooms.global.lockdown = true;
		for (var id in Rooms.rooms) {
			if (id === 'global') continue;
			var curRoom = Rooms.rooms[id];
			if (curRoom.battle) continue;
			curRoom.addRaw("<div class=\"broadcast-red\"><b>El Servidor Dropp se reiniciara pronto.</b><br />Por favor terminen sus batallas lo mas pronto posible... Y no inicien mas batallas hasta que el Servidor se reestablezca</div>");
		}

		this.logEntry(user.name + " used /slowlockdown");
	},

	endlockdown: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		if (!Rooms.global.lockdown) {
			return this.sendReply("No se estaba pensando hacer un reinicio");
		}
		if (Rooms.global.lockdown === true) {
			for (var id in Rooms.rooms) {
				if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-green\"><b>El Reinicio del Servidor Dropp ha sido cancelado</b></div>");
			}
		} else {
			this.sendReply("El reinicio del Servidor ha sido cancelado");
		}
		Rooms.global.lockdown = false;

		this.logEntry(user.name + " used /endlockdown");
	},

	emergencia:'emergency',
	emergency: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		if (Config.emergency) {
			return this.sendReply("Ya estamos en modo de emergencia... almate y no te alteres");
		}
		Config.emergency = true;
		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-red\">¡ALERTA¡Hemos entrado en modo de Emergencia, se recomienda mantener la calma... Tambien cabe avisar que Algunas caracteristicas y funciones se desabilitaran¡ALERTA¡</div>");
		}

		this.logEntry(user.name + " used /emergency");
	},

	calmarusuarios: 'endemergency',
	endemergency: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		if (!Config.emergency) {
			return this.sendReply("No estamos en modo de Emegencia");
		}
		Config.emergency = false;
		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-green\"><b>Modo de emergencia desactivado.... Gracias por mantener la calma</b></div>");
		}

		this.logEntry(user.name + " used /endemergency");
	},

	iniciarreinicio: 'kill',
	kill: function (target, room, user, connection) {
		//if (!user.hasConsoleAccess(connection)) {return this.sendReply("/kill - Access denied.");}

		if (Rooms.global.lockdown !== true) {
			return this.sendReply("For safety reasons, /kill can only be used during lockdown.");
		}

		if (CommandParser.updateServerLock) {
			return this.sendReply("Wait for /updateserver to finish before using /kill.");
		}

		for (var i in Sockets.workers) {
			Sockets.workers[i].kill();
		}

		if (!room.destroyLog) {
			process.exit();
			return;
		}
		room.destroyLog(function () {
			room.logEntry(user.name + " used /kill");
		}, function () {
			process.exit();
		});

		// Just in the case the above never terminates, kill the process
		// after 10 seconds.
		setTimeout(function () {
			process.exit();
		}, 10000);
	},
	killhelp: ["/kill - kills the server. Can't be done unless the server is in lockdown state. Requires: ~"],

	loadbanlist: function (target, room, user, connection) {
		if (!this.can('hotpatch')) return false;

		connection.sendTo(room, "Loading ipbans.txt...");
		fs.readFile('config/ipbans.txt', function (err, data) {
			if (err) return;
			data = ('' + data).split('\n');
			var rangebans = [];
			for (var i = 0; i < data.length; ++i) {
				var line = data[i].split('#')[0].trim();
				if (!line) continue;
				if (line.includes('/')) {
					rangebans.push(line);
				} else if (line && !Users.bannedIps[line]) {
					Users.bannedIps[line] = '#ipban';
				}
			}
			Users.checkRangeBanned = Cidr.checker(rangebans);
			connection.sendTo(room, "ipbans.txt has been reloaded.");
		});
	},
	loadbanlisthelp: ["/loadbanlist - Loads the bans located at ipbans.txt. The command is executed automatically at startup. Requires: ~"],

	refreshpage: function (target, room, user) {
		if (!this.can('hotpatch')) return false;
		Rooms.global.send('|refresh|');
		this.logEntry(user.name + " used /refreshpage");
	},

	updateserver: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply("/updateserver - Access denied.");
		}

		if (CommandParser.updateServerLock) {
			return this.sendReply("/updateserver - Another update is already in progress.");
		}

		CommandParser.updateServerLock = true;

		var logQueue = [];
		logQueue.push(user.name + " used /updateserver");

		connection.sendTo(room, "updating...");

		var exec = require('child_process').exec;
		exec('git diff-index --quiet HEAD --', function (error) {
			var cmd = 'git pull --rebase';
			if (error) {
				if (error.code === 1) {
					// The working directory or index have local changes.
					cmd = 'git stash && ' + cmd + ' && git stash pop';
				} else {
					// The most likely case here is that the user does not have
					// `git` on the PATH (which would be error.code === 127).
					connection.sendTo(room, "" + error);
					logQueue.push("" + error);
					logQueue.forEach(function (line) {
						room.logEntry(line);
					});
					CommandParser.updateServerLock = false;
					return;
				}
			}
			var entry = "Running `" + cmd + "`";
			connection.sendTo(room, entry);
			logQueue.push(entry);
			exec(cmd, function (error, stdout, stderr) {
				("" + stdout + stderr).split("\n").forEach(function (s) {
					connection.sendTo(room, s);
					logQueue.push(s);
				});
				logQueue.forEach(function (line) {
					room.logEntry(line);
				});
				CommandParser.updateServerLock = false;
			});
		});
	},

	crashfixed: function (target, room, user) {
		if (Rooms.global.lockdown !== true) {
			return this.sendReply('/crashfixed - There is no active crash.');
		}
		if (!this.can('hotpatch')) return false;

		Rooms.global.lockdown = false;
		if (Rooms.lobby) {
			Rooms.lobby.modchat = false;
			Rooms.lobby.addRaw("<div class=\"broadcast-green\"><b>We fixed the crash without restarting the server!</b><br />You may resume talking in the lobby and starting new battles.</div>");
		}
		this.logEntry(user.name + " used /crashfixed");
	},
	crashfixedhelp: ["/crashfixed - Ends the active lockdown caused by a crash without the need of a restart. Requires: ~"],

	'memusage': 'memoryusage',
	memoryusage: function (target) {
		if (!this.can('hotpatch')) return false;
		var memUsage = process.memoryUsage();
		var results = [memUsage.rss, memUsage.heapUsed, memUsage.heapTotal];
		var units = ["B", "KiB", "MiB", "GiB", "TiB"];
		for (var i = 0; i < results.length; i++) {
			var unitIndex = Math.floor(Math.log2(results[i]) / 10); // 2^10 base log
			results[i] = "" + (results[i] / Math.pow(2, 10 * unitIndex)).toFixed(2) + " " + units[unitIndex];
		}
		this.sendReply("Main process. RSS: " + results[0] + ". Heap: " + results[1] + " / " + results[2] + ".");
	},

	bash: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply("/bash - Access denied.");
		}

		var exec = require('child_process').exec;
		exec(target, function (error, stdout, stderr) {
			connection.sendTo(room, ("" + stdout + stderr));
		});
	},

	eval: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply("/eval - Access denied.");
		}
		if (!this.canBroadcast()) return;

		if (!this.broadcasting) this.sendReply('||>> ' + target);
		try {
			var battle = room.battle;
			var me = user;
			this.sendReply('||<< ' + eval(target));
		} catch (e) {
			this.sendReply('||<< error: ' + e.message);
			var stack = '||' + ('' + e.stack).replace(/\n/g, '\n||');
			connection.sendTo(room, stack);
		}
	},

	evalbattle: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply("/evalbattle - Access denied.");
		}
		if (!this.canBroadcast()) return;
		if (!room.battle) {
			return this.sendReply("/evalbattle - This isn't a battle room.");
		}

		room.battle.send('eval', target.replace(/\n/g, '\f'));
	},

	ebat: 'editbattle',
	editbattle: function (target, room, user) {
		if (!this.can('forcewin')) return false;
		if (!target) return this.parse('/help editbattle');
		if (!room.battle) {
			this.sendReply("/editbattle - This is not a battle room.");
			return false;
		}
		var cmd;
		var spaceIndex = target.indexOf(' ');
		if (spaceIndex > 0) {
			cmd = target.substr(0, spaceIndex).toLowerCase();
			target = target.substr(spaceIndex + 1);
		} else {
			cmd = target.toLowerCase();
			target = '';
		}
		if (cmd.charAt(cmd.length - 1) === ',') cmd = cmd.slice(0, -1);
		var targets = target.split(',');
		function getPlayer(input) {
			if (room.battle.playerids[0] === toId(input)) return 'p1';
			if (room.battle.playerids[1] === toId(input)) return 'p2';
			if (input.includes('1')) return 'p1';
			if (input.includes('2')) return 'p2';
			return 'p3';
		}
		function getPokemon(input) {
			if (/^[0-9]+$/.test(input)) {
				return '.pokemon[' + (parseInt(input) - 1) + ']';
			}
			return ".pokemon.find(function(p){return p.speciesid==='" + toId(targets[1]) + "'})";
		}
		switch (cmd) {
		case 'hp':
		case 'h':
			room.battle.send('eval', "var p=" + getPlayer(targets[0]) + getPokemon(targets[1]) + ";p.sethp(" + parseInt(targets[2]) + ");if (p.isActive)battle.add('-damage',p,p.getHealth);");
			break;
		case 'status':
		case 's':
			room.battle.send('eval', "var pl=" + getPlayer(targets[0]) + ";var p=pl" + getPokemon(targets[1]) + ";p.setStatus('" + toId(targets[2]) + "');if (!p.isActive){battle.add('','please ignore the above');battle.add('-status',pl.active[0],pl.active[0].status,'[silent]');}");
			break;
		case 'pp':
			room.battle.send('eval', "var pl=" + getPlayer(targets[0]) + ";var p=pl" + getPokemon(targets[1]) + ";p.moveset[p.moves.indexOf('" + toId(targets[2]) + "')].pp = " + parseInt(targets[3]));
			break;
		case 'boost':
		case 'b':
			room.battle.send('eval', "var p=" + getPlayer(targets[0]) + getPokemon(targets[1]) + ";battle.boost({" + toId(targets[2]) + ":" + parseInt(targets[3]) + "},p)");
			break;
		case 'volatile':
		case 'v':
			room.battle.send('eval', "var p=" + getPlayer(targets[0]) + getPokemon(targets[1]) + ";p.addVolatile('" + toId(targets[2]) + "')");
			break;
		case 'sidecondition':
		case 'sc':
			room.battle.send('eval', "var p=" + getPlayer(targets[0]) + ".addSideCondition('" + toId(targets[1]) + "')");
			break;
		case 'fieldcondition': case 'pseudoweather':
		case 'fc':
			room.battle.send('eval', "battle.addPseudoWeather('" + toId(targets[0]) + "')");
			break;
		case 'weather':
		case 'w':
			room.battle.send('eval', "battle.setWeather('" + toId(targets[0]) + "')");
			break;
		case 'terrain':
		case 't':
			room.battle.send('eval', "battle.setTerrain('" + toId(targets[0]) + "')");
			break;
		default:
			this.errorReply("Unknown editbattle command: " + cmd);
			break;
		}
	},
	editbattlehelp: ["/editbattle hp [player], [pokemon], [hp]",
		"/editbattle status [player], [pokemon], [status]",
		"/editbattle pp [player], [pokemon], [move], [pp]",
		"/editbattle boost [player], [pokemon], [stat], [amount]",
		"/editbattle volatile [player], [pokemon], [volatile]",
		"/editbattle sidecondition [player], [sidecondition]",
		"/editbattle fieldcondition [fieldcondition]",
		"/editbattle weather [weather]",
		"/editbattle terrain [terrain]",
		"Short forms: /ebat h OR s OR pp OR b OR v OR sc OR fc OR w OR t",
		"[player] must be a username or number, [pokemon] must be species name or number (not nickname), [move] must be move name"],

	/*********************************************************
	 * Battle commands
	 *********************************************************/

	forfeit: function (target, room, user) {
		if (!room.battle) {
			return this.sendReply("There's nothing to forfeit here.");
		}
		if (!room.forfeit(user)) {
			return this.sendReply("You can't forfeit this battle.");
		}
	},

	savereplay: function (target, room, user, connection) {
		if (!room || !room.battle) return;
		var logidx = 0; // spectator log (no exact HP)
		if (room.battle.ended) {
			// If the battle is finished when /savereplay is used, include
			// exact HP in the replay log.
			logidx = 3;
		}
		var data = room.getLog(logidx).join("\n");
		var datahash = crypto.createHash('md5').update(data.replace(/[^(\x20-\x7F)]+/g, '')).digest('hex');
		var players = room.battle.lastPlayers.map(Users.getExact);
		LoginServer.request('prepreplay', {
			id: room.id.substr(7),
			loghash: datahash,
			p1: players[0] ? players[0].name : room.battle.lastPlayers[0],
			p2: players[1] ? players[1].name : room.battle.lastPlayers[1],
			format: room.format
		}, function (success) {
			if (success && success.errorip) {
				connection.popup("This server's request IP " + success.errorip + " is not a registered server.");
				return;
			}
			connection.send('|queryresponse|savereplay|' + JSON.stringify({
				log: data,
				id: room.id.substr(7)
			}));
		});
	},

	mv: 'move',
	attack: 'move',
	move: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'choose', 'move ' + target);
	},

	sw: 'switch',
	switch: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'choose', 'switch ' + parseInt(target, 10));
	},

	choose: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'choose', target);
	},

	undo: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'undo', target);
	},

	team: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'choose', 'team ' + target);
	},

	addplayer: function (target, room, user) {
		if (!target) return this.parse('/help addplayer');

		target = this.splitTarget(target, true);
		var userid = toId(this.targetUsername);
		var targetUser = this.targetUser;
		var name = this.targetUsername;

		if (!targetUser) return this.sendReply("User " + name + " not found.");
		if (!room.joinBattle) return this.sendReply("You can only do this in battle rooms.");
		if (targetUser.can('joinbattle', null, room)) {
			return this.sendReply("" + name + " can already join battles as a Player.");
		}
		if (!this.can('joinbattle', null, room)) return;

		room.auth[targetUser.userid] = '\u2605';
		this.addModCommand("" + name  + " was promoted to Player by " + user.name + ".");
	},
	addplayerhelp: ["/addplayer [username] - Allow the specified user to join the battle as a player."],

	joinbattle: function (target, room, user) {
		if (!room.joinBattle) return this.sendReply("You can only do this in battle rooms.");
		if (!user.can('joinbattle', null, room)) return this.popupReply("You must be a set as a player to join a battle you didn't start. Ask a player to use /addplayer on you to join this battle.");

		room.joinBattle(user);
	},

	partbattle: 'leavebattle',
	leavebattle: function (target, room, user) {
		if (!room.leaveBattle) return this.sendReply("You can only do this in battle rooms.");

		room.leaveBattle(user);
	},

	kickbattle: function (target, room, user) {
		if (!room.leaveBattle) return this.sendReply("You can only do this in battle rooms.");

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply("User " + this.targetUsername + " not found.");
		}
		if (!this.can('kick', targetUser)) return false;

		if (room.leaveBattle(targetUser)) {
			this.addModCommand("" + targetUser.name + " was kicked from a battle by " + user.name + (target ? " (" + target + ")" : ""));
		} else {
			this.sendReply("/kickbattle - User isn't in battle.");
		}
	},
	kickbattlehelp: ["/kickbattle [username], [reason] - Kicks a user from a battle with reason. Requires: % @ & ~"],

	kickinactive: function (target, room, user) {
		if (room.requestKickInactive) {
			room.requestKickInactive(user);
		} else {
			this.sendReply("You can only kick inactive players from inside a room.");
		}
	},

	timer: function (target, room, user) {
		target = toId(target);
		if (room.requestKickInactive) {
			if (target === 'off' || target === 'false' || target === 'stop') {
				var canForceTimer = user.can('timer', null, room);
				if (room.resetTimer) {
					room.stopKickInactive(user, canForceTimer);
					if (canForceTimer) room.send('|inactiveoff|Timer was turned off by staff. Please do not turn it back on until our staff say it\'s okay');
				}
			} else if (target === 'on' || target === 'true' || !target) {
				room.requestKickInactive(user, user.can('timer'));
			} else {
				this.sendReply("'" + target + "' is not a recognized timer state.");
			}
		} else {
			this.sendReply("You can only set the timer from inside a battle room.");
		}
	},

	autotimer: 'forcetimer',
	forcetimer: function (target, room, user) {
		target = toId(target);
		if (!this.can('autotimer')) return;
		if (target === 'off' || target === 'false' || target === 'stop') {
			Config.forcetimer = false;
			this.addModCommand("Forcetimer is now OFF: The timer is now opt-in. (set by " + user.name + ")");
		} else if (target === 'on' || target === 'true' || !target) {
			Config.forcetimer = true;
			this.addModCommand("Forcetimer is now ON: All battles will be timed. (set by " + user.name + ")");
		} else {
			this.sendReply("'" + target + "' is not a recognized forcetimer setting.");
		}
	},

	forcetie: 'forcewin',
	forcewin: function (target, room, user) {
		if (!this.can('forcewin')) return false;
		if (!room.battle) {
			this.sendReply("/forcewin - This is not a battle room.");
			return false;
		}

		room.battle.endType = 'forced';
		if (!target) {
			room.battle.tie();
			this.logModCommand(user.name + " forced a tie.");
			return false;
		}
		var targetUser = Users.getExact(target);
		if (!targetUser) return this.sendReply("User '" + target + "' not found.");

		target = targetUser ? targetUser.userid : '';

		if (target) {
			room.battle.win(targetUser);
			this.logModCommand(user.name + " forced a win for " + target + ".");
		}
	},
	forcewinhelp: ["/forcetie - Forces the current match to end in a tie. Requires: & ~",
		"/forcewin [user] - Forces the current match to end in a win for a user. Requires: & ~"],

	/*********************************************************
	 * Challenging and searching commands
	 *********************************************************/

	cancelsearch: 'search',
	search: function (target, room, user) {
		if (target) {
			if (Config.pmmodchat) {
				var userGroup = user.group;
				if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(Config.pmmodchat)) {
					var groupName = Config.groups[Config.pmmodchat].name || Config.pmmodchat;
					this.popupReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to search for a battle.");
					return false;
				}
			}
			Rooms.global.searchBattle(user, target);
		} else {
			Rooms.global.cancelSearch(user);
		}
	},

	chall: 'challenge',
	challenge: function (target, room, user, connection) {
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) {
			return this.popupReply("The user '" + this.targetUsername + "' was not found.");
		}
		if (targetUser.blockChallenges && !user.can('bypassblocks', targetUser)) {
			return this.popupReply("The user '" + this.targetUsername + "' is not accepting challenges right now.");
		}
		if (Config.pmmodchat) {
			var userGroup = user.group;
			if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(Config.pmmodchat)) {
				var groupName = Config.groups[Config.pmmodchat].name || Config.pmmodchat;
				this.popupReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to challenge users.");
				return false;
			}
		}
		user.prepBattle(Tools.getFormat(target).id, 'challenge', connection, function (result) {
			if (result) user.makeChallenge(targetUser, target);
		});
	},

	bch: 'blockchallenges',
	blockchall: 'blockchallenges',
	blockchalls: 'blockchallenges',
	blockchallenges: function (target, room, user) {
		if (user.blockChallenges) return this.sendReply("You are already blocking challenges!");
		user.blockChallenges = true;
		this.sendReply("You are now blocking all incoming challenge requests.");
	},
	blockchallengeshelp: ["/blockchallenges - Blocks challenges so no one can challenge you. Unblock them with /unblockchallenges."],

	unbch: 'allowchallenges',
	unblockchall: 'allowchallenges',
	unblockchalls: 'allowchallenges',
	unblockchallenges: 'allowchallenges',
	allowchallenges: function (target, room, user) {
		if (!user.blockChallenges) return this.sendReply("You are already available for challenges!");
		user.blockChallenges = false;
		this.sendReply("You are available for challenges from now on.");
	},
	allowchallengeshelp: ["/unblockchallenges - Unblocks challenges so you can be challenged again. Block them with /blockchallenges."],

	cchall: 'cancelChallenge',
	cancelchallenge: function (target, room, user) {
		user.cancelChallengeTo(target);
	},

	accept: function (target, room, user, connection) {
		var userid = toId(target);
		var format = '';
		if (user.challengesFrom[userid]) format = user.challengesFrom[userid].format;
		if (!format) {
			this.popupReply(target + " cancelled their challenge before you could accept it.");
			return false;
		}
		user.prepBattle(Tools.getFormat(format).id, 'challenge', connection, function (result) {
			if (result) user.acceptChallengeFrom(userid);
		});
	},

	reject: function (target, room, user) {
		user.rejectChallengeFrom(toId(target));
	},

	saveteam: 'useteam',
	utm: 'useteam',
	useteam: function (target, room, user) {
		user.team = target;
	},

	/*********************************************************
	 * Low-level
	 *********************************************************/

	cmd: 'query',
	query: function (target, room, user, connection) {
		// Avoid guest users to use the cmd errors to ease the app-layer attacks in emergency mode
		var trustable = (!Config.emergency || (user.named && user.registered));
		if (Config.emergency && ResourceMonitor.countCmd(connection.ip, user.name)) return false;
		var spaceIndex = target.indexOf(' ');
		var cmd = target;
		if (spaceIndex > 0) {
			cmd = target.substr(0, spaceIndex);
			target = target.substr(spaceIndex + 1);
		} else {
			target = '';
		}
		if (cmd === 'userdetails') {
			var targetUser = Users.get(target);
			if (!trustable || !targetUser) {
				connection.send('|queryresponse|userdetails|' + JSON.stringify({
					userid: toId(target),
					rooms: false
				}));
				return false;
			}
			var roomList = {};
			for (var i in targetUser.roomCount) {
				if (i === 'global') continue;
				var targetRoom = Rooms.get(i);
				if (!targetRoom || targetRoom.isPrivate) continue;
				var roomData = {};
				if (targetRoom.battle) {
					var battle = targetRoom.battle;
					roomData.p1 = battle.p1 ? ' ' + battle.p1 : '';
					roomData.p2 = battle.p2 ? ' ' + battle.p2 : '';
				}
				roomList[i] = roomData;
			}
			if (!targetUser.roomCount['global']) roomList = false;
			var userdetails = {
				userid: targetUser.userid,
				avatar: targetUser.avatar,
				rooms: roomList
			};
			connection.send('|queryresponse|userdetails|' + JSON.stringify(userdetails));
		} else if (cmd === 'roomlist') {
			if (!trustable) return false;
			connection.send('|queryresponse|roomlist|' + JSON.stringify({
				rooms: Rooms.global.getRoomList(target)
			}));
		} else if (cmd === 'rooms') {
			if (!trustable) return false;
			connection.send('|queryresponse|rooms|' + JSON.stringify(
				Rooms.global.getRooms(user)
			));
		}
	},

	trn: function (target, room, user, connection) {
		var commaIndex = target.indexOf(',');
		var targetName = target;
		var targetRegistered = false;
		var targetToken = '';
		if (commaIndex >= 0) {
			targetName = target.substr(0, commaIndex);
			target = target.substr(commaIndex + 1);
			commaIndex = target.indexOf(',');
			targetRegistered = target;
			if (commaIndex >= 0) {
				targetRegistered = !!parseInt(target.substr(0, commaIndex), 10);
				targetToken = target.substr(commaIndex + 1);
			}
		}
		user.rename(targetName, targetToken, targetRegistered, connection);
	},

	a: function (target, room, user) {
		if (!this.can('rawpacket')) return false;
		// secret sysop command
		room.add(target);
	},

	/*********************************************************
	 * Help commands
	 *********************************************************/

	commands: 'help',
	h: 'help',
	'?': 'help',
	help: function (target, room, user) {
		target = target.toLowerCase();

		// overall
		if (target === 'help' || target === 'h' || target === '?' || target === 'commands') {
			this.sendReply("/help OR /h OR /? - Gives you help.");
		} else if (!target) {
			this.sendReply("COMMANDS: /nick, /avatar, /rating, /whois, /msg, /reply, /ignore, /away, /back, /timestamps, /highlight");
			this.sendReply("INFORMATIONAL COMMANDS: /data, /dexsearch, /movesearch, /groups, /faq, /rules, /intro, /formatshelp, /othermetas, /learn, /analysis, /calc (replace / with ! to broadcast. Broadcasting requires: + % @ # & ~)");
			if (user.group !== Config.groupsranking[0]) {
				this.sendReply("DRIVER COMMANDS: /warn, /mute, /hourmute, /unmute, /alts, /forcerename, /modlog, /modnote, /lock, /unlock, /announce, /redirect");
				this.sendReply("MODERATOR COMMANDS: /ban, /unban, /ip, /modchat");
				this.sendReply("LEADER COMMANDS: /declare, /forcetie, /forcewin, /promote, /demote, /banip, /host, /unbanall");
			}
			this.sendReply("For an overview of room commands, use /roomhelp");
			this.sendReply("For details of a specific command, use something like: /help data");
		} else {
			var altCommandHelp;
			var helpCmd;
			var targets = target.split(' ');
			var allCommands = CommandParser.commands;
			if (typeof allCommands[target] === 'string') {
				// If a function changes with command name, help for that command name will be searched first.
				altCommandHelp = target + 'help';
				if (altCommandHelp in allCommands) {
					helpCmd = altCommandHelp;
				} else {
					helpCmd = allCommands[target] + 'help';
				}
			} else if (targets.length > 1 && typeof allCommands[targets[0]] === 'object') {
				// Handle internal namespace commands
				var helpCmd = targets[targets.length - 1] + 'help';
				var namespace = allCommands[targets[0]];
				for (var i = 1; i < targets.length - 1; i++) {
					if (!namespace[targets[i]]) return this.sendReply("Help for the command '" + target + "' was not found. Try /help for general help");
					namespace = namespace[targets[i]];
				}
				if (typeof namespace[helpCmd] === 'object') {
					return this.sendReply(namespace[helpCmd].join('\n'));
				} else if (typeof namespace[helpCmd] === 'function') {
					return this.parse('/' + targets.slice(0, targets.length - 1).concat(helpCmd).join(' '));
				} else {
					return this.sendReply("Help for the command '" + target + "' was not found. Try /help for general help");
				}
			} else {
				helpCmd = target + 'help';
			}
			if (helpCmd in allCommands) {
				if (typeof allCommands[helpCmd] === 'function') {
					// If the help command is a function, parse it instead
					this.parse('/' + helpCmd);
				} else if (Array.isArray(allCommands[helpCmd])) {
					this.sendReply(allCommands[helpCmd].join('\n'));
				}
			} else {
				this.sendReply("Help for the command '" + target + "' was not found. Try /help for general help");
			}
		}
	}

};
