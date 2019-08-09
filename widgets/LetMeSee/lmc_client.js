ajaxart.load_plugin("","../widgets/LetMeSee/lmc_client.xtml");

aa_gcs("lmc_client",{
	CreateLMCSite: function(profile,data,context) {
		var siteName = aa_text(data,profile,'SiteName',context);
		var industry = aa_text(data,profile,'Industry',context);

    $.ajax({url: '/LetMeSee/?op=createClient'}).then(function(clientInfo) {
      clientInfo = aa_parsexml(clientInfo);
      if (clientInfo.getAttribute('type') == 'error') return fail();

      var clientID = clientInfo.getAttribute('client');
      var clientKey = clientInfo.getAttribute('key');

      clientSettings = '<settings name="'+siteName+'" industry="'+industry+'" lmcVersion="'+jbLMCLatestVersion+'" lmcManagerVersion="'+jbLMCManagerLatestVersion+'" fullAccessUsers="'+jbUserEmail+'">';
      clientSettings += '<users><user id="'+jbUserEmail+'" /></users><group id="547" name="'+siteName+' All" projects="*" users=""/></settings>';
			
			aa_lmcApi_ServerLog_SiteCreated(clientID,siteName,'Industry='+industry);

      $.ajax({
          url: '/LetMeSee/?op=clientSaveFile&client='+clientID+'&file='+'settings_'+clientKey+'.xml'+'&key='+clientKey,
          type: 'POST',
          headers: { 'Content-Type': 'text/plain; charset=utf-8'  },
          data: clientSettings
      }).then(function() {
	      setTimeout(function() {	// the timeout is for the log to end
	      	window.location.href = 'https://jb-letmesee.appspot.com/letmesee_group.html?group=547&site='+clientID;
	      },500);
      },fail);
    },fail);

    function fail() {
    	
    }
	},
	LMCInitClient: function(profile,data,context) {
		var driveFile = aa_var_first(context,'DriveFile');
		var deferred = $.Deferred();

		var driveFile = aa_var_first(context,'DriveFile');
		if (driveFile.getAttribute('name')) document.title = driveFile.getAttribute('name');
		
		$.when(aa_lmcApi_syncServerTime(),ensureClientExists()).then(function() {
			$.when(loadSettings(),loadUserCount()).then(function() {
				var settings = aa_var_first(context,'Settings');
				if (!settings.getAttribute('lmcVersion')) {
					settings.setAttribute('lmcVersion',window.jbLMCLatestVersion||'');
					aa_triggerXmlChange(settings);
				}
				if (!settings.getAttribute('lmcManagerVersion')) {
					settings.setAttribute('lmcManagerVersion',window.jbLMCManagerLatestVersion||'');
					aa_triggerXmlChange(settings);
				}
				deferred.resolve();
			},deferred.reject);
		},deferred.reject);

		window.jbDebugResource = function(varName) { // for debug
			return aa_var_first(ctx,varName);
		};

		return [deferred.promise()];

		function loadUserCount() {
			var deferred2 = $.Deferred();
			aa_lmc_loadAppFile(context,aa_lmc_initFileObj(context,{
				name: 'client_user_count',
				DataResourceName: 'UserCount',
				projectID: 'clients/'+ aa_var_first(context,'DriveFile').getAttribute('id'),
				filePath: 'usercount.xml',
				autoSave: false,
				loadCanFail: true
			})).then(deferred2.resolve,function() {
				aa_var_first(context,'UserCount').setAttribute('count','0');
				deferred2.resolve();
			});
			return deferred2.promise();
		}

		function loadSettings() {
			var key = aa_var_first(context,'DriveFile').getAttribute('key');
			return aa_lmc_loadAppFile(context,aa_lmc_initFileObj(context,{
				name: 'client_settings',
				DataResourceName: 'Settings',
				projectID: 'clients/'+ aa_var_first(context,'DriveFile').getAttribute('id'),
				filePath: 'settings_'+key+'.xml',
				autoSave: true,
				isClient: true,
				clientID: aa_var_first(context,'DriveFile').getAttribute('id'),
				clientKey: key,
				autoSaveUserMessage: function() { return 'Settings auto saved'; }
			}));
		}

		function ensureClientExists() {
			if (window.jbGoogleDriveDocument && driveFile.getAttribute('name') != jbGoogleDriveDocument.title && !ajaxart.jbart_studio) {
					driveFile.setAttribute('name',jbGoogleDriveDocument.title);
					jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(driveFile);
					jbGoogleDriveDocument.save();				
			}
			if (driveFile.getAttribute('id')) return $.Deferred().resolve().promise();

			var deferred2 = $.Deferred();

			$.when(aa_lmcApi_createClient({})).then(function(clientInfo) {
				var clientID = clientInfo.getAttribute('client');
				var clientKey = clientInfo.getAttribute('key');
				driveFile.setAttribute('id',clientID);
				driveFile.setAttribute('key',clientKey);
				if (window.jbGoogleDriveDocument && !ajaxart.jbart_studio) {
					jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(driveFile);
					jbGoogleDriveDocument.save();
				}

				aa_lmcApi_clientSaveFile({
					client: clientID,
					key: clientKey,
					file: 'settings_'+clientKey+'.xml',
					content: '<settings/>'
				}).then(deferred2.resolve,deferred2.reject);
				
			},function() {
				// TODO: add server error
				deferred.reject();
			});
			return deferred2.promise();
		}
	},
	CreateProjectFromClient: function(profile,data,context) {
		var projectName = aa_text(data,profile,'ProjectName',context);
		var allowedUsers = aa_text(data,profile,'AllowedUsers',context);

		var deferred = $.Deferred();
		if (!projectName) return deferred.reject().promise();

		var clientID = aa_text(data,profile,'ClientID',context);
		var clientSettings = aa_first(data,profile,'ClientSettings',context);;

		aa_lmcApi_createProject({}).then(function(projectInfo) {
			var projectSettings = aa_parsexml('<settings/>');
			$(projectSettings).attr('clientID',clientID).attr('name',projectName);
			var projectID = projectInfo.getAttribute('project');
			var projectKey = projectInfo.getAttribute('key');
			$.when(aa_lmcApi_saveFile({
				project: projectID,
				key: projectKey,
				file: 'settings_'+projectKey+'.xml',
				content: ajaxart.xml2text(projectSettings)
			}),aa_lmcApi_saveFile({
				project: projectID,
				key: projectKey,
				file: 'roomHeaders_' + projectKey + '.xml',
				content: '<headers/>'
			}),aa_lmcApi_saveFile({
				project: projectID,
				key: projectKey,
				file: 'archive/roomHeaders_' + projectKey + '.xml',
				content: '<headers/>'
			})).then(function() {
				var projectXml = aa_parsexml('<project/>');
				$(projectXml).attr('id',projectID).attr('key',projectKey).attr('name',projectName).attr('users',allowedUsers);
				if (clientID != "demo") {
					// add the project to the list
					aa_xml_appendChild(clientSettings,projectXml);
					aa_triggerXmlChange(clientSettings);
					aa_run([projectXml],profile,'DoOnNewProject',context);
					deferred.resolve();
				} else {
					var url = '/LetMeSee/?op=addDemoProject&projectID='+projectID+'&projectKey='+projectKey+'&projectName='+encodeURIComponent(projectName);
					$.ajax({url: url}).then(function(result) {
			    	result = aa_parsexml(result);
			    	if (result.getAttribute('type') == 'success') {
			    		aa_run([projectXml],profile,'DoOnNewProject',context);
							deferred.resolve();
						} else {
							deferred.reject();
						}
			    });
				}
			},deferred.reject);
		},function() {
			deferred.reject();
		});

		return [deferred.promise()];
	}
});
