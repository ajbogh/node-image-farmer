var express = require('express');
var app = express();
var thumbs = require('../lib/node-image-farmer')

var smartCrop = true;
var rootPath = "/content/smart";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.use(thumbs({
    smartCrop: smartCrop,
    useIM: false, //false use ImageMagick
    ttl : 7200, //7200 HTTP header TTL for client cache = 2 hours
    tmpCacheTTL : 86400, //86400 seconds = 24 hours
    tmpDir : "/tmp/node-image-farmer",
    allowedExtensions : ['png', 'jpg'],
    rootPath: rootPath,
    presets: {
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
    },

}));

app.get('/', function (req, res) {
    res.send('Hello World!');
});

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('node-image-farmer app listening at http://%s:%s%s', host, port, rootPath);
});