ajaxart.load_plugin("", "plugins/gstudio/gstudio.xtml");
ajaxart.load_plugin("", "plugins/gstudio/gstudio_mainmenu.xtml");
ajaxart.load_plugin("", "plugins/gstudio/gstudio_toolbar.xtml");
ajaxart.load_plugin("", "plugins/gstudio/gstudio_styles.xtml");
ajaxart.load_plugin("", "plugins/gstudio/gstudio_css_dt.xtml");
ajaxart.load_plugin("", "plugins/gstudio/gstudio_insert.xtml");
ajaxart.load_plugin("", "plugins/gstudio/gstudio_select.xtml");
ajaxart.load_plugin("", "plugins/gstudio/gstudio_popups.xtml");
ajaxart.load_plugin("", "plugins/gstudio/gstudio_floating_popups.xtml");
ajaxart.load_plugin("", "plugins/googledrive/google_drive.xtml");
ajaxart.load_plugin("", "plugins/gstudio/gstudio_deploy.xtml");
ajaxart.load_plugin("", "plugins/gstudio/google_drive_app.xtml");
ajaxart.load_plugin("plugins", "plugins/plugins.xtml");

aa_gcs("gstudio", {
	StudioObject: function(profile, data, context) {
		var type = window.jbStudioType || ajaxart.urlparam('type') || 'widget';
		var widgetID = ajaxart.urlparam('widget');
		var urlHash = window.location.href.split('#')[1] || '';

		var autoTestsMode = aa_urlHashValue('gautotests') == 'true';
		var currentPage = aa_urlHashValue('gpage') || 'main';
		var storage = window.gstudioStorage || 'localhost';

		var studio = {
			WidgetID: widgetID,
			Storage: storage,
			IsGoogleStudio: true,
			Type: type,
			DisableSave: storage == 'samples',
			InLocalHost: window.location.href.indexOf('http://localhost') === 0,
			Load: function() {
				if (this.Storage == 'localhost') return aa_gstudio_loadInLocalhost(this);
				if (this.Storage == 'jbartdb') return aa_gstudio_loadInJbartDB(this);
				if (this.Storage == 'google drive') return aa_gstudio_loadInGoogleDrive(this);
				if (this.Storage == 'samples') return aa_gstudio_loadInSamples(this);
				if (this.Storage == 'asp') return aa_gstudio_loadInASP(this);
			},
			Save: function() {
				if (!this.WidgetXml) return;
				aa_gstudio_clean_widget_xml(this.WidgetXml);
				if (this.Storage == 'localhost') return aa_gstudio_saveInLocalhost(this);
				if (this.Storage == 'jbartdb') return aa_gstudio_saveInJbartDB(this);
				if (this.Storage == 'google drive') return aa_gstudio_saveInGoogleDrive(this);				
				if (this.Storage == 'asp') return aa_gstudio_saveInASP(this);
			},
			New: function(data1, ctx) {
				if (this.Storage == 'localhost') return aa_gstudio_newInLocalhost(this, aa_totext(data1));
			},
			Delete: function() {
				if (this.Storage == 'localhost') return aa_gstudio_deleteInLocalhost(this);
			},
			LoadWidgetList: function() {
				return aa_gstudio_loadListInLocalhost(this);
			},
			StrongRefresh: function() {
				aa_refresh_field(['studio_for_strong_refresh'], 'screen', false, null, context);
			},
			Refresh: function() {
				aa_refresh_field(['gstudio_widget_preview'], 'screen', false, null, context);
			},
			SetWidgetXml: function(widgetXml) {
				this.WidgetXml = widgetXml;
				this.WidgetXmlClone = ajaxart.xml2text(widgetXml);
			},
			AutoTestsMode: autoTestsMode,
			SetAutoTestsMode: function(mode) {
				var modeBool = aa_tobool(mode);
				this.AutoTestsMode = modeBool;
				this.AutoTestsMode ? aa_setUrlHashValue('gautotests', this.AutoTestsMode) : aa_removeUrlHashValue('gautotests');
			},
			CurrentPage: currentPage
		};
		if (this.Storage != 'google drive') {
			var instanceID = ajaxart.urlparam('instance');
			if (instanceID) aa_instance_editor_init_studio(studio,instanceID);
		}

		if (studio.Type == 'crawler') aa_crawler_studio_init_studio(studio);

		return [studio];
	},
	StudioVariables: function(profile, data, context) {
		var field = context.vars._Field[0];

		aa_bind(field, 'ModifyInstanceContext', function(args) {
			var studio = args.Context.vars._JBartStudio[0];

			var newctx;
			if (studio.Type == 'crawler') 
				newctx = aa_crawler_create_context(studio);
			else 
				newctx = aa_create_jbart_context({ WidgetXml: studio.WidgetXml, Context: args.Context	});

			args.Context.vars._AppContext = newctx.vars._AppContext;
			args.Context.vars._GlobalVars = newctx.vars._GlobalVars;
			args.Context.vars._WidgetXml = newctx.vars._WidgetXml;
			args.Context.vars._UIPref = newctx.vars._UIPref;
			args.Context.vars.Language = newctx.vars.Language;

			studio.AppContext = newctx.vars._AppContext[0];
			aa_trigger(studio,'appContext');
			
			jBart.studiobar = jBart.studiobar || {};
			jBart.studiobar.context = args.Context;

			window.aa_search_comp_of_type_cache = null;
			window.ajaxart_comp_of_type_cache = null;
			jBart.vars.compsOfTypeCache = null;
			ajaxart.cache = {};

			window.onbeforeunload = function() {
				if (studio.Storage == 'samples') return;
				if (studio.Type != 'instance' && studio.WidgetXml && studio.WidgetXmlClone != ajaxart.xml2text(studio.WidgetXml)) {
					return 'Any unsaved changes will be lost.';
				}
				if (typeof aa_save_manager != 'undefined') {
					for (i in aa_save_manager.modified)
						if (aa_save_manager.modified.hasOwnProperty(i) &&  i != "not_empty")
							return 'Any unsaved changes to jbart components will be lost.';			
				}

				var args = {};
				aa_trigger(studio,'beforeunload',args);
				if (args.result) return args.result;
			};

		});

		var studio = context.vars._JBartStudio[0];
		var jsFiles = aa_xpath(studio.WidgetXml, 'externalJS/file');

		if (jsFiles.length > 0) {
			aa_field_setAsyncActionBeforeLoad({
				field: field,
				asyncAction: function() {
					return aa_async_load_js_files(jsFiles);
				},
				loadingStyle: aa_first(data, profile, 'LoadingStyle', context),
				loadingText: aa_text(data, profile, 'LoadingText', context),
				errorText: aa_text(data, profile, 'TextForError', context)
			});
		}

		aa_bind(field, 'ModifyControl', function(args) {
			if (studio.Type == 'widget') {
				var bctx = args.Context.vars._AppContext[0];
				$(args.Wrapper).addClass(aa_attach_global_css(aa_totext(bctx.Css)));
				aa_trigger(bctx,'showPage',{ el: args.Wrapper });
			}
		});
	},
	WidgetPreview: function(profile, data, context) {
		var studio = context.vars._JBartStudio[0];
		jBart.footerHeight = 38;	// for popups in the preview
		jBart.headerHeight = studio.CollapseControls ? 50 : 120;	// for popups in the preview
		
		if (studio.WidgetPreview) return studio.WidgetPreview(data,context);
		
		return [{
			Id: 'gstudio_widget_preview',
			ID: ['gstudio_widget_preview'],
			Control: function(data1, ctx) {
				if (!ctx.vars._JBartStudio[0].WidgetXml) {
					return $('<div>Widget does not exist</div>').get();
				}
				if (studio.Type == 'crawler') return $('<div/>').get();

				var pageName = ctx.vars._JBartStudio[0].CurrentPage;
				var page;
				if (pageName) {
					var comp = pageName.indexOf('.') == -1 ? "sample." + pageName : pageName;
					page = aa_run_component(comp, [], ctx)[0];
				}
				if (!page) {
					var appXtml = ctx.vars._AppContext[0].AppXtml;
					page = aa_first([], appXtml, "MainPage1", ctx);
					if (!page && appXtml.getAttribute('t') == 'jbart.Widget') 
						page = aa_first([], appXtml, "MainPage", ctx);
				}

				if (!page) page = aa_run_component("sample.main", [], ctx)[0];

				var itemData = page.PagePreviewData ? page.PagePreviewData([], context) : [];
				if (page.PagePreviewVariable) {
					ctx = aa_ctx(ctx,{});
					for(var i=0;i<page.PagePreviewVariable.length;i++)
						ctx.vars[ page.PagePreviewVariable[i].VarName ] = page.PagePreviewVariable[i].Value;
				}

				var out = $('<div class="aa_widget" />')[0];
				if (page) aa_fieldControl({
					Field: page,
					Wrapper: out,
					Item: itemData,
					Context: ctx
				});
				else {
					$(out).append('There is an error showing widget preview');
				}
				aa_trigger(ctx.vars._AppContext[0],'showPageInStudio',{ Wrapper: out });

				return [out];
			}
		}];
	},
	CssSelectorOptions: function(profile, data, context) {
		var selected = context.vars._JBartStudio[0].SelectedFieldXtml;
		if (!selected) return;
		var styleXtml = aa_xpath(selected, 'Style')[0] || aa_xpath(selected, 'FieldType/Style')[0];
		if (!styleXtml) return;
		var styleObject = aa_first([], styleXtml, '', context);
		var css = styleXtml && styleObject.Css;
		if (!css) return;
		var cssAsXml = aa_first([css], aa_parsexml('<xtml t="css_dt.Css2Xml" />'), '', context);
		var selectors = cssAsXml ? aa_xpath(cssAsXml, 'Css/@selector') : [];
		return selectors;
	},
	SetSelectedFieldXtml: function(profile, data, context) {
		var studio = context.vars._JBartStudio[0];
		var xtml = aa_first(data,profile,'FieldXtml',context);
		aa_gstudio_setSelectedFieldXtml(studio,xtml,context);
		if (aa_altn_xtml_from_infra(xtml))
			aa_studio_bindToComponentXmlChange(xtml,context);		
	},
	ChangeCurrentSelectedCss: function(profile, data, context) {
		var selector = ajaxart.totext_item(context.vars._JBartStudio[0].CssSelector || '');
		if (!selector) return;

		var selected = context.vars._JBartStudio[0].SelectedFieldXtml;
		if (!selected) return;
		var styleXtml = aa_xpath(selected, 'Style')[0] || aa_xpath(selected, 'FieldType/Style')[0];
		var t = styleXtml && styleXtml.getAttribute('t');
		if (!t) return;
		if (t == 'ui.CustomStyleByField') return;

		if (t != 'ui.CustomStyle' && t != 'ui.CustomCss') {
			ajaxart.run([styleXtml], aa_parsexml('<xtml t="field_dt.DoCustomizeStyle" />'), '', context);
			styleXtml = aa_xpath(selected, 'Style')[0] || aa_xpath(selected, 'FieldType/Style')[0];
		}
		var css = aa_cdata_value(aa_xpath(styleXtml, 'Css')[0]);
		var cssAsXml = aa_first([css], aa_parsexml('<xtml t="css_dt.Css2Xml" />'), '', context);

		var cssEntry = aa_xpath(cssAsXml, "Css[@selector='" + selector + "']")[0];
		if (!cssEntry) return;

		ajaxart.run([cssEntry], profile, 'ChangeCssXml', context);

		var backToCss = aa_text([cssAsXml], aa_parsexml('<xtml t="css_dt.Xml2Css" />'), '', context);
		aa_write_cdata(aa_xpath(styleXtml, 'Css')[0], backToCss);

		ajaxart.run([], aa_parsexml('<xtml t="field_dt.RefreshPreview" />'), '', context);
	},
	PagePreviewWrapper: function(profile, data, context) {
		aa_bind(context.vars._Field[0],'ModifyControl',function(args) {
			var content = $(args.Wrapper.firstChild);
			content.addClass('gstudio_preview_top');
			var device = aa_page_preview_device(context);
			var studio = context.vars._JBartStudio[0];
			var currentPage = studio.CurrentPage || 'main';
			var def = aa_component_definition('sample.'+currentPage);
			if (sessionStorage && sessionStorage.PreviewZoom) {
				var zoom = parseInt(sessionStorage.PreviewZoom)/100;
				if (!isNaN(zoom))
					$(content).css("zoom",zoom);
			}
		},'PagePreviewWrapper');		
	},
	UpdateStudioCurrentCssXml: function(profile, data, context) {
		var studio = context.vars._JBartStudio[0];
		studio.CurrentCssXml = null;
		var selector = ajaxart.totext_item(context.vars._JBartStudio[0].CssSelector || '');

		var selected = context.vars._JBartStudio[0].SelectedFieldXtml;
		if (!selected) return;
		var styleXtml = aa_xpath(selected, 'Style')[0] || aa_xpath(selected, 'FieldType/Style')[0];
		if (!styleXtml) return;
		var styleObject = aa_first([], styleXtml, '', context);
		var css = styleXtml && styleObject.Css;
		if (!css) return;
		var cssAsXml = aa_first([css], aa_parsexml('<xtml t="css_dt.Css2Xml" />'), '', context);

		var cssEntry = cssAsXml && aa_xpath(cssAsXml, "Css[@selector='" + selector + "']")[0];
		studio.CurrentCssXml = cssEntry;
	},
	ToggleTopCss: function(profile, data, context) {
		var cssClass = aa_cssClass(data, profile, 'Css', context, 'gstudio');
		var body = $('body');
		if (aa_bool(data, profile, 'ShowCondition', context)) body.addClass(cssClass);
		else body.removeClass(cssClass);
	},
	UploadToGoogleDrive: function(profile, data, context) {
		function upload() {
			var content = ajaxart.xml2text(context.vars._WidgetXml[0]);
			var name = context.vars._WidgetXml[0].getAttribute("name");
		    jBart.googleDrive.saveFile(content, null, name).then(	     	
		      	function(id, properties) {
		      		window.open(encodeURI('https://jbartdrive.appspot.com/jbart.html?id='+id),'_blank');
				});
		}
		if (!jBart.googleDrive) {	// first time
			jBart.googleDrive = aa_googleDriveDoc({
		        appId: '225177759274',
		        autoOpenDoc: false,
		        onLoad: upload
  			});
		} else
			upload();

		// var widgetXml = encodeURIComponent( ajaxart.xml2text(context.vars._WidgetXml[0]) );
		// var title = encodeURIComponent( context.vars._WidgetXml[0].getAttribute('name') + ' with jBart' );
		// var url = 'https://jbartdrive.appspot.com/gdstudio.html?newdoctitle=' + title + '&newdoccontents='+widgetXml;
		// window.open(url,'_blank');
	},
	IsFieldFromSampleDataAdded: function(profile, data, context) {
		var fieldData = aa_first(data,profile,'NewFieldData',context);
		var fieldXtml = aa_first(data,profile,'ParentFieldXtml',context);

		return aa_frombool( !!aa_xpath(fieldXtml,"Field[@FieldData='"+fieldData+"']")[0] );
	},
	SelectedFieldXtml: function(profile, data, context) {
		var studio = context.vars._JBartStudio[0];

		if (!studio.SelectedFieldXtml || !isXtmlAttached(studio.SelectedFieldXtml)) {
			// set current as the current page
			var page = studio.CurrentPage;
			var bctx = context.vars._AppContext[0];
			if (!page) page = aa_totext(aa_xpath(bctx.AppXtml,'MainPage1/@t')).split('.')[1];
			page = page || 'main';

			studio.SelectedFieldXtml = aa_xpath(bctx.AppXtml,"../../Component[@id='"+page+"']/xtml")[0];
		}

		return [studio.SelectedFieldXtml];

		function isXtmlAttached(elem) {
			if (elem && elem.nodeType != 1) elem = aa_xpath(elem,'..')[0];
			if (!elem) return false;
			if (elem.getAttribute('_type') == 'jbart_project') return true;
			if (elem.tagName == 'Component') return true;
			return isXtmlAttached(elem.parentNode);
		}
	},
	TreePathOfSelected: function(profile,data,context) {
		var studio = context.vars._JBartStudio[0];
		if (!studio.SelectedFieldXtml) return [];

		return [aa_xtml_to_tree_path(studio.SelectedFieldXtml)];
	},
	AutoRefreshOnSettingsChange: function(profile,data,context) {
		var settings = aa_first(data,profile,'Settings',context);
		var styles = aa_first(data,profile,'Styles',context);
		if (!settings) return;

		aa_unbindXmlChange(ajaxart.jbSettingsChangeListener);
		ajaxart.jbSettingsChangeListener = aa_bindXmlChange(settings,function(changedXml) { 
			if (ajaxart.jbSettingsChangeTimeout) clearTimeout(ajaxart.jbSettingsChangeTimeout);
			ajaxart.jbSettingsChangeTimeout = setTimeout(function() { refresh(changedXml); },300);
		});

		aa_unbindXmlChange(ajaxart.jbStylesChangeListener);
		ajaxart.jbStylesChangeListener = aa_bindXmlChange(styles,function(changedXml) { 
			if (ajaxart.jbStylesChangeTimeout) clearTimeout(ajaxart.jbStylesChangeTimeout);
			ajaxart.jbStylesChangeTimeout = setTimeout(function() { refresh(changedXml); },300);
		});

		function refresh(changedXml) {			
			ajaxart.jbSettingsChangeTimeout = ajaxart.jbStylesChangeTimeout = 0;
			if (changedXml.nodeType == 1 && changedXml.tagName == 'css' && changedXml.getAttribute('id')) {
				// css editing
				var cssid = changedXml.getAttribute('id');
				var potentialFields = $('.jb_css_settings');
				for(var i=0;i<potentialFields.length;i++)
					if (potentialFields[i].jbCssID == cssid) {
						aa_refresh_cell(potentialFields[i],ajaxart.newContext(),null,null,true);
					}
			} else {
				ajaxart.run(changedXml ? [changedXml] : [],profile,'RefreshAction',context);
			}
		}
	}
});

aa_gcs("gstudio_popup",{	
	IsXtmlAttached: function(profile, data, context) {
		var xtml = aa_first(data,profile,'Xtml',context);
		if (isXtmlAttached(xtml)) return ['true'];
		
		function isXtmlAttached(elem) {
			if (elem && elem.nodeType != 1) elem = aa_xpath(elem,'..')[0];
			if (!elem) return false;
			if (elem.getAttribute('_type') == 'jbart_project') return true;
			if (elem.tagName == 'Component') return true;
			return isXtmlAttached(elem.parentNode);
		}
	}
});


aa_gcs("gstudio_insert",{
	MockupToInsertFieldInStudio: function(profile, data, context) {
		return [{
			Id: 'mockup',
			ID: ['mockup'],
			Title: '',
			HideTitle: true,
			HidePropertyTitle: true,
			Control: function(data1,ctx) {
				var items = ajaxart.run(data1,profile,'items',aa_merge_ctx(context,ctx));
				if (items[0]) {
					var item = [items[0]];
					aa_text(items,profile,'ItemTitle',context);
					aa_text(items,profile,'ItemExtraText',context);
					aa_text(items,profile,'ItemImage',context);
				}
				return $('<div/>').get();
			}
		}];
	},
	UsedIDs: function(profile, data, context) {
		var out = ',';

		var studio = context.vars._JBartStudio[0];
		traverse(studio.WidgetXml);

		return aa_split(out,',',true);

		function traverse(node) {
			if (node.nodeType != 1) return;
			var id = node.getAttribute('ID');
			if (id && out.indexOf(','+id+',') == -1)
				out += id+',';

			for(var iter=node.firstChild;iter;iter=iter.nextSibling) {
				traverse(iter);
			}
		}
	}
});

aa_gcs("gstudio_popup",{
	RestorePopupsState: function (profile,data,context)
	{
		var studio = context.vars._JBartStudio[0];
		var cookieId = context.vars._WidgetXml[0].getAttribute("id") + "_prop_path";
		var path = sessionStorage.jbStudioSelectedPath;

		if (path) {
			var xtml = aa_path_to_xtml(path,context);
			if (!xtml) return;
			studio.SelectedFieldXtml = xtml;

			ajaxart.runNativeHelper([xtml],profile,'RestorePopups',context);
		}
	}	
});
function aa_gstudio_loadInLocalhost(studio) {
	var deferred = $.Deferred();
	var lastIdPart = studio.WidgetID.split('/').pop();
	var url = '/widgets/'+studio.WidgetID+ '/' + lastIdPart + '.xml';
	if (studio.Type == 'crawler')
		url = '/jbart/devdb/crawler/'+studio.WidgetID+'.xml';

	if (studio.WidgetID.indexOf('/') == 0) { // the widget is not in the main GIT		
		url = '/root' + studio.WidgetID + '.xml';
	}

	url += '?_cacheKiller='+new Date().getTime();

	var ajaxCall = $.ajax({	url: url, type: 'GET'	});

	$.when(ajaxCall).then(function(result) {
		result = aa_xhr_xml_result(result);

		if (result.getAttribute('_type') != 'error') {
			studio.SetWidgetXml(result);
			aa_gstudio_convert_widget_xml(studio);
			document.title = result.getAttribute('name') + ' with jBart';
		} else {
			studio.WidgetXml = null;
			ajaxart.log('Could not load widget ' + result.getAttribute('reason'), 'error');
		}
		if (studio.Type == 'instance') {
			$.when(aa_instanceEditor_loadInstance(studio)).then(deferred.resolve,deferred.reject);
		} else
			deferred.resolve();
			
	}, deferred.reject);

	return [deferred.promise()];
}

function aa_gstudio_loadInGoogleDrive(studio) {
	document.title = window.googledrive_lib.CurrentFile.title + ' with jBart';
	var xml = aa_parsexml(window.googledrive_lib.CurrentFile.content);
	xml.setAttribute('name',window.googledrive_lib.CurrentFile.title);
	if (xml.getAttribute('_type') == 'jbart_instance') {
		aa_instanceEditor_loadInGoogleDrive(studio,xml);
	} else {
		studio.SetWidgetXml(xml);	
	}
}

function aa_gstudio_loadInASP(studio) {
	var deferred = $.Deferred();
	window.jbIISPrefix = window.jbIISPrefix || '';
	$.ajax({
		url: window.jbIISPrefix + '/api/jbart?op=get&widget='+ajaxart.urlparam('widget'),
		success: function(result) {
			result = aa_parsexml(result);
			studio.SetWidgetXml(result);
			aa_gstudio_convert_widget_xml(studio);
			document.title = result.getAttribute('name') + ' with jBart';
			deferred.resolve();
		},
		error: deferred.reject
	});
	return [deferred.promise()];
}

function aa_gstudio_saveInASP(studio) {
	var deferred = $.Deferred();

	var ajaxCall = $.ajax({
		url: window.jbIISPrefix + '/api/jbart?op=save&widget='+ajaxart.urlparam('widget'),
		type: "POST",
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		},
		cache: false,
		data: ajaxart.xml.prettyPrint(studio.WidgetXml)
	});

	$.when(ajaxCall).then(function(result) {
		result = aa_xhr_xml_result(result);
		var vid = result.getAttribute('vid');
		if (vid) studio.WidgetXml.setAttribute('vid', vid);
		studio.SetWidgetXml(studio.WidgetXml);

		deferred.resolve();
	}, deferred.reject);

	return [deferred.promise()];
}
function aa_gstudio_loadInSamples(studio) {
	var deferred = $.Deferred();
	var sampleName = ajaxart.urlparam('sample');
	$.ajax({
		url: '//storage.googleapis.com/jbartlib/studio/projects/samples/'+sampleName+'.xml',
		success: function(result) {
			result = aa_parsexml(result);
			studio.SetWidgetXml(result);
			aa_gstudio_convert_widget_xml(studio);
			document.title = result.getAttribute('name') + ' with jBart';
			deferred.resolve();
		},
		error: deferred.reject
	});
	return [deferred.promise()];
}


function aa_gstudio_loadInJbartDB(studio) {
	var deferred = $.Deferred();
	jBart.db.get({
		contentType: 'jbart_project',
		id: studio.WidgetID,
		success: function(result) {
			studio.SetWidgetXml(result);
			aa_gstudio_convert_widget_xml(studio);
			document.title = result.getAttribute('name') + ' with jBart';

			deferred.resolve();
		},
		error: deferred.reject
	});
	return [deferred.promise()];
}

function aa_gstudio_saveInLocalhost(studio) {
	if (studio.Type == 'instance') return aa_instanceEditor_saveInLocalhost(studio);
	var deferred = $.Deferred();

	var lastIdPart = studio.WidgetID.split('/').pop();
	var path = '/widgets/'+studio.WidgetID+ '/' + lastIdPart + '.xml';
	if (studio.Type == 'crawler') path = '../devdb/crawler/'+studio.WidgetID+'.xml';
	if (studio.WidgetID.indexOf('/') == 0) { // the widget is not in the main GIT		
		path = '../..' + studio.WidgetID + '.xml';
		if (window.location.href.indexOf('ryzyco_env=true') >-1)
			path = '../'+path;
	}

	var ajaxCall = $.ajax({
		url: '/?op=SaveFile&mkdir=true',
		type: "POST",
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		},
		cache: false,
		data: JSON.stringify({
			Path: path,
			Contents: ajaxart.xml.prettyPrint(studio.WidgetXml)
		})
	});

	$.when(ajaxCall).then(function(result) {
		result = aa_xhr_xml_result(result);
		var vid = result.getAttribute('vid');
		if (vid) studio.WidgetXml.setAttribute('vid', vid);
		studio.SetWidgetXml(studio.WidgetXml);

		deferred.resolve();
	}, deferred.reject);

	return [deferred.promise()];
}

function aa_gstudio_saveInGoogleDrive(studio) {
	googledrive_lib.CurrentFile.content = ajaxart.xml.prettyPrint(studio.WidgetXml);
	googledrive_lib.CurrentFile.title = studio.WidgetXml.getAttribute('name');

	aa_trigger(studio,'beforeSaveToGoogleDrive');

	return [aa_gd_saveCurrentDoc().then(function() {
		if (studio.Type != 'instance')
			studio.SetWidgetXml(studio.WidgetXml);
	})];
}


function aa_gstudio_saveInJbartDB(studio) {
	var deferred = $.Deferred();

	jBart.db.save({
		data: studio.WidgetXml,
		success: function() {
			studio.SetWidgetXml(studio.WidgetXml); // for cloning the saved widget
			deferred.resolve();
		},
		error: deferred.reject
	});

	return [deferred.promise()];
}

function aa_gstudio_newInLocalhost(studio, widgetName, prototypeID) {
	var prototype = ajaxart.runComponent('jbart_prototype.Blank')[0];

	var deferred = $.Deferred();
	var newNode = null;
	var newID = aa_string2id(widgetName);

	newNode = prototype.cloneNode(true);
	$(newNode).attr('name', widgetName).attr('id', newID).attr('vid', '1');

	saveNewNode();

	return [deferred.promise()];

	function saveNewNode() {
		var url = '/widgets/'+newID + '/' + newID+'.xml';

		// see if it exists
		$.when($.ajax({
			url: url,
			method: 'GET'
		})).then(function(result) {
			result = aa_xhr_xml_result(result);
			if (result && result.getAttribute('_type') == 'error') {
				doSaveNewNode();
			} else {
				alert('A widget by that name already exists');
				deferred.reject();
			}
		}, doSaveNewNode );
	}

	function doSaveNewNode() {
		var ajaxCall = $.ajax({
			url: '/?op=SaveFile&mkdir=true',
			type: "POST",
			headers: {
				'Content-Type': 'text/plain; charset=utf-8'
			},
			cache: false,
			data: JSON.stringify({
				Path: '/widgets/'+newNode.getAttribute('id')+ '/' + newNode.getAttribute('id') + '.xml',
				Contents: ajaxart.xml.prettyPrint(newNode)
			})
		});

		$.when(ajaxCall).then(function(result) {
			result = aa_xhr_xml_result(result);
			if (result.getAttribute('_type') != 'error') {
				window.open('?widget=' + newID, '_top');
				deferred.resolve();
			} else {
				deferred.reject();
			}

		}, deferred.reject);
	}

}

function aa_gstudio_loadListInLocalhost(studio) {
	if (studio.WidgetList) return;

	var deferred = $.Deferred();
	
	var url = '/?op=jbartProjects&dir=/widgets/';

	var ajaxCall = $.ajax({ url: url,	method: 'GET'	});

	$.when(ajaxCall).then(function(result) {
		result = aa_xhr_xml_result(result);

		studio.WidgetList = result;
		deferred.resolve();
	}, deferred.reject);

	return [deferred.promise()];
}

function aa_gstudio_deleteInLocalhost(studio) {
	if (!studio.WidgetXml) return;

	var deferred = $.Deferred();
	var ajaxCall = $.ajax({
		url: '/?op=deleteProject&file=' + studio.WidgetXml.getAttribute('id'),
		method: 'GET'
	});

	$.when(ajaxCall).then(function(result) {
		result = aa_xhr_xml_result(result);
		deferred.resolve();
	}, deferred.reject);

	return [deferred.promise()];
}

function aa_gstudio_convert_widget_xml(studio) {
	var i;
	if (!studio.WidgetXml) return;
	if (!aa_xpath(studio.WidgetXml, 'bart_dev')[0]) return;

	var useTheNewFormat = true;
	if (!useTheNewFormat) return; // not yet :-)

	var doc = studio.WidgetXml.ownerDocument;
	var $current = $(studio.WidgetXml);
	var newWidgetXml = doc.createElement('file');

	var atts = studio.WidgetXml.attributes;
	for (i=0;i<atts.length; i++) {
		var attName = atts.item(i).nodeName;
		newWidgetXml.setAttribute(attName, studio.WidgetXml.getAttribute(attName));
	}

	var xtml = doc.createElement('xtml');
	xtml.setAttribute('ns', 'sample');
	newWidgetXml.appendChild(xtml);

	var currentApp = aa_xpath(studio.WidgetXml, "bart_dev/db/bart_unit/bart_unit/Component[@id='App']/xtml")[0];

	// create <Component id="Widget" ... >
	var widgetComponent = doc.createElement('Component');
	xtml.appendChild(widgetComponent);
	$(widgetComponent).attr('id', 'Widget').attr('type', 'jbart.Widget');
	var widgetImp = doc.createElement('xtml');
	widgetComponent.appendChild(widgetImp);
	$(widgetImp).attr('t', 'jbart.Widget');

	// copy main page
	var mainPageName = aa_totext(aa_xpath(currentApp, 'MainPage1/@t')) || aa_totext(aa_xpath(currentApp, '@MainPage')) || 'main';
	var pageElem = doc.createElement('MainPage');
	if (mainPageName.indexOf('sample.') != 0) mainPageName = 'sample.' + mainPageName;
	$(pageElem).attr('t', mainPageName);
	widgetImp.appendChild(pageElem);

	// copy resources
	var currentResources = aa_xpath(currentApp, 'Resources/Resource');
	for (i = 0; i < currentResources.length; i++) {
		var newElem = doc.createElement('DataResource');
		ajaxart.xml.copyElementContents(newElem, currentResources[i]);
		widgetImp.appendChild(newElem);
	}

	// copy app features
	var currentAppFeatures = aa_xpath(currentApp, 'ApplicationFeature');
	for (i = 0; i < currentAppFeatures.length; i++) {
		widgetImp.appendChild(currentAppFeatures[i]);
	}


	// convert old pages
	var oldPages = aa_xpath(currentApp, 'Pages/Page');
	for (i = 0; i < oldPages.length; i++) {
		var newElem = doc.createElement('Component');
		$(newElem).attr('id',oldPages[i].getAttribute('ID')).attr('type','jbart.MyWidgetPage');
		var pageXtml = doc.createElement('xtml');
		newElem.appendChild(pageXtml);
		ajaxart.xml.copyElementContents(pageXtml, oldPages[i]);
		xtml.appendChild(newElem);
	}

	// copy components
	var currentComponents = aa_xpath(studio.WidgetXml, 'bart_dev/db/bart_unit/bart_unit/Component');
	for (i = 0; i < currentComponents.length; i++) {
		var comp = currentComponents[i];
		if (comp.getAttribute('id') == 'App') continue;
		xtml.appendChild(comp);
	}

	// copy other elements (tests,embed,url, etc.)
	var children = aa_xpath(studio.WidgetXml, '*');
	for (i = 0; i < children.length; i++) {
		var tag = children[i].tagName;
		if (tag == 'bart_dev' || tag == 'url') continue;
		var nodeCopy = doc.createElement(tag);
		ajaxart.xml.copyElementContents(nodeCopy, children[i]);

		newWidgetXml.appendChild(nodeCopy);
	}

	studio.SetWidgetXml(newWidgetXml);
}

function aa_gstudio_setSelectedFieldXtml(studioObject,selectedFieldXtml,context) {
	studioObject.SelectedFieldXtml = selectedFieldXtml;
	sessionStorage.jbStudioSelectedPath = aa_xtml_to_path(selectedFieldXtml);
	aa_refresh_field(['studio_main_toolbar'],'screen', false, null, context);
}

function aa_xtml_to_tree_path(xtml) {
	var path = "";
	var ctx = ajaxart.newContext();
	for (current=xtml; current!=null && current.nodeType == 1; current=current.parentNode) {
		var tag = aa_tag(current);
		var t = current.getAttribute('t');
		if (tag != 'Field' && tag != 'xtml' && t !='field.InnerPage') continue;
		var innerPath = aa_totext( aa_run_component('gstudio_popup.TreeItemText',[current],ctx) );
		if (path != "") path = "/" + path;
		path = innerPath + path;
		if (tag == 'xtml' || tag == 'Page') break;
	}
	return path;	
}

function aa_gstudio_clean_widget_xml(widgetxml) {
	try {
		var xtmls = aa_xpath(widgetxml,'xtml/Component/xtml');

		for(var i=0;i<xtmls.length;i++)
			clean_xtml(xtmls[i]);
	} catch(e) {
		ajaxart.logException('error while cleaning xtml',e);
	}

	function clean_xtml(xtml) {
		for(var child = xtml.firstChild;child;child=child.nextSibling) {
			if (child.nodeType ==3 && aa_totext([child]).match(/^\s*$/) ) {
				xtml.removeChild(child);
				return clean_xtml(xtml);
			}
			if (child && child.nodeType == 1) clean_xtml(child);
		}
	}	
}

function aa_page_preview_device(context) {
	if (!context.vars._JBartStudio) return null;
	var studio = context.vars._JBartStudio[0];
	var currentPage = studio.CurrentPage || 'main';
	var def = aa_component_definition('sample.'+currentPage);
	var fieldAspectXtml = aa_xpath(def,"xtml/FieldAspect[@t='field_aspect.PagePreviewDevice']")[0];
	if (fieldAspectXtml)
		return aa_first([],fieldAspectXtml,'Device',context);
}
