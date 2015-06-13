
function aa_lmcApi_ServerErrorLog(fileTitle,userMessage,moreContent) {
	ajaxart.log(fileTitle,'error');
	
	try {
		var notificationBox = $('.aa_notification_box_LMC_Desktop_Notification')[0];
		if (notificationBox && notificationBox.trigger && userMessage) 
			notificationBox.trigger('notification',{status: 'error',text: userMessage || title, duration: 10000 });	
	} catch(e) {}

	if (ajaxart.jbart_studio)
		return alert('unlogged server error (in studio) - ' + fileTitle);

	var side = aa_var_first(window.jbLMCContext,'CoBrowseSide');
	if (side) fileTitle = side + '_' + fileTitle;
	
	setTimeout(function() {
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,moreContent);
		content += userMessage ? userMessage + '\n' : '';

		aa_errorLog('Server error - ' + fileTitle);
		var user = aa_var_first(window.jbLMCContext,'User');
		var userEmail = user && user.getAttribute('email');
		if (userEmail && userEmail.indexOf('@artwaresoft.com') > -1) return;
		if (userEmail && fileTitle.indexOf(userEmail) == -1)
			fileTitle += '_' + userEmail;

		$.ajax({
			url: '/LetMeSee/?op=log&severity=error&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerVisitLog(side,moreContent) {
	if (side == 'visitor' && window.location.href.indexOf('notracking=true') > -1) return;
	if (aa_cb_getSide(jbLMCContext) != 'visitor') return;

	setTimeout(function() {		
		aa_lmc_log('aa_lmcApi_ServerVisitLog');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,moreContent);
		var width = (window.orientation == 90 || window.orientation == -90) ? aa_screen_size(false).height : aa_screen_size(false).width;
		var deviceType = width < 450 ? 'mobile' : 'desktop';

		var room = window.jbLMCContext && aa_var_first(jbLMCContext,'Room');
		var agentID = room.getAttribute('agentID') || '';
		var agentName = room.getAttribute('agent') || '';
		var name = room.getAttribute('customerName') || '';
		var loadingSeconds = Math.round((new Date().getTime() - window.jbStartLoadingTime)/1000);

		var fileTitle = 'agentID=' + agentID + ',agentName=' + agentName + ',title='+document.title+',room='+name+',device='+deviceType+',loading='+loadingSeconds+'s';
		fileTitle = aa_toValidFileName(fileTitle);

		var severity = (aa_cb_getSide(jbLMCContext) == 'visitor') ? 'customerVisit' : 'agentVisit';
		$.ajax({
			url: '/LetMeSee/?op=log&severity=customerVisit&title=' + encodeURIComponent(fileTitle),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerRoomCreationLog(room,isDuplicate) {
	var appContext = aa_var_first(jbLMCContext,'_AppContext');
	var site = aa_totext(appContext.CustomerBrowserTitle([],jbLMCContext));
	var user = aa_var_first(jbLMCContext,'User');
	var agentName = (user && ( user.getAttribute('name') || user.getAttribute('email') )) || '';
	var templateName = room.getAttribute('templateName') || '';
	var fileTitle = 'createRoom,site='+site+',agent='+agentName+',template='+templateName;
	if (room.getAttribute('customerName')) fileTitle += ',room='+room.getAttribute('customerName');

	if (isDuplicate) fileTitle += ',duplicate=true';
	
	var moreContent = ajaxart.xml2text(room);
	
	setTimeout(function() {
		aa_lmc_log('aa_lmcApi_ServerRoomCreationLog');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,moreContent);

		$.ajax({
			url: '/LetMeSee/?op=log&severity=createRoom&title=' + encodeURIComponent(fileTitle),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerLog_DeleteRoom(room) {
	var projectName = (window.jbLMCContext && aa_var_first(window.jbLMCContext,'Project').getAttribute('name')) || '';
	var fileTitle = 'delete_room_'+projectName+'_'+(room.getAttribute('customerName') || room.getAttribute('name'));
	var userName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'User').getAttribute('name');
	if (userName) fileTitle += '_'+ userName;
	
	var moreContent = ajaxart.xml2text(room);
	
	setTimeout(function() {
		aa_lmc_log('aa_lmcApi_ServerDeleteRoomLog');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,moreContent);

		$.ajax({
			url: '/LetMeSee/?op=log&severity=deleteRoom&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerLog_ArchiveRoom(room) {
	var projectName = (window.jbLMCContext && aa_var_first(window.jbLMCContext,'Project').getAttribute('name')) || '';
	var fileTitle = 'archive_room_'+projectName+'_'+(room.getAttribute('customerName') || room.getAttribute('name'));
	var userName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'User').getAttribute('name');
	if (userName) fileTitle += '_'+ userName;
	
	var moreContent = ajaxart.xml2text(room);
	
	setTimeout(function() {
		aa_lmc_log('aa_lmcApi_ServerLog_ArchiveRoom');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,moreContent);

		$.ajax({
			url: '/LetMeSee/?op=log&severity=archiveRoom&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerLog_RestoreRoom(room) {
	var projectName = (window.jbLMCContext && aa_var_first(window.jbLMCContext,'Project').getAttribute('name')) || '';
	var fileTitle = 'restoring_room_'+projectName+'_'+(room.getAttribute('customerName') || room.getAttribute('name'));
	var userName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'User').getAttribute('name');
	if (userName) fileTitle += '_'+ userName;
	if (aa_cb_getSide(window.jbLMCContext) == 'visitor') fileTitle = 'fromVisitor_'+fileTitle;
	
	var moreContent = ajaxart.xml2text(room);
	
	setTimeout(function() {
		aa_lmc_log('aa_lmcApi_ServerLog_RestoreRoom');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,moreContent);

		$.ajax({
			url: '/LetMeSee/?op=log&severity=restoreRoom&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerSendCustomerToLocationLog(room,itemName) {
	var fileTitle = 'jump_'+room.getAttribute('id')+'_'+itemName;
	var projectName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'Project').getAttribute('name');
	if (projectName) fileTitle += '_'+ projectName;
	var userName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'User').getAttribute('name');
	if (userName) fileTitle += '_'+ userName;
	
	setTimeout(function() {
		aa_lmc_log('aa_lmcApi_ServerJumpLog');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle);

		$.ajax({
			url: '/LetMeSee/?op=log&severity=sendCustomerToLocation&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerLog_SaveSettings(moreContent) {
	var fileTitle = '';
	var projectName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'Project').getAttribute('name');
	if (projectName) fileTitle += '_'+ projectName;
	var userName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'User').getAttribute('name');
	if (userName) fileTitle += '_'+ userName;
	
	setTimeout(function() {
		aa_lmc_log('aa_lmcApi_ServerJumpLog');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,moreContent);

		$.ajax({
			url: '/LetMeSee/?op=log&severity=save_settings&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerLog_SiteCreated(siteID,siteName,moreContent) {
	var fileTitle = 'created_'+siteID+'_'+siteName;
	
	setTimeout(function() {
		aa_lmc_log('aa_lmcApi_ServerLog_SiteCreated');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,moreContent);

		$.ajax({
			url: '/LetMeSee/?op=log&severity=site_created&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerLog_ViralItemClicked(moreContent) {
	var fileTitle = 'clicked_'+document.title;
	var projectName = document.title;
	var customerName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'Room').getAttribute('customerName');
	if (customerName) fileTitle += '_'+ customerName;
	
	setTimeout(function() {
		aa_lmc_log('aa_viral_item_clicked');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,moreContent);

		$.ajax({
			url: '/LetMeSee/?op=log&severity=viral_item_clicked&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerLog_Logoff(email) {
	var fileTitle = '';
	var projectName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'Project').getAttribute('name');
	if (projectName) fileTitle += '_'+ projectName;
	var userName = window.jbLMCContext && aa_var_first(window.jbLMCContext,'User').getAttribute('name');
	if (userName) fileTitle += '_'+ userName;
	fileTitle += '_'+ email;
	
	setTimeout(function() {
		aa_lmc_log('aa_lmcApi_ServerJumpLog');
		var content = aa_lmcApi_ServerLogProjectData(fileTitle,email);

		$.ajax({
			url: '/LetMeSee/?op=log&severity=auto_logoff&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
			type: 'POST',
			headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
			data: content
		});
	},10);
}

function aa_lmcApi_ServerLogProjectData(fileTitle,moreContent) {
	var content = fileTitle + '\n';
	content += 'time='+(new Date()).toString()+'\n';
	content += 'url='+location.href + '\nplatform=' + navigator.platform +'\nwidth='+ window.innerWidth+'\nheight='+window.innerHeight+'\n';
	if (window.screen && screen.availWidth) content +='screen.availWidth='+screen.availWidth+"\nscreen.availHeight="+screen.availHeight+"\n";
	content += 'browser title=' + document.title + '\n';
	if (window.jbLMCContext) {
		var project = aa_var_first(window.jbLMCContext,'Project') || aa_parsexml('<xml/>');
		var projectID = project.getAttribute('id');
		var projectName = project.getAttribute('name');
		if (projectID) content += 'projectID='+projectID+'\n';
		if (projectName) content += 'projectName='+projectName+'\n';
		if (window.jbLMCVersion) content += 'project version='+jbLMCVersion+'\n';
		var user = aa_var_first(window.jbLMCContext,'User');
		if (user && user.getAttribute('name')) content += 'agent='+user.getAttribute('name')+'\n';
		if (user && user.getAttribute('email')) content += 'agent email='+user.getAttribute('email')+'\n';
	}
	if (window.jbUsingJSXPath) content += 'Using wicked good xpath\n';
	if (moreContent) content += moreContent;
	if (window.jBart && jBart.logs_str) content += '\n\nClient logs:\n-----------\n' + jBart.logs_str;
	return content;
}

function aa_rejectParamsToString(xhrObj,textStatus,errorThrown) {
	var out = '';
	try {
		out += 'xhrObject='+JSON.stringify(xhrObj) + '\n';	// TODO: make our own stringify
	} catch(e) {}
	try {
		out += 'readyState='+(xhrObj && xhrObj.readyState) + '\n';
		out += 'status='+(xhrObj && xhrObj.status) + '\n';
		out += 'textStatus=' + (textStatus || '')+'\n';
		var msg = (errorThrown && errorThrown.message) || errorThrown;
		if (msg) out += 'error= ' + msg + '\n';
	} catch(e) {}

	return out;
}

function aa_lmc_sendJoinLog(context) {
	try {
		if (ajaxart.jbart_studio) return;
		aa_lmc_log('aa_lmc_sendJoinLog');	

		var side = aa_cb_getSide(context);
		if (window.jbIsLMCManager) side = 'manager';
		aa_lmcApi_ServerVisitLog(side);
	} catch(e) {
		ajaxart.logException('error in send join log',e);
	}
}


function aa_lmcApi_ServerLog_VisitorReltimeCollab() {
	aa_lmc_log('aa_lmcApi_ServerLog_VisitorReltimeCollab');	

	if (window.jbLMCVisilogLogFileName)
     $.ajax({url: '/LetMeSee/?op=unLog&fileName=' + encodeURIComponent(jbLMCVisilogLogFileName)});

  var fileTitle = '';
  if (window.jbLMCContext) {
  	var projectName = document.title;
  	fileTitle = projectName + '_' + aa_var_first(jbLMCContext,'Room').getAttribute('customerName');
  }

	var content = aa_lmcApi_ServerLogProjectData(fileTitle,'');

	$.ajax({
		url: '/LetMeSee/?op=log&severity=visitor_realtime&title=' + encodeURIComponent(fileTitle.replace(/\s/g,'_')),
		type: 'POST',
		headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
		data: content,
		success: function(result) {
      window.jbLMCVisilogLogFileName = aa_parsexml(result).getAttribute('fileName');
		}
	}); 

}

function aa_lmcTrack(type,text,moreText,roomName) {
	try {
		if (!roomName) {
			var room = window.jbLMCContext && aa_var_first(window.jbLMCContext,'Room');
			roomName = room ? room.getAttribute('customerName') || room.getAttribute('name') : '';
		}

		if (window.jbLMCTrackUser) window.jbLMCTrackUser(type,text,moreText,roomName);
	} catch(e) {
		ajaxart.logException('aa_lmcTrack',e);
	}
}

aa_gcs("lmc",{
	LogEmailSentToAgent: function(profile,data,context) {
		var projectName = document.title;
		var room = aa_var_first(context,'Room');
		var fileTitle = 'site='+document.title+',room='+room.getAttribute('customerName')+',agent='+room.getAttribute('agent');
		
		setTimeout(function() {
			$.ajax({
				url: '/LetMeSee/?op=log&severity=agent_notification&title=' + encodeURIComponent(fileTitle),
				type: 'POST',
				headers: { 'Content-Type': 'text/plain; charset=utf-8'	},
				data: aa_lmcApi_ServerLogProjectData(fileTitle,'')
			});
		},10);		
	}
});

