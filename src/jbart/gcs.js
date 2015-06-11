ajaxart.load_plugin("action","plugins/jbart/action.xtml");
ajaxart.load_plugin("jbart","plugins/jbart/jbart.xtml");
ajaxart.load_plugin("","plugins/jbartapp/jbartapp.xtml");
ajaxart.load_plugin("jbart","plugins/jbart/widget.xtml");
ajaxart.load_plugin("jbart","plugins/jbart/jbart_field.xtml");
ajaxart.load_plugin("uiprefs","plugins/ui/uiprefs.xtml");
ajaxart.load_plugin("ui","plugins/ui/page.xtml");
ajaxart.load_plugin("bart_url","plugins/jbart/bart_url.xtml");

aa_gcs("action", {
	WriteValue: function (profile,data,context)
	{
		var into = ajaxart.run(data,profile,'To',context);
		var value = ajaxart.run(data,profile,'Value',context);
		if (ajaxart.isObject_array(into) && into[0].WriteValue) { // value by ref
			if (typeof into[0].WriteValue == "function") // js
				into[0].WriteValue(value,context);
			else
				ajaxart.runScriptParam(value,into[0].WriteValue,context); // xtml
	  } else {
		  ajaxart.writevalue(into,value);
		}
		return ["true"];
	},
	WriteValueWithoutAutoSave: function (profile,data,context)
	{
		var to = ajaxart.run(data,profile,'To',context);
		var value = ajaxart.run(data,profile,'Value',context);
		ajaxart.writevalue(to,value,true);
	},
	RunActionOnItems: function (profile,data,context)
	{
		var items = ajaxart.run(data,profile,'Items',context);
		
		var indicateLast = aa_bool(data,profile,'IndicateLastItem',context);
		var indicateIndex = aa_bool(data,profile,'IndicateItemIndex',context);
		
		for (var i=0;i<items.length;i++)
		{
			var ctx = context;
			if (indicateIndex) ctx = aa_ctx(ctx,{_ItemIndex: [''+i]});
			if (i == items.length-1 && indicateLast) ctx = aa_ctx(ctx,{_IsLastItem: ["true"]}); 
			ajaxart.run([items[i]],profile,'Action',ctx);
		}
	},
	RunActions : function (profile,data,context)
	{
		ajaxart.runsubprofiles(data,profile,'Action',context);
	},
	SetWindowTitle: function (profile,data,context) {
		document.title = aa_text(data,profile,'Title',context);
	},
	JBartDebugAlert: function (profile,data,context) {
		aa_alert( aa_text(data,profile,'Message',context) );
		return data;
	}
});

aa_gcs("bart_url", {
	NewUrlFragment: function (profile,data,context)
	{
		var current = aa_text(data,profile,'Current',context);
		var proposed = aa_text(data,profile,'Proposed',context);

		var curr = current.split('?');
		var prop = proposed.split('?');
		
		var prop_index = "";
		for(var i=1;i<prop.length;i++) {
			if ( prop[i].length > 0 && prop[i].charAt(prop[i].length-1) == ';') prop[i] = prop[i].substring(0,prop[i].length-1);
			
			var item = prop[i].substring(0,prop[i].indexOf('='));
			if (item == '') continue;
			if (i==1) prop_index += ",";
			prop_index = prop_index + item + ",";
		}
		
		var out = "";
		for(var i=1;i<prop.length;i++) {
			var pos = prop[i].indexOf('=');
			if (pos == -1 || pos == prop[i].length-1) continue;
			out += "?" + prop[i];
		}
	
		for(var i=1;i<curr.length;i++) {
			var attr = curr[i].substring(0,curr[i].indexOf('='));
			if (attr.length == 0) continue;
			if (prop_index.indexOf(',' + attr + ',') > -1 ) continue;
//			var _pos = attr.indexOf('_');
//			if (_pos == 0) continue;
//			if (_pos > -1) {
//				var tempPrefix = attr.substring(0,_pos);
//				if (prop_index.indexOf(',' + tempPrefix + ',') > -1 ) continue;
//			}
			out += "?" + curr[i];
		}
		return [out];
	}
});

aa_gcs("ui", {
	CustomCss: function (profile,data,context) {
		var style = aa_first(data,profile,'Style',context);
		if (!style) return [];
		style.Css = aa_text(data,profile,'Css',context);
		return [style];
	},
	CustomStyleByField: function (profile,data,context)
	{
	  return [{
		  Field: function(data1,ctx) { 
		  	return aa_first(data1,profile,'Field',aa_merge_ctx(context,ctx));
	  	  }
	  }];
	},
	CustomStyle: function(profile,data,context)
	{
		var style = {
			Html: aa_text(data,profile,'Html',context),
			Css: aa_text(data,profile,'Css',context),
			Javascript: aa_text(data,profile,'Javascript',context),
			IsTriplet: true,
			params: {}
		};
		var atts = profile.attributes;			// adding attributes as params
		for (var i=0; i < atts.length; i++) {
			var att_name = atts.item(i).nodeName;
			if (att_name != "t" && att_name != "value" && att_name != 'Data' && att_name != "name" && att_name != "Trace")
				style.params[att_name] = ajaxart.totext_array(ajaxart.dynamicText(data,atts.item(i).nodeValue,context));
		}
		return [style];
	}
});

aa_gcs("jbart_jsloader", {
    LoadJavascriptFile: function (profile,data,ctx)
    {
		return [{
			Load:function(data1,context) {
		    	if (! ajaxart.jbart_studio && aa_bool(data,profile,'LoadInDesignTimeOnly',context)) return;
		    	var url = aa_text(data,profile,'Url',context);
		    	jBart.vars.loaded_scripts = jBart.vars.loaded_scripts || {};
		    	if ( jBart.vars.loaded_scripts[url] ) return; // already loaded
	
			    ajaxart_async_Mark(context);
			    jBart.vars.loaded_scripts[url] = true;
			    
		    	ajaxart_RunAsync(data,ajaxart.fieldscript(profile,'EnsureLoaded'),aa_ctx(context,{JsFileUrl: [url]}),function() {
		    		ajaxart_async_CallBack(data,context);
		    	});
			}
		}]
    },
    LoadCssFiles: function (profile,data,ctx)
    {
		return [{
			Load: function(data1,context) {
		    	if (! ajaxart.jbart_studio && aa_bool(data,profile,'LoadInDesignTimeOnly',context)) return;
		    	ajaxart.runNativeHelper(data,profile,'Load',ctx);
			}
		}]
    },
    AutoUsing$: function (profile,data,context)
    {
	    ajaxart_async_Mark(context);
	    $.ajax({ url: aa_totext(context.vars.JsFileUrl), dataType: 'script',
	    	success: function() {
	    		ajaxart_async_CallBack(data,context);
	    	},
	    	error: function() {
	    		ajaxart_async_CallBack(data,context);
	    	}
	    });
    },
    PollingOfJsExpression: function (profile,data,context)
    {
	    var jsExpressionFunc = aa_get_func(aa_text(data,profile,'Expression',context));
	    var pollingTime = aa_int(data,profile,'PollingTime',context);

	    if (jsExpressionFunc()) return; // no need to load anything
	    
	    ajaxart_async_Mark(context);
	    var scriptElement = document.createElement('script');
	    scriptElement.setAttribute('src',aa_totext(context.vars.JsFileUrl));
	    document.body.appendChild(scriptElement);
	    
	    ajaxart_async_Mark(context);

	    function checkIfLoaded() {
	    	if (jsExpressionFunc()) {
	    		ajaxart_async_CallBack(data,context);
	    	} else {
	    		setTimeout(checkIfLoaded,pollingTime);
	    	}
	    }
	    checkIfLoaded();
    },
    CallbackFunction: function (profile,data,context)
    {
    	alert('EnsureLoaded of CallbackFunction is not implemented yet');
    }
});
aa_gcs("bart", {
    PageByID: function (profile,data,context)
    {
		if (!context.vars._AppContext) return [];
    	var pages = context.vars._AppContext[0].Pages;
    	if (!pages) return [];
    	var pageID = aa_text(data,profile,'PageID',context);
		var page = aad_object_byid(pages,pageID);
		if (page) return [page];
		return ajaxart.runNativeHelper(data,profile,'NewPage',context);
		return [];
    },
    HtmlPageTitle: function (profile,data,context)
    {
    	return [{
    		Load: function(data1,ctx) {
    			document.title = aa_text(data,profile,'Title',aa_merge_ctx(context,ctx));
    		}
    	}];
    },
    Javascript: function (profile,data,context1)
    {
    	return [{
   		 Load: function(data1,context) {
	    	if (aa_tobool(context.vars.JBart_OnlyShowPage)) return;
	    	
	    	var js = profile.getAttribute('ScriptOnLoad');
	    	if (!js || js == '') return;
			try {
		    	var func = aa_get_func(js,true);
		    	func(context);
			} catch (e) { 
				ajaxart.log("JavaScript: " + e.message, "error"); 
			}
    	}
    	}];
//    	var elem=document.createElement("script");
//    	elem.setAttribute("type", "text/javascript");
//    	elem.innerHTML = js;
//		document.getElementsByTagName("head")[0].appendChild(elem);
    },
    Page: function (profile,data,context) 
    {
	  var obj = { isObject: true };
	  obj.ID = ajaxart.run(data,profile,'ID',context);
	  obj.ResourceIDs = ajaxart.run(data,profile,'ResourceIDs',context);
	  obj.ResourceID = ajaxart.run(data,profile,'ResourceID',context);
	  obj.Type = ajaxart.run(data,profile,'Type',context);
	  var init = function(page) { 
	    page.Control = function(data1,ctx) {
	      var ctx2 = aa_merge_ctx(context,ctx);
	      ajaxart.runNativeHelper(data,profile,'OverrideUiPrefs',ctx2);
	      var out = [];
	      ajaxart.trycatch( function()  {
		    out = ajaxart.run(data1,profile,'Control',aa_ctx(ctx2, {PageID: page.ID}));
	      }, function (e) {	// catch
	    	  out = $('<div>error showing page</div>').get();
	      });
		  return out;
	    }
	  }
	  init(obj);
	  return [obj];
    }
});

aa_gcs("jbart_resource", {
	Data: function (profile,data,context)   // gc of jbart_reource.Data
	{
		var obj = { Type: "query" };
		obj.Id = aa_text(data,profile,'ResourceID',context);
		obj.ID = [obj.Id];
		obj.CacheIn = aa_first(data,profile,'CacheIn',context);
		obj.FullID = aa_getWidgetIDFromContext(context) + '_' + obj.Id;
		obj.AutoSaveSampleData = aa_bool(data,profile,'AutoSaveSampleData',context); // for the usage of the dt
		var type = obj.Type = aa_text(data,profile,'ValueType',context);
		
		// setting obj.Items
		obj.Items = [];
		
		obj.LoadFromValue = function(value) {
			if (type == 'calculated') return;
			if (type == 'xml clean ns') value = aa_xml_cloneNodeCleanNS(value);
			if (type == 'xml' || type == 'xml clean ns') {
				if (obj.Xml) {
					// already exists (when loading from data source)
					var val = jbart_data(value,'single');
					if (val && val[0]) {
						ajaxart.xml.copyElementContents(obj.Xml,val[0]);
						aa_triggerXmlChange(obj.Xml);
					}
				} else {	// first time					
					obj.Items = jbart_data(value,'single');
					obj.Xml = obj.Items[0];
				}
			}
			if (type == 'text') obj.Items = [ aa_totext([value]) ];
			if (type == 'xml multiple') obj.Items = jbart_data(value,'multiple');
			
			if (typeof(value) != 'string') value = aa_totext([value]);
			
			if (type == 'json to xml') obj.Items = jbart_data(value,'single');
			if (type == 'json') {
				var val = {};
				try {
					val = JSON.parse(value);
				}
				catch(e) { val.error = 'JSON: ' + (e.getMessage ? e.getMessage() : '') + ', parsing value ' } 
				obj.Items = (aa_isArray(val)) ? val : [val];
			}
			if (obj.Type == 'javascript') {
				var val = aa_run_js_code(value,data,context);
				if (val)
				  obj.Items = (aa_isArray(val)) ? val : [val];
			}
		}
		
		if (type == 'calculated') {
			obj.Items = aa_run(data,profile,'Value',context);
		} else {
			if (obj.CacheIn) 
				var value = aa_totext(obj.CacheIn.GetValue(data,aa_ctx(context,{ DataResource: [obj] })));
			else if (type == 'xml' || type == 'xml clean ns') {
				var value = aa_first(data,profile,'Value',context);
			} else {
				var value = aa_cdata_value(aa_xpath(profile,'Value')[0]);
			}
			obj.LoadFromValue(value);
		}
		
		if ((type == 'xml' || type == 'xml clean ns') && obj.CacheIn) {
			obj.XmlChanged = function() {
				if (obj.Saving) return;
				obj.Saving = true;
				setTimeout(obj.SaveXml,200);
			};
			obj.SaveXml = function() {
				obj.CacheIn.Save(data,aa_ctx(context,{ DataResource: [obj]}))
				obj.Saving = false;
			};
			aa_bindXmlChange(obj.Xml,obj.XmlChanged);
		}
		
		obj.DataSource = aa_first(data,profile,'DataSource',context);
		if (obj.DataSource && obj.Xml) {
			var info = aa_getXmlInfo(obj.Xml,context,false);
			info.Save = function(data2,ctx) {
			  obj.DataSource.Save(obj.Items,aa_ctx(context,ctx));
			}
			obj.Load = function(data1,ctx) {
				if (this.DataLoaded) return;
				ajaxart_async_Mark(ctx);
				aad_runMethodAsyncQuery(obj,obj.DataSource.Retrieve,data,aa_merge_ctx(context,ctx),function(result,ctx2){
					obj.DataLoaded = true;
					obj.LoadFromValue(result[0]);
					ajaxart_async_CallBack(data1,ctx);
				});
			}
		}

		return [obj];
	},
	CacheInCookies: function (profile,data,context)
	{
		return [{
			GetValue: function(data1,ctx) {
				var resource = ctx.vars.DataResource[0];
				var out = aa_valueFromCookie(resource.FullID);
				return out ? [out] : [];
			},
			Save: function(data1,ctx) {
				var resource = ctx.vars.DataResource[0];
				if (resource.Items[0]) {
				  aa_writeCookie(resource.FullID,ajaxart.xml2text(resource.Items[0]));
				}
			}
		}];
	},
	CacheInLocalStorage: function (profile,data,context)
	{
		return [{
			GetValue: function(data1,ctx) {
				var resource = ctx.vars.DataResource[0];
				var out = window.localStorage[resource.FullID];
				return out ? [out] : [];
			},
			Save: function(data1,ctx) {
				var resource = ctx.vars.DataResource[0];
				if (resource.Items[0]) {
					window.localStorage[resource.FullID] = ajaxart.xml2text(resource.Items[0]);
				}
			}
		}];
	}
});
aa_gcs("bart_resource", {
	ResourcesToGlobalVars: function (profile,data,context)
	{
		if (! context.vars._GlobalVars) return;
		var globals = context.vars._GlobalVars[0];
		var bc = context.vars._AppContext[0];
		var resources = bc.Resources;
		for(var i=0;i<resources.length;i++) {
			init(globals,resources[i]);
		}
		
		function init(globals,resource) {
			var id = aa_totext(resource.ID);
			globals[id] = function() { return resource.Items; };			
		}
	},
	Value: function (profile,data,context)
	{
		var obj = { isObject:true , Type: "value" }
		obj.Id = aa_text(data,profile,'ResourceID',context);
		obj.ID = [obj.Id];
		obj.FullID = aa_getWidgetIDFromContext(context) + '_' + obj.Id;		
		obj.Items = ajaxart.run(data,profile,'Value',context);
		
		return [obj];
	},
	Xml: function (profile,data,context)
	{
		var obj = { isObject:true , Type: "query" }
		obj.Id = aa_text(data,profile,'ResourceID',context);
		obj.ID = [obj.Id];
		obj.Mode = aa_text(data,profile,'Mode',context);
		obj.Storage = aa_text(data,profile,'Storage',context);
		obj.FullID = aa_getWidgetIDFromContext(context) + '_' + obj.Id;
		obj.AutoSaveSampleData = aa_bool(data,profile,'AutoSaveSampleData',context); // for the usage of the dt
		
		var nameOfGlobalVar = 'jBartWidget_' + ajaxart.totext(context.vars.WidgetId) + '_' + obj.Id; 
		if ( window[nameOfGlobalVar] )
			obj.Xml = window[nameOfGlobalVar][0] || aa_parsexml('<xml/>');
		else if (obj.Storage == '' || obj.Storage == 'in memory')
		  obj.Xml = aa_first(data,profile,'Xml',context);
		else {
			var textval = '';
			if (obj.Storage == 'cookie') 
			  textval = aa_valueFromCookie(obj.FullID);
			if (obj.Storage == 'local storage' && window.localStorage) 
				textval = window.localStorage[obj.FullID];
			
			if (textval == null || textval == '') 
				obj.Xml = aa_first(data,profile,'Xml',context);
			else
				obj.Xml = aa_parsexml(textval);
			
			if (!obj.Xml) obj.Xml = aa_parsexml('<xml/>');
			function init(obj) {
				obj.XmlChanged = function() {
					if (obj.Saving) return;
					obj.Saving = true;
					setTimeout(obj.SaveXml,200);
				}
				obj.SaveXml = function() {
					if (obj.Storage == 'cookie')
					  aa_writeCookie(obj.FullID,ajaxart.xml2text(obj.Xml));
					if (obj.Storage == 'local storage' && window.localStorage) {
						window.localStorage[obj.FullID] = ajaxart.xml2text(obj.Xml);
					}
					obj.Saving = false;
				}
				aa_bindXmlChange(obj.Xml,obj.XmlChanged);
			}
			init(obj);
		}
		if (!obj.Xml) return [obj];
		obj.Items = ( obj.Mode == 'single' ? [obj.Xml] : aa_xpath(obj.Xml,'*') ); 
		
		obj.DataSource = aa_first(data,profile,'DataSource',context);
		if (obj.DataSource) {
			var info = aa_getXmlInfo(obj.Xml,context,false);
			info.Save = function(data2,ctx) {
				obj.DataSource.Save([obj.Xml],aa_ctx(context,ctx));
			}
			obj.Load = function(data1,ctx) {
				if (this.DataLoaded) return;
				ajaxart_async_Mark(ctx);
				aad_runMethodAsyncQuery(obj,obj.DataSource.Retrieve,data,aa_ctx(context,ctx),function(result,ctx2){
					obj.DataLoaded = true;
					if (result.length > 0) ajaxart.xml.copyElementContents(obj.Xml,result[0]);
					ajaxart_async_CallBack(data1,ctx);
				});
			}
		}
		return [obj];
	},
	Javascript: function (profile,data,context)
	{
		try {
	    	var func = aa_get_func(profile.getAttribute('Code'));
	    	var out = func(context);
	    	return [out];
		} catch (e) { 
			ajaxart.log("JavaScript: " + e.message, "error"); 
		}
	}
});


aa_gcs("data_items", {
	Items: function (profile,data,context)
	{
		var out = {};

		out.ItemTypeName = ajaxart.run(data,profile,'ItemTypeName',context);
		out.Items = ajaxart.run(data,profile,'Items',context);

		var refreshFunc = function(out) { this.run = function() { out.Items = ajaxart.run(data,profile,'Items',context); return ["true"];} };
		ajaxart_addScriptParam_js(out,'Refresh',new refreshFunc(out).run,context);

		var newContext = aa_ctx(context,{_Items: [out]} );
		ajaxart.runsubprofiles(data,profile,'Aspect',newContext);
		
		if (! out.Subset) {
			out.Subset = function(data1,ctx) { 
				var subset = { isObject: true, Items: ctx.vars._InnerItem };
				return [subset];
			}
		}
		return [out];
	},
	AddXmlItem: function (profile,data,context)
	{
		var dataitems = context.vars._Items[0];
		var parent = aa_first(data,profile,'Parent',context);
		dataitems.SubsetForNewItem = function(data1,ctx) {
			var newXml = aa_parsexml( aa_text(data,profile,'NewItem',context) ,'', '', false,parent);
			if (!newXml) return;
			var innerItems = { isObject: true, Items: [newXml]};
			if (parent && newXml && parent.appendChild) {
				parent.appendChild(newXml);
			}
			innerItems.Cancel = function() {
				parent.removeChild(newXml);
			}
			return [innerItems];
		}
	}
});
aa_gcs("uiaction",{
	AddCssClass: function(profile, data, context) {
	  	var field_id = aa_text(data,profile,'AddTo',context);
		var elem = aad_find_field(field_id,null);
		$(elem).addClass( aa_text(data,profile,'Class',context) );
	}
});
aa_gcs("operation", {
	ClickOnButton: function(profile, data, context) {
	  	var field_id = aa_text(data,profile,'Button',context);
	  	if (!field_id) return;
	  	var btn = null,controlElement = aa_var_first(context,'ControlElement');
	  	if (controlElement) btn = $(controlElement).find('.fld_'+field_id)[0];
	  	if (!btn) {
				var top = aa_intest ? aa_intest_topControl : document;
		  	var btn = $(top).find('.fld_'+field_id)[0];
		  }
	  	if (!btn) return;
	  	
	  	if (btn.jbButtonElement)
	  		$(btn.jbButtonElement).trigger("click");
	  	else
	  		if (btn.jbApiObject && btn.jbApiObject.action) btn.jbApiObject.action();
	},
	SelectTextInTextBox: function(profile, data, context) {
	  	var field_id = aa_text(data,profile,'Textbox',context);
	  	var input = aa_find_field_input(aa_find_field(context,field_id)[0]);
	  	if (input) input.select();
	},
	SelectFromPicklist: function(profile, data, context) {
	  	var field_id = aa_text(data,profile,'FieldID',context);
	  	var optionCode = aa_text(data,profile,'OptionCode',context);

	  	var top = aa_var_first(context,'ControlElement') || 'body';
	  	var picklist_ctrl = $(top).find('.fld_'+field_id)[0];
	  	if (picklist_ctrl && picklist_ctrl.jbApiObject && picklist_ctrl.jbApiObject.setValue)
	  		picklist_ctrl.jbApiObject.setValue(optionCode);
	}

});

aa_gcs("text",{
});

aa_gcs("xml",{
	AttributeName: function(profile,data,context)
	{
		if (ajaxart.isxml(data) && data[0].nodeType == 2) 
			return [ data[0].nodeName ];
		return [];
	},
	AddChildren: function(profile, data, context) {
		var inputForChanges = ajaxart.getVariable(context,"InputForChanges");
		var children = ajaxart.run(inputForChanges,profile, 'Children', context);
		var clone = aa_bool(inputForChanges,profile,'CloneChildren',context);
		
		if (data.length == 0) return [];
		var imported_items = [];
		for(var i=0;i<children.length;i++) {
			var item = aa_importNode(children[i],data[0]);
			imported_items.push(item);
			if (!clone)
				aa_xml_appendChild(data[0],item);
			else
				aa_xml_appendChild(data[0],ajaxart.xml.clone([item]));
		}
		if (children.length > 0) aa_triggerXmlChange(data[0]);
		ajaxart.run(imported_items,profile, 'RunOnChildren', context)
		return data;
	},
	Attributes: function(profile,data,context)
	{
		var alsoEmpty = aa_bool(data,profile,'AlsoEmpty',context);
		
		if (ajaxart.isxml(data) && data[0].nodeType == 1)
		{
			var out = [];
			var atts = data[0].attributes;
			if (atts != null)
				for (var i = 0; i < atts.length; i++) {
					if (alsoEmpty) out.push(atts.item(i));
					else if (atts.item(i).nodeValue != "") out.push(atts.item(i));
				}
			
			return out;
		}
		return [];
	},
	Duplicate : function(profile, data, context) {
		var element = ajaxart.run(data,profile, 'Element', context);
		var inputforChanges = ajaxart.getVariable(context,"InputForChanges");
		var items = ajaxart.run(inputforChanges,profile, 'Items', context);
		var Separator = ajaxart.run(data,profile, 'Separator', context);
		var SeparatorAround = aa_bool(data,profile,'SeparatorAround',context);
		var bindToSeparator = ajaxart.run(data,profile,'BindToSeparator',context);
		
		if (element.length == 0 || element[0].nodeType != 1) return []; 
		var parent = element[0].parentNode;
		if (Separator[0] != null && SeparatorAround)
			{
				var toAdd = ajaxart.xml.clone(Separator);
				if (Separator[0].ajaxart != null) toAdd.ajaxart = Separator[0].ajaxart;
				parent.appendChild(toAdd);
			}
		var local_context = ajaxart.clone_context(context); 
		for (var i=0; i<items.length; i++) {
			var item = items[i];
			var new_item = ajaxart.xml.clone(element);
			ajaxart.setVariable(local_context,"InputForChanges",[item]);
			ajaxart.setVariable(local_context,"DuplicateIndex",[ "" + (i+1)]);
			var changes = ajaxart.subprofiles(profile,'ChangeOnElement');
			ajaxart.each(changes,function(changeProfile) {
				ajaxart.run([new_item],changeProfile, "", local_context);
			});
			if (i==0) {
				var changes = ajaxart.subprofiles(profile,'ChangeOnFirstElement');
				ajaxart.each(changes,function(changeProfile) {
					ajaxart.run([new_item],changeProfile, "", local_context);
				});
			}
			parent.appendChild(new_item);
			if (Separator[0] != null)
				if (i+1 < items.length || SeparatorAround)
				{
					var toAdd = ajaxart.xml.clone(Separator);
					if (Separator[0].ajaxart != null) toAdd.ajaxart = Separator[0].ajaxart;
					parent.appendChild(toAdd);
				}
		}
		parent.removeChild(element[0]);
		return ["true"];
	},
	Parent: function(profile, data, context) {
		if (! ajaxart.isxml(data)) return [];
		if (data[0].nodeType == 1 && data[0].parentNode != null) 
			return [ data[0].parentNode ];
		return [];
	},
	SetAttribute: function(profile, data, context) 
	{
		var inputForChanges = ajaxart.getVariable(context,"InputForChanges");
		var newValue = aa_text(inputForChanges,profile, 'Value', aa_ctx(context,{ _XmlNode: data }));
		var attrName = aa_text(inputForChanges,profile, 'AttributeName', context);
		if (attrName == "") { return; }
		var removeEmptyAttribute = aa_bool(data,profile, 'RemoveEmptyAttribute', context);
		var changed = false;
		
		for(var i=0;i<data.length;i++) {
			var xml = data[i];
			if (!ajaxart.isxml(xml) || xml.nodeType != 1)
				return;
			if (newValue != "" && xml.getAttribute(attrName) == newValue) continue;
			
			if (newValue != "")
				xml.setAttribute(attrName,newValue);
			else { // empty
				if (aa_bool(data,profile, 'RemoveEmptyAttribute', context))
					xml.removeAttribute(attrName);
				else
					xml.setAttribute(attrName,"");
			}
			changed = true;
		}
		if (changed) aa_triggerXmlChange(data[0]);
		
		return [newValue];
	},
	Tag: function(profile, data, context) {
		var removeNamespace = aa_bool(data,profile, 'RemoveNamespace', context);
		if ( !ajaxart.isxml(data) ) return [];
		
		var xml = data[0];
		if (xml.nodeType == 2 ) {// attribute
			xml = aa_xpath(xml,'..')[0];
			if (!xml) return [];
		}
		
		var tag = aa_tag(xml);
		if ( removeNamespace )
			return [tag.replace(/.*:/,"")];
		else
			return [tag];
		
		return [];
	},
	WithChanges: function(profile, data, context) {
		//$("#ajaxart_trace_control").append(ajaxart.xml.xpath_of_node(profile,"id",true) + '<br/>');
		var xml_src = ajaxart.run(data,profile,'Xml',context);
		var newContext = ajaxart.clone_context(context);
		ajaxart.setVariable(newContext,"InputForChanges",data);
		var out = [];
		ajaxart.each(xml_src, function(item) {
			var xml = item;
			if ( ! ajaxart.ishtml(item) && aa_bool(data,profile,'CloneXml',context))
			  xml = ajaxart.xml.clone([item]);
				
			var changes = ajaxart.subprofiles(profile,'Change');
			ajaxart.each(changes,function(changeProfile) {
				ajaxart.run([xml],changeProfile, "", newContext);
			});
			out.push(xml);
		});
		return out;
	},
	Wrap: function(profile, data, context) {
		if ((!ajaxart.isxml(data)) || data[0].nodeType == 9) { return []; } // Document 

		var headtag = aa_text(data,profile,'HeadTag',context);
		var head = aa_first(data,profile, 'Head', context);
		if (head == null) {
			if (headtag == "") return [];
			head = aa_createElement(data[0],headtag);
		}
				
		if (! ajaxart.ishtml(data))
		{
			for(var i=0;i<data.length;i++)
				aa_xml_appendChild(head,data[i].cloneNode(true));
		}
		else
		{
			for(var i=0; i<data.length; i++)
				aa_xml_appendChild(head,data[i]);
		}
		
		return [head];
	},
	Xml: function(profile, data, context) {
		var dynamicContent = profile.getAttribute('DynamicContent') == 'true';
		var xmlescape = profile.getAttribute('EncodeDynamicContent') != 'false';

		var child = ajaxart.childElem(profile,"*");
		if (child == null) 
			return [ aa_createElement(data[0],'xml') ];

	  if (!dynamicContent)
		{
			return [ ajaxart.xml.clone([child]) ];
		} else {  // dynamic content
	    	var text = ajaxart.xml2text(child);
	    	var newxml_text = ajaxart.dynamicText(data,text,context,data,false,xmlescape)[0];
	    	var out = aa_parsexml(newxml_text);
	    	if (out != null) return [out];
	    	return [];
	    }
	},
	XmlItems: function (profile,data,context)
	{
		var dataitems = { isObject: true }
		dataitems.ParentXml = aa_first(data,profile,'Parent',context);
		var tag = aa_text(data,profile,'Tag',context);
		dataitems.Tag = tag;
		if (tag.indexOf(',') > -1) {  // more than one tag
			var tags = tag.split(',');
			dataitems.Tag = tags[0];
			dataitems.AllTags = tags;
		}
		dataitems.ItemTypeName = aa_text(data,profile,'ItemTypeName',context);
		if (dataitems.ItemTypeName == "")
			dataitems.ItemTypeName = aa_text_capitalizeToSeperateWords( ajaxart_multilang_text(tag,context) );
		
		var init = function(dataitems) 
		{
			dataitems.InitXmlItem = function(xml) 
			{
				var info = aa_getXmlInfo(xml,context);
				info.DataItems = dataitems;
				info.PrepareForEdit = function() {
					this.OriginalCopy = this.Xml.cloneNode(true);
				}
				info.Cancel = function(data1,ctx2) {
					if (aa_tobool(ctx2.vars.IsNewItem))
						this.Delete(data1,ctx2);
					else if (this.OriginalCopy)
					  ajaxart.xml.copyElementContents(this.Xml,this.OriginalCopy);
				}
				info.Delete = function() {
					xml.parentNode.removeChild(xml);
					aa_removeXmlInfo(xml);
					aa_triggerXmlChange(this.DataItems.ParentXml);
					for(var i=0;i<dataitems.Items.length;i++) {
						if (dataitems.Items[i] == xml) { dataitems.Items.splice(i,1); break;} 
					}
					aa_triggerXmlChange(dataitems.ParentXml);				
				}
			}
			dataitems.Refresh = function(data1,ctx) {
				if (!dataitems.AllTags)
				  dataitems.Items = (dataitems.Tag != "") ? aa_xpath(dataitems.ParentXml,dataitems.Tag) : [];
				else {
					dataitems.Items = [];
					for(var i in dataitems.AllTags)
						if (dataitems.AllTags.hasOwnProperty(i))
							ajaxart.concat(dataitems.Items,aa_xpath(dataitems.ParentXml,dataitems.AllTags[i]));
				} 
				if (aa_paramExists(profile,'ElementCondition')) {
					var newItems = [];
					for(var i=0;i<dataitems.Items.length;i++)
						if (aa_bool([dataitems.Items[i]],profile,'ElementCondition',context))
							newItems.push(dataitems.Items[i]);
					
					dataitems.Items = newItems;
				}
				for(var i=0;i<dataitems.Items.length;i++)
					dataitems.InitXmlItem(dataitems.Items[i]);
			}
			dataitems.DeleteItem = function(data1,ctx) {
				var info = aa_getXmlInfo(data1[0],context);
				if (info.Delete) return info.Delete(data1,ctx);
			}
			dataitems.SubsetForNewItem = function(data1,ctx) {
				var tag = dataitems.Tag;
				if ( dataitems.AllTags && aa_totext(ctx.vars._NewItemTag) != "" ) {
					tag = aa_totext(ctx.vars._NewItemTag);
					if ( dataitems.AllTags.join(',').indexOf(tag) == -1) tag = dataitems.Tag; 
				}
				var item = aa_createElement(dataitems.ParentXml,tag);
				ajaxart.run([item],profile,'DoOnNewItem',context);
				var info = aa_getXmlInfo(item,context);
				info.DataItems = dataitems;
				info.Save = function(data2,ctx2) {
					var dataitems = this.DataItems;
					if (!dataitems.ParentXml) return [];
					dataitems.ParentXml.appendChild(this.Xml);
					aa_triggerXmlChange(dataitems.ParentXml);
					dataitems.Items.push(item);
					dataitems.InitXmlItem(item);
				}
				var subset = { isObject: true , Items: [item]};
				subset.Save = function(data2,ctx2) {
					var info = aa_getXmlInfo(this.Items[0],context);
					info.Save([info.Xml],ctx);
				}
				if (aa_tobool(ctx.vars._DataItemsImmediateAdd)) {
					subset.Save([],ctx);
					subset.Save = function(data1,ctx2) {
						if (subset.Items.length == 0) return [];
						var info = aa_getXmlInfo(subset.Items[0],ctx2);
						info.Save(data1,ctx2);
					}
				}
				
				return [subset];
			}
			dataitems.Subset = function(data1,ctx) 
			{
				var item = ctx.vars._InnerItem[0];
				var subset = { isObject: true, ItemTypeName: dataitems.ItemTypeName , Items: [item]}
				var info = aa_getXmlInfo(item,context);
				subset.DeleteItem = info.Delete;
				subset.Cancel = info.Cancel;
				subset.Save = function() {}
				if (info.PrepareForEdit) info.PrepareForEdit();
				return [subset];
			}
			dataitems.CanPasteFromDataItems = function(draggedDataItems,ctx) {
				if (aa_paramExists(profile,'CanPasteItem')) {
			      return aa_frombool( aa_bool([draggedDataItems],profile,'CanPasteItem',aa_ctx(context,{_Items: [this]})) );
				}
				if (draggedDataItems[0].Tag && dataitems.Tag && draggedDataItems[0].Tag == dataitems.Tag)
					return ['true'];
				return [];
			}
			dataitems.MoveBefore = function(data1,ctx) {
				if (data1.length == 0) return [];
			    var item = data1[0].Item[0];
			    var to = data1[0].BeforeItem[0];
				if (ajaxart.isxml(to) && ajaxart.isxml(item) )
					if (to.ownerDocument == item.ownerDocument && item.ownerDocument != null)
						to.parentNode.insertBefore(item,to);

				aa_triggerXmlChange(dataitems.ParentXml);				
				dataitems.Items = aa_xpath(dataitems.ParentXml,dataitems.Tag);
				return ["true"];
			}
			dataitems.MoveToEnd = function(data1,ctx) {
				if (data1.length == 0) return [];
			    var item = data1[0];
				if (dataitems.ParentXml == null)
					return [];
				dataitems.ParentXml.appendChild(item);
				dataitems.Items = aa_xpath(dataitems.ParentXml,dataitems.Tag);
				aa_triggerXmlChange(dataitems.ParentXml);				
				
			    return ["true"];
			}
			dataitems.SetNewOrder = function(items,ctx) {
				if (items.length == 0) return [];
				if (!dataitems.ParentXml) return [];
				if ($(dataitems.ParentXml).find('>*').length != items.length) return [];
				$(dataitems.ParentXml).empty().append(items);
				dataitems.Items = aa_xpath(dataitems.ParentXml,dataitems.Tag);
				aa_triggerXmlChange(dataitems.ParentXml);				
				
			    return ["true"];
			}

		}
		init(dataitems);
		dataitems.Refresh(data,context);
		ajaxart.runsubprofiles(data,profile,'Aspect',aa_ctx(context, {_Items: [dataitems]}));
		
		return [dataitems];
	}
});

aa_gcs("xtml", {
	  UseAndTranslateParam: function (profile,data,context)
	  {
		  var param = aa_text(data,profile,'Param',context); 
		  var input = ajaxart.run(data,profile,'Input',context);
		  
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
		  
		  if (paramScript.script.nodeType == 2) // attribute, we can translate it
			  return ajaxart_multilang_run(input,paramScript.script,'',newContext);
		  
		  if (paramScript.compiled == null)
			  return ajaxart.run(input,paramScript.script,"",newContext);
		  else  
			  return paramScript.compiled(input,newContext);
	  },
	  ComponentDefinition: function (profile,data,context)
	  {
		return ajaxart.make_array(data,function(item) {
		   var id = aa_text(item,profile,'ID',context);
		   if (id == "")
			   return null;
		   var toXtml = aa_bool(item,profile,'ToXtml',context);
		   try {
			 var middlePos = id.indexOf('.');
			 var ns = id.substring(0,middlePos);
			 var compName = id.substr(middlePos+1);

			 if (ajaxart.components[ns] == null) return [];
			 var global = ajaxart.components[ns][compName];
		   } catch(e) { ajaxart.log("ComponentDefinition: cannot find component " + id); return [];}
		   
		   if (toXtml)
			   return ajaxart.childElem(global,"xtml");
		   else
			   return global;
		   
		},true);
	  },
	  ComponentsOfType: function (profile,data,context)
	  {
		  if ( ! window.ajaxart_comp_of_type_cache ) {
			  ajaxart_comp_of_type_cache = {};
			  ajaxart_comp_of_type_advanced_cache = {};
			  for (var i in ajaxart.components) {
				  var advanced = false;
				  if (i.lastIndexOf("_dt") == i.length-3 && i.length > 3 || i == "aaeditor") advanced = true;
				  for(var j in ajaxart.components[i]) {
					  var comp = ajaxart.components[i][j];
					  if (comp.getAttribute('hidden') == 'true' || comp.getAttribute('deprecated') == 'true') continue;
//					  if (! advanced && comp.getAttribute('advanced') == "true") advanced = true;
					  var types = (comp.getAttribute('type') || '').split(',');
					  for(var k=0;k<types.length;k++) {
						  if (types[k].split('.').length > 2) // e.g. data_items.Items.PageData
							  types.push(types[k].substring(0,types[k].lastIndexOf('.')));
					  }
					  var category = comp.getAttribute('category');
					  if (category) types.push(types[0]+'.'+category);
					  
					  for(var t in types)
					  {
						  var type = types[t];
						  if (!advanced) {
							if (ajaxart_comp_of_type_cache[type] == null) ajaxart_comp_of_type_cache[type] = [];
							ajaxart_comp_of_type_cache[type].push("" + i + "." + j);
						  }
						  else {
						    if (ajaxart_comp_of_type_advanced_cache[type] == null) ajaxart_comp_of_type_advanced_cache[type] = [];
						    ajaxart_comp_of_type_advanced_cache[type].push("" + i + "." + j);
						  }
					  }
				  }
			  }
		  }
		  
		  var type = aa_text(data,profile,'Type',context);
		  var out = ajaxart_comp_of_type_cache[type];

		  if (aa_bool(data,profile,'ForAllTypes',context)) {
			  ajaxart.concat(out,ajaxart_comp_of_type_advanced_cache[type]);
			  ajaxart.concat(out,ajaxart_comp_of_type_cache["*"]);
		  }
		  
		  if (out == null) out = [];
		  return out;
	  },
	  Params: function (profile,data,context)
	  {
		  var out = { isObject: true };
		  var elem = profile.firstChild;
		  while (elem != null)
		  {
			  if (elem.nodeType == 1) 
			  {
				  var tag = elem.tagName;
				  var name = elem.getAttribute('name');
				  if (name == null || name == "") { elem = elem.nextSibling;  continue; }
				  
				  if (tag == 'Param') {
					  out[name] = ajaxart.run(data,elem,'',context);
				  } else if (tag == 'ScriptParam') {
					  out[name] = { script: elem , context: context, compiled: ajaxart.compile(elem,'',context,elem.getAttribute("paramVars")) };
				  } else if (tag == 'Method') {
					  out[name] = { script: elem , context: context, objectForMethod: [out], compiled: ajaxart.compile(elem,'',context,elem.getAttribute("paramVars")) };
				  } else if (tag == 'ScriptParamArray') {
					  var scriptArr = ajaxart.run(data,elem,'',context);
				      var value = [];
					  for(var j=0;j<scriptArr.length;j++)
						value.push( { script: scriptArr[j] , context: context.componentContext } );
					  
					  out[name] = value;
				  }
			  }
		    elem = elem.nextSibling;
		  }
				
		  return [out];
	  },
	  UseParam: function (profile,data,context)
	  {
		  var param = aa_text(data,profile,'Param',context); 
		  var input = ajaxart.run(data,profile,'Input',context);

		  var paramScript = context.params[param];
		  if (aa_isArray(paramScript)) // script='false'
			  return paramScript;

		  if (typeof(paramScript) == 'function') return paramScript(input,context);
		  
		  if (paramScript == null || paramScript.script == null) 
			  return [];
		  if (paramScript.compiled == "same") return input;
		  
		  // if we're here we are in script=true
		  
	  	  var newContext = { params: []};
	  	  newContext.vars = context.vars;
	  	  if (context.componentContext) {
	  	    newContext.params = context.componentContext.params;
	  	    newContext.componentContext = context.componentContext.componentContext;
	  	  }
			
		  if (paramScript.compiled == null)
			  return ajaxart.run(input,paramScript.script,"",newContext);
		  else  
			  return paramScript.compiled(input,newContext);
	  },
	  UseParamArray: function (profile,data,context)
	  {
		  var param = aa_text(data,profile,'Param',context); 
		  var paramScript = context.params[param];
		  if (!paramScript) {
		  	ajaxart.log('UseParamArray: Can not find param ' + param);
		  	return [];
		  }
		  if (aa_isArray(paramScript)) // script='false'
			  return paramScript;

	  	  var newContext = {};
	  	  newContext.vars = context.vars;
	  	  if (context.componentContext) {
		  	  newContext.params = context.componentContext.params;
		  	  newContext.componentContext = context.componentContext.componentContext;
		  	}

	  	  return ajaxart.runsubprofiles(data,paramScript.script,paramScript.field,newContext);
	  },
	  UseParamArrayAsync: function (profile,data,context)
	  {
		  var param = aa_text(data,profile,'Param',context); 
		  var paramScript = context.params[param];
		  if (aa_isArray(paramScript)) // script='false'
			  return paramScript;
		  
		  var actionProfs = ajaxart.subprofiles(paramScript.script,paramScript.field);
		  if (actionProfs.length == 0) return;
		  
		  var newContext = {};
		  newContext.vars = context.vars;
		  newContext.params = context.componentContext.params;
		  newContext.componentContext = context.componentContext.componentContext;
		  
		  var cbObj = ajaxart_async_GetCallbackObj(newContext);
	      cbObj.marked = true;
		  cbObj.index = 0;
		  cbObj.actionProfs = actionProfs;
			
		  var callBack = function(data1,context1) {
			var cbObj = ajaxart_async_GetCallbackObj(newContext);
			if (cbObj.index >= cbObj.actionProfs.length) {
				ajaxart_async_CallBack(data,newContext); return;
			}
			var actionProf = cbObj.actionProfs[cbObj.index];
			cbObj.index++;
			ajaxart_RunAsync(data,actionProf,newContext,cbObj.seqCallBack);
		  }
		  cbObj.seqCallBack = callBack;
		  callBack(data,newContext);
	  }
});

aa_gcs("yesno", {
	  Expression: function (profile,data,context)
	  {
		return ajaxart.run(data,profile,'Expression',context,'',true);
	  },
	  IsEmpty: function (profile,data,context)
	  {
		  var val = ajaxart.run(data,profile,'Value',context);
		  var checkInner = aa_bool(data,profile,'CheckInnerText',context);
		  return aa_isEmpty(val,checkInner);
	  },
	  PassesFilter: function (profile,data,context)
	  {
	  	return ajaxart.make_array(data,function(item) {
	  		if (! aa_bool(item,profile,'Filter',context))
	  			return null;
			return item;
	  	});
	  },
	  ItemsEqual: function (profile,data,context)
	  {
	    var item1 = ajaxart.run(data,profile,'Item1',context);
	    var item2 = ajaxart.run(data,profile,'Item2',context);
	    
	    if (item1.length == 0 && item2.length == 0) return ["true"];
	    if (item1.length == 0 || item2.length == 0) {
	    	var item = (item1.length > 0) ? item1 : item2;
	    	if ( aa_itemsEqual(item[0],"") ) return ["true"]; else return [];
	    }
	    
	    if ( aa_itemsEqual(item1[0],item2[0]) ) return ["true"];
	    return [];
	  },
	  Not: function (profile,data,context)
	  {
		  var result = aa_bool(data,profile,'Of',context);
		  if (result == false)
			  return ["true"];
		  else
			  return [];
	  },
	  OR: function (profile,data,context)
	  {
	    var subprofiles = ajaxart.subprofiles(profile,'Item');
	    
		for(var i=0;i<subprofiles.length;i++)
		{
	  		if ( aa_bool(data,subprofiles[i],"",context) )
	  			return ["true"];
	  	};
	  	return [];
	  },  
	  And: function (profile,data,context)
	  {
	    var subprofiles = ajaxart.subprofiles(profile,'Item');
	    
		for(var i=0;i<subprofiles.length;i++)
		{
	  		if ( ! aa_bool(data,subprofiles[i],"",context) )
	  			return [];
	  	};
	  	return ["true"];
	  },
	  Empty: function (profile,data,context)
	  {
	  	return aa_isEmpty(data,aa_bool(data,profile,'CheckInnerText',context));
	  },	
	  NotEmpty: function (profile,data,context)
	  {
		  var value = ajaxart.run(data,profile,'Value',context);
		  var check = aa_bool(data,profile,'CheckInnerText',context);
		  var result = aa_isEmpty(value,check);
		  if (result == true || result[0] == 'true') return [];
		  return ['true'];
	  }	
});

aa_gcs("data_items", {
	InnerDataItems: function (profile,data,context)
	{
		var dataitems = context.vars._Items[0];
		dataitems.Parent = aa_first(data,profile,'ParentDataItems',context);
		if (dataitems.Parent == dataitems) { dataitems.Parent = null; return []; }
		var init = function(dataitems) {
			dataitems.SaveParent = function(data1,ctx) {
				if (dataitems.Parent.SaveParent)
				  return dataitems.Parent.SaveParent(data1,ctx);
				else if (dataitems.Parent.Save)
					return dataitems.Parent.Save(data1,ctx);
			}
		}
		init(dataitems);
	}
});

aa_gcs("field", {
	XmlMultipleGroup: function (profile,data,context)
	{
		var field = { isObject : true, Title: aa_multilang_text(data,profile,'Title',context), IsGroup: true, IsMultipleGroup: true }
		var path = aa_text(data,profile,'Path',context);
		var middleElement = path.indexOf('/') != -1;
		
		field.Id = aa_text(data,profile,'ID',context);
		if (field.Id == "") field.Id = path.split('/').reverse().pop();
		
		field.ID = [ field.Id ]; 
		field.Fields = ajaxart.runsubprofiles(data,profile,'Field',context);
		
		field.FieldData = function(data) { return data; }
		
		var itemsProvider = aa_first(data,profile,'Items',context);
		if (itemsProvider && itemsProvider.ContainerData) field.FieldData = itemsProvider.ContainerData;
		else {
			if (path.indexOf('/') != -1) {
				var lastpos = path.lastIndexOf('/');
				var subPath = (lastpos==-1) ? path : path.substring(0,lastpos);
				aa_set_fielddata_method(field,subPath);
			}
		}

		field.InnerItems = function(data1,ctx) {
			var ctx = aa_merge_ctx(context,ctx);
			var out = ajaxart.runNativeHelper(data1,profile,'Items',ctx);
			out[0].MultipleItemsField = this; 
			return out;
		}
		field.Operations = function(data1,ctx) {
			return ajaxart.run(data,profile,'Operations',context);
		}
		field.Control = function(data1,ctx) {
			var ctx2 = aa_ctx(aa_merge_ctx(context,ctx),{_Field: [this]});
			return ajaxart.runNativeHelper(data1,profile,'Control',ctx2);
		}
		field.Aspects = function(data1,ctx) { return ajaxart.runsubprofiles([],profile,'Aspect',context); }
		
		var newContext = aa_ctx(context,{_Field: [field]} );
		ajaxart.runsubprofiles(data,profile,'FieldAspect',newContext);
		
		return [field];
	}
});

aa_gcs("ui_async", {
	  Control: function (profile,data,context)
	  {
		var out = document.createElement('div');
		var loadingControl = aa_first(data,profile,'ControlForLoading',context);
		if ( loadingControl != null ) { out.appendChild(loadingControl); $(out).addClass('aa_loading'); }
		
		var ShowControl1 = function(out) { return function(data1,context1) {
			var ShowControl2 = function(data2,ctx2) {
				var control = aa_first(data1,profile,'Control',context);
				aa_empty(out);
				$(out).removeClass('aa_loading');
				if (control != null) {
					out.appendChild(control);
					aa_element_attached(control);
					aa_fixTopDialogPosition();
				}
				aa_fire_async_finished();
			}
			
			ajaxart_RunAsync(data1,ajaxart.fieldscript(profile,'AsyncAction'),context,ShowControl2); 
		} };
		var async_data = ajaxart.fieldscript(profile,'AsyncData');
		if (async_data)
			aa_RunAsyncQuery(data,async_data,context,ShowControl1(out));
		else
			ShowControl1(out)(data,context);
		//ajaxart_RunAsync(data,async_data,context,ShowControl1(out));
		
		return [out];
	  }
});

aa_gcs("action_async", {
	RunActions: function(profile, data, context)
	{
		return ajaxart.gcs.action_async.SequentialRun(profile,data,context);
	},
	SequentialRun: function(profile, data, context)
	{
		aad_async_XtmlSequentialRun(data,profile,'Action',context);
	}
});
aa_gcs("ui", {
	ButtonAsHyperlink: function (profile,data,context)
	{
		var btnContext = context.vars.ButtonContext[0];
		var out = null;;
		var image = aa_totext(btnContext.Image);
		var text = aa_totext(btnContext.Text);
		var tooltip = aa_totext(btnContext.Tooltip);
		var textInlineCss = aa_text(data,profile,'TextInlineCss',context); 
		var imageInlineCss = aa_text(data,profile,'ImageInlineCss',context); 
			
		if (image == "") { // no image
			out = $('<a class="button_hyperlink" style="'+textInlineCss+'" title="'+tooltip+'" href="#"/>')[0];
			out.innerHTML = text;
		}
		else {
			out = $('<span class="button_hyperlink_image"/>')[0];
			var img = $('<img src="'+image+'" style="'+imageInlineCss+'" />')[0];
			var alink = $('<a href="#" style="'+textInlineCss+'" onclick="return false;" class="button_hyperlink" title="'+tooltip+'"/>')[0];
			alink.innerHTML = text;
			out.appendChild(img);
			out.appendChild(alink);
		}
		var initEvents = function(out) {
			out.onclick = function(e) {
			  if (window.aa_incapture) return;
			  e = e || event;
			  if (aa_incapture) return false;
			  aa_runMethod(data,context.vars.ButtonContext[0],'OnClick',aa_ctx(context,{ControlElement: [out]}));
			  ajaxart_stop_event_propogation(e);
			  return false;
			}
			$(out).hover(function() {
			  aa_runMethod(data,context.vars.ButtonContext[0],'OnHover',context);
			}, function() {} ); 
		}
		initEvents(out);
		return [out];
	},
	InlineCssIntoElements: function(profile,data,context) {
		var html = aa_text(data,profile,'Html',context);
		var css = aa_text(data,profile,'Css',context);
		jHtml = $("<div>" + html + "</div>");
		css_parts = css.split("}");
		for (var i=0; i<css_parts.length; i++) {
			var name_and_style = css_parts[i].split("{");
			if (name_and_style.length != 2) continue;
			var selector = name_and_style[0];
			var style = name_and_style[1].replace(/\n/g,' ');
			jHtml.find(selector).each(function() { this.style.cssText = style; });
		}
		return [ jHtml.html() ];
	}
});

aa_gcs("uiaction", {
DoFind: function (profile,data,context)
{
	  var filter_elems = ajaxart.run(data,profile,'FilterElements',context);
	  var cntr = context.vars._Cntr[0];
	  if (cntr == null) return [];
	  cntr.DoFind(ajaxart.totext_array(data),filter_elems);
	  return ["true"];
}
});

aa_gcs("jbart_api", {
	ShowWidget: function(profile,data,context)
	{
		var controlToShowFunc = null; // for auto-tests
		if (aa_paramExists(profile,'ControlToShowInBartContext')) {
			controlToShowFunc = function(data1,ctx) {
				return aa_first(data1,profile,'ControlToShowInBartContext',aa_merge_ctx(context,ctx));
			}
		}

		var ctx = aa_create_jbart_context({
			WidgetXml: aa_first(data,profile,'WidgetXml',context),
			Language: aa_text(data,profile,'_Language',context),
			Context: context			
		});

		var out = aa_show_jbart_widget_page({
			Context: ctx,
			page: aa_text(data,profile,'Page',context),
			success: function(data,ctx) { 
				ajaxart.run(data,profile,'RunAfter',aa_merge_ctx(context,ctx));		
			},
			ControlToShowInBartContext: controlToShowFunc
		});

		return [out];
	}	
});

