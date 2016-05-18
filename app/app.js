var express = require('express');
var app = express();
var urlDecoder = require('../lib/url-decoder');
var imageFarmer = require('../lib/node-image-farmer');
var security = require('../lib/security');
var debug = require('debug')('node-image-farmer');
var fs = require('fs');
var appConfig = JSON.parse(fs.readFileSync(__dirname + '/../config/appConfig.json', 'utf8'));

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
            res.end(err.message);
        }else{
            //defualt is not found
            res.writeHead(401);
            res.end(err);
        }
        debug(err);
    });
});

var server = app.listen(appConfig.port, function () {
    var host = server.address().address;
    var port = server.address().port;

    debug('node-image-farmer app listening at http://%s:%s%s', host, port, appConfig.baseDirectory);
});