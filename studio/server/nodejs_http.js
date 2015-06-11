
GLOBAL.aa_httpCall = function(options,extendedHttpResult) {
  function getHeaderIgnoreCase(headers,keys) {
    for (var i=0;i<keys.length;i++)
      if (headers[keys[i]]) return headers[keys[i]];
  }

  function setHeaderIgnoreCase(headers,keys,value) {
    for (var i=0;i<keys.length;i++)
      if (headers[keys[i]]) 
        headers[keys[i]] = value;
  }

	if (!GLOBAL.zlib) GLOBAL.zlib = require('zlib');
  if (!GLOBAL.iconv) GLOBAL.iconv = require('iconv-lite');

	if (GLOBAL.traceNodeJS && !GLOBAL.ns_fs) GLOBAL.ns_fs = require('fs');
	if (GLOBAL.traceNodeJS) console.log('ajax call with url='+options.url);
	var deferred = $.Deferred();

  var start_time = now();
  if (GLOBAL.traceNodeJS)
	 ns_fs.appendFile(logDir + 'calls.dat', 'calling ' + options.url + ' at \t\t' + start_time + '\n', function (err) {});

  var urlObj = ns_url.parse(options.url);
  options.headers = options.headers || {};
  options.headers['accept-encoding'] = 'gzip,deflate'; // unzip is done automatically at the proxy

  options.headers.host = urlObj.host;
  var http_options = {
    host: urlObj.hostname,
    path: urlObj.path,
    method: options.method || 'GET',
    headers: options.headers
  };
  if (urlObj.port) http_options.port = urlObj.port;

  if (GLOBAL.fiddler) {
    var port = http_options.port ? ':' + http_options.port : '';
    http_options.path = (urlObj.protocol == 'https:' ? 'https' : 'http') + '://' + http_options.host + port + http_options.path;
    http_options.headers.host = http_options.host;
    http_options.host = '127.0.0.1';
    http_options.port = 8888;
    console.log(JSON.stringify(http_options, null, '\t'));
  }

  // MAY BE BUGGY - do not copy referer and X-Requested-With:XMLHttpRequest from client
  delete(http_options.headers.referer);
  delete(http_options.headers['X-Requested-With']);

  var httpObject = (urlObj.protocol == 'https:') ? https : http;

  var target = httpObject.request(http_options, function (result_stream) {
    var result_ar = [];
    if (result_stream.headers['content-encoding'] == 'gzip' || result_stream.headers['content-encoding'] == 'deflate') 
      var unziped_stream = result_stream.pipe(zlib.createGunzip());
    else
      var unziped_stream = result_stream;
    unziped_stream.on('data', function (chunk) {
      result_ar.push(chunk);
    });
    unziped_stream.on('end', function () {
      if (GLOBAL.traceNodeJS) 
        ns_fs.appendFile(logDir + 'calls.dat', 'finished ' + options.url + ' at \t\t' + now() + ' started at ' + start_time + '\n', function (err) {});

      var result_buff = Buffer.concat(result_ar);
      var content;
      var content_type = getHeaderIgnoreCase(result_stream.headers,['content-type','Content-Type']);
      // inject encoding into Content-Type - e.g., charset=windows-1255
      if (options.force_encoding && content_type && content_type.indexOf('charset=') == -1) { 
        content_type += '; charset=' + options.force_encoding;
        setHeaderIgnoreCase(result_stream.headers,['content-type','Content-Type'],content_type);
      }
      if (options.no_decode)
        content = result_buff;
      else if (content_type && content_type.indexOf('charset=') != -1) {
        var encoding = content_type.split('charset=')[1];
        content = iconv.decode(result_buff, encoding);
      }
      if (!content)
        content = result_buff.toString();

      var output = { content: content, requestHeaders: http_options.headers, responseHeaders: result_stream.headers }; 

      if (extendedHttpResult) { // change the output to JSON with the headers
        var extendedResult = {
          url: options.url,
          requestHeaders: http_options.headers,
          responseHeaders: result_stream.headers,
          body: result_buff.toString()
        };
        if (GLOBAL.traceNodeJS && options.data)
          extendedResult.postData = options.data;
        output = JSON.stringify(extendedResult, null, '\t');
        if (GLOBAL.traceNodeJS) 
          ns_fs.writeFileSync(logDir + 'nodejs_ajax_result_with_headers.dat', output);
      }

      if (GLOBAL.traceNodeJS) ns_fs.writeFileSync(logDir + 'nodejs_ajax_result.dat', output);
      try {
        if (options.success) options.success(output);
      } catch(e) {}
      deferred.resolve(output);  
    });

   unziped_stream.on('error', function(err) {
      if (options.error) options.error(err);
      deferred.reject(err);
    });    
  });

  if (options.data)
    target.write(options.data);
  target.end();

  function handleFinalResult(result_data) {
  }

  return deferred.promise();
}

function now() {
  var t = new Date();
  return pad(t.getHours())+ ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds());
}

function pad(i) { return i<10?'0'+i:i; }
