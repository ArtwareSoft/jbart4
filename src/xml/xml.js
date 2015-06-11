ajaxart.load_plugin("xml");

aa_gcs("xml", {
	XmlToText: function(profile, data, context) {
		if (!data[0]) return [''];
		if (!data[0].nodeType) {
			try {
			  return [JSON.stringify(data[0])];
			} catch(e) {
				return aa_totext(data);
			}
		}
//	    if (!data[0] || !data[0].nodeType) return [ aa_totext(data) ];
		var pretty_print = aa_bool(data,profile,'PrettyPrint',context);
		var escape = aa_bool(data,profile,'Escape',context);
		if (data.length == 0) return [];
		if (! ajaxart.isxml(data[0]))
			return data[0];
		
		if (pretty_print)
			return [ ajaxart.xml.prettyPrint(data[0]) ];
		else
			return [ ajaxart.xml2text(data[0]) ];	
	},
	TextToXml: function(profile, data, context) {
		var xml = data[0];
		if (xml && xml.nodeType == 1) return [xml];
		if (xml && xml.nodeType == 9 && xml.documentElement) return [xml.documentElement];
		return [aa_parsexml(ajaxart.totext(data),"TextToXml",null,true)];
	},
	ParseXmlCleanNamespaces: function(profile, data, context) {
		var text = aa_text(data,profile,'XmlAsText',context);
		var cleanXml = aa_clean_xml_namespaces(text);
		return [aa_parsexml(cleanXml)];
	},
	XmlToJson: function(profile, data, context) {
		var xml = aa_first(data,profile,'Xml',context);
		return [aa_xml2JSON(xml)];
	},
	JSONToXml: function(profile, data, context)
	{
		var tag = aa_text(data,profile, 'Tag', context);
		var obj = aa_first(data,profile, 'JSON', context);
		if (typeof obj == 'object') {
			obj = jQuery.extend({}, obj); // clone
			delete obj.XtmlSource;
		}
		if (typeof obj != 'object' && aa_text(data,profile, 'InputFormat', context) != 'Object')
			obj = ajaxart.totext_item(obj);
		var xml = obj && aa_JSON2Xml(obj,tag);
		return xml ? [xml] : [];
	},
	CSVToXml: function(profile, data, context)
	{
		var xml = aa_CSV2Xml(aa_text(data,profile, 'CSV', context));
		if (xml)
			return [xml];
		return [];
	},
	XPath: function(profile, original_data, context) {
		var xpath = aa_text(original_data,profile, 'XPath', context);
		var createIfNotExist = aa_bool(original_data,profile, 'CreateIfDoesNotExist', context);
		var def = aa_text(original_data,profile, 'DefaultValue', context);
		var data = ajaxart.run(original_data,profile, 'From', context);
		if (data == null) data = original_data;
		
		if (xpath == "") return data;
		
		if (! ajaxart.isxml(data) || xpath == "") return [];
		var result = aa_xpath(data[0],xpath,createIfNotExist,def);
		return result;
	},
	XPathFromList: function(profile, data, context) {
		var xpath = aa_text(data,profile,'XPath',context);
		var list = ajaxart.run(data,profile,'List',context);

		if (xpath == "") return list;
		
		var isAttr = (xpath.charAt(0) == '&');
		var attr = "";
		if (isAttr) attr = xpath.substring(1);
		
		var out = [];
		for(var i=0;i<list.length;i++) {
			var item = list[i];
			if (isAttr) {
				var nextItem = item.getAttribute(attr);
				if (aa_hasAttribute(item,attr)) out.push(nextItem);
			}
			else {
				var results = aa_xpath(item,xpath);
				ajaxart.concat(out,results);
			}
		}
		
		return out;
	},
	NextSibling: function(profile, data, context) {
		var xml = data[0];
		while (xml) {
			xml = aa_nextElementSibling(xml);
			if (!xml) return [];
			if (aa_bool([xml],profile,'Filter',context)) return [xml];
		}
	},
	PreviousSibling: function(profile, data, context) {
		var result = ajaxart.xml.PrevSibling(data[0],null);
		if (result != null)
			return [result];
		return [];
	},
	CloneNodeCleanNS: function(profile,data,context) {
		var xml = aa_first(data,profile,'Xml',context);
		return [aa_xml_cloneNodeCleanNS(xml)];
	},
    ChildAtPosition: function(profile,data,context)
    {
        var position = aa_int(data,profile,'Position',context);
        if (ajaxart.isxml(data) && data[0].nodeType == 1 )
        {
            var xml_item = data[0];
            var t=0;
            for (var i=0;i<xml_item.childNodes.length;i++)
            {
                if (xml_item.childNodes.item(i).nodeType == 1) t++;
                if (t == position)
                    return [xml_item.childNodes.item(i)];
            }
        }
        return [];
    },
	ToXmlElement: function(profile, data, context) {
		if (data.length == 0) return [];
		var xml = data[0];
		if (xml.nodeType == 1) return data;
		if (xml.nodeType == 2 || xml.nodeType == 3 || xml.nodeType == 4) 
			return aa_xpath(xml,'..');
		
		return [];
	},
	XPathOfNode: function(profile, data, context) {
		var id = aa_text(data,profile, 'StopAtIDAttribute', context);
		var specific = aa_bool(data,profile, 'Specific', context); 
		var top = aa_first(data,profile,'TopXml',context);
		
		if (data.length == 0) return [];
		return [ ajaxart.xml.xpath_of_node(data[0],id,specific,top) ];
	},
	XPathOfNodeWithTopTags: function(profile, data, context) {
		var tags = ajaxart.run(data,profile, 'TopTags', context);
		var top = aa_first(data,profile,'TopXml',context);
		if (! ajaxart.isxml(data)) return [];

		var tagsStr = "";
		for(var i=0;i<tags.length;i++) tagsStr += "," + ajaxart.totext(tags[i]) + ",";

		var out = "";
		var xml = data[0];
		var tag = "";
		
		while (xml != null && xml.nodeType != 9)
		{
			if (top != null && xml == top) break;
			if (xml.nodeType == 2) // atribute
			{
				out = "@" + xml.nodeName;
			}
			else // element
			{
				var tag = aa_tag(xml);
				if (tagsStr.indexOf(","+tag+",") > -1) {
					out = aa_text([tag],profile,'PrefixByTagToAdd',context)+ out;
					break;
				}
	
				if (out.length > 0) 
					out = xml.nodeName + "/" + out;
				else 
					out = xml.nodeName;
			}
			
			xml = ajaxart.xml.parentNode(xml);
		} 
		
		return [ out ];
	}, 
	ChangeXml : function(profile, data, context) 
	{
		var xml_src = aa_first(data,profile,'Xml',context);
		if (xml_src == null) return [];
		xml_src = [xml_src];
		if (! ajaxart.isxml(xml_src)) return [];
		var newContext = ajaxart.clone_context(context);
		ajaxart.setVariable(newContext,"InputForChanges",data);
		var changes = ajaxart.subprofiles(profile,'Change');
		
		ajaxart.each(xml_src, function(item) {
			ajaxart.each(changes,function(changeProfile) {
				ajaxart.run([item],changeProfile, "", newContext);
			});
		});
		return ["true"];		
	},
	ItemByID: function(profile, data, context) {
		var list = ajaxart.run(data,profile,'List',context);
		var id = aa_text(data,profile,'ID',context);
		
		for(var i=0;i<list.length;i++)
			if (typeof(list[i].getAttribute) != "undefined" && list[i].getAttribute('id') == id)
				return [ list[i] ];
		
		return [];
	},
	Delete: function(profile, data, context) {
		var xmls = ajaxart.run(data,profile,"Element",context);
		for(var i=0;i<xmls.length;i++) {
			var item = xmls[i];
			if (item.nodeType == 2) // attribute
			{
				var ownerElement = ajaxart.xml.parentNode(item);
				ownerElement.removeAttribute(item.nodeName);
			}
			var parent = item.parentNode;
			if (parent != null)
			{
				parent.removeChild(item);
				aa_triggerXmlChange(parent);
			}
		}
		return data;
	},
	RemoveMiddleElement: function(profile, data, context) {
		var elems = ajaxart.run(data,profile,'Element',context);
		for(var i in elems) {
			var elem = elems[i];
			if (!elem || elem.nodeType != 1) return;
			var parent = elem.parentNode;
			while (elem.firstChild) parent.appendChild(elem.firstChild);
			parent.removeChild(elem);
		}
	},
	DeleteChildren: function(profile, data, context) {
		var parent = ajaxart.run(data,profile,'ParentElement',context);
		if ( ! ajaxart.isxml(parent) ) return parent;
		var xml = parent[0];
		var hadChildren = !!xml.firstChild;
		while (xml.firstChild != null)
			xml.removeChild(xml.firstChild);
		
		if (hadChildren) aa_triggerXmlChange(xml);
		return data;
	},
	FindXmlByAttribute: function(profile, data, context) {
		var xml = aa_first(data,profile,'ParentXml',context);
		var attr = aa_text(data,profile,'Attribute',context);
		var value = aa_text(data,profile,'Value',context);
		var findAll = aa_bool(data,profile,'FindAll',context);
		
		var out = [];
		
		if (xml == null || xml.nodeType != 1 || attr == "") return [];
		var find = function(xml,attr,value,out,findAll) {
			if (xml.getAttribute(attr) == value) {
				out.push(xml);
				if (!findAll) return;
			}
			var child = xml.firstChild;
			while (child != null) {
				if (child.nodeType == 1) {
					find(child,attr,value,out,findAll);
					if (out.length > 0 && ! findAll) return;				
				}
				child = child.nextSibling;
			}
			return [];
		}
		find(xml,attr,value,out,findAll);
		return out;
	},
	DeleteAttributes: function(profile, data, context) {
		var parent = ajaxart.run(data,profile,'ParentElement',context);
		var exclude = ajaxart.run(data,profile,'Exclude',context);
		
		if ( ! ajaxart.isxml(parent) ) return parent;
		var xml = parent[0];
		if (xml.nodeType != 1) return data;
		
		var exclude_atts = {};
		for (var i=0; i<exclude.length; i++) {
			var exclude_att = ajaxart.totext(exclude[i]);
			if (exclude_att != "")
				exclude_atts[exclude_att] = true;
		}
		var names = [];
		for (var i=0; i<xml.attributes.length; i++)
			names.push(xml.attributes.item(i).name);
		for (var i=0; i<names.length; i++) {
			if (exclude_atts[names[i]] == null) 
				xml.removeAttribute(names[i]);
		}
		
		return data;
	},
	Update :function(profile, data, context) {
		var inputForChanges = ajaxart.getVariable(context,"InputForChanges");
		var newValue = ajaxart.run(inputForChanges,profile, 'NewValue', context);
		ajaxart.writevalue(data, newValue);
		return data;
	},
	ReplaceXmlElement: function(profile, data, context)
	{
		var elem = aa_first(data,profile, 'Element', context);
		var newElem = aa_first(data,profile, 'NewElement', context);
		var mode = aa_text(data,profile, 'Mode', context);

		if (newElem && typeof(newElem) == 'string') newElem = aa_parsexml(newElem);
		
		if (!elem || !newElem || elem == newElem || elem.nodeType != 1 || newElem.nodeType != 1) return;

	    if (mode == "keep original tag") {
			ajaxart.xml.copyElementContents(elem,newElem);
		} else if (mode == "replace tag") {
			ajaxart.replaceXmlElement(elem,newElem,false);
			elem = newElem;
		}
		aa_triggerXmlChange(elem);
		ajaxart.run([elem],profile,'RunOnNewElement',context);
	},
	ReplaceElement: function(profile, data, context)
	{
		var inputForChanges = ajaxart.getVariable(context,"InputForChanges");
		var elem = aa_first(data,profile, 'Element', context);
		var newElem = aa_first(inputForChanges,profile, 'NewElement', context);
		var mode = aa_text(inputForChanges,profile, 'Mode', context);
	
		if (! ajaxart.isxml(elem) ) return data;  
		if (newElem != null && ! ajaxart.isxml(newElem) ) return data;
		if (newElem == elem) return data;
		var parent = elem.parentNode;

		if (newElem != null) 
		{
		  if (mode == "keep original tag" || aa_tag(elem) == aa_tag(newElem) )
			ajaxart.xml.copyElementContents(elem,newElem);
		  else if (mode == "replace tag")
		  {
			ajaxart.replaceXmlElement(elem,newElem,false);
			elem = newElem;
		  }
		}
		else
			if (parent != null) parent.removeChild(elem);
		
		if (elem != null)
		{
			aa_triggerXmlChange(elem);
			ajaxart.run([elem],profile,'RunOnNewElement',context);
		}
		else
		{
			aa_triggerXmlChange(parent);
		}
		
		return data;
	},
	
	MoveElementAfterIndex: function(profile, data, context)
	{
		var elem = data[0];
		var after = aa_int(data,profile, 'Index', context);
	
		if (typeof(elem) == "undefined" || elem.nodeType != 1 ) return []; // Not Element  
				
		var parent = elem.parentNode;
		var tag = aa_tag(elem);

		var dest = ajaxart.xml.FirstChild(parent,tag);
		var last_of_tag = dest; // helper for last
	  	for(var i=0;i<after;i++)
	  	{
	  		last_of_tag = dest;
	  		dest = ajaxart.xml.NextSibling(dest,tag);
	  	}

		if (dest == elem) return data;
		var theElement = parent.removeChild(elem);
		if (dest == null) // last
		{
			if (last_of_tag == null || last_of_tag.nextSibling == null)
				parent.appendChild(theElement);
			else
				parent.insertBefore(theElement,last_of_tag.nextSibling);
		}
		else if (dest != null)
			parent.insertBefore(theElement,dest);
		
		return data;

	},

	MoveElement: function(profile, data, context)
	{
		var elem = data[0];
		var to = aa_text(data,profile, 'To', context);
	
		if (typeof(elem) == "undefined" || elem.nodeType != 1 ) return []; // Not Element  
		var parent = elem.parentNode;
		var tag = aa_tag(elem);

		var dest = null;
		if (to == "next")
		{
			dest = ajaxart.xml.NextSibling(elem,tag); 
			if (dest == null) return [];
			dest = ajaxart.xml.NextSibling(dest,tag); // no method insertAfter... 
			if (dest == null)
				to = "last";
		}
		if (to == "previous")
			dest = ajaxart.xml.PrevSibling(elem,tag); 
		if (to == "first")
			dest = ajaxart.xml.FirstChild(parent,tag); 
		if (to == "last")
		{
			dest = ajaxart.xml.FirstChild(parent,tag);
			var last_of_tag = dest; // helper for last
		  	while (dest != null)
		  	{
		  		last_of_tag = dest;
		  		dest = ajaxart.xml.NextSibling(dest,tag);
		  	}
			var theElement = parent.removeChild(elem);
			if (last_of_tag == null || last_of_tag.nextSibling == null)
				parent.appendChild(theElement);
			else
				parent.insertBefore(theElement,last_of_tag.nextSibling);
			return;
		}

		if (dest == elem) return data;
		if (dest != null)
		{
			var theElement = parent.removeChild(elem);
			parent.insertBefore(theElement,dest);
		}
		if (parent != null) aa_triggerXmlChange(parent);
		
		return data;
		
	},
	RegisterModifyOnXml: function (profile,data,context)
	{
		var xml = aa_first(data,profile,'Xml',context);
		var id = aa_text(data,profile,'SingletonId',context);
		ajaxart._RegModifyXmlChangeID = ajaxart._RegModifyXmlChangeID || {};
		aa_unbindXmlChange(ajaxart._RegModifyXmlChangeID[id]);

		ajaxart._RegModifyXmlChangeID[id] = aa_bindXmlChange(xml,function(changedXml) {
			ajaxart.run(changedXml ? [changedXml] : [],profile,'Action',context);
		});
	},
	RemoveAttributes: function(profile, data, context) 
	{
		if (data.length == 0 || !ajaxart.isxml(data) || data[0].nodeType != 1)
			return [];
		var attributes = ajaxart_run_commas(data,profile, 'AttributeNames', context);
		for (i in attributes) 
			data[0].removeAttribute( ajaxart.totext(attributes[i]) );
		return data;
	},
	HasAttribute: function(profile, data, context) {
	  var attr = aa_text(data,profile,'Attribute',context);
	  if ((! ajaxart.isxml(data)) || data[0].nodeType != 1) return [];
	  if (aa_hasAttribute(data[0],attr)) 
		  return ["true"];
	  return [];
	},
	HasParent: function(profile, data, context) {
		if (! ajaxart.isxml(data)) return [];
		if (data[0].parentNode == null) return [];
		return ["true"];
	},
	AddSiblings: function(profile, data, context) {
		var elem = aa_first(data,profile,'ExistingElement',context);
		var newElems = aa_run(data,profile,'NewElements',context);
		var addAfter = aa_text(data,profile,'Position',context) == 'after';
		var out = [];

		if (!elem || !elem.parentNode) return;
		for(var i=0;i<newElems.length;i++) {
			if (!newElems[i]) continue;
			var newElem = aa_importNode(newElems[i],elem);
			out.push(newElem);

			if (addAfter)
				elem = $(newElem).insertAfter(elem)[0];
			else
				elem.parentNode.insertBefore(newElem,elem);
		}
		
		aa_run(out,profile,'DoOnNewChild',context);
		aa_triggerXmlChange(elem.parentNode);
	},
	AddChildInPosition: function(profile, data, context) {
		var inputForChanges = ajaxart.getVariable(context,"InputForChanges");
		var child = aa_first(inputForChanges,profile, 'Child', context);
		var posObj = aa_first(inputForChanges,profile, 'Position', context);
		if (child == null || ! ajaxart.isxml(child) || ! ajaxart.isxml(data)) return data;
		var identicalTags = aa_bool(data,profile,'IdenticalTags',context);
		
		var parent=data[0];
		var tag = aa_tag(child);
		
		var insertBeforeMe = null;
		if (posObj != null) 
		{
			var pos = parseInt(ajaxart.totext(posObj));
			var counter=0;
			var node = data[0].firstChild;
			while (node != null)
			{
				if (node.nodeType == 1 && ( aa_tag(node) == aa_tag(child) || !identicalTags))
				{
					if (++counter == pos) insertBeforeMe = node;
				}
				node = node.nextSibling;
			}
		}
		child = aa_importNode(child, data[0]);
		
		if (insertBeforeMe == null)
		{
			// find last of tag and add after it
			var dest = ajaxart.xml.FirstChild(parent,tag);
			var last_of_tag = dest; // helper for last
		  	while(dest != null)
		  	{
		  		last_of_tag = dest;
		  		dest = ajaxart.xml.NextSibling(dest,tag);
		  	}

			if (last_of_tag == null || last_of_tag.nextSibling == null)
					parent.appendChild(child);
				else
					parent.insertBefore(child,last_of_tag.nextSibling);
		}
		else
			data[0].insertBefore(child,insertBeforeMe);
		
		ajaxart.run([child],profile,'DoOnNewChild',context);
		aa_triggerXmlChange(parent);
		
		return [child];
	},
	RemoveXmlAttribute: function(profile, data, context) {
		var parent = aa_first(data,profile,'Element',context);
		var attr = aa_text(data,profile,'AttributeName',context);
		if (parent && parent.nodeType == 1 && aa_hasAttribute(parent,attr)) {
			parent.removeAttribute(attr);
			aa_triggerXmlChange(parent);
		}
	},
	RemoveXmlNode: function(profile, data, context) {
		var xml = aa_first(data,profile,'Xml',context);
		if (!xml || !xml.nodeType) return;
		var parent = aa_xpath(xml,'..')[0];
		if (!parent) return;

		if (xml.nodeType == 2) // attribute
			parent.removeAttribute(xml.nodeName);

		if (xml.nodeType == 1)
			parent.removeChild(xml);

		aa_triggerXmlChange(parent);
	},
	AddXmlChildren: function(profile, data, context) {
		var parent = aa_first(data,profile,'Parent',context);
		var children = ajaxart.run(data,profile,'Children',context);
		var clone = aa_bool(data,profile,'CloneChildren',context);
		var asFirst = aa_bool(data,profile,'AddAsFirst',context);
		if (!parent) return;
		
		var adddedChildren = [];
		for(var i=0;i<children.length;i++) {
			if (children[i].nodeType != 1) continue;
			var item = (clone) ? children[i].cloneNode(true) : children[i];
			adddedChildren.push( aa_xml_appendChild(parent,item,asFirst) );
		}
		
		if (children.length > 0) aa_triggerXmlChange(parent);
		
		ajaxart.run(adddedChildren,profile,'DoOnAddedChildren',context);
	},
	ReplaceChildren: function(profile, data, context) {
		var inputForChanges = ajaxart.getVariable(context,"InputForChanges");
		var children = ajaxart.run(inputForChanges,profile, 'Children', context);
		var clone = aa_bool(inputForChanges,profile,'CloneChildren',context);
		if (data.length == 0) return [];
		
		while (data[0].firstChild != null)
			data[0].removeChild(data[0].firstChild);
		
		ajaxart.each(children,function(item) {
			if (!clone)
				aa_xml_appendChild(data[0],item);
			else
				aa_xml_appendChild(data[0],ajaxart.xml.clone([item]));
		});
		if (children.length > 0) aa_triggerXmlChange(data[0]);
		return data;
	},
	PerformChanges : function(profile, data, context) {
		var changeProfiles = ajaxart.subprofiles(profile, 'Change');
		for(var i=0;i<changeProfiles.length;i++)
			ajaxart.run(data,changeProfiles[i],'',context);
		return ["true"];
	},
	MultiChange : function(profile, data, context) {
		var changeProfiles = ajaxart.subprofiles(profile, 'Change');
		var inputforChanges = ajaxart.getVariable(context,"InputForChanges");
		var dataForChanges = ajaxart.run(inputforChanges,profile, 'DataForChanges', context);
		var performChangesOn = ajaxart.run(data,profile, 'PerformChangesOn', context);
		var newContext = ajaxart.clone_context(context);

		ajaxart.each(dataForChanges, function(item) {
			ajaxart.setVariable(newContext,"InputForChanges",[item]);
			if (performChangesOn.length == 0) {
				for(var i=0;i<changeProfiles.length;i++)
					ajaxart.run(data,changeProfiles[i],'',newContext);
			} else 
				ajaxart.each(performChangesOn, function(change_item) {
					for(var i=0;i<changeProfiles.length;i++)
						ajaxart.run([change_item],changeProfiles[i],'',newContext);
				});
		});
			
		return data;
	},
	UpTillMatchesFilter: function(profile, data, context)
	{
		if (! ajaxart.isxml(data)) return [];
		var xml = data[0];
		if (aa_bool([xml],profile,'Filter',context))
			return [xml];
		var xml = ajaxart.xml.parentNode(xml);
		while (xml != null && xml.nodeType == 1)
		{
			if (aa_bool([xml],profile,'Filter',context))
				return [xml];
			xml = xml.parentNode;
		}
		return [];
		
	},
	RemoveInnerText: function(profile, data, context)
	{
		if (! ajaxart.isxml(data)) return data;
		var xml = data[0];
		if (xml.nodeType == 1)
		{
			 var node = xml.firstChild;
			 while (node != null)
			 {
				var prev = node;
				node=node.nextSibling;
				if (prev.nodeType == 3 || prev.nodeType == 4) xml.removeChild(prev);
			 }			
			 aa_triggerXmlChange(data[0]);
		}
		return data;
	},
	InnerTextValue: function(profile, data, context) 
	{
		if (!ajaxart.isxml(data)) return [];
		
		var node = data[0].firstChild;
		while (node != null) {
			if (node.nodeType == 3 || node.nodeType == 4) return [node];
			node=node.nextSibling;
		}
		
		return [];
	},
	InnerText: function(profile, data, context) {
		var out = [];
		ajaxart.each(data,function(item) {
			if (! ajaxart.isxml(item)) {
				return [];
			}
			if (item.nodeType == 2) return [item];
			var text_node = item.firstChild;
			if (text_node == null)	{
				text_node = item.ownerDocument.createTextNode("");
				item.appendChild(text_node);
			}
			out.push(text_node);
		});
		return out;
	},
	IndexOfElement: function(profile,data,context)
	{
		var startIndex = aa_text(data,profile,'IndexOfFirstElement',context);
		if (ajaxart.isxml(data) && data[0].nodeType == 1 && data[0].parentNode != null)
		{
			var xml_item = data[0];
			var count = startIndex;

			for (var i=0;i<xml_item.parentNode.childNodes.length;i++)
			{
				var brother = xml_item.parentNode.childNodes.item(i);
				if (brother.nodeType == 1 && aa_tag(brother) == aa_tag(xml_item))
				{
					if ( brother == xml_item ) return [""+count];
					count++;
				}
			}
		}
		return [];
	},
	IsAttribute: function(profile,data,context)
	{
		if (ajaxart.isxml(data) && data[0].nodeType == 2 ) return ["true"];
		return [];
	},
	AreSiblings: function(profile,data,context)
	{
  		var parent = null;
  		for (var i=0;i < data.length; i++)
  		{
  			var new_parent = data[i].parentNode;
  			if (new_parent != parent && i != 0) 
  				return [];
  			parent = new_parent;
  			if (parent == null || parent == undefined) 
  				return [];
  		}
		return ["true"];
	},
	IsElement: function(profile,data,context)
	{
		if (ajaxart.isxml(data) && data[0].nodeType == 1 ) return ["true"];
		return [];
	},
	IsCData: function(profile,data,context)
	{
		if (ajaxart.isxml(data) && data[0].nodeType == 4 ) return ["true"];
		return [];
	},
	ByTag: function(profile,data,context)
	{
		var tag = aa_text(data,profile, 'Tag', context);
		if (tag == "") return [];
		var xmlForDocument = aa_first(data,profile,'XmlForDocument',context);
		var elem = aa_createElement(xmlForDocument,tag);
		
		if (elem == null) return [];
		var newContext = ajaxart.clone_context(context);
		ajaxart.setVariable(newContext,"InputForChanges",data);
		var changes = ajaxart.subprofiles(profile,'Change');
		for(var i=0;i<changes.length;i++)
			ajaxart.run([elem],changes[i], "", newContext);
		return [elem];
	},
	ElementOfDynamicTag: function(profile,data,context)
	{
		var tag = aa_text(data,profile, 'Tag', context);
		if (tag.length == 0) return [];
		var elem = aa_createElement(data[0],tag);  
		if (elem == null) return [];
		var newContext = ajaxart.clone_context(context);
		ajaxart.setVariable(newContext,"InputForChanges",data);
		var changes = ajaxart.subprofiles(profile,'Change');
		ajaxart.each(changes,function(changeProfile) {
			ajaxart.run([elem],changeProfile, "", newContext);
		});
		return [elem];
	},
	XmlWithChangedTag: function(profile,data,context)
	{
		var tag = aa_text(data,profile, 'Tag', context);
		var base = aa_first(data,profile, 'BaseXml', context);
		if (tag.length == 0 || (! ajaxart.isxml(base)) ) return [];
		var elem = aa_createElement(base,tag);  
		if (elem == null) return [];
		ajaxart.xml.copyElementContents(elem,base);
		return [elem];
	},
	FindElementByID: function(profile,data,context)
	{
		var id = aa_text(data,profile, 'Id', context);
		if (data.length == 0) return [];
		result = ajaxart.xml.findById(data[0],id);
		if (result == null) return [];
		return [result];
	},
	Clone: function(profile,data,context)
	{
		var xml = aa_first(data,profile,'Xml',context);
		if (xml == null) return [];
		if (!ajaxart.isxml(xml)) return [];

		return [ ajaxart.xml.clone([xml]) ];
	},
	TextRowToXml: function(profile,data,context)
	{
		var tag = aa_text(data,profile,'Tag',context);
		var atts = aa_text(data,profile,'Attributes',context);
		var sep = aa_text(data,profile,'Separator',context);
		
		var src_list = data[0].split(sep);
		var atts_list = atts.split(',');
		var result = aa_createElement(data[0],tag);  

		for(var i=0;i<atts_list.length;i++)
			result.setAttribute(atts_list[i],src_list[i]);
		
		return [ result ];
	},
	CopyAttributes: function(profile,data,context)
	{
		var inputForChanges = ajaxart.getVariable(context,"InputForChanges");
		var source = ajaxart.run(inputForChanges, profile, 'SourceElement', context);
		var overrideExistingAttributes = aa_bool(data,profile, 'OverrideExistingAttributes', context);
		
		if (data.length == 0 || source.length == 0 || source[0].nodeType != 1 || data[0].nodeType != 1) return data;

		var atts = source[0].attributes;
		if (atts != null)
		for (var i = 0; i < atts.length; i++) {
			var attName = atts.item(i).nodeName;
			if (overrideExistingAttributes || aa_hasAttribute(source[0],attName) )
				data[0].setAttribute(attName, source[0].getAttribute(attName) || '' );
		}

		return data;
	},
	OverrideAttributesAndElements: function (profile,data,context)
	{
		var inputForChanges = ajaxart.getVariable(context,"InputForChanges");
		var source = aa_first(inputForChanges, profile, 'SourceXml', context);
		if (data.length == 0 || source == null || source.nodeType != 1 || data[0].nodeType != 1) return data;
		var target = data[0];
		
		var atts = source.attributes;
		for (var i = 0; i < atts.length; i++) {
			var attName = atts.item(i).nodeName;
			  target.setAttribute(attName, source.getAttribute(attName) || '');
		}

		jQuery(target).empty();
		
		var child = source.firstChild; 
		while (child != null)
		{
			if (child.nodeType == 1)
			  target.appendChild(child.cloneNode(true));
			child = child.nextSibling;
		}
		
		return data;
	},
	IfThenElse : function (profile,data,context)
	{
		var passed = aa_bool(data,profile,'If',context);
		if (passed)
			ajaxart.run(data,profile,'Then',context);
		else
			ajaxart.run(data,profile,'Else',context);
		return data;
	},
	  MoveBefore: function (profile,data,context)
	  {
		if (data.length == 0) return [];
	    var item = data[0].Item[0];
	    var to = data[0].BeforeItem[0];
		if (ajaxart.isxml(to) && ajaxart.isxml(item) )
			if (to.parentNode == item.parentNode && item.parentNode != null)
				to.parentNode.insertBefore(item,to);
	    return [];
	  },
	  MoveToEnd: function (profile,data,context)
	  {
		if (data.length == 0) return [];
	    var item = data[0];
		if (ajaxart.isxml(item) && item.parentNode != null)
			item.parentNode.appendChild(item);
				
	    return [];
	  },
	CleanEmptyAttributes: function (profile,data,context)
	{
		var recursive = aa_bool(data,profile,'Recursive',context);
		var ignore = ajaxart.run(data,profile,'IgnoreAttributes',context);
		var ignore_str = "";
		for(var i=0;i<ignore.length;i++) ignore_str += "," + ignore[i] + ",";
		
		if (! ajaxart.isxml(data)) return [];
		
		var cleanElement = function(element,ignore_str,recursive) {
			for (var i=0;i<element.attributes.length;i++) {
				var attr = element.attributes.item(i).name;
				if ((element.getAttribute(attr) == "") && (ignore_str.indexOf(","+attr+",") == -1) )
				{
					element.removeAttribute(attr);
					i--;
				}
			}
			if (recursive) {
				var elem = element.firstChild;
				while (elem != null) {
					if (elem.nodeType == 1) cleanElement(elem,ignore_str,true);
					elem = elem.nextSibling;
				}
			}
		}
		if (data[0].nodeType == 1)
			cleanElement(data[0],ignore_str,recursive);
		
		return ["true"];
	},
	XmlInfo: function (profile,data,context)
	{
		if (! ajaxart.isxml(data)) return;
		var info = aa_getXmlInfo(data[0],context);
		if (info == null) return [];
		return [info];
	},
	UpTillHasXmlInfoWithMethod: function (profile,data,context)
	{
		if (! ajaxart.isxml(data)) return;
		var xml = data[0];
		if (xml.nodeType != "1") xml = aa_xpath(xml,'..')[0];
		
		while (xml.nodeType == 1) {
		  var info = aa_getXmlInfo(xml,context,true);
		  if (info) return [info];
		  xml = xml.parentNode;
		}
	},
	RunMethodOnXml: function (profile,data,context)
	{
		var xml = aa_first(data,profile,'Xml',context);
		var method = aa_text(data,profile,'Method',context);
		var info = aa_getXmlInfo(xml,context);
		if (!info || ! info[method]) return [];
		return info[method](data,context);
	},
	XmlQuery: function (profile,data,context)
	{
		var items = ajaxart.run(data,profile,'Items',context);
		var query = aa_first(data,profile,'Query',context);
		if (query == null) return items;
		
		var subitems = aa_xpath(query,'xmlfilter');
		if (subitems.length == 0) return items;
		var current = items;
		var out = [];
		
		for(var i=0;i<subitems.length;i++) {
			var xmlfilter = subitems[i];
			out = [];
			var xpath = '' + xmlfilter.getAttribute('xpath');
			var op = '' + xmlfilter.getAttribute('op');
			var value = '' + xmlfilter.getAttribute('value') || '';
			if (op == 'contains') var valueLower = value.toLowerCase();
			
			var disabled = '' + xmlfilter.getAttribute('disabled');
			if ("true" == disabled) { out = current; continue; }
			
			if (op == 'date_between') var from = aadate_date2int('' + xmlfilter.getAttribute('from'));
			// to fix: assuming 'to' has no time.
			if (op == 'date_between') var to = aadate_date2int('' + xmlfilter.getAttribute('to')) + 1440;
			if (op == 'date_between' && to == 1440) to = 12949120000;
			var oneOfList = [];
			if (op == 'one of') oneOfList = (''+xmlfilter.getAttribute('value')).split(',');
			
			for(var j=0;j<oneOfList.length;j++)
				oneOfList[j] = ',' + oneOfList[j] + ',';
			
			for (var j=0;j<current.length;j++)
			{
				var item = current[j];
				var inneritem = item;
				if (xpath != null && xpath.length > 0)
				{
					if (xpath[0] == "@")
					{
						var fld = xpath.split("@")[1];
						inneritem = '' + item.getAttribute(fld);
					}
					else if (xpath == "by xtml")
					{
						inneritem = aa_first([item],xmlfilter,'xpath_by_xtml',context);
						if (inneritem == null) continue;
					}
					else {
					  var inneritemslist = aa_xpath(item,xpath);
					  if (inneritemslist.length == 0) continue;
					  inneritem = inneritemslist[0];
					}
				}
				var inneritemValue = ajaxart.totext(inneritem);
				if (op == '=') {
					if ( value == "" || inneritemValue == value ) out.push(item);
				}
				if (op == '!=') {
					if ( inneritemValue != value ) out.push(item);
				}
				if (op == '<' || op == "<=" || op == ">" || op == ">=") {
					try {
					  var valint = parseInt(value);
					  var itemint = parseInt(inneritemValue);
					  if (op == '<' && itemint < valint ) out.push(item);
					  if (op == '<=' && itemint <= valint ) out.push(item);
					  if (op == '>' && itemint > valint ) out.push(item);
					  if (op == '>=' && itemint >= valint ) out.push(item);
					} catch(e) { continue; }
				}
				if (op == 'contains') {
					if (inneritemValue.toLowerCase().indexOf(valueLower) > -1)
						out.push(item);
				}
				else if (op == 'one of' && xmlfilter.getAttribute('value') == "_all") {
					out.push(item);
				}
				else if (op == 'one of' && xmlfilter.getAttribute('value') == "") {
					out.push(item);
				}
				else if (op == 'one of' && xmlfilter.getAttribute('value') == "_blank") {
					if (inneritemValue == '')
						out.push(item);
				}
				else if (op == 'one of') {
					inneritemValue = "," + inneritemValue + ",";
					for(var k=0;k<oneOfList.length;k++) 
						if (inneritemValue.indexOf(oneOfList[k]) != -1) 
							out.push(item);
				}
				else if (op == 'date_between') {
					var intValue = aadate_date2int(inneritemValue);
					if (from <= intValue && intValue <= to)
						out.push(item);
				}
				else if (op == 'xtml') {
					var xtml_list = aa_xpath(xmlfilter,'xtml');
					if (xtml_list.length == 0) continue;
					if ( aa_bool([inneritem],xtml_list[0],'',context) )
					  out.push(item);
				}
			}
			
			current = out;
		}
		return out;
	},
    Switch: function (profile,data,context)
    {
	  return aa_switch(profile,data,context);
    },
    PerformChangeOnElements: function (profile,data,context)
    {
		  var elements = ajaxart.run(data,profile,'Elements',context);
		  for (var i in elements)
				ajaxart.run([elements[i]],profile,'Change',context);
    },
    PerformChangeWithManyInputs: function (profile,data,context)
	{
  	  var inputs = ajaxart.run(data,profile,'Inputs',context);
  	  var local_context = ajaxart.clone_context(context); 
  	  for (var i in inputs) {
  			ajaxart.setVariable(local_context,"InputForChanges",[ inputs[i] ]);
  			ajaxart.run(data,profile,'Change',local_context);
  	  }
  	  return data;
	},
	Filter: function (profile,data,context)
	{
		var items = ajaxart.run(data,profile,'Items',context);
		var filter = aa_text(data,profile,'Filter',context);
		
		var out = [];
		for(var i=0;i<items.length;i++)
		{
			var xpath = "." + filter;
			if (aa_xpath(items[i],xpath).length > 0)
				out.push( items[i] );
		}
		
		return out;
	},
	Siblings: function (profile,data,context)
	{
		var xml_item = aa_first(data,profile,'Element',context);
		if (!xml_item || xml_item.nodeType != 1 || !xml_item.parentNode) return [];
		var onlyWithSameTag = aa_bool(data,profile,'OnlyWithSameTag',context);
		if (xml_item.nodeType != 1)
			return [];
		
		var out = [];
		for (i=0;i<xml_item.parentNode.childNodes.length;i++)
		{
			var sibling = xml_item.parentNode.childNodes.item(i);
			if (sibling != xml_item && sibling.nodeType == 1)
				if (aa_tag(sibling) == aa_tag(xml_item) || !onlyWithSameTag )
					out.push(sibling);
		}
		return out;		
	},
	XmlParsingError: function (profile,data,context)
	{
		var xmlAsText = aa_text(data,profile,'XmlAsText',context);
		var error = [];
		aa_parsexml(xmlAsText,"",error,true);
		return error;
	},
	WriteCData: function (profile,data,context)
	{
		var element = aa_first(data,profile,'Element',context);
		var cdata_text = aa_text(data,profile,'CDataText',context);

		aa_write_cdata(element,cdata_text);
	},
	CDataValue: function (profile,data,context)
	{
		var element = aa_first(data,profile,'Element',context);
		if (!element) return [];
		var cdataValue = aa_cdata_value(element);
		return (cdataValue) ? [cdataValue] : [];
	},
	CData: function (profile,data,context)
	{
		var cdataValue = aa_cdata_value(profile);
		if (!cdataValue) return [];
		if (aa_bool(data,profile,'DynamicContent',context))
	    	return ajaxart.dynamicText(data,cdataValue,context,data,false);
	},
	CDataRef: function (profile,data,context)
	{
		var element = aa_first(data,profile,'Element',context);
		if (aa_cdata_value(element) == null)
			aa_write_cdata(element,'');
		return [element];
	},
	CreateXml: function (profile, data, context)
	{
		var tag = aa_text(data,profile,'Tag',context);
		var xml = aa_createElement(null, tag);
		var attributes = ajaxart.childElems(profile,"Attribute");
		for (var i=0; i<attributes.length; i++) {
			var attrName = aa_text(data,attributes[i],'Name',context);
			var value = aa_text(data,attributes[i],'Value',context);
			if (attrName && value)
				xml.setAttribute(attrName,value);
		}
		var elements =  ajaxart.runsubprofiles(data,profile,'Element',context);
		for (var i=0; i<elements.length; i++)
			if (ajaxart.isxml(elements[i]))
				xml.appendChild( aa_importNode(elements[i], xml) );

		var changes = ajaxart.subprofiles(profile,'Change');
		ajaxart.each(changes,function(changeProfile) {
			ajaxart.run([xml],changeProfile, "", aa_ctx(context, {InputForChanges: data}));
		});

		return [xml];
	},
	CDataNode: function(profile,data,context) {
		var tag = aa_text(data,profile,'Tag',context);
		var xml = aa_createElement(null, tag);
		var cdata_text = aa_text(data,profile,'CDataContent',context);
		aa_write_cdata(xml,cdata_text);
		return [xml];
	}
});


ajaxart.xml.findById = function(node,id)
{
	if (! ajaxart.isxml(node)) return null;
	
	if (node.nodeType != 1)	return null; // not element
	if (node.getAttribute('id') == id) return node;
	var child = node.firstChild;
	while (child != null)
	{
		var result = ajaxart.xml.findById(child,id); 
		if (result != null) return result; 
		child = child.nextSibling;
	}
	return null;
}

ajaxart.xml.xpath_of_node = function(xml,id,specific,top)
{
	if ( ! ajaxart.isxml(xml) ) return "";
	
	var result = "";
	var xml_item = xml;
	if (top == xml) return "";
	while (xml_item != null)
	{
		var slash = "/";
		if (result == "") slash = "";
		var xpath_elem = "";
		if (xml_item.nodeType == 9)	{ // document
			xml_item = null;
			continue;
		}
		if (xml_item.nodeType == 1)	// element
		{
			if (xml_item.parentNode == null || xml_item.parentNode.nodeType == 9) // top level
			{
				xml_item = null;
				continue;
			}
			xpath_elem = '' + aa_tag(xml_item);
			if (specific)
			{
				if (id.length > 0 && aa_hasAttribute(xml_item,id))
					xpath_elem += '[@'+id+"='"+ xml_item.getAttribute(id) +"']";
				else {
					if (typeof(xml_item.parentNode) != "undefined")
					{
						var my_count = 0;
						var count = 0;
						var i=0;
	
						for (i=0;i<xml_item.parentNode.childNodes.length;i++)
						{
							var brother = xml_item.parentNode.childNodes.item(i);
							if (brother.nodeType == 1 && aa_tag(brother) == aa_tag(xml_item))
							{
								count++;
								if ( brother == xml_item ) my_count = count;
							}
						}
						if (my_count > 0 && count > 1) {
							var id_empty = !aa_hasAttribute(xml_item,"id") || xml_item.getAttribute("id") == "";
							var name_empty = !aa_hasAttribute(xml_item,"name") || xml_item.getAttribute("name") == "";
							if ( !id_empty || !name_empty ) {
								if (!id_empty)
									xpath_elem += "[@id='" + xml_item.getAttribute("id") + "']";
								else
									xpath_elem += "[@name='" + xml_item.getAttribute("name") + "']";
							}
							else 
								xpath_elem += "[" + my_count + "]";
						}
					}
				}
			}
		}
		if (xml_item.nodeType == 2) // attribute
			xpath_elem = "@" + xml_item.name;
		
		if (xpath_elem != "")
			result = xpath_elem + slash + result;

		if (id.length > 0 && xml_item.nodeType == 1 && aa_hasAttribute(xml_item,id))
			return result;
		
		var orig_item = xml_item;
		xml_item = xml_item.parentNode;
		if (xml_item == null)
			xml_item = ajaxart.xml.parentNode(orig_item);
		if (xml_item == top) xml_item = null;
	}
	return result;
};

ajaxart.xml.set_tagname = function(old_elem, tagName) 
{
	if (old_elem == null) return null;

	var new_elem = aa_createElement(old_elem, tagName); // aa_parsexml("<" + tagName + "/>"); //old_elem.ownerDocument.createElement(tagName);
	ajaxart.xml.copyElementContents(new_elem,old_elem);

	if (old_elem.parent != null)
		old_elem.parent.replaceChild(new_elem, old_elem);
	return new_elem;
};

ajaxart.xml.copyElementContents = function(target,source,keepSourceContent)
{
	if (source.nodeType != 1 || target.nodeType != 1) return;
	// remove all children & attributes
	if (!keepSourceContent) {
		while(target.firstChild)
			target.removeChild( target.firstChild );
		
		while (target.attributes.length > 0)
			target.removeAttribute(target.attributes.item(0).name);
	}
	
	// copy all attributes
	var atts = source.attributes;
	if (atts != null)
		for (var i = 0; i < atts.length; i++)
			target.setAttribute(atts.item(i).name, atts.item(i).value);

	source = aa_importNode(source,target);
	
	// copy all sub
	var childNode = source.firstChild;
	var ownerDoc = target.ownerDocument;
	while (childNode != null)
	{
		var item = childNode;
		if (typeof(childNode.cloneNode) != "undefined")
			target.appendChild(childNode.cloneNode(true));
		else if (childNode.nodeType == 3 ) // text node
			target.appendChild(ownerDoc.createTextNode(childNode.nodeValue));
		else if (childNode.nodeType == 4) // cdata
			target.appendChild(ownerDoc.createCDATASection(childNode.nodeValue));
		
		childNode = childNode.nextSibling;
	}
}

ajaxart.xml.setAsOnlyChildElem = function(parent,newchild)
{
	if ( parent == null || parent.childNodes == null ) return;
	var node = parent.firstChild;
	while (node != null)
	{
		var next_sibling = node.nextSibling;
		if (node.nodeType == 1) { // element
			parent.removeChild(node);
		}
		node = next_sibling;
	}
	aa_xml_appendChild(parent,newchild);
};
ajaxart.xml.innerTextStr = function(element)
{
	var node = element.firstChild;
	while (node != null) {
		if (node.nodeType == 3 || node.nodeType == 4) return node.nodeValue;
		node=node.nextSibling;
	}
	return "";
}
ajaxart.xml.FirstChild = function(parent,tag)
{
	var res = parent.firstChild;
	if (res == null) return null;
	if (res.nodeType != 1 || aa_tag(res) != tag) 
		res = ajaxart.xml.NextSibling(res,tag);

	return res;
};
ajaxart.xml.NextSibling = function(elem,tag)
{
	if (elem == null) return null;
	var res = elem.nextSibling;
	if (res == null) return null;
	if (res.nodeType != 1) return ajaxart.xml.NextSibling(res,tag);
	if (tag != null && aa_tag(res) != tag) return ajaxart.xml.NextSibling(res,tag);
	return res;
}
ajaxart.xml.PrevSibling = function(elem,tag)
{
	if (elem == null) return null;
	var res = elem.previousSibling;
	if (res == null) return null;
	if (res.nodeType != 1) return ajaxart.xml.PrevSibling(res,tag);
	if (tag != null && aa_tag(res) != tag) return ajaxart.xml.PrevSibling(res,tag);
	return res;
}
ajaxart.xml.root = function(node)
{
	if (!node) return null;
	var parent = ajaxart.xml.parentNode(node);
	if (parent == null) return node;
	var prev,next = parent;
	while (next != null && next.nodeType == 1)
	{
		prev = next;
		next = next.parentNode;
	}
	return prev;
}
ajaxart.xml.autosave = function(xml,attachment,saveAction) 
{
	var savefunc = function(force) {
		if (attachment.saving == true && !force) return false;
		
		attachment.saving = true;
		var success = aa_bool([xml],attachment.profile,'SaveAction',attachment.context);
		if (success) attachment.modified = false;
		attachment.saving = false;
		
		return true;
	}
	if (attachment.autosavedelay == 0) savefunc();
	else 
		aa_delayedRun(savefunc,xml,2500,6000);
};
function ajaxart_delete_child_elem(xml,tag)
{
	var child= xml.firstChild;
	while (child != null) {
		if (aa_tag(child) == tag) { xml.removeChild(child); return; }
		child = child.nextSibling;
	}
		
}
function aa_xmlbyid(list,id)
{
  for(var i=0;i<list.length;i++)
	  if (id == list[i].getAttribute('id')) return list[i];
  return null;
}

function aa_cdata_value(element) {
	if (!element) return null;
	for (var child = element.firstChild; child!=null; child=child.nextSibling)
		if (child.nodeType == 4 && child.nodeValue)
			return child.nodeValue;
	return null;
}

function aa_write_cdata(element,value) {
	if (!element) return;
	value = value || '';
	
	while (element.firstChild) element.removeChild(element.firstChild);  // delete all children first
	var cdata = element.ownerDocument.createCDATASection(value.replace(/]]>/g,']] >'));
	element.appendChild(cdata);
	aa_triggerXmlChange(element);
}

function aa_xml_appendChild(parent,child,asFirst) {
	try {
	  if ( !ajaxart.isxml(parent) ) { ajaxart.log("cannot append to non-xml parent","error");return; }
	  if (child != null && child.nodeType == 1 && parent != null)
	  {
		  child = aa_importNode(child, parent);
		  if (asFirst && parent.firstChild)
			  parent.insertBefore(child,parent.firstChild);
		  else
			  parent.appendChild(child);		  
		  return child;
	  }
	} catch(e) { ajaxart.logException(e);}	
}


function aa_xpath_text(xml,xpath) {
	return aa_totext(aa_xpath(xml,xpath));
}
function aa_xpath_with_hash(xml,xpath) {
	// e.g. %$Data/person[#homer]/@age -> which matches for %$Data/person[@id='homer']/@age%
	var id = xpath.match(/\[\#([^\]]*)\]/)[1];
	var fixed_xpath = xpath.replace('[#'+id+']',"[@id='"+id+"']");
	return aa_xpath(xml,fixed_xpath);
}

ajaxart.xml2text = function(xml) 
{
	if (xml == null) return '';

	if (! ajaxart.ishtml(xml))
		return ajaxart.xml.prettyPrint(xml,"",true);
	
	if (aa_isArray(xml))
	{
		if (xml.length > 0 ) return ajaxart.xml2text(xml[0]);
		return '';
	}
	return aa_xml2htmltext(xml);
};
ajaxart.xml.clone = function(xml)
{
	if (xml.length == 0) return null;
	return xml[0].cloneNode(true);
}
ajaxart.xml.prettyPrint = function(xml,indent,compact)
{
    if (compact) indent = "";
    var newline = compact ? "" : "\r";
	if (xml == null) return "";
	if (aa_isArray(xml))
	{
		if (xml.length > 0 ) return ajaxart.xml.prettyPrint(xml[0],indent,compact);
		return "";
	}

    if (typeof(indent) == "undefined") indent = "";
    if (! ajaxart.isxml(xml)) return xml;
    if (xml.nodeType == 2 || xml.nodeType == 3) 
    	return aa_xmlescape(xml.nodeValue);
    if (xml.nodeType == 4) // cdata
    	return '<![CDATA[' + xml.nodeValue + String.fromCharCode(93) + ']>';	// last 2 parts are separated so this js code could be embedded in xml
    if (xml.nodeType == 8) return ''; // comment
    // head
    var out = indent + "<" + aa_tag(xml);

	var atts = xml.attributes;
	if (atts != null) {
		for (var i = 0; i < atts.length; i++)
		{
			var val = aa_xmlescape(atts.item(i).value).replace(/&apos;/g, "'");
			// var name = atts.item(i).localName || atts.item(i).name;
			var name = atts.item(i).name;
			if (name=='xmlns') continue;
			out += " " + name + '="'+ val +'"';
		}
	}
    if (xml.childNodes.length == 0) out += "/>"
    else out += ">";

    // child elements
    var childs_length = xml.childNodes.length;
    if (childs_length == 1 && (xml.childNodes[0].nodeType == 3)) // || xml.childNodes.item(0).nodeType == 4)) // inner text
    	out += aa_xmlescape(xml.childNodes[0].nodeValue);
    else
    {
    	var only_cdata = false;
    	for (var i = 0; i < childs_length; i++)
    	{
    		var child = xml.childNodes[i];
    		if (child.nodeType == 4) {  // cdata (no need for newline and indents)
    			out += ajaxart.xml.prettyPrint(child);
    			if (childs_length == 1) only_cdata=true;
    		} 
    		else if (child.nodeType != 3) 
    			out += newline + ajaxart.xml.prettyPrint(child,indent + "  ",compact);
    	}
    	if (childs_length > 0 && !compact && !only_cdata) out += newline + indent;
    }
    if (xml.childNodes.length > 0) out += "</" + aa_tag(xml) + ">";
    return out;
} 
ajaxart.isxmlelement = function(xml)
{
	return (ajaxart.isxml(xml) && xml.nodeType == 1);
};
jBart.xpath = function(xml,xpath,createIfDoesNotExist) {
	return aa_xpath(xml,xpath,createIfDoesNotExist);
}

function aa_xpath(xml,xpath,createIfNotExist,defaultValue) {
	if (!xpath) return [xml];
    if (xpath.charAt(0) == "!") 
    	return aa_xpath(xml,xpath.substring(1,xpath.length),true);

	if (!xml || !xml.nodeType ) return [];
	var result = [];

	var isJBartXPath = xpath.indexOf('[#') > -1;

	if (isJBartXPath && !createIfNotExist) 
		return aa_xpath_with_hash(xml,xpath);

	if (!isJBartXPath) {
		try {		
			if (window.jBartNodeJS) 
				result = window.jBartNodeJS.xpath(xml,''+xpath);
			else {
				var isIE =  /msie/i.test(navigator.userAgent) || /trident/i.test(navigator.userAgent);

				if (isIE && typeof(xml.selectNodes) != "undefined" ) // IE && xml
				{
					xml.ownerDocument.setProperty("SelectionLanguage", "XPath");
					var nodes = xml.selectNodes(""+xpath);
					for (var i=0;i<nodes.length;i++)
						result.push(nodes[i]);
				}	else {    
					// Firefox or html in IE
					var docForXpath = xml.ownerDocument;
					if (window.jbUsingJSXPath) docForXpath = document;
					var iter = (!window.jbUsingJSXPath) ? docForXpath.evaluate(xpath, xml, null,0, null) : docForXpath.evaluate2(xpath, xml, null,0, null);

					if (iter) 
					{
						var node = iter.iterateNext();
						while (node) {
							result.push(node);
							node = iter.iterateNext();
						}
					}
				}
			}
		}
		catch (e) {
			var xmltext = (ajaxart.xml2text && ajaxart.xml2text(xml).substring(0,50)) || '';
			log( 'error calculating xpath: ' + xpath + ", xml:" +  xmltext + '  ' + (e.stack || e.message || ''),"warning"); 
	//		ajaxart.log( e.message,"error"); 
			}
		if (result.length > 0 && result[0].nodeType == 9) // document
			return [];
	}
	
	if (result.length == 0 && createIfNotExist)
	{
		try {
			var subpath = xpath;
			var item = xml;
			while (subpath.indexOf('/') > -1 )
			{
				var pos = subpath.indexOf('/');
				var tag = subpath.substring(0,pos);
				
				var item = aa_xpath(item,tag,true)[0];
				subpath = subpath.substring(pos+1);
			}
			if (subpath.charAt(0) == "@") {
				var attrName = subpath.substring(1);
				if (typeof(defaultValue) == "undefined") defaultValue=""; 
				if (attrName.indexOf('/') == -1)
					item.setAttribute(attrName,defaultValue);
			}
			else if (aa_xpath(item,subpath).length == 0) { // element
				if (subpath.indexOf('[#') > -1) {
					var pos = subpath.indexOf('[#');
					var pos2 = subpath.indexOf(']',pos);
					var tag = subpath.substring(0,pos).replace('self::','');
					var id = subpath.substring(pos+2,pos2);

					var newelem = item.ownerDocument.createElement(tag);
					newelem.setAttribute('id',id);
					item.appendChild(newelem);
				} else {
					var newelem = aa_createElement(item,subpath);
					if (typeof(defaultValue) != 'undefined' && defaultValue != "")
						newelem.appendChild(newelem.ownerDocument.createTextNode(defaultValue));
					item.appendChild( newelem );
				}
			}
			result = aa_xpath(xml,xpath,false);
		} catch(e) { log("failed create xpath item :" + xpath + "," + e.message); return []; }
	}
	
	return result;
    
  function log(msg) {
  	if (ajaxart.log) ajaxart.log(msg);
  }	
}
aa_xmlinfos = [];
function aa_getXmlInfo(xml,context,donotcreate)
{
  if (xml && !xml.nodeType ) return xml;
  if (!xml || xml.nodeType != 1) return null;
  for(var i=aa_xmlinfos.length-1;i>=0;i--)   // we'll probably use the last ones defined 
	  if (aa_xmlinfos[i].Xml == xml) return aa_xmlinfos[i];
  
  if (donotcreate) return null;
  
  var out = { isObject: true, Xml: xml };
  aa_xmlinfos.push(out);
  return out;
}
function aa_removeXmlInfo(xml,context)
{
  for(var i=aa_xmlinfos.length-1;i>=0;i--)   // we'll probably use the last ones defined 
	  if (aa_xmlinfos[i].Xml == xml) { 
		  aa_xmlinfos.splice(i,1); 
		  return;
	  }
}

function aa_nextElementSibling(node) {
	var out = node.nextSibling;
	if (out && out.nodeType != 1) return aa_nextElementSibling(out);
	return out;
}

function aa_prevElementSibling(node) {
	var out = node.previousSibling;
	if (out && out.nodeType != 1) return aa_prevElementSibling(out);
	return out;
}

function aa_insertAfter(newnode,existingnode) {
	if (!existingnode) return;
	existingnode.parentNode.insertBefore(newnode,existingnode.nextSibling);
}

function aa_xml_cloneNodeCleanNS(elem,doc) {
	if (elem.nodeType != 1) return null;
	doc = doc || elem.ownerDocument;
	var out = doc.createElement(getLocalName(elem.localName,elem.tagName));

	for (var i=0; i<elem.attributes.length; i++) {
		var attr = elem.attributes.item(i);
		if (attr.name == 'xmlns') continue;
		if (attr.name.indexOf('xmlns:') == 0) continue;
		out.setAttribute(getLocalName(attr.localName,attr.name),attr.nodeValue);		
	}

	for (var childNode = elem.firstChild;childNode != null;childNode=childNode.nextSibling)
	{
		if (childNode.nodeType == 1) 
			out.appendChild(aa_xml_cloneNodeCleanNS(childNode,doc));
		else if (childNode.nodeType == 3)  // text node
			out.appendChild(doc.createTextNode(childNode.nodeValue));		 
		else if (childNode.nodeType == 4)  // CDATA
			out.appendChild(doc.createCDATASection(childNode.nodeValue));		 
		else if (childNode.nodeType == 8)  // Comment
			out.appendChild(doc.createComment(childNode.nodeValue));		 
	}

	return out;

	function getLocalName(localName,name) {
		if (localName) return localName;
		if (name.indexOf(':') == -1) return name;
		return name.split(':')[1];
	}
}

function aa_xml2JSON(topXml) {
	if (!topXml || topXml.nodeType != 1) return {};
	var result = xmlToObject(topXml);

	return JSON.stringify(result);

	function xmlToObject(xml) {
		var obj = {};
		var isArray = false;
		var jbType;

		for (var i=0; i<xml.attributes.length; i++) {
			if (xml.attributes.item(i).name == '_jbType') {
				isArray = true;
				jbType = xml.attributes.item(i).value;
				obj = [];
			} else
				obj[xml.attributes.item(i).name] = xml.attributes.item(i).value;
		}
		for (var i=0;i<xml.childNodes.length;i++) {
			var child = xml.childNodes.item(i);			
			if (child.nodeType == 1) {
				if (isArray) {
					if (jbType == 'string[]')
						obj.push(child.firstChild ? child.firstChild.nodeValue : '');
					else if (jbType == 'number[]')
						obj.push(parseFloat(child.firstChild ? child.firstChild.nodeValue : ''));
					else if (jbType == 'boolean[]')
						obj.push((child.firstChild ? child.firstChild.nodeValue : '') == 'true');
					else
						obj.push(xmlToObject(child))
				} else
					obj[child.tagName] = xmlToObject(child);
			}
		}
		return obj;
	}
}

function aa_JSON2Xml(obj,tag,result)
{
	return json2Xml(obj || {},result || aa_parsexml('<' + tag + '/>'),0);
	function json2Xml(obj,result,depth)
	{
		if (typeof obj.cloneNode == 'function') 
			return obj.cloneNode(); // xml inside js object
		if (depth == 20) { debugger; return result.ownerDocument.createElement('TooMuchRecursion'); }
		if (typeof obj == 'string') {
			try {
				return json2Xml(JSON.parse(obj),result,depth+1);
			} catch(e) { 
				ajaxart.log("jsonToxml - Can not parse json " + obj,"error");
				return null; 
			}
		}
	
		try {
			var inner_tag;
			var isArray = aa_isArray(obj);
			if (isArray)
			{
				result.setAttribute('_jbType','array');
				inner_tag = 'item';
				var primitiveArrayItemType = '';
				for(var att in obj) {
				  if (typeof(obj[att]) == 'string') primitiveArrayItemType = 'string';
				  else if (typeof(obj[att]) == 'number') primitiveArrayItemType = 'number';
				  else if (typeof(obj[att]) == 'boolean') primitiveArrayItemType = 'boolean';
				}

				if (primitiveArrayItemType)
				{
					result.setAttribute('_jbType',primitiveArrayItemType+'[]');
					for(var k=0;k<obj.length;k++) {
						var item = result.ownerDocument.createElement(inner_tag);
						item.appendChild(item.ownerDocument.createTextNode(obj[k]));
						result.appendChild(item);
					}
					return result;
				}
			}
			// atts
			for(var att in obj) 
			 if (obj.hasOwnProperty(att)) {
				var inner = obj[att];
				if (inner == null) continue;
				var matchResult = att.match(/[a-zA-Z_0-9]+/);
				var att_fixed = matchResult ? matchResult[0] : '';
				if (att_fixed == '' || !isNaN(att_fixed.charAt(0)))
					att_fixed = '_jb_' + att_fixed;
				
				var _type = typeof(inner);
				if (_type == 'string' || _type == 'number' || _type == 'boolean') {
				  result.setAttribute(att_fixed,inner);
				} else { // elements
					var child = result.ownerDocument.createElement(inner_tag || att_fixed);
					child = json2Xml(inner,child,depth+1);
					result.appendChild(child);
				}
			}
		} catch (e) {
					debugger;
					alert(e);
		}
		return result;
	}
}

function aa_xml_clean_inner_texts(xml)
{
	var innerTexts = [];
	for(var iter=xml.firstChild;iter;iter=iter.nextSibling)
		if (iter.nodeType == 3) innerTexts.push(iter);

	for(var i=0;i<innerTexts.length;i++)
		xml.removeChild(innerTexts[i]);
}

function aa_innerText(elem,autoCreate) {
	for(var iter=elem && elem.firstChild;iter;iter=iter.nextSibling)
		if (iter.nodeType == 3) return iter;
	if (autoCreate) {
		var out = elem.ownerDocument.createTextNode('');
		elem.appendChild(out);
		return out;
	}
}