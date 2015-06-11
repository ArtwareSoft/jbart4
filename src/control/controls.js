ajaxart.load_plugin("", "plugins/control/controls.xtml");
ajaxart.load_plugin("", "plugins/control/tabcontrol.xtml");

aa_gcs("control", {
	ShowFieldControl: function(profile, data, context) {
		var item = ajaxart.run(data,profile,'Item',context);
		var field = aa_first(data,profile,'Field',context);
		if (!field) return;
		
		var wrapper = document.createElement('div');
		aa_fieldControl({ Field: field, Item: item, Wrapper: wrapper, Context: context });
		return [wrapper];
	},
	Label: function(profile, data, context) // gc of control.Label
	{
		var field = {
			Id: aa_text(data, profile, 'ID', context),
			Title: aa_multilang_text(data, profile, 'Title', context),
			Style: aa_first(data, profile, 'Style', context),
			TitleAsText: !profile.getAttribute('Text') && !aa_xpath(profile, 'Text')[0]
		};
		field.ID = [field.Id];

		var ctx2 = aa_ctx(context, { _Field: [field] });

		field.Label = function(field_data,ctx) {
			var text = field.TitleAsText ? field.Title : aa_multilang_text(field_data, profile, 'Text', aa_merge_ctx(ctx2, ctx));
//			text = text.replace(/\n/g, "<br/>");
			return [text];
		};
		field.Control = function(field_data, ctx) {
			var text = this.Label(field_data,ctx)[0];

			return [aa_renderStyleObject(field.Style, {
				text: text,
				data: field_data[0]
			}, ctx)];
		};
		ajaxart.runsubprofiles(data, profile, 'FieldAspect', ctx2);
		return [field];
	},
	Layout: function(profile, data, context) {
		aa_init_class('Layout',{
			getControlsCount: function(controlTemplate) {
				return this.fields.length;
			},
			getControl: function(index,wrapper) {
				aa_fieldControl({
					Field: this.fields[index],
					Wrapper: wrapper,
					Item: this.field_data,
					Context: this.context
				});		
			}
		});

		var layout_field = {
			Id: aa_text(data, profile, 'ID', context),
			Title: aa_multilang_text(data, profile, 'Title', context),
			Style: aa_first(data, profile, 'Layout', context),
			SectionStyle: aa_first(data, profile, 'SectionStyle', context)
		};

		layout_field.Control = function(field_data, ctx) {
			var baseCtx = aa_ctx(ctx, {});
			var ctx2 = aa_merge_ctx(context, baseCtx);
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
			aa_trigger(layout_field, 'innerFields', {
				Context: ctx2,
				FieldData: field_data,
				Fields: fields
			});

			var layout = new ajaxart.classes.Layout({
				fields: fields,context: ctx2,field_data: field_data, field: layout_field
			});
			var out = aa_renderStyleObject(layout_field.Style,layout,ctx2,true);
			if (layout_field.SectionStyle) {
				return [aa_wrapWithSection(out, layout_field, layout_field.SectionStyle, field_data, ctx2)];
			}
			return [out];
		};

		ajaxart.runsubprofiles(data, profile, 'FieldAspect', aa_ctx(context, {
			_Field: [layout_field]
		}));
		return [layout_field];
	},
	IFrame: function(profile, data, context) {
		var field = aa_create_base_field(data, profile, context);
		var style = aa_first(data, profile, 'Style', context);

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context,ctx);
			var iframe = { url: aa_text(field_data,profile,'Url',context) };
			return [aa_renderStyleObject2(style,iframe,field_data,field,ctx2,{})];
		};
		return [field];
	},	
	Hyperlink: function(profile, data, context) {
		var field = aa_create_base_field(data, profile, context);
		var style = aa_first(data, profile, 'Style', context);

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context,ctx);
			var link = { 
				title: aa_fieldTitle(field,field_data,ctx2),
				link: aa_text(field_data,profile,'Link',context),  
				tooltip: aa_text(field_data,profile,'Tooltip',context),
				target: aa_text(field_data,profile,'Target',context)
			};
			return [aa_renderStyleObject2(style,link,field_data,field,ctx2,{})];
		};
		return [field];
	},
	CustomControl: function(profile, data, context) {
		var field = aa_create_base_field(data, profile, context);

		field.Control = function(field_data, ctx) {
			var style = aa_first(field_data, profile, 'Control', context);;
			return [aa_renderStyleObject(style, {
				Field: field,
				Data: field_data,
				Context: context,
				context: context
			}, context)];
		};
		return [field];
	},
	AudioPlayer: function(profile, data, context)
	{
		var field = {
			Id: aa_text(data, profile, 'ID', context),
			Title: aa_multilang_text(data, profile, 'Title', context),
			Style: aa_first(data, profile, 'Style', context)
		};
		field.ID = [field.Id];

		var ctx2 = aa_ctx(context, { _Field: [field] });

		field.Control = function(field_data, ctx) {
			var audioUrl = aa_text(field_data,profile,'AudioUrl',context);

			return [aa_renderStyleObject(field.Style, {
				audioUrl: audioUrl,
				data: field_data[0]
			}, ctx)];
		};
		ajaxart.runsubprofiles(data, profile, 'FieldAspect', ctx2);
		return [field];
	}
});

function aa_horizontalVerticalLayout(layout,settings) {
	settings = aa_defaults(settings,{
		isVertical: layout.params.IsVertical == 'true',
		horizSpacing: layout.params.HorizSpacing
	});

  if (settings.isVertical) {
  	layout.$el.addClass('aa_vertical');
  	aa_layout(layout);
  } else
   aa_horizontalBoxLayout(layout,{ spacing: settings.horizSpacing });	
}
function aa_horizontalBoxLayout(layout,settings) {
	settings = aa_defaults(settings,{
		spacing: '0',
		fullWidth: false
	});
	settings.spacing = settings.spacing.split('px')[0];
	var isIE_above10 = ajaxart.isIE && !ajaxart.isIE9 && !ajaxart.isIE78;
	var css3 = ajaxart.isWebkit || ajaxart.isFirefox || isIE_above10;

	if (css3) {
		var cssForTop = '',cssForField = '';

		if (ajaxart.isWebkit || ajaxart.isFirefox)
			cssForTop = '#this { display: -webkit-box; -webkit-box-orient: horizontal; } ';	// we replace webkit with moz in attach_global_css
		if (ajaxart.isIE)
			cssForTop = '#this { display: -ms-flexbox; -ms-box-orient: horizontal; } ';	

		if (settings.fullWidth) {
			cssForField = '#this { -webkit-box-flex: 1; -ms-flex:1; } ';
			cssForTop += '#this { width:100%;} ';
		}
		if (settings.spacing) {
			cssForField += "#this:not(:last-child) { margin-right: " + settings.spacing + "px; } ";
			cssForField += ".right2left #this:not(:last-child) { margin-left: " + settings.spacing + "px; margin-right:0; } ";
		}

		layout.$el.addClass(aa_attach_global_css(cssForTop));
		var cssClassForField = aa_attach_global_css(cssForField);
		layout.$el.firstOfClass('field')[0].jbRefresh = function() {
			$(this).addClass(cssClassForField);
		};
		layout.$el.firstOfClass('field')[0].jbRefresh();
	} else {
		// add table/tr/td
		var table = $('<table cellpadding="0" cellspacing="0" ><tr><td class="field" style="vertical-align:top" /></tr></table>');
		aa_empty(layout.el);
		layout.el.appendChild(table[0]);

		layout.$el.firstOfClass('field').addClass(aa_attach_global_css("#this:not(:last-child) { padding-right: " + settings.spacing + "px; } .right2left #this:not(:last-child) { padding-left: " + settings.spacing + "px; padding-right:0; } "));
		if (settings.fullWidth)
			table.addClass(aa_attach_global_css("#this { width:100%; }"));
	}

  aa_layout(layout,settings);	
}

function aa_layout(layout,settings) {
	settings = settings || {};
	settings.controlElement = settings.controlElement || layout.$el.find('.field');

	var controlEl = $(settings.controlElement)[0];

	if (layout.addFields && layout.Fields) {
     layout.addFields(controlEl,function(field) { 
        field.setControl(); // backward compatability
     });		
	} else {
		var count = layout.getControlsCount();
		for(var i=0;i<count;i++) {
			var j = settings.flipControlOrder ? count-1-i : i;
			var $wrapper = $(controlEl).clone();
			$wrapper[0].jbRefresh = $(controlEl)[0].jbRefresh;
			controlEl.parentNode.insertBefore($wrapper[0], controlEl);
			layout.getControl(j,$wrapper[0]);
		}
		$(controlEl).remove();
	}
}

function aa_create_base_field(data, profile, context) {
	var field = {
		Id: aa_text(data, profile, 'ID', context),
		Title: aa_multilang_text(data, profile, 'Title', context),
		Image: aa_first(data, profile, 'Image', context),
		Style: aa_first(data, profile, 'Style', context)
	};
	field.ID = [field.Id];
	ajaxart.runsubprofiles(data, profile, 'FieldAspect', aa_ctx(context, {
		_Field: [field]
	}));
	return field;
}

function aa_textLabel(labelObj) {
	var text = labelObj.text.replace(/\n/g, "<br/>");
	labelObj.$el.html(text);
}