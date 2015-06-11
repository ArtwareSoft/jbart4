ajaxart.load_plugin("gchart","plugins/ui/googlechart.xtml");
ajaxart.load_plugin("fusion_chart","plugins/ui/fusioncharts.xtml");

ajaxart.gcs.gchart =
{
	GoogleChart: function (profile,data,context)
	{
		var graph = aa_generic_graph(data,profile,context);
		graph.OnClick =  function(selection) 
		{
   			var wrapper  = this.items[selection[0].row];
   			var item = wrapper.__item || wrapper;
   			var ctx = aa_ctx(context,{_ItemsOfOperation: [item]})
   			ajaxart.run([item],profile,'OnClick',ctx);
   		}
		graph.PrepareGraphData= function(gdata) {
		  var cntr = context.vars._Cntr[0];
		  var dataholder_cntr = context.vars.DataHolderCntr && context.vars.DataHolderCntr[0];
		  if (!dataholder_cntr) return [];
		  var fields = dataholder_cntr.DataHolder.Fields;

		  var type = aa_text(data,profile,'Type',context);
		  var requiresNumericLabel = type == 'ScatterChart';
		  var dateAsObject = aa_text(data,profile,'Type',context) == 'AnnotatedTimeLine';
		  //this.dataview = context.vars.DataView ? context.vars.DataView[0] : cntr.DataHolder.UserDataView;
		  var items = this.items = aa_items(cntr);
		  var labelField = aa_fieldById(aa_text(data,profile,'LabelField',context),fields);
		  var amountField = aa_fieldById(aa_text(data,profile,'AmountField',context),fields);
		  var amount2Field = aa_fieldById(aa_text(data,profile,'Amount2Field',context),fields);
		  var amount3Field = aa_fieldById(aa_text(data,profile,'Amount3Field',context),fields);
		  if (labelField == null) // look for label
			  labelField = aa_fieldById('Name',fields) || aa_fieldById('Id',fields) || aa_fieldById('Label',fields);
		  if (labelField == null) // look for first date
			  for(var i in fields)
				  if (fields[i].IsDate)
				  {
					  labelField = fields[i];
					  break;
				  }
		  if (amountField == null) // look for first numeric
			  for(var i in fields)
				  if (fields[i].FieldType == 'number')
				  {
					  amountField = fields[i];
					  break;
				  }
		  if (amountField == null || labelField == null) return;
		  this.Params.hAxis = {title: labelField.Title};
		  if (!amount2Field)
			  this.Params.vAxis = {title: amountField.Title};

		  if (dateAsObject && labelField.IsDate)
			  gdata.addColumn('date', labelField.Title);
		  else if (labelField.IsNumber && requiresNumericLabel)
			  gdata.addColumn('number', labelField.Title);
		  else
			  gdata.addColumn('string', labelField.Title);
		  gdata.addColumn('number', amountField.Title);
		  if (amount2Field) gdata.addColumn('number', amount2Field.Title);
		  if (amount3Field) gdata.addColumn('number', amount3Field.Title);
		  
		  gdata.addRows(items.length);
		  for(var i=0;i<items.length;i++) {
        	var item = items[i];
        	var label = ajaxart.totext_array(ajaxart_field_calc_field_data(labelField,[item],context));
        	var amount = parseFloat(ajaxart.totext_array(ajaxart_field_calc_field_data(amountField,[item],context))) || 0;
			if (dateAsObject && labelField.IsDate)
				gdata.setValue(i, 1, new Date(amount));
			else if (requiresNumericLabel) 
				gdata.setValue(i, 0, parseFloat(label) || 0);
			else
				gdata.setValue(i, 0, label || '');
			gdata.setValue(i, 1, amount);
			if (amount2Field) gdata.setValue(i, 2, parseFloat(ajaxart.totext_array(ajaxart_field_calc_field_data(amount2Field,[item],context))) || 0);
			if (amount3Field) gdata.setValue(i, 3, parseFloat(ajaxart.totext_array(ajaxart_field_calc_field_data(amount3Field,[item],context))) || 0);
		  }
	   }
	   var out = aa_create_graph_div(graph);
	   // for tests
	   var test_string = '';
	   var cntr = context.vars._Cntr[0];
	   var items = aa_items(cntr);
 	   var dataholder_cntr = context.vars.DataHolderCntr && context.vars.DataHolderCntr[0];
	   var fields = dataholder_cntr.DataHolder.Fields;
	   var labelField = aa_fieldById(aa_text(data,profile,'LabelField',context),fields);
	   var amountField = aa_fieldById(aa_text(data,profile,'AmountField',context),fields);
	   for(var i=0;i<items.length;i++)
		   test_string += ajaxart.totext_array(ajaxart_field_calc_field_data(labelField,[items[i]],context)) + ' - ' +  
		                  ajaxart.totext_array(ajaxart_field_calc_field_data(amountField,[items[i]],context));
	   var test_div = document.createElement('div');
	   test_div.className= 'aa_test';
	   test_div.setAttribute('test_string',test_string);
	   out.appendChild(test_div);
	   
	   return [out];
	},
	PieChart: function (profile,data,context) // depricated
	{
		var chartObj = { isObject: true, Items: ajaxart.run(data,profile,'Items',context) }
		chartObj.Title = aa_text(data,profile,'Title',context);
		chartObj.ChartClass = 'google.visualization.PieChart';
		chartObj.FrameWidth = chartObj.FrameHeight = "400px"; 
			
		aa_addMethod(chartObj,'ItemText',profile,'ItemText',context);
		aa_addMethod(chartObj,'ItemAmount',profile,'ItemAmount',context);
		aa_addMethod(chartObj,'OnItemClick',profile,'OnItemClick',context);
		
		return [ aa_piechart(chartObj,context) ];
	},		
	TimelineChart: function (profile,data,context) // depricated
	{
		var chartObj = { isObject: true, Items: ajaxart.run(data,profile,'Items',context).reverse() }
		
		chartObj.Title = aa_text(data,profile,'Title',context);
		chartObj.ChartClass = 'google.visualization.AreaChart';
		chartObj.GoogleParams = aa_text(data,profile,'GoogleParams',context);
		chartObj.FrameWidth = aa_text(data,profile,'FrameWidth',context);
		chartObj.FrameHeight = aa_text(data,profile,'FrameHeight',context);
			
		aa_addMethod(chartObj,'ItemText',profile,'Date',context);
		aa_addMethod(chartObj,'ItemAmount',profile,'ItemAmount',context);
		aa_addMethod(chartObj,'OnItemClick',profile,'OnItemClick',context);
		
		return [ aa_piechart(chartObj,context) ];
	}
}

function aa_piechart(chartObj,context)  // depricated
{
	var out = jQuery('<iframe src="lib/googlechart.html?ver='+ajaxart.build_version+'" style=" border-width:0 " width="'+chartObj.FrameWidth+'" height="'+chartObj.FrameHeight+'" frameborder="0" scrolling="no"/>')[0];
	out.info = { width: 450, height: 300 , chartClass: chartObj.ChartClass, title: chartObj.Title, googleParams: chartObj.GoogleParams};
	//out.info.googleParams = "width: '" + chartObj.Width + "', height: '" + chartObj.Height + "'";
	out.info.googleParams = '';
	if (chartObj.GoogleParams != "") out.info.googleParams = chartObj.GoogleParams;
	
	out.info.data = [];
	for(var i=0;i<chartObj.Items.length;i++) {
		var item = [ chartObj.Items[i] ], obj = {item: item};
		obj.text = aa_totext(aa_runMethod(item,chartObj,'ItemText',context));
		obj.amount = aa_toint(aa_runMethod(item,chartObj,'ItemAmount',context));
		obj.onclick = function(obj) { aa_runMethod(obj.item,chartObj,'OnItemClick',context); }
		out.info.data.push(obj);
	}
	return out;
}
function aa_load_googlegraph() {
	if (window.loading_googlegraphs) return;
	   window.loading_googlegraphs = true;
	   jQuery.ajax({
		   url: (window.location.host1 == 'localhost') ? 'lib/googlechart.js' : 'https://www.google.com/jsapi',  
		   dataType: 'script',
		   success: function(){
		   		jQuery('.aa_waiting_for_ggraph_load').each(function() { this.LoadGraph();});
		 	}
	   });
}
function aa_generic_graph(data,profile,context)
{
	   var graph = {
		   isObject: true,
		   Packages: ["corechart"],
		   Params: {
				width: aa_int(data,profile,'FrameWidth',context), 
				height: aa_int(data,profile,'FrameHeight',context), 
				title: aa_text(data,profile,'Title',context),
				isStacked: aa_bool(data,profile,'Stacked',context),
				legend: aa_text(data,profile,'Legend',context)
				},
		   Class: 'google.visualization.' + aa_text(data,profile,'Type',context),
		   drawChart: function() {
			        var data = new google.visualization.DataTable();
			        this.PrepareGraphData(data);
			        var chart;
			        var out = this.div;
			        var newChart = "new "+this.Class+"(out)"; // should be called without eval
			        try {
			        	chart = eval(newChart);
			        } catch(e) {}
			        chart.draw(data, this.Params);
			        google.visualization.events.addListener(chart, 'select', function(graph) { return function(e) {
			            var selection = this.getSelection();
			            if (!selection) return;
			            if (graph.OnClick)
			            	graph.OnClick(selection);
			        }}(graph));
			}
	   }
	   return graph;
}
function aa_create_graph_div(graph)
{
	   var out = document.createElement('div');
	   out.graph= graph;
	   graph.div = out;
 	   function ChartFactory(div) { return function() 
 	  	   { 
 		   		jQuery(div).removeClass("aa_waiting_for_ggraph_load");
 		   		div.graph.drawChart();
 	  	   }
 	   };

	   if (!window.google)
	   {
		   out.className="aa_waiting_for_ggraph_load";
		   out.LoadGraph = function()
		   {
			   google.load("visualization", "1", {packages:graph.Packages, callback: ChartFactory(this)});
		   }
		   aa_load_googlegraph();
	   }
	   else
	   {
		   google.load("visualization", "1", {packages:graph.Packages, callback: ChartFactory(out)});
	   }
	   return out;
}

// fusion charts
ajaxart.gcs.fusion_chart =
{
	FusionChart: function (profile,data,context)
	{
	   function load(out)
	   {
		   var xml = ajaxart.runNativeHelper(out.Items,profile,'GraphXml',aa_ctx(context,{ChartId: [out.getAttribute('id')], Items: out.Items}));
		   var swf = '/ajaxart/lib/chart/charts_library/FCF_' + (aa_bool(data,profile,'Stacked',context) ? 'Stacked' : 'MS') + aa_text(data,profile,'Type',context) + ".swf";
		   var myChart = new FusionCharts(swf, "myChartId", aa_text(data,profile,'Width',context), aa_text(data,profile,'Height',context)); 
		   var xmlAsText = ajaxart.xml2text(xml);
		   myChart.setDataXML(xmlAsText);
		   myChart.render(out);
	   }

	   if (! window.aa_FusionChartId) aa_FusionChartId =0;
	   aa_FusionChartId++;
	   var out = document.createElement('div');
	   out.setAttribute('id','aa_fusion_chart_' + aa_FusionChartId);
	   var items = out.Items = aa_items(context.vars._Cntr[0]);
	   
	   out.Profile = profile;
	   out.Context = context;
	   
	   // add index to items
	   for(var i=0;i<items.length;i++)
		   items[i].__Index = i;

	   if (!window.infosoftglobal)
	   {
		   out.className="aa_waiting_for_fusion_chart_load";
		   out.LoadGraph = function() 
		   {
			   load(this);
		   }
		   aa_load_fusion_chart();
	   }
	   else
		   load(out);

	   return [out];
	}
}

function aa_fusion_eventHandler(chartId,labelField,amountFieldId,index)
{
	var out = jQuery().find('#' + chartId)[0];
	if (!out) return;
	var item = out.Items[parseInt(index)+1];
	ajaxart.run([item],out.Profile,'OnClick',out.Context);
}
function aa_load_fusion_chart() {
	if (window.loading_fusion_chart) return;
	   window.loading_fusion_chart = true;
	   jQuery.ajax({
		   url: 'lib/chart/charts_library/FusionCharts.js', 
		   dataType: 'script',
		   success: function(){
		   		jQuery('.aa_waiting_for_fusion_chart_load').each(function() { this.LoadGraph();});
		 	}
	   });
}
