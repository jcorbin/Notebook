goog.provide('wunjo.Notebook');

wunjo.Notebook = function(canvas) {
  if (typeof(canvas) == "string") {
    canvas = document.getElementById(canvas);
  }

  this.canvas = canvas;
  this.dpi = wunjo.Notebook.getDPI();
  this.currentStroke = null;
  this.currentPage = null;

  if (! this.restore()) {
    this.currentPage = new wunjo.Notebook.Page(8.5*this.dpi, 11*this.dpi);
  }

  this.canvas.width = this.currentPage.width;
  this.canvas.height = this.currentPage.height;
  this.draw();

  var self = this, listening = false;
  function listen() {
    if (listening) return true;
    self.canvas.addEventListener('mousemove', stroke, false);
    self.canvas.addEventListener('mouseup', stop, false);
    self.canvas.addEventListener('mouseout', stop, false);
    listening = true;
  }
  function unlisten() {
    if (! listening) return true;
    self.canvas.removeEventListener('mousemove', stroke, false);
    self.canvas.removeEventListener('mouseup', stop, false);
    self.canvas.removeEventListener('mouseout', stop, false);
    listening = false;
  }

  function eventXY(evt) {
    if (evt.offsetX == undefined || evt.offsetY == undefined) {
      xy = [evt.pageX, evt.pageY];
      off = evt.target;
      while (off) {
        xy[0] -= off.offsetLeft;
        xy[1] -= off.offsetTop;
        off = off.offsetParent;
      }
      return xy;
    } else {
      return [evt.offsetX, evt.offsetY];
    }
  }
  function start(evt) {
    var xy = eventXY(evt);
    self.startStroke(xy[0], xy[1]);
    listen();
  }
  function stroke(evt) {
    var xy = eventXY(evt);
    self.updateStroke(xy[0], xy[1]);
  }
  function stop(evt) {
    self.finishStroke();
    unlisten();
  }
  this.canvas.addEventListener('mousedown', start, false);

  window.addEventListener('storage', function(evt) {
    if (self.restore(evt.newValue)) {
      self.redraw();
    }
  }, false);
};
wunjo.Notebook.getDPI = function() {
  if (this.DPI == undefined) {
    var dpiTest = document.body.appendChild(
      document.createElement('div')
    );
    dpiTest.style.width = '1in';
    this.DPI = dpiTest.offsetWidth;
    document.body.removeChild(dpiTest);
  }
  return this.DPI;
};

wunjo.Notebook.prototype.getStorage = function() {
  return window.localStorage;
};
wunjo.Notebook.prototype.save = function() {
  var data = this.currentPage.serialize();
  this.currentPage.mtime = (new Date()).getTime();
  data.mtime = this.currentPage.mtime;
  this.getStorage()['currentPage'] = JSON.stringify(data);
};
wunjo.Notebook.prototype.restore = function(data) {
  var stor = null;
  if (data == undefined) {
    stor = this.getStorage();
    data = stor['currentPage'];
  }
  if (data) {
    try {
      data = JSON.parse(data);
      if (! this.currentPage || data.mtime > this.currentPage.mtime) {
        this.currentPage = wunjo.Notebook.Page.unserialize(data);
        this.currentPage.mtime = data.mtime;
        return true;
      } else {
        return false;
      }
    } catch(err) {
      console.log(err.toString());
      if (stor) {
        delete stor['currentPage'];
        this.currentPage = null;
      }
    }
  }
  return false;
};
wunjo.Notebook.prototype.startStroke = function(x, y) {
  this.currentStroke = this.currentPage.addStroke(
    new wunjo.Notebook.Stroke(3, 'rgba(0, 0, 0, 0.7)', x, y)
  );
  var ctx = this.canvas.getContext('2d'),
    width = this.currentStroke.width, half = width/2;
  ctx.fillRect(x-half, y-half, width, width);
  ctx.beginPath();
  ctx.moveTo(x, y);
};
wunjo.Notebook.prototype.updateStroke = function(x, y) {
  if (! this.currentStroke) return;
  var ctx = this.canvas.getContext('2d');
  this.currentStroke.addPoint(x, y);
  ctx.lineTo(x, y);
  ctx.stroke();
};
wunjo.Notebook.prototype.finishStroke = function() {
  if (! this.currentStroke) return;
  this.save();
  this.currentStroke = null;
  this.redraw();
};
wunjo.Notebook.prototype.redraw = function() {
  this.canvas.width = this.canvas.width;
  this.draw();
};
wunjo.Notebook.prototype.draw = function() {
  this.currentPage.draw(this);
};
wunjo.Notebook.prototype.clearPage = function() {
  if (! this.currentPage) return;
  this.currentPage.clear();
  this.save();
  this.redraw();
};
wunjo.Notebook.prototype.setPaper = function(paper) {
  this.currentPage.options.paper = paper;
  this.save();
  this.redraw();
};


wunjo.Notebook.Page = function(width, height, options) {
  this.width = width;
  this.height = height;
  this.options = options || {};
  this.options.paper = this.options.paper || 'ruled';
  this.strokes = [];
};
wunjo.Notebook.Page.paperTypes = ['blank', 'ruled', 'lined', 'grid'];
wunjo.Notebook.Page.unserialize = function(data) {
  var page = new wunjo.Notebook.Page(data.width, data.height, data.options);
  if (data.strokes) {
    for (var i=0; i<data.strokes.length; i++) {
      page.strokes.push(wunjo.Notebook.Stroke.unserialize(data.strokes[i]));
    }
  }
  return page;
};
wunjo.Notebook.Page.prototype.serialize = function() {
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
wunjo.Notebook.Page.prototype.draw = function(nb) {
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
wunjo.Notebook.Page.prototype.drawPaper = function(nb) {
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
wunjo.Notebook.Page.prototype.addStroke = function(stroke) {
  this.strokes.push(stroke);
  return stroke;
};
wunjo.Notebook.Page.prototype.clear = function() {
  this.strokes = [];
};


wunjo.Notebook.Stroke = function(width, color, startX, startY) {
  this.color = color;
  this.width = width;
  this.points = [];
  if (startX != undefined && startY != undefined) {
    this.addPoint(startX, startY);
  }
};
wunjo.Notebook.Stroke.unserialize = function(data) {
  var stroke = new wunjo.Notebook.Stroke(data.width, data.color);
  if (data.points) {
    for (var i=0, l=data.points; i<l.length; i++) {
      stroke.points.push([l[i][0], l[i][1]]);
    }
  }
  return stroke;
};
wunjo.Notebook.Stroke.prototype.serialize = function() {
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
wunjo.Notebook.Stroke.prototype.addPoint = function(x, y) {
  this.points.push([x, y]);
};
wunjo.Notebook.Stroke.prototype.draw = function(nb) {
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

// vim:set ts=2 sw=2 expandtab:
