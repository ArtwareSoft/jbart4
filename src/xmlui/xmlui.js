ajaxart.load_plugin("xmlui");

aa_gcs("xmlui",{
	CallUpdateOfCodeMirror: function(profile, data, context) {
		var iframe = ajaxart.getControlElement(context, true);
		if (iframe != null && iframe.contentWindow != null) {
			var txt = iframe.contentWindow.editor.getCode();
			if (iframe.getAttribute("type") == "css") txt = txt.replace(/\n/g, '/*nl*/');
			ajaxart_update(iframe, txt);
		}
	},
	InsertTextToCodeMirror: function(profile, data, context) {
		var wrapper = ajaxart.getControlElement(context, true);
		if (!wrapper || !wrapper.jbCodeMirrorEditor) {
			ajaxart.log("InsertTextToCodeMirror: Cannot find codemirror", "error");
			return;
		}
		wrapper.jbCodeMirrorEditor.replaceSelection(aa_text(data, profile, 'Text', context));
	},
	CodeMirrorTextarea: function(profile, data, context) {
		// return [ aa_codemirror({}) ];
		var text = ajaxart.run(data, profile, 'Text', context);
		var type = aa_text(data, profile, 'Type', context);
		var width = aa_text(data, profile, 'Width', context);
		var height = aa_text(data, profile, 'Height', context);
		var useResizing = aa_bool(data, profile, 'Resizer', context);
		var autoIntent = aa_bool(data, profile, 'AutoIndent', context);
		if (useResizing) {
			var identifier = aa_text(data, profile, 'IdentifierToRecallLastSize', context);
			jBart.vars.codeMirrorSizes = jBart.vars.codeMirrorSizes || {};
			var lastSize = jBart.vars.codeMirrorSizes[identifier];
			if (lastSize) {
				width = lastSize.width + 'px';
				height = lastSize.height + 'px';
			}
		}
		var mode = '';
		switch (type) {
			case 'xml':
				mode = 'xml';
				break;
			case 'js':
				mode = 'javascript';
				break;
			case 'css':
				mode = 'css';
				break;
			case 'html':
				mode = 'htmlmixed';
				break;
		}
		var settings = {
			value: aa_totext(text),
			mode: mode,
			lineNumbers: aa_bool(data, profile, 'LineNumbers', context),
			lineWrapping: aa_bool(data, profile, 'TextWrapping', context),
			readOnly: aa_bool(data, profile, 'ReadOnly', context),
			autofocus: aa_bool(data, profile, 'AutoFocus', context),
			height: height,
			width: width,
			extraKeys: {
				"Ctrl-Enter": function(editor) {
					ajaxart.run([editor.getValue()], profile, 'OnCtrlEnter', context);
				},
				"Shift-Enter": function(editor) {
					ajaxart.run([editor.getValue()], profile, 'OnShiftEnter', context);
				},
				"Ctrl-I": function(editor) {
					var cursorPos = editor.getCursor(true);
					indent(editor);
					editor.setCursor(cursorPos);
					editor.setSelection(cursorPos);
				}
			},
			onchange: function(editor) {
				ajaxart.writevalue(text, editor.getValue());
				ajaxart.run(text, profile, 'OnUpdate', aa_ctx(context, {
					ControlElement: [wrapper]
				}));
			},
			oninit: function(editor) {
				if (autoIntent)
					indent(editor);
				if (aa_bool(data, profile, 'Resizer', context)) {
					setTimeout(function() {
						aa_addResizer(wrapper, {
							onResize: function(width, height) {
								jBart.vars.codeMirrorSizes[identifier] = jBart.vars.codeMirrorSizes[identifier] || {};
								jBart.vars.codeMirrorSizes[identifier].width = width;
								jBart.vars.codeMirrorSizes[identifier].height = height;
								editor.setSize(width, height);
							}
						});
					}, 20);
				}
			}
		};

		if (aa_bool(data, profile, 'ShowJavascriptErrorsOnCtrlSpace', context) && mode == 'javascript') aa_showJsErrorsOnCodeMirror(settings);

		if (aa_bool(data, profile, 'EnableFullScreen', context)) aa_enableFullScreenForCodeMirror(settings);

		var wrapper = aa_codemirror(settings);
		jQuery(wrapper).addClass(aa_attach_global_css(aa_text(data, profile, 'Css', context), null, 'codemirror_wrapper'));
		return [wrapper];

		function indent(editor) {
			if (mode == 'css')
				editor.setValue(css_beautify(editor.getValue(), { indent_size: 2 }).replace(/\n\n/g,'\n').replace(/: /g,':'));
			if (mode == 'javascript')
				editor.setValue(js_beautify(editor.getValue(), { indent_size: 2 }).replace(/\n\n/g,'\n'));
			if (mode == 'xml')
				editor.setValue(html_beautify(editor.getValue(), { indent_size: 2}).replace(/\n\n/g,'\n'));			
		}
	}
});

function aa_codemirror(settings) {
	var wrapper = document.createElement('div');

	if (!window.CodeMirror)
		console.error('CodeMirror lib is not loaded: https://codemirror.net/');

	init();
	// var cssList = [ aa_base_lib() + '/codemirror-3.2/codemirror4jbart.css' ];
	// var jsList = [ aa_base_lib() + '/codemirror-3.2/codemirror4jbart.js', aa_base_lib() + '/codemirror-3.2/js-beautify-jbart.min.js'];
	// $.when( aa_loadLib("codemirror", cssList , jsList) ).then( init );

	jQuery(wrapper).css({
		height: settings.height,
		width: settings.width
	}); // to give the right size untill code mirror is loaded
	settings.extraKeys = settings.extraKeys || {};
	settings.extraKeys["Ctrl-Space"] =	 function(cm) {
		if (settings.mode == 'javascript') CodeMirror.showHint(cm, CodeMirror.javascriptHint);
		if (settings.mode == 'xml') CodeMirror.showHint(cm, CodeMirror.xmlHint);
	};
	settings.extraKeys["Ctrl-H"] = 'replace';

	function init() {
		aa_addOnAttachMultiple(wrapper, function() {
			var editor = CodeMirror(wrapper, settings);
			var width = settings.width;
			var height = settings.height;

			if (settings.resizer && sessionStorage['jbCodeMirrorResizerWidth' + settings.identifier]) {
				width = sessionStorage['jbCodeMirrorResizerWidth' + settings.identifier];
				height = sessionStorage['jbCodeMirrorResizerHeight' + settings.identifier];
			}
			editor.setSize(width, height);
			wrapper.style.height = '';
			wrapper.style.width = '';
			if (settings.onchange) editor.on("change", settings.onchange);
			editor.setOption("theme", "solarized light");

			// jQuery(wrapper).removeClass('aa_dialog_not_ready');
			wrapper.jbCodeMirrorEditor = editor;
			aa_fixTopDialogPosition(); // Sometimes the dialog position changes becuase of codemirror size
			editor.refresh(); // When codemirror in open and not visible, it needs a refresh when becomes visible

			if (settings.oninit) settings.oninit(editor);
			if (settings.resizer) initResizer(wrapper, editor);
			if (settings.mode == 'xml') addXmlValidation(wrapper,editor);
		});
	}

	// jQuery(wrapper).addClass('aa_dialog_not_ready');	// marking the dialog as not ready to wait for code mirror to load
	return wrapper;

	function initResizer(wrapper, editor) {
		aa_addResizer(wrapper.firstChild, {
			onResizeEnd: function(width, height) {
				sessionStorage['jbCodeMirrorResizerWidth' + settings.identifier] = width;
				sessionStorage['jbCodeMirrorResizerHeight' + settings.identifier] = height;
			}
		});
	}

	function addXmlValidation(wrapper,editor) {
		$(wrapper).addClass('aa_has_validations');
		aa_bind(wrapper,'validation',function(validationObject) {
			var error = [];
			aa_parsexml(editor.getValue(),"",error,true);
			if (aa_totext(error)) {
				validationObject.passed = false;
				validationObject.errorMessage = 'xml parsing error: ' + aa_totext(error);
			}
		},'CodeMirrorXmlValidation');

	}
};

function aa_enableFullScreenForCodeMirror(cmSettings, settings) {
	settings = settings || {};
	jQuery.extend(settings, {
		escText: "<span>Press ESC or F11 to exit full screen</span>",
		escCss: '#this { cursor:default; text-align: center; width: 100%; position:absolute; top:0px; left:0px; font-family: arial; font-size: 11px; color: #a00; padding: 2px 5px 3px; } #this:hover { text-decoration: underline; }',
		escHeight: 20,
		fullScreenBtnHtml: '<div><img title="Full Screen (F11)" src="http://png-1.findicons.com/files/icons/1150/tango/22/view_fullscreen.png"/></div>',
		fullScreenBtnCss: "#this { position:absolute; bottom:5px; right:5px; -webkit-transition: opacity 1s; z-index: 20; } #this.hidden { opacity:0; } ",
		editorCss: "#this { position:relative; }",
		fullScreenEditorCss: "#this { display: block; position: fixed !important; top: 0; left: 0; z-index: 9999; }",
		lineNumbers: true
	});
	var prevOnInit = cmSettings.oninit;
	var prevOverflow = document.documentElement.style.overflow;
	cmSettings.oninit = function(editor) {
		if (prevOnInit) prevOnInit(editor);
		var jEditorElem = jQuery(editor.getWrapperElement()).addClass(aa_attach_global_css(settings.editorCss));
		var prevLineNumbers = editor.getOption("lineNumbers");
		var jFullScreenButton = jQuery(settings.fullScreenBtnHtml).addClass(aa_attach_global_css(settings.fullScreenBtnCss)).appendTo(jEditorElem)
			.addClass('hidden').click(function() {
			switchMode();
		});
		jEditorElem.
		mouseover(function() {
			jFullScreenButton.removeClass('hidden');
		}).
		mouseout(function() {
			jFullScreenButton.addClass('hidden');
		});
		var fullScreenClass = aa_attach_global_css(settings.fullScreenEditorCss + "#this { padding-top: " + settings.escHeight + "px; }");

		function onresize() {
			var screen_size = aa_screen_size();
			editor.setSize(screen_size.width, screen_size.height - settings.escHeight);
			// jEditorElem.height( aa_document_height() + 'px' );
		}

		function switchMode(onlyBackToNormal) {
			if (jEditorElem.hasClass(fullScreenClass)) {
				jEditorElem.removeClass(fullScreenClass);
				window.removeEventListener('resize', onresize);
				document.documentElement.style.overflow = prevOverflow;
				editor.setOption("lineNumbers", prevLineNumbers);
				editor.setSize(cmSettings.width, cmSettings.height);
				editor.refresh();
				jEditorElem[0].jEsc.remove();
			} else if (!onlyBackToNormal) {
				jEditorElem.addClass(fullScreenClass);
				window.addEventListener('resize', onresize);
				onresize();
				document.documentElement.style.overflow = "hidden";
				if (settings.lineNumbers) editor.setOption("lineNumbers", true);
				editor.refresh();
				var jEsc = jQuery(settings.escText).addClass(aa_attach_global_css(settings.escCss)).click(function() {
					switchMode(true)
				});
				jEditorElem.append(jEsc);
				jEditorElem[0].jEsc = jEsc;
				editor.focus();
			}
		}
		editor.addKeyMap({
			"F11": function(editor) {
				switchMode();
			},
			"Esc": function(editor) {
				switchMode(true);
			}
		});
	}
}

function aa_showJsErrorsOnCodeMirror(cmSettings, settings) {
	var errorCss = (settings && settings.errorCss) ? settings.errorCss :
		"#this { font-family: arial; font-size: 10px; background: #ffa; color: #a00; padding: 2px 5px 3px; }" +
		"#this .icon { color: white; background-color: red; font-weight: bold; border-radius: 50%; padding: 0 3px; margin-right: 7px;}";

	var prevOnChange = cmSettings.onchange;
	cmSettings.onchange = function(editor) {
		if (prevOnChange) prevOnChange(editor);
		// cleaning error on every change
		editor.jbWidgets = editor.jbWidgets || [];
		for (var i = 0; i < editor.jbWidgets.length; ++i)
		editor.removeLineWidget(editor.jbWidgets[i]);
	}
	cmSettings.extraKeys = cmSettings.extraKeys || {};
	var prevCtrlEnter = cmSettings.extraKeys["Ctrl-Enter"];
	cmSettings.extraKeys["Ctrl-Enter"] = function(editor) {
		editor.jbWidgets = editor.jbWidgets || [];
		for (var i = 0; i < editor.jbWidgets.length; ++i)
		editor.removeLineWidget(editor.jbWidgets[i]);
		jBart.onJsError = function(e, js) {
			if (js != editor.getValue()) return; // not our error
			var stack = e.stack;
			var message = stack.split("\n")[0];
			var line = stack.match(/<anonymous>:([0-9]+)/);
			if (line && line.length > 1) line = parseInt(line[1]);
			line = line || 1;

			var jText = $('<span class="text"></span>').text(message);
			var jErr = $('<div><span class="icon">!</span></div>').append(jText).addClass(aa_attach_global_css(errorCss));

			editor.jbWidgets.push(editor.addLineWidget(line - 1, jErr[0], {
				coverGutter: false,
				noHScroll: true,
				above: true
			}));
		}
		if (prevCtrlEnter) prevCtrlEnter(editor);
		jBart.onJsError = null;
	}
}