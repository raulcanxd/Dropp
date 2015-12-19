var color = require('../config/color');

exports.parseEmoticons = parseEmoticons;

var emotes = {
	':(': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0101-sadsmile.gif',
	':D': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0102-bigsmile.gif',
	':)': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0100-smile.gif',
	';(': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0106-crying.gif',
	';)': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0105-wink.gif',
	':$': 'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0111-blush.gif',
	':prr:': 'http://r32.imgfast.net/users/3215/11/58/02/smiles/4268145079.gif',
	'xD': 'http://www.animaatjes.nl/smileys/smileys-en-emoticons/xd/animaatjes-xd-09561.gif',
	':hola:': 'http://k40.kn3.net/9788B4B8D.gif',
	'O_O':'http://emoticoner.com/files/emoticons/pink-cat/surprised-pink-cat-emoticon.gif?1292538525',
	':lengua:' :'http://emoticoner.com/files/emoticons/rice_ball/rice-ball-smiley-10.gif?1302020563',
	':bañar:': 'http://emoticoner.com/files/emoticons/mouse-girl/mouse-girl-emoticon-50.gif?1292795477',
	':cepilarme:': 'http://emoticoner.com/files/emoticons/mouse-girl/mouse-girl-emoticon-52.gif?1292795478',
	':buizel:': 'http://orig11.deviantart.net/079c/f/2008/244/6/a/caramel__buizel_by_raidragonair.gif',
	':bye:': 'http://emoticoner.com/files/emoticons/rice_ball/rice-ball-smiley-05.gif?1302020563',
	':sayan:': 'http://emoticoner.com/files/emoticons/blacko/blacko-emoticon-17.gif?1292951356',
	':Jodes:': 'http://emoticoner.com/files/emoticons/yellow_onion_head/yellow-onion-head-emoticon-13.gif?1301920886',
	'U_U': 'http://emoticoner.com/files/emoticons/pink-cat/worry-pink-cat-emoticon.gif?1292538526',
	':calor:': 'http://emoticoner.com/files/emoticons/yellow_onion_head/yellow-onion-head-emoticon-26.gif?1301920889',
	':pikachu:': 'http://cbc.pokecommunity.com/config/emoticons/pikachu.png',
	':mudkip:': 'http://vignette2.wikia.nocookie.net/epicrapbattlesofhistory/images/4/46/Awesome_Face_Mudkip.png/revision/latest?cb=20140626034323',
	':sonji:': 'http://emoticoner.com/files/emoticons/raccoon/feel-love-raccoon-emoticon.gif?1302774071',
	':eevee:': 'http://cbc.pokecommunity.com/config/emoticons/eevee.png',
	':hola:': 'http://k40.kn3.net/9788B4B8D.gif',
	':senpai:': 'http://cbc.pokecommunity.com/config/emoticons/senpai.png',
	':naruto:': 'http://lh4.ggpht.com/_QwvI2Zom950/TAdYX8-5gQI/AAAAAAAAAu0/2ng4u2V9-1Y/s128/naruto.gif'
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
		return typeof emote === 'string' ? '<img src="' + emote + '" title="' + match + '"/>' : match;
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

	return "<div class='infobox'><div class = 'broadcast-green'><center><b><u>Lista de caritas</u></b></center>" + "<div class='infobox-limited'><table cellspacing='0' cellpadding='5' width='100%'>" + "<tbody>" + emotes_group_list.join("") + "</tbody>" + "</table></div></div>";
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

	onofcaritas: 'toggleemoticons',
	toggleemote: 'toggleemoticons',
	toggleemotes: 'toggleemoticons',
	toggleemoticons: function (target, room, user) {
		if (!this.can('declare', null, room)) return false;
		room.disableEmoticons = !room.disableEmoticons;
		this.sendReply("Disallowing emoticons is set to " + room.disableEmoticons + " in this room.");
		if (room.disableEmoticons) {
			this.add("|raw|<div class=\"broadcast-red\"><b>las caritas han sido desactivadas!</b><br />No se podran utilizar emoticones hasta nuevo aviso.</div>");
		} else {
			this.add("|raw|<div class=\"broadcast-green\"><b>Las caritas han sido activadas!</b><br />Ya se pueden usar emoticones.</div>");
		}
	},
	toggleemoticonshelp: ["/toggleemoticons - Toggle emoticons on or off."],

	rande: 'randemote',
	randemote: function (target, room, user) {
		if (!this.canBroadcast()) return;
		var rng = Math.floor(Math.random() * emotesKeys.length);
		var randomEmote = emotesKeys[rng];
		this.sendReplyBox("<img src='" + emotes[randomEmote] + "' title='" + randomEmote + " />");
	},
	randemotehelp: ["/randemote - Get a random emote."]
};
