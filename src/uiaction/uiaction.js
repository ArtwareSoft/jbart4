ajaxart.load_plugin("uiaction");

aa_gcs("uiaction", {
	ReloadPage: function(profile, data, context) {
		if (!ajaxart.inPreviewMode) location.reload(true);
	},
	ScrollIntoView: function(profile, data, context) {
	  	var field_id = aa_text(data,profile,'FieldID',context);
	    var control = aa_find_field_controls({ fieldID: field_id, context: context })[0];
	    if (control)
	    	control.scrollIntoView();
	},
	FireEvent: function(profile, data, context) {
		var event = aa_text(data,profile,'Event',context);
		var elements = ajaxart.getControlElement(context);
		for (var i=0;i<elements.length;i++) {
			if (i==1 && aa_bool(data,profile,'ForOnlyOneElement',context)) return ['true'];
			
			var item = elements[i];
			var props = {};
			var propButton = aa_text(data,profile,'MouseButton',context);
			var keyCode = aa_text(data,profile,'KeyCode',context);
			if (propButton == "right") { props.button = 2; };
			if (keyCode != "") { props.keyCode = keyCode; };
			aa_fire_event(item,event,context,props);
		}
		return ["true"];
	},
	ButtonClick: function(profile, data, context) 
	{
		var runOn = context.vars.ControlElement[0];
		if (!runOn) return;
		var jRunOn = jQuery(runOn);
		if (jRunOn.hasClass('aa_clickable') || jRunOn.hasClass('button_hyperlink_image') || jRunOn.hasClass('aa_button_clickable') && !runOn.jbart_click_behavior) 
			aa_fire_event(runOn,'click',context,{});
		else {
		  aa_fire_event(runOn,'mousedown',context,{});
		  aa_fire_event(runOn,'mouseup',context,{});
		}
	},
	PutInputValuesInHtmlForTests: function(profile, data, context) {
		var top = aa_var_first(context,'TopControlForTest');
		if (!top) return;
		var inputs = jQuery(top).find('input');
		for(var i=0;i<inputs.length;i++) {
			inputs[i].setAttribute('value',jQuery(inputs[i]).val());
		}
	},
	SimulateTreeDragBegin: function(profile, data, context) {
		var elem = ajaxart.getControlElement(context)[0];
		if (!elem) return;
		var cntr_ctrl = jQuery(elem).parents('.aa_container')[0];
		if (cntr_ctrl && cntr_ctrl.Cntr.TreeDragBegin)
		{
			var cntr = cntr_ctrl.Cntr;
			cntr.SuspectItemDrag = {elem: jQuery(elem), mousePos: {x:0,y:0}}
			cntr.TreeDragBegin(null,true);
		}
	},
	SimulateTreeDragEnd: function(profile, data, context) {
		var elem = ajaxart.getControlElement(context)[0];
		if (!elem) return;
		var cntr_ctrl = jQuery(elem).parents('.aa_container')[0];
		if (cntr_ctrl && cntr_ctrl.Cntr.TreeDragEnd)
		{
			var cntr = cntr_ctrl.Cntr;
			elem.appendChild( cntr.SpaceElem );
			cntr.TreeDragEnd(null,false,true);
		}
	},
	SimulateTreeDrop: function(profile, data, context) {
		var elements = ajaxart.getControlElement(context);
		return elements;
	},
	ControlElementToRunOn: function(profile, data, context) {
		var elements = ajaxart.getControlElement(context);
		return elements;
	},
	Refresh: function(profile, data, context) 
	{
		var elements = ajaxart.getControlElement(context);
		for(var i=0;i<elements.length;i++)
		{
			var newControl = jBart.utils.refresh(elements[i]);
		
			ajaxart.run(data,profile,'RunOnControl',aa_ctx(context,{ControlElement: [newControl]}));
		}
		return ["true"];
	},
	FilterContainer: function(profile, data, context)
	{
		var cntr_field_id = aa_text(data,profile,'Cntr',context),cntr=null;
		var xml = aa_first(data,profile,'FilterQueryXml',context);
		if (!ajaxart.isxml(xml)) return;
		
		if (cntr_field_id == '') 
			cntr = (context.vars.HeaderFooterCntr || context.vars._Cntr)[0];
		else if (cntr_field_id.indexOf('Page_') == 0) {
			var elem = jQuery('.'+cntr_field_id)[0];
			if (elem) cntr = elem.Cntr; 
		}
		else if (cntr_field_id.indexOf('fld_') == 0) {
			var elem = jQuery('.'+cntr_field_id)[0];
			if (elem) cntr = elem.Cntr; 
		}
		if (!cntr) return;
		
		cntr.DataHolder = cntr.DataHolder || aad_createDataHolderFromCntr(cntr,context);
		cntr.DataHolder.UserDataView.Filters = aad_cntr_filterXml2Objects(cntr,xml);
		aa_recalc_filters_and_refresh(cntr,data);
	},
	UpdateBrowserTitle: function(profile, data, context)
	{
		var title = aa_text(data,profile,'Title',context);
		document.title = title;
		return ["true"];
	},
	Hide: function(profile, data, context) 
	{
		var elem = ajaxart.getControlElement(context)[0];
		if (ajaxart.ishtml(elem))
		{
			elem.display = 'none';
			elem.style.display = 'none';
		}
		return ["true"];
	},
	SetBrowserIcon: function(profile, data, context)
	{
		var icon = aa_text(data,profile,'Icon',context);
		if (icon == "") return [];
		var link = jQuery('<link rel="shortcut icon" href="'+icon+'" type="image/x-icon">');
		$('head').append( link ) ; 
	},
	AddCssForBody: function(profile, data, context)
	{
		var cssClass = aa_cssClass(data,profile,'Css',context,'jbBody');
		if (ajaxart.jbart_studio) {
			setTimeout(function() {
				$('.gstudio_preview_top').addClass(cssClass);
			},50);
		} else {
			$('body').addClass(cssClass);
		}
	},
	FindFirstInput: function(profile, data, context)
	{
		var elements = ajaxart.getControlElement(context);
		if (elements.length == 0) return [];
		var inp = jQuery(elements[0]).find('input, textarea, .ok_button');
		if (inp.length > 0) return [ inp[0] ];
		return [];
	},
	Show: function(profile, data, context) 
	{
		var elements = ajaxart.getControlElement(context);
		
		for(var i=0;i<elements.length;i++) 
		  elements[i].style.display = 'block';
		return [];
	},
	RunEvent: function(profile, data, context)
	{
		var elements = ajaxart.getControlElement(context);
		var varname = aa_text(data,profile,'VarName',context);
		var action = aa_text(data,profile,'Action',context);
		
		for(i in elements)
			ajaxart_runevent(elements[i],varname,action);
		
		return ["true"];
	},
	Alert: function(profile, data, context)
	{
		var text = aa_text(data,profile,'Text',context);
		alert(text);
	},
	ElementByID: function(profile, data, params)
	{
		var startFrom = ajaxart.run(data,profile,'StartFrom',params);
	    var ID = aa_text(data,profile,'ID',params);
	    
	    var newparams = ajaxart.calcParamsForRunOn(params,ID,startFrom);
	    return ajaxart.getControlElement(newparams);
	},
	ElementByClass: function(profile, data, params)
	{
		var startFrom = aa_first(data,profile,'StartFrom',params);
	    var cls = aa_text(data,profile,'Cls',params);
	    if (startFrom == null || startFrom.length == 0) return [];
	    var jresult = jQuery(startFrom).find('.'+cls);
	    var out = [];
	    for (var i=0; i<jresult.length; i++)
	    	out.push(jresult[i]);
	    return out;
	},
	GoUp: function(profile, data, params)
	{
	    var topHtmlTag = aa_text(data,profile,'TopHtmlTag',params).toLowerCase();
	    var topId = aa_text(data,profile,'TopId',params);
	    topId = topId.replace(/ /g, "_");
	    var topClass = aa_text(data,profile,'TopClass',params);
	    
	    var elems = ajaxart.getControlElement(params);
	    if (! ajaxart.ishtml(elems)) return [];
	    var elem = elems[0];
	    while (elem != null && elem.nodeType != 4) {
	    	if (topClass != "" && jQuery(elem).hasClass(topClass)) return [elem];
	    	if (topId != "" && elem.id == topId) return [elem];
	    	if (typeof(elem.tagName) != "undefined" && elem.tagName.toLowerCase() == topHtmlTag) return [elem];
	    	elem = elem.parentNode;
	    }
	    
	    return [];
	},
 	RefreshItemElements: function (profile,data,context)
 	{
		var elems = ajaxart.run(data,profile,'ItemElements',context);
		ajaxart_uiaspects_refreshElements(elems);
	    
	    return ["true"];
 	},
 	SelectedItemElement: function (profile,data,context)
 	{
		var elem = ajaxart.getControlElement(context);
		if (elem.length == 0) return [];
		
		var selected = jQuery(elem[0]).find('.aa_selected_item');
		if (selected.length == 0) return [];
	    return [selected[0]];
 	},
	DeleteItemElements: function (profile,data,context)
	{
		var elems = ajaxart.run(data,profile,'ItemElements',context);
		for(var i in elems)
	  	{
			var elem = elems[i];
			if (jQuery(elem).hasClass('aa_selected_item'))
  			{
		  		 var newSel = elem.nextSibling;
		  		 if (newSel == null) newSel = elem.previousSibling; 
		  		 if (newSel == null) {
		  			 var parents = jQuery(elem).parents('.aa_item');
		  			 if (parents.length > 0) newSel = parents[0];
		  		 }
		  		 if (newSel != null)
	  	  	     {
		  			ajaxart_uiaspects_select(jQuery(newSel),jQuery(elem),"auto",context,true);
	  	  	     }
	  		 }
  			 elem.parentNode.removeChild(elem);
	  	}
	  	return ["true"];
	},
	AddItemElement: function (profile,data,context)
	{
		var item_data = ajaxart.run(data,profile,'Item',context);
		var parent_elem = aa_first(data,profile,'ParentElement',context);
		var cntr = ajaxart_uiaspects_container(context);
		var new_elem = ajaxart_uiaspects_addElement(item_data,cntr,parent_elem);
	    
		if (aa_bool(data,profile,'SelectIt',context))
			ajaxart_uiaspects_select(jQuery(new_elem),jQuery([]),"auto",context,true);
		
		ajaxart.run([new_elem],profile,'DoOnAddedElement',aa_ctx(context,{ControlElement: [new_elem]}));
	    return ["true"];
	},
	ExpandText: function (profile,data,context)
	{
		var elem = aa_first(data,profile,'ItemElement',context);
		var tds = jQuery(elem).find('>.aa_cell_element');
		for(var i=0;i<tds.length;i++)
			if (tds[i].expandableText)
				tds[i].expandableText.Build(tds[i].expandableText.States['control']);
	},
	CheckAll: function (profile,data,context)
	{
		var select = aa_bool(data,profile,'Select',context);
		var cntr = ajaxart_uiaspects_container(context);

		var elems = jQuery(cntr.Ctrl).find('.aa_item');
		for(var i=0;i<elems.length;i++)
		{
			var elem = jQuery(elems[i]);
		    var checkbox = elem.find('>.aacheckbox_value');
        	if (checkbox.length > 0 && ! elems[i].hidden && checkbox[0].checked != select )
        	{
        		if (checkbox[0].checked != select)
     			    cntr.ToogleCheckbox(cntr.Context,elem);
        		aa_checked(checkbox[0], select);
        	}
		}

	    return ["true"];
	},
	HasClass: function(profile, data, context)
	{
		var cls = aa_text(data,profile,'Cls',context);
		var elems = ajaxart.getControlElement(context);
		if (elems.length == 0) return [];
		if ( jQuery(elems[0]).hasClass(cls) ) return ["true"];
		return [];
	},	
	ReplaceControl: function(profile, data, params)
	{
		var newControl = ajaxart.run(data,profile,'NewControl',params);
		var origControl = ajaxart.getControlElement(params);
		
		if (origControl.length == 0) return [];
		if (newControl.length == 0)
			newControl = [ document.createElement('div') ];
		
		if (origControl[0].id.length > 0 && newControl[0].id.length == 0)
			newControl[0].id = origControl[0].id; 

		ajaxart.replaceXmlElement(origControl[0],newControl[0],true);
		
		return data;
	},
	Select: function(profile, data, context)
	{
		var jItems = jQuery(context.vars.ControlElement).find('.aa_item');
		for(var i=0;i<jItems.length;i++)
			if (jItems[i].ItemData && aa_bool(jItems[i].ItemData,profile,'FilterOnItem',context)) {
				ajaxart.runNativeHelper(jItems[i].ItemData,profile,'Click',aa_ctx(context,{ControlElement:[jItems[i]]}));
				return [];
			}
		
		return [];
	},
	MobileScrollToElement: function(profile, data, context)
	{
		var elem = aa_first(data,profile,'Element',context);
		var iter = elem;
		while (iter && iter.nodeType == 1)
		{
			if (iter.IScroll) {
				iter.IScroll.scrollToElement(elem,400);
				return;
			}
			iter = iter.parentNode;
		}
	},
	ItemElementByFilter: function(profile, data, context)
	{
		var jItems = jQuery(context.vars.ControlElement).find('.aa_item');
		for(var i=0;i<jItems.length;i++)
			if (aa_bool(jItems[i].ItemData,profile,'FilterOnItem',context)) 
				return [jItems[i]];
	},
	ElementByInnerFilter: function(profile, data, params)
	{
	    var elements = ajaxart.run(data,profile,'TopElement',params);
	    if (! ajaxart.ishtml(elements)) return [];
		var out = [];
		
		function _recursive_iteration(elem)
		{
			if (elem.nodeType != 1) return;
			
			if (elem.ajaxart)
				var itemdata = elem.ajaxart.data;
			else
				var itemdata = elem.ItemData;
			
			if (itemdata != null && aa_bool(itemdata,profile,'Filter',params))
				out.push(elem);
			
			var node = elem.firstChild;
			while (node != null)
			{
				if (node.nodeType == 1)
					_recursive_iteration(node);
				node=node.nextSibling;
			}
		}

		for(var i=0;i<elements.length;i++)
			_recursive_iteration(elements[i]);
		
		return out;
	},
	Focus: function(profile, data, context)
	{
	    var elems = ajaxart.getControlElement(context);
	    if (elems.length == 0) return [];
	    var elem = elems[0];
	    var timeout = 1;
	    if (ajaxart.isSafari) timeout = 100;
	    
	    function dofocus(elem) {
	    	if (!elem.tabIndex || elem.tabIndex == -1) elem.tabIndex=1;
	    	if (elem.SetFocus) return elem.SetFocus();
	    	if (aa_bool(data,profile,'OnFirstInput',context)) {
	    		if (elem.tagName.toLowerCase().indexOf('input,textarea') != -1)
	    			elem.focus();
	    		else {
	    			var e2 = jQuery(elem).find(':input')[0];
	    			if (e2) e2.focus();
	    		}
	    	}
	    	else 
	    		elem.focus();
	    }
	    
	    if (jQuery(elem).parents("body").length == 0) { //detached
	    	var set_focus = function(e) {  setTimeout(function() { 
	    		if(! ajaxart.isattached(e)) return;
	    		dofocus(e);
	    	} ,timeout); }
	    	set_focus(elem);
	    }
	    else{
    		dofocus(elem);
	    }
	    
	    return [];
   }, 
   MoveSelection : function(profile, data, params)
   {
  	 var direction = aa_text(data,profile,'Direction',params);
  	 var controls = ajaxart.getControlElement(params);
  	 if (controls.length == 0) return [];
  	 
  	 var selected = jQuery(controls[0]).find(".selected");
  	 var newSelected = [];
  	 switch (direction) {
  	 case 'One Up' 	: newSelected = selected.prev();break;
  	 case 'One Down': newSelected = selected.next();break;
  	 default : ajaxart.log("MoveSelection - no valid direction:" + direction);
  	 }
  	 if (newSelected.length > 0) {
  		 selected.removeClass("selected");
  		 newSelected.addClass("selected");
  		 
  		 ajaxart_selectionchanged(newSelected[0]);
  		 var context = controls[0]["ajaxart"];
  		 ajaxart.run( newSelected[0]["ajaxart"].data, context.script,'OnSelect', context.params );
//  		 ajaxart.run(nextData,aggProfile,'',context)
//  		 ajaxart_runevent( newSelected[0]["ajaxart"].data ,context,'OnSelect');
  	 }
   },
   RefreshAllItemsInItemList: function(profile, data, context)
   {
	   var cntr = context.vars._Cntr[0];
	   aa_recalc_filters_and_refresh(cntr,data,context);  
   },
   DataItemsOfItemInTree: function(profile, data, context)
   {
	  var elem = aa_first(data,profile,'ItemElement',context);
	  if (!elem || !elem.ItemData) return [];
	  elem = jQuery(elem).find('.aa_treenode')[0];
	  if (elem && elem._Items) return [elem._Items];
   },
   MouseRightClick: function(profile, data, context)
   {
     var elems = ajaxart.getControlElement(context);
     for(var i=0;i<elems.length;i++)
     {
       
     }
   },
   SetEnabling : function(profile, data, context)
   {
  	 var enable = aa_bool(data,profile,'Enable',context);
  	 var control = ajaxart.getControlElement(context);
  	 if (control.length == 0) return [];
  	 if (enable)
  		 control[0].removeAttribute("disabled");
     else
    	 control[0].setAttribute("disabled", "true");
   },
   GoToUrl: function(profile, data, context)
   {
	  var url = aa_text(data,profile,'Url',context);
	  if (window._gaq) // google analytics 
		  _gaq.push(['_trackPageview', '/' + url.split('/').pop()]);
      if (ajaxart.inPreviewMode == true) return [];
      var prev_loc = window.location + "_";	//make it string and not reference
	  if (url.length > 0 && window.location != url) window.location = url;
	  if (ajaxart.hash_change_by_js_count != null && prev_loc != window.location + "_")
		  ajaxart.hash_change_by_js_count++;	// for Back of browser handling
	  return ["true"];
   },
   JQueryFind: function(profile, data, context)
   {
	   var exp = aa_text(data,profile,'Expression',context);
	   var all = aa_bool(data,profile,'All',context);
	   var logOnEmptyResult = aa_bool(data,profile,'LogOnEmptyResult',context);
	   var runOnData = aa_bool(data,profile,'RunOnData',context);
	   var runOnScreen = aa_bool(data,profile,'RunOnScreen',context); 
	   var control = null;
	   if (!runOnData)
		   control = ajaxart.getControlElement(context,true);
	   else if (data.length > 0)
	  	 control = data[0];
	   if (control == null)
		   return [];
	   try {
	  	 var result = [];
	  	 if (runOnScreen) eval('result = jQuery("' + exp + '")');
	  	 else if (exp.length > 0 && exp.charAt(0) == '.' && exp.indexOf('(') != -1)
	  		 eval('result = jQuery(control)' + exp);
	  	 else
	  		 result = jQuery(control).find(exp);
		   if (result.length > 0 ) {
			   if (!all) return [ result[0] ];
			   var arr = [];
			   for(i=0;i<result.length;i++) arr.push(result[i]);
			   return arr;
		   }
		   else if (logOnEmptyResult) { ajaxart.log("JQueryFind - found nothing, expression :" + exp,"warning"); }
	   } catch(e) { ajaxart.log("JQueryFind failed, expression :" + exp,"error"); }
	   return [];
   },
   AddTextToTextboxCursor: function(profile, data, context) {
	  	var text = aa_text(data,profile,'Text',context);

	  	var field_id = aa_text(data,profile,'Textbox',context);
	    var control = aa_find_field_controls({ fieldID: field_id, context: context })[0];
    	if (control && control.jbAddTextAtCursor) return control.jbAddTextAtCursor(text);
	    if (control) {
	    	// add to text area
	    	var textarea = control.tagName.toLowerCase() == 'textarea' ? control : $(control).find('textarea')[0];

	    	textarea.value = textarea.value.substring(0,textarea.selectionStart) + text + textarea.value.substring(textarea.selectionStart);
	    }
   },
   RegisterOnPageClose: function(profile, data, context)
   {
	   window.onbeforeunload = function() { 
		   if (window.preventOnBeforeUnload) return;   // because of an ugly tinymce bug in a specific IE8 version
		   var cond = aa_bool(data,profile,'ShowMessageIf',context);
		   var message = aa_multilang_text(data,profile,'Message',context); 
		   if (cond) return message; 
	   }
	   return ["true"];
   },
   MakeCssInline : function(profile, data, context)
   {
	   	var control = aa_first(data,profile,'Control',context);
	   	var replacers_xml = aa_first(data,profile,'CssReplacer',context);
	   	var all_replacers = [];
	   	
		var replacers = aa_xpath(replacers_xml,"*",false);
		 
	    for(var i=0; i<replacers.length; i++) {
	    	var cond = replacers[i].getAttribute("Condition");
	    	var style = replacers[i].getAttribute("Css");
	    	var found = jQuery(control).find("" + cond);
	    	for (var j=0; j<found.length; j++)
	    		found[j].style.cssText = style;
	    }
	    return [control];
   },
   HideMessageBarOnUserClick: function(profile, data, context)
   {
	   var clean_message_bars = function() {
		   var messageBars = ajaxart.getControlElement(context);
		   for (i in messageBars)
			   jQuery(messageBars[i]).hide();
		   ajaxart_capture_onclick(null);
	   }
	   setTimeout(function() {ajaxart_capture_onclick(clean_message_bars)},1);
	   return ["true"];
   },
   RefreshAfterDataItemsChanged: function(profile, data, context)
   {
	   return aa_refreshAfterDataItemsChanged(context);
   },
   DownloadFile: function(profile, data, context)
   {
	   var iframe = document.createElement("IFRAME");
	   iframe.style.width = "0px";
	   iframe.style.height = "0px";
	   iframe.setAttribute("frameborder","0");
	   iframe.src = aa_text(data,profile,'Url',context);
	   jQuery(iframe).appendTo("body");
	   return [];
   },
   BindHashChangeEvent: function(profile, data, context)
   {
	   ajaxart.hash_change_func = function() { ajaxart.run(data,profile,'Action',context); }
	   ajaxart.hash_change_by_js_count = 0;
	   window.onhashchange = function ()
	   {
			// we use counter to make sure that event is not coming from js code
			if (ajaxart.hash_change_by_js_count > 0) {
				ajaxart.hash_change_by_js_count--;
				return;
			}
			if (ajaxart.hash_change_func != null)
				ajaxart.hash_change_func();
		};
	   return [];
   }
});


function aa_fire_event(item,event,context,props)
{
	if (typeof(props) == "undefined") props = {};
	
	if (! ajaxart.isSafari || ajaxart.isattached(item) )
		  aa_xFireEvent(item, event, props,context.vars.InTest != null);
	else {
		ajaxart_source_elem_in_test = item;
		while (item != null)
		{
			aa_xFireEvent(item, event,props,context.vars.InTest != null);
			item = item.parentNode;
		}
		ajaxart_source_elem_in_test = null;
	}
}

function aa_refreshAfterDataItemsChanged(context)
{
   var items = context.vars._Items[0];
   if (items == null) return [];
   if (context.vars._Cntr)
	   aa_invoke_cntr_handlers(context.vars._Cntr[0],context.vars._Cntr[0].DataItemsChange,[],context);

   var candidates = jQuery(document).find('.aa_items_listener');
   if (context.vars.ControlElement && context.vars.ControlElement[0] != null && ! ajaxart.isattached(context.vars.ControlElement[0])) {
	   var root = context.vars.ControlElement[0];
	   while (root.parentNode != null) root = root.parentNode;
	   var candidates2 = jQuery(root).find('.aa_items_listener');
	   if (candidates2.length > 0) candidates = candidates2;
   }
   var jBase = jQuery(context.vars.ControlElement);
   var substract = jBase.parents('.aa_items_listener').get();
   if (jBase.hasClass('aa_items_listener')) substract.push(jBase[0]);
   
   for(var i=0;i<candidates.length;i++) {
	   var item = candidates[i];
	   var found = false;
	   for(var j=0;j<substract.length;j++) if (item == substract[j]) found=true;
	   if (found) continue;
	   if (item._Items == items)
		   item.RefreshAfterItemsChanged.call(item);
	   else if (item._Items.EqualsToDataItems && item._Items.EqualsToDataItems(items) ) {  // used in document tree
		   item._Items.Refresh([],context);
		   item.RefreshAfterItemsChanged.call(item);
	   }
   }
   return [];
}
aa_inuiaction = false;
