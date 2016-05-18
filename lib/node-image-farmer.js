var fileRetriever = require('./file-retriever'),
    imageModifier = require('./image-modifier'),
    mkdirp = require('mkdirp'),
    moment = require('moment'),
    crypto = require('crypto'),
    fs = require('fs');

if(!Promise){
    var Promise = require('es6-promise').Promise;
}


var imageFarmer = {
    /**
     * Return cryptographic hash (defaulting to: "sha1") of a string.
     *
     * @param {String} str
     * @param {String} algo - Algorithm used for hashing, defaults to sha1
     * @param {String} encoding - defaults to hex
     * @return {String}
     */
    hash: function(str, algo, encoding) {
        return crypto
            .createHash(algo || 'sha1')
            .update(str)
            .digest(encoding || 'hex');
    },

    processOptions: function(options, appConfig){
        var hashedName = imageFarmer.hash(options.originalUrl); // This is to be safe, in case somebody uses risky encodeFn
        var hashedOriginalName = imageFarmer.hash(options.imageUrl || options.imagePath); // We prefer the imageUrl above imagePath if it's defineed
        var imagePreset = ( options.preset || "full" );
        var preset = (imagePreset ? "-" + imagePreset : "");
        var targetDir = appConfig.tmpDir + '/'+( imagePreset || "full" );
        var fullDir = appConfig.tmpDir + '/full';
        var filepath = fullDir + '/' + hashedOriginalName + "." + options.extension;
        var modifiedFilePath = targetDir + '/' + hashedName + preset + "." + options.extension;

        var processOptions = {
            filepath: filepath,
            modifiedFilePath: modifiedFilePath,
            fullDir: fullDir,
            targetDir: targetDir,
            preset: imagePreset,
            hashedOriginalName: hashedOriginalName,
            hashedName: hashedName
        };

        console.log("-----------------STARTING FARMING PROCESS-------------------");

        return imageFarmer.createDirectories(options, appConfig).then(function(){
            console.log("Directories created...");
            // see if we can serve the file from file cache, if ttl has not yet expired
            var fileStream = null;
            if (appConfig.tmpCacheTTL > 0) {
                console.log("tmpCacheTTL is being used...");
                return imageFarmer.tempProcess(fileStream, processOptions, options, appConfig);
            }else {
                return imageFarmer.fullProcess(fileStream, processOptions, options, appConfig);
            }
        });
    },

    fullProcess: function(fileStream, processOptions, options, appConfig){
        console.log("Trying to get full file...");
        return new Promise(function(resolve, reject){
            fileRetriever.getFullFile(processOptions.filepath, appConfig).then(function(){
                console.log("Got full file, modifying image...");
                //process full file
                //pass the raw filestream to another function maybe?
                if(appConfig.useMultipleProcesses){
                    console.log("--Using multiple processes...");
                    return imageModifier.modifyImageProcess(processOptions, options, appConfig);
                }else{
                    return imageModifier.modifyImage(processOptions, options, appConfig);
                }
            }).then(function(){
                console.log("Image modification is complete, getting the temp file...");
                //send temp file
                resolve(fileRetriever.getTempFile(processOptions.modifiedFilePath, options, appConfig));
            }).catch(function(err){
                console.log("--Couldn't get full file, trying actual...");
                //can't get the full file, try the actual file
                fileRetriever.getFile(processOptions, options).then(function(fileStream){
                    console.log("--Got actual file...");
                    //resize file
                    if(appConfig.useMultipleProcesses){
                        console.log("--Using multiple processes...");
                        return imageModifier.modifyImageProcess(processOptions, options, appConfig);
                    }else{
                        return imageModifier.modifyImage(processOptions, options, appConfig);
                    }
                }).then(function(){
                    console.log("--Using temp file...");
                    resolve(fileRetriever.getTempFile(processOptions.modifiedFilePath, options, appConfig));
                }).catch(function(err){
                    console.log("Failed to process file.", err);
                    reject(err);
                });
            });
        });
    },

    tempProcess: function(fileStream, processOptions, options, appConfig){
        console.log("Trying to get temp file...");
        return fileRetriever.getTempFile(processOptions.modifiedFilePath, options, appConfig).catch(function(){
            console.log("--Couldn't get temp file...");
            return imageFarmer.fullProcess(fileStream, processOptions, options, appConfig);
        });
    },


    createDirectories: function(options, appConfig){
        return new Promise(function(resolve, reject){
            console.log(options.preset);
            var targetDir = appConfig.tmpDir + '/'+( options.preset || "full" );
            var fullDir = appConfig.tmpDir + '/full';

            // create the full directory
            mkdirp(fullDir, function (err) {
                if (err) {
                    err.responseCode = 500;
                    reject(err);
                }else{
                    //we can chain these because we want the full folder before the preset folder anyway.
                    mkdirp(targetDir, function (err) {
                        if (err) {
                            err.responseCode = 500;
                            reject(err);
                        }else {
                            resolve();
                        }
                    });
                }
            });


        });
    }
};

module.exports = imageFarmer;