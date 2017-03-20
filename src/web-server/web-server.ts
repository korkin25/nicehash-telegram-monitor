import methodOverride = require("method-override");

import * as bodyParser from "body-parser";
import * as Express from "express";
import {MinerController} from "./controllers/miner";

export class WebServer {
    public app: Express.Application;
    constructor() {
        this.app = Express();

        // Configuration
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));
        this.app.use(methodOverride());

        // Controllers
        var router = Express.Router();

        new MinerController(router);

        this.app.use("/", router);
    }

    listen(port: number) {
        this.app.listen(port, () => {
            console.log("Server listening on port: " + port);
        });
    }
}