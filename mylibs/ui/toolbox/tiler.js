define(function () {
    return {
        fitToTile: function (w, h, tileType, padding) {
            padding = padding || 0;
            var data = {};
            data.width = 128;
            data.height = 60;

            if (tileType == 3) {
                data.width = 257;
                data.height = 121;
            }
            else if (tileType == 2) {
                data.width = 257;
            }

            var pw = data.width - padding * 2;
            var ph = data.height - padding * 2;

            if (w / h >= 1.62) {
                data.scale = pw / w;
                if (h * data.scale > ph) {
                    data.scale = ph / h;
                }
            } else {
                data.scale = ph / h;
                if (w * data.scale > pw) {
                    data.scale = pw / w;
                }
            }

            if (data.scale > 1) {
                data.scale = 1;
            }

            return data;
        },
        chooseTileType: function (w, h) {
            var opaque = w / h < 2;
            if (opaque && h > 200) {
                return 3;
            }
            var wide = w > 250;
            if (wide) {
                return 2;
            }
            return 1;
        }
    };
});