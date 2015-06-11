ajaxart.load_plugin("", "plugins/control/button.xtml");
ajaxart.load_plugin("", "plugins/control/button_styles.xtml");

aa_gcs("control", {
	Button: function(profile, data, context) {
		aa_init_class('Button',{
			action: function(e,extra_vars) {
				if (window.aa_incapture || this.disabled) return;

				var ctx = aa_ctx(this.context, {
					ControlElement: [this.el],
					_DomEvent: [e]
				});
				if (extra_vars)
					ctx = aa_ctx(ctx,extra_vars);
				var out = ajaxart.run(this.data, this.profile, 'Action', ctx);
				if (e && e.stopPropagation) e.stopPropagation();
				if (e) e.cancelBubble = true;
				return out;
			},
			onActionEnd: function(callback) {
				this._isAsync = true;
				jBart.bind(this, 'actionEnd', callback);
			}
		});	

		var field = {
			Id: aa_text(data, profile, 'ID', context),
			Title: aa_multilang_text(data, profile, 'Title', context),
			Image: aa_first(data, profile, 'Image', context),
			Style: aa_first(data, profile, 'Style', context)
		};
		field.ID = [field.Id];

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context, ctx);
			var text = aa_multilang_text(field_data, profile, 'ButtonText', ctx2) || field.Title;
			if (field.Image && field.Image.Url) field.Image.StaticUrl = aa_totext(field.Image.Url(field_data, ctx2));

			var image = aa_create_static_image_object(field.Image);
			var disabled = aa_bool(field_data, profile, 'Disabled', ctx2);

			var buttonApiObject = new ajaxart.classes.Button({
				text: text,
				tooltip: aa_multilang_text(field_data, profile, 'Tooltip', ctx2),
				image: image,
				disabled: disabled,
				data: field_data,
				profile: profile,
				field: field,
				field_data: field_data,
				context: ctx2
			});

			var out = aa_renderStyleObject(field.Style, buttonApiObject, ctx2, true);
			if (disabled) jQuery(out).addClass('disabled');
			return [out];
		};
		ajaxart.runsubprofiles(data, profile, 'FieldAspect', aa_ctx(context, {
			_Field: [field]
		}));
		return [field];
	}
});

function aa_button(button,settings) {
	settings = aa_defaults(settings,{
		buttonElement: button.el,
    textElement: button.$el.firstOfClass('hypelink_text')[0] || button.el,
    imageElement: button.$el.firstOfClass('hypelink_img')[0],
    keepImageElement: false
	});

	aa_bind(button,'waiting',function() {
		if (button.field.TextForWaiting) $(settings.textElement).html(button.field.TextForWaiting);
		if (settings.onStartWaiting) settings.onStartWaiting();
	});

	aa_bind(button,'endWaiting',function() {
		if (button.field.TextForWaiting) $(settings.textElement).html(button.text);
		if (settings.onEndWaiting) settings.onEndWaiting();
	});

	var jButton = $(settings.buttonElement);
	button.el.jbButtonElement = settings.buttonElement;

	if (settings.allowHtmlInButtonText)
		$(settings.textElement).html(button.text);
	else 
  	$(settings.textElement).text(button.text);
  
  jButton.attr('title',button.tooltip);
  
  if ($(settings.imageElement)[0])
		aa_setImage($(settings.imageElement),button.image,{ removeIfNoImage: !settings.keepImageElement });

  if (jButton.disabled) jButton.addClass('disabled');

  jButton.click(function(e) { 
  	aa_buttonRunAction(button,e);
  });	

}

function aa_buttonRunAction(button,e) {
  	if (button.disabled) return;
  	var jButton = button.$el;
  	
  	aa_trigger(button,'beforeAction');
  	var result = button.action(e); 

  	if (result && result[0] && result[0].state && result[0].state() == 'pending' ) {
			jButton.addClass('disabled waiting');
			aa_trigger(button,'waiting',{});
			$.when(result[0]).then(function() {
				jButton.removeClass('disabled waiting');
				aa_trigger(button,'endWaiting',{});
				aa_trigger(button,'afterAction');
			},function() {
				jButton.removeClass('disabled waiting');
				aa_trigger(button,'endWaiting',{});
				aa_trigger(button,'afterAction');
			});
		} else {
				aa_trigger(button,'afterAction');			
		}
}

