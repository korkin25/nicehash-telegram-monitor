import {Request, Response, Router} from "~express/lib/express";

import { ServerDatabase } from "../../database/database";

export class MinerController {
    private static db = ServerDatabase.getInstance();

    constructor(router: Router) {
        router.post("/miner/:account/:miner/ping", this.postPing);
    }

    public postPing(req: Request, res: Response) {
        if (!req.params["account"] || !req.params["account"].match(/[A-z0-9]{34}/)) res.status(400).send({ error: "Account format incorrect" });
        else if (!req.params["miner"] || req.params["miner"].length < 3) res.status(400).send({ error: "Miner format incorrect" });
        else {
            var userMiners: any = null;
            try {
                userMiners = ServerDatabase.getInstance().getData("/tele_user_miners/" + req.params["account"]);
            } catch (err) {
            }
            if (!userMiners) userMiners = [];

            var current: any = null;
            for (var i in userMiners) {
                if (userMiners[i].name == req.params["miner"]) {
                    userMiners[i].lastSeen = new Date();
                    current = userMiners[i];
                    break;
                }
            }

            if (!current) {
                current = {
                    account: req.params["account"],
                    name: req.params["miner"],
                    lastSeen: new Date(),
                    alert: {},
                    created: new Date()
                };
                userMiners.push(current);
            }

            MinerController.db.push("/tele_user_miners/" + req.params["account"], userMiners);

            res.send(current);
        }
    }
}