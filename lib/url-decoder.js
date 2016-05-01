var urlDecoder = {
    /**
     * Processes a request to return an object of parameters.
     * @param req
     * @returns {object} - null on URL error
     */
    processRequest: function(req, presets){
        var params = req.params[0];
        params = params.split('/');

        //we must have at least 2 params, some sort of preset and then the path.
        if(params.length < 1){
            return null;
        }

        var result = {};

        // GET THE PRESET
        result.preset = params[0].replace(/[^a-zA-Z0-9]/, "").toLowerCase();

        // GET THE IMAGEPATH
        if(params.length >= 2){
            result.imagePath = params.slice(1).join("/");
        }

        // PROCESS PRESETS
        console.log("Preset: "+result.preset, presets);
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
        console.log("Result: ", result);
        // GET THE QUERY PARAMETERS
        var query = req.query;
        try{
            if(query.h || query.height){
                result.height = query.h || query.height;
                result.height = parseInt(result.height, 10);
            }
            if(query.w || query.width){
                result.width = query.w || query.width;
                result.width = parseInt(result.width, 10);
            }
            if(query.q || query.quality){
                result.quality = query.q || query.quality;
                result.quality = parseInt(result.quality, 10);
            }
        }catch(err){}

        result.quality = result.quality || 95;

        // GET THE IMAGEURL
        if(query.base64){
            result.imageUrl = new Buffer(query.base64, 'base64').toString('ascii');
        }

        // GET THE EXTENSION
        var extensionArr = [];
        if(result.imageUrl){
            extensionArr = result.imageUrl.split(".");
            result.extension = (extensionArr.length > 1 ? extensionArr[extensionArr.length - 1] : null);
        }else{
            extensionArr = result.imagePath.split(".");
            result.extension = (extensionArr.length > 1 ? extensionArr[extensionArr.length - 1] : null);
        }

        // THROW THE ORIGINAL URL IN THERE TOO
        result.originalUrl = req.originalUrl;


        return result;
    }
};

module.exports = urlDecoder;