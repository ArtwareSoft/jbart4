aa_gcs("action", {
AddToCommas: function (profile,data,context)
{
	var to = aa_first(data,profile,'To',context);
	var value = ajaxart.run(data,profile,'Value',context);
	var valueText = ajaxart.totext_array(value);
	
	var curr = ajaxart.totext(to);
	if (curr != "") curr = curr + ",";
	curr = curr + valueText;
	
	ajaxart.writevalue([to],[curr]);
	
	return ["true"];
},
Switch: function (profile,data,context)
{
	  return aa_switch(profile,data,context);
},
IfThenElse : function (profile,data,params)
{
	  return aa_ifThenElse(profile,data,params);
},
RunDelayedAction: function (profile,data,context) {
	aa_run_delayed_action(
		aa_text(data,profile,'ID',context),
		function() { aa_run(data,profile,'Action',context); },
		aa_int(data,profile,'Milliseconds',context),
		true
	);
},
WriteToLog : function (profile,data,context)
{
	var message = aa_text(data,profile,'Message',context);
	var title = aa_text(data,profile,'Title',context);
	var level = aa_text(data,profile,'Level',context);
	var title_prefix = "";
	if (title != "")
		title_prefix = title + ":"; 
	ajaxart.log(title_prefix + message,level);
	return data;
},
DelayedRun: function (profile,data,context)
{
	var delay = aa_int(data,profile,'DelayInMilli',context);
	var id = aa_text(data,profile,'UniqueActionID',context);

	if ( id == "" ) // just run it delayed
	    setTimeout(function() { ajaxart.run(data,profile,'Action',context); },delay);
	else
	{
		if (ajaxart.runDelayed == null) ajaxart.runDelayed = [];
		// look for the id in the table
		var newRecord = { id: id , handle: null }
		var getTimerFunc = function(record)
		{
			return function() {
				record.handle = 0;
				ajaxart.run(data,profile,'Action',context);
			}
		}

		for(var i=0;i<ajaxart.runDelayed.length;i++)
		{
			var record = ajaxart.runDelayed[i];
			if (record.id == id) {
				if (record.handle != 0)
				  clearTimeout(record.handle);
				ajaxart.runDelayed[i] = newRecord;
				newRecord.handle = setTimeout(getTimerFunc(newRecord),delay);
				return ["true"];
			}
		}
		ajaxart.runDelayed.push(newRecord);
		newRecord.handle = setTimeout(getTimerFunc(newRecord),delay);
	}
    return ["true"];
},
	WriteToCookie: function (profile,data,context)
	{
		var cookie = aa_text(data,profile,'Cookie',context);
		var val = aa_text(data,profile,'Value',context);
		
		aa_writeCookie(cookie,val);
		return ["true"];
	},
	ActionReturningResult: function (profile,data,context)
	{
		ajaxart.run(data,profile,'Action',context);
		return ajaxart.run(data,profile,'Result',context);
	},
	ReRunOnInterval:function (profile,data,context)
	{
		var id = aa_text(data,profile,'ID',context);
		var interval = aa_int(data,profile,'IntervalInMSec',context);
		ajaxart.timers = ajaxart.timers || {};
		function activate() {
			if (ajaxart.timers[id])
				window.clearTimeout(ajaxart.timers[id]);
			ajaxart.timers[id] = setTimeout(function() { 
				if (!aa_bool(data,profile,'ContinueCondition',context))
					return;
				ajaxart.run(data,profile,'Action',context);
				activate();
			}, interval)
		}
		activate();
	},
	RunOnNextTimer: function (profile,data,context)
	{
		var runNow = aa_bool(data,profile,'RunNow',context);
		var wait = aa_int(data,profile,'WaitInMSec',context);
		if (wait == 0)
			wait = 1;
		var func = function() { 
			ajaxart.run(data,profile,'Action',context) 
		};
		if (runNow)
			func();
		else
			setTimeout(func,wait);
		
		return ["true"];
	},
	LoadCssFiles: function(profile, data, context)
	{
		if (typeof(aa_loaded_css_files) == "undefined") aa_loaded_css_files = ",";

		var filesStr = aa_text(data,profile,'CssFiles',context).replace(/_jbartLib_/g,aa_base_lib());
		var files = aa_split(filesStr,',',true);

		for(var i=0;i<files.length;i++) {
				if (aa_loaded_css_files.indexOf(","+files[i]+",") > -1) continue;
		    var fileref=document.createElement("link");
		    fileref.setAttribute("rel", "stylesheet");
		    fileref.setAttribute("type", "text/css");
		    fileref.setAttribute("href", files[i]);
		    document.getElementsByTagName("head")[0].appendChild(fileref);
		    aa_loaded_css_files += files[i]+",";
		}
	},
	PreloadImages: function(profile, data, context)
	{
		var images = ajaxart.run(data,profile,'Images',context);
		for(var i=0;i<images.length;i++) {
			var url = aa_totext([images[i]]);
			if (url) {
				var img=new Image();
				img.src=url;
			}
		}
	},
	WriteNodeJSResult: function(profile, data, context) {
		var result = aa_text(data,profile,'Result',context);
		if (window.jBartNodeJS) 
			jBartNodeJS.writeResult(result);
		// else
		// 	aa_alert(result);
	}
});

