ajaxart.load_plugin("yesno");

aa_gcs("yesno", {
	EqualsTo: function(profile, data, context) {
		var to = ajaxart.run(data, profile, 'To', context);

		if (to.length == 0 && data.length == 0) return ["true"];
		if (to.length == 0 || data.length == 0) return [];

		var to_comp = to[0];
		var data_comp = data[0];

		if (aa_itemsEqual(to_comp, data_comp)) return ["true"];
		return [];
	},
	BooleansEqual: function(profile, data, context) {
		var item1 = aa_bool(data, profile, 'Item1', context);
		var item2 = aa_bool(data, profile, 'Item2', context);
		if (item1 == item2) return ["true"];
		return [];
	},
	IsOneOf: function(profile, data, context) {
		var val = aa_first(data, profile, 'Value', context);
		var optionProfs = ajaxart.subprofiles(profile, 'Option');

		if (val == null) return [];

		for (var i in optionProfs) {
			var options = ajaxart.run(data, optionProfs[i], '', context);
			for (var j in options)
			if (aa_itemsEqual(val, options[j])) return ["true"];
		}
		return [];
	},
	EqualsToList: function(profile, data, context) {
		var list = ajaxart.run(data, profile, 'To', context);
		if (list.length != data.length) return [];

		for (var i = 0; i < list.length; i++) {
			if (!aa_itemsEqual(list[i], data[i])) return [];
		}
		return ["true"];
	},
	GreaterThan: function(profile, data, context) {
		var type = aa_text(data, profile, 'Type', context);
		var alsoEqual = aa_bool(data, profile, 'AlsoEqual', context);
		var i1,i2;
		if (type == 'number') { i1 = aa_int(data, profile, 'Item', context); i2 = aa_int(data, profile, 'Than', context) }
		if (type == 'text') { i1 = aa_text(data, profile, 'Item', context); i2 = aa_text(data, profile, 'Than', context) }
		if (type == 'date') { i1 = aadate_date2int(aa_text(data, profile, 'Item', context)); i2 = aadate_date2int(aa_text(data, profile, 'Than', context)) };
	    if (i1 > i2 || (alsoEqual && i1 >= i2)) return ['true'];
		return [];
	},
	LessThan: function(profile, data, context) {
		var type = aa_text(data, profile, 'Type', context);
		var alsoEqual = aa_bool(data, profile, 'AlsoEqual', context);
		var i1,i2;
		if (type == 'number') { i1 = aa_int(data, profile, 'Item', context); i2 = aa_int(data, profile, 'Than', context) }
		if (type == 'text') { i1 = aa_text(data, profile, 'Item', context); i2 = aa_text(data, profile, 'Than', context) }
		if (type == 'date') { i1 = aadate_date2int(aa_text(data, profile, 'Item', context)); i2 = aadate_date2int(aa_text(data, profile, 'Than', context)) };
	    if (i1 < i2 || (alsoEqual && i1 <= i2)) return ['true'];
		return [];
	},
	MathCondition: function(profile, data, context) {
	  var exp = aa_text(data,profile,'Expression',context);
	  try
	  {
		  eval('var val = ' + exp);
		  return aa_frombool(!!val);
	  }
	  catch(e) {}
	},
	DynamicAnd: function(profile, data, context) {
		var items = ajaxart.run(data, profile, 'DynamicItems', context);
		var ctx1 = aa_ctx(context, { OriginalInput: data });

		for (var i = 0; i < items.length; i++) {
			if (!aa_bool([items[i]], profile, 'ConditionOnItem', ctx1)) return [];
		}
		return ["true"];
	},
	ContainsRegex: function(profile, data, context) {
		var text = aa_text(data, profile, 'Text', context);
		var regex = aa_text(data, profile, 'Regex', context);

		if (text.search(regex) > -1) return ["true"];
	},
	Contains: function(profile, data, context) {
		var ignoreCase = aa_bool(data, profile, 'IgnoreCase', context);
		var ignoreOrder = aa_bool(data, profile, 'IgnoreOrder', context);
		var oneOf = aa_bool(data, profile, 'OneOf', context);
		var allText = ajaxart.run(data, profile, 'AllText', context);

		var data_text = "";
		if (ajaxart.isxml(allText)) data_text = ajaxart.xml2text(allText);
		else data_text = ajaxart.totext(allText);

		data_text = data_text.replace(/\s+/g, ' '); // normalize white spaces
		//if (data_text == "") return [];
		var text_items = ajaxart.runsubprofiles(data, profile, 'Text', context);
		//var text_profiles = ajaxart.subprofiles(profile,'Text');
		var startIndex = 0;
		if (data_text == null || text_items.length == 0) return [];
		if (ignoreCase) data_text = data_text.toLowerCase();
		for (var i = 0; i < text_items.length; i++) {
			var text = ajaxart.totext_item(text_items[i]).replace(/\s+/g, ' ');
			if (ignoreCase) text = text.toLowerCase();
			var new_index = data_text.indexOf(text, startIndex);
			if (!oneOf && new_index == -1) return [];
			if (oneOf && new_index != -1) return ['true'];
			startIndex = new_index + text.length;
			if (ignoreOrder || oneOf) startIndex = 0;
		};

		if (oneOf) return [];
		return ['true'];
	},
	IsInList: function(profile, data, context) {
		var list = ajaxart.run(data, profile, 'List', context);
		var item = aa_first(data, profile, 'Item', context);
		if (item == null) return [];

		for (var i = 0; i < list.length; i++) {
			if (aa_itemsEqual(item, list[i])) return ["true"];
		}
		return [];
	},
	IsStruct: function(profile, data, context) {
		return aa_frombool(ajaxart.isObject(data[0]));
	},
	IsXml: function(profile, data, context) {
		if (data.length == 0) return [];
		if (ajaxart.isxml(data[0])) return ["true"];
		return [];
	},
	VariableExists: function(profile, data, context) {
		var varname = aa_text(data, profile, 'VarName', context);
		if (!context.vars[varname]) return [];
		return ["true"];
	},
	NotInLocalHost: function(profile, data, context) {
		if (window.location.href.indexOf('localhost') > -1) return [];
		return ["true"];
	},
	ConditionByJavascript: function(profile, data, context) {
		var code = aa_text(data, profile, 'Javascript', context);
		var result = aa_run_js_code(code, data, context);
		if (result == true) return ['true'];
	},
	IsSingleValue: function(profile, data, context) {
		var val = ajaxart.run(data, profile, 'Value', context);
		if (val.length == 1) return ["true"];
		return [];
	},
	IsMultipleValue: function(profile, data, context) {
		var value = ajaxart.run(data, profile, 'Value', context);
		if (value.length > 1) return ["true"];
		return [];
	},
	ListContains: function(profile, data, context) {
		var inner = aa_run(data,profile,'InnerList',context);
		var outer = aa_run(data,profile,'OuterList',context);
		var contains = aa_text(data,profile,'Contains',context);

		for(var i=0;i<inner.length;i++) {
			var found = itemInOuter(inner[i]);
			if (contains == 'one of' && found) return ['true'];
			if (contains == 'all' && !found) return [];
		}
		if (contains == 'one of') return [];
		return ['true'];

		function itemInOuter(item) {
			for(var i=0;i<outer.length;i++)
				if (outer[i] == item) return true;

			return false;
		}
	},
	NumberInRange: function(profile, data, context) {
		var from = aa_float(data, profile, 'From', context);
		var to = aa_float(data, profile, 'To', context);
		var num = parseFloat(ajaxart.totext(data));
		if (num >= from && num <= to) return ["true"];
		return [];
	},
	NotAnyOf: function(profile, data, context) {
		var subprofiles = ajaxart.subprofiles(profile, 'Item');

		for (var i = 0; i < subprofiles.length; i++) {
			if (aa_bool(data, subprofiles[i], "", context)) return [];
		};
		return ["true"];
	},
	PassesCondition: function(profile, data, context) {
		return aa_bool(data, profile, 'Expression', context);
	},
	IsWritableText: function(profile, data, context) {
		if (ajaxart.isxml(data)) return ["true"];
		return [];
	},
	IsNumber: function(profile, data, context) {
		var value = aa_text(data, profile, 'Value', context);
		if (value == "") return [];
		if (!isNaN(Number(value))) return ["true"];
		return [];
	},
	InStudio: function(profile, data, context) {
		return aa_frombool(ajaxart.jbart_studio);
	}

});


function aa_textInList(text, list) {
	for (var i = 0; i < list.length; i++)
	if (text == list[i]) return true;
	return false;
}

function aa_isEmpty(data, checkInnerText) {
	if (data.length == 0) return ["true"];
	for (var i=0; i<data.length; i++)
		if (!isEmpty(data[i]))
			return [];
	return ["true"];
	
	function isEmpty(item) {
		if (item.GetValue) item = item.GetValue()[0];
		if (typeof(item) == "string" && item == "") return true;
		if (ajaxart.isxml(item)) {
			if (item.nodeType == 3 || item.nodeType == 4) // inner text
			return item.nodeValue == "";
			if (item.nodeType == 2) // attribute
			return item.nodeValue == "";
			if (item.nodeType == 1 && checkInnerText) // element
			{
				if (item.attributes.length > 0) return false;
				var children = item.childNodes;
				if (children.length == 0) return true;
				if (children.length == 1 && (children[0].nodeType == 3 || children[0].nodeType == 4) && children[0].nodeValue == "") return ["true"];
			}
		}
	}
}

function aa_itemsEqual(item1, item2) {
	var item1Comp = item1;
	var item2Comp = item2;

	if (ajaxart.isxml(item1)) {
		if (item1.nodeType == 2) // att
		item1Comp = '' + item1.nodeValue;
		else item1Comp = ajaxart.xml2text(item1).replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "").replace(/>[ ]*</g, "><");
		if (ajaxart.ishtml(item1)) item1Comp = item1Comp.replace(/class=(\w+)/g, 'class="$1"');
	}
	if (ajaxart.isxml(item2)) {
		if (item2.nodeType == 2) // att
		item2Comp = '' + item2.nodeValue;
		else item2Comp = ajaxart.xml2text(item2).replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "").replace(/>[ ]*</g, "><");
		if (ajaxart.ishtml(item2)) item2Comp = item2Comp.replace(/class=(\w+)/g, 'class="$1"');
	}
	// Compare text to xml element : compare to inner text
	if (ajaxart.isxml(item1) && !ajaxart.isxmlelement(item2) && item1.nodeType == 1) item1Comp = ajaxart.xml.innerTextStr(item1);
	if (ajaxart.isxml(item2) && !ajaxart.isxmlelement(item1) && item2.nodeType == 1) item2Comp = ajaxart.xml.innerTextStr(item2);

	if (ajaxart.isObject(item1) || ajaxart.isObject(item2)) {
		if (ajaxart.isObject(item1) && ajaxart.isObject(item2)) {
			for (i in item1) {
				if (i != "isObject") {
					var item1val = item1[i];
					var item2val = item2[i];
					if (typeof(item2val) != typeof(item1val)) return false;
					if (typeof(item1val) == "undefined" && typeof(item2val) == "undefined") continue;
					if (aa_isArray(item1val) && item1val.length > 0) item1val = item1val[0];
					if (aa_isArray(item2val) && item2val.length > 0) item2val = item2val[0];
					if (aa_isArray(item1val) && item1val.length == 0 && aa_isArray(item2val) && item2val.length == 0) continue;
					if (!aa_itemsEqual(item1val, item2val)) return false;
				}
			}
			return true;
		}
		return false;
	}

	if (item1Comp == item2Comp) return true;

	return false;
}