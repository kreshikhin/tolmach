# tolmach

[![npm version][npm-image]][npm-url]
[![npm downloads][downloads-image]][downloads-url]

Tolmach (толмач, an interpreter) tells which programming language a snippet is written in.

Give it a string of source. `detect` returns the language id. `classify` returns that id plus a probability for every language it knows. Comments and the contents of strings are ignored, and identifiers are not stemmed: `#include`, `=>`, `<?php`, `::` and a Ruby block parameter stay intact.

```js
const tolmach = require('tolmach');

tolmach.detect('for item in items:');
// "python"

tolmach.detect('#include <stdio.h>');
// "c"

tolmach.detect('prices = items.map { |item| item.price }');
// "ruby"
```

## Install

Node.js 18 or newer.

```sh
npm install tolmach
```

## A whole program

A short line is enough for a guess. A complete program is usually unambiguous.

```js
const tolmach = require('tolmach');

const python = `
class Cart:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)

    def total(self):
        amount = 0
        for item in self.items:
            amount += item.price
        return amount
`;

const c = `
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    char *message = malloc(16);
    if (message == NULL) {
        return 1;
    }
    sprintf(message, "hello");
    printf("%s\\n", message);
    free(message);
    return 0;
}
`;

const cpp = `
#include <iostream>
#include <vector>
#include <string>

int main() {
    std::vector<std::string> names{"ada", "grace"};
    for (const std::string &name : names) {
        std::cout << name << std::endl;
    }
    return 0;
}
`;

console.log(tolmach.detect(python)); // "python"
console.log(tolmach.detect(c));      // "c"
console.log(tolmach.detect(cpp));    // "cpp"
```

C and C++ are separate. `#include <stdio.h>` with `printf` is `c`. `#include <iostream>` with `std::cout` is `cpp`.

### JavaScript

```js
const total = (items) => {
    return items
        .map((item) => item.price)
        .reduce((sum, price) => sum + price, 0);
};

console.log(total([{ price: 4 }, { price: 5 }]));
```

```js
tolmach.detect(source); // "javascript"
```

### Ruby

```ruby
class Cart
  def initialize
    @items = []
  end

  def add(item)
    @items << item
  end

  def total
    @items.sum { |item| item.price }
  end
end
```

```js
tolmach.detect(source); // "ruby"
```

### Go

```go
package main

import "fmt"

func main() {
    count := 3
    if count == 0 {
        fmt.Println("empty")
        return
    }
    fmt.Printf("count=%d\n", count)
}
```

```js
tolmach.detect(source); // "go"
```

### Rust

```rust
fn main() {
    let mut total = 0;
    for value in [1, 2, 3] {
        total += value;
    }
    println!("{}", total);
}
```

```js
tolmach.detect(source); // "rust"
```

### PHP

```php
<?php

class Cart {
    public function __construct(private array $items = []) {}

    public function total(): int {
        $sum = 0;
        foreach ($this->items as $item) {
            $sum += $item["price"];
        }
        return $sum;
    }
}
```

```js
tolmach.detect(source); // "php"
```

### Shell

```bash
#!/bin/bash
set -euo pipefail

dest="${1:?dest required}"
mkdir -p "$dest"
for src in *.log; do
    [[ -e "$src" ]] || continue
    cp "$src" "$dest/"
done
echo "copied"
```

```js
tolmach.detect(source); // "shell"
```

## Probabilities

`classify` always scores every trained language. The scores are probabilities and sum to 1. On a one-line fragment the margin is smaller, which is the useful case: you can see the runner-up instead of trusting a single label.

```js
const result = tolmach.classify('for item in items:');

result.language;
// "python"

result.scores.slice(0, 4);
// [
//   { language: "python", score: 0.872 },
//   { language: "lisp",   score: 0.074 },
//   { language: "rust",   score: 0.024 },
//   { language: "swift",  score: 0.024 }
// ]
```

The same call on the C++ program above puts essentially the whole probability on `cpp`.

```js
tolmach.classify(cpp).language; // "cpp"
```

`detect` is the winning language, or `null` when the text has no tokens the model has seen. Whitespace, a bare number, or an unknown word all come back as `null`. A value that is not a string throws `TypeError`.

```js
tolmach.detect('   \n');  // null
tolmach.detect('12345');  // null
tolmach.detect(42);       // TypeError: Expected text to be a string
```

The ids the model was trained on:

```js
tolmach.languages;
// ["c", "cpp", "csharp", "fortran", "go", "haskell", "java",
//  "javascript", "lisp", "lua", "objective-c", "perl", "php",
//  "python", "ruby", "rust", "shell", "swift", "vbnet"]
```

## API

| Call | Returns |
|---|---|
| `tolmach.detect(text)` | Language id, or `null` |
| `tolmach.classify(text)` | `{ language, scores }` or `null` |
| `tolmach.languages` | Ids the loaded model knows, sorted |

`scores` is the full list, highest probability first. Each entry is `{ language, score }`.

## Languages

| Id | Language |
|---|---|
| `c` | C |
| `cpp` | C++ |
| `csharp` | C# |
| `fortran` | Fortran |
| `go` | Go |
| `haskell` | Haskell |
| `java` | Java |
| `javascript` | JavaScript |
| `lisp` | Common Lisp |
| `lua` | Lua |
| `objective-c` | Objective-C |
| `perl` | Perl |
| `php` | PHP |
| `python` | Python |
| `ruby` | Ruby |
| `rust` | Rust |
| `shell` | Shell |
| `swift` | Swift |
| `vbnet` | VB.NET |

## How a guess is made

The snippet is scanned once. Comments (`//`, `/* */`, `#` that is not a preprocessor line, `--`) and quoted text are dropped. What remains is a set of tokens: words, sigils (`$name`, `@interface`), operators (`=>`, `->`, `::`, `:=`), preprocessor directives, header names, and a few forms that are easy to miss otherwise, such as a Ruby `|item|` block or a Python `for x in y:`.

Each training sample contributes a token at most once. Classification is naive Bayes over that presence, turned into probabilities with a softmax. There is no stemmer, so `running` stays `running`.

## Training

Samples live in `data/<language>.txt`. Blocks are separated by a line that contains only `---`.

```
def greet(name):
    print("hello", name)

---
class Cart:
    def total(self, prices):
        amount = 0
        for price in prices:
            amount += price
        return amount
```

`classifier.json` is built from those files. Rebuild it after editing samples:

```sh
npm run train
```

The checked-in model has to match `data/`. The test suite retrains in memory and fails if the file is stale.

## Development

```sh
npm test
```

Tests cover the held-out programs in `test/examples/`, every training sample, the one-liners above, and the split between C and C++.

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/tolmach.svg
[npm-url]: https://npmjs.org/package/tolmach
[downloads-image]: https://img.shields.io/npm/dm/tolmach.svg
[downloads-url]: https://npmjs.org/package/tolmach
