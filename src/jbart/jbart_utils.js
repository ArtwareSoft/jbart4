/*** jBart API ***/

// IE8 support
if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}

function aa_convertToXml(item,name, error_control) {
	if (!item) return aa_parsexml('<xml/>');
	if (item.nodeType == 9) return item.documentElement; // xml document
	if (ajaxart.isxml_item(item)) return item;
	if (item.getNumberOfColumns)
		return aa_GoogleDataTableToXml(item);
	if (typeof(item) == 'object') // json
		return aa_JSON2Xml(item,'Top');
	if (typeof(item) == 'string') {
		var json = item.match(/^\s*[{[]+/); // json - starting with { or [
		var xml = item.match(/^\s*[<]+/); // xml - starting with <
		if (json)
			return aa_JSON2Xml(item,'Top');
		else if (xml)
			return aa_parsexml(item, "", error_control);
		else if (item.indexOf(',') != -1) // CSV?
			return aa_CSV2Xml(item);
	}
}
function aa_jbart_init_activator(jBartActivator,settings) {
		var language = '';
		settings.success = settings.success || function() {};
		settings.error = settings.error || function(msg) { if (console) console.log(msg); };

		ajaxart.base_images = settings.base_images_dir || ajaxart.base_images;
		ajaxart.base_lib = settings.base_lib_dir || ajaxart.base_lib;

		var widget_src = jBartActivator._widgetSource;
		var errors = [];
		jBartActivator._widgetXml = aa_convertToXml(jBartActivator._widgetSource,"widget xml", errors);

		settings.data = settings.data || {};
		settings.rawData = settings.rawData || {};
		var widget_id = jBartActivator._widgetXml.getAttribute('id');

		for(var res in settings.data) {
			var varname = 'jBartWidget_' + widget_id + '_' + res; 
			window[varname] = jbart_data(settings.data[res],'single');
		}
		for(res in settings.rawData) {
			var val = aa_isArray(settings.rawData[res]) ? settings.rawData[res] : [settings.rawData[res]];
			window['jBartWidget_' + widget_id + '_' + res] = val;
		}

		jBartActivator.Context = aa_create_jbart_context({
				WidgetXml: jBartActivator._widgetXml,
				Language: language,
				OnError: function(data1) {
					handleError(aa_totext(data1));
				},
				jbartObject: jBartActivator
		});

		function handleError(message) {
			ajaxart.log(message);
			params.error({message: message});
		}		
}

function aa_jbart_activator_showPage(jBartActivator,div,settings) {
  var out = aa_show_jbart_widget_page({
		Context: jBartActivator.Context,
		page: settings.page,
		success: settings.success
	});
	if (out && div) jQuery(div)[0].appendChild(out);
	aa_element_attached(out);
}
/*
 * params:
 * ** The Widget
 * 		widget_src : the xtml source code of the widget (also called widget)
 *  or
 *  	widget_id: the id of the widget. e.g. shai__myWidget
 *  	widget_repository: default it jbartdb. e.g. //jbartdb.appspot.com/
 *  
 *  *** More params
 *  page: the page to show - default is defined in the widget 
 *  language: i18n. e.g. hebrew
 *  spinner: you can define your own url or leave the null value to use the default spinner.
 *  nospinner: if true, no spinner is used
 *  
 *  *** Callbacks
 *  success: function called after the widget is loaded and attached
 *  error(e): function called on error
 */
jBart.appendWidget = function(place_to_add,params,jbartObject)
{
		function handleError(message) {
			ajaxart.log(message);
			params.error({message: message});
		}
		jBart.settings = params;
		params.success = params.success || function() {};
		params.error = params.error || function(msg) { jQuery(place_to_add).append(jQuery('<span/>').text(msg.message)); };
		var widgetID = params.widget_id;
		var loadingTime;

		ajaxart.base_images = params.base_images_dir || ajaxart.base_images;
		ajaxart.base_lib = params.base_lib_dir || ajaxart.base_lib;
		if (!place_to_add) return handleError('can not add to a null element');
		
		jQuery(place_to_add).addClass('jBartWidget');
		if (!params) return handleError('missing params');
		

		function getControl(widget_id) {
			var errors = [];
			if (! params.widget_src) return handleError('widget source for ' + (widget_id || 'unknown') + ' is not available'); 
			var widget_as_xml = aa_convertToXml(params.widget_src,"widget xml", errors);
			if (widget_as_xml.tagName == 'Error') return handleError(widget_as_xml.getAttribute('message'));
			if (errors.length > 0) return handleError(errors[0]);
			
			widget_id = widget_id || widget_as_xml.getAttribute('id');
			if (widget_id.indexOf('/') > -1) widget_id = widget_id.split('/')[1];
			widgetID = widget_id;

			var language = params.language ? params.language : "";
			var page = params.page;
			params.data = params.data || {};
			params.rawData = params.rawData || {};
			
			for(var res in params.data) {
				var varname = 'jBartWidget_' + widget_id + '_' + res; 
				window[varname] = jbart_data(params.data[res],'single');
			}
			for(var res in params.rawData) {
				var val = aa_isArray(params.rawData[res]) ? params.rawData[res] : [params.rawData[res]];
				window['jBartWidget_' + widget_id + '_' + res] = val;
			}

			var xtmlContent = aa_xpath(widget_as_xml,'bart_dev/db/bart_unit/bart_unit')[0];
			xtmlContent = xtmlContent || aa_xpath(widget_as_xml,'xtml')[0];
			ajaxart.load_xtml_content('widget',xtmlContent);  // for specific components
			var out = [aa_show_jbart_widget({
				WidgetXml: widget_as_xml,
				Page: page,
				Language: language,
				OnError: function(data1) {
					handleError(aa_totext(data1));
				},
				Context: aa_ctx( ajaxart.newContext(), {Language:[language]} ),
				jbartObject: jbartObject
			})];			
			if (out.length == 0) return null;
			jQuery(out[0]).addClass('ajaxart' + ajaxart.deviceCssClass);
			if (language == "hebrew")
				jQuery(out[0]).addClass('right2left');
			return out[0];
		}
		if (params.widget_id) { // we need to load the widget first
			var widget_id = params.widget_id;
			params.spinner = params.spinner || '//www.google.com/ig/images/spinner.gif';
			if (! params.nospinner) {
			  place_to_add.appendChild(jQuery('<img class="spinner" src="'+ params.spinner +'" ></img>')[0]);
			}
			window['jBartWidget_' + widget_id + '_loaded'] = function() {
				params.widget_src = window['jBartWidget_' + widget_id];
				jQuery(place_to_add).children(".spinner").remove();
				var ctrl = getControl(widget_id);
				controlCreated(ctrl);
			}
			var widgetUrl = (params.widget_repository || '//jbartdb.appspot.com') + '/widget.js?id=' + widget_id;
			aa_load_js_css(widgetUrl,'js');
		}
		else if (params.widget_src)
		{
			controlCreated(getControl());
		}
		else
			return handleError('missing param widget_id or widget_src');

		function controlCreated(ctrl) {
			if (ctrl) {
				$('#jbart_loading').empty();
				place_to_add.appendChild(ctrl);
				aa_element_attached(place_to_add);
				params.success();

				if (window.jBartLoadingStartTime) {
					loadingTime = new Date().getTime() - window.jBartLoadingStartTime;
				}
				addToGoogleAnalytics();

			} else {
				return handleError('widget returned an empty control');
			}
		}
		function addToGoogleAnalytics() {
			jBart.addedToGoogleAnalytics = jBart.addedToGoogleAnalytics || {};
			if (jBart.addedToGoogleAnalytics[widgetID]) return;
			jBart.addedToGoogleAnalytics[widgetID] = true;

			if (window.location.href.indexOf('localhost') > -1) return;
			if (params.hasOwnProperty('googleAnalytics') && !params.googleAnalytics) return;

			// Yaniv TODO: add it in an iframe
			if (window._gaq) {
			   _gaq.push(['_setAccount', 'UA-37216601-1']);
			   _gaq.push(['_setDomainName', 'none']);//'artwaresoft.appspot.com']);
			   _gaq.push(['_setAllowLinker', true]);
			   _gaq.push(['_trackPageview']);

				_gaq.push(['_trackEvent', 
					'jbart widget',
					widgetID,
					'show'
				]);

				loadingTime = parseInt(loadingTime / 500)*500;
				var loadingStr = loadingTime +  ' - ' + (loadingTime+500);

				if (loadingTime) {
					_gaq.push(['_trackEvent', 
						'jbart widget',
						widgetID,
						'loading_time_ms: ' + loadingStr
					]);
				}
			} else {
			     var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
			     ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
			     var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
			     setTimeout(function() { addToGoogleAnalytics(); },3000);
			}
		}
}
jBart.dialogs = {};
jBart.isReady = false;
jBart.ready = function(func) {
	if (jBart.isReady)
		ajaxart.ready(func,[],[]);
	else
		jBart.bind(jBart,'ready',func);
}

function jbart_init() {
	(function(jQuery) {
		jQuery.fn.jBart = function(params)
		{
			return this.each(function() {
				var elem = this;
				jBart.ready(function() {
					if (!params.widget) { if (window.console) { console.error("jBart: param 'widget' is missing"); } return; };
					if (!jBartWidgets[params.widget]) { if (window.console) { console.error("jBart: '" + params.widget + " is not a valid widget"); } return; };
					jBartWidgets[params.widget].show(elem, params);
					// jBart.appendWidget(elem,params);
				});
			});
		};
	})(jQuery);

	(function(jQuery) {
		jQuery.fn.jbart = function(params)
		{
			return this.each(function() {
				var elem = this;
				jBart.ready(function() {
					if (params && params.url)
					 	$.ajax({
					  		url: params.url,
					  		dataType: 'text',
					  		success: function(widgetSource) {
					  			jBart.appendWidget(elem,{ widget_src: widgetSource });
					  		}
					  	});
					else {	// if only one widget is loaded, just use it
						var widgets = [];
						for (var i in jBartWidgets)
							if (jBartWidgets.hasOwnProperty(i) && i != 'vars')
								widgets.push(i);
						if (widgets.length > 1)
							console.error('jbart - more than one widget was loaded, please specify widget id');
						else if (widgets.length == 1 && window['jBartWidget_' + i])
							jBart.appendWidget(elem,{ widget_src: window['jBartWidget_' + i] });
					}
				});
			});
		};
	})(jQuery);

	var activate = function() {
		// auto inject jBart widget to jBartWidget elems
		jQuery().ready( function() {
			if (!ajaxart.ready) return; // TODO: Fix to support dynamic loading of jbart after jQuery is already loaded 
			ajaxart.ready(function() {
				jBart.ajaxart = ajaxart;
				jBart.isReady = true;
				jBart.trigger(jBart,'ready');
				jQuery().find('.jBartWidget').each(function() {
					var params = {}
					if (this.className == 'jBartWidget') return;
//					if (!(this.className + ' ').split('jBartWidget ')[1].split('jBartWidget_')[1]) return;
					var widgetId= (this.className + ' ').split('jBartWidget ')[1].split('jBartWidget_')[1].split(' ')[0];
					var WidgetVarName = 'jBartWidget_' + widgetId;
				    params.widget = window[WidgetVarName];
					if (this.className.indexOf('jBartWidgetPage_') >-1)
					  params.page= (this.className + ' ').split('jBartWidgetPage_')[1].split(' ')[0];
					
				    if (params.widget)
						jQuery(this).jBart(params);
				    else
				    	ajaxart.log('can not find widget ' + widgetId);
				  	jQuery("#ajaxart_loading").hide();
				});
			},[]);
		})
	}
	if (!window.jBartNodeJS)
		activate();
	window.jbart_data = jbart_data;	// for use in external js
}
jbart_init();
function jbart_data(data,multiplicity)  // multiplicity can be 'multiple' (default) or 'single'
{
	if (data == window) return [];
	var error_control = [];
	var data_as_xml = aa_convertToXml(data,"widget data", error_control);
	if (!data_as_xml && typeof(data) == 'string') return [data];
	if (!data_as_xml) return null;
	// clean atom and rss headers
	var tagName = data_as_xml.tagName.split(':').pop();
	if (tagName == 'feed' || tagName == 'rss')
	{
		// clean NS and change root tag
		var items_path = (tagName == 'feed') ? 'atom:entry' : 'channel/item';
		var items = aa_xpath(data_as_xml, items_path);
		if (items.length > 0) {
			var result = '<top>';
			for(var i in items)
				result += ajaxart.xml.prettyPrint(items[i],'',true);
			result += '</top>';
			data_as_xml = aa_convertToXml(result,"cleaned data", error_control);
		}
	}
	if (!multiplicity || multiplicity == 'multiple')
		return aa_xpath(data_as_xml,'*');
	return [data_as_xml];
}

/******* action async **********/
function aa_RunAsyncQuery(data,fieldscript,context,callBack)
{
	if (fieldscript == null) { callBack([],context,false); return; }
	
	var callBackObj = { callBack: callBack, marked: false , success: true };
	var newContext = aa_ctx(context,{ _AsyncCallback : callBackObj });
	var result = [];
	ajaxart.trycatch( function()  {
		if (typeof(fieldscript) == "function") 
			result = fieldscript(data,newContext); 
		else if (fieldscript.compiled != null)
			result = fieldscript.compiled(data,newContext);
		else
			result = ajaxart.run(data,fieldscript,'',newContext);		// TODO: clean
	}, function (e) {	// catch
	   	   ajaxart.logException(e);
	       return [];
	});
	if (! callBackObj.marked && callBack)	// sync query
		callBack(result,context,true);
}
function ajaxart_RunAsync(data,fieldscript,context,callBack,object_for_method)
{
	if (fieldscript == null) { callBack(data,context,false); return; }
	
	var callBackObj = { callBack: callBack, marked: false , success: true };
	var newContext = aa_ctx(context,{ _AsyncCallback : callBackObj });
	if (ajaxart.debugmode) {
	  if (typeof(fieldscript) == "function") {
		  if (object_for_method) fieldscript.call(object_for_method,data,newContext);
		  else fieldscript(data,newContext);
	  }
	  else if (fieldscript.compiled != null)
			fieldscript.compiled(data,newContext);
		  else
		    ajaxart.run(data,fieldscript,'',newContext);
	} else {
	  try {
		  if (typeof(fieldscript) == "function") {
			  if (object_for_method) fieldscript.call(object_for_method,data,newContext);
			  else fieldscript(data,newContext);
		  }
		  else if (fieldscript.compiled != null)
			fieldscript.compiled(data,newContext);
		  else
		    ajaxart.run(data,fieldscript,'',newContext);		// TODO: clean
	  } catch(e) { ajaxart.logException(e); }
	}
	if (! callBackObj.marked && callBack)	// sync action
  	  callBack(data,context,true);
}
/************* bart **************/
function ajaxart_resourceByID(id,context)
{
	if (!context.vars._AppContext) return null;
	var bc = context.vars._AppContext[0];
	if (!bc.Resources) return null;

	var res = bc.Resources;
	for(var i=0;i<res.length;i++)
		if (aa_totext(res[i].ID) == id)
			return res[i];
	
	return null;
}

function ajaxart_popup_capture_click(e)
{
    var elem = jQuery( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );

    if (elem.parents('.customsuggestionpopup').length > 0) return; // clicking inside suggestion box
    if (elem.parents('.contextmenu').length > 0) return; // clicking inside context menu
    if (elem.parents('.capturebox').length > 0) return;
    if (elem.parents('html').length == 0 && elem[0].tagName.toLowerCase() != 'html') return; // detached - should not close..?
//    if (elem.parents().length == 0) return;
    
    var popups = ajaxart.dialog.openPopups;
    for(var i=0;i<popups.length;i++)
    {
    	var popup = popups[popups.length-i-1];
	    if (elem.parents('.aa_click_dosent_close_popup').length > 0) {
	    	// usage: click in inspect popup should not close the current editable popup 
	    	// we do close the popup if it is a 'son' of the inspect dialog
	    	var launching_element = (popup.Dlg) ? popup.Dlg.onElem : popup.onElem;
	    	if (jQuery(launching_element).parents('.aa_click_dosent_close_popup').length == 0)
	    		return;
	    }

    	var popup_frame = (popup.Dlg) ? popup.Dlg.Frame : popup.contents.parentNode;
    	
		//if ( !elem.hasClass('aapopup') && elem.parents('.aapopup').length == 0 && elem.parents('.contextmenu').length == 0 )  // outside the popup
    	if (elem[0] != popup_frame && elem.parents().filter(function() { return this == popup_frame } ).length == 0)
		{
    		if (!popup.initialized) continue;
			jQuery("#log").append("click outside popup");
			if (popup.Dlg && !popup.Dlg.JBStudio && elem.parents('.jbstudio_dlg').length > 0) {
				// no not close
			} else {
				aa_closePopup(popup);
				if (popup.Dlg) jBart.trigger(popup.Dlg,'cancel');
			}
			ajaxart_popup_capture_click(e); // try close more popups
			return;
		}
		else
		{
		  	if (ajaxart.controlOfFocus)
		  		ajaxart.controlOfFocus.IgnoreBlur = true;
			return;
		}
    }
}
function ajaxart_scroll_offset() {
	var scrollOffsetX = 0;
	var scrollOffsetY = 0;
	// taken fron http://www.howtocreate.co.uk/tutorials/javascript/browserwindow
	if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
    //DOM compliant
		scrollOffsetY = document.body.scrollTop;
		scrollOffsetX = document.body.scrollLeft;
  } else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
    //IE standards compliant mode
  	scrollOffsetY = document.documentElement.scrollTop;
    scrollOffsetX = document.documentElement.scrollLeft;
  }	
	return { x:scrollOffsetX, y:scrollOffsetY };
}
function aa_screen_height(context) {
	if (context.vars._PagePreview)
		return context.vars._PagePreview[0].Height;
	else
		return window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);
}
function aa_screen_width(context) {
	if (context.vars._PagePreview)
		return context.vars._PagePreview[0].Width;
	else
		return window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
}
function ajaxart_dialog_close_all_popups()
{
   	aa_closePopup(ajaxart.dialog.openPopups[0]);
}

function aa_capture_for_popup(popup)
{
	// console.log("capture_for_popup " + popup.onElem.parentNode.Field.Id);
	if (window.captureEvents)
	{ // FF
		popup.Orig_mousedown = window.onmousedown;  
		window.onmousedown = ajaxart_popup_capture_click;//for compression - ajaxart_popup_capture_click()
	}
	else  // IE
	{
		//alert('capture_for_popup');
		popup.Orig_mousedown = document.onmousedown;  
		document.onmousedown=ajaxart_popup_capture_click;
	}
	popup.capturing = true;
}

function aa_uncapture_for_popup(popup)
{
	// console.log("aa_uncapture_for_popup " + popup.onElem.parentNode.Field.Id);
	if (!popup || !popup.capturing) return;
	var orig_mousedown = popup ? popup.Orig_mousedown : null;
	if (window.captureEvents) // FF
		window.onmousedown = orig_mousedown;
	else  // IE
		document.onmouseclick = orig_mousedown;
}

function aa_closePopup(popup)
{
	if (window.aa_dont_close_popups) return;
	var popups = ajaxart.dialog.openPopups;
	if (popups.length == 0) return;
	if (!popup) popup = popups[popups.length-1];
		
	if (!aa_intest && !popup.initialized) return;

	// console.log("close " + popup.onElem.parentNode.Field.Id);
	var top_popup = popups[popups.length-1];
	var maxCount = 20;
	while(top_popup && top_popup != popup) // close cascading popups
	{
		if (!top_popup.initialized)
		{
			// console.log(top_popup.onElem.parentNode.Field.Id + " not initalized");
			if (popups.length <= 1) return;
			// can not delete un-initialized, so replace it with next top (if it is the one we would like to close)
			var new_top = popups[popups.length-2];
			if (new_top == popup)
			{
				// console.log("replaced with " + new_top.onElem.parentNode.Field.Id);
				var un_initialize = popups.pop();
				new_top = popups.pop();
				popups.push(un_initialize);
				popups.push(new_top);
				top_popup = new_top;
			}
			else
				return;
		}
		aa_closePopup(top_popup);
		popups = ajaxart.dialog.openPopups;
		top_popup = ajaxart.dialog.openPopups[ajaxart.dialog.openPopups.length-1];
		
		if (--maxCount < 0) break;
	}
	// console.log("closing " + top_popup.onElem.parentNode.Field.Id);
	ajaxart.dialog.openPopups.pop();
	aa_uncapture_for_popup(popup);
	if (!popup.Dlg) {	
		aa_remove(popup.contents.parentNode,true);
	}
	if (popup.returnFocusTo != null) popup.returnFocusTo.focus();
	if (ajaxart.suggestbox && ajaxart.ui.suggestBoxPopup)
		ajaxart.suggestbox.closePopup();
	
	if (popup.Dlg) popup.Dlg.Close([],ajaxart.newContext(),true);
	return [];
}

function aa_contentsOfOpenPopup()
{
	var popup = ajaxart.dialog.openPopups[ajaxart.dialog.openPopups.length-1];
	if (popup != null)
		  return [popup.contents];
	return [];
}

function aa_fixTopDialogPosition()
{
	var topDialog = aa_top_dialog();
	if (topDialog && topDialog.Dialog && topDialog.Dialog._FixDialogPosition) { topDialog.Dialog._FixDialogPosition(); return; }
	
	if (openDialogs.length == 0) return [];
	var dlgContent = openDialogs[openDialogs.length-1].dialogContent;
		var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
		var screenHeight = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);
		var scrollOffsetX = 0;
		var scrollOffsetY = 0;
		// taken fron http://www.howtocreate.co.uk/tutorials/javascript/browserwindow
		if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {  //DOM compliant
			scrollOffsetY = document.body.scrollTop;
			scrollOffsetX = document.body.scrollLeft;
	} else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
	  //IE standards compliant mode
		scrollOffsetY = document.documentElement.scrollTop;
	    scrollOffsetX = document.documentElement.scrollLeft;
	}
	if (jQuery(dlgContent).width() + aa_absLeft(dlgContent) > screenWidth ||
		jQuery(dlgContent).height() + aa_absTop(dlgContent) > screenHeight )
	{
		dlgContent.style.left = (screenWidth - jQuery(dlgContent).width())/2 + scrollOffsetX + "px";
		dlgContent.style.top = (screenHeight - jQuery(dlgContent).height())/2 + scrollOffsetY + "px";
	}
	return [];
}

/*************** action **************/
aa_delayedRun = function(func,id,delay,milliToForce) 
{
	// look for the id in the table
	var newRecord = { id: id , handle: null}
	var getTimerFunc = function(record)
	{
		return function() {
			record.handle = 0;
			var force = false;
			if (record.startTime == null) record.startTime = new Date().getTime();
			else if (record.startTime + milliToForce > new Date().getTime())
				force = true;
			
			var success = func(force);
			if (success || force) {
				jBart.utils.removeFromArray(ajaxart.runDelayed,newRecord);
			}
			else
				newRecord.handle = setTimeout(getTimerFunc(newRecord),delay); // keep trying till milliToForce
		}
	}

	for(var i=0;i<ajaxart.runDelayed.length;i++)
	{
		var record = ajaxart.runDelayed[i];
		if (typeof(record.id) == typeof(id) && record.id == id) {
			if (record.handle != 0)
			  clearTimeout(record.handle);
			ajaxart.runDelayed[i] = newRecord;
			newRecord.handle = setTimeout(getTimerFunc(newRecord),delay);
			return ["true"];
		}
	}
	ajaxart.runDelayed.push(newRecord);
	newRecord.handle = setTimeout(getTimerFunc(newRecord),delay);
};
/******************* xml *******************/

function aa_bindXmlChange(xml,callback,settings) {
  ajaxart.xmlListeners = ajaxart.xmlListeners || [];
  ajaxart.xmlListenersCounter = ajaxart.xmlListenersCounter ? ajaxart.xmlListenersCounter+1 : 1;

  if (!xml || !xml.tagName) return;
  ajaxart.xmlListeners[xml.tagName] = ajaxart.xmlListeners[xml.tagName] || [];

	ajaxart.xmlListeners[xml.tagName].push({
		xml: xml,
		callback: callback,
		settings: settings,
		id: ajaxart.xmlListenersCounter
	});

  return ajaxart.xmlListenersCounter;
}

function aa_triggerXmlChange(xml,args) {
	if (!xml || !ajaxart.xmlListeners) return;
	var iter = xml.nodeType == 1 ? xml : aa_xpath(xml,'..')[0];

	// find if anyone is listening to a parent
	for(;iter && iter.nodeType == 1;iter=iter.parentNode) {
		var listeners = ajaxart.xmlListeners[iter.tagName];
		if (!listeners) continue;

		for(var i=0;i<listeners.length;i++) {
			if (listeners[i] && listeners[i].xml == iter)
				listeners[i].callback(xml,args);
		}

	}
}

function aa_unbindXmlChange(identifier) {
	if (!ajaxart.xmlListeners || !identifier) return;
	for(var tag in ajaxart.xmlListeners) {
		var listeners = ajaxart.xmlListeners[tag];
		for(var i=0;i<listeners.length;i++) {
			if (listeners[i] && listeners[i].id == identifier) {
				listeners.splice(i,1);
				return;
			}
		}
	}
}

function aa_xml2htmltext(xml) // faster than xml2text and supports mixed html inner text
{
	if (xml == null) return '';
	
	if (xml.nodeType == null) return xml;
	if (xml.nodeType == 2 || xml.nodeType == 3 || xml.nodeType == 4) { // Attribute or inner text
		return aa_xmlescape(xml.nodeValue);
	}
	 var out = xml.xml; //IE xml
	 if (xml.nodeType != null) // outer XML/html
	 {
	  if (!out) out = xml.outerHTML; // IE html
	  if (!out) { // mozilla
			var serializer = new XMLSerializer(); // XMLSerializer() omits newlines & tabs
			out = serializer.serializeToString(xml);
	  }
	 }
	 return out;
}
ajaxart.xml.parentNode = function(node)
{
	if (node.nodeType == 9) 
		return null;
	if (node.parentNode && node.parentNode.nodeType == 1)
		return node.parentNode;
	if (node.parentNode && node.parentNode.nodeType == 9)
		return null;
	if (node.ownerElement != null)
		return node.ownerElement;
	var xpath_result = aa_xpath(node,"..");
	if (xpath_result.length == 1) return xpath_result[0];
	return null;
}
ajaxart.replaceXmlElement = function(old_elem,new_elem,ishtml,cleanMemoryLeaks)
{
	if (old_elem == null || new_elem == null) return;
	if (old_elem.nodeType != 1) return;
	if (old_elem.parentNode == null) return;

	if (ishtml == true || ajaxart.isChrome)
	{
		if (new_elem.ownerDocument != old_elem.ownerDocument)
			new_elem = old_elem.ownerDocument.importNode(new_elem,true);
	}
	if (ishtml && old_elem.ParentObject != null) { 
		old_elem.ParentObject[0].ControlHolder = [new_elem];
		aa_defineElemProperties(old_elem,'ParentObject');
		aa_defineElemProperties(new_elem,'ParentObject');
		new_elem.ParentObject = old_elem.ParentObject; 
	}
	
	old_elem.parentNode.replaceChild(new_elem,old_elem);
	
	if (ishtml) {
		aa_element_attached(new_elem);
		if (cleanMemoryLeaks)
		  aa_remove(old_elem,cleanMemoryLeaks);
		else
		  aa_element_detached(old_elem);
	}
}
/******************* ui ********************/
function aa_element_detached(elem)
{
	if (!elem || ajaxart.isattached(elem)) return;
	
	var items = jQuery(elem).find('.aa_ondetach').get();
	if (jQuery(elem).hasClass('aa_ondetach')) items.push(elem);
	
	for(var i=0;i<items.length;i++) {
		try {
		if (items[i].OnDetach) items[i].OnDetach();
		  jQuery(items[i]).removeClass('aa_onattach_called');
		} catch(e) {ajaxart.logException(e); }
	}
}
function aa_element_attached(elem)
{
  if (! ajaxart.isattached(elem)) return;
  var items = jQuery(elem).find('.aa_onattach').get();
  if (jQuery(elem).hasClass('aa_onattach')) items.push(elem);
  for(var i=0;i<items.length;i++) {
	  if (jQuery(items[i]).hasClass('aa_onattach_called')) continue;
	  if (items[i].jbOnAttach) items[i].jbOnAttach.call(items[i]);
	  jQuery(items[i]).addClass('aa_onattach_called');
  }
}
function aa_addOnDetach(elem,func)
{
	jQuery(elem).addClass('aa_ondetach');
	elem.OnDetach = func;
}
function aa_urlAttribute(context,attr)
{
	var urlProvider = null;
	if (context.vars._AppContext) urlProvider = context.vars._AppContext[0].Url;
		
	if (urlProvider) 
		return aa_totext( aa_runMethod([],urlProvider,'GetValue',aa_ctx(context,{Attribute: [attr]})) );
	
	var url = window.location.href.split('#');
	if (url.length == 1) return "";
	var fragment = url[1];
	if (fragment.indexOf('?'+attr+'=') == -1) return "";
	var out = fragment.split('?'+attr+'=')[1].split('?')[0];
	return out.split(';')[0];
}
function aa_urlChange(context,newurl)
{
	var urlProvider = null;
	if (context.vars._AppContext) urlProvider = context.vars._AppContext[0].Url;
		
	if (urlProvider) 
    	return aa_totext( aa_runMethod([],urlProvider,'Update',aa_ctx(context,{ValuePairs: [newurl]})) );
	
	var url = window.location.href.split('#');
	var frag = url.length == 1 ? "" : url[1];
	var script = aa_parsexml('<xtml t="bart_url.NewUrlFragment" Current="'+frag+'" Proposed="'+newurl+'"/>');
	var newfrag = aa_text([],script,'',context);
	var new_url = url[0] + "#" + newfrag;
	if (window.location.href != new_url)
	{
		  if (window._gaq) // google analytics 
			  _gaq.push(['_trackPageview', '/' + new_url.split('/').pop()]);

		window.location = new_url;
	}
}
/******************* uiaction ********************/
function aa_xFireEvent(element,eventName,properties,inTest){
	window.__DOMEvents = window.__DOMEvents  || {
		  focusin:{eventGroup:"UIEvents",init:function(e,p){e.initUIEvent("focusin",true,false,window,1);}},
		  focusout:{eventGroup:"UIEvents",init:function(e,p){e.initUIEvent("focusout",true,false,window,1);}},
		  activate:{eventGroup:"UIEvents",init:function(e,p){e.initUIEvent("activate",true,true,window,1);}},
		  focus:{eventGroup:"UIEvents",init:function(e,p){e.initUIEvent("focus",false,false,window,1);}},
		  blur:{eventGroup:"UIEvents",init:function(e,p){e.initUIEvent("blur",false,false,window,1);}},
		  click:{eventGroup:"MouseEvents",init:function(e,p){e.initMouseEvent("click",true,true,window,1,p.screenX||0,p.screenY||0,p.clientX||0,p.clientY||0,p.ctrlKey||false,p.altKey||false,p.shiftKey||false,p.metaKey||false,p.button||0,p.relatedTarget||null);}},
		  dblclick:{eventGroup:"MouseEvents",init:function(e,p){e.initMouseEvent("click",true,true,window,2,p.screenX||0,p.screenY||0,p.clientX||0,p.clientY||0,p.ctrlKey||false,p.altKey||false,p.shiftKey||false,p.metaKey||false,p.button||0,p.relatedTarget||null);}},
		  mousedown:{eventGroup:"MouseEvents",init:function(e,p){e.initMouseEvent("mousedown",true,true,window,1,p.screenX||0,p.screenY||0,p.clientX||0,p.clientY||0,p.ctrlKey||false,p.altKey||false,p.shiftKey||false,p.metaKey||false,p.button||0,p.relatedTarget||null);}},
		  mouseup:{eventGroup:"MouseEvents",init:function(e,p){e.initMouseEvent("mouseup",true,true,window,1,p.screenX||0,p.screenY||0,p.clientX||0,p.clientY||0,p.ctrlKey||false,p.altKey||false,p.shiftKey||false,p.metaKey||false,p.button||0,p.relatedTarget||null);}},
		  mouseover:{eventGroup:"MouseEvents",init:function(e,p){e.initMouseEvent("mouseover",true,true,window,1,p.screenX||0,p.screenY||0,p.clientX||0,p.clientY||0,p.ctrlKey||false,p.altKey||false,p.shiftKey||false,p.metaKey||false,p.button||0,p.relatedTarget||null);}},
		  mousemove:{eventGroup:"MouseEvents",init:function(e,p){e.initMouseEvent("mousemove",true,true,window,1,p.screenX||0,p.screenY||0,p.clientX||0,p.clientY||0,p.ctrlKey||false,p.altKey||false,p.shiftKey||false,p.metaKey||false,p.button||0,p.relatedTarget||null);}},
		  mouseout:{eventGroup:"MouseEvents",init:function(e,p){e.initMouseEvent("mousemove",true,true,window,1,p.screenX||0,p.screenY||0,p.clientX||0,p.clientY||0,p.ctrlKey||false,p.altKey||false,p.shiftKey||false,p.metaKey||false,p.button||0,p.relatedTarget||null);}},
		  load:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("load",false,false);}},
		  unload:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("unload",false,false);}},
		  select:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("select",true,false);}},
		  change:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("change",true,false);}},
		  submit:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("submit",true,true);}},
		  reset:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("reset",true,false);}},
		  resize:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("resize",true,false);}},
		  keyup:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("keyup",true,false);}},
		  keydown:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("keydown",true,false);}},
		  scroll:{eventGroup:"HTMLEvents",init:function(e,p){e.initEvent("scroll",true,false);}}
	} 
	  // Attempts to fire a DOM event on an element
	  // param name="element" type="Element" The element or its identifier to fire the event
	  // param name="eventName" type="String" The name of the event to fire (without an 'on' prefix)
	  // param name="properties" type="Object" Properties to add to the event
	  //   e.g. {cancelBubble:false, returnValue:true}
	  // returns type="Boolean" True if the event was successfully fired, otherwise false
	  try{
	    properties=properties||{};
	    if(document.createEvent){
	      // DOM compatible browsers
	      if(element==window && !element.dispatchEvent){
	        // Safari3 doesn't have window.dispatchEvent()
	        element=document;
	      }
	      var def=__DOMEvents[eventName];
	      if(def){
	        var event=document.createEvent(def.eventGroup);
 	      	if (inTest) 
 	      		for(var property in properties)
 	      			try { event[property]=properties[property]; } catch(e) {} // button property throws..
	        def.init(event,properties);
	        event.srcElement = null;
	        if (ajaxart.isChrome && inTest)
	        {
	        	try {
	        	  event.tDebug = ajaxart_source_elem_in_test;
	        	} catch(e) {}
	        }
//	        for(var property in properties)
//	        	event[property] = properties[property];
      	element.dispatchEvent(event);
	        return true;
	      }
	    }else if(document.createEventObject){
	      // IE family
	      if(element==document){
	        // IE6,IE7 thinks window==document and doesn't have window.fireEvent()
	        // IE6,IE7 cannot properly call document.fireEvent()
	        element=document.documentElement;
	      }
	      var event=document.createEventObject();
	      //Object.extend(event,properties);
	      element.fireEvent("on"+eventName,event);
	      return true;
	    }
	  }catch (e){
	  }
	  return false;
	}

// asynch
aa_async_finished_listeners = [];
function ajaxart_async_CallBack(data,context)
{
	if ( context.vars._AsyncCallback != null && context.vars._AsyncCallback.callBack != null) {
		var success = context.vars._AsyncCallback.success;
		if (success == null) success = true;
		context.vars._AsyncCallback.callBack(data,context,success);
	}
}
function ajaxart_async_Mark(context,isQuery)
{
	if ( context.vars._AsyncCallback != null ) context.vars._AsyncCallback.marked = true;
	if (isQuery) context.vars._AsyncIsQuery = true;
}
ajaxart_async_GetCallbackObj = function(context)
{
	var out = context.vars._AsyncCallback;
	if (out == null) out = [ { callBack: function() {}, marked: false, success:true } ];
	context.vars._AsyncCallback = out;
	return out;
}
function aa_fire_async_finished()
{
	// let sync actions finish
	setTimeout(function() {
		for(var i=aa_async_finished_listeners.length-1;i>=0;i--)
			aa_async_finished_listeners[i].OnAsyncActionFinished();
	},1);
}
function aa_is_rtl(elem,ctx)
{
	if ( jQuery(elem).parents('.right2left').length > 0 ) return true;
	if (!elem && jQuery("body").find('.right2left').length > 0) return true;
	if (ctx && aa_totext(ctx.vars.Language) == 'hebrew') return true;
	return false;
}

function aa_createElement(elem, tag)
{
	if (elem == null || !ajaxart.isxml(elem))
		return aa_parsexml("<" + tag + "/>");
	return elem.ownerDocument.createElement(tag);
}
function aa_refresh_field(field_ids,scope,fire_on_update,transition,context)
{
	if (scope == 'sibling') { 
		var srcElement = context.vars.ControlElement[0];
		for(var j in field_ids) {
			aa_refresh_sibling_field(srcElement,field_ids[j],context);
		}
		return;
	};

	if (scope == 'parent')
	{
		// look in parents
	}
	var top = window.aa_intest ? aa_intest_topControl : document;
	if (scope == "screen")
	  top = window.aa_intest ? aa_intest_topControl : document;
	else if (scope == "document")
	  { top = context.vars._Cntr[0].Ctrl; }
	else if (scope == "table row")
	  { top = $(context.vars.ControlElement[0]).parents('tr')[0]; }
	for(var j =0;j<field_ids.length;j++)
	{
		var cls = "fld_" + field_ids[j];
		var ctrls = $(top).find('.'+cls).get();
		if ($(top).hasClass(cls)) ctrls.push(top);
		
		for(var i=0;i<ctrls.length;i++)
		{
			aa_refresh_cell(ctrls[i],context,transition,null,true);
//			if (fire_on_update)
//				aa_invoke_field_handlers(td.Field.OnUpdate,td,null,td.Field,td.FieldData);
		}
//		if (!ctrls.length) { ajaxart.log("RefreshField: cannot find field " + field_ids[j],"location"); }
	}
	aa_fixTopDialogPosition();
}
function aa_fixImageSize(img,user_width,user_height) 
{
	var imgObj = new Image(); imgObj.src = img.getAttribute('src');
	var naturalWidth = imgObj.width; var naturalHeight = imgObj.height;
	if (naturalWidth * naturalHeight == 0) {
		img.width = user_width; img.height = user_height; return;
	} 
	if (naturalWidth < img.width) img.width = naturalWidth; 
	if (naturalHeight < img.height) img.height = naturalHeight;
	var width = Math.min(naturalWidth,user_width), height = Math.min(naturalHeight,user_height); // IE hates imgObj.width
	
	var ratio = naturalWidth / naturalHeight;
	var currRatio = width / height;
	if (ratio != currRatio) {
		if (naturalWidth >= naturalHeight * currRatio) {
			img.width = user_width;
			img.height = Math.floor(width / ratio);
		} else {
			img.height = user_height;
			img.width = Math.floor(height * ratio);
		}
	} else {
		img.width = user_width; img.height = user_height;
	}
}
function aa_keepimageprops(img,user_width,user_height)
{
	var imgObj = new Image(); imgObj.src = img.getAttribute('src');
	if (imgObj.complete) aa_fixImageSize(img,user_width,user_height); 
	else {
		img.onload = function() { aa_fixImageSize(img,user_width,user_height); }
	}
}
function aa_uidocument(data,id,dataitems,fields,aspectsFunc,operationsFunc,context,readonly)
{
	var cntr = { ID: [id] , IsSingleItem: true, isObject: true , Fields: fields, Items: dataitems, ReadOnly: readonly==true }
	var newcontext = aa_ctx(context,{_ParentCntr: context.vars._Cntr, _Cntr : [cntr] } );
	cntr.Context = newcontext;
 	cntr.Ctrl = jQuery('<div class="aa_container aa_non_selectable"><div class="aa_container_header"/><div class="aa_list aasection aa_item aa_cntr_body"/><div class="aa_container_footer"/></div>')[0];
	cntr.Ctrl.Cntr = cntr;
 	if (id != '')
 	  jQuery(cntr.Ctrl).addClass('Page_'+id);

 	if (aa_tobool(context.vars.IsNewItem)) cntr.IsNewItem = true;
 		
 	var aspects = cntr.Aspects = aspectsFunc(data,newcontext);
 	
	for(var i=0;i<aspects.length;i++)
      ajaxart.runScriptParam(data,aspects[i].CreateContainer,newcontext);

	var fillContainer = function(cntr,aspects) {
		cntr.PostActors = [];cntr.PreActors = [];
		cntr.RegisterForPostAction = function(aspect,phase) { cntr.PostActors.push({ phase: phase || 0, aspect: aspect}); }
		cntr.RegisterForPreAction = function(aspect,phase) { cntr.PreActors.push({ phase: phase || 0, aspect: aspect}); }

		if (cntr.Items.length == 0) { cntr.Items = [{isObject: true , Items: []}] }
		if (cntr.Items[0].Items.length == 0) { cntr.NoData = true; cntr.Items[0].Items.push(aa_parsexml('<xml/>')) }
			
		var items_data = (cntr.Items == null || cntr.Items.length == 0 || cntr.Items[0].Items.length == 0) ? [] : [cntr.Items[0].Items[0]];

		cntr.ElemsOfOperation = function() { return jQuery(this.Ctrl).find('.aa_item').slice(0,1).get(); }
		cntr.ItemsOfOperation = function() { return [this.Items[0].Items[0]]; }

		cntr.CellPresentation = 'control';
		cntr.Operations = operationsFunc;    
		    
//		var doc_section = jQuery(cntr.Ctrl).find('.aasection')[0];
//		if (doc_section != null) {
//		  ajaxart.setVariable(newcontext,"_Section",[doc_section]);
//		  doc_section.ItemData = items_data;
//		}
		    
	    for(var i=0;i<cntr.Aspects.length;i++) {
	    	ajaxart.trycatch( function() {
	    		aa_runMethod(data,cntr.Aspects[i],'InitializeContainer',newcontext);
	    	}, function(e) { 
	    		var aspect = (cntr.Aspects[i].XtmlSource && cntr.Aspects[i].XtmlSource[0].script.getAttribute('t')) || '';
	    		ajaxart.log("error in aspect " + aspect + ": " + e.message + e.stack || '',"error"); 
	    	});
	    }

		cntr.PreActors.sort(function(a,b) { return a.phase > b.phase ? 1 : -1; });
	    cntr.PostActors.sort(function(a,b) { return a.phase > b.phase ? 1 : -1; });

		for(var i=0;i<cntr.PreActors.length;i++) {
		  	ajaxart.trycatch( function() {
		    	  ajaxart.runScriptParam([],cntr.PreActors[i].aspect.PreAction,cntr.Context);
		   	}, function(e) { ajaxart.logException(e); });
		}
	    aa_refresh_itemlist(cntr,newcontext,true);
	    //ajaxart.runsubprofiles(items_data,profile,'SectionAspect',newcontext);
	    
	    if (cntr.NoData && cntr.ControlForNoData) {
	        var top = ajaxart_find_aa_list(cntr);
	        var ctrl = cntr.ControlForNoData([],context)[0];
	      	jQuery(ctrl).addClass('aa_list');
	      	aa_replaceElement(top,ctrl);
	    }
	}
	
	if (cntr.RunAsyncAction && cntr.ControlForWaiting) {
		var myCallback = function(cntr,aspects) { return function() {
			var loading = cntr.Ctrl;
			cntr.Ctrl = cntr.OriginalCtrl;
			fillContainer(cntr,aspects);
			aa_replaceElement(loading,cntr.Ctrl);
	      	aa_fixTopDialogPosition();
		}}
		cntr.OriginalCtrl = cntr.Ctrl;
		cntr.Ctrl = cntr.ControlForWaiting(data,context)[0];
		cntr.Ctrl.Cntr = cntr;
		aad_runMethodAsync(cntr,cntr.RunAsyncAction,data,aa_ctx(context,{}),myCallback(cntr,aspects));
		return cntr.Ctrl;
	}
	
	fillContainer(cntr,aspects);
    return cntr.Ctrl;
}
function aa_set_initialize_container(aspect,func)
{
	aspect.InitializeContainer = function(data1,ctx) {
		var cntr = ctx.vars._Cntr[0];
		func(aspect,ctx,cntr);
	}
}
function aa_add_to_comma_separated(list,item)
{
	if (list == '') return item;
	if ((list+',').indexOf(','+item+',') > -1) return list;  // already inside. no need to add it again
	return list + ',' + item;
}
function aa_comma_size_to_css(size)
{
  size = size.replace(/px/g,"")
  var parts = size.split(',');
  var out = "";
  var width = parts[0];
  if (width != "") {
	  if (width.indexOf('%') == -1) width += "px";
	  out += "width:"+width+";";
  }
  if (parts.length == 1) return out;
  var height = parts[1];
  if (height != "") {
	  if (height.indexOf('%') == -1) height += "px";
	  out += "height:"+height+";";
  }
  return out;
}
function aa_CSV2Xml(txt)
{
	var result = aa_parsexml('<items/>');
	try {
		// first we pre-process to extract quotes 
		// handle cases like: 1997,"Super, luxurious truck" or 1997,"Super, ""luxurious"" truck" (http://en.wikipedia.org/wiki/Comma-separated_values#Specification)
		var new_text = "";
		var index = 0;
		var in_quote = false;
		var current_item = "";
		var quoted_items = [];
		while (1) {
			var next_index = txt.indexOf('"',index);
			if (next_index == -1) {
				new_text += txt.substring(index);
				break;
			}
			if (in_quote) {	// in quote
				if (txt.length>next_index+1 && txt.charAt(next_index+1) == '"') {	// double quote ""
					current_item += txt.substring(index,next_index) + '"';
					index = next_index + 2;
				}
				else { 	// finish current item
					current_item += txt.substring(index,next_index);
					quoted_items.push(current_item);
					index = next_index+1;
					in_quote = false;
					new_text += "___QUOTED___";
				}
			} else {	// start quote
				new_text += txt.substring(index,next_index);
				index = next_index+1;
				current_item = "";
				in_quote = true;
			}
		}
		txt = new_text;
		var lines = txt.replace('\r\n','\n').split('\n');
		var fields = lines[0].split(',');
		var fieldNames = [];
		var uniqueNamesHash = {};
		for(var i=0;i<fields.length;i++) 
		{
			// normalize field names as valid attribute names
			var name = fields[i].replace(/ ([a-z])/g,function(match) {return ' ' + match.toUpperCase()}).replace(/[^a-zA-Z0-9_]/g,'_');
			if (! name.match(/^[a-zA-Z].*/)) name = 'x' + name; // should start with alpha
			while (uniqueNamesHash[name]) // make name unique
				name += '_';
			fieldNames.push(name);
			uniqueNamesHash[name] = true;
		}
		for (var i=1;i<lines.length;i++) {
			var item = result.ownerDocument.createElement('item');
			var values = lines[i].split(',');
			for (var j=0;j<values.length;j++) {
				var val = values[j];
				if (val == "___QUOTED___")
					val = quoted_items.shift();
				item.setAttribute(fieldNames[j],val);
			}
			result.appendChild(item);
	}
	} catch(e) { 
	}
	return result;
}

function aa_GoogleDataTableToXml(data)
{
  	var fieldNames = [];
	var uniqueNamesHash = {};
	for (var col = 0; col < data.getNumberOfColumns(); col++)
	{
		// normalize field names as valid attribute names
		var name = data.getColumnLabel(col).replace(/ ([a-z])/g,function(match) {return ' ' + match.toUpperCase()}).replace(/[^a-zA-Z0-9_]/g,'');
		if (! name.match(/^[a-zA-Z].*/)) name = 'x' + name; // should start with
															// alpha
		while (uniqueNamesHash[name]) // make name unique
			name += '_';
		fieldNames.push(name);
		uniqueNamesHash[name] = true;
	}
	var xml = aa_parsexml('<items/>');
	for (var row = 0; row < data.getNumberOfRows(); row++) {
		var item = aa_parsexml('<item/>');
		xml.appendChild(item);
	    for (var col = 0; col < data.getNumberOfColumns(); col++) {
	      var formattedValue = data.getFormattedValue(row, col);
		  var col_id = fieldNames[col];
		  item.setAttribute(col_id,formattedValue);
	    }
	} 
	return xml;
}

function aa_attach_style_css(style)
{
	if (!style.CssClass) 
		style.CssClass = aa_attach_global_css(style.Css);
	return style.CssClass;
}
function aa_build_color_lookup(css) {
	colors = [];
	var match,result=css;
	var pattern = /((rgb|rgba|hsl|hsla)\([^\)]*\))/g;
	while (match = pattern.exec(css)) {
		result = result.replace(match[1],'##' + colors.length);
		colors.push(match[1]);
	}
	return { css:result, colors:colors };
}
function aa_color_lookup(colors,colorCode) {
	if (colorCode && colorCode.indexOf('##') == 0)
		return colors[colorCode.match(/([0-9]+)/)[1]];
	return colorCode;
}
function aa_adapt_css_for_browser(css, forAllBrowsers)
{	
	if (ajaxart.isFireFox) {
		css = css.replace(/-webkit-/g,'-moz-');
	}
	if (ajaxart.isIE) {
		css = css.replace(/-webkit-box/g,'-ms-flexbox');
		css = css.replace(/-webkit-/g,'-ms-');
	}
	if (ajaxart.isOpera)
		return css.replace(/-webkit-linear-gradient/g,'-o-linear-gradient');

	if (css.indexOf("input:placeholder") != -1) {
		if (forAllBrowsers) {
			css = css.replace(/input:placeholder([^{]+\{[^}]+})/, 
				"input::-webkit-input-placeholder$1" + "\n" + 
				"input:::-moz-placeholder$1" + "\n" + 
				"input.placeholder$1 /* IE */" + "\n" + 
				"input:::-ms-input-placeholder$1 /* IE10 */");
		} else {
			if (ajaxart.isChrome) 		css = css.replace(/input:placeholder([^{]+\{[^}]+})/, "input::-webkit-input-placeholder$1");
			else if (ajaxart.isFirefox) css = css.replace(/input:placeholder([^{]+\{[^}]+})/, "input:::-moz-placeholder$1");
			else if (ajaxart.isIE10)	css = css.replace(/input:placeholder([^{]+\{[^}]+})/, "input:::-ms-input-placeholder$1");
		}
	}
	if (ajaxart.isFireFox)
		return css.replace(/([^-])box-sizing/g,'$1-moz-box-sizing');
	return css;
}
function aa_cssClass(data,profile,field,context,classSuffixName,moreSettings) {
	moreSettings = moreSettings || {};
	var css = aa_text(data,profile,field,context);
	return aa_attach_global_css(css,null,classSuffixName,moreSettings.supportWrapper,moreSettings.lowPriority,context);
}
function aa_attach_global_css(globalcss,cntr,className,supportWrapper,lowPriority,context,settings)
{
	settings = settings || {};

	if (!window.aa_container_styles) window.aa_container_styles = {};
	if (!globalcss) return '';
	jBartWidgets.vars.uniqueNumber = jBartWidgets.vars.uniqueNumber || 0;
	
	var entry = globalcss;
	var classForItem = context && aa_totext(context.vars._ClassForItem);
	if (classForItem && globalcss.indexOf('#item') > -1) {
		entry = globalcss + '_' + classForItem;
	}

	if (!aa_container_styles[entry] || settings.noCssCache) { 
		var finalClassName = '';
		if (className) {
			finalClassName = 'jb_'+className;
			jBartWidgets.vars.usedJBClasses = jBartWidgets.vars.usedJBClasses || {};
			if (jBartWidgets.vars.usedJBClasses[finalClassName]) {
				finalClassName += (++jBartWidgets.vars.uniqueNumber);
			}
			jBartWidgets.vars.usedJBClasses[finalClassName] = true;
		} else {
			finalClassName = 'jb' + (++jBartWidgets.vars.uniqueNumber);
		}
		var obj = { elem_class : finalClassName , globalcss: globalcss};
		if (globalcss.indexOf('#cntr') >= 0)
			obj.cntr_class = 'jb' + (++jBartWidgets.vars.uniqueNumber);			
		aa_container_styles[entry] = obj;
		
		obj.globalcss = aa_clean_global_css(obj.globalcss);
		obj.globalcss = aa_adapt_css_for_browser(obj.globalcss);
		if (!aa_is_css_well_formed(obj.globalcss)) {
			var error = [];
			aa_is_css_well_formed(obj.globalcss,error);
			ajaxart.log("Css is invalid: " + error[0] + ". Css: " + obj.globalcss,"error");
			return "";
		}
		if (classForItem) {
			obj.globalcss = obj.globalcss.replace(/#item/g,'.'+classForItem);
		}
		obj.globalcss = obj.globalcss.replace(/#popup/g,'.jbart_popups >.'+obj.elem_class+'_popup');
		obj.globalcss = obj.globalcss.replace(/#this/g,'.'+obj.elem_class);
		obj.globalcss = obj.globalcss.replace(/#id/g,obj.elem_class);	// for animation ids: http://www.w3schools.com/css/css3_animations.asp
		if (supportWrapper)
		  obj.globalcss = obj.globalcss.replace(/#wrapper/g,'.'+obj.elem_class+'_wrapper');
		if (obj.cntr_class)
			obj.globalcss = obj.globalcss.replace(/#cntr/g,'.'+obj.cntr_class);
		
//		obj.globalcss = aa_expandCuscoVariablesMustacheStyle(obj.globalcss,context);
		obj.globalcss = obj.globalcss.replace(/_jbartImages_/g,aa_base_images());
		 
		if (settings && settings.fixGlobalCss) obj.globalcss = settings.fixGlobalCss(obj.globalcss);

		if (ajaxart.isIE) {	// IE limitation: does not support many style elems
			if (ajaxart.isIE78) {	// IE8 does not support changing innerHTML of attached style element
				window.jbIE8StyleElemCache = window.jbIE8StyleElemCache || '';
				window.jbIE8StyleElemCache += obj.globalcss + '  ';

				aa_run_delayed_action('IE8_style_elem_fix',function() {
					var styleElem = jQuery("<style>" + window.jbIE8StyleElemCache + "</style>")[0];
					var head = document.getElementsByTagName("head")[0];
					head.appendChild(styleElem);
					window.jbIE8StyleElemCache = '';
				},100,true);

			} else {
				if (!jBart.styleElem) {
					jBart.styleElem = jQuery("<style></style>")[0];
					var head = document.getElementsByTagName("head")[0];
					head.appendChild(jBart.styleElem);
				}
				var currentValue = jBart.styleElem.styleSheet ? jBart.styleElem.styleSheet.cssText : jBart.styleElem.innerHTML;
				var newCss = lowPriority ? obj.globalcss + '\n' + currentValue : currentValue + '\n' + obj.globalcss;
				if (jBart.styleElem.styleSheet)
					jBart.styleElem.styleSheet.cssText = newCss;
				else 
					jBart.styleElem.innerHTML = newCss;
			}
		} else {
			if (!obj.styleElem) {
				obj.styleElem = jQuery("<style></style>")[0];
				var head = document.getElementsByTagName("head")[0];
				head.appendChild(obj.styleElem);
			}
			obj.styleElem.innerHTML = obj.globalcss;
		}
		// obj.styleElem.StyleObject = obj;
	}
	
	if (cntr && aa_container_styles[entry].cntr_class)
		jQuery(cntr).addClass(aa_container_styles[entry].cntr_class);
	return aa_container_styles[entry].elem_class;
}

function aa_is_css_well_formed(css, error)
{
	// TODO: support css remarks
	// counting nesting brackets, ensuring there are no more closing brackets then opening brackets at any point 			
	var selector_count = 0;
	var level = 0;
	for (var j=0; j<css.length; j++) {
		if (css.charAt(j) == '{') { level++; selector_count++; }
		else if (css.charAt(j) == '}') {
			level--;
			if (level<0) {
				return false;
				if (error) error.push('Too many closing brackets in item:' + selector_count);
			}
		}
	}	
	if (level != 0) {
		if (error) error.push('Missing closing bracket');
		return false;
	}
	// Make sure there are only white spaces after the last '}'
	var suffix = css.substring(css.lastIndexOf('}')+1);
	if (suffix && !suffix.match(/\s*/) || suffix.match(/\s*/)[0] != suffix) {
		if (error) error.push('There are characters after the last closing bracket');
		return false;
	}
	return true;
}
function aa_expandCuscoVariablesMustacheStyle(text,context)
{
	if (text.indexOf('{{') == -1 || !context) return text;
	text = text.replace(/{{/g,'%').replace(/}}/g,'%');
	text = ajaxart.dynamicText([],text,context,[],false,false)[0];
	return text;
}
function aa_clean_global_css(css)	// makes sure '#this' is included in all expressions
{
	var index=0;
	while (1) {
		var bracket_index = css.indexOf('{',index);
		if (bracket_index == -1) break;
		var prefix = css.substring(index,bracket_index);
		if (prefix.indexOf("#") == -1) {	// must contain #
			if (prefix.lastIndexOf("*/") > -1)	// handle remarks
				prefix = prefix.substring(prefix.lastIndexOf("*/")+2);
//			prefix = prefix.replace(new RegExp("^[ \t\n\r]*"),"");	// trimming left white spaces
			if (prefix.indexOf("@") != -1) { index = bracket_index+1; continue; }	// don't touch meta classes, like @media print { input { color:green; } }
			if (aa_trim(prefix) == "from" || prefix.trim() == "to") { index = css.indexOf('}',bracket_index)+1; continue; }	// don't touch form and to: http://www.w3schools.com/css/css3_animations.asp
			var new_prefix = "#this " + prefix.split(",").join(",#this ");	// handle multiple selectors, like: input,textarea { color:red; }
			css = css.substring(0,bracket_index-prefix.length) + new_prefix + css.substring(bracket_index);
		}
		index = css.indexOf('}',bracket_index) +1;
		if (index == 0) break;
	}
	if (css.indexOf("{") == -1 && css.indexOf("}") == -1)
		css = "#this {" + css + "}";
	return css;
}
function aa_setCssText(elem,cssText)
{
  if (ajaxart.isFireFox) cssText = cssText.replace(/-webkit-/g,'-moz-');
  elem.style.cssText = cssText;
}
function aa_in_textlist(list,item)
{
  if (list.indexOf(','+item+',') == -1) return false;
  return true;
}
function aa_add_onorientationchange(func)
{
	if (!window.aav_onorientationchange) window.aav_onorientationchange = [];
	aav_onorientationchange.push(func);
}
function aa_init_ipad(options)
{
  if (!options) options = { orientationClasses: true };
  var setOrientationClass = function() {
	  var orientation = (window.orientation == 0 || window.orientation == 180) ? "portrait" : "landscape";
	  document.body.parentNode.setAttribute('class', orientation);  
	  
	  if (ajaxart.jbart_studio) {  // design time mode
		  orientation = aa_url_attribute(window.location.href,"ipad_orient");
		  if (orientation != "portrait") orientation = "landscape";
		  jQuery('body').removeClass('portrait').removeClass('landscape').addClass(orientation);
	  } 
	  if (window.aav_onorientationchange) {
		  for(var i in window.aav_onorientationchange) window.aav_onorientationchange[i](orientation);
	  }
  }
  if (options.orientationClasses) {
	  window.onorientationchange = setOrientationClass;
	  setOrientationClass();
  }
}
function aa_addOnAttachMultiple(elem,func)
{
	jBart.bind(elem,'_OnAttach',func);
	aa_addOnAttach(elem,function() {
		jBart.trigger(elem,'_OnAttach');
	});
}
function aa_addOnAttach(elem,func)
{
	$(elem).addClass('aa_onattach');
	elem.jbOnAttach = func;
	if (ajaxart.isattached(elem)) elem.jbOnAttach();
}
function aa_defineElemProperties(elem,properties)
{
	if (!elem.jBartDomProps) elem.jBartDomProps = properties.split(',');
	else ajaxart.concat(elem.jBartDomProps,properties.split(','));
}
function aa_clear_events(elem)
{
	jQuery(elem).unbind();
	
    if (elem.jbEvents && elem.detachEvent) {
    	for(var i=0;i<elem.jbEvents.length;i++) {
    		elem.detachEvent(elem.jbEvents[i].event,elem.jbEvents[i].callback);
    	}
    }
    for (var i in elem) {
    	if (i.indexOf('on') == 0) elem[i] = null;
    	if (elem['on'+i]) elem['on'+i] = null;
  	}
    
}
function aa_remove(elem,cleanMemoryLeaks)
{
	if (!elem) return;
	if (elem.parentNode) elem.parentNode.removeChild(elem);
	if (window.jBartNodeJS) return;
	aa_element_detached(elem);

	if (cleanMemoryLeaks)
	  jQuery(elem).remove(); // jQuery events leak in chrome as well

	if (cleanMemoryLeaks && ajaxart.isIE)  // http://msdn.microsoft.com/en-us/library/Bb250448 
	{
		function doCleanMemoryLeaks(elem) {
			if (elem.nodeType != 1) return;
		    if (elem.jbEvents && elem.detachEvent) {
		    	for(var i=0;i<elem.jbEvents.length;i++) {
		    		elem.detachEvent(elem.jbEvents[i].event,elem.jbEvents[i].callback);
		    	}
		    }
		    for (var i in elem) {
		  	  if (i.indexOf('on') == 0 || i.indexOf('jb') == 0) elem[i] = null;
	    	  if (elem['on'+i]) elem['on'+i] = null;
		  	}
		    if (elem.jBartDomProps) {
		    	for(var i=0;i<elem.jBartDomProps.length;i++) {
		    	  // if (elem.jBartDomProps[i] != 'jBartDomProps')
		    	  //   elem[elem.jBartDomProps[i]] = null; 
		    	}
		    	elem.jBartDomProps = null;
		    }
		    
		    elem.ajaxart = elem.Cntr = elem.Data = elem.ItemData = elem.Dialog = elem.jElem = elem.Field = elem.OnDetach = elem.Contents = null;
		    elem.FieldData = elem.contentChanged = elem.CellPresentation = elem.Context = elem.jBart = null;
		    
		    var cleanAllProps = false;
	  	    if (cleanAllProps) {
	  	    	for(var i in elem) {
		  		  try {
		  			if (elem[i]) {
		  				elem[i] = null;
		  			    ajaxart.log('memomry leak - ' + i,'error');
		  			}
		  		  } catch(e) {}
	  	    	}
		  	}
	  	    try {
		      // for (var i in elem) if (elem[i]) ajaxart.log('dom element property - ' + i,"error"); 
	  	    } catch(e) {}
	  	    
		    var child = elem.firstChild;
		    while(child) {
		    	doCleanMemoryLeaks(child);
		    	child = child.nextSibling;
		    }
		}
		doCleanMemoryLeaks(elem);
		
		var tag = aa_tag(elem) && aa_tag(elem).toLowerCase();
		try {
			if (tag != 'table' && tag != 'tfoot' && tag != 'thead' && tag != 'tr')	// http://support.microsoft.com/kb/239832
				elem.innerHTML = "";
		} catch(e) {}
	}
//	if (cleanMemoryLeaks && ajaxart.isIE)  { 
//	}
}
jBart.remove = function(elem) { aa_remove(elem,true); }
function aa_remove_from_list(list,item)
{
	for(var i in list)
		if (list[i] == item) {
			list.splice(i,1);
			return;
		}
}
function aa_renderStyleObject2(style,apiObject,field_data,field,context,settings) {
	try {
		apiObject.field = field;
		apiObject.field_data = field_data;
		apiObject.context = context;

		apiObject.params = style.params;
		if (field) aa_trigger(field,'initApiObject',{ apiObject: apiObject, field_data: field_data });

		if (style.Field) {  // style by field
			var wrapper = document.createElement('div');
			var ctx = aa_ctx(context,{ ApiObject: [apiObject] });
			var styleField = style.Field(field_data,ctx); 
			aa_fieldControl({ Field: styleField, Item: field_data, Wrapper: wrapper, Context: ctx });
			var content = $('<div style="display:inline-block;" class="aa_style_by_field_wrapper" />').append(wrapper);
			apiObject.control = apiObject.el = content[0];
			apiObject.$el = $(apiObject.el);
			apiObject.wrapperForStyleByField = wrapper;
			content[0].jbApiObject = apiObject;
			return content[0];
		}

		if (style.render) { 
			var out = style.render(apiObject,settings); 
			out.jbApiObject = apiObject;
			return out;
		}
		style.Html = style.Html.replace(/>\s+</g,'><');		// allow indentation in html without injecting whitespaces. e.g: <div class="text"/> <div class="separator" /> 
		var out = $(style.Html)[0] || $('<div/>')[0];
		apiObject.elem_class = aa_attach_global_css(style.Css,null,null,false,false,context,settings); 
		apiObject.el = out;
		apiObject.$el = $(out);

		$(out).addClass(apiObject.elem_class); 
		aa_apply_style_js(apiObject,style,context);
		
		return out;
	} catch(e) {
		ajaxart.logException('error rendering style object',e);
		return $('<div/>').get();		
	}	
}

function aa_renderStyleObject(style,objectProperties,context,objectIsNotTheElement,settings)
{
	try {
		if (style.Field) {  // style by field
			var object = aa_api_object(jQuery('<div/>')[0],objectProperties,objectIsNotTheElement);
			var item = objectProperties.data ? [objectProperties.data] : [];
			var wrapper = document.createElement('div');
			var ctx = aa_ctx(context,{ ApiObject: [object] });
			var styleField = style.Field(item,ctx); 
			aa_fieldControl({ Field: styleField, Item: item, Wrapper: wrapper, Context: ctx });
			var content = jQuery('<div style="display:inline-block;" class="aa_style_by_field_wrapper" />').append(wrapper);
			object.control = content[0];
			object.wrapperForStyleByField = wrapper;
			content[0].jbApiObject = object;
			return content[0];
		}
		style.Html = style.Html.replace(/>\s+</g,'><');		// allow indentation in html without injecting whitespaces. e.g: <div class="text"/> <div class="separator" /> 
		var jElem = jQuery(style.Html);
		if (!jElem[0]) jElem = jQuery('<div/>');
		objectProperties.context = context;
		if (style.params)
			objectProperties.params = style.params;
		var object = aa_api_object(jElem,objectProperties,objectIsNotTheElement);
		var cntr = context.vars._Cntr ? context.vars._Cntr[0] : null;
		object.elem_class = aa_attach_global_css(style.Css,cntr,null,false,false,context,settings); 
		jElem.addClass(object.elem_class); 
		aa_apply_style_js(object,style,context);
		
		return jElem[0];
	} catch(e) {
		ajaxart.logException('error rendering style object',e);
		return jQuery('<div/>').get();
	}
}

function aa_apply_style_js(obj,style,context,funcName)
{
	funcName = funcName || 'render';
	aa_style_context = { jElem: obj.jElem }
	if (!style.jsFunc && style.Javascript ) {
		jBart.compiledJS = jBart.compiledJS || {};
		var compiledJs = jBart.compiledJS[style.Javascript];
		if (!compiledJs) {
			compiledJs = {};
			try {
				if (style.Javascript.indexOf('function ' + funcName + '(') > -1) {
					eval('compiledJs.jsFunc = function(obj,context,funcToRun) { ' + style.Javascript + '\n return ' + funcName + '(obj,context); };');
				} else { // backward compatability
			  		eval('compiledJs.jsFunc = ' + style.Javascript);
			  	}
			} catch(e) {
				ajaxart.logException(e,'could not compile a js function ' + style.Javascript);
				if (jBart.onJsError)
					jBart.onJsError(e, style.Javascript);
			}
			jBart.compiledJS[style.Javascript] = compiledJs;
		}
		style.jsFunc = compiledJs.jsFunc;
	}
	try {
		if (style.jsFunc) return style.jsFunc(obj,context);
	} catch(e) {
		ajaxart.logException(e,'error running js code :' + style.Javascript);
		if (jBart.onJsError)
			jBart.onJsError(e, style.Javascript);
	}
}
function aa_find_class(jElem,cls)
{
	if (jElem.hasClass(cls)) return jElem;
	return jElem.find('.'+cls);
}
function aa_init_image_object(image,data,context)
{
	if (typeof(image) == 'string') return {StaticUrl: image, Size: ''};
	if (!image || !image.Url) return;
	image.StaticUrl = aa_totext(image.Url(data,context));
	return image;
}
function aa_set_image(elem,image,deleteWhenEmpty,size)
{
	if (!image) {
		if (deleteWhenEmpty) aa_remove(elem,true); 
		return; 
	}
	if (image && image.InCssClass) {
		jQuery(elem).css('display','block').addClass(image.CssClass);
		return;
	}
	if (image && (image.inSprite || image.asDivBackground) ) {
		var css = '#this { background:'+'url('+image.StaticUrl+') '+image.x+' ' + image.y + ' no-repeat; ';
		css += 'width: ' + image.width + '; height: ' + image.height + '; display:block; } ';
		
		if (image.hoverx) css += '#this:hover { background-position: ' + image.hoverx + ' ' + image.hovery + ' } ';
		if (image.activex) css += '#this:active { background-position: ' + image.activex + ' ' + image.activey + ' } ';
		jQuery(elem).addClass(aa_attach_global_css(css));
		return;
	}
	if (elem && elem.firstChild && elem.firstChild.tagName && elem.firstChild.tagName.toLowerCase() == 'img')
		return aa_set_image(elem.firstChild,image,true,size);
	if (elem && elem.tagName.toLowerCase() != 'img') {
		var imgElem = document.createElement('img');
		elem.appendChild(imgElem);
		var size2 = size || image.Size;
		if (size2) {
			size2 = size2.replace(/px/g,'');	// removing px for 
			var imageSize = size2.split(',');
			if (imageSize.length == 1) imageSize.push('0');
			for(var i in imageSize) if (imageSize[i] == '') imageSize[i] = '0';
			if (imageSize[0] != '0') elem.style.width = imageSize[0]+'px';
			if (imageSize[1] != '0') elem.style.height = imageSize[1]+'px';
		}
		return aa_set_image(imgElem,image,true,size);
	}
	if (typeof(image) == 'string') image = {StaticUrl: image, Size: ''};
	
	var src = image.StaticUrl || '';
	if (src == "") src = image.SecondUrl;
	if (src == "") {
		if (deleteWhenEmpty) aa_remove(elem,true);
		return;
	}
	elem.setAttribute('src',src);
	
	var size2 = size || image.Size;
	if (size2 == "") return;
	
	var imageSize = size2.split(',');
	if (imageSize.length == 1) imageSize.push('0');
	for(var i in imageSize) if (imageSize[i] == '') imageSize[i] = '0';
	
	aa_defineElemProperties(elem,'ImageWidth,ImageHeight');
	
	elem.ImageWidth = parseInt(imageSize[0].split('px')[0]); 
	elem.ImageHeight = parseInt(imageSize[1].split('px')[0]);
	if (elem.ImageWidth > 0) elem.width = elem.ImageWidth;
	if (elem.ImageHeight > 0) elem.height = elem.ImageHeight;
	if (elem.ImageWidth * elem.ImageHeight == 0) return;
	
	function FixImageSize(imgObj) 
	{
		var naturalWidth = imgObj.width,naturalHeight = imgObj.height;
		if (naturalWidth < elem.ImageWidth) elem.width = naturalWidth; 
		if (naturalHeight < elem.ImageHeight) elem.height = naturalHeight;
		var width = Math.min(naturalWidth,elem.ImageWidth), height = Math.min(naturalHeight,elem.ImageHeight); // IE hates img.width
		
		if (image.KeepImageProportions) {
			var ratio = naturalWidth / naturalHeight;
			var currRatio = width / height;
			if (ratio != currRatio) {
				if (naturalWidth >= naturalHeight * currRatio) {
					elem.width = elem.ImageWidth;
					elem.height = Math.floor(width / ratio);
				} else {
					elem.height = elem.ImageHeight;
					elem.width = Math.floor(height * ratio);
				}
			}
		}
	}
	  
	var imgObj = new Image(); imgObj.src = src;
	if (imgObj.complete) 
		FixImageSize(imgObj);
	else 
		elem.onload = function() { FixImageSize(imgObj);}
}
function aa_runActionOnClick(callback_func) {
  return function(e) {
	  var inner = jQuery(this)[0];
	  if (window.aa_incapture) return false;
	  if (inner.jbLastTimeClicked) {
		  if (new Date().getTime() - inner.jbLastTimeClicked < 300) return false; // double click
	  } 
	  inner.jbLastTimeClicked = new Date().getTime();
	  callback_func.call(inner,{event: e}); return false;
  }
}
function aa_api_object(jElem,props,objectIsNotTheElement)
{
	jElem = jQuery(jElem);
	if (objectIsNotTheElement) 
		var out = props;
	else {
		out = jElem[0];
		for(i in props) out[i] = props[i];
	}
	out.jElem = out.$el = jElem;
	out.control = out.el = jElem[0];
	jElem[0].jbApiObject = out;
	if (props)
	  if (props.context || props.Context) jElem[0].jbContext = props.context || props.Context;
	
	var props_str = 'jElem,getInnerElement,setInnerHTML,setImageSource,setImage,setOnClick,bind,trigger,control';
	for(var i in props) props_str += (','+i);
	if (!objectIsNotTheElement) aa_defineElemProperties(out,props_str); // for memory leaks
	
	out.bind = function(eventType,func) {
		this.jbListeners = this.jbListeners || [];
		this.jbListeners.push( { eventType: eventType, callback: func });
	}
	out.trigger = function(eventType,argsObject) {
		if (!this.jbListeners) return;
		for(var i=0;i<this.jbListeners.length;i++) {
			if (this.jbListeners[i].eventType == eventType)
				this.jbListeners[i].callback(argsObject);
		}
	}
	out.getInnerElement = function(classOrElement)
	{
		if (typeof(classOrElement) == 'string') {  // it is a class
			if (classOrElement == '') return this.jElem[0];
			if (classOrElement.indexOf('.') == 0)
			  return aa_find_class(this.jElem,classOrElement.substring(1))[0];
			return null;
		}
		return classOrElement || this;
	}
	out.setInnerHTML = function(classOrElement,text)
	{
		var inner = this.getInnerElement(classOrElement);
		if (inner) inner.innerHTML = text;
	}
	out.setImage = out.setImageSource = function(classOrElement,imageObject,deleteIfNoImage)
	{
		var inner = this.getInnerElement(classOrElement);
		if (inner) aa_set_image(inner,imageObject,deleteIfNoImage);
	}
	out.setOnClick = function(classOrElement,callback_func,jbart_click_behavior)
	{
		var inner = this.getInnerElement(classOrElement);
		if (!inner || !callback_func) return;
		inner.jbart_click_behavior = jbart_click_behavior;
		if (!jbart_click_behavior ) {
		  inner.onclick = function(e) {
			  if (window.aa_incapture) return false;
			  if (inner.jbLastTimeClicked) {
				  if (new Date().getTime() - inner.jbLastTimeClicked < 300) return false; // double click
			  } 
			  inner.jbLastTimeClicked = new Date().getTime();
			  callback_func.call(out,{event: e}); return false; 
		  }
		}
		else {
			// jbart click behavior
			var mouseHandlers = function(btn) { 
				  jQuery(btn).mousedown( function() {
					  var jbtn = jQuery(btn);
					  if (jbtn.attr('pressed_src') != "")
					  {
						  jbtn.attr('src',jbtn.attr('pressed_src'));
					  	  jbtn.addClass('pressed').addClass('pressing');
					  }
				  }).mouseout( function() {
					  var jbtn = jQuery(btn);
					  jbtn.removeClass('pressed');
					  jbtn.attr('src',jbtn.attr('original_src'));
				  }).mouseover( function() {
					  var jbtn = jQuery(btn);
					  if (jbtn.hasClass('pressing')) {
					    jbtn.addClass('pressed').removeClass('pressing');
						jbtn.attr('src',jbtn.attr('pressed_src'));
					  }
				  }).keydown( function(e) {
						e = e || event;
						if (e.keyCode == 13) // enter
						{
							ajaxart_stop_event_propogation(e);
							click(btn);
							return false;
						}
				  }).mouseup( function(e) {
					  var jbtn = jQuery(btn);
					  if (jbtn.hasClass('pressed') && !window.aa_incapture) callback_func();
				  });
			};
			mouseHandlers(inner);
		}
	}
	return out;
}
//whenever an html content changes, one needs to call aa_htmlContentChanged
//It will fix dialog sizes , special scrollbars (iscroll , tuiny scrollbar, etc.)
//To do something when the html content changes, one can define contentChanged method for an html element
function aa_htmlContentChanged(elem)
{
	while (elem != null) {
		if (elem.contentChanged) elem.contentChanged();
		elem = elem.parentNode;
	}
}
function aa_jbart_image(image,context)
{
   var base = (context.vars._Images && context.vars._Images[0]) || '';
   return base + image;
}
if (! window.aa_base_images)
aa_base_images = function()
{
	if (window.location.href.indexOf('http://localhost/ajaxart') == 0 || window.location.href.indexOf('https://localhost/ajaxart') == 0  || window.location.href.indexOf('http://localhost:8087/ajaxart') == 0)
		return 'images';
	return ajaxart.base_images || '';
};

if (! window.aa_base_lib)
aa_base_lib = function()
{
	if (window.location.href.indexOf('http://localhost/ajaxart') == 0 || window.location.href.indexOf('https://localhost/ajaxart') == 0 || window.location.href.indexOf('http://localhost:8087/ajaxart') == 0)
		return '/ajaxart/lib';
	return ajaxart.base_lib || '';
};

function aa_crossdomain_call(params, use_jsonp)
{
	if (!use_jsonp) {
		params.type = params.type || 'GET';
		var request = ajaxart.isIE ? new window.XDomainRequest() : new XMLHttpRequest();
        function handler(evtXHR) {
		    var request = this;
			if (request.readyState == 4 && params.success) 
				params.success(request.responseText,request.status);
		}
		if (jQuery.browser.msie) {
			request.open(params.type, params.url);
			request.onload = function(evtXHR) {
				if (this.responseText && params.success)
					params.success(this.responseText);
				if (!this.responseText && params.error)
					params.error();
			}
		} else {
			request.open(params.type, params.url, true);
			request.onreadystatechange = handler;
		}
		if (request.setRequestHeader)	// IE9 doesn't support this method
			request.setRequestHeader('Content-Type',params.dataType || 'text/plain; charset=utf-8');
		if (params.type == 'POST')
			request.send(params.data);
		else
			request.send();
	  ajaxart.log("calling crossdomain, type:" + params.type + ", \nurl:" + params.url + ",\ndata:" + params.data, "http");
	}
	else {
	  if (!ajaxart.jSonRequests) ajaxart.jSonRequests = {}
	  if (!ajaxart.jsonReqCounter) ajaxart.jsonReqCounter = 0;
	  window.aa_jsonp_callback = function(server_content,id,url)
	  {
	  	 if (ajaxart && ajaxart.jSonRequests[id]) {
	  		  ajaxart.jSonRequests[id].success(server_content);
	  		ajaxart.jSonRequests[id] = null;
	  	 }
	  }
	  ajaxart.jsonReqCounter = (ajaxart.jsonReqCounter + 1) % 1000;
	  ajaxart.jSonRequests[ajaxart.jsonReqCounter] = params; 
	  var url = params.url + '&aa_req_id=' + ajaxart.jsonReqCounter;
	  if (params.type == "POST" && params.data)
		  url = url + "&aa_postdata=" + encodeURIComponent(params.data);
	  jQuery.ajax( { cache: false ,dataType: 'script', httpHeaders : [], url: url, 
	  	error: function(jqXHR, textStatus, errorThrown) {
	  		params.error(textStatus + " " + errorThrown);
	  	} });
	}
}
jBart.aa_crossdomain_call = aa_crossdomain_call;	// to be able to access it from outside

function aa_getWidgetIDFromContext(context)
{
	if (context.vars.WidgetId) return aa_totext(context.vars.WidgetId);
	
	var elem = context.vars._AppContext[0].AppXtml;
	while (elem && elem.tagName != 'bart_sample' && elem.tagName != 'jbart_project')
		elem = elem.parentNode;
	if (elem) return elem.getAttribute('id') || '';
	return '';
}

jBart.utils.removeFromArray = function(array,object)
{
	for(var i=0;i<array.length;i++)
		if (array[i] == object) {
			array.splice(i,1);
			return;
		}
}
jBart.utils.refresh = function(element)
{
	while (element.ReplacedBy) element = element.ReplacedBy;
	
	var ctx = element.ajaxart;
	if (typeof(ctx) == "undefined" || ctx == null) return;

	var newData = ctx.data;
	if (ctx.origData != null) newData = ctx.origData;
	
	var newControl = aa_first(newData,ctx.script,"",ctx.params);
	if (newControl == "") newControl = document.createElement('div');
	aa_defineElemProperties(element,'ReplacedBy');
	element.ReplacedBy = newControl;
	
	aa_replaceElement(element,newControl,true);
	
	return newControl;
}
function aa_trigger(object,eventType,eventObject) {
	if (!object || !object.jbListeners || !object.jbListeners[eventType]) return;
	eventObject = eventObject || {};
	eventObject.eventType = eventType;
	
	var listeners = object.jbListeners[eventType];
	for(var i=0;i<listeners.length;i++) {
		try {
			listeners[i].handler.apply(object,[eventObject]);
		} catch(e) {
			ajaxart.logException(e,'error trigerring event ' + eventType);
		}
	}	
}
function aa_bind(object,eventType,handler,identifier,elementForAutoUnbind,addAsFirstListener) {
	if (!object) return;
	object.jbListeners = object.jbListeners || {};
	object.jbListeners.counter = object.jbListeners.counter || 0;
	var listenerID = ++object.jbListeners.counter;

	object.jbListeners[eventType] = object.jbListeners[eventType] || [];
	var listeners = object.jbListeners[eventType];

	for(var i=0;i<listeners.length;i++) {
		if (identifier && listeners[i].eventType == eventType && listeners[i].identifier == identifier) {
			listeners[i].handler = handler;
			return;
		}
  }
  var item = {eventType: eventType, handler: handler, identifier: identifier, listenerID: listenerID };
	if (addAsFirstListener)
		listeners.unshift(item);
	else
		listeners.push(item);	

	if (elementForAutoUnbind) {
		aa_addOnDetach(elementForAutoUnbind,function() { 
			aa_unbind(object,listenerID);
		});
	}

	return listenerID;
}

function aa_unbind(object,listenerID) {
	if (!object || !object.jbListeners) return;

	for(var i in object.jbListeners) {
		var listeners = object.jbListeners[i];
		if (!listeners.length) continue;

		for(var j=0;j<listeners.length;j++) {
			if (listeners[j].listenerID == listenerID) {
				listeners.splice(j,1);
				return;
			}
		}	
	}
}
function aa_async_trigger(object,eventType,eventObject) {
	var asyncDeferred = $.Deferred();

	if (!object || !object.jbListeners || !object.jbListeners[eventType]) return;
	eventObject = eventObject || {};
	eventObject.eventType = eventType;
	
	var listeners = object.jbListeners[eventType];
	var i=0;
	doNext();

	return asyncDeferred.promise();

	function doNext() {
		if (i>=listeners.length)
			return asyncDeferred.resolve();

		try {
			var promise = listeners[i].handler.apply(object,[eventObject]);
		} catch(e) {
			ajaxart.logException(e,'error trigerring event ' + eventType);
			var promise = null;			
		}
		$.when(promise).then(function() {
			i++;
			doNext();
		});
	}
	
}


jBart.trigger = aa_trigger;
jBart.bind = aa_bind;

jBart.activator = function(widgetSource) {
	jBart.xml2text = ajaxart.xml2text; // for F12
	// https://docs.google.com/a/artwaresoft.com/document/d/1SBPGSmYhLuwhxH9H7LtdOKsQ5VN4SdcqBMl1V3G6Kmc/edit#heading=h.k74m6lqj4kpw
	return {
		show: function(div,params) {
			div = jQuery(div)[0];
			var jbartObject = this;
			if (!params) params = {};
			if (!params.widget_src)
				params.widget_src = widgetSource;
			jBart.appendWidget(div,params,jbartObject);				
			jbartObject._initialized = true;
		},
		init: function(settings) {
			var jbartObject = this;
			settings = settings || {};
			aa_jbart_init_activator(jbartObject,settings);
		},
		showPage: function(div,settings) {
			// must be called after init
			div = jQuery(div)[0];
			if (!this.isInitialized()) return;
			aa_jbart_activator_showPage(this,div,settings);			
		},
		isInitialized: function() { 
			return !!this.Context;
		},
		jBart: jBart,
		_widgetSource: widgetSource
	}
} 
jBart.parsexml = function(contents,baseXml) { return aa_parsexml(contents,'','',false,baseXml); }

// settings include: 
// url 
// variableToFind - look for a variable under window
// isLoaded (optional) - a callback function which returns true when the js is loaded
// loadFunction (optional) - allows a different loading js rather than aa_load_js_css(url)
// success, error - callback functions
function aa_loadJsFile(settings) {
	settings.success = settings.success || function() {}
	if (!settings.isLoaded ) {
		settings.isLoaded = function() {
			if (!settings.variableToFind) return true;
			if (window[settings.variableToFind]) return true;
			return false;
		}
	}
	function checkLoaded() {
		try {
			if (settings.isLoaded()) return true;
		} catch(e) {}
		return false;
	}

	var availableTries = 20;
	var firstTime = true;
	checkWithTimeout();
	
	function checkWithTimeout()
	{
		if (checkLoaded()) return settings.success();
		if (firstTime) {
			if (settings.loadFunction) settings.loadFunction(settings.url);
			else aa_load_js_css(settings.url, 'js');
		}
		firstTime = false;
		
		if (--availableTries <=0 ) {
			settings.error = settings.error || function() {}
			return settings.error();
		}
		setTimeout(checkWithTimeout,500);
	}
}

function aa_create_jbart_context(settings) {
	var widgetXml = settings.WidgetXml;
	var context = settings.Context || ajaxart.newContext();
	var uiprefObj = uipref_in_cookies();
	
	var widgetId = widgetXml.getAttribute('id') || 'gdrive';
	var appXtml = aa_xpath(widgetXml,"bart_dev/db/bart_unit/bart_unit/Component[@id='App']/xtml")[0];
	if (!appXtml) appXtml = aa_xpath(widgetXml,"xtml/Component[@id='Widget']/xtml")[0];

	var language = settings.Language || aa_totext( aa_xpath(appXtml,"Language/@Language") ); 
	var globalVars = {};
	
	var resources = widgetDataResources();
	
	var bctx = {
	  AppXtml: appXtml,
	  Resources: resources,
	  Url: ajaxart.runComponent('bart_url.BrowserUrl',[],context)[0],
	  ValidationStyle: ajaxart.runComponent('validation.DefaultOld',[],context)[0]
	};

	if (settings.jbartObject) settings.jbartObject._AppContext = bctx;	

	var ctx = aa_ctx(context, { 
		_GlobalVars: [globalVars], _UIPref: [uiprefObj], Language: [language] , 
		_AppContext: [bctx], _WidgetXml: [widgetXml]
	});
	bctx.context = ctx;

	loadSampleComponents();		
	runAppFeatures();
	resourcesToGlobalVars();
	setOldPages();
	AppFeatures_Load();
	overrideUIPrefs();

	return ctx;

  function loadSampleComponents() {
  		ajaxart.componentsXtmlCache.sample = null;
    	
    	var namespaces = aa_xpath(widgetXml,"xtml");
    	var unit = aa_xpath(widgetXml,"bart_dev/db/bart_unit/bart_unit")[0];
    	if (unit) namespaces.push(unit);

    	for(var j=0;j<namespaces.length;j++) {
    		var ns = namespaces[j].getAttribute('ns') || 'sample';
	    	ajaxart.components[ns] = ajaxart.components[ns] || {};

    		var comps = aa_xpath(namespaces[j],'Component');
	    	for(var i=0;i<comps.length;i++) {
	    		  var id = comps[i].getAttribute("id");
	  	      ajaxart.components[ns][id] = comps[i];
	  	      ajaxart.componentsXtmlCache[ns+'.'+id] = null;
	  	      if (comps[i].getAttribute('execution') == 'native') {
	  	      	var code = aa_cdata_value(aa_xpath(comps[i],'Code')[0]);
	  	      	if (code) {
	  	      		ajaxart.gcs[ns] = ajaxart.gcs[ns] || {};
	  	      		eval('ajaxart.gcs[ns][id] = ' + code);
	  	      	}
	  	      }
	    	}
	    	
    		var types = aa_xpath(namespaces[j],'Type');
	    	for(var i=0;i<types.length;i++) {
    			ajaxart.types[ns + "_" + types[i].getAttribute('id')] = types[i];
    		}

    	}

  }
	function runAppFeatures() {
		bctx.Features = [];
		var featuresXtml = aa_xpath(appXtml,'ApplicationFeature');
		for(var i=0;i<featuresXtml.length;i++) {
			try {
			  ajaxart.concat(bctx.Features, ajaxart.run([],featuresXtml[i],'',ctx));
			} catch(e) {}
		}
	}
		
	function resourcesToGlobalVars()
	{
		window.jbDebugResource = globalVars;
		
		var resources = bctx.Resources;
		for(var i=0;i<resources.length;i++) {
			var init = function(resource) {
				var id = aa_totext(resource.ID);
				globalVars[id] = function() { return resource.Items; }
			}
			init(resources[i]);
		}

	}
	
	function setOldPages() {
		bctx.Pages = [];
		var pagesXtml = aa_xpath(appXtml,'Pages/Page');
		for(var i=0;i<pagesXtml.length;i++) 
			ajaxart.concat(bctx.Pages, ajaxart.run([],pagesXtml[i],'',ctx));
	}

	function AppFeatures_Load() {
		for(var i=0;i<bctx.Features.length;i++) {
			var feature = bctx.Features[i];
			try {
			  if (feature.Load) feature.Load([],ctx);
			} catch(e) {
				ajaxart.logException(e,'Loaing App Features Failure');
			}
		}
	}
	
	function overrideUIPrefs() {
		var uiPrefs = aa_xpath(widgetXml,'bart_dev/db/bart_unit/bart_unit/UIPref/*');
		for(var i=0;i<uiPrefs.length;i++) {
			var elem = uiPrefs[i];
			var prefix = elem.tagName;
			var attributes = elem.attributes;
			for(var j=0;j<attributes.length;j++) {
				var name = attributes.item(j).name;
				var value = elem.getAttribute(name);
				uiprefObj.SetProperty([],aa_ctx({ Prefix: [prefix], Property: [name], Value: [value] }));
			}
		}
	}
	function widgetDataResources() {
		var resources = [];
		var resourcesXtml = aa_xpath(appXtml,'Resources/Resource');
		if (!resourcesXtml.length) resourcesXtml = aa_xpath(appXtml,'DataResource');

		for(var i=0;i<resourcesXtml.length;i++) {
			var resourceXtml = resourcesXtml[i];
		    var resourceID = resourceXtml.getAttribute('ResourceID');
			var t = resourceXtml.getAttribute('t');
			var shortWidgetId = aa_array_lastItem(widgetId.split('/'));		    
			var varName = 'jBartWidget_' + shortWidgetId + '_' + resourceID;

			var resource = aa_first([],resourceXtml,'',aa_ctx(context,{WidgetId: [widgetId]}));
			if (window[varName]) {
				if (resource && resource.LoadFromValue && window[varName][0]) {
					resource.LoadFromValue(window[varName][0]);		// e.g. allow for xml cleaning
					resources.push( resource );
				} else {
					resources.push({ Id: resourceID, ID: [resourceID], Items: window[varName] });
				}
			} else {
				var resource = aa_first([],resourceXtml,'',aa_ctx(context,{WidgetId: [widgetId]}));
				if (resource) resources.push( resource );
				else ajaxart.log('could not create resource ' + resourceID,"error");
			}
		}
		return resources;
	}
	
	function uipref_in_cookies() {
		return {
		  GetProperty: function(data1,ctx) {
			var out = aa_valueFromCookie(aa_totext(ctx.vars.Prefix)+aa_totext(ctx.vars.Property));
			return out ? [out] : [];
		  },
		  SetProperty: function(data1,ctx) {
			aa_writeCookie(aa_totext(ctx.vars.Prefix)+aa_totext(ctx.vars.Property),aa_totext(ctx.vars.Value));
		  }
		}
	}
	
}

function aa_show_jbart_widget(settings)
{
	var ctx = aa_create_jbart_context(settings);
	if (settings.jbartObject) settings.jbartObject.Context = ctx;
	
	return aa_show_jbart_widget_page({
		Context: ctx,
		page: settings.Page,
		success: settings.success,
		ControlToShowInBartContext: settings.ControlToShowInBartContext,
		RunAfterControlWithTimer: settings.RunAfterControlWithTimer
	});
}

function aa_show_jbart_widget_page(settings)
{
	var ctx = settings.Context;
	var bctx = aa_var_first(ctx,'_AppContext');
	var pageID = settings.page;
	var appXtml = bctx.AppXtml;

	var out = document.createElement('div');
	jQuery(out).addClass('aa_widget jBartWidget');
	addWidgetCss();
	var widgetPage = showWidgetPage();
	out.appendChild(widgetPage);

	if (settings.RunAfterControlWithTimer) 
		setTimeout(runAfter,1); 
	else runAfter();
	
	if (settings.ControlToShowInBartContext) // for auto tests
		return settings.ControlToShowInBartContext([],ctx);
	
	aa_register_document_events(ctx);
  return out;

	function addWidgetCss()
	{
		var css = aa_totext(bctx.Css || []);
		if (css) 
			$(out).addClass(aa_attach_global_css(css));
	}
	function runAfter() {
		try {
			if (settings.success) settings.success([],ctx);
		} catch(e) {}
	}
	
	function showWidgetPage()
	{
	    var pageProfile = null;
	    if (pageID) {
	    	pageProfile = newPageByID(pageID);
	    	pageProfile = pageProfile || oldPageByID(pageID);
	    	if (!pageProfile) return $('<div/>').text('jbart page '+pageID+' not found')[0];
	    }
	    pageProfile = pageProfile || aa_xpath(appXtml,"MainPage1")[0];
	    if (!pageProfile && appXtml.getAttribute('MainPage')) {
	    	pageProfile = oldPageByID(appXtml.getAttribute('MainPage'));
	    }
	    pageProfile = pageProfile || newPageByID('main') || oldPageByID('main'); 
	    
	    var pageAsField = aa_first([],pageProfile,'',ctx);
	    if (pageAsField && pageAsField.Id) {
	    	var pageout = jQuery('<div/>')[0];
	    	aa_fieldControl({ Field: pageAsField, Wrapper: pageout, Item: [], Context: ctx });
	    	aa_trigger(bctx,'showPage',{ el: pageout });
	    	return pageout;
	    } else { // a page (e.g bart.SinglePage)
	    	var page = pageAsField;
	    	var pageout = page.Control([],aa_ctx(ctx,{_PageParams: [] }))[0];
	    	aa_trigger(bctx,'showPage',{ el: pageout });
	    	return pageout;
	    }
	}
  function newPageByID(pageID) {
    	return aa_xpath(appXtml, "../../Component[@id='"+pageID+"']/xtml")[0];
  }
  function oldPageByID(pageID) {
    	return aa_xpath(appXtml,"Pages/Page[@ID='"+pageID+"']")[0];		
  }
}
function aa_global_vars()
{
	window.jBartWidgets = window.jBartWidgets || { vars: {}};
	return jBartWidgets.vars;
}

function aa_loadRequiresJSFiles(settings) {
	/* Ensures some js files are loaded, and loads them if not loaded */
	var currentLoadIndex = -1;
	var timeOfAddingJsFile;

	settings.onload = settings.onload || function() {};
	settings.onerror = settings.onerror || function() {};
	
	step();

	function step() {
		currentLoadIndex++;
		if (currentLoadIndex >= settings.jsFiles.length) {
			settings.onload();
		} else {
			loadJsFile(settings.jsFiles[currentLoadIndex],step,settings.onerror);
		}
	}

	function loadJsFile(fileProperties,success,error) {
		if (checkJsVariable(fileProperties.jsVariable)) return success();

	    var fileref=document.createElement('script');
	    fileref.setAttribute("type","text/javascript")
	    fileref.setAttribute("src", fileProperties.url);
		document.body.appendChild(fileref);
		timeOfAddingJsFile = new Date().getTime();

		checkIfJsLoaded(fileProperties,success,error);
	}

	function checkIfJsLoaded(fileProperties,success,error) {
		if (checkJsVariable(fileProperties.jsVariable)) return success();
		if (new Date().getTime() - timeOfAddingJsFile > 15000) return error();

		setTimeout(function() { 
			checkIfJsLoaded(fileProperties,success,error);
		},400);
	}

	function checkJsVariable(jsVariable) {
		// support cases like: jQuery.fn.roundabout
		var parts = jsVariable.split(".");
		var current = window;
		for (i in parts) {
			current = current[ parts[i] ];
			if (!current) return false;
		}
		return true;
	}
}

function aa_hide(elem) {
	if (!jBart.classForHiddenAdded) {
		var css = '.aa_hidden_element { display: none !important; }';
		var styleElem = jQuery("<style></style>").text(css)[0];
		var head = document.getElementsByTagName("head")[0];
		head.appendChild(styleElem);
		jBart.classForHiddenAdded = true;
	}
	if (elem && elem.nodeType == 1)
	  jQuery(elem).addClass('aa_hidden_element');
}

function aa_show(elem) {
	if (elem && elem.nodeType == 1)
	  jQuery(elem).removeClass('aa_hidden_element');
}
function aa_refresh_widget_with_different_source(div, widget_as_str) {
	$(div).children().each(function() { aa_remove(this,true); });
	ajaxart.componentsXtmlCache = [];
	jBart.activator(widget_as_str).show(div);
}

function aa_bctx(context) {
	return context.vars._AppContext[0];
}

function aa_array_lastItem(arr) {
	if (arr.length) return arr[arr.length-1];
}

function aa_setDataResource(context,resourceID,newvalue) {
	if (!aa_isArray(newvalue)) newvalue = [newvalue];

	if (context.vars._AppContext) {
		var appContext = context.vars._AppContext[0];
		if (appContext.Vars && appContext.Vars[resourceID]) {
			appContext.Vars[resourceID] = function() { return newvalue; }
		}
		for(var i=0;i<appContext.Resources.length;i++)
			if (appContext.Resources[i].Id == resourceID) {
				appContext.Resources[i].Items = newvalue;
				if (appContext.Resources[i].Xml) appContext.Resources[i].Xml = newvalue[0];
			}
	}
	if (context.vars._GlobalVars && context.vars._GlobalVars[0][resourceID]) {
		context.vars._GlobalVars[0][resourceID] = function() { return newvalue; };
	}
}

function aa_errorLog(message) {
	if (window.console) {
		if (console.error) console.error(message);
		else console.log(message);
	}
}

function aa_consoleLog(message) {
	if (window.console && console.log) console.log(message);
}

function aa_path(object,path,value) {
  var cur = object;

  if (typeof value == 'undefined') {  // get
    for(var i=0;i<path.length;i++) {
      cur = cur[path[i]];
      if (cur == null || typeof cur == 'undefined') return null;
    }
    return cur;
  } else { // set
    for(var i=0;i<path.length;i++)
      if (i == path.length-1)
        cur[path[i]] = value;
      else
        cur = cur[path[i]] = cur[path[i]] || {};
    return value;
  }
}

/******************* Node JS *****************************/
function aa_runFromNodeJS(widgetXml,profileStr,data) {

	window.aa_hasAttribute = function(xml,attr) {
		console.log('mik mak');
		return xml.getAttribute(attr) != 'null';
	}

	var context = aa_create_jbart_context({
		WidgetXml: aa_parsexml(widgetXml),
		Language: '',
		jbartObject: {}
	});
	var input = data ? [data] : [];
	return aa_text(input,aa_parsexml(profileStr),'',context);
}

function aa_loadZippedXtml(zipped) {
	var zip  = new JSZip();
	zip.load(zipped, {base64:true});
	zip.file(/.*/).forEach(function(file) { 
		ajaxart.load_xtml_content('',aa_parsexml(file.asText()));
	});
}