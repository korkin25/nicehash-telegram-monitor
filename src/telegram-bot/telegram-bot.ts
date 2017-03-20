import {NicehashAPI} from "../nicehash/nicehash-api";
import {formatDate} from "~request~tough-cookie/lib/cookie";
import {ServerDatabase} from "../database/database";
import * as moment from "moment";
var node_telegram = require('node-telegram-bot-api');

const TELEGRAM_TOKEN: string = "";

function stringTextRepeat(character: string, count: number) {
    var text = "";
    for (var i = 0; i < count; i++) text += character;
    return text;
}

export class TelegramBot {
    private bot = new node_telegram(TELEGRAM_TOKEN, { polling: true });

    constructor() {
        // Manejo de mensajes
        this.bot.onText(/^\/add( ([A-z0-9]{34}))?$/, this.onAdd);
        this.bot.onText(/^\/list$/, this.onList);
        this.bot.onText(/^\/list_miner$/, this.onListMiner);
        this.bot.onText(/^\/del$/, this.onDelete);
        this.bot.onText(/^\/balance$/, this.onBalance);
        this.bot.onText(/^\/alert_on/, this.onAlertOn);
        this.bot.onText(/^\/alert_off/, this.onAlertOff);
        this.bot.on("message", this.defaultMessage);
        this.bot.on( "callback_query", (msg: any) => {
            var matchResult: any;
            if ((matchResult = msg.data.match(/\/balance_([A-z0-9]{34})/))) { this.onBalanceCallback(msg, matchResult); }
            else if ((matchResult = msg.data.match(/\/del_([A-z0-9]{34})/))) { this.onDeleteCallback(msg, matchResult); }
            else if ((matchResult = msg.data.match(/\/alert_on_([A-z0-9]{34})_(.*)/))) { this.onAlertOnCallback(msg, matchResult); }
        });

        // Cron del chivato de mineros
        setInterval(this.cronMiners, 30000);
    }

    defaultMessage = (msg: any) => {
        console.log("[TelegramBot] Mensaje recibido.");
    };

    onAdd = (msg: any, match: string[]) => {
        if (match[2] && match[2].match("[A-z0-9]{34}")) {
            var userAdresses: any = null;
            try { userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.chat.id); } catch (err) {}
            if (!userAdresses) userAdresses = [];
            userAdresses.push(match[2]);
            userAdresses = userAdresses.filter(function(item: any, pos: number) { return userAdresses.indexOf(item) == pos; });
            ServerDatabase.getInstance().push("/tele_user_addresses/" + msg.chat.id, userAdresses);

            this.bot.sendMessage(msg.chat.id, "La cuenta se ha memorizado. Ya puedes consultar otras cosas.", { parse_mode: 'HTML' });
        }
        else {
            this.bot.sendMessage(msg.chat.id, "Para añadir una cuenta debes usar el comando\n<code>/add {ID de la cartera bitcoin}</code>", { parse_mode: 'HTML' });
        }
    };

    onList = (msg: any, match: string[]) => {
        var userAdresses: any = null;
        try { userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.chat.id); } catch (err) {}
        if (!userAdresses) userAdresses = [];

        if (userAdresses.length > 0) {
            var message = "<b>Lista de direcciones bitcoin:</b>\n<code>";
            for (var i in userAdresses) {
                message += "- " + userAdresses[i];
            }
            this.bot.sendMessage(msg.chat.id, message + "</code>", {parse_mode: 'HTML'});
        }
        else {
            this.bot.sendMessage(msg.chat.id, "Aún no has añadido ninguna dirección bitcoin.\nPrueba el comando <code>/add</code>", {parse_mode: 'HTML'});
        }
    };

    onListMiner = (msg: any, match: string[]) => {
        var userAdresses: any = null;
        try { userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.chat.id); } catch (err) {}
        if (!userAdresses) userAdresses = [];

        for (var userId in userAdresses) {
            var text = "<b>Mineros de " + userAdresses[userId] + "</b>\n<code>";

            var userMiners: any = null;
            try {
                userMiners = ServerDatabase.getInstance().getData("/tele_user_miners/" + userAdresses[userId]);
            } catch (err) {
            }
            if (!userMiners) userMiners = [];

            for (var x in userMiners) {
                text += "- " + userMiners[x].name + " (Visto: " + moment(userMiners[x].lastSeen).format("DD/MM/YYYY hh:mm") + ")\n";
            }

            this.bot.sendMessage(msg.chat.id, text + "</code>", {parse_mode: 'HTML'});
        }
    };

    onBalance = (msg: any, match: string[]) => {
        var userAdresses: any = null;
        try { userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.chat.id); } catch (err) {}

        if (userAdresses) {
            var inlineKeyboard: any[] = [];
            for (var x in userAdresses) {
                inlineKeyboard.push([ { text:  userAdresses[x], callback_data: "/balance_" + userAdresses[x] } ]);
            }

            this.bot.sendMessage(msg.chat.id, "Selecciona una cuenta", {
                parse_mode: 'HTML',
                reply_markup: JSON.stringify({ inline_keyboard: inlineKeyboard })
            });
        }
        else {
            this.bot.sendMessage(msg.chat.id, "Aún no has añadido ninguna cuenta bitcoin. Usa el comando <code>/add</code>.", {
                parse_mode: 'HTML'
            });
        }
    };

    onBalanceCallback = (msg: any, match: string[]) => {
        console.log(match);
        if (match[1] && match[1].match("[A-z0-9]{34}")) {
            this.bot.sendChatAction(msg.message.chat.id, "typing");

            var userAdresses: any = null;
            try {
                userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.message.chat.id);
            } catch (err) {
            }
            if (!userAdresses) userAdresses = [];
            userAdresses.push(match[1]);
            userAdresses = userAdresses.filter(function (item: any, pos: number) {
                return userAdresses.indexOf(item) == pos;
            });
            ServerDatabase.getInstance().push("/tele_user_addresses/" + msg.message.chat.id, userAdresses);

            NicehashAPI.StatsProvider(match[1]).then((response) => {
                this.bot.answerCallbackQuery(msg.id, "Consultando a Nicehash...", false, {parse_mode: 'HTML'});
                this.bot.sendMessage(msg.message.chat.id, TelegramBot.formatBalance(response.stats), {parse_mode: 'HTML'});
            });
        }
    };

    onAlertOn = (msg: any, match: string[]) => {
        var userAdresses: any = null;
        try { userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.chat.id); } catch (err) {}
        if (!userAdresses) userAdresses = [];

        if (userAdresses.length > 0) {
            var inlineKeyboard: any[] = [];

            var userAdresses: any = null;
            try { userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.chat.id); } catch (err) {}
            if (!userAdresses) userAdresses = [];

            for (var userId in userAdresses) {
                var userMiners: any = null;
                try {
                    userMiners = ServerDatabase.getInstance().getData("/tele_user_miners/" + userAdresses[userId]);
                } catch (err) {
                }
                if (!userMiners) userMiners = [];

                for (var x in userMiners) {
                    if (!userMiners[x].alert[msg.chat.id])
                        inlineKeyboard.push([ { text: userMiners[x].name + "   (" + userAdresses[x] + ")", callback_data: "/alert_on_" + userAdresses[x] + "_" + userMiners[x].name } ]);
                }
            }

            if (inlineKeyboard.length > 0) {
                this.bot.sendMessage(msg.chat.id, "Selecciona un minero", {
                    parse_mode: 'HTML',
                    reply_markup: JSON.stringify({inline_keyboard: inlineKeyboard})
                });
            }
            else {
                this.bot.sendMessage(msg.chat.id, "No tienes ningún minero con las alertas apagadas.", {
                    parse_mode: 'HTML'
                });
            }
        }
        else {
            this.bot.sendMessage(msg.chat.id, "Aún no has añadido ninguna dirección bitcoin.\nPrueba el comando <code>/add</code>", {parse_mode: 'HTML'});
        }
    };

    onAlertOnCallback = (msg: any, match: string[]) => {
        if (match[1] && match[1].match("[A-z0-9]{34}") && match[2]) {
            var userMiners: any = null;
            try {
                userMiners = ServerDatabase.getInstance().getData("/tele_user_miners/" + match[1]);
            } catch (err) {
            }
            if (!userMiners) userMiners = [];

            for (var i in userMiners) {
                if (userMiners[i].name == match[2]) {
                    userMiners[i].alert[msg.message.chat.id] = {
                        notified: false
                    };

                    NicehashAPI.StatsProvider(match[1]).then((response) => {
                        this.bot.answerCallbackQuery(msg.id, "Se ha establecido la alerta", true, {parse_mode: 'HTML'});
                    });

                    break;
                }
            }

            ServerDatabase.getInstance().push("/tele_user_miners/" + match[1], userMiners);
        }
    };

    onAlertOff = (msg: any, match: string[]) => {
        var userAdresses: any = null;
        try { userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.chat.id); } catch (err) {}
        if (!userAdresses) userAdresses = [];

        if (userAdresses.length > 0) {
            var inlineKeyboard: any[] = [];

            var userAdresses: any = null;
            try { userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.chat.id); } catch (err) {}
            if (!userAdresses) userAdresses = [];

            for (var userId in userAdresses) {
                var userMiners: any = null;
                try {
                    userMiners = ServerDatabase.getInstance().getData("/tele_user_miners/" + userAdresses[userId]);
                } catch (err) {
                }
                if (!userMiners) userMiners = [];

                for (var x in userMiners) {
                    if (userMiners[x].alert[msg.chat.id])
                        inlineKeyboard.push([ { text: userMiners[x].name + "   (" + userAdresses[x] + ")", callback_data: "/alert_on_" + userAdresses[x] + "_" + userMiners[x].name } ]);
                }
            }

            if (inlineKeyboard.length > 0) {
                this.bot.sendMessage(msg.chat.id, "Selecciona un minero", {
                    parse_mode: 'HTML',
                    reply_markup: JSON.stringify({inline_keyboard: inlineKeyboard})
                });
            }
            else {
                this.bot.sendMessage(msg.chat.id, "No tienes ningún minero con las alertas encendidas.", {
                    parse_mode: 'HTML'
                });
            }
        }
        else {
            this.bot.sendMessage(msg.chat.id, "Aún no has añadido ninguna dirección bitcoin.\nPrueba el comando <code>/add</code>", {parse_mode: 'HTML'});
        }
    };

    onDelete = (msg: any, match: string[]) => {
        var userAdresses: any = null;
        try { userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.chat.id); } catch (err) {}

        if (userAdresses) {
            var inlineKeyboard: any[] = [];
            for (var x in userAdresses) {
                inlineKeyboard.push([ { text:  userAdresses[x], callback_data: "/del_" + userAdresses[x] } ]);
            }

            this.bot.sendMessage(msg.chat.id, "Selecciona una cuenta para borrar", {
                parse_mode: 'HTML',
                reply_markup: JSON.stringify({ inline_keyboard: inlineKeyboard })
            });
        }
        else {
            this.bot.sendMessage(msg.chat.id, "Aún no has añadido ninguna cuenta bitcoin. Usa el comando <code>/add</code>.", {
                parse_mode: 'HTML'
            });
        }
    }

    onDeleteCallback = (msg: any, match: string[]) => {
        if (match[1] && match[1].match("[A-z0-9]{34}")) {
            var userAdresses: any = null;
            try {
                userAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses/" + msg.message.chat.id);
            } catch (err) {
            }
            if (!userAdresses) userAdresses = [];
            userAdresses.push(match[1]);
            userAdresses = userAdresses.filter(function (item: any, pos: number) {
                return userAdresses.indexOf(item) == pos;
            });

            // Se borra la dirección
            var index = userAdresses.indexOf(match[1]);
            if (index > -1) { userAdresses.splice(index, 1); }

            // Se guarda en la BD
            ServerDatabase.getInstance().push("/tele_user_addresses/" + msg.message.chat.id, userAdresses);

            // Se responde afirmativamente
            this.bot.answerCallbackQuery(msg.id, "La cuenta " + match[1] + " ha sido borrada...", true, {parse_mode: 'HTML'});
        }
    };

    cronMiners = () => {
        var now = new Date();
        var usersAdresses: any = null;
        try {
            usersAdresses = ServerDatabase.getInstance().getData("/tele_user_addresses");
        } catch (err) { }

        for (var userId in usersAdresses) {
            for (var x in usersAdresses[userId]) {
                var userMiners: any = null;
                try {
                    userMiners = ServerDatabase.getInstance().getData("/tele_user_miners/" + usersAdresses[userId][x]);
                } catch (err) {
                }
                if (!userMiners) userMiners = [];

                for (var i in userMiners) {
                    if (userMiners[i].alert[userId] && !userMiners[i].alert[userId].notified && Date.parse(userMiners[i].lastSeen) + 180000 < now.getTime()){
                        console.log("lul")
                        userMiners[i].alert[userId].notified = true;
                        var msg = "Tu minero <code>" + userMiners[i].name + "</code> vinculado a la cuenta <code>" + usersAdresses[userId][x] + "</code> lleva mucho tiempo sin responder. Comprueba que no se haya desactivado.";
                        console.log("Alertando de minero caido (" + userId + ").");
                        this.bot.sendMessage(userId, msg, {
                            parse_mode: 'HTML'
                        });
                    }

                    if (userMiners[i].alert[userId] && userMiners[i].alert[userId].notified && Date.parse(userMiners[i].lastSeen) + 180000 > now.getTime()){
                        userMiners[i].alert[userId].notified = false;
                        var msg = "Tu minero <code>" + userMiners[i].name + "</code> vinculado a la cuenta <code>" + usersAdresses[userId][x] + "</code> acaba de ponerse online.";
                        console.log("Alertando de minero online (" + userId + ").");
                        this.bot.sendMessage(userId, msg, {
                            parse_mode: 'HTML'
                        });
                    }
                }

                ServerDatabase.getInstance().push("/tele_user_miners/" + usersAdresses[userId][x], userMiners);
            }
        }
    }

    static formatBalance(balance: any) : string {
        var response = "";

        var nameSize = 0;
        for (var c in balance) {
            if (balance[c].algo.length > nameSize) nameSize = balance[c].algo.length;
        }

        response += "<code>" + "Algoritmo" + stringTextRepeat(" ", nameSize - "Algoritmo".length) + " | Actual    | Acumulado | Aciertos</code>\n";
        response += "<code>--------------------------------------------------</code>\n";

        for (var c in balance) {
            var name = balance[c].algo + stringTextRepeat(" ", nameSize - balance[c].algo.length);
            var speed_accepted = balance[c].accepted_speed.toFixed(5) + " Ƀ";
            var total_balance = balance[c].balance.toFixed(5) + " Ƀ";
            var correct = balance[c].accepted_speed * 100 / (balance[c].accepted_speed + balance[c].rejected_speed);
            response += "<code>" + name + " | " + speed_accepted + " | " + total_balance + " | " + (isNaN(correct) ? "-" : Math.round(correct) + " %") + "</code>\n";
        }

        return response;
    }
}