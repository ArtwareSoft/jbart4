ajaxart.load_plugin("inteliChoice","plugins/inteliChoice/inteliChoice.xtml");

aa_gcs("inteliChoice", {
	jBartStudioAccumulator: function(profile,data,context) {
	  jBart.bind(jBart,'userChoice',function(pick) {
		  aa_TriggerUserChoice(pick.selection,pick.target,pick.fieldId,pick.fieldXtml,pick.context);
	  	});
	},
	TriggerUserChoice: function(profile,data,context) {
		jBart.trigger(jBart,'userChoice',{ 
			selection: aa_first(data,profile,'Selection',context), 
			target: aa_first(data,profile,'Target',context), 
			fieldId: aa_text(data,profile,'FieldId',context),  
			fieldXtml: aa_first(data,profile,'FieldXtml',context),  
			context: context 
		});
	},
	TrackGoogleAnalyticsEvent: function(profile,data,context) {
		if (!window._gaq) return;

		_gaq.push(['_trackEvent', 
			aa_text(data,profile,'EventCategory',context),
			aa_text(data,profile,'EventAction',context),
			aa_text(data,profile,'EventLabel',context)
		]);
	}
});

if (ajaxart.jbart_studio)
	ajaxart.gcs.inteliChoice.jBartStudioAccumulator();

function aa_initjBartStudioGA() {
		if (window._gaq) return;
	   _gaq = window._gaq || [];
	   _gaq.push(['_setAccount', 'UA-37216601-1']);
	   _gaq.push(['_setDomainName', 'none']);//'artwaresoft.appspot.com']);
	   _gaq.push(['_setAllowLinker', true]);
	   _gaq.push(['_trackPageview']);

	   (function() {
	     var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	     ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
	     var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	   })();
}
function aa_TriggerUserChoice(selection,target,fieldId,fieldXtml,context) {
	if (window.location.href.indexOf('runtests.html') > -1 ) return;

	function nodeContext(node,atts) {
		  if (!node || !node.nodeType) return '';
		  if (node.nodeType == 2) return nodeContext(node.parentNode)+ '/' + node.nodeName;
		  var withParents = [node].concat($(node).parents().get()); 
		  var ids = $(withParents).map(function() { 
			  var res = '';
			  for (var i=0; i<atts.length;i++) 
				  res += $(this).attr(atts[i]) ? atts[i] + '=' + $(this).attr(atts[i]) + '/' : '';
			  return res;
		  	});
		  var path = $(ids).filter(function() { return this }).get().join('/');
		  return path.replace(/\/+/g,'/');
	 }

	if (!selection) return;
    var path = target ? nodeContext(target,['id','ID','Id','t']): '';
    
    if (!fieldXtml && context.vars._Input) // guess field xtml for studio picklist
    	if (selection.parentNode == null || selection.parentNode.tagName == 'tmp') { // maybe studio temporary holder
		  var input_item = $(context.vars._Input).parents().filter(function() { return this.ItemData && this.ItemData[0] && this.ItemData[0].parentNode })[0];
		  if (input_item && input_item.ItemData && input_item.ItemData[0])
			  fieldXtml = input_item.ItemData[0];
	}		  
    var field_path = fieldXtml ? nodeContext(fieldXtml,['id','ID','Id','t']) : '';

	var time = new Date().getTime();
	var selection = ajaxart.totext(selection);
	var xml = '<userChoice selection="{selection}" field="{field}" data_path="{path}" field_path="{field_path}" time="{time}"/>'
		.replace(/{selection}/,selection).replace(/{path}/,path).replace(/{field}/,fieldId).replace(/{field_path}/,field_path).replace(/{time}/,time);
	  
	aa_initjBartStudioGA();
	_gaq.push(['_setCustomVar',1,'selection',selection]);                  
	_gaq.push(['_setCustomVar',2,'path',path]);                  
	_gaq.push(['_setCustomVar',3,'field',fieldId]);                  
	_gaq.push(['_setCustomVar',4,'field path',field_path]);                  
	_gaq.push(['_trackEvent', 'jBart Choice', fieldId, selection]);
//	if (window.console) console.log(xml);
}
