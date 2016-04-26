var http = {
    getFileHTTP: function getFileHTTP(fileStream, request, decodedImageURL){
        return new Promise(function (fulfill, reject) {
            try{
                request.get(decodedImageURL).on('error', function (err){
                    reject(err);
                }).on('response', function(resp){
                    if(resp.statusCode >= 400){
                        reject(err);
                    }else{
                        fulfill();
                    }
                }).pipe(fileStream);
            }catch(err){
                reject(err);
            }
        });
        //
        //try{
        //    request.get(decodedImageURL).on('error', function (err){
        //        console.log(err);
        //        res.writeHead(404);
        //        res.end("Not Found!");
        //        hadError = true;
        //        return resume(false);
        //    }).on('response', function(resp){
        //        if(resp.statusCode >= 400){
        //            res.writeHead(404);
        //            res.end("Not Found!");
        //            hadError = true;
        //            return resume(false);
        //        }
        //    }).pipe(fileStream);
        //}catch(err){
        //    console.log(err);
        //    res.writeHead(404);
        //    res.end("Not Found!");
        //    return resume(false);
        //}
    }
};

module.exports = http;