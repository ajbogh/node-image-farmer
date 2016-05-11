var request = require('request');

if(!Promise){
    var Promise = require('es6-promise').Promise;
}

//allows images to be downloaded from insecure resources
//we allow this because the images are mime-checked so they should be safe
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var http = {
    getFileHTTP: function getFileHTTP(fileStream, imageUrl){
        console.log("Getting file from url: ", imageUrl);
        return new Promise(function (resolve, reject) {
            request.get({
                uri: imageUrl,
                method: "GET",
                encoding: null,
                agent: false
            }).on('error', function (err){
                console.log("--Request error", err);
                reject(err);
            }).on('data', function(){
                //console.log("--got data");
            }).on('response', function(resp){
                if(resp.statusCode >= 400){
                    console.log("--Unsucccessful response", resp);
                    reject(resp);
                }
            }).pipe(fileStream).on('close', function(){
                console.log("--Request closed");
                resolve(fileStream);
            });
        });
    }
};

module.exports = http;