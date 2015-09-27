var color = require('../config/color');

exports.parseEmoticons = parseEmoticons;

var emotes = {
	':(': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0101-sadsmile.gif',
	':)': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0100-smile.gif',
	';(': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0106-crying.gif',
	';)': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0105-wink.gif',
	':$': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0111-blush.gif',
	':D': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0102-bigsmile.gif',
	'(h)': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0152-heart.gif',
	'punch': 'http://emoticoner.com/files/emoticons/smileys/boxing-smiley.gif?1292867560',
	'buizel': 'http://orig11.deviantart.net/079c/f/2008/244/6/a/caramel__buizel_by_raidragonair.gif',
	'gulp': 'http://emoticoner.com/files/emoticons/smileys/brod-kavelarg-smiley.gif?1292867561',
	'bye': 'http://emoticoner.com/files/emoticons/smileys/bye-smiley.gif?1292867562',
	'(shut)': 'http://emoticoner.com/files/emoticons/smileys/cheerleader1-smiley.gif?1292867567',
	'pchut':'http://emoticoner.com/files/emoticons/smileys/check-email-smiley.gif?1292867567',
	'(chat)': 'http://emoticoner.com/files/emoticons/smileys/chat-smiley.gif?1292867567',
	'congrants': 'http://emoticoner.com/files/emoticons/smileys/congratualtions-smiley.gif?1292867575',
	'(um)': 'http://emoticoner.com/files/emoticons/smileys/dont-no-smiley.gif?1292867584',
	'pupeaño' :'http://emoticoner.com/files/emoticons/smileys/earth-day-smiley.gif?1292867587',
	'(punch2)': 'http://emoticoner.com/files/emoticons/smileys/fight2-smiley.gif?1292867593',
	'(ummmm)': 'http://emoticoner.com/files/emoticons/smileys/flirty4-smiley.gif?1292867596',
	'(thewledey)': 'http://orig15.deviantart.net/cf2c/f/2010/003/4/0/magikarp_by_skirosa.gif',
	'(ban)': 'http://emoticoner.com/files/emoticons/smiley_faces/ban-smiley-face.gif?1302011308',
	'(banned)': 'http://emoticoner.com/files/emoticons/smiley_faces/banned-smiley-face.gif?1302011310',
	'(ban2)': 'http://emoticoner.com/files/emoticons/smiley_faces/banned2-smiley-face.gif?1302011310',
	'zzZZ': 'http://www.messentools.com/images/emoticones/anime/www.MessenTools.com-Pokemon-pok090.gif',
	'(chikorita)': 'http://www.emoticones-avenue.com/emoticones/nintendo_pokemon_04.gif',
	'togekiss': 'http://es.smiley-emoticones.com/emoticones/pokemon/pokemon_49.gif',
};

var emotesKeys = Object.keys(emotes);
var patterns = [];
var metachars = /[[\]{}()*+?.\\|^$\-,&#\s]/g;

for (var i in emotes) {
	if (emotes.hasOwnProperty(i)) {
		patterns.push('(' + i.replace(metachars, '\\$&') + ')');
	}
}
var patternRegex = new RegExp(patterns.join('|'), 'g');

/**
 * Parse emoticons in message.
 *
 * @param {String} message
 * @param {Object} room
 * @param {Object} user
 * @param {Boolean} pm - returns a string if it is in private messages
 * @returns {Boolean|String}
 */
function parseEmoticons(message, room, user, pm) {
	if (typeof message !== 'string' || (!pm && room.disableEmoticons)) return false;

	var match = false;
	var len = emotesKeys.length;


	while (len--) {
		if (message && message.indexOf(emotesKeys[len]) >= 0) {
			match = true;
			break;
		}
	}

	if (!match) return false;

	// escape HTML
	message = Tools.escapeHTML(message);

	// add emotes
	message = message.replace(patternRegex, function (match) {
		var emote = emotes[match];
		return typeof emote === 'string' ? '<img src="' + emote + '" title="' + match + '/>' : match;
	});

	// __italics__
	message = message.replace(/\_\_([^< ](?:[^<]*?[^< ])?)\_\_(?![^<]*?<\/a)/g, '<i>$1</i>');

	// **bold**
	message = message.replace(/\*\*([^< ](?:[^<]*?[^< ])?)\*\*/g, '<b>$1</b>');

	var group = user.getIdentity().charAt(0);
	if (room.auth) group = room.auth[user.userid] || group;

	var style = "background:none;border:0;padding:0 5px 0 0;font-family:Verdana,Helvetica,Arial,sans-serif;font-size:9pt;cursor:pointer";

	message = "<div class='chat'>" + "<small>" + group + "</small>" + "<button name='parseCommand' value='/user " + user.name + "' style='" + style + "'>" + "<b><font color='" + color(user.userid) + "'>" + user.name + ":</font></b>" + "</button><em class='mine'>" + message + "</em></div>";
	if (pm) return message;

	room.addRaw(message);

	return true;
}

/**
 * Create a two column table listing emoticons.
 *
 * @return {String} emotes table
 */
function create_table() {
	var emotes_name = Object.keys(emotes);
	var emotes_list = [];
	var emotes_group_list = [];
	var len = emotes_name.length;

	for (var i = 0; i < len; i++) {
		emotes_list.push("<td>" +
			"<img src='" + emotes[emotes_name[i]] + "'' title='" + emotes_name[i] + "' height='50' width='50' />" +
			emotes_name[i] + "</td>");
	}

	var emotes_list_right = emotes_list.splice(len / 2, len / 2);

	for (var i = 0; i < len / 2; i++) {
		var emote1 = emotes_list[i],
			emote2 = emotes_list_right[i];
		if (emote2) {
			emotes_group_list.push("<tr>" + emote1 + emote2 + "</tr>");
		} else {
			emotes_group_list.push("<tr>" + emote1 + "</tr>");
		}
	}

	return "<div class='infobox'><center><b><u>Lista de Emoticones</u></b></center>" + "<div class='infobox-limited'><table border='1' cellspacing='0' cellpadding='5' width='100%'>" + "<tbody>" + emotes_group_list.join("") + "</tbody>" + "</table></div></div>";
}

var emotes_table = create_table();

exports.commands = {
	blockemote: 'blockemoticons',
	blockemotes: 'blockemoticons',
	blockemoticon: 'blockemoticons',
	blockemoticons: function (target, room, user) {
		if (user.blockEmoticons === (target || true)) return this.sendReply("You are already blocking emoticons in private messages! To unblock, use /unblockemoticons");
		user.blockEmoticons = true;
		return this.sendReply("You are now blocking emoticons in private messages.");
	},
	blockemoticonshelp: ["/blockemoticons - Blocks emoticons in private messages. Unblock them with /unblockemoticons."],

	unblockemote: 'unblockemoticons',
	unblockemotes: 'unblockemoticons',
	unblockemoticon: 'unblockemoticons',
	unblockemoticons: function (target, room, user) {
		if (!user.blockEmoticons) return this.sendReply("You are not blocking emoticons in private messages! To block, use /blockemoticons");
		user.blockEmoticons = false;
		return this.sendReply("You are no longer blocking emoticons in private messages.");
	},
	unblockemoticonshelp: ["/unblockemoticons - Unblocks emoticons in private messages. Block them with /blockemoticons."],

    caritas: 'emoticons',
	emotes: 'emoticons',
	emoticons: function (target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReply("|raw|" + emotes_table);
	},
	emoticonshelp: ["/emoticons - Get a list of emoticons."],

	toggleemote: 'toggleemoticons',
	toggleemotes: 'toggleemoticons',
	toggleemoticons: function (target, room, user) {
		if (!this.can('declare', null, room)) return false;
		room.disableEmoticons = !room.disableEmoticons;
		this.sendReply("Disallowing emoticons is set to " + room.disableEmoticons + " in this room.");
		if (room.disableEmoticons) {
			this.add("|raw|<div class=\"broadcast-red\"><b>Emoticons are disabled!</b><br />Emoticons will not work.</div>");
		} else {
			this.add("|raw|<div class=\"broadcast-blue\"><b>Emoticons are enabled!</b><br />Emoticons will work now.</div>");
		}
	},
	toggleemoticonshelp: ["/toggleemoticons - Toggle emoticons on or off."],

	rande: 'randemote',
	randemote: function (target, room, user) {
		if (!this.canBroadcast()) return;
		var rng = Math.floor(Math.random() * emotesKeys.length);
		var randomEmote = emotesKeys[rng];
		this.sendReplyBox("<img src='" + emotes[randomEmote] + "' title='" + randomEmote + "' height='50' width='50' />");
	},
	randemotehelp: ["/randemote - Get a random emote."]
};