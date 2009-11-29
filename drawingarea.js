goog.provide('wunjo.DrawingArea');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');


wunjo.DrawingArea = function(opt_domHelper) {
  goog.ui.Component.call(this, opt_domHelper);

  this.eh_ = new goog.events.EventHandler(this);

  this.pen_ = {color: 'rgba(128, 0, 0, 0.5)', size: 5};
};
goog.inherits(wunjo.DrawingArea, goog.ui.Component);

wunjo.DrawingArea.prototype.last_ = null;
wunjo.DrawingArea.prototype.points_ = null;
wunjo.DrawingArea.prototype.enabled = true;

wunjo.DrawingArea.prototype.isDrawing = function() {
  return this.points ? true : false;
};

wunjo.DrawingArea.prototype.getPoints = function() {
  if (! this.points_) {
    throw Error('Not drawing, no points');
  }
  return this.points_;
};

wunjo.DrawingArea.prototype.setPen = function(color, size) {
  this.pen_ = {color: color, size: size};
  if (this.points_) {
    this.redraw();
  }
};

wunjo.DrawingArea.prototype.getPen = function() {
  return this.pen_;
};

wunjo.DrawingArea.prototype.decorateInternal = function(element) {
  wunjo.DrawingArea.superClass_.decorateInternal.call(this, element);

  var canvas = this.getCanvas();
  goog.dom.classes.add(canvas, 'wunjo-drawingarea');
};

wunjo.DrawingArea.prototype.createDom = function() {
  var elt = this.dom_.createElement('canvas');
  elt.width = 1;
  elt.height = 1;
  this.decorateInternal(elt);
};

wunjo.DrawingArea.prototype.enterDocument = function() {
  wunjo.DrawingArea.superClass_.enterDocument.call(this);
  this.eh_.listen(
    this.getElement(), goog.events.EventType.MOUSEDOWN,
    this.onMouseDown_
  );
  this.draw_(this.getCanvas());
};

wunjo.DrawingArea.prototype.exitDocument = function() {
  wunjo.DrawingArea.superClass_.exitDocument.call(this);
  this.eh_.removeAll();
  this.last_ = null;
  this.points_ = null;
};

wunjo.DrawingArea.prototype.getCanvas = function() {
  return this.getElement();
};

wunjo.DrawingArea.prototype.redraw = function() {
  var canvas = this.getCanvas();
  canvas.width = canvas.width;
  this.draw_(canvas);
};

wunjo.DrawingArea.prototype.drawPath_ = function drawPath(canvas, points, pen) {
  if (points.length <= 0) return;

  var ctx = canvas.getContext('2d');
  ctx.strokeStyle = pen.color;
  ctx.fillStyle = pen.color;
  ctx.lineWidth = pen.size;

  if (points.length == 1) {
    var half = pen.size/2;
    ctx.fillRect(
      points[0][0]-half, points[0][1]-half,
      pen.size, pen.size
    );
  } else {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (var i=1; i<points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.stroke();
  }
};

wunjo.DrawingArea.prototype.draw_ = function(canvas) {
  if (this.points_) {
    this.drawPath_(canvas, this.points_, this.pen_);
  }
};

wunjo.DrawingArea.prototype.cleanupStroke_ = function() {
  var elt = this.getElement();
  this.eh_.unlisten(elt, goog.events.EventType.MOUSEMOVE, this.onMouseMove_);
  this.eh_.unlisten(elt, goog.events.EventType.MOUSEUP, this.onMouseUp_);
  this.eh_.unlisten(elt, goog.events.EventType.MOUSEOUT, this.onMouseOut_);
  this.last_ = null;
  this.points_ = null;
};

wunjo.DrawingArea.prototype.startStroke_ = function(x, y) {
  var elt = this.getElement();
  this.eh_.listen(elt, goog.events.EventType.MOUSEMOVE, this.onMouseMove_);
  this.eh_.listen(elt, goog.events.EventType.MOUSEUP, this.onMouseUp_);
  this.eh_.listen(elt, goog.events.EventType.MOUSEOUT, this.onMouseOut_);
  this.points_ = [];
  this.last_ = [x, y];
  this.points_.push(this.last_);
  this.redraw();
};

wunjo.DrawingArea.prototype.updateStroke_ = function(x, y) {
  if (this.last_) {
    if (x == this.last_[0] && y == this.last_[1]) return;
    if (this.pen_.halfSizeSq == undefined) {
      this.pen_.halfSizeSq = Math.pow(this.pen_.size/2, 2);
    }
    var dSq = Math.pow(this.last_[0] - x, 2) + Math.pow(this.last_[1] - y, 2);
    if (dSq <= this.pen_.halfSizeSq) return;
  }
  this.last_ = [x, y];
  this.points_.push(this.last_);
  this.redraw();
};

wunjo.DrawingArea.prototype.finishStroke_ = function() {
  var points = this.points_;
  this.cleanupStroke_();
  this.dispatchEvent({type: 'stroke', points: points});
};

wunjo.DrawingArea.prototype.onMouseDown_ = function(evt) {
  if (! this.enabled) return;
  this.startStroke_(evt.offsetX, evt.offsetY);
};

wunjo.DrawingArea.prototype.onMouseMove_ = function(evt) {
  this.updateStroke_(evt.offsetX, evt.offsetY);
};

wunjo.DrawingArea.prototype.onMouseUp_ = function(evt) {
  this.updateStroke_(evt.offsetX, evt.offsetY);
  this.finishStroke_();
};

wunjo.DrawingArea.prototype.onMouseOut_ = function(evt) {
  this.finishStroke_();
};

// vim:set ts=2 sw=2 expandtab:
