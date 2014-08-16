// Stable because we favor 'a'.
function mergeSortPair(a, b, comparator) {
  console.assert(a instanceof Array);
  console.assert(b instanceof Array);
  var aIndex = 0;
  var bIndex = 0;
  var result = [];
  while (aIndex < a.length || bIndex < b.length) {
    if (bIndex === b.length || (aIndex < a.length && comparator(a[aIndex], b[bIndex]) <= 0))
      result.push(a[aIndex++]);
    else
      result.push(b[bIndex++]);
  }
  return result;
}

// Stable because we favour lower indices
function mergeSort(arrays, comparator) {
  console.assert(arrays instanceof Array);
  console.assert(arrays.length > 0);
  if (arrays.length === 1)
    return arrays[0];
  var result = mergeSortPair(arrays[0], arrays[1], comparator);
  for (var i = 2; i < arrays.length; ++i)
    result = mergeSortPair(result, arrays[i], comparator);
  return result;
}

function stableSort(array, comparator) {
  var wrappedArray = array.map(function(element, index) {
    return {element: element, index: index};
  });
  wrappedArray.sort(function(a, b) {
    var comparison = comparator(a.element, b.element);
    return comparison === 0 ? a.index - b.index : comparison;
  });
  return wrappedArray.map(function(wrapper) {
    return wrapper.element;
  });
}

function findMinimumDeltaImpl(inputArray, searchArray, accessor, reverse) {
  console.assert(searchArray instanceof Array);
  console.assert(searchArray.length > 0);
  var sign = reverse ? -1 : 1;
  var indexStep = reverse ? -1 : 1;
  var startInputIndex = reverse ? inputArray.length - 1 : 0;
  var endInputIndex = reverse ? -1 : inputArray.length;
  var searchIndex = reverse ? searchArray.length - 1 : 0;
  var endSearchIndex = reverse ? -1 : searchArray.length;
  var minimumDelta = Infinity;
  for (inputIndex = startInputIndex; inputIndex != endInputIndex; inputIndex += indexStep) {
    var inputValue = accessor(inputArray[inputIndex]);
    // TODO: Equality
    while (true) {
      var delta = sign * (accessor(searchArray[searchIndex]) - inputValue);
      if (delta > 0)
        break;
      searchIndex += indexStep;
      if (searchIndex === endSearchIndex) {
        //console.log('Early out');
        return minimumDelta;
      }
    }
    minimumDelta = Math.min(minimumDelta, delta);
    //console.log('findMinimumDeltaImpl(): inputIndex=' + inputIndex + ' searchIndex=' + searchIndex + ' delta=' + delta + ' minimumDelta=' + minimumDelta);
  }
  //console.log('findMinimumDeltaImpl(): minimumDelta=' + minimumDelta);
  return minimumDelta;
}

// Finds the minimum delta in a specified parameter between any object in an
// input array and any object in an array of arrays of such objects. The
// parameter is specified by means of an accessor function which is applied to
// each element. All arrays must be sorted by this parameter. The array is
// specified as an index in an outer array of arrays. Searches fowrwards by
// default, or backwards if the reverse parameter is set to true.
function findMinimumDelta(inputArray, searchArrays, accessor, reverse) {
  console.assert(inputArray instanceof Array);
  console.assert(inputArray.length > 0);
  console.assert(searchArrays instanceof Array);
  console.assert(searchArrays.length > 0);
  var minimumDelta = Infinity;
  for (var i = 0; i < searchArrays.length; ++i) {
    minimumDelta = Math.min(minimumDelta, findMinimumDeltaImpl(inputArray, searchArrays[i], accessor, reverse));
    //console.log('findMinimumDelta(): i=' + i + ' minimumDelta=' + minimumDelta);
  }
  return minimumDelta;
}
