ajaxart.load_plugin("", "plugins/itemtree/xmltree.xtml");

aa_gcs("xmltree",{
	XmlElementTreeItem: function(profile,data,context) {
    var field = aa_create_base_field(data, profile, context);

    field.Control = function(field_data, ctx) {
      var ctx2 = aa_merge_ctx(context,ctx);

      var treeNode = { 
      	xml: field_data[0], 
      	clickable: aa_hasParam(profile,'OnClick'),
      	nodeClick: function(xml,htmlElem) {
      		aa_run([xml],profile,'OnClick',aa_ctx(ctx2,{ControlElement: [htmlElem]}));
      	}
      };
      var out = aa_renderStyleObject2(field.Style, treeNode, field_data,field,ctx2);
      return [out];
    };
    return [field];
	}
});

function aa_xml_tree_node(treeNode,settings) {
	var xml = treeNode.xml;
//	if (xml.nodeType != 1) return;

	var $line = treeNode.$el;
	var $tag = treeNode.$el.firstOfClass('aa_xml_tag');
	$tag.text(xml.tagName);

	for (var i=0; i<xml.attributes.length; i++) {
		var name = xml.attributes.item(i).name;
		var $attr = $('<div class="aa_xml_attribute" />').appendTo($line);
		var $attrName = $('<div class="aa_xml_attribute_name" />').text(name+'=').appendTo($attr);
		var $attrValue = $('<div class="aa_xml_attribute_value" />').text(xml.getAttribute(name)).attr('title',xml.getAttribute(name)).appendTo($attr);

		if (treeNode.clickable) {
			$attr[0].jbXml = aa_xpath(xml,'@'+name)[0];
			$attr.click(function() {
				treeNode.nodeClick(this.jbXml,treeNode.el);
			});
		}
	}

	if (treeNode.clickable) {
		treeNode.$el.addClass('clickable');
		$tag.click(function() {
			treeNode.nodeClick(treeNode.xml,treeNode.el);
		});
	}
}
