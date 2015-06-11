ajaxart.load_plugin("ui_async","plugins/ui/ui_async.xtml");


aa_gcs("ui_async", {
  LoadingControl: function (profile,data,context)
  {
	  var id = aa_text(data,profile,'DivID',context);
	  var div = jQuery('#'+id);
	  if (div.length >0) { div[0].IsUsed = true; div.show(); return [div[0]]; }
	  return jQuery('<div>'+ajaxart_multilang_text("loading...",context)+"</div>").get();
  },
  ControlWithTimer: function (profile,data,context)
  {
	var out = jQuery('<div>')[0];
	setTimeout(function() {
		var contents = aa_first(data,profile,'Control',context);
		if (contents) out.appendChild(contents);
		aa_element_attached(contents);
	},20);
	return [out];
  },
  ControlUsage: function (profile,data,context)
  {
	  ajaxart_async_Mark(context);
	  aa_intest = true;
	  var control = aa_first(data,profile,'Control',context);
	  window.aa_intest_topControl = control;
	  if (control == null) { ajaxart_async_CallBack(["no control"],context); return }

      var listener = {};
      var listen = function(listener,control) {
    	  aa_async_finished_listeners.push(listener);
    	  listener.OnAsyncActionFinished = function() {
    		  if (jQuery(control).hasClass('aa_loading') || jQuery(control).find('.aa_loading').length > 0) return; // still have aa_loading. we'll wait for the next time
    		  aad_remove_async_finished_listener(listener);

    		  var newContext = aa_ctx(context,{ControlElement: [control], TopControlForTest: [control], InTest: ['true']});

    		  aa_intest = true;
    		  ajaxart_RunAsync(data,ajaxart.fieldscript(profile, 'RunOnControl',false),newContext,function() {
        		  aa_intest = true;
        		  var newContext = aa_ctx(context,{ControlElement: [control], TopControlForTest: [control], InTest: ['true']});
        		  
        		  if (context.vars._TestOutput) context.vars._TestOutput[0].OutputControl = control;

        		  var passed = aa_bool([control],profile,'ExpectedResult',newContext);
        		  ajaxart.run(data,profile,'CleanAfter',newContext);
        		  window.aa_intest_topControl = null;
        		  if (!ajaxart.inPreviewMode)
        			  ajaxart.runNativeHelper([],profile,'CloseDialogAndPopUp',context);
        		  var out= [];
        		  if (!passed) out = [control];
        		  
        		  aa_intest = false;
        		  ajaxart_async_CallBack(out,context); 
    		  });
    	  }
    	  listener.OnAsyncActionFinished();
      }
      listen(listener,control);
  },
  WaitForAsyncToFinish: function (profile,data,context)
  {
	  var jControl = jQuery(context.vars.TopControlForTest);
	  if (jControl.find('.aa_loading').length == 0) return;
      ajaxart_async_Mark(context);
      var listener = {};
      var listen = function(listener,jControl) {
    	  aa_async_finished_listeners.push(listener);
    	  listener.OnAsyncActionFinished = function() {
    		  if (jControl.find('.aa_loading').length > 0) return;	// still have aa_loading. we'll wait for the next time
    		  aad_remove_async_finished_listener(listener);
    		  ajaxart_async_CallBack(data,context);  
    	  }
      }
      listen(listener,jControl);
  }
});

