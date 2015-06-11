ajaxart.load_plugin("data","plugins/jbart/data.xtml");
ajaxart.load_plugin("data","plugins/data/csv.xtml");
ajaxart.load_plugin("data","plugins/data/js.xtml");

aa_gcs("data",	{
	  Switch: function (profile,data,context)
	  {
		  return aa_switch(profile,data,context);
	  },
	  StringifyJson: function (profile,data,context) {
		  var obj = aa_first(data,profile,'Object',context) || {};
		  var xtmlSource = obj.XtmlSource;
		  var dtsupport = obj.dt_support;
		  delete obj.XtmlSource;
		  delete obj.dt_support;
		  if (aa_bool(data,profile,'PrettyPrint',context))
		  	var result = JSON.stringify(obj,null, '  ');
		  else
		  	var result = JSON.stringify(obj);

		  if (xtmlSource) obj.XtmlSource = xtmlSource;
		  if (dtsupport) obj.dt_support = dtsupport;
		  return [result];
	  },
		RemoveNullProperties: function (profile,data,context) {
		  var orig = aa_first(data,profile,'Object',context) || {};
		  var out = {};
		  for (i in orig)
		 	if (orig.hasOwnProperty(i) && orig[i] != null) out[i] = orig[i];
		  return [out]
	  },
	  DataWithPreAction: function (profile,data,context) {
	  	aa_run(data,profile,'Action',context);
	  	return aa_run(data,profile,'Query',context);
	  },
	  ParseJson: function (profile,data,context) {
	  	var result= JSON.parse(aa_text(data,profile,'JSON',context));
	    if (aa_isArray(result)) return result;
	  	return [result || '{}'];
	  },
	  Subset: function (profile,data,context)
	  {
	    var from = aa_int(data,profile,'From',context)-1;
	    var count = aa_int(data,profile,'Count',context);
	    if (isNaN(count)) count = data.length;
	    return data.slice(from,from+count);
	  },
	  SubsetWithMore: function (profile,data,context)
	  {
	    var from = aa_int(data,profile,'From',context)-1;
	    var count = aa_int(data,profile,'Count',context);
	    if (isNaN(count)) count = data.length;
	    var out = data.slice(from,from+count);
	    if (out.length < data.length) {
		    out.push(aa_first(data,profile,'ItemForMore',context));
	    }
	    return out;
	  },
	  JustInTimeCalculation: function (profile,data,context)
	  {
		  var out = { isObject:true, Content:null };
		  out.GetContent = function(data1,ctx) {
			  if (out.Content == null) {
				  out.Content = ajaxart.run(data1 || data,profile,'Content',aa_merge_ctx(context,ctx));
			  }
			  return out.Content;
		  }
		  out.CleanContent = function() {
		  	out.Content = null;
		  }
		  return [out];
	  },
	  JavaScript: function (profile,data,context)
	  {
			var ret = aa_run_js_code(aa_text(data,profile,'Code',context),data,context);
			if (!ret) return [];
			if (typeof(ret) == 'string') return [ret];
			if (typeof(ret) == 'number') return [""+ret];
			if (typeof(ret) == 'boolean') {
				if (ret) 
					return ["true"];
				else
					return [];
			}
			if (aa_isArray(ret)) return ret;
			return [ret];
	  },
	  AddSeparator: function (profile,data,context)
	  {
	    var addBefore = aa_first(data,profile,'AddBefore',context);
	    var addAfter = aa_first(data,profile,'AddAfter',context);
	    
			var out = [];
			if (addBefore) out.push(addBefore);

	  	ajaxart.each(data,function(item,i) {
	  	    var Separator = aa_first(data,profile,'Separator',context);
	  			out.push(item);
	  			if (i+1 < data.length && Separator != null)
	  		  	out.push(Separator);
	  	});
	  	if (addAfter) out.push(addAfter);
	  	return out;  	
	  },
	  NewValueWithItemIndex: function (profile,data,context)
	  {
	  	return aa_map(data,function(item,index) {
	  		return aa_first([item],profile,'Value',aa_ctx(context,{ Index: [index] }));
	  	});
	  },
	  Count: function (profile,data,context)
	  {
		  var items = ajaxart.run(data,profile,'Items',context);
			return [items.length];
	  },
	  FirstSucceeding: function (profile,data,context)
	  {
	    var itemProfiles = ajaxart.subprofiles(profile,'Item');

	    for(var i=0;i<itemProfiles.length;i++)
	    {
				var subresult = ajaxart.run(data,itemProfiles[i],"",context);
				if (subresult.length > 0) return subresult;
			}
			return [];
	  },
	  IfThenElse: function (profile,data,context)
	  { 
		return aa_ifThenElse(profile,data,context);
	  },
	  ItemByID: function (profile,data,context)
	  {
		  var list = ajaxart.run(data,profile,'List',context);
		  var id = aa_text(data,profile,'ID',context);
		  
		  for(var i=0;i<list.length;i++)
			  if (list[i].ID == id) return [ list[i] ];
		  
		  return [];
	  },
	  ItemsByIDs: function (profile,data,context)
	  {
		  var list = ajaxart.run(data,profile,'List',context);
		  var ids = "," + aa_text(data,profile,'IDs',context) + ",";
		  if (ids == ",*,") return list;
		  
		  var out = [];
		  
		  for(var i=0;i<list.length;i++) 
			  if (list[i].Id != "" && ids.indexOf(list[i].Id) != -1) out.push(list[i]);
		  
		  return out;
	  },
	  List: function (profile,data,context)
	  {
	    var items = ajaxart.subprofiles(profile,'Item');
	  	var out = [];
	  	
	  	for(var i=0;i<items.length;i++) {
	  	  var next = ajaxart.run(data,items[i],"",context);
	  	  ajaxart.concat(out,next);
	  	};
	  	
	  	var aggs = ajaxart.subprofiles(profile,'Aggregator');
		  for(var i=0;i<aggs.length;i++)
				out = ajaxart.run(out,aggs[i],'',context); 

	  	return out;  	
	  },
	  Pipeline: function (profile,data,context)
	  {
			if (data.length > 1) data = [ data[0] ];
			var itemProfiles = ajaxart.subprofiles(profile,'Item');
			var nextData = data;

			for(var i=0;i<itemProfiles.length;i++) {
				var itemProfile = itemProfiles[i];
				var arr = [];
				if (nextData.length === 0 && i != 0) {
					nextData = [];
					break;
				}

				if (data.length <= 1 && i === 0)
					arr = ajaxart.run(nextData,itemProfile,"",context);
				else 
				{
					var compiledFunc = ajaxart.compile(itemProfile,'',context);

					if (compiledFunc == "same") continue;
					
					if (compiledFunc == null)
						for(var j=0;j<nextData.length;j++) 
							ajaxart.concat(arr,ajaxart.run([ nextData[j] ],itemProfile,"",context) );
					else
						for(var j=0;j<nextData.length;j++) 
							ajaxart.concat(arr,compiledFunc([nextData[j]],context) );
				}
				
				nextData = arr;
			}

			// now aggregators
		  var aggProfiles = ajaxart.subprofiles(profile,'Aggregator');
			  
		  for(var i=0;i<aggProfiles.length;i++) {
				nextData = ajaxart.run(nextData,aggProfiles[i],'',context); 
			}

			return nextData;
		},
		RunActionAndKeepInput: function (profile,data,context)
	  {
		  ajaxart.run(data,profile,'Action',context);
		  return data;
	  },
	  Same: function (profile,data,context)
	  {
	  	return data;
	  },
	  CleanNS: function (profile,data,context)
	  {
		  if (data[0] && typeof(data[0]) == 'object' && ! data[0].nodeType ) // json or csv
				return jbart_data(data[0],'single');

		  return jbart_data(ajaxart.totext_array(data),'single');
	  },
 	  IndexOfValueInCSV: function(profile, data, context) {
			var values = aa_text(data,profile,'Values',context);
			var value = aa_text(data,profile,'Value',context);
			var vals = values.split(',');
			var result = [];
			for(var i=0;i<vals.length;i++) 
				if (vals[i] == value) result.push('' + (i+1));
			return result;
		},
	  CSVValueByIndex: function(profile, data, context) {
			var values = aa_first(data,profile,'Values',context);
			var index = aa_int(data,profile,'Index',context);
			if (!values) return [];

			if (values.nodeType == 2) // att
				return [new aa_CSVValByRef(values,index-1)];
			return [aa_text(data,profile,'Values',context).split(',')[index-1]];
	  },
		CSVValuesByCode: function(profile, data, context) {
			var out = {};
			var codes = jQuery.trim(aa_text(data,profile,'Codes',context));
			var values = aa_first(data,profile,'Values',context);
			if (!values) return [];
			if (values.nodeType != 2) // att
				values = aa_text(data,profile,'Values',context).split(',');

			var codes_ar = codes.split(',');
			if (values.nodeType == 2) {
				for(var i=0;i<codes_ar.length;i++)
					out[codes_ar[i]] = new aa_CSVValByRef(values,i);
			} else {
				for(var i=0;i<codes_ar.length;i++)
					out[codes_ar[i]] = values[i];
			}
			return [out];
		},
		ObjectToCSV: function(profile, data, context) {
			var out = [];
			var atts = jQuery.trim(aa_text(data,profile,'Atts',context)).split(',');
			var obj = aa_first(data,profile,'Object',context);
			for(var i=0;i<atts.length;i++)
				out.push(ajaxart.totext_item(obj[atts[i]]));
			return [out.join(',')];
		},
		MatrixByColumns: function(profile, data, context) {
			var items = ajaxart.run(data,profile,'Items',context);
			var no_of_cols = aa_int(data,profile,'NoOfColumns',context);
			if (items.length ==0) return [];

			var result = [],row=[items[0]];
			for (var i=1;i<items.length;i++) {
				if (i % no_of_cols == 0) {
					result.push(row);
					row = [];
				}
				row.push(items[i]);
			}
			result.push(row);
			return result;
		},
		SwapRowsAndColumns: function(profile, data, context) {
			var result = [];
			var items = ajaxart.run(data,profile,'Items',context);
			var no_of_cols = aa_int(data,profile,'NoOfColumns',context);
			var new_no_of_cols = Math.floor(items.length/no_of_cols);
			for (var i=0;i<items.length;i++) {
				var col=i % no_of_cols,row=Math.floor(i/no_of_cols);
				var rev_index = col*new_no_of_cols+row;
				//console.log(row,col,rev_index);
				result[rev_index] = items[i]; // reverse col and Columns
			}
			return result;
		},
  Zip: function (profile,data,context)
  {
	var lists = [];
  	var itemProfiles = ajaxart.subprofiles(profile,'List');
  	for(var i=0; i<itemProfiles.length; i++)
  		lists.push({list:ajaxart.run(data,itemProfiles[i],"",context) });
	  
	var i=0;
	var result = [];
	if (lists.length == 0) return result;
	var result_length = 0;
	for(var j=0; j<lists.length; j++)
		result_length = Math.max(result_length,lists[j].list.length);
	
	for(var i=0;i<result_length;i++)
	{
	  var item = { isObject: true};
	  for(var j=0; j<lists.length; j++)
		  item['' + j] = (i < lists[j].list.length) ? lists[j].list[i] : '';
	  result.push(item);
	}
	return result;
  },
  Csv: function (profile,data,context)
  {
	  var content = aa_text(data,profile,'Content',context);
	  var fieldNames = aa_text(data,profile,'FieldNames',context).split(',');
	  var lines = content.split('\n');
	  var result = [];
	  var first_line = 0;
	  if (fieldNames == '') 
	  {
		  fieldNames = lines[0].split(',');
		  first_line = 1;
	  }
	  for(var i=first_line;i<lines.length;i++)
	  {
		  if (lines[i] == '') continue;
		  var fields = lines[i].split(',');
		  var obj = { isObject: true, __index: i};
		  for (var j=0;j<fieldNames.length;j++)
			  obj[fieldNames[j]] = fields[j];
		  result.push(obj);
	  }
	  return result;
  },
  Reduce: function (profile,data,context)
  {
    var result = ajaxart.run(data,profile,'InitialValue',context);
    var items = ajaxart.run(data,profile,'Items',context);

    for(var i=0;i<items.length;i++)
    	result = ajaxart.run(result,profile,'Formula',aa_ctx(context,{ Item : [items[i]] } ) );
  	
  	return [result];  	
  },
  Math: function (profile,data,context)
  {
	  var exp = aa_text(data,profile,'Expression',context);
	  var fix = aa_bool(data,profile,'FixFloatingPointResult',context);
	  try
	  {
		  eval('var val = ' + exp);
	  	  if (fix) 
	  		  val = ((val*10000).toFixed(5)/10000);
		  return [ '' + val ];
	  }
	  catch(e)
	  {
		  return [];
	  }
  },
  Percent: function (profile,data,context) {
	  var result = [];
	  var exp = aa_text(data,profile,'Part',context) + '/' + aa_text(data,profile,'Whole',context);
	  try {
		  eval( 'var val = "" + 100*' + exp);
		  result.push(val);
	  }
	  catch(e) { 
		  ajaxart.log("Can not calc percent expression: " + exp,'Error');
	  }
	  return result;
  },
  Cookie: function(profile, data, context) {
    var name = aa_text(data,profile,'CookieName',context);
    return [{
      name: name,
      WriteValue: function(newval) {
        aa_writeCookie(name,aa_totext(newval));
      },
      GetValue: function() {
        return aa_valueFromCookie(name);
      }
    }];
  },
	SessionStorage: function(profile, data, context) {
    var key = aa_text(data,profile,'Key',context);
    if (aa_bool(data,profile,'ValueAsText',context) ) {
			var val = sessionStorage[key];
      return val ? [''+val] : [];
    }
    return [{
      key: key,
      WriteValue: function(newval) {
        sessionStorage[key] = aa_totext(newval);
			},
      GetValue: function() {
				var val = sessionStorage[key];
        return val ? [val] : [];
      }
    }];
  },
	LocalStorage: function(profile, data, context) {
    var key = aa_text(data,profile,'Key',context);
    if (aa_bool(data,profile,'ValueAsText',context) ) {
			var val = localStorage[key];
      return val ? [''+val] : [];
    }
    return [{
      key: key,
      WriteValue: function(newval) {
        localStorage[key] = aa_totext([newval]);
			},
      GetValue: function() {
				var val = localStorage[key];
        return val ? [val] : [];
      }
    }];
  },
  Parents: function(profile, data, context)
  {
	var max_depth = aa_int(data,profile,'MaxIterations',context);
	var item = data[0],out = [];
	if (aa_bool(data,profile,'IncludeItself',context)) out.push(item);
	
	while (item && max_depth >0) {
	  max_depth--;
	  if (aa_bool([item],profile,'StopWhen',context))
		  return out;
	  item = aa_first([item],profile,'ParentRelation',context);
	  if (item)
		  out.push(item);
	}
	return out;
  },
  RandomPick: function (profile,data,context)
  {
	  if (data.length <= 1) return data;
	  
	  var rnd = Math.random();
	  var num = Math.floor( rnd * data.length );
	  return [ data[num] ];
  },
  RandomNumber: function (profile,data,context)
  {
	  var from = aa_int(data,profile,'From',context);
	  var to = aa_int(data,profile,'To',context);
	  var rnd = Math.random();
	  var num = Math.floor( rnd * (to-from+1) ) + from;
	  return [ num ];
  },
  RandomShuffle: function (profile,data,context)
  {
	  if (data.length <= 1) return data;

	  var o = [];
	  for(var i=0;i<data.length;i++) o[i] = data[i];
	  
	  for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	  
	  return o;
	  
  },
  Last: function (profile,data,context)
  {
	  if (data.length == 0) return [];
	  return [ data[data.length-1] ];
  },
  Slice: function (profile,data,context)
  {
    var from = aa_int(data,profile,'From',context);
    var to = aa_int(data,profile,'To',context);
    if (to == null && from == null) return data;
    if (to == null) return data.slice(from);
    if (from == null) return data.slice(to);
    
		return data.slice(from,to);
  },
  Min: function (profile,data,context)
  {
  	var items = ajaxart.run(data,profile,'ToCompare',context);
  	var numbers = $.map($.map(items,ajaxart.totext_item),parseFloat);
	
    var result = 0;
    for(var i=1;i<numbers.length;i++)
    	if (numbers[i] < numbers[result]) result = i;
	  return [data[result]];
  },
  Max: function (profile,data,context)
  {
  	var items = ajaxart.run(data,profile,'ToCompare',context);
  	var numbers = $.map($.map(items,ajaxart.totext_item),parseFloat);
	
    var result = 0;
    for(var i=1;i<numbers.length;i++)
    	if (numbers[i] > numbers[result]) result = i;
	  return [data[result]];
  },
  Average: function (profile,data,context)
  {
  	var digits = aa_int(data,profile,'Digits',context);
    var count=0,sum=0;
    if (data.length == 0) return [0];
    for(var i=0;i<data.length;i++) {
    	count++;
    	sum += Number(ajaxart.totext_item(data[i]));
    }
    if (isNaN(sum)) return [];
    var base = Math.pow(10,digits);
    var num = Math.round(base * sum / count) / base;
		return [num];
  },
  Sum: function (profile,data,context)
  {
    var sum=0;
    for(var i=0;i<data.length;i++)
    	sum += Number(ajaxart.totext_item(data[i]));
    
    if (isNaN(sum)) return [];
	return [sum];
  },
  InPreviewMode: function (profile,data,context)
  {
	if (typeof(ajaxart) != "undefined" && ajaxart.inPreviewMode) return ["true"];
	return [];
  },
  RecursiveScan: function (profile,data,context)
  {
	  var onlyLeaves = aa_bool(data,profile,"OnlyLeaves",context);
	  var maxItems = aa_text(data,profile,"MaxItemsToAvoidInfinitiveLoop",context);
	  var scanOrder = aa_text(data,profile,"ScanOrder",context);
	  
	  var result = [];
	  var nodes = data;
	  var current_node_index = 0;
	  var total = 0;
	  
	  while (nodes.length > current_node_index) {
	  	var current_node;
	  	if (scanOrder == "Depth first search")
	  		current_node = nodes.pop();
	  	else {
	  		current_node = nodes[current_node_index];
	  		current_node_index++;
	  	}
		  var nextLevel = ajaxart.run([current_node],profile,'ChildNodes',context);
		  if (scanOrder == "Depth first search")
		  	nextLevel = nextLevel.reverse();
		  ajaxart.concat(nodes,nextLevel);
		  if (!onlyLeaves || nextLevel.length ==0)
		  	result.push(current_node);
		  if (total++ > maxItems) {
		  	ajaxart.log("RecursiveScan - exceeded max items, might be infinitive loop, max items:" + total,"error");
		  	break;
		  }
	  }
	  return result;
  },
  UniqueNumber: function (profile,data,context)
  {
	  var prefix = aa_text(data,profile,'Prefix',context);
	  var suffix = aa_text(data,profile,'Suffix',context);
	  var num = prefix + (ajaxart.unique_number++) + suffix;
	  
	  return [num];
  },
  Demote: function (profile,data,context)
  {
	  var demote = "," + aa_text(data,profile,'Items',context) + ",";
	  var i=0;
	  var out = [], last = [];
	  for(var i=0;i<data.length;i++) {
		  var itemText = aa_text([data[i]],profile,'ItemText',context);
		  if (demote.indexOf(","+itemText+",") == -1) out.push(data[i]); else last.push(data[i]);
	  }
	  for(var i=0;i<last.length;i++) out.push(last[i]);
	  return out;
  },
  Single: function (profile,data,context)
  {
	  var items = ajaxart.run(data,profile,"Items",context);
	  return [items];
  },
  Url: function (profile,data,context)
  {
	  var str = "" + window.location.href;
	  return [str];
  },
  IsInSelectedItems: function (profile,data,context)
  {
		var list = "," + ajaxart.totext_item(ajaxart.getVariable(context,'SelectedItems')[0]) + ",";
		var txt = "," + ajaxart.totext_item(data[0]) + ",";
		if (list.indexOf(txt) != -1)
			return ["true"];
		return [];
  },
  IsCodeInSelectedItems: function (profile,data,context)
  {
		var list = "," + ajaxart.totext_item(ajaxart.getVariable(context,'SelectedItems')[0]) + ",";
		var txt = "," + aa_text(data,profile,'Code',context) + ",";
		if (list.indexOf(txt) != -1)
			return ["true"];
		return [];
  },
  ValueFromCookie: function (profile,data,context)
  {
	var name = aa_text(data,profile,'Cookie',context);
	var asXml = aa_bool(data,profile,'AsXml',context);
	var result = aa_valueFromCookie(name);
	if (result == null) return [];
	if (asXml)
	  if (result == "") return [];
	  else return [aa_parsexml(result,"cookie " + name)];
	return [result];
  },
  Object: function (profile,data,context)
  {
	  var out = { isObject: true };
	  var elem = profile.firstChild;
	  while (elem != null)
	  {
		  if (elem.nodeType == 1) 
		  {
			  var tag = aa_tag(elem);
			  var name = elem.getAttribute('name');
			  if (name == null || name == "") { elem = elem.nextSibling;  continue; }
			  
			  if (tag == 'Property') {
				  out[name] = ajaxart.run(data,elem,'',context);
			  } else if (tag == 'LightMethod') {
				  out[name] = { script: elem , context: context, compiled: ajaxart.compile(elem,'',context,elem.getAttribute("paramVars")) };
			  } else if (tag == 'Method') {
				  out[name] = { script: elem , context: context, objectForMethod: [out], compiled: ajaxart.compile(elem,'',context,elem.getAttribute("paramVars")) };
			  }
		  }
	    elem = elem.nextSibling;
	  }
			
	  return [out];
  },
  MakeUnique: function (profile,data,context)
  {
  	var item_names = {};
  	var out = [];
  	for(var i=0;i<data.length;i++) {
  	 var item = data[i];
      var id = "_" + aa_text([item],profile,'Identifier',context);
      var used = true;
      if (!item_names[id]) {
      	item_names[id] = true;
      	out.push(item);
      }
  	}
  	return out;
  },
  CreateDateRangesFromNow: function (profile,data,context) {
  	var count = aa_int(data,profile,'Count',context);
  	var resolution = aa_text(data,profile,'Resolution',context);

  	var out = [];
  	var now = new Date();
  	var tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + 1000*60*60*24;

  	var diff = 0;
  	if (resolution == 'days') diff = 1000*60*60*24;
  	if (resolution == 'weeks') diff = 1000*60*60*24*7;

  	if (resolution == 'days' || resolution == 'weeks') {
  		var lastValue = tomorrowMidnight;
  		if (resolution == 'weeks') {
  			lastValue += (6 - new Date().getDay()) * 1000*60*60*24;
  		}
	  	for(var i=0;i<count;i++) {
	  		out.push({ From: lastValue - diff, To: lastValue-1 });
	  		lastValue -= diff;
	  	}
	  }
	  if (resolution == 'months') {
	  	var year = now.getFullYear();
	  	var month = now.getMonth();

	  	for(var i=0;i<count;i++) {
	  		var month2 = month+1,year2 = year;
	  		if (month2>12) { month2=1; year2++; }
	  		out.push({ From: new Date(year,month,1).getTime(), To: new Date(year2,month2,1).getTime()-1 });
	  		
	  		month--;
	  		if (month==0) { year--;month=12;}
	  	}
	  }

  	return out;
  },
  GroupBy: function (profile,data,context)
  {
  	var groups = [];
  	var group_ids = {};
  	var items = ajaxart.run(data,profile,"Items",context);
  	for(var i=0;i<items.length;i++) {
  		var item = items[i];
      var id = "_" + aa_text([item],profile,'GroupBy',context);
      if (group_ids[id] == null) {
    	group_ids[id] = groups.length;
    	groups.push({ ID:id.substring(1), Items:[item]});
      } else
    	  groups[ group_ids[id] ].Items.push(item);
  	}
  	var out = [];
  	for(var i=0;i<groups.length;i++) 
  		out.push ( aa_first([groups[i]] ,profile, 'Group', context) );
  	
  	return out;
  },
  ExpandWithRelated: function (profile,data,context)
  {
	var max_depth = aa_int(data,profile,'MaxDepth',context);
	var log_relations_to = ajaxart.run(data,profile,'LogRelationsTo',context);
	var log = '';
	var has_log = log_relations_to.length>0;
  	var group = {}, new_items = [];
  	ajaxart.each(data,function(item) {
  		var id = aa_text([item],profile,'Identifier',context);
  		group[id] = { id: id, Item: item, RefCount: 0};
  		new_items.push(id);
  	});
  	
  	function expand(items)
  	{
  		var new_items = [];
  		for(var j=0;j<items.length;j++)
  		{
  			var item = items[j];
  			var related = ajaxart.run([group[item].Item],profile,'Relation',context);
  			for(var i=0;i<related.length;i++)
  			{
  				var related_id = aa_text([related[i]],profile,'Identifier',context);
  				if (!group[related_id]) {
  					group[related_id] = { id: related_id, Item: related[i], RefCount: 0};
  					new_items.push(related_id);
  				}
				if (has_log) log += '<rel from="' + item + '" to="' + related_id + '"/>\n';
  			}
  		}
  		return new_items;
  	};
  	for(var count = 0;new_items.length > 0 && count < max_depth;count++) {
  		new_items = expand(new_items);
  	}
  	if (count >= max_depth) 
  		ajaxart.log("expand error. more than " + max_depth + " levels deep");
  	
  	var out=[];
	for(item in group)
	 	if (group.hasOwnProperty(item))
			out.push(group[item]);
	ajaxart.writevalue(log_relations_to,[ajaxart.totext_array(log_relations_to) + log]);
  	return out;
  },
  CountUnique: function(profile,data,context)
  {
	  var out = 0;
	  var uniques = {};
	  for(var i=0; i<data.length; i++)
	  {
		  var key = '' + data[i];
		  if (uniques[key]) continue;
		  uniques[key] = true;
		  out++;
	  }
	  return [out];
  },
  MakeUniqueAndCount: function (profile,data,context)
  {
  	var item_count = {};
  	var out = [];
  	ajaxart.each(data,function(item) {
      var id = ajaxart.totext_item(item);
      var used = true;
      if (item_count[id] == null)
    	  item_count[id] = 0;
      item_count[id]++;
  	});
  	for (x in item_count)
  	{
	  if (!item_count.hasOwnProperty(x)) continue;
  	  var it = { };
  	  it.text = x;
  	  it.count = item_count[x];
  	  out.push(it);
  	}
  	out.sort(function(a, b) { return a.count - b.count; });
  	return out;
  },
  Struct: function (profile,data,context)
  {
	  return ajaxart.make_array(data,function(item) {
		  var itemProfs = ajaxart.subprofiles(profile,'Item');
		  var out = { isObject: true };
		  ajaxart.each(itemProfs,function(itemProf) {
			  var name = aa_text(data,itemProf,'Name',context);
			  var val = ajaxart.run(data,itemProf,'Value',context);
			  out[name] = val;
		  });
		  return out;
	  },true);
  },
  Aggregate: function (profile,data,context)
  {
   	  var aggProfiles = ajaxart.subprofiles(profile,'Aggregator');
	  
   	  var nextData = data;
   	  ajaxart.each(aggProfiles,function(aggProfile) {
   		  nextData = ajaxart.run(nextData,aggProfile,'',context); 
   	  });
	  return nextData;
  },
  RuntimeObjectType: function (profile,data,context)
  {
	  if (data.length == 0) return ["empty"];
	  if (ajaxart.ishtml_array(data)) return ["html"];
	  if (ajaxart.isxml_array(data)) return ["xml"];
	  if (ajaxart.isObject(data)) return ["struct"];
	  if (data[0].params != null && data[0].vars != null)
		  return ["context"];
	  if (typeof(data[0]) == "function") return ["function"];
	  return ["text"];
  },
  HtmlToCleanText: function (profile,data,context)
  {
	var str = aa_totext(data);
	
	while (str.indexOf('<') > -1) {
		var pos1 = str.indexOf('<');
		var pos2 = str.indexOf('>',pos1);
		if (pos2 > pos1) str = str.substring(0,pos1) + str.substring(pos2+1);
		else return [str];
	}
	return [str];
  },
  ReverseOrder: function (profile,data,context)
  {
  	var out = [];
    ajaxart.each(data,function(item) {
    	out.push(item);
  	});
    out.reverse();
    return out;
  },
  HashPassword: function (profile,data,context)
  {
	  var pwd = ajaxart.totext(data);
	  return [ ajaxart_hashPassword(pwd) ];
  },
  DuplicateNTimes: function (profile,data,context)
  {
  	var times = aa_int(data,profile,'Times',"",context);
  	if (data.length == 0) return [];
  	var out = [];
  	for (var i=0; i<times; i++)
  		out.push( ajaxart.xml.clone( data ) );
  	return out;
  },
  Subtract: function (profile,data,context)
  {
    var list = ajaxart.run(data,profile,'List',context);
    var sub = ajaxart.run(data,profile,'Subtract',context);
    
    var out = [];
    for(var i=0; i<list.length; i++)
    {
    	var item = list[i];
    	var add = true;
    	for(var j=0; j<sub.length; j++)
    	{
    		var subitem = sub[j];
    		if (aa_itemsEqual(item,subitem))
    		{
    			add = false;
    			break;
    		}
    	}
    	if (add) out.push(item);
    }
    return out;
  },
  Sort: function (profile,data,context)
  {
  	var type = aa_text(data,profile,'Type',context);
  	var order = aa_text(data,profile,'Order',context);
  	var sortPath = aa_text(data,profile,'SortByPath',context);
  	var sortAtSource = aa_bool(data,profile,'SortAtSource',context);
  	var hasSortPath = (sortPath != "");
  	
  	var sort_function = function (item1,item2)
  	{
  		if (item1.sortby < item2.sortby) return -1;
  		if (item2.sortby < item1.sortby) return 1;
  		return 0;
  	};
  	var items = [];
  	for(var i=0;i<data.length;i++) {
  		var value="";
  		if (hasSortPath)
  			value = ajaxart.totext( aa_xpath(data[i],sortPath) );
  		else
  			value = aa_text([data[i]],profile,'SortBy',context);
  		
  		if (type == "number") value = Number(value);
  		if (type == "date") value = aadate_date2int(value);
  		items.push( { data : data[i], sortby : value } );
  	};
  	items.sort(sort_function);
  	if (order == 'Descending')
  		items = items.reverse();
  	var out = [];
  	ajaxart.each(items,function(item) {
  		out.push(item.data);
  	});
  	if (sortAtSource)
  	{
  		// check for same xml parent
  		var parent = null;
  		for (var i=0;i < items.length; i++)
  		{
  			var new_parent = items[i].data.parentNode;
  			if (new_parent != parent && i != 0) return out;
  			parent = new_parent;
  			if (parent == null || parent == undefined) return out;
  		}
  		
  		// remove and add as sorted
  		for (var i=0;i < items.length; i++)
  			parent.removeChild(items[i].data);
  		for (var i=0;i < items.length; i++)
  			parent.appendChild(items[i].data);
  	}	
  	return out;
  },
  VariableValue: function (profile,data,context)
  {
  	var variable = aa_text(data,profile,'Variable',context);
  	return ajaxart.getVariable(context,variable);
  },
  RoundCents: function (profile,data,context)
  {
	  var str = "" + Math.round(data[0] * 100);
	  return [str.substring(0, str.length - 2) + "." + str.substring(str.length - 2, str.length)];
  },

  CreateIfDoesNotExist: function (profile,data,context)
  {
	  var result = ajaxart.run(data,profile,'Query',context);
	  if (result.length > 0) return result;
	  ajaxart.run(data,profile,'Create',context);
	  var result = ajaxart.run(data,profile,'Query',context);
	  if (result.length == 0) ajaxart.log('CreateIfDoesNotExist - Create does not make query ');
	  return result;
  },
  ReplaceItemByIndex: function(profile, data, context) {
	  var index = aa_int(data,profile,'Index',context);
	  var newItem = aa_first(data,profile,'NewItem',context);
	  if (index < 1 || index > data.length || newItem == null) return data;
	  var out = [];
	  for(var i=0;i<data.length;i++)
		  if (i == index-1) out.push(newItem); else out.push(data[i]);
	  
	  return out;
  },
  IsInCommaSeparatedList: function (profile,data,context)
  {
  	var sep = aa_text(data,profile,'Separator',context);
  	var items = aa_text(data,profile,'Item',context).split(sep);
  	var list = ',' + aa_text(data,profile,'List',context) + ',';
  	for(var i=0;i<items.length;i++)
  		if (list.indexOf(','+items[i]+',') != -1) return ["true"];
  	return [];
  },
  CreateNumbers: function (profile,data,context)
  {
    var from = aa_int(data,profile,'From',context);
    var to = aa_int(data,profile,'To',context);
    
    if (to < from) return [];
    var out = [];
    for(var i=from;i<=to;i++) out.push(i);
    
    return out;
  },
  ByIndexFromList: function(profile, data, context) 
  {
    var items = ajaxart.run(data,profile,'List',context);
    var index = aa_int(data,profile,'Index',context);
    var base = aa_text(data,profile,'Base',context);
    if (base == "0-Based Index" && index < items.length)
    	return [items[index]];
    if (base == "1-Based Index" && index-1 < items.length)
    	return [items[index-1]];
    return [];
  },
  BuildCategories : function(profile, data, context) {
		var categories = ajaxart.run(data,profile,'Categories',context);
		var sep = aa_text(data,profile,'Separator',context);
		
		var result = [];
		for (var i=0;i<categories.length;i++)
		{
			var category = categories[i];
			var items = category.split(sep);
			var inner_result = result;
			for(var j=0;j<items.length;j++)
			{
				var item = items[j];
				if (inner_result[item] == null)
					inner_result[item] = [];
				inner_result = inner_result[item];
			}
		}
		return result;
	},
	  NextLevelCategory : function(profile, data, context) {
		var categories = ajaxart.run(data,profile,'Categories',context);
		var parent = aa_text(data,profile,'Parent',context);
		var sep = aa_text(data,profile,'Separator',context);
		
		var inner_category = categories;
		var items = parent.split(sep);
		for(var j=0;j<items.length;j++)
		{
			var item = items[j];
			if (item.length > 0)
				inner_category = inner_category[item];
		}

		var result = [];
		if (parent.length == 0)
		{
			for (var i in inner_category)
				if (inner_category.hasOwnProperty(i))
					if (i != null && i != undefined)
						result.push(i);
		}
		else
		{
			for (var i in inner_category)
				if (inner_category.hasOwnProperty(i))
					result.push(parent + sep + i);
		}

		return result;
	},
   RunNativeHelperTest: function (profile,data,context)
   {
	  var txt = ajaxart.totext(ajaxart.runNativeHelper(data,profile,'FullName',context));
	  return ["name: " + txt];
   },
  Duplicate: function (profile,data,context)
  {
	  if (data.length == 0) return [];
	  var item = data[0];
	  if (typeof(item) == 'string' || typeof(item) == 'number' )
		  return [ "" + item ];
	  if (ajaxart.isxml_item(item) && item.nodeType == 1)// xml element
		  return [aa_parsexml(ajaxart.xml2text(item))];
		  //return [ ajaxart.xml.clone(data) ];
	  if (ajaxart.isxml_item(item) && item.nodeType == 2)// xml attribute : duplicate to string
		  return [ ajaxart.xml.clone(data) ];
	  // handle struct ...
	  return data;
  },
  StructEntryNames: function (profile,data,context)
  {
	  if (!ajaxart.isObject(data)) return [];
	  var out = [];
	  for (i in data[0])
		  if (data[0].hasOwnProperty(i) && i != 'isObject' && i != 'XtmlSource')
			  out.push(i);
	  return out;
  },
  BrowserTitle: function (profile,data,context) {
  	return [document.title];
  },
  MeasureCalculationTime: function (profile,data,context)
  {
		var before = new Date().getTime();
		var out = ajaxart.run(data,profile,'Calculation',context);
		var time_passes = new Date().getTime() - before;
		var obj = aa_first(data,profile,'PutTimeInObject',context);
		var property = aa_text(data,profile,'PutTimeInProperty',context);
		if (obj != null && property != "")
			obj[property] = [time_passes];
		return out;
  }
});

aa_gcs("js", {
  JavaScript: function (profile,data,context)
  {
		var scriptNode = ajaxart.childElem(profile,'Javascript');
		if (!scriptNode) return [];
		var code = aa_cdata_value(scriptNode) || ajaxart.xml.innerTextStr(scriptNode);
		var ret = aa_run_js_code(code,data,context);
		if (!ret) return [];
		if (typeof(ret) == 'string') return [ret];
		if (typeof(ret) == 'number') return [""+ret];
		if (typeof(ret) == 'boolean')
			return ret ? ['true'] : []
		if (aa_isArray(ret)) return ret;
		return [ret];
  }
});

aa_gcs("data_items", {
	LoadFullItem: function (profile,data,context)
	{
		var item = aa_first(data,profile,'Item',context);
		if (!item) return;
		var dataitems = aa_first(data,profile,'DataItems',context);
		if (dataitems && dataitems.LoadFullItem) 
			dataitems.LoadFullItem([item],context)
		else 
		{
		  var info = aa_getXmlInfo(item,context);
		  if ( info && info.LoadFullItem ) info.LoadFullItem([item],context);
		}
	},
	DoSave: function (profile,data,context)
	{
		var data_items = aa_first(data,profile,'DataItems',context);
		var fields = ajaxart.run(data,profile,'Fields',context);
		ajaxart_dataitems_save(data_items,fields,context,function(){
			ajaxart.run(data,profile,'OnSuccess',context);
		});
		
		return [];
	},
	Filter: function (profile,data,context)
	{
		var data_items = ajaxart_dataitem_getItems(context);
		var originalItems = data_items.Items;
		var items = [];
		for(var i=0;i<originalItems.length;i++)
		{
			var item = originalItems[i];
			if (aa_bool([item],profile,'Filter',context))
				items.push(item);
		}
		data_items.Items = items;

		return [];
	},
	Aspects: function (profile,data,context)
	{
		ajaxart.runsubprofiles(data,profile,'Aspect',context);
		return [];
	},
	Writable: function (profile,data,context)
	{
		var obj = ajaxart_dataitem_getItems(context);
		ajaxart_addScriptMethod(obj,'SubsetForNewItem',profile,'SubsetForNewItem',context);
		ajaxart_addScriptMethod(obj,'DeleteItem',profile,'DeleteItem',context);
		ajaxart_addScriptMethod(obj,'CanAcceptExternal',profile,'CanAcceptExternal',context);
		
		// TODO: let Shai look at it and hear his opinion
		var myFunc = function(obj) { return function(data1,context1) {
			ajaxart_async_Mark(context1);
			ajaxart_RunAsync(data1,ajaxart.fieldscript(profile,'DeleteItem'),context1,function (data2,context2) {
				var newValue = [];
				if (obj.Value != null && data1.length > 0 && data1[0].nodeType == 1) {
				  var id = data1[0].getAttribute('id');
				  for(var i=0;i<obj.Value.length;i++) {
					  if (obj.Value[i].getAttribute == null || obj.Value[i].getAttribute('id') != id)
					    newValue.push( obj.Value[i] );
				  }
				  
				  obj.Value = newValue;
				}
				ajaxart_async_CallBack(data2,context2);
			}); 
			return [];
		} };
		ajaxart_addScriptParam_js(obj,'DeleteItem',myFunc(obj),context);
		
		if (ajaxart.fieldscript(profile,'NewValueFromDetached') != null)
			aa_addLightMethod(obj,'NewValueFromDetached',profile,'NewValueFromDetached',context);
		
		return [];
	},
	NextLevel: function (profile,data,context)
	{
		var obj = ajaxart_dataitem_getItems(context);
		ajaxart_addScriptMethod(obj,'NextLevel',profile,'NextLevel',context);
		return [];
	},
	RecursiveNextLevel: function (profile,data,context)
	{
		var obj = ajaxart_dataitem_getItems(context);
		var nextlevel = function(data1,ctx)
		{
			var items = ajaxart.run(data1,profile,'NextLevel',context);
			if (items.length > 0)
			  aa_addControlMethod_js(items[0],'NextLevel',nextlevel,context);
			return items;
		}
		aa_addControlMethod_js(obj,'NextLevel',nextlevel,context)
	},
	OverrideItems: function (profile,data,context)
	{
		var out = ajaxart.run(data,profile,'Items',context);
		var newContext = aa_ctx(context,{_Items: out} );
		ajaxart.runsubprofiles(data,profile,'Aspect',newContext);

		return out;
	},
	Permission: function (profile,data,context)
	{
		var obj = ajaxart_dataitem_getItems(context);
		var perm = aa_text(data,profile,'Permission',context);
		if (perm == "read only") obj.ReadOnly = ["true"];
	}
});

ajaxart_dataitem_getItems = function(context) {
	  var field = context.vars['_Items'];
	  if (field == null || field.length == 0) return null;
	  return field[0];
	}

function ajaxart_hashPassword(pwd)
{
  if (pwd == "") return "";
  var num = 0;
  for(var i=0;i<pwd.length;i++)
    num += ( pwd.charCodeAt(i) * i*i );
	  
  return "" + num;
}
function eval_math_formula(formula,digits)
{
	  try
	  {
		  eval('var val = ' + formula);
		  if (typeof(val) != 'number')
			  return Number.NaN;
		  var num = val;
		  if (digits)
		  {
			  var base = Math.pow(10,digits);
			  num = Math.round(base * val) / base;
		  }
		  return num;
	  }
	  catch(e)
	  {
		  return Number.NaN;
	  }
}
function aa_xmlitem_byid(items,id)
{
	for (var i=0;i<items.length;i++)
		if (items[i].getAttribute('id') == id)
			return items[i];
	return null;
}

function aa_aggregate_Sum(cells)
{
	var sum = 0;
	var not_numbers = false;
	for(var i=0;i<cells.length;i++)
	{
		var val = parseInt(ajaxart.totext_item(cells[i]));
		if (! isNaN(val))
			sum += val;
		else
			not_numbers = true;
	}
	return not_numbers ? '' : '' + sum;
}
function aa_aggregate_Average(cells)
{
	var sum = aa_aggregate_Sum(cells);
	if (sum == '') return '';
	return '' + Math.floor(sum * 100/cells.length) / 100;
}
function aa_aggregate_Count(cells)
{
	return '' + cells.length;
}
function aa_aggregate_Concat(cells)
{
	return jQuery(cells).map(function() { return ajaxart.totext_item(this) } ).get().join(", ");
}

function aa_csv_toggle(list,item)
{
	if (list.indexOf(',' + item +',') == -1)
		return list + item + ',';
	return list.replace(',' + item +',',',');
}

function aa_CSVValByRef(att,index) { aa_init_CSVValByRef(); this.att = att; this.arr = att.nodeValue.split(','); this.index = index}
function aa_init_CSVValByRef() {
	if (aa_CSVValByRef.prototype.GetValue) return;
	aa_CSVValByRef.prototype.GetValue = function() { return this.arr[this.index]; }
	aa_CSVValByRef.prototype.WriteValue = function(val) { 
		this.arr[this.index] = val;
		this.att.nodeValue = this.arr.join(',');
	}
	aa_CSVValByRef.prototype.ParentNode = function() { return this.att }
}

ajaxart.unique_number = 1;

function aa_switch(profile,data,context)
{
	var value = aa_text(data,profile,"Value",context);
	var cases = ajaxart.subprofiles(profile,'Case');
	for (var i=0; i<cases.length; i++) {
		var pass = (value != "") && (value == aa_text(data,cases[i],'If',context));
		if (!pass)
			pass = aa_bool(data,cases[i],'IfCondition',context);
		if (pass)
			return ajaxart.run(data,cases[i],'Then',context);
	}
	return ajaxart.run(data,profile,'Default',context);
}

function aa_ifThenElse(profile,data,context)
{
	if (aa_bool(data,profile,'If',context))
		return ajaxart.run(data,profile,'Then',context);
	else
		return ajaxart.run(data,profile,'Else',context);
}

function aa_valueFromCookie(name) {
	if (name == "") return null;
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length,c.length));
	}
	return null;	
}

function aa_writeCookie(cookie,value) {
		var val = encodeURIComponent( value );
		cookie = encodeURIComponent(cookie);
		if (cookie == "") return;
		
	 	 var date = new Date();
		 date.setMonth(date.getMonth()+1);
			  
		 if (cookie != "") 
		   document.cookie = cookie+"="+val+";"+" expires="+date.toUTCString();	
}
function aa_cleanCookies(prefix) {
	var ca = decodeURIComponent(document.cookie).split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(prefix) == 0) aa_writeCookie(c.split('=')[0],'');
	}
}

function aa_csv_splitLine(line) {
	return line.split(','); // TODO: handle escaping
}
function aa_csv_constructLine(arr) {
	return arr.join(','); // TODO: handle escaping
}

function aa_arrayUnique(arr,idFunc) {
	idFunc = idFunc || function(a) { return a;}
	var added = {},out=[];
	arr.forEach(function(a) {
		var k = ''+idFunc(a);
		if (!added[k]) out.push(a);
		added[k] = true;
	})
	return out;
}