// Tools for testing

function pass(description) {
  var div = document.createElement('div');
  div.innerText = description;
  document.body.appendChild(div);
}

function fail(description) {
  var div = document.createElement('div');
  div.innerHTML = description instanceof Array ? description.join('<br>') : description;
  div.className = "fail";
  document.body.appendChild(div);
}

function objectsEqual(a, b) {
  var aProperties = [];
  for (property in a)
    aProperties.push(property)
  var bProperties = [];
  for (property in b)
    bProperties.push(property)
  if (!arraysEqual(aProperties, bProperties))
    return false;
  for (var i = 0; i < aProperties.length; ++i) {
    if (!isEqual(a[aProperties[i]], b[aProperties[i]]))
      return false;
  }
  return true;
}

function arraysEqual(a, b) {
  if (a.length !== b.length)
    return false;
  for (var i = 0; i < a.length; ++i) {
    if (!isEqual(a[i], b[i]))
      return false;
  }
  return true;
}

function isEqual(a, b) {
  if (a instanceof Array && b instanceof Array)
    return arraysEqual(a, b);
  if (a instanceof Object && b instanceof Object)
    return objectsEqual(a, b);
  return a === b;
}

function print(x) {
  if (x instanceof Array)
    return '[' + x.map(function(element) { return print(element); }).join(', ') + ']';
  if (x instanceof Object) {
    var properties = [];
    for (property in x)
      properties.push(property)
    return '{' + properties.map(function(property) { return property + ': ' + print(x[property]); }).join(', ') + '}';
  }
  return x.toString();
}

function check(actual, expected, description) {
  if (isEqual(actual, expected)) {
    pass(description);
    return;
  }
  fail([description + ' : Expected ...', print(expected), 'but got ...', print(actual)]);
}
