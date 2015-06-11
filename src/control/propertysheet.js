// https://docs.google.com/a/artwaresoft.com/document/d/1o6Uv_k3rlnm-Wp_Z7-oRVaAbfAYHcbecHzr39_0gNbU/edit#heading=h.n6saixge6b2n
ajaxart.load_plugin("", "plugins/control/propertysheet.xtml");

aa_gcs("control", {
	PropertySheet: function(profile, data, context) {
		aa_init_class_PropertySheet();

		var field = aa_create_base_field(data, profile, context);

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context, ctx);

      var fields = ajaxart.runsubprofiles(field_data,profile,'Field',ctx2);

			aa_trigger(field,'innerFields',{ Fields: fields});

      var visibleFields = [];
      for(var i=0;i<fields.length;i++) {
				if (!fields[i].RenderHiddenCell) {
	        if (fields[i].IsFieldHidden && fields[i].IsFieldHidden(field_data,ctx) ) continue;
	        if (fields[i].IsCellHidden && fields[i].IsCellHidden(field_data,ctx) ) continue;
	        if (fields[i].IsHidden) continue; 
	      }
        visibleFields.push(fields[i]);
      }

			var propertySheetObject = new ajaxart.classes.PropertySheet({
				fields: visibleFields,
				profile: profile,
				field: field,
				field_data: field_data,
				context: ctx2
			});

			return [aa_renderStyleObject(field.Style, propertySheetObject, ctx2, true)];
		};
		return [field];
	}
});

function aa_propertySheet(propertySheet,settings) {
	// descriptionLocation can be: 'after content' or 'after field name' or ''
	settings = aa_defaults(settings, {
		propertyElement: propertySheet.$el.firstOfClass('aa_property'),
		propertySettings: function(propertyElement) {
			return {
				titleElement: $(propertyElement).firstOfClass('aa_property_title'),
				contentElement: $(propertyElement).firstOfClass('aa_property_content')
			};
		},
		descriptionLocation: 'after content',
		addColonToTitle: true
	});

	var count = propertySheet.getFieldCount();

	for(var i=0;i<count;i++) {
		var fieldTitle = propertySheet.getFieldTitle(i);
		if (fieldTitle && settings.addColonToTitle) fieldTitle += ':';

		var property = $(settings.propertyElement).clone().insertBefore(settings.propertyElement);
		var propertySettings = settings.propertySettings(property);
		if (propertySheet.isFieldHidingTitle(i)) {
			property.addClass('aa_hiding_title');
		} else {
			$(propertySettings.titleElement).html(fieldTitle);
		};		
		propertySheet.getField(i,$(propertySettings.contentElement)[0]);
		var description = propertySheet.getFieldDescription(i);
		if (description && settings.descriptionLocation == 'after content') 
			$('<div class="aa_property_description" />').html(description).appendTo($(propertySettings.contentElement));
		if (description && settings.descriptionLocation == 'after field name') {
			$('<div class="aa_property_description" />').appendTo($(propertySettings.titleElement));
			$(propertySettings.titleElement).attr('title',description);
		}

		if (propertySheet.isFieldMandatory(i))
			property.addClass('aa_mandatory');
	}
	$(settings.propertyElement).remove();
}

function aa_init_class_PropertySheet() {
	
	if (ajaxart.classes.PropertySheet) return;

	ajaxart.classes.PropertySheet = function(settings) {
		aa_extend(this, settings);
	};
	ajaxart.classes.PropertySheet.prototype.getFieldCount = function(controlTemplate) {
		return this.fields.length;
	};
	ajaxart.classes.PropertySheet.prototype.isFieldMandatory = function(index) {
		return this.fields[index].Mandatory;
	};
	ajaxart.classes.PropertySheet.prototype.isFieldHidingTitle = function(index) {
		return this.fields[index].HideTitle || this.fields[index].HidePropertyTitle;
	};
	ajaxart.classes.PropertySheet.prototype.getFieldTitle = function(index) {
		var field = this.fields[index];
		if (field.DynamicTitle) {
			return aa_fieldTitle(field,this.field_data,this.context);
		} 
		return field.Title;
	};
	ajaxart.classes.PropertySheet.prototype.getFieldDescription = function(index) {
		return this.fields[index].Description;
	};
	ajaxart.classes.PropertySheet.prototype.getField = function(index,wrapper) {
		aa_fieldControl({
			Field: this.fields[index],
			Wrapper: wrapper,
			Item: this.field_data,
			Context: this.context
		});		
	};
}
