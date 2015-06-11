aa_gcs("cobrowse",{
	SimulateRoomMerge: function(profile,data,context) {
		var base = aa_first(data,profile,'Base',context);
		var myLatest = aa_first(data,profile,'MyLatest',context);
		var otherLatest = aa_first(data,profile,'OtherLatest',context);

		var result = aa_cb_mergeXmlFile(base,myLatest,otherLatest,false);
		return [result];
	}
});

function aa_cb_mergeXmlFile(base,myLatest,otherLatest) {
	var out = aa_parsexml('<result/>');

	compareElement(base,myLatest,otherLatest);


	function compareElement(baseElem,myElem,otherElem) {

		// attributes
		var allAttrNames = getAllAttributeNames(baseElem,myElem,otherElem);
		for (var attrName in allAttrNames) {
			if (myElem.getAttribute(attrName) != otherElem.getAttribute(attrName)) {
				var changedByMe = ( myElem.getAttribute(attrName) != baseElem.getAttribute(attrName) );
				var changedByOther = ( otherElem.getAttribute(attrName) != baseElem.getAttribute(attrName) );

				var myAttr = findAttribute(myElem,attrName);
				if (changedByMe && changedByOther) 
					reportConflict(myAttr,baseElem.getAttribute(attrName),myElem.getAttribute(attrName),otherElem.getAttribute(attrName));

				if (changedByMe && !changedByOther) continue; // all is fine
				if (!changedByMe && changedByOther) {
					myElem.setAttribute(attrName,otherElem.getAttribute(attrName) || '');
					reportChange(myAttr,otherElem.getAttribute(attrName));
				}
			}
		}

		// inner elements
		var innerElems = findInnerElements(baseElem,myElem,otherElem);
		for(var i in innerElems) {
			var baseInnerElem = toInnerElement(baseElem,innerElems[i]);
			var myInnerElem = toInnerElement(myElem,innerElems[i]);
			var otherInnerElem = toInnerElement(otherElem,innerElems[i]);

			if ((myInnerElem && !otherInnerElem) || (!myInnerElem && otherInnerElem) ) { // elem existance diff
				var addedByMe = (myInnerElem && !baseInnerElem);
				var addedByOther = (otherInnerElem && !baseInnerElem);
				var deletedByMe = (otherInnerElem && baseInnerElem && !myInnerElem);
				var deletedByOther = (myInnerElem && baseInnerElem && !otherInnerElem);

				if (addedByMe || deletedByMe) continue;
				if (addedByOther) {
					var addedElem = myElem.appendChild(otherInnerElem.cloneNode(true)); // TODO: add it in the right place
					reportAddElem(addedElem);
				}
				if (deletedByOther) {
					reportDeleteElem(myInnerElem);
					myElem.removeChild(myInnerElem);	
				}

			} else {
				compareElement(baseInnerElem,myInnerElem,otherInnerElem);		// compare the elem
			}

			if (baseInnerElem && myInnerElem && otherElem) {	// check order
				var baseIndex = innerElementIndex(baseElem,baseInnerElem);
				var myIndex = innerElementIndex(myElem,myInnerElem);
				var otherIndex = innerElementIndex(otherElem,otherInnerElem);

				if (myIndex != otherIndex) {
					var reorderedByMe = (myIndex != baseIndex);
					var reorderedByOther = (otherIndex != baseIndex);

					if (reorderedByOther) {
						reportOtherReorder(myInnerElem,otherIndex);
						changeElemIndex(myInnerElem,otherIndex);
					}
				}
			}
		}

	}

	function getAllAttributeNames(baseElem,myElem,otherElem) {
		var allAttrNames = {};

		for (var i=0; i<myElem.attributes.length; i++) {
			var attrName = myElem.attributes.item(i).name;
			allAttrNames[attrName] = true;
		}
		for (var i=0; i<baseElem.attributes.length; i++) {
			var attrName = baseElem.attributes.item(i).name;
			allAttrNames[attrName] = true;
		}
		for (var i=0; i<otherElem.attributes.length; i++) {
			var attrName = otherElem.attributes.item(i).name;
			allAttrNames[attrName] = true;
		}
		return allAttrNames;
	}

	function reportConflict(xmlNode,baseVal,myVal,otherVal) {
		var elem = out.ownerDocument.createElement('conflict');
		out.appendChild(elem);
		$(elem).attr('xpath',ajaxart.xml.xpath_of_node(xmlNode,true,true,myLatest)).attr('base',baseVal).attr('my',myVal).attr('other',otherVal);

	}

	function reportChange(xmlNode,otherVal) {
		var elem = out.ownerDocument.createElement('change');
		out.appendChild(elem);
		$(elem).attr('xpath',ajaxart.xml.xpath_of_node(xmlNode,true,true,myLatest)).attr('val',otherVal);

	}

	function reportAddElem(xmlNode) {
		var elem = out.ownerDocument.createElement('add');
		out.appendChild(elem);
		$(elem).attr('xpath',ajaxart.xml.xpath_of_node(xmlNode,true,true,myLatest));
	}

	function reportDeleteElem(xmlNode) {
		var elem = out.ownerDocument.createElement('delete');
		out.appendChild(elem);
		$(elem).attr('xpath',ajaxart.xml.xpath_of_node(xmlNode,true,true,myLatest));
	}

	function reportOtherReorder(myInnerElem,otherIndex) {
		var elem = out.ownerDocument.createElement('reorder');
		out.appendChild(elem);
		$(elem).attr('xpath',ajaxart.xml.xpath_of_node(myInnerElem,true,true,myLatest));
		$(elem).attr('index',otherIndex);
	}

	function changeElemIndex(myInnerElem,otherIndex) {
		var currentItem = aa_xpath(myInnerElem.parentNode,'*')[otherIndex];
		if (!currentItem)
			myInnerElem.parentNode.appendChild(myInnerElem); // as last
		else
			myInnerElem.parentNode.insertBefore(myInnerElem,currentItem); // as last
	}
	function findInnerElements(baseElem,myElem,otherElem) {
		var innerElems = {};

		var allChildNodes = [
			baseElem.childNodes,
			myElem.childNodes,
			otherElem.childNodes
		];
		for(var j=0;j<allChildNodes.length;j++) {
			var childNodes = allChildNodes[j];
			for(var i=0;i<childNodes.length;i++) {
				if (childNodes[i].nodeType == 1) {
					var key = childNodes[i].tagName;
					if (childNodes[i].getAttribute('id')) key += '_'+ childNodes[i].getAttribute('id');
					innerElems[key] = { tag: childNodes[i].tagName, id: childNodes[i].getAttribute('id') };
				}
			}
		}
		return innerElems;
	}

	function toInnerElement(parent,innerElem) {
		var items = aa_xpath(parent,innerElem.tag);
		for(var i=0;i<items.length;i++) {
			if (innerElem.id) {
			 if (items[i].getAttribute('id') == innerElem.id) return items[i];
			} else {
				return items[i];
			}
		}
	}

	function innerElementIndex(parent,innerElem) {
		var children = aa_xpath(parent,'*');
		for(var i=0;i<children.length;i++)
			if (children[i] == innerElem) return i;
		return -1;
	}

	function findAttribute(elem,attr) {
		for (var i=0; i<elem.attributes.length; i++) {
			if (elem.attributes.item(i).name == attr)
				return elem.attributes.item(i);
		}
		elem.setAttribute(attr,'');
		return findAttribute(elem,attr);
	}

	return out;
}
