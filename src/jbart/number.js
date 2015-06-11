aa_gcs("fld_type",{
	Number: function (profile,data,context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data,profile,'Style',context);
		field.FieldType = 'number';
		
		field.NumberFormat = aa_first(data,profile,'Format',context);

		field.Control = function(field_data,ctx) {
			var number = {
				value: aa_totext(field_data),
				format: field.NumberFormat,
				field: field,	context: context, field_data: field_data
			};
			return [aa_renderStyleObject(field.Style,number,ctx,true)];
		} 
		ajaxart.runNativeHelper(data,profile,'SortType',context);

		if (aa_bool(data,profile,'AlignToRightOnTables',context))	{
			ajaxart.runNativeHelper(data,profile,'AlignToRight',context);
		}
	},
	EditableNumber: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.Style = aa_first(data,profile,'Style',context);
		field.NumberFormat = aa_first(data,profile,'Format',context);

		aa_init_class_EditableNumber();

		field.Control = function(field_data,ctx) {			
			var numberApiObject = new ajaxart.classes.EditableNumber({
				value: aa_totext(field_data), 
				field: field, field_data: field_data,
				format: field.NumberFormat,
				allowEmptyValue: field.AllowEmptyValue,
				data: field_data, profile: profile, context: context
			});
			return [aa_renderStyleObject(field.Style,numberApiObject,ctx,true)];
		}

		if (aa_bool(data,profile,'NumberValidation',context)) {
			ajaxart.runNativeHelper(data,profile,'DefaultValidation',context);
		}
	}	
});
aa_gcs("number",{	
	Format: function (profile,data,context)
	{
		aa_init_class_NumberFormat();

		var format = new ajaxart.classes.NumberFormat({
			profile: profile, context: context,

			name: aa_text(data,profile,'Name',context),
			symbol: aa_text(data,profile,'Symbol',context),
			useDynamicSymbol: aa_bool(data,profile,'UseDynamicSymbol',context),
			min: parseFloat(aa_text(data,profile,'Min',context)), // do not use aa_float to avoid default 0
			max: parseFloat(aa_text(data,profile,'Max',context)),
			step: 1,
			initialPixelsPerUnit: 1
		});

		var ctx = aa_ctx(context,{_NumberFormat: [format]});
		ajaxart.run(data,profile,'UIHints',ctx);

		return [format];
	},
	FormatUIHints: function (profile,data,context) {
		var format = context.vars._NumberFormat[0];
		format.step = aa_float(data,profile,'Step',context) || 1;
		format.initialPixelsPerUnit = aa_float(data,profile,'InitialPixelsPerUnit',context);
	},
	FormatMoney: function (profile,data,context) {
		var value = aa_accounting().formatMoney(
			parseFloat(data[0].Value),
			'',
			aa_text(data,profile,'Precision',context),
			aa_text(data,profile,'Thousand',context),
			aa_text(data,profile,'Decimal',context),
			'%v'
		);

		var input = {
			Value: value,
			Symbol: data[0].Symbol
		}
		return aa_text([input],profile,'Format',context);
	}
});

function aa_init_class_NumberFormat() {
	
	if (ajaxart.classes.NumberFormat) return;

	ajaxart.classes.NumberFormat = function(settings) {	
		aa_extend(this,settings);
	};
	ajaxart.classes.NumberFormat.prototype.parse = function(dataString) {
		if (!dataString) return NaN;
		var parts = (''+dataString).match(/([^0-9\.\-]*)([0-9\.\-]+)([^0-9\.\-]*)/); // remove prefix string
		if (this.useDynamicSymbol && parts)
			this.symbol = parts[1] || parts[3] || this.symbol;
		var value = parts && parts[2];
		var v = parseFloat(value);
		return v;
	};
	ajaxart.classes.NumberFormat.prototype.getDisplayString = function(number) {
		if (isNaN(number)) return [(this.field && this.field.TextForEmptyValue) || ''];
		var data = [ { Value: number, Symbol: this.symbol }];
		return ajaxart.run(data,this.profile,'DisplayString',this.context);
	};

	ajaxart.classes.NumberFormat.prototype.getDataString = function(number) {
		if (isNaN(number)) return '';
		if (typeof number === 'number') number = '' + number;
		var data = [ { Value: number, Symbol: this.symbol }];
		return aa_text(data,this.profile,'DataString',this.context);
	};

}

function aa_number(number,settings) {
	settings = settings || {};
	settings.textElement = settings.textElement || number.el;

	var format = number.format;

	var num = format.parse(number.value);
	var text = format.getDisplayString(num);

	$(settings.textElement).text(text);
}