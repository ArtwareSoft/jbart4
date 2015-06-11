ajaxart.load_plugin("xtml");

aa_gcs("xtml", {
  RunXtml: function (profile,data,context)
  {
	  var xtml = ajaxart.run(data,profile,'Xtml',context);
	  if (xtml.length == 0) return [];

	  var method = "";
	  if (aa_hasAttribute(profile,'Method') || ajaxart.childElem(profile,'Method') != null)
		  method = aa_text(data,profile,'Method',context); 

	  var field = "";
	  if (aa_hasAttribute(profile,'Field')) // || ajaxart.childElem(profile,'Field') != null)
		  field = aa_text(data,profile,'Field',context);

	  var input = data;
	  if (aa_hasAttribute(profile,'Input') || ajaxart.childElem(profile,'Input') != null)
		  input = ajaxart.run(data,profile,'Input',context);

	  if (typeof(xtml[0].script) != "undefined" || xtml[0].compiled != null)	// xtml containing script and context
	  {
		  if (typeof(xtml[0].input) != "undefined")
			  if (! aa_bool(data,profile,'ForceInputParam',context) )
				  input = xtml[0].input;

	  	  if (xtml[0].compiled == "same") return input;

	  	  var newContext = ajaxart.newContext();
	  	  
		  if (xtml[0].context) { // the xtml object comes with its own context
		  	  newContext.params = xtml[0].context.params;
		  	  newContext.componentContext = xtml[0].context.componentContext;
		  } 
 	      newContext.vars = context.vars;
		  if (typeof(xtml[0].objectForMethod) != 'undefined')
			  newContext._This = xtml[0].objectForMethod[0];
		  
		  if (xtml[0].compiled == null) {
  		    if (xtml[0].script == null) return null;
		    return ajaxart.run(input,xtml[0].script,field,newContext,method);
		  }
		  else
			return xtml[0].compiled(input,newContext);
	  }
	  
	  if (! ajaxart.isxml(xtml[0]) ) {
		  // dynamic text maybe
		  var result = ajaxart.dynamicText(input,aa_totext(xtml),context,null,false);
		  return [result];
	  }

	  /* var newContext = ajaxart.clone_context(context);	// SLOW. is done because of $InputForChanges - find a way to fix that  
	    */
	  var newContext = {};
	  newContext.vars = context.vars;
	  newContext.componentContext = context.componentContext;
	  newContext.params = [];
	  
	  return ajaxart.run(input,xtml[0],field,newContext,method);
  },
  RunCircuit: function (profile,data,context)
  {
  	var circuit = aa_first(data,profile,'Circuit',context);
  	if (!circuit || !circuit.script || !circuit.context) return [];
  	var input = circuit.OrigData || circuit.Input || [];
  	return ajaxart.run(input,circuit.script,'',circuit.context);
  },
	Profile: function(profile, data, context) {
		return [profile.parentNode];
	},
	RunXtmlByComponentId: function(profile, data, context) {
		var id = aa_text(data, profile, 'ComponentID', context);
		if (id == '') return [];
		var input = ajaxart.run(data, profile, 'Input', context);
		return aa_run_component(id, input, context);
	},
	RunDynamicText: function(profile, data, context) {
		var text = aa_text(data, profile, 'Text', context);
		var relevant_context = aa_first(data, profile, 'Context', context);
		if (relevant_context == null) relevant_context = context;
		var relevant_data = ajaxart.run(data, profile, 'Input', context);
		if (relevant_data == null) relevant_data = data;
		if (relevant_context == null) return [];
		return ajaxart.dynamicText(relevant_data, text, relevant_context);
	},
	RunXtmlAsBoolean: function(profile, data, context) {
		var xtml = ajaxart.run(data, profile, 'Xtml', context);
		var emptyAsTrue = aa_bool(data, profile, 'EmptyAsTrue', context);

		if (xtml.length == 0) return [];

		var method = "";
		if (profile.getAttribute('Method') != null) // || ajaxart.childElem(profile,'Method') != null)
		method = aa_text(data, profile, 'Method', context);

		var field = "";
		if (profile.getAttribute('Field') != null) // || ajaxart.childElem(profile,'Field') != null)
		field = aa_text(data, profile, 'Field', context);

		var input = data;
		if (profile.getAttribute('Input') != null || ajaxart.childElem(profile, 'Input') != null) input = ajaxart.run(data, profile, 'Input', context);

		//	  if (typeof(xtml[0])=="function") {
		//		  var text = aa_totext(xtml[0](input,context));
		//		  var bool = aa_text2bool(text);
		//		  return (bool) ? ["true"] : [];
		//	  }

		if (xtml[0].script != null) // typeof(xtml[0].script) != "undefined")	// xtml containing script and context
		{
			if (emptyAsTrue) if (xtml[0].script.getAttribute(field) == null && aa_xpath(xtml[0].script, field).length == 0) return ["true"];

			if (typeof(xtml[0].input) != "undefined") if (!aa_bool(data, profile, 'ForceInputParam', context)) input = xtml[0].input;

			var newContext = ajaxart.newContext();

			if (xtml[0].context != null) { // the xtml object comes with its own context
				newContext.params = xtml[0].context.params;
				newContext.componentContext = xtml[0].context.componentContext;
			}
			newContext.vars = context.vars;
			if (xtml[0].objectForMethod) newContext._This = xtml[0].objectForMethod[0];

			if (!ajaxart.isxml(xtml[0].script)) {
				ajaxart.log("RunXtml trying to run script not in xml");
				return [];
			}
			var result = aa_bool(input, xtml[0].script, field, newContext, method);
			if (result) return ["true"];
			else return [];
		}

		if (!ajaxart.isxml(xtml[0])) return emptyAsTrue ? ["true"] : [];
		if (emptyAsTrue) if (xtml[0].getAttribute(field) == null && aa_xpath(xtml[0], field).length == 0) return ["true"];

		/* var newContext = ajaxart.clone_context(context);	// SLOW. is done because of $InputForChanges - find a way to fix that  
		 */
		var newContext = {};
		newContext.vars = context.vars;
		newContext.componentContext = context.componentContext;
		newContext.params = [];

		var result = aa_bool(input, xtml[0], field, newContext, method);
		if (result) return ["true"];
		else return [];
	},
	UseParamAsBoolean: function(profile, data, context) {
		var param = aa_text(data, profile, 'Param', context);
		var input = ajaxart.run(data, profile, 'Input', context);

		var paramScript = context.params[param];
		if (aa_isArray(paramScript)) // script='false'
		return paramScript;

		if (paramScript == null || paramScript.script == null) return [];
		if (paramScript.compiled == "same") return input;

		// if we're here we are in script=true

		var newContext = {};
		newContext.vars = context.vars;
		newContext.params = context.componentContext.params;
		newContext.componentContext = context.componentContext.componentContext;

		if (paramScript.compiled == null) return aa_bool(input, paramScript.script, "", newContext);
		else return aa_text2bool(aa_totext(paramScript.compiled(input, newContext)));
	},
	UseParamExcludeVariable: function(profile, data, context) {
		var param = aa_text(data, profile, 'Param', context);
		var excludeVar = aa_text(data, profile, 'ExcludeVariable', context);

		var paramScript = context.params[param];
		if (paramScript == null || paramScript.script == null) return [];

		var newContext = ajaxart.newContext();
		for (i in context.vars) {
			if (i != excludeVar) newContext.vars[i] = context.vars[i];
		}
		newContext.params = context.componentContext.params;
		newContext.componentContext = context.componentContext.componentContext;

		return ajaxart.run(data, paramScript.script, "", newContext);
	},
	ParamEmpty: function(profile, data, context) {
		var paramName = aa_text(data, profile, 'Param', context);
		var param = ajaxart.getVariable(context, paramName);
		if (param == null) return ["true"];
		if (typeof(param.script) != "undefined" || param.length > 0) return [];

		return ["true"];
	},
	ParamsWithChanges: function(profile, data, context) {
		var orig = aa_first(data, profile, 'Params', context);
		var overrides = ajaxart.gcs.xtml.Params(profile, data, context)[0];
		var out = {
			isObject: true
		};
		for (var i in orig)
		out[i] = orig[i];
		for (var i in overrides)
		out[i] = overrides[i];

		return [out];
	},
	CopyAllParams: function(profile, data, context) {
		var out = {};

		for (var i in context.params) {
			var name = i;
			var val = context.params[i];
			if (val.isParamScript == true) {
				out[name] = val;
				out[name].context = context.componentContext;
			} else out[name] = val;
		}

		return [out];
	},
	ScriptParamArrayContents: function(profile, data, context) {
		var param = aa_text(data, profile, 'Param', context);
		var paramValue = context.params[param];
		if (typeof(paramValue) == "undefined" || !aa_isArray(paramValue)) return [];
		out = [];
		for (var i = 0; i < paramValue.length; i++)
		out.push({
			script: paramValue[i],
			context: context.componentContext
		});

		return out;
	},
	Xtml: function(profile, data, context) {
		var xtml = ajaxart.run(data, profile, 'Xtml', context);
		var input = ajaxart.run(data, profile, 'Input', context);
		var definedContext = aa_first(data, profile, 'Context', context);

		if (xtml.length == 0) return [];
		var out = {};
		if (typeof(xtml[0].script) != "undefined") {
			for (i in xtml[0]) out[i] = xtml[0][i];
		} else out = {
			script: xtml[0],
			context: context.componentContext
		};

		if (definedContext != null) out.context = definedContext;
		if (out.context == null) out.context = ajaxart.newContext();

		// put resources as vars as well
		if (context.vars._GlobalVars && !aa_tobool(context.vars._DisableResourcesAsVars)) {
			out.context.vars._GlobalVars = context.vars._GlobalVars;
		}
		if (input.length > 0) out["input"] = input;

		return [out];
	},
	ToScript: function(profile, data, context) {
		data = ajaxart.run(data, profile, 'Xtml', context);
		if (data.length == 0) return [];
		if (typeof(data[0].script) == "undefined") return [];
		return [data[0].script];
	},
	ToInput: function(profile, data, context) {
		if (data.length == 0) return [];
		if (typeof(data[0].input) == "undefined") return [];
		return data[0].input;
	},
	VariableValue: function(profile, data, context) {
		var varName = aa_text(data, profile, 'VarName', context);

		var out = context.vars[varName];
		if (out == null || typeof(out) == "undefined") return [];
		return out;
	},
	UsagesOfPlugin: function(profile, data, context) {
		var plugin = aa_text(data, profile, 'Plugin', context);

		var out = [];
		for (_plugin in ajaxart.usages)
		if (plugin == "" || plugin == _plugin) {
			for (usage in ajaxart.usages[_plugin])
			out.push(ajaxart.usages[_plugin][usage]);
		}
		return out;
	},
	ComponentsOfPlugin: function(profile, data, context) {
		var plugin = aa_text(data, profile, 'Plugin', context);
		var type = aa_text(data, profile, 'Type', context);
		var resultType = aa_text(data, profile, 'Result', context);
		var alsoHidden = aa_bool(data, profile, 'AlsoHidden', context);
		if (plugin.length == 0) return [];

		var out = [];
		var plugin_obj = ajaxart.components[plugin];
		for (i in plugin_obj) {
			if (type.length > 0 && type != plugin_obj[i].getAttribute('type')) continue;

			if (!alsoHidden && "true" == plugin_obj[i].getAttribute('hidden')) continue;

			if (resultType == "full id") out.push(plugin + "." + i);
			else out.push(plugin_obj[i]);
		}
		return out;
	},
	LoadedPlugins: function(profile, data, context) {
		var includeUsages = aa_bool(data, profile, 'IncludeUsages', context);

		var list = {};
		var out = [];
		for (i in ajaxart.components) {
			if (!includeUsages && i.indexOf("usage", i.length - 5) != -1) continue;
			out.push(i);
			list[i] = true;
		}
		if (includeUsages) {
			for (i in ajaxart.usages)
			if (list[i] == null) {
				out.push(i);
				list[i] = true;
			}
		}
		return out;
	},
	LoadComponents: function(profile, data, context) {
		var ns = aa_text(data, profile, 'Namespace', context);
		var comps = ajaxart.run(data, profile, 'Components', context);

		if (ajaxart.components[ns] == null || aa_bool(data, profile, 'ClearNSBefore', context)) ajaxart.components[ns] = [];

		for (var i = 0; i < comps.length; i++) {
			if (!ajaxart.isxml(comps[i])) continue;
			ajaxart.components[ns][comps[i].getAttribute("id")] = comps[i];
			aa_load_inplace_gc(comps[i], ns);
		}

		ajaxart.componentsXtmlCache = [];
		window.aaxtmldt_options_cache = window.ajaxart_light_compoftype = window.ajaxart_comp_of_type_cache = null;

		return ["true"];
	},
	PluginDescriptor: function(profile, data, context) {
		var plugin_name = aa_text(data, profile, 'Plugin', context);
		var plugin = ajaxart.plugins[plugin_name];
		if (typeof(plugin) == "undefined") return [];
		return [plugin];
	},
	AllTypes: function(profile, data, context) {
		var out = [];
		for (var i in ajaxart.types) {
			var ns = ajaxart.types[i].parentNode.getAttribute('ns');
			if (ns == null) ns = ajaxart.types[i].parentNode.getAttribute('id');
			var id = ajaxart.types[i].getAttribute('id');
			var text = ns + "." + id;
			out.push(text);
		}
		return out;
	},
	TypeDefinition: function(profile, data, context) {
		var type = aa_text(data, profile, 'Type', context);
		type = type.replace("\.", "_");
		var typeobj = ajaxart.types[type];
		if (typeobj == null) return [];
		return [typeobj];
	},
	GlobalVariables: function(profile, data, context) {
		var out = [];
		if (context.vars._GlobalVars) for (var i in context.vars._GlobalVars[0])
		out.push(i);
		return out;
	},
	DebugVariableValue: function(profile, data, context) {
		var varName = aa_text(data, profile, 'Variable', context);
		if (varName == "") return [];
		if (ajaxart.debugData && ajaxart.debugData[varName] != null) return ajaxart.debugData[varName];
		return [];
	},
	DebugDataVariables: function(profile, data, context) {
		var out = [];
		for (varName in ajaxart.debugData)
		out.push(varName);
		return out;
	},
	VariablesOfContext: function(profile, data, context) {
		var scriptAndContext = aa_first(data, profile, 'ScriptAndContext', context);
		var out = [];
		var ctx;
		if (scriptAndContext != null && 'context' in scriptAndContext) ctx = scriptAndContext.context;
		else return [];
		for (varName in ctx.params)
		out.push(varName);
		for (varName in ctx.vars) {
			if (varName != '_GlobalVars') out.push(varName);
			else {
				var gvars = ctx.vars._GlobalVars[0];
				for (varName2 in gvars) out.push(varName2);
			}
		}
		return out;
	},
	VariableValueFromContext: function(profile, data, context) {
		var scriptAndContext = aa_first(data, profile, 'ScriptAndContext', context);
		if (!scriptAndContext) return [];
		var varName = aa_text(data, profile, 'Variable', context);
		if (scriptAndContext.context) {
			var val = ajaxart.getVariable(scriptAndContext.context, varName);
			if (val == null) val = [scriptAndContext.context.params[varName]];
			return val;
		}
		return [];
	},
	Logs: function(profile, data, context) {
		var out = [];
		var errors = ajaxart.logs["error"];
		if (errors) {
			for (var i in errors)
			out.push({
				isObject: true,
				Level: "error",
				Log: errors[i]
			});
		}
		for (i in ajaxart.logs)
		if (i != 'error') for (var j in ajaxart.logs[i])
		out.push({
			isObject: true,
			Level: i,
			Log: ajaxart.logs[i][j]
		});

		return out;
	},
	LogContent: function(profile, data, context) {
		var level = aa_text(data, profile, 'Level', context);
		var out = ajaxart.logs[level];
		return (out == null) ? [] : out;
	},
	ActiveLogLevels: function(profile, data, context) {
		var out = [];
		for (i in ajaxart.logs)
		if (i == 'error') // insert at beginning
		out = [i].concat(out);
		else out.push(i);
		return out;
	},
	LoadXtmlFile: function(profile, data, context) {
		var contents = aa_first(data, profile, 'Contents', context);
		if (ajaxart.isxml(contents)) ajaxart.load_xtml_content('', contents);
		return ["true"];
	},
	RunUsage: function(profile, data, context) {
		if (data.length == 0) return data;

		var result = ajaxart.run([""], data[0], "", context);
		if (result.length == 0) // success
		ajaxart.run(data, profile, 'OnSuccess', context);
		else ajaxart.run(data, profile, 'OnFailure', context);
		ajaxart.run(data, profile, 'OnFinish', context);
	},
	CleanLog: function(profile, data, context) {
		var cleanAllLogs = aa_bool(data, profile, 'CleanAllLogs', context);
		var level = aa_text(data, profile, 'Level', context);
		if (cleanAllLogs) logs = {};
		else if (level != "") ajaxart.logs[level] = [];

		return data;
	},
	AllComponentIds: function(profile, data, context) {
		var out = [];
		for (plugin in ajaxart.components)
		for (j in ajaxart.components[plugin])
		out.push(plugin + "." + ajaxart.components[plugin][j].getAttribute("id"));
		return out;
	},
	AllComponentDefinitions: function(profile, data, context) {
		var out = [];
		for (plugin in ajaxart.components)
		for (j in ajaxart.components[plugin])
			out.push(ajaxart.components[plugin][j]);
		return out;
	},
	ComponentIdsOfType: function(profile, data, context) {
		var type = aa_text(data, profile, 'Type', context);
		var out = [];
		for (plugin in ajaxart.components)
		for (j in ajaxart.components[plugin]) {
			if (ajaxart.components[plugin][j].getAttribute("type") == type) out.push(plugin + "." + ajaxart.components[plugin][j].getAttribute("id"));
		}
		return out;
	},
	PartsOfContext: function(profile, data, context) {
		var ctx = aa_first(data, profile, 'Context', context);
		if (ctx == null) return [];
		var part = aa_text(data, profile, 'Part', context);
		var out = [];
		if (part == "Global Variable Names") {
			if (!ctx.vars._GlobalVars) return [];
			for (var j in ctx.vars._GlobalVars[0]) {
				if (j != 'isObject' && j != 'XtmlSource') out.push(j);
			}
		}
		if (part == "Variable Names") {
			for (i in ctx.vars) {
				if (i != "_GlobalVars") out.push(i);
				else for (j in ctx.vars._GlobalVars[0]) {
					if (j != 'isObject' && j != 'XtmlSource') out.push(j);
				}
			}
		} else if (part == "Param Names") {
			for (i in ctx.params)
			out.push(i);
		} else if (part == "Component Context") return [ctx.componentContext];
		return out;
	},
	CurrentContext: function(profile, data, context) {
		return [context];
	},
	ManualContext: function(profile, data, context) {
		var vars = ajaxart.run(data, profile, 'Variables', context);
		var out = ajaxart.newContext();
		for (var i = 0; i < vars.length; i++)
		ajaxart.setVariable(out, vars[i]["Name"], vars[i]["Value"]);
		return [out];
	},
	BuildVersion: function(profile, data, context) {
		return [ajaxart.build_version];
	},
	XtmlOfParamArray: function(profile, data, context) {
		var param = aa_text(data, profile, 'Param', context);
		var paramScript = context.params[param];
		if (aa_isArray(paramScript)) return []; // script='false'

		return aa_xpath(paramScript.script, param);
	},
	ClearComponentsCache: function(profile, data, context) {
		ajaxart.componentsXtmlCache = [];
	}
});


if (!ajaxart.xtml) ajaxart.xtml = {};
ajaxart.run_xtml_object = function(data, xtmlObject, context) {
	var newContext = ajaxart.newContext();

	if (xtmlObject.context != null) { // the xtml object comes with its own context
		newContext.params = xtmlObject.context.params;
		newContext.componentContext = xtmlObject.context.componentContext;
	}
	newContext.vars = context.vars;
	if (xtmlObject.objectForMethod) newContext._This = xtmlObject.objectForMethod[0];

	return ajaxart.run(data, xtmlObject.script, '', newContext);
}
ajaxart.component_exists = function(id) {
	var middlePos = id.indexOf('.');
	var ns = id.substring(0, middlePos);
	var compName = id.substr(middlePos + 1);
	if (ajaxart.components[ns] == null) return false;
	if (ajaxart.components[ns][compName] == null) return false;
	return true;
}
//ajaxart_runMethod = function(data,object,method,context)
//{
//	return ajaxart.runScriptParam(data,object[method],context);
//}

function aa_component_definition(component) {
	if (!component) return null;
	var middlePos = component.indexOf('.');
	var ns = component.substring(0, middlePos);
	var compName = component.substr(middlePos + 1);

	return ajaxart.components[ns] && ajaxart.components[ns][compName];
}

function aa_component_param_def(component_id, param) {
	var comp = aa_component_definition(component_id);
	var param = aa_xpath(comp, "Param[@name='" + param + "']");
	if (param.length > 0) return param[0];
	else return null;
}

function aa_component_param_type(component, param) {
	var type = aa_totext(aa_xpath(component, "Param[@name='" + param + "']/@type"));
	if (type == "") return "data.Data";
	return type;
}