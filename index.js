'use strict';

const fs = require('fs');
const path = require('path');
const { Classifier } = require('./lib/classifier');

const modelPath = path.join(__dirname, 'classifier.json');

function loadClassifier() {
    let raw;
    try {
        raw = fs.readFileSync(modelPath, 'utf8');
    } catch (err) {
        throw new Error('Missing classifier.json. Run `npm run train` to build it.');
    }
    return Classifier.restore(JSON.parse(raw));
}

const classifier = loadClassifier();

function assertText(text) {
    if (typeof text !== 'string') {
        throw new TypeError('Expected text to be a string');
    }
}

/**
 * Detect the programming language of a code snippet.
 * Returns null when the snippet has no recognizable tokens.
 *
 * @param {string} text
 * @returns {string|null}
 */
function detect(text) {
    assertText(text);
    const result = classifier.classify(text);
    return result ? result.language : null;
}

/**
 * Detect a language and return a probability for every trained language.
 * Scores sum to 1. Returns null when the snippet has no recognizable tokens.
 *
 * @param {string} text
 * @returns {{language: string, scores: {language: string, score: number}[]}|null}
 */
function classify(text) {
    assertText(text);
    return classifier.classify(text);
}

module.exports = {
    detect: detect,
    classify: classify,
    languages: Object.freeze(classifier.languages())
};
