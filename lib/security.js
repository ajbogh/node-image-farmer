var security = {
    testExtension: function(extension, allowedExtensions){
        allowedExtensions = allowedExtensions || ['gif', 'png', 'jpg', 'jpeg'];
        // be forgiving to user errors!
        allowedExtensions = allowedExtensions.map(function(val){return val.replace('.', ''); });

        return (allowedExtensions.indexOf(extension) > -1);
    },

    testMimeType: function(mimeType, allowedMimeTypes){
        allowedMimeTypes = allowedMimeTypes || [
            "image/jpeg",
            "image/pjpeg",
            "image/gif",
            "image/png"
        ];

        return (allowedMimeTypes.indexOf(mimeType) > -1);
    }
};

module.exports = security;