var Notebook = (function () {

function Notebook(canvas) {
  if (typeof(canvas) == "string") {
    canvas = document.getElementById(canvas);
  }

  this.canvas = canvas;
  this.dpi = 100;
  this.currentPage = new Notebook.Page(8.5*this.dpi, 11*this.dpi);
  this.currentStroke = null;

  this.canvas.width = this.currentPage.width;
  this.canvas.height = this.currentPage.height;
  this.draw();

  // var win = this.canvas.ownerDocument.defaultView;
  // this.updateSize(win);

  var self = this;
  // win.addEventListener('resize', function(evt) {self.onWindowResize(evt)});

  function start(evt) {
    var x = evt.offsetX, y = evt.offsetY,
      s = self.currentStroke = self.currentPage.addStroke(
        new Notebook.Stroke(3, 'rgba(0, 0, 0, 0.7)', x, y)
      ),
      ctx = self.canvas.getContext('2d'),
      half = s.width/2;
    ctx.fillRect(x-half, y-half, s.width, s.width);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function stroke(evt) {
    if (! self.currentStroke) return;
    var x = evt.offsetX, y = evt.offsetY,
      s = self.currentStroke,
      ctx = self.canvas.getContext('2d');
    s.addPoint(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function stop(evt) {
    self.currentStroke = null;
  }
  this.canvas.addEventListener('mousedown', start);
  this.canvas.addEventListener('mouseup', stop);
  this.canvas.addEventListener('mouseout', stop);
  this.canvas.addEventListener('mousemove', stroke);
}
Notebook.prototype.redraw = function() {
  this.canvas.width = this.canvas.width;
  this.draw();
};
Notebook.prototype.draw = function() {
  this.currentPage.draw(this);
};
/*
Notebook.prototype.updateSize = function(win) {
  this.canvas.width = this.canvas.parentNode.clientWidth;
  this.canvas.height = this.canvas.parentNode.clientHeight-4;
  this.draw();
};
Notebook.prototype.onWindowResize = function(evt) {
  var win = evt.srcElement;
  if (this.resizeTimeout) {
    win.clearTimeout(this.resizeTimeout);
  }
  var self = this;
  this.resizeTimeout = win.setTimeout(function() {
    delete self.resizeTimeout;
    console.log('update');
    self.updateSize(win);
  }, 100);
};
*/

Notebook.Page = function(width, height, options) {
  this.width = width;
  this.height = height;
  this.options = options || {};
  this.options.paper = this.options.paper || 'ruled';
  this.strokes = [];
};
Notebook.Page.prototype.draw = function(nb) {
  if (typeof(this.options.paper) == "function") {
    this.options.paper(this, nb);
  } else {
    this.drawPaper(nb);
  }

  // Draw strokes
  for (var i=0; i<this.strokes.length; i++) {
    this.strokes[i].draw(nb);
  }
};
Notebook.Page.prototype.drawPaper = function(nb) {
  if (this.options.paper == "blank") return;

  var ctx = nb.canvas.getContext('2d');

  switch (this.options.paper) {
    case 'ruled':
      var margin = 4/5*nb.dpi, marginRuleWidth = 3;
      ctx.fillStyle = 'rgba(192, 64, 64, 0.25)';
      ctx.fillRect(margin - marginRuleWidth/2, 0, marginRuleWidth, nb.canvas.height);
    case 'lined':
      var spacing = nb.dpi/5, width = 2, half=width/2, start = nb.dpi;
      ctx.fillStyle = 'rgba(64, 64, 192, 0.25)';
      for (var i=start; i<nb.canvas.height; i+=spacing) {
        ctx.fillRect(0, i-half, nb.canvas.width, width);
      }
      break;
    case 'grid':
      var spacing = nb.dpi/5, width = 2, half = width/2;
      ctx.fillStyle = 'rgba(32, 96, 32, 0.25)';
      for (var i=spacing; i<nb.canvas.width; i+=spacing) {
        ctx.fillRect(i-half, 0, width, nb.canvas.height);
      }
      for (var i=spacing; i<nb.canvas.height; i+=spacing) {
        ctx.fillRect(0, i-half, nb.canvas.width, width);
      }
      break;
  }
};
Notebook.Page.prototype.addStroke = function(stroke) {
  this.strokes.push(stroke);
  return stroke;
};


Notebook.Stroke = function(width, color, startX, startY) {
  this.color = color;
  this.width = width;
  this.points = [];
  if (startX != undefined && startY != undefined) {
    this.addPoint(startX, startY);
  }
};
Notebook.Stroke.unserialize = function(data) {
  var stroke = new Notebook.Stroke(data.width, data.color);
  if (data.points) {
    for (var i=0, l=data.points; i<l.length; i++) {
      stroke.points.push([l[i][0], l[i][1]]);
    }
  }
  return stroke;
};
Notebook.Stroke.prototype.serialize = function() {
  var data = {
    color: this.color,
    width: this.width,
    points: []
  };
  for (var i=0, l=this.points; i<l.length; i++) {
    data.points.push([l[i][0], l[i][1]]);
  }
  return data;
};
Notebook.Stroke.prototype.addPoint = function(x, y) {
  this.points.push([x, y]);
};
Notebook.Stroke.prototype.draw = function(nb) {
  if (this.points.length <= 1) return;
  ctx = nb.canvas.getContext('2d');
  ctx.strokeStyle = this.color;
  ctx.lineWidth = this.width;
  var half = this.width/2;
  ctx.beginPath();
  ctx.moveTo(this.points[0][0], this.points[0][1]);
  for (var i=1; i<this.points.length; i++) {
    ctx.lineTo(this.points[i][0], this.points[i][1]);
  }
  ctx.stroke();
};

return Notebook;
})();

// vim:set ts=2 sw=2 expandtab:
