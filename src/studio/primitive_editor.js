ajaxart.load_plugin("","plugins/studio/primitive_editor.xtml");

aa_gcs("primitive_editor",{
	PrimitiveEditor: function(profile,data,context) {
		var field = aa_create_base_field(data, profile, context);
		aa_init_class_PrimitiveEditor();

		field.Control = function(field_data,ctx) {
			var ctx2 = aa_merge_ctx(context,ctx);

			var primitive_editor = new ajaxart.classes.PrimitiveEditor({
				xtml: aa_first(field_data,profile,'XtmlToEdit',context),
				param: aa_text(field_data,profile,'ParamToEdit',context),
				field: field,
				context: context
			});

			return [aa_renderStyleObject(field.Style, primitive_editor,ctx2,true)];
		};
		return [field];
	}
});

function aa_init_class_PrimitiveEditor() {
	
	if (ajaxart.classes.PrimitiveEditor) return;

	ajaxart.classes.PrimitiveEditor = function(settings) {
		aa_extend(this, settings);
		this.valueNode = aa_xpath(this.xtml,'@'+this.param)[0];
		this.value = aa_totext([this.valueNode]);
	};
	ajaxart.classes.PrimitiveEditor.prototype.onchange = function(newval) {
		this.value = newval;
		ajaxart.writevalue([this.valueNode],[newval]);
	};
	ajaxart.classes.PrimitiveEditor.prototype.ensurePreviewContext = function(newval) {
		if (this.previewContext) return;
		try {
			this.previewContext = aadt_calcPrimitivePreviewContext(this.xtml,this.param,this.context);
		} catch(e) {
			ajaxart.logException('error calculating primitive error context',e);
		}
	};
	ajaxart.classes.PrimitiveEditor.prototype.getPreviewSelectorOptions = function(newval) {
		this.ensurePreviewContext();
		var out = [];
		out.push({
			value: '@attr',
			previewText: 'some data'
		});
		out.push({
			value: '@price',
			previewText: '$50'
		});
		return out;
	};
}

function aa_primitive_editorSettings(primitive_editor,settings) {
	settings = settings || {};
	settings.inputElement = settings.inputElement || primitive_editor.$el.find('.aa_primitive_input');
	settings.selectorPopupElement = settings.selectorPopupElement || primitive_editor.$el.find('.aa_selector_popup');
	settings.selectorPopupItemTemplate = settings.selectorPopupItemTemplate || primitive_editor.$el.find('.selector_item');
	settings.getSelectorItemSettings = settings.getSelectorItemSettings || function(itemElement) {
		return {
			itemTextElement: jQuery(itemElement).find('.selector_item_val'),
			itemPreviewTextElement: jQuery(itemElement).find('.selector_item_preview')			
		};
	};
	return settings;
}
function aa_primitive_editor(primitive_editor,settings) {
	settings = aa_primitive_editorSettings(primitive_editor,settings);

	var $input = jQuery(settings.inputElement);
	var $selectorItemTemplate = jQuery(settings.selectorPopupItemTemplate);
	var $selectorItemParent = $selectorItemTemplate.parent();
	$selectorItemTemplate.remove();

	initPopups();

	aa_jbart_textbox(primitive_editor,{ inputElement: $input[0] });

	$input.keydown(function(e) {
		if (e.keyCode == 53) { // %
			openSuggestionPopup();
		}
	});

	function initPopups() {
		primitive_editor.selectorPopup = aa_createLightPopup({
			el: jQuery(settings.selectorPopupElement)[0],
			launchingElement: $input[0],
			location: aa_popupNearLauncherLocation({minWidthAsLauncherElement: true}),
			features: [],
			apiObject: primitive_editor,
			type: 'primitive editor selector'
		});

		if (aa_isStudioRefreshAndPopupIsOpen('primitive editor selector',primitive_editor)) {
			setTimeout(openSuggestionPopup,100);
		}		
	}

	function openSuggestionPopup() {
		primitive_editor.ensurePreviewContext();
		openSelectorPopup();		
	}

	function openSelectorPopup() {
		var items = primitive_editor.getPreviewSelectorOptions();
		if (!items || !items[0]) return;		

		while ($selectorItemParent[0].firstChild)
			aa_remove($selectorItemParent[0].firstChild,true);

		for(var i=0;i<items.length;i++) {
			var $item = $selectorItemTemplate.clone().appendTo($selectorItemParent);
			var innerSettings = settings.getSelectorItemSettings($item[0]);
			jQuery(innerSettings.itemTextElement).text(items[i].value);
			jQuery(innerSettings.itemPreviewTextElement).text(items[i].previewText);
		}

		primitive_editor.selectorPopup.show();
	}
}