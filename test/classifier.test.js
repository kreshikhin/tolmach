'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const tolmach = require('../index.js');

const root = path.join(__dirname, '..');

function assertLanguage(text, language) {
    const result = tolmach.classify(text);
    const top = result ? result.scores.slice(0, 3) : null;
    assert.equal(result && result.language, language, JSON.stringify(top));
}

test('detects held-out examples', () => {
    const examplesDir = path.join(__dirname, 'examples');
    const files = fs.readdirSync(examplesDir).filter((file) => file.endsWith('.txt')).sort();
    assert.ok(files.length >= tolmach.languages.length);
    for (const file of files) {
        const language = path.basename(file, '.txt');
        const content = fs.readFileSync(path.join(examplesDir, file), 'utf8');
        assertLanguage(content, language);
    }
});

test('classifies every training document as its own language', () => {
    const dataDir = path.join(root, 'data');
    const files = fs.readdirSync(dataDir).filter((file) => file.endsWith('.txt')).sort();
    for (const file of files) {
        const language = path.basename(file, '.txt');
        const docs = fs.readFileSync(path.join(dataDir, file), 'utf8')
            .split(/\r?\n---\r?\n/)
            .map((part) => part.trim())
            .filter(Boolean);
        for (const doc of docs) {
            assertLanguage(doc, language);
        }
    }
});

test('readme snippets', () => {
    assertLanguage('for item in items:', 'python');
    assertLanguage('#include <stdio.h>', 'c');
    assertLanguage('prices = items.map{ |i| i.price }', 'ruby');
});

test('separates c from c++', () => {
    assertLanguage('#include <stdio.h>\nint main(void) { printf("hi\\n"); return 0; }', 'c');
    assertLanguage('#include <iostream>\nint main() { std::cout << "hi\\n"; }', 'cpp');
});

test('classify returns a distribution', () => {
    const result = tolmach.classify('def greet(name):\n    return name\n');
    assert.equal(result.language, 'python');
    assert.equal(result.scores[0].language, 'python');
    assert.equal(result.scores.length, tolmach.languages.length);
    const sum = result.scores.reduce((total, item) => total + item.score, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
    for (let i = 1; i < result.scores.length; i += 1) {
        assert.ok(result.scores[i - 1].score >= result.scores[i].score);
    }
});

test('empty and unknown snippets return null', () => {
    assert.equal(tolmach.detect('   \n\t'), null);
    assert.equal(tolmach.classify(''), null);
    assert.equal(tolmach.detect('12345 !!!'), null);
});

test('non-string input throws', () => {
    assert.throws(() => tolmach.detect(42), TypeError);
    assert.throws(() => tolmach.classify(undefined), TypeError);
});

test('lists trained languages', () => {
    assert.deepEqual(tolmach.languages, [
        'c', 'cpp', 'csharp', 'fortran', 'go', 'haskell', 'java', 'javascript',
        'lisp', 'lua', 'objective-c', 'perl', 'php', 'python', 'ruby', 'rust',
        'shell', 'swift', 'vbnet'
    ]);
});

test('committed model matches the training data', () => {
    const { buildModel } = require('../train.js');
    const committed = fs.readFileSync(path.join(root, 'classifier.json'), 'utf8');
    assert.equal(committed, JSON.stringify(buildModel()));
});
