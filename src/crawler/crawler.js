ajaxart.load_plugin("", "plugins/crawler/crawler.xtml");

aa_gcs("crawler",{
	Queue: function(profile,data,context) {
		var id = aa_text(data,profile,'ID',context);
		var queue = {
			ID: id,
			IsRunning: false,
			processingCount: 0,
			Service: aa_first(data,profile,'Service',context),
			Description: aa_text(data,profile,'Description',context),			
			Start: function() {
				if (this.IsRunning) return;
				this.IsRunning = true;
				this.processItems();
			},
			Stop: function() {
				this.IsRunning = false;
			},
			pop: function() {
				var xml = this._xml();
				var item = xml.firstChild;
				while (item && item.nodeType == 3) item = item.nextSibling;
				if (!item) return null;
				aa_remove(item);
				this.refreshUI();
				
				return aa_crawler_xml_to_queueitem(item);
			},
			empty: function() {
				var xml = this._xml();
				var item = xml.firstChild;
				while(item && item.nodeType == 3) item = item.nextSibling;
				if (!item) return true;
				return false;
			},
			add: function(val,unique) {
				if (ajaxart.inPreviewMode || !val) return;
				var item = val.contextVars ? val : { val: val, contextVars: {} };

				var xml = this._xml();
				// first see it if exists
				// if (unique) {
				// 	for(var iter=xml.firstChild;iter;iter=iter.nextSibling)						
				// 		if (iter.nodeType == 1 && iter.getAttribute('val') == item.val) return; // it exists in the queue
				// }

				var itemElem = aa_crawler_queueitem_to_xml(item);
				aa_xml_appendChild(xml,itemElem);

				aa_trigger(this,'add');
				this.refreshUI();

				if (this.IsRunning) this.startNextProcessTimeout();
			},
			addSampleItemIfEmpty: function() {
				if (!this.empty()) return;
				var sample = aa_first(data,profile,'SampleItem',context);
				if (sample)
					aa_xml_appendChild(this._xml(),aa_crawler_queueitem_to_xml(sample));
			},
			sampleItemForPreview: function() {
				return aa_first(data,profile,'SampleItem',context) || { val: '', contextVars: {} };
			},
			startNextProcessTimeout: function() {
				if (this.processingCount >= this.MaxParallelProcessing) return;
				var queue = this;
				if (this.nextProcessTimeout) clearTimeout(this.nextProcessTimeout);				
				this.nextProcessTimeout = setTimeout(function() {
					queue.nextProcessTimeout = 0;
					queue.processItems();
				},(this.Service && this.Service.delay) || 10);
			},
			processItems: function() {
				var service = this.Service;
				if (this.processingCount >= this.MaxParallelProcessing || !service || !this.IsRunning) return;

				var item = this.pop();
				if (!item) return;

				var queue = this;
				this.processingCount++;
				$.when(service.process(item,this.ID)).then(processMore,processMore);

				if (this.processingCount < this.MaxParallelProcessing && !this.empty())
					this.processItems();

				function processMore() {
					queue.processingCount--;
					if (queue.processingCount == 0)
						queue.startNextProcessTimeout();
				}			
			},
			_xml: function() {
				var queues = ajaxart.getVariable(context,'Queues')[0];
				var queueXml = aa_xpath(queues,'Queue[#'+id+']/live',true)[0];
				return queueXml;
			},
			addError: function(val,errorMessage) {
				var errorParent = aa_xpath(this._xml(),'../error',true)[0];
				var item = errorParent.ownerDocument.createElement('Item');
				item.setAttribute('val',val);
				item.setAttribute('error',errorMessage);
				errorParent.appendChild(item);
			},
			refreshUI: function() {
				if (window.jBartNodeJS) return;
				aa_run_delayed_action('refresh_crawler_ui',function() {
					aa_refresh_field(['queue_contents'],'screen',false,null,context);
				},1000);			
			}
		};
		if (ajaxart.jbart_studio && !aa_tobool(context.vars._RefreshMode)) 
			queue.addSampleItemIfEmpty();

		queue.MaxParallelProcessing = (queue.Service && queue.Service.ParallelCallsCount) || 1;

		return [queue];
	},
	SampleContents: function(profile,data,context) {
		var sample = aa_first(data,profile,'Sample',context);
		if (!sample) return [];
		jBart.crawlerSamples = jBart.crawlerSamples || {};
		var val = jBart.crawlerSamples[sample.File] || '';
		return [val];
	},
	Sample: function(profile,data,context) {
		var file = aa_text(data,profile,'File',context);

		jBart.crawlerSamples = jBart.crawlerSamples || {};
		if (window.jBartNodeJS) return; // no need to load sample in nodejs
		if (!jBart.crawlerSamples[file]) {
			var url = (file.indexOf('http') == 0) ? file :
				(file.indexOf('/') == 0) ? '/root' + file : '/jbart/devdb/sample_file/'+file;
			var httpScript = aa_xpath(profile,"../ParserData")[0].cloneNode(true);
			if (httpScript.getAttribute("t") == "http.HttpCall") {	// running the 'ParserData' script
				httpScript.setAttribute('Url',file);
				$.when(ajaxart.run(data,httpScript,"",context)[0]).then(function(contents) {
					jBart.crawlerSamples[file] = ajaxart.totext_array(contents);
				});
			} else {
				if (file.indexOf('http') == 0) {
					if (window.location.href.indexOf('localhost') != -1)
						var host = 'localhost';
					else
						var host = 'jbartcrawler.herokuapp.com';
					url = '//' + host + '/?op=httpCall&url='+ encodeURIComponent(file);
				}
				$.ajax({ url: url, dataType : "text", success: function(result) {
					jBart.crawlerSamples[file] = result;
				} });
			}
		}

		return [{
			Description: aa_text(data,profile,'Description',context),
			Url: aa_text(data,profile,'Url',context),
			File: file,
			GetValue: function() {
				return jBart.crawlerSamples[this.File] || '';
			}
		}];
	},
	StartAllQueues: function(profile,data,context) {
		var appContext = context.vars._AppContext[0];
		for(var i=0;i<appContext.Queues.length;i++)
			appContext.Queues[i].Start();
	},
	QueuePreviewResults: function(profile,data,context) {
		var queue = aa_crawler_getObject(context,'Queues',aa_text(data,profile,'QueueID',context));
		if (queue && queue.Service)
			return [queue.Service.previewResults(queue.ID,context)];
	},
	StartQueue: function(profile,data,context) {
		var queue = aa_crawler_getObject(context,'Queues',aa_text(data,profile,'QueueID',context));
		if (queue) queue.Start();
	},
	StopQueue: function(profile,data,context) {
		var queue = aa_crawler_getObject(context,'Queues',aa_text(data,profile,'QueueID',context));
		if (queue) queue.Stop();
	},
	IsQueueRunning: function(profile,data,context) {
		var queue = aa_crawler_getObject(context,'Queues',aa_text(data,profile,'QueueID',context));
		return aa_frombool(queue && queue.IsRunning);
	},
	StopQueue: function(profile,data,context) {
		var queue = aa_crawler_getObject(context,'Queues',aa_text(data,profile,'QueueID',context));
		if (queue) queue.Stop();
	},
	AddToQueue: function(profile,data,context) {
		var queueID = aa_text(data,profile,'QueueID',context);
		var queue = aa_crawler_getObject(context,'Queues',queueID);
		var val = aa_text(data,profile,'Value',context);
		var unique = aa_bool(data,profile,'AddIfNotAlreadyAdded',context);
		if (queue) queue.add(val,unique);
	},
	EmptyQueue: function(profile,data,context) {
		var queueID = aa_text(data,profile,'QueueID',context);
		var queue = aa_crawler_getObject(context,'Queues',queueID);
		if (queue) {
			while(queue.pop());
		}
	},
	CrawlerResult: function(profile,data,context) {
		var key = aa_text(data,profile,'Key',context);
		var path = aa_text(data,profile,'Path',context);
		if (!key) return;
		var results = aa_var_first(context,'Results');
		var item = aa_crawler_find_result_item(results,key);
		return aa_xpath(item,path);
	},
	WriteCrawlerResult: function(profile,data,context) {
		var key = aa_text(data,profile,'Key',context);
		var path = aa_text(data,profile,'Path',context);
		var value = aa_text(data,profile,'Value',context);
		var writeAs = aa_text(data,profile,'WriteAs',context);

		aa_crawler_write_result(context,key,path,value,writeAs);
	},
	XmlToCSV: function(profile,data,context) {
		var xmlItems = ajaxart.run(data,profile,'XmlItems',context);
		var separator = aa_text(data,profile,'Separator',context);
		var colNamesMap = {};
		var colNames = [];
		var out = '';
		for (var i=0; i<xmlItems.length; i++) {
			var row = xmlItems[i];
			for (var j=0;j<row.attributes.length;j++) {
				var attrName = row.attributes.item(j).name;
				if (!colNamesMap[attrName]) {
					colNamesMap[attrName] = true;
					colNames.push(attrName);
				}
			}
		}
		for (var i=0; i<xmlItems.length; i++) {
			var row = xmlItems[i];
			for (var j=0; j<colNames.length; j++) {
				out += cleanText(row.getAttribute(colNames[j]));
				if (j != colNames.length-1)
					out += separator;
			}
			if (i != xmlItems.length-1)
				out += '\r\n';
		}
		var firstLine = '';
		for (var j=0; j<colNames.length; j++) {
			firstLine += cleanText(colNames[j]);
			if (j != colNames.length-1)
				firstLine += separator;
		}
		return [firstLine + '\r\n' + out];

		function cleanText(val) {
			if (!val) return "";
			if (val.indexOf(',') > -1 || val.indexOf('"') > -1 || val.indexOf('\n') > -1)
				return '"' + val.replace(/\"/g,'""') + '"';
			else
				return val;
		}
	}
});

function aa_crawler_addToQueue(context,queueID,value) {
	var queue = aa_crawler_getObject(context,'Queues',queueID);
	if (queue) queue.add(value);
}
function aa_crawler_write_result(context,key,path,value,writeAs) {
		var results = aa_var_first(context,'Results');
		var item;
		if (key)
			item = aa_crawler_find_result_item(results,key);
		else {	// append items with no keys
			var tagName = aa_tag(value) || 'a';
			item = aa_createElement(results, tagName);
			results.appendChild(item);
		}
		var entry = aa_xpath(item,path,true);
		if (!entry[0]) return;

		if (writeAs == 'cdata' && entry[0].nodeType == 1) {
			aa_write_cdata(entry,value);
		} else if (writeAs == 'inner xml' && entry[0].nodeType == 1) {
			var innerXml = aa_parsexml(value);
			aa_empty(entry[0]);
			aa_xml_appendChild(entry[0],innerXml);
		} else {	// normal
			if (entry[0].nodeType == 1 && value.nodeType == 1)	// value and entry are xml elements - we copy the content
				ajaxart.xml.copyElementContents(entry[0],value,true);
			else
				ajaxart.writevalue(entry,[value]);
		}

		aa_trigger(context.vars._AppContext[0],'result',{
			key: key, path: path, value: value
		});

		if (window.jBartNodeJS && GLOBAL.appendResult) {
			GLOBAL.appendResult(ajaxart.xml.prettyPrint(item));
			results.removeChild(item);
		}
}
aa_gcs("crawler",{
	QueueItem: function(profile,data,context) {
		var out = {
			val: aa_text(data,profile,'Value',context),
			contextVars: {}
		};
		var vars = ajaxart.runsubprofiles(data,profile,'ContextVar',context);
		for(var i=0;i<vars.length;i++)
			out.contextVars[vars[i].name] = vars[i].value;
		return [out];
	},
	QueueItemContextVar: function(profile,data,context) {
		return [{
			name: aa_text(data,profile,'VarName',context),
			value: aa_text(data,profile,'Value',context)
		}];
	}
});

function aa_crawler_xml_to_queueitem(item) {
	var queueItem = {
		val: item.getAttribute('val'),
		contextVars: {}
	};
	var ctxElem = aa_xpath(item,'context')[0];
	if (ctxElem) {
		for(var i=0;i<ctxElem.attributes.length;i++) {
			var name = ctxElem.attributes.item(i).name;
			queueItem.contextVars[name] = ctxElem.getAttribute(name);
		}
	}
	return queueItem;
}
function aa_crawler_queueitem_to_xml(queueItem) {
	var item = aa_parsexml('<item/>');
	item.setAttribute('val',queueItem.val);
	var ctxElem = item.ownerDocument.createElement('context');
	for(var key in queueItem.contextVars) {
		ctxElem.setAttribute(key,queueItem.contextVars[key]);
	}
	if (ctxElem.attributes.length) item.appendChild(ctxElem);
	return item;
}

function aa_crawler_find_result_item(results,key) {
	for(var iter=results.firstChild;iter;iter=iter.nextSibling) {
		if (iter.nodeType == 1 && iter.getAttribute('id') == key) return iter;
	}
	var item = results.ownerDocument.createElement('a');
	item.setAttribute('id',key);
	results.appendChild(item);
	return item;
}

aa_gcs("crawler",{
	Service: function(profile,data,context) {
		var id = aa_text(data,profile,'ID',context);
		var appContext = context.vars._AppContext[0];

		var samples = ajaxart.runsubprofiles(data,profile,'SampleInput',context);

		var service = {
			Description: aa_text(data,profile,'Description',context),
			Samples: samples,
			process: function(inputQueueItem,inputQueueID) {
				var deferred = $.Deferred();
				var service = this;

				var ctx = aa_crawler_prepare_service_context(context,inputQueueItem,inputQueueID);

				var parserData = aa_run([inputQueueItem.val],profile,'ParserData',context);
				$.when(parserData.promise).then(function(val) {
					try {
						if (!val || val == parserData[0]) val = parserData;

						var result = aa_first(val,profile,'Parser',ctx);
						service.handleParserResult(result,inputQueueItem,ctx);
					} catch(e) {
						ajaxart.logException('running crawler service',e);
						return deferred.reject();	
					}
					deferred.resolve();
				},function(err) {
					try {
						var errorMessage = (err && err.message) || err || '';
						queue.addError(value,errorMessage);
					} catch(e) {
						ajaxart.logException('running crawler service in error',e);
					}
					deferred.reject();
				});
				return deferred.promise();
			},
			handleParserResult: function(result,inputQueueItem,ctx) {
				var outputQueueID = aa_text(data,profile,'OutputQueue',context);
				var output_queue = aa_crawler_getObject(context,'Queues',outputQueueID);
				var service = this;

				if (result.WriteCrawlerResults) {
					var items = aa_xpath(result.WriteCrawlerResults,'*');
					for(var i=0;i<items.length;i++) {
						var item = items[i];
						var value = item.getAttribute('Value') || aa_xpath(item,'*')[0]
						aa_crawler_write_result(ctx,item.getAttribute('Key'),item.getAttribute('Path'),value ,item.getAttribute('WriteAs'));
					}
				}
				if (result.AddToQueues) {
					var items = aa_xpath(result.AddToQueues,'*');
					for(var i=0;i<items.length;i++) {
						var item = items[i];
						aa_crawler_addToQueue(ctx,item.getAttribute('Queue'),item.getAttribute('Value'));
					}					
				}

				result.OutputQueueItems = result.OutputQueueItems || [];
				for(var i=0;i<result.OutputQueueItems.length;i++) {
					var item = result.OutputQueueItems[i];
					var outputQueueItem = item.contextVars ? item : { val: aa_totext([item]), contextVars: {} };
					if (!outputQueueItem.val) continue; // empty values are not allowed

					var inputQueueID = aa_totext(ctx.vars.InputQueueID);
					if (!this.DoNotForwardQueueContext) {
						for (var key in inputQueueItem.contextVars) 
								outputQueueItem.contextVars[key] = inputQueueItem.contextVars[key];
						outputQueueItem.contextVars[inputQueueID] = inputQueueItem.val;
					}

					addToOutputQueue(outputQueueItem);
				}

				function addToOutputQueue(outputQueueItem) {
					setTimeout(function() {
						if (output_queue) output_queue.add(outputQueueItem,true);
						aa_trigger(service,'result',{ item: outputQueueItem, context: ctx });				
					},1);
				}
			},
			runOnSample: function(inputQueueID,context) {
				var sample = this.Samples[0];
				var sampleValue = sample ? sample.GetValue() : '';
				var queue = aa_crawler_getObject(context,'Queues',inputQueueID);
				var sampleQueueItem = queue ? queue.sampleItemForPreview() : { val: '', contextVars: {} };
				var ctx = aa_crawler_prepare_service_context(context,sampleQueueItem,inputQueueID);				
				return aa_run([sampleValue],profile,'Parser',ctx);
			},
			previewResults: function(inputQueueID,context) {
				result = this.runOnSample(inputQueueID,context)[0];
				var resultsXml = aa_parsexml("<results/>");
				if (result.WriteCrawlerResults) {
					var items = aa_xpath(result.WriteCrawlerResults,'*');
					for(var i=0;i<items.length;i++) {
						var item = items[i];
						var value = item.getAttribute('Value')  || aa_xpath(item,'*')[0];
						aa_crawler_write_result(aa_ctx(context,{Results: [resultsXml]}),item.getAttribute('Key'),item.getAttribute('Path'),value,item.getAttribute('WriteAs'));
					}
				}
				if (result.AddToQueues) {
					var items = aa_xpath(result.AddToQueues,'*');
					for(var i=0;i<items.length;i++) {
						var item = items[i];
						$(aa_parsexml('<add_to_queue/>')).attr(item.getAttribute('Queue'),item.getAttribute('Value')).appendTo(resultsXml);
					}
				}
				if (result.OutputQueueItems) {
					var output_items = aa_parsexml('<output_queue_item/>');
					$(output_items).appendTo(resultsXml);
					for(var i=0;i<result.OutputQueueItems.length;i++) {
						var item = result.OutputQueueItems[i];
						if (aa_totext([item]))
							$(aa_parsexml('<item/>')).attr('value',aa_totext([item])).appendTo(output_items);
					}
				}
				return resultsXml;
			}
		};

		ajaxart.runsubprofiles(data,profile,'Aspect',aa_ctx(context,{_Service: [service]}));

		return [service];
	}	
});

function aa_crawler_prepare_service_context(context,inputQueueItem,inputQueueID) {
	return aa_ctx(context,{
		InputQueueItem: [inputQueueItem.val],
		InputQueueItemContext: [inputQueueItem.contextVars],
		InputQueueID: inputQueueID
	});
}
aa_gcs("crawler_aspect",{
	WriteOutputQueueItemsToCrawlerResult: function(profile,data,context) {
		var service = context.vars._Service[0];
		aa_bind(service,'result',function(args) {
			var val = args.item.val;
			ajaxart.runNativeHelper([val],profile,'Write',aa_merge_ctx(context,args.context));
		});
	},
	DoNotForwardQueueContext: function(profile,data,context) {
		var service = context.vars._Service[0];
		service.DoNotForwardQueueContext = true;
	},
	ParallelHttpCalls: function(profile,data,context) {
		var service = context.vars._Service[0];
		service.ParallelCallsCount = aa_int(data,profile,'NumberOfQueueItems',context);
	}
});

function aa_crawler_getObject(context,type,id) {
	var appContext = context.vars._AppContext[0];

	for(var i=0;i<appContext[type].length;i++)
		if (appContext[type][i].ID == id) return appContext[type][i];
}

function aa_crawler_create_context(studio,settings) {
	var widgetXml= studio.WidgetXml;
	var appXtml = aa_xpath(widgetXml,"xtml/Component[@id='Project']/xtml")[0];
	var appContext = {
		AppXtml: appXtml,
		Vars: {},
		Resources: [],
		Type: 'crawler'
	};

	var context = aa_ctx(ajaxart.newContext(),{
		_WidgetXml: [widgetXml],
		_AppContext: [appContext],
		WidgetId: [widgetXml.getAttribute('id')]
	});

	widgetDataResources();
	
	var project = aa_first([],appXtml,'',context);
	appContext.Queues = project.Queues;

	return context;

	function widgetDataResources() {
		var resourcesXtml = aa_xpath(appXtml,'DataResource');

		for(var i=0;i<resourcesXtml.length;i++) {
			var resourceXtml = resourcesXtml[i];
		  var resourceID = resourceXtml.getAttribute('ResourceID');
			var resource = aa_first([],resourceXtml,'',context);		// each resource can rely on previous resources
			if (settings && settings.rawData && settings.rawData[resourceID]) {
				var xml = aa_parsexml(settings.rawData[resourceID]);
				resource = { Items: [xml] };
			}
			if (resource) {
				appContext.Resources.push(resource);
				appContext.Vars[resourceID] = getResourceItemsFunc(resource);
			}
			else 
				ajaxart.log('could not create resource ' + resourceID,"error");
		}
	}

	function getResourceItemsFunc(resource) {
		return function() { return resource.Items; };
	}
}


/********************* Parser *************************/
aa_gcs("crawler",{
	Parser: function(profile,data,context) {
		var out = {};
		var ctx = aa_ctx(context,{ ParserContext: [out] });
		out.OutputQueueItems = aa_run(data,profile,'OutputQueueItems',ctx);

		return [out];
	}	
});

aa_gcs("crawler_in_parser",{
	WriteCrawlerResult: function(profile,data,context) {
		var key = aa_text(data,profile,'Key',context);
		var path = aa_text(data,profile,'Path',context);
		var value = aa_first(data,profile,'Value',context);
		var writeAs = aa_text(data,profile,'WriteAs',context);

		var parserCtx = aa_var_first(context,'ParserContext');
		if (!parserCtx) return;
		parserCtx.WriteCrawlerResults = parserCtx.WriteCrawlerResults || aa_parsexml('<writeResults/>');

		var elem = parserCtx.WriteCrawlerResults.ownerDocument.createElement('write');
		elem.setAttribute('Key',key);
		elem.setAttribute('Path',path);
		if (value.nodeType == 1)	// xml element
			elem.appendChild( value.cloneNode(true) );
		else
			elem.setAttribute('Value',ajaxart.totext(value));
		elem.setAttribute('WriteAs',writeAs);
		parserCtx.WriteCrawlerResults.appendChild(elem);

		return data;
	},
	AddToQueue: function(profile,data,context) {
		var queue = aa_text(data,profile,'Queue',context);
		var value = aa_text(data,profile,'Value',context);

		var parserCtx = aa_var_first(context,'ParserContext');
		if (!parserCtx) return;
		parserCtx.AddToQueues = parserCtx.AddToQueues || aa_parsexml('<addToQueues/>');
		var elem = parserCtx.AddToQueues.ownerDocument.createElement('add');
		elem.setAttribute('Queue',queue);
		elem.setAttribute('Value',value);
		parserCtx.AddToQueues.appendChild(elem);

		return data;		
	}
});

/************** Runtime (nodejs) *********************/

function aa_crawlerRunFromNodeJS(settings) {
	settings = aa_defaults(settings,{
		addToQueues: [],
		rawData: {}
	});

	var source = window['jBartWidget_'+window.crawlerID];
	if (!source) {
		console.log('no widget source');
		return;
	}

	var studio = {
		WidgetXml: aa_parsexml(source)
	};
	var ctx = aa_crawler_create_context(studio,settings);
	window.crawlerContext = ctx;

	var appContext = ctx.vars._AppContext[0];

	for(var i=0;i<settings.addToQueues.length;i++) {
		var queue = findQueue(settings.addToQueues[i].queueID);
		if (queue) queue.add(settings.addToQueues[i].value,false);
	}

	var queues = appContext.Queues;
	for(var i=0;i<queues.length;i++) {
		queues[i].Start();
	}

	function findQueue(id) {
		for(var j=0;j<appContext.Queues.length;j++)
			if (appContext.Queues[j].ID == id) return appContext.Queues[j];
	}
}
function aa_crawlerGetResults() {
	var results = aa_var_first(window.crawlerContext,'Results');
	if (results) return ajaxart.xml.prettyPrint(results);
	return 'Error - no results varirable';
}
function aa_crawlerGetQueues() {
	var queues = aa_var_first(window.crawlerContext,'Queues');
	if (queues) return ajaxart.xml.prettyPrint(queues);
	return 'Error - no queues varirable';
}