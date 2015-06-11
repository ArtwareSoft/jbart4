window.jBartWidgets = window.jBartWidgets || { vars: {} };
window.jBart = { vars: {}, api: {}, utils: {}, dialogs: {}, bart: {}, db: {} };
var ajaxart = { 
	debugmode: false, trace_level: 2, // 0-input output, 1-also variables, 2-nested values
    xtmls_to_trace: [], traces: [], components: [], componentsXtmlCache: [], usages: [], types: [], plugins: [], gcs: {}, 
    log_str: '', loading_objects: 0, logs: {}, default_values: [], inPreviewMode: false, stack_trace: [], build_version: 'ART_NOW', 
    xml: {}, cookies: {}, ui: {}, yesno: {}, dialog: { openPopups: []}, xmlsToMonitor: [], lookup_cache: {}, occurrence_cache: {}, 
    unique_number: 1, action: {}, runningTimers: {}, runDelayed: [],
    classes: {},
  	base_lib: '//jbartlib.appspot.com/lib', base_images: '//jbartlib.appspot.com/images',
  	STRING_WITH_EXP: /%[^ ,;\(\)]/,
  	NOT_EXP: /^[ ,;\(\)]/,

run: function(data,script,field,context,method,booleanExpression,noDtSupport) 
{
   try {
	 var origData = data;
     if (ajaxart.debugmode && ! aa_isArray(data))
     {
    	 ajaxart.log("run called with input not an array","error");
    	 return [];
     }
     if (script == null) return [];
     if (script.nodeType && script.nodeType == 2) { // attribute
    	 field = script.nodeName;
    	 script = ajaxart.xml.parentNode(script);
    	 if (!script) return [];
     }
     if (field != "" && aa_hasAttribute(script,field) ) {
       if (script.getAttribute("Break") == field)
      	 debugger;
       var out = ajaxart.dynamicText(data,script.getAttribute(field),context,null,booleanExpression);
       
       if (script.getAttribute("Trace") == field) ajaxart.trace(script,data,out,context,field);
       aa_try_probe_test_attribute(script,field,data,out,context,origData);
       return out;
     }
     var field_script = ajaxart.fieldscript(script, field,false);
     if (field_script == null) return [];
     if (field_script.nodeType == 2) return ajaxart.run(data,field_script,'',context,method,booleanExpression); // For Default param values in attributes
      
	 var childElems = [];
	 var node = field_script.firstChild;
	 while (node != null)
	 {
		if (node.nodeType == 1) childElems.push(node);
		node=node.nextSibling;
	 }
     ajaxart.stack_trace.push(field_script);
     // decorators
	 var classDecorator="";
	 var cssStyleDecorator="";
	 var atts = field_script.attributes;
	 for(var i=0;i<atts.length;i++)
	 {
		var aname = atts.item(i).nodeName;
		
		if (aname == "t") {}
		else if (aname == "Condition" && ! aa_bool(data,atts.item(i),"",context))
		{
			ajaxart.stack_trace.pop();
			return [];
		}
		else if (aname == "Data")
		{
			data = [aa_first(data,atts.item(i),'',context)];
			if (data[0] == null) data = [];
		}
		else if( aname == "RunOn")
  	 	  context = ajaxart.calcParamsForRunOn(context,ajaxart.run(data,atts.item(i),"",context));
		else if( aname == "Class") 
			classDecorator = aa_text(data,atts.item(i),"",context);
		else if( aname == "CssStyle") 
			cssStyleDecorator = aa_text(data,atts.item(i),"",context);
		else if( aname == "NameForTrace")
			ajaxart.log(atts.item(i), "actions trace");
	 }
	 
	 var firstVar=true;
	 for(var childElem in childElems)
	 {
	 	if (!childElems.hasOwnProperty(childElem)) continue;
		var item = childElems[childElem]; 
		var tag = item.tagName;  //Todo: if backend use getTagName
		if (tag == "Condition" && ! aa_bool(data,item,"",context))
		{
			ajaxart.stack_trace.pop();
			return [];
		}
		else if (tag == "Data")
		{
			data = [aa_first(data,item,"",context)];
			if (data[0] == null) data = [];
		}
		else if (tag == "RunOn")
  	 	  context = ajaxart.calcParamsForRunOn(context,ajaxart.run(data,item,"",context));
		else if (tag == "Class")
			classDecorator = aa_text(data,item,"",context);
		else if (tag == "CssStyle")
			cssStyleDecorator = aa_text(data,item,"",context);
		else if (tag == "Var")
		{
			if (firstVar) { context = ajaxart.clone_context(context); firstVar = false;}
			var scope = item.getAttribute('varScope') || 'stack';

      var varname = item.getAttribute("name");
      if (varname == "ControlElement") {	// special case. todo: try to fix this
				var elementPointer = {};
        ajaxart.setVariable(context,varname,elementPointer);         
      }
      var var_value = null;
      if (! aa_hasAttribute(item,"t") && ! aa_hasAttribute(item,"value") )
        var_value = data;
      else
        var_value = ajaxart.run(data,item,"",context);

      if (varname == "ControlElement") {	// special case. todo: try to fix this
        elementPointer.controlElement = var_value;
      }
      if (scope == 'Component') {
        context.params[varname] = var_value;
      } else { // scope == stack
        ajaxart.setVariable(context,varname,var_value);
      }
		}
	 }

	 var component = field_script.getAttribute("t") || "";
	 if (component == "") 
	 {
       if (aa_hasAttribute(field_script,"value") ) {
  		 if (field_script.getAttribute("Break") == "true")
  	    	 debugger;
      	 var out = ajaxart.dynamicText(data,field_script.getAttribute("value"),context,null,booleanExpression);
         if (aa_hasAttribute(field_script,"Trace"))
        	 ajaxart.trace(script,data,out,context,field,field_script.getAttribute("Trace"));
		 if (ajaxart.inPreviewMode)
		 	aa_trace_run_for_preview(field_script,data,out,context,origData);

  		 ajaxart.stack_trace.pop();
         return out;
       }
       else {  // maybe CDATA
   		for (var child = field_script.firstChild; child; child=child.nextSibling)
			if (child.nodeType == 4 && child.nodeValue)
				return ajaxart.dynamicText(data,child.nodeValue,context,null,booleanExpression);
       }
       ajaxart.stack_trace.pop();
	   return [];
	 }	   	   	   
	 // component definition
	 var global = aa_componentById(component);
	 if (!global) {
		ajaxart.stack_trace.pop();
		return [];
	 }
	 //aa_mark_component_usage(component,global);	// used for compression- do not delete
	 if (global.getAttribute("execution") == "native")
	 {
	   var gc_component = (method && method.length > 0) ? component + "_" + method : component;
	   var func = aa_componentById(gc_component,'gcs');
	   if (!func) {
		   ajaxart.stack_trace.pop();
		   return [];
	   }
	   if (field_script.getAttribute("Break") == "true")
		   debugger;
       if (ajaxart.profiling_of_globals == null)
    	   out = func(field_script,data,context);
       else {
	 		 var before = new Date().getTime();
        	 out = func(field_script,data,context);
        	 ajaxart.write_profiling_at_end(before,component);
        }
	 }
	 else   // xtml-defined component
	 {
		 var global_xtml = ajaxart.componentsXtmlCache[component]; 
		 if (global_xtml == null) {
	       global_xtml = ajaxart.childElem(global,'xtml');
	       ajaxart.componentsXtmlCache[component] = global_xtml;
		 }
		 if (global_xtml == null)
			 ajaxart.log("missing implementation for component " + component,"error");
		 var paramDefinitions = ajaxart.childElems(global,"Param");
		 var contextForXtml = ajaxart.newContext();
		 contextForXtml.vars = context.vars;
	     contextForXtml.componentContext = context;
	     contextForXtml.counter = (context.counter!=null) ? context.counter+1 : 1;
//	     if (contextForXtml.counter == 50) { debugger; window.alert('endless loop'); throw "endless loop"; }
	     if (contextForXtml.counter > 100) { ajaxart.log("endless loop"); return []; }
		 
		 for(var i=0;i<paramDefinitions.length;i++)
		 {
			 var paramDef = paramDefinitions[i];
			 var param_name = paramDef.getAttribute("name");
			 var param_value;
			 if (aa_hasAttribute(paramDef,"type") && (''+paramDef.getAttribute("type")).indexOf("[]") > 0)  //array
			 {
			   var param_value = [];
			   var subprofiles = ajaxart.childElems(field_script,param_name);
  		       if (paramDef.getAttribute("script") != "true" ) { 
			     for(var j=0;j<subprofiles.length;j++)
  			       ajaxart.concat(param_value, ajaxart.run(data,subprofiles[j],"",context) );
  		       } else { 
  		    	 param_value = { isArrayParamScript: true , script: field_script, field:param_name, context: context };
  		       }
			 }
		     else if (paramDef.getAttribute("script") != "true" ) 
			   param_value = ajaxart.run(data,field_script,param_name,context);
	         else { // script=true
	           param_value = { isParamScript: true }; 
			   param_value.script = ajaxart.fieldscript(field_script, param_name,true,contextForXtml);
	           param_value.compiled = ajaxart.compile(param_value.script,'',context,paramDef.getAttribute("paramVars"));
	         }

			 ajaxart.setParameterVariable(contextForXtml,param_name,param_value);
	     }
	     if (global.getAttribute("useCallerScript") == "true")
			   ajaxart.setVariable(contextForXtml,"_CallerScript", [field_script]);
	     
	     if (ajaxart.profiling_of_globals == null)
	    	 out = ajaxart.run(data,global_xtml,"",contextForXtml,method);
	     else {
	 		 var before = new Date().getTime();
	    	 out = ajaxart.run(data,global_xtml,"",contextForXtml,method);
        	 ajaxart.write_profiling_at_end(before,component);
	     }
	   } 
	   
       // decorators - post function
	   if (out == null) out = [];
	   
	   if (classDecorator != "") {
		 if (ajaxart.ishtml(out))
		   for(var item in out)
		   	if (out.hasOwnProperty(item))
				 jQuery(out[item]).addClass(classDecorator);
       }
	   if (cssStyleDecorator != "") {
		   for(var item in out)
		   	if (out.hasOwnProperty(item) && ajaxart.ishtml(out[item]))
				aa_setCssText(out[item],cssStyleDecorator);
	   }
	   if (global.getAttribute('databind') == "true") {
		   ajaxart.databind(out,data,context,field_script,origData);
	   }
	   try {
	     if (field_script.nodeType == 1 && out.length > 0 && ajaxart.isObject(out[0]))
		   if (global.getAttribute('dtsupport') != "false" && field_script.nodeType == 1 && field_script.getAttribute('dtsupport') != "false" && !noDtSupport)
		     out[0].XtmlSource = [{ script: field_script , input: data, context: context }];
	   } catch(e) {  }
	   
	   // trace
	   if (aa_hasAttribute(field_script,"Trace"))
		   ajaxart.trace(field_script,data,out,context,null,field_script.getAttribute("Trace"));
	   
	   if (aa_hasAttribute(field_script,"Alert")) {
	   	  if (field_script.getAttribute("Alert") == "true")
		   aa_alert(ajaxart.totext_array(out));
		  else
		  	aa_alert(ajaxart.dynamicText(out,field_script.getAttribute("Alert"),context));
		}

	  	if (aa_hasAttribute(field_script,"Name"))
	  	{
	  		var id = ('' + field_script.getAttribute("Name")).replace(/ /g, "_");
			 for(var item in out)
		   		if (out.hasOwnProperty(item) && ajaxart.ishtml(out[item]))
					 out[item].setAttribute("id", id);
	  	}
		if (ajaxart.inPreviewMode)
		 	aa_trace_run_for_preview(field_script,data,out,context,origData);
	   ajaxart.stack_trace.pop();
       return out;
	   } catch (e) {
	   	   if (e && e.BreakPreviewCircuit) 
	   	   		throw e;
	   	   	
		   var prefix = '';
		   if (script) {
			   var field_script = ajaxart.fieldscript(script, field,false) || script;
			   if (script.getAttribute('t')) prefix = 't=' + script.getAttribute('t') + ' - ';
		   }
	   	   ajaxart.logException(e,prefix);
	       return [];
	   };
},
compile_text: function (script, field ,context) {
	var fieldscript = ajaxart.fieldscript(script,field,true);
	if (fieldscript == null) return function() { return ''};
	
	if (fieldscript.nodeType == 2) { 
		var value = fieldscript.nodeValue;
		if (value == "%%" ) return function(data1) { return aa_totext(data1) };
		if (!value.match(ajaxart.STRING_WITH_EXP)) // no vars
		  return function() { return value };
	
		var att = value.match(/^%@([^%]+)%$/);
		if (att) 
			return function(data) { return data[0].getAttribute(att[1]) || ''; };
	}

	return function(data,ctx) { return aa_text(data,script,field,ctx); };  // the default - no compile
},
compile: function (script, field ,context,paramVars,isReadOnly, bool) {
	function normalRun(data,context) { 
		return ajaxart.run(data,script, field, context, '', bool) };

	if (ajaxart.xtmls_to_trace.length > 0 || script == null) return normalRun;
	if (!script) { ajaxart.log('compile with no script','error'); return;	}
	
	var fieldscript = ajaxart.fieldscript(script,field,true);
	if (fieldscript == null) return function(context) { return [];};
	
	var value = null;
	if (fieldscript.nodeType == 1) {
	  var extraAttrs=0;
	  if (aa_hasAttribute(fieldscript,'name')) extraAttrs=1;
	  if (aa_hasAttribute(fieldscript,'paramVars') ) extraAttrs=1;
	  
	  if (fieldscript.attributes.length == 2+extraAttrs && fieldscript.getAttribute("t") == "xtml.UseParam" && fieldscript.firstChild == null) {
		  var param = fieldscript.getAttribute("Param");
		  if (aa_hasAttribute(fieldscript,'Param')) {
			var paramScript = context.params[param];
  		    if (!paramScript || !paramScript.script || aa_isArray(paramScript) ) return normalRun;
  		    if (paramScript.compiled == "same") return aa_same; // aa_same() 
  	        return function(data,context1) {
  	  	  	    var newContext = {};
  		  	    newContext.vars = context1.vars;
  		  	    newContext.params = context.componentContext.params;
  		  	    newContext.componentContext = context.componentContext.componentContext;
  		  	
  		  	    if (paramScript.compiled == null)  
  		  	    	return ajaxart.run(data,paramScript.script,"",newContext);
  	            else
  	            	return paramScript.compiled(data,newContext);
  	        };
		  };
  	      return normalRun;
	  }
 	  if (fieldscript.getAttribute("t") == "js.JavaScript" ) {
	  	var scriptNode = ajaxart.childElem(fieldscript,'Javascript');
	  	if (!scriptNode) return function() { return [] };
			var code = aa_cdata_value(scriptNode) || ajaxart.xml.innerTextStr(scriptNode);
 	  	var run_js = aa_get_func(code);
 	  	return function(data,context) {
				var data_item = data;
				if (data.length == 1)
					data_item = data[0];
				var ret = run_js(data_item,context.vars._ElemsOfOperation ? context.vars._ElemsOfOperation[0] : null,context);
				if (!ret) return [];
				if (typeof(ret) == 'string') return [ret];
				if (typeof(ret) == 'number') return [""+ret];
				if (typeof(ret) == 'boolean') return (ret) ? ["true"] : [];
				if (aa_isArray(ret)) return ret;
				return [ret];
 	  	}
 	  }
	  if (fieldscript.attributes.length <= 3+extraAttrs && fieldscript.getAttribute("t") == "xtml.RunXtml" && fieldscript.firstChild == null) {
		  return aa_compile(fieldscript);
	  }
  	  if (fieldscript.getAttribute("t") == "uiaspect.JavaScriptControl" ) {
      	var func_name = aa_text([],fieldscript,'FunctionName',context);
      	if (func_name != "" && window[func_name] == null) { ajaxart.log("function " + func_name + " does not exist","error"); return []; }
    		return function(data,context) { 
    			var control = jQuery(aa_text(data,fieldscript,'Html',context));
    			if (window[func_name] == null) return control;
    			else return [window[func_name](data,context,control)] };
  	  }
	  if (fieldscript.attributes.length > 1+extraAttrs || fieldscript.firstChild != null) return normalRun;  // no compilation possible
  	  if (fieldscript.getAttribute("t") == "data.Same" ) return aa_same;
	  value = aa_hasAttribute(fieldscript,'value') ? fieldscript.getAttribute('value') : null;
	}
	else if (fieldscript.nodeType == 2) value = fieldscript.nodeValue;
	
	if (value == null) return normalRun;
	if (value == "%%") return aa_same;
	if (!value.match(ajaxart.STRING_WITH_EXP))
		return function(data,context) { return [value]; };
	var items = value.split("%");
	if (items.length == 3) {
		if (items[1].charAt(items[1].length-1) == "\\" || items[2].charAt(items[2].length-1) == "\\") return normalRun;// width:50\%, height:30\%
		if (value.charAt(0) == '%' && value.charAt(value.length-1) == '%' ) { // xpath
			if (value.charAt(1) == '@') { // attribute
				if (value.indexOf('{') != -1) return normalRun;
				var attr = value.substring(2,value.length-1);
				if (isReadOnly) {
					var myFunc = function(attr) { return function(data,context) {
						var out = [];
						for(var i=0;i<data.length;i++) {
							var item = data[0];
							if (typeof(item.nodeType) == "undefined" || item.nodeType != 1) continue;
							if (aa_hasAttribute(item,attr)) out.push(value);
						}
						return out;
					} };
					return myFunc(attr);
				}
				var myFunc = function(attr) { return function(data,context) {
					var out = [];
					for(var i=0;i<data.length;i++) {
						var item = data[0];
						if (typeof(item.nodeType) == "undefined" || item.nodeType != 1) continue;
						var atts = item.attributes;
						for (var j = 0; j < atts.length; j++)
						  if (atts.item(j).nodeName == attr)
							out.push(atts.item(j));
					}
					return out;
				} };
				return myFunc(attr);
			}
			return normalRun;
		}
		if (!bool ) { // text with prefix && suffix. Not for boolean,e.g: %%=='Europe' ==> Europe=='Europe' and not 'Europe'=='Europe'
			var prefix = items[0];
			var suffix = items[2];
			var xpath = items[1];
			if (xpath.length == 0) { // text
				var myFunc = function(prefix,suffix) { return function(data,context) { return [prefix+ajaxart.totext_array(data)+suffix]; } }
				return myFunc(prefix,suffix);
			}
		}
	}
	return normalRun;
},
fieldscript: function (script, field,lookInAttributes) 
{
	if (!field) return script;
	if (lookInAttributes && aa_hasAttribute(script,field))
		return ajaxart.xml.attributeObject(script,field);
	
	var field_script = ajaxart.childElem(script,field);
	if (!field_script) 
		field_script = aa_get_default_value(script.getAttribute("t"),field);
	return field_script;
},
splitCommasForAggregatorParams: function(params_str)
{	// a,'b,d,t',c --> [ 'a', 'b,d,t', 'c' ]
	if (!params_str) return [];
	var out = [];
	var single_quot= false, double_quot= false, last_index= 0;
	for (var i=0; i<params_str.length; i++) {
		if (params_str[i] == '"')
			double_quot = !double_quot;
		else if (params_str[i] == "'")
			single_quot = !single_quot;
		else if (params_str[i] == "," && !single_quot && !double_quot) {
			var param = params_str.substring(last_index,i);
			out.push(param);
			last_index = i+1;
		}
	}
	out.push(params_str.substring(last_index));
	for (var j=0; j<out.length; j++) {
		var match = out[j].match(/^'([^']*)'$/);
		if (match) out[j] = match[1];
		match = out[j].match(/^"([^"]*)"$/);
		if (match) out[j] = match[1];
	}
	return out;
},
runNativeHelperNoParams: function(data,script,helpername,context)
{
	var component = script.getAttribute('t');
	var global = aa_componentById(component);
	if (!global) return [];  // should not happen
	
	var helperXml = aa_xpath(global,'NativeHelper[@name="'+helpername+'"]');
	if (helperXml.length > 0)
		return ajaxart.run(data,helperXml[0],"",context);

	ajaxart.log("calling runNativeHelper for none existing helper - " + helpername);
	return [];
},
runNativeHelper: function(data,script,helpername,context)
{
	var new_context = ajaxart.clone_context(context);
	var comp_context = ajaxart.clone_context(context);
	new_context.params = [];
	
	for (i in context.params)
	   	if (context.params.hasOwnProperty(i))
			comp_context.params[i] = context.params[i];
	
	var field_script = script;
	
	var component = script.getAttribute('t');
	var global = aa_componentById(component);
	if (!global) return [];  // should not happen

  var paramDefinitions = ajaxart.childElems(global,"Param");
  new_context.componentContext = comp_context; // context.componentContext || context; 
	 
	for(var i=0;i<paramDefinitions.length;i++)
	{
		 var paramDef = paramDefinitions[i];
		 var param_name = aa_hasAttribute(paramDef,'name') ? paramDef.getAttribute("name") : null;
		 var param_value;

		 if (aa_hasAttribute(paramDef,"type") && (''+paramDef.getAttribute("type")).indexOf("[]") > 0)  //array
		 {
		   var param_value = [];
		   var subprofiles = ajaxart.childElems(field_script,param_name);
		   if (paramDef.getAttribute("script") != "true" ) { 
		     for(var j=0;j<subprofiles.length;j++)
			       ajaxart.concat(param_value, ajaxart.run(data,subprofiles[j],"",new_context) );
		   } else { 
		   	 param_value = { isArrayParamScript: true , script: script, field:param_name, context: new_context };
		   }
		 } else if (paramDef.getAttribute("script") != "true" ) 
		   param_value = ajaxart.run(data,field_script,param_name,comp_context);
     else { // script=true
       param_value = { isParamScript: true };
       param_value.script = ajaxart.fieldscript(field_script, param_name,true,comp_context);
       param_value.compiled = ajaxart.compile(param_value.script,'',comp_context,paramDef.getAttribute("paramVars"));
     }

		 ajaxart.setParameterVariable(new_context,param_name,param_value);
    }
	
	var helperXml = aa_xpath(global,'NativeHelper[@name="'+helpername+'"]');
	if (helperXml.length > 0)
		return ajaxart.run(data,helperXml[0],"",new_context);

	ajaxart.log("calling runNativeHelper for none existing helper - " + helpername);
	return [];
},
dynamicTextWithAggregator: function(item,str,context)
{
	// =Min(person/@age) or =Concat(person/@name,',') or =gstudio.Selected()
	var match = str.match(/=([a-zA-Z.]+)[(]([^)]*)[)]/);
	if (!match) return '';
	var funcName = match[1];
	var ns = "data";
	if (funcName.indexOf('.') > -1) {
		ns = funcName.split('.')[0];
		funcName = funcName.split('.')[1];
	} else {
		if (!ajaxart.components[ns][funcName]) ns='text';
	}

	var params = match[2];
	var params_arr = ajaxart.splitCommasForAggregatorParams(params); 
	if (ajaxart.components[ns][funcName] == null) return '';
	var extraParams = "";
	var itemArr = item ? [item] : [];
	var data = params_arr[0] ? ajaxart.dynamicText(itemArr,"%"+params_arr[0]+"%",context,itemArr) : itemArr;
	for (var i=1; i<params_arr.length; i++) {
		var shortParams = aa_xpath(ajaxart.components[ns][funcName], "Param[@short='true']/@name");
		if (shortParams.length <= i-1) break;
		var paramText = params_arr[i].replace('{','%').replace('}','%');
		extraParams += ' ' + ajaxart.totext_item(shortParams[i-1]) + '="' + paramText + '" ';
	}
	var script = '<Script t="' + ns + '.' + funcName +'"'+ extraParams+ ' />';
	return aa_first(data,aa_parsexml(script,'aggregator'),"",context);
},
dynamicText: function(data,str,context,origData,booleanExpression,xmlescape) 
{
    function expand(data,func,isFirst) {
    	var result = [];
    	for(var i=0;i<data.length;i++)
    		result = result.concat(func(data[i]))
    	if (!data.length && isFirst)
    		result = [func()];

    	return result;
    }
    function xpathFilterForObjects(item,filterExp) {
    	function opValue(op) {
    		var str_match = op.match(/'[^']*'/) || op.match(/"[^"]*"/);
    		if (str_match) return op.slice(1,-1);
    		return ''+item[op];
    	}
    	var equal_exp = filterExp.match(/([^!=]*)(=|!=|==)(.*)/);
    	if (!equal_exp) return false;
    	var oper = equal_exp[2];
    	var op1 = opValue(equal_exp[1]);
    	var op2 = opValue(equal_exp[3]);
   		return 	(oper == '=' && op1 == op2) || 
				(oper == '==' && op1 == op2) ||
				(oper == '!=' && op1 != op2);
    	return false;
    }
    function calcExp(exp) {
		var createIfNotExist = false,byRef=false;
		if (exp[0] == '=') // e.g =Min(person/@age)
			return expand(data,function(elem) { 
				return ajaxart.dynamicTextWithAggregator(elem,exp,context);
			},true);
		if (exp.indexOf('{') != -1 && exp.match(/{[^}]*}/)) // inner vars
			exp = ajaxart.totext(ajaxart.dynamicText(data,exp.replace(/(^|[^\\]){/g,'$1%')
					.replace(/(^|[^\\])}/g,'$1%')
					.replace(/\\({|})/g,'$1'),context));
    	var items = exp.split('/'); // xpath pipline
    	var result = data;
    	for(var i=0;i<items.length;i++) {
    		var item = items[i];
   			var is_hash_filter = item.indexOf('[#') > -1;
    		var filter_match = null;
    		if (item.indexOf('[') != -1) {
    			filter_match = item.match(/([^\[]*)(\[[^\]]*\])/); // elem[@id=15]
    			if (filter_match) item = is_hash_filter ? filter_match[0] : filter_match[1];
    		}
    		if (item.charAt(0) == '!') { 
    			createIfNotExist = true; item = item.substr(1);
    		}
    		if (item.charAt(0) == '>') { 
    			byRef = true; item = item.substr(1);
    		}
    		if (item.charAt(0) == '$') {
    			result = ajaxart.getVariable(context,item.substr(1));
    		} else if (result[0] && result[0].nodeType && result[0].nodeType == 1 && !createIfNotExist && exp.indexOf('/!') == -1 && ! ajaxart.ishtml_item(result[0]) ) { // xml xpath
    			var remaining_xpath = items.slice(i).join('/');
    			return expand(result,function(elem) { 
    				return aa_xpath(elem,remaining_xpath);
    			});
    		} else if (item == '') { 
    			result = result;
    		} else { // 'path1/path2'
    			result = expand(result,function(elem) { 
    				if (elem.nodeType && !ajaxart.ishtml(elem)) return aa_xpath(elem,item,createIfNotExist);
   					var res = elem[item];
    				if (ajaxart.isObject(elem)) { // JSON support
    					if (item == '..' && elem.ParentNode) return [elem.ParentNode()];
    					if (item == '*') {
    						var result = [];
							for (var p in elem) if (elem.hasOwnProperty(p))
								result.push(aa_new_JsonByRef(elem,p));
    						return result;
    					}
						var last = i == items.length -1;
						if (last && byRef) 
							return [ aa_new_JsonByRef(elem,item) ];
						if (res == null && createIfNotExist) res = elem[item] = {};
					}
   					if (res == null) return [];
   					return aa_isArray(res) ? res: [res]; 
    			});
    		}
    		if (filter_match) {
    			var index = parseInt(filter_match[2].slice(1,-1));
    			if (isNaN(index))
    				result = expand(result,function(elem) { 
    					if (is_hash_filter) return [elem];
    					if (elem.nodeType)
    						return aa_xpath(elem,'self::*'+filter_match[2],createIfNotExist);
    					return xpathFilterForObjects(elem,filter_match[2].slice(1,-1)) ? [elem] : [];
    				});
    			else
    				result = result.slice(index-1,index);
    		}
    	}
    	return result;
    }
	if (!str.match(ajaxart.STRING_WITH_EXP)) return [str.replace(/\\%/g,'%')];
	if (str == "%%") return data;
	var oneVar = str.match(/^%\$([a-zA-Z_0-9]+)%$/); // 12% performance boost
	if (oneVar) {
		var result = ajaxart.getVariable(context,oneVar[1]);
		//if (booleanExpression) 
		//	return result[0] ? ['true'] : ['false'];
		return result;
	}
		
    var arr = str.split("%");
    var escaped=[], i=0;
    while (i < arr.length) { // unifying segments - handle escaped \%
        var segment = arr[i];
        while (segment.substr(segment.length-1) === '\\' && i < arr.length-1)
            segment = segment.slice(0,-1) + '%' + arr[++i];
        escaped.push(segment);
        i++;
    }
    if (escaped.length == 2) return [str]; // non closing %
    if (escaped.length == 3 && escaped[0] == '' && escaped[2] == '') { // one variable - return array result
    	try {
    		return calcExp(escaped[1]);
    	} catch(e) {
//    		debugger;
    	}
    }
    var result=[], in_expression = false;
    for(var i=0;i<escaped.length;i++) {
        var segment = escaped[i];
        if (!in_expression) {
            result.push(segment);
            in_expression = true;
        } else if (segment.match(ajaxart.NOT_EXP)) { // auto escaped %. non-closing % followed by space/comma/etc  
            result.push('%' + segment)
            in_expression = true;
        } else {
        	try {
        		var item_to_add = ajaxart.totext_array(calcExp(segment));
                if (booleanExpression) {
                	// wrap with '' if not a number
                	// example: %@type% == 'company' ==> 'company' = 'company'
                	// example: %@%count% > 4        ==> 5 > 4
                	if (! item_to_add.match(/^([0-9]+|[0-9]*\.[0-9]+)$/) )
                		item_to_add = "'" + item_to_add.replace(/'/g, "\\'") + "'";
                }
	            if (xmlescape) item_to_add = aa_xmlescape(item_to_add);
       			result.push(item_to_add);
        	} catch(e) {
//        		debugger;
        	}
            in_expression = false;
        }
    }
    return [result.join('')];
},
newContext: function() {
	return { vars: {_Images: [aa_base_images()] ,_Lib: [aa_base_lib()]} , params: [] ,componentContext: null};
},
clone_context: function(context)
{
	var new_context = ajaxart.newContext();
	for (i in context.vars) {
	   	if (context.vars.hasOwnProperty(i))
			new_context.vars[i] = context.vars[i];
	}
	new_context.params = context.params;
	new_context.componentContext = context.componentContext;
	new_context._This = context._This;
	
	return new_context;
},
setVariable: function(context,varName,varValue)
{
	if (varName == null) return;
	try {
		context.vars[""+varName] = varValue;
	} catch(e) { ajaxart.log("cannot set variable" + varName,"error"); }
},
setParameterVariable: function(context,varName,varValue)
{
	if (varName == null) return;
	try {
		context.params[''+varName] = varValue;
	} catch(e) { ajaxart.log("cannot set param " + varName,"error"); }
},
getVariable: function(context,varName)
{
	if (!varName) return [];
	varName = '' + varName;
	var val = context.params && context.params[varName];
	if (val) {
		if (val.isParamScript) {
			if (val.script) 
				return [val.script];
			else
				return [];
		}
		return val;
	}
	if (varName == "_This" && context._This) return [context._This];
	
	val = context.vars && context.vars[varName];
	if (val) return val;

	var func = context.vars._AppContext && context.vars._AppContext[0].Vars && context.vars._AppContext[0].Vars[varName];
	func = func || context.vars._GlobalVars && context.vars._GlobalVars[0][varName];
	if ('function' == typeof func) 
		val = func(varName,context);
	if (val) return val;
	
	return [];
},
istrue: function(item)
{
	if (!item) return false;
	return (ajaxart.totext(item) == "true");
},
tobool_array: function(arr)
{
	return ajaxart.totext_array(arr) == "true";
},
totext_array: function(arr)
{
	if (arr == null || arr.length == 0) return '';
	return ajaxart.totext_item(arr[0]);
},
totext: function(item) 
{
	if (aa_isArray(item)) return ajaxart.totext_array(item);
	return ajaxart.totext_item(item);
},
totext_item: function(item)
{
	if (item == null || item == undefined) return '';
	if (typeof item == 'string') return item;
	if (item.nodeType && item.nodeType == 2) return item.nodeValue;
	
	if (ajaxart.ishtml_item(item))
		return ajaxart.xml2text(item);

	if (ajaxart.isxml_item(item))
	{
		if (item.nodeValue != null) return item.nodeValue;
		// if has no sub elements : return inner text
   		for (var child = item.firstChild; child; child=child.nextSibling)
			if (child.nodeType == 4 && child.nodeValue) // promote cdata
				return child.nodeValue;
			else if (child.nodeType == 1) 
				return ''; // mixed 
		if (item.text != null) return item.text;
		return item.textContent;
	}
	if (item.GetValue)
		return '' + item.GetValue();

	return '' + item;
},
subprofiles: function (profile,field) 
{
  return ajaxart.childElems(profile,field);
},
runsubprofiles: function (data,profile,field,context,trycatch_oneachitem)
{
	var subProfs = ajaxart.childElems(profile,field);
	var out = [];
	for(var i=0;i<subProfs.length;i++) {
		if (ajaxart.debugmode)
			ajaxart.concat(out,ajaxart.run(data,subProfs[i],'',context) );
		else {
 		  try {
		    ajaxart.concat(out,ajaxart.run(data,subProfs[i],'',context) );
		  }
		  catch(e) {
			if (trycatch_oneachitem != true) throw(e);
			ajaxart.logException(e);
		  }
		}
	}
	return out;
},
each: function(arr,func)
{
	for(var i=0;i<arr.length;i++)
		func(arr[i],i);
},
load_xtml_content: function(xtml_name,xtml)
{
	if (xtml == null) { 
		alert('could not load xtml ' + xtml_name); 
		if (window.console) console.error('could not load xtml ' + xtml_name); 
		return;
	}
	if (xtml.getAttribute("package") == "true") {
		var plugins = ajaxart.childElems(xtml,"*");
		ajaxart.each(plugins,function(plugin_xml) {
			ajaxart.load_xtml_content(xtml_name,plugin_xml);
		});
		return;
	}
	plugin_name = xtml.getAttribute("ns");
	if (! plugin_name || plugin_name == '')
		plugin_name = xtml.getAttribute("id");
	if (! plugin_name || plugin_name == '') {
		ajaxart.log("xtml file does not have ns or id attribute in the main xtml element. Tag: " + aa_tag(xtml), "error");
		ajaxart.log();
		return;
	}
	xtml.setAttribute("file",xtml_name);
		
	var globalsInFile = ajaxart.childElems(xtml,"*");
	ajaxart.each(globalsInFile,function(item) {
		switch (item.tagName) {
		case "Component":
			var id = item.getAttribute("id");
			if (ajaxart.components[plugin_name] == null)
				ajaxart.components[plugin_name] = [];
			ajaxart.components[plugin_name][id] = item;
			aa_load_inplace_gc(item,plugin_name);
			break;
		case "C":
			var id = item.getAttribute("id");
			if (ajaxart.components[plugin_name] == null)
				ajaxart.components[plugin_name] = [];
			ajaxart.components[plugin_name][id] = item;
			break;
		case "Usage":
			if (ajaxart.usages[plugin_name] == null)
				ajaxart.usages[plugin_name] = [];
			
			ajaxart.usages[plugin_name].push(item);
			break;
		case "Plugin":
			if (ajaxart.plugins[plugin_name] == null)
				ajaxart.plugins[plugin_name] = [];
			
			ajaxart.plugins[plugin_name] = item;
			break;
		case "Type":
			var id = item.getAttribute("id");
			ajaxart.types[plugin_name + "_" + id] = item;
			break;
		}
	});
},
parsexml: function(contents, filename, errorMsgOut, onlyWarning,baseXml)
{
	return aa_parsexml(contents, filename, errorMsgOut, onlyWarning,baseXml);
},
childElem: function(parent,elemName)
{
	if ( parent == null || parent.childNodes == null ) return null;
	var node = parent.firstChild;
	while (node)
	{
		if (node.nodeType == 1) {
			if (elemName == "*") return node;
			if (node.tagName == elemName) return node; 
		}
		node=node.nextSibling;
	}
	return null;
},

childElems: function(parent,elemName)
{
	var out = [];
	if ( parent == null || parent.childNodes == null ) return out;
	var node = parent.firstChild;
	while (node)
	{
		if (node.nodeType == 1) {
			if (elemName == "*") out.push(node);
			if (node.tagName == elemName) out.push(node);   
		}
		node=node.nextSibling;
	}
	return out;
},

childElemByAttrValue: function(parent,elemName,attrName,attrValue)
{
	if ( parent == null || parent.childNodes == null ) return null;
	for(var i=0;i<parent.childNodes.length;i++)
	{
		var node = parent.childNodes.item(i);
		if (node.nodeType != 1) continue;
		if (elemName == "*" || node.tagName == elemName) // TODO: if BackEnd run this loop with node.getTagName
			if (node.getAttribute(attrName) == attrValue)
				return node;
	}
	return null;
},
isxml_array: function(arr)
{
	if (arr.length == 0) return false;
	return ajaxart.isxml_item(arr[0]);
},
isxml_item: function(xml)
{
	if (xml == null) return false;
	return (xml.nodeType != null);
},
isxml: function(xml)
{
	if (aa_isArray(xml)) return ajaxart.isxml_array(xml);
	return ajaxart.isxml_item(xml);
},
isObject_array: function(array) {
	return array.length > 0 && ajaxart.isObject(array[0]); 
},
isObject: function(item) {
    if (!item || item.nodeType) return false; 
	var type =  Object.prototype.toString.call(item);
	if (type === '[object Array]' && item.length > 0) 
		return ajaxart.isObject(item[0]);
	return type === '[object Object]';
},
ishtml_array: function(arr)
{
	if (arr.length == 0) return false;
	return ajaxart.ishtml_item(arr[0]);
},
ishtml_item: function(item)
{
	if (!item || !item.ownerDocument || !item.nodeType) return false;
	return (item.body || item.ownerDocument.body) ? true : false;
},
ishtml: function(item)
{
	if (!item) return false;
	if (aa_isArray(item) && item.length > 0) 
		return ajaxart.ishtml_item(item[0]);
	else
		return ajaxart.ishtml_item(item);
},
urlparam: function(strParamName)
{
    var strHref = window.location.href;
    if (strHref.indexOf('#') > -1) strHref = strHref.substr(0,strHref.indexOf("#"));
    if ( strHref.indexOf("?") > -1 ) {
        var strQueryString = strHref.substr(strHref.indexOf("?")+1);
        var aQueryString = strQueryString.split("&");
        for ( var iParam = 0; iParam < aQueryString.length; iParam++ ){
          var aParam = aQueryString[iParam].match(/([^=]*)=(.*)/); 
          if (aParam && aParam[1] == strParamName)
            return aParam[2] && unescape(aParam[2]).replace(/_AMP_/g,'&');
        }
      }
    return "";
},
xtmls: null,
xml: {
	attributeObject: function(parent,attrName)
	{
		if ( parent == null || parent.childNodes == null ) return null;
		for(var i=0;i<parent.attributes.length;i++)
		{
			if (parent.attributes.item(i).nodeName == attrName)
				return parent.attributes.item(i);
		}
		return null;
	}
},
trycatch : function(func, whenerror) {
	if (ajaxart.debugmode)
		return func();
	
	try {
		return func();
	} catch(e) {
		if (e == "endless loop") throw e;
		return whenerror(e);
	};
}
};

function aa_componentById(id,type)
{
	if (!id) return null;
	type = type || 'components';
	var middlePos = id.indexOf('.');
	var ns = id.substring(0,middlePos);
	var compName = id.substr(middlePos+1);
	var result = ajaxart[type][ns] && ajaxart[type][ns][compName];
	if (!result) 
		ajaxart.log('Can not find : ' + id + ' in ' + type,'error');
	return result;
}
function aa_get_default_value(parent_comp,field)
{
	if (!parent_comp) return null;
	var default_value = ajaxart.default_values[parent_comp + "__" + field];
	if (!default_value) {
		var global = aa_componentById(parent_comp);
		var param = ajaxart.childElemByAttrValue(global,"Param","name",field);
		if (param && aa_hasAttribute(param,'Default'))
			default_value = ajaxart.xml.attributeObject(param,"Default");
		else
			default_value = ajaxart.childElem(param,"Default");
		
		field_script = ajaxart.default_values[parent_comp + "__" + field] = default_value || 'none';
	}
	if (default_value === 'none') return null; // === for IE8
	return default_value;
}

function aa_compile(script)
{
	  var xtml = script.getAttribute('Xtml');
	  if (script.getAttribute('Field') != null) return null;
	  
	  if (xtml == null || xtml.length < 4) return null;
	  if (xtml.charAt(0) == '%' && xtml.charAt(1) == '$') {
		  var slashPos = xtml.indexOf('/');
		  if (slashPos == -1) return null;
		  if (xtml.split('/').length != 2) return null;
		  
		  var varName = xtml.substring(2,slashPos);
		  var funcName = xtml.substring(slashPos+1,xtml.length-1);
		  
		  var myFunc = function(varName,funcName) { return function(data,context) { 
			  if (script.getAttribute('Input') != null)
				  data = ajaxart.dynamicText(data,script.getAttribute('Input'),context);
			  
			  var struct = ajaxart.getVariable(context,varName);
			  if (struct == null || ! ajaxart.isObject_array(struct)) { return ajaxart.run(data,script,'',context); }
			  var xtml = struct[0][funcName];
			  if (xtml == null) return [];
			  
			  if (xtml.compiled == "same") return data;
			  
		  	  var newContext = ajaxart.newContext();
		  	  
			  if (xtml.context != null) { // the xtml object comes with its own context
			  	  newContext.params = xtml.context.params;
			  	  newContext.componentContext = xtml.context.componentContext;
			  } 
		      newContext.vars = context.vars;
			  if (xtml.objectForMethod)
				  newContext._This = xtml.objectForMethod[0];
			  
			  if (xtml.compiled == null)
			    return ajaxart.run(data,xtml.script,'',newContext);
			  else
				return xtml.compiled(data,newContext);
			  
		  } }
		  return myFunc(varName,funcName);
	  }
	  return null;
}
function ajaxart_runcompiled_text(compiledFunc, data, profile, field ,context)
{
	if (compiledFunc == 'same') return ajaxart.totext_array(data);
	if (compiledFunc == null)
		return aa_text(data,profile,field,context);
	else
		return ajaxart.totext_array(compiledFunc(data,context));
}
function ajaxart_runcompiled_bool(compiledFunc, data, profile, field ,context, empty_value_is_true)
{
	var text_val;
	if (compiledFunc == 'same') text_val = ajaxart.totext_array(data);
	if (compiledFunc == null)
		return aa_bool(data,profile,field,context,empty_value_is_true);
	else
		text_val = ajaxart.totext_array(compiledFunc(data,context));
    if (text_val == "") return (empty_value_is_true) ? true : false;
    if (text_val == "false") return false;
    if (text_val == "true") return true;

    if (! isNaN(text_val)) return false;// in js : if(2) == true
	var boolean_result = false;
	text_to_eval = "if (" + text_val + ") boolean_result=true;";
	try { eval(text_to_eval); }
	catch(e) { ajaxart.log("Failed to evaluate boolean expression: " + text_val + "," +  e.message
			+ "\n script :" + aa_xtml_path(profile,"id",true),"warning"); }
    return boolean_result;
}

function aa_totext(data)
{
	if (typeof(data) == "string") return data;
	if (data == null || data.length == 0) return "";
	return ajaxart.totext_item(data[0]);
}
function aa_tobool(data)
{
  if (data == null || data.length == 0) return false;
  if (ajaxart.totext_array(data)=="true") return true;
  return false;
}
function aa_frombool(bool) 
{
  return bool ? ["true"] : [];
}
function aa_fromPromise(promise) 
{
	return promise ? [promise] : [];
}
function aa_paramExists(profile,param,excludeEmptyAttribute)
{
  var script = ajaxart.fieldscript(profile,param,true);
  if (script == null) return false;
  if (script.nodeType == 1 && !script.getAttribute('t') && !script.getAttribute('value')) return false;
  if (excludeEmptyAttribute && profile.getAttribute(param) == '') return false;
	  
  return true;
}
function aa_first(data,script,field,params,method) {
	var result = ajaxart.run(data,script,field,params,method);
	if (result.length == 0) return null;
	return result[0];
}
function aa_text(data,script,field,params,method,booleanExpression)
{
	if (booleanExpression) 
		return ajaxart.totext(ajaxart.run(data,script,field,params,method,booleanExpression));
	return ajaxart.totext_array(ajaxart.run(data,script,field,params,method,booleanExpression));
}
function aa_int(data,script,field,params,method)
{
	var result = ajaxart.totext_array(ajaxart.run(data,script,field,params,method));
	if (!result) return null;
	return parseInt(result);
}
function aa_float(data,script,field,params,method)
{
	var result = ajaxart.totext_array(ajaxart.run(data,script,field,params,method));
	if (!result) return null;
	return parseFloat(result);
}
function aa_bool(data,script,field,params,method,empty_value_is_true)
{
	var result = aa_text(data,script,field,params,method,true);

    if (result == "") return (empty_value_is_true) ? true : false;
    if (result == "false") return false;
    if (result == "true") return true;

    if (! isNaN(result)) return false;// in js : if(2) == true
    var boolean_result = false;
    text_to_eval = "if (" + result + ") boolean_result=true;";
    try { 
    	eval(text_to_eval); 
    }	catch(e) { 
    	ajaxart.log("Failed to evaluate boolean expression: " + result + "," +  e.message + "\n script :" + aa_xtml_path(script,"id",true),"warning"); 
    }
    return boolean_result;
}
function aa_tag(item)
{
	return item.tagName;
}
function aa_hasAttribute(elem,attr)
{
	if (window.jBartNodeJS) return jBartNodeJS.hasAttribute(elem,attr);
	return elem.getAttribute(attr) !== null;
}

function aa_gcs(plugin, gcs) {
	if (!ajaxart.gcs[plugin])
		ajaxart.gcs[plugin] = gcs;
	else {
		var plugin = ajaxart.gcs[plugin];
		for (var gc in gcs)
		   	if (gcs.hasOwnProperty(gc))
				plugin[gc] = gcs[gc];
	}
}

function aa_trace_run_for_preview(field_script,data,out,context,origData) {
		for (i=0; i<ajaxart.xtmls_to_trace.length; i++)
		 if (field_script == ajaxart.xtmls_to_trace[i].xtml)
			 ajaxart.fill_trace_result(ajaxart.xtmls_to_trace[i].results,data,out,context,origData);

	if (jBart.previewCircuit) {
		if (ajaxart.xtmls_to_trace && ajaxart.xtmls_to_trace[0].xtml == field_script)	{ // probing current item
			jBart.previewCircuit.itemsFound++;
			if (jBart.previewCircuit.itemsFound >= jBart.previewCircuit.maxItemsToFind) {
				throw { BreakPreviewCircuit:true, message:"Calculation was cut-off after " + jBart.previewCircuit.itemsFound + " items" };
			}
		}
		if (Date.now() - jBart.previewCircuit.startTime > jBart.previewCircuit.maxTime) {
			throw { BreakPreviewCircuit:true, message:"Calculation was cut-off after " + jBart.previewCircuit.maxTime + " ms"};
		}
   }
}
function aa_same(data) { return data; };
