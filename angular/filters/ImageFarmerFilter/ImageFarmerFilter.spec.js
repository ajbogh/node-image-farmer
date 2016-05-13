/*
 * ImageFarmerFilter.spec.js
 */

describe('ImageFarmer filter', function(){
    var filter;

    beforeEach(function(){
        module('common.filters.ImageFarmerFilter');

        inject(function($filter) {
            filter = $filter("imageFarmer");
        });
    });

    it("should be tested", function(){
        expect(false).toEqual(true);
    });
});

