var assert = require('chai').assert;
var expect = require('chai').expect;
var app = require('../app/app');
var request = require('request');
var size = require('request-image-size');


describe('Images in filesystem', function() {
    it('should return 404 for missing files', function (done) {
        request.get('http://localhost:3000/content/smart/medium/fakefile.jpg', function (err, res, body){
            expect(res.statusCode).to.equal(404);
            expect(res.body).to.equal('Not Found!');
            done();
        });
    });

    it('should return a modified image', function (done) {
        size('http://localhost:3000/content/smart/medium/rocket.jpg', function(err, dimensions, length) {
            expect(dimensions.width).to.be.lessThan(3000);
            expect(dimensions.height).to.be.lessThan(2000);
            done();
        });
    });

    it('should use query string h', function (done) {
        size('http://localhost:3000/content/smart/medium/rocket.jpg?h=500', function(err, dimensions, length) {
            expect(dimensions.width).to.be.lessThan(3000);
            expect(dimensions.height).to.equal(500);
            done();
        });
    });

    it('should use query string height', function (done) {
        size('http://localhost:3000/content/smart/medium/rocket.jpg?height=500', function(err, dimensions, length) {
            expect(dimensions.width).to.be.lessThan(3000);
            expect(dimensions.height).to.equal(500);
            done();
        });
    });

    it('should use query string w', function (done) {
        size('http://localhost:3000/content/smart/medium/rocket.jpg?w=500', function(err, dimensions, length) {
            expect(dimensions.width).to.equal(500);
            expect(dimensions.height).to.be.lessThan(2000);
            done();
        });
    });

    it('should use query string width', function (done) {
        size('http://localhost:3000/content/smart/medium/rocket.jpg?width=500', function(err, dimensions, length) {
            expect(dimensions.width).to.equal(500);
            expect(dimensions.height).to.be.lessThan(2000);
            done();
        });
    });

    it('should use query string q', function (done) {
        size('http://localhost:3000/content/smart/medium/rocket.jpg?q=1', function(err, dimensions, length) {
            expect(length).to.be.lessThan(16640);
            done();
        });
    });

    it('should use quality', function (done) {
        size('http://localhost:3000/content/smart/medium/rocket.jpg?quality=1', function(err, dimensions, length) {
            expect(length).to.be.lessThan(16640);
            done();
        });
    });
});

describe('Images from URL', function(){
    it('should return 404 for missing files', function (done) {
        request.get('http://localhost:3000/content/smart/medium/?base64=aHR0cDovL2dvb2dsZS5jb20vZmFrZS5qcGc=', function (err, res, body){
            expect(res.statusCode).to.equal(404);
            expect(res.body).to.equal('Not Found!');
            done();
        });
    });

    it('should return a modified image', function (done) {
        size('http://localhost:3000/content/smart/medium/?base64=aHR0cDovL3d3dy5wdWJsaWNkb21haW5waWN0dXJlcy5uZXQvcGljdHVyZXMvMTAwMDAvdmVsa2EvMTA4MS0xMjQwMzI3MzE3cGMzcS5qcGc=', function(err, dimensions, length) {
            expect(dimensions.width).to.be.lessThan(3000);
            expect(dimensions.height).to.be.lessThan(2000);
            done();
        });
    });
});