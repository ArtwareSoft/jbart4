ajaxart.load_plugin("parser");

aa_gcs("parser", {
	RemoveSection: function (profile,data,context) {
		var begin = aa_text(data,profile,'BeginPattern',context);
		var end = aa_text(data,profile,'EndPattern',context);
		
		function removeOneSection(html) {
			var lowerCase = html.toLowerCase();
			var from = lowerCase.indexOf(begin);
			var to = lowerCase.indexOf(end,from);
			if (from == -1 || to == -1) return html;
			return html.substring(0,from) + html.substring(to + end.length);
		}
		
		var result = aa_text(data,profile,'Html',context);
		var next = removeOneSection(result);
		while (next.length < result.length) {
			result = next;
			next = removeOneSection(result);
		}
		return [result];
	},
	ExtractBody: function (profile,data,context) {
		var result = aa_text(data,profile,'Html',context);
		var lowerCase = result.toLowerCase();
		var from = lowerCase.indexOf('<body');
		if (from != -1) from = lowerCase.indexOf('>',from);
		var to = lowerCase.indexOf('</body');
		if (from != -1 && to != -1)
			result = '<div' + result.substring(from,to) + '</div>';
		return [result];
	}
});



/*********************** UI For Preview Html *************************************/

aa_gcs("parser",{
	PreviewHtml: function(profile, data, context) {
		var field = aa_create_base_field(data, profile, context);
		var style = aa_first(data, profile, 'Style', context);

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context,ctx);
			var htmlPreview = { 
				html_text: aa_text(field_data,profile,'Html',context) 
			};
			return [aa_renderStyleObject2(style,htmlPreview,field_data,field,ctx2,{})];
		};
		return [field];
	}
});


function aa_htmlPreview(htmlPreview) {
	var iframe = $('<iframe src="about:black" />')[0];
	htmlPreview.el.appendChild(iframe);

	aa_addOnAttachMultiple(htmlPreview.el,function() {
		var doc = iframe.contentDocument;
		doc.open();
	  doc.write(htmlPreview.html_text);
	  doc.close();
	});
}