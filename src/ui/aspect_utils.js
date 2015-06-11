function ajaxart_field_highlight_text(text,highlight,highlight_class)
{
	if (!text) return '';
	if (!highlight) return text;

	var result = text;
  	var lCaseTxt = text.toLowerCase();
  	var found_at = lCaseTxt.indexOf(highlight);
  	var endTag = lCaseTxt.indexOf('>');
  	if (found_at != -1 && found_at > endTag)
  	{
  		var to_replace = text.substring(found_at,found_at + highlight.length);
  		result = text.replace(to_replace,'####' + to_replace + '~~~~');
  	}
  	result = result.replace(/####/g,'<span class="aa_highlight ' + highlight_class + '">');
  	result = result.replace(/~~~~/g,'</span>');
  	return result;
}
function aa_replaceElement(element,newControl,cleanMemoryLeaks,transition)
{
	if (element.ParentObject != null) { 
		aa_defineElemProperties(newControl,'ParentObject');
		newControl.ParentObject = element.ParentObject; 
		newControl.ParentObject[0].ControlHolder = [newControl];
	}
	if (newControl) {
		if (transition) {
			element.parentNode.appendChild(newControl);
			transition.replace(element,newControl);
		}
		else
			ajaxart.replaceXmlElement(element,newControl,true,cleanMemoryLeaks);
		aa_clear_virtual_inner_element(element);
		aa_element_attached(newControl);
		aa_element_detached(element);
	}
	return newControl;
}
function aa_set_element_size(element,text,prefix) // prefix can be empty, min-,max-
{
	prefix = prefix || '';
	var arr = text.split(',');
	var width = aa_size_to_pixels(arr[0],"width");	// fix percentages
	var height = aa_size_to_pixels(arr[1] || '',"height");
	if (width) $(element).css(prefix + "width",width);
	if (height) $(element).css(prefix + "height",height);
}
function aa_size_to_pixels(value,type)
{
	if (!value) return null;
	if (value.match(/^[0-9 ]+$/)) return value + "px";
	if (value.indexOf("%") == -1) return value;
	var num = parseInt(value);
	if (isNaN(num)) return null;
	return Math.floor(aa_screen_size()[type] * num / 100) + "px";
}
function aa_ensure_visible(elem, padding) 	// auto scroll parents to ensure elem is visible (only vertical scroll)
{
	return;	// todo: fix this function, sometimes it scrolls with no need.
//	if ($(elem).is(':visible')) return;
	
    var elem_height = elem.offsetHeight;

    var curr = elem;
    var top = 0;
    if (!padding) padding = 10;

    while (true) {
    	var parent = curr.parentNode;
    	if (!parent) return;
    	top += curr.offsetTop;
    	if (parent.offsetParent == curr.offsetParent)
    		 top -= parent.offsetTop;	// offsetTop is relative to offsetParent and not to parent
    	if (top + elem_height + padding > parent.offsetHeight + parent.scrollTop)	// need to scroll down
    		parent.scrollTop = elem_height + top + padding - parent.offsetHeight;
    	if (top - padding < parent.scrollTop)	// need to scroll up
    		parent.scrollTop = Math.max(top - padding,0);
    	top -= parent.scrollTop;

    	curr = parent;
    }
}
function aa_addDescriptionForEmptyText(cell,emptyTextDescription,emptyTextClass)
{
	var field = cell.Field;
	var input = $(cell).find('input')[0] || $(cell).find('textarea')[0];
	if (input)
	{
		if (ajaxart.isChrome || ajaxart.isFireFox || ajaxart.isSafari) {
			input.setAttribute('placeholder',emptyTextDescription);
			return;
		}
		aa_defineElemProperties(input,'getValue','RefreshDescriptionForEmptyText');
		input.getValue = function() {
			var input = this;
			if ($(input).hasClass('empty_text_description') && input.value == emptyTextDescription) return '';
			return input.value;
		}
		input.RefreshDescriptionForEmptyText = function() {
			var input = this;
			if (input.value == '')
			{
				$(input).addClass('empty_text_description').addClass(emptyTextClass);
				input.value = emptyTextDescription;
				input.setAttribute('value',emptyTextDescription); // for tests
			} else {
				$(input).removeClass('empty_text_description').removeClass(emptyTextClass);
			}
		}
		input.RefreshDescriptionForEmptyText();
	}
	else {
		var textDiv = $(cell).find('.text');
		if (textDiv[0] && textDiv.text() == '') textDiv.text(emptyTextDescription).addClass(emptyTextClass);
	}
}

function aa_run_delayed_action(action_id,callback,delay,postpone_callback)
{
	window.jbDelayed_actions = window.jbDelayed_actions || {};

	delay = delay || 100;
	var time_to_delay = delay;
	var first_call_time = jbDelayed_actions[action_id] ? jbDelayed_actions[action_id].first_call_time : new Date().getTime();

	if (jbDelayed_actions[action_id]) {
		clearTimeout(jbDelayed_actions[action_id].timeoutid);
		if (!postpone_callback) 	// make sure the call is invoked exactly with the delay after the first call
			time_to_delay = delay - (new Date().getTime() - first_call_time);		
	}
	jbDelayed_actions[action_id] = {
		first_call_time: first_call_time,
		timeoutid: setTimeout(function() {
			jbDelayed_actions[action_id] = null;
			callback();
		},time_to_delay),
		callback: callback
	};
}
function aa_run_existing_delayed_action(action_id) {
	if (!window.jbDelayed_actions) return;
	if (jbDelayed_actions[action_id]) {
		clearTimeout(jbDelayed_actions[action_id].timeoutid);
		var callback = jbDelayed_actions[action_id].callback;
		jbDelayed_actions[action_id] = null;		
		callback();
	}
}
function aa_cancel_delayed_action(action_id)
{
	window.jbDelayed_actions = window.jbDelayed_actions || {};
	if (jbDelayed_actions[action_id]) {
		clearTimeout(jbDelayed_actions[action_id].timeoutid);
		jbDelayed_actions[action_id] = null;
	}
}
function aa_attach_window_resize(func, elem)
{
	if (!elem || !func) return;
	if (ajaxart.aa_windowresize == null) {
		ajaxart.aa_windowresize = 0; 
		ajaxart.window_size = { height: window.innerHeight, width:window.innerWidth};
		function onresize() {
			if (ajaxart.window_size && window.innerHeight == ajaxart.window_size.height && window.innerWidth == ajaxart.window_size.width)
				return;
			if (ajaxart.aa_windowresize != 0)
				clearTimeout(ajaxart.aa_windowresize);
			if (ajaxart.window_size.width == window.innerWidth &&
				Math.abs(ajaxart.window_size.height - window.innerHeight) > 100) return;  // Android fix: openning the keyboard should not call on resize.	
																						// Notive that when address bar is hiding, we need resize event. Address bar size is about 40-60 pixels.
			 ajaxart.window_size = { height: window.innerHeight, width:window.innerWidth};																		
			 aa_windowresize = setTimeout(function() {
				var listeners = $(".aa_window_resize_listener");
				for(var i=0;i<listeners.length;i++)
					aa_trigger(listeners[i],'WindowResize');

				 aa_windowresize = 0;
				}, 100);
		}
		window.addEventListener('resize', onresize,false);
		window.addEventListener('orientationchange', onresize,false);	// sometimes orientationchange is fired and sometimes resize, http://blog.blazingcloud.net/2012/05/08/orientationchange-and-resize-events-on-the-iphone/
		window.addEventListener('scroll', onresize,false);	// sometimes orientationchange is fired and sometimes resize, http://blog.blazingcloud.net/2012/05/08/orientationchange-and-resize-events-on-the-iphone/
	}
	$(elem).addClass('aa_window_resize_listener');
	aa_bind(elem,'WindowResize',func);
}