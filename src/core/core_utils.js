aa_determine_device();
function aa_extend(obj,extra) {
	if (!obj || !extra) return obj;
	for (var elem in extra)
		if (extra.hasOwnProperty(elem))
			obj[elem] = extra[elem];
	return obj;
}
function aa_defaults(obj,extra) {
	obj = obj || {};
	for (var elem in extra) {
		if (typeof(obj[elem]) == 'undefined' && extra.hasOwnProperty(elem))
			obj[elem] = extra[elem];
	}
	return obj;
}

// loading dev
function aa_handleHttpError(e,options,context)
{
	try
	{
		var text = "HTTP error. url: " + options.url + " status: " + e.statusText;
	//	if (window.aad_showProgressIndicator)
	//		aad_showProgressIndicator(aa_ctx(ajaxart.newContext(), { ProgressIndicationText: [text] }),true);
		ajaxart.log(text,'error');
	} catch(e) {}
}

aa_extend(ajaxart,{
	load_usage_plugin: function(plugin_name,xtml_name)
	{
	  if ( xtml_name == null)
		  xtml_name = "plugins/"+plugin_name+"/"+plugin_name+"_usage.xtml";
		  
	  ajaxart.load_plugin(plugin_name+"_usage",xtml_name);
	},
	load_plugin: function(plugin_name,xtml_name)
	{
		if (xtml_name == null)
			xtml_name = "plugins/" + plugin_name + "/" + plugin_name + ".xtml?cacheKiller="+new Date().getTime();
		ajaxart.loading_objects++;
		  $.ajax({
			   type: "GET",
			   url: xtml_name,
			   success: function (xtml_content) {
			   		xtml_content = xtml_content.replace(/\r/g,'\r\n');	// otherwise newlines are not shown, most relevant for CDATA content with newlines
			  		var xtml = aa_parsexml(xtml_content, xtml_name);
			  		ajaxart.load_xtml_content(xtml_name,xtml);
			  		ajaxart.object_finished_loading();
		  		},
		  		error: function (e){ 
		  			aa_handleHttpError(e,this);
					ajaxart.log("failed loading plugin " + xtml_name + "," + e.message,"error"); 
					ajaxart.object_finished_loading();
				}
		  }); 
	},
	load_xtml: function(file_name)
	{
	  jQuery.ajax({ url: file_name, cache: false, async: false,
		   success: function (xtml_content) {
		  		var xtml = aa_parsexml(xtml_content, file_name);
		  		ajaxart.load_xtml_content(file_name,xtml);
	  		},
	  		error: function (e){ 
	  			aa_handleHttpError(e,this);
				ajaxart.log("failed loading xtml file " + file_name + "," + e.message,"error"); 
			}
	  }); 
	}
});

// loading RT
var ajaxart_altPressed = false;
function aa_register_document_events(context) {
	if (jBart.vars.document_events_registered) return;
	jBart.vars.document_events_registered = true;
  	jQuery(document).keydown(function(event) { 
  		if (event.keyCode == 18)
  			ajaxart_altPressed = true;		  		
	  	if (event.keyCode == 192 && event.ctrlKey && !event.shiftKey) { // ctrl+`  (~)
	  		ajaxart.inPreviewMode = false;
	  		if (ajaxart.gcs.debugui)
	  		  aa_run_component("debugui.ShowDebugUi",[],context);
	  	}
	  	if (event.keyCode == 192 && event.ctrlKey && event.shiftKey) { // ctrl+Shift+`  (~)
	  		aa_run_component("debugui.OpenComponent",[],context);
	  	}
	  	if (event.keyCode == 8) {
  	        var element = (typeof(event.target)== 'undefined')? event.srcElement : event.target;
	  		if (element.tagName.toLowerCase() != 'input' && element.tagName.toLowerCase() != 'textarea' && !$(event.target).hasClass('nicEdit-main')) {
	  		  ajaxart_stop_event_propogation(event);
	  		  return false;
	  		}
	  	}
	  	if (event.keyCode == 88 && ajaxart_altPressed && ajaxart.jbart_studio) { // alt+x
	  		var element = (typeof(event.target)== 'undefined')? event.srcElement : event.target;
	  		ajaxart.runComponent('xtml_dt.GlobalOpenAAEditor',[element]);
	  	}
  	});
  	jQuery(document).keyup(function(event) { ajaxart_altPressed = false; });
} 

aa_extend(ajaxart,{
	start: function(divId,data,script)
	{
		jQuery(document).ready(function() {
			ajaxart.ready(function() {
				if (ajaxart.urlparam('debugmode')=="true") ajaxart.debugmode = true;
				if (ajaxart.isChrome) jQuery("body").addClass('chrome');
				
			  	var scriptXml = aa_parsexml(script);
			  	if (data == null) data = [""];

			  	var context = ajaxart.newContext();
			  	var result = ajaxart.run(data,scriptXml,"",context);
			  	var div = jQuery(divId).addClass("ajaxart ajaxart_topmost " + ajaxart.deviceCssClass);
			  	ajaxart.databind([div[0]],data,context,scriptXml,data);
		  		if (div.length > 0 && ajaxart.ishtml(result)) {
			  		div[0].appendChild(result[0]);
			  		aa_element_attached(result[0]);
				  	aa_register_document_events(context);
			  	} else {
			  		ajaxart.log("scriptxml did not return html","warning");
			  	}
//			  	var debugui = ajaxart.run(data,aa_parsexml('<Control t="debugui.HiddenButton" />'),"",context);
			  	
			  	var loading = jQuery("#ajaxart_loading");
			  	if (loading.length > 0 && ! loading[0].IsUsed)
			  		loading.hide();
	    });
	  }); 
	},
	ready: function(func)
	{
		  ajaxart.ready_func = func;
		  if (ajaxart.loading_objects == 0 ) func();
	},
	object_finished_loading: function()
	{
		var loading_div = jQuery("#ajaxart_loading");
		if (loading_div.length > 0)
			loading_div.html(loading_div.html()+".");
		ajaxart.loading_objects--;
		if (ajaxart.loading_objects == 0 && ajaxart.ready_func != null) 
			  ajaxart.ready_func();
	}
});

// log & trace
function aa_try_probe_test_attribute(script,field,data,out,context,origData)
{
   for (i=0; i<ajaxart.xtmls_to_trace.length; i++)
	   if (ajaxart.xtmls_to_trace[i].xtml.nodeType == 2 && ajaxart.xtmls_to_trace[i].xtml.nodeName == field)
		   if (ajaxart.xml.parentNode(ajaxart.xtmls_to_trace[i].xtml) == script)
			   ajaxart.fill_trace_result(ajaxart.xtmls_to_trace[i].results,data,out,context,origData);
}

function aa_index_of_element(elem)
{
	for (var k=0,e=elem; e = e.previousSibling; ++k);
	return k;
}
function aa_xtml_path(elem)
{
	var path = [];
	while(elem && elem.nodeType != 9 && elem.tagName != 'Component')
	{
		if (elem.nodeType == 1) // Elem 
		{
			var id = elem.getAttribute('id') || elem.getAttribute('ns') || elem.getAttribute('Name') || elem.getAttribute('Of') || ('' + aa_index_of_element(elem));
			path.push(aa_tag(elem) + '[' + id + ']');
		}
		else if (elem.nodeType == 2) // Attribute
			path.push("@" + elem.name);
		elem = elem.parentNode;
	}
	if (elem && elem.nodeType == 1)
		path.push(elem.getAttribute('id') || elem.getAttribute('ns') + ':/');
	return path.reverse().join('/');
}

function aa_st() 
{
	var result = "";
	var last_component = "";
	for(var i=0;i<ajaxart.stack_trace.length;i++)
	{
		var comp_node = aa_xtml_path(ajaxart.stack_trace[i],"id",true).split("@id='");
		if (comp_node.length > 1) 
			comp = comp_node[1].split("'")[0];
		else
			comp = comp_node[0];
		if (last_component == comp) continue;
		result += comp + ",";
		last_component = comp;
	}
	return result;
}

aa_extend(ajaxart,{
	logException: function(e,prefix)
	{
		var msg = e.message || e;
		if (e.stack) {
			msg += '\n' + e.stack;
		}
		if (prefix) msg = prefix + ' - ' + msg;
		ajaxart.log(msg,'error');
	},
	log: function(message,type)
	{
		if (type == null) type = "";
		var log_message = type + " - " + message;
		ajaxart.log_str += log_message + "\n\r";
		if (window.jBart) jBart.logs_str = ajaxart.log_str || '';

		if (type == "") type = "general";
		if (ajaxart.logs[type] == null)
			ajaxart.logs[type] = [];
//		if (type=="error") debugger;
		ajaxart.logs[type].push(message);
		if (type == "error" && ajaxart.debugmode)
			debugger;
		
//		if (ajaxart.log_level == "error" && type == "warning") return;
		if (!window.jBartNodeJS) {
			var msg = typeof(aa_xmlescape) == 'function' ? aa_xmlescape(log_message) : log_message;
			$("#ajaxart_log").append($("<div class='aa_log " + type + "'>"+msg+"</div>"));
		}
		
		try {
		  jBart.trigger(jBart,'log',{ message: message, type: type});
		} catch(e) {}

		if (type=='error' && window.console) console.log('error - ' + log_message);
		if (type == 'error' && ajaxart.jbart_studio) {	// adding error sign
			setTimeout( function() {
				jQuery(".fld_toolbar_errors_sign").removeClass("hidden"),1
			});
		}
	},
	tryShortXmlWithTag: function(xml,attrName)
	{
		if (aa_hasAttribute(xml,attrName))
			return "<" + aa_tag(xml) + " " + attrName + '="' + xml.getAttribute(attrName) + '" .../>';  
	},
	fill_trace_result: function(results, input,output,params,origData)
	{
		var result = { isObject: true, Input: input, Output: output, context:params }
		if (origData != null)
			result.OrigData = origData;
		results.push(result);
	},
	text4trace: function(obj, depth, max_depth)
	{
		if (depth == null) depth=0;
//		if (!max_depth) debugger;
		if (depth >= max_depth) return "...";
		if (typeof(obj) == "undefined") return "";
		
		if (!aa_isArray(obj)) obj=[obj];
		if (typeof(obj) == undefined || obj==null) return "";
		var out = "";
		if (obj.length > 1) out = obj.length + " items : \r\n";
		ajaxart.each(obj, function(item) {
			if (item == null) { return; }
			if (typeof(item) == "function") return;
			if (ajaxart.isxml(item))
			{
			  var xml_val = "";
			  if ( depth+1 == max_depth && item.nodeType == 1)
			  {
				  xml_val = ajaxart.tryShortXmlWithTag(item,"name");
				  if (xml_val == null) xml_val = ajaxart.tryShortXmlWithTag(item,"id")
				  if (xml_val == null) xml_val = ajaxart.tryShortXmlWithTag(item,"Name")
				  if (xml_val == null) xml_val = "<" + aa_tag(item) + " .../>";
			  }
			  else if (item.nodeType == 2) // attribute
				  xml_val = "@" + item.nodeName + '="' + aa_xmlescape(ajaxart.xml2text(item)) + '"';
			  else
				  // xml_val = aa_xmlescape( ajaxart.xml2text(item) );
				  xml_val = ajaxart.xml2text(item);
				 
			  if (ajaxart.ishtml(item))
	  	    out += "html: " +  xml_val;
			  else
			  	out += "xml: " +  xml_val;
			}
			else if (ajaxart.isObject(item)) {
				if (depth+1 == max_depth) {
					out += "object (";
					for (i in item)
						if (item.hasOwnProperty(i) && i != "isObject")
							out += i + ", ";
					out = out.substring(0,out.length-2) + ")";
				}
				else {
					out = { isObject: true };
					for (i in item) {
						if (item.hasOwnProperty(i) && i != "isObject" && i != "XtmlSource") {
							var item_trace = ajaxart.text4trace(item[i],depth+1,max_depth);
							if (item_trace.length > max_depth && item_trace.substring(0,3)=="xml")
								item_trace = { isObject: true, xml:item_trace };
							out[i] = item_trace;
		//				  out += "" + i + ": " + ;
						}
					}
					return out;
				}
			}
			else if (typeof(item.script) != "undefined") {
				out += "script:" + ajaxart.text4trace(item.script,depth+1,max_depth);
			}
			else {
//					var text = aa_xmlescape( ajaxart.totext(item) );
//					out += "text:" + text.replace(new RegExp("\n", "g"), "<br/>");
				out += "text:" + ajaxart.totext(item);
			}
			out += "\r\n";
		});
		return out;
	},
	trace: function(script,input,output,context,trace_param,level) 
	{
		if (ajaxart.xtmls_to_trace.length > 0) return;	// not having trace inside aaeditor tester
		var level_int = 2;	// default
		if (level != null && !isNaN(parseInt(level)))
			level_int = parseInt(level);
		var trace_item = { isObject: true };
		message = "<b>id:</b> " + aa_xtml_path(script,"id",true);
		if (typeof(trace_param) != "undefined")
			message += "/" + trace_param;
//		message += "<br> <b>stack:</b> " + aa_st();
//		message += "<br> <b>input:</b> " + ajaxart.text4trace(input,-1,level_int) + "<br> <b>output:</b> " + ajaxart.text4trace(output,-1,level_int);
		trace_item.id = aa_xtml_path(script,"id",true);
		if (trace_param != null)
			trace_item.id += "/" + trace_param;
		trace_item.stack = aa_st();
		trace_item.input = ajaxart.text4trace(input,-1,level_int);
		trace_item.output = ajaxart.text4trace(output,-1,level_int);
		trace_item.params = [];
		trace_item.context = [];
		if (level_int > 0)
		{
			message += "<b>params:</b> <ul>";
			for (varname in context.params) {
				message += "<li>" + varname + ": " + ajaxart.text4trace(ajaxart.getVariable(context,varname),0,0) + "</li>";
				trace_item["params"].push({ isObject: true,	name:	varname, value: ajaxart.text4trace(ajaxart.getVariable(context,varname),0,level_int)});
			}
			message += "</ul>";
			message += "<br> <b>stack:</b> <ul>";
			for (varname in context.vars) {
				var txt = ajaxart.text4trace(ajaxart.getVariable(context,varname),0,level_int);
				message += "<li>" + varname + ": " + txt + "</li>";
//				if (varname == "_ServerAdapter") debugger;
				trace_item["context"].push({ isObject: true, name: varname, value: [txt] });
			}
			message += "</ul>";
			message += "<b>server data: </b>";
		}
		trace_item["context"] = trace_item["context"].reverse();
		
//		if (typeof(console) != "undefined") 
//		  console.log(message);
		
//		jQuery("#ajaxart_trace_control").append(message);
//		jQuery("#ajaxart_trace_control").append("<br><br>");
		ajaxart.traces.push(trace_item);
		
		if (!window.jBartNodeJS)
			$("#trace_bugs").html("There are traces which can cause performence problems");
	},
	write_profiling_at_end: function(start_time,component_id) {
		 var time_passes = new Date().getTime() - start_time;
		 if (ajaxart.profiling_of_globals[component_id] == null)
			 ajaxart.profiling_of_globals[component_id] = { calls:0, total:0 };
		 ajaxart.profiling_of_globals[component_id].calls++;
		 ajaxart.profiling_of_globals[component_id].total += time_passes;
	}
});

// general
function aa_get_func(code,notReturningValue) { // caching functions to save expensive calls to eval
	if (!ajaxart.functions_cache)
		ajaxart.functions_cache = {};
	if (code == "") return function(){}
	if (code.indexOf('function') != 0) {
		if (notReturningValue) code = 'function() { ' + code + '}';
		else code = 'function() { return ' + code + '}';
	}
	if (!ajaxart.functions_cache[code])
		try {
			ajaxart.functions_cache[code] = eval('f =' + code);
		} catch (e) { 
			ajaxart.log("RunJavaScript: " + e.message + '   code = ' + code, "error"); 
		}
	return ajaxart.functions_cache[code];
}
function aa_run_js_code(code,data,context,elem)
{
	var func = aa_get_func(code);
	if (!elem)
		if (context.vars._ElemsOfOperation && context.vars._ElemsOfOperation.length)
			elem = context.vars._ElemsOfOperation[0];
	elem = elem || aa_var_first(context,'ControlElement');
	
	var data_item = data;
	if (data.length == 1)
		data_item = data[0];
	try {
		if (func)
			return func(data_item,elem,context);
	} catch(e) {
		ajaxart.logException(e,'aa_run_js_code failed, code: ' + code); 
	}
	return null;
}

aa_extend(ajaxart,{
	xmlunescape: function(text) 
	{
		if (aa_isArray(text))
		{
			if (text.length > 0 ) return aa_xmlescape(text[0]);
			return "";
		}
		if (ajaxart.isObject(text))
			return "struct";
		return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&#xa;/g, "\n");  
	},
	isattached: function(elem)
	{
		if (elem == null) return false;
		if (ajaxart.isIE) return jQuery(elem).parents("body").length > 0;
		return (elem.offsetParent || jQuery(elem).parents("body").length > 0);
	},
	getControlElement: function(params, single)
	{
	  var elem = ajaxart.getVariable(params,"ControlElement");
	  if (typeof(elem.controlElement) != "undefined")
		  elem = elem.controlElement;
	  
	  if (single != null && single == true) {
		  if (elem == null || elem.length == 0)
			  return null;
		  return elem[0];
	  }
	  if (elem == null) return [];
	  return elem; 
	},

	writevalue: function(data, newValueObj,disableXmlChangeEvent) {
	var assigned = false;
	if (data == null || data.length == 0 || data[0] == null) return assigned;
	var xml = data[0];
	if (xml.WriteValue) return xml.WriteValue(aa_isArray(newValueObj) ? newValueObj[0] : newValueObj); 
	
	if (ajaxart.isxml(newValueObj))
	{
		var newNode = newValueObj; 
		if (aa_isArray(newValueObj))
			newNode = newValueObj[0];

		if (newNode.nodeType == 1 && xml.nodeType == 1)
		{
		  if (newNode == xml) return;
		  if (aa_tag(newNode) == aa_tag(xml))
			  ajaxart.xml.copyElementContents(xml,newNode);
		  else
			  ajaxart.replaceXmlElement(xml,newNode);
		  assigned=true;
		}
	}
	if (!assigned)
	{
		var newValue = ajaxart.totext(newValueObj);
		if (ajaxart.isxml(xml)) {
			if (xml.nodeType == 2 && window.jBartNodeJS) {
				window.jBartNodeJS.setAttributeValue(xml,newValue);
			} else if (xml.nodeType == 2 || xml.nodeType == 3 || xml.nodeType == 4)  {// attribute or inner text
				if (newValue == xml.nodeValue) return true; // no need to do anything like auto save
				xml.nodeValue = newValue;
			}
			else {// inner xml for element
				var text_node = xml.firstChild;
		   		for (var child = xml.firstChild; child; child=child.nextSibling) // promote cdata
					if (child.nodeType == 4) // cdata
						text_node = child;
				if (text_node && text_node.nodeType == 3 ) // text node
					text_node.nodeValue = newValue;
				else if (text_node && text_node.nodeType == 4) // cdata
					text_node.nodeValue = newValue.replace(/\]\]>/g,']\\]>'); // BUG - escaping cdata end token - http://stackoverflow.com/questions/223652/is-there-a-way-to-escape-a-cdata-end-token-in-xml 
				else
					xml.appendChild(xml.ownerDocument.createTextNode(newValue));
			}
			assigned=true;
		} else if (typeof(xml) == "string")	{
			data[0] = ajaxart.totext(newValueObj);
			assigned=true;
		}
	}
	if (! disableXmlChangeEvent && ajaxart.isxml(xml))
		aa_triggerXmlChange(xml);
	return assigned;
},
body_contents_of_soap_envelope: function(envelope)
{
	for(var i=0;i<envelope.childNodes.length;i++)
	{
		var node = envelope.childNodes.item(i);
		if (node.nodeType == 1 && aa_tag(tagName).toLowerCase() == 'body') {
			for (var j=0;j<node.childNodes.length;j++)
			{
				var innernode = node.childNodes.item(i);
				if (innernode.nodeType == 1) return innernode; 
			}
		}
	}
	return envelope;
},
ajaxart_clean_ns: function(xmltext)
{
	xmltext = xmltext.replace(new RegExp('<[A-Za-z0-9_]*:', 'g'), '<');
	xmltext = xmltext.replace(new RegExp('</[A-Za-z0-9_]*:', 'g'), '</');
	xmltext = xmltext.replace(new RegExp('xmlns[a-zA-Z0-9_:"\'=/.-]*', 'g'), '');
	xmltext = xmltext.replace(new RegExp('[A-Za-z0-9_]*:([A-Za-z0-9_]*)="', 'g'), '$1="');

	return xmltext;
}

});
// studio 
aa_extend(ajaxart,{
	xtmls: aa_parsexml('<Plugins/>')
});
// deprecated
aa_extend(ajaxart,{
	make_array: function(input_array,func,workWithEmptyInput)
	{
		var result = [];
		ajaxart.each(input_array,function(item) {
			var myitem = func([item]);
			if (aa_isArray(myitem))
				ajaxart.concat(result,myitem);
			else if (myitem != null)
		      result.push(myitem);
		});
		if (input_array.length == 0 && (typeof workWithEmptyInput == "undefined" || workWithEmptyInput == true))
		{
			var myitem = func([]);
			if (myitem != null)
				result.push(myitem);
		}
		return result;
	},
	jrootElem: function(elemList)
	{
		var list = elemList.parents();
		if (list.length > 0 ) {
			var rootItem = list[list.length-1];
			return jQuery(rootItem);
		}
		return jQuery([]);
	},
	calcParamsForRunOn: function(params,runOn,startFrom)
	{
		var result = jQuery([]);
		if (ajaxart.ishtml(runOn))
			result = jQuery(runOn);
		else
		{
			runOn = ajaxart.totext(runOn);
//			runOn = runOn.replace(/ /g, "_");
			if (runOn == "") { 
				ajaxart.setVariable(params,"ControlElement",[]);
				return params;
			}
			var old_elem = [];
			if ( typeof(startFrom) != "undefined" ) 
			  old_elem = startFrom;
	    	else 
			  old_elem = ajaxart.getControlElement(params);
	    	
			if (old_elem.length > 0)
			  var baseElem = jQuery(old_elem);
			else
			  var baseElem = jQuery("body");
			
			if (runOn.indexOf('(') == -1) {
			  var jexp = "#"+runOn;
			  if (runOn.charAt(0) == ".") jexp = runOn;
			  try {
			  	var result = baseElem.find(jexp);
			  } catch(e) {
			  	ajaxart.log('RunOn bad expression ' + jexp);
			  	ajaxart.logException('RunOn bad expression',e);
			  	var result = jQuery([]);
			  }
			} else {
				var result = jQuery([]);
			}
			if (runOn.substr(0,3) == "up(") {
				jexp = runOn.substring(3,runOn.length-1);
				if (baseElem.filter(jexp).length != 0) // try ourselves first
					result = baseElem;
				else
					result = baseElem.parents(jexp).slice(0,1);
			}
			if (runOn.substr(0,2) == "$.") {
				var str = "result = baseElem" + runOn.substr(1);
				try { eval(str); } catch(e) {}
			}
			if (runOn.substr(0,7) == "updown(") {
				items = runOn.substring(7,runOn.length-1).split(",");
				if (items.length == 2) {
					var parent = baseElem.filter(items[0]); // try ourselves first
					if (parent.length == 0) 
						parent = baseElem.parents(items[0]);
					result = parent.find(items[1]);
				}
			}
			if (runOn.substr(0,5) == "down(") {
				jexp = runOn.substring(5,runOn.length-1);
				result = baseElem.find(jexp);
			}
			if (result.length == 0 && old_elem.length > 0)
			{
				baseElem.each(function() {
					if (this.getAttribute("id") == runOn)
						result = $([this]);
				});
			}
			try {
			  if (result.length == 0 && jexp) result = ajaxart.jrootElem(baseElem).find(jexp);
			  if (result.length == 0 && jexp) result = jQuery('body').find(jexp);
			} catch(e) {}
			if (result.length == 0)
				ajaxart.log("cannot locate " + jexp,"location");
		}

		var out = [];
		for(var i=0;i<result.length;i++) out.push(result[i]);

		params = ajaxart.clone_context(params);
		ajaxart.setVariable(params,"ControlElement",out);
			
		return params;
	},
	databind: function(bindto,data,params,script,origData)
	{
		ajaxart.each(bindto,function(item) {
			if ( ! ajaxart.ishtml(item) ) return;
			var context = {};
		  	context.data = data;
		  	context.params = params;
		  	context.script = script;
		  	context.origData = origData;
		  	/*
		  	if (ajaxart.isChrome) {	// Fix grabage collection of chrome - that cleans the databinding
		  		if (typeof(ajaxart.databoundeditems) == "undefined")
		  			ajaxart.databoundeditems = [];
		  		ajaxart.databoundeditems.push(item);
		  	}
	*/
		  	if (typeof(item["ajaxart"]) == "undefined")
		  		item["ajaxart"] = context;
		  	else
		  	{
		  		if (script != null)
		  		  item["ajaxart"].script = script;
		  		if (origData != null)
		  		  item["ajaxart"].origData = origData;
		  	}
		});
	}
});

// tests
aa_testFinished = {};
aa_tests_timeout = 0;

aa_extend(ajaxart,{
	stoptests: false,
	testResults: { summaryId : '' , failuresId: '' , successCounter: 0 , failureCounter: 0},
	debugData: [],
	runtests: function(summaryId,failuresId,onlyForPlugin)
	{
		ajaxart.testsStartTime = new Date().getTime();
		ajaxart.testResults.summaryId = summaryId;
		ajaxart.testResults.failuresId = failuresId;
		var runmore = ajaxart.urlparam('more') == "true";
		var allUsages = [];
		// run gallery items
		if (window._GalleryItems) {
		  var gitems = aa_xpath(_GalleryItems,'*');
		  for(var i=0;i<gitems.length;i++) 
			  ajaxart.concat(allUsages,bart_galleryitem_tousages(gitems[i]));
		}
		for (plugin in ajaxart.usages)
		{
			if (onlyForPlugin != null && onlyForPlugin != plugin) continue;
			for (usage in ajaxart.usages[plugin]) {
				var isTest = ajaxart.usages[plugin][usage].getAttribute("IsTest") != "false";
				if (runmore) isTest = ajaxart.usages[plugin][usage].getAttribute("IsTest") == "more";
				if (isTest)
					allUsages.push(ajaxart.usages[plugin][usage]);
			}
		}
		jQuery('#tests_count').text('Running ' + allUsages.length + ' tests');
	    ajaxart.runTestLoop(allUsages,0);
	},
	getTestName: function(prof)
	{
		var testName = '';
		if (aa_hasAttribute(prof,"Of") ) testName = prof.getAttribute("Of");
		if (aa_hasAttribute(prof,"Name") ) {
			if (testName.length > 0 ) testName += ' - ';
			testName += prof.getAttribute("Name");
		}
		return testName;
	},
	handleUsageResult: function(result,usagesArray,index,prof) 
	{
	  var testName = "";
	  if(index+1<usagesArray.length)
	  {
		var prof = usagesArray[index+1];
		if (aa_hasAttribute(prof,"Of") ) testName = prof.getAttribute("Of");
		if (aa_hasAttribute(prof,"Name") ) {
			if (testName.length > 0 ) testName += ' - ';
			testName += prof.getAttribute("Name");
		}
	  }
	  var text = "<div style='color:green;font-weight:bold'>so far " + ajaxart.testResults.successCounter + " tests succeeded. working on " + testName + "</div>";
	  document.getElementById('ajaxart_summary').innerHTML = text;
		
	  var prof = usagesArray[index];

	  if (result.length == 0) {
	    ajaxart.testResults.successCounter++;
	    if ( prof.getAttribute('AssignedTo') ) {
	    	var testName = "";
	    	if (aa_hasAttribute(prof,"Of") ) testName = prof.getAttribute("Of"); 
	    	jQuery("#"+ajaxart.testResults.failuresId).append("<div style='color:darkorange'>Test " + testName + " succeeds but assigned to " + prof.getAttribute('AssignedTo') + '</div>');
	    }
	  }
	  else  
	  {
		var testName = "";
		var href = "";
		var hrefBasic = "http://localhost/ajaxart/showsamples.html#?";
		if (aa_hasAttribute(prof,"Of") ) { testName = prof.getAttribute("Of"); href = hrefBasic + "Of=" + testName + ";"; }
		if (aa_hasAttribute(prof,"Name")) {
			if (testName.length > 0 ) testName += ' - ';
			testName += prof.getAttribute("Name");
			href = hrefBasic + "Name=" + prof.getAttribute("Name") + ";";
		}
		if (aa_hasAttribute(prof,'Of') && prof.getAttribute('Of').indexOf('gallery_') == 0) {
			var gitem = prof.getAttribute('Of').split('gallery_')[1].split('.')[0];
			var ct = jQuery(prof).parents('jbart_project').length>0 ? 'jbart_project' : 'bart_sample';
			href = 'http://localhost/ajaxart/gstudio.html?widget='+gitem+'#?gautotests=true';
		}
		ajaxart.testResults.failureCounter++;
		var assigned = "";
		if (aa_hasAttribute(prof,"AssignedTo") && prof.getAttribute('AssignedTo') != "")
			assigned = " (" + prof.getAttribute('AssignedTo') + ")";
		var failCssClass = (assigned != "") ? 'failing_test_assigned' : 'failing_test_unassigned';
	    jQuery("#"+ajaxart.testResults.failuresId).append("<a target='_blank' class='failing_test "+failCssClass+"' href='" + href + "'>Failed " + testName + assigned + "</a><br/>");
	  }
	  aa_closePopup();
	  
	  if (ajaxart.lastTestTime) {
		 var now = new Date().getTime();
		 var diff = now - ajaxart.lastTestTime;
		 var cls = (diff > 600) ? 'timing_red' : 'timing_ok'; 
		 jQuery('#tests_timing').append('<div>Running time of test ' + (index+1) + ' ('+ajaxart.getTestName(prof)+') is <span class="'+cls+'">' + diff + '<span></div>');
	  }

	  setTimeout( function() { ajaxart.runTestLoop(usagesArray,index+1) }, 1 );
	},
	runTestLoop: function(usagesArray,index,varsContext)
	{
		ajaxart.lastTestTime = new Date().getTime();
		
		if (usagesArray.length == 0) return;
		if (ajaxart.stoptests || index == usagesArray.length) // the end
		{
			var text="";
			if (ajaxart.stoptests)
				text ="<div>tests stopped</div>";
			else if (ajaxart.testResults.failureCounter == 0)
				text = "<div style='color:green;font-weight:bold'>all tests succeeded (" + ajaxart.testResults.successCounter + " tests)</div>";
			else
				text = "<div style='color:red;font-weight:bold'>" + ajaxart.testResults.failureCounter + " tests failed</div>";
			
			jQuery("#"+ajaxart.testResults.summaryId).html(text);	
			var elapsed = (new Date().getTime() - ajaxart.testsStartTime) / 1000;
			var now = '<div style="font-size:12px; margin-top:10px">Tests finished at ' + new Date().getHours() + ":" + new Date().getMinutes() + '</div>';
			jQuery("#ajaxart_tests_time").html("time (seconds): " + Math.round(elapsed) + now);
			return;
		}

		var prof = usagesArray[index];
//		if (prof.getAttribute('onlyme') != 'true') return ajaxart.runTestLoop(usagesArray,index+1,varsContext);
		var canRunNow = true;
		
		var params = ajaxart.newContext();
		if (typeof(varsContext) != "undefined") params = varsContext;
		var dataIsUsage = ( prof.getAttribute("t") == 'bart_usage.JBartUsage');
		
		if (canRunNow)
		{
			if (prof.getAttribute("t") == "ui_async.ControlUsage" ) {
				canRunNow = false;
				if (aa_tests_timeout != 0) clearTimeout(aa_tests_timeout);
				
				aa_tests_timeout = setTimeout(function() {	// fallback. if no answer in 4 seconds we go on 
					if (aa_testFinished[index]) return;
					aa_testFinished[index] = true;
					aa_tests_timeout = 0;
					ajaxart.handleUsageResult([],usagesArray,index,usagesArray[index]);
				},4000);
				
				ajaxart_RunAsync([prof],prof,params,function(result) {
					if (aa_testFinished[index]) return;
					aa_testFinished[index] = true;
					ajaxart.handleUsageResult(result,usagesArray,index,usagesArray[index]);
				});
			} 
			if (prof.getAttribute("t") == "async.JBartWidgetUsage") {
				canRunNow = false;

				var promiseHolder = {};
				var syncResult = ajaxart.run([prof],prof,'',aa_ctx(params,{_AsyncPromiseHolder: [promiseHolder]}));

				$.when(promiseHolder.promise).then(function(result) {
					result = result || syncResult;
					
					if (aa_testFinished[index]) return;
					aa_testFinished[index] = true;
					ajaxart.handleUsageResult(result,usagesArray,index,usagesArray[index]);					
				});

				if (!aa_testFinished[index]) { // fallback. if no answer in 4 seconds we go on 
					aa_tests_timeout = setTimeout(function() {	
						if (aa_testFinished[index]) return;
						aa_testFinished[index] = true;
						aa_tests_timeout = 0;
						ajaxart.handleUsageResult([],usagesArray,index,usagesArray[index]);
					},4000);
				}

			}
			if (prof.getAttribute("t") == "bart_usage.BartDataUsage") dataIsUsage = true;
		}

		if (!canRunNow) return;
	    var result = ajaxart.run(dataIsUsage ? [prof] : [],prof,'',params);
	    ajaxart.handleUsageResult(result,usagesArray,index,prof);
	}
});


// touch
ajaxart.isTouchDevice = function() { return ajaxart.isTouch; }
function aa_determine_device(userAgent) {
	var navigator = window.navigator || { userAgent : ""};
	userAgent = userAgent || navigator.userAgent.toLowerCase();
	ajaxart.isChrome = /chrome/.test(userAgent);
	ajaxart.isIE = /msie/.test(userAgent) || /trident/.test(userAgent);
	ajaxart.isIE7 = /msie 7/.test(userAgent);
	ajaxart.isIE8 = /msie 8/.test(userAgent);
	ajaxart.isIE78 = /msie 7/.test(userAgent) || /msie 8/.test(userAgent);
	ajaxart.isIE9 = /MSIE 9/.test(navigator.appVersion || '');
	ajaxart.isSafari = /safari/.test(userAgent);
	ajaxart.isFireFox = /firefox/.test(userAgent);
	ajaxart.isWebkit = /webkit/.test(userAgent);
	ajaxart.isOpera = /opera/.test(userAgent);
	ajaxart.isiPhone = /cpu iphone/.test(userAgent);
	ajaxart.isIDevice = (/iphone|ipad/gi).test(navigator.appVersion);
	ajaxart.isMobile = (/iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(navigator.userAgent.toLowerCase()));
	ajaxart.isAndroid = /android/.test(userAgent);
	ajaxart.deviceCssClass = "";
	if (ajaxart.isChrome) ajaxart.deviceCssClass += " chrome";
	if (ajaxart.isIE) ajaxart.deviceCssClass += " ie";
	if (ajaxart.isIE7) ajaxart.deviceCssClass += " ie7";
	if (ajaxart.isIE8) ajaxart.deviceCssClass += " ie8";
	if (ajaxart.isSafari) ajaxart.deviceCssClass += " safari";
	if (ajaxart.isFireFox) ajaxart.deviceCssClass += " firefox";
	if (ajaxart.isiPhone) ajaxart.deviceCssClass += " iphone";
	if (ajaxart.isIDevice) ajaxart.deviceCssClass += " idevice";
    try {
       document.createEvent("TouchEvent");
       ajaxart.isTouch = true;
       ajaxart.deviceCssClass += " aa_touch_device";
    } catch (e) {
    	ajaxart.isTouch = false;
    }
}


// gc utils
function aa_run_component(id,input,context,params)
{
		input = input || [];
		context = context || ajaxart.newContext();
	  var xtmlElem = ajaxart.componentsXtmlCache[id];

	  if (xtmlElem == null)
	  {
  	    try 
	    {
	  	  var middlePos = id.indexOf('.');
		  var ns = id.substring(0,middlePos);
		  var compName = id.substr(middlePos+1);
	
		  if (ajaxart.components[ns] == null) { ajaxart.log("cannot find component " + id,"error");return []; }
		  var global = ajaxart.components[ns][compName];
		  if (!global)
			  { ajaxart.log("cannot find component " + id,"error"); return []; }

		  if (global.getAttribute('execution') == 'native') {
			  xtmlElem = ajaxart.componentsXtmlCache[id] = { execution: 'native' }
			  xtmlElem.profile = aa_parsexml('<xtml t=""/>');
			  xtmlElem.gc = ajaxart.gcs[ns][compName]; 
		  }
		  else 
			  xtmlElem = ajaxart.componentsXtmlCache[id] = ajaxart.childElem(global,"xtml");
	    }
   	    catch(e) { return []; }
	  }
	  if (xtmlElem == null) return [];
	  var newContext = {};
	  newContext.vars = context.vars;
	  newContext.componentContext = context.componentContext;

	  if (xtmlElem.execution == 'native') {
	  	var profile = aa_parsexml('<xtml t=""/>');
	  	profile.setAttribute('t',id);
		  for (var j in params) {
		  	newContext.vars['_PARAM_' + j] = params[j];
		  	profile.setAttribute(j,"%$_PARAM_" + j + "%");
		  }
		  return xtmlElem.gc(profile,input,newContext);
	  }	
	  
	  newContext.params = [];
	  // look for default values to get params
	  var defaultProfs = aa_xpath(xtmlElem.parentNode,'Param/Default/..').concat(aa_xpath(xtmlElem.parentNode,'Param/@Default/..'));
	  for(var i=0;i<defaultProfs.length;i++) {
		  var val = ajaxart.run(input,defaultProfs[i],'Default',context);
		  var name = defaultProfs[i].getAttribute('name');
		  if (name != null && name != "")
			  newContext.params[name] = val;
	  }
	  for (var j in params) newContext.params[j] = params[j];
	  return ajaxart.run(input,xtmlElem,'',newContext);
}

ajaxart.runComponent = function(component,data,context) {
	context = context || ajaxart.newContext();
	data = data || [];
	var profile = aa_parsexml('<xtml t="' + component + '" />');
	return ajaxart.run(data,profile,'',context);
}
ajaxart.concat = function(source,toadd) {
	if (toadd == null) return;
	for(var i=0;i<toadd.length;i++)
		source.push(toadd[i]);
}
function ajaxart_addScriptMethod(structItem,structField,profile,field,context,paramVars) 
{
	var fieldscript = (field == "") ? profile : ajaxart.fieldscript(profile,field,true);
	
	structItem[structField] = { 
			script: fieldscript , context: context, objectForMethod: [structItem], 
			compiled: ajaxart.compile(fieldscript,'',context,paramVars) 
	};
}
function ajaxart_addScriptParam_js(structItem,structField,jsFunc,context)
{
	structItem[structField] = {	context: context , compiled: jsFunc };
}
function aa_addMethod_js(structItem,structField,jsFunc,context)
{
	structItem[structField] = {	context: context , compiled: jsFunc, objectForMethod: [structItem] };
}
function aa_ctx(context,vars)
{
  var out = ajaxart.clone_context(context);
  for (var i in vars) out.vars[i] = vars[i];
  return out;
}
function aa_merge_ctx(context,contextVars,moreVars)
{
  var result = { params: context.params , vars: contextVars.vars , componentContext: context.componentContext , _This: contextVars._This};
  if (moreVars)
	  result = aa_ctx(result,moreVars);
  return result;
}

function aa_toint(data)
{
	if (data.length == 0) return 0;
	var txt = aa_totext(data);
	if (txt == '') return 0;
	return parseInt(txt);
}
function ajaxart_toint_array(data)
{
	if (data.length == 0) return 0;
	if (data[0] == '') return 0;
	return parseInt(data[0]);
}
function ajaxart_run_commas(data,script,field,context)
{
  var text = aa_text(data,script,field,context);
  if (text == "") return [];
  return text.split(',');
}
function ajaxart_run_tocommas(data,script,field,context)
{
	var list = ajaxart.run(data,script,field,context);
	var out = ",";
	for(var i=0;i<list.length;i++) {
		out += aa_totext([list[i]]) + ',';
	}
	return out;
}
function ajaxart_arr_indexof(arr,item)
{
  for(var i=0;i<arr.length;i++)
	  if (arr[i] == item) return i;
  return -1;
}
function ajaxart_writabledata()
{
  return aa_xpath(aa_parsexml('<tmp val="" />'),'@val');	
}
function ajaxart_clone_array(array)
{
  var out = [];
  for(var i=0;i<array.length;i++)
	  out.push(array[i]);
  return out;
}

function aa_text2bool(text)
{
    if (text == "" || text == "false") return false;
    if (text == "true") return true;

    if (! isNaN(text)) return true; // a number is true (can allow Condition="%=Count...%")
    
    if (text.indexOf('==') > -1) {
    	var pos = text.indexOf('==');
    	var first = aa_trimQuote(text.substring(0,pos)), second = aa_trimQuote(text.substring(pos+2));
    	return (first == second);
    }
    if (text.indexOf('!=') > -1) {
    	var pos = text.indexOf('!=');
    	var first = aa_trimQuote(text.substring(0,pos)), second = aa_trimQuote(text.substring(pos+2));
    	return (first != second);
    }
    if (text.indexOf('=') > -1) {
    	var pos = text.indexOf('=');
    	var first = text.substring(0,pos), second = text.substring(pos+1);
    	return (first == second);
    }
	var boolean_result = false;
	var text_to_eval = "if (" + text + ") boolean_result=true;";
	try { eval(text_to_eval); }
	catch(e) { 
		ajaxart.log("Failed to evaluate boolean expression: " + text,"warning"); return false;
	}
    return boolean_result ? true : false;
}
function aa_string2id(txt)
{
	if (!ajaxart.hebchars) ajaxart.hebchars = ajaxart.types.text_HebrewText.getAttribute('HebChars'); // cannot put hebrew in the js 
	var heb = ajaxart.hebchars;
	var eng = 'abgdaozhtiklmnsapzkrstnfhz';
	
	var newid = "";
	for(var i=0;i<txt.length;i++) {
		var pos = heb.indexOf(txt.charAt(i));
		if (pos == -1) newid += txt.charAt(i);
		else newid += eng.charAt(pos);
	}
	txt = newid;
	
	txt = txt.replace(/[^0-9a-zA-Z]/g,'-').replace(/(^[0-9]+)/g,'-$1');
	return txt;
}
function aa_trimQuote(text)
{
  text = text.replace(/^\s*/, "").replace(/\s*$/, "");	// first trim spaces
  if (text.length > 0 && text.charAt(0) == "'" && text.charAt(text.length-1) == "'")
	  return text.substring(1,text.length-1);
  return text;
}

function aa_trim(text) {
  if(typeof String.prototype.trim !== 'function') {
  	String.prototype.trim = function() {
    	return this.replace(/^\s+|\s+$/g, ''); 
  	}
  }
  return text.trim();
}

function aa_run(data,profile,field,context) {
	return ajaxart.run(data,profile,field,context);
}
function aa_text_with_percent(data,script,field,params)
{
	var val = script.getAttribute(field);
	if (val) return val;
	return aa_text(data,script,field,params);
}
ajaxart.runScriptParam = function(data,scriptParam,context)
{
	if (scriptParam == null) return [];
	if (typeof(scriptParam) == "function") return scriptParam(data,context); 
	if (scriptParam.compiled == "same") return data;
	if (scriptParam.context == null) debugger;

	var newContext = { params: scriptParam.context.params 
			, vars: context.vars
			, componentContext: scriptParam.context.componentContext} // TODO: avoid this if paramVars == ""
	
    if (scriptParam.objectForMethod)
  	  newContext._This = scriptParam.objectForMethod[0];
	
	if (scriptParam.compiled != null) 
	  return scriptParam.compiled(data,newContext);
    else
      return ajaxart.run(data,scriptParam.script,"",newContext);
}

function aa_new_JsonByRef(parent,prop) {
	if (!window.aa_JsonByRef) aa_init_JsonByRef();
	return new aa_JsonByRef(parent,prop);
}
function aa_init_JsonByRef() {
	aa_JsonByRef = function(parent,prop) { this.parent = parent; this.prop = prop}
	aa_JsonByRef.prototype.GetValue = function() { return this.parent[this.prop] }
	aa_JsonByRef.prototype.WriteValue = function(val) { return this.parent[this.prop] = val }
	aa_JsonByRef.prototype.ParentNode = function() { return this.parent }
}

function aa_load_inplace_gc(comp,ns) {
	if (typeof(aa_xpath) == 'undefined') return;
	
  if (comp.getAttribute('execution') != 'native') return;    
  if (comp.nodeType != 1) return;
	var script = aa_cdata_value( aa_xpath(comp,'Code')[0] );
	if (!script) return;

	var func = null;
	try {
		  eval('func = ' + script);
	} catch(e) {
		ajaxart.logException(e,'could not compile js function for gc ' + comp.getAttribute('id') + ': ' + script);
	}
	if (func) {
		var gc = {};
		gc[comp.getAttribute('id')] = func;
		aa_gcs(ns, gc);
	}
}

function aa_split(text,separator,ignoreEmptyValues) {
	var arr = text.split(separator);
	var out = [];
	for(var i=0;i<arr.length;i++)
		if (arr[i] || !ignoreEmptyValues) out.push(arr[i]);
	return out;
}

function aa_var_first(context,varname) {
	var val = ajaxart.getVariable(context,varname);
	return val ? val[0] : null;
}

function aa_extendJQuery() {
	jQuery.fn.firstOfClass = function(className) {
		var classNameWithSpaces = ' ' + className + ' ';
		var out = this[0] && recursiveIteration(this[0]);
		return out ? jQuery(out) : jQuery([]);

		function recursiveIteration(elem) {
			if (elem.nodeType != 1) return null;
			var elemClasses = elem.className;
			if (elemClasses === className) return elem;
			if (elemClasses.indexOf(className) >-1 && (' '+elemClasses+' ').indexOf(classNameWithSpaces) > -1) return elem;

			for(var child=elem.firstChild;child;child=child.nextSibling) {
				var result = recursiveIteration(child);
				if (result) return result;
			}
			return null;
		}
	}
}
aa_extendJQuery();


function bart_galleryitem_tousages(gitem)
{
  var runmore = ajaxart.urlparam('more') == "true";
  
  var out = [];
  // old gallery tests
  var tests = aa_xpath(gitem,'AutoTests/Test');
  for (var i=0;i<tests.length;i++)
  {
	//  continue;
	  var isTest = tests[i].getAttribute('run_in_all_tests') == 'true';
	  if (runmore) isTest = tests[i].getAttribute('run_in_more_tests') == 'true';
	  if (!isTest) continue;
	  
	  var t="ui.ControlUsage";
	  if (tests[i].getAttribute('isasync')=="true") t="ui_async.ControlUsage";
	  
	  var usage = '<Usage t="'+t+'" Of="gallery_' + gitem.getAttribute('id') + '.' + tests[i].getAttribute('name') + '">';
	  usage += '<Control t="bart_usage.GalleryItemToUsageControl"><GalleryItem t="xml.Xml">' + ajaxart.xml2text(gitem) + '</GalleryItem>';
	  usage += '<Test t="xml.Xml">' + ajaxart.xml2text(tests[i]) + "</Test>";
	  usage += '</Control>';
	  
	  var params = aa_xpath(tests[i],'*');
	  for(var j=0;j<params.length;j++)
		  usage += ajaxart.xml2text(params[j]);
	  
	  usage += "</Usage>";
	  out.push(aa_parsexml(usage));
  }
  // new gallery tests
  tests = aa_xpath(gitem,'Tests/Test');
  for (var i=0;i<tests.length;i++)
  {
	  var test = tests[i];
	  var isTest = test.getAttribute('RunInAllTests') == 'true';
	  if (runmore) isTest = test.getAttribute('RunInAllTests') == 'true';
	  if (!isTest) continue;
	  test.setAttribute('Of','gallery_' + gitem.getAttribute('id') + '.' + test.getAttribute('Name'));
	  if (test.getAttribute('t') == 'bart_usage.JBartUsage' || test.getAttribute('t') == 'bart_usage.JBartStudioUsage')
		  var child = aa_parsexml('<Var name="_WidgetXml" value="%../..%" />','','',false,test);
	  else if (test.getAttribute('DoesNotChangeWidgetData') == 'true')
		  var child = aa_parsexml('<Var name="_TestDB" value="%../../bart_dev/db%" />','','',false,test);
	  else if (test.getAttribute('t') == 'async.JBartWidgetUsage')
		  var child = aa_parsexml('<Var name="_WidgetXml" t="data.Duplicate" Data="%../..%" />','','',false,test);
		else
		  var child = aa_parsexml('<Var name="_TestDB" t="data.Duplicate" Data="%../../bart_dev/db%" />','','',false,test);
	  
	  test.appendChild(child);
	  out.push(test);
  }
  return out;
}

function aa_guid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    	var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    	return v.toString(16);
	});
}

function aa_isArray(obj) {
	return Object.prototype.toString.call(obj) === '[object Array]';
}

function aa_xmlescape(text) {
	if (typeof text === 'string')
		return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/[\x00-\x1F]/g, function(x) { return '&#x' + x.charCodeAt(0).toString(16) + ';' } );
	if (aa_isArray(text) && text.length > 0) return aa_xmlescape(text[0]);
	return '';
}

function aa_parsexml(contents, filename, errorMsgOut, onlyWarning,baseXml) {
{
	if ( contents && contents.nodeType ) {
		if (contents.nodeType == 9) // document
			return contents.firstChild;
		return contents;
	}
	filename = filename || '';
  if ( typeof contents != "string" ) return contents;
  var parsing_error_level = onlyWarning ? 'warning' : 'error';
	if (!contents) return null;
 	var doc;
 	try {
 	// fix parsing bug that &#xd;-->\r and not \n
 		contents = contents.replace(/&#xa;&#xd;/g, "&#xa;").replace(/&#xd;&#xa;/g, "&#xa;").replace(/&#10;&#13;/g, "&#xa;").replace(/&#13;&#10;/g, "&#xa;");
		if (contents.indexOf('<') > 0)
			contents = contents.substring(contents.indexOf('<'));
		// contents = contents.replace(/&amp;/g, "&#26;");  // fix unescape bug 

		if (window.jBartNodeJS) return jBartNodeJS.parsexml(contents,baseXml);

		var isIE =  /msie/i.test(navigator.userAgent) || /trident/i.test(navigator.userAgent);
		if (window.ActiveXObject && isIE)
		{
			doc = new ActiveXObject("MSXML2.DOMDocument");
			var loaded = doc.loadXML(contents);
			if (!loaded) {
				var message = doc.parseError.reason + doc.parseError.srcText;
				if (errorMsgOut)
					errorMsgOut.push(message);
				log('Error parsing xml file ' + filename + ' : ' + message + ",xml:"+aa_xmlescape(contents.substring(0)+"..."),parsing_error_level);
	    	return null;
		  }	
		} 
		else if (document.implementation && document.implementation.createDocument)
		{
			    var domParser = new DOMParser();
			    doc = domParser.parseFromString(contents,"text/xml");
			    var errorMsg = null;
			    
			    var parseerrors = doc.getElementsByTagName("parsererror");//chrome & safari
			    if (parseerrors.length > 0) {
			    	errorMsg = "Error parsing xml";	//for empty error;
                	try {
                		errorMsg = parseerrors[0].childNodes.item(1).innerHTML;
                	} catch(e) { errorMsg = "Error parsing xml"; }
                }
			    if (doc.documentElement.nodeName == 'parsererror' ) {	// firefox
			    	errorMsg = doc.documentElement.childNodes.item(0).nodeValue;
			    	if (errorMsg.indexOf("Location") > 0)
			    		errorMsg = errorMsg.substring(0,errorMsg.indexOf("Location")) + errorMsg.substring(errorMsg.lastIndexOf("\n"));
			    }
                if (errorMsg != null) {
					log('Error parsing xml file ' + filename + ' : ' + errorMsg + ",xml:"+aa_xmlescape(contents.substring(0)+"..."),parsing_error_level);
					if (errorMsgOut != null)
						errorMsgOut.push(errorMsg);
			    	return null;
			    }
		}
	}
    catch(e) {
       	log('Error parsing xml file: ' + e + aa_xmlescape(contents.substring(0,50)+"..."),parsing_error_level);
       	return null;
    }
    var out = doc.firstChild;
    while(out.nodeType != 1 && out.nextSibling) out = out.nextSibling;

    out = aa_importNode(out, baseXml);
    
    return out;

    function log(msg) {
    	if (ajaxart.log) 
    		ajaxart.log(msg);
    }
}
}


function aa_importNode(node, target)
{
	if (target == null) return node;
	if (target.ownerDocument != node.ownerDocument && target.ownerDocument.importNode != undefined) {
	  try {
	  	return target.ownerDocument.importNode(node,true);
	  } catch(e) {
	  	return node;
	  }
	}
	return node;
}

function aa_hasParam(xtml,param) {
	return (aa_hasAttribute(xtml,param) || aa_xpath(xtml,param)[0] != null);
}

function aa_map(array,func) {
  if (!array) return [];
  var res = [];
  for(var i in array) {
    var item = func(array[i],i);
    if (aa_isArray(item))
      res = res.concat(item); // to check is faster than: for(var i=0;i<item.length;i++) res.push(item[i]);
    else if (item != null)
      res.push(item);
  }
  return res;
}

function aa_each(arr,func)
{
	for(var i=0;i<arr.length;i++)
		func(arr[i],i);
}
