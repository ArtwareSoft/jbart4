ajaxart.load_plugin("field","plugins/jbart/field.xtml");
ajaxart.load_plugin("picklist","plugins/field/picklist.xtml");
ajaxart.load_plugin("validation","plugins/field/validation.xtml");
ajaxart.load_plugin("style","plugins/jbart/styles.xtml");
ajaxart.load_plugin("style","plugins/jbart/bootstrap.xtml");
ajaxart.load_plugin("style","plugins/jbart/facebook_styles.xtml");
ajaxart.load_plugin("notification_box","plugins/jbart/notification_box.xtml");
ajaxart.load_plugin("animation","plugins/jbart/animation.xtml");
ajaxart.load_plugin("", "plugins/jbart/imagegallery.xtml");
ajaxart.load_plugin("", "plugins/jbart/global_styles.xtml");


aa_gcs("field", {
	DynamicFields: function (profile,data,context)
	{
		var fieldItems = ajaxart.run(data,profile,'FieldItems',context);
		var out = [];

		for(var i=0;i<fieldItems.length;i++) {
			var field = aa_first([fieldItems[i]],profile,'Field', aa_ctx(context,{_FieldItem: [fieldItems[i]] })); 
			fixField(field,fieldItems[i]);
			out.push(field);
		}
		return out;

		function fixField(field,fieldItem) {
			field.FieldItem = fieldItems[i];
			aa_bind(field,'ModifyInstanceContext',function(args) {
				var ctx2 = aa_merge_ctx(context,args.Context);
				args.Context.vars._FieldItem = [field.FieldItem];
			},'DynamicFields',null,true);	// add as first listener, so other handlers can use _FieldItem
		}
	},
	Text: function (profile,data,context)   // gc of field.Text
	{
		var field = { isObject : true};
		var ctx2 = aa_ctx(context,{_Field: [field]} );

		field.Id = aa_text(data,profile,'ID',ctx2);
		field.ID = [field.Id];
		field.Title = aa_multilang_text(data,profile,'Title',ctx2);
		field.HideTitle = aa_bool(data,profile,'HideTitle',ctx2);
		field.CellPresentation = 'control';
		field.Style = aa_first(data,profile,'Style',context);
		
		field.TitleAsText = ! aa_paramExists(profile,'Text',true);
		
		field.Control = function(field_data,ctx) {
			var text = aa_multilang_text(field_data,profile,'Text',aa_merge_ctx(ctx2,ctx));
			if (!text && field.TitleAsText) text = field.Title;
			text = text.replace(/\n/g,"<br/>");
		
			return [ aa_renderStyleObject(field.Style,{ text: text, data: field_data[0] },ctx) ];
		}
		field.Text = function(field_data,ctx) {
			var text = aa_multilang_text(field_data,profile,'Text',aa_merge_ctx(ctx2,ctx));
			if (!text && field.TitleAsText) text = field.Title;
			text = text.replace(/\n/g,"<br/>");

			return [text];
		}
		ajaxart.runsubprofiles(data,profile,'FieldAspect',ctx2);
		return [field];
	},
	XtmlControl: function (profile,data,context)
	{
		var field = { isObject : true };
		field.Title = aa_multilang_text(data,profile,'Title',context);
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		field.FieldData = function(data1) { return data1; }
		field.CellPresentation = ["control"];
		
		aa_setMethod(field,'Control',profile,'Control',context);
		ajaxart.runsubprofiles(data,profile,'FieldAspect',aa_ctx(context,{_Field: [field]} ));
		
		return [field];
	},
	JavaScriptControl: function(profile,data,context)
	{
		var field = { isObject : true };
		field.Title = aa_multilang_text(data,profile,'Title',context);
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		field.FieldData = function(data1) { return data1; }
		field.CellPresentation = ["control"];
		
		var html_compiled = ajaxart.compile(profile,'Html',context);
		var js_func = aa_get_func(aa_text(data,profile,'JavaScript',context));
			
		var get_ctrl = function(data1,ctx) {
			var html = ajaxart_runcompiled_text(html_compiled, data1, profile, "Html" ,context);
			var control = $(html);
			if (control.length > 1) {
				var control2 = $('<div/>').append(control);
				control = control2;
			}
			if (html == "") control = [];
			var ctrl = (control.length > 0) ? control[0] : null;
			var ctrl_after_js;
			if (js_func) {
				var data_item = (data1.length > 0) ? data1[0] : null;
				ctrl_after_js = js_func(data_item,ctrl,ctx);
			}
			var out = (ctrl_after_js) ? ctrl_after_js : ctrl;
			if (!out) return [];
			$(out).addClass(aa_attach_global_css(aa_text(data,profile,'Css',context)));
			return [out];
		}
		var register = function(get_ctrl) {
			ajaxart_addScriptParam_js(field,'Control',get_ctrl,context);
		}
		register(get_ctrl);
		ajaxart.runsubprofiles(data,profile,'FieldAspect',aa_ctx(context,{_Field: [field]} ));
		
		return [field];
	},
	IsGroup: function (profile,data,context)
	{
		if (data.length == 0) return [];
		if (data[0].Fields != null) return ["true"];
		return [];
	},
	Fields: function (profile,data,context)
	{
		return ajaxart.runsubprofiles(data,profile,'Field',context);
	},
	InnerReferenceFields: function (profile,data,context)
	{
		var refFields = context.vars._ReferenceFields;
		if (refFields == null || refFields.length ==0) return [];
		var path = aa_text(data,profile,'Path',context);
		var out = refFields[0].FieldById[path.split('@').pop()];
		if (out != null && out.Fields != null) return out.Fields;
		return [];
	},
	SubFields: function (profile,data,context)
	{
		var parent = aa_first(data,profile,'Parent',context);
		var fields = [];
		var fillFields = function(parent) {
			var inner_fields = parent.Fields;
			for(var i=0;i<inner_fields.length;i++) {
				if (! inner_fields[i].IsGroup) fields.push(inner_fields[i]);
				else if (inner_fields[i].IsVirtualGroup ) fillFields(inner_fields[i]);
			}
		}
		if (parent != null)	fillFields(parent);
		return fields;
	},
	RefreshField: function(profile,data,context)
	{
		var fieldID = aa_text(data,profile,'FieldID',context);
		if (!fieldID) return;
		var field_ids = fieldID.split(',');
		var scope = aa_text(data,profile,'Scope',context);
		aa_refresh_field(field_ids,scope,aa_bool(data,profile,'FireOnUpdate',context),aa_first(data,profile,'Transition',context),context);
	},
	ToggleFieldClass: function(profile,data,context) {
		var ctrl = aa_find_field_controls({
			scope: aa_text(data,profile,'Scope',context),
			fieldID: aa_text(data,profile,'FieldID',context)
		})[0];
		var className = aa_text(data,profile,'ClassName',context);
		var show = aa_bool(data,profile,'ConditionForClass',context);
		if (ctrl) {
			if (show) $(ctrl).addClass(className);
			else $(ctrl).removeClass(className);
		}
	},
	RefreshFieldByElement: function(profile,data,context)
	{
		var element = aa_first(data,profile,'Element',context);
		var transition = aa_first(data,profile,'Transition',context);
		if (!element) return;
		
		aa_refresh_cell(element,context,transition,null,true);
	},
	FieldWithAspects: function (profile,data,context) {
		var field = aa_first(data,profile,'Field',context);
		if (!field) return [];
		ajaxart.runsubprofiles(data,profile,'FieldAspect',aa_ctx(context,{_Field:[field]}));

		return [field];
	},
	RefreshCurrentField: function (profile,data,context) {
		var element = context.vars.ControlElement[0];
		aa_refresh_cell(element,context,null,null,true);
	},
	FieldTitle: function (profile,data,context)
	{
		var field = ajaxart.run(data,profile,'Field',context);
		if (field.length == 0 || field[0].Title == null) return [];
		return [field[0].Title];
	},
	IsTabSelected: function(profile,data,context)
	{
		var tab_ctrl_id = aa_text(data,profile,'TabControl',context);
		var tab_id = aa_text(data,profile,'Tab',context);
		var out = [];

		$(aad_find_field(tab_ctrl_id,'aa_tabcontrol')).each(function(index,tab) {
			if ($(tab).find('.tab_' + tab_id).hasClass('aa_selected_tab')) out = ["true"];
		});
		return out;
	},
	RefreshTabsHead: function(profile,data,context)
	{
		var tabs = context.vars.ControlElement[0];
		if (tabs.RefreshTabsHead)
			tabs.RefreshTabsHead();
	}
});

aa_gcs('field_feature',{
	Hidden: function (profile,data,context) {
		var field = aa_var_first(context,'_Field');
		var use_field_data = aa_text(data,profile,'DataForCondition',context) == 'Field data';
		field.IsCellHidden = function(item_data,ctx,field_data) {	// field_data param is optional. If not passes, we calculate it
			var input_data = item_data;
			if (use_field_data && field_data)
				input_data = field_data;
			else if (use_field_data && field.FieldData)
				input_data = field.FieldData(item_data,aa_merge_ctx(context,ctx));

			return !aa_bool(input_data,profile,'ShowCondition',aa_merge_ctx(context,ctx));
		};
		field.RenderHiddenCell = aa_text(data,profile,'WhenHidden',context) != 'Do not render';

		aa_bind(field,'ModifyControl',function(args) {
			if (field.IsCellHidden(args.Item,args.Context,args.FieldData))
				aa_hide(args.Wrapper);
		});		
	},
	HiddenTableColumn: function (profile,data,context) {
		var field = aa_var_first(context,'_Field');
		field.IsFieldHidden = function(data2,ctx) {
			return !aa_bool(data2,profile,'ShowCondition',aa_merge_ctx(context,ctx));	
		};		
	}
});

aa_gcs('field_aspect',
{
	Description: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field)
			field.Description = aa_multilang_text(data,profile,'Description',context);
	},
	JavaScript: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var runWhen = aa_text(data,profile,'RunWhen',context);
    	var js = profile.getAttribute('Code');
    	if (!js) js = aa_text(data,profile,'Code',context);
		var func = aa_get_func(js);
		if (runWhen == 'init') func(data[0],null,field,context);
		if (runWhen == 'control' ||  runWhen == 'control attached' ) {
			aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
				if (runWhen == 'control') func(field_data[0],cell,field,ctx);
				if (runWhen == 'control attached') aa_addOnAttach(cell,function() { func(field_data[0],cell,field,ctx); });
			});
		}
	},
	PopupOnHover: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var delay = aa_int(data,profile,'Delay',context);

		aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
			cell.onmouseover = function() {
				if (cell.isInside) return;
				if (cell.jbTimer) clearTimeout(cell.jbTimer);
				cell.jbTimer = setTimeout(function() {
					if (cell.isInside)
					  ajaxart.runNativeHelper(field_data,profile,'Open',aa_merge_ctx(context,ctx,{ControlElement: [cell], Item:item}));
					cell.jbTimer = null;
				},delay);
				cell.isInside = true;
			};
			cell.onmouseout = function() { 
				cell.isInside = false;
			};
			cell.onclick = function() {
				if (cell.jbTimer) { clearTimeout(cell.jbTimer); cell.jbTimer=null; }
				ajaxart.runNativeHelper(field_data,profile,'Open',aa_merge_ctx(context,ctx,{ControlElement: [cell], Item:item}));
			}
		},'PopupOnHover');
	},
	TextSummary: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		if (aa_bool(data,profile,'IgnoreEmptyValues',context)) {
			var compiled = ajaxart.compile_text(profile, "Text",context);
			field.Text = function(data1,ctx) {
				if (aa_totext(data1) == "") return [];
				return [compiled(data1,ctx)];
			}
		}
		else
			aa_addMethod(field,'Text',profile,'Text',context);
		return [];
	},
	NumberFormat: function (profile,data,context)
	{
		var field = context.vars._Field && context.vars._Field[0];
		if (field == null) return [];
		var compiled_format = ajaxart.compile(profile,'Format',context);

		if (compiled_format != 'same')
			aa_addMethod(field,'Text',profile,'Format',context);
		return [];
	},
	Tooltip: function(profile,data,context)
	{
		var field = context.vars._Field[0];
		field.Tooltip = aa_multilang_text(data,profile,'Tooltip',context); 
//		aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
//			cell.title = aa_multilang_text(field_data,profile,'Tooltip',context);
//		});
		aa_field_handler(field,'ModifyCell', function(cell,field_data) {
			cell.title = aa_multilang_text(field_data,profile,'Tooltip',context);
		});
	},
	RunAction: function(profile,data,context)
	{
		var field = context.vars._Field[0];
		ajaxart.runNativeHelper(data,profile,'SetupAction',context);
		jBart.bind(field,'ModifyControl',function(args) {
			var content = args.Wrapper.jbContent || args.Wrapper.firstChild || args.Wrapper; 
			ajaxart.run(args.FieldData,profile,'AfterControlCreated',aa_ctx(context,{ControlElement: [content]}));
		});
	},
	AsynchAction: function(profile,data,context)
	{
		var field = context.vars._Field[0];
		field.AsyncActionRunner = function(settings) {
			var result = settings.Wrapper || settings.wrapper;
			var style = aa_first(data,profile,'LoadingStyle',context);
			var loading = aa_renderStyleObject(style,{
				text: aa_text(data,profile,'LoadingText',context)
			},context);
			result.appendChild(loading);

		    var newContext = aa_ctx(context,{ });
			ajaxart_RunAsync(data,ajaxart.fieldscript(profile,'Action'),newContext,function(data1,ctx,success) {
				aa_empty(result);
				// there are 2 ways for field control: createCellControl and aa_fieldControl
				if (settings.CreateCellControl) {
					var ctx = settings.context;
					var inner = settings.wrapper;
					var cell_data = ajaxart_field_calc_field_data(field,settings.field_data,ctx);
					var cntr = ctx.vars._Cntr && ctx.vars._Cntr[0];
					
					if (field.AsSection && !field.HideTitle) {
						var sectionCtrl = aa_buildSectionControl(cntr,field,settings.field_data,cell_data,ctx);
						inner.appendChild(sectionCtrl);
					} else {
						ajaxart_field_createCellControl(settings.field_data,cntr,inner,"control",field,cell_data,ctx);
					}
				} else {
					settings.Wrapper = result;
					aa_fieldControl(settings,true);
				}
				aa_element_attached(result.firstChild);
			});
		};
	},
	RefreshDependentFields: function(profile,data,context)
	{
		var field = context.vars._Field[0];
		field.DependentFields = aa_text(data,profile,'FieldsIds',context);
		field.RefreshOn = aa_text(data,profile,'RefreshOn',context);
		field.RefreshScope = aa_text(data,profile,'RefreshScope',context);
		
		aa_field_handler(field,'OnUpdate', function(field,field_data,input) {
			if (field.RefreshOn == 'every click with delay')
				aa_run_delayed_action('RefreshDependentFields_'+field.Id,function() { doUpdate(input); } ,600,true);
			else
				doUpdate(input);
		});		

		function doUpdate(input) {
			// using container context, if exists
			var ctx = context;
			var cntr = $(input).parents('.aa_container')[0];
			if (cntr) ctx = cntr.Cntr.Context;
			ajaxart_field_RefreshDependentFields(field,input,ctx);	
		}
	},
	SortMethodOld: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		if (!field) return [];
		var method = aa_text(data,profile,'Method',context);
		if (method == "numeric")
			field.SortValFunc = function(x) { return parseFloat(x); }
		if (method == "date")
			field.SortValFunc = function(x) { return aadate_date2int(x); }
	},
	Title: function (profile,data,context)  // gc of field_aspect.Title
	{
		var field = context.vars._Field[0];
		field.Title = aa_multilang_text(data,profile,'Title',context);
		
		field.DynamicTitle = function(data1,ctx) {
			return aa_multilang_text(data1,profile,'Title',aa_ctx(context,ctx));
		}
	},
	ChangeFieldID: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var id = aa_text(data,profile,'ID',context);
		field.Id = id;
		field.ID = [id];
	},
	ShowErrorOnCondition: function (profile,data,context) {
		var field = context.vars._Field[0];
		field.OriginalControl = field.Control;
		field.Control = function(field_data,ctx) {
			var ctx2 = aa_merge_ctx(ctx,context);
			if (aa_bool(field_data,profile,'ConditionToShowError',ctx2)) {
				var errorText = aa_text(field_data,profile,'ErrorText',ctx2);
				var errorStyle = aa_first(field_data,profile,'ErrorStyle',ctx2);

				return [aa_renderStyleObject(errorStyle, {
					text: errorText,
					field_data: field_data, field: field
				}, ctx2,true)];
			} else {
				return this.OriginalControl(field_data,ctx);
			}
		}
	}, 
	FeatureForChildren: function (profile,data,context) {
		var field = context.vars._Field[0];
		aa_bind(field,'innerFields',function(args) {
			for(var i=0;i<args.Fields.length;i++) {
				aa_run(data,profile,'Feature',aa_ctx(context,{ _Field: [args.Fields[i]] }));
			}
		});
	},
	ShowFirstSucceedingChild: function (profile,data,context) {
		var field = context.vars._Field[0];
		aa_bind(field,'innerFields',function(args) {
			if (args.Fields.length > 1) 
				args.Fields.splice(1,args.Fields.length);
		});
	},
	Variable: function (profile,data,context) {
		var field = context.vars._Field[0];
		var varName = aa_text(data,profile,'VarName',context);

		aa_bind(field,'ModifyInstanceContext',function(args) {
			var ctx2 = aa_merge_ctx(context,args.Context);
			args.Context.vars[varName] = ajaxart.run(args.FieldData,profile,'Value',ctx2);
		});
	},
	GlobalVariable: function (profile,data,context) {
		var field = context.vars._Field[0];
		var varName = aa_text(data,profile,'ResourceName',context);

		aa_bind(field,'ModifyInstanceContext',function(args) {
			var ctx2 = aa_merge_ctx(context,args.Context);
			aa_setDataResource(context,varName,aa_run(args.FieldData,profile,'Value',ctx2));
		});
	},
	VariableForCellElement: function (profile,data,context) {		
		var field = context.vars._Field[0];
		var varName = aa_text(data,profile,'VarName',context);

		aa_bind(field,'ModifyInstanceContext',function(args) {
			var wrapper = aa_var_first(args.Context,'Wrapper');
			if (wrapper)
				args.Context.vars[varName] = [wrapper];
		});
	},
	TransitionForRefresh: function (profile,data,context) {
		var field = context.vars._Field[0];
		field.TransitionForRefresh = aa_first(data,profile,'Transition',context);
	},
	AddControl: function (profile,data,context) {
		var field = context.vars._Field[0];
		var wrapperCss = aa_cssClass(data,profile,'CssForWrapper',context,'add_control_wrapper');
		aa_bind(field,'ModifyControl',function(args) {
			$(args.Wrapper).addClass(wrapperCss);
			var ctx = aa_merge_ctx(context,args.Context);
			var innerPage = aa_first(data,profile,'Contents',ctx);

			var div = $('<div style="display:inline-block" />')[0];
			aa_fieldControl({Field: innerPage, FieldData: args.FieldData, Item: args.FieldData, Wrapper: div, Context: ctx});

			args.Wrapper.appendChild(div);
		});
	},
	ColumnWidth: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.Width = ajaxart.run(data,profile,'Width',context);
	},
	HighlightSubTextOnFilter: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var idForFilteredResults = 0;
		var highlight_class = aa_attach_global_css( aa_text(data,profile,'HighlightCss',context) , null, 'highlight' );
		
		if (context.vars.ItemListCntr) { // new itemlist
			var itemlistCntr = context.vars.ItemListCntr[0];
			aa_bind(field,'ModifyCell',function(args) {
				var filter = itemlistCntr.GetFilterOfSpecificResult && itemlistCntr.GetFilterOfSpecificResult(args.Item[0],args.FieldData);
				if (filter && filter.FilterType && filter.FilterType.HighlightSelectedText) {
					  var content = $(args.Wrapper).find(">.aa_text,>span>.aa_text")[0];
					  if (!content && args.Wrapper.firstChild && args.Wrapper.firstChild.nodeType == 1) content = args.Wrapper.firstChild;
					  content = content || args.Wrapper; 
					
					  filter.FilterType.HighlightSelectedText(content,highlight_class + ' aa_highlight',itemlistCntr.GetFilterQueryData(filter));
				}
			});
			return;
		}
		aa_field_handler(field,'ModifyCell', function(cell,field_data,cell_presentation,ctx,item) {
			  var cntr = ctx.vars.DataHolderCntr && ctx.vars.DataHolderCntr[0];
			  var filterObject = null;
			  if (cntr && cntr.IDForFilteredResults && cntr.IDForFilteredResults > 1) {
				  if (cntr.IDForFilteredResults != idForFilteredResults) {
					  idForFilteredResults = cntr.IDForFilteredResults;
					  if (cntr.Filters) {
						  for(var j=0;j<cntr.Filters.length;j++) {
							  if (cntr.Filters[j].field == field) {
								  filterObject = cntr.Filters[j];
							  }
						  }
					  }
					  cntr.FieldsCache = cntr.FieldsCache || {};
					  cntr.FieldsCache[field.Id] = filterObject;
				  } else {
					  filterObject = cntr.FieldsCache[field.Id];
				  }
				  if (!filterObject || !filterObject.HighlightSelectedText) return;
				  				  
				  var content = $(cell).find(">.aa_text,>span>.aa_text")[0];
				  if (!content && cell.firstChild && cell.firstChild.nodeType == 1) content = cell.firstChild;
				  content = content || cell; 
				  
				  filterObject.HighlightSelectedText(content,highlight_class + ' aa_highlight');
			  }
		},'HighlightSubTextOnFilter');
		
	},
	Password: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.ManualWriteValue = true;
		field.HashPassword = aa_bool(data,profile,'HashPassword',context);
		
		field.Control = function(field_data,ctx)
		{
			var field = context.vars._Field[0];
			return [ajaxart_field_createSimpleInput(field_data,context,false,'PASSWORD')];
		}
		field.ReadOnlyControl = function(field_data,ctx)
		{
			return $('<div>*****</div>').get(); 
		}
		
		aa_field_handler(field,'OnKeyup',function(field,field_data,input,e) {
			var field = context.vars._Field[0];
			var hash = (field.HashPassword) ? ajaxart_hashPassword(input.value) : input.value;
			ajaxart.writevalue(field_data,hash);
		},'password');
		
		return ["true"];
	},
	DisableCharacters: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.KeyPressValidator = new RegExp(aa_text(data,profile,'CharacterPattern',context));
	},
	DefaultValue: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		// old field
		field.DefaultValue = function(data1,ctx) {
			return ajaxart.run(data1,profile,'Value',aa_merge_ctx(context,ctx));
		}
		// new field
		field.HasDefaultValue = true;
		aa_bind(field,'FieldData',function(args) {
			if (aa_totext(args.FieldData) == '')
				ajaxart.writevalue(args.FieldData,field.DefaultValue(args.Item,aa_merge_ctx(context,args.Context)),true);
		},'DefaultValue');
	},
	DisableByCondition: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var cssClass = aa_cssClass(data,profile,'CssForDisabled',context);

		field.Disabled = function(data1,ctx)
		{
			var item = ctx.vars._Item ? ctx.vars._Item : data1;
			return aa_bool(item,profile,'EnableCondition',context) ? [] : ['true'];
		}
		field.IsDisabled = function()
		{
			return !aa_bool(data,profile,'EnableCondition',context);
		}
		field.DisableText = function()
		{
			return aa_text(data,profile,'DisableText',context);
		}
		aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
				$(cell).find('.field_control').each(
				function() { 
					input = this;
					var enable = aa_bool(item,profile,'EnableCondition',context);
					if (enable)
					{
						$(this).find("input").removeAttr("disabled").removeClass('aa_disabled');
						$(this).removeAttr("disabled");
						$(input).removeClass('aa_disabled');
						$(this).removeClass('aa_disabled ' + cssClass);
					}
					else
					{
						$(this).find("input").attr("disabled","disabled");
						$(this).attr("disabled","disabled");
						$(input).addClass('aa_disabled ' + cssClass);
					}
				});
		},'DisableByCondition');
	},
	HideByCondition: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		if (!aa_bool(data,profile,'CheckConditionForEveryItem',context)) {
			field.Hidden = function(data1,ctx)
			{
				var item = ctx.vars._Item ? ctx.vars._Item : data1;
				return aa_bool(item,profile,'ShowCondition',context) ? [] : ['true'];
			}
		}
		aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
			    var cellParent = $(cell).parent();
				var parent_line = $(cell).parent()[0];
			    var elem_to_hide = parent_line;
				if (! (cellParent.hasClass('field_row') || cellParent.hasClass('aa_section') ) )
					elem_to_hide = cell;
			    if (aa_bool(field_data,profile,'ShowCondition',aa_merge_ctx(context,ctx)))
			    {
			    	$(cell).removeClass('aa_hidden_field');
			    	elem_to_hide.style.display = '';
			    	elem_to_hide.display = '';
			    }
			    else
			    {
			    	$(cell).addClass('aa_hidden_field');
			    	elem_to_hide.style.display = 'none';
			    	elem_to_hide.display = 'none';
			    }
		},'HideByCondition');
	},
	CheckConditionForEveryItem: function(profile,data,context) {
		return [{
			apply: function(field,context) {
				var use_field_data = aa_text(data,profile,'DataForCondition',context) == 'Field data';
				field.IsCellHidden = function(item_data,ctx,field_data) {	// field_data param is optional. If not passes, we calculate it
					var input_data = item_data;
					if (use_field_data && field_data)
						input_data = field_data;
					else if (use_field_data && field.FieldData)
						input_data = field.FieldData(item_data,aa_merge_ctx(context,ctx));

					return !aa_bool(input_data,profile,'ShowCondition',aa_merge_ctx(context,ctx));	// todo: compile
				};
				field.RenderHiddenCell = aa_text(data,profile,'WhenHidden',context) != 'Do not render';

				aa_bind(field,'ModifyControl',function(args) {
					if (field.IsCellHidden(args.Item,args.Context,args.FieldData))
						aa_hide(args.Wrapper);
				});

			}
		}];
	},
	CheckConditionOnce: function(profile,data,context) {
		return [{
			apply: function(field,context) {
				field.IsFieldHidden = function(data2,ctx) {
					return !aa_bool(data2,profile,'ShowCondition',aa_merge_ctx(context,ctx));	// todo: compile
				};
			}
		}];
	},
	Hidden: function(profile,data,context) {
		var field = context.vars._Field[0];
		var on_condition = aa_first(data,profile,'OnCondition',context);
		if (!on_condition) {
			field.IsHidden = true;
			field.IsFieldHidden = function() { return true; }

			// backward compatability
			aa_bind(field,'ModifyControl',function(args) {
				aa_hide(args.Wrapper);
			});
		}
		else
			if (on_condition.apply) on_condition.apply(field,context);
	},
	CustomSuggestionBox: function(profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		ajaxart.customsuggestbox.init(field,data,profile,context);
		return [];
	},
  AddTextToSuggestionBox: function (profile, data,context)
  {
	  ajaxart.customsuggestbox.addTextToSuggestionBox(profile, data,context);  
	  return [];
  },
  CloseSuggestionBox: function (profile, data,context)
  {
	  ajaxart.suggestbox.closePopup();
	  return [];
  },
  OpenSuggestionBoxPopup: function (profile, data,context)
  {
	  ajaxart.customsuggestbox.openSuggestionBoxPopup(profile, data,context);
	  return [];
  },
  OpenSuggestionBoxList: function (profile, data,context)
  {
	  ajaxart.customsuggestbox.openSuggestionBoxList(profile, data,context);
	  return [];
  },
  TriggerSuggestionBoxPopup: function (profile, data,context)
  {
	  ajaxart.customsuggestbox.triggerSuggestionBoxPopup(profile, data,context);
	  return [];
  },
  Hyperlink: function(profile,data,context)
  {
	var field = context.vars._Field[0];
	var cssClass = aa_attach_global_css( aa_text(data,profile,'Css',context) , null, 'hyperlink' );
	
	aa_field_handler(field,'ModifyCell', function(td,field_data,cell_presentation,ctx,item) {
		$(td).addClass("aa_hyperlink").addClass(cssClass);
		td.onclick = function() {
			if (window.aa_incapture) return;
			ajaxart.run(item,profile,'Action',aa_ctx(aa_merge_ctx(context,ctx), {_ItemsOfOperation:item, Item:item, _ElemsOfOperation:[this.parentNode] , ControlElement: [td]}));
		}
	});
  },
  ImageInTextbox: function(profile,data,context)
  {
	var field = context.vars._Field[0];
	aa_field_handler(field,'ModifyCell', function(td,field_data,cell_presentation,ctx,item) {
		var input = $(td).find('.aatextbox')[0];
		var img = $('<img src="'+aa_text(data,profile,'Image',context)+'" />');
		img[0].style.cssText = aa_text(data,profile,'CssForImage',context);
		img.insertAfter(input);
	});
  },
  RunningInputFieldData: function(profile,data,context)
  {
	  if (context.vars._Field && context.vars._Cntr && context.vars._Cntr[0].Items[0])
		  return context.vars._Field[0].FieldData(context.vars._Cntr[0].Items[0].Items);
	  return [];
  }
});

aa_gcs("search_algorithm", {
	SimpleSearch: function (profile,data,context) 
	{
		var matchOnlyTextBeginning = aa_bool(data,profile,'MatchOnlyTextBeginning',context);
		return [ {
			newFilter: aa_create_text_filter(matchOnlyTextBeginning) 
		}];
	},
	SearchWords: function (profile,data,context)
	{
		return [ {
			newFilter: aa_create_search_words_text_filter() 
		}];
	}
});



ajaxart.gcs.datefilter =
{
	ExpressionToFromTo: function (profile,data,context)
	{
		if (! ajaxart.isxml(data)) return [];
		var exp = data[0].getAttribute('Expression') || "";
		var vals = exp.split('-');
		if (vals.length != 2) return [];
		data[0].setAttribute('From',vals[0]);
		data[0].setAttribute('To',vals[1]);
	}
}


ajaxart.gcs.validation =
{
	ContainsText: function (profile,data,context) 
	{
	  var text = aa_totext(data);
	  if (text == "") return [];
	  var lookFor = aa_text(data,profile,'Text',context);
	  return aa_frombool( text.indexOf(lookFor) == -1 );
	},
	IsNumber: function (profile,data,context) {
		var value = aa_totext(data);
		if (isNaN(Number(value))) return ["true"];
		if (value.charAt(0) == '0' && value.length > 1 && value.charAt(1) != '.') return ["true"];
		return [];
	},
	MatchesRegularExpression: function (profile,data,context) 
	{
		var text = aa_totext(data);
		if (text == "") return [];
		
		var lookFor = aa_text(data,profile,'Expression',context);
		return aa_frombool(!text.match('^' + lookFor + '$'));
	},
	Unique: function (profile,data,context)
	{
		var text = aa_totext(data); 
		if (text == "") return [];
		var options = ajaxart.run(data,profile,'OtherValues',context);
		for(var i=0;i<options.length;i++) {
			if (text == aa_totext([options[i]]) && options[i] != data[0]) return ["true"]; 
		}
	},
	PassingValidations: function (profile,data,context) 
	{
		var ctrl = aa_first(data,profile,'TopControl',context);
		return aa_frombool( aa_passing_validations(ctrl) );
	},
	ShowValidationError: function (profile,data,context) 
	{
		var ctrl = aa_first(data,profile,'TopControl',context);
		var error = aa_multilang_text(data,profile,'Error',context);
		aa_validation_showerror(ctrl,error,null,context);
		return [];
	}
}


aa_gcs("notification_box", {
	NotificationBox: function (profile,data,context) 
	{
	  var field = aa_create_base_field(data, profile, context);
	  field.Control = function(data1,ctx) {
		  var out = aa_renderStyleObject(field.Style,{
			  notification_id: aa_text(data,profile,'ID',context),
			  setStatusClass: function(status) {
			    var classes = this.className.split(' ');
			    var found = false;
			    for(var i=0;i<classes.length;i++) {
			    	if (classes[i].indexOf('aanotif_status_') == 0) {
			    		classes[i] = 'aanotif_status_' + status;
			    		found = true;
			    	}
			    }
			    if (!found) classes.push('aanotif_status_' + status);
			    this.className = classes.join(' ');
		  	  }
		  },context);
		  $(out).addClass('aa_notification_box_'+out.notification_id);

		  if (aa_text(data,profile,'TextToShowOnPreview',context)) {
			var evt = { text: aa_text(data,profile,'TextToShowOnPreview',context) , status: 'info' };
			out.trigger('notification',evt);	  	
		  }

		  return [out];
	  }
	  return [field];
	},
	ShowNotification: function (profile,data,context)
	{
		aa_showNotification(context,
			aa_text(data,profile,'NotificationBox',context),
			aa_int(data,profile,'Duration',context),
			aa_text(data,profile,'Text',context),
			aa_text(data,profile,'Status',context)
		);
	}
});

function aa_showNotification(context,id,duration,text,status) {		
		var top = aa_intest ? aa_intest_topControl : document;
		var notificationBoxes = $(top).find('.aa_notification_box_'+id);
		for (var i=0;i<notificationBoxes.length;i++) {
			var evt = { text: text , status: status, duration:duration };
			notificationBoxes[i].trigger('notification',evt);
		}
}
function aa_notification_box(notificationBox,settings) {
	settings = aa_defaults(settings,{
		DurationTime: 2000
	});
  
  var jBox = notificationBox.$el;
  notificationBox.bind('notification',function(evt) {
     notificationBox.setStatusClass( evt.status );
     jBox.html(evt.text);
     jBox.css('opacity','0');
     jBox.addClass('shown');
     if (evt.status == 'clear') jBox.removeClass('shown');
     jBox.animate({opacity: 1},'slow');
     if (evt.status == 'saving') return;
     
     setTimeout(function() {
       jBox.animate({opacity: 0},'slow', function() { jBox.html(''); jBox.removeClass('shown');}); 
     },evt.duration || settings.DurationTime);
  });          

}

ajaxart.gcs.transition =
{
	RightSlide: function (profile,data,context)
	{
	  var obj = { isObject:true }
	  obj.replace = function(oldElem,newElem)
	  {
		  aa_left_right_slide(oldElem,newElem,'RightSlide',aa_int(data,profile,'Duration',context),aa_text(data,profile,'Background',context), aa_bool(data,profile,"CoverLeftMargin",context));
	  }
	  return [obj];
	},
	LeftSlide: function (profile,data,context) 
	{
	  var obj = { isObject:true }
	  obj.replace = function(oldElem,newElem)
	  {
		  aa_left_right_slide(oldElem,newElem,'LeftSlide',aa_int(data,profile,'Duration',context),aa_text(data,profile,'Background',context));
	  }
	  return [obj];
	},
	Fade: function (profile,data,context) 
	{
	  var obj = { isObject:true }
	  obj.replace = function(oldElem,newElem)
	  {
		  aa_refresh_fade_transition(oldElem,newElem,'LeftSlide',aa_int(data,profile,'Duration',context));
	  }
	  return [obj];
	}
};
function aa_refresh_fade_transition(oldElem,newElem,type,duration) {
	  var old_parent_position = newElem.parentNode.style.position;
	  if (!old_parent_position) newElem.parentNode.style.position = 'relative';
	  var new_zindex = (oldElem.style.zIndex) ? newElem.style.zIndex+1 : 1;
	  var css = "#this.newtrans { transition: opacity " + duration + "ms ease-out; opacity:1; }" + 
	  	"#this { position:absolute; top:0px; z-index:" + new_zindex + "; opacity:0; }";
	  var cssForOld = "#this.newtrans { transition1: opacity " + duration + "ms ease-out;  opacity: 0; }" + 
	  	"#this { opacity:1; }";
	  var cls = aa_attach_global_css(css);
	  var clsOld = aa_attach_global_css(cssForOld);
	  $(newElem).addClass(cls);
	  $(oldElem).addClass(clsOld);
	  setTimeout(function() { $(oldElem).addClass('newtrans'); $(newElem).addClass('newtrans'); });
	  
	  setTimeout(function() {
		  if (!newElem || !newElem.parentNode) return;
		  newElem.parentNode.style.position = old_parent_position;
		  $(newElem).removeClass(cls).removeClass('newtrans');
		  aa_remove(oldElem,true);
	  },duration);	
}
function aa_left_right_slide(oldElem,newElem,type,duration,background,use_cover)
{
	  var old_parent_position = newElem.parentNode.style.position;
	  if (!old_parent_position) newElem.parentNode.style.position = 'relative';
	  var new_width = Math.max(oldElem.clientWidth,newElem.clientWidth);
	  var new_height = Math.max(oldElem.clientHeight,newElem.clientHeight);
	  var left_start = (type == 'LeftSlide') ? new_width : -new_width;
	  var width_start = (type == 'LeftSlide') ? 0 : new_width;
	  var new_zindex = (oldElem.style.zIndex) ? newElem.style.zIndex+1 : 1;
	  var background_css = ";background:" + background;
	  if (background == "") background_css = "";
	  var cover;
	  if (type == 'RightSlide' && use_cover) {
		  cover = document.createElement('div');
		  cover.style.cssText = "position:absolute; height: " + new_height + "px; top:0px; left: -"+ new_width + "px; width:" + new_width + "px;" + background_css + ";z-index:" + new_zindex+1;
		  newElem.parentNode.appendChild(cover);
	  }
	  var css = "#this.newpos { left: 0px; width: " + new_width + "px; } " + 
	  			"#this.newpos { -webkit-transition: width " + duration + "ms ease-out, left " + duration + "ms ease-out }" + 
	  			"#this { position:absolute; top:0px; overflow-x:hidden; width:" + width_start + "px; z-index:" + new_zindex + "; left: " + left_start + "px" +
	  			background_css + ";height:" + new_height + "px" +
	  			"} ";
	  var cls = aa_attach_global_css(css);
	  $(newElem).addClass(cls);
	  setTimeout(function() { $(newElem).addClass('newpos'); });
	  
	  setTimeout(function() {
		  if (!newElem || !newElem.parentNode) return;
		  newElem.parentNode.style.position = old_parent_position;
		  $(newElem).removeClass(cls).removeClass('newpos');
		  if (cover) newElem.parentNode.removeChild(cover);
		  aa_remove(oldElem,true);
	  },duration);
}

function aa_showblock(block,data,context) 
{
	var ctrl = block.Control(data,context);
	if (ctrl.length == 0) return null;
	
	if (block.ModifyControl)
		for(var i=0;i<block.ModifyControl.length;i++)
			block.ModifyControl[i](ctrl[0],[],'control',context,[]);
	
	return ctrl[0];
}
function ajaxart_fieldaspect_getField(context) {
  var field = context.vars['_Field'];
  if (field == null || field.length == 0) return null;
  return field[0];
}

function ajaxart_field_getFields(cntr,mode,item_data)
{
	if (typeof(item_data) == "undefined") item_data = [];
	
	var fields = cntr.Fields;
	var out = [];
	var isNew = cntr.IsNewItem;
	var isReadOnly = ( cntr.Items[0].ReadOnly != null && ajaxart.tobool_array(cntr.Items[0].ReadOnly) );
	var isEdit = ! (isNew || isReadOnly); 
	for(var i=0;i<fields.length;i++) {
		var field = fields[i];
		
		if (field.IsHidden) continue;
		if (isNew && field.HiddenForNew) continue;
	    if (isReadOnly && field.HiddenForReadOnly) continue;
	    if (isEdit && field.HiddenForEdit) continue;
	    if (mode == "table" && field.HiddenForTable) continue;
	    if (mode == "property sheet" && field.HiddenForProperties) continue;
	    if (mode != "property sheet" && field.Hidden && aa_tobool(field.Hidden(item_data,cntr.Context)) ) continue;	    
		out.push(fields[i]);
	}
	
	return out;
}

function ajaxart_field_fix_title(field,path,context)
{
	if (field.Title == null || field.Title.length == 0)
	{
		var title = path.split('/').pop().split('@').pop();
		title = title.substr(0,1).toUpperCase() + title.substr(1,title.length);
		title = aa_text_capitalizeToSeperateWords(title);
		
		field.Title = ajaxart_multilang_text(title,context);
	} 
}

function ajaxart_field_text(field,field_data,item,context)
{
	if (field.Text)
		var result = ajaxart.totext_array(aa_runMethod(field_data,field,'Text',context));
	else if (item[0].__item) // is wrapper
		var result = item[0][field.Id];
	else
		var result = ajaxart.totext_array(field_data);
	if (field.Highlight)
		result = ajaxart_field_highlight_text(result,field.Highlight);
	return result;
}

function ajaxart_field_is_readOnly(cntr,field,context)
{
	if (field.Writable) return false;
	if (field.ReadOnly == true) return true;
	if (aad_object_run_boolean_method(field,'ReadOnly',[],context)) return true;
	if (!cntr) return false;
	if (cntr.Items == null) return true;
	if (cntr.Items[0].ReadOnly == true) return true;
	if (cntr.ReadOnly) return true;
	return ( cntr.Items[0].ReadOnly != null && ajaxart.tobool_array(cntr.Items[0].ReadOnly) );
}

function aa_fieldById(id, fields)
{
	if (fields)
		for(var i=0;i<fields.length;i++) {
			if (fields[i].Id == id) return fields[i];
			if (fields[i].IsGroupOnlyForLayout) {	// getting inside groups
				var result = aa_fieldById(id,fields[i].Fields);
				if (result) return result;
			}
		}
	
}

function ajaxart_field_calc_field_data(field,item_data,context)
{
	if (field.Multiple && field.MultipleItems) // multiple with items - field data is not relevant
		return item_data;
	if (field.FieldData)
	{
		var results = aa_runMethod(item_data,field,'FieldData',context);
		// fielddata must not return more than one element
		if (results.length < 2) 
			return results;
		else
			return [results[0]];
	}
	else 
		return item_data;
}

function ajaxart_field_RefreshDependentFields(field,srcElement,context)
{
	if (!field|| !field.DependentFields) return;
	
	var parent = $(document);
	if (field.RefreshScope == 'container' || field.RefreshScope == 'screen')
		parent = $(srcElement).parents('.aa_container,.aa_widget').slice(-1);
	else if (field.RefreshScope == 'group')
		parent = $(srcElement).parents('.aa_container,.aa_widget').slice(0,1);
	else if (field.RefreshScope == 'item' ) // depricated
		parent = $(srcElement).parents('.aa_item').slice(0,1);
	else if (field.RefreshScope == 'table line' )
	{
		var listIndex = $(srcElement).parents().index($(srcElement).parents('.aa_list'));
		var parents_up_to_list = $(srcElement).parents().slice(0,listIndex);
		parent = parents_up_to_list.filter('.aa_item').slice(-1);
	}
	if (field.RefreshScope == 'screen' && !parent[0]) parent = $(document);

	var dependent = field.DependentFields.split(',');
	for(var f=0;f<dependent.length;f++)
	{
		var fieldID = dependent[f];
		if (field.RefreshScope == 'sibling') { 
			aa_refresh_sibling_field(srcElement,fieldID,context);
		} else {
			var ctrls = parent.find(".fld_" + fieldID);
			for(var i=0;i<ctrls.length;i++)
				aa_refresh_cell(ctrls[i],context);
		}
	}
}
function aa_build_th(cntr,field,ctx)
{
	var th = $('<th class="fieldtitle th_' + field.Id + '"><span class="aa_field_menu">&nbsp;</span><span class="fieldtitle_title"/><span class="fieldtitle_sort">&nbsp;</span></th>');
	th[0].Field = field;
	th.find('>.fieldtitle_title').text(field.Title);
	var width = ajaxart_getUiPref(cntr.ID[0],field.Id+'_ColumnWidth',ctx) || ajaxart.totext_array(field.Width);
	if (width != null)
	  $(th).width(width);

	if (field.AddInfoIcon) 
		field.AddInfoIcon(th.get(),ctx);
	var field_menu_elem = $(th).find('>.aa_field_menu')[0];
	if (field_menu_elem && cntr.EnableFieldMenu)
	{
		field_menu_elem.onmousedown = function(e) 
		{ 
	    	var newContext = aa_ctx( ctx, {
	    			MousePos: [ { isObject: true, pageX: e.pageX || e.clientX, pageY: e.pageY || e.clientY} ]
	    	});
	    	if (th.OpenFieldMenu)
	    		th.OpenFieldMenu(newContext);
			return aa_stop_prop(e);
		}
	}
	return th[0];
}

function ajaxart_field_fix_th(cntr,th,field,ctx)
{
	var width = ajaxart_getUiPref(cntr.ID[0],field.Id+'_ColumnWidth',ctx) || ajaxart.totext_array(field.Width);
	if (width != null)
	  $(th).width(width);
}

function ajaxart_subfield_bypath(field,path) {
	if (path == "") return field;
	if (field.Fields == null) return null;
	var path1 = path,rest = "";
	if (path.indexOf('/') > -1) { 
		path1 = path.substring(0,path.indexOf('/')-1); 
		rest = path.substring(path.indexOf('/')+1);
	}
	for(var i=0;i<field.Fields.length;i++) {
		var subfield = field.Fields[i];
		if (subfield.Path != null) {
			if (subfield.Path == path1) return ajaxart_subfield_bypath(subfield,rest);
		} else {  // no path. maybe virtual group
			var result = ajaxart_subfield_bypath(subfield,path);
			if (result != null) return result;
		}
	}
	return null;
}
function aa_field_handler(field,event,handler,id,phase)
{
	aa_register_handler(field,event,handler,id,phase);
}

function aa_invoke_field_handlers(eventFuncs,input,e,field,field_data,extra)
{
	if (aa_incapture) return;
	if (eventFuncs)
		for(var i=0;i<eventFuncs.length;i++)
			eventFuncs[i](field,field_data,input,e,extra);
}

function ajaxart_fields_aftersave(item,data,originalData,fields,context)
{
  if (fields == null) return;
  for(var i=0;i<fields.length;i++) {
	  var field = fields[i];
	  var data1 = data; odata1 = originalData;
	  var path = field.Path;
	  if (path == null) path = "";
	  
	  if (path != "" && data1.length >0) data1 = aa_xpath(data1[0],path);
	  if (path != "" && odata1.length >0) odata1 = aa_xpath(odata1[0],path);
	  
	  if (field.Fields != null) {
		  ajaxart_fields_aftersave(item,data,originalData,field.Fields,context);
	  }
	  if (field.AfterSave) {
		  var newContext = aa_ctx(context,{OriginalValue: odata1, Item: item});
		  aa_runMethod(data1,field,'AfterSave',newContext);
	  }
  }
}
function aa_set_fielddata_method(field,path)
{
	field.FieldData = function(data,ctx) 
	{
		if (data.length == 0) return [];
		if (!data[0].nodeType) 
			var out = [data[0][path.split('@').pop()]];
		else
			var out = aa_xpath(data[0],path,false);
		if (out.length > 0) 
			return out;
		if (!ctx || aa_tobool(ctx.vars._NoDefaultValue)) return out;
		
		var out = aa_xpath(data[0],path,true);
		var defaultValue = aa_runMethod(data,field,'DefaultValue',ctx);
		ajaxart.writevalue(out,defaultValue,true);
		return out;
	};
}

function aa_fieldTitle(field ,item_data, context,ignoreHideTitle)
{
	if (field.HideTitle && !ignoreHideTitle) return ''; 
	if (field.DynamicTitle) return field.DynamicTitle(item_data,context);
	return field.Title;
}

function aa_section(section,settings) {
  section.$el.firstOfClass('section_title').text(section.Title);  
  section.addSectionBody(section.$el.firstOfClass('section_body')[0]);
}
function aa_wrapWithSection(ctrl,field,sectionStyle,item_data,ctx,field_data)
{
	var jElem = $(sectionStyle.Html);
	var title = aa_fieldTitle(field ,item_data, ctx,true);
	var section = {
		Title: title,
		Image: field.SectionImage,
		field: field,
		field_data: field_data || [],
		context: ctx,
		collapsed: !!field.SectionCollapsedByDefault,
		setImageSource: function(classOrElement,imageObject,deleteIfNoImage)	{
			var inner = this.getInnerElement(classOrElement);
			if (inner) aa_set_image(inner,imageObject,deleteIfNoImage);
		},
		setInnerHTML: function(classOrElement,text)	{
			var inner = this.getInnerElement(classOrElement);
			if (inner) inner.innerHTML = text;
		},
		getInnerElement: function(classOrElement)
		{
			if (typeof(classOrElement) == 'string') {  // it is a class
				if (classOrElement == '') return this.el;
				if (classOrElement.indexOf('.') == 0)
				  return aa_find_class(this.$el,classOrElement.substring(1))[0];
				return null;
			}
			return classOrElement || this.el;
		},		
		addSectionBody: function(classOrElement) {
			var inner = this.getInnerElement(classOrElement);
			if (inner) inner.appendChild(ctrl); 
			if (this.collapsed) $(inner).css('display','none');
		},
		updateCollapsed: function(collapsed) {
			this.collapsed = collapsed;
		},
		$el: jElem,
		el: jElem[0],
		jElem: jElem,
		control: jElem[0]
	};
	section.setImage = section.setImageSource;

	aa_trigger(field,'beforeWrapWithSection',{ context: ctx, sectionObject: section });
	
	section.$el.addClass(aa_attach_style_css(sectionStyle));
	aa_apply_style_js(section,sectionStyle);
	return section.el;
}

function aa_refresh_sibling_field(srcElement,fieldID,context)
{
	var parent = srcElement.parentNode;
	if (!parent || parent.tagName == 'body') return;
	var ctrls = $(parent).find('.fld_'+fieldID);
	if (ctrls.length > 0) {
		for(var i=0;i<ctrls.length;i++)
			aa_refresh_cell(ctrls[i],context);
	} else {
		aa_refresh_sibling_field(parent,fieldID,context);
	}
}

function aa_alert(message) {
	if (window.jBartNodeJS) return jBartNodeJS.alert(message);
	
	if ($("#aa_immediate_log").length == 0) {
		var log = $('<div id="aa_immediate_log" style="position:absolute; top:0px; background:white; z-index:3000"></div>');
		log[0].Counter = 0;
		$("body").append(log);	
		$('<span class="close">close</span>').click(function() { $("#aa_immediate_log").remove() }).appendTo(log);
	}
	if ($("#aa_immediate_log")[0]) {
		var counter = $("#aa_immediate_log")[0].Counter++;
		$("#aa_immediate_log").prepend("#" + counter + ": " + message + "<br/>");
	}
}

function aa_audioPlayer(audioplayer) {
    if (!audioplayer.audioUrl) { 
      audioplayer.$el.find(".button").hide();
      audioplayer.$el.find(".no_audio").show();
      return; 
    }
    var ext = audioplayer.audioUrl.split("\.").pop();
    var mime = (ext == 'mp3') ? 'mpeg' : ext;
    var source = $("<source/>").attr('src',audioplayer.audioUrl).attr('type','audio/'+mime);
    audioplayer.$el.find("audio").append(source);
    var playing = false;
    audioplayer.$el.find(".button").click(function(e) {
      if (playing) {  // pause
        audioplayer.$el.find("audio")[0].pause();
        playing = false;
        $(this).removeClass('playing');
      } else { // play
        audioplayer.$el.find("audio")[0].play();
        playing = true;
        $(this).addClass('playing');
      }
    });
    audioplayer.$el.find("audio").bind("ended",null,function() {
        playing = false;
        $(this).removeClass('playing');          
    });
}


