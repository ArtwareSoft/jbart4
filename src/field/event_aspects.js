ajaxart.load_plugin("field", "plugins/field/event_aspects.xtml");

aa_gcs("field_feature", {
	HandleEvent: function(profile, data, context) {
		var eventAction = {
			run: function(data1, ctx) {
				var ctx2 = aa_merge_ctx(context, ctx);
				if (ctx2.vars.EventAction) delete ctx2.vars.EventAction;
				ajaxart.run(data1, profile, 'Action', ctx2);
			}
		};
		ajaxart.run(data, profile, 'Event', aa_ctx(context, {
			EventAction: [eventAction]
		}));
	},
	Update: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'OnUpdate', function(field, field_data, input, e, extra) {
			var ctx1 = (input && input.ajaxart) ? aa_merge_ctx(context, input.ajaxart.params) : context;
			var parent_elem = jQuery(input).parents('.aa_item')[0];
			var item = parent_elem && parent_elem.ItemData;
			var newContext = aa_ctx(ctx1, {
				_Field: [field],
				_FieldData: field_data,
				_Input: [input],
				ControlElement: [input],
				_Item: item || []
			});
			if (extra) newContext = aa_ctx(newContext, extra);

			context.vars.EventAction[0].run(field_data, newContext);
		});
	},
	Click: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'ModifyControl', function(cell, field_data, cell_presentation, ctx, item) {
			cell.onclick = function(e) {
				if (window.aa_incapture) return;
				context.vars.EventAction[0].run(field_data, aa_ctx(ctx, {
					ControlElement: [cell.firstChild || cell],
					_DomEvent: [e]
				}));
			};
		}, 'MouseClick');
	},
	Blur: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'OnBlur', function(field, field_data, input, e, extra) {
			var newContext = aa_ctx(context, {
				_Field: [field],
				_FieldData: field_data,
				_Input: [input],
				ControlElement: [input]
			});
			context.vars.EventAction[0].run(field_data, newContext);
		});
	},
	KeyDown: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'OnKeydown', function(field, field_data, input, e, extra) {
			var newContext = aa_ctx(context, {
				_Field: [field],
				_FieldData: field_data,
				_Input: [input],
				ControlElement: [input]
			});
			if (extra && extra.KeyCode) newContext.vars.KeyCode = extra.KeyCode;
			if (extra && extra.CtrlKey) newContext.vars.CtrlKey = extra.CtrlKey;
			context.vars.EventAction[0].run(field_data, newContext);
		});
	},
	KeyUp: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'OnKeyup', function(field, field_data, input, e, extra) {
			var newContext = aa_ctx(context, {
				_Field: [field],
				_FieldData: field_data,
				_Input: [input],
				ControlElement: [input]
			});
			if (extra && extra.KeyCode) newContext.vars.KeyCode = extra.KeyCode;
			if (extra && extra.CtrlKey) newContext.vars.CtrlKey = extra.CtrlKey;
			context.vars.EventAction[0].run(field_data, newContext);
		});
	},
	EnterPressed: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'OnKeyup', function(field, field_data, input, e, extra) {
			if (aa_totext(extra.KeyCode) != 13 || aa_tobool(extra.CtrlKey)) return;
			var newContext = aa_ctx(context, {
				_Field: [field],
				_FieldData: field_data,
				_Input: [input],
				ControlElement: [input]
			});
			if (extra && extra.KeyCode) newContext.vars.KeyCode = extra.KeyCode;
			context.vars.EventAction[0].run(field_data, newContext);
		});
	},
	CtrlEnterPressed: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'OnKeyup', function(field, field_data, input, e, extra) {
			if (aa_totext(extra.KeyCode) != 13 || !aa_tobool(extra.CtrlKey)) return;
			var newContext = aa_ctx(context, {
				_Field: [field],
				_FieldData: field_data,
				_Input: [input],
				ControlElement: [input]
			});
			if (extra && extra.KeyCode) newContext.vars.KeyCode = extra.KeyCode;
			context.vars.EventAction[0].run(field_data, newContext);
		});
	},
	ControlAttached: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'ModifyControl', function(cell, field_data, cell_presentation, ctx, item) {
			aa_addOnAttachMultiple(cell, function() {
				context.vars.EventAction[0].run(field_data, aa_ctx(ctx,{ ControlElement: [cell.firstChild || cell] }));
			});
		}, 1000);
	},
	BeforeRenderingControl: function(profile, data, context) {
		aa_bind(context.vars._Field[0], 'ModifyInstanceContext', function(args) {
			context.vars.EventAction[0].run(args.FieldData, aa_merge_ctx(context, args.Context));
		});
	},
	AfterRenderingControl: function(profile, data, context) {
		aa_bind(context.vars._Field[0], 'ModifyControl', function(args) {
			context.vars.EventAction[0].run(args.FieldData, aa_merge_ctx(context, args.Context, { ControlElement: [args.Wrapper.firstChild || args.Wrapper]} ));
		});
	},
	Load: function(profile, data, context) {
		context.vars.EventAction[0].run(data, context);
	},
	Focus: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'OnFocus', function(field, field_data, input, e, extra) {
			var newContext = aa_ctx(context, {
				_Input: [input],
				ControlElement: [input]
			});
			context.vars.EventAction[0].run(field_data, newContext);
		});
	},
	MouseOver: function(profile, data, context) {
		aa_field_handler(context.vars._Field[0], 'ModifyControl', function(cell, field_data, cell_presentation, ctx, item) {
			cell.onmouseover = function() {
				if (!cell.isInside) {
					context.vars.EventAction[0].run(field_data, aa_ctx(ctx, {
						ControlElement: [cell]
					}));
				}
				cell.isInside = true;
			};
			cell.onmouseout = function() {
				cell.isInside = false;
			};
		}, 'MouseOver');
	}

});