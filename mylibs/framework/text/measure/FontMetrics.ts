export class FontMetrics {
    constructor(
        public readonly width: number, 
        public readonly height: number, 
        public readonly ascent: number, 
        public readonly descent: number, 
        public readonly minY: number, 
        public readonly maxY: number,
        public readonly minX: number = 0, 
        public readonly maxX: number = 0
    ) {
    }
}