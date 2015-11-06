# tolmach

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]

  Programming language classifier for Node.js. A snippet of source is tokenized
  with code-specific markers (`#include`, `=>`, `<?php`, sigils) and scored with
  naive Bayes. Comments and string contents are ignored, and identifiers are not stemmed.

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

tolmach.classify('#include <iostream>');
// => { language: "cpp", scores: [ { language: "cpp", score: 0.9 }, ... ] }
```

`detect` returns the best language, or `null` when the text has no recognizable tokens.
`classify` returns that language plus a probability for every trained language. Scores sum to 1.
A non-string argument throws `TypeError`.

## Supported languages

```
c
cpp
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

`cpp` is C++. C and C++ are classified separately.

## Training

Samples live in `data/<language>.txt`, one document per block, separated by a line with `---`.
`classifier.json` is generated from those samples:

    $ npm run train

## License

  [MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/tolmach.svg
[npm-url]: https://npmjs.org/package/tolmach
[downloads-image]: https://img.shields.io/npm/dm/tolmach.svg
[downloads-url]: https://npmjs.org/package/tolmach
