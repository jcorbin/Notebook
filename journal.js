function Page(width, height, paper) {
  this.width = width;
  this.height = height;
  if (paper == undefined) {
    paper = "ruled";
  }
  if (typeof(paper) == "string") {
    paper = Page.PaperTypes[paper];
  }
  if (typeof(paper) != "function") {
    throw(new Error("invalid paper"));
  }
  this.paper = paper;
  this.strokes = [];
}
Page.PaperTypes = {
  'lined': function(nb) {
    var ctx = nb.canvas.getContext('2d'),
      spacing = nb.dpi/5,
      start = nb.dpi,
      width = 2, half=width/2;
    ctx.fillStyle = 'rgba(64, 64, 192, 0.25)';
    for (var i=start; i<nb.canvas.height; i+=spacing) {
      ctx.fillRect(0, i-half, nb.canvas.width, width);
    }
  },
  'ruled': function(nb) {
    var ctx = nb.canvas.getContext('2d'),
      margin = 4/5*nb.dpi, marginRuleWidth = 3;
    ctx.fillStyle = 'rgba(192, 64, 64, 0.25)';
    ctx.fillRect(margin - marginRuleWidth/2, 0, marginRuleWidth, nb.canvas.height);

    var
      spacing = nb.dpi/5,
      start = nb.dpi,
      width = 2, half=width/2;
    ctx.fillStyle = 'rgba(64, 64, 192, 0.25)';
    for (var i=start; i<nb.canvas.height; i+=spacing) {
      ctx.fillRect(0, i-half, nb.canvas.width, width);
    }
  },
  'grid': function(nb) {
    var ctx = nb.canvas.getContext('2d'),
      spacing = nb.dpi/5, width = 2, half = width/2;
    ctx.fillStyle = 'rgba(32, 96, 32, 0.25)';
    for (var i=spacing; i<nb.canvas.width; i+=spacing) {
      ctx.fillRect(i-half, 0, width, nb.canvas.height);
    }
    for (var i=spacing; i<nb.canvas.height; i+=spacing) {
      ctx.fillRect(0, i-half, nb.canvas.width, width);
    }
  }
};
Page.prototype.draw = function(nb) {
  this.paper(nb);

  // Draw strokes
  for (var i=0; i<this.strokes.length; i++) {
    this.strokes[i].draw(nb);
  }
};
Page.prototype.addStroke = function(stroke) {
  this.strokes.push(stroke);
  return stroke;
};


function Stroke(width, color, startX, startY) {
  this.color = color;
  this.width = width;
  this.points = [];
  this.addPoint(startX, startY);
}
Stroke.prototype.addPoint = function(x, y) {
  this.points.push([x, y]);
};
Stroke.prototype.draw = function(nb) {
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


function Notebook(canvas) {
  if (typeof(canvas) == "string") {
    canvas = document.getElementById(canvas);
  }

  this.canvas = canvas;
  this.dpi = 100;
  this.currentPage = new Page(8.5*this.dpi, 11*this.dpi, 'ruled');
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
        new Stroke(3, 'rgba(0, 0, 0, 0.7)', x, y)
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

// vim:set ts=2 sw=2 expandtab:
