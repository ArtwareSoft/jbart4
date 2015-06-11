ajaxart.load_plugin("", "plugins/gstudio/gstudio_data_view.xtml");

aa_gcs("gstudio_data_view",{
	DataViewItems: function(profile, data, context) {
		var root = aa_text(data,profile,'Root',context);
		root = 'Settings';
		var value = ajaxart.getVariable(context,root);

		var rootItems = [{
			Text: root,
			ImageSpritePosition: '0,32',
			Value: value[0]
		}];

		rootItems.SubItems = function(item) {
			return subDataItems(item,this);
		};

		return rootItems;

		function subDataItems(item,list) {
			var xml = item.Value;
			var subitems = [];
			var alreadyAddedTags = {};

			subitems.SubItems = function(item) {
				return subDataItems(item,this);
			};

			if (xml.nodeType != 1) return null;
			for(var i=0;i<xml.attributes.length;i++) {
				var attrName = xml.attributes.item(i).name;
				subitems.push({
					Text: '@' + attrName + sampleValueTest(xml.getAttribute(attrName)),
					ImageSpritePosition: '16,32',
					Value: aa_xpath(xml,'@'+attrName)[0]
				});
			}
			for(var i=0;i<xml.childNodes.length;i++) {
				var subnode = xml.childNodes[i];
				if (subnode.nodeType == 1 && !alreadyAddedTags[subnode.tagName]) {
					alreadyAddedTags[subnode.tagName] = true;
					subitems.push({
							Text: subnode.tagName,
							ImageSpritePosition: '32,32',
							Value: subnode
					});					
				}
			}

			return subitems.length ? subitems : null;
		}

		function sampleValueTest(val) {
			if (!val) return '';
			if (val.length > 8) val = val.substring(0,8) + '...';
			return ' ('+val+')';
		}
	}
});

