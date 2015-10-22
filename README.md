# tolmach

  Programming language classifier based on [natural classifier](https://github.com/NaturalNode/natural) module.

## Installation

    $ npm install tolmach

## Example

```js
var tolmach = require('tolmach');

tolmach('for item in items:');
// => "python"

tolmach('#include <stdio.h>');
// => "c"

tolmach('prices = items.map{ |i| i.price }');
// => "ruby"
```
