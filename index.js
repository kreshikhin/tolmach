
var natural = require('natural');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var classifier = new natural.BayesClassifier();

classifier.load(path.join(__dirname, 'classifier.json'));

function detect(text){
    return classifier.getClassifications(text);
}

module.export = {
    detect: detect
};
