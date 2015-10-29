'use strict';

const fs = require('fs');
const path = require('path');
const { Classifier } = require('./lib/classifier');

function readDocuments(content) {
    return content.split(/\r?\n---\r?\n/).map(function (part) {
        return part.trim();
    }).filter(Boolean);
}

function buildModel(dataDir) {
    const directory = dataDir || path.join(__dirname, 'data');
    const classifier = new Classifier();
    const files = fs.readdirSync(directory).filter(function (file) {
        return file.endsWith('.txt');
    }).sort();

    if (files.length === 0) {
        throw new Error('No training files in ' + directory);
    }

    for (let i = 0; i < files.length; i += 1) {
        const language = path.basename(files[i], '.txt');
        const docs = readDocuments(fs.readFileSync(path.join(directory, files[i]), 'utf8'));
        if (docs.length < 4) {
            throw new Error(language + ' has only ' + docs.length + ' documents; expected at least 4');
        }
        for (let j = 0; j < docs.length; j += 1) {
            classifier.addDocument(docs[j], language);
        }
    }

    return classifier.toJSON();
}

function writeModel(outPath) {
    const model = buildModel();
    const target = outPath || path.join(__dirname, 'classifier.json');
    fs.writeFileSync(target, JSON.stringify(model));
    const languages = Object.keys(model.classes);
    console.log('Wrote classifier.json (' + languages.length + ' languages)');
    for (let i = 0; i < languages.length; i += 1) {
        console.log('  ' + languages[i].padEnd(14) + model.classes[languages[i]].docs + ' documents');
    }
    return model;
}

if (require.main === module) {
    try {
        writeModel();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

module.exports = {
    buildModel: buildModel,
    readDocuments: readDocuments
};
