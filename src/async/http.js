ajaxart.load_plugin("field","plugins/async/http.xtml");

aa_gcs("http",{
  HttpCall: function(profile,data,context) {
    var deferred = $.Deferred();

    var httpCall = {
      options: {
        url: aa_text(data,profile,'Url',context),
        type: 'GET',
        headers: {}
      },
      deferred: deferred
    };
    var ctx2 = aa_ctx(context,{ _HttpCall: [httpCall]});
    ajaxart.runsubprofiles(data,profile,'Aspect',ctx2);

    httpCall.run = function() { // can be overriden by aspects (e.g. proxy)
      var args = { cancelCallback: false }; // allow canceling deferred resolve/reject (for retries)

      var ajaxPromise = window.jBartNodeJS ? jBartNodeJS.httpCall(httpCall.options,false) : $.ajax(httpCall.options);

      $.when(ajaxPromise).then(function(result) {
        if (httpCall.resultToDesiredFormat)
          httpCall.result = httpCall.resultToDesiredFormat(result);
        else
          httpCall.result = ajaxart_server_content2result(result,httpCall.resultFormat)[0];

        aa_trigger(httpCall,'identifyError');
        
        if (httpCall.error)
          $.when(aa_async_trigger(httpCall,'error',args)).then(function() { httpCall.done(args); });
        else
          $.when(aa_async_trigger(httpCall,'success',args)).then(function() { httpCall.done(args); });

      },function(error) {
        httpCall.error = error || 'error';
        $.when(aa_async_trigger(httpCall,'error',args)).then(function() { httpCall.done(args); });
        if (error)
          ajaxart.log(error.statusText || error.description,"error");
      });
    };

    httpCall.done = function(args) {
      if (args.cancelCallback) return;
      if (httpCall.error) {
        $.when(aa_async_trigger(httpCall,'finalError',{})).then(reject);
      } else {
        if (args.vars) ctx2 = aa_ctx(ctx2,args.vars);
        var result2 = ajaxart.run([httpCall.result], profile, 'OnSuccess', aa_ctx(ctx2,{OriginalData: data}));
        $.when(result2[0]).then(function() {
          deferred.resolve([httpCall.result]); 
        }, reject); 
      }
    };

    aa_trigger(httpCall,'prepare');
    httpCall.run();

    var out = [deferred.promise()];
    out.promise = out[0];
    return out;

    function reject() {
      deferred.reject(httpCall.error);
    }
  },
  HttpHeader: function(profile,data,context) {
    if (!context.vars._HttpCall) return;
    var httpCall = context.vars._HttpCall[0];
    var name = aa_text(data,profile,'Name',context);
    var value = aa_text(data,profile,'Value',context);
    httpCall.options.headers[name] = value; 
  },
  PassResultHeadersThroughProxy: function(profile,data,context) {
    if (!context.vars._HttpCall) return;
    var httpCall = context.vars._HttpCall[0];
    httpCall.headersToPass = aa_text(data,profile,'HeadersToPass',context);
  },
  ForceProxyEncoding: function(profile,data,context) {
    if (!context.vars._HttpCall) return;
    var httpCall = context.vars._HttpCall[0];
    httpCall.forceProxyEncoding = aa_text(data,profile,'Encoding',context);
  },
  WithHttpCredentials: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    httpCall.options.xhrFields = httpCall.options.xhrFields || {};
    httpCall.options.xhrFields.withCredentials = true;
  },
  PostForm: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    var useStoredCookies = aa_bool(data,profile,'UseStoredCookies',context);
    var useStoredHiddenInputs = aa_bool(data,profile,'UseStoredHiddenInputs',context);

    aa_bind(httpCall,'prepare',function() {
      httpCall.options.type = 'POST';
      httpCall.options.headers['Content-Type'] = aa_text(data,profile,'ContentType',context);

      var postData = ajaxart.runsubprofiles(data,profile,'PostData',context);     
      httpCall.options.data = {};
      for(var i=0;i<postData.length;i++) {
        var entry = postData[i];
        httpCall.options.data[entry.Name] = entry.Value;
      }

      var domain = aa_url_domain(httpCall.options.url);
      ajaxart.httpStoredData = ajaxart.httpStoredData || {};
      ajaxart.httpStoredData[domain] = ajaxart.httpStoredData[domain] || {};

      if (useStoredHiddenInputs && ajaxart.httpStoredData[domain].hiddenInputs) {
        var hiddenInputs = ajaxart.httpStoredData[domain].hiddenInputs;
        for(i in hiddenInputs) {
          httpCall.options.data[i] = hiddenInputs[i];
        }
      }
      if (useStoredCookies && ajaxart.httpStoredData[domain].cookies) {
        httpCall.cookies = httpCall.cookies || {};
        aa_extend(httpCall.cookies,ajaxart.httpStoredData[domain].cookies);
      }
    });
  },
  RawPost: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    aa_bind(httpCall,'prepare',function() {
      httpCall.options.type = 'POST';
      httpCall.options.headers['Content-Type'] = aa_text(data,profile,'ContentType',context);   
      httpCall.options.data = aa_text(data,profile,'RawData',context);
    });
  },
  IdentifyError: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    aa_bind(httpCall,'identifyError',function() {
      var errorText = aa_text([httpCall.result],profile,'ErrorObject',context);
      if (errorText)
        httpCall.error = errorText;
    });
  },
  OnError: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    aa_bind(httpCall,'error',function(args) {
      aa_run([httpCall.error],profile,'Action',context);
    });
  },
  CacheKiller: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    aa_bind(httpCall,'prepare',function() {
      var querySuffix = httpCall.options.url.indexOf('?') == -1 ? '?' : '&';
      httpCall.options.url += querySuffix + '_cacheKiller=' + (new Date().getTime());
    });   
  },
  Cookie: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    aa_bind(httpCall,'prepare',function() {
      httpCall.cookies = httpCall.cookies || {};
      httpCall.cookies[aa_text(data,profile,'CookieName')]  = aa_text(data,profile,'Value');
    });
  },
  ResultAsJsonToXml:function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    var tag = aa_text(data,profile,'TopTag',context);
    httpCall.resultToDesiredFormat = function(result) {
      return aa_JSON2Xml(result,tag);
    };    
  },    
  ResultAsPlainText:function(profile,data,context) { 
    var httpCall = context.vars._HttpCall[0];
    httpCall.resultToDesiredFormat = function(result) {
      return result.toString();
    };
  },
  UseStoredCookies: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];

    aa_bind(httpCall,'prepare',function() {
      var domain = aa_url_domain(httpCall.options.url);     
      ajaxart.httpStoredData = ajaxart.httpStoredData || {};
      ajaxart.httpStoredData[domain] = ajaxart.httpStoredData[domain] || {};

      httpCall.cookies = httpCall.cookies || {};
      aa_extend(httpCall.cookies,ajaxart.httpStoredData[domain].cookies);
    });   
  },
  PreviewModeResult: function(profile,data,context) {
    if (!ajaxart.inPreviewMode) return;

    var httpCall = context.vars._HttpCall[0];
    aa_bind(httpCall,'prepare',function() {
      httpCall.run = function() {
        var args = { cancelCallback: false };
        httpCall.result = aa_first(data,profile,'Result',context);
        $.when(aa_async_trigger(httpCall,'success',args)).then(function() { httpCall.done(args); })
      }
    });
  },
  JSONPCrossDomainProxy: function(profile,data,context) {
    var baseUrl = aa_text(data,profile,'BaseUrl',context);
    var httpCall = context.vars._HttpCall[0];
    window.JSONPCrossDomainProxy = window.JSONPCrossDomainProxy || 
    { 
      counter: 0 ,
      httpCall: {},
      handler: function(result,id) {
        var httpCall = window.JSONPCrossDomainProxy.httpCall[id];
        delete window.JSONPCrossDomainProxy.httpCall[id];
        var args = { cancelCallback: false }; 
        httpCall.result = result;
        $.when(aa_async_trigger(httpCall,'success',args)).then(function() { httpCall.done(args); });
      }
    };

    aa_bind(httpCall,'prepare',function() {
      httpCall.run = function() {
        window.JSONPCrossDomainProxy.counter++;
        var id = '' + window.JSONPCrossDomainProxy.counter;
        window.JSONPCrossDomainProxy.httpCall[id] = httpCall;
        jQuery.getScript(baseUrl + '?op=proxy&url=' + encodeURIComponent(httpCall.options.url) + '&callback=JSONPCrossDomainProxy.handler&aa_req_id=' +id, function () {});
      };
    });
  },
  JBartCrossDomainProxy: function(profile,data,context) {
    var debugMode = true;
    var baseUrl = aa_text(data,profile,'BaseUrlForProduction',context);

    if (ajaxart.jbart_studio) {
      if (window.location.href.indexOf('localhost') > -1)
        baseUrl = aa_text(data,profile,'BaseUrlForLocalhostStudio',context) || baseUrl; 
      else
        baseUrl = aa_text(data,profile,'BaseUrlForStudio',context) || baseUrl;
    }

    var extendedHttpResult = aa_bool(data,profile,'ExtendedHttpResult',context);
    var noProxyInNodeJS = aa_bool(data,profile,'NoProxyInNodeJS',context);
    var httpCall = context.vars._HttpCall[0];
    httpCall.hasExtendedHttpResult = extendedHttpResult;

    aa_bind(httpCall,'prepare',function() {
      httpCall.run = function() {
        // TODO: Go to jbartdb.appspot.com/get.php if not in localhost
        var proxyOptions = {
          type: 'GET',
          url: baseUrl + '&url=' + encodeURIComponent(httpCall.options.url)
        };
        if (httpCall.options.type == 'POST') {
          var post_data = '';
          if (typeof(httpCall.options.data) == 'string') post_data = httpCall.options.data;
          else {
            // example: userid=joe&password=guessme
            var firstTime = true;
            for(var i in httpCall.options.data) {
              if (!firstTime) post_data += '&';
              post_data += i + '=' + httpCall.options.data[i];
              firstTime = false;
            }
          }         
          proxyOptions.url += '&method=POST&post_data='+encodeURIComponent(post_data);
        }
        for(var headerName in httpCall.options.headers) {
          proxyOptions.url += '&header_'+encodeURIComponent(headerName)+'='+encodeURIComponent(httpCall.options.headers[headerName]);
        }
        if (httpCall.headersToPass)
          proxyOptions.url += '&result_headers_to_pass='+encodeURIComponent(httpCall.headersToPass);
        if (extendedHttpResult)
          proxyOptions.url += '&extendedResult=true';
        if (httpCall.forceProxyEncoding)
          proxyOptions.url += '&jb_force_encoding=' + httpCall.forceProxyEncoding;

        var cookies = '';
        if (httpCall.cookies) {
          var ar = [];
          for(var i in httpCall.cookies)
            ar.push('' + i + '=' + httpCall.cookies[i]);
          cookies = ar.join('; ');
          proxyOptions.url += '&header_cookie:'+encodeURIComponent(cookies);
        }
        
        var args = { cancelCallback: false }; 
        var ajaxPromise = null;

        if (window.jBartNodeJS && noProxyInNodeJS) {
          var options = aa_extend(httpCall.options);
          if (post_data) options.data = post_data;
          options.headers = aa_defaults(options.headers,{
            'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36',
            cookie: cookies
          });         
          ajaxPromise = jBartNodeJS.httpCall(options,extendedHttpResult);
        } else if (window.jBartNodeJS && !noProxyInNodeJS) {
          proxyOptions.headers = aa_defaults(httpCall.options.headers,{
            'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36'
          });         
          ajaxPromise = jBartNodeJS.httpCall(proxyOptions,false);  // use the proxy options (very similar to $.ajax)
        } else {
          ajaxPromise = $.ajax(proxyOptions);
        }
        
        $.when(ajaxPromise).then(function(result) {

          if (extendedHttpResult) {
            if (!result) {
              ajaxart.log('error - proxy returned an empty result','error');
              httpCall.error = 'proxy returned an empty result';
              $.when(aa_async_trigger(httpCall,'error',args)).then(function() { httpCall.done(args); });
              return;           
            }

            var resultJson = JSON.parse(result);
            httpCall.proxyResult = result;
            httpCall.responseHeaders = resultJson.responseHeaders;
            httpCall.result = resultJson.body;      
            args.vars = {
              ProxyResponse: [resultJson]
            }
            if (typeof resultJson.error != 'undefined') {
              httpCall.error = resultJson.error || 'error';
              $.when(aa_async_trigger(httpCall,'error',args)).then(function() { httpCall.done(args); });
              return;           
            }
          } else {  // direct result
            httpCall.result = result;
          }
          if (httpCall.result && httpCall.result.nodeType == 9) httpCall.result = httpCall.result.documentElement;

          $.when(aa_async_trigger(httpCall,'success',args)).then(function() { httpCall.done(args); });

        },function(error) {
          httpCall.error = error || 'error';
          $.when(aa_async_trigger(httpCall,'error',args)).then(function() { httpCall.done(args); });
        });       
      };
    });

  },
  RetryOnServerUnavailable: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    var maxTries = aa_int(data,profile,'MaxTries',context);

    aa_bind(httpCall,'error',function(args) {
      httpCall.retryCount = httpCall.retryCount || 0;
      httpCall.retryCount++;
      if (httpCall.retryCount >= maxTries) return;

      args.cancelCallback = true;
      httpCall.run(); 
    });
  },
  StoreFormHiddenData: function(profile,data,context) {
    ajaxart.httpStoredData = ajaxart.httpStoredData || {};
    var httpCall = context.vars._HttpCall[0];

    var storeCookies = aa_bool(data,profile,'StoreCookies',context);
    var storeHiddenInputs = aa_bool(data,profile,'StoreHiddenInputs',context);

    aa_bind(httpCall,'success',function(args) {
      var domain = aa_url_domain(httpCall.options.url);
      ajaxart.httpStoredData[domain] = ajaxart.httpStoredData[domain] || {};

      var setCookies = httpCall.responseHeaders['set-cookie'];
      if (setCookies && storeCookies) {
        storeSetCookies(domain,setCookies);
      }
      if (storeHiddenInputs) {
        ajaxart.httpStoredData[domain].hiddenInputs = aa_findHiddenInputs(httpCall.result); 
      }
    });   

    function storeSetCookies(domain,setCookies) {
      ajaxart.httpStoredData[domain].cookies = ajaxart.httpStoredData[domain].cookies || {};
      for(var i=0;i<setCookies.length;i++) {
        var cookie = setCookies[i].split(';')[0];
        var name = cookie.split('=')[0];
        var value = '';
        if (cookie.indexOf('=') > -1)
          value = cookie.match(/^[^=]+=(.*)/)[1];

        ajaxart.httpStoredData[domain].cookies[name] = value;
      }
    }
  },
  WriteResultValue: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];

    aa_bind(httpCall,'success',function(args) {
      var to = ajaxart.run(data,profile,'To',context);
      var valueToWrite = ajaxart.run(httpCall.result ? [httpCall.result] : [],profile,'ProcessResults',context);
      ajaxart.writevalue(to,valueToWrite);
    });   
  },
  Log: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    function log(res) {
      var ctx = aa_ctx(context,{ _Url: [httpCall.options.url]});
      var txt = aa_text([aa_totext(res)],profile,'Message',ctx);
      if (window.console) console.log(txt);
      ajaxart.log(txt);
    }
    aa_bind(httpCall,'success',function(args) {
      log(httpCall.result);
    });   
    aa_bind(httpCall,'error',function(args) {
      log(httpCall.error);
    });   
  },
  OnSuccess: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];

    aa_bind(httpCall,'success',function(args) {
      ajaxart.run(httpCall.result ? [httpCall.result] : [],profile,'Action',context);
    });   
  },
  ResultFormat: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    httpCall.resultFormat = aa_text(data,profile,'Format',context);
  },
  HttpDomainStoredData: function(profile,data,context) {
    ajaxart.httpStoredData = ajaxart.httpStoredData || {};
    var url = aa_text(data,profile,'SampleUrlForDomain',context);
    var domain = aa_url_domain(url);
    if (ajaxart.httpStoredData[domain]) {
      ajaxart.httpStoredData[domain].domain = domain;
      return [ ajaxart.httpStoredData[domain] ];
    }
  },
  EnsureLoggedIn: function(profile,data,context) {
    var httpCall = context.vars._HttpCall[0];
    ajaxart.runNativeHelper(data,profile,'Aspects',context);

    aa_bind(httpCall,'success',function(args) {
      if (! aa_bool([httpCall.result],profile,'MustLoginIndication',context)) return; // no problem
      if (httpCall.triedToLogin) {
        httpCall.error = "could not login";
        return;
      }
      httpCall.triedToLogin = true;
      var promise = aa_first(data,profile,'DoLogin',context);
      $.when(promise).then(function() {
        args.cancelCallback = true;
        httpCall.run(); // retry
      });
    });     
  },
  ImageDimentions: function(profile,data,context) {
    var url = aa_text(data,profile,'ImageUrl',context);
    var deferred = $.Deferred();
    if (!url) 
      deferred.reject();

    var img = $('<img/>')[0];
    var doneCalled = false;

    img.onload = function() {
      if (!doneCalled)
        deferred.resolve({ width: img.width, height: img.height});
    };

    img.onerror = function() {
      doneCalled=true;
      deferred.reject();
    };

    img.setAttribute('src',url);      
    if (img.width) { // already loaded
      doneCalled = true; 
      return [{ width: img.width, height: img.height}];
    } 

    return [deferred.promise()];
  },
  WaitForFirewallBlock: function(profile,data,context) {
    var httpCall = aa_var_first(context, '_HttpCall');

    aa_bind(httpCall,'success',function() {
      if (!aa_bool([httpCall.result],profile,'IdentifyBlocking',context)) return;

      if (httpCall.waitingForFirewallBlock) {
        return $.Deferred().reject(); // After the timeout the block is still active
      }

      httpCall.waitingForFirewallBlock = true;
      setTimeout( function() {
        httpCall.run();
      }, aa_int(data,profile,'Timeout',context));
      ajaxart.log('Waiting for firewall block [' + new Date().getHours() + ':' + new Date().getMinutes() + ']','http.waitforfirewallblock');

      return $.Deferred().promise(); // will never be resolved
    });
  }
});


function aa_url_domain(url) {
  if (window.jBartNodeJS) return jBartNodeJS.urlHostname(url);

  var a = document.createElement('a');
  a.href = url;
  return a.hostname;  
}

function aa_findHiddenInputs(contents) {
  var out = {};
  var contentsLeft = contents;
  var counter = 0;

  while (true) {
    if (++counter >= 500) return out; // to avaoid endless loop

    var pos = contentsLeft.toLowerCase().indexOf('<input');
    if (pos == -1) return out;
    var pos2 = contentsLeft.indexOf('>',pos);
    if (pos2 == -1) return out;
    var inputHtml = contentsLeft.substring(pos,pos2+1);
    handleInput(inputHtml);

    contentsLeft= contentsLeft.substring(pos2+1);
  }
  return out;

  function handleInput(inputHtml) {
    if (!window.jBartNodeJS) {
      var input = $(inputHtml);
      if (input.attr('type') == 'hidden') {
        var name = input.attr('name');
        var value = input.attr('value');
        out[name] = value;
      }   
    } else {
      // we do not have jQuery to help us     
      if (inputHtml.toLowerCase().indexOf('type="hidden"') == -1 || inputHtml.toLowerCase().indexOf("type='hidden'") == -1) return;
      var name = inputHtml.match(/name="([^"]*)"/)[1] || inputHtml.match(/name='([^'']*)'/)[1] || '';
      var value = inputHtml.match(/value="([^"]*)"/)[1] || inputHtml.match(/value='([^'']*)'/)[1] || '';

      if (name) out[name] = value;
    }
  }
}

function aa_fix_http_result(result,httpCall) {
  if (result && result.nodeType && result.nodeType == 9) // convert doc to root elem
    return result.firstChild;
  return result;
}

function ajaxart_server_content2result(server_content,resultType) 
{
  if (resultType == 'json') return [server_content];
  if (resultType == 'json to xml') 
    return [ aa_JSON2Xml(server_content,'Top') ];
    try {
    if (resultType == null || resultType == '') resultType = 'xml';
    if (ajaxart.isxml(server_content))
    {
        var docElem = server_content.firstChild;
        while(docElem.nodeType != 1 && docElem.nextSibling != null)
          docElem = docElem.nextSibling;
//        if (ajaxart.isIE10)
//          return [ aa_parsexml( ajaxart.xml2text(docElem) ) ];
//      else
      return [docElem];
    }
    if (server_content=="") return [];
      var out = null;
    if ( resultType != 'xml' || (server_content.length > 0 && server_content.charAt(0) != "<"))  // not xml
      return [ server_content ];
  
      var server_content_no_ns = ajaxart.ajaxart_clean_ns(server_content);
      if (server_content.length > 0 && server_content.charAt(0) == "<")
        out = [ aa_parsexml(server_content_no_ns) ];
  
      if (out == null) out = [server_content];
      if (out.length == 1 && out[0] == null) out = [server_content];
        
      if (ajaxart.ishtml(out[0]) || (ajaxart.isxml(out[0]) && aa_xpath(out[0].ownerDocument.documentElement,"Body/Fault").length != 0 ))  { // not xml, probably error
        ajaxart.log("failed calling server","error");
        if (ajaxart.ishtml(out))
        jQuery("<div>error back from server:"+server_content+"</div>").appendTo(jQuery("#ajaxart_log"));
    }
    else if (ajaxart.isxml(out)) {
      if (out[0].nodeType == 7) out = [ out[0].nextSibling ]; // <?xml
        if (out[0].tagName.toLowerCase() == 'envelope')  // web service
      out = [ ajaxart.body_contents_of_soap_envelope(out[0]) ];
    }
  
    return out;
    }
    catch(e) {ajaxart.logException(e); return []; }
}
