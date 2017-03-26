import Rectangle from "framework/Rectangle";
import Circle from "framework/Circle";
import Text from "framework/text/Text";
import Path from "ui/common/Path";
import GroupContainer from "framework/GroupContainer";
import Matrix from "math/matrix";
import {combineRects} from "math/math";

define(function () {
    var svg = window.svgParser = {};

    var reAllowedSVGTagNames = /^(path|circle|polygon|polyline|ellipse|rect|line|image|text|g)$/;

    // http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
    // \d doesn't quite cut it (as we need to match an actual float number)

    // matches, e.g.: +14.56e-12, etc.
    var reNum = '(?:[-+]?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?)';

    var reViewBoxAttrValue = new RegExp(
        '^' +
        '\\s*(' + reNum + '+)\\s*,?' +
        '\\s*(' + reNum + '+)\\s*,?' +
        '\\s*(' + reNum + '+)\\s*,?' +
        '\\s*(' + reNum + '+)\\s*' +
        '$'
    );

    function hasAncestorWithNodeName(element, nodeName) {
        while (element && (element = element.parentNode)) {
            if (nodeName.test(element.nodeName)) {
                return true;
            }
        }
        return false;
    }

    var toArray = function (arrayLike) {
        return Array.prototype.slice.call(arrayLike, 0);
    };

    function parseGroupElement(element, options, matrix) {
        var group = new GroupContainer();

        App.Current.activePage.nameProvider.assignNewName(group);
        var parsedChildren = visitElements(element.children, options, matrix); // TODO: update matrix

        if(parsedChildren.length == 0){
            return null;
        }
        var rect = parsedChildren[0].getBoundaryRect();
        for(var i = 1; i < parsedChildren.length; ++i){
            var e = parsedChildren[i];
            rect = combineRects(rect, e.getBoundaryRect());
        }

        group.setProps(rect);
        for(var i = 0; i < parsedChildren.length; ++i){
            var child = parsedChildren[i];
            child.setProps({x:child.x() - rect.x, y:child.y() - rect.y});
            group.add(child);
        }

        return group;
    }

    function visitElements(children, options, matrix) {
        var res = [];
        for(var i = 0; i < children.length; ++i) {
            var parseMethod = element2Type(children[i].tagName);
            if(parseMethod) {
                var child = children[i];
                var attrs = toArray(child.attributes).map(a=>a.name);
                var parsedAttributes = svgParser.parseAttributes(child, attrs);

                var m = matrix;
                if(parsedAttributes.transformMatrix){
                    m = m.clone().append(parsedAttributes.transformMatrix);
                }
                var e = parseMethod(child, parsedAttributes, m);
                if(e) {
                    res.push(e);
                }
            }
        }

        return res;
    }

    function element2Type(name) {
        switch (name) {
            case 'path':
            case 'polygon':
                return Path.fromSvgPathElement;
            case 'line':
                return Path.fromSvgLineElement;
            case 'polyline':
                return Path.fromSvgPolylineElement;
            case 'g':
                return parseGroupElement;
            case 'circle':
            case 'ellipse':
                return Circle.fromSvgElement;
            case 'rect':
                return Rectangle.fromSvgElement;
            case 'text':
                return Text.fromSvgElement;
        }
        return null;
    }

    function getGradientDefs(doc) {
        var linearGradientEls = doc.getElementsByTagName('linearGradient'),
            radialGradientEls = doc.getElementsByTagName('radialGradient'),
            el, i,
            gradientDefs = {};

        i = linearGradientEls.length;
        for (; i--;) {
            el = linearGradientEls[i];
            gradientDefs[el.getAttribute('id')] = el;
        }

        i = radialGradientEls.length;
        for (; i--;) {
            el = radialGradientEls[i];
            gradientDefs[el.getAttribute('id')] = el;
        }

        return gradientDefs;
    }

    var attributesMap = {
        'cx': 'cx',
        'x': 'x',
        'x1': 'x1',
        'y1': 'y1',
        'x2': 'x2',
        'y2': 'y2',
        'cy': 'cy',
        'y': 'y',
        'r': 'r',
        'rx': 'rx',
        'ry': 'ry',
        'fill-opacity': 'opacity',
        'fill-rule': 'fillRule',
        'stroke-width': 'strokeWidth',
        'stroke-linecap': 'lineCap',
        'stroke-linejoin': 'lineJoin',
        'stroke-miterlimit': 'miterLimit',
        'transform': 'transformMatrix',
        'text-decoration': 'textDecoration',
        'font-size': 'fontSize',
        'data-name': 'text',
        'font-weight': 'fontWeight',
        'font-style': 'fontStyle',
        'font-family': 'fontFamily'
    };

    function normalizeAttr(attr) {
        // transform attribute names
        if (attr in attributesMap) {
            return attributesMap[attr];
        }
        return attr;
    }

    /**
     * Returns an object of attributes' name/value, given element and an array of attribute names;
     * Parses parent "g" nodes recursively upwards.
     * @static
     * @memberOf fabric
     * @method parseAttributes
     * @param {DOMElement} element Element to parse
     * @param {Array} attributes Array of attributes to parse
     * @return {Object} object containing parsed attributes' names/values
     */
    function parseAttributes(element, attributes) {

        if (!element) {
            return null;
        }

        var value,
            parsed,
            parentAttributes = {};

        // if there's a parent container (`g` node), parse its attributes recursively upwards
        if (element.parentNode && /^g$/i.test(element.parentNode.nodeName)) {
            parentAttributes = parseAttributes(element.parentNode, attributes);
        }

        var ownAttributes = attributes.reduce(function (memo, attr) {
            value = element.getAttribute(attr);
            if (attr !== 'points') {
                parsed = parseFloat(value);
            }
            if (value) {
                // "normalize" attribute values
                if ((attr === 'fill' || attr === 'stroke') && value === 'none') {
                    value = '';
                }
                if (attr === 'fill-rule') {
                    value = (value === 'evenodd') ? 'destination-over' : value;
                }
                if (attr === 'transform') {
                        value = parseTransformAttribute(value);
                }
                attr = normalizeAttr(attr);
                memo[attr] = isNaN(parsed) ? value : parsed;
            }
            return memo;
        }, {});

        // add values parsed from style, which take precedence over attributes
        // (see: http://www.w3.org/TR/SVG/styling.html#UsingPresentationAttributes)

        ownAttributes = extend(ownAttributes, extend(getGlobalStylesForElement(element), parseStyleAttribute(element)));
        return extend(parentAttributes, ownAttributes);
    }

    /**
     * Parses "transform" attribute, returning an array of values
     * @static
     * @function
     * @method parseTransformAttribute
     * @param attributeValue {String} string containing attribute value
     * @return {Array} array of 6 elements representing transformation matrix
     */
    parseTransformAttribute = (function () {
        function rotateMatrix(matrix, args) {
            var angle = args[0];

            matrix.rotate(angle);
        }

        function scaleMatrix(matrix, args) {
            var multiplierX = args[0],
                multiplierY = (args.length === 2) ? args[1] : args[0];

            matrix.scale(multiplierX, multiplierY);
        }

        function skewXMatrix(matrix, args) {
            matrix.skew({x: args[0], y: 1});
        }

        function skewYMatrix(matrix, args) {
            matrix.skew({y: args[0], x: 1});
        }

        function translateMatrix(matrix, args) {
            if(args.length == 2) {
                matrix.translate(args[0], args[1]);
            } else if(args.length == 1){
                matrix.translate(args[0], args[0]);
            }
        }


        // == begin transform regexp
        var number = '(?:[-+]?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?)',
            comma_wsp = '(?:\\s+,?\\s*|,\\s*)',

            skewX = '(?:(skewX)\\s*\\(\\s*(' + number + ')\\s*\\))',
            skewY = '(?:(skewY)\\s*\\(\\s*(' + number + ')\\s*\\))',
            rotate = '(?:(rotate)\\s*\\(\\s*(' + number + ')(?:' + comma_wsp + '(' + number + ')' + comma_wsp + '(' + number + '))?\\s*\\))',
            scale = '(?:(scale)\\s*\\(\\s*(' + number + ')(?:' + comma_wsp + '(' + number + '))?\\s*\\))',
            translate = '(?:(translate)\\s*\\(\\s*(' + number + ')(?:' + comma_wsp + '(' + number + '))?\\s*\\))',

            matrix = '(?:(matrix)\\s*\\(\\s*' +
                '(' + number + ')' + comma_wsp +
                '(' + number + ')' + comma_wsp +
                '(' + number + ')' + comma_wsp +
                '(' + number + ')' + comma_wsp +
                '(' + number + ')' + comma_wsp +
                '(' + number + ')' +
                '\\s*\\))',

            transform = '(?:' +
                matrix + '|' +
                translate + '|' +
                scale + '|' +
                rotate + '|' +
                skewX + '|' +
                skewY +
                ')',

            transforms = '(?:' + transform + '(?:' + comma_wsp + transform + ')*' + ')',

            transform_list = '^\\s*(?:' + transforms + '?)\\s*$',

            // http://www.w3.org/TR/SVG/coords.html#TransformAttribute
            reTransformList = new RegExp(transform_list),
            // == end transform regexp

            reTransform = new RegExp(transform);

        return function (attributeValue) {

            // start with identity matrix
            var matrix = Matrix.create();

            // return if no argument was given or
            // an argument does not match transform attribute regexp
            if (!attributeValue || (attributeValue && !reTransformList.test(attributeValue))) {
                return matrix;
            }

            attributeValue.replace(reTransform, function (match) {

                var m = new RegExp(transform).exec(match).filter(function (match) {
                        return (match !== '' && match != null);
                    }),
                    operation = m[1],
                    args = m.slice(2).map(parseFloat);

                switch (operation) {
                    case 'translate':
                        translateMatrix(matrix, args);
                        break;
                    case 'rotate':
                        rotateMatrix(matrix, args);
                        break;
                    case 'scale':
                        scaleMatrix(matrix, args);
                        break;
                    case 'skewX':
                        skewXMatrix(matrix, args);
                        break;
                    case 'skewY':
                        skewYMatrix(matrix, args);
                        break;
                    case 'matrix':
                        matrix = new Matrix(args);
                        break;
                }
            });
            return matrix;
        };
    })();

    /**
     * Parses "points" attribute, returning an array of values
     * @static
     * @memberOf fabric
     * @method parsePointsAttribute
     * @param points {String} points attribute string
     * @return {Array} array of points
     */
    function parsePointsAttribute(points) {

        // points attribute is required and must not be empty
        if (!points) return null;

        points = points.trim();
        var asPairs = points.indexOf(',') > -1;

        points = points.split(/\s+/);
        var parsedPoints = [], i, len;

        // points could look like "10,20 30,40" or "10 20 30 40"
        if (asPairs) {
            i = 0;
            len = points.length;
            for (; i < len; i++) {
                var pair = points[i].split(',');
                parsedPoints.push({x: parseFloat(pair[0]), y: parseFloat(pair[1])});
            }
        }
        else {
            i = 0;
            len = points.length;
            for (; i < len; i += 2) {
                parsedPoints.push({x: parseFloat(points[i]), y: parseFloat(points[i + 1])});
            }
        }

        // odd number of points is an error
        if (parsedPoints.length % 2 !== 0) {
            // return null;
        }

        return parsedPoints;
    }

    /**
     * Parses "style" attribute, retuning an object with values
     * @static
     * @memberOf fabric
     * @method parseStyleAttribute
     * @param {SVGElement} element Element to parse
     * @return {Object} Objects with values parsed from style attribute of an element
     */
    function parseStyleAttribute(element) {
        var oStyle = {},
            style = element.getAttribute('style');

        if (!style) return oStyle;

        if (typeof style === 'string') {
            style = style.replace(/;$/, '').split(';').forEach(function (current) {

                var attr = current.split(':');
                var value = attr[1].trim();

                // TODO: need to normalize em, %, pt, etc. to px (!)
                var parsed = parseFloat(value);

                oStyle[normalizeAttr(attr[0].trim().toLowerCase())] = isNaN(parsed) ? value : parsed;
            });
        }
        else {
            for (var prop in style) {
                if (typeof style[prop] === 'undefined') continue;

                var parsed = parseFloat(style[prop]);
                oStyle[normalizeAttr(prop.toLowerCase())] = isNaN(parsed) ? style[prop] : parsed;
            }
        }

        return oStyle;
    }

    function resolveGradients(instances) {
//        for (var i = instances.length; i--; ) {
//          var instanceFillValue = instances[i].get('fill');
//
//          if (/^url\(/.test(instanceFillValue)) {
//
//            var gradientId = instanceFillValue.slice(5, instanceFillValue.length - 1);
//
//            if (gradientDefs[gradientId]) {
//              instances[i].set('fill',
//                fabric.Gradient.fromElement(gradientDefs[gradientId], instances[i]));
//            }
//          }
//        }
    }

    /**
     * Transforms an array of svg elements to corresponding fabric.* instances
     * @static
     * @memberOf fabric
     * @method parseElements
     * @param {Array} elements Array of elements to parse
     * @param {Function} callback Being passed an array of fabric instances (transformed from SVG elements)
     * @param {Object} [options] Options object
     * @param {Function} [reviver] Method for further parsing of SVG elements, called after each fabric object created.
     */
    function parseElements(elements, callback, options, reviver) {
        var instances = new Array(elements.length);

        for (var index = 0, el, len = elements.length; index < len; index++) {
            el = elements[index];
            var factoryMethod = element2Type(el.tagName);
            if (factoryMethod) {
                try {
                    var obj = factoryMethod(el, options);
                    reviver && reviver(el, obj);
                    instances.splice(index, 0, obj);
                }
                catch (err) {
                    logger.error("Error parsing svg", err);
                }
            }
        }

        instances = instances.filter(function (el) {
            return el != null;
        });

        resolveGradients(instances);
        callback(instances);
    }

    /**
     * Returns CSS rules for a given SVG document
     * @static
     * @function
     * @memberOf fabric
     * @method getCSSRules
     * @param {SVGDocument} doc SVG document to parse
     * @return {Object} CSS rules of this document
     */
    function getCSSRules(doc) {
        var styles = doc.getElementsByTagName('style'),
            allRules = {},
            rules;

        // very crude parsing of style contents
        for (var i = 0, len = styles.length; i < len; i++) {
            var styleContents = styles[0].textContent;

            // remove comments
            styleContents = styleContents.replace(/\/\*[\s\S]*?\*\//g, '');

            rules = styleContents.match(/[^{]*\{[\s\S]*?\}/g);
            rules = rules.map(function (rule) {
                return rule.trim();
            });

            rules.forEach(function (rule) {
                var match = rule.match(/([\s\S]*?)\s*\{([^}]*)\}/);
                rule = match[1];
                var declaration = match[2].trim(),
                    propertyValuePairs = declaration.replace(/;$/, '').split(/\s*;\s*/);

                if (!allRules[rule]) {
                    allRules[rule] = {};
                }

                for (var i = 0, len = propertyValuePairs.length; i < len; i++) {
                    var pair = propertyValuePairs[i].split(/\s*:\s*/),
                        property = pair[0],
                        value = pair[1];

                    allRules[rule][property] = value;
                }
            });
        }

        return allRules;
    }

    /**
     * @private
     */
    function getGlobalStylesForElement(element) {
        var nodeName = element.nodeName,
            className = element.getAttribute('class'),
            id = element.getAttribute('id'),
            styles = {};

        for (var rule in cssRules) {
            var ruleMatchesElement = (className && new RegExp('^\\.' + className).test(rule)) ||
                (id && new RegExp('^#' + id).test(rule)) ||
                (new RegExp('^' + nodeName).test(rule));

            if (ruleMatchesElement) {
                for (var property in cssRules[rule]) {
                    styles[normalizeAttr(property)] = cssRules[rule][property];
                }
            }
        }

        return styles;
    }

    /**
     * Parses an SVG document, converts it to an array of corresponding fabric.* instances and passes them to a callback
     * @static
     * @function
     * @memberOf fabric
     * @method parseSVGDocument
     * @param {SVGDocument} doc SVG document to parse
     * @param {Function} callback Callback to call when parsing is finished; It's being passed an array of elements (parsed from a document).
     * @param {Function} [reviver] Method for further parsing of SVG elements, called after each fabric object created.
     */
    parseSVGDocument = (function () {

        return function (doc, callback, reviver) {
            if (!doc) return;

            var startTime = new Date(),
                descendants = toArray(doc.getElementsByTagName('*'));

            var matrix = Matrix.create();


            // if (descendants.length === 0) {
            //     // we're likely in node, where "o3-xml" library fails to gEBTN("*")
            //     // https://github.com/ajaxorg/node-o3-xml/issues/21
            //     descendants = doc.selectNodes("//*[name(.)!='svg']");
            //     var arr = [];
            //     for (var i = 0, len = descendants.length; i < len; i++) {
            //         arr[i] = descendants[i];
            //     }
            //     descendants = arr;
            // }

            var elements = descendants.filter(function (el) {
                return reAllowedSVGTagNames.test(el.tagName) && !hasAncestorWithNodeName(el, /^(?:pattern|defs)$/); // http://www.w3.org/TR/SVG/struct.html#DefsElement
            });

            if (!elements || (elements && !elements.length)) return;

            var viewBoxAttr = doc.getAttribute('viewBox'),
                widthAttr = doc.getAttribute('width'),
                heightAttr = doc.getAttribute('height'),
                width = null,
                height = null,
                minX,
                minY;

            if (viewBoxAttr && (viewBoxAttr = viewBoxAttr.match(reViewBoxAttrValue))) {
                minX = parseInt(viewBoxAttr[1], 10);
                minY = parseInt(viewBoxAttr[2], 10);
                width = parseInt(viewBoxAttr[3], 10);
                height = parseInt(viewBoxAttr[4], 10);
            }

            // values of width/height attributes overwrite those extracted from viewbox attribute
            width = widthAttr ? parseFloat(widthAttr) : width;
            height = heightAttr ? parseFloat(heightAttr) : height;

            var options = {
                width: width,
                height: height
            };

            gradientDefs = getGradientDefs(doc);
            cssRules = getCSSRules(doc);

            // Precedence of rules:   style > class > attribute
            var res = visitElements(doc.children, options, matrix);
            callback(res, options);
            // parseElements(elements, function (instances) {
            //     documentParsingTime = new Date() - startTime;
            //     if (callback) {
            //         callback(instances, options);
            //     }
            // }, clone(options), reviver);
        };
    })();

    function loadSVGFromString(string, r) {
        string = string.trim();
        return new Promise(function (resolve, reject) {
            var doc;
            if (typeof DOMParser !== 'undefined') {
                var parser = new DOMParser();
                if (parser && parser.parseFromString) {
                    doc = parser.parseFromString(string, 'text/xml');
                }
            }
            else if (window.ActiveXObject) {
                doc = new ActiveXObject('Microsoft.XMLDOM');
                doc.async = 'false';
                //IE chokes on DOCTYPE
                doc.loadXML(string.replace(/<!DOCTYPE[\s\S]*?(\[[\s\S]*\])*?>/i, ''));
            }

            parseSVGDocument(doc.documentElement, function (results, options) {
                if (results.length === 1) {
                    resolve(results[0], options);
                }
                var group = new GroupContainer();
                App.Current.activePage.nameProvider.assignNewName(group);

                var right = 0;
                var bottom = 0;
                for (var i = 0; i < results.length; ++i) {
                    var rect = results[i].getBoundaryRect();
                    var r = rect.x + rect.width;
                    if (r > right) {
                        right = r;
                    }
                    var b = rect.y + rect.height;
                    if (b > bottom) {
                        bottom = b;
                    }
                }

                group.setProps({width: right, height: bottom});

                for (var i = 0; i < results.length; ++i) {
                    group.add(results[i]);
                }

                resolve(group, options);
            }, r);
        });
    }

    svg.parseAttributes = parseAttributes;
    svg.loadSVGFromString = loadSVGFromString;
    return {
        loadSVGFromString: loadSVGFromString
    };

});