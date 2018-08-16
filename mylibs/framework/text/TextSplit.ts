export class TextSplit {
    _codes = null;
    _word = null;
    _trailingSpaces = null;
    _newLine = true;

    constructor(codes) {
        this._word = null;
        this._codes = codes;
        this._trailingSpaces = null;
        this._newLine = true;
    }    

    split(emit, inputChar) {
        var endOfWord;
        if (inputChar.char === null) {
            endOfWord = true;
        } else {
            if (this._newLine) {
                endOfWord = true;
                this._newLine = false;
            }
            if (typeof inputChar.char === 'string') {
	            switch (inputChar.char) {
	                case ' ':
	                    if (!this._trailingSpaces) {
	                        this._trailingSpaces = inputChar;
	                    }
	                    break;
	                case '\n':
	                    endOfWord = true;
	                    this._newLine = true;
	                    break;
	                default:
	                    if (this._trailingSpaces) {
	                        endOfWord = true;
	                    }
                }
            } else {
                var code = this._codes(inputChar.char);
                if (code.block || code.eof) {
                    endOfWord = true;
                    this._newLine = true;
                } 
            }
        }
        if (endOfWord) {
            if (this._word && !this._word.equals(inputChar)) {
                if (emit({
                    text: this._word,
                    spaces: this._trailingSpaces || inputChar,
                    end: inputChar
                }) === false) {
                    return false;
                }
                this._trailingSpaces = null;
            }
            if (inputChar.char === null) {
                emit(null); // Indicate end of stream
            }

            this._word = inputChar;
        }
    }  
}