ajaxart.load_plugin("aaeditor");
ajaxart.load_plugin("component_aspect","plugins/aaeditor/component_aspect.xtml");
ajaxart.load_plugin("aaeditor","plugins/aaeditor/aaeditor_tree.xtml");
ajaxart.load_plugin("aaeditor","plugins/aaeditor/aaeditor_preview.xtml");
ajaxart.load_plugin("aaeditor","plugins/aaeditor/aaeditor_dialog.xtml");
ajaxart.load_plugin("aaeditor","plugins/aaeditor/aaeditor_popup.xtml");
ajaxart.load_plugin("aaeditor","plugins/aaeditor/aaeditor_save.xtml");
ajaxart.load_plugin("aaeditor","plugins/aaeditor/aaeditor_undo.xtml");
ajaxart.load_plugin("aaeditor","plugins/aaeditor/aaeditor_light.xtml");
ajaxart.load_plugin("bart_dt","plugins/aaeditor/bart_dt.xtml");
ajaxart.load_plugin("bart_dt","plugins/aaeditor/bart_dt_custom.xtml");
ajaxart.load_plugin("bart_dt","plugins/aaeditor/field_dt_custom.xtml");
ajaxart.load_plugin("bart_dt","plugins/aaeditor/bart_dt_ct.xtml");
ajaxart.load_plugin("bart_dt","plugins/aaeditor/bart_dt_test.xtml");
ajaxart.load_plugin("bart_dt","plugins/aaeditor/bart_dt_studiobar.xtml");
ajaxart.load_plugin("bart_dt","plugins/aaeditor/studio_credits.xtml");
ajaxart.load_plugin("styles_dt","plugins/aaeditor/styles_dt.xtml");
ajaxart.load_plugin("js_dt","plugins/aaeditor/functions.xtml");
ajaxart.load_plugin("","plugins/studio/css_designer.xtml");

var ajaxart_capture_top = "";
var ajaxart_capture_mode = "";
var ajaxart_capture_onselect = null;
var ajaxart_captured_element = jQuery([]);
var ajaxart_capture_box = null;
var ajaxart_capture_box_add = null;
var ajaxart_capture_box_drop = null;
var ajaxart_drag = false;
var ajaxart_dragged = null;


ajaxart.gcs.aaeditor = 
{
	IsMultipleObject: function (profile,data,context)
	{
			if (ajaxart.run(data,profile,'Value',context).length > 1)
				return [true];
			return [];
	},
  ClearCaches: function (profile,data,context)
  {
	  window.aa_search_comp_of_type_cache = null;
	  window.ajaxart_comp_of_type_cache = null;
	  jBart.vars.compsOfTypeCache = {};
	  ajaxart.cache = {};
  },
  InPreview: function (profile,data,context)
  {
	  ajaxart.inPreviewMode = true;
	  var control = ajaxart.run(data,profile,'Control',context);
	  ajaxart.inPreviewMode = false;
	  
	  return control;
  },
  ProbeXtmlNew: function (profile,data,context)
  {
		var xtml = aa_first(data,profile,'Xtml',context);
		var param = aa_text(data,profile,'Param',context);
		var preview_context = [];
		if(xtml) {
			preview_context = aadt_calcPrimitivePreviewContext(xtml,param,context);
			if (preview_context && preview_context[0]) preview_context[0].script = xtml;
		}
		if (!preview_context[0]) return [{
			script: xtml,
			context: context,
			Input: []
		}];
		return preview_context;
  },
  ProbeFieldData: function (profile,data,context)
  {
  	var xtml = aa_first(data,profile,'FieldXtml',context);
  	return aadt_calcPrimitivePreviewContext(xtml,'',context,{ probeFieldData: true }) || [];
  },
  CalculateTopCircuit: function (profile,data,context)
  {
	var xtml = aa_first(data,profile,'Xtml',context);
	if(!xtml) return [];
	var circuit = bart_find_top_circuit(xtml,context);
	if (circuit) return [circuit];
	circuit = aaeditor_find_top_circuit(xtml,context);
	if (circuit) return [circuit];
	
	return [];
  },
  CalcLocalPreviewData: function (profile,data,params)
  {
	if (ajaxart.xtmls_to_trace.length > 0) { ajaxart.log("trying to run tester during tester","warning"); return []; }
	var circuits = ajaxart.run(data,profile,'State',params);
	if (ajaxart.isObject(circuits))
	{ 
		var circuit = circuits[0];
		var return_all = aa_bool(data,profile,'ReturnAll',params);

		var SelectedInTree = circuit.SelectedInTree[0];
		if (! ajaxart.isObject(SelectedInTree)) return [];
		var XtmlForPreview = SelectedInTree.Xtml;
		if (!XtmlForPreview || ((! ajaxart.isxml(XtmlForPreview)) && XtmlForPreview.length > 0)) return [];

		var puttingDummy = false; var returnOutputAsInput = false;
		if (XtmlForPreview.length == 0)	// handling empty value
		{
			var field = ajaxart.totext(SelectedInTree.Field);
			var parent = SelectedInTree.ParentXtml;
			if ( field.indexOf('[+]') > -1)
			{
				XtmlForPreview = parent;  // new array item. heuristic: return only the input of parent
				if (parent.length > 0 && parent[0].getAttribute('t') == 'data.Pipeline') // special case
					returnOutputAsInput = true;
			}
			else
			{
			  if (field == "" || field.indexOf('[') > -1 || (! ajaxart.isxml(parent))) return [];
			  if (field == "name") return [];	// may cause infinitive loop setting name of Param to ""
			
			  parent = parent[0];
			  puttingDummy = true;
			  if (parent.getAttribute(field) == null)
				parent.setAttribute(field,"");
			  XtmlForPreview = aa_xpath(parent,"@"+field);
			}
		}
		aadt_putXtmlTraces(XtmlForPreview[0]);
		// tracing the XtmlForPreview and its parents
		if (ajaxart.xtmls_to_trace.length == 0) return [];	// fix this

  	    var result = [];
		try {
			ajaxart.inPreviewMode = true;
			if ((!params.vars._XtmlTreeObj || !params.vars._XtmlTreeObj[0].CalcPreviewWithNoLimits) && !window.aa_intest)
				jBart.previewCircuit = { 
					startTime: Date.now(), 
					itemsFound: 0,
					maxItemsToFind: aa_preview_settings().maxItemsToFind,
					maxTime: aa_preview_settings().maxTime
				};
			var output = null;
			if (ajaxart.subprofiles(profile,'MainCircuitRunner').length > 0)
				output = ajaxart.run(data,profile,"MainCircuitRunner",params);
			else {
				var TopXtml = circuit.TreeXtml;
				if (TopXtml.length == 0) return [];
				TopXtml = TopXtml[0];
				var input = [];
				if ('input' in TopXtml) input = TopXtml.input;
				var newContext = TopXtml.context;
				if (newContext == null) newContext = ajaxart.newContext();
				output = ajaxart.run(input,TopXtml.script,"",newContext);	// TODO: this should take no more than 0.5 sec
				if (ajaxart.component_exists(TopXtml.script.getAttribute("t") + "_Preview")) {
					ajaxart.setVariable(newContext, "Preview", [ { isObject:true, Output: output } ] );
					aa_run_component(TopXtml.script.getAttribute("t") + "_Preview",[],newContext);
				}
			}
		} catch(e) {
			if (e.BreakPreviewCircuit)
				jBart.previewCircuit.timeoutBreakMessage = e.message;
		}
		try {
			if (ajaxart.xtmls_to_trace[0].results.length >0)
				result = ajaxart.xtmls_to_trace[0].results;
			else  // no execution for required element, trying to find a way
				result = aa_aaeditor_find_preview_context_over_gap();
		}
		catch (e) {
		}
		if (jBart.previewCircuit && jBart.previewCircuit.timeoutBreakMessage && params.vars._PreviewTimeoutHandler)
			params.vars._PreviewTimeoutHandler[0].handleTimeout(jBart.previewCircuit.timeoutBreakMessage);
		jBart.previewCircuit = null;
		ajaxart.xtmls_to_trace = [];
		ajaxart.inPreviewMode = false;
  	    if (puttingDummy && parent.getAttribute(field) == "") parent.removeAttribute(field);
  	    if (returnOutputAsInput && result.length > 0) // special case for pipline.Item[+]
  	    	result[0].Input = result[0].Output;
  	    
  	    if (result[0] && result[0].Output && result[0].Output.length == 0 && result[0].context.vars._AsyncIsQuery)
  	    {
  	    	var output = { isObject:true, _isAsyncObject: true , _callback: function() {} }
  	    	var init_async = function(output) {
  	    		if (!result[0].context.vars._AsyncCallback) result[0].context.vars._AsyncCallback = {};
  	    		result[0].context.vars._AsyncCallback.callBack = function(data1,ctx2) {
  	    			output._callback(data1,ctx2);
  	    		}
  	    	}
  	    	init_async(output);
  	    	result[0].Output = [output];
  	    }

		return result;
	}
	return [];
  },
  SimulateRunningContextForPreview : function(profile,data,context)
  {
	  ajaxart.aaeditor_current_running_context_for_preview = { isObject:true };
	  ajaxart.aaeditor_current_running_context_for_preview.Input = data;
	  ajaxart.aaeditor_current_running_context_for_preview.context = context;
	  return data;
  },
  AsyncObjectControl: function(profile,data,context)
  {
	var out = jQuery('<div>Please wait for async result..</div>')[0];

	data[0]._callback = function(data1,ctx2) {
		out.innerHTML = '';
		out.appendChild( ajaxart.runNativeHelper(data1,profile,'ShowSync',context)[0] );
	}
	return [out];
  },
  HowLong : function(profile,data,context)
  {
	var usage = aa_first(data,profile,'Usage',context);
	if (usage == null) return [];
	var before = new Date().getTime();
	ajaxart.run([],usage,"",context);
	var time_passes = new Date().getTime() - before;
	var out = ajaxart.getControlElement(context,true);
	jQuery(out).append('time: ' + time_passes + "ms<br/>");
	return [];
  },
  ComponentTitle: function(profile,data,context)
  {
	  return [ aa_component_title(data) ];
  },
  XmlElementInTree: function(profile,data,context)
  {
	  if (data.length == 0) return [];
	  var xml = data[0];
	  var out = document.createElement("SPAN");
	  
	  if (xml.nodeType == 2) { //attribute
		  jQuery(out).text(xml.nodeValue + " (" + xml.nodeName + ")");
		  return [out];
	  }
	  var header = document.createElement("SPAN");
	  jQuery(header).text(xml.tagName);
	  header.className = "xml_element"
	  out.appendChild(header);
		for (var i=0; i<xml.attributes.length; i++) {
			var val = xml.attributes[i].nodeValue;
			if (val != "") {
				var att = document.createElement("SPAN");
				jQuery(att).text(xml.attributes.item(i).name + "=");
				att.className = "xml_att";
				out.appendChild(att);

				var att_val = document.createElement("SPAN");
				jQuery(att_val).text(val);
				att_val.className = "xml_att_value";
				out.appendChild(att_val);
			}
		}
	  return [out];
  },
  DynamicTextOpenPart: function(profile,data,context)
  {
	  var text = ajaxart.totext(data);
	  if (text == null) return [];
	  if (aa_text(data,profile,'Type',context) == '%') {
		  var count = 0;
		  var lastIndex = -1;
		  for (i=0; i<text.length; i++)
			  if (text.charAt(i) == '%')
				  if (i == 0 || text.charAt(i-1) != '\\') {
					  count++;
					  lastIndex = i;
				  }
		  if (count % 2 == 0) return [];
		  var out = text.substring( lastIndex+1 );
		  if (out == "") return [ "__EMPTY" ];
		  return [out]; 
	  } else {
		  var index = text.lastIndexOf("{");
		  if (index == -1) return [];
		  var lastPart = text.substring(index+1);
		  if (lastPart.indexOf('}') != -1) return [];
		  if (lastPart == "") return [ "__EMPTY" ];
		  return [ lastPart ];
	  }
  },
  CalculatePrimitiveInnerParts: function(profile,data,context)
  {
	  var text = aa_text(data,profile,'Text',context);
	  var relevant_context = aa_first(data,profile,'Context',context);
	  var relevant_data = ajaxart.run(data,profile,'Input',context);
	  
	  if (relevant_context == null) return [];
	  var in_dynamic_part = false;
	  var i = 0;
	  while (true) {
		  if (i >= text.length) break;
		  if (text.charAt(i) == '%' && (i == 0 || text.charAt(i-1) != '\\'))
			  in_dynamic_part = !in_dynamic_part;
		  if (text.charAt(i) == '{' && in_dynamic_part) {
			  var ending_index = text.indexOf('}', i);
			  if (ending_index != -1) {
				  var to_compute = text.substring(i+1,ending_index);
				  var str = ajaxart.totext( ajaxart.dynamicText(relevant_data,"%"+to_compute+"%",relevant_context) );
				  text = text.substring(0, i) + str + text.substring(ending_index+1);
				  i = ending_index;
			  }
		  }
		  i++;
	  }
	  return [ text ];
  },
  EditPrimitiveHalfWrittenPart: function(profile,data,context)
  {
	  var text = ajaxart.totext(data);
	  var lastIndex = 0;
	  if (text.lastIndexOf("/") > lastIndex)
		  lastIndex = text.lastIndexOf("/");
	  if (text.lastIndexOf("{") > lastIndex)
		  lastIndex = text.lastIndexOf("{");
	  if (text.lastIndexOf("%") > lastIndex)
		  lastIndex = text.lastIndexOf("%");
	  if (text.lastIndexOf("$") > lastIndex)
		  lastIndex = text.lastIndexOf("$");
	  if (text.lastIndexOf("[") > lastIndex)
		  lastIndex = text.lastIndexOf("[");
	  if (lastIndex < text.length)
		  return [ text.substring(lastIndex+1) ];
	  else
		  return [];
  },
  SaveToServerAction: function (profile,data,context) {
		var comps = context.vars._ModifiedComponents;

		var files = {};
		for(var i=0;i<comps.length;i++) {
			var fullID = comps[i];
			var def = aa_component_definition(fullID);			
			var file = def && def.parentNode.getAttribute('file');
			if (file) {
				files[file] = files[file] || [];
				files[file].push(def);
			}
		}

		function fix_file(file) {
			getFile(file,function(filecontents) {
					var newContents = updateComponentsInFile(filecontents,files[file]);
					savefile(file,newContents);
			});			
		}

		for(var file in files) fix_file(file);

		aa_save_manager.modified = {};


		function updateComponentsInFile(contents,compDefs) {
			var newContents = contents;
			for(var i=0;i<compDefs.length;i++) {
				var id = compDefs[i].getAttribute('id');
				var index = newContents.indexOf('<Component id="'+id+'" ');
				if (index == -1) continue;
				while(index>0 && newContents.charAt(index-1) == ' ' || newContents.charAt(index-1) == '\t') index--;
				
				var endIndex = newContents.indexOf('</Component>',index);
				if (endIndex == -1) continue;
				endIndex += ('</Component>').length;
				var replaceWith = ajaxart.xml.prettyPrint(compDefs[i]);
				newContents = newContents.substring(0,index) + replaceWith + newContents.substring(endIndex);
			}
			return newContents;
		}
		function getFile(file,callback) {
			$.ajax({
				url: file.indexOf('/root/') == 0 ? file : '/ajaxart/'+file,
				type: 'GET',
				dataType: 'text',
				success: callback,
				error: function() {
					ajaxart.log('could not read file ' + file);
				}
			});			
		}
		function savefile(file,contents) {
			var path = '../'+file;
			if (file.indexOf('/root/') == 0) {
				path = '../../'+file.split('/root/')[1];
			}
			$.ajax({
				url: '/?op=SaveFile',
				type: 'POST',
				headers: {
					'Content-Type': 'text/plain; charset=utf-8'
				},
				cache: false,			
				data: JSON.stringify({
					Path: path,
					Contents: contents
				})				
			});
		}
  },
  ComponentsOfTypeNew: function (profile,data,context)
  {
	// should be the only one (Yaniv)
	var plugins = (context.vars._WidgetXml) ? aa_totext( aa_xpath(context.vars._WidgetXml[0],'@plugins') ) : '';
	var type = aa_text(data,profile,'Type',context);
	var lightOnly = aa_bool(data,profile,'LightOnly',context); 

	var cacheName = 'cache_'+plugins;
	if (lightOnly) cacheName += '_light';
	
	if (!jBart.vars.compsOfTypeCache) jBart.vars.compsOfTypeCache = {};
	
	if (! jBart.vars.compsOfTypeCache[cacheName] ) {
		jBart.vars.compsOfTypeCache[cacheName] = {};
		var cache = jBart.vars.compsOfTypeCache[cacheName];
		var promotedCache = {};
		
		var pluginsStr = ',' + plugins + ',';	// for fast detection, using indexOf
		for (var i in ajaxart.components) {
		  for(var j in ajaxart.components[i]) {
			  var comp = ajaxart.components[i][j];
			  var notLight = comp.getAttribute('light') == 'false';
				var lightTypes = comp.getAttribute('lightTypes');

			  var isPromoted = false;
			  if (!comp || comp.getAttribute('hidden') == 'true' || comp.getAttribute('deprecated') == 'true' || comp.parentNode.getAttribute('deprecated') == 'true') continue;
			  if (lightOnly && comp.getAttribute('light') == 'false') continue;
			  if (lightOnly && comp.parentNode && comp.parentNode.getAttribute('light') == 'false') continue;
			  var plugin = comp.parentNode.getAttribute('plugin');
			  if (plugin && pluginsStr.indexOf(','+plugin+',') == -1) continue; // not included

			  var types = (comp.getAttribute('type') || '').split(',');
			  for(var t=0;t<types.length;t++) {
				  if (types[t].split('.').length > 2) // e.g. data.Boolean.jBart
					  types.push(types[t].substring(0,types[t].lastIndexOf('.')));
			  }
				for(t in types) {
				  var compType = types[t];
				  if (compType == '') continue;
					if (lightOnly && lightTypes && lightTypes != compType) continue;

				  if (!cache[compType]) cache[compType] = [];
				  if (!promotedCache[compType]) promotedCache[compType] = [];
				  var item = { ID: i + '.' + j , Definition: comp };
				  if (isPromoted)
						promotedCache[compType].push( item );
				  else
				    cache[compType].push( item );
			  }
		  }
  	    }
  	    // add the promoted to the cache
  	    for(var compType in promotedCache) {
  	    	var promotedPTs = promotedCache[compType];
  	    	if (promotedPTs.lenth==0) continue;
  	    	cache[compType] = promotedPTs.concat(cache[compType]);
  	    }
	}
	if (aa_bool(data,profile,'ForAllTypes',context)) {
		if (! jBart.vars.compsOfTypeCache[cacheName][type+'_*']) {
			var out = [];
			ajaxart.concat( out , jBart.vars.compsOfTypeCache[cacheName][type]);
			ajaxart.concat( out , jBart.vars.compsOfTypeCache[cacheName]['*'] );
			jBart.vars.compsOfTypeCache[cacheName][type+'_*'] = out;
		}
		return jBart.vars.compsOfTypeCache[cacheName][type+'_*'];
	}
	
	return jBart.vars.compsOfTypeCache[cacheName][type];
  }
}
ajaxart.aaeditor = {};
aaeditor = {};
function aa_aaeditor_find_preview_context_over_gap(settings)
{
	var deepest_executed = 0;
	while (deepest_executed < ajaxart.xtmls_to_trace.length) {
		if (ajaxart.xtmls_to_trace[deepest_executed].results.length > 0)
			break;
		deepest_executed ++;
	}
	if (deepest_executed == ajaxart.xtmls_to_trace.length) return [];
	var current_context = ajaxart.xtmls_to_trace[deepest_executed].results[0];
//	ajaxart.setVariable(current_context.context,"OpenDialog",[]); //don't open dialogs 
	for (var current = deepest_executed;  current>=0; current--) {
		try {
			if (!ajaxart.xtmls_to_trace[current].xtml) continue;
			var type = aa_type_of_xtml(ajaxart.xtmls_to_trace[current].xtml);
			if (current == 0) { // reaching desired point
				if (type != "action.Action" && type != "action.Action" && type != "action_async.Action" && type != "xml.Change" && ajaxart.xtmls_to_trace[current].xtml) { // executing to determine output
					current_context.Output = ajaxart.run(current_context.Input, ajaxart.xtmls_to_trace[current].xtml, "", current_context.context);
					if (settings && settings.probeItemList && current_context.Output[0]) {
						var fieldData = findFieldData(current) || [];
						aa_fieldControl({ Field: current_context.Output[0], FieldData: fieldData, Wrapper: $('<div/>')[0], Context: current_context.context});
						if (ajaxart.xtmls_to_trace[current].itemlistCntr) return ajaxart.xtmls_to_trace[current].itemlistCntr;
					}
				}
				return [current_context];
			}
			// first try: use InputContext (declarative)
			var current_xtml = ajaxart.xtmls_to_trace[current].xtml;
			var next_xtml = ajaxart.xtmls_to_trace[current-1].xtml;
			var param_name = (next_xtml.nodeType == 1) ? aa_tag(next_xtml) : next_xtml.nodeName;
			var param_xml = aa_component_param_def(current_xtml.getAttribute("t"),param_name);
			var fieldData = findFieldData(current);
			if (fieldData) {
				current_context.Input = fieldData;
				continue;
			}
			if (param_xml != null && (param_xml.getAttribute("RunningInput") != null || ajaxart.childElem(param_xml,"RunningInput") != null)) {
				current_context.Input = ajaxart.run(current_context.Input,param_xml,'RunningInput',aa_ctx(current_context.context, { _Xtml:[current_xtml] } ));
				continue;
			}
			if ( current != deepest_executed && type != "action.Action" && type != "action.Action" && type != "action_async.Action" && type != "xml.Change" && type != 'ui.WritableAddItem' )
			{ // second try : trying to run current item and using the normal trace mechanism
				var old_xtmls_to_trace = ajaxart.xtmls_to_trace;
				ajaxart.xtmls_to_trace = [ { xtml: ajaxart.xtmls_to_trace[0].xtml , results: [] } ];
				ajaxart.run(current_context.Input, current_xtml, "", current_context.context);
				if (ajaxart.xtmls_to_trace[0].results.length > 0)
					return ajaxart.xtmls_to_trace[0].results;
				ajaxart.xtmls_to_trace = old_xtmls_to_trace;
			}
			  // last try: cannot execute or no point of execution : passing previous input
			ajaxart.aaeditor_current_running_context_for_preview = null;
			var dummy_xtml_for_context = ajaxart.xml.clone([ ajaxart.xtmls_to_trace[current].xtml ]);
			dummy_xtml_for_context.setAttribute("t","aaeditor.SimulateRunningContextForPreview");
			current_context.Input = ajaxart.run(current_context.Input, dummy_xtml_for_context, "", current_context.context);
			if (ajaxart.aaeditor_current_running_context_for_preview == null) // condition didn't pass
				return [];
			current_context = ajaxart.aaeditor_current_running_context_for_preview;
		} catch(e) {
			if (e.BreakPreviewCircuit && jBart.previewCircuit)
				jBart.previewCircuit.timeoutBreakMessage = e.message;
			if (ajaxart.xtmls_to_trace[0].results.length > 0)
				return ajaxart.xtmls_to_trace[0].results;
		}
	}
	return [];

	function findFieldData(index) {
		if (ajaxart.xtmls_to_trace[index].fieldData)	// using field data
			return ajaxart.xtmls_to_trace[index].fieldData;
		var t = ajaxart.xtmls_to_trace[index].xtml && ajaxart.xtmls_to_trace[index].xtml.getAttribute("t");
		var comp = t && aa_component_definition(t);
		if (comp && comp.getAttribute("type") == "field.FieldAspect") {
			if (ajaxart.xtmls_to_trace[index+1] && ajaxart.xtmls_to_trace[index+1].fieldData)
				return ajaxart.xtmls_to_trace[index+1].fieldData;
		}
	}
}
function aa_type_of_xtml(xtml)
{
	var param_name;
	if (xtml.nodeType == 2) 
		param_name = xtml.nodeName;
	if (xtml.nodeType == 1 || param_name == "value") 
		param_name = xtml.tagName;
	var parent_xtml = ajaxart.xml.parentNode(xtml);
	if (parent_xtml == null) // detached xtml code
	{
		if (xtml.nodeType == 2) return "data.Data";
		var component = xtml.getAttribute("t");
		if (component == null) return "data.Data";
  	    var middlePos = component.indexOf('.');
		var ns = component.substring(0,middlePos);
		var compName = component.substr(middlePos+1);
  	    if (typeof(ajaxart.components[ns]) == "undefined")
		 {
  	    	if (ns != "" && component != "")
			  ajaxart.log("plugin " + ns + " is not defined. trying to use component " + component,"error");
			return "data.Data";
		 }
		 var global = ajaxart.components[ns][compName];
		 return global.getAttribute("type");
	}
	if (xtml.tagName == 'xtml' && parent_xtml.tagName == "Component")
		return parent_xtml.getAttribute("type");
	if (parent_xtml.getAttribute("t") == null && ajaxart.xml.parentNode(parent_xtml) != null) 
		parent_xtml = ajaxart.xml.parentNode(parent_xtml);
	if (parent_xtml.getAttribute("t") == null)
		ajaxart.log("type_of_xtml_element - problem");

	if (parent_xtml.getAttribute("t") == null) return "data.Data";
	var parts = parent_xtml.getAttribute("t").split(".");
	var comp = ajaxart.components[parts[0]][parts[1]];
	var param_type_result = aa_xpath(comp,"Param[@name='" + param_name + "']/@type");
	if (param_type_result.length == 0) return "data.Data";
	var param_type = param_type_result[0].nodeValue;
	if (param_type.indexOf("[]") != -1)
		return param_type.substring(0, param_type.indexOf("[]"));
	return param_type;
}

function aaeditor_find_top_circuit(xtml,context)
{
  var circuit = {isObject:true };
	circuit.RunCircuit = function() {
		var type = aa_type_of_xtml(xtml);
	    var not_action = (type != "action.Action" && type != "action.Action" && type != "action_async.Action" && type != "xml.Change" && type != "ui.WritableAddItem");
	    var out = [];
	    if (not_action)
	    	out = ajaxart.run([],xtml,"",context);
	    else {	// mark manually the top xtml as run, to use later in gaps
	        for (i in ajaxart.xtmls_to_trace)
	       	 if (xtml == ajaxart.xtmls_to_trace[i].xtml)
	       		 ajaxart.fill_trace_result(ajaxart.xtmls_to_trace[i].results,[],out,context,[]);
	    }
        return out;
	}
	circuit.GlobalPreview = function() {
		var out = this.RunCircuit();
		if (ajaxart.ishtml(out)) 
			return out;
		else 	// text to html
			return [jQuery("<span/>").text(ajaxart.totext_array(out))[0]];
	};
  return circuit;
}
function aa_component_title(data)
{
	  var component = ajaxart.totext(data);
	  if (component == "") return [""];
	  var items = component.split(".");
	  if (items.length < 2) { return [] };
	  if (items[0] == "data" || items[0] == "ui" || items[0] == "yesno" || items[0] == "action")
		  return aa_text_capitalizeToSeperateWords(items[1]);
	  return aa_text_capitalizeToSeperateWords(items[1]) + " (" + items[0] + ")";
}


aa_gcs("aaeditor",{
	SaveNewStyle: function (profile,data,context) {
		var ns = aa_text(data,profile,'Ns',context);
		var compXtml = aa_first(data,profile,'Component',context);

		getFile(function(contents) {
			var newPart = '<xtml ns="'+ns+'">\n';
			newPart += ajaxart.xml.prettyPrint(compXtml);
			newPart += '\n</xtml>\n\n';

			var pos = contents.indexOf('<Type id="SaveStylePlaceholder"/>');
			newContents=contents.substring(0,pos) + newPart + contents.substring(pos);
			saveFile(newContents);
		});

		function getFile(callback) {
			$.ajax({
				url: '/ajaxart/plugins/jbart/global_styles.xtml',
				type: 'GET',
				dataType: 'text',
				success: callback,
				error: function() {
					ajaxart.log('could not read file ' + file);
				}
			});			
		}
		function saveFile(contents) {
			$.ajax({
				url: '/?op=SaveFile',
				type: 'POST',
				headers: {
					'Content-Type': 'text/plain; charset=utf-8'
				},
				cache: false,			
				data: JSON.stringify({
					Path: '../plugins/jbart/global_styles.xtml',
					Contents: contents
				})				
			});
		}

	}
});
