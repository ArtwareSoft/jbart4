ajaxart.load_plugin("ui");
ajaxart.load_plugin("ui","plugins/ui/section.xtml");
ajaxart.load_plugin("ui","plugins/ui/fieldcontrols.xtml");
ajaxart.load_plugin("ui","plugins/ui/page.xtml");
ajaxart.load_plugin("cntr","plugins/ui/cntr.xtml");


aa_gcs("ui", {
	ControlUsage: function (profile,data,context)
	{
		window.aa_intest_topControl = null;
		aa_intest = true;
		try
		{
			ajaxart.run(data,profile,'RunBefore',context);
			var control = ajaxart.run(data,profile,'Control',context);
			if (control.length == 0) return ["no control"];	
			window.aa_intest_topControl = control[0];
		
			var newContext = aa_ctx(context,{ControlElement: control, TopControlForTest: control, TopControlElement: control, InTest: ['true']});

			if (context.vars._TestOutput) {
				if (context.vars._TestOutput[0].OutputControl) {
					context.vars._TestOutput[0].OutputControl[0].appendChild(control[0]);
					aa_fixTopDialogPosition();
				}
				else
					context.vars._TestOutput[0].OutputControl = control[0];
			}
			
			ajaxart.run(data,profile,'RunOnControl',newContext);
		
			if (aa_text(data,profile,'ResultType',context) == 'Data')
				var result = data;
			else 
				var result = newContext.vars.TopControlElement;
		
			var passed = aa_bool(result,profile,'ExpectedResult',newContext);
			ajaxart.run(data,profile,'CleanAfter',newContext);
			window.aa_intest_topControl = null;
		
		  if (openDialogs.length > 0) { // close dialogs
		      var dlg = openDialogs[openDialogs.length-1];
		      if ( ! jQuery(dlg.dialogContent).hasClass('aaeditor') )
		        aa_remove(ajaxart.dialog.closeDialog(dlg),true);
		  }
		  aa_closePopupsInTest();
	}
	catch (e) { 
		aa_intest = false; 
		ajaxart.logException(e); 
	}
	aa_intest = false;
	if (passed == false)
		return result;//ajaxart.usage.resultAsText(result);
	return [];
  },
  ControlUsage_Result: function (profile,data,context)
  {
	  ajaxart.run(data,profile,'RunBefore',context);
	  return ajaxart.run(data,profile,'Control',context);
  },  
  ControlData: function (profile,data,context)
  {
	 var type = aa_text(data,profile,'Type',context);
	 var control = ajaxart.run(data,profile,'Control',context);
	 if (! ajaxart.ishtml(control)) return [];
	 
     var context1 = control[0]["ajaxart"];
     if (typeof(context1) == "undefined")
    	 return control[0].ItemData;
     if (type == "data") return context1.data;
     if (type == "original_data") {
    	 if (context1.origData == null) return context1.data;
    	 else return context1.origData;
     }
     if (type == "script") return [context1.script];
     if (type == "context") return [context1.params];
     if (type == "all")
     { 
   	    var out = { isObject: true };
  	    out.input = context1.data;
  	    if (context1.origData != null) out.input = context1.origData;
  	    out.script = context1.script;
  	    out.context = context1.params;
    	 
    	return [out];
     }
     return [];
  },
  ControlInObject: function (profile,data,context)
  {
	  var obj = aa_first(data,profile,'Object',context);
	  obj.ControlHolder = ajaxart.run(data,profile,'Control',context);
	  if (!obj.ControlHolder[0]) obj.ControlHolder = [ document.createElement('div') ];
	  obj.ControlHolder[0].ParentObject = [obj];
	  return obj.ControlHolder;
  },
  AttachGlobalCss: function(profile,data,context)
  {
	  return [ aa_attach_global_css(aa_text(data,profile,'Css',context),null,aa_text(data,profile,'Name',context) )];
  },
  UseDataBoundParams: function(profile,data,params)
  {
	  if (! ajaxart.ishtml(data)) return data;
	  for(var i=0;i<data.length;i++) {
		  var dataitem = data[i];
		  if (typeof(dataitem["ajaxart"]) != "undefined")
		  {
			  var controlParams = dataitem["ajaxart"].params;
			  ajaxart.setVariable(controlParams,"InputForChanges",dataitem["ajaxart"].data);
			  ajaxart.run([ dataitem ],profile,'Change',controlParams);
		  }
	  }
	  return data;
  },
  LoadCssFile: function(profile,data,context)
  {
      var url = aa_text(data,profile,'Url',context);
      var media = aa_text(data,profile,'Media',context);
	  
      if (url == "") return [];
      
      var fileref=document.createElement("link");
      fileref.setAttribute("rel", "stylesheet");
      fileref.setAttribute("type", "text/css");
      fileref.setAttribute("href", url);
      if (media)
        fileref.setAttribute("media", media);
      document.getElementsByTagName("head")[0].appendChild(fileref)
      
	  return ["true"];
  },
  SetCssText: function(profile,data,params)
  {
 	 var style = aa_text(data,profile,'Style',params);
 	 if (style == "") return;
 	 ajaxart.each(data, function(item) {
 		 try {
 	 		 item.style.cssText = style;
 		 }
 		 catch (e) { ajaxart.log("failed to change css text: "+ style +" :" +e.message,"error"); }
 	 });
  },
  UrlParameter: function(profile,data,context)
  {
    var strParamName = aa_text(data,profile,'Param',context);
    return [ajaxart.urlparam(strParamName)];
  },
  CurrentUrlWithChangedParam: function(profile,data,context)
  {
	var param = aa_text(data,profile,'Param',context);
	var val = aa_text(data,profile,'Value',context);
	var strHref= aa_text(data,profile,'Url',context);
	
	var params = [];
    if (strHref.indexOf('#') > -1) strHref = strHref.substr(0,strHref.indexOf("#"));
	var baseUrl = strHref;
    if ( strHref.indexOf("?") > -1 ) {
      baseUrl = strHref.substr(0,strHref.indexOf("?"));
      var strQueryString = strHref.substr(strHref.indexOf("?")+1);
      var aQueryString = strQueryString.split("&");
      for ( var iParam = 0; iParam < aQueryString.length; iParam++ ){
        var aParam = aQueryString[iParam].split("=");
        if (aParam[0] != param)
          params.push( {name:aParam[0],value:aParam[1] } );
      }
    }
    params.push( {name:param,value:val } );
    var newUrl = baseUrl + "?";
    for (var i=0;i<params.length;i++)
    {
    	if (i > 0) newUrl += "&";
    	newUrl += params[i].name + "=" + params[i].value; 
    }
	return [newUrl];
  },
  SetCssProperty: function(profile,data,params)
  {
 	 var property = aa_text(data,profile,'Property',params);
 	 var value = aa_text(data,profile,'Value',params);
 	 if (property == "" || !ajaxart.ishtml(data[0]) ) return data;
 	 jQuery(data[0]).css(property,value);
 	 return data;
// 	 data[0].style[property] = value;
  },
  ExecJQuery: function(profile,data,params)
  {
		var expression = aa_text(data,profile,'Expression',params);
		var controls = data;
		if (controls.length == 0 || !ajaxart.ishtml(controls[0]))
			controls = ajaxart.getControlElement(params);

		ajaxart.each(controls, function(item) {
			if (!ajaxart.ishtml(item)) return;
			var exp = "jQuery(item)" + expression + ";";
			try {
				var $ = jQuery;
				eval(exp);
			}
			catch (e) { ajaxart.log("failed to run jQuery exp: "+ exp +" :" +e.message,"error"); }
		});
		return ["true"];
  },
  DayOfWeek: function(profile,data,context)
  {
	  var value = ajaxart.totext_array(data);
	  var d = jQuery.datepicker.parseDate("dd/mm/yy",value);
	  var weekday=new Array(7);
	  weekday[0]="Sunday";
	  weekday[1]="Monday";
	  weekday[2]="Tuesday";
	  weekday[3]="Wednesday";
	  weekday[4]="Thursday";
	  weekday[5]="Friday";
	  weekday[6]="Saturday";

	  var out = weekday[d.getDay()];
	  return [out];
  },
  TextboxValue: function(profile,data,context)
  {
	  var out= [];
		var elements = ajaxart.getControlElement(context);
		ajaxart.each(elements, function(element) {
			if (typeof(element.value) != "undefined")
				out.push("" + element.value);
		});
		return out;
  },
  DataFromJavaScript: function(profile,_data,context)
  {
		if (_data.length == 0) _data = [null];
		var expression = aa_text(_data,profile,'Expression',context);
		var _element = ajaxart.getControlElement(context);
		var element = null;
		if (_element.length>0) element = _element[0];
		var control = element;
		var data = _data[0];
		var result = null;
		try { var $ = jQuery; result = eval(expression); }
		catch(e) { 
			ajaxart.log("Failed to run JS expression:" + expression + ", " + e.message,"error"); 
		}
		if (typeof(result) == "number")
			return ["" + result];
		if (typeof(result) == "object" && !(ajaxart.isxml))//number in FF
			return ["" + result];
		if (result == null || typeof(result) == "undefined")
			return [];
		if (result["jquery"] != null) {
			return result.get();
		}
		return [result];
  },
  RunJavaScript: function(profile, data, params) {
  	var out = ajaxart.gcs.ui.DataFromJavaScript(profile, data, params);
  	return ['true'];
  },
  TextToHtml: function(profile, data, params) {
		if (ajaxart.ishtml(data[0])) return data[0];
		var text = ajaxart.totext(data[0]);
		if (text == "") return [];
		return [jQuery(text)[0]];
  },
  Switch: function (profile,data,params)
  {
	  return aa_switch(profile,data,params);
  },
  IsHtml: function (profile,data,context)
  {
	  if (ajaxart.ishtml(data)) return ["true"];
	  return [];
  },
  FirstSucceeding: function (profile,data,context)
  {
    var itemProfiles = ajaxart.subprofiles(profile,'Control');

    for(var i=0;i<itemProfiles.length;i++)
    {
    	var subresult = ajaxart.run(data,itemProfiles[i],"",context);
    	if (subresult.length > 0) 
    		return subresult;
    }
  	
  	return [];  	
  },
  OnKeyDown: function (profile,data,context)
  {
	  var control = context.vars.ControlElement[0];
	  control.onkeydown = function(e) {
		e = e || event;
        var newContext = ajaxart.clone_context(context);
    	ajaxart.ui.applyKeyboardEvent(e,newContext);
    	var elem = jQuery( (typeof(event)== 'undefined')? e.target : event.srcElement  );
    	if (elem[0] && elem[0].tagName.toLowerCase() == 'textarea')
    	  newContext.vars.EventTargetIsTextArea = ["true"];
    	else 
    	  newContext.vars.EventTargetIsTextArea = [];
    	
    	ajaxart.run(data,profile,'Action',newContext);
    	return true;
	  }
	  return ["true"];
  },
  BindEvent: function (profile,data,context)
  {
  	if (data.length == 0) return;
	var newData = ajaxart.getVariable(context,"InputForChanges");
	var element = data;
	ajaxart.databind(element,newData,context,null);

	  var event = aa_text(data,profile,'Event',context);
	  var action = function(e) {
    	if (typeof(ajaxart_captured_element) != "undefined" && ajaxart_captured_element.length > 0) return [];
        var element = data[0];
    	
        var newContext = ajaxart.clone_context(context);
        
        if (!aa_bool(data,profile,'KeepOriginalRunOnControl',newContext))
          ajaxart.setVariable(newContext,"ControlElement",data);
        
    	ajaxart.ui.applyKeyboardEvent(e,newContext);
        
	  	var input = []; 
	  	if ('ajaxart' in element)
	  	  input = element.ajaxart.data;
	  	
  		ajaxart.run(input,profile,'Action',newContext);
	  };
	  aa_bind_ui_event(data[0],event,action);
	  return ["true"];
  },
  StandardButton: function (profile,data,context)
  {
	  var buttonContext = context.vars.ButtonContext[0];

	  var text = ajaxart.totext_array(buttonContext.Text);
		  
	  var str = '<span class="button_wrapper" tabindex="1"><span class="button_outer">'
		   + '<span class="button_inner" >' + text + '</span></span><br/></span>';
	  var btn = $(str)[0];
	  $(btn).find('.button_outer').css('background','url('+aa_base_images()+'/css/button.png) no-repeat left top');
	  $(btn).find('.button_inner').css('background','url('+aa_base_images()+'/css/button.png) no-repeat right top');

	  ajaxart_disableSelection(btn);
	  ajaxart.databind([btn],data,context,profile);
	  
	  var click = function(btn)
	  {
		  var jbtn = jQuery(btn);
		  try {
		  if (ajaxart.isattached(btn))
			  btn.focus();
		  } catch(e) { }
		  var buttonContext = context.vars.ButtonContext[0];
    	  var newContext = aa_ctx(context,{ControlElement: [btn]} );
		  ajaxart.runScriptParam(data,buttonContext.OnClick,newContext);
		  jbtn.removeClass('pressed').removeClass('pressing');
	  }

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
	  }).mouseup( function() {
		  if (window.aa_incapture) return;
		  var jbtn = jQuery(btn);
		  if (jbtn.hasClass('pressed'))
			  click(btn);
	  });
	  };
	  
	  mouseHandlers(btn);
	  
	  return [btn];
  },
  SuggestionBox: function (profile,data,context)
  {
	  var out = document.createElement('input');
	  ajaxart.suggestbox.attachToTextbox(data,profile,context,out);
	  return [out]; 
  },
  CustomSuggestionBox: function (profile,data,context)
  {
	  var out = document.createElement('input');
	  ajaxart.customsuggestbox.attachToTextbox(data,profile,context,out);
	  return [out]; 
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
  UrlFragmentAttribute: function (profile,data,context)
  {
		var url = aa_text(data,profile,'Url',context);
		var attr = aa_text(data,profile,'Attribute',context);
		return [ aa_url_attribute(url,attr) ];
  },  
  RunInControlContext: function (profile,data,context)
  {
  	var elements = ajaxart.getVariable(context,"ControlElement");
  	var mode = aa_text(data,profile,'Mode',context);
  	var out = [];
  	ajaxart.each(elements,function(element) {
   	  var elem_context = element["ajaxart"];
	  if (elem_context == null) {
//		  ajaxart.log("RunInControlContext - control has no databind","warning")
		  return [];
	  }
	  var newContext = elem_context.params;
	  if (mode == 'copy control variables')
	  {
		  newContext = ajaxart.clone_context(context);
		  for(i in elem_context.params.vars)
			  newContext.vars[i] = elem_context.params.vars[i]; 
	  }
	  ajaxart.setVariable(newContext,"ControlElement",[element]);
	  ajaxart.concat(out,ajaxart.run(elem_context.data,profile,'Item',newContext));
 	});
  	return out;
  },
  DisableTextSelection: function(profile, data, context)
  {
	if (! ajaxart.ishtml(data)) return [];
	control = jQuery(data[0]);
	
	if( ajaxart.isFirefox ) { control.css({ 'MozUserSelect' : 'none' });
	} else if( ajaxart.isIE ) {
		control.each( function() { jQuery(this).bind('selectstart.disableTextSelect', function() { return false; }); });
	} else {
		control.each(function() { jQuery(this).bind('mousedown.disableTextSelect', function() { return false; }); });
	}
	return ["true"];
  },
  AddMousePressedEffect: function (profile,data,context)
  {
	  if (! ajaxart.ishtml(data) ) return data;
	  
	  var control = data[0];
	  jQuery(control).mousedown( function() {
		  if (jQuery(this).attr('pressed_src') != "")
			  jQuery(this).attr('src',jQuery(this).attr('pressed_src'));
		  jQuery(this).addClass('pressed').addClass('pressing');
	  }).mouseout( function() {
		  jQuery(this).removeClass('pressed');
		  jQuery(this).attr('src',jQuery(this).attr('original_src'));
	  }).mouseover( function() {
		  if (jQuery(this).hasClass('pressing')) {
			  jQuery(this).addClass('pressed').removeClass('pressing');
			  jQuery(this).attr('src',jQuery(this).attr('pressed_src'));
		  }
	  }).mouseup( function() {
		  jQuery(this).attr('src',jQuery(this).attr('original_src'));
		  jQuery(this).removeClass('pressed').removeClass('pressing');
	  });
	  return data;
  },
  InternalRefreshToAddItem: function (profile,data,context)
  {
	  var parent = aa_first(data,profile,'ParentControl',context);
	  var newItems = ajaxart.run(data,profile,'NewItems',context);
	  var controlForContext = aa_first(data,profile,'ControlForNewItemControlContext',context);
	  var jqPath = aa_text(data,profile,'JQPathForItems',context);
	  
	  if (parent == null || controlForContext == null || controlForContext.ajaxart == null) return [];
	  var controlContext = controlForContext.ajaxart.params;
	  
	  var currentControls = jQuery(parent).find(jqPath);
	  for(var i=0;i<newItems.length;i++)
	  {
		if (currentControls.length <=i) // adding at the end
		{
			var newControl = aa_first([newItems[i]],profile,'NewItemControl',controlContext);
			if (newControl != null)
			{
				aa_xml_appendChild(parent,newControl);
				ajaxart.run([newControl],profile,'OnNewItem',context);
			}
		}
	  }
  },  
  CheckboxesList: function (profile,data,context)
  {
	controls = ajaxart.getControlElement(context);
	if (controls.length == 0) return [];
	var elem = controls[0];
    var timeout = 1;
    if (ajaxart.isSafari) timeout = 100;
    
    var try_run_onload = function(count,timeout) {
    	if (count == 0) return;
	    if (jQuery(elem).parents("body").length == 0)  //detached
	    	setTimeout(function() { try_run_onload(count-1,timeout); } ,timeout); 
    else
    	ajaxart.run(data,profile,'OnLoad',context);	
    }
    try_run_onload(5,timeout);
  },  
	IsChrome: function (profile,data,context)
	{
		if (ajaxart.isChrome)
			return [ "true" ];
		else
			return [];
	},
	HtmlUnderElement: function(profile, data, context) {
		if (! ajaxart.isxml(data)) return [];

		var text = "";
		var node = data[0].firstChild;
		while (node != null) {
			if (node.nodeType == 3 || node.nodeType == 4) text += node.nodeValue;
			if (node.nodeType == 1) text += ajaxart.xml2text(node);
			node=node.nextSibling;
		}
		return [text];
	},
 	ValidationList: function (profile,data,context)
 	{
	    var itemProfiles = ajaxart.subprofiles(profile,'Validation');
	    for(var i=0;i<itemProfiles.length;i++)
	    	ajaxart.run(data,itemProfiles[itemProfiles.length - i -1],"",context);
	    return [];
 	},
	HorizontalSplitter: function (profile,data,context)
	{
		var idForCookie = aa_text(data,profile,'IdForCookie',context);
		var height = aa_text(data,profile,'Height',context);
		var totalWidth = aa_text(data,profile,'TotalWidth',context);
		var sections = ajaxart.dynamicText(data,"%$SectionsContext/Sections%",context);

		var widths = aa_valueFromCookie(idForCookie + "_splitterwidths");
		var keepTotalWidth = aa_bool(data,profile,'KeepTotalWidth',context);
		if (widths == null || widths == "")
			widths = ajaxart.run(data,profile,'DefaultWidths',context);
		else
			widths = widths.split(",");
		if (totalWidth != "" && widths.length+1 >= sections.length) {	// setting last column width
			var width_sum = 0;
			for (var j=0; j<sections.length-1; j++)
				width_sum += ajaxart.ui.width_as_num(widths[j]) + 15;// 15 is one splitter width
			widths[sections.length-1] = (ajaxart.ui.width_as_num(totalWidth) - width_sum) + "px";
		}
		var middle_splitter_height = ajaxart.ui.width_as_num(height) - 22 - 47 - 43;//22 - title, 47,43 - top & bottom splitters
		var sections_height = ajaxart.ui.width_as_num(height) - 22;
		var table = jQuery('<table cellpading="0" cellspacing="0" />')[0];
		var tr = document.createElement("TR"); table.appendChild(tr);
		for (var i=0; i<sections.length; i++) {
			var section = sections[i];
			var td1 = document.createElement("TD"); tr.appendChild(td1); td1.className="horizontal_section_td";
			var width = (widths.length > i) ? widths[i] : "200px";
			var div1 = jQuery("<div class='horizontal_section' style='width:"+ width+";height:" + sections_height + "px' />")[0]; td1.appendChild(div1);
			var title = ajaxart.totext(ajaxart.dynamicText([section],"%Title%",context));
			if (title != "")
				jQuery(div1).append(jQuery('<div class="horizontal_section_title">').text(title));
			var control = ajaxart.runNativeHelper([section],profile,'Control',context);
			if (control.length > 0)
				div1.appendChild(control[0]);
			
			// splitter
			if (i+1 < sections.length) {	//not last
				var splitter = $('<td class="splitter" > <div class="splitter_top" /><div class="splitter_middle" style="height:' + middle_splitter_height + 'px" /><div class="splitter_bottom" /></td>');
				splitter.find('.splitter_top').css('background','url('+aa_base_images()+'/css/splitter_top.png)');
				splitter.mousedown(function(e) {
					var mousepos = aa_mousePos(e);
					var splitter = jQuery( (typeof(event)== 'undefined')? e.target : event.srcElement  ); 
					table["section"] = jQuery(splitter).parents(".splitter").prev().find(".horizontal_section")[0];
					table["diff"] = mousepos.x - jQuery(table["section"]).width();
					table["last_section"] = jQuery(splitter).parents(".splitter").siblings(":last").find(".horizontal_section")[0];
					table["last_section_diff"] = jQuery(table["last_section"]).width() + mousepos.x;
					table["moving"] = true;
				} );
				jQuery(tr).append( splitter );
			}
		}
		jQuery(table).mouseup(function(e) {
			if (table["moving"]) {	// write widths to cookie
				var widths = "";
				var sections = jQuery(table).find(".horizontal_section");
				for (i=0; i<sections.length; i++)
					widths += jQuery(sections[i]).width() + "px,";
				aa_writeCookie(idForCookie + "_splitterwidths", widths);
			}
			table["moving"] = false;
		} );
		jQuery(table).mousemove(function(e) {
			if (!table["moving"] || table["section"]==null) return;
			var mousepos = aa_mousePos(e);
			jQuery(table["section"]).width(mousepos.x - table["diff"]);
			if (keepTotalWidth)
				jQuery(table["last_section"]).width(table["last_section_diff"] - mousepos.x);
		} );
		return [table];
	},
	IsMobileDevice: function (profile,data,context)
	{
		var checkInSimulator = aa_bool(data,profile,'SimulatorSupport',context);
		if (aa_screen_size(checkInSimulator).width < 450) 
			return ['true'];
		return [];
	},
	  ScreenSize: function (profile,data,context)
	  {
		  var axis = aa_text(data,profile,'Axis',context);
		  var margin = aa_int(data,profile,'Margin',context);
		  
		  var visualCntr = aa_findVisualContainer(null,context);

		  var num=0;
		  if (axis == 'height')
				num = visualCntr.height;
		  else
				num = visualCntr.width;

		  num -= margin;
		  
		  if (axis == 'height' && aa_bool(data,profile,'ReduceStudioHeaderFooter',context) && ajaxart.jbart_studio) {
		  	num -= jBart.footerHeight + jBart.headerHeight;
		  }
		  if ( aa_bool(data,profile,'AsHtmlString',context))
			  return ["" + num + "px"];
		  
		  return [num];
	  },
	ScreenPercentage: function (profile,data,context)
	{
			var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
			var screenHeight = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);

			var axis = aa_text(data,profile,'Axis',context);
			var total = (axis == 'width') ? screenWidth : screenHeight;
			var percent = aa_int(data,profile,'Percent',context);
			var value = parseInt( (total * percent)/100 );

			if (aa_bool(data,profile,'AddPxSuffix',context)) value = value + 'px';
			return [value];
	},
	CssClassesInControl: function (profile,data,context)
	{
		var control = aa_first(data,profile,'Control',context);
		var classes = {}
		var obj = {};
		obj.find = function(elem) {
			var cls = elem.className.split(' ');
			for(var i=0;i<cls.length;i++) classes[cls[i]] = true;
			var children = jQuery(elem).children();
			for(var i=0;i<children.length;i++) obj.find(children[i]);
		}
		
		if (control != null) obj.find(control);
		var out = [];
		for(var i in classes)
			out.push("."+i);
		return out;
	}
});

function aa_tinyMCE(textbox,settings) {
    var tinyID = "tinymce" + (ajaxart.unique_number++);

	settings = aa_defaults(settings,{
		textareaElement: textbox.el
	});
	$(settings.textareaElement).val(textbox.value);

	var jsList = [ '//tinymce.cachefly.net/4.0/tinymce.min.js' ];
	$.when( aa_loadLib("tinymce", [] , jsList) ).then( init );

    function init() {
		aa_addOnAttach(settings.textareaElement, function() {
			  	settings.textareaElement.setAttribute('id',tinyID);
				tinymce.init({
					width: parseInt(settings.width),
					height: parseInt(settings.height) - 110, // 110 px is the height of menu+toolbat+footer
					plugins: "code",
					selector: "#" + tinyID,
					setup : function(ed) {
						ed.on('change',function() {
							if (textbox.setValue) textbox.setValue(ed.getContent()	);
						});
					}
		    });
		});
    }
}
function aa_nicEdit(textbox,settings) {
	aa_defaults(settings, { autoUpdateFrequency: 700 } );
	var cssList = [];
	var jsList = [ aa_base_lib() + '/nicedit/nicEdit.js'];
	$.when( aa_loadLib("nicedit", cssList , jsList) ).then( init );
	textbox.$el.find("textarea").val( textbox.value ).css({height: settings.height +"px", width: settings.width + "px"});

	function init() {
		aa_addOnAttachMultiple(textbox.el, function() {
			var buttonList = settings.buttons ? settings.buttons.split(",") : [];
			var nicOptions = { 
				iconsPath: aa_base_lib() + '/nicedit/nicEditorIcons.gif',
				buttonList: buttonList,
				maxHeight: parseInt(settings.height - 30) // Reducing the header & footer
			};
			textbox.$el.find("textarea").css({height: settings.height-40 +"px"});	// Reducing the header & footer and some more to avoid scroll
			var editor = new nicEditor(nicOptions).panelInstance(textbox.$el.find("textarea")[0]);
			nicEditors.editors.push(editor);
			textbox.el.jbNicEditorInstance = editor.nicInstances[0];
			textbox.el.jbNicEditor = editor;
			autoUpdate();
		});
	}

	function autoUpdate() {
		if (textbox.el.jbNicEditorInstance && textbox.el.jbNicEditorInstance.getContent() != textbox.value)
			textbox.setValue(textbox.el.jbNicEditorInstance.getContent());
		if (ajaxart.isattached(textbox.el))
			setTimeout( autoUpdate, settings.autoUpdateFrequency );
	}
	textbox.el.jbAddTextAtCursor = function(text) {
		textbox.$el.find('.nicEdit-main').focus(); // Without focus it wont work!
    textbox.el.jbNicEditorInstance.nicCommand('InsertHTML', text); 		
	}
}
function aa_loadLib(loadId, cssList, jsList) {
	var deferred = $.Deferred();

	function doLoad() {
		var loadDeferred = $.Deferred();
		var jsLoadedCount = 0;
		function done() {
			jsLoadedCount++;
			if (jsLoadedCount == jsList.length)
				loadDeferred.resolve();
		}
		for (var i=0; i<cssList.length; i++)
			aa_load_js_css(cssList[i],'css');
		for (var i=0; i<jsList.length; i++)
			$.getScript(jsList[i], done);
		if (!jsList.length)
			loadDeferred.resolve();
		return loadDeferred;
	}
	if (!jBart.singleLoadItems) jBart.singleLoadItems = {};
	if (jBart.singleLoadItems[loadId] && jBart.singleLoadItems[loadId].loaded)	// already loaded
		deferred.resolve();
	else {
		if (!jBart.singleLoadItems[loadId]) 
			jBart.singleLoadItems[loadId] = { waiting: [] };
		jBart.singleLoadItems[loadId].waiting.push( deferred );
		if (jBart.singleLoadItems[loadId].waiting.length > 1) return deferred; // someone else is already loading it

		$.when( doLoad() ).then( function() { 
			for (var i=0; i<jBart.singleLoadItems[loadId].waiting.length; i++)
				jBart.singleLoadItems[loadId].waiting[i].resolve();
			jBart.singleLoadItems[loadId].loaded = true;
			jBart.singleLoadItems[loadId].waiting = [];
		});
	}
	return deferred;
}
if (!ajaxart.ui ) ajaxart.ui = {}
ajaxart_condition = function(element,actionContext,actionToRun,controlData)
{
	var result = ajaxart_runevent(element,actionContext,actionToRun,controlData);
	return (typeof(result) != "undefined" && result.length == 1 && (result[0] == true || result[0] == "true") );
}
ajaxart_delay_counter=0;

aa_tinymce_handleEvent = function(e,obj)
{
	if (e.type != 'keyup') return;
   
   var elem = jQuery('#'+obj.id);
   if(elem.length > 0 && elem[0].aa_update)
       elem[0].aa_update();
}
ajaxart_delayrunevent = function(element,actionContext,actionToRun,controlData,_event,delay)
{
  if (! ajaxart.isattached(element)) {
	  ajaxart_runevent(element,actionContext,actionToRun,controlData,_event);
	  return;
  }
  
  if (typeof(delay) == "undefined") delay = 200;
  
  var counter1 = ++ajaxart_delay_counter;
  
  var func = function(counter)
  {
	  setTimeout(function() { 
		  if (ajaxart_delay_counter != counter) return;
		  ajaxart_runevent(element,actionContext,actionToRun,controlData,_event); 
	  } ,delay);
  }
  func(counter1);
}
ajaxart_selectionchanged = function(element)
{
	ajaxart_runevent(element,'MasterDetailContext','SelectionChanged');
}
ajaxart_css_selection = function(element,topElementByCss)
{ 
	var top = jQuery(element).parents("." + topElementByCss);
	var mosttop = top.parents(".ajaxart_single_selection_top");
	if (mosttop.length > 0) top = mosttop;
	top.find(".selected").removeClass("selected");
	
	jQuery(element).addClass('selected');	
}
ajaxart_container_event = function(event,topElementCls,itemCls,actionContext)
{
    var element = (typeof(event.target)== 'undefined')? event.srcElement : event.target;
    if (ajaxart.isSafari && ajaxart_source_elem_in_test != null)
    	element = ajaxart_source_elem_in_test;
    
    if (event.type == 'keydown') {
    	var selectedItems = jQuery(element).parents("."+topElementCls).find('.selected');
    	if (selectedItems.length > 0)
    		element = selectedItems[0];
    }
    	
    var dataElem = ajaxart_container_find_databound_elem(element,itemCls);
    
    if (dataElem != null)
    {
    	if (event.type == 'click') {
    		ajaxart_css_selection(dataElem,topElementCls);
    		ajaxart_selectionchanged(dataElem);
    		ajaxart_runevent(dataElem,actionContext,'OnSelect');
    	}
    	else if (event.type == 'dblclick')
    		ajaxart_runevent(dataElem,actionContext,'OnDoubleClick');
    	else if (event.type == 'keydown')
    	{
    		if (event.keyCode == "13") // enter
        	  ajaxart_runevent(dataElem,actionContext,'OnDoubleClick');
  	        if (event.keyCode == 40)  // down  
			  ajaxart_container_move_cursor(dataElem,1);
	  	    if (event.keyCode == 38)  // up  
  			  ajaxart_container_move_cursor(dataElem,-1);
    	}
    }
    
	if ( jQuery(element).find("#key_sink").focus().length == 0)
		jQuery(element).parents("."+topElementCls).find("#key_sink").focus();
}


ajaxart_container_find_databound_elem = function(element,itemCls)
{
	if ( jQuery(element).hasClass(itemCls) ) return element;
	var result = jQuery(element).parents("."+itemCls);
	if (result.length == 0) return null;
	return result[0];
}

ajaxart_container_move_cursor = function(element,delta)
{
}

ajaxart.ui.lastEvent = null;

function aa_is_fixed_position(elem) 
{
	for (var curr=elem; curr && curr != document.body; curr=curr.parentNode)
	  if ( (curr.currentStyle && curr.currentStyle['position'] == 'fixed') ||
	  	(window.getComputedStyle && window.getComputedStyle(curr, null)['position'] == 'fixed'))
	  		return true;
	return false;
}

function aa_widthToWindowRight(control,delta,applyOn)
{
	if (!ajaxart.isattached(control) ) return;
	if (!applyOn) applyOn="width";

	if (typeof(delta) == "undefined" || isNaN(delta)) delta=0;

	if (jQuery(control).parents('.studio_simulator').length > 0) {	// in studio, use simulator window height
		  var simulator = jQuery(control).parents('.studio_simulator')[0];
		  if (simulator.className.indexOf(' ') > -1) { // only when a view is on
			  screenWidth = simulator.clientWidth;
		  	  var controlLeft = aa_absLeft(control) - aa_absLeft(simulator.firstChild);
		  	  var newWidth = screenWidth-controlLeft- delta; 
			  if (newWidth < 50) newWidth = 0;
			  jQuery(control).css(applyOn,newWidth + 'px');
		  }
	} else {
		var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
		var controlLeft = aa_absLeft(control);
	  	if (!aa_is_fixed_position(control))
	  	  controlLeft -= window.pageXOffset;
		jQuery(control).css(applyOn,(screenWidth - controlLeft-delta) + 'px');
	}
}

ajaxart.ui.HeightToWindowBottom = function (control,delta,applyOn)
{
	if (!ajaxart.isattached(control) ) return;
	if (!applyOn) applyOn="height";
	if (typeof(delta) == "undefined" || isNaN(delta)) delta=0;
	var newHeight = 0;
	
	// see if control is in a dialog
	if (control.jbInDialog == null)
		control.jbInDialog = jQuery(control).parents('.dialog_box').length > 0;
	if (control.jbInDialog)
	{
		var dlg = jQuery(control).parents('.dialog_box');
		if (dlg[0].dialogHeight == null) dlg[0].dialogHeight = dlg.height();
		
		var dlgBottom = dlg[0].dialogHeight + aa_absTop(dlg[0]);
	  	var controlTop = jQuery(control).position().top;
	  	if (dlgBottom - controlTop - delta > 50) {
	  		newHeight = dlgBottom - controlTop - delta;
	  	}
	}
	else if (aa_has_simulator(control)) {	// in studio, use simulator window height
		  var simulator = jQuery(control).parents('.studio_simulator')[0];
	  	  var controlTop = aa_absTop(control,true) - aa_absTop(simulator.firstChild,true);
	  	  newHeight = simulator.clientHeight -controlTop- delta; 
	} else {// normal mode
	  var screenHeight = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);
  	  var controlTop = aa_absTop(control,true);
  	  if (!aa_is_fixed_position(control))
  	  	controlTop -= window.scrollY;
  	  newHeight = screenHeight - controlTop- delta; 
	}
	if (newHeight < 50) newHeight = 0; // ???
	if (newHeight > 0) {
	  if (control.jbPrevHeight != newHeight)
	  	height_changed = true;
	  control.jbPrevHeight = newHeight;
	  jQuery(control).css(applyOn, newHeight+'px');
	  if (height_changed && control.jbSizeChanged)
	  	control.jbSizeChanged();
	}
	return newHeight;
}

ajaxart_update = function(element,value,expression)
{
	var dataBoundElem = jQuery(element);
	if (! dataBoundElem.hasClass("aa_custom_control"))
		dataBoundElem = jQuery(element).parents(".aa_custom_control");
	if (dataBoundElem.length == 0) return;
	ajaxart_runevent(dataBoundElem[0], '_CustomControlContext', 'UpdateData', value);
}
ajaxart_data = function(element)
{
	var context = ajaxart_get_context(element);
	if (context == null) return null;
    if (context.data.length > 0)
    	return context.data[0];
}
ajaxart_param = function(element,param_name)
{
	var context = ajaxart_get_context(element);
	if (context == null) return null;
	var param = context.params.componentContext.params[param_name];
	if (param == null) {
		ajaxart.log("Param " + param_name + " does not exist", "warning");
		return null;
	}
	if (param.length == 0) return "";
	var as_text = ajaxart.totext(param);
	if (as_text != "")
		return as_text;
	else
		return param[0];
}
ajaxart_get_context = function(element)
{
	var dataBoundElem = jQuery(element);
	if (! dataBoundElem.hasClass("aa_custom_control"))
		dataBoundElem = jQuery(element).parents(".aa_custom_control");
	if (dataBoundElem.length == 0) return;
    var context = dataBoundElem[0]["ajaxart"];
    if (typeof(context) == "undefined") {
    	ajaxart.log("control does not contain ajaxart data","warning");
    	return null;
    }
    return context;
}

ajaxart.ui.getScriptParamContext = function(scriptObject)
{
	if (typeof(scriptObject.objectForMethod) == undefined) 
		return scriptObject.context;

	var newContext = ajaxart.clone_context(scriptObject.context);
    newContext.vars['_This'] = scriptObject.objectForMethod;
    return newContext;
}

ajaxart_ui_imposeMaxLength = function(event, element, maxLen)
{
	return (element.value.length < maxLen) || ajaxart_ui_isbackwards(event);
}

ajaxart_ui_isbackwards = function(event)
{
	return (event.keyCode == 8 || event.keyCode==46 ||(event.keyCode>=35 && event.keyCode<=40));
}

ajaxart_ui_validate = function(event, element)
{
	var elem_context = element["ajaxart"];
	if (typeof(elem_context) == "undefined") 
		return true;
	
	var params = elem_context.params;
	var actionToRunPack = { script: ajaxart.getVariable(params,'KeyPressValidator')[0] , context: params};
	
	var keyCode = event.charCode;
	if (keyCode == undefined)
		keyCode = event.keyCode;
	var validation = ajaxart.run([String.fromCharCode(keyCode)],actionToRunPack.script,"",elem_context);
	var result = (validation[0] == 'true') || ajaxart_ui_isbackwards(event); 
	return result;
}
ajaxart_capture_onclick = function(f)
{
    if (window.captureEvents)
    	window.onclick = f;
	else  // IE
		document.onclick = f;
}
ajaxart_ui_capture_mousemove = function(f)
{
    if (window.captureEvents)
    	window.onmousemove = f;
	else  // IE
		document.onmousemove = f;
}
function ajaxart_stop_event_propogation(e)
{
	if (!e) return;
	if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
	e.cancelBubble = true;
	return false;
}

ajaxart_set_text = function(element,text)
{
	  text = text.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;");
	  element.innerHTML = text;
}

function ajaxart_disableSelection(target){
	function makeUnselectable(node) {
	    if (node.nodeType == 1)
	        jQuery(node).addClass('unselectable');
	    var child = node.firstChild;
	    while (child) {
	        makeUnselectable(child);
	        child = child.nextSibling;
	    }
	}
	if (target) makeUnselectable(target);
}

function ajaxart_restoreSelection(target)
{
	function unmakeUnselectable(node) {
	    if (node.nodeType == 1)
	        jQuery(node).removeClass('unselectable');
	    var child = node.firstChild;
	    while (child) {
	        unmakeUnselectable(child);
	        child = child.nextSibling;
	    }
	}
	if (target) unmakeUnselectable(target);
}
ajaxart.ui.contextWithCurrentControl = function(context, control)
{
	  var newcontext = ajaxart.clone_context(context);
	  ajaxart.setVariable(newcontext,"ControlElement",[control]);
	  return newcontext;
}
ajaxart.ui.width_as_num = function(width)
{
	var out;
	if (width.indexOf("px") > 0)
		out = Number(width.split("px")[0]);
	else
		out = Number(width);
	if (isNaN(out)) return 0;
	return out;
} 
ajaxart.ui.page_dimensions = function()
{
	var d = {};
	if( window.innerHeight ) {
		d.pageYOffset = window.pageYOffset;
		d.pageXOffset = window.pageXOffset;
		d.innerHeight = window.innerHeight;
		d.innerWidth = window.innerWidth;
	} else if( document.documentElement && document.documentElement.clientHeight ) {
		d.pageYOffset = document.documentElement.scrollTop;
		d.pageXOffset = document.documentElement.scrollLeft;
		d.innerHeight = document.documentElement.clientHeight;
		d.innerWidth = document.documentElement.clientWidth;
	} else if( document.body ) {
		d.pageYOffset = document.body.scrollTop;
		d.pageXOffset = document.body.scrollLeft;
		d.innerHeight = document.body.clientHeight;
		d.innerWidth = document.body.clientWidth;
	}
	return d;
}

function aa_find_field(context,field_id)
{
	var class_to_find = "fld_" + field_id;
	if (!context || !field_id) return;
	if (context.vars.ControlElement) {
		var out = $(context.vars.ControlElement).find('.'+class_to_find);
		if (out[0]) return out.get();
	}
	var root = aa_intest ? aa_intest_topControl : document;
	var out = $(root).find('.'+class_to_find);
	if (out.length == 0) return [];
	if (out.length == 1) return out.get();
	if (out.length > 1) {
		// todo - try finding siblings to get the right one
		return out.get();
	}
}


function ajaxart_shortcut_matchs_event() 
{
	//Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
	var shift_nums = {"`":"~","1":"!","2":"@","3":"#","4":"$","5":"%","6":"^","7":"&","8":"*","9":"(","0":")","-":"_","=":"+",";":":","'":"\"",",":"<",".":">","/":"?","\\":"|"
	}
	//Special Keys - and their codes
	var special_keys = {'esc':27,'escape':27,'tab':9,'space':32,'return':13,'enter':13,'backspace':8,
'scrolllock':145,'scroll_lock':145,'scroll':145,'capslock':20,'caps_lock':20,'caps':20,'numlock':144,'num_lock':144,'num':144,'pause':19,'break':19,'insert':45,'home':36,'delete':46,'end':35,'pageup':33,'page_up':33,'pu':33,
'pagedown':34,'page_down':34,'pd':34,
'left':37,'up':38,'right':39,'down':40,
'f1':112,'f2':113,'f3':114,'f4':115,'f5':116,'f6':117,'f7':118,'f8':119,'f9':120,'f10':121,'f11':122,'f12':123
	}

	return function(shortcut_combination,e) {
		shortcut_combination = shortcut_combination.toLowerCase();
		e = e || window.event;
		
		//Find Which key is pressed
		if (e.keyCode) code = e.keyCode;
		else if (e.which) code = e.which;
		var character = String.fromCharCode(code).toLowerCase();
		
		if(code == 188) character=","; //If the user presses , when the type is onkeydown
		if(code == 190) character="."; //If the user presses , when the type is onkeydown

		var keys = shortcut_combination.split("+");
		//Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
		var kp = 0;
		
		var modifiers = { 
			shift: { wanted:false, pressed:false},
			ctrl : { wanted:false, pressed:false},
			alt  : { wanted:false, pressed:false},
			meta : { wanted:false, pressed:false}	//Meta is Mac specific
		};
                    
		if(e.ctrlKey)	modifiers.ctrl.pressed = true;
		if(e.shiftKey)	modifiers.shift.pressed = true;
		if(e.altKey)	modifiers.alt.pressed = true;
		if(e.metaKey)   modifiers.meta.pressed = true;
                    
		for(var i=0; k=keys[i],i<keys.length; i++) {
			//Modifiers
			if(k == 'ctrl' || k == 'control') {
				kp++;
				modifiers.ctrl.wanted = true;

			} else if(k == 'shift') {
				kp++;
				modifiers.shift.wanted = true;

			} else if(k == 'alt') {
				kp++;
				modifiers.alt.wanted = true;
			} else if(k == 'meta') {
				kp++;
				modifiers.meta.wanted = true;
			} else if(k.length > 1) { //If it is a special key
				if(special_keys[k] == code) kp++;
				
			} else { //The special keys did not match
				if(character == k) kp++;
				else {
					if(shift_nums[character] && e.shiftKey) { //Stupid Shift key bug created by using lowercase
						character = shift_nums[character]; 
						if(character == k) kp++;
					}
				}
			}
		}
		
		if(kp == keys.length && 
					modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
					modifiers.shift.pressed == modifiers.shift.wanted &&
					modifiers.alt.pressed == modifiers.alt.wanted &&
					modifiers.meta.pressed == modifiers.meta.wanted) {
			return true;
		}
	}
	return false;
}

jQuery.extend(jQuery.fn, {
	disableTextSelect: function() {
		this.each( function () { ajaxart_disableSelection(this); } );
		return this;
	}
});

function aa_add_virtual_inner_element(elem,inner)
{
	if (!elem.virtual_inner_elements) elem.virtual_inner_elements = [];
	elem.virtual_inner_elements.push(inner);
}
function aa_addClassNoCheck(element,cls)
{
	if (element.className == "") element.className = cls;
	else element.className += " " + cls;
}
function aa_addClass(element,cls)
{
	if (element.className.indexOf(cls) == -1) {
		if (element.className == "") element.className = cls;
		else element.className += " " + cls;
	}
	else jQuery(element).addClass(cls);
}
function aa_hide(elem)
{
  elem.style.display = 'none'; elem.display = 'none';
}

function aa_urlHashValue(url,attr)
{
	if (url.indexOf('#') > -1) url = url.substring(url.indexOf('#'));
	var pos = url.indexOf('?'+attr+'='); 
	if (pos == -1) return "";
	var out = url.substring(pos+1);
	out = out.substring(out.indexOf('=')+1);
	if (out.indexOf('?') > -1) out = out.substring(0,out.indexOf('?'));
	if (out != "" && out.charAt(out.length-1) ==';' ) out = out.substring(0,out.length-1);
	return out;
}
aa_DateIframe = null;
function aa_fixStretchOnElem(elem)
{
	if (elem.fixStretchBottom) elem.fixStretchBottom();
	if (elem.fixStretchRight) elem.fixStretchRight();
}
function aa_fixstretch()
{
	var elems = jQuery('body').find('.aa_stretch');
	for(var i=0;i<elems.length;i++) 
	  aa_fixStretchOnElem(elems[i]);
}
function aa_init_onresize()
{
	window.aa_windowresize_timer = window.aa_windowresize_timer || 0; 
	window.onresize = function() {
		if (aa_windowresize_timer != 0)  clearTimeout(aa_windowresize_timer);
		aa_windowresize_timer = setTimeout(function() {
			aa_fixstretch();
			jBart.trigger(jBart,'windowResize',{});
			aa_windowresize_timer = 0;
		},100);
	}
}
function aa_stretchToRight(elem,margin,doNotAddOverflow)
{
	jQuery(elem).addClass('aa_stretch');
	if (!doNotAddOverflow) jQuery(elem).css('overflow','auto');
	elem.fixStretchRight = function () { aa_widthToWindowRight(this,margin); aa_htmlContentChanged(this); }
	aa_addOnAttach(elem,function() { aa_fixStretchOnElem(this); });
	aa_init_onresize();
}
function aa_stretchToBottom(elem,margin,doNotAddOverflow)
{
	jQuery(elem).addClass('aa_stretch');
	if (!doNotAddOverflow) jQuery(elem).css('overflow','auto');
	elem.fixStretchBottom = function () { ajaxart.ui.HeightToWindowBottom(this,margin); aa_htmlContentChanged(this); }
	aa_addOnAttach(elem,function() { aa_fixStretchOnElem(this); });
	aa_init_onresize();
}
function aa_init_horiz_resizer(elem,resizer)
{
	resizer.onmousedown = function(e) {
		document.onmouseup = function(e1) {
			document.onmouseup = null;
			document.onmousemove = null;
			ajaxart_disableSelection(jQuery('body')[0]);
			return false;
		}
		document.onmousemove = function(e1) {
			var mousepos = aa_mousePos(e1);
			var elemX = aa_absLeft(elem,false);
			if (mousepos.x < elemX+5) return;
			var newWidth = mousepos.x - elemX;
			jQuery(elem).width(newWidth+"px");
			aa_fixstretch();
			aa_stop_prop(e1);
			ajaxart_restoreSelection(jQuery('body')[0]);
			return false;
		}
	}
	return false;
}
function aa_load_js_css(filename, filetype) {
	filetype = filetype || 'js';
	if (ajaxart.loaded_js == null) ajaxart.loaded_js = {};
	if (ajaxart.loaded_js[filename] != null) return;
	ajaxart.loaded_js[filename] = "loaded";

	if (filetype=="js"){ //if filename is a external JavaScript file
		  var fileref=document.createElement('script');
		  fileref.setAttribute("type","text/javascript");
		  fileref.setAttribute("src", filename);
	}
	else if (filetype=="css"){ //if filename is an external CSS file
		  var fileref=document.createElement("link");
		  fileref.setAttribute("rel", "stylesheet");
		  fileref.setAttribute("type", "text/css");
		  fileref.setAttribute("href", filename);
	}
	if (fileref)
	    document.body.appendChild(fileref);
}
function aa_run_when_js_is_loaded(expression_to_check, to_run) {
	var again = function() {
		aa_run_when_js_is_loaded(expression_to_check, to_run);
	};
	if (typeof(eval(expression_to_check)) == "undefined") {
		setTimeout( again , 500 );
		return;
	}
	to_run();
}
function aa_run_when_attahced(elem, to_run)
{
	var again = function() {
		aa_run_when_attahced(elem,to_run);
	}
	if (! ajaxart.isattached(elem)) {
		  setTimeout( again , 100 );
		  return;
	  }
	to_run();
}
function aa_text_val(exp,data,context) {
	return ajaxart.totext_array(ajaxart.dynamicText(data,exp,context));
}

function aa_findByClass(elem,className) {
	var $el = jQuery(elem);
	var out = $el.find('.'+className).get();
	if ($el.hasClass(className)) out.unshift(elem);
	return jQuery(out);
}



function aa_urlHashValue(param) {
	var hash = location.hash || '#';
	if (!hash) return '';

	var pos = hash.indexOf('?'+param+'='); 
	if (pos == -1) return "";
	var out = hash.substring(pos+1);
	out = out.substring(out.indexOf('=')+1);
	if (out.indexOf('?') > -1) out = out.substring(0,out.indexOf('?'));
	if (out != "" && out.charAt(out.length-1) ==';' ) out = out.substring(0,out.length-1);
	return out;
}

aa_gcs("ui",{
	SetUrlHashValue: function(profile,data,context) {
		aa_setUrlHashValue(aa_text(data,profile,'Attribute',context),aa_text(data,profile,'Value',context))
	},
	UrlHashValue: function(profile,data,context) {
		return [aa_urlHashValue(aa_text(data,profile,'Attribute',context))];
	}	
});

function aa_setUrlHashValue(param,value) {
	var hash = location.href.split('#')[1] || '';

	var entries = aa_split(hash,'?',true);
	var value_set=false;

	for(var i=0;i<entries.length;i++) {
		if (entries[i].indexOf(param+'=') == 0) {
			entries[i] = param+'=' + value;
			value_set = true;
			if (!value) { entries.splice(i,1); i--; }
		}
	}
	if (!value_set && value)
		entries.push(param+'=' + value);

	var newhash = entries.length > 0 ? '?' + entries.join('?') : '';
	window.jbHashChangeFromJS = true;
	location.hash = '#'+newhash;
	setTimeout(function() {
		window.jbHashChangeFromJS = false;
	},50);
}

function aa_removeUrlHashValue(param) {
	var hash = location.href.split('#')[1] || '';

	var entries = aa_split(hash,'?',true);

	for(var i=0;i<entries.length;i++) {
		if (entries[i].indexOf(param+'=') == 0) {
			entries.splice(i,1);
			break;
		}
	}

	var newhash = entries.length > 0 ? '?' + entries.join('?') : '';
	location.hash = '#'+newhash;	
}

if (!ajaxart.ui) ajaxart.ui = {};
ajaxart.ui.applyKeyboardEvent = function(_event,context)
{
	if (_event != null && _event.keyCode != null) {
		var codeAsString = "";
		switch (_event.keyCode) {
		case 40: codeAsString = "down arrow"; break;
		case 38: codeAsString = "up arrow"; break;
		case 13: codeAsString = "enter"; break;
		case 32: codeAsString = " "; break;		
		}
		if (_event.keyCode >= 48 && _event.keyCode <= 126)
			codeAsString = String.fromCharCode(_event.keyCode).toUpperCase();
		if (_event.ctrlKey == true && codeAsString != null)
			codeAsString = 'Ctrl+' + codeAsString; 
		if (_event.altKey == true && codeAsString != null)
			codeAsString = 'Alt+' + codeAsString;
		ajaxart.setVariable(context, "KeyPressed",[codeAsString]);
	}
}
aa_incapture = false;
function ajaxart_runevent(element,actionContext,actionToRun,controlData,_event)
{
	if (typeof(ajaxart_captured_element) != "undefined" && ajaxart_captured_element.length > 0) return [];
	var elem_context = element["ajaxart"];
	if (typeof(elem_context) == "undefined") 
		return [];
	
	var params = elem_context.params;
	
	if (actionContext.length > 0)
	{
		var actionContextPack = params.vars[actionContext];
		if (actionContextPack == null || actionContextPack.length == 0) return [];
		var actionToRunPack = actionContextPack[0][actionToRun];
		if (actionToRunPack == null || typeof(actionToRunPack) == "undefined") return [];
	}
	else {
		var actionToRunPack = { script: ajaxart.getVariable(params,actionToRun) , context: params};
	}
	var newContext = ajaxart.clone_context(actionToRunPack.context);
	for(var i in elem_context.params.vars)
		newContext.vars[i] = elem_context.params.vars[i];
	
	if (typeof(controlData) != "undefined")
		ajaxart.setVariable(newContext,"ControlData",[controlData]);
	ajaxart.setVariable(newContext,"ControlElement",[element]);

	ajaxart.ui.applyKeyboardEvent(_event,newContext);
	if (aa_isArray(actionToRunPack.script)) return [];
	return ajaxart.run(elem_context.data,actionToRunPack.script,"",newContext);
}
function aa_stop_prop(e) 
{
	if (!e) return;
	
	if (e.stopPropagation)
		e.stopPropagation();
    if(e.preventDefault)
        e.preventDefault();

	e.cancelBubble = true;
	return false;
}

function aa_center_position_absolute(el) {
	el.style.position = 'absolute';
	el.style.top = '50%';
	aa_addOnAttachMultiple(el,function() {
		var height = $(el).height();
		el.style.marginTop = '-'+parseInt(height/2)+'px';
		if (!height) el.style.top = '40%';
	});	
}


function aa_addActionOnWindowResize(el,callback,identifier) {
	if (!el) return;
	$(el).addClass('aa_resize_listener');
	el.jbOnWindowResize = function() {
		for(var i=0;i<el.jbWindowResizeCallbacks.length;i++)
			el.jbWindowResizeCallbacks[i].callback();
	}
	el.jbWindowResizeCallbacks = el.jbWindowResizeCallbacks || [];
	if (identifier) {
		for(var i=0;i<el.jbWindowResizeCallbacks.length;i++)
			if (el.jbWindowResizeCallbacks[i].identifier == identifier) {
				el.jbWindowResizeCallbacks[i].callback = callback;
				return;
			}
	}
	el.jbWindowResizeCallbacks.push({ identifier: identifier, callback: callback});

	if (!window.jbWindowResizeListener) {
		jBart.windowResizeListenerTimeout = 0;
		window.jbWindowResizeListener = function() {
			if (jBart.windowResizeListenerTimeout) clearTimeout(jBart.windowResizeListenerTimeout);
			jBart.windowResizeListenerTimeout = setTimeout(doOnResize,200);
		};
		$(window).resize(jbWindowResizeListener);
	}

	function doOnResize() {
		jBart.windowResizeListenerTimeout = 0;
		var elems = $('.aa_resize_listener');
		for(var i=0;i<elems.length;i++) {
			try {
				elems[i].jbOnWindowResize();
			} catch(e) {
				ajaxart.logException('error in window resize callback',e);
			}
		}		
	}
}

function aa_screen_size(consider_design_time_simulator_view)
{
	if (consider_design_time_simulator_view) {
		var elem = aa_body();
		if (elem != document.body)
			return { width: $(elem).width(), height: $(elem).height()	};
	}
	var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
	var screenHeight = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);
	return { width:screenWidth, height:screenHeight };
}

function aa_body() {
	return document.body;
}

/******************************************* Visual Container *********************************************************************/

aa_gcs('field_aspect',{
	VisualContainer: function (profile,data,context) {	
		var field = context.vars._Field[0];
		field.SectionStyle = aa_first(data,profile,'Style',context);
		var heightByCss = aa_bool(data,profile,'HeightByCss',context);
		var doNotPutWidthInElement = aa_bool(data,profile,'DoNotPutWidthInElement',context);
		var useMinHeight = aa_bool(data,profile,'SetHeightAsMinHeight',context);

		aa_bind(field,'ModifyInstanceContext',function(args) {
			var visualCntr = {
				ID: aa_text(data,profile,'ID',context),
				type: 'div',
				heightByCss: heightByCss,
				init: function(top) {
					this.el = top;
					top.jbVisualContainer = this;
					$(top).addClass('aa_visual_container').addClass(aa_text(data,profile,'CssClass',context));
					$(top).css('position','relative');
					if (this.width && !doNotPutWidthInElement) {
						$(top).width(this.width).css('overflow-x','hidden');
					}
					if (! aa_bool(data,profile,'IsDesktop',context))
						this.el.className += ' mobile';

					if (this.originalHeight) {
						$(top).css('overflow-y','auto');
						if (useMinHeight)	
							$(top).css('min-height',this.height+'px')
						else
							$(top).height(this.height);

					} else if (this.width && !heightByCss) {
						$(top).css('overflow-y','hidden');
					}
					if (this.originalHeight || heightByCss) {
						$(top).scroll(function() {
							aa_handleScroll(visualCntr,top);
						});						
					}
			
					aa_trigger(field,'initVisualContainer',{ visualContainer: this });
				},
				ForceWidth: function(width) { 
					this.width = this.forceWidth = width; 
					$(this.el).width(width);
					this.fireResize();
				},
				ForceHeight: function(height) { 
					this.height = this.forceHeight = height; 
					if (useMinHeight)	
						$(this.el).css('min-height',height+'px')
					else
						$(this.el).height(height);
					this.fireResize();
				},
				fireResize: function() {
					if (!this.el) return;
					var elems = $(this.el).find('.aa_resize_listener');
					for(var i=0;i<elems.length;i++) {
						try {
							elems[i].jbOnWindowResize();
						} catch(e) {
							ajaxart.logException('error in visual container resize callback',e);
						}
					}		
				},
				recalc: function() {
					var widthObj = aa_first(data,profile,'Width',context);
					var heightObj = aa_first(data,profile,'Height',context);
					this.width = widthObj ? widthObj.val : 0;
					this.originalHeight = heightObj ? heightObj.val : 0;
					this.height = this.originalHeight || aa_windowVisualContainer().height;
					if (heightByCss && !this.originalHeight) this.height = 0;

					if (this.forceWidth) this.width = this.forceWidth;
					if (this.forceHeight) this.height = this.forceHeight;
				},
				scrollY: function() {
					return (this.originalHeight  || heightByCss) ? this.el.scrollTop : window.pageYOffset;
				},
				scrollTop: function(y) {
					if (this.originalHeight || heightByCss)
						$(this.el).scrollTop(y);
					else
						$(window).scrollTop(y);
				},
				absTop: function() {
					return aa_absTop(this.el,true);
				}
			}
			visualCntr.recalc();

	    args.Context.vars.VisualContainer = [visualCntr];
	  });

		aa_bind(field,'beforeWrapWithSection',function(args) {
			args.sectionObject.VisualContainer = args.context.vars.VisualContainer[0];
		});

	}	

});

function aa_visualContainerStyle(section,settings) {
	settings = aa_defaults(settings,{
		sectionBody: section.$el.firstOfClass('section_body')
	});
	var visualCntr = aa_var_first(section.context,'VisualContainer');
	if (visualCntr)
		visualCntr.init($(settings.sectionBody)[0]);
	section.addSectionBody($(settings.sectionBody)[0]);	
}

function aa_windowVisualContainer() {
	if (!ajaxart.jbWindowVisualContainer) {

		var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
		var screenHeight = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);

		ajaxart.jbWindowVisualContainer = {
			type: 'window',
			el: document.body,
			init: function(top) {			
				$(window).scroll(function() {
					aa_handleScroll(ajaxart.jbWindowVisualContainer,document.body);					
				});
			},
			recalc: function() {
				this.width = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
				this.height = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);
			},
			scrollY: function() {
				return window.pageYOffset;
			},
			scrollTop: function(y) {
				$(window).scrollTop(y);
			},
			absTop: function() { 
				return 0;
			},
			supportsFixedPosition: true
		}
		ajaxart.jbWindowVisualContainer.init(document.body);
	}
	ajaxart.jbWindowVisualContainer.recalc();
	return ajaxart.jbWindowVisualContainer;
}

function aa_handleScroll(visualCntr,top,delayedAction) {
	aa_run_delayed_action('scroll',function() { 
		var elems = $(top).find('.aa_scroll_listener');
		if ($(top).hasClass('aa_scroll_listener')) elems.push(top);

		for(var i=0;i<elems.length;i++) {
			try {
				var cntr2 = aa_findVisualContainer(elems[i]);
				if (visualCntr == cntr2 || !cntr2.originalHeight)
					elems[i].jbWindowScrollCallbacks();
			} catch(e) {
				ajaxart.logException('error in window scroll callback',e);
			}
		}
	},3);
}
function aa_findVisualCntrByID(id) {
	var elems = $('.aa_visual_container');
	for(var i=0;i<elems.length;i++)
		if (elems[i].jbVisualContainer && elems[i].jbVisualContainer.ID == id) 
			return elems[i].jbVisualContainer;
}

function aa_findVisualContainer(elem,context) {
	var out;
	if (context && context.vars.VisualContainer) out = context.vars.VisualContainer[0];
	else if (elem) {
		var top = $(elem).closest('.aa_visual_container')[0];
		if (top && top.jbVisualContainer) out = top.jbVisualContainer;
	}
	out = out || aa_windowVisualContainer();

	out.recalc();
	return out;
}

function aa_positionFixed(el,settings) {
	settings = aa_defaults(settings,{
		addMarginToParent: false
	});
	var ctx = settings.object && settings.object.context;

	var visualCntr = aa_findVisualContainer(el,ctx);
	if (visualCntr.supportsFixedPosition && !ajaxart.isAndroid) {
		$(el).css('position','fixed');
		if (typeof settings.bottom != 'undefined') $(el).css('bottom',settings.bottom+'px');
		if (typeof settings.top != 'undefined') $(el).css('top',settings.top+'px');

		aa_addOnAttach(el,fixParentMargin);
	} else {
		$(el).css('position','absolute');
		aa_addOnAttach(el,appear);
		aa_addActionOnScroll(el,appear,'position_fixed');
	}

	function fixParentMargin() {
		if (!settings.addMarginToParent) return;
		
		var parent = el.parentNode;
		if (parent && !parent.jbMarginFixed) {
			var height = $(el).height();
			parent.jbMarginFixed = true;
			var marginType = (typeof settings.top != 'undefined') ? 'padding-top' : 'padding-bottom';
			$(parent).css(marginType,height+'px');
		}
	}

	function appear() {
		visualCntr.recalc();
		var top = visualCntr.scrollY();
		if (!visualCntr.originalHeight && !visualCntr.heightByCss) {
			top -= visualCntr.absTop();
			if (top<0) top=0;
		}
		if (ajaxart.jbart_studio && !visualCntr.originalHeight && !visualCntr.heightByCss && top>0) {
			top += $('.studio_collapsed')[0] ? 34 : 93;
		}
		fixParentMargin();

		if (typeof settings.bottom != 'undefined') {
			var cntrHeight = visualCntr.height;
			var height = $(el).height();
			top += cntrHeight - height - settings.bottom;
		}

		$(el).css('top',top+'px');

			// if (!settings.disableZoom && screen.width) {
			// 	var inverseZoom = ((window.innerWidth)/(screen.width));
			//   el.style.zoom = inverseZoom;			
			// }
	}

}

function aa_addActionOnScroll(el,callback) {
	if (el) {
		$(el).addClass('aa_scroll_listener');
		el.jbWindowScrollCallbacks = callback;
	}
}

function aa_url_attribute(url,attr)
{
	if (url.indexOf('#') > -1) url = url.substring(url.indexOf('#'));
	var pos = url.indexOf('?'+attr+'='); 
	if (pos == -1) return "";
	var out = url.substring(pos+1);
	out = out.substring(out.indexOf('=')+1);
	if (out.indexOf('?') > -1) out = out.substring(0,out.indexOf('?'));
	if (out != "" && out.charAt(out.length-1) ==';' ) out = out.substring(0,out.length-1);
	return out;
}

function aa_setEventExtraVariables(vars) {
	jBart.eventExtraVars = null;
	if (!vars || !vars.length) return;
	jBart.eventExtraVars = {};
	for(var i=0;i<vars.length;i++)
		jBart.eventExtraVars[vars[i].Name] = vars[i].Value;
}

function aa_removeEventExtraVariables(vars) {
	jBart.eventExtraVars = null;
}

function aa_contextWithEventExtraVars(ctx) {
	if (!jBart.eventExtraVars) return ctx;
	return aa_ctx(ctx,jBart.eventExtraVars);
}
function aa_addEventListener(object,evt,callback,useCapture,wantsUntrusted ) {
	if (!object) return
	if (object.addEventListener) 
		object.addEventListener(evt,callback,useCapture,wantsUntrusted );
	else if (object.attachEvent) 
		object.attachEvent('on'+evt,callback,useCapture,wantsUntrusted );
	
	if (ajaxart.isIE) {
		// jbEvents is used for memmory cleanup (IE)
	  object.jbEvents = object.jbEvents || [];
	  object.jbEvents.push({ event: "on" + evt, callback: callback });
	}
}
function aa_removeEventListener(object,evt,callback) {
	if (!object) return
	if (object.removeEventListener) 
		object.removeEventListener(evt,callback);
	else if (object.attachEvent) 
		object.detachEvent('on'+evt,callback);

	if (object.jbEvents) {
		for(var i=0;i<object.jbEvents.length;i++)
			if (object.jbEvents[i].event == 'on'+evt && object.jbEvents[i].callback == callback)
				object.jbEvents.splice(i+1);
	}
}


function aa_register_handler(obj,event,handler,id,phase)
{
	if (obj[event] == null) obj[event] = [];
	handler.phase = phase || 0;
	var replaced = false;
	if (id)
	{
		// replace the handler if exists
		handler.Id = id;
		for(var i=0;i<obj[event].length;i++)
			if (obj[event][i].Id == id)
			{
				obj[event][i] = handler;
				replaced = true;
			}
	}
	if (! replaced)
		obj[event].push(handler);
	obj[event].sort(function(a,b) { return a.phase > b.phase ? 1 : -1; });
}
