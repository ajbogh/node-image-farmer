var axios = require('request'),
    debug = require('debug')('node-image-farmer');

//allows images to be downloaded from insecure resources
//we allow this because the images are mime-checked so they should be safe
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var http = {
    getFileHTTP: function getFileHTTP(fileStream, imageUrl){
        debug("Getting file from url: ", imageUrl);
        return new Promise(function (resolve, reject) {
            request.get({
                uri: imageUrl,
                method: "GET",
                encoding: null,
                agent: false
            }).on('error', function (err){
                debug("--Request error", err.message);
                reject(err);
            }).on('data', function(){
                //debug("--got data");
            }).on('response', function(resp){
                if(resp.statusCode >= 400){
                    debug("--Unsucccessful response", resp.statusCode, resp.statusMessage);
                    reject(resp);
                }
            }).pipe(fileStream).on('close', function(){
                debug("--Request closed");
                resolve(fileStream);
            });
        });
    }
};

module.exports = http;