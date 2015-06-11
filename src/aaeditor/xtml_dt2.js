ajaxart.load_plugin("xtml_dt", "plugins/aaeditor/xtml_dt2.xtml");
ajaxart.load_plugin("xtml_dt", "plugins/aaeditor/xtml_field_tree.xtml");

aa_gcs("xtml_dt2", {
	ComponentParams: function(profile, data, context) {
		var xtml = aa_first(data, profile, 'Xtml', context);
		if (!xtml) return [];
		var def = aa_component_definition(xtml.getAttribute('t'));
		var params = aa_xpath(def, 'Param');
		var isAdvanced = aa_text(data, profile, 'BasicOrAdvanced', context) == 'advanced';

		var out = [];

		for (var i = 0; i < params.length; i++) {
			if (params[i].getAttribute('hidden') == 'true' || params[i].getAttribute('light') == 'false' || params[i].getAttribute('deprecated') == 'true') continue;

			var paramAdvanced = aa_xtmldt_is_advanced_param(xtml, params[i]);
			if (paramAdvanced == isAdvanced) out.push(params[i]);
		}
		if (!isAdvanced && aa_hasParam(xtml,'Condition')) out.push(aa_parsexml('<Param name="Condition" />'));		
		if (!isAdvanced && aa_hasParam(xtml,'remark')) out.push(aa_parsexml('<Param name="remark" />'));
		if (!isAdvanced && aa_hasParam(xtml,'Data')) out.push(aa_parsexml('<Param name="Data" />'));		

		return out;
	},
	ParamPTOfEditor: function(profile, data, context) {
		var xtml = aa_first(data, profile, 'Xtml', context);
		var paramXml = aa_first(data, profile, 'ParamXml', context);
		if (!xtml || !paramXml || xtml.nodeType != 1) return [];
		var param = paramXml.getAttribute('name');

		var type = paramXml.getAttribute('type') || 'data.Data';

		var elem = aa_xpath(xtml, param)[0];
		if (elem && aa_hasAttribute(elem, 'value')) {
			if (aa_xpath(elem, '*').length > 0 || elem.attributes.length > 1) {
				ajaxart.log('Bad xtml - value in element value with other attributes/elements', 'error');
				return [];
			}
			xtml.setAttribute(param, elem.getAttribute('value'));
			xtml.removeChild(elem);
			return ['PrimitiveParamEditor'];
		}
		if (paramXml.getAttribute('css') === 'true') return ['CssParamEditor'];
		if (paramXml.getAttribute('primitive') === 'true') return ['PrimitiveParamEditor'];
		if (type == 'enum') return aa_xpath(xtml, param)[0] ? ['PrimitiveParamEditor'] : ['EnumParamEditor'];
		if (type == 'dynamic_enum_multi') return aa_xpath(xtml, param)[0] ? ['PrimitiveParamEditor'] : ['MultiEnumParamEditor'];
		if (type == 'data.Boolean') {
			if (paramXml.getAttribute('script') === 'true') return ['PrimitiveParamEditor'];
			var val = xtml.getAttribute(param);
			if (!val || val == 'false' || val === 'true') return ['BooleanParamEditor'];
			return ['PrimitiveParamEditor'];
		}
		if (paramXml.getAttribute('slider') && !elem) return ['SliderParamEditor'];
		if (type == 'data.Data') return ['PrimitiveParamEditor'];

		if (aa_hasAttribute(xtml, param)) return ['PrimitiveParamEditor'];

		if (type.indexOf('[]') > -1) return ['TgpArrayParamEditor'];

		return ['TgpTypeParamEditor'];
	},
	ProfileParamEditor: function(profile, data, context) {
		var xtml = aa_first(data, profile, 'Xtml', context);
		var paramXml = aa_first(data, profile, 'ParamXml', context);
		var paramType = aa_totext(ajaxart.runNativeHelper(data, profile, 'TypeOfParam', context));
		aa_xtmldt2_copyDefaultValues(xtml, paramXml,paramType);
		var ctx = aa_ctx(context, {
			Xtml: [xtml],
			ParamXml: [paramXml]
		});

		var customEditorField = aa_xpath(paramXml, 'EditorField')[0] || aa_xpath(paramXml, 'Field')[0];
		if (customEditorField) var out = ajaxart.run([xtml], customEditorField, '', ctx);
		else {
			var pt = 'xtml_dt2.' + paramType;
			var profileXml = aa_parsexml('<xtml t="' + pt + '" Xtml="%$Xtml%" ParamXml="%$ParamXml%" />');
			var out = ajaxart.run(data, profileXml, '', ctx, null, false, true); // no dtsupport - for alt-n
			ajaxart.runNativeHelper(data, profile, 'FieldAspects', aa_ctx(ctx, {
				_Field: out
			}));
		}

		aa_bind(out[0], 'ModifyInstanceContext', function(args) {
			args.Context.vars.XtmlDTField = out;
			args.Context.vars.XtmlDTFieldData = args.FieldData;
		});

		return out;
	},
	FireFieldOnUpdate: function(profile, data, context) {
		var xtmlDtField = aa_var_first(context, 'XtmlDTField');
		if (xtmlDtField) {
			var field_data = context.vars.XtmlDTFieldData || [];
			aa_invoke_field_handlers(xtmlDtField.OnUpdate, aa_var_first(context, 'ControlElement'), null, xtmlDtField, field_data, {});
		}
	},
	IsParamPrimitiveValue: function(profile, data, context) {
		var xtml = aa_first(data, profile, 'Xtml', context);
		var paramXml = aa_first(data, profile, 'ParamXml', context);
		var param = paramXml.getAttribute('name');

		return aa_frombool(aa_hasAttribute(xtml, param) || !aa_xpath(xtml, param)[0]);
	},
	IsGlobalStyle: function(profile, data, context) {
		var xtml = aa_first(data, profile, 'Xtml', context);
		if (!xtml) return [];

		var comp = aa_component_definition(xtml.getAttribute('t'));
		if (comp && comp.getAttribute('customAAEditor') == 'true') return [];
		var type = comp && comp.getAttribute('type');
		var typeDef = type && ajaxart.types[type.replace('.', '_')];

		var t = comp && aa_totext(aa_xpath(comp, 'xtml/@t'));
		if (t == 'ui.CustomStyle' || t == 'ui.CustomStyleByField') return ['true'];
	},
	XtmlAutoSuggestObject: function(profile, data, context) {
		var autoSuggest = {
			context: context,
			xtml: aa_first(data, profile, 'Xtml', context),
			param: aa_first(data, profile, 'ParamXml', context).getAttribute('name'),
			ensurePreview: function() {
				if (this.preview_context) return;

				this.preview_context = aadt_calcPrimitivePreviewContext(this.xtml, this.param, this.context);
				if (this.preview_context && this.preview_context.length == 0) {
					var ctx = ajaxart.newContext();
					ctx.vars._GlobalVars = context.vars._GlobalVars;
					this.preview_context = [{
						Input: [],
						OrigData: [],
						Output: [],
						context: ctx
					}];
				}
				if (!this.preview_context) {
					var itemToFocus = {
						ParentXtml: [this.xtml],
						Field: [this.param]
					};
					this.preview_context = aa_run_component("xtml_dt.CalcPreviewForXtml", [itemToFocus], context);
				}
				this.FirstInput = this.preview_context && this.preview_context[0] && this.preview_context[0].Input && this.preview_context[0].Input[0];
			},
			refreshOutputPreview: function() {
				try {
					if (!this.inputControl) return;
					var previewText = '';
					var value = this.xtml.getAttribute(this.param);
					if (value && value.indexOf('%') > -1) {
						this.preview_context = null;
						this.ensurePreview();
						previewText = aa_totext(this.preview_context[0].Output);
					}
					$(this.inputControl).closest('.fld_paramEditorAsTextbox').find('.fld_xtml_expression_preview').text(previewText);
				} catch (e) {}
			},
			expressionValue: function() {
				return this.xtml.getAttribute(this.param);
			},
			Select: function(data1, ctx) {
				var expression = aa_totext(data1);
				var input = this.inputControl;
				var pos = input.selectionEnd;
				var isInner = false;

				while (pos > 0) {
					var char1 = input.value.charAt(pos - 1);
					if (char1 == '{') isInner = true;
					if (char1 == '%' || char1 == '/' || char1 == '{') break;
					pos--;
				}
				var closeExpression = true;
				var exp = input.value.substring(input.value.lastIndexOf('%', input.selectionEnd) + 1, pos) + expression;
				var output = ajaxart.dynamicText([autoSuggest.FirstInput], '%' + exp + '%', autoSuggest.context)[0];
				if (output && output.nodeType == 1) if (output.attributes.length > 0 || aa_xpath(output, '*')[0]) closeExpression = false;

				if (output && !output.nodeType) {
					for (var x in output)
					if (output.hasOwnProperty(x)) closeExpression = false;
				}

				input.value = input.value.substring(0, pos) + expression;
				input.focus();

				if (closeExpression) {
					var closeChar = !isInner ? '%' : '}';
					input.value = input.value + closeChar;
				} else {
					input.value = input.value + '/';
					input.jbOpenSuggestPopup();
				}

				if (input.jbApiObject && input.jbApiObject.setValue) input.jbApiObject.setValue(input.value);
				this.refreshOutputPreview();
			},
			SelectFromCtrlSpace: function(data1, ctx) {
				var expression = aa_totext(data1);
				var input = this.inputControl;
				input.value = input.value + '%' + expression + '%';
				input.focus();
				if (input.jbApiObject && input.jbApiObject.setValue) input.jbApiObject.setValue(input.value);

				this.refreshOutputPreview();
			}
		};

		return [autoSuggest];
	},
	PrimitiveTextboxAutoSuggestions: function(profile, data, context) {
		var field = context.vars._Field[0];
		var canEditLarge = aa_bool(data, profile, 'EditInLargePopup', context);

		aa_bind(field, 'ModifyControl', function(args) {
			var input = $(args.Wrapper).find('input')[0];
			if (!input) input = $(args.Wrapper).find('textarea')[0];
			if (!input) return;

			var ctx = aa_merge_ctx(context, args.Context, {
				ControlElement: [input]
			});
			var autoSuggest = aa_var_first(ctx, 'XtmlAutoSuggest');
			input.jbXtml = autoSuggest.xtml;
			var prev_value = '';
			autoSuggest.inputControl = input;

			input.jbOpenSuggestPopup = function() {
				if (input.value.indexOf('%') == -1) return;
				var isAtEnd = input.selectionEnd == input.value.length;
				if (isAtEnd) {
					var arr = input.value.split('%');
					if (arr.length % 2 == 1) return closePopups(); // we want an odd number of %

					var expressionSoFar = arr[arr.length - 1];
					if (expressionSoFar.indexOf('{') > -1) {
						expressionSoFar = expressionSoFar.substring(expressionSoFar.lastIndexOf('{') + 1);
					}

					autoSuggest.ExpressionSoFar = expressionSoFar;
					aa_xtmldt2_calc_autoSuggestOptions(autoSuggest);

					if (!autoSuggest.SuggestOptions.length) return closePopups();
					else {
						var nativeHelper = shouldOpenTree(autoSuggest,expressionSoFar) ? 'SuggestionsTreeWhileTexting' : 'SuggestionsWhileTexting';
						ajaxart.runNativeHelper([expressionSoFar], profile, nativeHelper , ctx);
					}
				}
			};

			$(input).click(function(e) {
				if (canEditLarge) {
					//				 if(input.value.length > 30 || e.ctrlKey) 
					if (e.ctrlKey) 
						return ajaxart.runNativeHelper(data, profile, 'OpenEditLargePopup', aa_ctx(context, { ControlElement: [input] }));
				}

				setTimeout(function() {
					autoSuggest.preview_context = null;
					autoSuggest.refreshOutputPreview();
				}, 10);
			});

			$(input).keyup(function(e) {
				if (e.keyCode == 13) {
					$('.aa_item_xtmldt_suggest.aa_selected').click();
					return;
				}
				if (e.keyCode == 27) return closePopups(); // esc
				if (e.keyCode == 38 || e.keyCode == 40) return;

				if (prev_value == input.value) return;
				input.jbOpenSuggestPopup();
			});
			$(input).keydown(function(e) {
				if (e.keyCode == 38 || e.keyCode == 40) { // move down/up
					var selected = $('.aa_item_xtmldt_suggest.aa_selected');
					var newSelected = e.keyCode == 38 ? selected.prev() : selected.next();
					if (newSelected[0]) {
						var cntr = newSelected.closest('.fld_xtmldt_suggest')[0].jbApiObject.cntr;
						cntr.SetNewSelected(newSelected[0]);
					}
					aa_stop_prop(e);
				}

				if (e.ctrlKey && e.keyCode == 32) { // ctrl-space
					aa_stop_prop(e);
					autoSuggest.ensurePreview();
					if (autoSuggest.FirstInput && autoSuggest.FirstInput.nodeType == 1) ajaxart.runNativeHelper(data, profile, 'CtrlSpaceXml', ctx);
				}
				prev_value = autoSuggest.expressionValue();
			});
		}, 'PrimitiveTextboxAutoSuggestions');

		function closePopups() {
			ajaxart.runNativeHelper([], profile, 'CloseSuggestionsWhileTexting', context);
		}

		function shouldOpenTree(autoSuggest,expressionSoFar) {
			var lastExpression = expressionSoFar;
			if (expressionSoFar.indexOf('/') > -1) lastExpression = expressionSoFar.split('/').pop();
			if (lastExpression != '') return false;
			if (autoSuggest.SuggestOptions.isXmlTree) return tree;
			return false;
		}
	}
});

function aa_xtmldt2_calc_autoSuggestOptions(autoSuggest) {
	autoSuggest.SuggestOptions = [];
	autoSuggest.ensurePreview();

	var input = autoSuggest.FirstInput;
	if (!input && autoSuggest.ExpressionSoFar.indexOf('$') == -1) return;

	var startText = autoSuggest.ExpressionSoFar;

	var lastSlashPos = autoSuggest.ExpressionSoFar.lastIndexOf('/');
	if (lastSlashPos > -1) {
		var baseExpression = autoSuggest.ExpressionSoFar.substring(0, lastSlashPos);
		input = ajaxart.dynamicText([autoSuggest.FirstInput], '%' + baseExpression + '%', autoSuggest.context)[0];
		if (!input) return;
		startText = autoSuggest.ExpressionSoFar.split('/').pop();
	} else {
		if (startText.indexOf('$') == 0) {
			// variables
			var vars = {};
			aa_extend(vars, autoSuggest.preview_context[0].context.vars);
			aa_extend(vars, autoSuggest.preview_context[0].context.params);

			var globals = autoSuggest.preview_context[0].context.vars._GlobalVars[0];
			startText = startText.substring(1).toLowerCase();

			for (var global in globals) {
				if (globals.hasOwnProperty(global) && global.toLowerCase().indexOf(startText) == 0) autoSuggest.SuggestOptions.push({
					Expression: '$' + global,
					Preview: ''
				})
			}
			for (var varName in vars) {
				if (vars.hasOwnProperty(varName) && varName.toLowerCase().indexOf(startText) == 0) autoSuggest.SuggestOptions.push({
					Expression: '$' + varName,
					Preview: ''
				})
			}
			return;
		}
	}
	if (!input.nodeType) {
		startText = startText.toLowerCase();
		// an object - not an xml
		for (var property in input) {
			if (input.hasOwnProperty(property) && property.toLowerCase().indexOf(startText) == 0) {
				var previewText = '' + input[property];
				if (previewText == '[object]') previewText = '';
				if (previewText.length > 20) previewText = previewText.substring(0, 20) + '...';
				autoSuggest.SuggestOptions.push({
					Expression: property,
					Preview: previewText
				})
			}
		}

	}
	if (input.nodeType == 1) {
		// attributes
		if (startText == '' || startText.indexOf('@') == 0) {
			for (var i = 0; i < input.attributes.length; i++) {
				var attrName = input.attributes.item(i).name;
				if (attrName.toLowerCase().indexOf(startText.toLowerCase().substring(1)) == 0) autoSuggest.SuggestOptions.push({
					Expression: '@' + attrName,
					Preview: input.getAttribute(attrName)
				})
			}
		}

		// elements
		var children = aa_xpath(input, '*');
		var tags = [];

		for (var i = 0; i < children.length; i++) {
			var tag = children[i].tagName;
			if (tags[tag]) continue;
			tags[tag] = true;
			if (tag.toLowerCase().indexOf(startText.toLowerCase()) == 0) {
				var val = aa_cdata_value(children[i]) || ajaxart.xml.innerTextStr(children[i]);

				autoSuggest.SuggestOptions.push({
					Expression: tag,
					Preview: val
				});
			}
		}
	}
}

function aa_xtmldt2_copyDefaultValues(xtml, paramXml,paramType) {
	var param = paramXml.getAttribute('name');
	if (!aa_hasParam(paramXml, 'Default') || aa_hasParam(xtml, param)) {
		if (aa_hasAttribute(xtml,param) && !xtml.getAttribute(param))
			xtml.removeAttribute(param);	// cleanup of the xtml
		
		return;
	}
	if (aa_hasAttribute(paramXml, 'Default')) {
		if (paramType != 'PrimitiveParamEditor' && paramType != 'EnumParamEditor')	// do not copy the attribute, let only the ui show it
			xtml.setAttribute(param, paramXml.getAttribute('Default'));
		else {
			if (aa_hasAttribute(xtml,param) && xtml.getAttribute(param) == paramXml.getAttribute('Default'))
				xtml.removeAttribute(param);	// cleanup of the xtml
		}
		
	} else {
		var defaultElem = aa_xpath(paramXml, 'Default')[0];
		if (defaultElem.getAttribute('value')) xtml.setAttribute(param, defaultElem.getAttribute('value'));
		if (defaultElem) {
			var child = xtml.ownerDocument.createElement(param);
			xtml.appendChild(child);
			ajaxart.xml.copyElementContents(child, defaultElem);
		}
	}
}

aa_gcs("xtml_field_tree", {
	FieldTreeSubItems: function(profile, data, context) {
		var thisNS = this;
		var parent = data[0];
		if (!parent) return;

		var out = [];
		if (parent.nodeType != 1) return out;

		var subFields = aa_xpath(parent, 'Field');
		for (var i = 0; i < subFields.length; i++)
		out.push(subFields[i]);

		if (parent.getAttribute('t') == 'control.Page') {
			var pageDefXtml = aa_xpath(aa_component_definition(aa_xpath_text(parent, 'Page/@t')), 'xtml')[0];
			if (pageDefXtml) out.push(pageDefXtml);
		}

		// look for t="field.InnerPage", or t="control.Page"
		var innerPage = findInnerPage(parent);
		if (innerPage) out.push(innerPage);

		out.SubItems = function(item) {
			return thisNS.FieldTreeSubItems(profile, [item], context); // recursive call
		};

		return out;

		function findInnerPage(node) {
			for (var iter = node.firstChild; iter != null; iter = iter.nextSibling) {
				if (iter.nodeType != 1 || iter.tagName == 'Field' || iter.tagName == 'xtml') continue;
				var t = iter.getAttribute('t');
				if (t == 'field.InnerPage' || t == 'control.Page') return iter;
				var found = findInnerPage(iter);
				if (found) return found;
			}
			return null;
		}
	}
});