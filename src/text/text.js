ajaxart.load_plugin("text");
aa_gcs("text", {
  FirstSucceeding: function (profile,data,context)
  {
    var itemProfiles = ajaxart.subprofiles(profile,'Item');

    for(var i=0;i<itemProfiles.length;i++)
    {
    	var subresult = ajaxart.run(data,itemProfiles[i],"",context);
   		for(var j=0;j<subresult.length;j++)
   		{
   			if (ajaxart.totext_item(subresult[j]).length > 0)
   				return subresult;
    	}
    }
  	return [];  	
  },
  NormalizeNewLines: function(profile,data,context) {
	  var result = aa_text(data,profile,'Text',context).replace(/\r\n/g,'\n'); 
	  return [result];
  },
  Extract: function (profile,data,context)
  {
	  var startMarkers = ajaxart.runsubprofiles(data,profile,'StartMarker',context);
	  if (startMarkers.length == 0) // backward compatible
		  startMarkers = ajaxart.run(data,profile,'StartMarker',context);
	  var endMarker = aa_text(data,profile,'EndMarker',context);
	  var includingStartMarker = aa_bool(data,profile,'IncludingStartMarker',context);
	  var includingEndMarker = aa_bool(data,profile,'IncludingEndMarker',context);
	  var onlyFirst = aa_bool(data,profile,'OnlyFirstResult',context);
	  var trim = aa_bool(data,profile,'Trim',context);
	  var str = aa_text(data,profile,'From',context);;
	  if (startMarkers.length == 0) return data;

	  var index = 0, out = [], prev_index=-1;
	  var string_start =0;
	  var position = function(str, marker, startpos) { return { pos: str.indexOf(marker,startpos), length: marker.length } } 
	  if (aa_bool(data,profile,'Regex',context)) 
		  position = function(str, marker, startpos) {
	  		var len = 0;
	    	var pos = -1;
	  		try {
		  		startpos = startpos || 0;
		  		var str = str.substring(startpos);
		  		var marker_regex = new RegExp(marker,'m');
		    	pos = str.search(marker_regex);
		    	if (pos > -1) { // get the length of the regex
		    		pos = (pos >= 0) ? pos + startpos : pos;
		    		var match = str.match(marker_regex)[0];
		    		len = match ? match.length : 0;
		    	}
	  		} catch(e) {} // probably regex exception
		    return { pos: pos , length: len };
	  	  	}
	  while (1) {
	  	  if (prev_index == index) break;	// prevent infinitive loop
	  	  prev_index = index;
		  var cut_previous_index;
		  for(var i=0; i<startMarkers.length; i++)
		  {
			  var marker = startMarkers[i];
			  var markerPos = position(str,marker,index);
			  index = markerPos.pos;
			  if (i==0)
				  cut_previous_index = markerPos.pos - string_start;
			  if (markerPos.pos == -1) return out;
			  string_start = markerPos.pos;
			  if (!includingStartMarker)
				  string_start += markerPos.length;
			  index += markerPos.length;
		  }
		  if (out.length>0 && endMarker == ''){  // cutting previous item
			  out[out.length-1] = out[out.length-1].substring(0,cut_previous_index);
		  }
		  var endPos = position(str,endMarker,index);
		  var out_item;
		  if (endMarker == '')
			  out_item = str.substring(string_start);
		  else if (endPos.pos == -1)
			  return out;
		  else if (includingEndMarker)
			  out_item = str.substring(string_start,endPos.pos+endPos.length);
		  else
			  out_item = str.substring(string_start,endPos.pos);
		  if (trim)
			  out_item = aa_text_trim(out_item);
		  if (out_item)
			  out.push(out_item);
		  if (onlyFirst) 
			  return out;
		  if (endMarker != '') 
		  	index = endPos.pos+endPos.length;
	  }
	  return out;
  },
  MomentTimeFormat: function (profile,data,context) {
  	var timeInt = aa_int(data,profile,'Time',context);
  	if (!timeInt && ajaxart.inPreviewMode) timeInt = new Date().getTime();

  	var format_str = aa_text(data,profile,'Format',context);
  	return timeInt ? [aa_moment(timeInt).format(format_str)] : [];
  },
  TimeDurationAsHumanText: function(profile, data, context) {
  	var fromTime = aa_int(data,profile,'FromTimeInMillis',context);
  	var toTime = aa_int(data,profile,'ToTimeInMillis',context);
  	if (!fromTime || !toTime) return [];
  	return [aa_moment().duration({ seconds: (fromTime-toTime)/1000 }).humanize(true)];
  },
  TimeFromNow: function (profile,data,context) {
  	var timeInt = aa_int(data,profile,'Time',context);
  	if (isNaN(timeInt)) return '';
  	
  	var now = new Date().getTime();
  	if (now < timeInt) return ['0 seconds ago']; // do not allow negative time
  	var seconds = parseInt((now - timeInt) / 1000);
  	if (seconds < 60) return [seconds + ' seconds ago'];
  	return timeInt ? [aa_moment(timeInt).fromNow(true) + ' ago'] : ['now'];
  },
  MultiLang: function (profile,data,context)
  {
  	return ajaxart_multilang_run(data,profile,'Pattern',context);
  },  
  Split: function (profile,data,context)
  {
    var sep = aa_text(data,profile,'Separator',context);
    var part = aa_text(data,profile,'Part',context);
    var index_num = aa_int(data,profile,'Index',context);
    var str = aa_text(data,profile,'Text',context);
    
    if (aa_bool(data,profile,'Regex',context))
    	sep = new RegExp(sep);
    var result = '';
	if (str == '') return [];

	var items = str.split(sep);
	if (aa_bool(data,profile,'NoEmptyValues',context)) {
		for(var i=items.length-1;i>=0;i--)
			if (items[i] == "") items.splice(i,1);
	}
	switch(part)
	{
	case "ButFirst" : if (items.length >= 1) return items.slice(1); break;
	case "First" : if (items.length >= 1) result = items[0]; break;
	case "Second" : if (items.length >= 2) result = items[1]; break;
	case "Third" : if (items.length >= 3) result = items[2]; break;
	case "All but Last" :
		var out = [];
		for (var i=0; i<items.length-1; i++)
			out.push(items[i]);
		return out;
	case "All but First" :
		var out = [];
		for (var i=1; i<items.length; i++)
			out.push(items[i]);
		return out;
	case "All but First and Last" :
		var out = [];
		for (var i=1; i<items.length-1; i++)
			out.push(items[i]);
		return out;
	case "Second" : if (items.length >= 2) result = items[1]; break;
	case "All" :
		if (index_num && items.length >= index_num) 
			result = items[index_num-1];
		else
			return items;
		break;	
	case "By index" : 
		if (index_num && items.length >= index_num) 
			result = items[index_num-1];
		else
			return items;
		break;
	case "Last" : if (items.length > 0) result = items[items.length-1]; break;
	};

	if (result == '')
		result = aa_text(data,profile,'Default',context);
	return [result];
  },
  Text: function (profile,data,context)
  {
    var pattern = aa_text(data,profile,'Text',context);
    
    var result = ajaxart.dynamicText(data,pattern,context);
    var text_result = ajaxart.totext_array(result);
    if (aa_bool(data,profile,'RemoveEmptyParenthesis',context))
    	test_result = text_result.replace('\(\)','').replace(/^\s*/, '').replace(/\s*$/, '');
    return [ text_result ];
  },
  StartsWith: function (profile,data,context)
  {
	  var text = aa_text(data,profile,'Text',context);
	  var _with = aa_text(data,profile,'With',context);
	  
	  if ( text.indexOf(_with) == 0 ) return ["true"];
	  return [];
  },
  EndsWith: function (profile,data,context)
  {
	  var text = aa_text(data,profile,'Text',context);
	  var _with = aa_text(data,profile,'With',context);
	  
	  if ( text.lastIndexOf(_with) != -1 && text.lastIndexOf(_with) + _with.length == text.length ) return ["true"];
	  return [];
  },
  Length: function (profile,data,context)
  {
	  var str = ajaxart.totext_array(data);
	  var length = str.length;
	  return [length];
  },
  ToChars: function (profile,data,context)
  {
	  var str = ajaxart.totext_array(data);
	  var length = str.length;
	  var result = [];
	  for(var i=0;i<str.length;i++)
		  result.push(str.charAt(i));
	  return result;
  },
  Truncate: function (profile,data,context)
  {
	  var text = aa_text(data,profile,'Text',context);
	  var length = aa_int(data,profile,'Length',context);
	  if (text.length <= length) return [text];
	  var newtext = text.substring(0,length) + aa_text(data,profile,'Suffix',context);
	  return [newtext];
  },
  NumberFormat: function (profile,data,context)
  {
	  var number = ajaxart.totext_array(data);
	  var symbol = aa_text(data,profile,'Symbol',context);
	  var symbolLeft = ! aa_bool(data,profile,'SymbolAtRight',context);
	  var noCommaSeparator = aa_bool(data,profile,'NoCommaSeparator',context);
	  var use_cents = aa_bool(data,profile,'Cents',context);

	  var num = number.split('.')[0];
	  if (!noCommaSeparator)
		  for (var i = 0; i < Math.floor((num.length - (1 + i)) / 3); i++)
			  num = num.substring(0, num.length - (4 * i + 3)) + ',' + num.substring(num.length - (4 * i + 3)); 
	 
	  if (use_cents)
	  {
		  var cents = '00';
		  if (number.split('.').length > 1)
			  cents = number.split('.')[1];
		  cents = (cents + '00').substring(0,2);
		  num = num + '.' + cents;
	  }
	  if (num[0] == '-' && aa_bool(data,profile,'MinusInParenthesis',context))
		  num = symbolLeft ? '(' + symbol + num.substring(1) + ')' : '(' + num.substring(1) + symbol  + ')';
	  else
		  num = symbolLeft ? symbol + num : num + symbol;

	  return [num];
  },
  Concat: function (profile,data,context)
  {
    var prefix = aa_text(data,profile,'Prefix',context);
    var suffix = aa_text(data,profile,'Suffix',context);
    var sep = aa_text(data,profile,'Separator',context);
    var items = ajaxart.run(data,profile,'Items',context);
    var lastSeparator = aa_text(data,profile,'LastSeparator',context);
    var maxLength = aa_int(data,profile,'MaxLength',context);
    
    if (lastSeparator == "")
    	lastSeparator = sep;
    var out = prefix;

	var compiledItemText = ajaxart.compile(profile,'ItemText',context);
    
    for(var i=0;i<items.length;i++) {
    	var item = items[i];
    	var current = "";
    	
    	if (compiledItemText == "same") current = ajaxart.totext_item(item);
    	else if (compiledItemText == null) current = aa_text([item],profile,'ItemText',context);
    	else current = ajaxart.totext_array(compiledItemText([item],context));
    	
//    	if (current != "") {
	    	if (i!=0 && i+1<items.length) out += sep;
	    	if (i!=0 && i+1 == items.length) out += lastSeparator;
	    	out += current;
//    	}

  		if (out.length > maxLength && maxLength > 0) {
  			var overmaxtext = aa_text(data,profile,'SuffixForMax',context);
  			out = out.substring(0,maxLength) + overmaxtext;
  			return [out + suffix];
  		}
    }
  	var items_array = ajaxart.subprofiles(profile,'Item');
  	for(var i=0;i<items_array.length;i++) {
  		var current = aa_text(data,items_array[i],"",context);
  		if (current != "") {
	    	if (i!=0 && i+1<items_array.length) out += sep;
	    	if (i!=0 && i+1 == items_array.length) out += lastSeparator;
	    	out += current;
  		}
  	}

    out += suffix;
    return [out];
  },
  Capitalize: function (profile,data,context)
  {
	  var str = ajaxart.totext_array(data);
	  var mode = aa_text(data,profile,'Mode',context);
	  if (mode == "capital to separate words")
		  return [aa_text_capitalizeToSeperateWords(str)];
	  if (mode == "upper to separate capital")
	  {
		  var out = "";
		  str = str.toLowerCase();
		  var begin_of_word=true;
		  var counter=0;
		  while (counter < str.length)
		  {
			  var ch = str.charAt(counter);
			  var ch_str = "" +ch;

			  if (ch == '_')
			  {
				  begin_of_word= true;
				  out = out + " ";
				  counter++;
				  continue;
			  }

			  if (begin_of_word)
				  out = out + ch_str.toUpperCase();
			  else 
				  out = out + ch_str;

			  begin_of_word= false;
			  counter++;
		  }
		  return [out];
	  }
	  if (mode == "split and capitalize words")
	  {
		  var out = "";
		  //str = str.toLowerCase();
		  var begin_of_word=true;
		  var counter=0;
		  while (counter < str.length)
		  {
			  var ch = str.charAt(counter);
			  var ch_str = "" +ch;

			  if (ch == '_')
			  {
				  begin_of_word= true;
				  out = out + " ";
				  counter++;
				  continue;
			  }

			  if (ch >= 'A' && ch <= 'Z' && counter != 0)
			  {
				  begin_of_word= true;
				  out = out + " ";
			  }

			  if (begin_of_word)
				  out = out + ch_str.toUpperCase();
			  else 
				  out = out + ch_str;

			  begin_of_word= false;
			  counter++;
		  }
		  return [out];
	  }
	  if (mode == "separate words to capital")
	  {
		  var out = "";
		  var counter=0;
		  while (counter < str.length)
		  {
			  var ch = str.charAt(counter);
			  if (counter == 0) out += str.charAt(counter).toUpperCase();
			  else if (' !@#$%^&*()./'.indexOf(ch) != -1) {
				 if (counter+1 < str.length)  {
					 out += str.charAt(counter+1).toUpperCase();
					 counter++;
				 }
			  }
			  else out += str.charAt(counter);
			  
			  counter++;
		  }
		  str = out;
	  }
	  if (mode == "capital each word")
	  {
		  var out = "";
		  var counter=0;
		  while (counter < str.length)
		  {
			  if (counter == 0) out += str.charAt(counter).toUpperCase();
			  else if (str.charAt(counter) == " ") {
				 if (counter+1 < str.length)  {
					 out += " " + str.charAt(counter+1).toUpperCase();
					 counter++;
				 }
			  }
			  else out += str.charAt(counter);
			  
			  counter++;
		  }
		  str = out;
	  }
	  return [str];
  },
  Replace: function (profile,data,params)
  {
    var find = aa_text(data,profile,'Find',params);
    var replaceWith = aa_text(data,profile,'ReplaceWith',params);
    var useRegex = aa_bool(data,profile,'UseRegex',params);
    var replaceAll = aa_bool(data,profile,'ReplaceAll',params);
    var str = aa_text(data,profile,'Text',params);
    
	var result = "";
//	  		if (useRegex) {
		if (replaceAll)
			var reg = new RegExp(find, "g");
		else
			var reg = new RegExp(find);
		result = str.replace(reg, replaceWith);
//	  		}
	return [ result ];
  },
  ToIdText: function (profile,data,context)
  {
	return [aa_string2id(aa_totext(data))];
  },
  ToId: function (profile,data,context)
  {
	  var result = aa_string2id(aa_text(data,profile,'Text',context));
	  var usedArr = ajaxart.run(data,profile,'UsedIDs',context),usedIds=",";
	  
	  if (usedArr.length == 0) return [result];
	  for (var i=0;i<usedArr.length;i++) usedIds += aa_totext([usedArr[i]]) + ',';
	  
	  while ( usedIds.indexOf(','+result+',') > -1 ) {
		  var lastDigit = result.charAt(result.length-1);
		  if (lastDigit > '0' && lastDigit < '8')
		    result = result.substring(0,result.length-1) + (parseInt(lastDigit)+1);
		  else if (lastDigit == '9')
		    result = result.substring(0,result.length-1) + '10';
		  else 
			result = result + '1';
	  }
	  return [result];  
  },
  Translate: function (profile,data,context)
  {
	  var text = aa_text(data,profile,'Text',context);
	  var out = ajaxart_multilang_text(text,context);
	  return [out];
  },
  TranslatePattern: function (profile,data,context)
  {
	  return ajaxart_multilang_run(data,profile,'Pattern',context);
  },
  ReplaceWithRegex: function (profile,data,params)
  {
	  var pattern = aa_text(data,profile,'Pattern',params);
	  var replaceWith = aa_text(data,profile,'ReplaceWith',params);
	  var flags = aa_text(data,profile,'Flags',params);
	  var str = aa_text(data,profile,'Text',params);
	  try
	  {
		  return [ str.replace(new RegExp(pattern,flags),replaceWith) ];
	  }
	  catch(e) {}
	  return [];
  },
  ReplaceMulti: function (profile,data,params)
  {
	  var find = ajaxart.run(data,profile,'Find',params);
	  var replaceWith = ajaxart.run(data,profile,'ReplaceWith',params);
	  var replaceAll = aa_bool(data,profile,'ReplaceAll',params);
	  var str = aa_text(data,profile,'Text',params);
	  
	  if (find.length != replaceWith.length) return data;
	  for (var i=0; i<find.length; i++) {
			if (replaceAll)
				var reg = new RegExp(find[i], "g");
			else
				var reg = new RegExp(find[i]);
			str = str.replace(reg, replaceWith[i]);
	  }
	  return [ str ];
  },
  MultiLangSuite: function (profile,data,context)
  {
	 var lang = aa_text(data,profile,'Language',context);

	 aa_mlTable = typeof(aa_mlTable) == 'undefined' ? {} : aa_mlTable;
	 aa_mlTable[lang] = aa_mlTable[lang] || {};
	 var trList = aa_mlTable[lang];
	 
	 var items = aa_xpath(profile,'Pattern');
	 for(var k=0;k<items.length;k++) {
		trList[items[k].getAttribute('Original')] = items[k].getAttribute('T') || items[k].getAttribute('Tranlation');
	 }
	 
	 var items = aa_xpath(profile,'item');
	 for(var i=0;i<items.length;i++) {
		 var v = items[i].getAttribute('v') || '';
		 if (v != '')
		   trList[items[i].getAttribute('k')] = v;
	 }
  },
  Between: function (profile,data,params)
  {
    var from = aa_text(data,profile,'From',params);
    var to = aa_text(data,profile,'To',params);
    var includeFrom = aa_bool(data,profile,'IncludeFrom',params);
    var includeTo = aa_bool(data,profile,'IncludeTo',params);

	var str = ajaxart.totext_array(data);
	var index_from = str.indexOf(from);
	if (index_from != -1)
	{
		if (includeFrom)
			str = str.substring(index_from);
		else
			str = str.substring(index_from+from.length);
	}
		
	var index_to = str.indexOf(to);
	if (index_to != -1)
	{
		if (includeTo)
			str = str.substring(0,index_to+to.length);
		else
			str = str.substring(0,index_to);
	}
    return [str];
  },
  PromoteStartingWith: function (profile,data,context)
  {
	  var with1 = aa_text(data,profile,'StartsWith',context);
	  if (with1 == '') return [];
	  var out = [];
	  var out2 = [];
	  
	  for(var i=0;i<data.length;i++) {
		  var text = ajaxart.totext_item(data[i]);
		  if (text.indexOf(with1) == 0) out.push(data[i]); else out2.push(data[i]);
	  }
	  for (var i=0;i<out2.length;i++)
		  out.push(out2[i]);
	  
	  return out;
  },
  SplitByCommas: function (profile,data,context)
  {
	  var text = aa_text(data,profile,'Text',context);
	  var spl = text.split(',');
	  var out = [];
	  for(var i=0;i<spl.length;i++)
		  if (spl[i].length > 0) out.push(spl[i]);
	  
	  return out;
  },
  Pad: function (profile,data,context)
  {
	    var length = aa_text(data,profile,'Length',context);
	    var filler = aa_int(data,profile,'Filler',context);
	    var str = aa_text(data,profile,'Text',context);
	
	    while (str.length < length)
	        str = filler + str;
	   
	    return [str];
  },
  AddToCommaText: function (profile,data,context)
  {
	var text = ajaxart.run(data,profile,'Text',context);
	var toadd = aa_text(data,profile,'ToAdd',context);
	var text_str = aa_totext(text);
	if ((','+text_str+',').indexOf(','+toadd+',') == -1) {
		var val = (text_str == "") ? toadd : text_str + ',' + toadd;
		ajaxart.writevalue(text,[val]);
	}
  },
  RemoveFromCommaText: function (profile,data,context)
  {
	  var text = ajaxart.run(data,profile,'Text',context);
	  var toremove = aa_text(data,profile,'ToRemove',context);
	  var text_str = aa_totext(text);
	  var pos = (','+text_str+',').indexOf(','+toremove+','); 
	  if (pos > -1) {
		  var val = text_str.substring(0,pos-1) + text_str.substring(pos+toremove.length+1);  
		  ajaxart.writevalue(text,[val]);
	  }
  },
  RemoveSuffix: function (profile,data,context)
  {
    var sep = aa_text(data,profile,'Separator',context);
    var suffix = aa_text(data,profile,'Suffix',context);
    var emptyIfNoSeparator = aa_bool(data,profile,'EmptyIfNoSeparator',context);
    var text = ajaxart.totext_array(data);
    
    if (suffix.length > 0)
    {
    	var pos = text.lastIndexOf(suffix);
    	if (pos == text.length - suffix.length)
    		return [text.substring(0,pos)];
    }
    
    var index = text.lastIndexOf(sep);
    if (index == -1) 
   		if (emptyIfNoSeparator) 
   			return [""];
    	else 
    		return [text];
    return [text.substring(0,index)];
  },
  ToLowerCase: function (profile,data,context)
  {
	  return [ ajaxart.totext_array(data).toLowerCase() ];
  },
  ToUpperCase: function (profile,data,context)
  {
	  return [ ajaxart.totext_array(data).toUpperCase() ];
  },
  ExtractPrefix: function (profile,data,context)
  {
	 var sep = aa_text(data,profile,'Separator',context);
	 var useRegex = aa_bool(data,profile,'UseRegex',context);
	 var text = ajaxart.totext_array(data);
	 
	 if (useRegex)
		 var index = text.search(sep);
	 else
		 var index = text.indexOf(sep);
	 
	 if (index == -1) return [];
	 var result = '';
	 if (aa_bool(data,profile,'KeepSeparator',context))
		 result = text.substring(0,index+sep.length);
	 else
		 result = text.substring(0,index);
	 if (result.length == 0)
		 result = aa_text(data,profile,'Default',context);
	 return [result];
  },
  RemovePrefix: function (profile,data,context)
  {
    var sep = aa_text(data,profile,'Separator',context);
    var prefix = aa_text(data,profile,'Prefix',context);
    var text = ajaxart.totext_array(data);
    if (prefix != "") {
    	if (text.indexOf(prefix) == 0)
    		return [text.substring(prefix.length)];
    }
    if (sep == "") return [text];
    var index = text.indexOf(sep);
    if (index == -1) return [text];
    return [text.substring(index+sep.length)];
  },
  CountOfSubtext: function (profile,data,params)
  {
    var subtext = aa_text(data,profile,'Text',params);
    var text = ajaxart.totext_array(data);
    if (subtext.length == 0) return ["0"];
    
    var arr = text.split(subtext);
    return ["" + (arr.length-1)];
  },
  Encode: function (profile,data,params)
  {
    var text = ajaxart.totext_array(data);
    var result = unescape( encodeURIComponent(text));
    return [result];
  },
  MatchesRegex: function (profile,data,context)
  {
    var pattern = '^' + aa_text(data,profile,'Expression',context) + '$';
    var text = aa_text(data,profile,'Text',context);
    
    return text.match(pattern) ? ['true'] : [];
  },
  FindInText: function (profile,data,context)
  {
    var pattern = aa_text(data,profile,'Pattern',context);
    var useRegex = aa_bool(data,profile,'UseRegex',context);
    var text = ajaxart.totext_array(data);
    var result = -1;
    if (useRegex)
    	result = text.search(pattern);
    else
    	result = text.indexOf(pattern);
    return [ result != -1 ];
  },
  UrlEncoding: function (profile,data,context)
  {
	  var urlpart = ajaxart.totext_array(data);
	  var type = aa_text(data,profile,'Type',context);
	  if (type == "encode")
		  return [ encodeURIComponent( urlpart ) ];
	  else
		  return [ decodeURIComponent( urlpart )];
  },
  Substring: function (profile,data,context)
  {	
	  var start = aa_int(data,profile,'Start',context);
	  var stop = aa_int(data,profile,'Stop',context);
	  var text = aa_text(data,profile,'Text',context);
	  if (stop != null && stop != "" && !isNaN(stop) )
		  return [ text.substring(start-1,stop-1) ];
	  else
		  return [ text.substring(start-1) ];
  },
  Reverse: function (profile,data,context)
  {
	  var text = aa_text(data,profile,'Text',context);
	  var reverse = "";
	  for (i=0;i<text.length;i++)
		  reverse = reverse + text.charAt(text.length-i-1);
	  return [reverse];
  },
  DecodeMimeType: function (profile,data,context)
  {
	  var win1255Lookup = ['00','01','02','03','04','05','06','07','08','09','0a','0b','0c','0d','0e','0f','10','11','12','13','14','15','16','17','18','19','1a','1b','1c','1d','1e','1f','20','21','22','23','24','25','26','27','28','29','2a','2b','2c','2d','2e','2f','30','31','32','33','34','35','36','37','38','39','3a','3b','3c','3d','3e','3f','40','41','42','43','44','45','46','47','48','49','4a','4b','4c','4d','4e','4f','50','51','52','53','54','55','56','57','58','59','5a','5b','5c','5d','5e','5f','60','61','62','63','64','65','66','67','68','69','6a','6b','6c','6d','6e','6f','70','71','72','73','74','75','76','77','78','79','7a','7b','7c','7d','7e','7f','20ac','81','201a','0192','201e','2026','2020','2021','02c6','2030','8a','2039','8c','8d','8e','8f','90','2018','2019','201c','201d','2022','2013','2014','02dc','2122','9a','203a','9c','9d','9e','9f','a0','a1','a2','a3','20aa','a5','a6','a7','a8','a9','d7','ab','ac','ad','ae','af','b0','b1','b2','b3','b4','b5','b6','b7','b8','b9','f7','bb','bc','bd','be','bf','05b0','05b1','05b2','05b3','05b4','05b5','05b6','05b7','05b8','05b9','05ba','05bb','05bc','05bd','05be','05bf','05c0','05c1','05c2','05c3','05f0','05f1','05f2','05f3','05f4','f88d','f88e','f88f','f890','f891','f892','f893','05d0','05d1','05d2','05d3','05d4','05d5','05d6','05d7','05d8','05d9','05da','05db','05dc','05dd','05de','05df','05e0','05e1','05e2','05e3','05e4','05e5','05e6','05e7','05e8','05e9','05ea','f894','f895','200e','200f','f896' ];
	  function uTF8DecodeOfWin1255(input) {
		  var result = '';
		  for(var i=0;i<input.length;i++)
		  {
			  c = input.charCodeAt(i);
			  if (c < 256)
			  result += String.fromCharCode(parseInt(win1255Lookup[c],16));
		  }
		  return result;
	  }
		function uTF8Decode(input,charset) {
			if (charset=='windows-1255') 
				return uTF8DecodeOfWin1255(input);
			var string = "";
			var i = 0;
			var c = c1 = c2 = 0;
			while ( i < input.length ) {
				c = input.charCodeAt(i);
				if (c < 128) {
					string += String.fromCharCode(c);
					i++;
				} else if ((c > 191) && (c < 224)) {
					c2 = input.charCodeAt(i+1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				} else {
					c2 = input.charCodeAt(i+1);
					c3 = input.charCodeAt(i+2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}
			}
			return string;
		}

//		function uTF8Decode(input,charset) {
//			var string = "";
//			var i = 0;
//			var c = c1 = c2 = 0;
//			while ( i < input.length ) {
//				c = input.charCodeAt(i);
//				if (c >= 32 && c < 128) {
//					string += String.fromCharCode(c);
//					i++;
//				} else if ((c >= 224) && (c < 256) && (charset=='windows-1255')) {
//					string += String.fromCharCode(c+1488-224);
//					i++;
//				} else if (c == 0) { 
//					i++;string += ' ';
//				} else if (c == 10 || c == 13) { 
//					string += '\n'; i++;
//				} else {
//					string += '?' + c + '?';
//					i++;
//				}
//			}
//			return string;
//		}
		var keyString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		function base64Decode(input,charset) {
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;
			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
			while (i < input.length) {
				enc1 = keyString.indexOf(input.charAt(i++));
				enc2 = keyString.indexOf(input.charAt(i++));
				enc3 = keyString.indexOf(input.charAt(i++));
				enc4 = keyString.indexOf(input.charAt(i++));
				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;
				output = output + String.fromCharCode(chr1);
				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}
			}
			output = uTF8Decode(output,charset);
			return output;
		}

		function QTDecode(input,charset) {
			var output = "";
			var i = 0;
			while (i < input.length)
			{
				if (input.charAt(i) != '=')
				{
					output += input.charAt(i);
					i++;
				}
				else
				{
					var code = parseInt("0x"+input.charAt(i+1)+input.charAt(i+2));
					i += 3;
					output += String.fromCharCode(code);
				}
			}
			output = uTF8Decode(output,charset);
			return output;
		}


	  var text = aa_text(data,profile,'Text',context);
	  var encoding = aa_text(data,profile,'Encoding',context);
	  var charset = aa_text(data,profile,'Charset',context);
	  var result = [text];
	  if (encoding == "auto" && text.indexOf('=?') == 0)
	  {
		  var parts = text.split('?');
		  var charset = parts[1] || charset;
		  var type = parts[2];
		  var content = parts[3];
		  content = content.replace(/ =[\n\r]+/mg,'')
		  if (type == 'B') 
			  result = [base64Decode(content,charset)];
		  if (type == 'Q')
			  result = [QTDecode(content,charset)];
	  }
	  else if (encoding == "Base64")
		  result = [base64Decode(text,charset)];
	  else if (encoding == "Quoted Printable")
		  result = [QTDecode(text.replace(/ =[\n\r]+/mg,''),charset)];
	  return result;
  },
  SplitLines: function (profile,data,context)
  {
	  var text = aa_text(data,profile,'Text',context);
	  var newLineChars = aa_text(data,profile,'NewLineChars',context);
	  
	  return text.split(newLineChars);
  }
});
function aa_text_trim(str) {
    return str.replace(/^\s*/, "").replace(/\s*$/, "");
}

function aa_text_comma_seperate(text) // ignore \,
{
	var out = [];
	var last_index = 0;
	for (var i=0; i<text.length; i++) {
		if (text[i] == ',') {
			if (i == 0)
				last_index++;
			else if (text[i-1] != '\\') {
				var t = text.substring(last_index,i);
				if (t.indexOf('\\,') != -1)
					t = t.replace('\\,',','); 
				out.push(t);
				last_index = i+1;
			}
		}
	}
	if (last_index < text.length) {
		var t = text.substring(last_index);
		if (t.indexOf('\\,') != -1)
			t = t.replace('\\,',','); 
		out.push(t);
	}
	return out;
}
function aa_strreverse(str)
{
  return str.split('').reverse().join('');
}

function aa_base64ArrayBuffer(arrayBuffer) {
	  var base64    = ''
	  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

	  var bytes         = new Uint8Array(arrayBuffer)
	  var byteLength    = bytes.byteLength
	  var byteRemainder = byteLength % 3
	  var mainLength    = byteLength - byteRemainder

	  var a, b, c, d
	  var chunk

	  // Main loop deals with bytes in chunks of 3
	  for (var i = 0; i < mainLength; i = i + 3) {
	    // Combine the three bytes into a single integer
	    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

	    // Use bitmasks to extract 6-bit segments from the triplet
	    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
	    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
	    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
	    d = chunk & 63               // 63       = 2^6 - 1

	    // Convert the raw binary segments to the appropriate ASCII encoding
	    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
	  }

	  // Deal with the remaining bytes and padding
	  if (byteRemainder == 1) {
	    chunk = bytes[mainLength]

	    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

	    // Set the 4 least significant bits to zero
	    b = (chunk & 3)   << 4 // 3   = 2^2 - 1

	    base64 += encodings[a] + encodings[b] + '=='
	  } else if (byteRemainder == 2) {
	    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

	    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
	    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

	    // Set the 2 least significant bits to zero
	    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

	    base64 += encodings[a] + encodings[b] + encodings[c] + '='
	  }

	  return base64
}

function aa_capitalize_each_word(str)
{
	  var out = "";
	  var counter=0;
	  while (counter < str.length)
	  {
		  if (counter == 0) out += str.charAt(counter).toUpperCase();
		  else if (str.charAt(counter) == " ") {
			 if (counter+1 < str.length)  {
				 out += " " + str.charAt(counter+1).toUpperCase();
				 counter++;
			 }
		  }
		  else out += str.charAt(counter);
		  
		  counter++;
	  }
	  return out;
}

function aa_text_capitalizeToSeperateWords(str)
{
	  var out = "";
	  var start=0; var counter=1;
	  while (counter < str.length)
	  {
		  if (str.charAt(counter) >= 'A' && str.charAt(counter) <= 'Z')
		  {
			  if (counter+1 < str.length && ( str.charAt(counter-1) < 'A' || str.charAt(counter-1) > 'Z') )
			  {
			    out = out + str.substring(start,counter) + " " + str.charAt(counter);
			    start = counter+1;
			  }
		  }
		  counter++;
	  }
	  out = out + str.substring(start);
	  return out;
}
function ajaxart_language(context)
{
	if (context.vars.Language == null || context.vars.Language.length == 0) return "";
	return ajaxart.totext( context.vars.Language[0] );
}

function aa_multilang_text(data,script,field,context)
{
	return ajaxart_multilang_run(data,script,field,context)[0] || '';
}
function ajaxart_multilang_run(data,script,field,context)
{
	var fieldscript = ajaxart.fieldscript(script,field,true);
	if (fieldscript == null) return [""];
	var result = null;
	if (fieldscript.nodeType == 2) {
		if (fieldscript.nodeValue.indexOf('%') != -1) {
		  result = ajaxart.dynamicText(data,ajaxart_multilang_text(fieldscript.nodeValue,context),context);

		  if (ajaxart.xtmls_to_trace.length > 0) {
		    if (field == "") { field = script.nodeName; script = aa_xpath(script,'..')[0]; }
	        if (script.getAttribute("Trace") == field) ajaxart.trace(script,data,result,context,field);
		    aa_try_probe_test_attribute(script,field,data,result,context,data);
		  }
		}
	}
	if (result == null)
	  result = ajaxart.run(data,script,field,context);
	
	if (result.length > 0) result = [ajaxart_multilang_text(ajaxart.totext_array(result),context)];
	return result;
}
function ajaxart_multilang_text(text,context)
{
	if (context.vars.Language && context.vars.Language.length > 0 && text)
	{
		if (!window.aa_mlTable) ajaxart_fill_mlTable();
		var lang = aa_totext(context.vars.Language);
		if ( aa_mlTable[lang] && aa_mlTable[lang][text]) 
			return aa_mlTable[lang][text];
		if (typeof(aa_mlDefaultLanguage) != 'undefined' && aa_mlTable[aa_mlDefaultLanguage] && aa_mlTable[aa_mlDefaultLanguage][text])
			return aa_mlTable[aa_mlDefaultLanguage][text];
		var text_lc = text.toLowerCase();
		if ( aa_mlTable[lang] && aa_mlTable[lang][text_lc]) 
			return aa_mlTable[lang][text_lc];
	}
	return text; //text.split('__')[0];
}

function ajaxart_fill_mlTable() 
{
	window.aa_mlTable = window.aa_mlTable || {};
	for(ns in ajaxart.components)
	{
		if (!ajaxart.components.hasOwnProperty(ns)) continue;
		var list = ajaxart.components[ns];
		for(var j in list) {
			if (!list.hasOwnProperty(j)) continue;
			var comp = list[j];
			if (comp.getAttribute('type') == "text.MultiLangSuite") {
			  ajaxart.run([],aa_xpath(comp,'xtml')[0],'',ajaxart.newContext());
			}
		}
	}
}

function aa_textAutoLinks(text,target) {
	target = target || '_blank';
	// replaces links with <a href
	return text.replace(/[^"'](http[s]?[^\s]*)/g,'<a href="$1" target="'+target+'">$1</a>');
}

function aa_toValidFileName(str) {
	return str.replace(/[:*<>?\[\]#]*/g,'');
}