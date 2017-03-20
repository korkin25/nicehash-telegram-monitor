/// <reference path="../typings/index.d.ts" />

import {WebServer} from "./web-server/web-server";
import {TelegramBot} from "./telegram-bot/telegram-bot";

var telegramBot = new TelegramBot();
var webServer = new WebServer();
webServer.listen(8080);