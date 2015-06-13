function aa_lmc_createRoomHeaders(context,room) {
	var headers = aa_parsexml('<headers />');
	var roomHeader = aa_parsexml('<room />',headers);
	roomHeader.setAttribute('id',room.getAttribute('id'));
	headers.appendChild(roomHeader);
	aa_lmc_updateRoomHeaderXml(roomHeader,room);
	aa_setDataResource(context,'RoomHeaders',[headers]);

	return aa_lmcApi_saveRoomHeaders({
		project: aa_lmc_projectID(context),
		key: aa_lmc_projectKey(context),
		content: ajaxart.xml2text(headers)
	});
}

function aa_lmc_syncHeadersWithList(context,listResult) {
	var headers = aa_var_first(context,'RoomHeaders');
	var projectID = aa_lmc_projectID(context);
	var project = aa_var_first(context,'Project');
	if (!project) return;

	fixDeletedRooms();
	fixNewlyCreatedRooms();
	return fixUpdatedRooms();

	function fixUpdatedRooms() {
		var rooms = aa_xpath(headers,'*');
		var promises = [];

		for(var i=0;i<rooms.length;i++) {
			var id = rooms[i].getAttribute('id');
			var roomGeneration = rooms[i].getAttribute('roomGeneration');
			var statsGeneration = rooms[i].getAttribute('statsGeneration');
			var roomFileGeneration = findFileGeneration('rooms/'+id+'.xml');
			var statsFileGeneration = findFileGeneration('stat/'+id+'.xml');

			if (roomGeneration != roomFileGeneration) promises.push(updateRoomHeader(id));
			if (statsGeneration != statsFileGeneration) promises.push(updateStatHeader(id));
		}
		if (promises.length > 0) return $.when.apply($,promises);
	}

	function findFileGeneration(fileSuffix) {
		return aa_totext(aa_xpath(listResult,"ListBucketResult/Contents[Key='"+projectID+'/'+fileSuffix+"']/Generation"));
	}

	function fixDeletedRooms() {
		var rooms = aa_xpath(headers,'*');
		for(var i=0;i<rooms.length;i++) {
			var id = rooms[i].getAttribute('id');
			if (aa_xpath(listResult,"ListBucketResult/Contents[Key='"+projectID+'/rooms/'+id+".xml']").length == 0)
				aa_lmc_updateRoomHeadersFileForDeletedRoom(context,id);
		}
	}

	function fixNewlyCreatedRooms() {
		var roomFiles = aa_xpath(listResult,'ListBucketResult[1]/Contents/Key');
		for(var i=0;i<roomFiles.length;i++) {
			var id = aa_totext([roomFiles[i]]).split('/rooms/')[1].split('.xml')[0];
			if (id && aa_xpath(headers,"*[#"+id+']').length == 0)
				roomCreated(id);
		}
	}

	function updateRoomHeader(id) {
		return aa_lmcApi_loadRoom({ project: projectID, room: id }).then(function(roomContents,generation) {
			return aa_lmcApi_loadRoomAgentInfo({project: projectID, room: id, key: project.getAttribute('key')}).then(function(agentInfo) {
				var header = aa_xpath(headers,"*[#"+id+"]")[0];
				header.setAttribute('roomGeneration',generation);
				aa_lmc_updateRoomHeaderXml(header,aa_parsexml(roomContents),aa_parsexml(agentInfo));
			});
		});
	}
	function updateStatHeader(id) {
		return aa_lmcApi_loadStats({ project: projectID, room: id }).then(function(statsContents,generation) {
			var header = aa_xpath(headers,"*[#"+id+"]")[0];
			header.setAttribute('statsGeneration',generation);
			aa_lmc_updateRoomStatsHeaderXml(header,aa_parsexml(statsContents));
		});
	}

	function roomCreated(id) {
		var project = aa_lmc_projectID(context);

		return aa_lmcApi_loadRoom({project: project, room: id }).then(function(room,newRoomGeneration) {
			var roomXml = aa_parsexml(room);
			return aa_lmcApi_loadStats({project: project, room: id }).then(function(stat,newStatsGeneration) {
				var statXml = aa_parsexml(stat);

				aa_consoleLog('Updating room headers. adding room ' + id);
				aa_lmc_updateRoomHeadersFileForNewRoom(context,roomXml,newRoomGeneration,statXml,newStatsGeneration);
			});
		});		
	}
}

function aa_lmc_loadRoomHeaders(context) {
	$('#activity').text('Loading Rooms List...');
	var deferred = $.Deferred();
	var appContext = context.vars._AppContext[0];
	var project = aa_var_first(context,'Project');
	var headers;
	var projectID = project.getAttribute('id');
	if (appContext.lmcHeadersLoaded) return;
	var listResult;
	var headersFileObj = aa_lmcRoomHeadersFileObject(context);

	$.when(aa_lmcApi_loadRoomList({
		project: projectID,
		key: project.getAttribute('key')
	}),aa_lmc_loadAppFile(context,headersFileObj)).then(function(listResult1) {
		listResult = aa_parsexml(listResult1);
		headers = aa_var_first(context,'RoomHeaders');
		appContext.lmcHeadersLoaded = true;
		
		var promise = aa_lmc_syncHeadersWithList(context,listResult);
		$.when(promise).then(function() {
			deferred.resolve();			
		});
	},deferred.reject);

	return deferred.promise();	

}

function aa_lmc_updateRoomHeaderXml(header,room,agentInfo) {
	var attrs = aa_split('customerName,customerCompany,name,isTemplate,createdDate,customerStatus,modifiedDate,agent,customerStatus',',',true);
	
	for(var i=0;i<attrs.length;i++)
		header.setAttribute(attrs[i],room.getAttribute(attrs[i]) || '');

	if (agentInfo) {
		var props = aa_xpath(agentInfo,'props')[0];
		aa_remove(aa_xpath(header,'props')[0]);

		if (props) aa_xml_appendChild(header,props.cloneNode(true));
		if (agentInfo.getAttribute('customerStatus'))
			header.setAttribute('customerStatus',agentInfo.getAttribute('customerStatus'));
	}

	aa_triggerXmlChange(header);
}

function aa_lmc_updateRoomStatsHeaderXml(header,stats) {
	var headerCopy = ajaxart.xml2text(header);
	var attrs = aa_split('visitorTimeMin,visitorJoinCount,lastEventTime,visitorMobileTimeMin,visitorMobileJoinCount',',',true);

	for(var i=0;i<attrs.length;i++) 
		header.setAttribute(attrs[i],stats.getAttribute(attrs[i]) || '');

	if (headerCopy != ajaxart.xml2text(header))
		aa_triggerXmlChange(header);
}

function aa_lmc_updateRoomHeadersFileForNewRoom(context,roomXml,newRoomGeneration,stats,newStatsGeneration) {
	var headers = aa_var_first(context,'RoomHeaders');
	var appContext = context.vars._AppContext[0];
	if (!appContext.lmcHeadersLoaded) return;

	var header = aa_parsexml('<room />');
	header.setAttribute('id',roomXml.getAttribute('id'));
	header.setAttribute('roomGeneration',newRoomGeneration);
	header.setAttribute('statsGeneration',newStatsGeneration);
	aa_lmc_updateRoomHeaderXml(header,roomXml);
	aa_lmc_updateRoomStatsHeaderXml(header,stats);

	if (aa_xpath(headers,'*[#'+roomXml.getAttribute('id')+']').length > 0) return; // trying to add an existing room
	aa_xml_appendChild(headers,header);
	aa_triggerXmlChange(headers);
}

function aa_lmc_updateRoomHeadersFileForDeletedRoom(context,roomid) {
	var headers = aa_var_first(context,'RoomHeaders');
	var appContext = context.vars._AppContext[0];
	if (!appContext.lmcHeadersLoaded) return;
	var header = aa_xpath(headers,'*[#'+roomid+']')[0];
	if (header) headers.removeChild(header);	
  
	aa_triggerXmlChange(headers);
}

function aa_lmcMoveToArchiveUpdateHeaders(settings) {
	var context = settings.context;
	var deferred = $.Deferred();
	var archiveHeaders = aa_parsexml('<headers/>');

	$.when(aa_lmcApi_getFile(settings.project,'archive/roomHeaders_' + settings.key+'.xml')).then(function(result,generation) {
		archiveHeaders = aa_parsexml(result);
		updateHeaders();
	},updateHeaders);

	return deferred.promise();

	function updateHeaders() {
		var roomHeaders = aa_var_first(context,'RoomHeaders');
		var room = aa_xpath(settings.restoreFromArchive ? archiveHeaders : roomHeaders,'*[#'+settings.room+']')[0];
		if (!room) {
			if (settings.restoreFromArchive)
				aa_errorLog('Restore From archive - could not find room in headers');
			else
				aa_errorLog('Move to archive - could not find room in headers');

			return deferred.reject();
		}
		if (settings.restoreFromArchive) {
			aa_xml_appendChild(roomHeaders,room.cloneNode(true));
		} else {
			aa_xml_appendChild(archiveHeaders,room.cloneNode(true));		
		}
		room.parentNode.removeChild(room);
		aa_setDataResource(context,'RoomHeaders',roomHeaders);

		aa_triggerXmlChange(roomHeaders);

		$.when(aa_lmcApi_saveFile({
			project: settings.project,
			file: 'archive/roomHeaders_' + settings.key + '.xml',
			key: settings.key,
			content: ajaxart.xml2text(archiveHeaders)
		})).then(deferred.resolve,deferred.reject);		
	}

}

aa_gcs("lmc",{
	LMCRecreateArchiveHeaders: function(profile,data,context) {
		return [aa_lmc_recreateArchiveHeaders(context)];
	}
});

function aa_lmc_recreateArchiveHeaders(context) {
	var deferred = $.Deferred();
	var archiveList,roomCountToUpdate;
	var archiveHeaders = aa_parsexml('<headers/>');

	$.when(aa_lmcApi_archiveList({
		project: aa_lmc_projectID(context),
		key: aa_lmc_projectKey(context)
	})).then(function(result) {
		archiveList = result;

		var roomFiles = aa_xpath(archiveList,'Contents/Key');
		roomCountToUpdate = roomFiles.length;
		for(var i=0;i<roomFiles.length;i++) {
			var id = aa_totext([roomFiles[i]]).split('/rooms/')[1].split('.xml')[0];
			if (id)
				updateRoom(id);
			else 
				roomCountToUpdate--;
		}
	});

	return deferred.promise();

	function updateRoom(id) {
		var project = aa_lmc_projectID(context);

		$.when(
			aa_lmcApi_getFile(project,'archive/rooms/'+id+'.xml'),
			aa_lmcApi_getFile(project,'archive/stat/'+id+'.xml'),
			aa_lmcApi_getFile(project,'archive/rooms_agent_info/'+id+'_'+ aa_lmc_projectKey(context) +'.xml')
		).then(function(room,stats,agentInfo) {
			aa_consoleLog('Updating archive room headers. adding room ' + id);

			var header = archiveHeaders.ownerDocument.createElement('header');
			archiveHeaders.appendChild(header);		
			aa_lmc_updateRoomHeaderXml(header,aa_parsexml(room[0]),aa_parsexml(agentInfo[0]));
			aa_lmc_updateRoomStatsHeaderXml(header,aa_parsexml(stats[0]));

			if (--roomCountToUpdate == 0) {
				$.when(aa_lmcApi_saveFile({
					project: aa_lmc_projectID(context),
					file: 'archive/roomHeaders_' + aa_lmc_projectKey(context) + '.xml',
					key: aa_lmc_projectKey(context),
					content: ajaxart.xml2text(archiveHeaders)
				})).then(deferred.resolve,deferred.reject);
			}
		});
	}
}

function aa_lmcHeadersRoomAgentInfoUpdated(context,agentInfo) {
	var headers = aa_var_first(context,'RoomHeaders');
	var roomHeader = aa_xpath(headers,'room[#'+agentInfo.getAttribute('id')+']')[0];
	var room = aa_var_first(context,'Room');
	if (!roomHeader || room.getAttribute('id') != agentInfo.getAttribute('id')) return;
	aa_lmc_updateRoomHeaderXml(roomHeader,room,agentInfo);
}

function aa_lmcHeadersRoomStatsUpdated(context,stats) {
	var headers = aa_var_first(context,'RoomHeaders');
	var roomHeader = aa_xpath(headers,'room[#'+stats.getAttribute('id')+']')[0];
	var room = aa_var_first(context,'Room');
	if (!roomHeader || room.getAttribute('id') != stats.getAttribute('id')) return;
	aa_lmc_updateRoomStatsHeaderXml(roomHeader,stats);
}

function aa_lmcHeadersRoomSaved(context) {
	var headers = aa_var_first(context,'RoomHeaders');
	var room = aa_var_first(context,'Room');
	var agentInfo = aa_var_first(context,'RoomAgentInfo');
	var generation = aa_lmc_getFileObj(context,'room').generation;
	var roomHeader = aa_xpath(headers,'room[#'+room.getAttribute('id')+']')[0];
	if (!roomHeader) return;
	var headerClone = ajaxart.xml2text(roomHeader);
	aa_lmc_updateRoomHeaderXml(roomHeader,room,agentInfo);
	roomHeader.setAttribute('roomGeneration',generation);
}


function aa_lmcRoomHeadersFileObject(context,roomID) {
	var appContext = context.vars._AppContext[0];
	if (appContext.lmcHeadersFileObject) return appContext.lmcHeadersFileObject;

	appContext.lmcHeadersFileObject = aa_lmc_initFileObj(context,{
		name: 'roomHeaders',
		DataResourceName: 'RoomHeaders',
		filePath: 'roomHeaders_' + aa_lmc_projectKey(context) + '.xml', 
		autoSave: true,
		autoSaveTimeout: 3000
	});

	aa_bind(appContext.lmcHeadersFileObject,'trackSave',function(trackingObject) {
		trackingObject.noTracking = true;
	});

	aa_bind(appContext.lmcHeadersFileObject,'beforeSave',function(room) {
		aa_refresh_field(['rooms_list'],'screen');
	});
	aa_bind(appContext.lmcHeadersFileObject,'afterMerge',function(room) {
		aa_refresh_field(['rooms_list'],'screen');
	});

	return appContext.lmcHeadersFileObject;
}



aa_gcs("lmca",{
	LoadAndSyncAllRoomHeaders: function(profile,data,context) {		
		var projects = aa_run(data,profile,'Projects',context);
		var allHeaders = aa_var_first(context,'AllRoomHeaders');
		var allArchiveHeaders = aa_var_first(context,'AllRoomArchiveHeaders');
		var alsoRefresh = aa_bool(data,profile,'AlsoRefresh',true);
		var alsoArchives = aa_bool(data,profile,'AlsoArchives',true);

		var promises = [],modified = [],generations=[];

		for(var i=0;i<projects.length;i++) {
			var elem = aa_xpath(allHeaders,'headers[#'+projects[i].getAttribute('id')+']')[0];
			if (!elem || alsoRefresh)
				promises.push( loadProjectHeaders(projects[i].getAttribute('id'),projects[i].getAttribute('key'),projects[i].getAttribute('name')) );
			if (!elem && alsoArchives)
				promises.push( loadProjectArchives(projects[i].getAttribute('id'),projects[i].getAttribute('key'),projects[i].getAttribute('name')) );
		}

		var deferred = $.Deferred();
		$.when.apply($,promises).then(deferred.resolve,function() {
			aa_lmcApi_ServerErrorLog('manager_error_loading_rooms','Error loading projects data','');
			deferred.reject();
		});
		return [deferred.promise()];

		function loadProjectHeaders(projectID,key,projectName) {
			var deferred2 = $.Deferred();

			$.when(aa_lmcApi_loadRoomList({project: projectID,key: key}),aa_lmcApi_getFile(projectID,'roomHeaders_'+key+'.xml')).then(function (listResult,getFileResult) {
				var listResult = aa_parsexml(listResult);
				var headers = aa_parsexml(getFileResult[0]);
				var generation = getFileResult[1];

				generations[projectID] = generation;
				fixVisitorStats(projectID,key,listResult,headers).done(function() {
					writeToAllHeaders(projectID,projectName,headers);

					deferred2.resolve();
					if (modified[projectID]) {
						var headerContent = modified[projectID] && ajaxart.xml2text(headers);
						aa_lmcApi_saveFile({ project: projectID, key: key, file: 'roomHeaders_'+key+'.xml', content: headerContent, generation: generations[projectID] });
					}

				});
			},deferred2.reject);

			return deferred2.promise();
		}

		function loadProjectArchives(projectID,key,projectName) {
			var deferred2 = $.Deferred();

			aa_lmcApi_getFile(projectID,'archive/roomHeaders_'+key+'.xml',true).then(function(archiveHeaders) {
				archiveHeaders = aa_parsexml(archiveHeaders);
				var elem = aa_xpath(allArchiveHeaders,'headers[#'+projectID+']',true)[0];
				elem.setAttribute('name',projectName);
				aa_empty(elem);
				aa_xml_appendChild(elem,archiveHeaders);
				deferred2.resolve();
			},deferred2.resolve);
		}

		function fixVisitorStats(projectID,key,listResult,headers) {
			var innerPromises = [];
			var rooms = aa_xpath(headers,'*');

			for(var i=0;i<rooms.length;i++) {
				var id = rooms[i].getAttribute('id');
				var statsGeneration = rooms[i].getAttribute('statsGeneration');
				var statsFileGeneration =  aa_totext(aa_xpath(listResult,"ListBucketResult/Contents[Key='"+projectID+'/'+'stat/'+id+".xml']/Generation"));  

				if (statsGeneration != statsFileGeneration) innerPromises.push(updateVisitStats(projectID,rooms[i]));
			}

			if (innerPromises.length == 0) return $.Deferred().resolve().promise();			
			return $.when.apply($,innerPromises);
		}

		function updateVisitStats(projectID,header) {
			var deferred2 = $.Deferred();
			var id = header.getAttribute('id');
			aa_lmcApi_getFile(projectID,'stat/'+id+'.xml',true).then(function(statXml,generation) {
				header.setAttribute('statsGeneration',generation);
				aa_lmc_updateRoomStatsHeaderXml(header,aa_parsexml(statXml));
				modified[projectID] = true;
				deferred2.resolve();
			},deferred2.resolve);
			return deferred2.promise();
		}
		function writeToAllHeaders(projectID,projectName,headers) {
			var elem = aa_xpath(allHeaders,'headers[#'+projectID+']',true)[0];
			elem.setAttribute('name',projectName);
			aa_empty(elem);
			aa_xml_appendChild(elem,headers);
		}

		function findFileGeneration(listResult,projectID,fileSuffix) {
			return aa_totext(aa_xpath(listResult,"ListBucketResult/Contents[Key='"+projectID+'/'+fileSuffix+"']/Generation"));
		}
	}
});

function aa_lmc_refreshRoomHeaders(context,settings) {
	var project = aa_var_first(context,'Project');
	if (!project) return;
	var projectID = project.getAttribute('id');
	var headersFileObj = aa_lmcRoomHeadersFileObject(context);

	$.when(aa_lmcApi_loadRoomList({
		project: projectID,
		key: project.getAttribute('key')
	}),aa_lmc_loadAppFile(context,headersFileObj)).then(function(listResult1) {
		listResult = aa_parsexml(listResult1);
		var promise = aa_lmc_syncHeadersWithList(context,listResult);
		var isSync = true;
		$.when(promise).then(function() {
			if (!isSync && settings.onUpdate) settings.onUpdate();
		},function() {});
		isSync = false;
	},function() {
		aa_lmcApi_ServerErrorLog('agent_error_loading_rooms_list','Error loading rooms list','');
	});

	function fixDeletedRooms() {
		var rooms = aa_xpath(headers,'*');
		for(var i=0;i<rooms.length;i++) {
			var id = rooms[i].getAttribute('id');
			if (aa_xpath(listResult,"ListBucketResult/Contents[Key='"+projectID+'/rooms/'+id+".xml']").length == 0) {
				aa_lmc_updateRoomHeadersFileForDeletedRoom(context,id);
				modified = true;
			}
		}
	}

	function fixNewlyCreatedRooms() {
		var roomFiles = aa_xpath(listResult,'ListBucketResult[1]/Contents/Key');
		for(var i=0;i<roomFiles.length;i++) {
			var id = aa_totext([roomFiles[i]]).split('/rooms/')[1].split('.xml')[0];
			if (id && aa_xpath(headers,"*[#"+id+']').length == 0) {
				roomCreated(id);
				modified = true;
			}
		}
	}

	function fixUpdatedRooms() {
		var rooms = aa_xpath(headers,'*');
		var promises = [];

		for(var i=0;i<rooms.length;i++) {
			var id = rooms[i].getAttribute('id');
			var roomGeneration = rooms[i].getAttribute('roomGeneration');
			var statsGeneration = rooms[i].getAttribute('statsGeneration');
			var roomFileGeneration = findFileGeneration('rooms/'+id+'.xml');
			var statsFileGeneration = findFileGeneration('stat/'+id+'.xml');

			if (roomGeneration != roomFileGeneration) { updateRoomHeader(id); modified = true; }
			if (statsGeneration != statsFileGeneration) { updateStatHeader(id); modified = true; }
		}
		if (promises.length > 0) return $.when.apply($,promises);
	}

}

aa_gcs("lmc",{
	RefreshLMCHeaders: function(profile,data,context) {
		if (aa_var_first(context,'Projects')) {			// manager
			return ajaxart.runNativeHelper(data,profile,'ManagerRefresh',context);
		}
		aa_lmc_refreshRoomHeaders(context,{
			onUpdate: function() {
				ajaxart.runNativeHelper(data,profile,'OnUpdate',context);
			}
		});
	}
});


function aa_prospects_sync_headers(context) {
	var list = aa_var_first(context,'ProspectList');
	var user = aa_var_first(context,'User');
	var headers = aa_xpath(user,'prospects',true)[0];
	var listProspects = aa_xpath(list,'Content');
	var promises = [];

	fixNewlyCreatedProspects();
	fixUpdatedProspects();
	fixDeletedProspects();

	var deferred = $.Deferred();

	if (promises.length > 0) 
		$.when.apply($,promises).then(function() {
			aa_prospects_saveUserFile(context);
			deferred.resolve();
		},deferred.reject);
	else {
		deferred.resolve();
	}

	return deferred.promise();

	function fixNewlyCreatedProspects() {
		var prospectFiles = aa_xpath(list,'prospect');
		for(var i=0;i<prospectFiles.length;i++) {
			var file = prospectFiles[i].getAttribute('file');
			if (!file) continue;
			if (file && aa_xpath(headers,"*[#"+file+']').length == 0) {
				promises.push(updateProspectHeader(file));
			}				
		}
	}

	function fixDeletedProspects() {
		var prospects = aa_xpath(headers,'*');
		for(var i=0;i<prospects.length;i++) {
			var id = prospects[i].getAttribute('id');			
			if (!aa_xpath(list,"prospect[@file='"+id+"']")[0]) {
				headers.removeChild(prospects[i]);
			}				
		}
	}

	function fixUpdatedProspects() {
		var prospects = aa_xpath(headers,'*');

		for(var i=0;i<prospects.length;i++) {
			var id = prospects[i].getAttribute('id');
			var generation = prospects[i].getAttribute('generation');
			var fileGeneration = aa_xpath_text(list,"prospect[@file='"+id+"']/@generation");

			if (fileGeneration && generation != fileGeneration) promises.push(updateProspectHeader(id));
		}
	}

	function updateProspectHeader(file) {
		return aa_lmcApi_getFile('prospects/data',file).then(function(result,generation) {
			result = aa_parsexml(result);
			var newHeader = headers.ownerDocument.createElement('prospect');
			aa_prospect_update_header(newHeader,result);
			var name = file.split(',name=')[1].split(',permissions=')[0].replace(/[+]/g,' ');
			$(newHeader).attr('id',file).attr('generation',generation).attr('name',name);

			var current = aa_xpath(headers,'*[#'+file+']')[0];
			if (current) headers.removeChild(current);

			headers.appendChild(newHeader);
		});
	}

}

function aa_prospect_update_header(header,prospect) {
	aa_empty(header);
	var atts = prospect.attributes;

	for (var i = 0; i < atts.length; i++) {
		var attName = atts.item(i).nodeName;			
		header.setAttribute(attName, prospect.getAttribute(attName));
	}
	var contacts = aa_xpath(prospect,'contacts')[0];
	if (contacts) 
		aa_xml_appendChild(header,contacts.cloneNode(true));

	var remarks = aa_xpath(prospect,'remarks')[0];
	if (remarks) 
		aa_xml_appendChild(header,remarks.cloneNode(true));

	aa_xml_appendChild(header,prospect.cloneNode(true));	
}