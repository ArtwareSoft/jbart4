ajaxart.load_plugin("field","plugins/field/slider.xtml");

aa_gcs("slider", {
	Unit: function (profile,data,context)
	{
		var unit = {
			symbol: aa_text(data,profile,'Symbol',context),
			min: parseFloat(aa_text(data,profile,'Min',context)),
			max: parseFloat(aa_text(data,profile,'Max',context)),
			initialPixelsPerUnit: parseFloat(aa_text(data,profile,'InitialPixelsPerUnit',context)),
			step: aa_float(data,profile,'Step',context),
			sliderText: function(value,field) {
				if (value == '' && field.AllowEmptyValue) 
					return field.TextForEmptyValue;
				return aa_text([value],profile,'SliderText',aa_ctx(context,{Symbol:[this.symbol]}));
			},
			valueToSave: function(numericVal,field) {
				if (numericVal === '' && field.AllowEmptyValue) 
					return '';
				return aa_text([numericVal],profile,'DataFormat',aa_ctx(context,{Symbol:[this.symbol]}));
			},
			numericPart: function(val,field) { 
				var parts = (''+val).match(/([^0-9\.\-]*)([0-9\.\-]+)([^0-9\.\-]*)/);
				var value = parts && parts[2];
				value = value || (field.AllowEmptyValue ? '' : '0');
				var v = parseFloat(value);
				if (!isNaN(v)) 
					value = '' + this.fixValue(v);
				return value;
			},
			fixValue: function(val) {
				var unit = this;
				if (!isNaN(unit.min)) val = Math.max(val,unit.min);
				if (!isNaN(unit.max)) val = Math.min(val,unit.max);
				val = Math.round(val/unit.step)*unit.step; 
				val = parseFloat(val.toFixed(3)+''.replace(/0+$/,''));
				return val;
			}
		}
		return [unit];
	},
	Slider: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.SliderStyle = aa_first(data,profile,'Style',context);
		field.AllowEmptyValue = aa_bool(data,profile,'AllowEmptyValue',context);
		field.TextForEmptyValue = aa_bool(data,profile,'TextForEmptyValue',context);
		aa_field_handler(field,'ModifyControl',function() {},'resizer'); // disable the resizer
		var units = ajaxart.run(data,profile,'Units',context);
		var unit = units[0];
		if (!unit) {
			var min = aa_text(data,profile,'Min',context);
			var xtml = aa_parsexml('<xtml t="slider.Unit" Min="' + min + '" />');
			unit = aa_first(data,xtml,'',context);
		}
		
		field.Control = function(field_data,ctx) {
			var field = this;
			var style = field.SliderStyle;
			var jSlider = jQuery(style.Html);
			var numericValue = unit.numericPart(ajaxart.totext_array(field_data),field);
			
			var slider = aa_api_object(jSlider,{
				initSizes: function() {
					var sliderWidth = parseInt(slider.width.split('px')[0] || '0' );
					slider.scaleWidth = jQuery(slider.jbScaleElem).width() || sliderWidth;
					slider.fromPixel = aa_absLeft(slider.jbScaleElem);
					slider.toPixel = slider.fromPixel + slider.scaleWidth;
					slider.center = Math.round(slider.fromPixel+ slider.scaleWidth/2);
					if (!isNaN(unit.min)) slider.from = unit.min;
					if (!isNaN(unit.max)) slider.to = unit.max;
					if (!isNaN(unit.initialPixelsPerUnit)) slider.ratio = slider.ratio || unit.initialPixelsPerUnit;
					if (!slider.ratio && slider.from != null && slider.to != null)
						slider.ratio = slider.scaleWidth/(slider.to - slider.from);
					if (!slider.ratio)
						slider.ratio = 1/unit.step;
					if (slider.from != null && slider.to != null)
						slider.range = slider.to - slider.from;
					else 
						slider.range = slider.scaleWidth / slider.ratio; 
	
					if (slider.from != null)
						slider.offset = slider.from * slider.ratio;
					slider.thumbWidth = Math.round(jQuery(slider.jbThumbElem).outerWidth()/2);
				},
				setValue: function(val,state) {
					numericValue = unit.numericPart(val,field);
					var value_to_save = unit.valueToSave(numericValue,field);

					if ( aa_totext(field_data) == value_to_save) return slider; // no change - so do not save & fire events
					ajaxart.writevalue(field_data,[value_to_save]);
					if (field.RefreshOn == 'every click' || state != 'slide')
						aa_invoke_field_handlers(field.OnUpdate,slider,{},field,field_data);

					return slider;
				},
				width: aa_text(data,profile,'Width',context),
				adjustScale: function() {
					var val = parseFloat(numericValue);
					var distanceFromSide = Math.min(val - slider.from, slider.to - val) * slider.ratio;
					if (distanceFromSide > 10) return slider; // far from sides, no need to adjust
					if (isNaN(val)) val = unit.fixValue(0);
					// put in the middle
					if (isNaN(unit.min))
						slider.from = (val - slider.range/2).toFixed(2);
					if (isNaN(unit.max))
						slider.to = (val + slider.range/2).toFixed(2);
					if (unit.min == 0 && isNaN(unit.max))
						slider.to = Math.max(slider.to,val+slider.range);
					slider.offset = slider.from * slider.ratio;
					slider.range = slider.to - slider.from;
					slider.ratio = slider.scaleWidth/slider.range;
					return slider;
				},
				pixelToUnits: function(x) { 
					return (x+slider.offset)/slider.ratio;
				},
				setThumbPosition: function() {
					var val = parseFloat(numericValue);
					if (isNaN(val)) val = unit.fixValue(0);
					if (!slider.ratio) return;
					if (val < slider.from || val > slider.to)
						return;
				  if (numericValue == '') 
				   	jSlider.addClass('empty_value') 
				  else 
				  	jSlider.removeClass('empty_value'); 
					var xPixels = Math.round(val * slider.ratio - slider.offset);
					xPixels = Math.max(xPixels,0);
					xPixels = Math.min(xPixels,slider.scaleWidth);
		      jQuery(slider.jbThumbElem).css('left', xPixels- slider.thumbWidth);
		      jQuery(slider.jbTextElem).html(unit.sliderText(numericValue,field));
				},
		        keyDown: function(e) {
		    		e = e || event;
		    		var str = String.fromCharCode(e.keyCode);
		    		if (e.keyCode == 189) str = "-";
		    		if (str.match(/[\-0-9]/)) {
		    			aa_first([slider],profile,'PopupEditor',aa_ctx(context,{Value:[str],Slider:[slider],ControlElement: [slider.jbThumbElem]}));
		    			return true;
		    		}
		    		if (e.keyCode == 46 && field.AllowEmptyValue) { // delete
		    			slider.setValue(field,'');
		    			slider.adjustScale(true);
		    		}
		    		if (str == '0') slider.setValue('0');
		    		//jBart.trigger(slider.jbThumbElem,'keydown',{code:e.keyCode, str: str});
		    		var val = parseFloat(numericValue);
		    		if (isNaN(val)) val = 0;
		    		if (e.keyCode == 37 || e.keyCode == 39) { // right/left
		    			if (e.keyCode == 39)
		    				val += unit.step * (e.shiftKey ? 10 : 1);
		    			else
		    				val -= unit.step * (e.shiftKey ? 10 : 1);
			            slider.setValue(val);
			            aa_stop_prop(e);
		    		}
		    		slider.setThumbPosition();
		    		return true;
		    	}
			});
			jQuery(slider).addClass(aa_attach_global_css(style.Css));
			aa_defineElemProperties(slider,'init'); 
			
			slider.init = function(scale,thumb,text) {
				var slider = this;
				slider.jbScaleElem = this.getInnerElement(scale);
				slider.jbTextElem = this.getInnerElement(text);
				jQuery(slider.jbTextElem).mousedown(function(){
					aa_first(data,profile,'PopupEditor',aa_ctx(context,{Value:[numericValue],Slider:[slider],ControlElement: [slider.jbThumbElem]}));
					return false;
				});
				slider.jbThumbElem = this.getInnerElement(thumb);
				slider.jbThumbElem.tabIndex = 1;
				jQuery(slider.jbScaleElem).css('width',aa_text(data,profile,'Width',context));
				jQuery(slider.jbThumbElem).bind('mousedown',dragBegin);
				jQuery(slider.jbThumbElem).bind('keydown',slider.keyDown);
			
				aa_addOnAttach(slider,function () {
					slider.initSizes();
					slider.adjustScale();
					slider.setThumbPosition();
				});

				function dragBegin(e) {            
		        	if (aa_incapture) return true;
		        	slider.initSizes(); 
		        	slider.adjustScale(); 
		        	slider.setThumbPosition();
		        	
		        	slider.jbStartDragTime = new Date().getTime();
		        	slider.jbSuspectClick = true;
		            document.onmousemove = function(e) { drag(e) }
		            document.onmouseup   = function(e) { slider.dragEnd(e) }
		            jQuery(slider.jbThumbElem).focus();
		            drag(e);
		            return false;
		        }
		        function drag(e) {
		        	if (slider.jbSuspectClick) {
		        		if (new Date().getTime() - slider.jbStartDragTime < 100) return;
		        		slider.jbSuspectClick = false;
		        	}
					slider.fromPixel = aa_absLeft(slider.jbScaleElem);
		            var pos = aa_mousePos(e);
		            pos.x = Math.max(pos.x,slider.fromPixel);
		            pos.x = Math.min(pos.x,slider.toPixel);
		            var xPixels = pos.x - slider.fromPixel;
		            slider.setValue(slider.pixelToUnits(xPixels)).setThumbPosition();
		         }
		         slider.dragEnd = function(e) {
		            document.onmouseup = null;
		            document.onmousemove = null;
		        	if (!slider.jbSuspectClick) {
		        		slider.setValue(numericValue);
		        		slider.adjustScale().setThumbPosition();
		        	}
		        	slider.jbSuspectClick = false;
		            jQuery(slider.jbThumbElem).focus();
		         }
			}
			aa_apply_style_js(slider,field.SliderStyle);
			return jSlider.get();
		}
	}	
});


function aa_jbart_slider(editableNumber, settings) {
	var unit = editableNumber.format;
	unit.field = editableNumber.field; 
	if (!unit) {
		ajaxart.log('slider - no units defined for slider');
		return;
	}

	var numericValue = '' + (editableNumber.value && unit.parse(''+editableNumber.value));
	var slider = editableNumber.slider = {
		scaleElem: settings.scaleElement,
		textElem: settings.textElement,
		thumbElem: settings.thumbElement,
		inputElem: settings.inputElement,
	    init: function() {
			var slider = this;
			slider.thumbElem.tabIndex = 1;
			jQuery(slider.scaleElem).css('width',slider.width);
			if (!(editableNumber.field.IsDisabled && editableNumber.field.IsDisabled())) {
				jQuery(slider.thumbElem).bind('mousedown',dragBegin);
				jQuery(slider.thumbElem).bind('keydown',slider.keyDown);
				jQuery(slider.inputElem).bind('keydown',slider.inputKeyDown).bind('blur',slider.setInputValue).hide();
				jQuery(slider.textElem).bind('mousedown',function(){
					jQuery(slider.inputElem).show().focus();return false;
				});
			} else {
			  var disableText = (editableNumber.field.DisableText && editableNumber.field.DisableText()) || '';
			  jQuery(slider.thumbElem).attr('title',disableText).addClass('aa_disabled');
			  jQuery(slider.textElem).attr('title',disableText).addClass('aa_disabled');
			  jQuery(slider.scaleElem).attr('title',disableText).addClass('aa_disabled');
			  jQuery(slider.inputElem).hide();
			  ajaxart_disableSelection(slider.scaleElem);
			}
		
			aa_addOnAttach(settings.$el[0],function () {
				slider.initSizes();
				slider.adjustScale();
				slider.setThumbPosition();
			});

			function dragBegin(e) {            
	        	if (aa_incapture) return true;
	        	slider.initSizes(); 
	        	slider.adjustScale(); 
	        	slider.setThumbPosition();
	        	
	        	slider.startDragTime = new Date().getTime();
	        	slider.suspectClick = true;
	            document.onmousemove = function(e) { drag(e) }
	            document.onmouseup   = function(e) { slider.dragEnd(e) }
	            jQuery(slider.thumbElem).focus();
	            drag(e);
	            return false;
	        }
	        function drag(e) {
	        	if (slider.suspectClick) {
	        		if (new Date().getTime() - slider.startDragTime < 100) return;
	        		slider.suspectClick = false;
	        	}
				slider.fromPixel = aa_absLeft(slider.scaleElem);
	            var pos = aa_mousePos(e);
	            pos.x = Math.max(pos.x,slider.fromPixel);
	            pos.x = Math.min(pos.x,slider.toPixel);
	            var xPixels = pos.x - slider.fromPixel;
	            slider.setValue(slider.pixelToUnits(xPixels)).setThumbPosition();
	         }
	         slider.dragEnd = function(e) {
	            document.onmouseup = null;
	            document.onmousemove = null;
	        	if (!slider.suspectClick) {
	        		slider.setValue(numericValue);
	        		slider.adjustScale().setThumbPosition();
	        	}
	        	slider.suspectClick = false;
	            jQuery(slider.thumbElem).focus();
	         }
        },
		initSizes: function() {
			slider.scaleWidth = jQuery(slider.scaleElem).width();
			slider.fromPixel = aa_absLeft(slider.scaleElem);
			slider.toPixel = slider.fromPixel + slider.scaleWidth;
			slider.center = Math.round(slider.fromPixel+ slider.scaleWidth/2);
			if (!isNaN(unit.min)) slider.from = unit.min;
			if (!isNaN(unit.max)) slider.to = unit.max;
			if (!isNaN(unit.initialPixelsPerUnit)) slider.ratio = slider.ratio || unit.initialPixelsPerUnit;
			if (!slider.ratio && !isNaN(slider.from) && !isNaN(slider.to))
				slider.ratio = slider.scaleWidth/(slider.to - slider.from);
			if (!slider.ratio)
				slider.ratio = 1/unit.step;
			if (!isNaN(slider.from) && !isNaN(slider.to))
				slider.range = slider.to - slider.from;
			else 
				slider.range = slider.scaleWidth / slider.ratio; 

			if (slider.from != null)
				slider.offset = slider.from * slider.ratio;
			slider.thumbWidth = Math.round(jQuery(slider.thumbElem).outerWidth()/2);
		},
		setValue: function(val,state) {
			var fix1 = applyRangeAndResolution(unit,val);
			numericValue = isNaN(fix1) ? '' : '' + fix1;
			var value_to_save = unit.getDataString(fix1);
			editableNumber.setValue(value_to_save);

			return slider;
		},
		adjustScale: function() {
			var val = parseFloat(numericValue);
			var distanceFromSide = Math.min(val - slider.from, slider.to - val) * slider.ratio;
			if (distanceFromSide > 10) return slider; // far from sides, no need to adjust
			if (isNaN(val)) val = applyRangeAndResolution(unit,0) || 0;
			// put in the middle
			if (isNaN(unit.min))
				slider.from = applyRangeAndResolution(unit,val - slider.range/2);
			if (isNaN(unit.max))
				slider.to = applyRangeAndResolution(unit,val + slider.range/2);
			if (unit.min == 0 && isNaN(unit.max))
				slider.to = Math.max(slider.to,val+slider.range);
			slider.offset = slider.from * slider.ratio;
			if (!isNaN(slider.from) && !isNaN(slider.to))
				slider.range = slider.to - slider.from;
			if (!isNaN(slider.range))
				slider.ratio = slider.scaleWidth/slider.range;
			return slider;
		},
		pixelToUnits: function(x) { 
			return (x+slider.offset)/slider.ratio;
		},
		setThumbPosition: function() {
			var val = parseFloat(numericValue);
			if (isNaN(val)) val = applyRangeAndResolution(unit,0) || 0;
			if (!slider.ratio) return;
			if (val < slider.from || val > slider.to)
				return;
	    if (numericValue == '') 
	    	settings.$el.addClass('empty_value'); 
    	else 
		   	settings.$el.removeClass('empty_value'); 
			var xPixels = Math.round(val * slider.ratio - slider.offset);
			xPixels = Math.max(xPixels,0);
			xPixels = Math.min(xPixels,slider.scaleWidth);
      jQuery(slider.thumbElem).css('left', xPixels- slider.thumbWidth);
      jQuery(slider.textElem).text(unit.getDisplayString(parseFloat(numericValue)));
		},
    keyDown: function(e) {
    		e = e || event;
    		var str = String.fromCharCode(e.keyCode);
    		if (e.keyCode == 189) str = "-";
    		if (str.match(/[\-0-9]/)) {
    			jQuery(slider.inputElem).show().focus();
    			return true;
    		}
    		if (e.keyCode == 46) { // delete
    			slider.setValue('');
    			slider.adjustScale(true).setThumbPosition();
    		}
    		if (str == '0') slider.setValue('0');
    		//jBart.trigger(slider.jbThumbElem,'keydown',{code:e.keyCode, str: str});
    		var val = parseFloat(numericValue);
    		if (isNaN(val)) val = 0;
    		if (e.keyCode == 37 || e.keyCode == 39) { // right/left
    			if (e.keyCode == 39)
    				val += unit.step * (e.shiftKey ? 10 : 1);
    			else
    				val -= unit.step * (e.shiftKey ? 10 : 1);
	            slider.setValue(val);
	            aa_stop_prop(e);
    		}
    		slider.setThumbPosition();
    		return true;
    	},
    	setInputValue: function() {
        	slider.setValue(slider.inputElem.value);
        	slider.adjustScale();
   			slider.setThumbPosition();
   			jQuery(slider.inputElem).hide();
    	},
    	inputKeyDown: function(e) {
    		e = e || event;
    		if (e.keyCode == 13) // enter
	        	slider.setInputValue();
    		return true;
    	}

	}
	slider.init();

	function applyRangeAndResolution(unit,val) {
		if (isNaN(val) || val === '') return NaN;
		if (!isNaN(unit.min)) val = Math.max(val,unit.min);
		if (!isNaN(unit.max)) val = Math.min(val,unit.max);
		val = Math.round(val/unit.step)*unit.step; 
		val = parseFloat(val.toFixed(3)+''.replace(/0+$/,''));
		return val;		
	}
}
