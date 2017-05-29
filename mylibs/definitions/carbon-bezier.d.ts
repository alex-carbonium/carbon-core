import { IRectData, IRange, ICoordinate } from "carbon-geometry";

declare module "carbon-bezier" {

    export interface IBezierGraph {
        contours:IContour[];
        removeDuplicateCrossings():void;
        removeCrossingsInOverlaps():void;
        insertSelfCrossings():void;
        markAllCrossingsAsUnprocessed():void;
        markCrossingsAsEntryOrExitWithBezierGraph(otherGraph:IBezierGraph, markInside:boolean):void;
        removeCrossings():void;
        removeOverlaps():void;
        nonintersectingContours():IContour[];
        containsContour(contour:IContour):boolean;
        addContour(contour:IContour):void;
        differenceWithBezierGraph(graph:IBezierGraph):IBezierGraph;
        unionWithBezierGraph(graph:IBezierGraph):IBezierGraph;
        intersectWithBezierGraph(graph:IBezierGraph):IBezierGraph;
        xorWithBezierGraph(graph:IBezierGraph):IBezierGraph;
    }

    export type IntersectionBlockCallback = (intersection: IIntersection, stop?: IReference<boolean>) => void;

    export type CurveSplit = { leftCurve: IBezierCurve, rightCurve: IBezierCurve, middleCurve?: IBezierCurve }

    export interface IBezierCurve {
        contour: IContour;
        index: number;
        bounds: IRectData;
        boundingRect: IRectData;
        isPoint: boolean;
        previous: IBezierCurve;
        next: IBezierCurve;
        startShared:boolean;

        controlPoint1: ICoordinate;
        controlPoint2: ICoordinate;

        previousNonpoint: IBezierCurve;
        nextNonpoint: IBezierCurve;

        data: IBezierCurveData;

        firstCrossing:IBezierCrossing;
        lastCrossing:IBezierCrossing;

        subcurveWithRange(range: IRange): IBezierCurve;
        intersectionsWithBezierCurve(edge: IBezierCurve, intersetionRange: IReference<IIntersectionRange>, callback: IntersectionBlockCallback): void;
        crossesEdgeAtIntersection(edge: IBezierCurve, intersection: IIntersection): boolean;
        crossesEdgeAtIntersectionRange(edge: IBezierCurve, intersection: IIntersectionRange): boolean;
        pointAt(parameter: number, obj?: any): ICoordinate;
        crossingsWithBlock(callback: (intersection: IBezierCrossing, stop?: IReference<boolean>) => boolean | void): void;
        intersectingEdgesWithBlock(callback: (edge: IBezierCurve) => boolean | void): void;
        selfIntersectingEdgesWithBlock(callback: (edge: IBezierCurve) => boolean | void): void;
        closestLocationToPoint(point: ICoordinate): ILocation;
        pointFromLeftOffset(offset: number): ICoordinate;
        pointFromRightOffset(offset: number): ICoordinate;
        reversedCurve(): IBezierCurve;
        crossingsCopyWithBlock(block: (crossing: IBezierCrossing, stop: IReference<boolean>) => void): void;

        addCrossing(crossing: IBezierCrossing): void;
        removeCrossing(crossing: IBezierCrossing): void;
        nextCrossing(crossing: IBezierCrossing): void;
        previousCrossing(crossing: IBezierCrossing): void;
        removeAllCrossings():void;

        splitSubcurvesWithRange(parameterRange: IRange, curvesOut: { leftCurve: IBezierCurve, middleCurve: IBezierCurve, rightCurve: IBezierCurve });

        initWithLine(p1: ICoordinate, p2: ICoordinate): void;

        tangentFromRightOffset(offset: number): ICoordinate;
        tangentFromLeftOffset(offset: number): ICoordinate;

        length(): number;

        endPoint1: ICoordinate;
        endPoint2: ICoordinate;

        isStartShared: boolean;
    }


    export interface IBezierCurveData {
        endPoint1: ICoordinate;
        controlPoint1: ICoordinate;
        controlPoint2: ICoordinate;
        endPoint2: ICoordinate;
        isStraightLine: boolean;
        length: number;
        isPoint?: boolean | null;

        boundingRect?: IRectData;
        bounds?: IRectData;
    }

    export interface IBezierCurveData2 {
        data: IBezierCurveData;
        intersects: any[];
        originalRange: IRange;
    }

    export interface IBezierCurveData3 {
        intersects: boolean;
        us?: IBezierCurveData;
        them?: IBezierCurveData;
    }

    export interface IBezierCrossing {
        leftCurve: IBezierCurve;
        rightCurve: IBezierCurve;
        curve: IBezierCurve; //remove this one
        edge: IBezierCurve;
        parameter: number;
        isSelfCrossing: boolean;
        counterpart: IBezierCrossing;
        entry: boolean;
        index: number;
        order: number;
        next: IBezierCrossing;
        previous: IBezierCrossing;
        fromCrossingOverlap:boolean;
        processed:boolean;

        isAtStart:boolean;
        isAtEnd:boolean;

        removeFromEdge():void;
    }

    export interface IIntersection {
        isAtStartOfCurve1: boolean;
        isAtStartOfCurve2: boolean;
        isAtEndPointOfCurve1: boolean;
        isAtEndPointOfCurve2: boolean;
        isAtStopOfCurve1: boolean;
        isAtStopOfCurve2: boolean;
        isTangent: boolean;
        isAtEndPointOfCurve: boolean;

        curve1: IBezierCurve;
        parameter1: number;
        curve2: IBezierCurve;
        parameter2: number;

        curve1LeftBezier: IBezierCurve;
        curve1RightBezier: IBezierCurve;
        curve2RightBezier: IBezierCurve;
        curve2LeftBezier: IBezierCurve;

        location:ICoordinate;
    }

    export interface IIntersectionRange {
        isAtStartOfCurve2: boolean;
        isAtStopOfCurve2: boolean;
        middleIntersection: IIntersection;
        isAtStartOfCurve1: boolean;
        isAtStopOfCurve1: boolean;
        curve1LeftBezier: IBezierCurve;
        curve1RightBezier: IBezierCurve;
        curve2LeftBezier: IBezierCurve;
        curve2RightBezier: IBezierCurve;
        reversed: boolean;

        parameterRange1: IRange;
        parameterRange2: IRange;

        merge(other: IIntersectionRange): void;
    }
    export const enum ContourDirection {
        Clockwise = 0,
        AntiClockwise = 1
    }

    export interface ILocation {
        distance: number;
        parameter?: number;
    }

    export interface IEdgeOverlapRun {
        insertOverlap(overlap: IEdgeOverlap): boolean;
        isComplete(): boolean;
        doesContainCrossing(crossing: IBezierCrossing): boolean;
        doesContainParameter(parameter: number, edge: IBezierCurve): boolean;
        contour1(): IContour;
        contour2(): IContour;
        isCrossing(): boolean;
        addCrossings(): void;
    }

    export interface IContourOverlap {
        isBetweenContour(one: IContour, another: IContour): boolean;
        isComplete(): boolean;
        runsWithBlock(run: any, stop?: IReference<number>): void;
        isEmpty(): boolean;
        doesContainCrossing(crossing: IBezierCrossing): boolean;
        doesContainParameter(parameter: number, edge: IBezierCurve): boolean;
    }

    export interface IEdgeOverlap {
        range: IIntersectionRange;
        edge1: IBezierCurve;
        edge2: IBezierCurve;

        fitsBefore(nextOverlap: IEdgeOverlap): boolean;
        fitsAfter(previousOverlap: IEdgeOverlap): boolean;
        addMiddleCrossing(): void;
    }


    export interface IReference<T> {
        value: T;
    }

    export interface IContour {
        edges: IBezierCurve[];
        inside: number;
        bounds:IRectData;
        boundingRect:IRectData;

        addSelfIntersectingContoursToArray(contours: IContour[], originalContour: IContour): void;
        containsPoint(point: ICoordinate): boolean;
        contourAndSelfIntersectingContoursContainPoint(point: ICoordinate): boolean;
        selfIntersectingContours: IContour[];
        intersectingContours(): IContour[]
        markCrossingsAsEntryOrExitWithContour(otherContour: IContour, markInside: boolean): void;
        addOverlap(overlap:IContourOverlap):void;
        doesOverlapContainCrossing(crossing: IBezierCrossing): boolean;
        crossesOwnContour(contour: IContour): boolean;
        numberOfIntersectionsWithRay(testEdge:IBezierCurve): number;
        closestLocationToPoint(point: ICoordinate): ILocation;
        removeAllOverlaps():void;
        testPointForContainment():ICoordinate;
        isEquivalent(other: IContour): boolean;
    }
}