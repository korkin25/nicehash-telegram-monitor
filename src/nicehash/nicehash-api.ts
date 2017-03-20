import request = require("request");

export enum NicehashAlgorithms {
    Scrypt,
    SHA256,
    ScryptNf,
    X11,
    X13,
    Keccak,
    X15,
    Nist5,
    NeoScrypt,
    Lyra2RE,
    WhirlpoolX,
    Qubit,
    Quark,
    Axiom,
    Lyra2REv2,
    ScryptJaneNf16,
    Blake256r8,
    Blake256r14,
    Blake256r8vnl,
    Hodl,
    DaggerHashimoto,
    Decred,
    CryptoNight,
    Lbry,
    Equihash,
    Pascal,
    X11Gost
};

export class NicehashAPI {
    private static readonly base_url: string = "https://www.nicehash.com/api";

    public static StatsProvider(address: string) : Promise<any> {
        return new Promise((accept, reject) => {
            request(NicehashAPI.base_url + "?method=stats.provider&addr=" + address, (error, response, body) => {
                if (error || response.statusCode != 200) reject(error);
                else {
                    try {
                        body = JSON.parse(body);
                        for (var i in body.result.stats) {
                            body.result.stats[i].algo = NicehashAlgorithms[Number(body.result.stats[i].algo)];
                            body.result.stats[i].balance = Number(body.result.stats[i].balance);
                            body.result.stats[i].rejected_speed = Number(body.result.stats[i].rejected_speed);
                            body.result.stats[i].accepted_speed = Number(body.result.stats[i].accepted_speed);
                        }
                        accept(body.result);
                    } catch (err) { reject(err); }
                }
            });
        });
    }
}