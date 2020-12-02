var mime = require('mime'),
    fs = require('fs'),
    gm = require('gm'),
    lockFile    = require('lockfile'),
    debug = require('debug')('node-image-farmer:image-modifier');

var { Image, createCanvas } = require('canvas');
var SmartCrop = require('smartcrop');

var imageModifier = {
    modifyImage: function (processOptions, options, appConfig, isChildProcess){
        debug('--Within modifyImage');
        if(!isChildProcess){ debug("Modifying image..."); }
        return new Promise(function(resolve, reject){
            debug('--Within modifyImage promise');
            var srcPath = processOptions.filepath;
            var dstPath = processOptions.modifiedFilePath;

            var lockFileOptions = {
                wait: 1000,
                stale: 10000,
                retries: 3,
                retryWait: 250
            };

            var fileType = mime.lookup(srcPath);
            if(appConfig.allowedMimeTypes.indexOf(fileType) > -1){
                try {
                    debug("Trying to identify image...");
                    // if(!isChildProcess){ debug("Trying to identify image..."); }
                    gm(srcPath).identify(function (err, imageData) {
                        debug('Identified image', err, { size } = imageData);
                        if (err || !(imageData && imageData.size && imageData.size.width)) {
                            if(!isChildProcess){ debug("--Couldn't get image information", err); }
                            reject(err);
                            return;
                        }

                        var origWidth  = imageData.size.width;
                        var origHeight = imageData.size.height;
                        if(!isChildProcess){ debug("Setting up with these options: ", JSON.stringify(options, null, 2)); }
                        //if we have no width or height defines, just output the full size image.
                        if(!options.width && !options.height){
                            options.width = origWidth;
                            options.height = origHeight;
                        }else if(!options.width){
                            //no width specified, calculate from height
                            options.width = imageModifier.ratioCalculator(options.height, origHeight, origWidth);
                        }else if(!options.height){
                            //no height specified, calculate from width
                            options.height = imageModifier.ratioCalculator(options.width, origWidth, origHeight);
                        }
                        if(!isChildProcess){ debug("options are now: ", options); }

                        var img = new Image();
                        var canvasOptions = {}; canvasOptions.canvasFactory = function(w, h) { return createCanvas(w, h); };

                        img.src = fs.readFileSync(srcPath);

                        canvasOptions.width = options.width;
                        canvasOptions.height = options.height;
                        if(options.minScale){
                            canvasOptions.minScale = options.minScale;
                        }
                        canvasOptions.dstPath = dstPath;
                        if(!isChildProcess){ debug("Using smartCrop with ", canvasOptions); }
                        SmartCrop.crop(img, canvasOptions, function(result) {
                            if(!isChildProcess){ debug(JSON.stringify(result.topCrop, null, 2)); }
                            var rt = result.topCrop;

                            lockFile.lock(srcPath + ".lock", lockFileOptions, function(err) {
                                if (err) {
                                    console.log(err);
                                    return reject(err);
                                }
                                if(!isChildProcess){ debug("Resizing and writing to" + dstPath + "..."); }
                                if(!isChildProcess){ debug("Cropping to", rt.width, rt.height, rt.x, rt.y); }
                                if(!isChildProcess){ debug("Resizing to", options.width, options.height); }
                                if(!isChildProcess){ debug("Source path: "+srcPath); }
                                gm(srcPath)
                                    .crop(rt.width, rt.height, rt.x, rt.y)
                                    .resize(options.width, options.height, "!")
                                    .gravity('Center')
                                    .quality(options.quality)
                                    .stream(function(err, stdout, stderr){
                                        if(!isChildProcess){ debug("--unlocking file"); }
                                        lockFile.unlock(srcPath + ".lock", function (unlockErr) {
                                            if (unlockErr) {
                                                if(!isChildProcess){ debug(unlockErr); }
                                                reject(unlockErr);
                                            } else {
                                                if (!err) {
                                                    if(!isChildProcess){ debug("--Writing file stream to "+dstPath); }
                                                    var writeStream = fs.createWriteStream(dstPath);

                                                    stdout.pipe(writeStream);
                                                    writeStream.on('close', function () {
                                                        resolve(dstPath);
                                                    });
                                                } else {
                                                    if(!isChildProcess){ debug("gm error", err); }
                                                    reject(err);
                                                }
                                            }
                                        });
                                    });
                            });
                        });
                    });
                }catch(err){
                    if(!isChildProcess){ debug("gm error", err); }
                    reject(err);
                }
            }else{
                var err = {
                    responseCode: 403,
                    message: "Incorrect Mime Type!"
                };
                if(!isChildProcess){ debug(err, fileType); }
                reject(err);
            }
        });
    },

    modifyImageProcess: function(processOptions, options, appConfig){
        return new Promise(function(resolve, reject){
            debug("Spawning child image-modifier process");
            var spawn = require('child_process').spawn;
            var resolved = false;
            var env = {
                processOptions: JSON.stringify(processOptions),
                options: JSON.stringify(options),
                appConfig: JSON.stringify(appConfig)
            };

            var params = [
                __dirname+'/image-modifier.js',
                'processOptions', env.processOptions,
                'options', env.options,
                'appConfig', env.appConfig
            ];

            debug('Using the following command:', 'node', params.join(' '));

            var child = spawn('node',
                params
            );

            // Listen for stdout data
            child.stdout.on('data', function (data) {
                debug('got data', ""+data);
                var out = (""+data).replace(/\n$/, '');
                try {
                    out = JSON.parse(out);
                }catch(err){
                    debug('JSON.parse had an error', out);
                }

                if(out.dstPath){
                    resolved = true;
                    resolve(out.dstPath);
                }else{
                    resolved = true;
                    debug('out.dstPath is not defined', out);
                    reject(out);
                }
            });

            // Listen for stdout data
            child.stderr.on('data', function (data) {
                debug('got err data');
                var out = (""+data).replace(/\n$/, '');
                try {
                    out = JSON.parse(out);
                }catch(err){
                    debug('JSON.parse had an error', out);
                }

                
                debug('stderr data:', out);
            });

            // Listen for an exit event:
            child.on('error', function (err) {
                debug('got error');
                if(err){
                    debug("Child process error:", err);
                    reject(err);
                }
            });

            // Listen for an exit event:
            child.on('exit', function (exitCode) {
                debug('got exit');
                if(!resolved){
                    debug("Child process exited:", exitCode);
                    reject(exitCode);
                }
            });
        });
    },

    /**
     * Detect targetHeight for a proportional resizing, when only width is indicated.
     *
     * @param targetWidth
     * @param origWidth
     * @param origHeight
     */
    ratioCalculator: function (targetKnown, origTargetKnownEquiv, origTargetUnknownEquiv) {
        return origTargetUnknownEquiv * targetKnown / origTargetKnownEquiv;
    }
};

//Check to see if we've been executed as a process
var runOptions = {};
for(var i = 0; i < process.argv.length; i++){
    if(['processOptions', 'options', 'appConfig'].indexOf(process.argv[i]) > -1){
        runOptions[process.argv[i]] = process.argv[i+1];
    }
}
if(runOptions.processOptions){
    debug("processOptions is defined");
    var processOptions = {};
    try {
        processOptions = JSON.parse(runOptions.processOptions);
    } catch(e) {
        debug('Could not parse processOptions', runOptions.processOptions, e);
    }

    var options = {};
    try {
        options = JSON.parse(runOptions.options);
    } catch(e) {
        debug('Could not parse options', runOptions.options, e);
    }

    var appConfig = {};
    try {
        appConfig = JSON.parse(runOptions.appConfig);
    } catch(e) {
        debug('Could not parse appConfig', runOptions.appConfig, e);
    }
    
    debug("Calling imageModifier.modifyImage");
    imageModifier.modifyImage(processOptions, options, appConfig, true).then(function(dstPath){
        console.log(JSON.stringify({ dstPath: dstPath }));

    }).catch(function(err){
        console.log(JSON.stringify({
            responseCode: 404,
            message: err
        }));
    });
} else {
    debug("processOptions is not defined", runOptions);
}

module.exports = imageModifier;


