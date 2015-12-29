
var fs = require('fs');

function loadVips() {
	try {
		Users.vips = JSON.parse(fs.readFileSync('config/vips.json', 'utf8'));
	} catch (e) {
		Users.vips = {};
	}
}
if (!Users.vips) loadVips();

function saveVips() {
	fs.writeFileSync('config/vips.json', JSON.stringify(Users.vips));
}

exports.commands = {
	darhonores: function (target, room, user) {
		if (!this.can('givevip')) return false;
		if (!target) return this.sendReply("Usa: /darhonores [Usuario]");
		if (Users.vips[toId(target)]) return this.sendReply(target + " ya es Contribuyente Técnico.");
		var targetUser = Users(target);

		if (!targetUser) return this.sendReply("El usuario \"" + target + "\" no fue encontrado.");
		if (!targetUser.connected) return this.sendReply(targetUser.name + " no esta conectado.");
		if (!targetUser.registered) return this.sendReply(targetUser.name + " no esta registrado.");

		Users.vips[targetUser.userid] = 1;
		targetUser.popup("!Felicidades¡ has recibido el titulo de Contribuyente Técnico");
		this.privateModCommand("(" + targetUser.name + " ha recibido el titulo de Contribuyente Técnico)");
		saveVips();
	},

	quitarhonores: function (target, room, user) {
		if (!this.can('givevip')) return false;
		if (!target) return this.sendReply("Usa: /quitarhonores [usuario]");
		if (!Users.vips[toId(target)]) return this.sendReply("El usuario \"" + target + "\" no es Contribuyente Técnico");
		var targetUser = Users(target);

		delete Users.vips[toId(target)];
		saveVips();
		this.privateModCommand("(Al usuario " + targetUser.name + " se le ha quitado su titulo como Contribuyente Técnico)");
	},
};
