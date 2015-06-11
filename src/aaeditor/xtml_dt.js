ajaxart.load_plugin("xtml_dt","plugins/aaeditor/xtml_dt.xtml");
ajaxart.load_plugin("xtml_dt","plugins/aaeditor/xtml_dt_primitive.xtml");


ajaxart.gcs.xtml_dt = 
{
	ParamsAsFields: function (profile,data,context)
	{
		var ptdef = aa_component_definition(aa_text(data,profile,'Component',context));
		if (ptdef == null) return [];
		var hasAdvanced = false;
		var params = ajaxart_run_commas(data,profile,'Params',context), boolfeature_params = [];
		if (params.length == 0) {
			var params2 = aa_xpath(ptdef,"Param");
			for(var i=0;i<params2.length;i++) {
				ajaxart.run(data,params2[i],'Convert',context); // run convert

				if (params2[i].getAttribute('light') == 'false') continue;
				if (aa_xtmldt_is_advanced_param(data[0],params2[i]))
				  hasAdvanced = true;
				else {
				  if (params2[i].getAttribute('boolfeature') == 'true') 
					  boolfeature_params.push( params2[i].getAttribute('name') );
				  else params.push( params2[i].getAttribute('name') );
				}
			}
		}
		var out = [];
		for (var i=0;i<params.length;i++) {
			var paramXml_a = aa_xpath(ptdef,"Param[@name='" + params[i] + "']");
			if (paramXml_a.length == 0) continue;
			var paramXml = paramXml_a[0]; 
			
			if ( aa_xpath(paramXml,'Field').length > 0) { // custom field
				var paramfield = aa_first(data,paramXml,'Field',context);
				if (paramfield) {
				  paramfield.Param = params[i];
				  paramfield.ParamXml = paramXml;
				  out.push(paramfield);
				}
				continue;
			}
			var title = aa_text_capitalizeToSeperateWords("" + params[i]);
			if (paramXml.getAttribute("Title"))
				title = paramXml.getAttribute("Title");
			var field = { isObject: true , Id: params[i], Title: title , ParamXml: paramXml, Param: params[i], Type: paramXml.getAttribute('type') }
			field.FieldData = function(data) { return data; }
			field.CheckMandatoryValidation = function(field_data,ctx) {
				var param = field.Param;
				if (field_data.nodeType == 1) {
					if (field_data.getAttribute(param)) {
						if (field_data.getAttribute(param) == '') return false;
						return true;
					}
					if (!aa_xpath(field_data,param)[0]) return false;
					return true;
				}
			}
			var setAspects = function(field,ptdef) {
				var newContext = aa_ctx(context, { _Field: [field]});
				
				var type = paramXml.getAttribute('type');
				
				var isArray = (field.Type != null && field.Type.indexOf('[]') > -1);
				var isPrimitive = (type == null || type == "data.Data");
				
				if (!isPrimitive && type == "data.Boolean" && paramXml.getAttribute("script") == "true" || paramXml.getAttribute("primitive") == 'false') isPrimitive = true;
				if (!isPrimitive && type == "data.Boolean") {
					var val = aa_xpath_text(data[0],paramXml.getAttribute('name'));
					if (val) isPrimitive = true;
					var val2 = aa_xpath_text(data[0],'@'+paramXml.getAttribute('name'));
					if (val2 && val2 != 'true' && val2 != 'false') isPrimitive = true;
				}
				
				if (isPrimitive) { 
					field.Control = function(data1,ctx) {
					  var pt = aa_text(data,profile,'Component',context);
					  return ajaxart_xtmldt_primitive_control(data1[0],pt,field.Param,ctx);
					}
					return;
				} 
				if (isArray) 
					return ajaxart.runNativeHelper(data,profile,'Array',newContext);
				
				// options
				field.Options = { isObject:true, Options: [] , IsTree: false }
				
				var isTgpType = false,isAttribute = false,isOptions=false;
				
				if (field.ParamXml.getAttribute('multiple') == 'true' && type == "enum") {
					field.AllowValueNotInOptions = field.Multiple = true;
					if (field.ParamXml.getAttribute('Options')) {
						var options = field.ParamXml.getAttribute('Options').split(',');
						for(var i=0;i<options.length;i++) 
						    field.Options.Options.push({ isObject: true, code: ajaxart.totext_item(options[i]) });
					}
					isAttribute = isOptions = true;
				} else if (type == "enum") {
					field.AllowValueNotInOptions = true;
					var options = aa_xpath(field.ParamXml,"value");
					if (field.ParamXml.getAttribute('Options')) 
						ajaxart.concat(options,field.ParamXml.getAttribute('Options').split(','));
					
					for(var i=0;i<options.length;i++) {
						var option = { isObject: true, code: ajaxart.totext_item(options[i]) };
					    field.Options.Options.push(option);
					}
					isAttribute = isOptions = true;
				} else if (type == "dynamic_enum" || type=="dynamic_enum_multi") {
					field.AllowValueNotInOptions = true;
					if ( paramXml.getAttribute('options_pt') ) {
					  field.Options = ajaxart.runComponent(paramXml.getAttribute('options_pt'),data,context); 
					} else
					  field.Options = ajaxart.gcs.picklist.DynamicOptions(field.ParamXml,[],newContext)[0];
					if (paramXml.getAttribute('recalc_options') == 'true')
					{
						field.DelayedOptionCalculation = field.DynamicSuggestions = true;
						field.RecalcOptions = function(data1,ctx)
						{
							var newContext = aa_ctx(aa_merge_ctx(context,ctx),{_Field: [field], _Xtml: ctx.vars._FieldData});
							var options = ajaxart.gcs.picklist.DynamicOptions(field.ParamXml,[],newContext)[0];
							aa_initOptionsObject(options,ctx);
							return options;
						}
					}

					if (type=="dynamic_enum_multi")
						field.Multiple = true;
					isAttribute = isOptions = true;
				}
				else if (type == "data.Boolean") {
					isAttribute = isOptions = true;
					ajaxart.runComponent('field_aspect.Boolean',[],newContext);
					field.Options = null;
					isOptions = false;
					aa_field_handler(field,'OnUpdate',function() {
						ajaxart.runNativeHelper(data,profile,'RefreshPreview',context);
					},'xtml_dt',1000);
				}
				else if ("action_async.Action,data_async.Data,xml.Change,ui.Control,".indexOf(type+',') > -1 ) {
					field.Control = function(data1,ctx) {
					  var newContext = aa_ctx(context, { Xtml: data1 , Param: [field.Param] });
					  return ajaxart.runComponent('xtml_dt.EditBasicTypeControl',data1,newContext);
					}
				}
				else isTgpType = true;

				if (isAttribute) {
					field.FieldData = function(data1,ctx) {
						var val = aa_xpath(data1[0],"@"+field.Param);
						if (val.length > 0) return val;
						var paramXml = aa_xpath(ptdef,"Param[@name='" + field.Param + "']")[0];
						if (paramXml) {
							var ptdefval = paramXml.getAttribute('Default');
						    ptdefval = ptdefval || ajaxart.totext_array(aa_xpath(paramXml,"Default/@value"));
							ptdefval = ptdefval || aa_cdata_value(aa_xpath(paramXml,"Default")[0]);
							ptdefval = ptdefval || '';
						} else {
							var ptdefval = '';
						}
						return aa_xpath(data1[0],"@"+field.Param,true,ptdefval);
					}
				}
				if (isTgpType) 
				{
					field.Options = ajaxart.runNativeHelper(data,profile,'OptionsObjForTgpType',newContext);
					field.RecalcOptions = function() {
						var optionsObj = ajaxart.runNativeHelper(data,profile,'OptionsObjForTgpType',newContext)[0];
						aa_initOptionsObject(optionsObj,newContext);
						return optionsObj;
					} 
					ajaxart.runNativeHelper(data,profile,'AspectsForTgpType',newContext);
					field.FieldData = function(data1,ctx) 
					{
						var out = ajaxart_writabledata();
						
						var val = aa_xpath(data1[0],field.Param+"/@t");
						if (val.length == 0)  // copy default value 
						{
							var ptdefval_a = aa_xpath(ptdef,"Param[@name='" + field.Param + "']/Default");
							if (ptdefval_a.length > 0) {
								// copy the ptdefault value
								var newElem = data1[0].ownerDocument.createElement(field.Param);
								data1[0].appendChild(newElem);
								ajaxart.xml.copyElementContents(newElem,ptdefval_a[0]);
							}
							val = aa_xpath(data1[0],field.Param+"/@t");
						}
						if (val.length > 0) ajaxart.writevalue(out,val);
						return out;
					}
					field.StoreOriginalValue = function(input,ctx) {
						var xtml = aa_xpath(ctx.vars._Item[0],field.Param)[0];
						input.originalXtml = aa_parsexml(ajaxart.xml2text(xtml));
					}
					field.RevertToOriginalValue = function(input,field_data,ctx) {
						if (!input.originalXtml) return;
						var xtml = aa_xpath(ctx.vars._Item[0],field.Param)[0];
						ajaxart.xml.copyElementContents(xtml,input.originalXtml);
						aa_invoke_field_handlers(field.OnUpdate,input,null,field,field_data,{RevertToOriginalValue: true});
					}
					aa_field_handler(field,'OnUpdate',function(field,field_data,input,e,extra){
						if (extra && extra.RevertToOriginalValue) return;
						var xtml = $(input).parents('.aa_item')[0].ItemData[0];
						if (aa_totext(field_data) == "") { // empty - delete the element
							var elem = aa_xpath(xtml,field.Param)[0];
							if (elem) elem.parentNode.removeChild(elem);
						} else {
							var newT = aa_totext(field_data);
							var currT = aa_totext(aa_xpath(xtml,field.Param+'/@t'));
							if (currT != newT) 
								xtmldt_switch_pt(currT,newT,xtml,field.Param,context);
						}
					});
					isOptions = true;
				}
				if (isOptions)
				  ajaxart.runNativeHelper(data,profile,'Options',newContext);
			}
			if (paramXml.getAttribute('autoaspects') != 'false' && paramXml.getAttribute('titleField') != 'true')
			  setAspects(field,ptdef);
			
		    var newContext = aa_ctx(context, { _Field: [field]});
		    ajaxart.runNativeHelper(data,profile,'Aspects',newContext);
		    ajaxart.runsubprofiles(data,field.ParamXml,'FieldAspect',newContext);
			
			out.push(field);
		}
		if (boolfeature_params.length > 0) {
			var field = { isObject: true , Title: [ "Light Features" ] , BoolFeature: ["true"],Params: boolfeature_params }
		    ajaxart.runNativeHelper(data,profile,'BoolFeatureAspects',aa_ctx(context,{_Field: [field]}));
			aa_field_handler(field,'OnUpdate', function(field,field_data,input) {
				var checked = "," + aa_totext(field_data)+",";
				var xtml = $(input).parents('.aa_item')[0].ItemData[0];
				for(var i=0;i<field.Params.length;i++) {
					var param = field.Params[i];
					if (checked.indexOf(","+param+",") > -1)
						xtml.setAttribute(param,"true");
					else
						xtml.setAttribute(param,"false");
					aa_triggerXmlChange(xtml);
				}
			},'boolfeature');
			var init = function(field) {
			  field.FieldData = function(xtml,ctx) {
				var out = ajaxart_writabledata(),val="";
				for(var i=0;i<field.Params.length;i++) {
					var param = field.Params[i];
					var scr = ajaxart.fieldscript(xtml[0],param,true);
					if (scr && scr.nodeType == 2 && scr.nodeValue == "true")
						val += param + ",";
					if (scr && scr.tagName == "Default" && scr.getAttribute("value") == "true")
						val += param + ",";
				}
				if (val != "") val = val.substring(0,val.length-1); // remove the last ,
				ajaxart.writevalue(out,[val]);
				return out;
			  }
			}
			init(field);
			out.push(field);
		}
		
		if (hasAdvanced) {
			var advancedField = { isObject: true , ID: ["xtml_morefields"], HideTitle: ["true"] }
			advancedField.Control = function(data1,ctx) {
				var top = document.createElement('div');
				top.className = "xtmldt_advanced_fields";
				top.ShowAdvancedParams = false;
				var pt = aa_text(data,profile,'Component',context);
				xtmldt_refreshMoreFields(top,data1,ctx,pt);
				
				return [top];
			}
			out.push(advancedField);
		}
		return out;
	},
	IsAdvancedParam: function (profile,data,context)
	{
		return aa_frombool(aa_xtmldt_is_advanced_param(aa_first(data,profile,'Xtml',context),aa_first(data,profile,'ParamXml',context)));
	},
	SetContainingPicklistValue: function (profile,data,context)
	{
		var input = aa_first(data,profile,'PicklistInput',context);
		var value = aa_text(data,profile,'Value',context);
		
		if (input && input.set) {
			input.setValue(value);
			input.FixValue(false);
			input.set(value);
		}
	},
	ToCompositeParam: function (profile,data,context)
	{
		if (! ajaxart.isxml(data) ) return [];
		var param = aa_text(data,profile,'Param',context);
		var items = aa_xpath(data[0],param);
		if (items.length == 0) { 
			data[0].appendChild( data[0].ownerDocument.createElement(param) );
			items = aa_xpath(data[0],param);
		}
		var item = items[0];
		var compositePT = aa_text(data,profile,'PTForComposite',context);
		if (item.getAttribute('t') == null || item.getAttribute('t') == "")
			item.setAttribute('t',compositePT);
		if (item.getAttribute('t') != compositePT) return [];
		
		return [item];
	},
	DoAddProfile: function (profile,data,context) {
		var cntr = aa_first(data,profile,'Cntr',context);
		var pt = aa_first(data,profile,'PT',context);
		var items = cntr.Items[0];

		var elem = items.ParentXml.ownerDocument.createElement(items.Tag);
		elem.setAttribute('t',pt);
		items.ParentXml.appendChild(elem);
		items.Items.push(elem);
   	aa_triggerXmlChange(items.ParentXml);

		var new_elems = [];
   	var newUIElem = cntr.createNewElement([elem],new_elems,cntr.Context);
   	$(cntr.Ctrl).find('.aa_list')[0].appendChild(newUIElem);
   	$(cntr.Ctrl).find('.aa_listtop').css('display','block');
   	setTimeout(function() {
   		$(newUIElem).find('.component_title_in_table').click();   		
   		$($(newUIElem).find('input')[0]).focus();
   	},3);
	},
	PreviewContext: function (profile,data,context)
	{
		var out = { isObject:true }
		out.Input = aa_first(data,profile,'Input',context);
		out.context = ajaxart.clone_context(context);
		var cvars = ajaxart.subprofiles(profile,'ContextVar');
		for(var i=0;i<cvars.length;i++) {
			var name = cvars[i].getAttribute('name');
			var val = ajaxart.run(data,cvars[i],'',out.context);
			out.context.vars[name] = val;
		}
		return [out];
	},
	XtmlTextSummary: function (profile,data,context)
	{
		var xtml = aa_first(data,profile,'Xtml',context);
		var text = aa_xtmldt_summarytext(xtml,"<br>");
		if (text == "" && xtml.getAttribute('t')) {
			ptdef = aa_component_definition(xtml.getAttribute('t'));
			if (aa_xpath(ptdef,'Param').length > 0)
			  text = '<img src="' + context.vars._Images[0] + '/studio/unsPipeIcon.gif" />';
		}

		return [text];
	},
	ToggleInnerTgpParams: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var cssClass = aa_attach_global_css(aa_text(data,profile,'Css',context));

		function toComponentDef(field_data) {
			var pt = aa_totext(field_data) || '';
			var ptArr = pt.split('.');
			if (ptArr.length != 2) return null;
			var comp = ajaxart.components[ptArr[0]] && ajaxart.components[ptArr[0]][ptArr[1]];
			return comp;
		}
		function isCustomCss(field_data) {
			return aa_totext(field_data) == 'ui.CustomCss';
		}
		function isCustomizablePT(field_data) {
			var comp = toComponentDef(field_data);
			if (comp && comp.getAttribute('customAAEditor') == 'true') return false;
			var type = comp && comp.getAttribute('type');
			var typeDef = type && ajaxart.types[type.replace('.','_')];
			
//			if (typeDef && typeDef.getAttribute('style') == 'true') {
				// we're a style. now look for ui.CustomStyle or ui.CustomStyleByField
				var t = comp && aa_totext( aa_xpath(comp,'xtml/@t') );
				if (t == 'ui.CustomStyle' || t == 'ui.CustomStyleByField') return true;
//			}
			return false;
		}
		function isCustomPT(field_data) {
			var comp = toComponentDef(field_data);
			if (!comp) return false;
			return comp.getAttribute('customPT') == 'true';
		}
		function isCustomAAEditor(field_data) {
			var comp = toComponentDef(field_data);
			if (!comp) return false;
			return comp.getAttribute('customAAEditor') == 'true';
		}
		function hasParams(field_data) {
			var comp = toComponentDef(field_data);
			if (!comp) return false;
			var params = aa_xpath(comp,'Param');
			for(var i=0;i<params.length;i++) {
				if (params[i].getAttribute('light') == 'false') continue;
				if (params[i].getAttribute('hidden') == 'true') continue;
				return true;
			}
			return false;
		}
		function canConvertToMoreActions(field_data) {
			var comp = toComponentDef(field_data);
			var type = comp && comp.getAttribute('type');
			if (type == 'action.Action' && aa_totext(field_data) != 'operation.RunActions') return true;
			return false;
		}
		
		field.RefreshToggleInnerTgpParams = function(field,cell,field_data,fromUpdate,ctx) {
			jBart.bind(cell,'cleanWrapper',function() {
				cell.jbToggleButton = null;
			},'RefreshToggleInnerTgpParams');
			if (!cell.jbToggleButton) {
				$(cell).addClass('xtml_dt_toggle_cell');
				var table = $('<table class="xtml_dt_toggle_table" cellpadding="0" cellspacing="0"><tr/></table>');
				var tr = table.find('tr');
				var td1 = $('<td style="vertical-align:top" class="xtml_dt_picklist"/>').appendTo(tr);
				var td2 = $('<td style="vertical-align:top" class="xtmldt_toggle_td"/>').appendTo(tr);
				var td3 = $('<td style="vertical-align:top" class="xtml_dt_share_td"/>').appendTo(tr);
				var td4 = $('<td style="vertical-align:top" class="xtml_dt_customize_td"/>').appendTo(tr);

				while (cell.firstChild) td1[0].appendChild( cell.firstChild );
				
				cell.jbToggleButton = $("<div style='cursor:pointer; margin: 6px 0 0 5px' class='aa_field_toolbar_image xtmldt_toggle_left'/>");
				td2.append(cell.jbToggleButton);
				cell.appendChild(table[0]);
				cell.jbEditButton = $("<div style='cursor:pointer; margin: 6px 0 0 5px;display:none;' class='aa_field_toolbar_image xtmldt_edit_style'/>").attr('title',"Edit Style");
				cell.jbEditButton.css("background",'url('+aa_base_images()+'/studio/designer.png) no-repeat');
				
				cell.jbEditButton.click(function(e) {
					var xtml = cell.jbXtml;
					var ctx2 = aa_ctx(context,{_DomEvent: [e], ControlElement: [cell] });
					ajaxart.run([xtml],jBart.parsexml('<xtml t="field_dt.OpenCustomPTDesigner" />'),'',ctx2);
				});
				td2.append(cell.jbEditButton);

				cell.jbOpenAAEditor = $("<div style='cursor:pointer; margin: 6px 0 0 5px;display:none;' class='aa_field_toolbar_image xtmldt_edit_style'/>").attr('title','Edit');
				cell.jbOpenAAEditor.css("background",'url('+aa_base_images()+'/studio/customize1616.gif) no-repeat');
				cell.jbOpenAAEditor.click(function(e) {
					cell.jbXtml = cell.jbXtml || (ctx && aa_xpath(ctx.vars._Item[0],field.Param)[0]);
					var xtml = cell.jbXtml;
					var comp = toComponentDef(field_data);
					var param = aa_totext(aa_xpath(comp,'Param/@name'));
					var ctx2 = aa_ctx(context,{_DomEvent: [e], ControlElement: [cell], _Param: [param] });
					ajaxart.run([xtml],jBart.parsexml('<xtml t="field_dt.OpenCustomAAEditor" />'),'',ctx2);
				});
				td2.append(cell.jbOpenAAEditor);
				
				cell.jbShareButton = $("<div style='cursor:pointer; margin: 6px 0 0 5px;display:none;' class='aa_field_toolbar_image xtmldt_share'/>");
				cell.jbShareButton.css("background",'url('+aa_base_images()+'/studio/block_share.png) no-repeat').attr('title','Share your style (Make Global)');
				
				cell.jbShareButton.click(function(e) {
					var xtml = cell.jbXtml;
					var ctx2 = aa_ctx(context,{ ControlElement: [cell], FieldCellElement: [cell] });
					ajaxart.run([xtml],jBart.parsexml('<xtml t="styles_dt.OpenShareStyleDialog" />'),'',ctx2);
				});
				td3.append(cell.jbShareButton);
				
				cell.jbCustomize = $("<div style='display:none;' class='aa_field_toolbar_image xtmldt_customize'/>");
				cell.jbCustomize.css("background",'url('+aa_base_images()+'/studio/custom.png) no-repeat');
				cell.jbCustomize.click(function(e) {
					var xtml = cell.jbXtml;
					var ctx2 = aa_ctx(context,{ ControlElement: [cell] , FieldCellElement: [cell] });
					if (e.ctrlKey)						
						aa_run_component("field_dt.DoCustomizeGlobalStyle",[xtml],ctx2, {});
					else
						aa_run_component("field_dt.DoCustomizeStyle",[xtml],ctx2, {});
				});
				td4.append(cell.jbCustomize);
				
				cell.jbMoreActions = $("<div style='display:none;' class='aa_field_toolbar_image xtmldt_more_actions'/>");
				cell.jbMoreActions.css("background",'url('+aa_base_images()+'/studio/add_folder.png) no-repeat').attr('title','More Actions');
				cell.jbMoreActions.click(function(e) {
					var xtml = cell.jbXtml;
					var ctx2 = aa_ctx(context,{ ControlElement: [cell] , FieldCellElement: [cell] });
					ajaxart.run([xtml],jBart.parsexml('<xtml t="field_dt.MoreActions" />'),'',ctx2);
				});
				var td5 = $('<td style="vertical-align:top" class="xtml_dt_more_actions"/>').append(cell.jbMoreActions).appendTo(tr);
			}
			var toggle = cell.jbToggleButton;
			cell.jbEditButton.hide();
			cell.jbShareButton.hide();
			cell.jbOpenAAEditor.hide();
			cell.jbCustomize.hide();
			cell.jbMoreActions.hide();
			
//			if (isCustomizablePT(field_data) || isCustomCss(field_data)) {
			if (isCustomizablePT(field_data)) {
				cell.jbCustomize.show();
				cell.jbCustomize.attr('title',isCustomCss(field_data) ? "Customize html and js" : "Customize Style (ctrl to edit global)");
			}
			if (isCustomPT(field_data)) {
				cell.jbEditButton.show();
				cell.jbShareButton.show();
				toggle.hide().css('display','none');
				return;
			}
			if (isCustomAAEditor(field_data)) {
				cell.jbOpenAAEditor.show();
				toggle.hide().css('display','none');
				return;
			}
			if (canConvertToMoreActions(field_data)) {
				cell.jbMoreActions.show();
			}
			if (! hasParams(field_data) ) { 
				toggle.hide();
				return;
			} else toggle.show();
			
		  toggle[0].RefreshExapndButton = function() {
		  	  var imageUrl = aa_base_images() + '/studio/' + (toggle[0].Expanded ? 'minus.gif' : 'plus.gif'); 
		  	  toggle.css('background','url('+imageUrl+') no-repeat');
		  }
		  	
		  	var defaultExpanded = fromUpdate ? true : false;
		  	var componentDef = toComponentDef(field_data);
		  	if (!defaultExpanded && componentDef && componentDef.getAttribute('autoexpand') == 'true') defaultExpanded = true;
		  	
		  	toggle[0].Expanded = defaultExpanded;
		  	toggle[0].RefreshExapndButton();

		  	toggle[0].onclick = function() {
  			  var pageElement = $(cell.jbOptionsPageElement);
			  function endAnimation() {
			  	  toggle[0].RefreshExapndButton();
			  	  aa_htmlContentChanged(cell);		  	  
			  }
		  	  toggle[0].Expanded = !toggle[0].Expanded;
		  	  if (toggle[0].Expanded)
				pageElement.animate({height:'show'},200,endAnimation);
		  	  else 
			    pageElement.animate({height:'hide'},200,endAnimation);
		  	}
		  	if (!defaultExpanded) {
		  		$(cell.jbOptionsPageElement).css('display','none');
		  	};
		}
		
		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx) {
			cell.jbXtml = aa_xpath(ctx.vars._Item[0],field.Param)[0];
			$(cell).addClass(cssClass);
			field.RefreshToggleInnerTgpParams(field,cell,field_data,false,ctx);
		});
		aa_field_handler(field,'OnUpdate',function(field,field_data,input){
			var cell = $(input).parents('.xtml_dt_toggle_cell')[0];
			field.RefreshToggleInnerTgpParams(field,cell,field_data,true);
		});
	},
	StyleInProperties: function (profile,data,context)
	{
		// Used in jbart properties
		var field = context.vars._Field[0];

		var type = '', fieldData = [];
		
		if (data[0] && data[0].nodeType == 1) {
			var styleParam = aa_component_param_def(data[0].getAttribute('t'),'Style');
			if (!styleParam) {
				var fieldTypeParam = aa_component_param_def(data[0].getAttribute('t'),'FieldType');
				if (fieldTypeParam) {
					var defaultType = aa_totext( aa_xpath(fieldTypeParam,'Default/@t') );
					data = aa_xpath(data[0],'FieldType/@t',true,defaultType);
					styleParam = aa_component_param_def(data[0].getAttribute('t'),'Style');
				}
			}
			if (styleParam) {
				var defaultStyle = aa_totext( aa_xpath(styleParam,'Default/@t') ); 
				fieldData = aa_xpath(data[0],'Style/@t',true,defaultStyle);
				type = styleParam.getAttribute('type');
			}
		}
		
		field.RecalcOptions = function() {
			var out = ajaxart.runNativeHelper([type],profile,'Options',aa_ctx(context,{PT: fieldData }))[0];
			aa_initOptionsObject(out,context);
			return out;
		} 
		field.FieldData = function(data1,ctx) { return fieldData; }
		
		ajaxart.runNativeHelper(data,profile,'Aspects',context);
	},
	CleanXtmlOfParams: function (profile,data,context)
	{
		var prevComp = aa_text(data,profile,'PrevComponent',context);
		var xtml = data[0];
		
		if (!xtml || prevComp == "" || xtml.getAttribute("t") == null || xtml.getAttribute("t") == "") return [];
		
		xtmldt_cleanXtmlOfParams(xtml,prevComp);
	},
	Object: function (profile,data,context)
	{
		var obj = { Xtml: ajaxart.run(data,profile,'Xtml',context) };
		obj.Preview = ajaxart.run(data,profile,'Preview',context);
		aa_addMethod(obj,'RefreshPreview',profile,'RefreshPreview',context,'');
 	    var newContext = aa_ctx(context,{_XtmlObject: [obj]} );
 	    ajaxart.runsubprofiles(data,profile,'Aspect',newContext);
 	    
 	    return [obj];
	},
	Aspects: function (profile,data,context)
	{
		ajaxart.runsubprofiles(data,profile,'Aspect',context);
		return [];
	},
	LightComponentsOfType: function (profile,data,context)
	{
	  if ( ! window.ajaxart_light_compoftype) {
		  ajaxart_light_compoftype = {};
		  for (var i in ajaxart.components) {
			  if (i.lastIndexOf("_dt") == i.length-3 && i.length > 3 || i == "aaeditor") continue;
			  for(var j in ajaxart.components[i]) {
				  var comp = ajaxart.components[i][j];
				  var type = comp.getAttribute('type');
				  if (type == null || type == 'data.Data') continue;
				  if (comp.getAttribute('hidden') == 'true' || comp.getAttribute('light') == 'false') continue;
				  if (comp.getAttribute('deprecated') == 'true') continue;
			    if (ajaxart_light_compoftype[type] == null) {
			    	  ajaxart_light_compoftype[type] = [];
		    	  	  var typeXml = ajaxart.types[ type.replace("\.","_") ];
		    	  	  if (typeXml != null && typeXml.getAttribute('lightPTs') != null) {
 	    	  		    ajaxart_light_compoftype[type] = typeXml.getAttribute('lightPTs').split(',');
		    	  	  }
			      }
			      var fullid = "" + i + "." + j;
			      // do not add twice
			      if (ajaxart_arr_indexof(ajaxart_light_compoftype[type],fullid) == -1)
			    	  ajaxart_light_compoftype[type].push(fullid);
			  }
		  }
	  }
	  
	  var type = aa_text(data,profile,'Type',context);
	  var out = ajaxart_light_compoftype[type];
	  
	  if (out == null) out = [];
	  return out;
	},
	ComponentParams: function (profile,data,context)
	{
	  var full_id = aa_text(data,profile,'ComponentID',context);
	  var ns = full_id.split('.')[0];
	  var id = full_id.split('.')[1];
	  var component = ajaxart.components[ns][id];
	  
	  var result = [];
	  var params = aa_xpath(component,"Param");
	  for(var i=0;i<params.length;i++)
	  {
		  var param = params[i];
		  var paramName = param.getAttribute('name');
		  var field = {};
		  field.Title = paramName;
		  field.Id = paramName;
		  field.Param = [param];

		  result.push(field);
		  
		  var type = param.getAttribute('type');
		  
		  var isPrimitive = true;
		  if (type != null && type != 'data.Data') isPrimitive = false;
		  
		  if (isPrimitive) {
		    var ControlFunc = function(paramName) { return function(data1,context1) {
		    	if (data1.length == 0) return [];
		    	var pt= aa_text(data,profile,'ComponentID',context);
		    	return ajaxart_xtmldt_primitive_control(data1[0],pt,paramName,context);
		    }};
		    var controlFunc = ControlFunc(paramName);
		  }
		  else 
		    var controlFunc = function(data,context1) { return []; }

		  var newContext = aa_ctx(context,{_Field: [field]} );
		  ajaxart_addScriptParam_js(field,'Control',controlFunc,newContext);

		  ajaxart.runsubprofiles(data,profile,'FieldAspect',newContext);
	  }
	  return result;
	},
	ImageOfType: function (profile,data,context)
	{
		var type = aa_text(data,profile,'Type',context);
		if (aa_type_image[type] != null) return [aa_type_image[type]];
		
	    var typeDef = ajaxart.types[type.replace('.','_')]; 
		var obj = { isObject: true }
        ajaxart.runsubprofiles([],typeDef,'ComponentAspect',aa_ctx(context,{_Component: [obj]}));
		var image = aa_totext(obj.Image);
		aa_type_image[type] = image;
		
		return [image];
	},
	ComponentObject: function (profile,data,context)
	{
		var id = aa_text(data,profile,'Component',context);
		var obj = { isObject: true , Component: id}
		
   	    var middlePos = id.indexOf('.');
	    var ns = id.substring(0,middlePos);
	    var compName = id.substr(middlePos+1);

		if (ajaxart.components[ns] == null || ajaxart.components[ns][compName] == null) return [];
		var global = ajaxart.components[ns][compName];
		
	    var newContext = aa_ctx(context,{_Component: [obj]} );

	    var type = global.getAttribute('type');
		if (type != null) {
		  var typeDef = ajaxart.types[type.replace('.','_')]; 
  	      ajaxart.runsubprofiles([],typeDef,'ComponentAspect',newContext);
		}
		
	    ajaxart.runsubprofiles([],global,'Aspect',newContext);
		
		return [obj];
	},
	MakeLocal: function (profile,data,context)
	{
		var xtml = aa_first(data,profile,'Xtml',context);
		var implXtml = aa_first(data,profile,'ImplementationXtml',context);

		var implXtmlAsText = ajaxart.xml2text(implXtml);
		var params = aa_xpath(implXtml,'../Param');
		for(var i=0;i<params.length;i++) {
			var paramXml = $(params[i]);
			var param = paramXml.attr('name');
			if (paramXml.attr('script') == 'true') continue;
			var value = aa_text(data,xtml,param,context);
			implXtmlAsText = implXtmlAsText.split('%$'+param+'%').join(value); // find-replace in js
		}
		return [ jBart.parsexml(implXtmlAsText,implXtml) ];
	},
	GlobalOpenAAEditor: function (profile,data,context)
	{
		var elem = data[0];
		if (elem.tagName == "HTML" || elem.tagName == "BODY") elem = window.getSelection().focusNode;
		var firstBound = null;

		if (elem.jbXtml)
			return ajaxart.runNativeHelper([elem],profile,'OpenAAEditor',context);
		
		while (elem.parentNode) {
			if (elem.ajaxart && ! firstBound) firstBound=elem;
			
			if ( $(elem).hasClass('aa_container') && elem.Cntr) {
				var cntr = elem.Cntr;
				var isXtmlDt = false;
				for(var i=0;i<cntr.Fields.length;i++)
					if (cntr.Fields[i].ParamXml) isXtmlDt = true;

				if (isXtmlDt) {
					var xtmlObj = { script: aa_items(cntr)[0] , input: [] };
					var ctx = aa_ctx(cntr.Context, { _Cntr: [cntr.Ctrl]} );
					return ajaxart.runNativeHelper([xtmlObj],profile,'OpenAAEditor',ctx);
				}
			}
			elem = elem.parentNode;
		}
		return [];
	    if (firstBound == null) return [];
		var xtmlObj = { isObject:true, script: firstBound.ajaxart.script , input: firstBound.ajaxart.data }
 	    return ajaxart.runNativeHelper([xtmlObj],profile,'OpenAAEditor',firstBound.ajaxart.params);
	},
	ProfileProperty: function (profile,data,context)
	{
		var xtml = aa_first(data,profile,'Profile',context);
		var param = aa_text(data,profile,'Param',context);
		var fieldScript = ajaxart.fieldscript(xtml,param,true);
		if (fieldScript) return [fieldScript];
		return [];
	},
	AggregatorFields: function (profile,data,context)
	{
		var items = ajaxart.run(data,profile,'Items',context);
		var fields = {};
		for (var i=0; i<items.length && i<5; i++) {
			var item = items[i];
			for (field_name in item)
				if (field_name != 'isObject' && field_name != 'XtmlSource' && !fields[field_name]) fields[field_name] = true;
		}
		var out = [];
		for (field_name in fields) {
			var field_obj = { isObject:true, FieldName:field_name, Desc:"" };
			var examples = 0;
			for (var i=0; i<items.length; i++) {
				if (items[i][field_name] != null) {
					if (examples > 0) { field_obj.Desc += ","; }
					if (examples == 4) { field_obj.Desc += '...'; break; }
					field_obj.Desc += items[i][field_name];
					examples++;
				}
			}
			out.push(field_obj);
		}
		return out;
	},
	TrimVariables: function (profile,data,context)
	{
		var text = data[0];
		var inside = false;
		var escape = false;
		var last_var_pos =0;
		for(var i=0;i<text.length-1;i++)
		{
			if(!escape) {
				if (text[i] == '\\') 
					escape = true;
				else if (text[i] == '%')
				{
					inside = !inside;
					last_var_pos = i;
				}
			}
			else
				escape = false;
		}
		if (inside)
			return [text.substring(last_var_pos)];
		return [""];
	}
}

var aa_type_image = {};
function ajaxart_xtmldt_primitive_control(xtml,pt,param,context)
{
	var out = document.createElement('div');
	out.className = 'xtml_dt_primitive';
	var text_and_button = $('<table class="xtml_text_and_button" cellpadding="0" cellspacing="0"/>')[0];
	out.appendChild(text_and_button);
	var tr = $('<tr/>')[0];
	text_and_button.appendChild(tr);
	
	var text_wrapper = document.createElement("SPAN");
	text_wrapper.className = 'xtml_text_wrapper';
	var calc_context = function() {
		if (text_wrapper["context"] != null) return;
		var itemToFocus = { ParentXtml: [xtml], Field: [param] };
		var preview_context = aadt_calcPrimitivePreviewContext(xtml,param,context);
		if (!preview_context[0]) {
			preview_context = aa_run_component("xtml_dt.CalcPreviewForXtml", [itemToFocus], context);
		}
		text_wrapper["context"] = preview_context;
	}
	var myFunc = function(text_wrapper,out) { return function() {
		var att_to_edit = xtml.getAttribute(param);
		var input;
		var java_script = ajaxart.totext_array(aa_xpath(xtml,param + "/@t")) == "data.JavaScript";
		if (att_to_edit == null && !java_script) {
			if (aa_xpath(xtml,param).length > 0) {
				input = document.createElement("INPUT");
				input.setAttribute("value", 'computed');
				text_wrapper.isAttr = false;
				input.readOnly=true;
				input.className = "xtml_dt_readonly";
				$(input).click(function() {
					var dtcontext = { isObject:true }
					ajaxart_addScriptParam_js(dtcontext,'Refresh',refreshFunc,context);
					if (text_wrapper.isAttr) var isAttr = ["true"]; else var isAttr = [];
					calc_context();
					var newContext = aa_ctx(context,{_XtmlDtContext : [dtcontext] , 
						IsAttribute: isAttr , Xtml: [xtml] , Field: [param], _PrimitiveControl: [text_wrapper.firstChild], _Context: text_wrapper["context"] } );
					ajaxart.runComponent('xtml_dt.EditScriptOfPrimitive',[xtml],newContext);
				});
			}
			else att_to_edit = "";
		}
		if (java_script) {
			var update_callback = { isObject: true };
			ajaxart_addScriptParam_js(update_callback,'OnUpdate',updateFunc,context);
			ajaxart_addScriptParam_js(update_callback,'Context',calcContextAndAddPreview,context);
			var newcontext = aa_ctx(context,{_XtmlDt: [update_callback]});
			input = ajaxart.runComponent('xtml_dt.JavaScriptInlineEditor',ajaxart.childElems(xtml,param),newcontext)[0];
		}
		if (att_to_edit != null) {
			var updateFunc = function(obj) {
				var value = ajaxart.totext(obj)
				if (text_wrapper.DefaultValue != "" && !text_wrapper.OverridingDefaultValue && text_wrapper.DefaultValue != value)
					text_wrapper.OverridingDefaultValue = true;
				if (ajaxart.totext(obj) != "" || text_wrapper.OverridingDefaultValue) // if overriding default value, empty value is different than nothing
					xtml.setAttribute(param,value);
				else
					xtml.removeAttribute(param);
				aa_triggerXmlChange(xtml);
			};
			var calcContextAndAddPreview = function(data) {
				calc_context();
				if (out["preview_control"] != null)
					out.removeChild(out["preview_control"]);
				var newContext = aa_ctx(context,{ _Context: text_wrapper["context"] } );
				var preview_control = ajaxart.runComponent('aaeditor.PrimitiveTextPreview', data ,newContext)[0];
				out.appendChild(preview_control);
				out["preview_control"] = preview_control;
				
				return text_wrapper["context"];
			}
			var dummy_data = aa_parsexml('<xml value=""/>');
			var current_val = ""
			if (xtml.getAttribute(param) != null ) {
				current_val = xtml.getAttribute(param);
				dummy_data.setAttribute("value",xtml.getAttribute(param));
			}
			var default_value = aa_get_default_value(pt,param);
			if (default_value && typeof(default_value) != "string" && default_value.nodeType) { //not empty none
				var default_val = (default_value.nodeType == 1) ? ajaxart.totext(aa_xpath(default_value,"@value")) : aa_totext([default_value]);
				text_wrapper.DefaultValue = default_val;
				if (xtml.getAttribute(param) == null)	// use default value if no value
					dummy_data.setAttribute("value",default_val);
				else
					text_wrapper.OverridingDefaultValue = true;
				}
			var update_callback = { isObject: true };
			ajaxart_addScriptParam_js(update_callback,'OnUpdate',updateFunc,context);
			ajaxart_addScriptParam_js(update_callback,'Context',calcContextAndAddPreview,context);
			var ptdef = aa_component_definition(pt);
			var paramXml = [];
			if (ptdef)
				paramXml = aa_xpath(ptdef,"Param[@name='" + param + "']");
			var newcontext = aa_ctx(context,{_XtmlDt: [update_callback], _ParamXml: paramXml});
			input = ajaxart.runComponent('aaeditor.EditPrimitiveTextBox',aa_xpath(dummy_data,"@value"),newcontext)[0];
			text_wrapper.isAttr = true;
		}
		while (text_wrapper.firstChild != null)
			text_wrapper.removeChild(text_wrapper.firstChild);
		text_wrapper.appendChild( input );
		aa_element_attached( input );
		ajaxart.runComponent('xtml_dt.RefreshPrimitivePreview',[],ajaxart.ui.contextWithCurrentControl(context,text_wrapper) );
	}}
	var refreshFunc = myFunc(text_wrapper,out);
	refreshFunc();
	var td1 = $('<td/>')[0];
	td1.appendChild(text_wrapper);
	tr.appendChild(td1);
	
	var pop_button = document.createElement('span');
	pop_button.className = "xtml_dt_pop_button";
	pop_button.style.background = 'url("'+aa_base_images()+'/openmenu.gif") no-repeat';

	pop_button.onclick = function() {
		var dtcontext = { isObject:true }
		if (text_wrapper.OverridingDefaultValue)
			dtcontext.DefaultValue = [text_wrapper.DefaultValue];
		ajaxart_addScriptParam_js(dtcontext,'Refresh',refreshFunc,context);
		
		if (text_wrapper.isAttr) var isAttr = ["true"]; else var isAttr = [];
		calc_context();
		var newContext = aa_ctx(context,{ControlElement : [pop_button] , _XtmlDtContext : [dtcontext] , 
			IsAttribute: isAttr , Xtml: [xtml] , Field: [param], _PrimitiveControl: [text_wrapper.firstChild], _Context: text_wrapper["context"],
			_CurrentFocus: [pop_button] } );
		ajaxart.runComponent('xtml_dt.OpenPrimitiveControlPopup',[xtml],newContext);
	};
	
	var td2 = $('<td/>')[0];
	td2.appendChild(pop_button);
	tr.appendChild(td2);
	
	return [out];
}
xtmldt_refreshMoreFields = function(top,xtml,context,pt)
{
	aa_empty(top);
  
  if (top.ShowAdvancedParams) {
	  var newContext = aa_ctx(context, { Component: [pt] });
	  var more = ajaxart.runComponent('xtml_dt.MoreFieldsHelper',xtml,newContext)[0]; 
	  top.appendChild(more);
	  
	  var showLess = $('<a class="xtmldt_showless button_hyperlink">less...</a>')[0];
	  showLess.onmousedown = function(e) {
		  e = e || event;
	  	  if( e.button == 2 ) return true;
		  top.ShowAdvancedParams = false;
		  xtmldt_refreshMoreFields(top,xtml,context,pt);
	  }
	  top.appendChild(showLess);
  }
  else {
	  var showMore = $('<a class="xtmldt_showmore button_hyperlink">more...</a>')[0];
	  showMore.onmousedown = function(e) {
		  e = e || event;
	  	  if( e.button == 2 ) return true;
		  top.ShowAdvancedParams = true;
		  xtmldt_refreshMoreFields(top,xtml,context,pt);
		  aa_ensure_visible(top);
	  }
	  var moreWrap = $('<div />')[0];
	  moreWrap.appendChild(showMore);
	  top.appendChild(moreWrap);
  }
  
  aa_element_attached(top);
}
function aa_xtmldt_is_advanced_param(xtml,paramXml)
{
	if (paramXml.getAttribute('advanced') == 'always') return true;
	if (paramXml.getAttribute('advanced') != 'true') return false;
	if (!xtml) return true;
	var name = paramXml.getAttribute('name');
	var ptdef = aa_component_definition(xtml.getAttribute('t'));
	var attr = xtml.getAttribute(name);
	if (attr != null) {
		if (attr == "") return true;
		var ptdefval = ajaxart.totext_array(aa_xpath(ptdef,"Param[@name='" + name + "']/@Default"));
		if (ptdefval == '')
			ptdefval = ajaxart.totext_array(aa_xpath(ptdef,"Param[@name='" + name + "']/Default/@value"));
		return (attr == ptdefval);  // if not default it is not advanced
	}
	// not an attribute but an element
	var val = aa_xpath(xtml,name)[0];
	if (!val) return true;
	var ptdefval = aa_xpath(ptdef,"Param[@name='" + name + "']/Default")[0];
	if (!ptdefval) return false;
	
	// now compare val and ptdefval (except for the tag)
	var tmpVal = val.ownerDocument.createElement('Default');
	ajaxart.xml.copyElementContents(tmpVal,val);
	
	return ajaxart.xml2text(tmpVal) == ajaxart.xml2text(ptdefval);
}
function aa_xtmldt_summarytext(xtml,sep)
{
	var text = "";
	var pt = xtml.getAttribute('t');
	if (!pt) return "";
	var ptdef = aa_component_definition(pt);
	var params = aa_xpath(ptdef,"Param");
	for (var i=0;i<params.length;i++) {
		if (params[i].getAttribute('light') == 'false' || params[i].getAttribute('summary') == 'false') continue;

		var param = params[i].getAttribute('name');
		var type = params[i].getAttribute('type') || 'data.Data';
		var isBasicType = ( aa_textInList(type,["data.Data","data.Boolean","ui.Control"]) );  
		var extra_text = "";
		if (xtml.getAttribute(param) != null) {
			var def = aa_totext(aa_xpath(params[i],'@Default'));
			if (def == '') def = aa_totext(aa_xpath(params[i],'Default/@value'));
			if (xtml.getAttribute(param) == def) continue;
			var val = xtml.getAttribute(param);
			if (val.length < 50)
			  extra_text = param + ": " + xtml.getAttribute(param);
			else
			  extra_text = param + ": ...";
		}
		else {
			var elems = aa_xpath(xtml,param);
			if (elems.length == 1) {
				if (isBasicType) extra_text = param + ": " + "...";
				else {
					var t = elems[0].getAttribute('t');
					var def = aa_totext(aa_xpath(params[i],'Default/@t'));
					if (t && t != "" && t != def) {
					  var innerText = aa_xtmldt_summarytext(elems[0]," , ");
					  extra_text = param + ": " + t.substring(t.indexOf('.')+1);
					  if (innerText != "")
						  if (innerText.length < 10 ) extra_text += " ( " + innerText + " ) ";
						  else extra_text += ' ...';
					}
				}
			}
		}
		if (extra_text == "") continue;
		if (text != "") text += sep;
		text += extra_text;
	}
	return text;
}
function xtmldt_switch_pt(currT,newT,top_xtml,param,context)
{
	var xtml = aa_xpath(top_xtml,'!'+param)[0];
	var new_pt = aa_component_definition(newT);
	var generator = aa_xpath(new_pt,'ParamGenerator')[0];
	
	if (generator) var prev_xtml = xtml.cloneNode(true);
	
	ajaxart.writevalue(aa_xpath(top_xtml,'!'+param+'/@t'),newT);
	xtmldt_cleanXtmlOfParams(xtml,currT);

	if (generator) 
		ajaxart.run([xtml],generator,'',aa_ctx(context,{ PrevXtml: [prev_xtml] }));
}
function xtmldt_cleanXtmlOfParams(xtml,prevComp)
{
	var ptDef = aa_component_definition(xtml.getAttribute("t"));
	var prevPtDef = aa_component_definition(prevComp);
	
	if ( aa_hasAttribute(ptDef,'decorator') && prevComp != '') {
		var param = ptDef.getAttribute('decorator');
		var inner = xtml.ownerDocument.createElement(param);
		ajaxart.xml.copyElementContents(inner,xtml);
		inner.setAttribute('t',prevComp);
		var outer = xtml.ownerDocument.createElement(aa_tag(xtml));
		outer.setAttribute('t',xtml.getAttribute('t'));
		outer.appendChild(inner);
		
		xtml.parentNode.replaceChild(outer, xtml);
		return [];
	}
	for (var i=0; i<xtml.attributes.length; i++) {
		var name = xtml.attributes.item(i).name;
		if (name != "t" && name != "name") {
			var remove = true;
			var paramDef = aa_xpath(ptDef,"Param[@name='"+name+"']");
			if (paramDef.length == 0 || aa_component_param_type(ptDef,name) != aa_component_param_type(prevPtDef,name)) { 
			  xtml.removeAttribute(name);
			  i--;
			}
		}
	}
	var elems = aa_xpath(xtml,"*");
	for(var i=0;i<elems.length;i++) {
		var name = elems[i].tagName;

		var paramDef = aa_xpath(ptDef,"Param[@name='"+name+"']");
		if (paramDef.length == 0 || aa_component_param_type(ptDef,name) != aa_component_param_type(prevPtDef,name)) 
			if (name != 'Condition' && name != 'RunOn')
		  		elems[i].parentNode.removeChild(elems[i]);
	}

	// now clean inner texts
	aa_xml_clean_inner_texts(xtml);
}
