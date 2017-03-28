import MeasureResult from "./measureresult";
import TextRender from "../static/textrender";

    function DomMeasure(text, style) {
        var span, block, div;

        span = document.createElement('span');
        block = document.createElement('div');
        div = document.createElement('div');

        block.style.display = 'inline-block';
        block.style.width = '1px';
        block.style.height = '0';

        div.style.visibility = 'hidden';
        div.style.position = 'absolute';
        div.style.top = '0';
        div.style.left = '0';
        div.style.width = '500px';
        div.style.height = '200px';

        div.appendChild(span);
        div.appendChild(block);
        document.body.appendChild(div);
        try {
            span.setAttribute('style', style);

            span.innerHTML = '';
            span.appendChild(document.createTextNode(text.replace(/\s/g, TextRender.NBSP)));

            var result = new MeasureResult();
            block.style.verticalAlign = 'baseline';
            result.ascent = (block.offsetTop - span.offsetTop);
            block.style.verticalAlign = 'bottom';
            result.height = (block.offsetTop - span.offsetTop);
            result.descent = result.height - result.ascent;
            result.width = span.offsetWidth;
        } finally {
            div.parentNode.removeChild(div);
            div = null;
        }
        return result;
    }

    export default DomMeasure;
