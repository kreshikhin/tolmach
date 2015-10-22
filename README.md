# tolmach

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
