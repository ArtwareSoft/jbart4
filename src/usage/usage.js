ajaxart.load_plugin("usage");
ajaxart.load_plugin("usage","plugins/usage/usg.xtml");

var aa_intest;

ajaxart.gcs.usage = 
{
  DataUsage: function (profile,data,params)
  {
  	var user_agent = aa_text(data,profile,'UserAgent',params);
  	if (user_agent)	aa_determine_device(user_agent);
		return ajaxart.trycatch( function ()	{
//			if (ajaxart.getVariable(params, "GPXtml").length > 0) // only in aaeditor global preview
			
			ajaxart.run(data,profile,'RunBefore',params);
			var result = ajaxart.run(data,profile,'Result',params);
			var result = ajaxart.run(result,profile,'ResultTransformer',params);
			var passed = aa_bool(result,profile,'ExpectedResult',params);
//			var name = aa_text(data,profile,'Of',params) + " " + aa_text(data,profile,'Name',params);
			ajaxart.run(data,profile,'CleanAfter',params);

	 	    if (params.vars._TestOutput) {
	 	    	var out = jQuery("<span/>").text(ajaxart.usage.resultAsText(result)[0]);
	 	    	out.html(out.html().replace("\n","</br>"));
	 	    	if (params.vars._TestOutput[0].OutputControl) {
	 	    		params.vars._TestOutput[0].OutputControl[0].appendChild(out[0]);
	 	    		aa_fixTopDialogPosition();
	 	    	}
	 	    	else
		 	    	params.vars._TestOutput[0].OutputControl = out[0];
	 	    }
//	 	    if (params.vars._TestOutput) params.vars._TestOutput[0].OutputControl = ajaxart.usage.resultAsText(result);
			if (passed == false) {
				result = ajaxart.usage.resultAsText(result)[0];
				return result ? [result] : ["aa"];	// empty text means success
			}
			return [];
	}, function (e)	{ // catch
		return ["execption: " + e];
	});
  	if (user_agent)	aa_determine_device();	// put back user agent
  },
	JBartDataUsage: function (profile,data,context) {
		window.aa_intest = true;
		window.aa_intest_topControl = null;
  	var user_agent = aa_text(data,profile,'UserAgent',context);
  	if (user_agent)	aa_determine_device(user_agent);

		var ctx = aa_create_jbart_context({
			WidgetXml: context.vars._WidgetXml[0],
			Context: context
		});
		ctx = aa_merge_ctx(context,ctx);

		ajaxart.run(data,profile,'RunBefore',ctx);
		var result = aa_run(data,profile,'Result',ctx);
		var passed = aa_bool(result,profile,'ExpectedResult',ctx);

		aa_run(data, profile, 'CleanAfter', ctx);
		window.aa_intest = false;

    if (context.vars._TestOutput) {
    	var out = jQuery("<span/>").text(ajaxart.usage.resultAsText(result)[0]);
    	out.html(out.html().replace("\n","</br>"));
    	if (context.vars._TestOutput[0].OutputControl) {
    		context.vars._TestOutput[0].OutputControl[0].appendChild(out[0]);
    		aa_fixTopDialogPosition();
    	}
    	else
	    	context.vars._TestOutput[0].OutputControl = out[0];
    }
		if (user_agent)	aa_determine_device(); // put back user agent

		if (!passed) {
			result = ajaxart.usage.resultAsText(result)[0];
			return result ? [result] : ["aa"];	// empty text means success
		}
	},
	JBartActionUsage: function (profile,data,context) {			// async test!
		// Hasn't been tested yet!!!
		var deferred = $.Deferred();

		window.aa_intest = true;
		window.aa_intest_topControl = null;
  	var user_agent = aa_text(data,profile,'UserAgent',context);
  	if (user_agent)	aa_determine_device(user_agent);

		var ctx = aa_create_jbart_context({
			WidgetXml: context.vars._WidgetXml[0],
			Context: context
		});
		ctx = aa_merge_ctx(context,ctx);

		var prmoise = aa_first(data,profile,'Action',ctx);
		$.when(promise).then(function() {
			var result = aa_run(data,profile,'Result',ctx);
			var passed = aa_bool(result,profile,'ExpectedResult',ctx);

			aa_run(data, profile, 'CleanAfter', ctx);
			window.aa_intest = false;
			if (user_agent)	aa_determine_device(); // put back user agent

	    if (context.vars._TestOutput) {
	    	var out = jQuery("<span/>").text(ajaxart.usage.resultAsText(result)[0]);
	    	out.html(out.html().replace("\n","</br>"));
	    	if (context.vars._TestOutput[0].OutputControl) {
	    		context.vars._TestOutput[0].OutputControl[0].appendChild(out[0]);
	    	}
	    	else
		    	context.vars._TestOutput[0].OutputControl = out[0];
	    }

			deferred.resolve(passed ? [] : (result.length ? result : ['failed']) ); // empty means success
		});

		if (context.vars._AsyncPromiseHolder)
			context.vars._AsyncPromiseHolder[0].promise = deferred.promise();

		return [];
	},
  DataUsage_Result: function (profile,data,context)
  {
	  ajaxart.run(data,profile,'RunBefore',context);
	  return ajaxart.run(data,profile,'Result',context);
  },

  DataUsage_Data: function (profile,data,context)
  {
	  if (data.length == 0) return [""];
	  return data;
  },
  RunInTestMode: function (profile,data,context)
  {
		var intest = aa_intest;
		window.aa_intest = true;
		window.aa_intest_topControl = window.aa_intest_topControl || document;
		ajaxart.run(data,profile,'Action',context);
		window.aa_intest = intest;
  },
  RunSingleTest: function (profile,data,context)
  {
	  IsTest = true;
	  if (!ajaxart.isxml(data)) return [];
	  var usageProf = data[0];
	  
	  ajaxart.runTestLoop([usageProf],0);
	  return [];
  },
  ContainsText: function (profile,data,context)
  {
	  var look_in = aa_text(data,profile,'LookIn',context);
	  var input = data;
	  if (look_in == 'current dialog') {
		  input = [];
		  var topDialogNew = aa_top_dialog();
		  if (topDialogNew && topDialogNew.dialogContent) input = [topDialogNew.dialogContent];
		  if (!input[0] && topDialogNew) input = [topDialogNew];
		  if (!input[0]) {
  		    var dlg = openDialogs[openDialogs.length-1];
			if (dlg) input = [dlg];
		  }
	  } else if (look_in == 'current popup') {
	  	input = aa_popupElementForTests() || aa_contentsOfOpenPopup();
	  }
	  
	  if (aa_bool(data,profile,'RemoveHiddenElements',context) && ajaxart.ishtml(input[0]) ) {
	  	$(input).find('.aa_hidden_element').remove();
	  	
			var toRemove = [];
			function clear(node)
			{
				if (node.style && (node.style.display == 'none' || node.display == 'none' ))
					toRemove.push(node);
				else if (node.style && node.style.position.toLowerCase().indexOf('absolute') != -1)
					toRemove.push(node);
				else {
				  for(var i=0;i<node.childNodes.length;i++)
					clear(node.childNodes[node.childNodes.length-i-1]);
				}
			}
			clear(input[0]);
			for(var i in toRemove)
				if (toRemove[i].parentNode)
					toRemove[i].parentNode.removeChild(toRemove[i]);
	  }
		  
	  var ignoreCase = aa_bool(data,profile,'IgnoreCase',context);
	  var ignoreOrder = aa_bool(data,profile,'IgnoreOrder',context);
	  var oneOf = aa_bool(data,profile,'OneOf',context);

	  var data_text = "";
	  if (ajaxart.isxml(input))
	  	data_text = ajaxart.xml2text(input);
	  else
	  	data_text = ajaxart.totext(input);

  	  var text_items = ajaxart.runsubprofiles(data,profile,'Text',context);
  	  var startIndex = 0;
	  if (ignoreCase) data_text = data_text.toLowerCase();
	  var success = (text_items.length == 0);
	  
	  for(var i=0;i<text_items.length;i++) {
			var text = text_items[i];
	  		if (ignoreCase) text = text.toLowerCase();
	  		var new_index = data_text.indexOf(text,startIndex);
	  		if (!oneOf && new_index == -1) return [];
	  		success = true;
	  		startIndex = new_index + text.length;
	  		if (ignoreOrder || oneOf) startIndex=0;
	  };
	  if (!success) return [];

	  var notContainingText = aa_text(data,profile,'AndNotContainingText',context);
	  if (!notContainingText) return ['true'];
	  if (ignoreCase) notContainingText = notContainingText.toLowerCase();
	  
	  if (data_text.indexOf(notContainingText) > -1) return [];
	  
	  return ['true'];
  },
  And: function(profile,data,context) {
  	return ajaxart.gcs.yesno.And(profile,data,context);
  },
  Or: function(profile,data,context) {
  	return ajaxart.gcs.yesno.OR(profile,data,context);
  },
  HasFocus: function(profile,data,context) {
  	var cls = aa_text(data,profile,'CssClass',context);
  	if (jQuery(document.activeElement).hasClass(cls)) return ["true"];
  	if (jQuery(context.vars.TopControlForTest).find('.in_focus').hasClass(cls)) return ["true"];
  	if (jQuery('.in_focus').hasClass(cls)) return ["true"];
  	return [];
  }
}

ajaxart.usage = {};
ajaxart.usage.resultAsText = function(result)
{
	if (result.length == 0) 
		return ["false"];

	if (ajaxart.isxml(result))
		return [ ajaxart.xml2text(result) ];
//		return [ aa_xmlescape(ajaxart.xml2text(result)) ];

	if (ajaxart.isObject(result[0]))
		return [ajaxart.text4trace(result)];
	else
		return result;
	
	return result;
}
