const fs = require('fs-extra');
const httpHandler = require('./http-handler');
const security = require('./security');
const moment = require('moment');
const sizeOf = require('image-size');
const mime = require('mime');
const gm = require('gm');
const debug = require('debug')('node-image-farmer');
const argv = require('minimist')(process.argv.slice(2));
const path = require('path');

var fileRetriever = {
    getFile: function(processOptions, options, appConfig){
        debug("Trying to retrieve file...");
        return new Promise(function(resolve, reject){
            debug("Created placeholder file at " + processOptions.filepath + "...");
            var fileStream = fs.createWriteStream(processOptions.filepath);

            if(options.imageUrl){
                //http
                debug("Performing HTTP request to " + options.imageUrl  + "...");
                return httpHandler.getFileHTTP(fileStream, options.imageUrl).catch(function(err){
                    debug("--Couldn't get file from " + options.imageUrl  + "...", err);
                    debug("--Trying to clean up placeholder file...");
                    //maybe get rid of the broken file?
                    try {
                        fs.unlinkSync(processOptions.filepath);
                    }catch(err){}

                    reject({
                        responseCode: 404,
                        message: `Not Found! Couldn't retrieve the file from ${options.imageUrl}`
                    });
                }).then(function(data){
                    debug("--Passing fileStream back up..");
                    resolve(fileStream);
                });
            }else{
                debug("Getting original file from the filesystem...");
                try{
                    const imagesDirectory = path.resolve(`${__dirname}/../app/${argv.imageDirectory || appConfig.imageDirectory || 'images'}/${options.imagePath}`);
                    var readStream = fs.createReadStream(imagesDirectory);
                    readStream.pipe(fileStream);

                    readStream.on('end', () => {
                        debug("Returning a copy of the original file...");
                        resolve(fileStream);
                    });
                    
                    readStream.on('error', function (error) {
                        debug("Caught", error);
                        try{
                            fs.unlinkSync(processOptions.filepath);
                        }catch(err){}

                        reject({
                            responseCode: 404,
                            message: "Not Found! Couldn't read the file."
                        });
                    });
                }catch(err){
                    debug("--Couldn't get the original file from the filesystem...");
                    debug("--Trying to clean up placeholder file...");
                    try{
                        fs.unlinkSync(processOptions.filepath);
                    }catch(err){}

                    reject({
                        responseCode: 404,
                        message: "Not Found! Couldn't read the file."
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
                if (!appConfig.tmpCacheTTL || (appConfig.tmpCacheTTL && diffUnix < appConfig.tmpCacheTTL) &&
                    (!options.height || modifiedFileSize.height === options.height) &&
                    (!options.width || modifiedFileSize.width === options.width)) {
                    debug("Loading existing file from " + filePath + "...");
                    // file is fresh, no need to download/resize etc.
                    var fileType = mime.lookup(filePath);
                    if(security.testMimeType(fileType, appConfig.allowedMimeTypes)){
                        debug("--mime type OK: ", fileType);
                        resolve(fs.createReadStream(filePath));
                    }else{
                        debug("--Incorrect mime type", fileType, appConfig.allowedMimeTypes, security.testMimeType(fileType, appConfig.allowedMimeTypes));
                        reject({
                            responseCode: 403,
                            message: "Incorrect mime type or corrupt temp file."
                        });
                    }

                }else{
                    if (diffUnix < appConfig.tmpCacheTTL){
                        debug("--Temp file is too old.");
                    }else{
                        debug("--Image dimensions don't match.");
                    }
                    reject();
                }
            } catch (err) {
                debug("--Couldn't stat file", filePath);
                reject(err);
            }
        });
    },

    getFullFile: function (filepath, appConfig){
        debug("--getting full file...");
        return new Promise(function(resolve, reject) {
            try {
                debug("--trying to stat path...");
                var stats = fs.statSync(filepath);
                debug("--got the stats...");
                var fileUnix = moment(stats.mtime).unix();
                var nowUnix = moment().unix();
                var diffUnix = nowUnix - fileUnix;
                debug("--calculated the time difference...");

                //this checks the TTL
                if (!appConfig.fullFileTTL || (appConfig.fullFileTTL && diffUnix < appConfig.fullFileTTL)) {
                    debug("Getting full file from " + filepath + "...");
                    try {
                        // var stats = fs.statSync(filePath);
                        // file is fresh, no need to download/resize etc.
                        debug("--Reading full file from disk...");
                        var content = fs.readFileSync(filepath);
                        resolve(content);
                    } catch (err) {
                        debug("--Error reading full file from disk...");
                        reject(err);
                    }
                }else{
                    debug("--File TTL not good enough, rejecting...");
                    reject(err);
                }
            } catch (err) {
                debug("--Couldn't stat file", filepath);
                reject(err);
            }
        });
    }
};


module.exports = fileRetriever;