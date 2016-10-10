define(function () {
    var tokenizer;

    function trim(str){
        return str.replace(/^\s+|\s+$/g, '');
    }

    function transformAutoNumbers(indent, token, state){
        if (!state.numbering){
            state.numbering = [];
        }
        if (indent > state.lastIndent + 1){
            return;
        }
        while (state.numbering.length < indent + 1){
            state.numbering.push(0);
        }
        if (indent < state.lastIndent){
            for (var i = indent + 1; i < state.numbering.length; ++i){
                state.numbering[i] = 0;
            }
        }
        ++state.numbering[indent];

        var numStr = new Array(indent + 1).join("    ") + state.numbering.slice(0, indent + 1).join(".");
        if (indent === 0){
            numStr += ".";
        }
        token.value = numStr + " ";
        token.length = token.value.length;
        token.level = indent;
    }

    function transformAutoBullets(indent, token, state){
        if (indent > state.lastIndent + 1){
            return;
        }

        var bulletStr = new Array(indent + 1).join("    ") + tokenizer.Bullet;
        token.value = bulletStr + " " + token.value.substring(indent + 1);
        token.length = token.value.length;
        token.level = indent;
    }
    function transform(token, state){
        var indent = -1;
        var autoNumbers = false;
        var autoBullets = false;

        for (var i = 0, l = token.value.length; i < l; ++i){
            var c = token.value[i];
            if (c === "#"){
                autoNumbers = true;
                indent = i;
            }
            else if (c === "*"){
                autoBullets = true;
                indent = i;
            }
            else if (c === " " || c === "\r" || c === "\n"){
                break;
            }
            else {
                indent = -1;
                break;
            }
        }

        if (indent !== -1){
            if (autoNumbers && autoBullets){
                return;
            }
            if (state.lastIndent === undefined){
                state.lastIndent = 0;
            }
            if (autoNumbers){
                transformAutoNumbers(indent, token, state);
            }
            else if (autoBullets){
                transformAutoBullets(indent, token, state);
            }

            state.lastIndent = indent;
        }
    }

    tokenizer = {};
    tokenizer.Bullet = unescape("%u2022");
    tokenizer.tokenizeLine = function(/*str*/str, transformState){
        var start = 0;
        var i = 0, length=str.length;
        var tokens = [];
              
        for (; i < length; i++) {
            if(str[i] === " "){
                // skip spaces
                for (; i < length && str[i] === " "; i++) {}

                var token = {
                    value : str.substr(start, i - start)
                };
                token.length = token.value.length;
                token.value = trim(token.value);
                if (tokens.length === 0){
                    transform(token, transformState);
                }

                tokens.push(token);
                start = i;
            }
        }

        if(start !== length){
            var end = i - start;
            if (str[i-1] === "\r"){
                end -= 1;
            }
            var token = {
                value:str.substr(start, end)
            };
            token.length = token.value.length;
            token.value = trim(token.value);
            transform(token, transformState);
            tokens.push(token);
        }

        return tokens;
    };

    tokenizer.splitLines = function(str){
        str = str.toString().replace("\r", "");
        return str.split("\n");
    };

    tokenizer.tokenize = function(str, state){
        var lines = tokenizer.splitLines(str);
        var transformState = state || {};
        var tokenLines = [];
        var tokenizeLine = tokenizer.tokenizeLine;
        for (var i = 0, length = lines.length; i < length; i++) {
            var tokens = tokenizeLine(lines[i], transformState);
            tokenLines.push(tokens);
        }

        return tokenLines;
    }

    return tokenizer;
});
