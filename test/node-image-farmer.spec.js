var assert = require('chai').assert;
var expect = require('chai').expect;
var app = require('../app/app');
var request = require('axios');
var size = require('http-image-size');


describe('Images in filesystem', function() {
    it('should return 404 for missing files', async function () {
        const url = 'http://localhost:3000/content/smart/medium/fakefile.jpg';
        return request.get(url).then(function (res){
            assert(new Error('Should not have gotten a fake file.'));
        }).catch((e) => {
            expect(e.response.status).to.equal(404);
            expect(e.response.data).to.equal('Not Found! Couldn\'t read the file.');
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
    it('should return 404 for missing files', async function () {
        return request.get('http://localhost:3000/content/smart/medium/?base64=aHR0cDovL2dvb2dsZS5jb20vZmFrZS5qcGc=').then(function (res){
            assert(new Error('Should not have gotten a fake file.'));
        }).catch((e) => {
            expect(e.response.status).to.equal(404);
            expect(e.response.data).to.equal('Not Found! Couldn\'t retrieve the file from http://google.com/fake.jpg');
        });
    });

    it('should return a modified image', function (done) {
        size('http://localhost:3000/content/smart/medium/?base64=aHR0cHM6Ly9ob21lcGFnZXMuY2FlLndpc2MuZWR1L35lY2U1MzMvaW1hZ2VzL2ZyeW1pcmUucG5n=', function(err, dimensions, length) {
            expect(dimensions.width).to.be.lessThan(1118);
            expect(dimensions.height).to.be.lessThan(1105);
            done();
        });
    });

    it('closes the app', () => {
        process.exit();
    });
});