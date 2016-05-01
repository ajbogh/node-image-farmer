var express = require('express');
var app = express();
var urlDecoder = require('../lib/url-decoder');
var imageFarmer = require('../lib/node-image-farmer');
var security = require('../lib/security');

var smartCrop = true;
var rootPath = "/content/smart";

var appConfig = {
    baseDirectory: '/content/smart',
    port: 3000,
    allowedExtensions : ['png', 'jpg'],
    allowedMimeTypes : [
        "image/jpeg",
        "image/pjpeg",
        "image/gif",
        "image/png"
    ],
    tmpDir : "/tmp/node-image-farmer",
    ttl: (3600 * 24), // cache for 1 day by default.
    tmpCacheTTL: 60 * 30, // 30 minutes by default
    presets: { //all lowercase, one word
        irakli: {
            width: 300,
            height: 520,
            quality: 90
        },
        small : {
            width: 240,
            height: 160,
            quality: 75
        },
        medium : {
            width: 542,
            height: 386,
            quality: 85
        },
        hero : {
            width: 980,
            height: 370,
            quality: 90
        }
    }
};

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
        res.writeHead(200, {
            maxAge: appConfig.ttl || 0
        });
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
        console.log(err);
    });
});

var server = app.listen(appConfig.port, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('node-image-farmer app listening at http://%s:%s%s', host, port, rootPath);
});