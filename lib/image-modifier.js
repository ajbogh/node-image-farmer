var mime = require('mime'),
    fs = require('fs'),
    gm = require('gm'),
    lockFile    = require('lockfile'),
    debug = require('debug')('node-image-farmer:image-modify');

var Canvas = require('canvas');
var SmartCrop = require('smartcrop');

if(!Promise){
    var Promise = require('es6-promise').Promise;
}

var imageModifier = {
    modifyImage: function (processOptions, options, appConfig, isChildProcess){
        if(!isChildProcess){ debug("Modifying image..."); }
        return new Promise(function(resolve, reject){
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
                    if(!isChildProcess){ debug("Trying to identify image..."); }
                    gm(srcPath).identify(function (err, imageData) {
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

                        var img = new Canvas.Image();
                        var canvasOptions = {}; canvasOptions.canvasFactory = function(w, h) { return new Canvas(w, h); };

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
            var spawn = require('child_process').spawn;
            var resolved = false;
            var env = {
                processOptions: JSON.stringify(processOptions),
                options: JSON.stringify(options),
                appConfig: JSON.stringify(appConfig)
            };

            var child = spawn('node',
                [
                    __dirname+'/image-modifier.js',
                    'processOptions', env.processOptions,
                    'options', env.options,
                    'appConfig', env.appConfig
                ]
            );

            // Listen for stdout data
            child.stdout.on('data', function (data) {
                var out = (""+data).replace(/\n$/, '');
                try {
                    out = JSON.parse(out);
                }catch(err){}

                if(out.dstPath){
                    resolved = true;
                    resolve(out.dstPath);
                }else{
                    resolved = true;
                    reject(out);
                }
            });

            // Listen for an exit event:
            child.on('error', function (err) {
                if(err){
                    reject(err);
                }
            });

            // Listen for an exit event:
            child.on('exit', function (exitCode) {
                if(!resolved){
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
    var processOptions = JSON.parse(runOptions.processOptions);
    var options = JSON.parse(runOptions.options);
    var appConfig = JSON.parse(runOptions.appConfig);

    imageModifier.modifyImage(processOptions, options, appConfig, true).then(function(dstPath){
        console.log(JSON.stringify({ dstPath: dstPath }));

    }).catch(function(err){
        console.log(JSON.stringify({
            responseCode: 404,
            message: err
        }));
    });
}

module.exports = imageModifier;


