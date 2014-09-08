function formatDate(date, timezone) {
  // TODO: Why doesn't toLocaleDateString() work?
  // Could use it with setTimezone(), doesn't change the timestamp, it just changes the representation.
  return date.toString('dd MMM yyyy HH:mm:ss', timezone);
}

// Gets the vertical scale for a rectangle of the given aspect ratio to
// have the same area as a rectangle with ascpect ration 3:4 and 100%
// height.
function verticalScaleForEqualArea(aspectRatio) {
  // 1 * 0.75 = A = x * x * aspectRatio
  return Math.sqrt(0.75 / aspectRatio);
}


// Handles DOM content for an EXIFPhoto.
function PhotoView(exifPhoto, index, displayTimezone) {
  this.exifPhoto_ = exifPhoto;
  this.displayTimezone_ = displayTimezone;

  // TODO: Consider doing this lazily?
  this.domContent_ = document.createElement('div');
  this.domContent_.className = 'photo timelineColour' + (index % numColours);
  this.domContent_.style.top = (timelineOffsetPixels * index) + 'px';
  var aspectRatio = this.exifPhoto_.size().x / this.exifPhoto_.size().y;
  this.domContent_.style.height = (100 * verticalScaleForEqualArea(aspectRatio)) + '%';
  var image = document.createElement('img');
  image.src = this.exifPhoto_.url();
  this.domContent_.appendChild(image);
  var timestamp = document.createElement('div');
  this.domContent_.appendChild(timestamp);
}
PhotoView.prototype.updateTimestampDisplay = function() {
  // We display the actual timestmp, without shifting applied.
  this.domContent_.lastChild.innerText = formatDate(this.exifPhoto_.timestamp(), this.displayTimezone_);
};
PhotoView.prototype.updateDisplayTimezone = function(timezone) {
  this.displayTimezone_ = displayTimezone;
  this.updateTimestampDisplay();
};
PhotoView.prototype.exifPhoto = function() {
  return this.exifPhoto_;
};
PhotoView.prototype.domContent = function() {
  return this.domContent_;
};

function TimelineView(name, index, displayTimezone) {
  this.index_ = index;
  this.timeline_ = new EXIFTimeline();
  this.photoViews_ = {};
  this.displayTimezone_ = displayTimezone;

  // TODO: Do this lazily?
  this.lineDOMContent_ = document.createElement('div');
  this.lineDOMContent_.innerText = name;
  this.lineDOMContent_.className = 'line lineColour' + (this.index_ % numColours);
  // TODO: Don't hardcode this - use CSS variables?
  this.lineDOMContent_.style.top = 85 + (timelineOffsetPixels * this.index_) + 'px';
}
TimelineView.prototype.lineDOMContent = function() {
  return this.lineDOMContent_;
};
TimelineView.prototype.addPhoto = function(exifPhoto) {
  // As well as adding the EXIFPhoto to the EXIFTimeline, we create and keep
  // our own reference to a corresponding PhotoView. We use this to handle DOM
  // content.
  console.log('TimelineView.addPhoto(): Index=' + this.index_ + ' adding ' + exifPhoto);
  this.timeline_.addPhoto(exifPhoto);
  var url = exifPhoto.url();
  console.assert(this.photoViews_[url] === undefined);
  this.photoViews_[url] = new PhotoView(exifPhoto, this.index_, this.displayTimezone_);
  this.timeline_.setTimestamps();
  var photoViews = this.photoViews_;
  Object.keys(photoViews).forEach(function(url) {
    photoViews[url].updateTimestampDisplay();
  });
};
TimelineView.prototype.getSortedPhotoViews = function() {
  var photoViews = this.photoViews_;
  return this.timeline_.getSortedPhotos().map(function(photo) {
    return photoViews[photo.url()];
  });
};
TimelineView.prototype.updateDisplayTimezone = function(timezone) {
  this.displayTimezone_ = timezone;
  var photoViews = this.photoViews_;
  Object.keys(photoViews).forEach(function(url) {
    photoViews[url].updateDisplayTimezone(timezone);
  });
};

// Owns a number of TimelineViews. Handles sorting of all the PhotoViews.
function SorterView(displayTimezone) {
  this.timelineViews_ = {}
  this.displayTimezone_ = displayTimezone;
}
SorterView.prototype.updateDisplayTimezone = function(timezone) {
  this.displayTimezone_ = timezone;
  var timelineViews = this.timelineViews_;
  Object.keys(timelineViews).forEach(function(model) {
    timelineViews[model].updateDisplayTimezone(timezone);
  });
};
SorterView.prototype.getTimelineView_ = function(model) {
  // Each TimelineView uses an index which is determined by the order of
  // addition, even though the map keys could be sorted differently.
  if (this.timelineViews_[model] === undefined) {
    var numTimelineViews = Object.keys(this.timelineViews_).length;
    this.timelineViews_[model] = new TimelineView(model, numTimelineViews, this.displayTimezone_);
  }
  return this.timelineViews_[model];
};
SorterView.prototype.addPhoto = function(exifPhoto) {
  this.getTimelineView_(exifPhoto.cameraModel()).addPhoto(exifPhoto);
};
SorterView.prototype.shiftTimeline = function(index, shiftMilliseconds) {
  // TODO: This should update the TimelineViews to display the shift time.
  this.timelines_[index].shift(shiftMilliseconds);
};
SorterView.prototype.getSortedPhotoDOMContents = function() {
  // TODO: Consider caching this?
  var timelineViews = this.timelineViews_;
  var photoViews = Object.keys(timelineViews).map(function(model) {
    return timelineViews[model].getSortedPhotoViews();
  });
  var sortedPhotoViews = mergeSort(photoViews, function(photoViewA, photoViewB) {
    return photoViewA.exifPhoto().shiftedTimestamp() - photoViewB.exifPhoto().shiftedTimestamp();
  });
  return sortedPhotoViews.map(function(photoView) {
    return photoView.domContent();
  });
};
SorterView.prototype.getLineDOMContents = function() {
  var timelineViews = this.timelineViews_;
  return Object.keys(timelineViews).map(function(model) {
    return timelineViews[model].lineDOMContent();
  });
};
SorterView.prototype.toString = function() {
  return this.timelines_.map(function(timeline) {
    return '[' + timeline.getSortedPhotos().map(function(photo) { return photo.timestamp(); }).join(', ') + ']';
  }).join('\n');
};
