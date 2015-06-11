aa_gcs("fld_type",{
	Picklist: function (profile,data,context)
	{
		var field = context.vars._Field[0];

		field.RefreshOptions = function(data1,ctx) {
			field.Options = ajaxart.run(data1,profile,'Options',aa_ctx(context,ctx));
		}
		field.Style = aa_first(data,profile,'Style',context);
		field.AllowEmptyValue = aa_bool(data,profile,'AllowEmptyValue',context);
		field.AllowValueNotInOptions = aa_bool(data,profile,'AllowValueNotInOptions',context);
		
		field.Control = function(field_data,ctx) {
			if (field.DelayOptionCalculation) {
				field.Options = [];
				field.Options.delayedCalculation = true;
			} else {
				if (!field.Options) { field.RefreshOptions(data,context); }
			}
			var picklist = {};
			aa_initPicklistObject(picklist,field,field_data,ctx);
			
			var out = jQuery(aa_renderStyleObject(field.Style,picklist,ctx,true)).addClass('aa_picklist').get();
			
			if (!picklist.getValue() && !field.AllowEmptyValue) {
				var code = field.Options && field.Options[0] && field.Options[0].code;
				if (code) {
					ajaxart.writevalue(field_data,code);					
					out = jQuery(aa_renderStyleObject(field.Style,picklist,ctx,true)).addClass('aa_picklist').get();
				}
			}

			return out;		
		};
	}
});

aa_gcs("editable_picklist",{
	OptionsTable: function (profile,data,context)
	{
		return ajaxart.runsubprofiles(data,profile,'Option',context);
	},
	Option: function (profile,data,context)
	{
		return [{
		  code: aa_text(data,profile,'Code',context),
		  text: aa_multilang_text(data,profile,'DisplayName',context),
		  image: aa_text(data,profile,'Image',context)
		}];
	},
	OptionsByCommas: function (profile,data,context)
	{
		var options = aa_text(data,profile,'Options',context).split(',');
		var out = [];
		for(var i=0;i<options.length;i++) {
			var code = ajaxart_multilang_text(options[i],context);
			if (!code) continue;
			out.push({ code: code, text: code });
		}
		return out;
	},
	DynamicOptions: function (profile,data,context)
	{
		var options = ajaxart.run(data,profile,'Options',context);
		var out = [];
		for(var i=0;i<options.length;i++) {
			var option = [ options[i] ];
			out.push({
				code: aa_text(option,profile,'OptionCode',context),
				text: aa_text(option,profile,'OptionDisplayName',context),
				image: aa_text(option,profile,'OptionImage',context) || null,
				base: options[i],
				disabled: aa_bool(option,profile,'IsDisabled',context)
			});
		}
		return out;
	},
	AutoFilterOptions: function (profile,data,context) {
		var options = [];
		var uniqueOptions = {};

		var cntr = context.vars.ItemListCntr[0];
		var filterField = context.vars._Field[0];

		var items = cntr.AllItems || cntr.Items;
		for (var i = 0; i < items.length; i++) {
			var value = aa_totext ( filterField.FilterData( [items[i]] , context ) );
			if (value && !uniqueOptions[value])
				options.push({ code: value, text: value });
			uniqueOptions[value] = true;
		}
		return options;
	},
	SelectedOptionInPopup: function (profile,data,context)
	{
		var picklist = context.vars.ApiObject[0];
		var code = picklist.getValue();
		var items = data;
		for(var i=0;i<items.length;i++)
			if (items[i].code == code) 
				return [items[i]];
	},
	PicklistSelect: function (profile,data,context)
	{
		var option = aa_first(data,profile,'Option',context);
		if (!option) return;
		var picklist = context.vars.ApiObject[0];
		
		var code = option.code;
		picklist.setValue(code,{Option: [option.base]});
		if (picklist.wrapperForStyleByField.jbPopup) picklist.wrapperForStyleByField.jbPopup.close();
		if (picklist.Refresh) picklist.Refresh();

		aa_refresh_cell(picklist.wrapperForStyleByField,context);	// because the picklist is implemented by StyleByField 
	},
	AddValueNotInOptionsToList: function (profile,data,context)
	{
		var cntr = context.vars.ItemListCntr[0];
		var items = cntr.AllItems || cntr.Items;
		// last option is the one not in options
		var optionNotInOptions = items[items.length-1];
		if (!optionNotInOptions || !optionNotInOptions.isValueNotInOptions) {
			optionNotInOptions = { isValueNotInOptions: true }; 
			items.push(optionNotInOptions);
		}
		optionNotInOptions.text = optionNotInOptions.code = aa_text(data,profile,'OptionText',context);
		cntr.RefreshDataColumns();
	}
});

aa_gcs("fld_aspect",{
	PicklistDisplayNameInPicklistBox: function (profile,data,context) {
		var field = context.vars._Field[0];
		field.DisplayNameInPicklistBox = function(data1,ctx) {
			return ajaxart.run(data1,profile,'IdToDisplayName',aa_merge_ctx(context, ctx));
		}
	},
	PicklistProperties: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.HideSearchBox = aa_bool(data,profile,'HideSearchBox',context);
		field.AutoRecalcOptions = aa_bool(data,profile,'AutoRecalcOptions',context);
		field.DelayOptionCalculation = aa_bool(data,profile,'DelayOptionCalculation',context);
		field.CustomPopupContents = aa_first(data,profile,'PopupContents',context);
		field.TextForNoResults = aa_text(data,profile,'TextForNoResults',context);
		field.TextForShowAll = aa_text(data,profile,'TextForShowAll',context);
		field.MaxItemsToShow = aa_int(data,profile,'MaxItemsToShow',context);
		field.TextForEmptyValueInPopup = aa_text(data,profile,'TextForEmptyValueInPopup',context);
		field.TextForEmptyValueInRadio = aa_text(data,profile,'TextForEmptyValueInRadio',context);
		field.SelectOnHover = aa_text(data,profile,'SelectOnHover',context);

		field.OnOpenPopup = function(field_data,ctx) {
			if (field.AutoRecalcOptions || field.Options.delayedCalculation) {
				field.RefreshOptions(field_data,ctx);
				field.Options.delayedCalculation = false;
			}
		};
	},
	HideUnselectedPicklistOptions: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		aa_bind(field,'ModifyControl',function(settings) {
			aa_addOnAttach(settings.Wrapper,function() {
				showhide_fields(settings.Wrapper,settings.FieldData)
			});
		});
		jBart.bind(field,'update', function(settings) {
			showhide_fields(settings.wrapper,settings.FieldData);
		});

		function showhide_fields(wrapper,field_data)
		{
			var selected = ',' + aa_totext(field_data) + ',';
			for(var i=0;i<field.Options.length;i++) {
				var option = ',' + field.Options[i].code +',';
				var show = selected.indexOf(option) != -1;
				showhide_field(wrapper,aa_string2id(field.Options[i].code),show);
			}
		}
		function showhide_field(srcElement,fieldID,show)
		{
			var parent = srcElement.parentNode;
			if (!parent || parent.tagName == 'body') return;
			var ctrls = $(parent).find('.fld_'+fieldID);
			if (show)
				$(ctrls).show();
			else
				$(ctrls).hide();
			if (ctrls.length == 0)
				showhide_field(parent,fieldID,show);
		}
	}
});

aa_gcs("itemlist_filter", {
    Occurrences: function (profile, data, context)
    {
        var field = context.vars._Field[0]; 
        field.OccurrencesStyle = aa_first(data,profile,'Style',context);
        var filteredOccurrences = aa_bool(data,profile,'ShowFilteredOccurrences',context);
        var filterId = field.Id;
	     	var sort = aa_bool(data,profile,'SortByOccurrences',context);

     		field.SortPicklistOptions = function(options,ctx,picklist) {
     			var cntr = ctx.vars.ItemListCntr[0];
     			aa_calculateFilterOccurrences(cntr,filterId,filteredOccurrences);

     			picklist.useFilteredOcc = filteredOccurrences && cntr.FilteredOccurrences[filterId];
     			if (picklist.useFilteredOcc) {
     				// there must be a filter other than our own
     				picklist.useFilteredOcc = false;
     				for(var i in cntr.FilterData || {})
     					if (i != filterId && cntr.FilterData[i]) picklist.useFilteredOcc = true;
     			}

     			for(var i=0;i<options.length;i++) {
     				var code = options[i].code
     				options[i].occ = cntr.Occurrences[filterId][code] || 0;
     				if (picklist.useFilteredOcc) {
     					options[i].filteredOcc = cntr.FilteredOccurrences[filterId][code] || 0;
     				}

     				if (!code && field.AllowEmptyValue) options[i].occ = '300000';
     			}
     			if (sort) {
     				if (picklist.useFilteredOcc) {
            	options.sort(function(a,b) { return b.filteredOcc - a.filteredOcc; });     				
     				} else {
            	options.sort(function(a,b) { return b.occ - a.occ; });     				
            }
     			}

					return options;
     		};

				aa_bind(field,'picklistRenderOption',function(args) {
            var cntr = args.context.vars.ItemListCntr[0];
            var code = args.option.code;
            if (code == '' && field.AllowEmptyValue) return;

            var count = args.option.occ;
            var filteredCount = args.option.filteredOcc;
            
            aa_renderStyleObject2(field.OccurrencesStyle,{ 
                count: count,
                filteredOccurrences: args.picklist.useFilteredOcc,
                filteredCount: filteredCount,
                optionTextEl: args.optionTextEl
            },data,field,args.context,{ funcName: 'add' });
     		},'Occurrences');
    }
});

function aa_picklist_optionByCode(options,code) {
	if (!options) return;
	for(var i=0;i<options.length;i++) {
		if (options[i].code == code) return options[i];
	}
	return null;
}

function aa_initPicklistObject(picklist,field,field_data,context)
{
	if (!field_data || !field_data.length) ajaxart.log("No field data for picklist");

	aa_extend(picklist,{
		apiObjectType: 'picklist',
		Field: field, FieldData: field_data, data: field_data[0],Context: context,context: context,
		field: field, field_data: field_data,
		type: 'picklist',
		getValue: function() {
			return aa_totext(field_data);
		},
		getImage: function() {
			var code = aa_totext(field_data,context);
			var option = aa_picklist_optionByCode(picklist.Field.Options,code);
			return option && option.image;
		},
		setValue: function(newValue,extra,settings) {
			settings = settings || {};
			var oldValue = this.getValue();
			if (oldValue == newValue && !settings.forceUpdate) return;
			ajaxart.writevalue( field_data, newValue );
			var content = this.control; // TODO: fix this
			aa_invoke_field_handlers(field.OnUpdate,content,null,field,field_data,{ OldValue: [oldValue] });
			jBart.trigger(field,'update',{ FieldData: field_data, wrapper: content ? content.parentNode : null, extra: extra });
		},
		totext: function() {
			var code = aa_totext(field_data,context);
			if (this.field.DisplayNameInPicklistBox)
				return aa_totext(this.field.DisplayNameInPicklistBox(field_data,context));

			var option = aa_picklist_optionByCode(picklist.Field.Options,code);
			return option ? option.text : code;
		},
		Refresh: function() {}
	});
}

function aa_picklist_radio_buttons(picklist,settings)
{
  settings = aa_defaults(settings,{
    OptionElement: picklist.$el.find('.aa_option')[0],
    OptionInnerElements: function(optionEl) {
      return {
        RadioElement: jQuery(optionEl).find('.aa_option_radio')[0],
        TextElement: jQuery(optionEl).find('.aa_option_text')[0]        
      }
    }    
  });
  
	aa_global_vars().uniqueRadioCounter = aa_global_vars().uniqueRadioCounter || 0;
	var radioGroup = 'aaradio' + ++aa_global_vars().uniqueRadioCounter;
	var currentValue = picklist.getValue();
	
	var optionTemplate = settings.OptionElement;
	var templateParent = optionTemplate.parentNode;
	
	var options = picklist.Field.Options;

	if (picklist.Field.AllowEmptyValue && settings.addRadioButtonForEmptyValue)
		options = [{ code: '', text: picklist.field.TextForEmptyValueInRadio || 'none' }].concat(options);

	for(var i=0;i<options.length;i++) {
		var option = options[i];
		var optionElem = optionTemplate.cloneNode(true);
		var optionSettings = settings.OptionInnerElements(optionElem);
		optionElem.jbOption = option;
		if (optionSettings.TextElement) { 
			optionSettings.TextElement.innerHTML = option.text; 
			optionSettings.TextElement.jbRadio = optionSettings.RadioElement; 
			optionSettings.TextElement.jbOption = option;
			if (i == options.length-1) $(optionElem).addClass('aa_last');

			if (option.disabled) {
				$(optionElem).addClass('disabled');
			} else {
				optionSettings.TextElement.onclick = function() {
					$(this.jbRadio).click();
				};
			}
		}
		if (optionSettings.RadioElement) {
			optionSettings.RadioElement.setAttribute('name',radioGroup);
			optionSettings.RadioElement.jbOption = option;
			optionSettings.RadioElement.onclick = function(){
				if ($(this).closest('.aa_disabled')[0]) return;
        $(this).parents('.aa_option').siblings().removeClass('selected');
        $(this).parents('.aa_option').addClass('selected');
				picklist.setValue(this.jbOption.code);
			};
		}
			
    if (currentValue == option.code) {
    	optionSettings.RadioElement.setAttribute('checked','checked');
     	$(optionSettings.RadioElement).parents('.aa_option').addClass('selected');
    }        
		
		$(optionTemplate).before(optionElem);
	}	
	templateParent.removeChild(optionTemplate);
}


function aa_picklist_open_options(picklist,settings)
{
	settings = aa_defaults(settings,{
		OptionElement: picklist.$el.firstOfClass('aa_option'),
		OptionInnerElements: function(optionElem) {
			return {
				TextElement: $(optionElem).firstOfClass('aa_option_text'),
				ImageElement: $(optionElem).firstOfClass('aa_option_image')
			};
		}
	});

	var currentValue = picklist.getValue();
	
	var optionTemplate = $(settings.OptionElement)[0];
	var templateParent = optionTemplate.parentNode;
	
	var options = picklist.Field.Options;
	for(var i=0;i<options.length;i++) {
		var option = options[i];
		var optionElem = optionTemplate.cloneNode(true);
		var optionSettings = settings.OptionInnerElements(optionElem);
		optionElem.jbOption = option;
		$(optionSettings.TextElement).text(option.text);

		aa_setImage($(optionSettings.ImageElement)[0],option.image,false);
		
		$(optionElem).click(function(){
			setSelected(this,true);
		});
		
		if (currentValue == option.code) setSelected(optionElem);
		
		$(optionTemplate).before(optionElem);
		if (i == options.length-1) $(optionElem).addClass('last');
		if (option.disabled) $(optionElem).addClass('disabled');
	}	
	templateParent.removeChild(optionTemplate);

	function setSelected(optionElem,alsoUpdate) {
		if (optionElem.jbOption.disabled) return;

		if (alsoUpdate) {
			picklist.setValue(optionElem.jbOption.code);
		}
		$(optionElem).siblings().removeClass('selected');
		$(optionElem).addClass('selected');
	}
}


function aa_picklist_native_combo(picklist,settings)	// used by native combo style
{
	settings.OnOptionElem = settings.OnOptionElem || function() {};
	settings.Element = settings.Element || picklist.control;
	
	var element = settings.Element;
	var currentOption = picklist.getValue();
	
	var field = picklist.Field;
	var options = field.Options;
	if (field.AllowEmptyValue)
		jQuery('<option/>').appendTo(element);
	for(var i=0;i<options.length;i++) {
		var option = options[i];
		var optionElem = jQuery('<option/>')[0];
		optionElem.value = option.code;
		optionElem.innerHTML = option.text;
		if (option.disabled) optionElem.setAttribute('disabled','disabled');

		settings.OnOptionElem(optionElem,option);
		element.appendChild(optionElem);
	}
	element.value = currentOption;
	
	element.onchange = function() {
		var field_data = picklist.FieldData;
		var newValue;
		var index = element.selectedIndex;
		if (field.AllowEmptyValue)	// first option is the empty value
			index--;
		if (index == -1) 
			newValue = "";	// empty value
		else 
			newValue = options[index].code;
		picklist.setValue(newValue);
	};
}

function aa_picklist(picklist,settings) {
	settings = settings || {};
	settings.baseElement = settings.baseElement || picklist.$el.firstOfClass('aa_picklist_div');
	settings.textElement = settings.textElement || picklist.$el.firstOfClass('aa_picklist_text');
	settings.imageElement = settings.imageElement || picklist.$el.firstOfClass('aa_picklist_image');
	settings.popupElement = settings.popupElement || picklist.$el.firstOfClass('aa_picklist_popup');
	settings.popupInputElement = settings.popupInputElement || picklist.$el.firstOfClass('aa_picklist_popup_input');	
	settings.popupNoResultsElement = settings.popupNoResultsElement || picklist.$el.firstOfClass('aa_picklist_no_results');	
	settings.popupShowAllElement = settings.popupShowAllElement || picklist.$el.firstOfClass('aa_picklist_show_all');	
	settings.popupItemElement = settings.popupItemElement || picklist.$el.firstOfClass('aa_picklist_item');	
	settings.imageWidth = settings.imageWidth || 16;
	settings.imageHeight = settings.imageHeight || 16;
	settings.longTextLength = settings.longTextLength || 20;

	settings.popupItemSettings = settings.popupItemSettings || function(itemElement) {
		return {
			itemTextElement: $(itemElement).firstOfClass('aa_picklist_item_text'),
			itemImageElement: $(itemElement).firstOfClass('aa_picklist_item_image')
		};
	};
	settings.maxItemsToShow = picklist.field.MaxItemsToShow || 50;

	settings.search = settings.search || aa_searchbox_search; // for Compress: aa_searchbox_search()

	var $base = $(settings.baseElement);
	var $popupItemParent = $(settings.popupItemElement).parent();
	var $popupItemTemplate = $(settings.popupItemElement).remove();
	var $input = null;
	var disableSelectionOnHover = false;

	initPopup();

	$base.click(function() {
		if (!ajaxart.isattached(picklist.selectorPopup.el))
			openPopup();
		else
			picklist.selectorPopup.close();
	});
	refreshPicklistBase();

	function refreshPicklistBase() {
		var imageObject = aa_create_static_image_object(picklist.getImage());
		if (imageObject && imageObject.url) {
			imageObject.keepImageProportions = imageObject.fillImage = imageObject.centerImage =  true;
			imageObject.height = settings.imageHeight;
			imageObject.width = settings.imageWidth;
		}

		aa_setImage($(settings.imageElement)[0],imageObject,false);
		var txt = picklist.totext();
		$(settings.textElement).html(txt);
		if (txt.length > settings.longTextLength) 
			$(settings.textElement).addClass('picklist-long-text');
		else
			$(settings.textElement).removeClass('picklist-long-text');

		if (!picklist.totext() && picklist.field.DescriptionForEmptyText) {
			$(settings.textElement).addClass('placeholder');
			$(settings.textElement).html(picklist.field.DescriptionForEmptyText);
		} else {
			$(settings.textElement).removeClass('placeholder');
		}
	}
	// tab and keyboard support
	$(settings.baseElement).attr('tabindex',0);
	$(settings.baseElement).keydown( function(e) { 
		if (picklist.selectorPopup && !picklist.selectorPopup.isOpen || !picklist.selectorPopup.isOpen()) {	// popup is closed
			if (e.keyCode == 13 || e.keyCode == 32 || e.keyCode == 40) {	// enter, space or arrow down opens the popup
				openPopup(); 
				return aa_stop_prop(e);
			}
		} else if (picklist.field.HideSearchBox) {	// popup is open and no searchbox, we pass the keys events to the searchbox
			handleInputEvents(e.keyCode);
			return aa_stop_prop(e);
		}
	});

	function initPopup() {
		picklist.selectorPopup = aa_createLightPopup({
			el: $(settings.popupElement)[0],
			launchingElement: $base[0],
			location:  aa_popupNearLauncherLocation({ minWidthOfLaunchingElement: true }),
			features: [
				aa_popup_feature_closeOnEsc(),
				aa_popup_feature_autoFocus()
			],
			apiObject: picklist,
			type: 'picklist',
			popupSettings: {
				closeWhenClickingOutside: 'except launching element',
				reusablePopup: true
			}
		});

		if (picklist.field.SelectOnHover) {
			aa_bind(picklist.selectorPopup,'close',function(args) {
				if (args.closeType != 'OK' && picklist.selectorPopup.valueWhenOpened != picklist.getValue())
					picklist.setValue(picklist.selectorPopup.valueWhenOpened);
			});
		}
		if (aa_isStudioRefreshAndPopupIsOpen('picklist',picklist)) {
			setTimeout(openPopup,100);
		}
		if (picklist.field.HideSearchBox) $(picklist.selectorPopup.el).addClass('aa_hide_searchbox');
		$(settings.popupNoResultsElement).text(picklist.field.TextForNoResults || 'No results match your search');
		$(settings.popupShowAllElement).text(picklist.field.TextForShowAll || 'Show All');
		aa_bind(picklist.selectorPopup, 'close', function() {	// after closing, bring the focus back to the base
			$(settings.baseElement).focus();
			setTimeout( function() { 	
				if (!document.activeElement || document.activeElement == $("body")[0]) 	// if the popup was closed by clicking non focusable area, we catch it and refocus
					$(settings.baseElement).focus();
			},1);
		});
	}	

	function openPopup() {
		if (picklist.field.OnOpenPopup) {
			picklist.field.OnOpenPopup(picklist.field_data,picklist.context);
		}
		if (picklist.field.CustomPopupContents) {
			showPicklistCustomContents();
		} else {
			bindPopupInputEvents();
			refreshPopupOptions();
		}
		picklist.selectorPopup.valueWhenOpened = picklist.getValue();
		picklist.selectorPopup.show();
		aa_trigger(picklist,'popupShow',picklist.selectorPopup);
	}

	function showPicklistCustomContents() {
		var obj = {
			SelectAndClose: function(data1) {
				var code = aa_totext(data1);
				picklist.selectorPopup.close('OK');
				picklist.setValue(code);
				refreshPicklistBase();
			}
		};
		aa_empty(picklist.selectorPopup.el.firstChild);
		aa_fieldControl({ 
			Field: picklist.field.CustomPopupContents, 
			Wrapper: picklist.selectorPopup.el.firstChild,
			FieldData: [],
			Context: aa_ctx(picklist.context,{ _Picklist: [obj]})
		});
	}
	function handleInputEvents(keyCode) {
		$input = $(settings.popupInputElement);
		$input[0].jbValueForKeyDown = $input.val();
		if (keyCode == 13) { // enter
			var selected = $popupItemParent.find('>.selected')[0];
			if (selected) {
				selectItem(selected);
				return;
			}
		}
		if (keyCode == 27) { // escape
			picklist.selectorPopup.close();
		}
		if (keyCode == 40) { // arrow down
			var selected = $popupItemParent.find('>.selected')[0];
			if (selected && selected.nextSibling) {
				$(selected).removeClass('selected');
				$(selected.nextSibling).addClass('selected');
				makeItemVisible(selected.nextSibling,'down');
				return;
			}
		}
		if (keyCode == 38) { // arrow up
			var selected = $popupItemParent.find('>.selected')[0];
			if (selected && selected.previousSibling) {
				$(selected).removeClass('selected');
				$(selected.previousSibling).addClass('selected');
				makeItemVisible(selected.previousSibling,'up');
				return;
			}
		}
	}
	function bindPopupInputEvents() {
		$input = $(settings.popupInputElement);
		$input.val('');
		if ($input[0].EventsBounded) return;
		$input[0].EventsBounded = true;	// avoid multiple bindind
		$input.keydown(function(e) {
			handleInputEvents(e.keyCode)
		});
		$input.keyup(function(e) {
			if (this.jbValueForKeyDown == $(this).val()) return;
			refreshPopupOptions();
		});
	}

	function refreshPopupOptions(showAll) {
		while ($popupItemParent[0].firstChild)
			aa_remove($popupItemParent[0].firstChild,true);

		var items = picklist.Field.Options;
		if (picklist.Field.AllowEmptyValue && picklist.getValue() && !settings.dontShowEmptyValueItem) {
			items = [{ code: '', text: picklist.field.TextForEmptyValueInPopup || '' }].concat(items);
		}
		settings.search($input.val(),items);

		var added = 0;
		if (picklist.field.AllowValueNotInOptions && $input.val()) {
			items = items.concat([{ code: $input.val(), text: $input.val(), passed: true }]);
		}

		if (picklist.field && picklist.field.SortPicklistOptions) 
			items = picklist.field.SortPicklistOptions(items,picklist.context,picklist);

		for(var i=0;i<items.length;i++) {
			if (!items[i].passed) continue;
			var $item = $popupItemTemplate.clone().appendTo($popupItemParent);
			$item[0].jbItem = items[i];
			if (items[i].disabled) $item.addClass('disabled');

			var innerSettings = settings.popupItemSettings($item[0]);
			$(innerSettings.itemTextElement).text(items[i].text);
			highlightText($(innerSettings.itemTextElement),$input.val());

			aa_trigger(picklist.field,'picklistRenderOption',{ optionTextEl: $(innerSettings.itemTextElement)[0], context: picklist.context, option: items[i], picklist: picklist });

			var imageObject = aa_create_static_image_object(items[i].image);
			if (imageObject && imageObject.url) {
				imageObject.keepImageProportions = imageObject.fillImage = imageObject.centerImage =  true;
				imageObject.height = settings.imageHeight;
				imageObject.width = settings.imageWidth;				
			}
			aa_setImage($(innerSettings.itemImageElement)[0],imageObject);

			try {
				if (settings.onRenderOption) settings.onRenderOption($item[0],items[i]);
			} catch(e) {
				ajaxart.logException('error calling onRenderOption',e);
			}

			if (added === 0) $item.addClass('selected');
			if (++added >= settings.maxItemsToShow && !showAll) {
				addShowAll();
				break;
			}
		}
		$popupItemParent.children().click(function() {
			if (this == $(settings.popupShowAllElement)[0]) return;

			selectItem(this);
		});
		$popupItemParent.children().mouseover(function() {
				if (this == $(settings.popupShowAllElement)[0] || disableSelectionOnHover) return;

				if ( $(this).hasClass('selected') ) return;
				$popupItemParent.children().removeClass('selected');
				$(this).addClass('selected');

				if (picklist.field.SelectOnHover)
					picklist.setValue(this.jbItem.code);
		});
		if (!added && items.length > 0) {
			$(settings.popupNoResultsElement).appendTo($popupItemParent);
		}
		if (settings.rtl) setTimeout(popupRTLKeepRightPosition,1);
	}

	function popupRTLKeepRightPosition() {
		var popupEl = picklist.selectorPopup.$el[0];
		var popupRight = aa_absLeft(popupEl,true) + popupEl.offsetWidth;
		var baseRight = aa_absLeft($base[0],true) + $base.outerWidth();

		var currentLeft = Number(popupEl.style.left.split('px')[0]);
		popupEl.style.left = (currentLeft - (popupRight-baseRight) ) + 'px';
	}
	function selectItem(itemElement) {
		if (itemElement.jbItem.disabled) return;
		var code = itemElement.jbItem.code;

		picklist.selectorPopup.close('OK');
		picklist.setValue(code);
		refreshPicklistBase();
	}

	function addShowAll() {
		$(settings.popupShowAllElement).appendTo($popupItemParent);
		$(settings.popupShowAllElement).click(function() {
			var lastItem = this.previousSibling && this.previousSibling.jbItem;
			refreshPopupOptions(true);

			var children = $popupItemParent.children();
			for(var i=0;i<children.length;i++)
				if (children[i].jbItem == lastItem) {
					if (children[i].tabIndex == -1) children[i].tabIndex = 0;
					children[i].focus();
					children[i].tabIndex = -1;
				}
		});
	}

	function highlightText($elem,searchtext) {
		$elem.html( ajaxart_field_highlight_text($elem.text(),searchtext,'.aa_highlight') );
	}

	function makeItemVisible(element,direction) {
		if (!element) return;

		var frame = picklist.selectorPopup.frameElement;
		var top = aa_relTop(element,frame);
		var bottom = top + $(element).outerHeight();
		var scrollY = $(frame).scrollTop();
		var frameHeight = $(frame).height();

		disableSelectionOnHover = true;

		if (direction == 'down') {
			if (bottom > scrollY + frameHeight ) {
				$(frame).scrollTop(bottom-frameHeight);  
			}
		}
		if (direction == 'up') {
			if (top < scrollY) {
				$(frame).scrollTop(top);
			}
		}

		setTimeout(function() {			// to prevent the selection to go to the mouse
			disableSelectionOnHover = false;
		},100);
	}

}


