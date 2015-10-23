# tolmach

  [![NPM Version][npm-image]][npm-url]

  [![NPM Downloads][downloads-image]][downloads-url]

  [![Build Status][travis-image]][travis-url]

  Programming language classifier based on [natural classifier](https://github.com/NaturalNode/natural) module.

## Installation

    $ npm install tolmach

## Example

```js
var tolmach = require('tolmach');

tolmach.detect('for item in items:');
// => "python"

tolmach.detect('#include <stdio.h>');
// => "c"

tolmach.detect('prices = items.map{ |i| i.price }');
// => "ruby"
```

## Supported languages

```
c
csharp
fortran
go
haskell
java
javascript
lisp
lua
objective-c
perl
php
python
ruby
rust
shell
swift
vbnet
```
