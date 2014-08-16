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

// The EXIF format isn't a standard format
function localDateFromEXIFDateString(string) {
  var matches = string.match(/(\d{4}):(\d{2}):(\d{2})/);
  return {
    year: matches[1],
    month: matches[2],
    day: matches[3]
  };
}

function localTimeFromEXIFDateString(string) {
  var matches = string.match(/(\d{2}):(\d{2}):(\d{2})/);
  return {
    hour: matches[1],
    minute: matches[2],
    second: matches[3]
  };
}

function getDateTimeOriginal(exifData, defaultTimezone) {
  // EXIF doesn't support time zone - http://en.wikipedia.org/wiki/Exchangeable_image_file_format

  var dateTimeOriginal = exifData['DateTimeOriginal'];
  var localDateProperties = localDateFromEXIFDateString(dateTimeOriginal.split(' ')[0]);
  var localTimeProperties = localTimeFromEXIFDateString(dateTimeOriginal.split(' ')[1]);
  var dateTimeOriginal = new timezoneJS.Date(localDateProperties.year, localDateProperties.month - 1, localDateProperties.day,
                                             localTimeProperties.hour, localTimeProperties.minute, localTimeProperties.second,
                                             defaultTimezone);
  console.log('dateTimeOriginal ' + formatDate(dateTimeOriginal));
  return dateTimeOriginal;
}

function getGPSTimestamp(exifData) {
  var gpsDateString = exifData['GPSDateStamp'];
  var gpsTimeArray = exifData['GPSTimeStamp'];
  if (!gpsDateString || !gpsTimeArray)
    return;

  var gpsDateProperties = localDateFromEXIFDateString(gpsDateString);
  var gpsDate = new timezoneJS.Date(gpsDateProperties.year, gpsDateProperties.month - 1, gpsDateProperties.day,
                                    gpsTimeArray[0], gpsTimeArray[1], gpsTimeArray[0],
                                    'UTC');
  console.log('gpsDate ' + formatDate(gpsDate));
  return gpsDate;
}

// Handles the multiple timestamps for a Photo.
function EXIFPhoto(url, exifData) {
  // TODO: Allow default TZ to be set.
  // TODO: Also check TimeZoneOffset. This isn't part of the EXIF spec,
  // and doesn't seem to be widely supported.
  // http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html
  this.exifTimestamp_ = getDateTimeOriginal(exifData, defaultTimezone);
  this.gpsTimestamp_ = getGPSTimestamp(exifData);

  var size = {x: exifData['PixelXDimension'], y: exifData['PixelYDimension']};
  // Use EXIF timestamp by default.
  this.init_(url, this.exifTimestamp_, size);
};
EXIFPhoto.prototype = Photo.prototype;
EXIFPhoto.prototype.useEXIFTimestamp = function() {
  this.timestamp_ = this.exifTimestamp_;
};
EXIFPhoto.prototype.useGPSTimestamp = function() {
  this.timestamp_ = this.gpsTimestamp_;
};
EXIFPhoto.prototype.exifTimestamp = function() {
  return this.exifTimestamp_;
};
EXIFPhoto.prototype.gpsTimestamp = function() {
  return this.gpsTimestamp_;
};

// Handles DOM content for an EXIFPhoto.
function PhotoView(exifPhoto, index) {
  this.exifPhoto_ = exifPhoto;

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
  // TODO: Allow TZ to be set
  // We display the actual timestmp, without shifting applied.
  timestamp.innerText = formatDate(this.exifPhoto_.timestamp(), defaultTimezone);
  this.domContent_.appendChild(timestamp);
}
PhotoView.prototype.updateDisplayTimezone = function(timezone) {
  this.domContent_.lastChild.innerText = formatDate(this.exifPhoto_.timestamp(), timezone);
};
PhotoView.prototype.exifPhoto = function() {
  return this.exifPhoto_;
};
PhotoView.prototype.domContent = function() {
  return this.domContent_;
};

function TimelineView(name, index) {
  this.index_ = index;
  this.timeline_ = new Timeline();
  this.photoViews_ = {};

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
TimelineView.prototype.addPhoto = function(url, exifData) {
  // As well as adding the Photo to the Timeline, we create and keep our own
  // reference to a corresponding PhotoView. We use this to handle DOM content
  // and the multiple timestamps.
  var exifPhoto = new EXIFPhoto(url, exifData);
  this.timeline_.addPhoto(exifPhoto);
  console.assert(this.photoViews_[url] === undefined);
  this.photoViews_[url] = new PhotoView(exifPhoto, this.index_);
};
TimelineView.prototype.selectAppropriateDates = function() {
  // TODO
};
TimelineView.prototype.getSortedPhotoViews = function() {
  var photoViews = this.photoViews_;
  return this.timeline_.getSortedPhotos().map(function(photo) {
    return photoViews[photo.url()];
  });
};
TimelineView.prototype.updateDisplayTimezone = function(timezone) {
  var photoViews = this.photoViews_;
  Object.keys(photoViews).forEach(function(url) {
    photoViews[url].updateDisplayTimezone(timezone);
  });
};

// Owns a number of TimelineViews. Handles sorting of all the PhotoViews.
function SorterView() {
  this.timelineViews_ = {}
  this.addPhotosRemainingCount_ = 0;
}
SorterView.prototype.updateDisplayTimezone = function(timezone) {
  var timelineViews = this.this.timelineViews_;
  Object.keys(timelineViews).forEach(function(model) {
    timelineViews[model].updateDisplayTimezone(timezone);
  });
};
SorterView.prototype.addPhotos = function(files, onComplete) {
  console.assert(onComplete);
  console.assert(this.addPhotosRemainingCount_ === 0);
  this.addPhotosRemainingCount_ = files.length;
  this.onAddPhotosCompleteCallback_ = onComplete;
  for (var i = 0; i < files.length; ++i)
    this.addPhoto_(files[i]);
};
SorterView.prototype.getTimelineView_ = function(model) {
  // Each TimelineView uses an index which is determined by the order of
  // addition, even though the map keys could be sorted differently.
  if (this.timelineViews_[model] === undefined) {
    var numTimelineViews = Object.keys(this.timelineViews_).length;
    this.timelineViews_[model] = new TimelineView(model, numTimelineViews);
  }
  return this.timelineViews_[model];
};
SorterView.prototype.addPhoto_ = function(file) {
  var fileReader = new FileReader();
  var url = URL.createObjectURL(file);
  // TODO: Consider using proper closure
  var me = this;
  fileReader.onload = function() {
    var exifData = EXIF.readFromBinaryFile(new BinaryFile(this.result));
    var cameraModel = exifData['Model'];
    //console.log(exifData);
    // TODO: Add way to override which timeline to add to?
    me.getTimelineView_(cameraModel).addPhoto(url, exifData);
    me.onPhotoAdded_();
  };
  fileReader.readAsBinaryString(file);
};
SorterView.prototype.onPhotoAdded_ = function() {
  console.assert(this.addPhotosRemainingCount_ >= 0);

  // TODO: Show progress bar
  console.log(this.addPhotosRemainingCount_ + ' photos remaining');

  var timelineViews = this.timelineViews_;
  Object.keys(timelineViews).forEach(function(model) {
    timelineViews[model].selectAppropriateDates();
  });

  if (--this.addPhotosRemainingCount_ > 0)
    return;

  console.log('All photos added');
  this.onAddPhotosCompleteCallback_();
};
SorterView.prototype.shiftTimeline = function(index, shiftMilliseconds) {
  // TODO: This should update the photo views to display the shift time somehow.
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
