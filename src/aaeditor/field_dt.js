ajaxart.load_plugin("field_dt","plugins/aaeditor/field_dt.xtml");
ajaxart.load_plugin("field_dt","plugins/aaeditor/feature_dt.xtml");
ajaxart.load_plugin("field_dt","plugins/aaeditor/field_dt_generators.xtml");
ajaxart.load_plugin("bart_dt_compress","plugins/aaeditor/bart_compress.xtml");
ajaxart.load_plugin("jbart_studio","plugins/aaeditor/jbart_studio.xtml");
ajaxart.load_plugin("","plugins/aaeditor/field_insert.xtml");
ajaxart.load_plugin("","plugins/generation_samples/simple_blank_sample.xtml");
ajaxart.load_plugin("","plugins/generation_samples/writable_table_sample.xtml");
ajaxart.load_plugin("","plugins/generation_samples/readonly_table_sample.xtml");
ajaxart.load_plugin("","plugins/generation_samples/list_sample.xtml");

jBart.studiobar = jBart.studiobar || {};

aa_gcs("field_dt", {
	TreeItemImage: function (profile,data,context)
	{
		if (!data[0] || data[0].nodeType != 1) return;
		if (data[0].getAttribute('image'))
			return [ajaxart.dynamicText([],data[0].getAttribute('image'),context)  ];
		
		var aspects = aa_xpath(data[0],'FieldAspect');
		for(var i=0;i<aspects.length;i++) {
			var ptDef = aa_component_definition(aspects[i].getAttribute('t'));
			if (ptDef && ptDef.getAttribute('fieldImage')) 
				return [ajaxart.dynamicText([],ptDef.getAttribute('fieldImage'),context)  ];
		}
		var ptDef = aa_component_definition(data[0].getAttribute('t'));
		if (ptDef && ptDef.getAttribute('image')) 
			return [ajaxart.dynamicText([],ptDef.getAttribute('image'),context)  ];
		
		return [aa_base_images() + '/studio/bullet1616.gif'];
	},
	SiblingFieldIDs: function (profile,data,context)
	{
		var field = aa_first(data,profile,'FieldXtml',context);
		var out = [], in_array = {};
		// get all fields under component, the closest fields before the far ones 
		var parents = jQuery(field).parents();
		for (var i=0;i< parents.length && parents[i].tagName != 'Component';i++) {
			var fields = aa_xpath(parents[i],'.//Field/@ID');
			for (var j=0;j<fields.length;j++) {
				var fn = fields[j].nodeValue;
				if (in_array[fn] || fn == field.getAttribute("ID")) continue;
				in_array[fn] = true;
				out.push(fn);
			}
		}
		return out;
	},
	SingleFieldNameToXtml: function (profile,data,context)
	{
		var editable = aa_bool(data,profile,'Editable',context);
		var name = aa_totext(data);
		var id = name.replace(/ /g,'_');
		name = aa_capitalize_each_word(name);
		
		var out = jBart.parsexml('<Field t="fld.Field" />',profile);
		out.setAttribute('FieldData',editable ? '%!@'+id+'%' : '%'+id+'%');
		jQuery(out).attr('ID',id).attr('Title',name);
		
		var fieldtype_str = '',fieldtype_t = editable ? 'fld_type.EditableText' : 'fld_type.Text';
		
		if ( name.indexOf('image') > -1 || name.indexOf('photo') > -1) {
			fieldtype_t = editable ? 'fld_type.EditableImage' : 'fld_type.Image';
		}
		
		fieldtype_str = fieldtype_str || '<FieldType t="' + fieldtype_t + '" />';
		out.appendChild( jBart.parsexml(fieldtype_str,out) );
		
		return [out];
	},
	FieldSampleData: function (profile,data,context)
	{
		var page = aa_first(data,profile,'Page',context);
		var field = aa_first(data,profile,'Field',context);
		var pageData = ajaxart.run(data,profile,'PageData',context);
		if (page == field) return pageData;
		
		var item = pageData[0];
		var dataitems = null;
		var fields = [];
		var iter = field;
		while (iter && iter != page) {
			if (iter.tagName == 'Field') fields.push(iter);
			iter = iter.parentNode;
		}
		fields = fields.reverse();
		
		for(var i in fields) {
			if (!item) return [];
			var field = ajaxart.run([],fields[i],'',context)[0];
			if (!field) continue;
			if (field.IsMultipleGroup) {
				var topData = field.FieldData([item],context);
				var items = field.InnerItems(topData,context)[0];
				item = items.Items[0];
			} 
			if (field.hasItemlistContainer) {
				var ctx2 = ajaxart.clone_context(context);
				aa_trigger(field,'ModifyInstanceContext',{ FieldData: [item], Context: ctx2 });
				var cntr = ctx2.vars.ItemListCntr[0];
				dataitems = cntr.Items;
			}
			if (field.IsItemList && dataitems) item = dataitems[0];
			if (field.IsFilterGroup && dataitems) item = dataitems[0];
			else if (field.FieldData) item = field.FieldData([item],context)[0];
		}
		if (!item) return [];
		return [item];
	},
	FieldsFromOtherPages: function (profile,data,context)
	{
		var out = [];
		var field = aa_first(data,profile,'FieldXtml',context);
		if (!field) return;
		var mypage = field;
		while (mypage.tagName != 'xtml' && mypage) mypage = mypage.parentNode;
		if (!mypage || !mypage.parentNode || mypage.parentNode.getAttribute('type') != 'jbart.MyWidgetPage') return;
		
		var ct = mypage.getAttribute('ContentType');
		var pages = aa_xpath(mypage.parentNode.parentNode,"Component[@type='jbart.MyWidgetPage']/xtml");
		for (var i=0;i<pages.length;i++) {
			var page = pages[i];
			if (page == mypage || page.getAttribute('ContentType') != ct) continue;
			var origin = 'page: ' + page.parentNode.getAttribute('id');
			var fields = aa_xpath(page,'Field');
			for(var j=0;j<fields.length;j++) {
				var newField = fields[j].cloneNode(true);
				newField.setAttribute('origin',origin);
				var id = newField.getAttribute('ID');
				if (id && aa_xpath(mypage,"Field[@ID='"+id+"']").length > 0)
				  newField.setAttribute('fieldExists',true);
				out.push(newField);
			}
		}
		return out;
	},
	ExistingFieldsToAdd: function (profile,data,context)
	{
	  var parentField = aa_first(data,profile,'ParentField',context);
	  var ct = aa_text(data,profile,'ContentType',context);
	  var parentPath = aa_text(data,profile,'ParentFieldPath',context);
	  
	  var out = [];
	  var currentFields = ajaxart_firstlevel_fields(parentField);
	  
	  var oldPages = context.vars._AppContext[0].Pages;
	  var pages = [];
	  
	  // refresh pages only of our content type (if new fields have been added in the GC)
	  for(var i=0;i<oldPages.length;i++) 
 	    if (ajaxart.totext_array(oldPages[i].ContentType)==ct)
 	    	pages.push( aa_first(data,oldPages[i].XtmlSource[0].script,'',context) );

	  var optionalFields = [];
	  
	  for(var i=0;i<pages.length;i++) {
		  var parent = ajaxart_subfield_bypath(pages[i],parentPath);
		  if (parent != null)
		    ajaxart.concat(optionalFields,ajaxart_firstlevel_fields(parent));
	  }
	  
	  for(var i=0;i<optionalFields.length;i++)
		  if (aad_object_byid(currentFields,optionalFields[i].Id) == null)
			  if (aad_object_byid(out,optionalFields[i].Id) == null)
			    out.push( optionalFields[i] );
	  
	  return out;
	},
	ComponentsOfTypeOptions: function (profile,data,context)
	{
		var out = { Options: [] };
		var components = ajaxart.runNativeHelper(data,profile,'Components',context);
		var current_pt = aa_text(data,profile,'CurrentPT',context), current_pt_added = false;
		
		for(var i=0;i<components.length;i++) {
			var comp = components[i];
			var option = { code: comp.ID, image: aa_jbart_image('/default1616.gif',context)};
			option.OptionPage = aa_first(data,profile,'OptionPage',context);
			option.text = aa_text_capitalizeToSeperateWords(comp.ID.split('.')[1]);
			
			if (comp.ID == current_pt) current_pt_added = true;
			out.Options.push(option);
		}
  	    // add current pt
	    if (current_pt != "" && ! current_pt_added) {
			  var option = { isObject: true, code: current_pt , image: aa_jbart_image('/default1616.gif',context), OptionPage: aa_first(data,profile,'OptionPage',context)};
			  option.text = aa_text_capitalizeToSeperateWords(current_pt.split('.')[1]);
			  out.Options.push(option);
	    }
		return [out];
	},
	ComponentsWithCategories: function (profile,data,context)  // TODO: it should be deprecated and deleted
	{
		var out = { isObject: true, IsTree: true, Options: [] };
		
		var generalCategory = { isObject: true, code: 'General', UnSelectable: true, IsCategory: true, Options: [] , image: aa_jbart_image('/folder-open.png',context)} 
		out.Categories = [ generalCategory ];
		var cache = {};
		var is_jbart = aa_isjbart();
		cache.General = generalCategory;
		if ( ! window.aaxtmldt_options_cache) {
			aaxtmldt_options_cache = {};
			  for (var i in ajaxart.components) {
				  if (i.lastIndexOf("_dt") == i.length-3 && i.length > 3 || i == "aaeditor") continue;
				  for(var j in ajaxart.components[i]) {
					  var comp = ajaxart.components[i][j];
					  if (comp.getAttribute('hidden') == 'true' || comp.getAttribute('type') == null) continue;
					  if (is_jbart && comp.parentNode.getAttribute('jbart') != 'true') continue;
					  if (is_jbart && comp.getAttribute('jbart') == 'false') continue;
					  var hide = comp.getAttribute('light') == 'false';
					  var types = comp.getAttribute('type').split(',');
					  for(var k=0;k<types.length;k++) {
						  if (types[k].split('.').length > 2) // e.g. data_items.Items.
							  types.push(types[k].substring(0,types[k].lastIndexOf('.')));
					  }
					  var category = comp.getAttribute('category');
					  if (category) types.push(types[0]+'.'+category);
					  
					  for(var k=0;k<types.length;k++) {
						var option = { isObject: true, code: ""+i+"."+j, Hidden: hide , image : aa_jbart_image('/default1616.gif',context)};
						option.text = aa_text_capitalizeToSeperateWords(j);
						option.Category = comp.getAttribute('category'); 
					    if (aaxtmldt_options_cache[types[k]] == null) aaxtmldt_options_cache[types[k]] = [];
					    aaxtmldt_options_cache[types[k]].push(option);
					  }
				  }
			 }
		}
		  
		// TBD: may be cached as well
		  var type = aa_text(data,profile,'Type',context);
		  if (type == '') return [];
		  var typeXml = ajaxart.types[type.replace('.','_')];
		  if (typeXml != null && typeXml.getAttribute('lightPTs') != null) {
			var pts = typeXml.getAttribute('lightPTs').split(',');
			out.Options = [];
			for (var i=0;i<pts.length;i++) {
			  var option = pts[i];
			  var text = aa_text_capitalizeToSeperateWords(option.substring(option.indexOf('.')+1));
			  out.Options.push({isObject:true, code: option, OptionPage: aa_first(data,profile,'OptionPage',context), text: text });
			}
			out.Categories = null;
			out.IsTree = false;
			return [out];
		  }
		  
		  var cachedOptions = aaxtmldt_options_cache[type];
		  if (cachedOptions == null) cachedOptions = [];
		  
		  var currentpt = aa_text(data,profile,'CurrentPT',context), current_pt_added = false;
		  
		  for(var i=0;i<cachedOptions.length;i++)
		  {
			  var option = {};
			  if (cachedOptions[i].Hidden) continue;
			  if (cachedOptions[i].code == currentpt) current_pt_added=true;
			  
			  for(var j in cachedOptions[i]) option[j] = cachedOptions[i][j];
			  if (option.code == currentpt) hasCurrentPT = true;
			  option.OptionPage = aa_first(data,profile,'OptionPage',context);
			  if (cachedOptions[i].Category == null) {
				  generalCategory.Options.push(option);
			  }
			  else
			  {
				  var catIds = cachedOptions[i].Category.split(',');
				  for(var j=0;j<catIds.length;j++)
				  {
					  var catId = catIds[j];
					  if (cache[catId] == null)
					  {
						  cache[catId] = { isObject: true, code: [catId], UnSelectable: true, IsCategory: true, Options: [] , image: aa_jbart_image('/folder-open.png',context)}
						  out.Categories.push(cache[catId]);
					  }
					  cache[catId].Options.push(option);
				  }
			  }
		  }
		  // add current pt
		  if (currentpt != "" && ! current_pt_added) {
			  var option = { isObject: true, code: currentpt , OptionPage: aa_first(data,profile,'OptionPage',context)};
			  option.text = aa_text_capitalizeToSeperateWords(currentpt.split('.')[1]);
			  generalCategory.Options.push(option);
		  }
		if (out.Categories.length == 1) { // only general - get rid of categories
			out.Options = out.Categories[0].Options;
			out.Categories = null;
			out.IsTree = false;
		}
		return [out];
	},
	CssXmlValueByRef: function (profile,data,context) {
		var cdataElement = aa_first(data,profile,'CssCDataElement',context);
		var cssAsXml = ajaxart.runNativeHelper(data,profile,'ParseCss',context)[0];
		if (!cssAsXml) return [];

		aa_unbindXmlChange(ajaxart.cssXmlValueByRefXmlChangeID);

		var identifier = aa_bindXmlChange(cssAsXml,function() {
			var cssText = aa_totext(ajaxart.runNativeHelper([cssAsXml],profile,'XmlToCss',context));
			if (cssText == aa_cdata_value(cdataElement)) return;

			aa_write_cdata(cdataElement,cssText);
			aa_run_delayed_action('refresh_from_css_xml',function() {
				ajaxart.run(data,profile,'OnChange',context);
			},100);
		}); 
		ajaxart.cssXmlValueByRefXmlChangeID = identifier;

		return [cssAsXml];
	},
	SyncFieldsData: function (profile,data,context)
	{
		var page = aa_first(data,profile,'PageXtml',context);
		var ct = page.getAttribute('ContentType');
		var out = [];
		var path = "";
		var appXtml = context.vars._AppContext[0].AppXtml[0];
		var pages = aa_xpath(appXtml,"Pages/Page[@ContentType='"+ct+"']");

		var fields = bartdt_subfields(page);
		
		for(var i=0;i<fields.length;i++) {
			var field = fields[i].Field;
			for(var j=0;j<pages.length;j++) {
				if (pages[j] == page) continue;
				var otherfield = bartdt_field_bypath(pages[j],fields[i].Path);
				if (!otherfield || ajaxart.xml2text(field) == ajaxart.xml2text(otherfield)) continue;
				var item = {isObject:true, Field: field, OtherField: otherfield, Page: page , OtherPage: pages[j] };
				out.push(item);
			}
		}
		return out;
	},
	ToEnglishPlural: function (profile,data,context)
	{
		var single = aa_totext(data);
		if (single == '') return [];
		var lastChar = single.charAt(single.length-1);
		if (lastChar == 's') return [single+'es']; 
		if (lastChar == 'y') return [single.substring(0,single.length-1)+'ies']; 
		return [single+'s'];
	},
	SelectedFieldInfo: function (profile,data,context)
	{
		var out = { isObject: true }
		var elem = context.vars._ElemsOfOperation[0];
		
		var path = "";
		while (elem.parentNode != null) {
			if (jQuery(elem).hasClass('aa_item')) {
				var field = elem.ItemData[0];
				if (field && field.getAttribute('ContentType') != null) {
					out.ContentType = field.getAttribute('ContentType');
					out.Path = [path];
					return [out];
				}
				if (field && field.getAttribute('Path') != null) {
					if (path != "")
					  path = field.getAttribute('Path') + "/" + path;
					else
					  path = field.getAttribute('Path');
				}
			}
			elem = elem.parentNode;
		}
		
		return [out];
	},
	GuessType: function (profile,data,context)
	{
		var samples = ajaxart.run(data,profile,'SampleData',context);
		var nums = 0;
		for (i in samples) {
			var val = ajaxart.totext_item(samples[i]);
			if (!isNaN(parseInt(val)) && isFinite(val))
				nums++;
		}
		if (samples.length > 0 && nums/samples.length > 0.8)
			return [aa_parsexml("<Type t='field_aspect.Number' />")];
		
		return [aa_parsexml("<Type t='field_type.Text' />")];
	},
	FieldTreeItemsDecorator: function (profile,data,context)
	{
		var dataItems = aa_first(data,profile,'DataItems',context);
		var parent = data[0];
		if (parent && parent.nodeType == 1) { 
			// look for t="ui.InnerPage"
			function findInnerPage(node) {
				for(var iter=node.firstChild;iter!=null;iter=iter.nextSibling) {
					if (iter.nodeType != 1 || iter.tagName == 'Field' || iter.tagName == 'xtml') continue;
					var t = iter.getAttribute('t'); 
					if (t == 'ui.InnerPage' || t == 'field.InnerPage' || t == 'ui.CustomStyleByField') return iter;
					var found = findInnerPage(iter);
					if (found) return found;
				}
				return null;
			}
			var innerPage = findInnerPage(parent);
			if (innerPage) {
				dataItems = dataItems || { Items: [] };
				dataItems.Items.push(innerPage);
			}
		}
		
		return dataItems ? [dataItems] : [];
	},
	ComponentInTable: function (profile,data,context)
	{
		var cssClass = aa_attach_global_css( aa_text(data,profile,'Css',context) );
		var xtml = aa_first(data,profile,'Xtml',context);
		var out = $("<div><span class='component_title'><span style='cursor:inherit' class='aa_field_toolbar_image xtmldt_toggle_left'/><span class='component_title_in_table' /></span><div class='place_holder' /></div>");
		out.addClass(cssClass);
		out.find(".component_title_in_table").text(aa_text([xtml],profile,'ComponentTitle',context));
		var has_params = ajaxart.tobool_array(ajaxart.runNativeHelper([xtml],profile,'HasParams',context));
		if (!has_params) return [out[0]];
		out.find(".xtmldt_toggle_left").attr("title",aa_text(data,profile,'TitleForExpand',context));
		out.find(".xtmldt_toggle_left").css("background",'url('+aa_text(data,profile,'ImageForExpand',context)+') no-repeat');
		out.find(".component_title").css("cursor","pointer");
		out.find(".component_title").click(function(e) {
	    	var elem = $( (typeof(event)== 'undefined')? e.target : event.srcElement  );
	    	if ($(elem).hasClass("doc_icon"))
	    		return true;
			if (this.Expanded) {
				this.Expanded = false;
				out.find(".place_holder").animate({height:'hide'},300);
				out.find(".xtmldt_toggle_left").attr("title",aa_text(data,profile,'TitleForExpand',context));
				out.find(".xtmldt_toggle_left").css("background",'url('+aa_text(data,profile,'ImageForExpand',context)+') no-repeat');
				out.find(".component_title_in_table").removeClass("expanded");
				out.find(".documentation").remove();
			} else {
				this.Expanded = true;
				out.find(".xtmldt_toggle_left").attr("title",aa_text(data,profile,'TitleForCollapse',context));
				out.find(".xtmldt_toggle_left").css("background",'url('+aa_text(data,profile,'ImageForCollapse',context)+') no-repeat');
				out.find(".place_holder").hide();
				out.find(".place_holder").children().remove();
				out.find(".component_title_in_table").addClass("expanded");
				out.find(".component_title").append(ajaxart.runNativeHelper([xtml],profile,'Documentation',context));
				var control = ajaxart.runNativeHelper([xtml],profile,'ParamsControl',context);
				jQuery(control).addClass('dt_intable_props');
				if (control.length)
					out.find(".place_holder").append(control[0]);
				out.find(".place_holder").animate({height:'show'},300,'swing', function() {
					aa_ensure_visible(control[0]);
				} );
				aa_element_attached(out.find(".place_holder")[0]);
			}
		});
		return [out[0]];
	},
	UpToPageDef: function(profile,data,context)
	{
		var xtml = aa_first(data,profile,'Xtml',context);
		if (xtml && xtml.nodeType != 1) xtml=ajaxart.xml.parentNode(xtml);
		var path = [];
		var prev = null;
		for(;xtml && xtml.nodeType == 1 ; xtml = xtml.parentNode) {
		  path.push(xtml.getAttribute('Title') || xtml.getAttribute('ID') || xtml.getAttribute('t'));
		  if (xtml.parentNode && xtml.parentNode.nodeType == 1 && xtml.parentNode.tagName == 'Component') break;
		}
		var result = aa_text(data,profile,'Result',context);
		var out = { isObject: true, Xtml: xtml, Path: path.reverse().join('/') }; 
		if (result == 'xtml') return [xtml];
		if (result == 'path') return [out.Path];
		return [out];
	},
	FixPercentagesInCss: function(profile,data,context) 
	{
		var text = aa_text(data,profile,'Text',context);
		var parts = text.split("%");
		for (var i in parts) {
			if (i < parts.length-1 && !isNaN(parseInt(parts[i].charAt(parts[i].length-1))) ) // if previous char is a digit, e.g 70% -> 70\%
					parts[i] += "\\";
		}
		return [parts.join("%")];
	},
	IsReadOnly: function(profile,data,context)
	{
		var field_xtml = aa_first(data,profile,'FieldXtml',context);
		for (var xtml = field_xtml; xtml != null; xtml=xtml.parentNode) {
			if (aa_xpath(xtml,"FieldAspect[@t='field_aspect.ReadOnly']")[0]) return ["true"];
			if (aa_xpath(xtml,"Aspect[@t='uiaspect.ReadOnly']")[0]) return ["true"];
		}
		return [];
	},
	RenameField: function(profile,data,context)
	{
		var elem = context.vars._ElemsOfOperation[0];
		var field = context.vars._ItemsOfOperation[0];
		var title = "" + field.getAttribute("Title");
		var new_title = prompt("Please enter a new title:",title);
		function title2id(title) {
			return ajaxart.totext(ajaxart.runNativeHelper([title],profile,'ID',context));
		}
		if (new_title && new_title != title) {
			if (field.getAttribute("ID") == title2id(title))
				field.setAttribute("ID",title2id(new_title));
			field.setAttribute("Title",new_title);
			jQuery(elem).children(".item_text").text(new_title);
			ajaxart.runNativeHelper(data,profile,'Refresh',context);
		}
		return [];
	}
});

aa_gcs('gstudio_insert',{
	GuessFieldsFromSampleData: function(profile,data,context) {
		var out = [],existing=[];
		var selected = aa_first(data,profile,'FieldXtml',context);
		if (!selected) return;
		var pt = aa_component_definition(selected.getAttribute('t'));
		if (! aa_xpath(pt,"Param[@name='Field']")[0]) selected = selected.parentNode;

		var previewContext;

		if (isItemlist(selected)) {
			var cntr = aadt_calcPrimitivePreviewContext(selected,'',context,{ probeItemList: true });			
			if (cntr) previewContext = cntr.Items;
		} else {
			previewContext = aadt_calcPrimitivePreviewContext(selected,'',context,{ probeFieldData: true });			
		}
		var top = previewContext && previewContext[0];
		if (!top) return;
		if (top.nodeType == 1) { // xml node

			for (var i=0;i<top.attributes.length; i++) {
				var attName = top.attributes.item(i).nodeName;
				addToResult(enrichItem({
					FieldData: '%@' + attName + '%',
					RWFieldData: '%!@' + attName + '%',
					SampleData: top.getAttribute(attName),
					Title: attName
				}));
			}

			// inner xml elements
			for(var child=top.firstChild;child;child=child.nextSibling) {
				if (!isPrimitiveElement(child)) continue;
				var tag = child.tagName;
				addToResult(enrichItem({
					FieldData: '%' + tag + '%',
					RWFieldData: '%!' + tag + '%',
					SampleData: aa_totext([child]),
					Title: tag
				}));
			}
		}
		return out.concat(existing);

		function addToResult(item) {
			var fieldDataExp = item.FieldData;
			if (aa_xpath(selected,"Field[@FieldData='"+fieldDataExp+"']")[0])
				existing.push(item);
			else
				out.push(item);
		}
		function isPrimitiveElement(xml) {
			if (!xml || xml.nodeType != 1) return false;
			if (xml.childNodes.length == 1 && xml.firstChild.nodeType == 3) return true;
			return false;
		}
		function enrichItem(item) {
			if (!item.Type) {
				item.Type = 'text';
				if (item.SampleData.match(/^[0-9.]+$/)) item.Type = 'number';
				if (item.SampleData.match(/[.]png$/)) item.Type = 'image';
			}
			item.Title = item.Title.replace(/_/g,' ');
			return item;
		}

		function isItemlist(xtml) {
			if (aa_totext(aa_xpath(xtml,'@t')) == 'field.ItemList') return true;
			return false;
		}
	}
});

ajaxart.gcs.bart_dt = 
{
	RefreshAfterTreeDrop: function (profile,data,context) {
		var droppedParent = context.vars._DND_DroppedItems[0].ParentXml;
		var originalParent = context.vars._DND_OriginalItems[0].ParentXml;

		// Finding the first common parent and refresh it
		var droppedParents = [droppedParent].concat($(droppedParent).parents().get());
		var originalParents = [originalParent].concat($(originalParent).parents().get());

		for (i=0; i<droppedParents.length; i++)
			for (j=0; j<originalParents.length; j++)
				if (droppedParents[i] == originalParents[j]) {
					jBart.studiobar.objectFromXtml(droppedParents[i]).Refresh([],context);
					return;
				}
		ajaxart.log("RefreshAfterTreeDrop - cannot find a common parent for dropped and original items");
	},
	XmlToOneJSLine: function (profile,data,context) {
		var result = ajaxart.xml.prettyPrint(data,'',true);
		result = result.replace(/\\/g,'\\\\');
		result = result.replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t');
		result = result.replace(/\'/g,'\\\''); // to js string
		return [result];	
	},
	AllFieldIDs: function (profile,data,context)
	{
		var topXml = ajaxart.runNativeHelper(data,profile,'TopXml',context)[0];
		var onlyCodes = aa_bool(data,profile,'OnlyCodes',context);
		var includePages = aa_bool(data,profile,'IncludePages',context);
		var out = [];
		var existing = {};
		var fieldPT = aa_text(data,profile,'FieldPT',context);
		var multipleFieldPTS = fieldPT.indexOf(',') > -1;
		if (multipleFieldPTS) fieldPT = ',' + fieldPT + ',';

		function find(elem) {
			if (!elem || elem.nodeType !=1) return;
			var page = includePages && elem.tagName == 'xtml' && ajaxart.totext_array(aa_xpath(elem,"../@type")) == 'jbart.MyWidgetPage';
			if ((elem.tagName == 'Field' || page) && elem.getAttribute('ID')) {
				var val = elem.getAttribute('ID');
				var text = elem.getAttribute('Title') || val;
				if (!existing[val]) {
					var t = elem.getAttribute('t');
					if (!fieldPT || fieldPT == t || (multipleFieldPTS && aa_in_textlist(fieldPT,t)) ) {
						if (onlyCodes)
							out.push(val);
						else
						    out.push({ code: val, text: text });
					}

				}
				existing[val] = true;
			}
			for(var iter=elem.firstChild;iter;iter=iter.nextSibling)
				find(iter);
		}
		find(topXml);
		
		if (onlyCodes)
			return out;
		else
			return [{ Options: out }];
	},
	PagePreview: function (profile,data,context)
	{
		var out = ajaxart.runNativeHelper(data,profile,'Control',context);
		var with_popups = jQuery(out).find('.aa_withpopup');
		for(var i=0;i<with_popups.length;i++) {
			var input = with_popups[i]; 
			var field = input.parentNode.Field;
			if (!field || !field.PopupContents) continue;
			var ctx = aa_ctx(input.ajaxart ? input.ajaxart.params : ajaxart.newContext() ,{_Input: [input]});
			var popupContents = field.PopupContents([],ctx)[0];
			var parent = jQuery(out).find('.aa_container')[0];
			if (popupContents && parent) { 
				parent.appendChild(jQuery('<div class="pagedt_pagebreak"/>')[0]);
				parent.appendChild(popupContents);
				jQuery(popupContents).css('height','300px').css('overflow','auto');
			}
		}
		return out;
	},
	CleanInspectSelectedObject: function (profile,data,context)
	{
		jBart.studiobar.object = null;
		aa_studio_showObjectElements(null);
	},
	ShowSelectedObjectElements: function (profile,data,context)
	{
		if (jBart.studiobar.object)
			aa_show_selected_object_marks();
	},
	HideSelectedObjectIndication: function (profile,data,context)
	{
		jQuery('.jbstudio_constant_selected_box').css('display','none');
	},
	RefreshSelectedObject: function (profile,data,context)
	{
		if (jBart.studiobar.object) {
			window.inJBartRefresh = true;
			try {
				if (jBart.studiobar.object.Refresh) jBart.studiobar.object.Refresh(data,context);
				aa_show_selected_object_marks();
			} catch(e) {
				ajaxart.logException(e);
			}
			window.inJBartRefresh = false;
		}
	},
	InspectSelectedObject: function (profile,data,context)
	{
		if (jBart.studiobar.object && jBart.studiobar.object.Xtml && jBart.studiobar.object.Xtml.tagName == 'dtnode') 
			return [jBart.studiobar.object]; // virual dt nodes under project properties
		
		if (jBart.studiobar.object) {
			var top_parent = jQuery(jBart.studiobar.object.Xtml).parents().slice(-1)[0];
			if (top_parent && aa_tag(top_parent) != 'bart_sample' && aa_tag(top_parent) != 'jbart_project' && aa_tag(top_parent) != 'xtml' && top_parent.getAttribute('_type') != "jbart_project")
				jBart.studiobar.object = null;
		}
		if (!jBart.studiobar.object) {
			if (!context.vars._AppContext) return [];
			jBart.studiobar.object = { isObject: true };
	        var app_xtml = context.vars._AppContext[0].AppXtml[0];
	        var regexResult = window.location.href.match(/wpage=([a-zA-Z0-9]+)/);
	        var widget_page = regexResult ? regexResult[1] : null;
	        var page = null;
	        if (widget_page)
	        	page = aa_xpath(app_xtml,"../../Component[@id='" + widget_page +"']/xtml")[0];
	        if (!page) {
		        var main_page = aa_totext(aa_xpath(app_xtml,"MainPage1/@t")).split(".")[1];
		        page = aa_xpath(app_xtml,"../../Component[@id='" + main_page +"']/xtml")[0];
		    }
	        if (!page)
	        	page = aa_xpath(app_xtml,"../../Component[@type='jbart.MyWidgetPage']/xtml")[0];
	        page = page || aa_xpath(app_xtml,"Pages/Page")[0];
			jBart.studiobar.object.Xtml = page;
			jBart.studiobar.object.Element = context.vars._AppContext[0].ControlHolder && context.vars._AppContext[0].ControlHolder[0];
			aa_show_selected_object_marks();
		}
		return [jBart.studiobar.object];
	},
	ListenToAltC: function (profile,data,context)
	{
		var altOn = false;
		ajaxart.jbStudioObject = context.vars._JBartStudio[0];

		if (!jBart.studiobar.altCListener) { // first time - listen to body
			$(document).keydown(function(e) {
		  		if (e.keyCode == 18) 
		  			altOn = true;
				
			  	if (e.keyCode == 67 && altOn) { // alt+c
			  		jBart.studiobar.altCListener();
			  	}
			  	if (e.keyCode == 78 && altOn) { // alt+n
			  		jBart.studiobar.altNListener();
			  	}
			});
		  $(document).keyup(function(event) { altOn = false; });
		}
		jBart.studiobar.context = context;
		jBart.studiobar.altCListener = function() {
			ajaxart.runComponent('bart_dt.Inspect',[],context);
		}
		jBart.studiobar.altNListener = function() {
			ajaxart.runComponent('bart_dt.InspectInfra',[],context);
		}
	},
	SetSelectedStudiobarObject: function (profile,data,context)
	{
		jBart.studiobar.object = jBart.studiobar.objectFromXtml(aa_first(data,profile,'Xtml',context));
		aa_show_selected_object_marks();
	},
	ResourcesContext: function (profile,data,context)
	{
	  var out = ajaxart.newContext();
		var bartContext = aa_var_first(context,'_AppContext');
	  try {
	    var resources = bartContext.Resources;
	    for(var i=0;i<resources.length;i++)
	      out.vars[ ajaxart.totext_array(resources[i].ID) ] = resources[i].Items;
	  } catch(e) {}
	  return [out];
	},
	StudioPopupLocation: function (profile,data,context)
	{
		var dlg = context.vars._Dialog[0];
		dlg.FixDialogPosition = function(firstTime) 
		{
			jQuery(this.Frame).show();		// shows before moving so offsetHeight,offsetWidth are correct
			if (firstTime) {	//align to right
				this.Frame.style.right = "3px";//screen.width - jFrame.width() - 19 - 5 + "px";
				this.Frame.style.top = "52px";
				this.Frame.style.position = 'fixed';
			}
			var other_popup_class = aa_text(data,profile,'Popup',context) == 'properties' ? 'aa_studio_tree' : 'aa_studio_properties';
			var other_popup = jQuery("." + other_popup_class);
			if (other_popup.length)	{ // fix collisions
				var our_right = parseInt(this.Frame.style.right.split('px')[0]);
				var our_left = our_right + this.Frame.offsetWidth;
				var other_right = parseInt(other_popup[0].style.right.split('px')[0]);
				var other_left = other_right + other_popup[0].offsetWidth; 
				if (other_left >= our_right && other_right <= our_left)	{// collision, we move
					if (other_right > this.Frame.offsetWidth)
						this.Frame.style.right = "3px";	// there is room, so we go right
					else
						this.Frame.style.right = other_left + 5 + "px";	// no room, go left to other popup
				}
			}
		}
	},
	PopupTreeLocation: function (profile,data,context)
	{
		  var dlg = context.vars._Dialog[0];
		  dlg.FixDialogPosition = function(firstTime) 
		  {
			  var top = 40;
			  var left = 50;
			  var jPopup = jQuery(this.Frame);
			  
			  if (jQuery(".aa_inspect_popup").length > 0) {
				  var padding = aa_int(data,profile,'Padding',context);
				  var inspect_popup = jQuery(".aa_inspect_popup")[0];
				  jPopup.show();		// shows before moving so offsetHeight,offsetWidth are correct
				  var screen = aa_screen_size();
				  var inspect_left = aa_absLeft(inspect_popup);
				  
				  if (inspect_left + inspect_popup.offsetWidth + this.Frame.offsetWidth + padding < screen.width)
					  left = inspect_left + inspect_popup.offsetWidth + padding + "px";
				  else
					  left = inspect_left - this.Frame.offsetWidth - padding + "px";
				  top = inspect_popup.style.top; 
			  }
			  this.Frame.style.top = top; 
			  this.Frame.style.left = left; 
			  this.Frame.style.position = 'fixed';
			  jPopup.show();		// shows before moving so offsetHeight,offsetWidth are correct
		  }
	},
	XtmlToJSon: function (profile,data,context)
	{
		var xtml = aa_first(data,profile,'Xtml',context);
		return [aa_xtml_to_json(xtml, "")];
	},
	PathToXtml: function (profile,data,context)
	{
		var path = aa_text(data,profile,'FieldPath',context);
		var xtml = aa_path_to_xtml(path,context);
		return xtml ? [xtml] : [];
	},
	XtmlToPath: function (profile,data,context)
	{
		var xtml = aa_first(data,profile,'Xtml',context);
		return [aa_xtml_to_path(xtml)];
	}
}
function aa_path_to_xtml(path,context) {
	var items = path.split("/");
	var page_id = items[0];
	if (!page_id) return null;
    var app_xtml = context.vars._AppContext[0].AppXtml[0] || context.vars._AppContext[0].AppXtml;
    page = aa_xpath(app_xtml,"../../Component[@id='" + page_id +"']/xtml")[0];
    if (!page) page = aa_xpath(app_xtml,"Pages/Page[@ID='" + page_id + "']")[0];
    if (!page) return null;
    var xpath = "";
    for (var i=1; i<items.length; i++) {
    	if (i>1)
    		xpath += "/";
    	xpath += "Field[@ID='" + items[i] + "']";
    }
    return xpath != "" ? aa_xpath(page,xpath)[0] : page;
}
function aa_xtml_to_path(xtml) {
	var path = "";
	for (current=xtml; current!=null; current=current.parentNode) {
		if (!current.getAttribute("ID")) return "";
		if (path != "")
			path = "/" + path;
		path = current.getAttribute("ID") + path;
		if (aa_tag(current) == 'xtml' || aa_tag(current) == 'Page') break;
	}
	return path;
}
function aa_xtml_to_json(element, indent, omit_tag)
{
	var by_tags = {};
	for (var child=element.firstChild; child!=null; child=child.nextSibling) {
		if (child.nodeType != 1) continue;
		var tag = aa_tag(child);
		if (by_tags[tag]) 	by_tags[tag].Count++;
		else				by_tags[tag] = {Count:1, Written:0};
	}
	var out = indent;
	if (!omit_tag) out += aa_tag(element) + ": ";
	out += "{ ";
	var first = true;
	for (var i=0; i<element.attributes.length; i++) {
		if (first) 	first = false;
		else		out += ", ";
		out += element.attributes[i].nodeName + ":" + '"' + element.attributes[i].nodeValue + '"';
	}
	if (element.getAttribute("t") == "xml.Xml" || element.getAttribute("t") == "ui.Html") {
		out += "\r" + indent + " ";
		return out + ', Xml: "' + ajaxart.xml.prettyPrint(ajaxart.childElem(element,"*"),"",true).replace('"','\"') + '" }';
	}
	for (var child=element.firstChild; child!=null; child=child.nextSibling) {
		if (child.nodeType == 1) {	// element
			if (first) 	first = false;
			else		out += ", ";
			out += "\r" + indent;
			var by_tag_obj = by_tags[aa_tag(child)];
			if (by_tag_obj.Count > 1 && by_tag_obj.Written == 0) out += aa_tag(child) + ": [ " + "\r";
			out += aa_xtml_to_json(child,indent + " ", by_tag_obj.Count > 1);
			by_tag_obj.Written++;
			if (by_tag_obj.Count > 1 && by_tag_obj.Written == by_tag_obj.Count) out += " ]";
		}
		if (child.nodeType == 4)	// cdata
			return out.substring(0,out.length-2) + '"' + child.nodeValue + '"';
	}
	out += " }";
	return out;
}
function aa_find_top_widget()
{
	var top_widget = jQuery(".gallery_runtime_screen");
	if (top_widget.length == 0) top_widget =  jQuery(".aa_preview");
	if (top_widget.length == 0) top_widget =  jQuery(".aa_widget");
	return top_widget;
}


function ajaxart_firstlevel_fields(field) {
	var out = [];
	for(var i=0;i<field.Fields.length;i++) {
		var subfield = field.Fields[i];
		if (subfield.IsVirtualGroup)
			ajaxart.concat(out,ajaxart_firstlevel_fields(subfield));
		else
			out.push(subfield);
	}
	return out;
}
function bartdt_subfields(page,path)
{
  var out = [];
  if (! path ) path="";
  var fields = aa_xpath(page,'Field');
  for(var i=0;i<fields.length;i++) {
	  var field = fields[i];
	  var item = { Field: field };
	  var newpath = field.getAttribute('Path') || "";
	  if (path == "") item.Path = newpath;
	  else if (newpath == "") item.Path = path; 
	  else item.Path = path + "/" + newpath;
	  
	  ajaxart.concat(out,bartdt_subfields(field,item.Path));
	  
	  if (item.Field.getAttribute('t') == 'field.XmlField' ) 
	    out.push(item);
  }
  return out;
}
function bartdt_field_bypath(page,path)
{
  var fields = aa_xpath(page,'Field');
  for(var i=0;i<fields.length;i++) {
	  var field = fields[i];
	  if (field.getAttribute('Path')==path) return field;
	  if (field.getAttribute('t')=='field.XmlField') {
		  if (field.getAttribute('Path') == "") {
			  var tryfield = bartdt_field_bypath(field,path);
			  if (tryfield) return tryfield;
		  }
		  if (path.indexOf(field.getAttribute('Path')+"/") == 0 )
			  return bartdt_field_bypath(field,path.substring(path.indexOf('/'+1)));
	  }
  }
  return null;
}
bartdt_captured_element = null;
function bartdt_inspect_element_ispage(el)
{
	if (! el.Cntr || !el.ajaxart || !el.ajaxart.params.vars._AppContext) return false;
	var page = bartdt_element_pageid(el);
	if (page == "" || page == "ItemList" || page == "runtime") return false;

	// old pages
	var pages = el.ajaxart.params.vars._AppContext[0].Pages;
	for(var i=0;i<pages.length;i++) {
	  if (pages[i].ID[0] == page) return true;	
	}
	// new pages
	var topXtml = el.ajaxart.params.vars._AppContext[0].AppXtml[0].parentNode.parentNode;
	if (aa_xpath(topXtml,"Component[@id='"+page+"']").length > 0 ) return true;
	
	return false;
}
function bartdt_element_pageid(el)
{
	var page = aa_totext(el.Cntr.ID);
	if (page.indexOf('__') == page.length-2) page = page.substring(0,page.length-2);  // remove ending __ (yaniv: do not know why I did that)  
	if (bartdt_capture_level == "sample" && page == "runtime") 
		return "";
	return page; 
	
//	var classes = el.className.split(' ');
//	for(var i=0;i<classes.length;i++)
//		if (classes[i].indexOf('Page_') == 0) {
//			var out = classes[i].substring(5); 
//			if (out.indexOf('_Details') == out.length-8) out = out.substring(0,out.length-8);
//			return out;
//		}
//	return "";
}
function bartdt_element_fieldid(el)
{
	if (!el) return "";
	var classes = el.className.split(' ');
	for(var i=0;i<classes.length;i++)
		if (classes[i].indexOf('fld_') == 0)
			return classes[i].substring(4);
	return "";
}

function aa_isjbart()
{
  if (typeof(aa_jbart) == "undefined" || ! aa_jbart) return false;
  return true;
}
aa_field_dt_dual_options = null;

aa_gcs("jbart_studio", {
	ToggleDesignTimeClass: function (profile,data,context)
	{
		var designTime = aa_bool(data,profile,'DesignTime',context);
		if (designTime) 
			jQuery('body').addClass('designtime');
		else 
			jQuery('body').removeClass('designtime');
	}
});
aa_gcs("bart_dt_compress", {
	DependentFunctions: function (profile,data,context)
	{
	  var code = aa_text(data,profile,'Code',context);
	  
	  var prefixes = [ 'aa_','aad_','ajaxart_','ajaxart.','ajaxart.xml.','ajaxart.cookies.', 'ajaxart.ui.','ajaxart.dialog.','jBart.utils.',
	                    'jBart.db.', 'jBart.', 'jBart.studiobar.', 'bartdt_', 'xtmldt_', 'aa_save_manager.', 'ajaxart.customsuggestbox.', 'ajaxart.suggestbox.', 'bart_', 'aadt_' ];
	  var out = [];
	  for (var t in prefixes) {
		  var prefix = prefixes[t];
		  var index=0, next, end, candidate;
		  while(true) {
			  next = code.indexOf(prefix,index);
			  if (next == -1) break;
			  end = code.indexOf("(",next);
			  if (end == -1) break;
			  var funcName = code.substring(next+prefix.length,end);
			  if (funcName.match(/^[a-zA-Z0-9_]+$/))
				  out.push(prefix + funcName);
			  index = next + prefix.length;
		  }
	  }
	  return out;
	},
	JSMinCompress: function (profile,data,context)
	{
		var script = aa_text(data,profile,'Script',context);
		var level = aa_text(data,profile,'Level',context);
		var comments = aa_text(data,profile,'Comments',context);
		
		var level_int = 2;
		if (level == "minimal") level_int=1;
		else if (level == "conservative") level_int=2;
		else if (level == "agressive") level_int=3;
		
		try {
			var out = jsmin(comments,script,level_int);
			if (out) return [out];
			else return [];
		} catch(e) {
			ajaxart.log('error in js compression '+e.message || e,'error');
			return [script];
		}
	},
	FindAllPts: function (profile,data,context)
	{
		var forNodeJS = aa_bool(data,profile,'ForNodeJS',context);
		var forEditor = aa_bool(data,profile,'ForEditor',context);
		var nodeJSNamespaces = ',data,action,xml,sample,yesno,jbart,jbart_resource,xtml,appfeature,http,object,text,async,';

		var xml = aa_first(data,profile,'Xtml',context);
		var rootXml = xml;
		var black_list = "," + aa_text(data,profile,'BlackList',context) + ",";
		
		var out = [];
		if (forEditor) {
			var compWhiteList = aa_totext(aa_xpath(context.vars._WidgetXml[0],'embed/@editorExtraComponents')).split(',');
			for(var i=0;i<compWhiteList.length;i++) out.push(compWhiteList[i]);
		}
		if (xml == null || xml.nodeType != 1) return [];
		function fill(xml) {
			if (xml.tagName == 'EnhanceGStudio' && xml.parentNode == rootXml && rootXml.tagName == 'file') return;
			if (xml.tagName == 'Component' && xml.getAttribute('compress') == 'false' && !forEditor) return;

			var pt = xml.getAttribute('t');
			if (pt && forNodeJS) {
				var ns = pt.split('.')[0];
				if (nodeJSNamespaces.indexOf(','+ns+',') == -1) return; // not of allowed namespaces
			}
			if (pt && black_list.indexOf("," + pt + ",") == -1) out.push(pt);
			for(var child = xml.firstChild;child;child = child.nextSibling)
				if (child.nodeType == 1) 
					fill(child);
		}
		fill(xml);
		return out;
	},
	JsInXtml: function (profile,data,context)
	{
		var out = [];
		var xtmls = ajaxart.run(data,profile,'Xtmls',context);

		for(var i=0;i<xtmls.length;i++)
			fill(xtmls[i]);

		return out;

		function fill(xml) {
			if (xml.nodeType == 1) { // fill in js in xtml
				var js = xml.getAttribute('Javascript') || xml.getAttribute('Code') || aa_cdata_value(aa_xpath(xml,"Javascript")[0]) || aa_cdata_value(aa_xpath(xml,"Code")[0]);
				if (js && js.indexOf('%') != 0) {
					out.push(js);
				}
			}
			for(var child = xml.firstChild;child;child = child.nextSibling)
				if (child.nodeType == 1) 
					fill(child);
		}

	},
	CompressComponent: function (profile,data,context)
	{
		var comp = aa_first(data,profile,'Component',context);
		var out = aa_createElement(comp, 'C');
		out.setAttribute("id", comp.getAttribute("id"));
		if (comp.getAttribute("execution"))
			out.setAttribute("execution", comp.getAttribute("execution"));
		
		for (var elem = comp.firstChild; elem != null; elem=elem.nextSibling ) {
    		if (elem.nodeType == 1) {
    			if (aa_tag(elem) != 'Param')
    				out.appendChild(aa_importNode(elem,out));
    			else {	// Param
    				var param = aa_createElement(out, 'Param');
    				param.setAttribute("name", elem.getAttribute("name"));
    				if (elem.getAttribute("script"))
        				param.setAttribute("script", elem.getAttribute("script"));
    				var defaultVal = ajaxart.childElem(elem,"Default");
    				if (defaultVal != null)
        				param.appendChild(aa_importNode(defaultVal,param));
    				out.appendChild(param);
    			}
    		}
		}
		return [out];
	},
	FunctionDefinition: function (profile,data,context) {
		var name = aa_text(data,profile,'Name',context);
		var func = '';
		try {
			func = '' + eval(name);
		}
		catch (e) {}
		return [func];
	},
	ContentOfGC: function(profile,data,context) {
		var id = ajaxart.totext_array(data);
		var middlePos = id.indexOf('.');
		var ns = id.substring(0,middlePos);
		var compName = id.substr(middlePos+1)
		var content;
		if (ajaxart.gcs[ns] && ajaxart.gcs[ns][compName])
			return [compName + ":" + ajaxart.gcs[ns][compName]];
		else
			return [''];
	},
	JsFunctionCode: function(profile,data,context) {
		var funcName = ajaxart.totext_array(data);
		if (funcName.indexOf('.') == -1) {
			if (!window[funcName]) return;
			var func_str = '' + window[funcName];
			if (func_str.indexOf('function (') == 0)
				return ['function ' + funcName + ' ' + func_str.substring(8)];
		    else
		        return [func_str];
		}
		else
		    return [funcName + ' = ' + eval(funcName)];
	}
});

aa_gcs("addfield_dt",{
	ParentXtml: function(data,profile,context)
	{
		jbartstudio_ensure_object(context);
		var xtml = jBart.studiobar.object && jBart.studiobar.object.Xtml;
		if (!xtml) return [];
		if (!jbartstudio_is_group(xtml)) xtml = xtml.parentNode;
		return [xtml];
	}
});

aa_gcs("fieldgenerator_dt",{
	SuggestFieldsFromSampleData: function(profile,data,context)
	{
		var out = [];
		var sampleData = aa_first(data,profile,'SampleData',context);
		if (!sampleData) return;
		var itemListTagsAdded = {};
		
		if (sampleData.nodeType == 1) { // xml
			for (var i=0; i<sampleData.attributes.length; i++) {
				var attr = sampleData.attributes.item(i).name;
				addSuggestion({ id: attr, path: '@'+attr, sample: sampleData.getAttribute(attr) });
			}
			for(var child=sampleData.firstChild;child;child=child.nextSibling) {
				if (child.nodeType != 1) continue;
				if (isPrimitiveElement(child))
					addSuggestion({ id: child.tagName, path: child.tagName , sample: jQuery(child).text() });
				else if (isItemList(child)) {
					if (!itemListTagsAdded[child.tagName])
					  addSuggestion({ id: child.tagName, path: child.tagName, isItemlist: true });
					itemListTagsAdded[child.tagName] = true;
				} else
					addSuggestion({ id: child.tagName, path: child.tagName, isSection: true });
			}
		}
		return out;
		
		function isItemList(element) {
			var siblingsWithSameTag = aa_xpath(sampleData,element.tagName);
			return siblingsWithSameTag.length > 1;
		}
		function isPrimitiveElement(element) {
			return jQuery(element).text().trim() != '';
		}
		function addSuggestion(settings) {
			settings.title = settings.title || aa_capitalize_each_word(settings.id.replace(/_/g,' '));
			settings.isSection = settings.isSection ? 'true' : 'false';
			settings.sample = settings.sample || '';
			if (!settings.type) {
				var id1 = settings.id.toLowerCase();
				if (hasInnerText(id1,['image','photo','simg'])) settings.type = 'image';
				if (hasInnerText(settings.sample,['.jpg','.png','.gif'])) settings.type = 'image';
				
				settings.type = settings.type || 'text';
			}
						
			out.push(settings);
		}
		function hasInnerText(str,arr) {
			for(var i=0;i<arr.length;i++)
				if (str.indexOf(arr[i]) > -1) return true;
			return false;
		}
	}
});

aa_gcs("feature_dt",{
	FieldSpecificFeatureContexts: function (profile,data,context)	{
		var xtml = aa_first(data,profile,'FieldXtml',context);
		var currentContext = xtml ? aa_feature_dt_findCurrentContext(xtml) : '';
		var out = [];
		var contextArr = aa_split(currentContext,',',true);
		for(var i=0;i<contextArr.length;i++) {
			var aspectCtx = contextArr[i];
			var title = aspectCtx;
			var name = aspectCtx.split('=')[0];
			var val = aspectCtx.split('=')[1] || '';

			if (name == 'FieldComponent') title = val.split('.')[1];
			if (name == 'parentFieldComponent') title = val.split('.')[1] + ' child ';
			if (name == 'FieldTypeComponent') title = val.split('.')[1];
			if (aspectCtx == 'FieldType=editable') title = 'Editable field';
			if (aspectCtx == 'ItemListContainer=true') title = 'Itemlist container';
			if (aspectCtx == 'InItemList=true') title = 'itemlist field';
			if (aspectCtx == 'InItemListContainer=true') title = 'Itemlist container context';
			if (aspectCtx == 'inFilterGroup=true') title = 'Filter';
			if (aspectCtx == 'pageForStudio=true') title = 'Page in studio';

			out.push({ ID: aspectCtx, Title: '+ Add ' + title + ' Feature'});
		}
		return out;
	},
	AspectHasContext: function (profile,data,context)	{
		var pt = aa_text(data,profile,'Component',context);
		var ofContext = ',' + aa_text(data,profile,'OfContext',context) + ',';
		var compContext = pt && aa_component_definition(pt).getAttribute('context');
		if (!compContext) return [];
		
		var hasContext = aa_feature_dt_aspect_has_context(ofContext,compContext);
		return (!hasContext) ? [] : ['true'];
	},
	NotEmptyFeatureContext: function (profile,data,context)	{
		var ofContext = aa_text(data,profile,'OfContext',context);

		ajaxart.cache = ajaxart.cache || {};
		if (!ajaxart.cache.featureContext) {
			ajaxart.cache.featureContext = {};

			var plugins = (context.vars._WidgetXml) ? aa_totext( aa_xpath(context.vars._WidgetXml[0],'@plugins') ) : '';
			var cacheName = 'cache_'+plugins+'_light';

			if (!jBart.vars.compsOfTypeCache || ! jBart.vars.compsOfTypeCache[cacheName])
				aa_run_component('feature_dt.BuildFeatureDTCache',[],context);

			var components = jBart.vars.compsOfTypeCache[cacheName]['field.FieldAspect'];
			for(var i=0;i<components.length;i++) {
				var compDef = components[i].Definition;
				var contextArr = aa_split(compDef.getAttribute('context') || '',',',true);
				for(var j=0;j<contextArr.length;j++)
					ajaxart.cache.featureContext[contextArr[j]] = true;
			}
		}
		return aa_frombool(ajaxart.cache.featureContext[ofContext]);
	},
	AddFeatureFieldOptions: function (profile,data,context)	{
		var genericPromoted = ',field_feature.Css,field_aspect.HidePropertyTitle,field_feature.Hidden,field_feature.HiddenTableColumn';

		var xtml = aa_first(data,profile,'FieldXtml',context);
		var ofContext = aa_text(data,profile,'OfContext',context);
		if (ofContext) ofContext = ',' + ofContext + ',';
		var currentContext = xtml ? aa_feature_dt_findCurrentContext(xtml) : '';

		var plugins = (context.vars._WidgetXml) ? aa_totext( aa_xpath(context.vars._WidgetXml[0],'@plugins') ) : '';
		var cacheName = 'cache_'+plugins+'_light';
		
		if (!jBart.vars.compsOfTypeCache || ! jBart.vars.compsOfTypeCache[cacheName])
			aa_run_component('feature_dt.BuildFeatureDTCache',[],context);
		
		var components = jBart.vars.compsOfTypeCache[cacheName]['field.FieldAspect'];
		var out = [];

		var promotedArr = aa_split(genericPromoted,',',true);
		for(var i=0;i<promotedArr.length;i++) {
			var def = aa_component_definition(promotedArr[i]);
			if (!ofContext && aa_feature_dt_aspect_has_context(currentContext,def.getAttribute('context'))) 
				out.push({ ID: promotedArr[i],Definition: def });
		}

		for(var i=0;i<components.length;i++) {
			var compContext = components[i].Definition.getAttribute('context');
			if (ofContext && (!compContext || !aa_feature_dt_aspect_has_context(ofContext,compContext)))  continue;

			var doesHaveContext = aa_feature_dt_aspect_has_context(currentContext,compContext);
			if (doesHaveContext && !isGenericPromoted(components[i].ID)) {
				out.push(components[i]);
			}
		}

		return out;

		function isGenericPromoted(id) {
			return (','+id+',').indexOf(genericPromoted) > -1;
		}

	}
});

aa_gcs("bart_dt_custom", {
	DoMakeInnerPageGlobal: function(profile,data,context) {
		var innerFieldXtml = aa_first(data,profile,'InnerFieldXtml',context);
		var pageID = aa_text(data,profile,'NewPageID',context);

		var appXtml = context.vars._AppContext[0].AppXtml;
		var pageXtml = jBart.parsexml('<Component/>',appXtml);
		var xtmlRoot = jBart.parsexml('<xtml t="control.Layout"/>',appXtml);
		$(pageXtml).attr('id',pageID).attr('type','jbart.MyWidgetPage');
		pageXtml.appendChild(xtmlRoot);
		$(xtmlRoot).attr('ID',pageID).attr('Title',pageID);
		while (innerFieldXtml.firstChild) xtmlRoot.appendChild(innerFieldXtml.firstChild);

		var pageDataAspect = jBart.parsexml('<FieldAspect t="field_aspect.PagePreviewData" />',appXtml);
		pageXtml.appendChild(pageDataAspect);

		appXtml.parentNode.parentNode.appendChild(pageXtml);
		ajaxart.components['sample'][pageID] = pageXtml;

		var newFieldXtml = jBart.parsexml('<Xtml t="control.Page" />',appXtml);
		$(newFieldXtml).attr('Title',pageID);
		newFieldXtml.appendChild(jBart.parsexml('<Page t="sample.'+pageID+'"/>',appXtml));
		ajaxart.xml.copyElementContents(innerFieldXtml,newFieldXtml);
	}
});

function aa_feature_dt_aspect_has_context(currentContext,aspectContext) {
	if (!aspectContext) return true;
	var aspectContextStr = ',' + (aspectContext || '') + ',';
	var aspectContextArr = aa_split(aspectContextStr,',',true);
	for(var i=0;i<aspectContextArr.length;i++)
		if (currentContext.indexOf(','+aspectContextArr[i]+',') > -1)
			return 'promoted';

	return false;	
}

function aa_feature_dt_findCurrentContext(xtml) {
	var t = xtml.getAttribute('t');
	var outContext = ',FieldComponent='+t;
	var parent = xtml.parentNode && xtml.parentNode.tagName == 'Field' && xtml.parentNode.getAttribute('t');
	if (parent && parent !='control.Layout') outContext += ',parentFieldComponent='+parent;

	var typeComp = aa_totext(aa_xpath(xtml,'FieldType/@t'));
	if (typeComp) {
		outContext += ',FieldTypeComponent=' + typeComp;
		var typeCompDef = aa_component_definition(typeComp);
		if (typeCompDef.getAttribute('editable') == 'true') outContext += ',FieldType=editable';
	}

	if (xtml.getAttribute('t') == 'field.ItemListContainer') outContext += ',ItemListContainer=true';
	if (aa_xpath(xtml,"FieldAspect[@t='field_aspect.ItemListContainer']")[0]) outContext += ',ItemListContainer=true';
	if (aa_totext(aa_xpath(xtml,"../@type")) == 'jbart.MyWidgetPage') outContext += ',pageForStudio=true';

	// go over parents, and go up only if it's layout
	var stop;
	for(var iter=xtml.parentNode;iter && !stop;iter=iter.parentNode) {
		stop=true;

		var t = (iter.nodeType == 1) && iter.getAttribute('t');
		if (t == 'field.ItemList') outContext += ',InItemList=true';
		if (t == 'field.ItemListContainer') outContext += ',InItemListContainer=true';
		if (aa_xpath(iter,"FieldAspect[@t='field_aspect.ItemListContainer']")[0]) outContext += ',InItemListContainer=true';
		if (aa_xpath(iter,"FieldAspect[@t='itemlist_aspect.FilterGroup']")[0]) outContext += ',inFilterGroup=true';

		if (t == 'control.Layout' || t == 'field.DynamicFields') stop = false;
	}

	return outContext + ',';
}

jBart.studiobar.pageId2pageXtml = function(pageID)
{
	if (pageID == "" || pageID == "ItemList" || pageID == "runtime") return null;
	if (!jBart.studiobar.context.vars._WidgetXml) return '';
	
	// old pages
	var widget_xml = jBart.studiobar.context.vars._WidgetXml[0];
	var bartdev = aa_xpath(widget_xml,"bart_dev")[0] || widget_xml;
	var result = aa_xpath(bartdev,"db/bart_unit/bart_unit/Component[@id='"+pageID+"']/xtml");	// new pages
	if (result.length > 0) return result[0];
	result = aa_xpath(bartdev,"db/bart_unit/bart_unit/Page[@id='"+pageID+"']");	// old pages
	if (result.length > 0) return result[0];
	return null;
}
jBart.studiobar.isXtmlInWidget = function(xtml)
{
	if (!xtml) return false;
	var iter = (xtml.nodeType == 2) ? aa_xpath(xtml,'..')[0] : xtml;
	for(;iter && iter.nodeType == 1;iter = iter.parentNode) {
		if (iter.tagName && iter.tagName == 'bart_sample' && iter.getAttribute('_type') == 'bart_sample') return true;
		if (iter.tagName && iter.tagName == 'file' && iter.getAttribute('_type') == 'jbart_project') return true;
		if (iter.tagName && iter.tagName == 'jbart_project' && iter.getAttribute('_type') == 'jbart_project') return true;
		if (iter.tagName && iter.tagName == 'bart_dev' && iter.getAttribute('id') != 'bartgallery') return true;
		if (iter.tagName && iter.tagName == 'xtml' && iter.getAttribute('altc') == 'true') return true;
	}
	return false;
}
jBart.studiobar.objectFromXtml = function(xtml)
{
	var object = { Xtml: xtml}
	if (xtml && xtml.nodeType == 1 && xtml.tagName == 'Field') {
		object.Elements = jBart.studiobar.ElementsFromXtml(xtml);

		if (object.Elements[0]) {
			object.Field = object.Elements[0].Field;
			object.Title = object.Field && object.Field.Title;
			object.Data = object.Elements[0].Data || object.Elements[0].FieldData;
		}
	}
	jBart.studiobar._addRefreshMethod(object);
	return object;
}
jBart.studiobar.ElementsFromXtml = function(xtml)
{
	var id = xtml && xtml.getAttribute('ID');
	if (!id) return [];
	var elems = jQuery('.fld_'+id);
	var elements = [];
	for(var i=0;i<elems.length;i++) {
		try {
		  if (elems[i] && elems[i].Field && elems[i].Field.XtmlSource && elems[i].Field.XtmlSource[0].script == xtml)
			  elements.push(elems[i]);
		  else if (elems[i] && elems[i].ajaxart && elems[i].ajaxart.script == xtml)
			  elements.push(elems[i]);
		} catch(e) {}
	}
	if (!elements.length && (xtml.parentNode && xtml.parentNode.getAttribute("type") == "jbart.MyWidgetPage")
			|| aa_tag(xtml) == 'Page') {
		elems = jQuery('.Page_'+ id);
		for(var i=0;i<elems.length;i++)
			elements.push(elems[i]);
	}
		
	return elements;
}
jBart.studiobar._addRefreshMethod = function(object)
{
	object.Refresh = function(data,ctx) {
		var xtml = this.Xtml;
		if (!xtml) return;
		if (ctx.vars.RefreshParent && ctx.vars.RefreshParent[0] == "true") xtml = xtml.parentNode;
		if (!xtml) return;
//		if (!this.Elements) return;
		var timeLimit = 30;
		var action_id = 'StudioRefresh ' + (xtml.nodeType == 1 ? xtml.getAttribute("id") : '');
		aa_cancel_delayed_action(action_id);
		var elems = jBart.studiobar.ElementsFromXtml(xtml);
		if (elems.length==0) {	// go up in xtml until finding element
			for (var cur_xtml = xtml; !elems.length && cur_xtml && aa_tag(cur_xtml) != 'Component'; cur_xtml=cur_xtml.parentNode)
				elems = jBart.studiobar.ElementsFromXtml(cur_xtml);
		}
		if (elems.length==0 && xtml.getAttribute("ID"))
			elems = jQuery(".fld_" + xtml.getAttribute("ID"));	// huristic: take the first occurrence, when no elem
		if (elems.length==0 && jBart.studiobar.context) {
			if (jBart.studiobar.context.vars._BartDevDtContext)
				jBart.studiobar.context.vars._BartDevDtContext[0].Refresh([],jBart.studiobar.context);
			else {
				jBart.studiobar.context.vars._JBartStudio[0].Refresh();
			}
			return;
		}
		if (elems[0] && elems[0].Field) {
			function refresh_elems(start_from,elems) {
				var startTime = new Date().getTime();
				for (var i=start_from; i<elems.length; i++) {
					if ((new Date().getTime() - startTime) > timeLimit) { // continue async
						aa_run_delayed_action(action_id,function() { refresh_elems(i,elems); });
						return;
					}
					elem = elems[i];
					if (elem.Field) {
						if (elem.Field.XtmlSource) {
							var xtmlSource = elem.Field.XtmlSource[0];
							var newField = aa_first(xtmlSource.input,xtmlSource.script,'',xtmlSource.context);
							newField.counter = ++ajaxart.unique_number;
							if (newField) {
								var td = jQuery(elem).hasClass('aa_cell_element') ? elem : jQuery(elem).parents('.aa_cell_element')[0];
								if (td && td.Field == elem.Field) td.Field = newField;
								elem.Field = newField;
							}
						}
						var elemContext = elem.jbContext;
						if (!elemContext && elem.parentNode) elemContext = elem.parentNode.jbContext;
						
						if (elemContext) aa_refresh_cell(elem,elemContext);
					}
				}				
			}
			ajaxart.inStudioRefresh = true;
			try {
				refresh_elems(0,elems);
			} catch(e) {}
			ajaxart.inStudioRefresh = false;
		}
		else if (elems[0] && elems[0].Cntr && elems[0].ajaxart)	// Xtml is a container and not a field
			object.Elements = [jBart.utils.refresh(elems[0])];
//		else if (elems.length>0) {	// Heuristic: take the first elem and find its parent container
//			var elem = elems[0];
//			var parents = jQuery(elem).parents('.aa_container').get();
//			parents = [elem].concat(parents);	// including ourself
//			for(var i=0;i<parents.length;i++) {
//				var cntrElem = parents[i];
//				if (cntrElem && cntrElem.ajaxart) {
//					jBart.utils.refresh(cntrElem);
//					return;
//				}
//			}
//		}
		refreshPopups();
	}

	function refreshPopups() {
		var styleDlg = jQuery('.jbstudio_style_dialog')[0];
		if (styleDlg && styleDlg.jbStyleXtml  && aa_totext(aa_xpath(styleDlg.jbStyleXtml ,'../@t')) == 'popup.OpenPopup') {
			var popups = aa_popupsForPreview();
			for(var i=0;i<popups.length;i++) {
				popups[0].RefreshPreview();
			}
		}
	}
}
// objectFromElement should work for the following elements:
// page ,group, multiple group, table cell, table title, property sheet title, property sheet value, operation, field control 
jBart.studiobar.objectFromElement = function(element)
{
	for(var el=element;el && el.nodeType == 1;el = el.parentNode)
	{
		var object = { isObject: true, Elements: [el], Field: el.Field };
		jBart.studiobar._addRefreshMethod(object);
		
		if (el.Field && el.Field.XtmlSource) {
			object.Field = el.Field; 
			object.Xtml = el.Field.XtmlSource[0].script;
			var xtmlInWidget = jBart.studiobar.isXtmlInWidget(object.Xtml);
			if ((bartdt_capture_level != "infra" && !xtmlInWidget) || (bartdt_capture_level == "infra" && xtmlInWidget)) continue;
			
			object.Data = el.Data || el.FieldData;
			object.Title = el.Field.Title;
			
			return object;
		}
		if (el.Cntr) {
			var pageID = aa_totext(el.Cntr.ID);
			if (pageID.indexOf('__') == pageID.length-2) pageID= pageID.substring(0,pageID.length-2);  

			object.Xtml = jBart.studiobar.pageId2pageXtml(pageID);
			if (!object.Xtml) continue;

			var xtmlInWidget = jBart.studiobar.isXtmlInWidget(object.Xtml);
			if ((bartdt_capture_level != "infra" && !xtmlInWidget) || (bartdt_capture_level == "infra" && xtmlInWidget)) continue;
			
			object.Data = el.Cntr.Items.Items;
			object.Title = 'Page ' + pageID;
			return object;
		}
		if (jQuery(el).hasClass('aa_operation')) {
			object.Xtml = el.ajaxart.data[0].XtmlSource[0].script
			var xtmlInWidget = jBart.studiobar.isXtmlInWidget(object.Xtml);
			if ((bartdt_capture_level != "infra" && !xtmlInWidget) || (bartdt_capture_level == "infra" && xtmlInWidget)) continue;
			
			object.Data = [];
			object.Title = el.ajaxart.data[0].Id;
			return object;
		}
	}
	return null;
}


function jbartstudio_ensure_object(context)
{
	if (jBart.studiobar.object) return;
	var appXtml = context.vars._AppContext[0].AppXtml;
	var mainPage = aa_xpath(appXtml,"../../Component[@id='main']/xtml")[0];
	if (mainPage) {
		jBart.studiobar.object = { Xtml: mainPage };
	}
}

function jbartstudio_is_group(xtml)
{
  var t = xtml.getAttribute('t');
  var pt = aa_component_definition(t);
  if (pt && aa_xpath(pt,"Param[@name='Field']")[0]) return true;
  if (pt && aa_xpath(pt,"Param[@name='Fields']")[0]) return true;
 
  return false;
}
