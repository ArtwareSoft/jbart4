ajaxart.load_plugin("", "plugins/jbartapp/instance_editor.xtml");

aa_gcs("gstudio_googledrive",{
	WidgetLatestVersion: function(profile,data,context) {
		var widget = aa_text(data,profile,'Widget',context);
		if (widget == 'LetMeSee') return [window.jbLMCLatestVersion || '23-12-13_3'];
	}	
});

aa_gcs("instance_editor",{
	InstanceEditorObject: function(profile,data,context) {
		return [{
			Settings: window.jbInstanceSettings.Settings,
			SettingsClone: ajaxart.xml2text(window.jbInstanceSettings.Settings),
			WidgetXml: window.jbInstanceSettings.WidgetXml,
			Save: function(data1,ctx) {
				var deferred = $.Deferred();

				jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(this.Settings);
				jbGoogleDriveDocument.title = this.Settings.getAttribute('name');

				this.SettingsClone = ajaxart.xml2text(this.Settings);

				$.when(jbGoogleDriveDocument.save()).then(deferred.resolve,deferred.reject);

				return [deferred.promise()];					
			}
		}];
	},
	InstanceEditorVariables: function(profile,data,context) {
		var field = context.vars._Field[0];
		var studio = context.vars._InstanceEditor[0];

		aa_bind(field, 'ModifyInstanceContext', function(args) {
			var newctx = aa_create_jbart_context({ WidgetXml: studio.WidgetXml, Context: args.Context	});

			args.Context.vars._AppContext = newctx.vars._AppContext;
			args.Context.vars._GlobalVars = newctx.vars._GlobalVars;
			args.Context.vars._WidgetXml = newctx.vars._WidgetXml;
			args.Context.vars._UIPref = newctx.vars._UIPref;
			args.Context.vars.Language = newctx.vars.Language;

			newctx.vars._GlobalVars[0].Settings = function() {
				return [studio.Settings];
			};

			studio.AppContext = newctx.vars._AppContext[0];
			aa_trigger(studio,'appContext');
			
			window.onbeforeunload = function() {
				if (studio.SettingsClone != ajaxart.xml2text(studio.Settings)) {
					return 'Any unsaved changes will be lost.';
				}
			};
		});
	},
	InstancePreview: function(profile,data,context) {
		var studio = context.vars._InstanceEditor[0];
		jBart.headerHeight = 120;	// for popups in the preview
		
		return [{
			Id: 'instance_widget_preview',
			ID: ['instance_widget_preview'],
			Control: function(data1, ctx) {
				var page = aa_run_component("sample.main", [], ctx)[0];
				
				var out = $('<div class="aa_widget" />')[0];
				aa_fieldControl({
					Field: page,
					Wrapper: out,
					Item: [],
					Context: ctx
				});
				return [out];
			}
		}];
	},
	NewInstanceBlankDocument: function(profile,data,context) {
		var deferred = $.Deferred();
		var widget = aa_text(data,profile,'Widget',context);
		var baseUrl = aa_text(data,profile,'WidgetBaseUrl',context);
		var version = aa_text(data,profile,'Version',context);

		var computedBaseUrl = baseUrl || '//jbartlib.appspot.com/apps';

		var xml = aa_parsexml('<xml />');
		if (widget)
			xml.setAttribute('_widget',widget);
		xml.setAttribute('_version',version);
		if (baseUrl) xml.setAttribute('deploy_WidgetBaseUrl',baseUrl);
		return [ajaxart.xml2text(xml)];
	}
});

function aa_instance_editor_init_studio(studio,instanceID) {
	aa_extend(studio,{
		Type: 'instance',
		InstanceID: instanceID,
		InnerInstanceXml: function() {
			var appContext = studio.AppContext;
			var xml = aa_var_first(studio.AppContext.context,'Settings');
			if (!xml) alert('widget cannot support instances');
			return [xml];
		},
		SetInstanceXml: function(instanceXml) {
			var xml= this.InnerInstanceXml()[0];
			ajaxart.xml.copyElementContents(xml,instanceXml);
			this.WidgetXml.setAttribute('name',xml.getAttribute('name')||'');
			this.SettingsXmlClone = ajaxart.xml2text(instanceXml);
		}
	});

	if (instanceID && !studio.WidgetID) {
		$.when(aa_instanceEditor_loadInstance(studio,true)).then(function(instanceXml) {
			var widget = instanceXml.getAttribute('_widget');
			var url = window.location.href.split('?')[0] + '?widget='+widget+'&instance='+ajaxart.urlparam('instance');
			window.location.href = url;
		});
	}	

	aa_bind(studio,'beforeSaveToGoogleDrive',function() {
		var xml = studio.InnerInstanceXml()[0];
		xml.setAttribute('name',studio.WidgetXml.getAttribute('name')||'');

		jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(xml);
		jbGoogleDriveDocument.title = xml.getAttribute('name');
		studio.SettingsXmlClone = ajaxart.xml2text(xml);
	});

	aa_bind(studio,'beforeunload',function(args) {
		if (studio.SettingsXmlClone != ajaxart.xml2text(studio.InnerInstanceXml()[0])) {
			args.result = 'Any unsaved changes will be lost.';
		}
	});
}

function aa_instanceEditor_loadInstance(studio,loadOnly) {
	var deferred = $.Deferred();
	var url = '/jbart/devdb/instance/'+studio.InstanceID+'.xml';

	if (studio.InstanceID.indexOf('/') == 0) { // the instance is not in the main GIT		
		url = '/root' + studio.InstanceID + '.xml';
	}
	url += '?_cacheKiller='+new Date().getTime();

	var ajaxCall = $.ajax({	url: url, type: 'GET'	});

	$.when(ajaxCall).then(function(result) {
		result = aa_xhr_xml_result(result);

		if (!loadOnly) {
			if (result.getAttribute('_type') != 'error') {
				studio.loadedInstanceXml = result;
				document.title = result.getAttribute('name') + ' with jBart instance editor';
			} else {
				ajaxart.log('Could not load instance ' + result.getAttribute('reason'), 'error');
				alert('could not load instance');
			}
		}
		deferred.resolve(result);
	}, deferred.reject);

	aa_bind(studio,'appContext',function() {
		studio.SetInstanceXml(studio.loadedInstanceXml);
	});
	return deferred.promise();	
}

function aa_instanceEditor_loadInGoogleDrive(studio,docxml) {
	var widget = docxml.getAttribute('_widget');
	var version = docxml.getAttribute('_version');
	var baseUrl = docxml.getAttribute('deploy_WidgetBaseUrl');
	if (!window.jBartInstanceEditor) {
		var url = window.location.href + '&widget='+widget+'&widget_version='+version;
		if (baseUrl) url += '&widget_baseurl='+encodeURIComponent(baseUrl);

		aa_empty(document.body);
		window.location.href = url;			// redirect
	} else {
		// we might need a redirect anyway
		if (ajaxart.urlparam('widget') != widget || ajaxart.urlparam('widget_version') != version || ajaxart.urlparam('widget_baseurl') != baseUrl) {
			var state = ajaxart.urlparam('state');
			var url = window.location.href.split('?')[0] + '?state='+state + '&widget='+widget+'&widget_version='+version;
			if (baseUrl) url += '&widget_baseurl='+encodeURIComponent(baseUrl);

			aa_empty(document.body);
			window.location.href = url;			// redirect
		}
	}
	
  var widgetID = (RegExp('widget=(.+?)(&|$)').exec(location.search)||[])[1] || '';
	studio.WidgetID = widgetID;
	var widgetXml = aa_parsexml(window['jBartWidget_'+widgetID]);
	studio.SetWidgetXml(widgetXml);
	aa_instance_editor_init_studio(studio,jBartInstanceEditor.id);
	studio.loadedInstanceXml = docxml;

	aa_bind(studio,'appContext',function() {
		studio.SetInstanceXml(studio.loadedInstanceXml);
	});

}

function aa_instanceEditor_saveInLocalhost(studio) {
	var deferred = $.Deferred();

	var path = '../devdb/instance/'+studio.InstanceID+'.xml';
	if (studio.InstanceID.indexOf('/') == 0) { // the instance is not in the main GIT		
		path = '../..' + studio.InstanceID + '.xml';
	}

	studio.InnerInstanceXml()[0].setAttribute('name',studio.WidgetXml.getAttribute('name')||'');

	var instanceXml = studio.InnerInstanceXml()[0];
	var ajaxCall = $.ajax({
		url: '/?op=SaveFile',
		type: "POST",
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		},
		cache: false,
		data: JSON.stringify({
			Path: path,
			Contents: ajaxart.xml.prettyPrint(instanceXml)
		})
	});

	$.when(ajaxCall).then(function(result) {
		result = aa_xhr_xml_result(result);
		var vid = result.getAttribute('vid');
		if (vid) instanceXml.setAttribute('vid', vid);
//		studio.SetInstanceXml(instanceXml);

		deferred.resolve();
	}, deferred.reject);

	return [deferred.promise()];	
}