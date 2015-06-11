ajaxart.load_plugin("chart","plugins/chart/charts.xtml");

aa_gcs("chart2", {
	Chart: function (profile,data,context)
	{
		var field = { };
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		field.Title = aa_multilang_text(data,profile,'Title',context);
		var ctx = aa_ctx(context,{_Field: [field]} );
		field.Fields = ajaxart.runsubprofiles(data,profile,'Field',ctx);
		
		field.Control = function(fieldData,ctx) {
			var items = ajaxart.run(data,profile,'ChartItems',aa_merge_ctx(context,ctx));
			var chartObject = aa_createChartObject(items,field.Fields,context);
			chartObject.Title = aa_multilang_text(data,profile,'ChartTitle',context);
			aa_bind(chartObject,'drilldownClick',function(selected) {
				aa_run(selected,profile,'OnDrilldownClick',context);
			});
			field.Chart = aa_first(data,profile,'Chart',ctx);
			if (field.Chart && field.Chart.IsTriplet) {
				chartObject.jElem = jQuery(field.Chart.Html);
				chartObject.control = chartObject.jElem[0];
				
				chartObject.jElem.addClass(aa_attach_global_css(field.Chart.Css,null,'chart'));
				aa_apply_style_js(chartObject,field.Chart,ctx);
			}
			jBart.trigger(field,'initChartObject',chartObject);  // allow non triplets to make effect
			return [chartObject.control];
		};
		
		ajaxart.runsubprofiles(data,profile,'FieldAspect',ctx);
		return [field];
	}
});

function aa_createChartObject(items,fields,context)
{
	var chartObject = {
		Items: items,
		Fields: fields,
		Context: context,
		control: jQuery('<div/>')[0],
		DataMatrix: function(includeHeaders) {
			var out = [];
			if (includeHeaders) {
				var headers = [];
				for(var j=0;j<this.Fields.length;j++) {
					var title = this.Fields[j].Title;
					headers.push(title);
				}
				out.push(headers);
			}
			for(var i=0;i<this.Items.length;i++) {
				var item = this.Items[i];
				var row = [];
				for(var j=0;j<this.Fields.length;j++) {
					var field = this.Fields[j];
					var fieldData = field.FieldData ? field.FieldData([item],context) : item;
					var textValue = aa_totext(fieldData);
					if (field.IsNumber || field.FieldType == 'number') {
						try {
						  textValue = parseFloat(textValue);
						} catch(e) { textValue = 0; }
					}
					row.push(textValue);
				}
				out.push(row);
			}
			return out;
		}
	};
	return chartObject;
}


