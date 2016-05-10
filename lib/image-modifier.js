var mime = require('mime'),
    fs = require('fs'),
    gm = require('gm'),
    lockFile    = require('lockfile');

var imageModifier = {
    modifyImage: function (processOptions, options, appConfig){ //callback) {
        //console.log("Modifying image...");
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
                    //console.log("Trying to identify image...");
                    gm(srcPath).identify(function (err, imageData) {
                        if (err || !(imageData && imageData.size && imageData.size.width)) {
                            //console.log("--Couldn't get image information", err);
                            reject(err);
                            return;
                        }

                        var origWidth  = imageData.size.width;
                        var origHeight = imageData.size.height;
                        //console.log("Setting up with these options: ", options);
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
                        //console.log("options are now: ", options);
                        var Canvas = require('canvas'),
                            SmartCrop = require('smartcrop');

                        var img = new Canvas.Image();
                        var canvasOptions = {}; canvasOptions.canvasFactory = function(w, h) { return new Canvas(w, h); };

                        img.src = fs.readFileSync(srcPath);

                        canvasOptions.width = options.width;
                        canvasOptions.height = options.height;
                        if(options.minScale){
                            canvasOptions.minScale = options.minScale;
                        }
                        canvasOptions.dstPath = dstPath;
                        //console.log("Using smartCrop with ", canvasOptions);
                        SmartCrop.crop(img, canvasOptions, function(result) {
                            //console.log(JSON.stringify(result.topCrop, null, '  '));
                            var rt = result.topCrop;

                            lockFile.lock(srcPath + ".lock", lockFileOptions, function(err) {
                                if (err) {
                                    //console.log(err);
                                    return reject(err);
                                }
                                //console.log("Resizing and writing to" + dstPath + "...");
                                //console.log("Cropping to", rt.width, rt.height, rt.x, rt.y);
                                //console.log("Resizing to", options.width, options.height);
                                //console.log("Source path: "+srcPath);
                                gm(srcPath)
                                    .crop(rt.width, rt.height, rt.x, rt.y)
                                    .resize(options.width, options.height, "!")
                                    .gravity('Center')
                                    .quality(options.quality)
                                    .stream(function(err, stdout, stderr){
                                        //console.log("--unlocking file");
                                        lockFile.unlock(srcPath + ".lock", function (unlockErr) {
                                            if (unlockErr) {
                                                //console.log(unlockErr);
                                                reject(unlockErr);
                                            } else {
                                                if (!err) {
                                                    //console.log("--Writing file stream to "+dstPath);
                                                    var writeStream = fs.createWriteStream(dstPath);

                                                    stdout.pipe(writeStream);
                                                    writeStream.on('close', function () {
                                                        resolve(dstPath);
                                                    });
                                                } else {
                                                    //console.log("gm error", err);
                                                    reject(err);
                                                }
                                            }
                                        });
                                    });
                            });
                        });
                    });
                }catch(err){
                    console.log("gm error", err);
                    reject(err);
                }
            }else{
                var err = {
                    responseCode: 403,
                    message: "Incorrect Mime Type!"
                };
                console.log(err, fileType);
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
                console.log("-------------"+data);
                var out = (""+data).replace(/\n$/, '');
                try {
                    out = JSON.parse(out);
                }catch(err){}

                if(out.dstPath){
                    resolved = true;
                    resolve(out.dstPath);
                }else{
                    console.log(out);
                    resolved = true;
                    reject(out);
                }
            });

            // Listen for an exit event:
            child.on('error', function (err) {
                if(err){
                    console.log("--child error", err);
                    reject(err);
                }
            });

            // Listen for an exit event:
            child.on('exit', function (exitCode) {
                if(!resolved){
                    console.log("--Not resolved, aborting child");
                    reject(exitCode);
                }
                console.log("Child exited with code: " + exitCode);
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
    processOptions = JSON.parse(runOptions.processOptions);
    options = JSON.parse(runOptions.options);
    appConfig = JSON.parse(runOptions.appConfig);

    imageModifier.modifyImage(processOptions, options, appConfig).then(function(dstPath){
        console.log(JSON.stringify({ dstPath: dstPath }));

    }).catch(function(err){
        console.log(JSON.stringify({
            responseCode: 404,
            message: err
        }));
    });
}

module.exports = imageModifier;


