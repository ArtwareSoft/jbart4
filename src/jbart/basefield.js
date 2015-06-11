ajaxart.load_plugin("", "plugins/jbart/basefield.xtml");
ajaxart.load_plugin("", "plugins/jbart/basefield_styles.xtml");

aa_gcs("fld", {
	Field: function(profile, data, context) {
		var field = {
			Id: aa_text(data, profile, 'ID', context),
			Title: aa_multilang_text(data, profile, 'Title', context),
			FieldData: function(data1, ctx) {
				var out = ajaxart.run(data1, profile, 'FieldData', aa_ctx(context, ctx));
				if (this.ForceCData && out[0] && out[0].nodeType == 1) {
					var currentValue = aa_totext(out);
					for (var iter = out[0].firstChild; iter; iter = iter.nextSibling) {
						if (iter.nodeType == 4) return out; // we already have cdata. nothing to change
					}

					while (out[0].firstChild) out[0].removeChild(out[0].firstChild); // empty
					out[0].appendChild(out[0].ownerDocument.createCDATASection(currentValue)); // add cdata
				}

				if (field.HasDefaultValue)
					aa_trigger(field, 'FieldData', { Item: data1,	FieldData: out,	Context: ctx });

				return out;
			},
			Control: function() {
				return [document.createElement('div')];
			}
		};
		field.ID = [field.Id]; // backward compatibility

		var ctx2 = aa_ctx(context, {
			_Field: [field]
		});
		ajaxart.run(data, profile, 'FieldType', ctx2);
		ajaxart.runsubprofiles(data, profile, 'FieldAspect', ctx2);

		return [field];
	},
	CalculatedField: function(profile, data, context) {
		var hidden = !aa_bool(data, profile, 'Visible', context);

		var field = {
			Id: aa_text(data, profile, 'ID', context),
			Title: aa_multilang_text(data, profile, 'Title', context),
			FieldData: function(data1, ctx) {
				return ajaxart.run(data1, profile, 'FieldData', aa_ctx(context, ctx));
			},
			WorkOn: aa_text(data, profile, 'WorkOn', context),
			Calculate: function(parentData, ctx) {
				if (this.WorkOn == 'items in itemlist') {
					var itemlistCntr = ctx.vars.ItemListCntr && ctx.vars.ItemListCntr[0];
					var items = itemlistCntr && itemlistCntr.Items;
					if (items) {
						for (var i = 0; i < items.length; i++) {
							var item = [items[i]];
							var to = this.FieldData(item, ctx);
							var value = ajaxart.run(item, profile, 'Value', aa_ctx(context, ctx));
							ajaxart.writevalue(to, value);
						}
					}
				} else {
					// single data
					var to = this.FieldData(parentData, ctx);
					var value = ajaxart.run(parentData, profile, 'Value', aa_ctx(context, ctx));
					ajaxart.writevalue(to, value);
				}
			},
			Control: function(field_data, ctx) {
				var text = aa_totext(field_data);
				return $('<div/>').text(text).attr('title', text).get();
			},
			CalculatedOnly: true,
			IsFieldHidden: function() {
				return hidden;
			},
			IsHidden: hidden
		};
		field.ID = [field.Id]; // backward compatability

		var ctx2 = aa_ctx(context, {
			_Field: [field]
		});
		ajaxart.runsubprofiles(data, profile, 'FieldAspect', ctx2);

		return [field];
	}
});

aa_gcs("fld_type", {
	Text: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);

		field.Control = function(field_data, ctx) {
			var text = aa_totext(field_data);
			if (field.Text) text = aa_totext(field.Text(field_data,ctx));
			var out = aa_renderStyleObject(field.Style, {
				text: text,
				data: field_data[0]
			}, ctx);
			$(out).addClass('aa_field_text');
			return [out];
		};
	},
	EditableText: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);
		field.HandleDescriptionForEmptyText = function(desctiptionForEmptyText) {
			field.DescriptionForEmptyText = desctiptionForEmptyText;
		};

		aa_init_class_EditableText();

		field.Control = function(field_data, ctx) {
			var placeholder = field.DescriptionForEmptyText || '';

			var textApiObject = new ajaxart.classes.EditableText({
				placeholder: placeholder,
				field: field,
				data: field_data,
				profile: profile,
				context: ctx,
				field_data: field_data
			});
			textApiObject.value = textApiObject.totext();
			return [aa_renderStyleObject(field.Style, textApiObject, ctx, true)];
		}
	},
	EditableColor: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);
		field.HandleDescriptionForEmptyText = function(desctiptionForEmptyText) {
			field.DescriptionForEmptyText = desctiptionForEmptyText;
		}
		aa_init_class_EditableText();

		field.Control = function(field_data, ctx) {
			var placeholder = field.DescriptionForEmptyText || '';

			var textApiObject = new ajaxart.classes.EditableText({
				placeholder: placeholder,
				field: field,
				data: field_data,
				profile: profile,
				context: ctx
			});
			textApiObject.value = textApiObject.totext();
			return [aa_renderStyleObject(field.Style, textApiObject, ctx, true)];
		};
	},
	EditableDate: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);
		field.HandleDescriptionForEmptyText = function(desctiptionForEmptyText) {
			field.DescriptionForEmptyText = desctiptionForEmptyText;
		};
		aa_init_class_EditableText();

		field.Control = function(field_data, ctx) {
			ctx = aa_merge_ctx(context,ctx);
			var placeholder = field.DescriptionForEmptyText || '';

			var apiObject = new ajaxart.classes.EditableText({
				placeholder: placeholder,
				field: field,
				data: field_data,
				profile: profile,
				context: ctx,
				storageFormat: aa_text(data,profile,'StorageFormat',ctx),
				displayFormat: aa_text(data,profile,'DisplayFormat',ctx),
				minDate: aa_text(data,profile,'Min',ctx),
				maxDate: aa_text(data,profile,'Max',ctx)
			});
			textApiObject.value = textApiObject.totext();
			return [aa_renderStyleObject2(field.Style, apiObject, field_data,field,ctx)];
		};
	},
	Image: function(profile, data, context) // GC of fld_type.Image
	{
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);
		field.Control = function(field_data, ctx) {
			var image = aa_first(field_data, profile, 'Image', context);
			if (image && image.Url) {
				image.StaticUrl = aa_totext(image.Url(field_data, context));
			}
			image.StaticUrl = image.StaticUrl || aa_text(data, profile, 'DefaultImage', context);

			var image2 = aa_create_static_image_object(image);

			var out = aa_renderStyleObject(field.Style, {
				Field: field,
				image: image2,
				data: field_data[0]
			}, ctx, true);
			return [out];
		}
	},
	EditableImage: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);

		aa_init_class_EditableImage();
		
		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context, ctx);
			var image = aa_first(field_data, profile, 'Image', ctx2);
			if (image && image.Url) image.StaticUrl = aa_totext(image.Url(field_data, ctx2));

			var staticImage = aa_create_static_image_object(image);

			var imageWidth = aa_first(field_data, profile, 'OriginalWidth', ctx2);
			var imageHeight = aa_first(field_data, profile, 'OriginalHeight', ctx2);
			var imageWidthInt = parseInt(aa_totext([imageWidth]));
			var imageHeightInt = parseInt(aa_totext([imageWidth]));

			var editableImage = new ajaxart.classes.EditableImage({
				field: field,
				image: staticImage,
				field_data: field_data,
				Field: field,
				data: field_data[0],
				value: staticImage.url,
				placeholder: field.DescriptionForEmptyText || '',
				imageWidthData: imageWidth ? [imageWidth] : [],
				imageHeightData: imageHeight ? [imageHeight] : [],
				imageWidth: imageWidthInt,
				imageHeight: imageHeightInt
			});
			return [aa_renderStyleObject(field.Style, editableImage, ctx2, true)];
		};
	},
	Boolean: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);

		if (aa_bool(data, profile, 'HidePropertySheetTitle', context)) field.HidePropertyTitle = field.HideTitle = true;

		field.Control = function(field_data, ctx) {
			ctx = aa_merge_ctx(context, ctx);
			var boolObj = {
				textForTrue: aa_multilang_text(data, profile, 'TextForTrue', context),
				textForFalse: aa_multilang_text(data, profile, 'TextForFalse', context),
				isTrue: aa_totext(field_data) == aa_text(data, profile, 'CodeForTrue', context)
			};

			return [aa_renderStyleObject2(field.Style,boolObj,field_data,field,ctx,{})];
		}
	},
	EditableBoolean: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);

		if (aa_bool(data, profile, 'HidePropertySheetTitle', context)) field.HidePropertyTitle = field.HideTitle = true;

		field.Control = function(field_data, ctx) {
			var picklist = {};
			aa_initPicklistObject(picklist, field, field_data, ctx);
			var image = aa_first(field_data, profile, 'Image', context);
			if (image && image.Url) image.StaticUrl = aa_totext(image.Url(field_data, context));

			return [aa_renderStyleObject(field.Style, {
				Field: field,
				field: field,
				textForTrue: aa_multilang_text(data, profile, 'TextForTrue', context),
				textForFalse: aa_multilang_text(data, profile, 'TextForFalse', context),
				codeForTrue: aa_text(data, profile, 'CodeForTrue', context),
				codeForFalse: aa_text(data, profile, 'CodeForFalse', context),
				getTextValue: function() {
					var text = aa_totext(field_data);
					return this.isChecked() ? this.textForTrue : this.textForFalse;
				},
				image: image,
				data: field_data[0],
				field_data: field_data,
				isChecked: function() {
					var text = aa_totext(field_data);
					return text == this.codeForTrue;
				},
				setValue: function(newval) {
					var newcode = newval ? this.codeForTrue : this.codeForFalse;

					ajaxart.writevalue(field_data, newcode);
					var content = this.control;
					aa_invoke_field_handlers(field.OnUpdate, content, null, field, field_data, {});
					jBart.trigger(field, 'update', {
						FieldData: field_data,
						wrapper: content.parentNode
					});
				}
			}, ctx, true)];
		}

	},
	Lookup: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.Options = ajaxart.run(data, profile, 'Options', context);
		field.Style = aa_first(data, profile, 'Style', context);
		field.Control = function(field_data, ctx) {
			var code = aa_totext(field_data);
			var option = aa_picklist_optionByCode(field.Options, code) || {
				code: code,
				text: code
			};

			return [aa_renderStyleObject(field.Style, {
				Field: field,
				image: option.image || '',
				data: field_data[0],
				text: option.text || '',
				isEmpty: option != null
			}, context)];
		};
	}
});

function aa_native_checkbox(checkbox, settings) {
	if (settings.TextElement) {
		settings.TextElement.innerHTML = checkbox.Field.Title;
		settings.TextElement.onclick = function() {
			if (window.aa_incapture) return;
			settings.InputElement.checked = !settings.InputElement.checked;
			checkbox.setValue(settings.InputElement.checked);
			refresh();
		}
	}
	settings.InputElement.onchange = function() {
		checkbox.setValue(settings.InputElement.checked);
		refresh();
	};
	refresh();

	function refresh() {
		settings.InputElement.checked = checkbox.isChecked();
	}

	aa_bind(checkbox, 'refreshUI', refresh);
}

function aa_div_checkbox(checkbox, settings) {
	settings = aa_defaults(settings,{
		textElement: checkbox.$el.firstOfClass('aa_checkbox_text'),
		clickableElement: checkbox.$el
	});
	$(settings.textElement).html( checkbox.Field.Title );
	$(settings.clickableElement).click(function() {
		$(settings.divCheckboxElement).toggleClass('checked');
		checkbox.setValue(checkbox.isChecked() ? false : true);
		refresh();
	});
	refresh();

	function refresh() {
		if (checkbox.isChecked()) 
			$(settings.clickableElement).addClass('checked');
		else
			$(settings.clickableElement).removeClass('checked');
	}

	aa_bind(checkbox, 'refreshUI', refresh);
}

function aa_native_boolean_radios(checkbox, settings) {
	settings = aa_defaults(settings, {
		TrueInputElement: checkbox.$el.find('.radio_true>input'),
		TrueTextElement: checkbox.$el.find('>.radio_true>div')[0],
		FalseInputElement: checkbox.$el.find('>.radio_false>input')[0],
		FalseTextElement: checkbox.$el.find('>.radio_false>div')[0]
	});

	aa_global_vars().uniqueRadioCounter = aa_global_vars().uniqueRadioCounter || 0;
	var radioGroup = 'aaradio' + ++aa_global_vars().uniqueRadioCounter;
	$(settings.TrueInputElement).attr("name", radioGroup);
	$(settings.FalseInputElement).attr("name", radioGroup);

	$(settings.TrueTextElement).text(checkbox.textForTrue).click(function() {
		$(settings.TrueInputElement).click();
	});

	$(settings.FalseTextElement).text(checkbox.textForFalse).click(function() {
		$(settings.FalseInputElement).click();
	});

	$(settings.TrueInputElement).click(function() {
		checkbox.setValue(true);
	});
	$(settings.FalseInputElement).click(function() {
		checkbox.setValue(false);
	});
	if (settings.PutFalseValueBeforeTrue) checkbox.$el.find('>.radio_true').before(checkbox.$el.find('>.radio_false'));

	var radioToCheck = checkbox.isChecked() ? settings.TrueInputElement : settings.FalseInputElement;
	$(radioToCheck).attr('checked', 'checked');

	function radioClicked() {
		var val = $(settings.TrueInputElement)[0].checked ? true : false;

	}
}

function aa_init_class_EditableText() {
	aa_init_class('EditableText', {
		_ctor: function() {
			this.InputValueMask = this.field && this.field.InputValueMask;
		},
		totext: function() {
			if (this.field.TextDataToInputValue)
				return aa_totext(this.field.TextDataToInputValue(this.data,this.context));

			return aa_totext(this.data);
		},
		setValue: function(newvalue, settings) {
			settings = settings || {};
			if (this.totext() == newvalue && !settings.forceUpdate) return;
			if (this.field.TextInputValueToData)
				newvalue = aa_totext(this.field.TextInputValueToData([newvalue],this.context));

			ajaxart.writevalue(this.data, [newvalue]);
			var field = this.field;
			aa_invoke_field_handlers(field.OnUpdate, this.el, null, field, this.data, {});
		},
		initInputElement: function(textbox, input) {
			var field = this.field,
				field_data = this.data,
				context = this.context,
				that = this;
			input.jbApiObject = textbox;

			$(input).focus(function(e) {
				e = e || event;
				// select all on next timer
				ajaxart.controlOfFocus = this;
				aa_invoke_field_handlers(field.OnFocus, input, e, field, field_data);
				for (var parent = input.parentNode; parent; parent = parent.parentNode) if (parent.onfocus) parent.onfocus(e); // for HoverOnPopup 
				return true;
			}).blur(function(e) {
				e = e || event;
				for (var parent = input.parentNode; parent; parent = parent.parentNode) if (parent.onblur) parent.onblur(e); // for HoverOnPopup 
//				ajaxart_field_RefreshDependentFields(field, input, context);
				aa_invoke_field_handlers(field.OnBlur, input, e, field, field_data);
				if (field.Validations) aa_handleValidations(field, input, field_data, context, "on blur");
				return true;
			}).keydown(function(e) {
				e = e || event;

				if (field.KeyPressValidator && e.keyCode != 8) // backspace is fine 
				{
					var ch = String.fromCharCode(e.keyCode);
					if (!field.KeyPressValidator.test(ch)) return aa_stop_prop(e);
				}
				aa_invoke_field_handlers(field.OnKeydown, this, e, field, field_data);

				if (window.aa_intest && e.CharByChar) input.value += String.fromCharCode(e.keyCode);

				return true;
			}).mousedown(function(e) {
				e = e || event;
				aa_invoke_field_handlers(field.OnMouseDown, this, e, field, field_data);
				return true;
			}).mouseup(function(e) {
				e = e || event;
				aa_invoke_field_handlers(field.OnMouseUp, this, e, field, field_data);
				return true;
			});
			input.Blur = function() {
				$(this).blur();
			}
			input.Refresh = function() {
				if (input.RefreshDescriptionForEmptyText) input.RefreshDescriptionForEmptyText();
				if (input.jbApiObject) aa_trigger(input.jbApiObject, 'refresh');
			}
			input.setAttribute('value', textbox.value); /* for automatic tests on all browsers */
		},
		onkeyup: function(e, input) {
			var field = this.field;
			var keyCode = e.keyCode;
			if (keyCode == undefined && !aa_intest && !aa_inuiaction) return; // a mouse click !!!
			aa_invoke_field_handlers(field.OnKeyup, input, e, field, this.data, {
				KeyCode: ['' + keyCode],
				CtrlKey: aa_frombool(e.ctrlKey)
			});
			var codes = [9, 13, 16, 17, 18, 27, 63277, 63276]; // controls and navigation are masked
			for (var i = 0; i < codes.length; i++)
			if (keyCode == codes[i]) return true;

			if (field.KeyPressValidator && keyCode != 8) // backspace is masked 
			{
				var ch = String.fromCharCode(keyCode);
				if (!field.KeyPressValidator.test(ch)) return aa_stop_prop(e);
			}
		}
	});
}

function aa_init_class_EditableNumber() {
	if (!ajaxart.classes.EditableNumber) {
		aa_init_class('EditableNumber', {});
		if (!ajaxart.classes.EditableText) aa_init_class_EditableText();
		ajaxart.classes.EditableNumber.prototype = new ajaxart.classes.EditableText; // inheritance
	}
}

function aa_jbart_clickable_text(textbox, settings) {
	var input = $(settings.InputElement), text = $(settings.TextElement);

	text.click(function() {
		textbox.el.jbIsInput = true;
		refresh();
	});
    input.keyup(function(ev) {
      if (ev.keyCode == 13)  return updateInputAndRefresh(); 
    });
	input.blur(updateInputAndRefresh);
	
	refresh();
  
	function refresh() {
		if (!textbox.el.jbIsInput) {
			input.hide();
			text.show().text(textbox.value || textbox.placeholder);
		} else {
			if (input[0].jbOnBeforeShow) input[0].jbOnBeforeShow();
			text.hide();
			input.show().val(textbox.value).focus();
		}
	}
	function updateInputAndRefresh() {
		if (textbox.value != input.val()) {
			textbox.value = input.val();
			textbox.setValue(input.val());
		}
		textbox.el.jbIsInput = false;
		refresh();
    }
}

function aa_jbart_textbox(textbox, settings) {
	settings = aa_defaults(settings,{
		inputElement: textbox.el,
		autoRTLForHebrewContent: false
	});

	/* 	
	Initializes a textbox (input/textarea) to support change events etc. 
	A textarea can also be passed as inputElement.
*/
	var userAgent = navigator.userAgent.toLowerCase();
	var placeholderNativeSupport = (/chrome/.test(userAgent) || /firefox/.test(userAgent) || /safari/.test(userAgent));
	placeholderNativeSupport = false; // always disable it
	var isIE7orIE8 = /msie 7/.test(userAgent) || /msie 8/.test(userAgent);
	var updateOn = textbox.field.UpdateOn || 'EveryClick';

	var input = $(settings.inputElement)[0];
	var inputValueMask = textbox.InputValueMask || settings.InputValueMask;	

	if (textbox.initInputElement) textbox.initInputElement(textbox, input); /* Allows custom initialization of the input element (e.g. adding placeholders) */

	function getInputValue() {
		var val = input.value;
		if (textbox.placeholder && $(input).hasClass('placeholder')) return '';
		if (inputValueMask) {
			var newval = inputValueMask(val);
			if (newval != val) {
				input.value = newval;
				val = newval;
			}
		}
		var args = { val: val };
		aa_trigger(textbox.field,'inputMask',args);

		if (args.val != val) {
			input.value = args.val;
			val = args.val;
		}
		
		return val;
	}

	function valueChanged() {
		var inputValue = getInputValue();
		if (textbox.value != inputValue) {
			textbox.value = inputValue;
			if (textbox.setValue) textbox.setValue(textbox.value);
		}
	}
	// oninput is for mouse context menu of cut,paste
	input.oninput = function(e) {
		if (updateOn == 'EveryClick') valueChanged();
	};
	// support paste,cut for IE8,IE7
	if (isIE7orIE8 && updateOn == 'EveryClick') {
		$(input).bind('cut paste', null, function(e) {
			setTimeout(function() {
				valueChanged();
			}, 50);
		});
	}
	input.onkeyup = function(e) {
		$(input).removeClass('placeholder');
		if (textbox.onkeyup) textbox.onkeyup(e || event, input);
		if (updateOn == 'EveryClick') valueChanged();
		return true;
	};
	if (textbox.placeholder && placeholderNativeSupport) $(input).attr('placeholder', textbox.placeholder);

	input.value = textbox.value;

	if (!placeholderNativeSupport) {
		input.onfocus = function(e) {
			if ($(input).hasClass('placeholder')) {
				$(input).removeClass('placeholder');
				input.value = '';
			}
		};
		input.onblur = function() {
			if (textbox.placeholder && input.value == '') {
				input.value = textbox.placeholder;
				$(input).addClass('placeholder');
			}
		};
		input.onblur();
	}

	if (updateOn == 'Blur') {
		$(input).blur(valueChanged);
	}

	if (settings.autoRTLForHebrewContent && textbox.value) {
		var firstCharCode = textbox.value.trim().charCodeAt(0);
		if (firstCharCode >= 1488 && firstCharCode <= 1514)	// hebrew text (between × to ×ª)
			$(input).css("direction","rtl");
	}
}

function aa_init_jscolor(textbox, settings) {
	/* uses jscolor for editable color (http://jscolor.com) */
	var input = settings.InputElement;
	// var baseUrl = settings.BaseUrl || aa_base_lib() + '/jscolor/';
	if (!window.jscolor)
		console.error('jscolor lib is not loaded: http://jscolor.com/');

	var jsColorSettings = {
		styleElement: settings.StyleElement || settings.InputElement,
		pickerClosable: settings.PickerClosable ? true : false,
		required: false,
		hash: true,
		onImmediateChange: function() { onChange(this.toString(),true);	}
	};
	var myPicker = new jscolor.color(input, jsColorSettings);
	$(settings.ClickElement).click(function() {
		myPicker.showPicker();
	});
	$(settings.InputElement).keyup(function(event) {
	  	if ( event.which == 13 ) {
		  	myPicker.hidePicker();
		  	if (!this.value) {
			  	this.style.backgroundColor = '';
			  	setTimeout(function() { settings.InputElement.focus(); }, 1);
		  	}
		 	onChange(this.value,false);
		}
	}).click(function() {
		myPicker.showPicker();
	} );
	function onChange(value,fromColorPicker) {
		var color = value || '';
		if (fromColorPicker && value && value.charAt(0) != '#') color = '#' + value;

		if (textbox.value != color) {
			textbox.value = color;
			if (textbox.setValue) textbox.setValue(textbox.value);
		}
	}
}

function aa_jquery_date_picker(dateObj, settings) {
	settings = aa_defaults(settings, {
		InputElement: dateObj.el
	});
	var input = $(settings.InputElement)[0];
	var baseUrl = settings.BaseUrl || aa_base_lib() + '/datepicker-1.11/';

	var cssList = [ baseUrl + 'jquery-ui.css' ];
	var jsList = [ baseUrl + 'jquery-ui.js' ];
	if ($.datepicker) return init();

	aa_loadLib("jquerydatepicker", cssList , jsList).done(init);

	function init() {
		if (!ajaxart.isattached(dateObj.el))
			return aa_addOnAttach(dateObj.el,init);

		var params = {
			dateFormat: dateObj.displayFormat,
			onSelect: function(value) {
				var storageVal = displayToStorage(value);
				if (dateObj.setValue) dateObj.setValue(storageVal);
				dateObj.value = storageVal;
//				$(input)[0].value = 'abc';
			},
			beforeShow: function(value) {
//				$(input).datepicker("setDate",storageToDisplay(dateObj.value));
			}
		};
		try {
			if (dateObj.minDate) params.minDate = $.datepicker.parseDate(dateObj.storageFormat, dateObj.minDate);
			if (dateObj.maxDate) params.maxDate = $.datepicker.parseDate(dateObj.storageFormat, dateObj.maxDate);
		} catch(e) { ajaxart.logException('error in date picker',e);}

		$(input).datepicker(params);
		try {
			if (dateObj.value) $(input).datepicker("setDate",storageToDisplay(dateObj.value));
		} catch(e) { ajaxart.logException('error in date picker',e);}

		if ($(settings.OpenByClickElement)[0]) {
			$(settings.OpenByClickElement).click(function() {
				$(input).datepicker( "show" );
			});
		}

		aa_addOnDetach(input,function() {
			$(input).datepicker("destroy");
		});
	}

	function displayToStorage(displayVal) {
		var date = $.datepicker.parseDate(dateObj.displayFormat, displayVal );
		return $.datepicker.formatDate(dateObj.storageFormat, date );
	}
	function storageToDisplay(storageVal) {
		var date = $.datepicker.parseDate(dateObj.storageFormat, storageVal);
		return $.datepicker.formatDate(dateObj.displayFormat, date );
	}
}

function aa_init_jscolor_with_transparent_checkbox(textbox, settings) {
	if (settings.CheckboxElement) {
		textbox.setValueoriginal = textbox.setValue;
		if (!textbox.value) settings.CheckboxElement.checked = true;
		textbox.setValue = function(value) {
			textbox.setValueoriginal(value);
			settings.CheckboxElement.checked = false;
		}
		settings.CheckboxElement.onchange = function() {
			textbox.setValueoriginal("");
			$(settings.StyleElement || settings.InputElement).css("background", "white");
		}
	}
	aa_init_jscolor(textbox, settings);
}



//******************* Star Rating ************************/

aa_gcs("rating",{
	Rating: function(profile,data,context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);

		field.Control = function(field_data, ctx) {
			ctx = aa_merge_ctx(context,ctx);
			var rating = {
				value: aa_totext(field_data),
				setValue: function(newval) {
					this.value = newval;
					ajaxart.writevalue(field_data, newval);
					aa_invoke_field_handlers(field.OnUpdate, this.el, null, field, field_data, {});
				}
			};
			return [aa_renderStyleObject2(field.Style,rating,field_data,field,ctx,{})];
		};		
	}
});

function aa_rating_stars(rating,settings) {
	settings = aa_defaults(settings,{
		starElement: rating.$el.firstOfClass('star')
	});

	var stars = [];
	for(var i=0;i<5;i++) {
		var starElem = $(settings.starElement).clone().insertAfter(stars[stars.length-1] || settings.starElement);
		stars.push(starElem[0]);
		starElem[0].jbRatingIndex = i;
	}
	$(settings.starElement).remove();

	$(stars).hover(function() {
		var index = this.jbRatingIndex;
		$(stars).removeClass('full').removeClass('hover');
		$(stars.slice(0,index+1)).addClass('hover');
	});
	$(stars).click(function() {
		var index = this.jbRatingIndex+1;
		rating.setValue(''+index);
		refresh();
	});
	rating.$el.mouseout(refresh);

	refresh();

	function refresh() {
		$(stars).removeClass('full').removeClass('hover');
		var val = parseInt(rating.value || 0);
		$(stars.slice(0,val)).addClass('full');
	}
}

/************** boolean *******************/
function aa_booleanStyle(boolObj) {
	var text = boolObj.isTrue ? boolObj.textForTrue : boolObj.textForFalse;
	boolObj.$el.text(text);
}