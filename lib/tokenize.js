'use strict';

const PREPROCESSOR = new Set([
    'include', 'import', 'define', 'undef', 'ifdef', 'ifndef',
    'if', 'else', 'elif', 'endif', 'pragma', 'error', 'warning', 'line'
]);

const MULTI_OPS = [
    '>>>=', '||=', '&&=', '>>=', '<<=', '===', '!==', '>>>',
    '=>', '->', '::', ':=', '?.', '??', '==', '!=', '<=', '>=',
    '&&', '||', '<<', '>>', '++', '--', '+=', '-=', '*=', '/=',
    '%=', '|=', '&=', '^=', '...', '|>', '=~', '!~'
].sort(function (a, b) {
    return b.length - a.length;
});

const SHEBANG_ALIASES = {
    node: 'javascript',
    nodejs: 'javascript',
    py: 'python',
    python: 'python',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    ksh: 'shell',
    dash: 'shell',
    rb: 'ruby',
    rs: 'rust'
};

function isIdentStart(ch) {
    return !!ch && /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch) {
    return !!ch && /[A-Za-z0-9_]/.test(ch);
}

function skipLine(source, index) {
    while (index < source.length && source[index] !== '\n') {
        index += 1;
    }
    return index;
}

function skipUntil(source, index, marker) {
    const at = source.indexOf(marker, index);
    return at === -1 ? source.length : at + marker.length;
}

function skipString(source, index, quote) {
    let cursor = index + 1;
    while (cursor < source.length) {
        if (source[cursor] === '\\') {
            cursor += 2;
            continue;
        }
        if (source[cursor] === quote) {
            return cursor + 1;
        }
        if (quote !== '`' && (source[cursor] === '\n' || source[cursor] === '\r')) {
            return cursor;
        }
        cursor += 1;
    }
    return cursor;
}

function shebangToken(line) {
    const match = line.match(/^#!\s*(?:\/usr\/bin\/env\s+)?(\S+)/);
    if (!match) {
        return null;
    }
    const bin = match[1].split(/[/\\]/).pop().toLowerCase().replace(/[0-9.]+$/, '');
    return 'shebang:' + (SHEBANG_ALIASES[bin] || bin);
}

function readPreprocessor(source, index) {
    let cursor = index - 1;
    while (cursor >= 0 && (source[cursor] === ' ' || source[cursor] === '\t')) {
        cursor -= 1;
    }
    if (cursor >= 0 && source[cursor] !== '\n' && source[cursor] !== '\r') {
        return null;
    }

    let end = index + 1;
    while (end < source.length && /[A-Za-z]/.test(source[end])) {
        end += 1;
    }
    if (end === index + 1) {
        return null;
    }
    const word = source.slice(index + 1, end).toLowerCase();
    if (!PREPROCESSOR.has(word)) {
        return null;
    }
    return { word: word, next: end };
}

function readIncludeHeader(source, index) {
    let cursor = index;
    while (source[cursor] === ' ' || source[cursor] === '\t') {
        cursor += 1;
    }
    const closing = source[cursor] === '<' ? '>' : (source[cursor] === '"' ? '"' : null);
    if (!closing) {
        return null;
    }
    const start = cursor + 1;
    const end = source.indexOf(closing, start);
    if (end === -1) {
        return null;
    }
    const base = source.slice(start, end).trim().split(/[/\\]/).pop().toLowerCase();
    if (!base) {
        return null;
    }
    return { token: 'header:' + base, next: end + 1 };
}

function readBlockParam(source, index) {
    const limit = Math.min(source.length, index + 80);
    const names = [];
    let cursor = index + 1;

    while (cursor < limit && names.length < 6) {
        while (cursor < limit && (source[cursor] === ' ' || source[cursor] === '\t')) {
            cursor += 1;
        }
        if (!isIdentStart(source[cursor])) {
            return null;
        }
        let end = cursor + 1;
        while (end < limit && isIdentPart(source[end])) {
            end += 1;
        }
        names.push(source.slice(cursor, end).toLowerCase());
        cursor = end;
        while (cursor < limit && (source[cursor] === ' ' || source[cursor] === '\t')) {
            cursor += 1;
        }
        if (source[cursor] === '|') {
            return { names: names, next: cursor + 1 };
        }
        if (source[cursor] === ',') {
            cursor += 1;
            continue;
        }
        return null;
    }
    return null;
}

function matchOperator(source, index) {
    for (let i = 0; i < MULTI_OPS.length; i += 1) {
        const op = MULTI_OPS[i];
        if (source.startsWith(op, index)) {
            return op;
        }
    }
    return null;
}

function isDashComment(source, index) {
    if (source[index + 1] !== '-') {
        return false;
    }
    const prev = index === 0 ? ' ' : source[index - 1];
    const next = source[index + 2] || ' ';
    return /[\s([{;,]/.test(prev) && (/\s/.test(next) || next === '[');
}

function isPythonForIn(source, index) {
    return /^\s+[^\n:]+\sin\s+[^\n:]+:/.test(source.slice(index, index + 160));
}

function readIdentifier(source, index) {
    let end = index + 1;
    while (end < source.length && isIdentPart(source[end])) {
        end += 1;
    }
    const mark = source[end];
    if ((mark === '!' || mark === '?') && !(mark === '!' && source[end + 1] === '=')) {
        end += 1;
    }
    return { token: source.slice(index, end).toLowerCase(), next: end };
}

/**
 * Tokenize source code for language classification.
 * Comments and string contents are dropped. Keywords, sigils and
 * syntactic markers (#include, =>, ::, block parameters) are kept.
 * Tokens are lowercased and de-duplicated. No stemming.
 *
 * @param {string} source
 * @returns {string[]}
 */
function tokenize(source) {
    if (typeof source !== 'string' || source.length === 0) {
        return [];
    }

    const tokens = new Set();
    const length = source.length;
    let index = 0;

    if (source.startsWith('#!')) {
        const lineEnd = source.indexOf('\n');
        const line = lineEnd === -1 ? source : source.slice(0, lineEnd);
        const token = shebangToken(line);
        if (token) {
            tokens.add(token);
        }
        index = lineEnd === -1 ? length : lineEnd + 1;
    }

    while (index < length) {
        const ch = source[index];

        if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\f') {
            index += 1;
            continue;
        }

        if (ch === '#') {
            if (source[index + 1] === '[') {
                tokens.add('#[');
                index += 2;
                continue;
            }
            if (source[index + 1] === '!' && source[index + 2] === '[') {
                tokens.add('#![');
                index += 3;
                continue;
            }
            const directive = readPreprocessor(source, index);
            if (directive) {
                tokens.add('#' + directive.word);
                index = directive.next;
                if (directive.word === 'include' || directive.word === 'import') {
                    const header = readIncludeHeader(source, index);
                    if (header) {
                        tokens.add(header.token);
                        index = header.next;
                    }
                }
                continue;
            }
            index = skipLine(source, index);
            continue;
        }

        if (ch === '/' && source[index + 1] === '/') {
            index = skipLine(source, index);
            continue;
        }
        if (ch === '/' && source[index + 1] === '*') {
            index = skipUntil(source, index + 2, '*/');
            continue;
        }

        if (ch === '-' && isDashComment(source, index)) {
            if (source.startsWith('--[[', index)) {
                index = skipUntil(source, index + 4, ']]');
            } else {
                index = skipLine(source, index);
            }
            continue;
        }

        if (ch === '{' && source[index + 1] === '-') {
            index = skipUntil(source, index + 2, '-}');
            continue;
        }

        if (source.slice(index, index + 5).toLowerCase() === '<?php') {
            tokens.add('<?php');
            index += 5;
            continue;
        }
        if (source.startsWith('<?=', index)) {
            tokens.add('<?=');
            index += 3;
            continue;
        }
        if (source.startsWith('?>', index)) {
            tokens.add('?>');
            index += 2;
            continue;
        }

        if ((ch === '"' || ch === "'") && source[index + 1] === ch && source[index + 2] === ch) {
            index = skipUntil(source, index + 3, ch + ch + ch);
            continue;
        }

        if (ch === "'") {
            if (isIdentStart(source[index + 1])) {
                let end = index + 2;
                while (isIdentPart(source[end])) {
                    end += 1;
                }
                if (source[end] !== "'") {
                    tokens.add('lifetime');
                    index = end;
                    continue;
                }
            }
            index = skipString(source, index, "'");
            continue;
        }

        if (ch === '"' || ch === '`') {
            index = skipString(source, index, ch);
            continue;
        }

        if (ch === '$' && source[index + 1] === '"') {
            tokens.add('interpolation');
            index += 1;
            continue;
        }

        if (ch === '$' && source[index + 1] === '{') {
            tokens.add('sigil:$');
            index += 2;
            while (source[index] === ' ' || source[index] === '\t') {
                index += 1;
            }
            if (isIdentStart(source[index])) {
                const ident = readIdentifier(source, index);
                tokens.add('$' + ident.token.replace(/[!?]$/, ''));
                index = ident.next;
            }
            continue;
        }

        if ((ch === '$' || ch === '@' || ch === '%') && isIdentStart(source[index + 1])) {
            const ident = readIdentifier(source, index + 1);
            const word = ident.token.replace(/[!?]$/, '');
            tokens.add(ch + word);
            tokens.add('sigil:' + ch);
            index = ident.next;
            continue;
        }

        if (ch === '@' && source[index + 1] === '@' && isIdentStart(source[index + 2])) {
            const ident = readIdentifier(source, index + 2);
            const word = ident.token.replace(/[!?]$/, '');
            tokens.add('@@' + word);
            tokens.add('sigil:@@');
            index = ident.next;
            continue;
        }

        if (ch === '|' && source[index + 1] !== '|' && source[index + 1] !== '=') {
            const block = readBlockParam(source, index);
            if (block) {
                tokens.add('block-param');
                for (let i = 0; i < block.names.length; i += 1) {
                    tokens.add(block.names[i]);
                }
                index = block.next;
                continue;
            }
        }

        const op = matchOperator(source, index);
        if (op) {
            tokens.add(op);
            index += op.length;
            continue;
        }

        if (ch === ':') {
            tokens.add(':');
            index += 1;
            continue;
        }

        if (isIdentStart(ch)) {
            const ident = readIdentifier(source, index);
            tokens.add(ident.token);
            if (ident.token === 'for' && isPythonForIn(source, ident.next)) {
                tokens.add('for-in:');
            }
            index = ident.next;
            continue;
        }

        index += 1;
    }

    return Array.from(tokens);
}

module.exports = {
    tokenize: tokenize
};
