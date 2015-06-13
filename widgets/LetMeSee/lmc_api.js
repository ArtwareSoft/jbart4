function aa_lmcApi_createProject(settings) {
	var deferred = $.Deferred();
	$.when($.ajax({
		url: '/LetMeSee/?op=createProject'
	})).then(function(result) {
		result = aa_parsexml(result);
		if (result.getAttribute('type') == 'error') {
			aa_errorLog('Error creating project ' + result.getAttribute('reason')||'');
			return deferred.reject();
		}
		deferred.resolve(result);
	},deferred.reject);

	return deferred.promise();
}

function aa_lmcApi_createClient(settings) {
	var deferred = $.Deferred();
	$.when($.ajax({
		url: '/LetMeSee/?op=createClient'
	})).then(function(result) {
		result = aa_parsexml(result);
		if (result.getAttribute('type') == 'error') {
			aa_errorLog('Error creating client ' + result.getAttribute('reason')||'');
			return deferred.reject();
		}
		deferred.resolve(result);
	},deferred.reject);

	return deferred.promise();
}

function aa_lmcApi_createEmptyLogs(settings) {
	var deferred = $.Deferred();

	$.when(
		aa_lmcApi_saveFile({
			project: settings.project,
			key: settings.key,
			file: 'log/' + settings.room + '_visitor.txt',
			content: '',
			empty: true
		}),
		aa_lmcApi_saveFile({
			project: settings.project,
			key: settings.key,
			file: 'log/' + settings.room + '_agent.txt',
			content: '',
			empty: true
		}),
		aa_lmcApi_saveFile({
			project: settings.project,
			key: settings.key,
			file: 'reply/' + settings.room + '.txt',
			content: '',
			empty: true
		})
		).then(deferred.resolve,deferred.reject);

	return deferred.promise();
}

function aa_lmcApi_appendToLog(settings,secondTry) {
	var deferred = $.Deferred();
	window.jbLMCInAppendToLog = window.jbLMCInAppendToLog || {};
	var logID = settings.room + '_' + settings.logFile;

	if (window.jbLMCInAppendToLog[logID] && !secondTry) {
		aa_lmc_log('aa_lmcApi_appendToLog - waiting for another appendToLog to end');

		setTimeout(function() { aa_lmcApi_appendToLog(settings).then(deferred.resolve,deferred.reject); },200);
		return deferred.promise();
	}
	window.jbLMCInAppendToLog[logID] = true;

	aa_lmc_log('aa_lmcApi_appendToLog - ' + settings.room + '_' + settings.logFile);
	$.when($.ajax({
		url: '/LetMeSee/?op=appendToLog&project='+settings.project+'&room='+settings.room+'&logFile='+settings.logFile+'&toAppend='+encodeURIComponent(settings.toAppend)
	})).then(function(result) {
		window.jbLMCInAppendToLog[logID] = false;
		result = aa_parsexml(result);
		if (result.getAttribute('type') == 'error') {
			if (!secondTry) return aa_lmcApi_appendToLog(settings,true).then(deferred.resolve,deferred.reject);

			err(result.getAttribute('reason'));
			return deferred.reject();
		}
		aa_lmc_log('aa_lmcApi_appendToLog - success. ' + settings.room + '_' + settings.logFile);
		deferred.resolve();
	},function(error,param2,param3) {
		window.jbLMCInAppendToLog[logID] = false;
		aa_lmc_log('aa_lmcApi_appendToLog - error. ' + settings.room + '_' + settings.logFile);
		if (!secondTry) return aa_lmcApi_appendToLog(settings,true).then(deferred.resolve,deferred.reject);

		err(aa_rejectParamsToString(error,param2,param3),true);
		deferred.reject();
	});

	return deferred.promise();

	function err(errorMsg,fromReject) {
		var msg = (fromReject) ? 'Originated from reject\n' : '';
		msg += errorMsg + '\n';
		msg += 'settings=' + JSON.stringify(settings)+'\n';
		msg += 'url=' + JSON.stringify(settings)+'\n';
	}
}

function aa_lmcApi_saveRoomAgentInfo(settings) {
	return aa_lmcApi_saveFile({
		project: settings.project,
		key: settings.key,
		file: 'rooms_agent_info/' + settings.room + '_' + settings.key + '.xml',
		content: settings.content
	});
}

function aa_lmcApi_saveFile(settings,secondTry) {
	if (!settings.key) {
		aa_errorLog('Error - could not save file without agent key');
		return;
	}
	if (!settings.content && !settings.empty) {
		alert('Trying to save empty file contents');
		return null;
	}
	var deferred = $.Deferred();
	var generationInUrl = settings.generation ? '&generation='+settings.generation : '';

	$.when($.ajax({
		url: '/LetMeSee/?op=saveFile&project='+settings.project+'&file='+settings.file+'&key='+settings.key+generationInUrl,
		type: 'POST',
		headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
		data: settings.content
	})).then(function(result) {
		result = aa_parsexml(result);
		if (aa_lmcApi_isWrongGeneration(result))
			return deferred.reject('wrong generation',result);
		
		if (result.getAttribute('type') == 'error') {
			if (secondTry) {
				aa_errorLog('Error saving file ' + result.getAttribute('reason')||'');
				aa_lmcApi_ServerErrorLog('saving_file+'+aa_string2id(settings.file),'Critical error while trying to save your changes - please check your network connectivity',ajaxart.xml2text(result));
				aa_lmcApi_ServerErrorLog('saving_file_content+'+aa_string2id(settings.file),'',settings.content);
				return deferred.reject();
			} else {
				aa_errorLog('Error saving file ' + (result.getAttribute('reason')||'') + ' - first try');

				return aa_lmcApi_saveFile(settings,true).then(deferred.resolve,deferred.reject); // try again
			}
		}
		deferred.resolve(result);
	},function(e) {
		if (secondTry) {
			var errMessage = '' + (e || '');
			aa_lmcApi_ServerErrorLog('saving_file+'+aa_string2id(settings.file),'Critical error while trying to save your changes - please check your network connectivity',errMessage);
			aa_lmcApi_ServerErrorLog('saving_file_content+'+aa_string2id(settings.file),'',settings.content);		
			deferred.reject(e);
		} else
			aa_lmcApi_saveFile(settings,true).then(deferred.resolve,deferred.reject); // try again
	});

	return deferred.promise();
}

function aa_lmcApi_clientSaveFile(settings,secondTry) {
	if (!settings.key) {
		aa_errorLog('Error - could not save file without client key');
		return;
	}
	if (!settings.content && !settings.empty) {
		alert('Trying to save empty file contents');
		return null;
	}
	var deferred = $.Deferred();
	var generationInUrl = settings.generation ? '&generation='+settings.generation : '';

	$.when($.ajax({
		url: '/LetMeSee/?op=clientSaveFile&client='+settings.client+'&file='+settings.file+'&key='+settings.key+generationInUrl,
		type: 'POST',
		headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
		data: settings.content
	})).then(function(result) {
		result = aa_parsexml(result);
		if (aa_lmcApi_isWrongGeneration(result))
			return deferred.reject('wrong generation',result);
		
		if (result.getAttribute('type') == 'error') {
			if (secondTry) {
				aa_errorLog('Error saving file ' + result.getAttribute('reason')||'');
				aa_lmcApi_ServerErrorLog('saving_file+'+aa_string2id(settings.file),'Critical error while trying to save your changes - please check your network connectivity',ajaxart.xml2text(result));
				aa_lmcApi_ServerErrorLog('saving_file_content+'+aa_string2id(settings.file),'',settings.content);
				return deferred.reject();
			} else {
				return aa_lmcApi_clientSaveFile(settings,true).then(deferred.resolve,deferred.reject); // try again
			}
		}
		deferred.resolve(result);
	},function(e) {
		if (secondTry) {
			var errMessage = '' + (e || '');
			aa_lmcApi_ServerErrorLog('saving_file+'+aa_string2id(settings.file),'Critical error while trying to save your changes - please check your network connectivity',errMessage);
			aa_lmcApi_ServerErrorLog('saving_file_content+'+aa_string2id(settings.file),'',settings.content);		
			deferred.reject(e);
		} else
			aa_lmcApi_clientSaveFile(settings,true).then(deferred.resolve,deferred.reject); // try again
	});

	return deferred.promise();
}

function aa_lmcApi_saveFileWithPut(settings) {
	var deferred = $.Deferred();

	if (!settings.key) {
		aa_errorLog('Error - could not save file without agent key');
		return;
	}
	if (!settings.content && !settings.allowEmpty) {
		return deferred.reject('empty file contents').promise();
	}
	var generationInUrl = settings.generation ? '&generation='+settings.generation : '';

	$.when($.ajax({
		url: '/LetMeSee/?op=saveFileUrl&project='+settings.project+'&file='+settings.file+'&key='+settings.key + '&contentType=' + settings.contentType + generationInUrl,
		type: 'GET'
	})).then(function(saveUrlResult) {
		var saveUrlResult_xml = aa_parsexml(saveUrlResult);
		if (saveUrlResult_xml.getAttribute('type') == 'error') {
			aa_errorLog('Error saving file ' + saveUrlResult_xml.getAttribute('reason')||'');
			deferred.reject();
		}
		var post_url = saveUrlResult_xml.getAttribute('url'); // temprary url with token to save
		var headers = { 'Content-Type': settings.contentType , 'x-goog-acl' : 'public-read'};
		if (settings.generation) headers['x-goog-if-generation-match'] = settings.generation;
		
		$.when($.ajax({
			url: post_url, //.replace(/^https:/,'http:'), // http is faster
			type: 'PUT',
			headers: headers,
			data: settings.content,
			processData: false
		})).then(function(responseText,success,obj) {
			var generation = obj.getResponseHeader('x-goog-generation') || '';
			deferred.resolve(aa_parsexml('<result type="success" generation="'+ generation + '" />'));
		}, function(saveResultErr) {
			aa_errorLog('Error saving gcs file with url ' + post_url);
			deferred.reject();
		});
	},deferred.reject);

	return deferred.promise();	
}

function aa_lmcApi_saveFileWithPost(settings) {
	if (!settings.key) {
		aa_errorLog('Error - could not save file without agent key');
		return;
	}
	if (!settings.content && !settings.empty) {
		alert('Trying to save empty file contents');
		return null;
	}
	var deferred = $.Deferred();
	var generationInUrl = settings.generation ? '&generation='+settings.generation : '';

	$.when($.ajax({
		url: '/LetMeSee/?op=getPostSignature&project='+settings.project+'&key='+settings.key+'&contentType='+settings.contentType,
		type: 'GET'
	})).then(function(saveUrlResult) {
		var saveUrlResult_xml = aa_parsexml(saveUrlResult);
		if (saveUrlResult_xml.getAttribute('type') == 'error') {
			aa_errorLog('Error saving file ' + saveUrlResult_xml.getAttribute('reason')||'');
			deferred.reject();
		}

		$.when(aa_getFileObjectContent(settings.content))
			.then(function(contents) {
			var signature = saveUrlResult_xml.getAttribute('signature'); 
			var policy = saveUrlResult_xml.getAttribute('policy'); 

			var boundary = '----WebKitFormBoundaryTXeIfnRPr17ev8zT';
			function prop_val(prop,value) {
				return '--' + boundary + '\r\nContent-Disposition: form-data; name="' + prop + '"\r\n\r\n' + value + '\r\n';
			}
			var closeDelim = '\r\n--' + boundary + '--';
			var bucket = 'letmesee1';
			var body = 
	    		prop_val('signature', signature) +
	    		prop_val('key', settings.project+'/'+settings.file) +
	    		prop_val('policy', policy) +
	    		prop_val('Content-Type', settings.contentType) +
	    		prop_val('GoogleAccessId','591939302769@developer.gserviceaccount.com') +
	    		prop_val('bucket',bucket) +
	    		prop_val('success_action_status', '201') +
	    		'--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="noname"\r\nContent-Type: ' + settings.contentType + '\r\nContent-Transfer-Encoding: base64\r\n\r\n' +
	    		// settings.content + closeDelim;
	    		btoa(contents) + closeDelim;

			$.when($.ajax({
				url: 'https://' + bucket +'.storage.googleapis.com/',
				type: 'POST',
				headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
				data: body
			})).then(function(saveResult) {
				var saveResult_xml = aa_parsexml(saveResult);
				if (saveResult_xml.getAttribute('type') == 'error') {
					aa_errorLog('Error getting gcs file url ' + saveResult_xml.getAttribute('reason')||'');
					deferred.reject();
				}
				deferred.resolve(saveResult_xml);
			}, function(saveResultErr) {
					aa_errorLog('Error saving gcs file with post');
					deferred.reject();
			});
		})
	},deferred.reject);

	return deferred.promise();	
}

function aa_lmcApi_syncServerTime(settings,secondTime) {
	aa_lmc_log('sync server time');
	var deferred = $.Deferred();
	if (window.jbServerTimeDiff) return deferred.resolve().promise();

	var now = new Date().getTime();

	$.when($.ajax({
		url: '/LetMeSee/?op=now'
	})).then(function(result) {
		var now2 = new Date().getTime();
		var clientTime = parseInt((now2 + now)/2); // heuristic

		result = aa_parsexml(result);
		if (result.getAttribute('type') == 'error') {
			if (!secondTime) return aa_lmcApi_syncServerTime(settings,true).then(deferred.resolve,deferred.reject);

			aa_errorLog('Error synching time ' + result.getAttribute('reason')||'');
			return deferred.reject();
		}
		var serverTime = result.getAttribute('now');
		if (serverTime && parseInt(serverTime)) {
			window.jbServerTimeDiff = serverTime - now;
			aa_consoleLog('server time diff=' + window.jbServerTimeDiff);
			aa_lmc_log('server time diff=' + window.jbServerTimeDiff);
		}
		deferred.resolve();
	},function(e,param2,param3) {
		if (!secondTime) return aa_lmcApi_syncServerTime(settings,true).then(deferred.resolve,deferred.reject);
		aa_errorLog('Error in syncServerTime ' + aa_rejectParamsToString(e,param2,param3));
		aa_lmcApi_ServerErrorLog('sync_server_time','Critical error while syncing machine time. Please try refreshing your page',aa_rejectParamsToString(e,param2,param3));
		deferred.reject();
	});

	return deferred.promise();	
}

function aa_lmcApi_saveStats(settings) {
	var deferred = $.Deferred();
	if (!settings.content) {
		aa_errorLog('Error - Trying to save empty stats contents');
		return;
	}

	$.when($.ajax({
		url: '/LetMeSee/?op=saveStat&project='+settings.project+'&room='+settings.room,
		type: 'POST',
		headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
		data: settings.content
	})).then(function(result) {
		result = aa_parsexml(result);
		if (result.getAttribute('type') == 'error') {
			aa_errorLog('Error saving file ' + result.getAttribute('reason')||'');
			return deferred.reject();
		}
		deferred.resolve(result.getAttribute('generation'));
	},deferred.reject);

	return deferred.promise();		
}

function aa_lmcApi_saveRoom(settings) {
	var deferred = $.Deferred();
	var generationInUrl = settings.generation ? '&generation='+settings.generation : '';
	if (!settings.content) {
		alert('Error - Trying to save empty room contents');
		return;
	}
	$.when($.ajax({
		url: '/LetMeSee/?op=saveRoom&project='+settings.project+'&room='+settings.room + generationInUrl,
		type: 'POST',
		headers: { 'Content-Type': 'text/plain; charset="utf-8'	},
		data: settings.content
	})).then(function(result) {
		result = aa_parsexml(result);
		if (aa_lmcApi_isWrongGeneration(result))
			return deferred.reject('wrong generation',result);

		if (result.getAttribute('type') == 'error') {
			var reason = result.getAttribute('reason')||'';
			if (reason.indexOf('Timeout while fetching URL') == 0) {
				aa_consoleLog('Timeout while saving room. Room size='+settings.content.length);
				return handleTimeoutError(result);
			}
			aa_errorLog('Error saving file ' + reason);
			return deferred.reject(result);
		}
		deferred.resolve(result);
	},deferred.reject);

	return deferred.promise();

	function handleTimeoutError(errorResult) {
		if (settings.doNotRetry) {
			aa_errorLog('Error saving file ' + errorResult.getAttribute('reason'));
			return deferred.reject(errorResult);
		}

		// Our server encountered a timeout saving to google could storage
		setTimeout(function() {
			$.when(aa_lmcApi_loadRoom({
				project: settings.project,
				room: settings.room
			})).then(function(result,generation) {
				if (generation != settings.generation) {
					// all is well
					var resultXml = aa_parsexml('<result type="success" generation="'+generation+'"/>');
					deferred.resolve(resultXml);
				} else {
					aa_errorLog('Saving room after timeout of 2.5s the file has not updated yet... Trying again');
					// the save either failed or our timeout was too short. We'll try one more save
					settings2 = aa_extend(settings,{
						generation: null,
						doNotRetry: true
					});
					$.when(aa_lmcApi_saveRoom(settings)).then(deferred.resolve,deferred.reject); 
				}
			},function() {
				aa_errorLog('Error - could not load room after save timeout failed');
				deferred.reject();
			});
		},2500);
	}
}

function aa_lmcApi_loadLogFile(settings) {
	return aa_lmcApi_getFile(settings.project,'log/' + settings.room + '_' + settings.logFile + '.txt');
}

function aa_lmcApi_loadRoom(settings) {
	return aa_lmcApi_getFile(settings.project,'rooms/' + settings.room + '.xml',true);
}

function aa_lmcApi_loadStats(settings) {
	return aa_lmcApi_getFile(settings.project,'stat/' + settings.room + '.xml');
}

function aa_lmcApi_loadRoomAgentInfo(settings) {
	return aa_lmcApi_getFile(settings.project,'rooms_agent_info/' + settings.room + '_' + settings.key+'.xml');
}

function aa_lmcApi_getFileUrl(project,fileName) {
  return '//storage.googleapis.com/letmesee1/' + project+ '/' + fileName;
}

function aa_lmcApi_getFile(project,fileName,canFail,tryCount,progressFunction) {
	tryCount = tryCount || 1;
	aa_lmc_log('aa_lmcApi_getFile - ' + project + '/' + fileName + ' try count='+tryCount);
	var startTime = new Date().getTime();

	var supportCrossDomainCall = false;
	if ('withCredentials' in new XMLHttpRequest()) supportCrossDomainCall = true;
	
	var deferred = $.Deferred();

	var url = '//storage.googleapis.com/letmesee1/' + project+ '/' + fileName + '?cachekill=' + new Date().getTime();
	if (!supportCrossDomainCall) {
		url = '/LetMeSee/?op=get&path='+ project+ '/' + fileName;
		aa_lmc_log('aa_lmcApi_getFile - using proxy');
	}
	var ajaxObj = { url: url };

	var newXhr;

	if (progressFunction) {
		ajaxObj.xhr = function() {
       newXhr = new window.XMLHttpRequest();
       if (newXhr.addEventListener) newXhr.addEventListener("progress", progressFunction, false);
       return newXhr;
    };
  }
	var promise = $.ajax(ajaxObj);

	$.when(promise).then(function(result,textStatus, request) {
		try {
			if (progressFunction && newXhr && newXhr.removeEventListener) newXhr.removeEventListener("progress",progressFunction);
			if (result==null || (result && result.nodeType) == 9 || (result && result.indexOf && result.indexOf('<') == 0)) {
				var isError = false;
				if (result == null) 
					isError = true;
				else {
					result = aa_parsexml(result);
					if (result.getAttribute('type') == "error") {
						if (aa_xpath(result,'*').length == 0) isError = true;
						else {
							result.removeAttribute('type');
							result.removeAttribute('reason');
						}
					}
				}
				if (isError) {
					var reason = result ? result.getAttribute('reason') : 'no result';
					aa_lmc_log('aa_lmcApi_getFile - ' + project + '/' + fileName + ' failure (' + (new Date().getTime() - startTime) + 'ms) ' + (reason || ''));
					if (reason.toLowerCase().indexOf('timeout') > -1 || !result)
						return timeoutError();

					// if we got here, it's probably file not found error
					fileNotFound(e);
					return;
				}
			}
			var contentLength = request.getResponseHeader('content-length');
			var time = (new Date().getTime() - startTime);
			aa_lmc_log('aa_lmcApi_getFile - ' + project + '/' + fileName + ' success (' + time + 'ms ,'+ (contentLength ? contentLength+'B)' : ''));
			deferred.resolve(result,request.getResponseHeader('x-goog-generation'));
		} catch(e) {
			ajaxart.logException("aa_lmcApi_getFile success",e);			
		}
	},function(xhr,textStatus,p3) {
		try {
			if (progressFunction && newXhr && newXhr.removeEventListener) newXhr.removeEventListener("progress",progressFunction);
			if (xhr.status == 404) { // not found
				aa_lmc_log('aa_lmcApi_getFile - 404 not found ' + project + '/' + fileName + ' ' + proxyText + '(' + (new Date().getTime() - startTime) + 'ms) from reject ' + aa_rejectParamsToString(xhr,textStatus,p3));
				fileNotFound(xhr);
				return;
			}
			var proxyText = supportCrossDomainCall ? '' : 'using proxy ';
			aa_lmc_log('aa_lmcApi_getFile - ' + project + '/' + fileName + ' failure ' + proxyText + '(' + (new Date().getTime() - startTime) + 'ms) from reject ' + aa_rejectParamsToString(xhr,textStatus,p3));
			timeoutError(this);
		} catch(e) {
			ajaxart.logException("aa_lmcApi_getFile reject",e);
		}
	});
	
	return deferred.promise();

	function timeoutError(xhrObject) {
		if (tryCount >= 3) {  // we tried three times 
			if (!canFail) reportError();
			deferred.reject();
		} else {
			aa_lmcApi_getFile(project,fileName,canFail,tryCount+1).then(deferred.resolve,deferred.reject);
		}
	}

	function fileNotFound(xhr) {
		if (!canFail) reportError(xhr.statusText,true);
		deferred.reject('not found');
	}

	function reportError(e,isNotFound) {
		var errMessage = '' + (e || '');
		if (e && e.statusText) errMessage = e.statusText+'_';

		var name = fileName;
		name = name.replace(/\//g,'-');
		errMessage += 'fileName='+fileName.split('_')[0]+'\n';
		var projectName = ( window.jbLMCContext && aa_var_first(window.jbLMCContext,'Project') && aa_var_first(window.jbLMCContext,'Project').getAttribute('name') ) || '';
		aa_lmcApi_ServerErrorLog('load_file_'+aa_string2id(name)+'_'+projectName,isNotFound ? 'Critical error - please check your network connectivity' : 'Critical error',errMessage);
	}
}

function aa_lmcApi_loadRoomList(settings,secondTime) {
	var deferred = $.Deferred();

	$.when($.ajax({
		url: '/LetMeSee/?op=list&project=' + settings.project + '&key=' + settings.key
	})).then(function(result) {
		listResult = aa_parsexml(result);
		if (listResult.getAttribute('type') == 'error') {
			return fail(listResult.getAttribute('reason'));
		}
		deferred.resolve(result);
	},fail);

	function fail(reason) {
		aa_errorLog('Error aa_lmcApi_loadRoomList ' + (secondTime ? 'second try ' : 'first try ') + (reason||''));			

		if (secondTime)
			deferred.reject();
		else
			aa_lmcApi_loadRoomList(settings,true).then(deferred.resolve,deferred.reject);
	}

	return deferred.promise();
}

function aa_lmcApi_archiveList(settings) {
	var deferred = $.Deferred();

	$.when($.ajax({
			url: '/LetMeSee/?op=archiveList&project=' + settings.project + '&key=' + settings.key
	})).then(function(result) {
			listResult = aa_parsexml(result);
			if (listResult.getAttribute('type') == 'error') {
				aa_errorLog('Error getting list of archive rooms ' + listresult.getAttribute('reason')||'');
				return deferred.reject();
			}
			deferred.resolve(listResult);
	},deferred.reject);

	return deferred.promise();
}

function aa_lmcApi_saveRoomHeaders(settings) {
	return aa_lmcApi_saveFile({
		project: settings.project,
		file: 'roomHeaders_' + settings.key + '.xml',
		key: settings.key,
		generation: settings.generation,
		content: settings.content
	});
}

function aa_lmcApi_generateID(settings) {
	var deferred = $.Deferred();
	$.when($.ajax({
		url: '/LetMeSee/?op=generateID&length='+settings.length
	})).then(function(result) {
		var key = aa_parsexml(result).getAttribute('key');
		if (!key) {
			aa_errorLog('Error generating id');
			return deferred.reject();
		}
		deferred.resolve(key);
	},deferred.reject);

	return deferred.promise();	
}

function aa_lmcApi_deleteRoom(settings) {
	return $.when(
		deleteFile('rooms/'+settings.room+'.xml','deleted'),
		deleteFile('stat/'+settings.room+'.xml','deleted'),
		deleteFile('rooms_agent_info/'+settings.room+'_'+settings.key+'.xml','deleted')
	);

	function deleteFile(file,moveToFolder) {
		var newSettings = aa_defaults({file: file, moveToFolder: moveToFolder},settings);
		return aa_lmcApi_deleteFile(newSettings);
	}	
}

function aa_lmcApi_deleteFile(settings) {
	if (!settings.key) {
		aa_errorLog('Error - could not delete file without agent key');
		return;
	}
	var deferred = $.Deferred();

	if (settings.moveToFolder) {
		aa_lmcApi_getFile(settings.project,settings.file).then(function(result) {
			if (result.nodeType == 9) result = ajaxart.xml2text(result.firstChild);
			if (result.nodeType == 1) result = ajaxart.xml2text(result);
			var content = result;
			aa_lmcApi_saveFile({
				key: settings.key,
				project: settings.project,
				file: settings.moveToFolder + '/' + settings.file,
				content: content,
				empty: true
			}).done(doDelete);
		},doDelete);
	} else 
		doDelete();

	return deferred.promise();	

	function doDelete() {
		$.when($.ajax({
			url: '/LetMeSee/?op=delete&project='+settings.project+'&file='+settings.file+'&key='+settings.key,
			type: 'GET'
		})).then(function(result) {
			if (result) {
				result = aa_parsexml(result);
				if (result.getAttribute('type') == 'error') {
					aa_errorLog('Error deleting file ' + result.getAttribute('reason')||'');
					return deferred.reject();
				}
			}
			deferred.resolve();
		},deferred.reject);
	}
}

function aa_lmcApi_isWrongGeneration(result) {
	if (result && result.tagName == 'Error' && aa_totext(aa_xpath(result,'Code')) == 'PreconditionFailed') 
		return true;

	return false;

	// <Error>
	//     <Code>PreconditionFailed</Code>
	//     <Message>At least one of the pre-conditions you specified did not hold.</Message>
	// </Error>							
}


function aa_lmcApi_moveToArchive(settings) {
	var deferred = $.Deferred();

	var files = [
	  'rooms/'+settings.room + '.xml',
	  'log/'+settings.room + '_agent.txt',
	  'log/'+settings.room + '_visitor.txt',
	  'rooms_agent_info/'+settings.room + '_' + settings.key + '.xml',
	  'stat/'+settings.room + '.xml'
//	  'reply/'+settings.room + '.txt'
	],fileContents = {};

	$.when(loadFiles()).then(function() {
		$.when(saveFiles(),aa_lmcMoveToArchiveUpdateHeaders(settings)).then(function() {
			$.when(deleteFiles()).then(deferred.resolve,deferred.reject);
		},deferred.reject);
	},deferred.reject);

	return deferred.promise();

	function saveFile(filename) {
		return aa_lmcApi_saveFile({
			key: settings.key,
			project: settings.project,
			file: settings.restoreFromArchive ?  filename : 'archive/'+filename,
			content: fileContents[filename],
			empty: true			
		});
	}
	function deleteFile(filename) {
		return aa_lmcApi_deleteFile({
			key: settings.key,
			project: settings.project,
			file: settings.restoreFromArchive ? 'archive/' + filename : filename
		});
	}
	function loadFile(filename) {
		var deferred2 = $.Deferred();
		var canFail = filename.indexOf('reply') > -1;
		$.when(aa_lmcApi_getFile(settings.project,settings.restoreFromArchive ? 'archive/' + filename : filename,canFail)).then(function(result) {
			if (result.nodeType == 9) result = ajaxart.xml2text(result.firstChild);
			if (result.nodeType == 1) result = ajaxart.xml2text(result);
			fileContents[filename] = result;
			deferred2.resolve();
		},
		function() {
			if (canFail) {
				fileContents[filename] = '';
				return deferred2.resolve();
			}
			aa_errorLog('could not load file ' + filename);
			deferred2.reject();
		});
		return deferred2.promise();
	}
	function saveFiles() {
		var promises = [];
		for(var i=0;i<files.length;i++)
			promises.push(saveFile(files[i]));

		return $.when.apply($,promises);		
	}
	function deleteFiles() {
		var promises = [];
		for(var i=0;i<files.length;i++)
			promises.push(deleteFile(files[i]));

		return $.when.apply($,promises);		
	}
	function loadFiles() {
		var promises = [];
		for(var i=0;i<files.length;i++) {
			promises.push(loadFile(files[i]));
		}

		return $.when.apply($,promises);
	}
}

function aa_lmcApi_restoreFromArchive(settings) {
	return aa_lmcApi_moveToArchive(aa_extend(settings,{ restoreFromArchive: true }));
}

function aa_lmcApi_addRoomReply(settings) {
	if (settings.from == 'agent' && !settings.key) {
		aa_errorLog('Error - could not append agent reply without agent key');
		return;
	}
	if (!settings.replyText && !settings.empty) {
		alert('Trying to append empty reply');
		return null;
	}
	var deferred = $.Deferred();
	var url = '/LetMeSee/?op=addRoomReply&project='+settings.project+'&room='+settings.room;
	if (settings.from) url += '&from='+settings.from;
	if (settings.key) url += '&key='+settings.key;

	var contents = settings.userName + ',' + settings.item + ',' + settings.replyText;
	url += '&toAppend='+encodeURIComponent(contents);

	$.when($.ajax({
		url: url
	})).then(function(result) {
		result = aa_parsexml(result);
		if (result.getAttribute('type') == 'error') {
			err(result.getAttribute('result'));
			return deferred.reject();
		}
		deferred.resolve();
	},function(e) {
		err(e);
		deferred.reject();
	});

	return deferred.promise();

	function err(errorMsg) {
		var msg = '' + (errorMsg||'') + '\nsettings=' + JSON.stringify(settings);
		aa_lmcApi_ServerErrorLog('add_reply_'+settings.room,'Error adding reply',msg);
	}
}


function aa_lmcApi_SendSMS(settings) {
	aa_lmc_log('aa_lmcApi_SendSMS');	
	var to = settings.to;
	if (!to || !settings.content) {
		if (!to) aa_errorLog('Bad sms info - no to');
		if (!settings.content) aa_errorLog('Bad sms info - no content');
		return $.Deferred().reject().promise();
	}
	// fix the 'to'
	if (to.indexOf('+') == 0)
		to = to.replace(/[+-]/g,'');
	else {
		to = '972'+to.substring(1);
	}
	to = to.replace(/[-]/g,'');

	var roomName = (window.jbLMCContext && aa_var_first(jbLMCContext,'Room').getAttribute('customerName')) || '';
	aa_lmcTrack('sending sms',to,'room='+roomName);

	var url = '/LetMeSee/?op=sendSms&project='+settings.project+'&key='+settings.key+'&from='+encodeURIComponent(settings.from);
	url += '&to='+to;
	if (settings.noUnicode) url += '&noUnicode=true';

	var deferred = $.Deferred();

	$.ajax({
		url: url,
		type: 'POST',
		headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
		data: settings.content
	}).then(function(result) {
		result = aa_parsexml(result);
		if (result.getAttribute('type') == 'success') return deferred.resolve();
		else
			return deferred.reject();	// the server is sending the error log
	},deferred.reject);
	
	return deferred.promise();
}

function aa_lmcApi_writeAgentStation(email,stationID) {
	var deferred = $.Deferred();
	var url = '/LetMeSee/?op=writeAgentStation&email='+encodeURIComponent(email);
	url += '&stationID='+stationID;

	$.ajax({ url: url, type: 'GET'	}).then(function(result) {
		result = aa_parsexml(result);
		if (result.getAttribute('type') == 'success')
			deferred.resolve();
		else
			deferred.reject();
	},deferred.reject);

	return deferred.promise();
}

function aa_lmcApi_checkAgentStation(email,stationID) {
	var deferred = $.Deferred();

	aa_lmcApi_getFile('users',encodeURIComponent(email)).then(function(result) {
		var isSameStation = (result == stationID);
		deferred.resolve(isSameStation);
	},deferred.reject);
	return deferred.promise();
}


function aa_lmcApi_restoreFromArchive(settings) {
	var deferred = $.Deferred();
	$.when($.ajax({
		url: '/LetMeSee/?op=restoreFromArchive&project='+settings.project+'&room='+settings.room
	})).then(function(result) {
		result = aa_parsexml(result);
		if (result.getAttribute && result.getAttribute('type') == 'success') {
			deferred.resolve();
		} else
			deferred.reject();
	},deferred.reject);

	return deferred.promise();
}

function aa_lmcTinyUrl(url) {
	var deferred = $.Deferred();

	callTinyUrl(1);

	return deferred.promise();

	function callTinyUrl(counter) {
		if (counter == 4) return deferred.reject(); // 3 tries

		$.when($.ajax({
			url: '/LetMeSee/?op=tinyUrl&url=' + encodeURIComponent(url)
		})).then(function(result) {
			if (typeof result == 'string' && result.indexOf('<result type="error"') == 0)
				return callTinyUrl(counter+1);
			if (typeof result != 'string' || result == 'Error')
				return callTinyUrl(counter+1);
			
			if (result.indexOf('http://tinyurl.com') == -1)
				return deferred.reject();
			
			deferred.resolve(result);
		},function() {
			callTinyUrl(counter+1);
		});
	}
}
