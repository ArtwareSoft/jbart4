ajaxart.load_plugin("extjs","plugins/extjs/extjs.xtml");

function aa_ext_grid(itemlist,settings) 
{
    settings = aa_defaults(settings, { 
    	height: 400,
    	columnWidth: 130
  	});
  	var rtlSuffix = settings.rtl ? '-rtl' : '';
		var cssList = [ 'http://cdn.sencha.com/ext/gpl/5.0.0/build/packages/ext-theme-neptune/build/resources/ext-theme-neptune-all-rtl.css' ];
		var jsList = [ 
			'http://cdn.sencha.com/ext/gpl/5.0.0/build/ext-all-rtl.js'			
		];
		var themeJSFile = 'http://cdn.sencha.com/ext/gpl/5.0.0/build/packages/ext-theme-neptune/build/ext-theme-neptune.js';

		if (!window.jbExtjsInitialized) {
			window.jbExtjsInitialized = true;
			var extCssFix = '.x-body, .x-column-header, .x-grid-item  { font-family: arial !important;}';
			attachGlobalCssStyle(extCssFix);
		}
		
		if (window.Ext) Ext.onReady(init);
		else {
			$.when( aa_loadLib("ext", cssList , jsList) ).then( function() { 
				$.when( aa_loadLib("ext-neptune", [] ,[themeJSFile]) ).then( function() { 
					Ext.onReady(init); 
				});
			});
		}
		// Ext.onReady(init);
    itemlist.extRecords = [];	// todo: add after grid is ready
    itemlist.Ctrl = itemlist.el;
    itemlist.ShowItems = function () {
        var items = this.itemlistCntr.Items;
        // Incremental build is done by an aspect - this code is simple rendering
        for (var i = 0; i < items.length; i++) {
            var item = [items[i]];
			    	var record = [];
			      var fields = itemlist.VisibleFields;
			      for(var j=0;j<fields.length;j++) {
			      	var fieldID = fields[j].ID;
			      	var fieldData = aa_totext( fields[j].FieldData(item,itemlist.context) );
			      	if (fields[j].FieldType == 'number')  fieldData = parseFloat(fieldData);
			      	if (fields[j].FieldType == 'date') {			      		
			      		var millis = fields[j].DateConverter.ToMillis(fieldData,fields[j].DateStorageFormat);
			      		fieldData = new Date(millis);
			      	}
			      	record.push(fieldData);
			      }
			      itemlist.extRecords.push(record);
        }
    }
    itemlist.ParentOfItems = itemlist.el;
    //aa_itemlist(itemlist);
		function init() {
      aa_addOnAttachMultiple(itemlist.el, function() {
      	if (itemlist.el.jbExtRendered) return;
      	itemlist.el.jbExtRendered = true;

	      var modelName = 'Model' + (++ajaxart.unique_number);
	      var fields = itemlist.VisibleFields;
	      var records = [];
	      for (var i=0; i<itemlist.extRecords.length; i++)
	      	records.push( itemlist.extRecords[i] );

		    var store = {
					data: records,
					fields: []
				};
	      var extCols = [];

	      var fields = itemlist.VisibleFields;
	      for(var i=0;i<fields.length;i++) {
	      	var field = fields[i];
	      	var fieldTitle = aa_fieldTitle(field,itemlist.InputData,itemlist.Context);
	      	store.fields.push('a'+i);

	      	var col = {
	            text: aa_fieldTitle(field,itemlist.InputData,itemlist.Context),
	            sortable: true,
	            dataIndex: 'a' + i,
	            align: 'center'
	      	};
	      	if (settings.flex) col.flex = 1;
	      	else if (settings.columnWidth) col.width = settings.columnWidth;
	      	if (field.ExtLocked) col.locked = true;
	      	if (field.ExtWidth) col.width = field.ExtWidth;
	      	if (field.FieldType == 'number') col.xtype = 'numbercolumn';
	      	if (field.FieldType == 'date') {
	      		col.xtype = 'datecolumn';
            col.format = 'd/m/Y';
          }

	      	col.filter = true;
	      	extCols.push(col);
	      }
			  
	      Ext.widget({
            renderTo : itemlist.el,
            xtype    : 'grid',
            rtl: true,
            height   : settings.height,
            store    : store,
            columns: { items: extCols },
            plugins  : 'gridfilters'            
        })
		
			});
    }

    function attachGlobalCssStyle(cssText) {
			if (ajaxart.isIE78) {	// IE8 does not support changing innerHTML of attached style element
				var styleElem = jQuery("<style>" + cssText + "</style>")[0];
				var head = document.getElementsByTagName("head")[0];
				head.appendChild(styleElem);
			} else {
				var styleElem = $("<style></style>")[0];
				var head = document.getElementsByTagName("head")[0];
				head.appendChild(styleElem);

				if (styleElem.styleSheet)
					styleElem.styleSheet.cssText = cssText;
				else
					styleElem.innerHTML = cssText;
			}
    }
}
