var Notebook = (function () {

function Notebook(canvas) {
  if (typeof(canvas) == "string") {
    canvas = document.getElementById(canvas);
  }

  this.canvas = canvas;
  this.dpi = 100;
  this.currentStroke = null;
  this.currentPage = null;

  if (! this.restore()) {
    this.currentPage = new Notebook.Page(8.5*this.dpi, 11*this.dpi);
  }

  this.canvas.width = this.currentPage.width;
  this.canvas.height = this.currentPage.height;
  this.draw();

  // var win = this.canvas.ownerDocument.defaultView;
  // this.updateSize(win);

  var self = this, listening = false;
  // win.addEventListener('resize', function(evt) {self.onWindowResize(evt)});
  function listen() {
    if (listening) return true;
    self.canvas.addEventListener('mousemove', stroke);
    self.canvas.addEventListener('mouseup', stop);
    self.canvas.addEventListener('mouseout', stop);
    listening = true;
  }
  function unlisten() {
    if (! listening) return true;
    self.canvas.removeEventListener('mousemove', stroke);
    self.canvas.removeEventListener('mouseup', stop);
    self.canvas.removeEventListener('mouseout', stop);
    listening = false;
  }

  function start(evt) {
    self.startStroke(evt.offsetX, evt.offsetY);
    listen();
  }
  function stroke(evt) {
    self.updateStroke(evt.offsetX, evt.offsetY);
  }
  function stop(evt) {
    self.finishStroke();
    unlisten();
  }
  this.canvas.addEventListener('mousedown', start);
}
Notebook.prototype.getWindow = function() {
  return this.canvas.ownerDocument.defaultView;
};
Notebook.prototype.getStorage = function() {
  return this.getWindow().localStorage;
};
Notebook.prototype.save = function() {
  this.getStorage()['currentPage'] = JSON.stringify(this.currentPage.serialize());
};
Notebook.prototype.restore = function() {
  var stor = this.getStorage();
  if (stor['currentPage']) {
    try {
      var data = stor['currentPage'];
      data = JSON.parse(data);
      data = Notebook.Page.unserialize(data);
      this.currentPage = data;
      return true;
    } catch(err) {
      console.log(err.toString());
      delete stor['currentPage'];
      this.currentPage = null;
    }
  }
  return false;
};
Notebook.prototype.startStroke = function(x, y) {
  this.currentStroke = this.currentPage.addStroke(
    new Notebook.Stroke(3, 'rgba(0, 0, 0, 0.7)', x, y)
  );
  var ctx = this.canvas.getContext('2d'),
    width = this.currentStroke.width, half = width/2;
  ctx.fillRect(x-half, y-half, width, width);
  ctx.beginPath();
  ctx.moveTo(x, y);
};
Notebook.prototype.updateStroke = function(x, y) {
  if (! this.currentStroke) return;
  var ctx = this.canvas.getContext('2d');
  this.currentStroke.addPoint(x, y);
  ctx.lineTo(x, y);
  ctx.stroke();
};
Notebook.prototype.finishStroke = function() {
  if (! this.currentStroke) return;
  this.save();
  this.currentStroke = null;
  this.redraw();
};
Notebook.prototype.redraw = function() {
  this.canvas.width = this.canvas.width;
  this.draw();
};
Notebook.prototype.draw = function() {
  this.currentPage.draw(this);
};
Notebook.prototype.clearPage = function() {
  if (! this.currentPage) return;
  this.currentPage.clear();
  this.save();
  this.redraw();
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
Notebook.Page.unserialize = function(data) {
  var page = new Notebook.Page(data.width, data.height, data.options);
  if (data.strokes) {
    for (var i=0; i<data.strokes.length; i++) {
      page.strokes.push(Notebook.Stroke.unserialize(data.strokes[i]));
    }
  }
  return page;
};
Notebook.Page.prototype.serialize = function() {
  var data = {
    width: this.width,
    height: this.height,
    options: this.options,
    strokes: []
  };
  for (var i=0; i<this.strokes.length; i++) {
    data.strokes.push(this.strokes[i].serialize());
  }
  return data;
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
Notebook.Page.prototype.clear = function() {
  this.strokes = [];
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
