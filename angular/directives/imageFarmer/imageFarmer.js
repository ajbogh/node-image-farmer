/*
 * smartCrop.js
 *
 * Created: October 14, 2015
 * (c) Copyright 2015 Holland America, Inc. - All Rights Reserved
 * This is unpublished proprietary source code of Holland America, Inc.
 * The copyright notice above does not evidence any actual or intended
 * publication of such source code.
 */

/**
 * @name common.directives.smartCrop
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
     <img image-farmer crop-width="980" crop-height="370" preset="small" src="/content/hal/cruise-experience/shorex/catalog/60133-full.jpg" />
     </pre>
     *
     */

    /**
     * usage: <img image-farmer crop-width="980" crop-height="370" src="/content/hal/cruise-experience/shorex/catalog/60133-full.jpg" />
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