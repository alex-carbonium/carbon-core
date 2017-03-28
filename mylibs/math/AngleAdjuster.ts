var AngleAdjuster = function (angleStep) {
    this.angleStep = angleStep;
};

AngleAdjuster.prototype.getAngle = function (startPoint, endPoint) {
    var dx = endPoint.x - startPoint.x;
    var dy = -(endPoint.y - startPoint.y);

    var atan = Math.atan2(dy, dx);

    if (atan < 0) {
        atan = Math.abs(atan);
    } else {

        atan = 2 * Math.PI - atan;
    }

    var inDegrees = radiantsToDegrees(atan);

    if (inDegrees == 360) {
        return 0;
    }
    return inDegrees;
};

AngleAdjuster.prototype.getLineByAngle = function (angle, startPoint, endPoint) {
    var angle2 = angle * Math.PI / 180;
    var newX = endPoint.x - startPoint.x;
    var newY = endPoint.y - startPoint.y;

    var x = startPoint.x + ((newX) * Math.cos(angle2)) - ((newY) * Math.sin(angle2))
    var y = startPoint.y + ((newY) * Math.cos(angle2)) + ((newX) * Math.sin(angle2))
    return { x: x, y: y };
};

AngleAdjuster.prototype.adjust = function (startPoint, endPoint) {
    var angle = this.getAngle.call(this, startPoint, endPoint);
    var floor = Math.floor(angle / this.angleStep);
    if (angle % this.angleStep > this.angleStep / 2) {
        floor++;
    }
    var nearestAngle = floor * this.angleStep;
    return this.getLineByAngle.call(this, -angle + nearestAngle, startPoint, endPoint);
};

function radiantsToDegrees(angle) {
    return angle * (180 / Math.PI);
}
function degreesToRadiants(angle) {
    return angle * (Math.PI / 180);
}

export default new AngleAdjuster(15);