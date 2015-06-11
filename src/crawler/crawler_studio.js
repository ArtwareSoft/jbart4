ajaxart.load_plugin("", "plugins/crawler/crawler_studio.xtml");

aa_gcs("crawler_studio",{
	RefreshCrawlerObjects: function(profile,data,context) {
		var appContext = context.vars._AppContext[0];
		var appObj = aa_first([],appContext.AppXtml,'',aa_ctx(context,{ _RefreshMode: ['true'] }));
		appContext.Services = appObj.Services;
		appContext.Queues = appObj.Queues;
	},
	CleanSamplesCache: function(profile,data,context) {
		jBart.crawlerSamples = {};
	}
});
function aa_crawler_studio_init_studio(studio) {
	studio.CustomDeploy = function(data,context) {
		ajaxart.runComponent('crawler_deploy.Deploy',data,context);
	};
	studio.WidgetPreview = function(data,context) {
		return ajaxart.runComponent('crawler_studio.MainArea',data,context);		
	};
}
function aa_crawler_getTopServiceXtml(xtml) {
  if (xtml.nodeType == 2) xtml = aa_xpath(xtml,'..')[0];

  for(var iter=xtml;iter && iter.nodeType==1;iter=iter.parentNode) {
	  if (iter.tagName == 'Service' && iter.getAttribute('t') == 'crawler.Service') 
		  return iter;
  }
  return null;	
}
function aa_crawler_calcPrimitivePreviewContext(parentXtml,fieldName,context,settings) {
	var topContext = ajaxart.newContext(); // take _AppContext from context, which is actually 
	topContext.vars._AppContext = context.vars._AppContext;
	topContext.vars._GlobalVars = context.vars._GlobalVars;

	var topServiceXtml = aa_crawler_getTopServiceXtml(parentXtml);
	if (!topServiceXtml) return [];
	
	var xtmlToTraceObj = aadt_previewXtmlToTrace(parentXtml,fieldName);
	var xtmlToTrace = xtmlToTraceObj.Xtml; 
	aadt_putXtmlTraces(xtmlToTrace);

	ajaxart.inPreviewMode = true;
	try {
		var service = aa_first([],topServiceXtml,'',topContext);
		var queueID = aa_totext(aa_xpath(topServiceXtml,'../@ID'));
		if (service) service.runOnSample(queueID,context);
	} catch(e) {}
	
	ajaxart.inPreviewMode = false;
	if (xtmlToTraceObj.Cleanup) xtmlToTraceObj.Cleanup();  // we might need a cleanup if a dummy attribute was created 
	
	var results = [];
	if (settings.probeFieldData) {
		if (ajaxart.xtmls_to_trace[0].fieldData && ajaxart.xtmls_to_trace[0].fieldData.length >0)
			results = ajaxart.xtmls_to_trace[0].fieldData;
		else
			results = aa_aaeditor_find_preview_context_over_gap(settings).fieldData;
	} else if (settings.probeItemList) {
		if (ajaxart.xtmls_to_trace[0].itemlistCntr)
			results = ajaxart.xtmls_to_trace[0].itemlistCntr;
		else
			results = aa_aaeditor_find_preview_context_over_gap(settings).fieldData;
	}	else {
		if (ajaxart.xtmls_to_trace[0].results.length >0)
			results = ajaxart.xtmls_to_trace[0].results;
		else
			results = aa_aaeditor_find_preview_context_over_gap();
	}
	
	ajaxart.xtmls_to_trace = [];
	// TODO: add async query handling 
	
	return results; 
}