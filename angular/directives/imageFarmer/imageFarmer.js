/*
 * imageFarmer.js
 */

/**
 * @name common.directives.imageFarmer
 * @description Performs a smart crop on an image using the canvas element and replaces the img with canvas using similar attributes.
 */


angular.module('common.directives.imageFarmer', [])

    /**
     * @ngdoc directive
     * @name common.directives.imageFarmer
     * @restrict A
     * @element img
     * @description requests the image from the image-farmer server.
     * @example
     <pre>
     <img image-farmer="/content/hal/cruise-experience/shorex/catalog/60133-full.jpg" crop-width="980" crop-height="370" />
     <img image-farmer="/content/hal/cruise-experience/shorex/catalog/60133-full.jpg" preset="small" />
     </pre>
     *
     */

    /**
     * usage: <img image-farmer="/content/hal/cruise-experience/shorex/catalog/60133-full.jpg" crop-width="980" crop-height="370" />
     * note: images must be on the same domain as website, no cross-domain images unless CORS is configured on the image server.
     *
     * param crop-width (optional, default 400)
     * param crop-height (optional, default 300)
     * param quality (optional, 1-100, default 95)
     */
    .directive('imageFarmer', function($window, $timeout){
        return {
            restrict: 'A',
            priority: 99, // it needs to run after the attributes are interpolated
            link: function (scope, element, attrs) {
                var handledUrl = "";
                var options = {
                    width: attrs.cropWidth,
                    height: attrs.cropHeight,
                    quality: attrs.quality
                };

                var preset = attrs.preset || "full";

                var queryStringArr = [];
                for(var i in options){
                    if(options[i]){
                        queryStringArr.push(i + "=" + options[i]);
                    }
                }
                var queryString = queryStringArr.join("&");

                scope.loadImage = function(src){
                    if(src || attrs.imageFarmer){
                        var srcUrl =  src || attrs.imageFarmer;
                        console.log("---loading for src", (new Date()).getTime());
                        if(srcUrl && new RegExp(/^\/content(?!\/smart)/).test(srcUrl)){
                            handledUrl = srcUrl.replace(/^\/content(?!\/smart)/, '/content/smart/'+preset) +
                                (queryString ? "?"+queryString : "");
                            console.log("changing image to src ", handledUrl, (new Date()).getTime());
                            element.attr('src', handledUrl);
                        }
                    }else{
                        console.log("---no src or ngSrc", attrs);
                    }
                };

                $timeout(scope.loadImage);

                scope.$watch(function() {
                    return element.attr('image-farmer');
                }, function(newSrc){
                    console.log("image-farmer attribute changed", newSrc, (new Date()).getTime());
                    scope.loadImage(newSrc);
                });
                //
                //scope.$watch(function() {
                //    return element.attr('src');
                //}, function(newSrc){
                //    scope.loadImage(newSrc);
                //});
            }
        };
    });