aa_gcs("field_aspect",{
	ValidationStyle: function(profile,data,context) {
		var field = context.vars._Field[0];
		field.ValidationStyle = aa_first(data,profile,'Style',context);

		aa_bind(field,'ModifyCell', function(args) {
			var validationStyle = aa_renderStyleObject(field.ValidationStyle,{},context,true,{
				funcName: 'init'
			}).jbApiObject;
			$(args.Wrapper).addClass(validationStyle.elem_class + ' aa_validation_style');
			validationStyle.$el.removeClass(validationStyle.elem_class);
			args.Wrapper.jbValidationStyle = validationStyle;
		});
	},
	Validation: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		if (! field.Validations ) field.Validations = [];
		var obj = {};
		obj.CheckValidation = aa_text(data,profile,'CheckValidation',context);
		aa_setMethod(obj,'Validation',profile,'ValidationLogic',context);
		aa_setMethod(obj,'ErrorMessage',profile,'ErrorMessage',context);
		obj.AddTitleToErrorMessage = aa_bool(data,profile,'AddTitleToErrorMessage',context);
		obj.HideErrorMessage = ! aa_bool(data,profile,'ShowErrorMessageNextToField',context);
		field.Validations.push(obj);

		aa_bind(field,'ModifyControl',function(args){
			var contentElement = $(args.Wrapper).find('input')[0] || args.Wrapper.firstChild;
			if (!contentElement) return;
			$(contentElement).addClass('aa_has_validations');
			aa_bind(contentElement,'validation',function(validationObject) {
				if (aa_bool(args.FieldData,profile,'ValidationLogic',context)) {
					validationObject.passed = false;
					validationObject.errorMessage = aa_text(args.FieldData,profile,'ErrorMessage',context);
				}
			},'');
		},'');	
	}
});

aa_gcs("app_feature",{
	ValidationStyle: function(profile,data,context) {
		var bctx = context.vars._AppContext[0];

		var style = aa_first(data,profile,'Style',context);
	
		var validationStyle = aa_renderStyleObject(style,{},context,true,{
				funcName: 'init'
		}).jbApiObject;

		validationStyle.$el.removeClass(validationStyle.elem_class);
		bctx.ValidationStyle2 = validationStyle;

		aa_bind(bctx,'showPage',function(args) {
			$(args.el).addClass(validationStyle.elem_class);
		});
	}
});

function aa_checkValidations(topElement,noMandatoryChecks)
{
	// https://docs.google.com/a/artwaresoft.com/document/d/1o6Uv_k3rlnm-Wp_Z7-oRVaAbfAYHcbecHzr39_0gNbU/edit#heading=h.bgjp8atg2ug5

	var validationStyle = aa_findValidationStyle(topElement);
	validationStyle.clearErrors(validationStyle,topElement);

	var scrollToMargins = validationStyle.scrollMargins || { top: 30, bottom: 30 };

	var firstTime = true;
	var elems = $(topElement).find('.aa_has_validations');
	
	var passed = true;
	var errors = [];

	for(var i=0;i<elems.length;i++) {
		var elem = elems[i];
		var errorObject = {
			passed: true,
			element: elem
		};
		aa_trigger(elem,'validation',errorObject);
		if (noMandatoryChecks && errorObject.mandatoryFailure) errorObject.passed = true;
		
		if (!errorObject.passed) {
			if (firstTime) {
				aa_scrollToShowElement(elem,'',scrollToMargins);
				firstTime = false;
			}
			validationStyle.showValidationError(validationStyle,topElement,errorObject);
			passed = false;
			errors.push(errorObject);
		}
	}
	if (!passed) {
		validationStyle.showErrorSummary(validationStyle,topElement,errors);
	}
	return passed;
}

function aa_findValidationStyle(elem) {
	if ($(elem).hasClass('aa_validation_style')) return elem.jbValidationStyle;
	var parent = $(elem).closest('.aa_validation_style')[0];
	if (parent) return parent.jbValidationStyle;

	var bctx = aa_find_bart_context(elem);
	if (bctx && bctx.ValidationStyle2) return bctx.ValidationStyle2;

	if (!ajaxart.defaultValidationStyle) {
		var el = $('<div/>')[0];
		ajaxart.defaultValidationStyle = {
			el: el,
			$el: $(el)
		};
		aa_initValidationStyle(ajaxart.defaultValidationStyle,{});	
	}
	
	return ajaxart.defaultValidationStyle;
}

function aa_initValidationStyle(validationStyle,settings) {
	settings = aa_defaults(settings,{
		clearErrors: function(validationStyle,topElement) {
			$(topElement).find('.aa_error').removeClass('aa_error');
			$(topElement).find('.aa_error_message').remove();			
			$(topElement).find('.aa_validation_error').remove();			
		},
		showValidationError: function(validationStyle,topElement,errorObject) {
			var elem = errorObject.element;
			if (aa_isArray(elem)) {
				for(var i=0;i<elem.length;i++)
					this.showValidationError(validationStyle,topElement,$.extend({},errorObject,{element: elem[i]}))
				return;
			}
			var messageDiv = $(validationStyle.el.cloneNode(true)).addClass('aa_error_message').text(errorObject.errorMessage);
			elem.parentNode.appendChild(messageDiv[0]);

			elem.jbValidationMessage = messageDiv;
			$(elem).addClass('aa_error');

			if (!elem.jbValidationFocusEventBound) {
				elem.jbValidationFocusEventBound = true;
				if (elem.tabIndex == -1) elem.tabIndex = 1;

				$(elem).add($(elem).find("input")).add($(elem).find("textarea")).add($(elem).find(".aa_picklist_div")).focus(function() {
					$(elem).removeClass('aa_error');
					if (elem.jbValidationMessage)
						aa_remove(elem.jbValidationMessage,true);
					validationStyle.clearErrorSummary(validationStyle,topElement);
				});
			}
		},
		clearErrorSummary: function(validationStyle,topElement) {
		},
		showErrorSummary: function(validationStyle,topElement,errors) {			
		}
	});

	validationStyle.clearErrors = settings.clearErrors;
	validationStyle.showValidationError = settings.showValidationError;
	validationStyle.showErrorSummary = settings.showErrorSummary;
	validationStyle.clearErrorSummary = settings.clearErrorSummary;
	validationStyle.scrollMargins = settings.scrollMargins;	
}
