goog.provide('wunjo.Notebook');

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

wunjo.Notebook.Page.prototype.draw = function(canvas) {
  if (typeof(this.options.paper) == "function") {
    this.options.paper(this, canvas);
  } else {
    this.drawPaper(canvas);
  }

  // Draw strokes
  for (var i=0; i<this.strokes.length; i++) {
    this.strokes[i].draw(canvas);
  }
};

wunjo.Notebook.Page.prototype.drawPaper = function(canvas) {
  if (this.options.paper == "blank") return;

  var ctx = canvas.getContext('2d');

  switch (this.options.paper) {
    case 'ruled':
      var margin = 4/5*canvas.dpi, marginRuleWidth = 3;
      ctx.fillStyle = 'rgba(192, 64, 64, 0.25)';
      ctx.fillRect(margin - marginRuleWidth/2, 0, marginRuleWidth, canvas.height);
    case 'lined':
      var spacing = canvas.dpi/5, width = 2, half=width/2, start = canvas.dpi;
      ctx.fillStyle = 'rgba(64, 64, 192, 0.25)';
      for (var i=start; i<canvas.height; i+=spacing) {
        ctx.fillRect(0, i-half, canvas.width, width);
      }
      break;
    case 'grid':
      var spacing = canvas.dpi/5, width = 2, half = width/2;
      ctx.fillStyle = 'rgba(32, 96, 32, 0.25)';
      for (var i=spacing; i<canvas.width; i+=spacing) {
        ctx.fillRect(i-half, 0, width, canvas.height);
      }
      for (var i=spacing; i<canvas.height; i+=spacing) {
        ctx.fillRect(0, i-half, canvas.width, width);
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

wunjo.Notebook.Stroke.prototype.draw = function(canvas) {
  if (this.points.length <= 1) return;
  ctx = canvas.getContext('2d');
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
