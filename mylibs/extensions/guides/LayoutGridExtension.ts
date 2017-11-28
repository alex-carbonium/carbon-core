import SnapController from "framework/SnapController";
import PropertyTracker from "framework/PropertyTracker";
import LayoutGridLines from "./LayoutGridLines";
import LayoutGridColumns from "./LayoutGridColumns";
import Environment from "environment";

//TODO: handle artboard delete event

export default class LayoutGridExtension {
    [name: string]: any;

    constructor(app) {
        this.app = app;
        this.app.onLoad(() => {this.load()});
        this.onArtboardBackgroundDrawnHandler = this.onArtboardBackgroundDrawn.bind(this);
        this.onArtboardContentDrawnHandler = this.onArtboardContentDrawn.bind(this);
    }
    load() {
        this._setupPageGuides(this.app.activePage);

        this.app.pageChanged.bind((oldPage, newPage) => {
            var artboards = oldPage.getAllArtboards();
            artboards.forEach(x => this._detachFromArtboard(x));

            this._setupPageGuides(newPage);
        });

        this.app.enablePropsTracking();

        PropertyTracker.propertyChanged.bind(this, this._propertyChanged);
    }
    onArtboardBackgroundDrawn(artboard, context) {
        context.save();

        var columns = this._layoutColumns[artboard.id];
        if (columns) {
            columns.draw(context);
        }

        context.restore();
    }
    onArtboardContentDrawn(artboard, context) {
        context.save();

        var lines = this._layoutLines[artboard.id];
        if (lines) {
            lines.draw(context);
        }

        context.restore();
    }
    _setupPageGuides(page) {
        this._clearAll();

        var artboards = page.getAllArtboards();
        for (var i = 0; i < artboards.length; i++) {
            this._createArtboardLayoutGrid(artboards[i]);
        }
    }
    _propertyChanged(element, props, oldProps) {
        if (element === this.app) {
            if (props.layoutGridStyle !== undefined) {
                var wasShown = oldProps && oldProps.layoutGridStyle && oldProps.layoutGridStyle.show;
                if (props.layoutGridStyle.show && !wasShown) {
                    let artboards = this.app.activePage.getAllArtboards();
                    for (let i = 0; i < artboards.length; i++) {
                        this._createArtboardLayoutGrid(artboards[i]);
                    }
                }
                else if (wasShown && !props.layoutGridStyle.show) {
                    let artboards = this.app.activePage.getAllArtboards();
                    for (let i = 0; i < artboards.length; i++) {
                        this._removeArtboardLayoutGrid(artboards[i]);
                    }
                }

                if (oldProps.layoutGridStyle && props.layoutGridStyle.type !== oldProps.layoutGridStyle.type) {
                    let artboards = this.app.activePage.getAllArtboards();
                    for (let i = 0; i < artboards.length; i++) {
                        this._removeArtboardLayoutGrid(artboards[i]);
                        this._createArtboardLayoutGrid(artboards[i]);
                    }
                }
            }
        }
        else {
            let artboards = this.app.activePage.getAllArtboards();
            let i = artboards.indexOf(element);
            if (i !== -1) {
                var artboard = artboards[i];
                if (props.layoutGridSettings !== undefined) {
                    this._removeArtboardLayoutGrid(artboard);
                    this._createArtboardLayoutGrid(artboard);
                }
                else if (artboard.props.layoutGridSettings && (props.width !== undefined || props.height !== undefined)) {
                    this._updateArtboardLayoutGrid(artboard, props, oldProps);
                }
            }
        }
    }
    _createArtboardLayoutGrid(artboard) {
        var artboardId = artboard.id;

        var settings = artboard.layoutGridSettings();
        if (settings) {
            var columnWidth = calculateColumnWidth(settings, artboard.width);

            if (this.app.props.layoutGridStyle.type === "stroke") {
                var lines = new LayoutGridLines(Environment.view);
                setupLayoutGrid(lines, artboard, columnWidth);
                this._layoutLines[artboardId] = lines;
                SnapController.snapGuides.push(lines);
            }
            else if (this.app.props.layoutGridStyle.type === "fill") {
                var columns = new LayoutGridColumns();
                setupLayoutGrid(columns, artboard, columnWidth);
                this._layoutColumns[artboardId] = columns;
                SnapController.snapGuides.push(columns);
            }

            this._attachToArtboard(artboard);
        }
    }
    _updateArtboardLayoutGrid(artboard, newRect, oldRect) {
        var artboardId = artboard.id;
        var columnWidth;
        if (newRect.width !== undefined) {
            columnWidth = calculateColumnWidth(artboard.props.layoutGridSettings, newRect.width);
        }
        else {
            columnWidth = calculateColumnWidth(artboard.props.layoutGridSettings, oldRect.width);
        }
        var lines = this._layoutLines[artboardId];
        if (lines) {
            setupLayoutGrid(lines, artboard, columnWidth);
        }
        var columns = this._layoutColumns[artboardId];
        if (columns) {
            setupLayoutGrid(columns, artboard, columnWidth);
        }
    }
    _removeArtboardLayoutGrid(artboard) {
        var artboardId = artboard.id;

        for (var i = SnapController.snapGuides.length - 1; i >= 0; i--) {
            var guide = SnapController.snapGuides[i];
            var isLayoutGrid = guide instanceof LayoutGridColumns || guide instanceof LayoutGridLines;
            if (isLayoutGrid && guide.props.artboardId === artboardId) {
                SnapController.snapGuides.splice(i, 1);
            }
        }

        this._detachFromArtboard(artboard);
        delete this._layoutLines[artboardId];
        delete this._layoutColumns[artboardId];
    }
    _attachToArtboard(artboard) {
        artboard.enablePropsTracking();
        if (this._layoutColumns[artboard.id]) {
            artboard.onBackgroundDrawn = this.onArtboardBackgroundDrawnHandler;
        }
        if (this._layoutLines[artboard.id]) {
            artboard.onContentDrawn = this.onArtboardContentDrawnHandler;
        }
    }
    _detachFromArtboard(artboard) {
        delete artboard.onBackgroundDrawn;
        delete artboard.onContentDrawn;
        artboard.disablePropsTracking();
    }
    _clearAll() {
        this._layoutLines = {};
        this._layoutColumns = {};

        for (var i = SnapController.snapGuides.length - 1; i >= 0; i--) {
            var guide = SnapController.snapGuides[i];
            var isLayoutGrid = guide instanceof LayoutGridColumns || guide instanceof LayoutGridLines;
            if (isLayoutGrid) {
                SnapController.snapGuides.splice(i, 1);
            }
        }
    }
    detach() {

    }
}

function calculateColumnWidth(settings, totalWidth) {
    if (!settings.autoColumnWidth) {
        return settings.columnWidth;
    }
    var totalGap = settings.gutterWidth * (settings.columnsCount - 1);
    return ((totalWidth - totalGap) / settings.columnsCount + .5) | 0;
}

function setupLayoutGrid(guides, artboard, actualColumnWidth) {
    var settings = artboard.props.layoutGridSettings;
    var rect = artboard.getBoundaryRectGlobal();
    let props = {
        settings: settings,
        rect: rect,
        actualColumnWidth: actualColumnWidth,
        artboardId: artboard.id
    };
    guides.prepareProps(props);
    guides.setProps(props);
}