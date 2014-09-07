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


// Handles the multiple timestamps for a Photo.
function EXIFPhoto(url, exifData) {
  // TODO: Allow default TZ to be set.
  // TODO: Also check TimeZoneOffset. This isn't part of the EXIF spec,
  // and doesn't seem to be widely supported.
  // http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/EXIF.html
  this.localTimestampProperties_ = getLocalTimestampProperties(exifData);
  this.gpsTimestamp_ = getGPSTimestamp(exifData);

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
