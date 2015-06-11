 // This file is responsible for providing previews for the following:
// 1. In field properties, especially for primitives
// 2. In aaeditor after a value is entered
// 3. In aaeditor before entering value (in which case the xtml to preview does not exist yet)
// 4. When adding fields in the toolbar
// 5. To calc Preview Data in studiobar
//
// It should also handle gaps (when the tester does nto happen. E.g. button action etc. )


// aa_calcPrimitivePreviewContext is used in the studio bars to handle preview context for primitives
function aadt_calcPrimitivePreviewContext(parentXtml,fieldName,context,settings)
{
	settings = settings || {};

	var appContext = context.vars._AppContext && context.vars._AppContext[0];
	if (appContext && appContext.Type == 'crawler') return aa_crawler_calcPrimitivePreviewContext(parentXtml,fieldName,context,settings);

	// The basic idea is to do ajaxart.run and put a trace on the tested xtml
	var topPageXtml = aadt_findTopPageXtml(parentXtml);
	var topXtml = topPageXtml; // our assumption is that the top page is enough for the circuit
	var topData = []; // we'll assume no data here...
	
	var topContext = ajaxart.newContext(); // take _AppContext from context, which is actually 
	topContext.vars._AppContext = context.vars._AppContext;
	topContext.vars._GlobalVars = context.vars._GlobalVars;
	
	if (topPageXtml == parentXtml && (settings.probeFieldData || settings.probeItemList)) {
		var page = ajaxart.run(topData,topXtml,'',topContext)[0];
		if (page)
			return (page.FieldData) ? page.FieldData([],context) : [];
	}

	var xtmlToTraceObj = aadt_previewXtmlToTrace(parentXtml,fieldName);
	var xtmlToTrace = xtmlToTraceObj.Xtml; 
	aadt_putXtmlTraces(xtmlToTrace);

	ajaxart.inPreviewMode = true;
	try {
		var page = ajaxart.run(topData,topXtml,'',topContext)[0];
		if (page) {
			var baseData = (page.FieldData) ? page.FieldData([],context) : [];
			page.Control(baseData,topContext);
		}
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
			results = aa_aaeditor_find_preview_context_over_gap(settings);
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

function aadt_previewXtmlToTrace(parentXtml,fieldName) {
	var xtml = aa_xpath(parentXtml,'@'+fieldName)[0] || aa_xpath(parentXtml,fieldName)[0];
	if (xtml) { return { Xtml: xtml } }
	// if not we'll create a dummy attribute and delete it afterwards
	parentXtml.setAttribute(fieldName,'');
	return {
		Xtml: aa_xpath(parentXtml,'@'+fieldName)[0],
		Cleanup: function() { 
			parentXtml.removeAttribute(fieldName);
		}
	}
}

function aadt_putXtmlTraces(xtmlToTrace)
{
	// tracing the XtmlForPreview and its parents
	ajaxart.xtmls_to_trace = [];
	var current_parent = xtmlToTrace;
	while (current_parent != null && current_parent.tagName != "Component" && current_parent.tagName != "Usage") {
		ajaxart.xtmls_to_trace.push( { xtml: current_parent , results: [] });
		current_parent = ajaxart.xml.parentNode(current_parent);
	}
}

function aadt_findTopPageXtml(parentXtml) {
  if (parentXtml.nodeType == 2) parentXtml = aa_xpath(parentXtml,'..')[0];
  
  for(var iter=parentXtml;iter && iter.nodeType==1;iter=iter.parentNode) {
	  if (iter.tagName == 'Component' && iter.getAttribute('type') == 'jbart.MyWidgetPage') 
		  return aa_xpath(iter,'xtml')[0];
  }
  return null;
}
