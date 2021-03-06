import RelayoutQueue from "./RelayoutQueue";
import ModelStateListener from "./ModelStateListener";
import PrimitiveHandler from "../sync/PrimitiveHandlers";
import { NodePrimitivesMap, IApp, IPrimitive, IPrimitiveRoot, LayerType, Primitive } from "carbon-core";
import backend from "../../backend";
import params from "../../params";
import CommandManager from "../commands/CommandManager";
import Invalidate from "../Invalidate";
import NullPage from "../NullPage";
import { pushAll } from "../../util";
import PrimitiveCommand from "../commands/PrimitiveCommand";
import Selection from "../SelectionModel";
import UIElement from "../UIElement";
import EventHelper from "../EventHelper";
import IsolationContext from "../../IsolationContext";

var debug = require("DebugUtil")("carb:relayoutEngine");

//TODO: each element must define clipping boundary in relayout loop
//TODO: global matrix must be calculated in relayout loop
//TODO: global rect must be calculated in relayout loop

/**
 * Relayout principles:
 *  - ModelStateListener contains changes made by the user.
 * Additionally, it will collect relayout arrange changes.
 * These changes must be logged as a command.
 *
 *  - RelayoutQueue contains local changes from Undo/Redo and external changes.
 * These changes must be saved on the server together with ModelStateListener changes,
 * but they must not be logged in a Command (app.changedLocally).
 *
 * - Finally, all-all changes must be provided to UI (app.changed).
 */
class RelayoutEngine {
    private primitiveRootCache = {};
    private localQueuedPrimitives: Primitive[] = [];
    private externalQueuedPrimitives: Primitive[] = [];
    private allPrimitives: Primitive[] = [];
    private rollbacks: Primitive[] = [];

    relayoutFinished = EventHelper.createEvent<void>();
    rootRelayoutFinished = EventHelper.createEvent2<IPrimitiveRoot, NodePrimitivesMap>();

    performAppRelayout(app: IApp) {
        try {
            params.perf && performance.mark("App.Relayout");
            this.relayoutInternal(app);
            params.perf && performance.measure("App.Relayout", "App.Relayout");
        }
        finally {
            ModelStateListener.clear();

            this.primitiveRootCache = {};
            this.localQueuedPrimitives.length = 0;
            this.externalQueuedPrimitives.length = 0;
            this.allPrimitives.length = 0;
            this.rollbacks.length = 0;
        }
    }

    private relayoutInternal(app: IApp) {
        let roots = ModelStateListener.roots;

        //run relayout and grab queued primitives
        for (let i = 0; i < roots.length; ++i) {
            let primitiveRootElement = this.findPrimitiveRoot(app, roots[i]);
            if (primitiveRootElement === app) {
                var primitiveMap = RelayoutQueue.dequeue(app);
                if (primitiveMap) {
                    var appPrimitives = primitiveMap[app.primitiveRootKey()];
                    for (let j = 0; j < appPrimitives.length; j++) {
                        PrimitiveHandler.handle(app, appPrimitives[j]);
                    }
                    this.filterQueuedPrimitives(appPrimitives);
                }
            }
            else if (primitiveRootElement) { // the element can be deleted
                let res = primitiveRootElement.relayout(ModelStateListener.elementsPropsCache);
                this.filterQueuedPrimitives(res);
            }
        }

        // this one should be in a separate loop, because we can get more elements after relayout
        for (let i = 0; i < roots.length; ++i) {
            let primitiveRootElement = this.findPrimitiveRoot(app, roots[i]);
            if (primitiveRootElement) {
                primitiveRootElement.relayoutCompleted();
            }
        }

        //command should be produced only for new changes registered in the roots
        pushAll(this.allPrimitives, ModelStateListener.primitives);
        if (this.allPrimitives.length) {
            for (let j = 0; j < this.allPrimitives.length; j++) {
                let p = this.allPrimitives[j];
                this.rollbacks.push(p._rollbackData);
                delete p._rollbackData;
            }
            let isolationLayer = IsolationContext.isolationLayer;
            let inIsolation = isolationLayer && isolationLayer.isActive;

            let elements = Selection.elements.length ? Selection.elements : Selection.previousElements;
            CommandManager.registerExecutedCommand(new PrimitiveCommand(
                this.allPrimitives.slice(),
                this.rollbacks.slice().reverse(),
                app.activePage.id,
                Selection.latestGlobalBoundingBox,
                inIsolation));
        }

        //all local changes (from queue and model) must go to server
        pushAll(this.allPrimitives, this.localQueuedPrimitives);
        if (this.allPrimitives.length) {
            app.changedLocally.raise(this.allPrimitives.slice());
        }

        //all local and external changes are needed for UI
        pushAll(this.allPrimitives, this.externalQueuedPrimitives);
        if (this.allPrimitives.length) {
            app.changed.raise(this.allPrimitives.slice());

            this.relayoutFinished.raise();
            //  Invalidate.request();
        }
    }

    private filterQueuedPrimitives(primitives: Primitive[]) {
        if (primitives) {
            for (let i = 0; i < primitives.length; i++) {
                let p = primitives[i];
                if (p.sessionId === backend.sessionId) {
                    this.localQueuedPrimitives.push(p);
                }
                else {
                    this.externalQueuedPrimitives.push(p);
                }
            }
        }
    }

    private findPrimitiveRoot(app: IApp, key: string) {
        var primitiveRootElementEntry = this.primitiveRootCache[key];
        var primitiveRootElement;
        if (!primitiveRootElementEntry) {
            primitiveRootElement = app.findNodeBreadthFirst(x => x.primitiveRootKey() === key);
            if (primitiveRootElement) {
                this.primitiveRootCache[key] = { element: primitiveRootElement, hitCount: 1 }
            }
        } else {
            primitiveRootElement = primitiveRootElementEntry.element;
            primitiveRootElementEntry.hitCount++;
        }
        return primitiveRootElement;
    }

    run(root, propsHistoryMap, filter = null) {
        var primitiveMap = RelayoutQueue.dequeue(root);
        var shouldArrange = ModelStateListener.isRelayoutNeeded(root);
        var res = this.visitElement(root, primitiveMap, propsHistoryMap, shouldArrange, filter);

        this.rootRelayoutFinished.raise(root, primitiveMap);

        return res;
    }

    visitElement(element, primitiveMap: NodePrimitivesMap, propsHistoryMap, shouldArrange, filter) {
        // var oldRect;
        var primitives = null;
        var hasChildren = !!element.children;

        if (hasChildren) {
            var items = element.children;
            for (let i = 0, l = items.length; i < l; ++i) {
                if (filter !== null && filter(items[i]) === false) {
                    continue;
                }
                let res = this.visitElement(items[i], primitiveMap, propsHistoryMap, shouldArrange, filter);
                if (res !== null) {
                    if (primitives === null) {
                        primitives = [];
                    }
                    Array.prototype.push.apply(primitives, res);
                }
            }

            // var entry = propsHistoryMap[element.id];
            // if (entry && entry.props) {
            //     oldRect = entry.props.br;
            // }
            // if (!oldRect) {
            //     oldRect = element.boundaryRect();
            // }
        }

        let res = this.applyPrimitives(element, primitiveMap, propsHistoryMap, shouldArrange, filter);
        if (res !== null) {
            if (primitives === null) {
                primitives = [];
            }
            Array.prototype.push.apply(primitives, res);
        }

        if (hasChildren && shouldArrange) {
            debug("** arrange %s (%s)", element.displayName(), element.id);
            //some bugs are here with contraints being applied twice, disabling for now
            //this only arranges up, arrange down is done in applyScaling
            element.performArrange(/*{oldRect}, ChangeMode.Model*/);
        }
        return primitives;
    }

    private applyPrimitives(element, primitiveMap: NodePrimitivesMap, propsHistoryMap, shouldArrange, filter) {
        if (!primitiveMap) {
            return null;
        }
        var primitives = primitiveMap[element.id];
        if (!primitives) {
            return null;
        }

        var newElements = null;

        debug("applyPrimitives for %s (%s)", element.displayName(), element.id);

        for (var i = 0; i < primitives.length; ++i) {
            var primitive = primitives[i];
            var newElement = PrimitiveHandler.handle(element, primitive);
            if (newElement) {
                if (!newElements) {
                    newElements = [];
                }
                newElements.push(newElement);
            }
        }

        let result = primitives;
        if (newElements) {
            for (let i = 0, l = newElements.length; i < l; ++i) {
                if(newElements[i].isDisposed()) {
                    continue;
                }

                let childResult = this.visitElement(newElements[i], primitiveMap, propsHistoryMap, shouldArrange, filter);
                if (childResult !== null) {
                    if (result === primitives) {
                        result = result.slice();
                    }
                    Array.prototype.push.apply(result, childResult);
                }
            }
        }

        return result;
    }
}

export default new RelayoutEngine();