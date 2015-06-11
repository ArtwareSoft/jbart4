ajaxart.load_plugin("R", "plugins/R/r.xtml");

aa_gcs("R",	{
	R2DPivot: function (profile,data,context) {
		aa_init_class_R2DPivot();
		var field = aa_create_base_field(data, profile, context);

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context, ctx);

			var dataMatrix = aa_text(field_data,profile,'DataMatrix',ctx2);

			var r2DPivot = new ajaxart.classes.R2DPivot({
				profile: profile,
				field: field,
				field_data: field_data,
				context: ctx2,
				dataMatrix: dataMatrix
			});

			return [aa_renderStyleObject(field.Style, r2DPivot, ctx2, true)];
		};
		return [field];		
	}
});

function aa_init_class_R2DPivot() {
	
	if (ajaxart.classes.R2DPivot) return;

	ajaxart.classes.R2DPivot = function(settings) {
		aa_extend(this, settings);
	};
	ajaxart.classes.R2DPivot.prototype.injectItemControl = function(parentDiv,item) {
		if (!this.itemDisplayPage) return false;
		$(parentDiv).children().remove();
		aa_fieldControl({ FieldData: item.item, Wrapper: parentDiv, Context: this.context });
		return true;
	}
}

function aa_r_table_pivot(pivot,settings) {
  settings = settings || {};

  var lines = pivot.dataMatrix.replace(/"/g,'').replace(/,NA/g,',0').split('\n');
  if (!lines[0]) lines = lines.slice(1);
  if (!lines[lines.length-1]) lines = lines.slice(0,-1);

  var xtitles = lines[0].split(',');
  var header_line = pivot.$el.find('.header_line');
  var header_top_proto = pivot.$el.find('.header_top');
  var value_line_proto = pivot.$el.find('.value_line');

  // xtitles
  for(var i=1;i<xtitles.length;i++)
    header_top_proto.clone(true).text(xtitles[i]).insertBefore(header_top_proto);
  header_top_proto.remove();
  
  // data lines
  for(var i=1;i<lines.length;i++) {
    var dataLine = lines[i].split(',');
    var line = value_line_proto.clone(true).insertBefore(value_line_proto);
    line.find('.header_left').text(dataLine[0]);
    var value_cell_proto = line.find('.value_cell');

	for(var j=1;j<dataLine.length;j++)
      value_cell_proto.clone(true).text(dataLine[j]).insertBefore(value_cell_proto);
    value_cell_proto.remove();
  }
  value_line_proto.remove();
}


function aa_drawComboChart(pivot,options) {

  function aa_R2DPivot2GoogleDT(dataMatrix) {
	  var lines = dataMatrix.replace(/"/g,'').replace(/,NA/g,',0').split('\n');
	  if (!lines[0]) lines = lines.slice(1);
	  if (!lines[lines.length-1]) lines = lines.slice(0,-1);
	  var result = [];
	  for(var i=0;i<lines.length;i++) {
	  	var line = lines[i].split(',');
	  	if (i!=0) // convert data to ints
		  	for (var j=1;j<line.length;j++)
	    		line[j] = parseInt(line[j]);
	  	result.push(line);
	  }
	  return result;
	}

	options = options || { seriesType: "bars"};
	aa_loadGoogleCharts(pivot.el, function() {
		var mat = aa_R2DPivot2GoogleDT(pivot.dataMatrix);
	  var data = google.visualization.arrayToDataTable(mat);
	  var gchart = new google.visualization.ComboChart(pivot.el);
	  gchart.draw(data, options );
	});
}

function aa_loadGoogleCharts(elem,callback) {
    aa_loadJsFile({
     url :'https://www.google.com/jsapi',
     variableToFind: 'google',
     success: function() {
        aa_loadJsFile({
          isLoaded: function() { return google.visualization; },
          loadFunction: function() {
            google.load("visualization", "1", {callback:'' , packages:["corechart"]});
          },
          success: function() {
            aa_addOnAttach(elem,function() {
              callback();
            });
          }
        });
     }
    });
  }
 