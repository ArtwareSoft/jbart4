ajaxart.load_plugin("jbart","plugins/jbartdb/jbartdb.xtml");

aa_gcs("jbartdb", {
	CreateNewNodeInJBartDB: function (profile,data,context)
	{
		var xml = aa_parsexml( aa_first(data,profile,'NodeXml',context) );
		if (aa_bool(data,profile,'AddTimestampToID',context)) {
			var id = xml.getAttribute('id') || '';
			id += '_' + aadate_dateObj2StdDate(new Date()).replace(/[:/ ]/g,'_');
			xml.setAttribute('id',id);
		}
		if (ajaxart.inPreviewMode) return;
		jBart.db.save({
			data: xml,
			success: function() {
				ajaxart.run([xml],profile,'OnSuccess',context);
			},
			error: function() {
				ajaxart.run(data,profile,'OnError',context);
			},
			server: aa_text(data,profile,'Server',context),
			context: context
		});
	},
	CloneNodeInJBartDB: function (profile,data,context)
	{
		jBart.db.cloneNode({
			data: aa_parsexml( aa_first(data,profile,'Node',context) ),
			success: function(newnode) {
				ajaxart.run([newnode],profile,'OnSuccess',context);
			},
			error: function() {
				ajaxart.run([newnode],profile,'OnError',context);
			},
			server: aa_text(data,profile,'Server',context),
			context: context
		});
	},
	DeleteNodeInJBartDB: function (profile,data,context)
	{
		var node = aa_first(data,profile,'Node',context);
		if (!node || node.nodeType != 1) return;
		if (ajaxart.inPreviewMode) return;
		
		jBart.db.deleteNode({
			data: node,
			success: function(newnode) {
				ajaxart.run([newnode],profile,'OnSuccess',context);
			},
			error: function() {
				ajaxart.run([newnode],profile,'OnError',context);
			},
			server: aa_text(data,profile,'Server',context),
			context: context			
		});
	},
	SaveNodeAsync: function (profile,data,context)
	{
		ajaxart_async_Mark(context);
		
		var xml = aa_parsexml( aa_first(data,profile,'Node',context) );
		if (ajaxart.inPreviewMode) return;

		jBart.db.save({
			data: xml,
			success: function() {
				ajaxart_async_CallBack([],context);				
			},
			error: function() {
				context.vars._AsyncCallback.success = false;
				ajaxart_async_CallBack([],context);				
			},
			server: aa_text(data,profile,'Server',context),
			context: context
		});
	},
	JBartDBNode: function (profile,data,context)
	{
	    ajaxart_async_Mark(context,true);
	    
	    ajaxart.run(data,profile,'OnLoading',context);
	    
		jBart.db.get({
			id: aa_text(data,profile,'ID',context),
			contentType: aa_text(data,profile,'ContentType',context),
			success: function(node) {
				ajaxart.run([node],profile,'OnSuccess',context);
				ajaxart_async_CallBack([node],context); 
			},
			error: function(error) {
				context.vars._AsyncCallback.success = false;
				ajaxart.run(data,profile,'OnError',context);
				ajaxart_async_CallBack([],context); 
			},
			server: aa_text(data,profile,'Server',context),
			context: context
		});
	},
	JBartDBQuery: function (profile,data,context)
	{
	    ajaxart_async_Mark(context,true);
	    
	    ajaxart.run(data,profile,'OnLoading',context);
	    
		jBart.db.query({
			contentType: aa_text(data,profile,'ContentType',context),
			templateOf: aa_text(data,profile,'TemplateOf',context),
			headersOnly: aa_bool(data,profile,'HeadersOnly',context),
			success: function(nodes) {
				ajaxart.run([nodes],profile,'OnSuccess',context);
				ajaxart_async_CallBack([nodes],context); 
			},
			error: function(error) {
				context.vars._AsyncCallback.success = false;
				ajaxart.run(data,profile,'OnError',context);
				ajaxart_async_CallBack([],context); 
			},
			server: aa_text(data,profile,'Server',context),
			context: context
		});
	},
	LoadFullNodeFromHeader: function (profile,data,context)
	{
		var headerXml = aa_first(data,profile,'HeaderXml',context);
		var childPresent = aa_xpath(headerXml,'*').length > 0;
		if (childPresent && !aa_bool(data,profile,'DoNotLoadIfPresent',context)) return;

		while(headerXml.firstChild) headerXml.removeChild(headerXml.firstChild);

		var deferred = $.Deferred();

		jBart.db.get({
			id: headerXml.getAttribute('id'),
			contentType: headerXml.getAttribute('_type'),
			success: function(node) {
				var children = aa_xpath(node,'*');
				for(var i=0;i<children.length;i++) {
					aa_xml_appendChild(headerXml,children[i]);
				}
				deferred.resolve(result);
			},
			server: aa_text(data,profile,'Server',context),
			error: deferred.reject,
			context: context
		});

		return [deferred.promise()];		
	},
	SaveFileToJBartDB: function (profile,data,context)
	{
		var id = aa_text(data,profile,'ID',context);
		var content = aa_text(data,profile,'Content',context);
		var deferred = $.Deferred();

		jBart.db.saveFile({
			id: id,
			content: content,
			success: function(success_result) {
				ajaxart.run(data,profile,'OnSuccess',aa_ctx(context,{_Result:[success_result],_FileId:[id], _FileContent:[content] } ));
				deferred.resolve(success_result);
			},
			error: function(error) {
				ajaxart.log("Error saving file '" + id + "'' to JBart DB: " + error.message + " \nurl:" + error.url,'error');
				ajaxart.run(data,profile,'OnError',aa_ctx(context,{_Message:[error.message],_Url:[error.url],_FileId:[id], _FileContent:[content] } ));
				deferred.reject(error);
			},
			server: aa_text(data,profile,'Server',context),
			context: context
		});

		return [deferred.promise()];		
	},
	GetFileFromJBartDB: function (profile,data,context)
	{
		var id = aa_text(data,profile,'ID',context);
		var deferred = $.Deferred();
		jBart.db.getFile({
			id: id,
			success: function(server_content) {
				var converted_result = ajaxart_server_content2result(server_content,aa_text(data,profile,"ResultFormat",context));
				ajaxart.run(converted_result,profile,'OnSuccess',context);
				deferred.resolve(converted_result);
			},
			error: function(error) {
				ajaxart.log("Error getting file '" + id + "'' to JBart DB: " + error.message + " \nurl:" + error.url,'warning');
				ajaxart.run(data,profile,'OnError',aa_ctx(context,{_Message:[error.message],_Url:[error.url],_FileId:[id] } ));
				deferred.reject(error);
			},
			server: aa_text(data,profile,'Server',context),
			context: context
		});
		return [deferred.promise()];
	}
});

jBart.db = jBart.db || {};
function aa_jbartdb_getServer(settings)	{
	if (settings.server) return settings.server;
	if (settings.context && settings.context.vars.JBartDBServer) return ajaxart.totext_array(settings.context.vars.JBartDBServer);
	return (jBart.settings && jBart.settings.jbartdb_server) || ajaxart.urlparam('jbartdb_server') || window.jbartdbserver || '//jbartdb.appspot.com';
}
function aa_jbartdb_security_tokens(settings) {
	var result = '';
	var instance = ajaxart.urlparam('instance'); 
	if (instance) result = '&instance=' + instance;

	var appName = ajaxart.urlparam('appName');
	var appNameMatch = window.location.href.match(/WixPage\/([^\/]+)/); // Wix
	if (appNameMatch && appNameMatch[1]) appName = appNameMatch[1];
	if (appName)
		result += '&appName=' + appName;
	var more_security_tokens = settings && settings.context && settings.context.vars.JBartDBSecurityTokens && ajaxart.totext_array(settings.context.vars.JBartDBSecurityTokens);
	if (more_security_tokens)
		result += more_security_tokens;
	return result;
}

jBart.db.get = function(settings)
{
	settings.error = settings.error || function() {};
	settings.server = aa_jbartdb_getServer(settings);
//	settings.server = 'http://localhost:8888';
	settings.cache = settings.cache || true;
	
	var ajaxSettings = { 
		url: settings.server+'/jbart_db.js?op=loadnode&contenttype='+settings.contentType+'&id='+settings.id,
		cache: false, 
		success: function(result) {
			result = aa_parsexml(result);
			if (result && result.getAttribute('_type') == settings.contentType) {
				settings.success(result);
			} else {
				if (settings.defaultValue) {
					settings.defaultValue.setAttribute('_type',settings.contentType);
					settings.defaultValue.setAttribute('id',settings.id);
					settings.success(aa_parsexml(settings.defaultValue));
				}
				else
					settings.error({ message: 'node ' + settings.server + '::' + settings.contentType + ':'+ settings.id + ' not found, and no default value' , code: 'node does not exist'});
			}
		},
		error: function() { settings.error({message: ''}); }
	}
	aa_crossdomain_call(ajaxSettings, true);
}
jBart.db.save = function(settings)
{
	settings.error = settings.error || function() {};
	settings.success = settings.success || function() {};
	settings.server = aa_jbartdb_getServer(settings);
	// settings.server = 'http://localhost:8888';
	
	if (! settings.data || settings.data.nodeType != 1 || !settings.data.getAttribute('id') || !settings.data.getAttribute('_type') ) {
		return settings.error('settings.data should be an xml of the format: <item id="xx" _type="myType" myatt="..."><myElem>..</myElem></item>');
	}
	
	if (!settings.vidProtection)
		settings.data.setAttribute('vid','force');

	if (!settings.data.getAttribute('_lastModified'))
		settings.data.setAttribute('_created',currentDate());	

	settings.data.setAttribute('_lastModified',currentDate());

	var id = settings.data.getAttribute('id');
	var _type = settings.data.getAttribute('_type');
	var url = settings.server+'/bart.php?op=savenode' + aa_jbartdb_security_tokens(settings);
	
	var result = $.ajax({ 
	  	url: url,
	  	cache: false, 
	  	type: 'POST', 
	  	headers: {'Content-Type': 'text/plain; charset=utf-8' },
	  	data: ajaxart.xml2text(settings.data,false)
  });
	$.when(result).then(
		function(result) { 
			result = aa_parsexml(result);
			if (result && result.getAttribute('type')=="success") {
				if (settings.vidProtection) {
					settings.data.setAttribute('vid',result.getAttribute('vid'));
				}
			  settings.success();
			}
			else {
				if (window.console && result.getAttribute('type') == 'error') {
					console.log('error saving node ' + _type + ':' + id + ' ' + result.getAttribute('reason'));
				}
				if (result.getAttribute('type') == 'error' && (result.getAttribute('reason')||'').indexOf("wrong vid:") == 0) {
					handleWrongVid(result);
				} else {
					settings.error(result);
			  }
			}
		},
		function(er) { 
			settings.error();
	});

	function handleWrongVid(result) {
		if (settings.autoMergeOnWrrongVid) {
			// TODO: try doing auto merge
		}
		settings.error('wrong vid');
	}
	
	function currentDate() {
		var now = new Date();
		return '' + pad(now.getDate()) + "/" + pad(now.getMonth()+1) + "/" + now.getFullYear() + " " + pad(now.getHours())+ ':' + pad(now.getMinutes());
	}
	function pad(i) { return i<10?'0'+i:i; }
}
jBart.db.query = function(settings)
{
	settings.error = settings.error || function() {};
	settings.server = aa_jbartdb_getServer(settings);
	if (typeof(settings.headersOnly) == 'undefined') settings.headersOnly = true;
	
	var headersOnly = settings.headersOnly ? '&headersonly=true' : '&headersonly=false';
	var templateOf = settings.templateOf ? '&templateOf='+settings.templateOf : '';
	var ajaxSettings = { 
		url: settings.server+'/jbart_db.js?op=query&contenttype='+settings.contentType+headersOnly+templateOf,
		cache: settings.cache ? true : false, 
		success: function(result) {
			result = aa_parsexml(result);
			settings.success(result);
		},
		error: function() { 
			settings.error({message: ''}); 
		}
	}
	aa_crossdomain_call(ajaxSettings, true);
}
jBart.db.deleteNode = function(settings) {
	settings.error = settings.error || function() {};
	settings.server = aa_jbartdb_getServer(settings);
	if (!settings.data)
		return settings.error('you must supply the node in settings.data when calling jBart.db.deleteNode');
	
	var id = settings.data.getAttribute('id'), type = settings.data.getAttribute('_type');
	if (!id || !type)
		return settings.error('you must supply the node in settings.data when calling jBart.db.deleteNode');

	aa_crossdomain_call({ 
		url: settings.server+'/jbart_db.js?op=deletenode&contenttype='+type+'&id='+id + aa_jbartdb_security_tokens(),
		cache: false, 
		success: function(result) {
			settings.success();
		},
		error: function() { 
			settings.error({message: ''}); 
		}
	}, true);
}
jBart.db.saveFile = function(settings) {
	settings = aa_defaults(settings,{
		success: function() {},
		error: function() {}
	})
	settings.server = aa_jbartdb_getServer(settings);
	if (!settings.id)
		return ajaxart.error({message:'save file to jbartdb: id is empty'});
	
	var url = settings.server+'/bart.php?op=savefile&id='+settings.id + aa_jbartdb_security_tokens(); 

  var result = $.ajax({ 
	  	url: url,
	  	cache: false, 
	  	type: 'POST', 
	  	headers: {'Content-Type': 'text/plain; charset=utf-8' },
	  	data: settings.content
  });
	$.when(result).then(
		function(result) { 
			var result_as_xml = aa_parsexml(result,'',[],true);
			if (!result_as_xml)
				settings.error({message:result, url:url});
			else if (result_as_xml.getAttribute("type") != 'success')
				settings.error({message:result_as_xml.getAttribute("reason"), url:url});
			else
				settings.success('');
		},
		function(er) { 
			settings.error({message:er, url:url}); 
	});
}
jBart.db.appendToFile = function(settings) {
  // ?op=appendtofile&id=log.txt&toappend=bbbb&timestamp=true	
	settings.server = aa_jbartdb_getServer(settings);
	if (!settings.id)
		return ajaxart.error({message:'save file to jbartdb: id is empty'});
	
	var timestamp = settings.timestamp ? '&timestamp=true' : '';	
	var url = settings.server+'/jbart_db.js?op=appendtofile&id='+ encodeURIComponent(settings.id) + '&toappend=' + encodeURIComponent(settings.toAppend) + timestamp + aa_jbartdb_security_tokens(); 

  var result = $.ajax({ 
	  	url: url,
	  	cache: false
  });
	$.when(result).then(
		function(result) { 
			settings.success(result);
		},
		function(er) { 
			settings.error({message:er, url:url}); 
	});
}

jBart.db.getFile = function(settings) {
	settings.server = aa_jbartdb_getServer(settings);
	if (!settings.id)
		return ajaxart.error({message:'get file to jbartdb: id is empty'});
	
	var url = settings.server+'/file/' + settings.id; 
	var result;

	if (!aa_jbartdb_isSameDomain(settings.server)) {
		result = aa_proxyGetCall({ url: url });
	} else {
		result = $.ajax({ 
		 	url: url,
		 	cache: false
	  });
	}
	$.when(result).then(
		function(result) { 
			if (result && result.nodeType == 9 && result.firstChild && result.firstChild.getAttribute('_type') == 'error') {
				return settings.error({message: result.firstChild.getAttribute('reason') || '', url:url}); 	
			}
			settings.success(result);
		},
		function(er) { 
			settings.error({message:er, url:url}); 
	});
}

jBart.db.cloneNode = function(settings) {
	var newnode;
	var charsForRandomization = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
	var maxTries = settings.maxTries || 10;

	function tryRandomID(length,tryCount) {
		var str = '';
		tryCount = tryCount || 1;
		if (tryCount > maxTries) 
			return settings.error('could not create clone. Tries ' + maxTries + ' times to create a random id');

		for(var i=0;i<length;i++) {
			var rnd = Math.floor(Math.random() * charsForRandomization.length);
			str += charsForRandomization.charAt(rnd);
		}

		jBart.db.get({
			server: settings.server,
			success: function() {
				tryRandomID(length+1,tryCount+1);
			},
			error: function() {
				saveClone(str);
			}
		});
	}

	function saveClone(newid) {
		newnode.setAttribute('id',newid);
		jBart.db.save({
			server: settings.server,
			data: newnode,
			error: function(e) { 
				settings.error(e);
			},
			success: function() {
				settings.success(newnode);
			}
		});
	}

	settings.error = settings.error || function() {};
	settings.server = aa_jbartdb_getServer(settings);
	settings.cloneMethod = settings.cloneMethod || 'random number';

	if (! settings.data || settings.data.nodeType != 1 || !settings.data.getAttribute('id') || !settings.data.getAttribute('_type') ) {
		return settings.error('settings.data should be an xml of the format: <item id="xx" _type="myType" myatt="..."><myElem>..</myElem></item>');
	}
	newnode = settings.data.cloneNode(true);

	if (settings.useCounter) {
	} else {
		tryRandomID(settings.randomNumberFirstLength || 3);		
	} 
};
jBart.db.syncServerTime = function(settings) {
	settings = aa_defaults(settings,{
		success: function() {},
		error: function() {},
		doNotSyncTwice: true
	});

	settings.server = aa_jbartdb_getServer(settings);

	if (settings.doNotSyncTwice && window.jbServerTimeDiff) return settings.success();

	window.jbServerTimeDiff = 0;
	if (ajaxart.jbart_studio) return settings.success();
	
	var now = new Date().getTime();

	var url = settings.server+'/jbart_db.js?op=now';

  var ajaxSettings = { 
	  	url: url,
	  	cache: false,
	  	success: function(result) {
				var now2 = new Date().getTime();
				var clientTime = parseInt((now2 + now)/2); // heuristic
				if (window.console)
					console.log('synching server time. client diff time for server call ' + (now2-now));

				result = aa_parsexml(result);
				if (result.nodeType == 1) {
					var serverTime = result.getAttribute('now');
					if (serverTime && parseInt(serverTime)) {
						window.jbServerTimeDiff = serverTime - now;
						if (window.console)
							console.log('server time diff=' + window.jbServerTimeDiff);
					}
				}
				settings.success(window.jbServerTimeDiff);
			},
			error: function(er) { 
				settings.error({message:er, url:url}); 
			}
  };
	aa_crossdomain_call(ajaxSettings, true);	
}

function aa_get_client_location(tries) {
	tries = tries || 1;
	if (tries && tries > 5) return;

	if (!jBart.clientIP) {
		if (window.wix_instance_data && wix_instance_data.ipAndPort) {
			jBart.clientIP = wix_instance_data.ipAndPort.split('/')[0];
			return aa_get_client_location();
		}

		window.jbGetIPCB = function(ipjson) {			
			if (window.sessionStorage) sessionStorage.jbClientIP = ipjson.ip;
			jBart.clientIP = ipjson.ip;
			aa_get_client_location();
		};
		if (window.sessionStorage && sessionStorage.jbClientIP) {
			jBart.clientIP = sessionStorage.jbClientIP;
		} else {
			$.getScript('http://jsonip.appspot.com/?callback=jbGetIPCB');

			setTimeout(function() {
				if (!jBart.clientIP) aa_get_client_location(tries+1);
			},1000);			
			return;
		}
	}

	if (jBart.clientLocation) return;
	try {
		if (window.sessionStorage && sessionStorage.jbClientLocation) {
			jBart.clientLocation = JSON.parse(sessionStorage.jbClientLocation);
		} else {
			window.jbClientLocationCB = function(resultStr) {
				if (window.sessionStorage) sessionStorage.jbClientLocation = resultStr;
				jBart.clientLocation = JSON.parse(resultStr);
			};
			$.getScript('//jbartdb.appspot.com/jbart_db.js?op=proxy&url=http://freegeoip.net/json/'+jBart.clientIP+'&callback=jbClientLocationCB');
		}
	} catch(e) {
		ajaxart.logException(e,'get client location failed');
	}
}

function aa_jbartdb_isSameDomain(serverName) {
	var host = (serverName.indexOf('//') == -1) ? serverName : serverName.split('//')[1];
	if ( window.location.hostname == host ) return true;
	return false;
}

function aa_proxyGetCall(settings) {
	var deferred = $.Deferred();

	settings = aa_defaults(settings,{
		baseUrl: '//jbartdb.appspot.com/jbart_db.js?op=proxy'
	});
	window.jbJBartDBCallbackCounter = window.jbJBartDBCallbackCounter || 0;
	
	var callback = 'jbartdb_' + (++jbJBartDBCallbackCounter);
	window[callback] = function(result) {
		delete window[callback];
		deferred.resolve(result);
	};

	var url = settings.url;
	if (url.indexOf('http') != 0) {
		url = window.location.protocol + url;
	}
	$.getScript(settings.baseUrl + '&callback=' + callback + '&url=' + encodeURIComponent(url)).fail(deferred.reject);

	return deferred.promise();
}