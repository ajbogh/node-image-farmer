var axios = require('axios'),
    debug = require('debug')('node-image-farmer');

//allows images to be downloaded from insecure resources
//we allow this because the images are mime-checked so they should be safe
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var http = {
    getFileHTTP: function getFileHTTP(fileStream, imageUrl){
        debug("Getting file from url: ", imageUrl);
        return new Promise(function (resolve, reject) {
            axios({
                url: imageUrl,
                method: "GET",
                encoding: null,
                agent: false,
                responseType: 'stream'
            }).then((res) => {
                debug("--Response", res.status, res.statusText);

                res.data.pipe(fileStream).on('close', () => {
                    debug("--Request closed");
                    resolve(fileStream);
                });
            }).catch((e) => {
                debug("--Request error", e.message);
                const { response } = e;
                if(response.status >= 400){
                    debug("--Unsucccessful response", response.status, response.statusText, response.data);
                    reject(response);
                } else {
                    reject(e);
                }
            });
        });
    }
};

module.exports = http;