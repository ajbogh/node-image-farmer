var mime = require('mime'),
    fs = require('fs'),
    gm = require('gm'),
    lockFile    = require('lockfile');

var imageModifier = {
    modifyImage: function (processOptions, options, appConfig){ //callback) {
        console.log("Modifying image...");
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
                    gm(srcPath).identify(function (err, imageData) {
                        if (err) {
                            console.log(err);
                            reject(err);
                        }

                        var origWidth  = imageData.size.width;
                        var origHeight = imageData.size.height;
console.log("Setting up with these options: ", options);
                        //if we have no width or height defines, just output the full size image.
                        if(!options.width && !options.height){
                            options.width = origWidth;
                            options.height = origHeight;
                        }else if(!options.width){
                            //no width specified, calculate from height
                            options.width = imageModifier.ratioCalculator(options.height, origHeight, origWidth)
                        }else if(!options.height){
                            //no height specified, calculate from width
                            options.height = imageModifier.ratioCalculator(options.width, origWidth, origHeight);
                        }
console.log("options are now: ", options);
                        var Canvas = require('canvas'),
                            SmartCrop = require('smartcrop');

                        var img = new Canvas.Image();
                        var canvasOptions = {}; canvasOptions.canvasFactory = function(w, h) { return new Canvas(w, h); };

                        img.src = fs.readFileSync(srcPath);

                        canvasOptions.width = options.width;
                        canvasOptions.height = options.height;
                        canvasOptions.dstPath = dstPath;
                        console.log("Using smartCrop with ", canvasOptions);
                        SmartCrop.crop(img, canvasOptions, function(result) {
                            //console.log(JSON.stringify(result.topCrop, null, '  '));
                            var rt = result.topCrop;

                            lockFile.lock(srcPath + ".lock", lockFileOptions, function(err) {
                                if (err) {
                                    console.log(err);
                                    return reject(err);
                                }
                                console.log("Resizing and writing to " + dstPath + "...");
                                console.log("Cropping to ", rt.width, rt.height, rt.x, rt.y);
                                console.log("Resizing to ", options.width, options.height);
                                gm(srcPath)
                                    .crop(rt.width, rt.height, rt.x, rt.y)
                                    .resize(options.width, options.height, "!")
                                    .gravity('Center')
                                    .quality(options.quality)
                                    .stream(function(err, stdout, stderr){
                                        lockFile.unlock(srcPath + ".lock", function (unlockErr) {
                                            if (unlockErr) {
                                                console.log(unlockErr);
                                                reject(unlockErr);
                                            } else {
                                                if (!err) {
                                                    var writeStream = fs.createWriteStream(dstPath, {
                                                        encoding: 'base64'
                                                    });

                                                    stdout.pipe(writeStream);
                                                    writeStream.on('close', function () {
                                                        resolve();
                                                    });
                                                } else {
                                                    console.log("gm error", err);
                                                    reject(err);
                                                }
                                            }
                                        });
                                    });
                                    //.write(dstPath, function(err){
                                    //    lockFile.unlock(srcPath + ".lock", function (unlockErr) {
                                    //        if (unlockErr) {
                                    //            console.log(unlockErr);
                                    //            reject(unlockErr);
                                    //        }else{
                                    //            if(err){
                                    //                console.log("gm error", err);
                                    //                reject(err);
                                    //            }else{
                                    //                console.log("gm file written");
                                    //                resolve();
                                    //            }
                                    //        }
                                    //    });
                                    //});
                            });
                        });
                    });
                }catch(err){
                    console.log("gm error", err);
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


module.exports = imageModifier;


