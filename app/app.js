var express = require('express');
var app = express();
var urlDecoder = require('../lib/url-decoder');
var imageFarmer = require('../lib/node-image-farmer');
var security = require('../lib/security');
var debug = require('debug')('node-image-farmer');
var fs = require('fs');
var appConfig = JSON.parse(fs.readFileSync(__dirname + '/../config/appConfig.json', 'utf8'));
var argv = require('minimist')(process.argv.slice(2));

//set the process name
if(argv["_"] && argv["_"].length > 0) {
    process.title = argv["_"][0];
}

var extensionMimeMapping = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    png: 'image/png'
}

app.get(appConfig.baseDirectory+"/*", function (req, res) {
    //decode URL
    var urlOptions = urlDecoder.processRequest(req, appConfig.presets);

    //ensure the correct file extension
    if(!security.testExtension(urlOptions.extension, appConfig.allowedExtensions)){
        res.writeHead(403);
        res.end('Forbidden File Extension! \n\nAllowed: '+JSON.stringify(appConfig.allowedExtensions)+"\nInput: "+urlOptions.extension);
        return;
    }

    imageFarmer.processOptions(urlOptions, appConfig).then(function(fileStream){
        //send the file stream now
        var responseHeaders = {
            maxAge: appConfig.browserTTL || 0
        };
        responseHeaders['Content-Type'] = extensionMimeMapping[urlOptions.extension.toLowerCase()] ? extensionMimeMapping[urlOptions.extension.toLowerCase()] : 'text/plain';

        res.writeHead(200, responseHeaders);
        fileStream.pipe(res);
    }).catch(function(err){
        if(err.responseCode){
            res.writeHead(err.responseCode);
        }else{
            //default is not found
            res.writeHead(401);
        }
        debug(err);
        res.end(err.message);
    });
});

var server = app.listen(argv.port || appConfig.port, function () {
    var host = server.address().address;
    var port = server.address().port;

    const message = 'node-image-farmer listening at http://%s:%s%s'
    console.log(message, host, port, appConfig.baseDirectory);
    debug(message, host, port, appConfig.baseDirectory);
});

// Do graceful shutdown
function shutdown(type) {
    console.log(`node-image-farmer: ${type} signal received: closing HTTP server`);
    server.close(() => {
        console.log('node-image-farmer: HTTP server closed')
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('exit', () => shutdown('exit'));
