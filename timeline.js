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
