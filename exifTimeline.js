function printPropertyBag(bag) {
  return '{' + Object.keys(bag).map(function(key) {
    return key + '=' + bag[key];
  }).join(', ') + '}';
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

function localTimestampFromEXIFTimestampString(string) {
  var components = string.split(' ');
  var localTimestampProperties = localDateFromEXIFDateString(components[0]);
  var matches = components[1].match(/(\d{2}):(\d{2}):(\d{2})/);
  localTimestampProperties.hour =  matches[1],
  localTimestampProperties.minute =  matches[2],
  localTimestampProperties.second =  matches[3]
  return localTimestampProperties;
}

function getLocalTimestampProperties(exifData) {
  // EXIF doesn't support time zone - http://en.wikipedia.org/wiki/Exchangeable_image_file_format
  return localTimestampFromEXIFTimestampString(exifData['DateTimeOriginal']);
}

function getGPSTimestamp(exifData) {
  var gpsDateString = exifData['GPSDateStamp'];
  var gpsTimeArray = exifData['GPSTimeStamp'];
  if (!gpsDateString || !gpsTimeArray)
    return null;

  var gpsDateProperties = localDateFromEXIFDateString(gpsDateString);
  return new timezoneJS.Date(gpsDateProperties.year, gpsDateProperties.month - 1, gpsDateProperties.day,
                             gpsTimeArray[0], gpsTimeArray[1], gpsTimeArray[0],
                             'UTC');
}

function applyTimezoneToLocalTimestampProperties(localTimestampProperties, timezone) {
  return new timezoneJS.Date(localTimestampProperties.year, localTimestampProperties.month - 1, localTimestampProperties.day,
                             localTimestampProperties.hour, localTimestampProperties.minute, localTimestampProperties.second,
                             timezone);
}

function getCameraModel(exifData) {
  return exifData['Model'];
}


// Handles the multiple timestamps for a Photo.
function EXIFPhoto(url, exifData) {
  // TODO: Allow default TZ to be set.
  // TODO: Also check TimeZoneOffset. This isn't part of the EXIF spec,
  // and doesn't seem to be widely supported.
  // http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html
  this.localTimestampProperties_ = getLocalTimestampProperties(exifData);
  this.gpsTimestamp_ = getGPSTimestamp(exifData);

  this.cameraModel_ = getCameraModel(exifData);

  var size = {x: exifData['PixelXDimension'], y: exifData['PixelYDimension']};
  this.init_(url, size);
};
EXIFPhoto.prototype = Photo.prototype;
EXIFPhoto.prototype.toString = function() {
  return '{EXIFPhoto url=' + this.url_ + ' size=' + printPropertyBag(this.size_) + ' localTimestampProperties=' + printPropertyBag(this.localTimestampProperties_) + ' gpsTimestamp=' + this.gpsTimestamp_ + ' }';
};
EXIFPhoto.prototype.setTimezone = function(timezone) {
  this.timestamp_ = applyTimezoneToLocalTimestampProperties(this.localTimestampProperties_, timezone);
};
EXIFPhoto.prototype.localTimestampProperties = function() {
  return this.localTimestampProperties_;
};
EXIFPhoto.prototype.gpsTimestamp = function() {
  return this.gpsTimestamp_;
};
EXIFPhoto.prototype.cameraModel = function() {
  return this.cameraModel_;
};

// Handles the multiple timestamps for a timeline of EXIFPhotos.
function EXIFTimeline() {
  this.init_();
}
EXIFTimeline.prototype = Timeline.prototype;
EXIFTimeline.prototype.setTimestamps = function() {
  console.log('EXIFTimelineView.setTimestamps()');
  // Assume that the EXIF time wasn't reset within the timeline.
  // The GPS timestamp is prone to wobble, so we never actually use it as a
  // timestamp. We just use it to determine the timezone.
  // TODO: If the EXIF timestamp (with timezone offset applied) is consistently
  // shifted by a fixed amount from the 'correct' time based on the GPS
  // timestamp, we could consider shifting it automatically. But this is hard
  // to detect and it's easy for the user to fix this manually anyway.
  var timezone = defaultTimezone;

  // See if all the GPS timestamps correspond to a single timezone relative to
  // the local timestamp, within some offset.
  var thresholdMinutes = 5;
  var consistentTimezones = timezoneJS.timezone.getAllZones();
  this.photos_.forEach(function(exifPhoto) {
    console.assert(exifPhoto instanceof EXIFPhoto);
    var candidateTimezones = consistentTimezones;
    consistentTimezones = [];
    var gpsTimestamp = exifPhoto.gpsTimestamp();
    if (gpsTimestamp === null)
      return false;
    candidateTimezones.forEach(function(candidateTimezone) {
      // TODO: Handle the two possibilities near a daylight-savings switch.
      var timestamp = applyTimezoneToLocalTimestampProperties(exifPhoto.localTimestampProperties(), candidateTimezone);
      var delta = timestamp - gpsTimestamp;
      if (Math.abs(delta) / (1000 * 60) < thresholdMinutes)
        consistentTimezones.push(candidateTimezone);
    });
    console.log('Consistent timezones after this photo: [' + consistentTimezones.join(', ') + ']');
    return consistentTimezones.length > 0;
  });
  console.log('Consistent timezones after all photos: [' + consistentTimezones.join(', ') + ']');
  // There could be multiple consistent timezones. While some could be
  // identical, others may differ due to different dates for the DST switches.
  // In theory, this could make a difference to how we resolve the local
  // timestamps. In practice, because timezone offsets are discretized at 15
  // minutes, which is larger than our threshold for consistency, this won't be
  // a problem. So we just take the first timezone.
  // TODO: Consider asserting that all consistent timezones are identical?
  if (consistentTimezones.length > 0) {
    console.log('Using calculated timezone ' + consistentTimezones[0]);
    timezone = consistentTimezones[0];
  }
 
  this.photos_.forEach(function(exifPhoto) {
    exifPhoto.setTimezone(timezone);
  });
};

function EXIFSorter() {
  this.init_();
}
EXIFSorter.prototype = Sorter.prototype;
EXIFSorter.prototype.addExifPhoto = function(exifPhoto) {
  this.addPhoto(exifPhoto.cameraModel(), exifPhoto);
};
