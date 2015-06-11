ajaxart.load_plugin("jbart","plugins/jbart/mobile.xtml");

aa_gcs("mobile", {
	IsMobilePhone: function (profile,data,context) {
	  var visualCntr = aa_findVisualContainer(null,context);
	  var width = visualCntr.width;
	  if (window.orientation == 90 || window.orientation == -90)
	  	width = visualCntr.height;

	  if (width < 600) return ["true"];
	},
	WidthOfMobilePhone: function (profile,data,context) {
		var visualCntr = aa_findVisualContainer(aa_var_first(context,'ControlElement'),context);
		return aa_frombool(visualCntr.width <= 350);
	},
	MobileDefaultFeatures: function (profile,data,context) 
	{
		if (aa_bool(data,profile,'DisableScaling',context)) {
		  var metatag =document.createElement("meta");
		  metatag.setAttribute("name", "viewport");
		  metatag.setAttribute("content", "initial-scale=1,maximum-scale=1,user-scalable=no");
		  document.getElementsByTagName("head")[0].appendChild(metatag);
		}
		if (aa_bool(data,profile,'AutoHideAddressBar',context)) {
			function hide_address_bar() {
				document.body.style.height = "2000px";	// The max height for all devices
				function restore() {
					setTimeout( function() { 	// Use timeout because in some Androids the onscroll is called before the address bar hides
						window.removeEventListener("scroll", restore);
						jQuery("body").find(".aa_window_resize_listener").each(function(i,elem) { jBart.trigger(elem,'WindowResize'); });
						document.body.style.height = "100%";
					},1);
				}
				window.addEventListener("scroll", restore);
				window.scrollTo(0, 1);
			}
			hide_address_bar();

			window.addEventListener("orientationchange", function() {
				if (window.scrollY <= 2)	// new size may be smaller, and address bar will aprear again
					hide_address_bar();
			});
		}
		if (aa_bool(data,profile,'DisableTextAdjustionOnOrientation',context)) {
			jQuery('body').css("-webkit-text-size-adjust","none");
		}
		if (aa_bool(data,profile,'EliminateMarginsFromHtmlBody',context))
			jQuery('body').css('margin','0').css('padding','0');
		return [];
	},
	MobileBottomPosition: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx) {
			var elem = cell.firstChild;
			aa_addOnAttach(elem, function() {
//				if (false) {
				if (ajaxart.isiPhone && !navigator.userAgent.match(/OS 5(_\d)+ like Mac OS X/i)) {	// iphone <5 dosent have position:fixed
					var elem_height = elem.offsetHeight;
					var fix_top = function(height) { elem.style.top = window.innerHeight + window.scrollY - elem_height + "px"; };
					elem.jbFixTop = fix_top;
					fix_top(elem_height);
					jQuery(elem).addClass(aa_attach_global_css(aa_text(data,profile,'PositionAbsoluteCss',context)));
					jQuery(elem).show();
					jQuery(document).bind('scroll', function() { fix_top(elem.offsetHeight) } );
				    window.addEventListener("resize", function() { fix_top(elem.offsetHeight) }, false);
				} else if (jQuery('.studio_simulator').length > 0 && jQuery('.studio_simulator')[0].className.indexOf(' ') > -1) {	// in studio, use simulator window height
					var simulator = jQuery('.studio_simulator')[0];
					var elem_height = elem.offsetHeight;
					jQuery(elem).hide();
					var fix_top = function(height) { elem.style.top = simulator.clientHeight + simulator.scrollTop - elem_height + "px"; };
					fix_top(elem_height);
					jQuery(elem).addClass(aa_attach_global_css(aa_text(data,profile,'PositionAbsoluteCss',context)));
					jQuery(elem).show();
					jQuery('.studio_simulator').bind('scroll', function() { fix_top(elem.offsetHeight) } );
				} else {	// Android and other supporting position fixed browsers
					jQuery(elem).addClass(aa_attach_global_css(aa_text(data,profile,'PositionFixedCss',context)));
				}
				jQuery(cell).append(jQuery("<div class='aa_mobile_bottom_padding'/>").css("height", elem.offsetHeight + "px"));	// keep space in bottom for not hiding anything
			});
		});
	},
	MobileTopPosition:function (profile,data,context)
	{
		var field = context.vars._Field[0];
		aa_field_handler(field,'ModifyControl',function(cell,field_data,cell_presentation,ctx) {
			var elem = cell.firstChild;
			aa_addOnAttach(elem, function() {
				if (ajaxart.isiPhone && navigator.userAgent.match(/OS 4(_\d)+/i) || navigator.userAgent.match(/OS 3(_\d)+/i)) {	// iphone <5 dosent have position:fixed
					if (!aa_bool(data,profile,'UseAbsoluteWhenNoPositionFixed')) return;
					var fix_top = function() { elem.style.top = window.scrollY + "px"; };
					elem.jbFixTop = fix_top;
					fix_top();
					jQuery(elem).addClass(aa_attach_global_css(aa_text(data,profile,'PositionAbsoluteCss',context)));
					jQuery(elem).show();
					jQuery(document).bind('scroll', fix_top );
				    window.addEventListener("resize", fix_top, false);
				} else if (jQuery('.studio_simulator').length > 0 && jQuery('.studio_simulator')[0].className.indexOf(' ') > -1) {	// in studio, use simulator window height
					var simulator = jQuery('.studio_simulator')[0];
					jQuery(elem).hide();
					var fix_top = function() { elem.style.top = simulator.scrollTop + "px"; };
					fix_top();
					jQuery(elem).addClass(aa_attach_global_css(aa_text(data,profile,'SimulatorCss',context)));
					jQuery(elem).show();
					jQuery('.studio_simulator').bind('scroll', fix_top );
				} else {	// Devices that sopports position fixed, like Android and iPhone 5 and above
					jQuery(elem).addClass(aa_attach_global_css(aa_text(data,profile,'PositionFixedCss',context)));
					if (ajaxart.isIDevice) {	// iphone 5 BUG, when keyboard is open, it stucks as an absolute position
						setTimeout(function() {
							jQuery("input,textarea").focus(function() { elem.style.position = 'absolute'; })
								.blur(function() { elem.style.position = 'fixed'; }); }
						, 1000);
					}
				}
				jQuery(elem).addClass('aa_mobile_top_position');
				jQuery(cell).find('.aa_mobile_top_padding').remove();	// cleans previous calls
				jQuery(cell).append(jQuery("<div class='aa_mobile_top_padding'/>").css("height", elem.offsetHeight + "px"));	// keep space in bottom for not hiding anything
			});
		});
	},
	SimpleMobileVerticalScroll:function (profile,data,context)
	{
		return [{ 
			isObject: true,
			Prepare: function(data1,ctx) {
				var wrapper = jQuery("<DIV/>").addClass("aa_mobile_scroll_wrapper")[0];
				var elem = ctx.vars.ControlElement[0];
				elem.ScrollElement = wrapper;
		        elem.parentNode.appendChild(wrapper);
				wrapper.appendChild(elem);
				wrapper.jbScrolledElem = elem;
				jQuery(wrapper).css('overflow','hidden'); 
			},
			Activate : function(data1,ctx) {
				var wrapper = ctx.vars.ControlElement[0];
				var elem = wrapper.jbScrolledElem;
				elem.scrollPos = 0;	// starting with no scroll
				elem.maxOffset = 0; // used to fix virtual keyboard issue
				elem.MaxHeight = wrapper.offsetHeight;
				var scrollPosInRange = function(pos) {
					return Math.min(Math.max(pos,elem.MaxHeight-elem.offsetHeight),elem.maxOffset);
				}
				var ondown = function(e) {
					elem.start = {
					  // get touch coordinates for delta calculations in onTouchMove
					  pageX: e.touches ? e.touches[0].pageX : e.pageX,
					  pageY: e.touches ? e.touches[0].pageY : e.pageY,
					  // set initial timestamp of touch sequence
					  time: Number( new Date() )
					};
					elem.isVScrolling = undefined;
					elem.deltaX = elem.deltaY = elem.startScrollPos = elem.scrollPos;
					elem.style.MozTransitionDuration = elem.style.webkitTransitionDuration = 0;
					if (!ajaxart.isTouch)
						ajaxart_disableSelection(elem);
				};
				var onmove = function(e) {
				  var pageX = e.touches ? e.touches[0].pageX : e.pageX;
				  var pageY = e.touches ? e.touches[0].pageY : e.pageY;
				  if (!elem.start) return;
				  elem.deltaX = pageX - elem.start.pageX;
				  elem.deltaY = pageY - elem.start.pageY;
	
				  // determine if scrolling test has run - one time test
				  if ( typeof elem.isVScrolling == 'undefined') {
				 	elem.isVScrolling = !!( elem.isVScrolling || Math.abs(elem.deltaX) < Math.abs(pageY - elem.start.pageY) );
				  }
				  e.preventDefault();
				  // if user is trying to scroll vertically
				  if (elem.isVScrolling) {
						// translate immediately 1-to-1
						elem.scrollPos = scrollPosInRange(elem.startScrollPos + elem.deltaY);
						if (elem.scrollPos != elem.startScrollPos + elem.deltaY) {	// out of rance: resistance
							var not_allowed_diff = elem.startScrollPos + elem.deltaY - elem.scrollPos;
							elem.scrollPos += not_allowed_diff / ( (Math.abs(not_allowed_diff)/elem.MaxHeight) + 1 )
						}
						elem.style.MozTransform = elem.style.webkitTransform = 'translate3d(0,' + elem.scrollPos + 'px,0)';
					}
				};
				var onup = function(e) {
				  if (!elem.start) return;
					// determine if slide attempt triggers next/prev slide
					var duration = Number(new Date()) - elem.start.time;
					if (duration < 300 || elem.scrollPos != scrollPosInRange(elem.scrollPos) ) {	// use speed or go back after resistance
						var deceleration = 0.0006;
						var speed = Math.abs(elem.deltaY) / duration;
						var dist = (speed * speed) / (2 * deceleration);
						var add = dist * ((elem.deltaY > 0) ? 1 : -1);
						elem.scrollPos = scrollPosInRange(elem.scrollPos + add);
						var style = elem.style;
						// set duration speed (0 represents 1-to-1 scrolling)
						style.webkitTransitionDuration = style.MozTransitionDuration = style.msTransitionDuration = style.OTransitionDuration = style.transitionDuration = 500 + 'ms';
						// translate to given index position
						style.MozTransform = style.webkitTransform = 'translate3d(0,' + elem.scrollPos + 'px,0)';
					}
				  elem.start = null;
				  if (!ajaxart.isTouch)
					  ajaxart_restoreSelection(elem);
				}
				if (ajaxart.isTouchDevice()) {
					wrapper.ontouchmove = onmove;
					wrapper.ontouchend = onup;
					wrapper.ontouchstart = ondown;
				} else {
					jQuery(wrapper).mousemove(onmove).mouseup(onup).mousedown(ondown);
				}
				elem.FixKeyboard = function() {
					if (aa_absTop(wrapper) < window.scrollY) {	// top is not visible, we fix it
						var offset = window.scrollY - aa_absTop(wrapper,true);
						if (elem.maxOffset != offset) {
							elem.maxOffset = offset;
							elem.scrollPos = scrollPosInRange(elem.scrollPos);// + elem.maxOffset);
							elem.style.webkitTransitionDuration = '150ms';
							elem.style.webkitTransform = 'translate3d(0,' + elem.scrollPos + 'px,0)';
						}
					} else if (elem.maxOffset) {	// go back to normal
						var offset = elem.maxOffset;
						elem.maxOffset = 0;
						elem.scrollPos = scrollPosInRange(elem.scrollPos - offset);
						elem.style.webkitTransitionDuration = '150ms';
						elem.style.webkitTransform = 'translate3d(0,' + elem.scrollPos + 'px,0)';
					}
				}
				if (ajaxart.isIDevice)
					jQuery("input,textarea").focus(function() { setTimeout(function() { elem.FixKeyboard(); },1)}).blur(elem.FixKeyboard);
				else
					window.addEventListener("resize", function(){ elem.FixKeyboard(); });
				this.SizeChanged = function() {
					elem.MaxHeight = wrapper.offsetHeight;
					if (elem.scrollPos != scrollPosInRange(elem.scrollPos)) {
						elem.scrollPos = scrollPosInRange(elem.scrollPos);
						elem.style.webkitTransform = 'translate3d(0,' + elem.scrollPos + 'px,0)';
					}
				}
				this.ScrollToTop = function(duration) {
					if (elem.scrollPos != scrollPosInRange(elem.maxOffset)) {
						elem.scrollPos = scrollPosInRange(elem.maxOffset);
						elem.style.webkitTransitionDuration = duration ? duration : '150ms';
						elem.style.webkitTransform = 'translate3d(0,' + elem.scrollPos + 'px,0)';
					}					
				}
				this.ScrollToBottom = function(duration) {
					if (elem.scrollPos != scrollPosInRange(-elem.offsetHeight)) {
						elem.scrollPos = scrollPosInRange(-elem.offsetHeight);
						elem.style.webkitTransitionDuration = duration ? duration : '150ms';
						elem.style.webkitTransform = 'translate3d(0,' + elem.scrollPos + 'px,0)';
					}					
				}
			}
		}];
	},
	HorizontalCurtain: function(profile,data,context) {
		var field = { isObject : true };
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		field.FieldData = function(data1) { return data1; }
		field.CellPresentation = ["control"];
		field.HideTitle = true;
		field.Control = function(field_data,ctx) {
			var curtain = jQuery("<DIV class='aa_curtain'/>")[0];
			curtain.style.cssText = 'position:' + (aa_has_simulator() ? 'absolute' : 'fixed') + '; background:transparent; z-index:1; top:0px; left:0px';
			var page = ajaxart.runNativeHelper(field_data,profile,'Page',context)[0];
			jQuery(curtain).append(page)
				.append(aa_renderStyleObject(aa_first(data,profile,'HandlersStyle',context),{},ctx));
			curtain.open = aa_bool(data,profile,'StartAsOpen',context);
			var on_width_change = function() {
				curtain.width = aa_screen_size(true).width;
				curtain.style.webkitTransform = 'translate3d(' + -(curtain.open ? 0 : curtain.width) + 'px,0,0)';
			}
			on_width_change();
			window.addEventListener("resize", on_width_change);
			var ondown = function(e) {
				curtain.start = {
				  // get touch coordinates for delta calculations in onTouchMove
				  pageX: e.touches ? e.touches[0].pageX : e.pageX,
				  pageY: e.touches ? e.touches[0].pageY : e.pageY,
				  // set initial timestamp of touch sequence
				  time: Number( new Date() )
				};
				curtain.isVScrolling = undefined;
				curtain.deltaX = curtain.deltaY = 0;
				curtain.style.MozTransitionDuration = curtain.style.webkitTransitionDuration = 0;
			}
			var onmove = function(e) {
			  if (!curtain.start) return;
			  var pageX = e.touches ? e.touches[0].pageX : e.pageX;
			  var pageY = e.touches ? e.touches[0].pageY : e.pageY;
			  curtain.deltaX = pageX - curtain.start.pageX;
				if ( typeof curtain.isVScrolling == 'undefined') {
				  curtain.isVScrolling = !!( curtain.isVScrolling || Math.abs(curtain.deltaX) < Math.abs(pageY - curtain.start.pageY) );
				}
				if (curtain.isVScrolling) {
					curtain.start = null;
					return;
				}
				  // prevent native scrolling 
				e.preventDefault();

				if (curtain.open && curtain.deltaX > 0)	// cannot slide leftwards to curtain
					curtain.deltaX = 0;
//				if ((curtain.open && curtain.deltaX > 0 || !curtain.open && curtain.deltaX < 0))	// resistance
//			      curtain.deltaX = curtain.deltaX / ( Math.abs(curtain.deltaX) / curtain.width + 1 );

				curtain.style.MozTransform = curtain.style.webkitTransform = 'translate3d(' + (curtain.deltaX - (curtain.open ? 0 :curtain.width)) + 'px,0,0)';
			};
			var onup = function(e) {
			  	if (e.ctrlKey) { // simulate slide with mouse
			  		curtain.Move(true);
			  		return;
			  	}
			  	if (!curtain.start) return;
				// determine if slide attempt triggers next/prev slide
				var isValidSlide = 
					  ((Number(new Date()) - curtain.start.time < 250      // if slide duration is less than 250ms
					  && Math.abs(curtain.deltaX) > 20                   // and if slide amt is greater than 20px
					  || Math.abs(curtain.deltaX) > curtain.width/2)        // or if slide amt is greater than half the width
						&& ((curtain.deltaX > 0 && !curtain.open) || (curtain.deltaX<0  && curtain.open)));

				curtain.Move(isValidSlide);
			}
			curtain.start = null;
			if (ajaxart.isTouch) {
				document.body.ontouchmove = onmove;
				document.body.ontouchend = onup;
				document.body.ontouchstart = ondown;
			} else {	// simulator
				jQuery(aa_body()).unbind("mousemove").unbind("mouseup").unbind("mousedown").mousemove(onmove).mouseup(onup).mousedown(ondown);
			}
			curtain.Move = function(slide) {
				if (slide) {			// openning/closing curtain
					curtain.open = !curtain.open;
					var onTransitionEnd = function() {
						ajaxart.run(data,profile,curtain.open ? 'OnOpen' : 'OnClose',context);
						curtain.removeEventListener('webkitTransitionEnd', onTransitionEnd);
						curtain.removeEventListener('transitionend', onTransitionEnd);
					}
					curtain.addEventListener('webkitTransitionEnd', onTransitionEnd);
					curtain.addEventListener('transitionend', onTransitionEnd);
				}
				var style = curtain.style;
				style.webkitTransitionDuration = style.MozTransitionDuration = style.msTransitionDuration = style.OTransitionDuration = style.transitionDuration = 300 + 'ms';
				style.MozTransform = style.webkitTransform = style.transform = 'translate3d(' + -(curtain.open ? 0 : curtain.width) + 'px,0,0)';
				curtain.start = null;
			}
/*			if (aa_bool(data,profile,'AutoMoveWithVerticalScroll',context))
				jQuery(aa_has_simulator() ? aa_body() : document).bind('scroll', function() { 
					curtain.style.top = aa_window_scroll().Y + "px"; } );
*/
			return [curtain];
		};
	    return [field];		
	},
	IsMobileCurtainOpen: function(profile,data,context)
	{
		var out = [];
		jQuery(aad_find_field(aa_text(data,profile,'CurtainId',context),'aa_curtain')).each(function(index,curtain) {
			if (curtain.open) out = ["true"];
		});
		return out;
	},
	SlideMobileCurtain: function(profile,data,context)
	{
		var slide_to = aa_text(data,profile,'SlideTo',context);

		jQuery(aad_find_field(aa_text(data,profile,'CurtainId',context),'aa_curtain')).each(function(index,curtain) {
			if (curtain.Move)
				if (slide_to == 'toggle' || curtain.open && slide_to == 'close' || !curtain.open && slide_to == 'open')
						curtain.Move(true);
		});
		return [];
	},
	MobileDetailsReplacingAll: function(profile,data,context)
	{
		var cntr = context.vars._Cntr[0]; 
		var control = context.vars.DetailsControl;
		if (control == null || control.length == 0) return [];

		var details_background = aa_text(data,profile,'DetailsBackground',context);
		var details_control = jQuery(control).appendTo("<DIV/>").parent().appendTo("<DIV/>").parent().appendTo("<DIV class='aa_mobile_replacing_all'/>").parent()[0];
		// DIV1: android fix position:fixed cannot work with transform
		// DIV2: animation and scroll fix may colllide
		// details_control.style.cssText = 'position:' + (aa_has_simulator() ? 'absolute' : 'fixed') + '; z-index:1; top:0px; left:0px;';
		details_control.style.cssText = 'position:absolute; z-index:1; top:0px; left:0px;';
		details_control.firstChild.style.cssText = 'background:' + details_background + ";display: inline-block;";
		details_control.firstChild.style.minWidth = aa_screen_size(true).width + "px";
		details_control.firstChild.style.minHeight = Math.max(aa_screen_size(true).height + 70, aa_document_height()) + "px";	// 50: http://stackoverflow.com/questions/9678194/cross-platform-method-for-removing-the-address-bar-in-a-mobile-web-app
		var original_scroll = aa_window_scroll().Y;
		var animation = aa_first(data,profile,'DetailsAnimation',context);
		var original_control = cntr.Ctrl;
		// cntr.Ctrl.parentNode.style.position = 'relative';
		cntr.Ctrl.parentNode.appendChild(details_control);
		animation.animate(details_control, function() {
			setTimeout(function() {
				if (original_scroll > 1)	// scroll to top
					jQuery(aa_body()).animate({ scrollTop: navigator.userAgent.toLowerCase().match(/android/) ? 1 : 0 }, 200 );
			},1);
//			document.body.style.minHeight = aa_screen_size(true).height + 70 + "px";
//			aa_window_scroll_to(0,1);
//			jQuery(original_control).hide();
			cntr.Ctrl = details_control;
//			details_control.style.cssText = 'position:none; z-index:0; top:0px;';
//			document.body.style.minHeight = "none";
//			if (cntr.AfterDetailsReplacingAll) {
//				cntr.AfterDetailsReplacingAll();
				// document size may have changed (when canceling search)
//				details_control.firstChild.style.minHeight = Math.max(aa_screen_size(true).height + 70, aa_document_height()) + "px";	// 50: http://stackoverflow.com/questions/9678194/cross-platform-method-for-removing-the-address-bar-in-a-mobile-web-app
//			}
		});

		context.vars._ItemDetailsObject[0].HideDetails = function(data2,ctx2) {
			var list_animation = aa_first(data,profile,'ListAnimation',context);
			list_animation.hide(details_control, function() {
				aa_remove(details_control);
//				jQuery(aa_body()).animate({ scrollTop: original_control }, 500 );
				cntr.Ctrl = original_control;
			});
		};
		context.vars._ItemDetailsObject[0].HideDetails1 = function(data2,ctx2) {
			var list_animation = aa_first(data,profile,'ListAnimation',context);
			var list_background = aa_text(data,profile,'ListBackground',context);
			cntr.Ctrl.parentNode.removeChild(original_control);
			var original_control_wrapped = jQuery(original_control).appendTo("<DIV/>").parent().appendTo("<DIV/>").parent().appendTo("<DIV class='aa_mobile_original_control'/>").parent()[0];
			cntr.Ctrl.parentNode.appendChild(original_control_wrapped);
			original_control_wrapped.style.cssText = 'position:' + (aa_has_simulator() ? 'absolute' : 'fixed') +  ';z-index:1; top:0px; left:0px; ';
			original_control_wrapped.firstChild.style.cssText = 'background:' + list_background + ";display: inline-block;";
			original_control_wrapped.firstChild.style.width = aa_screen_size(true).width + "px";
			original_control_wrapped.firstChild.style.minHeight = aa_screen_size(true).height + "px";	// 50: http://stackoverflow.com/questions/9678194/cross-platform-method-for-removing-the-address-bar-in-a-mobile-web-app
			if (aa_has_simulator()) original_control_wrapped.style.top = aa_window_scroll().Y + "px";	//simulator scroll fix
			// scroll fix
			jQuery(original_control_wrapped.firstChild.firstChild).css("-webkit-transform",'translateY(-' + original_scroll + 'px)').css("transform",'translateY(-' + original_scroll + 'px)');
			jQuery(original_control).show();
			list_animation.animate(original_control_wrapped.firstChild,function() {
				aa_window_scroll_to(0,original_scroll);
				jQuery(original_control_wrapped.firstChild.firstChild).css("-webkit-transform",'none').css("transform",'none');
				original_control.style.cssText = 'z-index:1';
				cntr.Ctrl.parentNode.appendChild(original_control);
				cntr.Ctrl.parentNode.removeChild(original_control_wrapped);
				original_control.style.cssText = 'z-index:none';
				aa_remove(details_control);
				cntr.Ctrl = original_control;
			});
		}
		return [];
	}
});
function aa_has_simulator(elem) {
	if (!elem)
		return (ajaxart.jbart_studio && jQuery('.studio_simulator').length > 0 && jQuery('.studio_simulator')[0].className.indexOf(' ') > -1);
	else // studio shuld be parent of elem
		return (ajaxart.jbart_studio && jQuery(elem).parents('.studio_simulator').length > 0 && jQuery(elem).parents('.studio_simulator')[0].className.indexOf(' ') > -1);

}
function aa_window_scroll() {
	if (aa_has_simulator())
		return { Y:jQuery('.studio_simulator')[0].scrollTop, X:jQuery('.studio_simulator')[0].scrollLeft};
	else
		return { Y:window.scrollY, X:window.scrollX };
}
function aa_window_scroll_to(x,y) {
	if (aa_has_simulator())
		jQuery('.studio_simulator').scrollTop(y).scrollLeft(x);
	else
		window.scrollTo(x,y);
}
function aa_document_height() {
	if (aa_has_simulator())
		return jQuery('.studio_simulator').children().height();
	else return Math.max(
        jQuery(document).height(),
        jQuery(window).height(),
        /* For opera: */
        document.documentElement.clientHeight);
}

function aa_mobile_slide_transition(settings,slideToLeft,time) {
	settings = aa_defaults(settings, { scrollDuration: 200 });
	var transition = settings.transition;
	var directionClass = settings.direction == 'From Right' ? "slide_from_right" : "slide_from_left";
	// var device_width = aa_screen_width(transition.context);
	// var margin = slideToLeft ? device_width : -device_width;

	aa_body().scrollTop = navigator.userAgent.toLowerCase().match(/android/) ? 1 : 0;
	transition.$elNew.addClass("aa_new");
	// aa_alert('adding aa_new to son of ' + cssClass);
  	var cssClass = aa_attach_global_css(transition.css);
	transition.$elOriginal.parent().addClass(cssClass).addClass(directionClass);
	transition.elOriginal.parentNode.appendChild(transition.elNew);
  	aa_element_attached(transition.elNew);  	
	transition.onBeforeTransitionBegin();

	var _transitionEndEvents = "animationend animationend webkitAnimationEnd oanimationend MSAnimationEnd";
	transition.$elNew.on( _transitionEndEvents, onTransitionEnd );

	function onTransitionEnd() {
		// aa_alert('removing aa_new from son of ' + cssClass);
		transition.$elOriginal.parent().removeClass(cssClass).removeClass(directionClass);;
	    transition.removeOriginal(transition.elOriginal);
	    transition.$elNew.removeClass('aa_new');
		transition.onTransitionEnd();
	}
}
