aa_gcs("field", {
	CustomControl: function (profile,data,context)
	{
		var field = { isObject : true };
		field.Title = aa_multilang_text(data,profile,'Title',context);
		field.Image = aa_text(data,profile,'Image',context);
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		field.FieldData = function(data1) { return data1; }
		field.CellPresentation = ["control"];
		field.HideTitle = (!aa_bool(data,profile,'ShowTitle',context));
		
		aa_setMethod(field,'Control',profile,'Control',context);

		var newContext = aa_ctx(context,{_Field: [field]} );
		ajaxart.runsubprofiles(data,profile,'FieldAspect',newContext);
		
		return [field];
	},
	Control: function (profile,data,context)
	{
		var field = { isObject : true };
		field.Title = aa_multilang_text(data,profile,'Title',context);
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		field.FieldData = function(data1) { return data1; }
		field.CellPresentation = ["control"];
		field.ReadOnly = true;
		field.HideTitle = aa_bool(data,profile,'HideTitle',context);
		
		var newContext = aa_ctx(context,{_Field: [field]} );
		ajaxart.run(data,profile,'Control',newContext);
		ajaxart.runsubprofiles(data,profile,'FieldAspect',newContext);
		
	    return [field];
	},
	Button: function (profile,data,context)
	{
		var field = { isObject : true };
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		field.FieldData = function(data1) { return data1; }
		field.CellPresentation = ["control"];
		field.HideTitle = (aa_bool(data,profile,'HideTitle',context));

		field.Refresh = function(data1,ctx) {
			field.Title = aa_multilang_text(data,profile,'Title',context);
			field.Image = aa_first(data,profile,'Image',context);
			if (field.Image && field.Image.Url)
			  field.Image.StaticUrl = aa_totext(field.Image.Url(data,context));
			field.Style = aa_first(data,profile,'Style',aa_ctx(context,{_Field: [field]}));
			if (field.Style)
			  field.StyleClass = aa_attach_global_css(field.Style.Css);
		}

		field.Refresh(data,context);
		if (!field.Style) return;
		
		field.Control = function(field_data,ctx) {
			var field = this;
			var style = field.Style;
			if (style.Html == "") return [];
			var jElem = jQuery(style.Html);
			jElem[0].jbContext = aa_merge_ctx(context,ctx);
			if (field.Image && field.Image.Url)
				  field.Image.StaticUrl = aa_totext(field.Image.Url(field_data,context));
			
			var button = aa_api_object(jElem,{image: field.Image, Field: field, data: field_data});
			button.text = button.tooltip = aa_multilang_text(field_data,profile,'ButtonText',context);
			if (aa_paramExists(profile,'Tooltip')) button.tooltip = aa_multilang_text(field_data,profile,'Tooltip',context);
			
			if (button.text == '') button.text = field.Title;
			var initButtonEvents = function(button) {
			  aa_defineElemProperties(button,'Action');
			  
			  button.Action = function(settings) {
				settings = settings || {};
				var e = settings.event;
				var data = settings.data || field_data;
				if (window.aa_incapture) return;
				var itemElem = [ jQuery(button).parents('.aa_item')[0] ];
				if (itemElem[0] == null) itemElem = [];
				var item = (itemElem[0]) ? itemElem[0].ItemData : []; 
				var ctx2 = aa_ctx(aa_merge_ctx(context,ctx),{ControlElement: button.jElem.get(), _ElemsOfOperation: itemElem, _ItemsOfOperation: item });
				if (settings.vars)
					ctx2 = aa_ctx(ctx2,settings.vars);
				if (e) ctx2.vars._DomEvent = [e];
				if (typeof settings.end == 'function') {
					ajaxart_RunAsync(data,ajaxart.fieldscript(profile,'Action'),ctx2,settings.end);
				} else {
					return ajaxart.run(data,profile,'Action',ctx2);
				}
			  }
			}
			initButtonEvents(button);
			aa_apply_style_js(button,field.Style);
			jElem.addClass(field.StyleClass);
			//ajaxart.databind([jElem[0]],field_data,context,profile,data);	// for runtime inspect
			return jElem.get();
		}

		ajaxart.runsubprofiles(data,profile,'FieldAspect',aa_ctx(context,{_Field: [field]}));
		
	    return [field];
	},
	Field1: function (profile,data,context)
	{
		var field = { isObject : true };
		field.Title = aa_multilang_text(data,profile,'Title',context);
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		
		aa_addMethod(field,'FieldData',profile,'FieldData',context);
		aa_addMethod(field,'Control',profile,'Control',context);

		var newContext = aa_ctx(context,{_Field: [field]} );
		ajaxart.runsubprofiles(data,profile,'FieldAspect',newContext);
		ajaxart.run(data,profile,'Multiple',newContext);
		
	    return [field];
	},
	FireOnUpdate: function(profile,data,context)
	{
		var elem = ajaxart.getControlElement(context)[0];
		var td = jQuery(elem).parents('.aa_cell_element')[0];
		if (td == null) return [];
		aa_invoke_field_handlers(td.Field.OnUpdate,elem,null,td.Field,td.FieldData);
		return [];
	}
}); 

aa_gcs("animation", {
	CssBasedAnimation: function (profile,data,context) {
		return [{
			animate: function(elem,ondone) {
				var screen = aa_screen_size(true);
				var ctx2 = aa_ctx(context, { ScreenWidth: [screen.width + "px"], ScreenHeight: [screen.height +"px"]});
				jQuery(elem).addClass(aa_attach_global_css(aa_text(data,profile,'Css',ctx2)));
				jQuery(elem).addClass('beforeAnimation');
				setTimeout(function() { // use timeout to make sure all other modifiers have finished
					aa_addOnAttach(elem,function() {
						jQuery(elem).removeClass('beforeAnimation');
						var transition_end = function() {
							jQuery(elem).removeClass("afterAnimation"); 
							if (ondone)
								ondone(elem);
							elem.removeEventListener('webkitTransitionEnd', transition_end);
							elem.removeEventListener('transitionend', transition_end);
						};
						elem.addEventListener('webkitTransitionEnd', transition_end);
						elem.addEventListener('transitionend', transition_end);
						jQuery(elem).addClass('afterAnimation');
					});
				},1);
			}
		}];
	},
	JQueryShow: function (profile,data,context) {
		var duration = aa_int(data,profile,'Duration',context);
		return [{
			animate: function(elem,ondone) {
				jQuery(elem).hide();
				if (duration == 0) {
					jQuery(elem).show();
					ondone();
				}
				else {
					jQuery(elem).show(duration, "swing", ondone);
				}				
			}
		}];
	},
	Hide: function (profile,data,context) {
		var field_id = aa_text(data,profile,'FieldId',context);
		var animation = aa_first(data,profile,'AnimationType',context);
		if (!animation || !field_id) return [];
		jQuery(aad_find_field(field_id)).each(function(index,field_control) {
			if (field_control && animation) {
				animation.hide(field_control, function() {
					ajaxart.run(data,profile,'OnDone',context);
				});
			}
		});
		return [];
	},
	CssBasedHideAnimation: function (profile,data,context) {
		return [{
			hide: function(elem,ondone) {
				var screen = aa_screen_size(true);
				var ctx2 = aa_ctx(context, { ScreenWidth: [screen.width + "px"], ScreenHeight: [screen.height +"px"]});
				aa_addOnAttach(elem,function() {
					var transition_end = function() {
						if (ondone)
							ondone(elem);
						elem.removeEventListener('webkitTransitionEnd', transition_end);
						elem.removeEventListener('transitionend', transition_end);
					};
					elem.addEventListener('webkitTransitionEnd', transition_end);
					elem.addEventListener('transitionend', transition_end);
					jQuery(elem).addClass(aa_attach_global_css(aa_text(data,profile,'Css',ctx2)));
				});
			}
		}];
	},
	JQueryHide:function (profile,data,context) {
		var duration = aa_int(data,profile,'Duration',context);
		return [{
			hide: function(elem,ondone) {
				if (duration == 0) {
					jQuery(elem).hide();
					ondone();
				} else {
					jQuery(elem).hide(duration, "swing", ondone);
				}
			}
		}];
	}
});

aa_gcs("scroll", {
	Scroll: function(profile,data,context)
	{
		var field = context.vars._Field[0];
		field.Scroll = aa_first(data,profile,'Scroll',context);
		if (field.Scroll && field.Scroll.Load) field.Scroll.Load([],context);  // load js files etc.
		var paddingRight = aa_text(data,profile,'PaddingRight',context);
		
		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx) {
			if (field.Scroll && field.Scroll.OnModifyControl) field.Scroll.OnModifyControl([],aa_ctx(context,{ControlElement: [cell]}));
			aa_addOnAttach(cell,function() {
				var elem = cell.firstChild; // scrolling is done on 'content', and can use parentNode for the cell
				if (!elem) return;
//				if (elem.tagName.toLowerCase() == 'td' && elem.firstChild) // scrolling is done better on 'div' rather on 'td'
//					elem = elem.firstChild;
				var ctx2 = aa_ctx(context,{ControlElement: [elem]});
				elem.jbScroll = field.Scroll;
				if (field.Scroll && field.Scroll.Prepare) field.Scroll.Prepare([],ctx2);
				if (elem.ScrollElement) // allow changing the scroll element
					ctx2 = aa_ctx(context,{ControlElement: [elem.ScrollElement]});  
//				jQuery(ctx2.vars.ControlElement[0]).addClass(aa_attach_global_css(aa_text(data,profile,'Css',context)));

				ajaxart.run(data,profile,'Height',ctx2);  // set the height
				ajaxart.run(data,profile,'Width',ctx2); // set the width
				ctx2.vars.ControlElement[0].jbSizeChanged = function() {	// when device causes size change like resize or orientation change
					if (field.Scroll.SizeChanged)
						field.Scroll.SizeChanged([],ctx2);
				}
				
				if (field.Scroll && field.Scroll.Activate) field.Scroll.Activate([],ctx2);
				if (paddingRight) $(elem).css('padding-right',paddingRight);
			});
		});
	},
	BrowserScrollbar: function (profile,data,context)
	{
		return [{ isObject: true,
			Activate: function(data1,ctx) {
				this.Control = ctx.vars.ControlElement[0];
				if (this.Control.parentNode.tagName.toLowerCase() != 'td') this.Control = this.Control.parentNode;
						
				jQuery(ctx.vars.ControlElement).css('overflow','auto');
			},
			ScrollToBottom: function() {
				this.Control.scrollTop = this.Control.scrollHeight;
			}
		}];
	},
	NoScroll: function (profile,data,context)
	{
		var cls = aa_attach_global_css(aa_text(data,profile,'Css',context));
		return [{ 
			isObject: true,
			OnModifyControl : function(data1,ctx) {
				jQuery(ctx.vars.ControlElement).addClass(cls);
			}
		}];
	},
	Scroll2: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		
		field.ScrollStyle = aa_first(data,profile,'Style',context);
		field.ScrollWidth = aa_first(data,profile,'Width',context);
		field.ScrollHeight = aa_first(data,profile,'Height',context);
		var topClass = aa_attach_global_css(field.ScrollStyle.Css,context);
			
		aa_field_handler(field,'ModifyCell',function(cell,field_data,cell_presentation,ctx,item)
		{
			var content = cell.firstChild || cell;
			var topDiv = content;
			while (topDiv && ",table,tbody,tr,td,".indexOf(topDiv.tagName.toLowerCase()) > -1) {
				topDiv = topDiv.parentNode;
			}
			var scroll = field.ScrollObject = aa_renderStyleObject(field.ScrollStyle,{
				ScrollHeight: field.ScrollHeight,
				ScrollWidth: field.ScrollWidth,
				fixSize: function(element) {
				  if (field.ScrollHeight) field.ScrollHeight.apply(element);
				  if (field.ScrollWidth) field.ScrollWidth.apply(element);
				},
				init: function(settings) {
					this.refresh = settings.refresh;
					this.requiresDivWrapper = settings.requiresDivWrapper;
				},
				body: content,
				topDiv: topDiv
			},ctx);
			
			if (field.ScrollHeight) jBart.bind(field.ScrollHeight,'update',function() { field.ScrollObject.refresh(); });
			if (field.ScrollWidth) jBart.bind(field.ScrollWidth,'update',function() { field.ScrollObject.refresh(); });
			
			if (field.ScrollObject.requiresDivWrapper) {
				aa_addOnAttach(content,function() {
					var parent = topDiv.parentNode;
					scroll.divWrapper = jQuery('<div class="aa_scroll_wrapper"/>').addClass(topClass).append(topDiv)[0];
					parent.appendChild(scroll.divWrapper);
					field.ScrollObject.refresh();	
				});
			} else {
				jQuery(topDiv).addClass(topClass);
				field.ScrollObject.refresh();
			}
		});	
	},
	IScroll: function (profile,data,context)
	{
		var out = { isObject: true }
		out.Load = function() {
			if (window.IScroll || window.loading_iscroll4) return;
			window.loading_iscroll4 = true;
			var path = aa_text(data,profile,'JsLocation',context);
			aa_load_js_css(path, 'js');
		}
		out.OnModifyControl = function(data1,ctx) {
			jQuery(ctx.vars.ControlElement).css('overflow','auto'); 
		}
		out.Prepare = function(data1,ctx) {
			var wrapper = document.createElement('DIV');
			var elem = ctx.vars.ControlElement[0];
			elem.ScrollElement = wrapper;
	        elem.parentNode.appendChild(wrapper);
			wrapper.appendChild(elem);
			wrapper.jbScrolledElem = elem;
		}
		out.Activate = function(data1,ctx) {
			var paramsToEval = "var params = " + aa_text(data,profile,'ScrollParams',context) + ';';
			eval(paramsToEval);

			if (window.iScroll) {
				var elem = ctx.vars.ControlElement[0];
				
				elem.IScroll = new iScroll(elem,params);
				if (elem.jbScrolledElem) elem.jbScrolledElem.IScroll = elem.IScroll;
				setTimeout(function() {elem.IScroll.refresh()},200);
				elem.contentChanged = function() { this.IScroll.refresh(); }
				out.elem = elem;
			} else {
				jQuery(ctx.vars.ControlElement).css('overflow','hidden');
				setTimeout(function() { out.Activate(data1,ctx)} ,500 );
			}
		}
		out.Refresh = function(data1,ctx) {
			this.elem.IScroll.refresh();
		}
		out.ScrollToBottom = function(time, onlyIfNeeded) {
			if (!time) time = 200;
			if (!onlyIfNeeded || this.elem.scrollHeight > this.elem.clientHeight)
				this.elem.IScroll.scrollTo(0, this.elem.clientHeight - this.elem.scrollHeight,time,false);
		}
		return [out];
	},
	TinyScroll: function (profile,data,context)
	{
		var out = { isObject: true }
		out.Load = function() {
			if (window.IScroll || window.loading_tinyscroll) return;
			window.loading_tinyscroll = true;
			var path = aa_text(data,profile,'JsLocation',context);
			jQuery('body').append('<script type="text/javascript" src="'+path+'"></script>');
		}
		out.OnModifyControl = function(data1,ctx) {
			jQuery(ctx.vars.ControlElement).css('overflow','auto'); 
		}
		out.Prepare = function(data1,ctx) {
		    var wrapper = jQuery('<div class="tscrollbar">\
	                <div class="scrollbar"><div class="track"><div class="thumb"><div class="end"></div></div></div></div>\
	                <div class="viewport"><div class="overview"></div></div></div>');

	        var width = aa_text(data,profile,'Width',context);
	        if (width != '') wrapper.width(width);
	        
        	var cls = aa_attach_global_css(aa_text(data,profile,'Css',context));
        	wrapper.addClass(cls);
        	
	        var elem = ctx.vars.ControlElement[0];
	        
	        var scrollElem = elem.ScrollElement = wrapper.find('.viewport')[0];
	        var top = elem.parentNode;
	        top.appendChild(wrapper[0]);
		    wrapper.find('.overview').append(elem);
		    scrollElem.Scroll = wrapper;
		    scrollElem.contentChanged = function() { 
		    	setTimeout(function() {scrollElem.Scroll.tinyscrollbar_update();},10); 
		    }
		}
		out.Activate = function(data1,ctx) {
	    	setTimeout(function() { 
				var scrollElem = ctx.vars.ControlElement[0];
				out.scrollElem = scrollElem; 
	    		if (scrollElem.Scroll.tinyscrollbar) {
	    			scrollElem.Scroll.tinyscrollbar(); 
	    			scrollElem.Scroll.tinyscrollbar_update();
	    		}
	    	},1);
		}
		out.ScrollToBottom = function() {
			this.scrollElem.Scroll.tinyscrollbar_update('bottom');
		}
		
		return [out];
	},
	DeviceBottom: function (profile,data,context)
	{
		if (ajaxart.inPreviewMode) return;
		
		var elem = context.vars.ControlElement[0];
		elem.HeightDelta = aa_int(data,profile,'Delta',context);
		var cls_for_delta = aa_text(data,profile,'HtmlClassForDelta',context);
		if (cls_for_delta && jQuery("." + cls_for_delta).length > 0)
			elem.HeightDelta = jQuery("." + cls_for_delta)[0].offsetHeight + (elem.HeightDelta ? elem.HeightDelta : 0);

	    elem.StretchHeight = function() {
	    	ajaxart.ui.HeightToWindowBottom(this,this.HeightDelta);
	    }
	    setTimeout(function() { elem.StretchHeight();},100);

	    aa_addWindowResizeListener(elem,function() { elem.StretchHeight(); });
		jQuery(elem).addClass('aa_resize_bind');
		jBart.bind(elem,"WindowResize",elem.StretchHeight);
	},
	DeviceRight: function (profile,data,context)
	{
		if (ajaxart.inPreviewMode) return;

		var elem = context.vars.ControlElement[0];
		elem.WidthDelta = aa_int(data,profile,'Delta',context);
		jQuery(elem).addClass('aa_mobile_stretch');
	    elem.StretchWidth = function() {
	    	aa_widthToWindowRight(this,this.WidthDelta);	
	    }
	    setTimeout(function() { elem.StretchWidth();},100);
	    

	    aa_addWindowResizeListener(elem,function() { elem.StretchWidth(); });
	    
		jQuery(elem).addClass('aa_resize_bind');
		jBart.bind(elem,"WindowResize",elem.StretchWidth);
	},
	FixedHeight: function (profile,data,context)
	{
		if (ajaxart.inPreviewMode) return;
		var height = aa_text(data,profile,'Height',context);
		if (!ajaxart.isIDevice) {
			var height2 = aa_text(data,profile,'HeightForNonMobile',context);
			if (height2 != '') height = height2; 
		}
		var cell = context.vars.ControlElement[0];
		if (height != '') 
			cell.style.height = height;
	},
	FixedWidth: function (profile,data,context)
	{
		if (ajaxart.inPreviewMode) return;
		var width = aa_text(data,profile,'Width',context);
		if (!ajaxart.isIDevice) {
			var width2 = aa_text(data,profile,'WidthForNonMobile',context);
			if (width2 != '') width = width2; 
		}
		if (width != '' && context.vars.ControlElement) context.vars.ControlElement[0].style.width = width;
	}
});

aa_gcs("scroll_size", {
	FixedHeight: function (profile,data,context)
	{
	  var height = aa_int(data,profile,'Height',context);
	  var applyOn = aa_text(data,profile,'ApplyOn',context);
	  return [{
		 apply: function(elem,delta) {
		 	if (!delta) delta = 0;
		 	jQuery(elem).css(applyOn,height-delta + "px");
		  }
	  }];
	},
	FixedWidth: function (profile,data,context)
	{
	  var width = aa_int(data,profile,'Width',context);
	  var applyOn = aa_text(data,profile,'ApplyOn',context);
	  return [{
		 apply: function(elem,delta) {
		 	if (!delta) delta = 0;
		 	jQuery(elem).css(applyOn,width-delta + "px");
		  }
	  }];
	},
	DeviceWidth: function(profile,data,context)
	{
		var field_delta = aa_text(data,profile,'ReduceWidthOfOtherField',context);
		var stretch = aa_bool(data,profile,'StretchFromCurrentLocation',context);
		var pixels_delta = aa_int(data,profile,'ReducePixels',context);
		var applyOn = aa_text(data,profile,'ApplyOn',context);
		var percentages = parseInt(aa_text(data,profile,'Percentages',context).replace("%",""));
		
		aa_init_onresize();
		
		return [{
			apply: function(elem,extra_delta) {
				function fix_size() {
					var delta = extra_delta ? extra_delta : 0;
					var width = aa_screen_size(true).width;
					if (percentages && !isNaN(percentages))
						width *= percentages/100;
					if (field_delta && aad_find_field(field_delta)[0])
					 	delta += aad_find_field(field_delta,'',true)[0].offsetWidth;
					if (pixels_delta)
						delta += pixels_delta;
					if (stretch)
						aa_widthToWindowRight(elem,delta,applyOn);
					else
						jQuery(elem).css(applyOn,width-delta + "px");
				}
				if (field_delta)
					aa_addOnAttachMultiple(elem, function() { setTimeout(fix_size,1); } );	// we use time-out so offsetWidth is valid
				else if (stretch)
					aa_addOnAttachMultiple(elem, fix_size );
				else
					fix_size();

				aa_attach_window_resize(fix_size,elem);
			}
		}]
	},
	DeviceHeight: function(profile,data,context)
	{
		var field_delta = aa_text(data,profile,'ReduceHeightOfOtherField',context);
		var stretch = aa_bool(data,profile,'StretchFromCurrentLocation',context);
		var pixels_delta = aa_int(data,profile,'ReducePixels',context);
		var applyOn = aa_text(data,profile,'ApplyOn',context);
		var percentages = parseInt(aa_text(data,profile,'Percentages',context).replace("%",""));
		
		aa_init_onresize();
		
		return [{
			apply: function(elem,delta) {
				var fix_size = function() {
					var delta = 0;
					var height = aa_screen_size(true).height;
					if (percentages && !isNaN(percentages))
						height *= percentages/100;
					if (field_delta && aad_find_field(field_delta)[0])
					 	delta += aad_find_field(field_delta,'',true)[0].offsetHeight;
					if (pixels_delta)
						delta += pixels_delta;
					if (stretch)
						ajaxart.ui.HeightToWindowBottom(elem,delta,applyOn);
					else
						jQuery(elem).css(applyOn,height-delta + "px");
				}
				if (field_delta)
					aa_addOnAttachMultiple(elem, function() { setTimeout(fix_size,1); } );	// we use time-out so offsetWidth is valid
				else if (stretch)
					aa_addOnAttachMultiple(elem, fix_size );
				else
					fix_size();

				fix_size();
				
				aa_attach_window_resize(fix_size,elem);
			}
		}];
	}
});
aa_gcs("field_control", {
	Image: function (profile,data,context) // GC of field_control.Image
  {
		var field = context.vars._Field[0];
		var defaultImage = aa_text(data,profile,'DefaultImage',context);

		field.Control = function(field_data,ctx) {
			var image = aa_first(field_data,profile,'Image',context);
			if (image && image.Url)
			  image.StaticUrl = aa_totext(image.Url(field_data,context)) || defaultImage;

			var image2 = aa_create_static_image_object(image);			
			var style = aa_first(data,profile,'Style',context);
			
			return [aa_renderStyleObject(style,{ Field: field, image: image2, data: field_data[0] },context,true)];
		};
  },
	CustomXtmlControl: function (profile,data,context)
  {
			var field = aa_create_base_field(data, profile, context);
			field.Control = function(field_data,ctx) {
				return ajaxart.run(field_data,profile,'Control',aa_merge_ctx(context,ctx));
			};
			return [field];
  },
  CustomControlOld: function (profile,data,context)
  {
		var field = context.vars._Field[0];
		field.Control = function(field_data,ctx) {
			var style = ajaxart.runNativeHelper(field_data,profile,'StyleObject',context)[0];
			
			return [aa_renderStyleObject(style,{ Field: field, Data: field_data },context)];
		}
  } 
});
aa_gcs("field_feature", {
	Css: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var css = aa_text(data,profile,'Css',context);
		aa_field_handler(field,'ModifyCell',function(cell,field_data,cell_presentation,ctx,item)
		{
			var cls = aa_attach_global_css(css,null,field.Id,true,false,ctx);
			jQuery(cell).addClass(cls+'_wrapper');
			var content = cell.firstChild || cell;
			jQuery(content).addClass(cls);
		},null,200);	
	},
	CssClass: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		var to = aa_text(data,profile,'AddClassTo',context);
		aa_bind(field,'ModifyCell',function(args) {
			var cssClass = aa_text(args.FieldData,profile,'ClassName',context);
			var passCondition = aa_bool(args.FieldData,profile,'ConditionForClass',context);
			if (passCondition) {
				var elem = args.Wrapper;
				if (to == 'content') elem = args.Wrapper.firstChild || args.Wrapper;

				$(elem).addClass(cssClass);
			}
		});
	}
});

function aa_init_onorientchange_MobileDeviceStretchBottomRight()
{
    if (window.aa_onorientchange_MobileDeviceStretchBottomRight) return;
    
    window.aa_MobileDeviceBottomRight_orientation = function(orient) {
	  var elems = jQuery('.aa_mobile_stretch');
	  for(var i=0;i<elems.length;i++) {
		  if (elems[i].StretchHeight) elems[i].StretchHeight();
		  if (elems[i].StretchWidth) elems[i].StretchWidth();

	      if (elems[i].IScroll) elems[i].IScroll.refresh();
	  }
    }
    aa_addEventListener(window,"resize", aa_MobileDeviceBottomRight_orientation, false);
//    aa_add_onorientationchange(aa_MobileDeviceBottomRight_orientation);
}


function aa_create_text_filter(matchOnlyTextBeginning)
{
	return function(initialFilterData)
	{
		var CompileFilterData = function(filter_data)
		{
			var txt = aa_totext(filter_data);
			if (txt == '') return [];
			return txt.toLowerCase().split(',');
		}
		return	{
			TextFilter: true,
			filterData: CompileFilterData(initialFilterData),
			SetFilterData: function(filterData) { this.filterData = CompileFilterData(filterData); }, 
			ToSQLText: function(rawData) { return ajaxart.totext_array(rawData) },
			Match: function(field,wrapper)
			{
				if (this.filterData.length == 0) return true;
				for(var i in this.filterData)
				{
					var index = ('' + wrapper[field.Id]).toLowerCase().indexOf(this.filterData[i]);
					var result = matchOnlyTextBeginning ? index == 0 : index > -1;
					if (result) return true;
				}
				return false;
			},
			HighlightSelectedText: function(control,selectedClass) {
  				var pattern = this.filterData[0];
  				
				if (control.innerHTML.toLowerCase().indexOf(pattern) != -1)
				   control.innerHTML = ajaxart_field_highlight_text(control.innerHTML,pattern,selectedClass);
			}
		}
	};
}

function aa_create_search_words_text_filter(matchOnlyTextBeginning)
{
	return function(initialFilterData)
	{
		var CompileFilterData = function(filter_data)
		{
			var text = aa_totext(filter_data).toLowerCase();
			
			var pattern = { searchWordsPattern: true };
			pattern.text = text;
			
			var pp = pattern.text.split(' ');
			pattern.p1 = (pp.length > 0 && ' ' + pp[0]);
			pattern.p2 = (pp.length > 1 && ' ' + pp[1]);
			pattern.p3 = (pp.length > 2 && ' ' + pp[2]);
			pattern.p4 = (pp.length > 3 && ' ' + pp[3]);
			pattern.words = pp.length;
			
			return pattern;
		}
		return	{
			TextFilter: true,
			filterData: CompileFilterData(initialFilterData),
			SetFilterData: function(filterData) { this.filterData = CompileFilterData(filterData); }, 
			ToSQLText: function(rawData) { return ajaxart.totext_array(rawData) },
			Match: function(field,wrapper)
			{
				var pattern = this.filterData; 
				if (!pattern) return true;
				
				var val = wrapper[field.Id];
				var s = ' ' + val.toLowerCase().replace(/^\s*|\s*$/g, ' ');
				var words_found = 0,show_first=false;
				
				var p1 = pattern.p1;
				if (pattern.words > 1) {
					if (p1 && s.indexOf(p1) != -1) words_found++;
					if (pattern.p2 && s.indexOf(pattern.p2) != -1) words_found++;
					if (pattern.p3 && s.indexOf(pattern.p3) != -1) words_found++;
					if (pattern.p4 && s.indexOf(pattern.p4) != -1) words_found++;
					if (words_found == pattern.words) {
						show_first = true;
					} 
				} else if (s.indexOf(p1) == 1) {	// starts with pattern
					show_first = true;
				} else if (s.indexOf(p1) > 0) {
					words_found++;
				}

				if (show_first || words_found == pattern.words) return true;
				return false;
			},
			HighlightSelectedText: function(control,selectedClass) {
  				var pattern = this.filterData;
  				var p1,p2,p3,p4;  // TODO: for on pattern.words
  			    if (pattern.p1) p1 = pattern.p1.substring(1); 
  			    if (pattern.p2) p2 = pattern.p2.substring(1); 
  			    if (pattern.p3) p3 = pattern.p3.substring(1);// remove space prefix
  			    if (pattern.p4) p4 = pattern.p4.substring(1);
  				
  	    		if (p1 && control.innerHTML.toLowerCase().indexOf(p1) != -1)
  	    			control.innerHTML = ajaxart_field_highlight_text(control.innerHTML,p1,selectedClass);
  	    		if (p2 && control.innerHTML.toLowerCase().indexOf(p2) != -1)
  	    			control.innerHTML = ajaxart_field_highlight_text(control.innerHTML,p2,selectedClass);
  	    		if (p3 && control.innerHTML.toLowerCase().indexOf(p3) != -1)
  	    			control.innerHTML = ajaxart_field_highlight_text(control.innerHTML,p3,selectedClass);
  	    		if (p4 && control.innerHTML.toLowerCase().indexOf(p4) != -1)
  	    			control.innerHTML = ajaxart_field_highlight_text(control.innerHTML,p4,selectedClass);
			}
		}
	};
}

function aa_addWindowResizeListener(element,callback)
{
	window.aavar_resizeListeners = window.aavar_resizeListeners || [];
	aavar_resizeListeners.push( {element: element, callback: callback } );
	
	if (!window.aavar_resizeCallback) {
		window.aavar_resizeCallback = function() 
		{
			var newListeners = [];
			for(var i=0;i<aavar_resizeListeners.length;i++) {
				try {
					if (ajaxart.isattached(aavar_resizeListeners[i].element)) {
						newListeners.push( aavar_resizeListeners[i] );
						aavar_resizeListeners[i].callback();
					}
				} catch(e) {
					ajaxart.logException('exception in window resize',e);
				}
			}
			aavar_resizeListeners = newListeners;
		}
	  aa_addEventListener(window,"resize", aavar_resizeCallback );
	}
}