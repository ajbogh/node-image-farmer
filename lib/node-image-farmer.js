if (!module.parent) { console.log("Please don't call me directly. I am just the main app's minion."); process.exit(1); }

// example:
// http://example.com/thumbs/small/hashcode.jpeg

var ttl
  , tmpCacheTTL
  , tmpDir
  , presets
  , decodeFn
  //, pauser
  , regexp  = '';

var mkdirp    = require('mkdirp')
  , moment    = require('moment')
  , request   = require('request')
  , path      = require('path')
  , fs        = require('fs')
  , send      = require('send')
  //, pause      = require('pause')
  , crypto    = require('crypto')
  , lockFile = require('lockfile')
  , gm        = require('gm');

// @TODO: make imagemagick configurable in case paths are not defaults
// (maybe they can pass-in the imagemagick instance they want to use)

exports = module.exports = function (opts) {

  opts = opts || {};
  parseOptions(opts);

  if (opts.useIM) {
    gm = gm.subClass({imageMagick: true});
  }

  return function thumbs(req, res, next) {

    if ('GET' !== req.method && 'HEAD' !== req.method) { return next(); }
    //pauser = pause(req);

    function resume(runNext) {
      if (runNext) { next(); }
      //pauser.resume();
    }

    // Is this a request to a thumbnail image?
    var thumbRequestParts = req.originalUrl.match(regexp);
    var queryParams = req.query;

    if (!thumbRequestParts) {
      return resume(true);
    }

    var imagePreset = thumbRequestParts[1];

    if(!presets[imagePreset]){
      imagePreset = "";
    }

    var encodedImageURL = queryParams.base64;

    var useFilesystem = true;
    if(!encodedImageURL){
      encodedImageURL = thumbRequestParts[2];
      decodeFn = function(originalFilePath, callback){
        var ext = path.extname(thumbRequestParts[0]);
        callback(null, originalFilePath+ext);
      }
    }else{
      useFilesystem = false;
    }

    // Pre-declare variables that will be initialized in the decoder closure
    var filepath, fileStream, modifiedFilePath, preset;

    decodeFn(encodedImageURL, function imageURLDecoding(err, decodedImageURL) {
      //-- Start creating and serving a thumbnail
      var targetDir = tmpDir + '/'+( imagePreset || "full" );
      var fullDir = tmpDir + '/full';

      // create the full directory
      mkdirp(fullDir, function (err) {
        if (err) {
          res.writeHead(500);
          res.end('tmpDir not writable!');
          console.log(err);
          return resume(false);
        }
      });

      mkdirp(targetDir, function (err) {
        if (err) {
          res.writeHead(500);
          res.end('tmpDir not writable!');
          console.log(err);
          return resume(false);
        }

        processFile();

      });

      function processFile() {
        var ext = path.extname(decodedImageURL);

        var hashedName = hash(decodedImageURL); // This is to be safe, in case somebody uses risky encodeFn
        preset = (imagePreset ? "-" + imagePreset : "");
        filepath = fullDir + '/' + hashedName + ext;
        modifiedFilePath = targetDir + '/' + hashedName + preset + ext;

        // see if we can serve the file from file cache, if ttl has not yet expired
        if (tmpCacheTTL > 0) {
          try {
            var stats = fs.statSync(modifiedFilePath);
            var fileUnix = moment(stats.mtime).unix();
            var nowUnix = moment().unix();
            var diffUnix = nowUnix - fileUnix;

            if (diffUnix < tmpCacheTTL) { // file is fresh, no need to download/resize etc.
              var maxAge = ttl || 0;
              send(req, modifiedFilePath, {maxAge: maxAge})
                  .pipe(res);

              return resume(false);
            }
          } catch (err) {
            // no action necessary, just continue with normal flow
          }
        }

        fileStream = fs.createWriteStream(filepath);

        if(!useFilesystem){
          request.get(decodedImageURL).on('error', function (err){
            //console.log(err);
            res.writeHead(404);
            res.end("Not Found!");
            return resume(false);
          }).pipe(fileStream);
        } else {
          //pull image from file system
          var readStream = fs.createReadStream("app/images/"+decodedImageURL);

          // This will wait until we know the readable stream is actually valid before piping
          readStream.on('open', function () {
            // This just pipes the read stream to the response object (which goes to the client)
            readStream.pipe(fileStream);
          });

          // This catches any errors that happen while creating the readable stream (usually invalid names)
          readStream.on('error', function(err) {
            console.log(err);
            res.writeHead(404);
            res.end("Not Found!");
            return resume(false);
          });
        }


        fileStream.on("close", function sendFileAfterTransform() {
          var options = presets[imagePreset] || {};
          if(queryParams.width || queryParams.w){
            options.width = queryParams.width || queryParams.w;
          }
          if(queryParams.height || queryParams.h){
            options.height = queryParams.height || queryParams.h;
          }
          if(queryParams.quality || queryParams.q){
            options.quality = queryParams.quality || queryParams.q;
          }

          // obtain the size of an image if it exists and there are no options
          gm(filepath)
              .size(function (err, size) {
                if (!err) {
                  if(!options.width && !options.height){
                    options.width = size.width;
                    options.height = size.height;
                  }
                }
              });


          var modificationOptions = {
            filepath: filepath
            , dstPath: modifiedFilePath
            , preset: options
            , smartCrop: opts.smartCrop || false
          };

          var postModificationFunction = function (err) {
            if (err) { throw err; }

            //console.log("SRC: " + req.originalUrl);
            //console.log("Streaming: " + modifiedFilePath);

            var maxTTLAge = ttl || 0;
            send(req, modifiedFilePath, {maxAge: maxTTLAge})
              //.on("error", function(err) {
              //  console.log("SENDING ERROR!");
              //  console.error(err);
              //})
              //  .on("end", function () { console.log("Streaming ended!"); })
                .pipe(res);

            return resume(false);
          };

          modifyImage(modificationOptions, postModificationFunction);

        });
      }

    });
  };
};

exports.encodeURL = function(uri, callback) {
  callback(null, new Buffer(uri).toString('base64'));
};

exports.decodeURL = function(encodedURL, callback) {
  callback(null, new Buffer(encodedURL, 'base64').toString('ascii'));
};

/**
 * Return cryptographic hash (defaulting to: "sha1") of a string.
 *
 * @param {String} str
 * @param {String} algo - Algorithm used for hashing, defaults to sha1
 * @param {String} encoding - defaults to hex
 * @return {String}
 */
function hash(str, algo, encoding) {
  return crypto
    .createHash(algo || 'sha1')
    .update(str)
    .digest(encoding || 'hex');
}

/**
 * Merge user-provided options with the sensible defaults.
 * @param options
 */
function parseOptions(options) {

  ttl = options.ttl || (3600 * 24); // cache for 1 day by default.
  tmpCacheTTL = options.tmpCacheTTL || 5; // small by default
  decodeFn = options.decodeFn || exports.decodeURL;
  presets  = options.presets || defaultPresets();

  tmpDir   = options.tmpDir || '/tmp/nodethumbnails';

  var rootPath = options.rootPath || '/thumbs';
  if (rootPath[0] === '/') { rootPath = rootPath.substring(1); } // be forgiving to user errors!

  var allowedExtensions = options.allowedExtensions || ['gif', 'png', 'jpg', 'jpeg'];
  for (var i=0; i < allowedExtensions.length; i++) {
    // be forgiving to user errors!
    if (allowedExtensions[i][0] === '.') {
      allowedExtensions[i] = allowedExtensions[i].substring(1);
    }
  }
  var szExtensions = allowedExtensions.join('|');

  // Example: http://example.com/thumbs/small/AB23DC16Hash.jpg
  regexp = new RegExp('^\/' + rootPath.replace(/\//ig, '\\/') +
    '\/([A-Za-z0-9_]+)\/([%\.\-A-Za-z0-9_=\+]+)\.(?:' + szExtensions + ')$', 'i');
}

function defaultPresets() {

  return {
    small: {
      width: 120
      , quality: 50
    }
    , medium: {
      width: 300
      , quality: 70
    }
    , large: {
      width: 900
      , quality: 90
    }
  };

}

function modifyImage(options, callback) {

  var srcPath = options.filepath;
  var dstPath = options.dstPath;
  var preset = options.preset;

  var lockFileOptions = {};

  gm(srcPath).identify(function (err, imageData) {
    if (err) { callback(err); }

    var origWidth  = imageData.size.width;
    var origHeight = imageData.size.height;

    if (!preset.quality) {
      preset.quality = 95;
    }

    if (options.smartCrop) {
      var Canvas = require('canvas'),
          SmartCrop = require('smartcrop');

      var img = new Canvas.Image();
      var canvasOptions = {}; canvasOptions.canvasFactory = function(w, h) { return new Canvas(w, h); };

      img.src = fs.readFileSync(srcPath);

      canvasOptions.width = preset.width;
      canvasOptions.height = preset.height || detectedHeight(canvasOptions.width, origWidth, origHeight);
      canvasOptions.dstPath = dstPath;

      SmartCrop.crop(img, canvasOptions, function(result) {
        //console.log(JSON.stringify(result.topCrop, null, '  '));
        var rt = result.topCrop;

        lockFile.lock(srcPath + ".lock", lockFileOptions, function(err) {
          if (err) { return callback(err); }

          gm(srcPath)
              .crop(rt.width, rt.height, rt.x, rt.y)
              .resize(preset.width || rt.width, preset.height || rt.height)
              .quality(preset.quality)
              .write(dstPath, callback);

          lockFile.unlock(srcPath + ".lock", function (err) {
            if (err) { console.log(err); }
          });
        });
      });

    } else {

      var targetWidth = preset.width;
      // We could have just omitted height in .resize() but we may need control over this in the future.
      var targetHeight = preset.height || detectedHeight(targetWidth, origWidth, origHeight);
      //console.log ( "Target: " + targetWidth + " - " + targetHeight );

      lockFile.lock(srcPath + ".lock", lockFileOptions, function(err) {
        if (err) { return callback(err); }

        // @see: http://www.graphicsmagick.org/GraphicsMagick.html#details-resize
        gm(srcPath)
            .resize(targetWidth, targetHeight, "^")
            .crop(targetWidth, targetHeight, 0, 0)
            .quality(preset.quality)
            .write(dstPath, callback);

        lockFile.unlock(srcPath + ".lock", function (err) {
          if (err) { console.log(err); }
        });
      });
    }

  });
}

/**
 * Detect targetHeight for a proportional resizing, when only width is indicated.
 *
 * @param targetWidth
 * @param origWidth
 * @param origHeight
 */
function detectedHeight(targetWidth, origWidth, origHeight) {
  return origHeight * targetWidth / origWidth;
}
