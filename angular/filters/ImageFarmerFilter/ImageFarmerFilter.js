/*
 * ImageFarmerFilter.js
 */

/**

 * @name common.filters.ImageFarmerFilter
 * @description This filter will return a relative URL with the image farmer path, given a relative path to an image
 */
angular.module( 'common.filters.ImageFarmerFilter', [

    ])

    /**
     * @ngdoc filter
     * @name common.filters.ImageFarmerFilter
     * @description This filter will return a relative URL with the image farmer path, given a relative path to an image
     *
     * @example
     <pre>
     <img src="{{ somePathToJpg | imageFarmer:w=400&h=300 }}" />
     </pre>

     <example>
     <file name="imageFarmerFilter.html">
     Place rendered HTML here.
     </file>
     </example>
     *
     */
    .filter('imageFarmer', function() {
        return function (input, queryString) {
            if(input){
                var result = input.replace(/^\/content(?!\/smart)/, '/content/smart/full') +
                    (queryString ? "?"+queryString : "");
                return result;
            }else{
                return input;
            }
        };
    });