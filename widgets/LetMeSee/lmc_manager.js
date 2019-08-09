ajaxart.load_plugin("", "../widgets/LetMeSee/lmc_manager.xtml");

aa_gcs("lmc_manager", {
	LoadSiteSettingsFromManager: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];
		if (!appContext.lmcSiteSettingsFile) {
			appContext.lmcSiteSettingsFile = aa_lmc_initFileObj(context,{
				name: 'site_file',
				DataResourceName: 'SiteFile',
				projectID: 'clients/' + aa_var_first(context,'Projects').getAttribute('site'),
				filePath: 'settings_'+aa_var_first(context,'Projects').getAttribute('key')+'.xml',
				isClient: true,
				clientID: aa_var_first(context,'Projects').getAttribute('site'),
				clientKey: aa_var_first(context,'Projects').getAttribute('key'),
				autoSave: false
			});
			aa_bind(appContext.lmcSiteSettingsFile,'loadFile',function() {
				aa_setDataResource(context,'SiteSettings',aa_xpath(aa_var_first(context,'SiteFile'),'siteSettings'));
			});
		}
		return [$.when(aa_lmc_loadAppFile(context,appContext.lmcSiteSettingsFile),loadUserCount())];

		function loadUserCount() {
			var deferred2 = $.Deferred();
			aa_lmc_loadAppFile(context,aa_lmc_initFileObj(context,{
				name: 'client_user_count',
				DataResourceName: 'UserCount',
				isClient: true,
				projectID: 'clients/' + aa_var_first(context,'Projects').getAttribute('site'),
				filePath: 'usercount.xml',
				autoSave: false,
				loadCanFail: true
			})).then(deferred2.resolve,function() {
				aa_var_first(context,'UserCount').setAttribute('count','0');
				deferred2.resolve();
			});
			return deferred2.promise();
		}

	},
	SaveSiteSettingsFromManager: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];
		if (!appContext.lmcSiteSettingsFile) return;

		// check if we do not remove our own permissions
		var siteSettings = aa_var_first(context,'SiteFile');
		var groupID = aa_var_first(context,'Projects').getAttribute('groupID');
		var groupPermissions = aa_xpath_text(siteSettings,'group[#'+groupID+']/@users').split(',');
		if (groupPermissions.indexOf(jbUserEmail) == -1 && jbUserEmail.indexOf('artwaresoft') == -1) {
			var allAccess = (siteSettings.getAttribute('fullAccessUsers') + ',' + siteSettings.getAttribute('lmcReps')).split(',');
			if (allAccess.indexOf(jbUserEmail) == -1) {
				aa_logError('Could not save site settings and removing our own permissions');
				return [$.Deferred().reject().promise()];
			}
		}		

		var deferred = $.Deferred();
		aa_lmc_saveAppFile(context,appContext.lmcSiteSettingsFile).then(function() {
			deferred.resolve();
			var siteID = aa_var_first(context,'Projects').getAttribute('site');
			$.ajax({url: '/LetMeSee/?op=updateUserProjectIndex&site=' + siteID });
		},deferred.reject);

		return [deferred.promise()];
	},
	AgentTrackingFileToSessions: function(profile, data, context) {
		var lines = aa_run(data,profile,'Lines',context);
		var out = [];
		var lastSession = null;

		for(var i=0;i<lines.length;i++) {
			var line = aa_totext( [lines[i]] );
			if (!line) continue;
			var lineTime = line.split('|')[0];
			if (lastSession) {
				if (lineTime - lastSession.endTime > 1000*60*60) {
					out.push(lastSession);
					lastSession = null;
				}
			}
			if (!lastSession) lastSession = {	lines: [], startTime: lineTime };
			lastSession.lines.push(line);
			lastSession.endTime = lineTime;
		}
		if (lastSession) out.push(lastSession);
		return out;
	},
	LoadProspect: function(profile, data, context) {
		if (ajaxart.jbart_studio) return;
		var deferred = $.Deferred();
		var file = aa_text(data,profile,'ProspectFile',context);
		var allProspects = aa_var_first(context,'AllProspects');
		var prospect = aa_xpath(allProspects,'prospect[#'+file+']',true)[0];

		aa_lmcApi_getFile('prospects/data',file).then(function(result,gen) {
			prospect.setAttribute('generation',gen);
			while(prospect.firstChild) prospect.removeChild(prospect.firstChild);
			aa_xml_appendChild(prospect,aa_parsexml(result));
			deferred.resolve();
		},deferred.reject);

		return [deferred.promise()];
	},
	SaveProspect: function(profile, data, context) {
		var file = aa_text(data,profile,'ProspectFile',context);
		file = file.replace(/ /g,'+');
		var deferred = $.Deferred();
		var allProspects = aa_var_first(context,'AllProspects');
		var prospectTop = aa_xpath(allProspects,'prospect[#'+file+']')[0];
		var prospect = aa_xpath(prospectTop,'prospect')[0];
		if (!prospectTop || !prospect) return deferred.reject.promise();
		var generation = prospectTop.getAttribute('generation');

		$.ajax({
			url: '/LetMeSee/?op=saveProspectFile&file='+encodeURIComponent(file)+'&generation='+generation,
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
			data:  ajaxart.xml2text(prospect)
		}).then(function(result) {
			result = aa_parsexml(result);
			if (result.getAttribute('type') == 'error')
				return deferred.reject();

			var newGeneration = result.getAttribute('generation');
			prospectTop.setAttribute('generation',newGeneration);

			// now update the header
			var header = aa_xpath(aa_var_first(context,'User'),'prospects/prospect[#'+file+']')[0];
			if (header) {
				header.setAttribute('generation',newGeneration);
				aa_prospect_update_header(header,prospect);
			}

			deferred.resolve();

			aa_prospects_saveUserFile(context);  // saving the new headers
		},deferred.reject);

		return [deferred.promise()];
	},
	ProspectUpdatePermissions: function(profile, data, context) {
		var file = aa_text(data,profile,'ProspectFile',context);
		var newPermissions = aa_text(data,profile,'NewPermissions',context);

		var oldPermissions = file.split(',permissions=')[1].split(',rnd=')[0];
		if (oldPermissions == newPermissions) return;

		var deferred = $.Deferred();

		var newFileName = file.split(',permissions=')[0] + ',permissions=' + newPermissions + ',rnd=' + file.split(',rnd=')[1];

		$.ajax({
			url: '/LetMeSee/?op=renameProspectFile&fileName='+encodeURIComponent(file)+'&newFile='+encodeURIComponent(newFileName)
		}).then(function(result) {
			result = aa_parsexml(result);
			if (result.getAttribute('type') == 'error') {
				aa_errorLog('Error updating prospect permissions ' + result.getAttribute('reason')||'');
				return deferred.reject();
			}
			var header = aa_xpath(aa_var_first(context,'User'),'prospects/prospect[#'+file+']')[0];
			if (header) {
				header.setAttribute('id',newFileName);
				header.setAttribute('generation','');
			}

			deferred.resolve();

			aa_prospects_saveUserFile(context);  // saving the new headers

		},deferred.reject);

		return [deferred.promise()];
	},
	AddNewProspect: function(profile, data, context) {
		var deferred = $.Deferred();
		var name = aa_text(data,profile,'Name',context);

		var perms = aa_text(data,profile,'Permissions',context);
		var rnd = parseInt(Math.random() * 100);
		var fileName = ',name='+name.replace(/ /g,'+')+',permissions='+perms+',rnd='+rnd+'.xml';

		$.ajax({
			url: '/LetMeSee/?op=addProspect&fileName='+encodeURIComponent(fileName)
		}).then(function(result) {
			deferred.resolve();
		},deferred.reject);
		return [deferred.promise()];
	},
	ProspectsLoad: function(profile, data, context) {
		window.jbDebugResource = function(varName) { return aa_var_first(context,varName); }
		if (ajaxart.jbart_studio) return;
		var deferred = $.Deferred();

		loadList().then(function() {
			aa_prospects_sync_headers(context).then(deferred.resolve,deferred.reject);
		},deferred.reject);

		return [deferred.promise()];

		function loadList() {	
			var deferred2 = $.Deferred();
			$.when($.ajax({
				url: '/LetMeSee/?op=prospectsList'
			})).then(function(result) {
				result = aa_parsexml(result);
				if (result.getAttribute('type') == 'error') {
					aa_errorLog('Error loading prospects ' + result.getAttribute('reason')||'');
					return deferred2.reject();
				}
				list = result;
				aa_setDataResource(context,'ProspectList',list);
				deferred2.resolve();
			},deferred2.reject);
			return deferred2.promise();
		}
	},
	SuperAdminRunLS: function(profile, data, context) {
		window.jbDebugResource = function(varName) { return aa_var_first(context,varName); }

		var prefix = aa_text(data,profile,'Prefix',context);
		if (!prefix) return;
		var allResults = aa_var_first(context,'AllResults');
		var id = prefix.replace(/\//g,'_');
		var result = aa_xpath(allResults,'*[#'+id+']')[0];
		if (!result) {
			var deferred = $.Deferred();

			$.ajax({
				url: 'https://jb-letmesee.appspot.com/LetMeSee/?op=superadmin_ls&prefix='+encodeURIComponent(prefix)
			}).then(function(lsResult) {				
				lsResult = aa_parsexml( ajaxart.xml2text(aa_parsexml(lsResult)) );	// because of namespaces

				if (lsResult.getAttribute('type') == 'error') {
					return deferred.reject();
				}
				var result = aa_xpath(allResults,'result[#'+id+']',true)[0];
				aa_xml_appendChild(result,lsResult);
				deferred.resolve();
			},deferred.reject);

			return [deferred.promise()];
		}
	},
	SaveLMCManagerSettings: function(profile, data, context) {
		var settings = aa_var_first(context,'Projects');
		if (window.jbGoogleDriveDocument && !ajaxart.jbart_studio) {
			jbGoogleDriveDocument.title = settings.getAttribute('name');
			jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(settings);
			return aa_fromPromise(jbGoogleDriveDocument.save());
		}
	},
	InitLMCManager: function(profile, data, context) {
		var settings = aa_var_first(context,'Projects');
		var appContext = context.vars._AppContext[0];
		if (appContext.lmcManagerInitialized) return;
		appContext.lmcManagerInitialized = true;
		aa_lmcAgentSuggestRestartAfterTooLong(context);

		if (settings.getAttribute('groupID')) {
			var groupInGroups = aa_xpath(settings,'group[#'+settings.getAttribute('groupID')+']')[0];
			if (groupInGroups) settings.removeChild(groupInGroups);
		}

		aa_unbindXmlChange(appContext.lmcSettingsID);
		appContext.lmcSettingsID = aa_bindXmlChange(settings,function(changedXml) {
			aa_run_delayed_action('lmc_manager_autosave_settings',function() {				
				jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(settings);
				jbGoogleDriveDocument.save();

				aa_lmc_userNotification(context,'Settings auto saved','saved');				
			},1000,true);
		});

		window.jbDebugResource = function(varName) { // for debug
			return aa_var_first(context,varName);
		};

		setTimeout(function() { aa_lmc_sendJoinLog(context); },4000);

		return aa_fromPromise($.when(aa_lmcApi_syncServerTime(),aa_lmcGetUserInfo(context)));
	},
	AddLMCProjectToManagerSettings: function(profile, data, context) {
		aa_lmc_addProjectsFromGoogleDrive({
			xmlSettings: aa_var_first(context,'Projects'),
			addProjectKey: true,
			done: function() {
				aa_run(data,profile,'OnAdded',context);
			}
		});
	},
	AddLMCProjectToClientSettings: function(profile, data, context) {
		var driveXml = aa_var_first(context,'DriveFile');
		var clientID = driveXml.getAttribute('id');
		var settings = aa_var_first(context,'Settings');

		aa_lmc_addProjectsFromGoogleDrive({
			xmlSettings: settings,
			addProjectKey: true,
			done: function(addedProjects) {
				// set the the clientid to the projects...
				for(var i=0;i<addedProjects.length;i++) {
					var projectXml = aa_xpath(settings,'project[#'+addedProjects[i]+']')[0];
					updateProjectSettings(projectXml.getAttribute('id'),projectXml.getAttribute('key'),clientID);
				}
				aa_run(data,profile,'OnAdded',context);
			}
		});

		function updateProjectSettings(projectID,projectKey,clientID) {
			aa_lmcApi_getFile(projectID,'settings_'+projectKey+'.xml').then(function(result,generation) {
				result = aa_parsexml(result);
				result.setAttribute('clientID',clientID);

				aa_lmcApi_saveFile({
					project: projectID,
					file: 'settings_'+projectKey+'.xml',
					key: projectKey,
					content: ajaxart.xml2text(result)
				});
			},function() {
			});
		}
	},
	DateTimeFromGoogleCloudStorageFormat: function(profile,data,context) {
		var cloudFormat = aa_totext(data);	// e.g. 2014-06-10T08:43:16.867Z
		var dateParts = cloudFormat.split('T')[0].split('-');
		var timeParts = cloudFormat.split('T')[1].split(':');
		var out = new Date(parseInt(dateParts[0]), parseInt(dateParts[1])-1, parseInt(dateParts[2]), parseInt(timeParts[0]), parseInt(timeParts[1])).getTime();

		if (cloudFormat.indexOf('Z') > -1)
			out += 1000*60*60*3;			// TODO: fix this!!!

		return [out];
	},
	DateFilterOptions: function(profile,data,context) {
		var options = [];
		var now = new Date();
		options.push({ title: 'Last 7 days', daysBack: 7});
		options.push({ title: 'Last 14 days', daysBack: 14 });
		options.push({ title: 'Last Month', daysBack: 30 });
		var daysInPrevMonth = new Date(now.getTime() - now.getDate() -1).getDate();
		options.push({ title: 'Last 2 Months', daysBack: 60 });
		options.push({ title: 'Last 3 Months', daysBack: 90 });
		options.push({ title: 'Last 6 Months', daysBack: 180 });
		options.push({ title: 'Whole Time', daysBack: 99999 });

		return options;
	}
});

function aa_lmc_addProjectsFromGoogleDrive(settings) {
		var addedProjects = [];

		gapi.load('picker', function() {

			var view = new google.picker.View(google.picker.ViewId.DOCS);
			view.setMimeTypes('application/jbart_letmesee');
			var picker = new google.picker.PickerBuilder()
				.enableFeature(google.picker.Feature.NAV_HIDDEN)
				.enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
				.setAppId('964662835047')
				.setOAuthToken(gapi.auth.getToken().access_token)
				.addView(view)
				.setCallback(pickerCallback)
				.build();
			picker.setVisible(true);
		});

		function pickerCallback(data) {
			if (data.action != 'picked') return;
			var promises = [];

			for(var i=0;i<data.docs.length;i++) {
				promises.push(loadAndAddProject(data.docs[i].id,data.docs[i].name));
			}
			$.when.apply($,promises).done(function() {
				settings.done(addedProjects);
			});
		}

		function loadAndAddProject(id,name) {
			var deferred = $.Deferred();

      googledrive_lib.ready().then(function() { 
        googledrive_lib.loadFile(id).done(function(content, resp) {
        	var projectXml = aa_parsexml(content);
        	var elem = settings.xmlSettings.ownerDocument.createElement('project');
        	elem.setAttribute('driveid',id);
        	if (!projectXml.getAttribute('id') || !projectXml.getAttribute('key'))
        		return deferred.reject();

        	elem.setAttribute('id',projectXml.getAttribute('id'));
        	if (settings.addProjectKey)
        		elem.setAttribute('key',projectXml.getAttribute('key'));
        	name = name.replace(/LetMeSee/i,'').replace(/Let Me See/i,'').replace(/\s*Demo/i,'').replace(/\s*Project/i,'').replace(/\s*-\s*/,'') || 'Let Me See';
        	
        	addedProjects.push(projectXml.getAttribute('id'));

        	elem.setAttribute('name',name);
        	settings.xmlSettings.appendChild(elem);
        	aa_triggerXmlChange(elem);
        	deferred.resolve();
        });
      });

      return deferred.promise();
		}	
}

function aa_prospects_saveUserFile(context) {
	var user = aa_var_first(context,'User');
	var file = user.parentNode.getAttribute('fileName');
	if (!file) return;

	$.ajax({
		url: '/LetMeSee/?op=saveAffiliateFile&file='+file,
		type: 'POST',
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		data:  ajaxart.xml2text(user)
	});
}


aa_gcs("lmc_manager",{
	AgentPerformance: function(profile,data,context) {
		var rooms = aa_run(data,profile,'Rooms',context);
		var daysBack = aa_int(data,profile,'DaysBack',context);
		var now = new Date();
		var thisMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + 1000*60*60*24;
		var dayInMillis = 1000*60*60*24;

		var endTime = thisMidnight;
		var startTime = endTime - dayInMillis*(1+daysBack);

		var agents = [];
		for(var i=0;i<rooms.length;i++) {
			var room = rooms[i];
			var created = room.getAttribute('createdDate');
			var agent = room.getAttribute('agent');
			agent = agent || 'anonymous';
			if (created < startTime || created > endTime) continue;
			if (!agents[agent]) agents[agent] = { Created:[], Visited: [], Name: agent };
			agents[agent].Created.push(room);
			if (room.getAttribute('lastEventTime')) agents[agent].Visited.push(room);
		}

		var agentsList = [];
		for(var i in agents) {
			if (agents.hasOwnProperty(i)) agentsList.push(agents[i]);
		}

		agentsList = agentsList.sort(function(x,y) { 
			if (y.Created.length != x.Created.length)
				return y.Created.length - x.Created.length; 
			return y.Visited.length - x.Visited.length; 
		});

		return agentsList;
	},
	ManagerEMailBody: function(profile,data,context) {
		var managerXml = aa_first(data,profile,'ManagerEmailXml',context);

		var projects = aa_xpath(managerXml,'project/@id');
		var projectsStr = ',';
		for(var i=0;i<projects.length;i++)
			projectsStr += projects[i].nodeValue + ',';

		// let's get a full list of rooms
		var roomProjects = aa_xpath(aa_var_first(context,'AllRoomHeaders'),'*/*');
		roomProjects = roomProjects.concat( aa_xpath(aa_var_first(context,'AllRoomArchiveHeaders'),'*/*') );

		var rooms = [];
		for(var i=0;i<roomProjects.length;i++) {
			var projectID = roomProjects[i].parentNode.getAttribute('id');
			if (projectsStr.indexOf(','+projectID+',') > -1)
				rooms = rooms.concat(aa_xpath(roomProjects[i],'*'));
		}
		var now = new Date();
		var thisMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + 1000*60*60*24;
		var dayInMillis = 1000*60*60*24;

		var endTime = thisMidnight-dayInMillis;
		var startTime = endTime - dayInMillis*7;

		var agents = [];
		for(var i=0;i<rooms.length;i++) {
			var room = rooms[i];
			var created = room.getAttribute('createdDate');
			var agent = room.getAttribute('agent');
			if (!agent || agent.indexOf('@') > -1) continue;
			if (created < startTime || created > endTime) continue;
			if (!agents[agent]) agents[agent] = { current:[], visited: [], name: agent };
			agents[agent].current.push(room);
			if (room.getAttribute('lastEventTime')) agents[agent].visited.push(room);
		}

		var allAgents = aa_split(managerXml.getAttribute('agents'),',',true);
		for(var i=0;i<allAgents.length;i++) {
			var agentName = allAgents[i];
			agents[agentName] = agents[agentName] || { current: [], visited: [], name: agentName };
		}

		var agentsList = [],maxValue=0;
		for(var i in agents) {
			if (agents.hasOwnProperty(i)) agentsList.push(agents[i]);
			maxValue = Math.max(maxValue,agents[i].current.length);
		}
		var scale = maxValue;
		if (agentsList.length == 1) {
			if (maxValue < 5) scale = 5;
			else if(maxValue < 10) scale = 10;
			else if (maxValue < 20) scale = 20;
			else if (maxValue < 50) scale = 50;
			else if (maxValue < 100) scale = 100;
		}

		agentsList = agentsList.sort(function(x,y) { 
			if (y.current.length != x.current.length)
				return y.current.length - x.current.length; 
			return y.visited.length - x.visited.length; 
		});

		// prepare the chart image:
		var height = 25 + agentsList.length*21;
		var chartImageUrl = 'https://chart.googleapis.com/chart?cht=bhs&chs=475x' + height + '&chd=t:';

		for(var i=0;i<agentsList.length;i++) {
			chartImageUrl += agentsList[i].visited.length;
			if (i<agentsList.length-1) chartImageUrl += ',';
		}
		chartImageUrl+='|';
		for(var i=0;i<agentsList.length;i++) {
			chartImageUrl += agentsList[i].current.length - agentsList[i].visited.length;
			if (i<agentsList.length-1) chartImageUrl += ',';
		}
		chartImageUrl += '&chbh=15,7,10&chco=6DAB80,BAC9E8&chxt=y,x&chxl=0:';
		for(var i=agentsList.length-1;i>=0;i--) {
			chartImageUrl += '|' + encodeURIComponent(agentsList[i].name + ' (' + agentsList[i].current.length + ')');
		}

		var axisLabelStep = 
			(maxValue < 8) ? 1 :
			(maxValue < 16) ? 2 :
			(maxValue < 30) ? 5 :
			(maxValue < 60) ? 10 : 20;
		chartImageUrl += '&chxr=1,0,'+scale+',' + axisLabelStep + '&chds=0,'+scale;
		chartImageUrl += '&chg=' + 100/scale*axisLabelStep + ',0';

		 // var title = 'Customer rooms created and visited last week|(' + aa_moment(startTime).format('ddd DD/MM') + ' - ' + aa_moment(endTime-1).format('ddd DD/MM') + ')';
		 // chartImageUrl += '&chtt=' + encodeURIComponent(title);

		var email = '';
		var titleStyle = 'font: 15px arial;margin-bottom:5px;font-weight:bold;';
		email += '<div style="'+titleStyle+'">Customer rooms created and visited last week (' + aa_moment(startTime).format('ddd DD/MM') + ' - ' + aa_moment(endTime-1).format('ddd DD/MM') + '):' + '</div>';
		email += '<br/>';	
		var imgStyle = 'max-width:475px;width:100%;';		 // so it will open nicely in iphone
		email += '<img style="'+imgStyle+'" src="'+chartImageUrl+'" />';
		email += '<br/>';
		var visitedBoxStyle = 'display:inline-block; width:12px;height:12px;background:#6DAB80;';
		var createdBoxStyle = 'display:inline-block; width:12px;height:12px;background:#BAC9E8;';
		var legendTextStyle = 'font: 11px arial;vertical-align: top;display: inline-block;margin-left: 5px;margin-bottom: 5px;';

		email += '<br><div style="'+createdBoxStyle+'"></div><span style="'+legendTextStyle+'">Rooms Created</span>';
		email += '<br><div style="'+visitedBoxStyle+'"></div><span style="'+legendTextStyle+'">Rooms Visited</span>';

		email += '<br>';

		// user tracking chart
		var siteID = managerXml.getAttribute('siteID');
		if (siteID) {
			email += '<br>';
			addUserTrackingChart(siteID);
		}

		var buttonStyle = 'width: 165px; margin-top: 30px; display: block; text-align: center; text-decoration: none;color: #fff; font: 14px arial;  line-height: 26px;  vertical-align: middle;  padding: 5px 14px; background-color: #47BAC1;';
		var lmcLink = managerXml.getAttribute('lmcLink');
		email += '<a style="'+buttonStyle+'" target="_blank" href="'+lmcLink+'">See more in Let me See</a>';


		return [email];

		function addUserTrackingChart(siteID) {
			var users = aa_xpath(aa_var_first(context,'Temp'),'site_'+siteID+'/userTracking/user');

			var height = 25 + users.length*21;
			var userChartUrl = 'https://chart.googleapis.com/chart?cht=bhs&chs=475x' + height + '&chd=t:';
			var days = 7;
			var usersCount = {},userList=[];
			for(var i=1;i<=days;i++) {
				var dayMilli = thisMidnight - i*dayInMillis-10;
				var dayFormat = aa_moment(dayMilli).format('DD-MM-YY');
				for(var j=0;j<users.length;j++) {
					var user = users[j];
					var userID = user.getAttribute('id');
					var joinCount = parseInt( aa_xpath_text(user,'userStats/entry[#'+dayFormat+']/@join') || '0' );
					usersCount[userID] = usersCount[userID] || 0;
					usersCount[userID] += joinCount;
				}
			}

			for(var i in usersCount) {
				var name = aa_xpath_text(managerXml,'user[#'+i+']/@name') || i;
				if (usersCount.hasOwnProperty(i)) userList.push({ name: name, value: usersCount[i] });
			}
		
			userList = userList.sort(function(x,y) { return y.value - x.value; });

			for(var i=0;i<userList.length;i++) {
				userChartUrl += userList[i].value;
				if (i<userList.length-1) userChartUrl += ',';
			}
			userChartUrl += '&chbh=15,7,10&chco=47BAC1&chxt=y,x&chxl=0:';
			for(var i=userList.length-1;i>=0;i--) {
				userChartUrl += '|' + userList[i].name;
			}
			var scale = 7,axisLabelStep=1;
			userChartUrl += '&chxr=1,0,'+scale+',' + axisLabelStep + '&chds=0,'+scale;
			userChartUrl += '&chg=' + 100/scale*axisLabelStep + ',0';

			email += '<div style="'+titleStyle+'">Days usage of let me see (out of last 7 days):' + '</div>';
			email += '<br/>';	
			var imgStyle = 'max-width:475px;width:100%;';		 // so it will open nicely in iphone
			email += '<img style="'+imgStyle+'" src="'+userChartUrl+'" />';

			email += '<br/>';
			var usageBoxStyle = 'display:inline-block; width:12px;height:12px;background:#47BAC1;';

			email += '<br><div style="'+usageBoxStyle+'"></div><span style="'+legendTextStyle+'">Days of usage</span>';

			email += '<br>';

		}
	}	
});


function aa_lmcDrawAgentPerformanceChart(chart) {
  function drawChart() {
    var arr = chart.DataMatrix(true);
    if (arr.length < 2) {
      $(chart.control).append('<div>No rooms created</div>');
      return;
    }
    // Fix the tooltip of created - to show total values and not only the diff
    var data = new google.visualization.DataTable();
    for (var j=0; j<arr[0].length; j++)
    	data.addColumn((j == 0) ? 'string' : 'number',arr[0][j]);
    data.addColumn({type:'string', role:'tooltip'});
    data.addRows(arr.length-1);
    for (var i=1; i<arr.length; i++) 
    	for (var j=0; j<arr[i].length; j++)
    		data.setValue(i-1,j,arr[i][j]);
    for (var i=1; i<arr.length; i++)
    	data.setValue(i-1,arr[0].length,arr[i][0] + '\nCreated: ' + (arr[i][1]+ arr[i][2]));
    
    var gchart = new google.visualization.BarChart(chart.control);
    var height = 20 + 30*arr.length;
    
    // making sure hAxis ticks have only integer value
    var maxValue = 0;
    for (var i=1; i<arr.length; i++) 
   		maxValue = Math.max(maxValue,arr[i][1] + arr[i][2]);
    var ticks = [];
    for (var i=0; i<=maxValue; i++)
    	ticks.push(i);

    var options = {
    	title: 'Rooms created and visited by agents',
    	fontSize: 12,
    	backgroundColor: 'transparent',
    	colors: ['#549469','#BAC9E8'],
    	isStacked: true,
    	height:height,
    	chartArea:{
    		left:150,top:0,width:350
    	},
    	hAxis: { title: 'Number of rooms: visited | created', ticks: ticks, gridlines: {count: -1, color: '#ddd' } }
	};
    options.title = chart.Title;
    gchart.draw(data, options );
    
    google.visualization.events.addListener(gchart, 'select', function(a,b,c) {
        try {
          var selectedItem = gchart.getSelection()[0];
          if (selectedItem) {
            var data1 = {
              Item: chart.Items[selectedItem.row],
          	  Column: selectedItem.column
            };
            aa_trigger(chart,'drilldownClick',[data1]);
          }
        } catch(e) {}       
    });
    
  }

  function loadGoogleCharts() {
    aa_loadJsFile({
     url :'https://www.google.com/jsapi',
     variableToFind: 'google',
     success: function() {
        aa_loadJsFile({
          isLoaded: function() { return google.visualization.AreaChart != null; },
          loadFunction: function() {
            google.load("visualization", "1", {callback:'' , packages:["corechart"]});
          },
          success: function() {
            aa_addOnAttach(chart.control,function() {
              drawChart();
            });
          }
        });
     }
    });
  }
  loadGoogleCharts();
}

aa_gcs("lmc_manager",{
	IsUserTrackingInDateRange: function(profile,data,context) {
	 var daysFilter = aa_int(data,profile,'DaysBack',context);
	 var dateStr = aa_text(data,profile,'DateString',context);
	 var dateParts = dateStr.split("-");
	 var date = new Date(parseInt(dateParts[2])+2000, parseInt(dateParts[1])-1, parseInt(dateParts[0]));
	 var itemDaysFromNow = Math.ceil((new Date().getTime() - date.getTime())/1000/60/60/24);

	 return aa_frombool( itemDaysFromNow <= daysFilter );
	}
});

