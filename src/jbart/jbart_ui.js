aa_gcs("ui", 
{
  Image: function (profile,data,context)
  {
	var src = aa_text(data,profile,'Source',context);
	var title = ajaxart_multilang_text(aa_text(data,profile,'Title',context),context);
	var width = aa_text(data,profile,'Width',context);
	var height = aa_text(data,profile,'Height',context);
	var out = jQuery('<img />')[0]; 
	out.setAttribute("src",src);
	out.setAttribute("title",title);
	if (height != "")
	  out.setAttribute('height',height);
	if (width != "") 
		out.setAttribute('width',width);
	if (ajaxart.subprofiles(profile,'OnClick') != null)
		out.className = 'clickable';
	jQuery(out).click(function() {
		if (window.aa_incapture) return;
		ajaxart.run(data,profile,"OnClick",aa_ctx(context,{ControlElement: [this]}));
	});
	return [out];
  },
  HtmlControl: function (profile,data,context)
  {
	  var html = aa_text(data,profile,'Html',context);
	  var css = aa_text(data,profile,'Css',context);
	  var div = document.createElement("DIV");
	  if (aa_bool(data,profile,'WordWrap',context))
		  div.style.whiteSpace = "normal";
	  div.innerHTML = html;
	  if (css != "")
		  div.className = aa_attach_global_css(css);
	  return [div];
  },
  Text: function (profile,data,context)  // GC of ui.Text
  {
	  var text = aa_text(data,profile,'Text',context);
	  var style = aa_text(data,profile,'Style',context);
	  var multiLang = aa_bool(data,profile,'MultiLang',context);
	  
	  if (multiLang)
	  	text = aa_text([text],aa_parsexml('<s t="text.MultiLang" Pattern="%%" Dynamic="true"/>'),'',context);
	  if (! aa_bool(data,profile,'HtmlContents',context))
		text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
      var span = document.createElement("span");
 	  if (style != "")
 		 aa_setCssText(span,style);
 	  span.className = "ajaxart_text";
 	  span.innerHTML = text;
 	  
 	  var hint = aa_text(data,profile,'Hint',context);
 	  if (hint != "") span.setAttribute('title',hint);
 	  
 	  return [span];
  },
  ControlWithAction: function (profile,data,context)
  {
	  ajaxart.run(data,profile,'RunBeforeControl',context);
	  var out = ajaxart.run(data,profile,'Control',context);
	  var newcontext = aa_ctx(context, { ControlElement: out, _ElemsOfOperation: out});
	  if (aa_bool(data,profile,'RunAfterControlWithTimer',context)) {
	    var timeout = 1;
	    if (ajaxart.isSafari) timeout = 100;
	    setTimeout(function() { ajaxart.run(data,profile,'RunAfterControl',newcontext); }  ,timeout); 
	  }
	  else
		  ajaxart.run(data,profile,'RunAfterControl',newcontext);
	  return out;
  },
  DataBind: function(profile,data,params)
  {
	var newData = ajaxart.getVariable(params,"InputForChanges");
    var script = aa_first(data,profile,'Script',params);
	var element = data;
	
	ajaxart.databind(element,newData,params,script);
	
	return data;
  },
  ElementOfClass : function(profile, data, params) {
	  	var cls = aa_text(data,profile,'Cls',params);
	  	var onlyFirst = aa_bool(data,profile,'OnlyFirst',params);
	  	var down = ( aa_text(data,profile,'Direction',params) == 'down');
	  	
	  	var child;
	  	if (!ajaxart.ishtml(data)) { ajaxart.log("ElementOfClass - input is not html","error"); return []; }
	  	var index = 0;
	  	var elements_queue = [];
	  	if (down)
	  		elements_queue.push(data[0]);
	  	else {
	  		if (data[0].parentNode != null)
	  			elements_queue.push(data[0].parentNode);
	  	}
	  	
	  	var out = [];
	  	while (index < elements_queue.length) {
	  		var element = elements_queue[index];
	  		index++;
	 		
	  		if (jQuery.inArray( cls, element.className.split(/\s+/) ) > -1 )
	  			if (onlyFirst)
	  				return [element];
	  			else
	  				out.push(element);
	  		
	  		if (down)
	  		{
		  		child = element.firstChild;
		  		while (child != null) {
		  			if (child.nodeType == 1)// element
		  				elements_queue.push(child);
		  			child = child.nextSibling;
		  		}
	  		} 
	  		else {
	  			if (element.parentNode != null && element.parentNode.nodeType == 1) 
	  				elements_queue.push(element.parentNode);
	  		}
	  	}
	  	return out;
	  },
	  HasClass: function (profile,data,context)
	  {
		  var cls = aa_text(data,profile,'Cls',context);
		  if ( jQuery(data).hasClass(cls) )
			  return ["true"];
		  return [];
	  },
	  Html: function (profile,data,params)
	  {
	    var html = aa_text(data,profile,'Html',params);
	    var tag = aa_text(data,profile,'Tag',params);
	    var dynamicContent = aa_bool(data,profile,'DynamicContent',params);

	    if (html == "") {
	    	html = aa_xml2htmltext(ajaxart.childElem(profile,"*"));
	    	if (dynamicContent)
	    		html = ajaxart.dynamicText(data,html,params,data,false,true)[0];
	    }
		if (tag != "") {
			var out = document.createElement(tag);
			out.innerHTML = html;
			return [out];
		}
		else {
			if (html == null) return [];
			return [jQuery(html)[0]];
		}
	  },
	  ControlWithCss: function (profile,data,context)
	  {
		var control = ajaxart.run(data,profile,'Control',context);
		var css = aa_text(data,profile,'Css',context);
		jQuery(control).addClass(aa_attach_global_css(css));
		return control;
	  },
	  ItemList: function (profile,data,context,override_items,override_aspects)
	 	{
		    var id = aa_string2id(aa_text(data,profile,'ID',context));
	 		var cntr = { ID: [id] , isObject: true }
	 		
		    var newcontext = aa_ctx(context,{_ParentCntr: context.vars._Cntr, _Cntr : [cntr]} );
	 		if (aa_bool(data,profile,'DataHolderCntr',context))
	 			newcontext = aa_ctx(newcontext,{DataHolderCntr: [cntr]});
	 		
	 		var data_items;
	 		if (aa_paramExists(profile,'DataHolder') && !override_items)
	 		{
	 			cntr.DataHolder = dataholder = aa_first(data,profile,'DataHolder',newcontext);
	 			cntr.Fields = dataholder.Fields;
	 			cntr.Items = data_items = [{isObject: true, Items: dataholder.Wrappers}];
	 			newcontext = aa_ctx(newcontext,{DataHolderCntr: [cntr], _Items: data_items});
	 		}
	 		else
	 		{
	 			data_items = override_items || ajaxart.run(data,profile,'Items',newcontext);
	 			if (!data_items[0]) data_items = [{Items:[]}];
	 			cntr.Items = data_items;
	 			ajaxart.setVariable(newcontext,"_Items",data_items);
	 			var ctx4 = aa_ctx(newcontext,{_FormulaInput: data_items[0].Items});
			    var fields = ajaxart.runsubprofiles(data,profile,'Field',ctx4);
			    ajaxart.concat(fields,ajaxart.run(data,profile,'Fields',ctx4));
	 			
	 			cntr.Fields = fields;
	 		}
			if (override_aspects)
		      var aspects = override_aspects;
			else {
			  var aspects = ajaxart.run(data,profile,'Presentation',newcontext);
			  aspects = aspects.concat(ajaxart.runsubprofiles(data,profile,'Aspect',newcontext));
			}
			for(var i=0;i<cntr.Fields.length;i++)
				if (cntr.Fields[i].CntrAspects)
				{
					var fld_aspects = cntr.Fields[i].CntrAspects;
					for(var j=0;j<fld_aspects.length;j++)
						aspects.push(fld_aspects[j].GetContent(data,newcontext)[0]);
				}

		    // takeover - used by GroupBy aspect to duplicate container in groups
		    var orignalItemListFunc = function(newcontext) { return function(override_items,override_aspects) {
		    	return ajaxart.gcs.ui.ItemList(profile,data,newcontext,override_items,override_aspects);
		    }}
		    for(var i=0;i<aspects.length;i++)
		    	if (aspects[i].takeOver != null)
			    	return aspects[i].takeOver(aspects,data_items,orignalItemListFunc(newcontext),newcontext);
		    
	 		cntr.Ctrl = jQuery('<div class="aa_container aa_inherit_selection"><div class="aa_container_header"/><ul style="list-style: none; padding:0; white-space: normal;" class="aa_list aa_listtop aa_cntr_body"/><div class="aa_container_footer"/></div>')[0];
	 		if (id != '')
	 			jQuery(cntr.Ctrl).addClass('Page_'+id);
		    // use the aspects to create the container - they can replace the default one.
		    for(var i=0;i<aspects.length;i++)
		    	ajaxart.runScriptParam(data,aspects[i].CreateContainer,newcontext);
		    cntr.Ctrl.Cntr = cntr;
		    ajaxart.databind([cntr.Ctrl],data,context,profile);
		    
			cntr.Items = data_items;
		    cntr.PostActors = [];cntr.PreActors = [];
		    cntr.RegisterForPostAction = function(aspect,phase) { cntr.PostActors.push({ phase: phase || 0, aspect: aspect}); }
		    cntr.RegisterForPreAction = function(aspect,phase) { cntr.PreActors.push({ phase: phase || 0, aspect: aspect}); }
		    cntr.Aspects = aspects;
			cntr.XtmlSource = [ {isObject :true, script :profile, input: data, context :context }];
			
			cntr.createNewElement = function(item_data,item_aggregator)
		    {
				var li = document.createElement('li');
				li.className = "aa_item";
				li.ItemData = item_data;
				ajaxart_add_foucs_place(li);
		    	if (item_aggregator)
		    		item_aggregator.push(li);
				return li;
		    };
		    cntr.insertNewElement = function(elem,parent)
		    {
		    	var list = ajaxart_find_list_under_element(parent);
		    	if (list != null)
		    		list.appendChild(elem);
		    };
		    cntr.next = function(elem,cntr) { return ajaxart_tree_next(elem,cntr) };
		    cntr.prev = function(elem,cntr) { return ajaxart_tree_prev(elem,cntr) };
		    cntr.ElemsOfOperation = function() 
		    { 
		    	if (this.GetMultiSelectedItems)
		    		return this.GetMultiSelectedItems();
		    	return jQuery(this.Ctrl).find('.aa_selected_item').slice(0,1).get(); 
		    }
		    cntr.ItemsOfOperation = function() 
		    { 
		    	var elems = this.ElemsOfOperation();
		    	var itemsData = [];
		    	for(var i in elems)
		    		itemsData = itemsData.concat(elems[i].ItemData);

		    	return itemsData;
		    }
		    cntr.Context = newcontext;

		    aa_setMethod(cntr,'Operations',profile,'Operations',context);

		    for(var i=0;i<cntr.Aspects.length;i++) {
		    	try {
		    		aa_runMethod(data,cntr.Aspects[i],'InitializeContainer',newcontext);
		    	} catch(e) { 
		    		ajaxart.log("error in aspect " + cntr.Aspects[i].XtmlSource[0].script.getAttribute('t') + ": " + e.message + (e.stack || ''),"error"); }
		    }

		    cntr.PreActors.sort(function(a,b) { return a.phase > b.phase ? 1 : -1; });
		    cntr.PostActors.sort(function(a,b) { return a.phase > b.phase ? 1 : -1; });

		    for(var i=0;i<cntr.PreActors.length;i++) {
		    	ajaxart.trycatch( function() {
		    		aa_runMethod(data,cntr.PreActors[i].aspect,'PreAction',newcontext);
			    	 //ajaxart.runScriptParam([],cntr.PreActors[i].aspect.PreAction,cntr.Context);
		    	}, function(e) { ajaxart.logException(e); });
		    }

		    if (cntr.DataHolder)
		    	cntr.DataHolder.UserDataView.Sort = cntr.Dataview_PreSort || [];
		    aa_recalc_filters_and_refresh(cntr,data,newcontext,false);
			if (cntr.SoftSelector) // auto select, e.g from url
			{
	  	    	var top_cntr_list = ajaxart_find_aa_list(cntr);
	  	    	var all_elems = jQuery(top_cntr_list).find('.aa_item').get();

				var key_to_select = ajaxart.totext_array(ajaxart.runScriptParam(data,cntr.SoftSelector.GetValue,cntr.Context));
				for(var i=0;i<all_elems.length;i++)
					if (cntr.ItemId && key_to_select != "" && cntr.ItemId(all_elems[i].ItemData,all_elems[i]) == key_to_select) 
						ajaxart_uiaspects_select(jQuery(all_elems[i]),jQuery([]),"auto",cntr.Context);
			}

		    return [cntr.Ctrl];
	 	},
	 	Document: function (profile,data,context)
	 	{
	 		// assumption: ui.Document is not called in batch
		    var id = aa_string2id(aa_text(data,profile,'ID',context));
		    var fields = ajaxart.runsubprofiles(data,profile,'Field',context);
		    ajaxart.concat(fields,ajaxart.run(data,profile,'Fields',context));
		    
			var dataitems = ajaxart.run(data,profile,'Item',context);
			
			var operationsFunc = function(data1,ctx) { return ajaxart.run(data1,profile,'Operations',aa_merge_ctx(context,ctx)); }
			var aspectsFunc = function(data1,ctx) {
				var newContext = aa_merge_ctx(context,ctx);
				var cntr = ctx.vars._Cntr[0];
				var fields = cntr.Fields;
				
			    var aspects = ajaxart.run(data,profile,'Presentation',newContext);
			    ajaxart.concat(aspects,ajaxart.runsubprofiles(data,profile,'Aspect',newContext));
				for(var i=0;i<fields.length;i++)
				  if (fields[i].CntrAspects)
					aspects = aspects.concat(fields[i].CntrAspects);
				return aspects;
			}
			// TODO: change aspectsFunc to be an array and not a function [ make sure all aspects are written correctly ]
	 		var out = aa_uidocument(data,id,dataitems,fields,aspectsFunc,operationsFunc,context);
	 		ajaxart.databind([out],data,context,profile);
	 		out.Cntr.XtmlSource = [ {isObject :true, script :profile, input: data, context :context }];
	 		
	 		return [out];
	 	},
	 	UseGroupAsPage: function (profile,data,context)
	 	{
	 		return [{
	 			ID: 'inner_page',
	 			Fields: [],
	 			Control: function(data1,ctx) {
			 		var groupID = aa_text(data,profile,'Group',context);
			 		var cntr = ctx.vars._Cntr && ctx.vars._Cntr[0];
			 		if (!cntr)  { ajaxart.log('UseGroupAsPage: Can not find cntr','error'); return []; }
			 		var groupField = aa_fieldById(groupID,cntr.Fields);
			 		if (!groupField) ajaxart.log('Can not find group ' + groupID + ' in container ' + cntr.ID[0],'error');
			 		this.Fields = groupField ? [groupField] : [];

	 				var pageParams = ctx.vars._PageParams[0];
	 				var groupData = pageParams ? pageParams.DataItems[0].Items : data1;
//	 				var aspects = ajaxart.runScriptParam([],pageParams.Aspect,ctx); 
	 				if (groupField)
	 				  return groupField.Control(groupData,ctx);
	 				return [];
	 			}
	 		}];
	 	},
	 	ToggleClassByCondition:function (profile,data,context)
	 	{
	 		var elem = aa_first(data,profile,'Element',context);
	 		if (! ajaxart.ishtml_item(elem)) return [];
	 		var condition = aa_bool(data,profile,'ClassCondition',context);
	 		var cls = aa_text(data,profile,'Class',context);
	 		if (condition)
	 			jQuery(elem).addClass(cls);
	 		else
	 			jQuery(elem).removeClass(cls);
	 		return [];
	 	}
});

aa_gcs("uiaction",{
   GoToPage: function(profile, data, context)
   {
  	 var url = aa_text(data,profile,'Url',context);
  	 if (url == "") return;
  	 var type = aa_text(data,profile,'Type',context);
  	 var target = (type == 'navigate current page') ? "_top" : "_new";
     if (ajaxart.inPreviewMode == true) return [];
     
  	 if (target == "_new") {
//		var controls = ajaxart.getControlElement(context);
//		if (controls.length > 0 && !ajaxart.isattached(controls[0])) return data;
		target = "_blank";
  	 }
  	 window.open(url,target);
  	 return data;
   },
	AddClass: function(profile, data, context)
	{
		var classes = aa_text(data,profile,'Cls',context);
		var element = ajaxart.getControlElement(context,true);
		jQuery(element).addClass(classes);
		return data;
	},
   RunUiActions : function(profile, data, context)
   {
	    var actions = ajaxart.subprofiles(profile,'Action');
		var newContext = ajaxart.clone_context(context);
	    ajaxart.setVariable(newContext,"ControlElement",data);
	    var inp = ajaxart.getVariable(context,"InputForChanges");
	    for(var i=0;i<actions.length;i++)
	    	var subresult = ajaxart.run(inp,actions[i],"",newContext);
	    
	    return data;
   },
	SetText: function(profile, data, context)
	{
	    var text = aa_text(data,profile,'Text',context);
	    var mode = aa_text(data,profile,'Mode',context);
		
		var elements = ajaxart.getControlElement(context);
		if (elements.length == 0) return [];
	    var element = elements[0];
	    
	    if (jQuery(element).hasClass('aa_text')) { element.innerHTML = text; return;}
	    if (mode == "CharByChar")
	    {
	    	element.value = '';
	    	element.setAttribute('value','');
	    	for(var i=0;i<text.length;i++)
	    	{
	    		aa_xFireEvent(element, 'keydown', {keyCode: text.charCodeAt(i), CharByChar: true}, context.vars.InTest != null);
	    		aa_xFireEvent(element, 'keyup', {keyCode: text.charCodeAt(i), CharByChar: true}, context.vars.InTest != null);
	    	}
	    	return;
	    }

		var tag = element.tagName.toLowerCase(); 
		
		if (tag == "textarea" )
			element.value = text;
		else if (tag == "input")
		{
			if (mode == "ReplaceAll")
			{
				element.setAttribute("value",text);
				element.value = text;
			}
			else if (mode == "InsertAtCaret")
			{
                if ('selectionStart' in element) // W3C
                    element.value = element.value.substr(0, element.selectionStart) + text + element.value.substr(element.selectionEnd, element.value.length);
                else if (document.selection) { // IE
                    element.focus();
                    document.selection.createRange().text = text;
                }				
			}
			else if (mode == "InsertAtEnd")
			{
				element.value = element.value + text;
				element.setAttribute("value",element.value);
			}
		} else if (jQuery(element).hasClass("button_hyperlink_image"))
			{
				ajaxart.each(jQuery(element).find(">a"), function(a) { 
					jQuery(a).text(text); 
				} );
			}
			else if (tag == "div" || tag=="span" || tag=="button" || tag =="a")
				element.innerHTML = text;
		
		aa_inuiaction = true;
		
		if (! aa_bool(data,profile,'DoNotFireEvents',context))
		{
			aa_xFireEvent(element, 'keydown');
			aa_xFireEvent(element, 'keyup');
		}

		if (! aa_bool(data,profile,'StayInControl',context))
			aa_xFireEvent(element, 'blur', null);

		aa_inuiaction = false;
		return [];
	}
});

aa_gcs("uipref",{
	InCookies: function (profile,data,context)
	{
		var obj = {
		  GetProperty: function(data1,ctx) {
			var prefix = aa_totext(ctx.vars.Prefix);
			var property = aa_totext(ctx.vars.Property);
			var out = aa_valueFromCookie(prefix+property);
			if (out == null) return [];
			return [out];
		  },
		  SetProperty: function(data1,ctx) {
			var prefix = aa_totext(ctx.vars.Prefix);
			var property = aa_totext(ctx.vars.Property);
			var value = aa_totext(ctx.vars.Value);

			aa_writeCookie(prefix+property,value);
		  }
		}
		return [obj];
	},
	PrefValue: function (profile,data,context)
	{
		var prefix = aa_text(data,profile,'Prefix',context);
		var property = aa_text(data,profile,'Property',context);
		var out = ajaxart_getUiPref(prefix,property,context);
		if (out == null)
			return [];
		else
			return [out];
	},
	SetPrefValue: function (profile,data,context)
	{
		var prefix = aa_text(data,profile,'Prefix',context);
		var property = aa_text(data,profile,'Property',context);
		var value = aa_text(data,profile,'Value',context);
		ajaxart_setUiPref(prefix,property,value,context);
		return [];
	}
});

