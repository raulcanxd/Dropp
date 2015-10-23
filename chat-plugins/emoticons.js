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
	'xd': 'http://www.animaatjes.nl/smileys/smileys-en-emoticons/xd/animaatjes-xd-09561.gif',
	':hola:': 'http://k40.kn3.net/9788B4B8D.gif',
	':dance:': 'http://www.gifde.com/gif/otros/musica/bailes-platano-bailando/platano-bailando-dancing-banana-020.gif',
	':h:':'http://factoryjoe.s3.amazonaws.com/emoticons/emoticon-0152-heart.gif',
	'(-.-)': 'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-005.gif?1302022356',
	'm(-.-)m':'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-002.gif?1302022356',
	':eee:':'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-027.gif?1302022361',
	':hju:': 'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-025.gif?1302022361',
	':aaa:': 'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-032.gif?1302022361',
	':si:': 'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-031.gif?1302022361',
	':no:': 'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-030.gif?1302022361',
	';3;': 'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-049.gif?1302022363',
	':121:':'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-121.gif?1302022372',
	':yoyo:': 'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-132.gif?1302022374',
	':bum:': 'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-141.gif?1302022375',
	':zZZ:':'http://emoticoner.com/files/emoticons/text_line/text-line-smiley-143.gif?1302022375',
	'O:)': 'http://emoticoner.com/files/emoticons/smiley_faces/afro2-smiley-face.gif?1302011301',
	':punch:': 'http://emoticoner.com/files/emoticons/smileys/boxing-smiley.gif?1292867560',
	':gulp:': 'http://emoticoner.com/files/emoticons/smileys/brod-kavelarg-smiley.gif?1292867561',
	':bye:': 'http://emoticoner.com/files/emoticons/smileys/bye-smiley.gif?1292867562',
	':rrr:': 'http://emoticoner.com/files/emoticons/smiley_faces/ablow-smiley-face.gif?1302011300',
	':8ball:': 'http://emoticoner.com/files/emoticons/smiley_faces/8ball-smiley-face.gif?1302011297',
	':asched:': 'http://emoticoner.com/files/emoticons/smiley_faces/bash-smiley-face.gif?1302011310',
	':shut:': 'http://emoticoner.com/files/emoticons/smileys/cheerleader1-smiley.gif?1292867567',
	':pchut:':'http://emoticoner.com/files/emoticons/smileys/check-email-smiley.gif?1292867567',
	':chat:': 'http://emoticoner.com/files/emoticons/smileys/chat-smiley.gif?1292867567',
	':powera:': 'http://emoticoner.com/files/emoticons/smiley_faces/admin-power-smiley-face.gif?1302011301', 
	':felicidades:': 'http://emoticoner.com/files/emoticons/smileys/congratualtions-smiley.gif?1292867575',
	':um:': 'http://emoticoner.com/files/emoticons/smileys/dont-no-smiley.gif?1292867584',
	':cumple:' :'http://emoticoner.com/files/emoticons/smileys/earth-day-smiley.gif?1292867587',
	':punch2:': 'http://emoticoner.com/files/emoticons/smileys/fight2-smiley.gif?1292867593',
	':ummmm:': 'http://emoticoner.com/files/emoticons/smileys/flirty4-smiley.gif?1292867596',
	':ban:': 'http://emoticoner.com/files/emoticons/smiley_faces/ban-smiley-face.gif?1302011308',
	':banned:': 'http://emoticoner.com/files/emoticons/smiley_faces/banned-smiley-face.gif?1302011310',
	':ban2:': 'http://emoticoner.com/files/emoticons/smiley_faces/banned2-smiley-face.gif?1302011310',
	'zzZZ': 'http://www.messentools.com/images/emoticones/anime/www.MessenTools.com-Pokemon-pok090.gif',
	':chikorita:': 'http://www.emoticones-avenue.com/emoticones/nintendo_pokemon_04.gif',
	':togekiss:': 'http://es.smiley-emoticones.com/emoticones/pokemon/pokemon_49.gif',
	':creeper:': 'http://static-cdn.jtvnw.net/jtv_user_pictures/chansub-global-emoticon-5d019b356bd38360-24x24.png',
	':absol:': 'http://cbc.pokecommunity.com/config/emoticons/absol.png',
	':arceus:': 'http://cbc.pokecommunity.com/config/emoticons/arceus.png',
	':armycat:': 'http://cbc.pokecommunity.com/config/emoticons/armycat.png',
	':azelf:': 'http://cbc.pokecommunity.com/config/emoticons/azelf.png',
	':buizel:': 'http://orig11.deviantart.net/079c/f/2008/244/6/a/caramel__buizel_by_raidragonair.gif',
	':bidoof:': 'http://cbc.pokecommunity.com/config/emoticons/bidoof.png',
	':bye:': 'http://cbc.pokecommunity.com/config/emoticons/bye.gif',
	':castform:': 'http://cbc.pokecommunity.com/config/emoticons/castform.png',
	':catflip:': 'http://cbc.pokecommunity.com/config/emoticons/catflip.png',
	':charizard:': 'http://cbc.pokecommunity.com/config/emoticons/charizard.png',
	':clown:': 'http://cbc.pokecommunity.com/config/emoticons/clown.png',
	':cookie:': 'http://cbc.pokecommunity.com/config/emoticons/cookie.png',
	':dk:': 'http://cbc.pokecommunity.com/config/emoticons/dk.png',
	':electrode:': 'http://cbc.pokecommunity.com/config/emoticons/electrode.png',
	':espurr:': 'http://cbc.pokecommunity.com/config/emoticons/espurr.png',
	':flirt:': 'http://cbc.pokecommunity.com/config/emoticons/flirt.png',
	':gav:': 'http://cbc.pokecommunity.com/config/emoticons/gav.png',
	':gloom:': 'http://cbc.pokecommunity.com/config/emoticons/gloom.png',
	':growlithe:': 'http://cbc.pokecommunity.com/config/emoticons/growlithe.png',
	':hamster:': 'http://cbc.pokecommunity.com/config/emoticons/hamster.png',
	':helix:': 'http://cbc.pokecommunity.com/config/emoticons/helix.png',
	':houndoom:': 'http://cbc.pokecommunity.com/config/emoticons/houndoom.png',
	':jigglypuff:': 'http://cbc.pokecommunity.com/config/emoticons/jigglypuff.png',
	':jynx:': 'http://cbc.pokecommunity.com/config/emoticons/jynx.png',
	':kappa:': 'http://cbc.pokecommunity.com/config/emoticons/kappa.png',
	':kermit:': 'http://cbc.pokecommunity.com/config/emoticons/kermit.png',
	':lapras:': 'http://cbc.pokecommunity.com/config/emoticons/lapras.png',
	':lileep:': 'http://cbc.pokecommunity.com/config/emoticons/lileep.png',
	':ludicolo:': 'http://cbc.pokecommunity.com/config/emoticons/ludicolo.png',
	':luvdisc:': 'http://cbc.pokecommunity.com/config/emoticons/luvdisc.png',
	':magikarp:': 'http://cbc.pokecommunity.com/config/emoticons/magikarp.png',
	':meganium:': 'http://cbc.pokecommunity.com/config/emoticons/meganium.png',
	':meowstic:': 'http://cbc.pokecommunity.com/config/emoticons/meowstic.png',
	':meowsticf:': 'http://cbc.pokecommunity.com/config/emoticons/meowsticf.png',
	':metagross:': 'http://cbc.pokecommunity.com/config/emoticons/metagross.png',
	':moo:': 'http://cbc.pokecommunity.com/config/emoticons/moo.gif',
	':nw:': 'http://cbc.pokecommunity.com/config/emoticons/nw.gif',
	':oddish:': 'http://cbc.pokecommunity.com/config/emoticons/oddish.png',
	':pear:': 'http://cbc.pokecommunity.com/config/emoticons/pear.png',
	':psyduck:': 'http://cbc.pokecommunity.com/config/emoticons/psyduck.png',
	':seduce:': 'http://cbc.pokecommunity.com/config/emoticons/seduce.png',
	':senpai:': 'http://cbc.pokecommunity.com/config/emoticons/senpai.png',
	':sims:': 'http://cbc.pokecommunity.com/config/emoticons/sims.png',
	':slowpoke:': 'http://cbc.pokecommunity.com/config/emoticons/slowpoke.png',
	':snorlax:': 'http://cbc.pokecommunity.com/config/emoticons/snorlax.png',
	':spheal:': 'http://cbc.pokecommunity.com/config/emoticons/spheal.png',
	':strut:': 'http://cbc.pokecommunity.com/config/emoticons/strut.png',
	':suicune:': 'http://cbc.pokecommunity.com/config/emoticons/suicune.png',
	':superman:': 'http://cbc.pokecommunity.com/config/emoticons/superman.png',
	':sweep:': 'http://cbc.pokecommunity.com/config/emoticons/sweep.gif',
	':taco:': 'http://cbc.pokecommunity.com/config/emoticons/taco.png',
	':vulpix:': 'http://cbc.pokecommunity.com/config/emoticons/vulpix.png',
	':weezing:': 'http://cbc.pokecommunity.com/config/emoticons/weezing.png',
	':why:': 'http://cbc.pokecommunity.com/config/emoticons/why.png',
	':wobbuffet:': 'http://cbc.pokecommunity.com/config/emoticons/wobbuffet.png',
	':wooper:': 'http://cbc.pokecommunity.com/config/emoticons/wooper.png',
	':wynaut:': 'http://cbc.pokecommunity.com/config/emoticons/wynaut.png',
	':b:': 'http://cbc.pokecommunity.com/config/emoticons/y.png',		
	':yoshi:': 'http://cbc.pokecommunity.com/config/emoticons/yoshi.png'
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

	return "<div class='infobox'><div class = 'broadcast-blue'><center><b><u>Lista de Emoticones de Dropp</u></b></center>" + "<div class='infobox-limited'><table cellspacing='0' cellpadding='5' width='100%'>" + "<tbody>" + emotes_group_list.join("") + "</tbody>" + "</table></div></div>";
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
			this.add("|raw|<div class=\"broadcast-red\"><b>Los Emoticons han sido desactivados!</b><br />No se podran utilizar emoticones hasta nuevo aviso.</div>");
		} else {
			this.add("|raw|<div class=\"broadcast-blue\"><b>Los Emoticons han sido activados!</b><br />Ya se pueden usar emoticones.</div>");
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