var debug = require('debug')('node-image-farmer:url-decoder');

function getExtensionArr(filename, result){
    var extensionArr = [];
    try {
        extensionArr = filename.split(".");
    }catch(e){
        extensionArr = [filename];
    }
    
    result.extension = (extensionArr.length > 1 ? extensionArr[extensionArr.length - 1] : null);
}

var urlDecoder = {
    /**
     * Processes a request to return an object of parameters.
     * @param req
     * @returns {object} - null on URL error
     */
    processRequest: function(req, presets){
        var port = req.socket.address().port;
        var requestedUrl = req.protocol + '://' + req.connection.remoteAddress  + ( port === 80 || port === 443 ? '' : ':'+port ) + req.originalUrl;
        debug(req.method, requestedUrl);
        //debug(req.socket.address());

        var params = req.params[0];
        params = params.split('/');

        //we must have at least 2 params, some sort of preset and then the path.
        if(params.length < 1){
            return null;
        }

        var result = {};

        // GET THE PRESET
        result.preset = params[0].replace(/[^a-zA-Z0-9\-_\.]/, "").toLowerCase();

        // GET THE IMAGEPATH
        if(params.length >= 2){
            result.imagePath = params.slice(1).join("/");
        }

        // PROCESS PRESETS
        debug("Preset: "+result.preset, "Available presets:", Object.keys(presets));
        if(presets[result.preset]){
            var preset = presets[result.preset];
            if(preset.height){
                result.height = preset.height;
            }
            if(preset.width){
                result.width = preset.width;
            }
            if(preset.quality){
                result.quality = preset.quality;
            }
        }
        debug("Result: ", JSON.stringify(result, null, 2));
        // GET THE QUERY PARAMETERS
        var query = req.query;
        try{
            if(query.h || query.height){
                result.height = query.h || query.height;
                result.height = parseInt(result.height, 10);
            }
        }catch(err){}
        try{
            if(query.w || query.width){
                result.width = query.w || query.width;
                result.width = parseInt(result.width, 10);
            }
        }catch(err){}
        try{
            if(query.q || query.quality){
                result.quality = query.q || query.quality;
                result.quality = parseInt(result.quality, 10);
            }
        }catch(err){}
        try{
            if(query.minScale){
                result.minScale = query.minScale;
                result.minScale = parseFloat(result.minScale);
            }
        }catch(err){}


        result.quality = result.quality || 95;

        // GET THE IMAGEURL
        if(query.base64){
            result.imageUrl = Buffer.from(query.base64, 'base64').toString('ascii');
        }

        // GET THE EXTENSION
        var extensionArr = [];
        if(result.imageUrl){
            extensionArr = result.imageUrl.split(".");
            result.extension = (extensionArr.length > 1 ? extensionArr[extensionArr.length - 1] : null);
        }else if(result.imagePath){
            getExtensionArr(result.imagePath, result);
        }else if(result.preset){
            //preset contains the image because the user never defined a preset.
            getExtensionArr(result.preset, result);
        }

        // THROW THE ORIGINAL URL IN THERE TOO
        result.originalUrl = req.originalUrl;

        if(!result.imageUrl && !result.imagePath && result.preset){
            //preset is not defined but the image filename is
            result.imagePath = result.preset;
            result.preset = null;
        }


        return result;
    }
};

module.exports = urlDecoder;