var express = require('express');
var app = express();
var urlDecoder = require('../lib/url-decoder');
var imageFarmer = require('../lib/node-image-farmer');
var security = require('../lib/security');
var debug = require('debug')('node-image-farmer');

var appConfig = {
    baseDirectory: '/content/smart',
    port: 3000,
    allowedExtensions : ['png', 'gif', 'jpg'],
    allowedMimeTypes : [
        "image/jpeg",
        "image/pjpeg",
        "image/gif",
        "image/png"
    ],
    tmpDir : "/tmp/node-image-farmer",
    browserTTL: (3600 * 24), // cache for 24 hours by default
    tmpCacheTTL: 60 * 30, // 30 minutes by default
    fullFileTTL: (3600 * 24), // refresh the full file copy after 24 hours
    useMultipleProcesses: true, //Uses all available cores to process long image requests
    presets: { //all lowercase, one word
        irakli: {
            width: 300,
            height: 520,
            quality: 90
        },
        small : {
            width: 240,
            height: 160,
            quality: 75,
            minScale: 0.6
        },
        medium : {
            width: 542,
            height: 386,
            quality: 85,
            minScale: 0.8
        },
        hero : {
            width: 980,
            height: 370,
            quality: 90
        }
    }
};

var extensionMimeMapping = {
    jpg: 'image/jpeg',
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
        responseHeaders['Content-Type'] = extensionMimeMapping[urlOptions.extension] ? extensionMimeMapping[urlOptions.extension] : 'text/plain';

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