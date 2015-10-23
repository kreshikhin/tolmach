var assert = require('assert');
var tolmach = require('../index');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var examples = {};

var files = fs.readdirSync(path.join(__dirname, 'examples'));

_.each(files, function(file){
    var content = fs.readFileSync(path.join(__dirname, 'examples', file), 'utf8');
    var name = path.basename(file, path.extname(file));
    examples[name] = content;
});

describe('tolmach', function(){
    var self = this;

    _.each(examples, function(content, name){
        it.call(self, 'should detect ' + name, function(){
            var result = tolmach.detect(content);
            assert.equal(result, name);
        });
    });
})
