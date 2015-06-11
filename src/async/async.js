ajaxart.load_plugin("", "plugins/async/async.xtml");
ajaxart.load_plugin("", "plugins/email/email.xtml");

aa_gcs("async", {
	RunOnNextTimer: function(profile, data, context) {
		var milli = aa_int(data, profile, 'Milliseconds', context);
		var deferred = $.Deferred();

		if (window.aa_intest)
			run()
		else
			setTimeout(run,milli);

		return [deferred.promise()];

		function run() {
			var result2 = ajaxart.run(data, profile, 'Action', context);
			$.when(result2[0]).then(deferred.resolve, deferred.reject);			
		}
	},
	HttpPost: function(profile, data, context) {
		var deferred = $.Deferred();
		var request = {
			cache: false,
			type: "POST",
			headers: {
				'Content-Type': aa_text(data, profile, 'PostContentType', context)
			},
			url: aa_text(data, profile, 'Url', context),
			data: {}
		};
		var headers = aa_text(data, profile, 'Headers', context);
		if (headers)
			aa_extend(request.headers,JSON.parse(headers))

		var timeout = aa_int(data,profile,'Timeout',context);
		if (timeout) request.timeout = timeout;

		var postDatas = ajaxart.runsubprofiles(data, profile, 'PostData', context);
		for (var i = 0; i < postDatas.length; i++) {
			var obj = postDatas[i];
			if (obj.Name) {
				var name = ajaxart.totext(obj.Name);
				var val = ajaxart.totext(obj.Value);
				if (val != null) request.data[name] = val;
			} else // raw data overrides properties
			request.data = ajaxart.totext(obj);
		}

		if (aa_bool(data, profile, "TunnelRequest", context)) {
			var raw_data = request.data;
			request.data = {};
			if (typeof raw_data === 'string') request.data.__POSTDATA = raw_data;
			request.data.contents = request.url;
			request.data.headers = 'Content-Type: ' + aa_text(data, profile, 'PostContentType', context);
			request.data.__METHOD = 'POST';
			request.url = 'get.php';
		}
		var result = jQuery.ajax(request);
		$.when(result).then(
			function(server_content) {
				var converted_result = ajaxart_server_content2result(server_content, aa_text(data, profile, "ResultFormat", context));
				ajaxart.run(converted_result, profile, 'OnSuccess', context)[0];
				deferred.resolve(converted_result);
			},
			function(er) {
				ajaxart.run(er ? [er] : [], profile, 'OnError', context)[0];
				deferred.reject();
			}
		);

		return [deferred.promise()];
	},
	HttpGet: function(profile,data,context) {
		var deferred = $.Deferred();
		var request = { 
			cache: false, 
			type: "GET", 
			url: aa_text(data,profile,'Url',context)
		};
		var timeout = aa_int(data,profile,'Timeout',context);
		if (timeout) request.timeout = timeout;
		var headers = aa_text(data, profile, 'Headers', context);
		if (headers)
			request.headers = JSON.parse(headers);


	    if (aa_bool(data,profile,"TunnelRequest",context)) {
	    	request.type = "POST";
	    	request.data = { contents: request.url, __METHOD: 'GET' };
	    	request.url = 'get.php';
	    }
	    var result = jQuery.ajax(request);
		$.when(result).then(
			function(server_content) { 
				var converted_result = ajaxart_server_content2result(server_content,aa_text(data,profile,"ResultFormat",context));
				ajaxart.run(converted_result,profile,'OnSuccess',context)[0];
				deferred.resolve(converted_result);
			},
			function(er) { 
				ajaxart.run(er ? [er] : [],profile,'OnError',context)[0];
				deferred.reject();
			}
		);

		return [deferred.promise()];
	},
	RunAsyncActions: function(profile, data, context) {
		var index = -1;
		var actionXmls = aa_xpath(profile, 'Action');
		var deferred = $.Deferred();
		var errorOccured = false;

		var style = aa_first(data,profile,'ProgressStyle',context);
		var progressObject;
		if (style) {
			progressObject = aa_progress_object(style,actionXmls.length,context);
			progressObject.start();
		}

		function step(inner_data) {
			index++;
			if (index >= actionXmls.length) {
				if (errorOccured)
					ajaxart.run(inner_data, profile, 'OnError', context);
				if (progressObject) progressObject.resolve();
				return deferred.resolve(inner_data);
			}
			if (progressObject) progressObject.progress();

			var innerResult = ajaxart.run(data, actionXmls[index], '', context);
			$.when(innerResult[0]).then(function(res) {
				step(res);
			}, reject);
		}

		function reject(error) {
			error = error || [];
			if (aa_bool(data,profile,'StopOnError',context)) {
				ajaxart.run(error, profile, 'OnError', context);
				if (progressObject) progressObject.reject();
				deferred.reject();
			} else {
				errorOccured = true;
				step(error);
			}
		}

		step(data);
		return [deferred.promise()];
	},
	RunActionAndAlwaysReturnSuccess: function(profile, data, context) {
		var deferred = $.Deferred();
		var promise = aa_first(data, profile, 'Action', context);
		$.when(promise).then(function(res) {
			aa_run(data,profile,'OnSuccess',context);
			deferred.resolve(res);
		}, function() {
			aa_run(data,profile,'OnError',context);
			deferred.resolve();
		});

		return [deferred.promise()];
	},
	RunAsyncActionOnItems: function(profile, data, context) {
		var index = -1;
		var items = aa_run(data,profile,'Items',context);
		if (!items.length) return [];
		var deferred = $.Deferred();
		var errorOccured = false;

		var style = aa_first(data,profile,'ProgressStyle',context);
		var progressObject;
		if (style) {
			progressObject = aa_progress_object(items.length,context);
			progressObject.start();
		}

		function step(inner_data) {
			index++;
			if (index >= items.length) {
				if (errorOccured)
					ajaxart.run(inner_data, profile, 'OnError', context);
				if (progressObject) progressObject.resolve();
				return deferred.resolve(inner_data);
			}
			if (progressObject) progressObject.progress();

			var innerResult = ajaxart.run([items[index]], profile,'Action', context);
			$.when(innerResult[0]).then(function(res) {
				step(res);
			}, reject);
		}

		function reject(error) {
			error = error || [];
			if (aa_bool(data,profile,'StopOnError',context)) {
				ajaxart.run(error, profile, 'OnError', context);
				if (progressObject) progressObject.reject();
				deferred.reject();
			} else {
				errorOccured = true;
				step(error);
			}
		}

		step(data);
		return [deferred.promise()];
	},
	PipelineAsyncActions: function(profile, data, context) {
		var index = -1;
		var actionXmls = aa_xpath(profile, 'Action');
		var deferred = $.Deferred();
		var errorOccured = false;

		function step(inner_data) {
			index++;
			if (index >= actionXmls.length) {
				if (errorOccured)
					ajaxart.run(inner_data, profile, 'OnError', context);
				return deferred.resolve(inner_data);
			}

			var innerResult = ajaxart.run(inner_data || [], actionXmls[index], '', context);
			$.when(innerResult[0]).then(function(res) {
				step(res);
			}, reject);
		}

		function reject(error) {
			error = error || [];
			if (aa_bool(data,profile,'StopOnError',context)) {
				ajaxart.run(error, profile, 'OnError', context);
				deferred.reject();
			} else {
				errorOccured = true;
				step(error);				
			}
		}

		step(data);
		return [deferred.promise()];
	},
	RunInParallel: function(profile, data, context) {
		var deferred = $.Deferred();
		var finished = 0;
		var actionXmls = aa_xpath(profile, 'Action');

		function callDone() {
			finished++;
			if (finished == actionXmls.length) {
				var successResult = ajaxart.run(data, profile, 'OnSuccess', context)[0];
				$.when(successResult).then(deferred.resolve, deferred.reject);
			}
		}

		function reject(error) {
			error = error || [];
			ajaxart.run(error, profile, 'OnError', context);
			deferred.reject();
		}

		for (var i = 0; i < actionXmls.length; i++) {
			var innerResult = ajaxart.run(data, actionXmls[i], '', context);
			$.when(innerResult[0]).then(callDone, reject);
		}
		return [deferred.promise()];
	},
	RunOnAsycData: function(profile, data, context) {
		var deferred = $.Deferred();

		var inputData = ajaxart.run(data, profile, 'InputData', context);
		$.when(inputData.promise).then(function(val) {
			val = val || inputData;
			$.when(ajaxart.run(val, profile, 'Action', context)[0]).then(deferred.resolve, deferred.reject);
		}, deferred.reject);

		return [deferred.promise()];
	},
	DataOnNextTimer: function(profile, data, context) {
		var milli = aa_int(data, profile, 'Milliseconds', context);
		var deferred = $.Deferred();

		setTimeout(function() {
			var resultData = ajaxart.run(data, profile, 'ResultData', context);
			$.when(resultData.promise).then(function(val) {
				val = val || resultData;

				deferred.resolve(val);
			}, deferred.reject);
		}, milli);

		var out = [];
		out.promise = deferred.promise();
		return out;
	},
	AsyncActionBeforeLoad: function(profile, data, context) {
		aa_field_setAsyncActionBeforeLoad({
			field: context.vars._Field[0],
			asyncAction: function() {
				return ajaxart.run(data, profile, 'Action', context);
			},
			loadingStyle: aa_first(data, profile, 'LoadingStyle', context),
			loadingText: aa_text(data, profile, 'LoadingText', context),
			errorText: aa_text(data, profile, 'TextForError', context),
			showLoadingTextOnly: aa_bool(data,profile,'ShowLoadingTextInStudio',context) && ajaxart.jbart_studio
		});
	},
	SaveFileInLocalComputer: function(profile, data, context) {
		var deferred = $.Deferred();
		var path = aa_text(data,profile,'FilePath',context);
		var contents = aa_text(data,profile,'FileContents',context);

		var ajax = {
			url: '/?op=SaveFile',
			type: 'POST',
			headers: {
				'Content-Type': 'text/plain;charset=utf-8'
			},
			cache: false,			
			data: JSON.stringify({
				Path: path,
				Contents: contents
			})
		};

		$.when($.ajax(ajax)).then(deferred.resolve,deferred.reject);

		return [deferred.promise()];
	},
	JBartWidgetUsage: function(profile, data, context) {
		window.aa_intest = true;
		// var deferred = $.Deferred();

		var ctx = aa_create_jbart_context({
			WidgetXml: context.vars._WidgetXml[0],
			Context: context
		});

		var dataForPage = aa_run(data,profile,'DataForPage',ctx);
		
		var page = aa_first(dataForPage, profile, 'Page', context);
		if (!page) {
			var appXtml = ctx.vars._AppContext[0].AppXtml;
			page = aa_first([], appXtml, "MainPage1", ctx) || aa_first([], appXtml, "MainPage", ctx);
		};


		var control = context.vars._TestOutput ? context.vars._TestOutput[0].OutputControl[0] : jQuery('<div/>')[0];
		aa_fieldControl({
			Field: page,
			Wrapper: control,
			Item: dataForPage,
			Context: ctx
		});

		// activate on_attach - even if it is not attached
		var items = jQuery(control).find('.aa_onattach').get();
  		if (jQuery(control).hasClass('aa_onattach')) items.push(control);
		for(var i=0;i<items.length;i++) {
			  if (jQuery(items[i]).hasClass('aa_onattach_called')) continue;
			  if (items[i].jbOnAttach) items[i].jbOnAttach.call(items[i]);
			  jQuery(items[i]).addClass('aa_onattach_called');
		}		

		ctx.vars.ControlElement = ctx.vars.TopControlForTest = [control];
		ctx.vars.InTest = ['true'];
		window.aa_intest_topControl = control;

		ajaxart.run(data, profile, 'RunOnControl', ctx);

		var passed = aa_bool([control], profile, 'ExpectedResult', ctx);
		ajaxart.run(data, profile, 'CleanAfter', ctx);
		window.aa_intest_topControl = null;
		if (!ajaxart.inPreviewMode) {
			aa_closePopupsInTest();
		}
		var out = [];
		if (!passed) out = [control];

		window.aa_intest = false;
		if (context.vars._TestOutput) {
			context.vars._TestOutput[0].OutputControl = control;
		}
		// if (context.vars._AsyncPromiseHolder)
		// 	context.vars._AsyncPromiseHolder[0].promise = deferred.promise();

		// deferred.resolve(out);

		return out;
	}
});


function aa_xhr_xml_result(result) {
	// TODO:
	// 1. add a case for IE10 (reparse)
	// 2. check case of <?xml
	if (typeof result == 'string')
		result = aa_parsexml(result);
	if (result.nodeType == 9) result = result.firstChild;
	if (ajaxart.isIE)
		 result = aa_parsexml( ajaxart.xml2text(result) );

	return result;
}

// settings include: { field, asyncAction, loadingStyle, loadingText, textForError }
function aa_field_setAsyncActionBeforeLoad(topSettings) {
	topSettings.field.AsyncActionRunner = function(settings) {
		var result = settings.Wrapper || settings.wrapper;
		var loadingObject = {
			text: topSettings.loadingText
		};
		aa_renderStyleObject2(topSettings.loadingStyle,loadingObject,[],topSettings.field,settings.Context);
		result.appendChild(loadingObject.el);
		if (topSettings.showLoadingTextOnly) return;

		var promise = topSettings.asyncAction()[0];
		$.when(promise).then(function() {
			settings.Wrapper = result;
			aa_remove(loadingObject.el, true);

			aa_fieldControl(settings, true);
			aa_element_attached(result.firstChild);
		}, function() {
			loadingObject.$el.text(topSettings.errorText);
		});
	}
}

function aa_async_load_js_files(files) {
	var index = 0;
	var deferred = $.Deferred();

	function loadNextJsFile() {
		if (index >= files.length) {
			return deferred.resolve();
		}
		var file = $(files[index]);
		var url = file.attr('local_base_url') + file.attr('file_name');
		url += ((url.indexOf('?') == -1) ? '?' : '&') + (new Date()).getTime();

		var isReadyJS = file.attr('load_condition');
		if (!isReadyJS) {
			$.getScript(url, function() {
				index++;
				loadNextJsFile();
			});
			return;
		}

		if (isReadyJS.indexOf('function') == -1) {
			if (isReadyJS.indexOf('return') == -1) // a variable
			isReadyJS = 'function() { return ' + isReadyJS + ' != null; }';
			else isReadyJS = 'function() { ' + isReadyJS + '}';
		}

		try {
			eval('var isReadyFunc = ' + isReadyJS);
		} catch (e) {
			isReadyFunc = function() {
				return true;
			};
		}

		function checkReady(firstTime) {
			try {
				if (isReadyFunc()) {
					index++;
					loadNextJsFile();
					return;
				}
			} catch (e) {}
			if (firstTime) aa_load_js_css(url, 'js');
			setTimeout(checkReady, 100);
		}
		checkReady(true);
	}

	loadNextJsFile();

	return [deferred.promise()];
}
function aa_run_in_parallel(calls)
{
	var deferred = $.Deferred();
	var count = calls.length;
	function callDone() {
		count--;
		if (count == 0)
			deferred.resolve();		
	}
	for (var i=0; i<calls.length; i++)
		$.when( calls[i] ).then( callDone, callDone );
	return deferred;
}

function aa_progress_object(style,length,context) {
	aa_init_class('AsyncProgress', {
		start: function() {
			aa_trigger(this,'start');
		},
		progress: function() {
			this.currentStep = this.currentStep || 0;
			this.currentStep++;
			aa_trigger(this,'progress');
		},
		reject: function() {
			aa_trigger(this,'reject');			
			aa_trigger(this,'end');			
		},
		resolve: function() {
			aa_trigger(this,'resolve');					
			aa_trigger(this,'end');					
		}
	});
	var progressObject = new ajaxart.classes.AsyncProgress();
	progressObject.length = length;
	progressObject.currentStep = 0;

	aa_renderStyleObject2(style,progressObject,[],null,context,{ funcName: 'init' });
	return progressObject;
}

function aa_asyncui_progressByCssOnBody(progressObject) {
	aa_bind(progressObject,'start',function() {
		$('body').addClass(progressObject.elem_class);
	});
	aa_bind(progressObject,'end',function() {
		$('body').removeClass(progressObject.elem_class);
	});
}

function aa_asyncDataPromiseResult(promise) {
	var out = [];
	out.promise = promise;
	return out;
}

function aa_getFileObjectContent(file) {
  var deferred = $.Deferred();
  var reader = new FileReader();
  reader.readAsBinaryString(file);
  reader.onload = function(e) {
    deferred.resolve(reader.result);
  }
  return deferred.promise();	
}