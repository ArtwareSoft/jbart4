ajaxart.load_plugin("", "plugins/gstudio/gstudio_drag.xtml");

aa_gcs("bart_dt", {
	Inspect: function (profile,data,context)
	{
		ajaxart.jbStudioObject = context.vars._JBartStudio[0];
		ajaxart.jbStudioObject.Mode = 'select';
		aa_refresh_field(['GButton_Inspect'],'screen',false,null,context);		

	  jBart.studiobar.context = context;
	  bartdt_captured_element = $([]);
	  window.bartdt_capture_level = aa_text(data,profile,'Level',context);
//	  if (bartdt_capture_level=='sample' && window.location.href.indexOf('bartdev.html') > -1)
//		  bartdt_capture_level='application';
	  
	  aa_incapture = true;
	  
	  $('body').addClass('jbstudio_select');

	  /* For Compress: bartdt_capture_click(), bartdt_capture_mousemove(), bartdt_capture_mouseup(), bartdt_capture_mousedown(), bartdt_capture_keydown(), bartdt_capture_mousewheel() */
	  if (window.captureEvents){ // FF
		window.onclick = bartdt_capture_click;
		window.onmousemove = bartdt_capture_mousemove;
		window.onmousup = bartdt_capture_mouseup;
		window.onmousdown = bartdt_capture_mousedown;
		window.onkeydown = bartdt_capture_keydown;
	    if (window.addEventListener)
		    window.addEventListener('DOMMouseScroll', bartdt_capture_mousewheel, false);
	    window.onmousewheel = bartdt_capture_mousewheel;
	  }
	  else  // IE
	  {
		document.onclick=bartdt_capture_click;
		document.onmousemove=bartdt_capture_mousemove;
		document.onkeydown=bartdt_capture_keydown;
		document.onmousup = bartdt_capture_mouseup;
		document.onmousdown = bartdt_capture_mousedown;
		document.onmousewheel = bartdt_capture_mousewheel;
	  }
	
	  return [];
	}
});

function bartdt_capture_mousemove(e)
{
    var el=(typeof event!=='undefined')? event.srcElement : e.target;    

	if (el.className == 'jbStudioCapture') {
		$('.jbStudioCapture').css('display','none');
		el = document.elementFromPoint(e.pageX - $(window).scrollLeft(), e.pageY - $(window).scrollTop());
		$('.jbStudioCapture').css('display','block');
	}


	// find el with context
//	if (bartdt_capture_level == "sample" && jQuery(el).parents('.Page_runtime').length == 0 && jQuery(el).parents('.aa_dialogcontents').length == 0 && jQuery(el).parents('.aa_preview').length == 0) return;
	jBart.studiobar.originalObjectWhenInspecting = // avoiding a tiny mouse move to cancel by mistake the 'going up' mode
		bartdt_capture_mousemove_find_parent(el, jBart.studiobar.originalObjectWhenInspecting);
 }
function bartdt_capture_mouseup(e) { return aa_stop_prop(e); return false; }
function bartdt_capture_mousedown(e) { return aa_stop_prop(e); return false; }
function bartdt_capture_mousewheel(event){	// taken from http://www.adomas.org/javascript-mouse-wheel/
    var delta = 0;
    if (!event) /* For IE. */
            event = window.event;
    if (event.wheelDelta) { /* IE/Opera. */
            delta = event.wheelDelta/120;
    } else if (event.detail) {
            delta = -event.detail/3;
    }
    if (delta > 0) {
		if (jBart.studiobar.objectWhenInspecting) 
			jBart.studiobar.parentObjectWhenInspecting(jBart.studiobar.objectWhenInspecting);
    }
//    if (event.preventDefault)
            event.preventDefault();
    event.returnValue = false;
}
function bartdt_capture_keydown(e)
{
	if (e.keyCode == 27) {
		bartdt_stop_capture();
		aa_studio_hideCaptureBox();
		bartdt_captured_element = $([]);
	}
	if (e.keyCode == 38) {	// arrow up
		if (jBart.studiobar.objectWhenInspecting)
			jBart.studiobar.parentObjectWhenInspecting(jBart.studiobar.objectWhenInspecting);
	}
	if (e.keyCode == 13) {	
		bartdt_capture_click();
	}
}
function bartdt_capture_click(e)
{
	if (!jBart.studiobar.objectWhenInspecting) return;
	bartdt_stop_capture();
	aa_studio_hideCaptureBox();

	jBart.studiobar.object = jBart.studiobar.objectWhenInspecting;
	var ctx = aa_ctx(jBart.studiobar.context,{_DomEvent: [e]}); 

	jBart.studiobar.context = jBart.studiobar.objectWhenInspecting = null; // cleanup for memory leak
	if (bartdt_capture_level == 'infra' || aa_altn_xtml_from_infra(jBart.studiobar.object.Xtml) ) {
		aa_studio_bindToComponentXmlChange(jBart.studiobar.object.Xtml,ctx);
	}
	ajaxart.runComponent('bart_dt.EditXtmlInStudioBar',[jBart.studiobar.object.Xtml],ctx);

	aa_studio_showObjectElements(jBart.studiobar.object);
	return aa_stop_prop(e);
}
function aa_altn_xtml_from_infra(xtml) {
	for(iter = aa_xpath(xtml,'..')[0];iter && iter.nodeType == 1;iter = iter.parentNode) {
		if (iter.tagName && iter.tagName == 'xtml' && iter.getAttribute('altc') == 'true') return true;
	}	
	return false;
}
function bartdt_stop_capture()
{
	$('body').removeClass('jbstudio_select');

	jBart.studiobar.originalObjectWhenInspecting = null;
	aa_incapture = false;
	if (window.captureEvents){ // FF
		  window.captureEvents(Event.Click);
		  window.onclick=null;
		  window.onmousemove=null;
		  window.onkeydown=null;
		  window.onmouseup=null;
		  window.onmousedown=null;
		  window.onmousewheel=null
		  if (window.removeEventListener)
			   window.removeEventListener('DOMMouseScroll', bartdt_capture_mousewheel, false);
	    }
		else  // IE
		{
		  document.onclick=null;
		  document.onmousemove=null;
		  document.onkeydown=null;
		  document.onmousedown=null;
		  document.onmousewheel=null
		}

		ajaxart.jbStudioObject.Mode = '';
		aa_refresh_field(['GButton_Inspect'],'screen',false,null,jBart.studiobar.context);
}

function bartdt_capture_mousemove_find_parent(el, object_not_to_select)
{
	var object = jBart.studiobar.objectFromElement(el);
	
	if (object && object_not_to_select && object.Elements[0] == object_not_to_select.Elements[0]) return object_not_to_select;// avoiding a tiny mouse move to cancel by mistake the 'going up' mode
	jBart.studiobar.objectWhenInspecting = object;
	if (!object) {
		return;
	}

	var capturedElement = object.Elements[0];

	aa_studio_showCaptureBox(capturedElement,object.Title);

	return object;
}

function aa_studio_showCaptureBox(capturedElement,title) {
	var width = jQuery(capturedElement).outerWidth();
	var height = jQuery(capturedElement).outerHeight();

	var fieldTitleDistance = 13;

	var $top,$bottom,$left,$right,$fieldTitle,$fieldTitleTriangle,$boxBorder1,$boxBorder2,$capture;

	if (!$('#jbStudioCapture').length) {
		var $capture = $('<div id="jbStudioCapture" class="jbStudioCapture" style="width:100%;height:100%;"/>').appendTo('body');
		$capture.css('z-index','6000');
		$top = $('<div id="jbStudioCapture_top" style="top:0;left:0;right:0;"/>').appendTo($capture);
		$bottom = $('<div id="jbStudioCapture_bottom" style="left:0;right:0;"/>').appendTo($capture);
		$left = $('<div id="jbStudioCapture_left" style="left:0;"/>').appendTo($capture);
		$right = $('<div id="jbStudioCapture_right" style="right:0;"/>').appendTo($capture);
		$fieldTitle = $('<div id="jbStudioCapture_field_title" class="jbStudioCapture"/>').appendTo($capture);
		$fieldTitleTriangle = $('<div id="jbStudioCapture_field_title_triangle" class="jbStudioCapture"/>').appendTo($capture);
		$boxBorder1 = $('<div id="jbStudioCapture_box_border1" class="jbStudioCapture"/>').appendTo($capture);
		$boxBorder2 = $('<div id="jbStudioCapture_box_border2" class="jbStudioCapture"/>').appendTo($capture);

		$([$left[0],$right[0],$top[0],$bottom[0]]).css({
			position: 'absolute',
			opacity: '0.5',
			background: '#666',
			'z-index': '6000'
		}).addClass('jbStudioCapture');

		$fieldTitle.css({
			'z-index': '6001',
			position: 'absolute',
			background: '#fff',
			color: '#000',
			font: '14px arial',
			padding: '3px 8px',
			border: '1px solid #ccc'
		});

		$fieldTitleTriangle.css({
			'z-index': '6001',
			position: 'absolute',
			width:0,height:0,
			'border-style': 'solid',
			'border-color': '#fff transparent transparent transparent',
			'border-width': '6px'
		});

		$boxBorder1.css({
			'z-index': '6000',
			position: 'absolute',
			border: '1px solid #fff'
		});
		$boxBorder2.css({
			'z-index': '6001',
			position: 'absolute',

			border: '1px dashed #000'
		});

	} else {
		$capture = $('#jbStudioCapture');
		$top = $('#jbStudioCapture_top');
		$bottom = $('#jbStudioCapture_bottom');
		$left = $('#jbStudioCapture_left');
		$right = $('#jbStudioCapture_right');
		$fieldTitle = $('#jbStudioCapture_field_title');
		$fieldTitleTriangle = $('#jbStudioCapture_field_title_triangle');
		$boxBorder1 = $('#jbStudioCapture_box_border1');
		$boxBorder2 = $('#jbStudioCapture_box_border2');
	}
	
	$top.css('height',aa_absTop(capturedElement)+'px');
	$bottom.css('top',aa_absTop(capturedElement)+height-1+'px');
	$bottom.css('height',$(document).height() - aa_absTop(capturedElement)-height-20 + 'px');
	$left.css('width',aa_absLeft(capturedElement)-1+'px');
	$right.css('left',aa_absLeft(capturedElement)+width+1+'px');
	$([$left[0],$right[0]]).css('top',aa_absTop(capturedElement)+'px').css('height',height-1+'px');

	$([$boxBorder1[0],$boxBorder2[0]]).css({
		top: aa_absTop(capturedElement)-1+'px',
		left: aa_absLeft(capturedElement)-1+'px',
		width: width,
		height: height-1
	});

	$fieldTitle.text(title);
	setTimeout(function() {
		$fieldTitle.css({
			top: aa_absTop(capturedElement) - fieldTitleDistance - ($fieldTitle).outerHeight(),
			left: aa_absLeft(capturedElement) + ( width-($fieldTitle).outerWidth() )/2
		});

		$fieldTitleTriangle.css({
			top: aa_absTop($fieldTitle[0]) + $fieldTitle.outerHeight() - 1,
			left: aa_absLeft($fieldTitle[0]) - 7 + $fieldTitle.outerWidth()/2
		});

	},2);

  var fixed_position = false;
  $(capturedElement).parents().addBack().each(function(){
    if ($(this).css("position") === "fixed")
      fixed_position = true;
  });
  if (fixed_position)
    $capture.children().css("position","fixed");
  else
  	$capture.children().css("position","absolute");
}

function aa_studio_hideCaptureBox() {
	$('#jbStudioCapture').remove();
}

function aa_studio_showObjectElements(object) {
	$('.jbstudio_constant_selected_box').css('display','none');
	
	var constantIndication = false;
	
	if (constantIndication) {
		var box = jQuery.find('.jbstudio_constant_selected_box')[0];
		if (!box) {
			box = jQuery('<div class="jbstudio_constant_selected_box"><div class="line top"/><div class="line left"/><div class="line bottom"/><div class="line right"/><div class="corner topleft"/><div class="corner topright"/><div class="corner bottomleft"/><div class="corner bottomright"/></div>')[0];
			jQuery(box).find('>div').css('position','absolute');
			document.body.appendChild(box);
		}
		var jBox = $(box);
		jBox.css('display','none');
		var elem = object && object.Elements && object.Elements[0];
		if (!elem) return;
		var x = aa_absLeft(elem), y = aa_absTop(elem), height = jQuery(elem).outerHeight(), width = jQuery(elem).outerWidth();
		var padding = 0; 
		x -= padding+1;y-= padding+1; width += padding*2+1; height += padding*2+1;
		
		jBox.css('left',x).css('top',y).height(height).width(width);

		jBox.find('.left').css('left',x).css('top',y).height(height);
		jBox.find('.right').css('left',x+width).css('top',y).height(height);
		jBox.find('.top').css('left',x).css('top',y).width(width);
		jBox.find('.bottom').css('left',x).css('top',y+height).width(width);

		var corderdiff = 0;

		jBox.find('.topleft').css('left',x-corderdiff).css('top',y-corderdiff);
		jBox.find('.topright').css('left',x+width-corderdiff).css('top',y-corderdiff);
		jBox.find('.bottomleft').css('left',x-corderdiff).css('top',y+height-corderdiff);
		jBox.find('.bottomright').css('left',x+width-corderdiff).css('top',y+height-corderdiff);
		
		jBox.css('display','block');
		
		return;
	}

	var boxes = jQuery('<div class="jbstudio_show_objects" />');
	if (!object || !object.Elements) return;
	
	for(var i=0;i<object.Elements.length;i++) {
		var box = jQuery('<div class="jbstudio_show_object"/>');
		var elem = object.Elements[i];
		
		var elem_pos = { x: aa_absLeft(elem), y: aa_absTop(elem)};
		box.css('position','absolute').css('left',elem_pos.x).css('top',elem_pos.y).width(jQuery(elem).outerWidth()).height(jQuery(elem).outerHeight());
		
		boxes.append(box);
	}

	boxes.fadeTo('2000',0.5,function() {
		boxes.fadeTo('2000',0,function() {
			boxes.remove();
		});
	});
	
	jQuery('body').append(boxes);
}

jBart.studiobar.parentObjectWhenInspecting = function(currentObject)
{
	var elem = currentObject.Elements[0];
	while (elem) {
		var object = jBart.studiobar.objectFromElement(elem);
		if (!object) return;
		if (object.Xtml != currentObject.Xtml) {
			bartdt_capture_mousemove_find_parent(elem);
			return;
		}
		elem = elem.parentNode;
	}
};

function aa_show_selected_object_marks()
{
	aa_studio_showObjectElements(jBart.studiobar.object);
}
function aa_wrapper(elem) {
	return elem.jbCell || elem.parentNode;
}

aa_gcs("gstudio_drag",{
	StartDragMode: function(profile,data,context) {
		ajaxart.runComponent('gstudio_drag.EnsureLayoutAspectCss',[],context);
		var selectedXtml = ajaxart.runNativeHelper(data,profile,'SelectedXtml',context)[0];
		aa_gDragMode(selectedXtml,context);
	}
});

function aa_gDragMode(fieldXtml,context) {
	jBart.studiobar.object = jBart.studiobar.objectFromXtml(fieldXtml);
	var object = jBart.studiobar.object;
	var studio = context.vars._JBartStudio[0];

	var elem = object && object.Elements && object.Elements[0];
	var writeTimeoutID;
	if (!elem) return;

	studio.Mode = 'drag';
	aa_refresh_field(['gstudio_toolbar_layout'],'screen',false,null,context);

	var dragObject = {
		Update: function() {
			updateDisplayFromPopup();
		},
		UpdateDragProperty: function(data1,ctx) {
			var oldValue = aa_totext(ctx.vars.OldValue);
			var newValue = aa_totext(data1);
			ajaxart.runComponent('gstudio_drag.ConvertDragProperty',[ { OldValue: [oldValue], NewValue: [newValue] }],context);

			aa_gDragMode(fieldXtml,context); // start again
		}
	};

	var dragBox = $('<div tabindex=0 class="jbstudio_drag_box"/>');
	var dragBox2 = $('<div tabindex=0 class="jbstudio_drag_box"/>').appendTo('body');
	dragBox.appendTo('body');
	var dragBoxes = $([dragBox[0],dragBox2[0]]);

	var dragBoxCover = $('<div tabindex=0 class="jbstudio_drag_box_cover" style="height:100%; width: 100%;z-index:6000; opacity:0; filter: alpha(opacity=0);position:fixed;top:0;left:0;top:0;bottom:0"/>');
	dragBoxCover.appendTo('body');
	dragBoxCover.click(dispose);
	dragBoxCover[0].focus();

	var css = '#this { z-index: 6001; position: absolute; background: tansparent; } #this:focus { outline: none; }';
	dragBoxes.addClass(aa_attach_global_css(css));

	dragBox.css('border','1px dashed black');
	dragBox2.css('border','1px solid white');

	dragBoxes.css({
		left: aa_absLeft(elem)+'px',
		top: aa_absTop(elem)+'px',
		width: $(elem).outerWidth()-1,
		height: $(elem).outerHeight()-1,
		cursor: 'move'
	});

	var moving = false,startPosX = 0,startPosY = 0,startLeft,startTop;

	dragBoxes.mousedown(function(e) { 
		moving = true; 
		startPosX = e.pageX || e.clientX;
		startPosY = e.pageY || e.clientY;
		startLeft = parseInt( dragBox[0].style.left.split('px')[0] );
		startTop = parseInt( dragBox[0].style.top.split('px')[0] );
		dragBox.css('cursor','move');
		ajaxart_disableSelection(document.body);
		calcFieldValues();
	});
	dragBoxes.mouseup(function() { 
		moving = false; 
		dragBox.css('cursor','auto');
		ajaxart_restoreSelection(document.body);
		refreshDragBox();
	});

	$([dragBoxCover[0],dragBox[0],dragBox2[0]]).mousemove(function(e) {
		if (!moving) return;
		var deltaX = (e.posX || e.clientX || 0) - startPosX;
		var deltaY = (e.posY || e.clientY || 0) - startPosY;
		deltaY += window.window.pageYOffset;
		deltaX += window.window.pageXOffset;
		if (e.ctrlKey) deltaX = 0;
		dragBoxes.css('left',startLeft + deltaX + 'px');
		dragBoxes.css('top',startTop + deltaY + 'px');
		updateFieldValues(deltaX,deltaY);
	});
	$([dragBoxCover[0],dragBox[0]]).keydown(function(e) {
		if (e.keyCode == 27 || e.keyCode == 13) dispose();
		if (e.keyCode >= 37 && e.keyCode <= 40) {
			var deltaX=0,deltaY=0;
			if (e.keyCode == 40) deltaY++;
			if (e.keyCode == 38) deltaY--;
			if (e.keyCode == 37) deltaX--;
			if (e.keyCode == 39) deltaX++;
			if (e.ctrlKey) { deltaX *= 10; deltaY *= 10; }

			startLeft = parseInt( dragBox[0].style.left.split('px')[0] );
			startTop = parseInt( dragBox[0].style.top.split('px')[0] );

			dragBoxes.css('left',startLeft + deltaX + 'px');
			dragBoxes.css('top',startTop + deltaY + 'px');
			calcFieldValues();
			updateFieldValues(deltaX,deltaY);
			refreshDragBox();
		}
	});

	var aspectXml = ajaxart.runComponent('gstudio_drag.LayoutAspect',[],context)[0];	
	var cssAsXml = ajaxart.runComponent('gstudio_drag.LayoutAspectCssAsXml',[],context)[0];
	var dragProperty = aspectXml.getAttribute('dragProperty');
	if (!dragProperty) {
		dragProperty = guessDragProperty(cssAsXml,elem);
		aspectXml.setAttribute('dragProperty',dragProperty);
	}
	var selector = dragProperty.indexOf('#wrapper') > -1 ? '#wrapper' : '#this';
	var cssElem = aa_xpath(cssAsXml,"Css[@selector='"+selector+"']")[0];
	var isAbsolutePos = dragProperty.indexOf('absolute') > -1;

	var propertyType = dragProperty.indexOf('padding') > -1 ? 'padding' : 'margin';
	var marginSimplifier = aa_xpath(cssElem,"Simplifiers/"+propertyType)[0];
	var topSimplifier, leftSimplifier;
	if (isAbsolutePos) {
		topSimplifier = aa_xpath(cssElem,"Simplifiers/top")[0];
		leftSimplifier = aa_xpath(cssElem,"Simplifiers/left")[0];

		if (!topSimplifier.getAttribute('value')) topSimplifier.setAttribute('value','0');
		if (!leftSimplifier.getAttribute('value')) leftSimplifier.setAttribute('value','0');
	}

	var fieldLeft, fieldTop;
	if (!isAbsolutePos) makeMarginSeparated();
	showPropertySheet();

	function refreshDragBox() {
			jBart.studiobar.object.Refresh([],context);
			object = jBart.studiobar.object = jBart.studiobar.objectFromXtml(fieldXtml);
			elem = object && object.Elements && object.Elements[0];

			dragBoxes.css({
				left: aa_absLeft(elem)+'px',
				top: aa_absTop(elem)+'px',
				width: $(elem).outerWidth()-1,
				height: $(elem).outerHeight()-1
			});
	}

	function makeMarginSeparated() {
		var type = marginSimplifier.getAttribute('type');
		if (type == 'all') {
			var val = marginSimplifier.getAttribute('val');
			$(marginSimplifier).attr('left',val).attr('right',val).attr('top',val).attr('bottom',val);
		} 
		if (type == 'xy') {
			var x = marginSimplifier.getAttribute('x');
			var y = marginSimplifier.getAttribute('y');
			$(marginSimplifier).attr('left',x).attr('right',x).attr('top',y).attr('bottom',y);
		}
		marginSimplifier.setAttribute('type','separated');
		if (!marginSimplifier.getAttribute('left')) marginSimplifier.setAttribute('left','');
		if (!marginSimplifier.getAttribute('top')) marginSimplifier.setAttribute('top','');
	}

	function calcFieldValues() {
		if (isAbsolutePos) {
			fieldLeft = parseInt( (leftSimplifier.getAttribute('value') || '').split('px')[0] ) || 0;
			fieldTop = parseInt( (topSimplifier.getAttribute('value') || '').split('px')[0] ) || 0;
		} else {
			fieldLeft = parseInt( (marginSimplifier.getAttribute('left') || '').split('px')[0] ) || 0;
			fieldTop = parseInt( (marginSimplifier.getAttribute('top') || '').split('px')[0] ) || 0;
		}
	}
	function updateFieldValues(deltaX,deltaY) {
		var left = fieldLeft + deltaX;
		var top = fieldTop + deltaY;

		if (isAbsolutePos) {
			leftSimplifier.setAttribute('value',left ? left + 'px' : '0');
			topSimplifier.setAttribute('value',top ? top + 'px' : '0');
		} else {
			marginSimplifier.setAttribute('left',left ? left + 'px' : '0');
			marginSimplifier.setAttribute('top',top ? top + 'px' : '0');
		}

		if (writeTimeoutID) clearTimeout(writeTimeoutID);
		writeTimeoutID = setTimeout(function() {
			writeTimeoutID = 0;
			ajaxart.runComponent('gstudio_drag.WriteLayoutAspectCssFromXml',[cssAsXml],context);
			aa_refresh_field(['gstudio_drag_properties'],'screen',false,null,context);					
		},10);

		if (isAbsolutePos) {
			elem.style.top = top + 'px';
			elem.style.left = left + 'px';
		} else {
			elem.style[propertyType+'Top'] = top + 'px';
			elem.style[propertyType+'Left'] = left + 'px';
		}
	}
	function updateDisplayFromPopup() {
		var left = (isAbsolutePos ? leftSimplifier.getAttribute('value') : marginSimplifier.getAttribute('left')) || '';
		var top = (isAbsolutePos ? topSimplifier.getAttribute('value') : marginSimplifier.getAttribute('top')) || '';

		if (left.match(/^[0-9]*$/)) {
			left += 'px';
			isAbsolutePos ? leftSimplifier.setAttribute('value',left) : marginSimplifier.setAttribute('left',left);
		}
		if (top.match(/^[0-9]*$/)) {
			top += 'px';
			isAbsolutePos ? topSimplifier.setAttribute('value',top) : marginSimplifier.setAttribute('top',top);
		}

		ajaxart.runComponent('gstudio_drag.WriteLayoutAspectCssFromXml',[cssAsXml],context);
		jBart.studiobar.object.Refresh([],context);
		refreshDragBox();
	}
	function dispose() {
		$('.jbstudio_drag_box').remove();
		$('.jbstudio_drag_box_cover').remove();

		var popups = aa_open_popups();
		for(var i=0;i<popups.length;i++)
			if (popups[i].identifier == 'lefttop_properties') popups[i].close();

		studio.Mode = '';
		ajaxart.runComponent('gstudio_drag.LeaveDragMode',[cssAsXml],context);
	}

	function showPropertySheet() {
		aa_run_component('gstudio_drag.OpenLeftTopDialog',[],aa_ctx(context,{ _GStudioDragObject: [dragObject] }),{
			LeftData: isAbsolutePos ? aa_xpath(leftSimplifier,'@value') : aa_xpath(marginSimplifier,'@left'),
			TopData: isAbsolutePos ? aa_xpath(topSimplifier,'@value') : aa_xpath(marginSimplifier,'@top'),
			AspectXml: [aspectXml] 
		});
	}

	function guessDragProperty(cssAsXml,elem) {
		var positions = aa_xpath(cssAsXml,"Css/Simplifiers/position");
		for (var i=0;i<positions.length;i++)
			if(positions[i].getAttribute('value') == 'absolute') 
				return aa_totext(aa_xpath(positions[i],'../../@selector')) + ' absolute';

		if (elem && elem.tagName == 'tr') return '#wrapper padding';
		return '#this margin';
	}
}

function aa_studio_bindToComponentXmlChange(xtml,context) {
	var compXtml = xtml.noedType == 1 ? xtml : aa_xpath(xtml,'..')[0];
	while(compXtml && compXtml.tagName != 'Component') compXtml = compXtml.parentNode;
	if (!compXtml) return;

	aa_unbindXmlChange(jBart.componentXmlChangeID);
	jBart.componentXmlChangeID = aa_bindXmlChange(compXtml,function() {
		aa_save_manager.MarkAsModified([compXtml],context);		
	});
}
