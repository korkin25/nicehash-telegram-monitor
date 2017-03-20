var exec = require('child_process').exec;
var http = require("http");
var config = require("./config.json");

var process = exec('NiceHashMiner.exe', function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
        console.log('exec error: ' + error);
    }
});

var requestPath = "/miner/" + config.bitcoin + "/" + config.name + "/ping";
var requestOptions = {
    hostname: config.server.host,
    port: config.server.port,
    path: requestPath,
    method: "POST"
};

var updateRequest = function() {
    console.log("[Nicehash Monitor] Ejecutando actualización");
    console.log("[POST] http://" + config.server.host + ":" + config.server.port + requestPath + ").");
    try {
        var request = http.request(requestOptions);
        request.end();
        request.on("response", function (incomingMessage) {
            incomingMessage.on("readable", function () {
                var message = incomingMessage.read();
                console.log("[Nicehash Monitor] Actualización completada.");
            });
        });
        request.on("error", function(err) {
            console.error("[Nicehash Monitor] Ha fallado la actualización. Comprueba la conexión.");
        });
    }
    catch (err) {
        console.error("[Nicehash Monitor] Ha fallado la actualización. Comprueba la conexión.");
    }
};

updateRequest();
setInterval(updateRequest, config.interval * 1000);