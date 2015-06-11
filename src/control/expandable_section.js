ajaxart.load_plugin("", "plugins/control/expandable_section.xtml");

aa_gcs("control", {
	ExpandableSection: function(profile, data, context) {
		var field = aa_create_base_field(data, profile, context);

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context,ctx);
			field.Fields = ajaxart.runsubprofiles(data,profile,'Field',ctx2);
			var expandableSection = {
				title: aa_text(field_data,profile,'SectionTitle',context) || aa_fieldTitle(field ,field_data, context,true),
				renderContent: function(parentDiv) {
					var fields = ajaxart.runsubprofiles(field_data, profile, 'Field', ctx2);
					var newFields = [];
					for (var i = 0; i < fields.length; i++) { // we do not need the constant hidden fields
						if (!fields[i].RenderHiddenCell) {
							if (fields[i].CalculatedOnly) fields[i].Calculate(field_data, ctx2);
							if (fields[i].IsHidden) continue;
							if (fields[i].IsCellHidden && fields[i].IsCellHidden(field_data, ctx2)) continue;
						}

						newFields.push(fields[i]);
					}
					fields = newFields;
					aa_trigger(field, 'innerFields', { Context: ctx2, FieldData: field_data, Fields: fields });

					for(var i=0;i<fields.length;i++) {
						var wrapper = $('<div/>').appendTo(parentDiv)[0];
						aa_fieldControl({	Field: fields[i],	Wrapper: wrapper,	Item: field_data,	Context: this.context	});
					}
				}
			};

			return [aa_renderStyleObject2(field.Style,expandableSection,field_data,field,ctx)];
		};
		return [field];
	}
});

aa_gcs("fld_aspect", {
	ExpandableSectionProperties: function(profile, data, context) {
		var field = context.vars._Field[0];
		aa_bind(field,'initApiObject',function(args) {
			args.apiObject.RefreshOnExpand = aa_bool(data,profile,'RefreshOnExpand',context);
		});
	}
});

function aa_expandableSection(expandableSection,settings) {
	settings = aa_defaults(settings,{
		sectionTitleElement: expandableSection.$el.firstOfClass('section_title'),
		sectionTextElement: expandableSection.$el.firstOfClass('section_title_text'),
		sectionToggleElement: expandableSection.$el.firstOfClass('section_title_toggle'),
		sectionBodyElement: expandableSection.$el.firstOfClass('section_body')
	});
	var expandedClass = 'aa_section_exapnded';
	
	var titleElem = $(settings.sectionTitleElement)[0];
	if (expandableSection.renderSectionTitle) {
		aa_empty(titleElem);
		expandableSection.renderSectionTitle(titleElem);
	} else {
		$(settings.sectionTextElement).text( expandableSection.title );
	}

	$(titleElem).click(function() {
		expandableSection.$el.toggleClass(expandedClass);
		refresh();
	});

	if (expandableSection.expandedByDefault) {
		expandableSection.$el.addClass(expandedClass);
		refresh();
	}

	function refresh() {
		var bodyElem = $(settings.sectionBodyElement)[0];
		if (expandableSection.$el.hasClass(expandedClass)) {
			if (!bodyElem.jbRendered || expandableSection.RefreshOnExpand) {
				aa_empty(bodyElem);
				expandableSection.renderContent(bodyElem);
			}
			$(bodyElem).show();
		} else {
			$(bodyElem).hide();
		}
	}
}
