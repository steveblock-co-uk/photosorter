function Photo(url, timestamp, size) {
  this.init_(url, timestamp, size);
}
Photo.prototype.init_ = function(url, size) {
  this.url_ = url;
  this.timestamp_ = null;
  this.size_ = size;
  this.shiftMilliseconds_ = 0;
}
Photo.prototype.url = function() {
  return this.url_;
};
Photo.prototype.timestamp = function() {
  return this.timestamp_;
};
Photo.prototype.setShift = function(shiftMilliseconds) {
  return this.shiftMilliseconds_ = shiftMilliseconds;
};
Photo.prototype.shiftedTimestamp = function() {
  var shiftedTimestamp = new Date(this.timestamp_);
  shiftedTimestamp.setMilliseconds(shiftedTimestamp.getMilliseconds() + this.shiftMilliseconds_);
  return shiftedTimestamp;
};
Photo.prototype.size = function() {
  return this.size_;
};

function Timeline() {
  this.init_();
}
Timeline.prototype.init_ = function() {
  this.isDirty_ = false;
  this.photos_ = [];
  this.shiftMilliseconds_ = 0;
}
Timeline.prototype.addPhoto = function(photo) {
  this.photos_.push(photo);
  this.isDirty_ = true;
};
Timeline.prototype.getSortedPhotos = function() {
  this.ensureSorted_();
  return this.photos_.slice();
};
Timeline.prototype.ensureSorted_ = function() {
  if (!this.isDirty_)
    return;
  // TODO: Equality?!
  this.photos_ = stableSort(this.photos_, function(a, b) {
    console.assert(a instanceof Photo);
    console.assert(b instanceof Photo);
    return a.timestamp() - b.timestamp();
  });
};
//Timeline.prototype.shiftMilliseconds = function() {
//  return this.shiftMilliseconds_;
//};
Timeline.prototype.shift = function(shiftMilliseconds) {
  this.shiftMilliseconds_ += shiftMilliseconds;
  this.photos_.forEach(function(photo) { photo.setShift(this.shiftMilliseconds_); });
};

// Owns a number of Timelines. Handles sorting of all the Photos.
function Sorter() {
}
Sorter.prototype.init_ = function() {
  this.timelines_ = {};
};
Sorter.prototype.getTimeline_ = function(key) {
  if (this.timelines_[key] === undefined) {
    var numTimeline = Object.keys(this.timelines_).length;
    this.timelines_[key] = new Timeline();
  }
  return this.timelines_[key];
};
Sorter.prototype.addPhoto = function(key, photo) {
  this.getTimeline_(key).addPhoto(photo);
};
Sorter.prototype.shiftTimeline = function(key, shiftMilliseconds) {
  this.timelines_[key].shift(shiftMilliseconds);
};
Sorter.prototype.getSortedPhotos = function() {
  // TODO: Consider caching this?
  var timelines = this.timelines_;
  var photos = Object.keys(timelines).map(function(key) {
    return timelines[key].getSortedPhotos();
  });
  return mergeSort(photos, function(photoA, photoB) {
    return photoA.shiftedTimestamp() - photoB.shiftedTimestamp();
  });
};
Sorter.prototype.toString = function() {
  return this.timelines_.map(function(timeline) {
    return '[' + timeline.getSortedPhotos().map(function(photo) { return photo.timestamp(); }).join(', ') + ']';
  }).join('\n');
};
