var natural = require('natural');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var classifier = new natural.BayesClassifier();

fs.readdir(path.join(__dirname, 'data'), function(err, files){
    console.log(files);
    _.each(files, function(file){
        var content = fs.readFileSync(path.join(__dirname, 'data', file), 'utf8');
        classifier.addDocument(content, path.basename(file, path.extname(file)));
    });

    classifier.train();

    console.log(classifier.classify('function() { console.log("hello world!"; )}'));
    console.log(classifier.classify('for item in items:'));
    console.log(classifier.classify('prices = items.map{ |i| i.price }'));
    console.log(classifier.classify('#include <stdio.h>'));

    classifier.save('classifier.json', function(err, classifier) {
        console.log('the classifier is saved to the classifier.json file!');
        process.exit();
    });
});
