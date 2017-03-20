import JsonDB = require("node-json-db");

export class ServerDatabase {
    private static _database: JsonDB = new JsonDB("../serverDb", true, false);

    public static getInstance(): JsonDB
    {
        return ServerDatabase._database;
    }
}