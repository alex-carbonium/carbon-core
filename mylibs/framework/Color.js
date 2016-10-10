define(function(){
    var fwk = sketch.framework;
    var simple_colors = {
        aliceblue: 'f0f8ff',
        antiquewhite: 'faebd7',
        aqua: '00ffff',
        aquamarine: '7fffd4',
        azure: 'f0ffff',
        beige: 'f5f5dc',
        bisque: 'ffe4c4',
        black: '000000',
        blanchedalmond: 'ffebcd',
        blue: '0000ff',
        blueviolet: '8a2be2',
        brown: 'a52a2a',
        burlywood: 'deb887',
        cadetblue: '5f9ea0',
        chartreuse: '7fff00',
        chocolate: 'd2691e',
        coral: 'ff7f50',
        cornflowerblue: '6495ed',
        cornsilk: 'fff8dc',
        crimson: 'dc143c',
        cyan: '00ffff',
        darkblue: '00008b',
        darkcyan: '008b8b',
        darkgoldenrod: 'b8860b',
        darkgray: 'a9a9a9',
        darkgreen: '006400',
        darkkhaki: 'bdb76b',
        darkmagenta: '8b008b',
        darkolivegreen: '556b2f',
        darkorange: 'ff8c00',
        darkorchid: '9932cc',
        darkred: '8b0000',
        darksalmon: 'e9967a',
        darkseagreen: '8fbc8f',
        darkslateblue: '483d8b',
        darkslategray: '2f4f4f',
        darkturquoise: '00ced1',
        darkviolet: '9400d3',
        deeppink: 'ff1493',
        deepskyblue: '00bfff',
        dimgray: '696969',
        dodgerblue: '1e90ff',
        feldspar: 'd19275',
        firebrick: 'b22222',
        floralwhite: 'fffaf0',
        forestgreen: '228b22',
        fuchsia: 'ff00ff',
        gainsboro: 'dcdcdc',
        ghostwhite: 'f8f8ff',
        gold: 'ffd700',
        goldenrod: 'daa520',
        gray: '808080',
        green: '008000',
        greenyellow: 'adff2f',
        honeydew: 'f0fff0',
        hotpink: 'ff69b4',
        indianred : 'cd5c5c',
        indigo : '4b0082',
        ivory: 'fffff0',
        khaki: 'f0e68c',
        lavender: 'e6e6fa',
        lavenderblush: 'fff0f5',
        lawngreen: '7cfc00',
        lemonchiffon: 'fffacd',
        lightblue: 'add8e6',
        lightcoral: 'f08080',
        lightcyan: 'e0ffff',
        lightgoldenrodyellow: 'fafad2',
        lightgrey: 'd3d3d3',
        lightgreen: '90ee90',
        lightpink: 'ffb6c1',
        lightsalmon: 'ffa07a',
        lightseagreen: '20b2aa',
        lightskyblue: '87cefa',
        lightslateblue: '8470ff',
        lightslategray: '778899',
        lightsteelblue: 'b0c4de',
        lightyellow: 'ffffe0',
        lime: '00ff00',
        limegreen: '32cd32',
        linen: 'faf0e6',
        magenta: 'ff00ff',
        maroon: '800000',
        mediumaquamarine: '66cdaa',
        mediumblue: '0000cd',
        mediumorchid: 'ba55d3',
        mediumpurple: '9370d8',
        mediumseagreen: '3cb371',
        mediumslateblue: '7b68ee',
        mediumspringgreen: '00fa9a',
        mediumturquoise: '48d1cc',
        mediumvioletred: 'c71585',
        midnightblue: '191970',
        mintcream: 'f5fffa',
        mistyrose: 'ffe4e1',
        moccasin: 'ffe4b5',
        navajowhite: 'ffdead',
        navy: '000080',
        oldlace: 'fdf5e6',
        olive: '808000',
        olivedrab: '6b8e23',
        orange: 'ffa500',
        orangered: 'ff4500',
        orchid: 'da70d6',
        palegoldenrod: 'eee8aa',
        palegreen: '98fb98',
        paleturquoise: 'afeeee',
        palevioletred: 'd87093',
        papayawhip: 'ffefd5',
        peachpuff: 'ffdab9',
        peru: 'cd853f',
        pink: 'ffc0cb',
        plum: 'dda0dd',
        powderblue: 'b0e0e6',
        purple: '800080',
        red: 'ff0000',
        rosybrown: 'bc8f8f',
        royalblue: '4169e1',
        saddlebrown: '8b4513',
        salmon: 'fa8072',
        sandybrown: 'f4a460',
        seagreen: '2e8b57',
        seashell: 'fff5ee',
        sienna: 'a0522d',
        silver: 'c0c0c0',
        skyblue: '87ceeb',
        slateblue: '6a5acd',
        slategray: '708090',
        snow: 'fffafa',
        springgreen: '00ff7f',
        steelblue: '4682b4',
        tan: 'd2b48c',
        teal: '008080',
        thistle: 'd8bfd8',
        tomato: 'ff6347',
        turquoise: '40e0d0',
        violet: 'ee82ee',
        violetred: 'd02090',
        wheat: 'f5deb3',
        white: 'ffffff',
        whitesmoke: 'f5f5f5',
        yellow: 'ffff00',
        yellowgreen: '9acd32'
    };


    fwk.Color = function(color_string) {
        this.ok = false;

        // strip any leading #
        if (color_string.charAt(0) == '#') { // remove # if any
            color_string = color_string.substr(1, 6);
        }

        color_string = color_string.replace(/ /g, '');
        color_string = color_string.toLowerCase();

        // before getting into regexps, try simple matches
        // and overwrite the input
        for (var key in simple_colors) {
            if (color_string == key) {
                color_string = simple_colors[key];
            }
        }
        // emd of simple type-in colors

        // array of color definition objects
        var color_defs = [
            {
                re: /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/,
                example: ['rgb(123, 234, 45)', 'rgb(255,234,245)'],
                process: function (bits) {
                    return [
                        parseInt(bits[1]),
                        parseInt(bits[2]),
                        parseInt(bits[3]),
                        1
                    ];
                }
            },
            {
                re: /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}\.*\d*)\)$/,
                example: ['rgba(123, 234, 45, 1)', 'rgba(255,234,245. 1)'],
                process: function (bits) {
                    return [
                        parseInt(bits[1]),
                        parseInt(bits[2]),
                        parseInt(bits[3]),
                        parseFloat(bits[4])
                    ];
                }
            },
            {
                re: /^(\w{2})(\w{2})(\w{2})$/,
                example: ['#00ff00', '336699'],
                process: function (bits) {
                    return [
                        parseInt(bits[1], 16),
                        parseInt(bits[2], 16),
                        parseInt(bits[3], 16),
                        1
                    ];
                }
            },
            {
                re: /^(\w{1})(\w{1})(\w{1})$/,
                example: ['#fb0', 'f0f'],
                process: function (bits) {
                    return [
                        parseInt(bits[1] + bits[1], 16),
                        parseInt(bits[2] + bits[2], 16),
                        parseInt(bits[3] + bits[3], 16),
                        1
                    ];
                }
            }
        ];

        // search through the definitions to find a match
        for (var i = 0; i < color_defs.length; i++) {
            var re = color_defs[i].re;
            var processor = color_defs[i].process;
            var bits = re.exec(color_string);
            if (bits) {
                channels = processor(bits);
                this.r = channels[0];
                this.g = channels[1];
                this.b = channels[2];
                this.a = channels[3];
                this.ok = true;
            }

        }

        // validate/cleanup values
        this.r = (this.r < 0 || isNaN(this.r)) ? 0 : ((this.r > 255) ? 255 : this.r);
        this.g = (this.g < 0 || isNaN(this.g)) ? 0 : ((this.g > 255) ? 255 : this.g);
        this.b = (this.b < 0 || isNaN(this.b)) ? 0 : ((this.b > 255) ? 255 : this.b);
        this.a = (this.a < 0 || isNaN(this.a)) ? 0 : ((this.a > 1) ? 1 : this.a);


        // some getters
        this.toRGB = function () {
            return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')';
        };

        this.toRGBA = function () {
            return 'rgba(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + this.a + ')';
        };

        this.toHex = function () {
            var r = this.r.toString(16);
            var g = this.g.toString(16);
            var b = this.b.toString(16);
            if (r.length == 1) r = '0' + r;
            if (g.length == 1) g = '0' + g;
            if (b.length == 1) b = '0' + b;
            return '#' + r + g + b;
        };

        this.getH = function() {
            var hsv = fwk.Color.rgbToHsv(this.r, this.g, this.b);
            return hsv[0];
        };
        this.getS = function() {
            var hsv = fwk.Color.rgbToHsv(this.r, this.g, this.b);
            return hsv[1];
        };
        this.getV = function() {
            var hsv = fwk.Color.rgbToHsv(this.r, this.g, this.b);
            return hsv[2];
        };
        this.setH = function(value) {
            var hsv = fwk.Color.rgbToHsv(this.r, this.g, this.b);
            var rgb = fwk.Color.hsvToRgb(value, hsv[1], hsv[2]);
            this.r = ~~rgb[0];
            this.g = ~~rgb[1];
            this.b = ~~rgb[2];
        };
        this.setS = function(value) {
            var hsv = fwk.Color.rgbToHsv(this.r, this.g, this.b);
            var rgb = fwk.Color.hsvToRgb(hsv[0], value, hsv[2]);
            this.r = ~~rgb[0];
            this.g = ~~rgb[1];
            this.b = ~~rgb[2];
        };

        this.setV = function(value) {
            var hsv = fwk.Color.rgbToHsv(this.r, this.g, this.b);
            var rgb = fwk.Color.hsvToRgb(hsv[0], hsv[1], value);
            this.r = ~~rgb[0];
            this.g = ~~rgb[1];
            this.b = ~~rgb[2];
        };

        this.clone = function(){
            var color = new fwk.Color(this.toRGBA());
            return color;
        };

        this.blend = function(color){
            var a = color.a;
            this.r = ~~(this.r * (1-a) + color.r * a);
            this.g = ~~(this.g * (1-a) + color.g * a);
            this.b = ~~(this.b * (1-a) + color.b * a);
            return this;
        };

        this.toStopGradient = function(value){
            var color1 = this.clone().blend(new fwk.Color('rgba(255,255,255,0.3)'));
            var color2 = this.clone().blend(new fwk.Color('rgba(255,255,255,0.1)'));
            var color3 = this.clone().blend(new fwk.Color('rgba(0,0,0,0.1)'));
            var color4 = this.clone().blend(new fwk.Color('rgba(255,255,255,0.1)'));

            var gradient = [
                {offset:0, color:color1.toRGBA()},
                {offset:0.5, color:color2.toRGBA()},
                {offset:0.51, color:color3.toRGBA()},
                {offset:1, color:color4.toRGBA()}
            ];
            gradient.toBrush = function(context, x1, y1, x2, y2){
                    var lingrad = context.createLinearGradient(x1, y1, x2, y2);
                    for(var i = 0, length = gradient.length; i < length; ++i){
                        lingrad.addColorStop(gradient[i].offset, gradient[i].color);
                    }

                    return lingrad;
                };
            return gradient;
        };
    };

    /**
     * Converts an RGB color value to HSL. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h, s, and l in the set [0, 1].
     *
     * @param   Number  r       The red color value
     * @param   Number  g       The green color value
     * @param   Number  b       The blue color value
     * @return  Array           The HSL representation
     */
    fwk.Color.rgbToHsl = function(r, g, b) {
        r /= 255,g /= 255,b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if (max == min) {
            h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return [h, s, l];
    };

    /**
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h, s, and l are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * @param   Number  h       The hue
     * @param   Number  s       The saturation
     * @param   Number  l       The lightness
     * @return  Array           The RGB representation
     */
    fwk.Color.hslToRgb = function(h, s, l) {
        var r, g, b;

        if (s == 0) {
            r = g = b = l; // achromatic
        } else {
            function hue2rgb(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [r * 255, g * 255, b * 255];
    };

    /**
     * Converts an RGB color value to HSV. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h, s, and v in the set [0, 1].
     *
     * @param   Number  r       The red color value
     * @param   Number  g       The green color value
     * @param   Number  b       The blue color value
     * @return  Array           The HSV representation
     */
    fwk.Color.rgbToHsv = function(r, g, b) {
        r = r / 255,g = g / 255,b = b / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max;

        var d = max - min;
        s = max == 0 ? 0 : d / max;

        if (max == min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return [h, s, v];
    };

    /**
     * Converts an HSV color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes h, s, and v are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * @param   Number  h       The hue
     * @param   Number  s       The saturation
     * @param   Number  v       The value
     * @return  Array           The RGB representation
     */
    fwk.Color.hsvToRgb = function(h, s, v) {
        var r, g, b;

        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0:
                r = v,g = t,b = p;
                break;
            case 1:
                r = q,g = v,b = p;
                break;
            case 2:
                r = p,g = v,b = t;
                break;
            case 3:
                r = p,g = q,b = v;
                break;
            case 4:
                r = t,g = p,b = v;
                break;
            case 5:
                r = v,g = p,b = q;
                break;
        }

        return [r * 255, g * 255, b * 255];
    };

    fwk.Color.White = "#fff";
    fwk.Color.Black = "#000";

    return fwk.Color;
});