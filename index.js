
var natural = require('natural');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var raw = fs.readFileSync(path.join(__dirname, 'classifier.json'), 'utf8');
var classifier = natural.BayesClassifier.restore(JSON.parse(raw));

function detect(text){
    return classifier.classify(text);
}

module.exports = {
    detect: detect
};
