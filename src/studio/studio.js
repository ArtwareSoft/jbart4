ajaxart.load_plugin("","plugins/aaeditor/field_dt_custom.xtml");
ajaxart.load_plugin("","plugins/studio/studio_suggest.xtml");

aa_gcs("studio_suggest",{
	IsItemlistContainer: function(profile,data,context) {
		var fieldXtml = data[0];
		var topForItems = fieldXtml;
		if (fieldXtml.nodeType != 1) return [];
		var iscontainer = fieldXtml.getAttribute('t') == 'field.ItemListContainer';
		if (!iscontainer) {
			topForItems = aa_xpath(fieldXtml,"FieldAspect[@t='field_aspect.ItemListContainer']")[0];
			iscontainer = !!topForItems;
		}

		if (!iscontainer) return [];
		if (aa_bool(data,profile,'XmlItemsOnly',context)) {
			return aa_frombool( aa_xpath(topForItems,'Items/@t')[0].nodeValue == 'itemlist.XmlItems' );
		}
		return ["true"];
	},
	HasNoInnerFieldWithIDSuffix: function(profile,data,context) {
		var xml = data[0];
		if (!xml || xml.nodeType != 1) return [];
		var suffix = aa_text(data,profile,'Suffix',context);
		var regex = new RegExp(suffix+'$');

		var fields = aa_xpath(xml,'Field');
		for(var i=0;i<fields.length;i++) {
			if (regex.test(fields[i].getAttribute('ID')))
				return [];
		}
		return ['true'];
	}
});

aa_gcs("js_dt",{
	OverrideFunctionInJSCode: function(profile,data,context) {
		var funcName = aa_text(data,profile,'FunctionName',context);
		var jscode = ajaxart.run(data,profile,'JSCode',context);

		var jscodeText = aa_totext(jscode);
		if (window[funcName]) {
			jscodeText += '\n\n' + window[funcName];
			ajaxart.writevalue(jscode,[jscodeText]);
		}
	}
});