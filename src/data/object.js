ajaxart.load_plugin("object","plugins/data/object.xtml");

ajaxart.gcs.object =
{
  IsObject: function (profile,data,context)
  {
		if (data.length == 0) return [];
		return ajaxart.isObject(data[0]) ? ["true"] : [];
  },
  Object: function (profile,data,context)
  {
	  var out = { };
	  var elem = profile.firstChild;
	  while (elem != null)
	  {
		  if (elem.nodeType == 1) 
		  {
			  var tag = elem.tagName;
			  var name = elem.getAttribute('name');
			  if (name == null || name == "") { elem = elem.nextSibling;  continue; }
			  
			  if (tag == 'Property') {
				  out[name] = ajaxart.run(data,elem,'',context);
			  } else if (tag == 'SingleProperty') {
				  out[name] = aa_first(data,elem,'',context);
			  } else if (tag == 'TextProperty') {
				  out[name] = aa_text(data,elem,'',context);
			  } else if (tag == 'IntegerProperty') {
				  out[name] = aa_int(data,elem,'',context);
			  } else if (tag == 'BooleanProperty') {
				  out[name] = aa_bool(data,elem,'',context);
			  } else if (tag == 'Method') {
				  aa_addMethod(out,name,elem,'',context);
			  }
		  }
	    elem = elem.nextSibling;
	  }
		var atts = profile.attributes;			// adding attributes as properties
		for (var i=0; i < atts.length; i++) {
			var att_name = atts.item(i).nodeName;
			if (att_name != "t" && att_name != "value" && att_name != 'Data' && att_name != "name" && att_name != "Trace")
				out[att_name] = ajaxart.totext_array(ajaxart.dynamicText(data,atts.item(i).nodeValue,context));
		}
			
	  return [out];
  },
  ExtendObject: function (profile,data,context)
  {
	  var overrides = ajaxart.gcs.object.Object(profile,data,context)[0];
	  var out = aa_first(data,profile,'Object',context);
	  if (out == null) return [];
	  for(var i in overrides)
		if (overrides.hasOwnProperty(i))
		  out[i] = overrides[i];
	  
	  var addToProperty = aa_xpath(profile,'AddToProperty');
	  for(var i=0;i<addToProperty.length;i++) {
		  var name = addToProperty[i].getAttribute('name');
		  out[name] = out[name] || [];
		  ajaxart.concat(out[name],ajaxart.run(data,addToProperty[i],'',context));
	  }
	  
	  return [out];
  },
  ObjectFromParams: function (profile,data,context)
  {
	  var out = { isObject: true };

	  for(var i in context.params) {
	 	if (!context.params.hasOwnProperty(i)) continue;
		  var name = i;
		  var val = context.params[i];
		  if (val.isParamScript == true) {
			  out[name] = val;
			  out[name].context = context.componentContext;
		  }
		  else
		    out[name] = val;
	  }
	  
	  var elem = profile.firstChild;
	  while (elem != null)
	  {
		  if (elem.nodeType == 1) 
		  {
			  var tag = elem.tagName;
			  var name = elem.getAttribute('name');
			  if (name == null || name == "") { elem = elem.nextSibling;  continue; }
			  
			  if (tag == 'Property') {
				  out[name] = ajaxart.run(data,elem,'',context);
			  } else if (tag == 'Method') {
				  out[name] = { script: elem , context: context, objectForMethod: [out], compiled: ajaxart.compile(elem,'',context,elem.getAttribute("paramVars")) };
			  }
		  }
	    elem = elem.nextSibling;
	  }

	  return [out];
  },
  Clone: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  if (obj == null) return [];
	  var out = {}
	  for(var i in obj) 
		if (obj.hasOwnProperty(i))
	  		out[i] = obj[i];
	  return [out];
  },
  HasMethod: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var method = aa_text(data,profile,'Method',context);
	  if (obj != null && obj[method] != null) return ["true"];
	  return [];
  },
  FastRunMethod: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var method = aa_text(data,profile,'Method',context);
	  if (obj == null || method == "" || typeof(obj[method]) != 'function') return [];
	  return obj[method](data,context);
  },
  RunMethod: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var method = aa_text(data,profile,'Method',context);
	  var input = data;
	  if (profile.getAttribute("Input") != null || aa_xpath(profile,'Input').length > 0)
        input = ajaxart.run(data,profile,'Input',context);
	  
	  if (obj == null) return [];
	  var scriptParam = obj[method];
	  if (scriptParam == null) return [];
	  var newContext = context;

	  var params = aa_xpath(profile,'Param');
	  if (params.length > 0) newContext = ajaxart.clone_context(context);
	  for(var i=0;i<params.length;i++)
		  newContext.vars[params[i].getAttribute('name')] = ajaxart.run(data,params[i],'',newContext); 

	  if (typeof(scriptParam) == "function") return scriptParam.call(obj,input,newContext);
	  return ajaxart.runScriptParam(input,scriptParam,newContext);
  },
  SetProperty: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var prop = aa_text(data,profile,'Property',context);
	  if (obj == null || prop == "") return [];
	  if (aa_bool(data,profile,'IsSingleProperty',context))
		obj[prop] = aa_first(data,profile,'Value',context);
	  else
	    obj[prop] = ajaxart.run(data,profile,'Value',context);
	  
	  return ["true"];
  },
  ClearProperty: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var prop = aa_text(data,profile,'Property',context);
	  if (obj && prop) delete obj[prop];
  },
  SetTextProperty: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var prop = aa_text(data,profile,'Property',context);
	  if (obj == null || prop == "") return [];
	  obj[prop] = aa_text(data,profile,'Value',context);
  },
  SetNumericProperty: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var prop = aa_text(data,profile,'Property',context);
	  if (obj == null || prop == "") return [];
	  obj[prop] = aa_int(data,profile,'Value',context);
  },
  SetBooleanProperty: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var prop = aa_text(data,profile,'Property',context);
	  if (obj == null || prop == "") return [];
	  obj[prop] = aa_bool(data,profile,'Value',context);
	  
	  return ["true"];
  },
  SetMethod: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var method = aa_text(data,profile,'Method',context);
	  if (obj == null || method == "") return [];

	  var cmpl = ajaxart.compile(profile,'Xtml',context,'');
	  if (cmpl == "same") { 
		  obj[method] = function(data1) { return data1;} 
	  }
	  else if (cmpl != null) {
		  var methodFunc = function(obj,cmpl) { return function(data1,ctx) {
			  var newContext = aa_merge_ctx(context,ctx);
			  newContext._This = obj;
			  return cmpl(data1,newContext);
		  }}
		  obj[method] = methodFunc(obj,cmpl);
	  }
	  else {
		  var methodFunc = function(obj) { return function(data1,ctx) {
			  var newContext = aa_merge_ctx(context,ctx);
			  newContext._This = obj;
			  return ajaxart.run(data1,profile,'Xtml',newContext);
		  }}
		  obj[method] = methodFunc(obj);
	  }
	  
	  return ["true"];
  }, 
  AddToProperty: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  var prop = aa_text(data,profile,'Property',context);
	  var value = ajaxart.run(data,profile,'Value',context);
	  if (obj == null || prop == "") return [];
	  if (obj[prop] == null) obj[prop] = [];
	  ajaxart.concat(obj[prop],value);
	  
	  return ["true"];
  }
}


function aa_addLightMethod(object,method,profile,field,context,paramVars)
{
	var fieldscript = (field == "") ? profile : ajaxart.fieldscript(profile,field,true);
	
    object[method] = { 
      script: fieldscript , context: context, 
      compiled: ajaxart.compile(fieldscript,'',context,paramVars) 
    };
}
function aa_setMethod(object,method,profile,field,context)
{
	var compiled = ajaxart.compile(profile,field,context);
	var init = function(compiled) {
		object[method] = function(data1,ctx) {
			var newContext = aa_merge_ctx(context,ctx);
			newContext._This = object;
			if (compiled == "same") return data1; 
			else if (compiled) 
			  return compiled(data1,newContext);
			else
			  return ajaxart.run(data1,profile,field,newContext);
		}
	}
	init(compiled);
}
function aa_addMethod(object,method,profile,field,context,moreVars)
{
	var compiled = ajaxart.compile(profile,field,context);
	if (compiled == "same") { object[method] = function(data1) { return data1; }; return;}
	var init = function(compiled) {
		object[method] = function(data1,ctx) {
			var newContext = aa_merge_ctx(context,ctx,moreVars);
			newContext._This = object;
			if (compiled) 
			  return compiled(data1,newContext);
			else
			  return ajaxart.run(data1,profile,field,newContext);
		}
	}
	init(compiled);
//	var fieldscript = (field == "") ? profile : ajaxart.fieldscript(profile,field,true);
//	
//    object[method] = { 
//      script: fieldscript , context: context, objectForMethod: [object],
//      compiled: ajaxart.compile(fieldscript,'',context,paramVars) 
//    };
}

function aa_addMethod_js(object,method,jsFunc,context)
{
	object[method] = {	context: context , compiled: jsFunc, objectForMethod: [object] };
}

function aa_runMethod(data,object,method,context)
{
	if (!object || !method ) return [];
	var scriptParam = object[method];
	if (scriptParam == null) return [];
	if (typeof(scriptParam) == "function") return scriptParam.call(object,data,context);
	if (scriptParam.compiled == "same") return data;

	var newContext = { params: scriptParam.context.params 
			, vars: context.vars
			, componentContext: scriptParam.context.componentContext} // TODO: avoid this if paramVars == ""
	
	newContext._This = object;
	
	if (scriptParam.compiled) 
	  return scriptParam.compiled(data,newContext);
  else
    return ajaxart.run(data,scriptParam.script,"",newContext);
	
	return [];
}
