'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { tokenize } = require('../lib/tokenize');

test('keeps preprocessor directives and header names', () => {
    assert.deepEqual(tokenize('#include <stdio.h>'), ['#include', 'header:stdio.h']);
    assert.deepEqual(tokenize('#import <Foundation/Foundation.h>'), ['#import', 'header:foundation.h']);
});

test('drops comments and string contents', () => {
    const tokens = tokenize('int main() { /* hidden printf */ printf("secret include"); } // tail');
    assert.equal(tokens.includes('printf'), true);
    assert.equal(tokens.includes('secret'), false);
    assert.equal(tokens.includes('hidden'), false);
    assert.equal(tokens.includes('tail'), false);
});

test('marks a python for-in loop', () => {
    assert.equal(tokenize('for item in items:').includes('for-in:'), true);
    assert.equal(tokenize('for key, value in pairs(rows):').includes('for-in:'), true);
    assert.equal(tokenize('for value in values {').includes('for-in:'), false);
    assert.equal(tokenize('for value in "$@"; do').includes('for-in:'), false);
});

test('keeps syntactic markers without stemming', () => {
    const tokens = tokenize('const running = items.map(item => item.price);');
    assert.equal(tokens.includes('=>'), true);
    assert.equal(tokens.includes('running'), true);
    assert.equal(tokens.includes('run'), false);
});

test('recognizes php tags, sigils, ruby blocks and shebangs', () => {
    assert.equal(tokenize('<?php echo $name;').includes('<?php'), true);
    assert.equal(tokenize('my $value = shift;').includes('sigil:$'), true);
    assert.equal(tokenize('items.map { |item| item.price }').includes('block-param'), true);
    assert.equal(tokenize('#!/usr/bin/env python3\nprint("hi")').includes('shebang:python'), true);
});

test('treats hash comments and rust attributes differently', () => {
    assert.equal(tokenize('# just a comment\ndef ready():\n    pass').includes('just'), false);
    assert.equal(tokenize('#[derive(Debug)]\nstruct Point { x: i32 }').includes('#['), true);
});
