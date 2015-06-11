ajaxart.load_plugin("date");

aa_gcs("fld_type", {
	Date: function (profile,data,context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data,profile,'Style',context);
		field.FieldType = 'date';
		field.DateStorageFormat = aa_text(data,profile,'StorageFormat',context);
		field.DateDisplayFormat = aa_text(data,profile,'DisplayFormat',context);
		field.DateConverter = aa_first(data,profile,'DateConverter',context);

		field.Control = function(field_data,ctx) {
			ctx = aa_merge_ctx(context,ctx);
			var date = {
				value: aa_totext(field_data)
			};			
			date.valueInMillis = field.DateConverter.ToMillis(date.value,field.DateStorageFormat);
			date.displayText = field.DateConverter.FromMillis(date.valueInMillis,field.DateDisplayFormat);

			return [aa_renderStyleObject2(field.Style,date,field_data,field,ctx)];
		};

		field.SortType = {
	    compileValue: function(value) {
	        return field.DateConverter.ToMillis(aa_totext(value),field.DateStorageFormat);
	    },
	    sort: function(a,b) { return a.value-b.value; }
    };
	}
});

aa_gcs("date", {
		JBartDateConverter: function (profile,data,context) {
			return [{
				ToMillis: function(value,format) {
					if (format == '@') return parseInt(value);
					return aa_moment(value, format).toDate().getTime();
				},
				FromMillis: function(value,format) {
					if (!value) return '';
					if (format == '@') return value;
					return aa_moment(parseInt(value)).format(format);
				}				
			}];
		},
		Now: function (profile,data,context)
		{
			var format = aa_text(data,profile,'Format',context);
			var date = new Date();
			
			var timeZone = aa_text(data,profile,'TimeZone',context); 
			if (timeZone.indexOf('GMT') != -1)
			{
				try
				{
					var offset = parseInt(timeZone.substring(3)); // + date.getTimezoneOffset();
					date = new Date(date.getTime() +  offset * 60000);
				}
				catch(e) {}
			}
			if (format == "std")
			{
				var str = "" + ajaxart.pad2digits(date.getDate()) + '/' + ajaxart.pad2digits(date.getMonth()+1) + '/' + date.getFullYear();
				// str += " " + ajaxart.pad2digits(date.getHours()) + ":" + ajaxart.pad2digits(date.getMinutes());
				return [ str ];
			}
			if (format == "with time")
			{
				var str = "" + ajaxart.pad2digits(date.getDate()) + '/' + ajaxart.pad2digits(date.getMonth()+1) + '/' + date.getFullYear();
				str += " " + ajaxart.pad2digits(date.getHours()) + ":" + ajaxart.pad2digits(date.getMinutes());
				return [ str ];
			}
			if (format == "with time and seconds")
			{
				var str = "" + ajaxart.pad2digits(date.getDate()) + '/' + ajaxart.pad2digits(date.getMonth()+1) + '/' + date.getFullYear();
				str += " " + ajaxart.pad2digits(date.getHours()) + ":" + ajaxart.pad2digits(date.getMinutes()) + ":" + ajaxart.pad2digits(date.getSeconds());
				return [ str ];
			}
				         
			return ["" + date.getTime()];
		},
		GreaterThan: function (profile,data,context)
		{
			var date1 = aa_text(data,profile,'Date',context);
			var date2 = aa_text(data,profile,'GreaterThan',context);
			
			return aa_frombool(aadate_date2int(date1) > aadate_date2int(date2)); 
		}
});

function aa_dateLabel(dateObj) {
	dateObj.$el.text(dateObj.displayText);
}
ajaxart.pad2digits = function(num)
{
  if (num < 10) return "0" + num;
  return "" + num;
};

function str2Int(str)
{
	if (str == null) return 0;
	str = str.replace(/^0*/,'');
	var result = parseInt(str);
	if (isNaN(result))
		return 0;
	return result;
}
function aadate_currentYear()
{
		var d = new Date();
		var year = d.getYear();
		if (year < 1000)
			year += 1900;
		return year;
}
function aadate_currentMonth()
{
		return (new Date().getMonth())+1;
}

function aadate_date2int(date,endOfPeriod)
{
	if (date == null || date == '' || date == 'any') return endOfPeriod ? 10000000000 : 0;
	var result = new Date();
	result.setMinutes(0,0,0);
	if (date == 'today')
		resolution = 'day';

	var datePlusTime = date.split(" ");
	var date_part = datePlusTime[0];
	var parts = date_part.split("/");
	var resolution = '';
	if (parts.length == 1 && str2Int(parts[0]) < 32 && str2Int(parts[0]) > 0) // day only
	{
		result.setDate(str2Int(parts[0]));
		resolution = 'day';
	}
	else if (parts.length == 1 && str2Int(parts[0]) > 32) // year only
	{
		result.setFullYear(str2Int(parts[0]),endOfPeriod ? 11 : 0, endOfPeriod ? 31 : 1);
		resolution = 'year';
	}
	else if (parts.length == 2 && str2Int(parts[1]) < 13) // day and month
	{
		result.setFullYear(aadate_currentYear(),str2Int(parts[1]) -1, str2Int(parts[0]));
		resolution = 'day';
	}
	else if (parts.length == 2 && str2Int(parts[1]) > 1900) // month and year
	{
		result.setFullYear(str2Int(parts[1]),str2Int(parts[0]) -1, 1);
		if (endOfPeriod)
			result.setTime( result.setFullYear(str2Int(parts[1]),str2Int(parts[0]), 1)-1);
		resolution = 'month';
	}
	else if (parts.length == 3) // day month year
	{
		result.setFullYear(str2Int(parts[2]),str2Int(parts[1]) -1, str2Int(parts[0]));
		resolution = 'day';
	}
	result.setHours(0,0,0,0);
	if (datePlusTime.length > 1)
	{
		var times = datePlusTime[1].split(":");
		if (datePlusTime.length > 2 && datePlusTime[2] == 'PM')
			times[0] = '' + (str2Int(times[0]) + 12);
		result.setHours(str2Int(times[0]),str2Int(times[1]),str2Int(times[2]),0);
		resolution = 'minute';
	}
	var result = result.getTime();
	if (endOfPeriod && resolution == 'day')
		result += 86400000 -1;
	return result;
}
function aadate_stdDate2DateObj(date)
{
	var datePlusTime = date.split(" ");
	var date_part = datePlusTime[0];
	var parts = date_part.split("/");
	if (parts.length > 2 && parts[2].length == "2") parts[2] = "20" + parts[2];   // handle 1/1/05 -> 1/1/2005  
	if (datePlusTime.length == 0) return null;
	if (datePlusTime.length == 1)
		var d = new Date(str2Int(parts[2]), str2Int(parts[1],10)-1, str2Int(parts[0],10),0,0,0,0);
	else {
		var times = datePlusTime[1].split(":");
		if (times.length == 3) 
			var d = new Date(str2Int(parts[2]), str2Int(parts[1],10)-1, str2Int(parts[0],10), str2Int(times[0],10), str2Int(times[1],10),str2Int(times[2],10));
		else 
			var d = new Date(str2Int(parts[2]), str2Int(parts[1],10)-1, str2Int(parts[0],10), str2Int(times[0],10), str2Int(times[1],10));
	}
	
	return d;
}
function aadate_dateObj2StdDate(date)
{
	var year = date.getYear();
	if (year < 1000)
		year += 1900;
	var out = date.getDate()+"/"+ (date.getMonth()+1) +"/" + year;
	if (date.getHours() > 0 || date.getMinutes() > 0)
	  out += " " + ajaxart.pad2digits(date.getHours()) + ":" + ajaxart.pad2digits(date.getMinutes());
	return out;
}

function aadate_addToDate(date,amount_to_add,interval)
{
   var multipleBy = 86400000;  // day is default
   if (interval == 'hour') multipleBy = 3600000;
   if (interval == 'minute') multipleBy = 60000;
   if (interval == 'second') multipleBy = 1000;
	
	var d = aadate_stdDate2DateObj(date);
	d.setTime(d.getTime() + (amount_to_add * multipleBy));
	return aadate_dateObj2StdDate(d);
}
