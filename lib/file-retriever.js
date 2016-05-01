var fs = require('fs-extra'),
    httpHandler = require('./http-handler'),
    security = require('./security'),
    moment = require('moment'),
    sizeOf = require('image-size'),
    mime = require('mime'),
    gm = require('gm');

var fileRetriever = {
    getFile: function(processOptions, options){
        console.log("Trying to retrieve file...");
        return new Promise(function(resolve, reject){
            console.log("Created placeholder file at " + processOptions.filepath + "...");
            var fileStream = fs.createWriteStream(processOptions.filepath);

            if(options.imageUrl){
                //http
                console.log("Performing HTTP request to " + options.imageUrl  + "...");
                return httpHandler.getFileHTTP(fileStream, options.imageUrl).catch(function(err){
                    console.log("--Couldn't get file from " + options.imageUrl  + "...");
                    console.log("--Trying to clean up placeholder file...");
                    //maybe get rid of the broken file?
                    try {
                        fs.unlinkSync(filepath);
                    }catch(err){}

                    reject({
                        responseCode: 404,
                        message: "Not Found!"
                    });
                    console.log(err);
                }).then(function(data){
                    console.log("--Passing fileSteam back up..");
                    resolve(fileStream);
                });

                //fileStream.on("close", function(){
                //    console.log("--File closed, good to go...");
                //    resolve(fileStream);
                //});

                //fileStream.on("error", function(err){
                //    console.log("--File error", err);
                //    reject({
                //        responseCode: 404,
                //        message: "Not Found!"
                //    });
                //});
            }else{
                console.log("Getting original file from the filesystem...");
                try{
                    var readStream = fs.createReadStream("app/images/"+options.imagePath);

                    readStream.pipe(fileStream);
                    console.log("Returning a copy of the original file...");
                    resolve(fileStream);
                }catch(err){
                    console.log("--Couldn't get the original file from the filesystem...");
                    console.log("--Trying to clean up placeholder file...");
                    try{
                        fs.unlinkSync(processOptions.filepath);
                    }catch(err){}

                    reject({
                        responseCode: 404,
                        message: "Not Found!"
                    });
                }
            }
        });
    },

    getTempFile: function (filePath, options, appConfig){
        return new Promise(function(resolve, reject){
            var modifiedFileSize = {};
            try{
                modifiedFileSize = sizeOf(filePath);
            }catch(err){}

            try {
                var stats = fs.statSync(filePath);
                var fileUnix = moment(stats.mtime).unix();
                var nowUnix = moment().unix();
                var diffUnix = nowUnix - fileUnix;

                //this checks the TTL and the height and width to make sure the picture on disk matches the specifications
                if (diffUnix < appConfig.tmpCacheTTL &&
                    (!options.height || modifiedFileSize.height === options.height) &&
                    (!options.width || modifiedFileSize.width === options.width)) {
                    console.log("Loading existing file from " + filePath + "...");
                    // file is fresh, no need to download/resize etc.
                    var fileType = mime.lookup(filePath);
                    if(security.testMimeType(fileType, appConfig.allowedMimeTypes)){
                        console.log("--mime type OK: ", fileType);
                        resolve(fs.createReadStream(filePath));
                    }else{
                        console.log("--Incorrect mime type", fileType, appConfig.allowedMimeTypes, security.testMimeType(fileType, appConfig.allowedMimeTypes));
                        reject({
                            responseCode: 403,
                            message: "Incorrect mime type or corrupt temp file."
                        });
                    }

                }else{
                    if (diffUnix < appConfig.tmpCacheTTL){
                        console.log("--Temp file is too old.");
                    }else{
                        console.log("--Image dimensions don't match.");
                    }
                    reject();
                }
            } catch (err) {
                console.log("--Couldn't stat file", filePath);
                reject(err);
            }
        });
    },

    getFullFile: function (filepath){
        return new Promise(function(resolve, reject) {
            console.log("Getting full file from " + filepath + "...")
            try {
                // var stats = fs.statSync(filePath);
                // file is fresh, no need to download/resize etc.
                var content = fs.readFileSync(filepath);
                resolve(content);
            } catch (err) {
                reject(err);
            }
        });
    }
};


module.exports = fileRetriever;