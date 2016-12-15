import globals from "./globals";

var settings = {
    ruler: {
        size: 13,
        artboard_fill: 'rgba(255, 255, 255, .5)',
        overlay_fill: 'gray',
        overlay_opacity: .3,
        tick_minor_size: 3,
        font_size: 8,
        tick_stroke: '#838089',
        label_stroke: '#75747b',
        selection_label_fill: '#a6a5ad',
        selection_value_fill: '#59235d',
        selection_edge_fill: '#59235d',
        selection_fill: 'rgba(89, 35, 93, 0.19)'
    },
    guides: {
        stroke: "#9918ff"
    },
    group: {
        active_stroke: "#9918ff"
    },
    frame: {
        stroke: '#22c1ff'
    },
    showBoundingBoxes: false
};

globals.userSettings = settings;

export default settings;