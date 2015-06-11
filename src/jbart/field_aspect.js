ajaxart.load_plugin("field_aspect","plugins/field/field_aspect.xtml");
ajaxart.load_plugin("field_aspect","plugins/field_aspect/field_aspect_page.xtml");

aa_gcs("field_aspect", {	
	CellPresentation: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		field.CellPresentation = aa_text(data,profile,'Content',context);
		
		return [];
	},
	PagePreviewDevice: function (profile,data,context)
	{
		if (!ajaxart.jbart_studio) return;

		aa_bind(context.vars._Field[0],'ModifyInstanceContext',function(args) {
			var device = aa_first(data,profile,'Device',context);
			var width = device ? parseInt(device.Width) : 0;
			var height = device ? parseInt(device.Height) : 0;

	    args.Context.vars._PagePreview = [{ Width: width, Height: height, TightPreview: aa_bool(data,profile,'TightPreview',context) }];
	  });		
	},
	DisplayUnits: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var cssClass = aa_cssClass(data,profile,'Css',context,'units');
		var display_location = aa_first(data,profile,'Location',context);
		var unit = aa_text(data,profile,'Unit',context);
		
		jBart.bind(field,'ModifyControl',function(args) {
			var content = args.Wrapper.firstChild || args.Wrapper; 
			aa_renderStyleObject(display_location,{fieldContent: content, unitString: unit },context,true);
		},'DisplayUnits');
	},
	TransformTextToInputValue: function (profile,data,context) {
		var field = context.vars._Field[0];
		field.TextDataToInputValue = function(data1,ctx) {
			return aa_run(data1,profile,'DataToInputValue',aa_merge_ctx(context,ctx))
		}
		field.TextInputValueToData = function(data1,ctx) {
			return aa_run(data1,profile,'InputValueToData',aa_merge_ctx(context,ctx))
		}
	},
	TextboxCharacterMask: function (profile,data,context) {
		var field = context.vars._Field[0];
		var charsRegex = aa_text(data,profile,'AllowedCharsRegex',context); // e.g. regex = [0-9]
		if (!charsRegex) return;
		field.InputValueMask = aa_input_value_mask(charsRegex);
	},
	TextboxCharacterLength: function (profile,data,context) {
		var field = context.vars._Field[0];
		var length = aa_int(data,profile,'Length',context);
		aa_bind(field,'inputMask',function(args) {
			if (args.val.length > length) args.val = args.val.substring(0,length);
		});		
	},
	ClearValueButton: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.ClearValueStyle = aa_first(data,profile,'Style',context);
		
		function refresh(wrapper,field_data) {
			var apiObject = {
				ClearValue: function(e) {
				  var input = jQuery(wrapper).find('input')[0];
				  if (input) {
					  input.value = '';
					  field.ManualWriteValue = false; // Yaniv: I do not understand this line...
					  if (input.updateValue) input.updateValue();
					  if (input.Refresh) input.Refresh();
					  if (input.jbApiObject && input.jbApiObject.setValue) input.jbApiObject.setValue('');
					  refresh(wrapper,field_data);
				  } else {
					  ajaxart.writevalue(field_data,'');
					  aa_refresh_cell(wrapper,context);
				  }
				  aa_stop_prop(e);
				  return false;
				},
				FieldControlWrapper: wrapper,
				IsValueEmpty: aa_totext(field_data) == "",
				Title: aa_multilang_text(data,profile,'Title',context)
			}
			var clearBtn = aa_renderStyleObject(field.ClearValueStyle,apiObject,context);
			jQuery(clearBtn).addClass('aa_clear_button');
		}
		
		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx) {
			refresh(cell,field_data);
		});
		aa_field_handler(field,'OnUpdate',function(field,field_data,input){
			var cell = input.parentNode;
			refresh(cell,field_data);
		});
	},
	Control: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		aa_addControlMethod(field,'WritableControl',data,profile,'Control',context);
	},
	GlobalCss: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var css = aa_text(data,profile,'GlobalCss',context);
		var cls = aa_attach_global_css(css,null,field.Id);
		aa_field_handler(field,'ModifyCell',function(cell,field_data,cell_presentation,ctx,item)
		{
			if (aa_paramExists(profile,'OnCondition') && ! aa_bool(field_data,profile,'OnCondition',context)) return;
			jQuery(cell).addClass(cls);
		});	
	},
	CssOnCondition: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var css = aa_text(data,profile,'Css',context);
		var cls = aa_attach_global_css(css,null,field.Id,true);
		var conditionOnItem = aa_text(data,profile,'ConditionInput',context) == 'item';
		var cssClass = aa_text(data,profile,'CssClass',context);
		if (cssClass) cls += ' ' + cssClass;
		
		aa_field_handler(field,'ModifyCell',function(cell,field_data,cell_presentation,ctx,item)
		{
			var content = cell.firstChild || cell;

			if (aa_paramExists(profile,'OnCondition')) {
				var condData = conditionOnItem ? item : field_data;
				if (! aa_bool(condData,profile,'OnCondition',context)) {
					jQuery(content).removeClass(cls);
					jQuery(cell).removeClass(cls+'_wrapper');
					return;
				}
			}
			jQuery(content).addClass(cls);
			jQuery(cell).addClass(cls+'_wrapper');
		},null,200);	
	},
	Css: function (profile,data,context)
	{
		var css_for = aa_text(data,profile,'OnElement',context);
		var class_compiled = ajaxart.compile(profile,'Class',context);
		var inline_compiled = ajaxart.compile(profile,'Inline',context);
		var condition_compiled = ajaxart.compile(profile,'OnCondition',context, null, false, true);
		var apply_css = function(elems,data2) {
			for (var i=0; i<elems.length; i++) {
				if (! ajaxart_runcompiled_bool(condition_compiled, data2, profile, "OnCondition", context, true )) return;
				var cls = ajaxart_runcompiled_text(class_compiled, data2, profile, "Class" ,context);
				var inline = ajaxart_runcompiled_text(inline_compiled, data2, profile, "Inline" ,context);
				if (inline != "") aa_setCssText(elems[i],elems[i].style.cssText + ";" + inline);
				if (cls != "") elems[i].className = elems[i].className + " " + cls;
			}
		};
		var register = function(apply_css,css_for) {
			var css = function(cell,field_data,cell_presentation,ctx) {
				if (css_for == "cell")
					var work_on = cell;
				else if (css_for == "content") 
					var work_on = jQuery(cell).find('.field_control')[0];
				else if (css_for == "title")	
					var work_on = jQuery(cell.parentNode).find('>.propertysheet_title_td')[0];
				else
					var work_on = cell;
				if (!work_on) 
					work_on = cell;
				apply_css([work_on],field_data);
			}
			var field = ajaxart_fieldaspect_getField(context);
			aa_field_handler(field,'ModifyCell',css);
		}
		register(apply_css,css_for);
		return [];
	},
	RefreshOnBrowserUrlChange: function (profile,data,context) {
		var field = context.vars._Field[0];
		var to = aa_text(data,profile,'AddClassTo',context);
		aa_bind(field,'ModifyCell',function(args) {
			$(args.Wrapper).addClass('jb_refreshOnUrlChange');
		},'RefreshOnBrowserUrlChange');		

		if (!jBart.hashValueChangedRefreshField) {
			jBart.hashValueChangedRefreshField = function() {
				if (window.jbHashChangeFromJS) return;
				var fieldCells = $('.jb_refreshOnUrlChange');
				for(var i=0;i<fieldCells.length;i++) 
					aa_refresh_cell(fieldCells[i],context,null,null,true);
			};
			$(window).bind('hashchange',jBart.hashValueChangedRefreshField);
		}

	},
	DescriptionForEmptyText: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.DescriptionForEmptyText = ajaxart.totext_array(ajaxart_multilang_run(data,profile,'Description',context));
		field.DescriptionForEmptyTextCss = aa_text(data,profile,'Css',context);
		field.EmptyTextCssClass = aa_attach_global_css(field.DescriptionForEmptyTextCss ,null,'empty_text_description');

		if (field.HandleDescriptionForEmptyText) {
			return field.HandleDescriptionForEmptyText(field.DescriptionForEmptyText);
		}
		
		if (!field.DescriptionForEmptyText) return; // removing DescriptionForEmptyText

		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx,item)
		{
//			if (ajaxart_field_is_readOnly(ctx.vars._Cntr && ctx.vars._Cntr[0],cell.Field,ctx)) return;
			aa_addDescriptionForEmptyText(cell,field.DescriptionForEmptyText,field.EmptyTextCssClass);
		},'DescriptionForEmptyText',10);

		if (ajaxart.isChrome || ajaxart.isFireFox || ajaxart.isSafari) return; // we use placeholder

		aa_field_handler(field,'OnFocus',function(field,field_data,input)
		{
			if (jQuery(input).hasClass('empty_text_description'))
			{
				if (input.value == field.DescriptionForEmptyText)
					input.value = ""; 
				jQuery(input).removeClass('empty_text_description').removeClass(field.EmptyTextCssClass);
			}
		},'DescriptionForEmptyText',10);
		aa_field_handler(field,'OnBlur',function(field,field_data,input)
		{
			if (input.value == '' && document.activeElement != input)
			{
				jQuery(input).addClass('empty_text_description').addClass(field.EmptyTextCssClass);
				input.value = field.DescriptionForEmptyText;
			}
		},'DescriptieonForEmptyText',10);
		return [];
	},
	FieldData: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		var moreVars = null;
		if (context.vars._FieldItem) // dynamic fields
			moreVars = {_FieldItem : context.vars._FieldItem};
		aa_addMethod(field,'FieldData',profile,'FieldData',context,moreVars);
		return [];
	},
	MobileScroll: function(profile,data,context)
	{
		if (!window.iScroll && !window.aa_loading_iscroll) {  // for design time only. the runtime should include iscroll.js statically
			window.aa_loading_iscroll = true;
			jQuery.getScript('lib/iscroll.js',function() {aa_loading_iscroll=false;} );
		}
			
		var field = context.vars._Field[0];
		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx) {
			cell.style.overflow = 'auto'; 

			aa_addOnAttach(cell,function() {
				var paramsToEval = "var params = " + aa_text(data,profile,'ScrollParams',context) + ';';
				eval(paramsToEval);
				var element = cell;
				if (aa_text(data,profile,'OnElement',context) == 'content') {
					element = cell.firstChild;
					if (!element) return;
				}
				
				ajaxart.run(data,profile,'Height',aa_ctx(context,{ControlElement: [element]}));  // set the height
				ajaxart.run(data,profile,'Width',aa_ctx(context,{ControlElement: [element]})); // set the width
				
				if (window.iScroll && aa_bool(data,profile,'EnableScroll',context)) {
				  cell.IScroll = new iScroll(element,params);
				  setTimeout(function() {cell.IScroll.refresh()},200);
				}
			});
		});
	},
	HoverCssClass: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx) {
			cell.onmouseover = function() { jQuery(cell).addClass('aa_hover'); }
			cell.onmouseout = function() { jQuery(cell).removeClass('aa_hover'); }
		});
		return [];
	},
	ImageReadOnlyImp: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		field.ImageHeight = aa_text(data,profile,'Height',context);
		field.ImageWidth = aa_text(data,profile,'Width',context);
		field.KeepImageProportions = aa_bool(data,profile,'KeepImageProportions',context) && field.ImageHeight != "" && field.ImageWidth != "";
		field.HideEmptyImage = aa_bool(data,profile,'HideEmptyImage',context) ;

		// the px does problems with dynamically changing image size
		field.ImageWidth = field.ImageWidth.split('px')[0];	
		field.ImageHeight = field.ImageHeight.split('px')[0];
		if (!field.KeepImageProportions) {
			if (field.ImageWidth!="") field.ImageWidth += 'px';
			if (field.ImageHeight!="") field.ImageHeight += 'px';
		}
		
		var urlForMissingImage = aa_text(data,profile,'UrlForMissingImage',context);
		var textForMissingImage = aa_text(data,profile,'TextForMissingImage',context);
		var src_compiled = ajaxart.compile(profile,'Src',context);
		field.Text = function(data1,ctx)
		{
			var field = this;
			var src = ajaxart_runcompiled_text(src_compiled, data1, profile, "Src", ctx );
			if (field.HideEmptyImage && ajaxart.totext_array(data1) == "")
				src = "";
			if (src == "") {
				if (textForMissingImage != "")
					return [jQuery("<span class='aa_missing_image'></span>").text(textForMissingImage)[0]];
				else if (urlForMissingImage != "")
					src = urlForMissingImage;
				else return ["<span/>"];
			}
			var out = "<img src='" + src + "'";
			var style = " style='";
			if (field.ImageHeight != "") { 
				style = style + "height:" + field.ImageHeight + "; "; 
				out += ' height="' + field.ImageHeight + '"'; 
			} 
			if (field.ImageWidth != "") { 
				style = style + "width:" + field.ImageWidth + "; "; 
				out += ' width="'+field.ImageWidth+'"'; 
			}
			out = out + style + "' ";
			out += "/>";
			return [out]
		}
		field.ReadOnlyControl = function(data1,ctx) {
			var field = this;
			var image = jQuery(this.Text(data1,ctx)[0])[0];
			
			if (aa_paramExists(profile,'OnClick'))
			{
				image.onclick = function() { 
					if (window.aa_incapture) return;
					ajaxart.run(data1,profile,'OnClick',aa_merge_ctx(context,ctx)); 
				}
				jQuery(image).css('cursor','pointer');
			}
			if (field.KeepImageProportions)	{
				aa_keepimageprops(image,field.ImageWidth,field.ImageHeight);
				var wrapper = jQuery('<div style="overflow:hidden; width:'+field.ImageWidth+"px; height:"+field.ImageHeight+'px"/>')[0];  // for alignment
				wrapper.appendChild(image);
				return [wrapper];
			}
			return [image];
		}
		if (field.ReadOnly)
			field.Control = field.ReadOnlyControl;
		
		if (field.KeepImageProportions)
			field.CellPresentation = 'control';
		
		return [];
	},
	ModifyControl: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
			var input = jQuery(cell).find('.field_control') || cell.firstChild;
			ajaxart.run(item,profile,'Action',aa_merge_ctx(context,ctx,{ Cell: [cell], FieldData: field_data, Input: input.get() }));
		});
		return [];
	},
	OnUpdate: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		var onUpdate = function(field,field_data,input,e,extra)
		{
			var ctx1 = input.ajaxart ? aa_merge_ctx(context,input.ajaxart.params) : context;
			var parent_elem = jQuery(input).parents('.aa_item')[0]; 
			var item = parent_elem && parent_elem.ItemData;
			var newContext = aa_ctx(ctx1,{ _Field: [field], _FieldData: field_data
				, _Input: [input], ControlElement: [input], _Item: item || [] } );
			if (extra) newContext = aa_ctx(newContext,extra);
			if (jQuery(input).parents('.aa_container').length > 0) { 
				newContext.vars._Cntr = [ jQuery(input).parents('.aa_container')[0].Cntr ];
				newContext.vars.HeaderFooterCntr = newContext.vars._Cntr[0].Context.vars.HeaderFooterCntr;
			}
			
			ajaxart.run(field_data,profile,'Action',newContext);
		}
		aa_field_handler(field,'OnUpdate',onUpdate,aa_text(data,profile,'ID',context),aa_int(data,profile,'Phase',context));
		
		if (aa_bool(data,profile,'FireOnUpdateWhenLoaded',context)) {
			jBart.bind(field,'ModifyControl',function(args) {
				aa_invoke_field_handlers(field.OnUpdate,args.Wrapper,null,field,args.FieldData);
			});
		}
		return [];
	},
	PopupImage: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var id = aa_text(data,profile,'ID',context);
		if (id == '') id = null;
		field.PupupImageCss = aa_attach_global_css( aa_text(data,profile,'Css',context) , null, 'popupimage' );
		
		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx) {
			if (ajaxart_field_is_readOnly(ctx.vars._Cntr && ctx.vars._Cntr[0],cell.Field,ctx)) return;

			var input = aa_find_field_input(cell);
			if (!input) return;
			var img = document.createElement("span");
			img.className = 'aa_field_image image_fld_' + field.Id + ' '+ field.PupupImageCss;
			img.innerHTML = '&nbsp;';
			//var css = 'background-image:url(' + aa_text(data,profile,'Image',context) + ')';
			//img.style.cssText = css;
			jQuery(img).insertAfter(input);
			img.onmousedown = function(e)
			{
				if (input && input.TogglePopup && !jQuery(input).hasClass('aa_disabled') ) 
					input.TogglePopup();
			}
			img.onmousemove= function(e) 
			{ 
				var input = aa_find_field_input(cell);
				if (input && input.DetectResize) input.DetectResize(e); 
			};
		},id);

		return [];
	},
	Resizer: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.RememberResizerWidth = aa_bool(data,profile,'RememberLastWidth',context);
		
		if (aa_bool(data,profile,'Disable',context))
		{
			aa_field_handler(field,'ModifyControl',function() {},'resizer');
			return [];
		}
		var resizer = function(cell,field_data,cell_presentation,ctx) {
			function init(input,field) {
				aa_defineElemProperties(input,'DetectResize');  // for memory leaks
				
				function cellResizeStart(e) {
					document.onmouseup = cellResizeStop;
					input.onmousemove= null;
					document.onmousemove= cellResizeMove;
					return aa_stop_prop(e);
				}
				function cellResizeMove(e) {
					var mousepos = aa_mousePos(e);
	
					var new_size = mousepos.x - aa_absLeft(input);
					if (jQuery(input).parents('.right2left').length > 0)
						new_size = aa_absLeft(input) + input.offsetWidth - mousepos.x;
					
					jQuery(input).width(new_size);
	
					if (field.RememberResizerWidth && ctx.vars._Cntr) {
						ajaxart_setUiPref(aa_totext(ctx.vars._Cntr[0].ID),field.Id+'_Width','' + new_size + 'px',ctx);
					}
					return aa_stop_prop(e);
				}
				function cellResizeStop(e) {
					jQuery(input).removeClass('col_resize');
					document.onmouseup = null;
					document.onmousemove= null;
					input.onmousemove= input.DetectResize;
					input.onmousedown = input.onmousedownOrig;
					return aa_stop_prop(e);
				}

				input.onmousemove = input.DetectResize = function(e) {
					var mousepos = aa_mousePos(e);
					
					var in_resize_place = aa_absLeft(input) + input.offsetWidth - mousepos.x < 3;
					if (jQuery(input).parents('.right2left').length > 0)
						in_resize_place = mousepos.x - aa_absLeft(input) < 3;
					if (in_resize_place)
					{
						jQuery(input).addClass('col_resize');
						input.onmousedown= cellResizeStart;
					}
					else
					{
						jQuery(input).removeClass('col_resize');
						input.onmousedown= input.onmousedownOrig;
					}
				}
			}
			if (cell.ReadOnly) return;
			var input = jQuery(cell).find('>.field_control')[0];
			if (input != null) 
			{
				input.onmousedownOrig = input.onmousedown;
				init(input,field);
				if (field.RememberResizerWidth && ctx.vars._Cntr)
				{
					var cntr = ctx.vars._Cntr[0];
					var field_width = ajaxart_getUiPref(aa_totext(cntr.ID),field.Id+'_Width',ctx);
					if (field_width != null)
					 jQuery(input).css('width',field_width);
				}
			}
		}
		aa_field_handler(field,'ModifyControl',resizer,'resizer');

		return [];
	},
	DefineAction: function (profile,data,context) {
		var field = context.vars._Field[0];
		field.Actions = field.Actions || {};
		var actionName = aa_text(data,profile,'ActionName',context);

		field.Actions[actionName] = function(field_data,ctx) {
			ajaxart.run(field_data,profile,'Action',aa_merge_ctx(context,ctx));
		}
	},
	SimpleInput: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		field.Control = function(field_data,ctx)
		{
			var field = this;
			ctx = aa_ctx(ctx,{_Field: [field]});
			
			var cntr = ctx.vars._Cntr && ctx.vars._Cntr[0];
			if (ajaxart_field_is_readOnly(cntr,field,ctx)) {
		    	var text = (field.Text) ? aa_totext(field.Text(field_data,context)) : aa_totext(field_data);
		    	text = text.replace(/\n/g,"<br/>");
				var out = jQuery("<div class='aa_text'/>").html(text)[0];
				return [out];
			}
			return [ajaxart_field_createSimpleInput(field_data,ctx,ajaxart_field_is_readOnly(cntr,field,ctx))];
		}
 	    //aa_addControlMethod_js(field,'Control',simple,context);
		
		return [];
	},
	Toolbar: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var cssClass = aa_attach_global_css(aa_text(data,profile,'Css',context),null,'field_toolbar');
		aa_addMethod(field,'Operations',profile,'Operations',context);
		field.RefreshToolbar = function(field,cell,field_data,ctx) {
			jQuery(cell).addClass(cssClass);
			if (ctx.vars._Cntr && ajaxart_field_is_readOnly(ctx.vars._Cntr[0],field,ctx)) return;

			var toolbar = jQuery('<span class="aa_field_toolbar" />')[0];
			var minWidth = aa_text(data,profile,'MinWidth',context);
			if (minWidth != '') 
			  jQuery(toolbar).css('min-width',minWidth).css('display','inline-block');
			
			var ops = aa_runMethod(field_data,field,'Operations',ctx);
			for(var i=0;i<ops.length;i++)
			{
				var op = ops[i];
				var img = document.createElement("span");
				aa_defineElemProperties(img,'Action,Operation');
				//img.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;";
				img.Operation = op;
				var opCssClass = ajaxart.totext_array(aa_runMethod(field_data,op,'CssClass',ctx));
				img.className = 'aa_field_toolbar_image ' + opCssClass;
				img.title = ajaxart.totext_array(aa_runMethod(field_data,op,'Title',ctx));
				var image = aa_totext(aa_runMethod(field_data,op,'Icon',ctx));
				if (image != "")
					img.style.background = "url("+image+") no-repeat";
				
			    toolbar.appendChild(img);
				
				img.Action = img.onmousedown = function(e)
				{
					var img = (typeof(event)== 'undefined')? e.target : event.srcElement;					
					var op = img.Operation;
					var input = jQuery(cell).find('.field_control')[0];
					if (op != null)
						aa_runMethod(field_data,op,'Action',aa_ctx(ctx,{ _Field: [field], _FieldData: field_data, ControlElement: [input], _Input: [input], _OperationElement: [img]}));
				}
			};
			var oldToolbar = jQuery(cell).find('>.aa_field_toolbar')[0];
			aa_remove(oldToolbar,true);
			if (jQuery(cell).find('>.aa_option_page').length>0)
			  jQuery(toolbar).insertBefore( jQuery(cell).find('>.aa_option_page') );
			else
			  cell.appendChild(toolbar);
		}
		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx) {
			field.RefreshToolbar(field,cell,field_data,ctx);
		});
		if (aa_bool(data,profile,'RefreshOnUpdate',context)) 
		{
			aa_field_handler(field,'OnUpdate',function(field,field_data,input){
				// recreate the toolbar
				var cell = input.parentNode;
				field.RefreshToolbar(field,cell,field_data,context);
			});
		}
	},
	WritableControl: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		aa_setMethod(field,'WritableControl',profile,'Control',context);
		
		return [];
	},
	LimitTextLength: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var maxLength = aa_int(data,profile,'MaxLength',context);
		if (maxLength <=0) return;
		var cuttingMark = aa_text(data,profile,'CuttingMark',context);
		var fullTextAsTooltip = aa_bool(data,profile,'FullTextAsTooltip',context);
		var fullTextOnClick = aa_bool(data,profile,'FullTextOnClick',context);

		aa_bind(field,'ModifyControl',function(args) {
			var content = args.Wrapper.firstChild || args.Wrapper;
			var text = $(content).html();
			if (text && text.length > maxLength) {
				var newtext = text.substring(0,maxLength - cuttingMark.length) + cuttingMark;
				if (fullTextAsTooltip) content.setAttribute('title' ,text);
				$(content).addClass('limit_text_length');
				if (fullTextOnClick) $(content).click(function() {
					if ($(content).hasClass('limit_text_length')) {
						$(content).html(text);
						$(content).removeClass('limit_text_length');
					} else {
						$(content).html(newtext);
						$(content).addClass('limit_text_length');						
					}
				});
				$(content).html(newtext);
			}
		});
	},
	OnKeyUp: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		aa_field_handler(field,'OnKeyup',function(field,field_data,input,e,extra)
		{
			var newContext = aa_ctx(context,{ _Field: [field], _FieldData: field_data
				, _Input: [input], ControlElement: [input] } );
			if (jQuery(input).parents('.aa_container').length > 0)
				newContext.vars._Cntr = [ jQuery(input).parents('.aa_container')[0].Cntr ];
			if (extra && extra.KeyCode)
				newContext.vars.KeyCode = extra.KeyCode;
			if (extra && extra.CtrlKey)
				newContext.vars.CtrlKey = extra.CtrlKey;
			
			ajaxart.run(field_data,profile,'Action',newContext);
		});
		return [];
	},
	OnClick: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		var func = function(cell,field_data,cell_presentation,ctx) {
			var input = jQuery(cell).find('.field_control')[0];
			var click = function(e) {
				if (window.aa_incapture) return;
				ajaxart.run(field_data,profile,'Action',aa_ctx(ctx,{_Field: [field], _FieldData: field_data, ControlElement: [this] } ));
			}
			if (input)
				input.onclick = click;
			else
				cell.onclick = click;
		}
		aa_field_handler(field,'ModifyCell',func);
		return [];
	},
	OnHover: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
			cell.onmouseover = function() {
				if (!cell.isInside)
					ajaxart.run(field_data,profile,'Action',ctx);
				cell.isInside = true;
			};
			cell.onmouseout = function() { cell.isInside = false; };
		},'OnHover');
		return [];
	},
	CleanGlobalCss: function (profile,data,context) {
		return [aa_clean_global_css(aa_text(data,profile,'Css',context))];
	},
	AdaptCssForBrowser: function (profile,data,context) {
		var css = aa_text(data,profile,'Css',context);
		var forAllBrowsers = aa_bool(data,profile,'GenerateCssForAllBrowsers',context)
		return [aa_adapt_css_for_browser(css, forAllBrowsers)];
	},
	IsCssWellFormed: function (profile,data,context) {
		var css = aa_text(data,profile,'Css',context);
		if (aa_is_css_well_formed(css)) 	return ["true"];
		else								return [];
	},
	Animation: function (profile, data, context) {
		var field = ajaxart_fieldaspect_getField(context);
		var type = aa_first(data,profile,'Type',context);
		if (!type) return [];
		aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
			var elem = cell.firstChild; // scrolling is done on 'content', and can use parentNode for the cell
			if (!elem) return;
			type.animate(elem, function() {
				ajaxart.run(data,profile,'OnDone',context);
			});
		});
		return [];		
	},
	DynamicSize: function (profile, data, context) {
		var field = ajaxart_fieldaspect_getField(context);
		var width = aa_first(data,profile,'Width',context);
		var height = aa_first(data,profile,'Height',context);
		aa_bind(field,'ModifyControl',function(args) {
			var elem = args.Wrapper.firstChild;
			if (!elem) return;
			if (width) width.apply(elem);
			if (height) height.apply(elem);
		});
	}
});


function aa_runFieldAction(object,actionName,moreParams)
{
	/* aa_runFieldAction runs an action of a field defined in field_aspect.DefineAction.
	   object is an api object (e.g. button)
	   moreParams defines variables to be available in the action. e.g. { Location: 'left' }
	*/
	actinName = actionName || 'action';
	moreParams = moreParams || {};
	var field = object.field || object.Field;
	var fieldData = object.FieldData;
	if (!fieldData && object.data) fieldData = [object.data];
	fieldData = fieldData || [];
	var ctx = object.context || object.Context;

	if (!field || !ctx) return;
	if (!field.Actions || !field.Actions[actionName]) {
		return ajaxart.log('calling a non existing field Action ' + actionName,'error');
	}
	var vars = { ControlElement: [object.el] };
	for(var i in moreParams) {		
		if (!moreParams.hasOwnProperty(i)) continue;
		var val = moreParams[i];
		if (!aa_isArray(val)) val = [val];
		vars[i] = val;
	}
	field.Actions[actionName](fieldData,aa_ctx(ctx,vars));
}

function aa_input_value_mask(charsRegex) {
	var totalRegex = new RegExp('^'+charsRegex+'+$');

	return function(val) {
		if (val.match(totalRegex)) return val;
		var out = '';
		for(var i=0;i<val.length;i++) {
			var innerChar = val.charAt(i);
			if (innerChar.match(totalRegex)) out += innerChar;
		}
		return out;
	};
}

