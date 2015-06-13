ajaxart.load_plugin("","../widgets/letmesee/lmc_channel.xtml");

// TODO: make sendEvent a function and not a method

/* 
Flow options:
1. agent sending jump to the customer
2. agent sending room to the customer
3. customer sends window size to agent (and the agent shows a preview by this size)
4. customer changes the shownItem
5. customer adds a reply / agent adds a reply
6. customer sends join event
7. agents want to see customer position
8. visitor back button when moving between items
9. agent activity notifications
10. customer jump notification
11. agent switching between rooms
12. in newsfeed, the agent should see activities of several rooms
13. in embed, an activity of room should be available
14. agent updating room content while cobrowsing
*/

aa_gcs("lmc",{
	LetMeSee: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];
		appContext.cbItems = appContext.cbItems || {};
		appContext.lmcActivityLog = {};
		appContext.cbEventCounter = 0;
		appContext.cbOtherUIState = aa_cb_emptyUIState(appContext);
		return [{
			Load: function(data1, ctx) {
				window.jbLMCContext = ctx;
				appContext.cbMyUIState = aa_var_first(ctx,'UIState');

				window.jbDebugResource = function(varName) { // for debug
					return aa_var_first(ctx,varName);
				};

				appContext.FixEventObject = function(eventObject) {
					eventObject.args = eventObject.args || {};
			if (eventObject.fromCustomer) {
						if (eventObject.command != 'scroll') { 
							if (eventObject.command == 'jumped') {
								eventObject.type = 'jumped';
								var itemid = aa_parsexml(eventObject.args.uiState).getAttribute('itemShown');
								eventObject.args.agentLog = 'Jumped to: '+aa_lmc_itemid2itemname(context,itemid,eventObject.roomID);
							}	else if (eventObject.command == 'join') {
								eventObject.type = 'join';
								eventObject.args.agentLog = 'The customer has joined the room (' + eventObject.args.device + ',' + eventObject.args.browser + ')';
								if (isJoinBecauseOfRefresh(eventObject)) {
									eventObject.args.agentLog = 'The customer has refreshed the browser';
									eventObject.isRefreshJoin = true;
								}
							}	else if (eventObject.command == 'printItem') {
								eventObject.type = 'printItem';
								eventObject.args.agentLog = 'Printing item: ' + aa_lmc_itemid2itemname(context,eventObject.args.itemid,eventObject.roomID);
							}	else if (eventObject.command == 'callme') {
								eventObject.type = 'callme';
								eventObject.args.agentLog = 'Clicked on call me button';
							}	else if (eventObject.command == 'youtube_playing') {
								eventObject.type = 'youtube_playing';
								eventObject.args.agentLog = 'Playing Video: ' + eventObject.args.videoTitle;
							}	else if (eventObject.command == 'addReply') {
								eventObject.type = 'add reply';
								eventObject.args.agentLog = 'The customer has added a reply to ' + aa_lmcItemName(ctx,eventObject.args.item);
							}	else if (eventObject.command == 'agentInvitation') {
								eventObject.type = 'agentInvitation';
								if (eventObject.args.type == 'sms')
									eventObject.args.agentLog = 'An sms invitation was sent to ' + eventObject.args.phoneNumber;
								else
									eventObject.args.agentLog = 'An email invitation was sent to ' + eventObject.args.email;
							} else if (eventObject.command == 'itemShown') {
								eventObject.type = 'view';
								eventObject.args.agentLog = aa_lmc_itemid2itemname(context,eventObject.args.itemid,eventObject.roomID);
							}

							if (eventObject.args.agentLog) {
								var logItem = { Command: eventObject.command ,Text: eventObject.args.agentLog, Time: eventObject.time, Delay: eventObject.delay, Event: eventObject };
								appContext.lmcActivityLog[eventObject.roomID].push(logItem);
								if (!eventObject.firedByRefresh) aa_trigger(appContext, 'cbLogItemAdded', logItem);
							}

							if (eventObject.command == 'join') {
								var simulateMainPageEvt = { roomID: eventObject.roomID ,fromCustomer: true, command: 'itemShown', type: 'view', time: eventObject.time, args: { itemid: '', agentLog: 'Main Page', visitorID: eventObject.args.visitorID }};
								var logItem = { Command: simulateMainPageEvt.command ,Text: simulateMainPageEvt.args.agentLog, Time: simulateMainPageEvt.time, Event: simulateMainPageEvt};
								appContext.lmcActivityLog[eventObject.roomID].push(logItem);
								if (!eventObject.firedByRefresh) aa_trigger(appContext, 'cbLogItemAdded', logItem);
								appContext.lmcCustomerEvents.push(simulateMainPageEvt);
							}

						}

						// fix time of last shownItem
						if (eventObject.command != 'join' && eventObject.command != 'agentInvitation') {
							var evt = findLastItemShownEvent(appContext);
							if (evt && appContext.lmcCustomerEvents.length>2) {
								evt.duration = evt.duration || 0;
								var durationOfEvent = eventObject.time - appContext.lmcCustomerEvents[appContext.lmcCustomerEvents.length-2].time;
								durationOfEvent = Math.max(0,Math.min(durationOfEvent,60000));
								evt.duration += durationOfEvent;
							}
						}
						
					}
				};

				aa_bind(appContext, 'agentEvent', function(eventObject) {
					if (eventObject.command == 'goto' && !eventObject.firedByRefresh) 
						aa_cb_gotoParticipant(appContext,context,eventObject);
				});

				aa_bind(appContext, 'customerEvent', function(eventObject) {
					appContext.FixEventObject(eventObject);
					
					var command = eventObject.command;
					if (command == 'addReply' && !eventObject.firedByRefresh) aa_lmcHandleAddReplyEvent(context,eventObject);

					aa_trigger(appContext,'cbUpdateUIState',{ state: appContext.cbOtherUIState, eventObject: eventObject });					
				},'lmc_customer_event');

				appContext.cbChannel = aa_first(data, profile, 'ImplementingChannel', context);

				appContext.SendCoBrowseEvent = function(eventObject,onlyUpdateUIState) {
					if (!onlyUpdateUIState) appContext.cbChannel.SendCoBrowseEvent(eventObject);

					aa_trigger(appContext,'cbUpdateUIState',{ state: appContext.cbMyUIState, eventObject: eventObject });
					if (aa_cb_getSide(ctx) == 'visitor' && appContext.lmcCustomerEvents) appContext.lmcCustomerEvents.push(eventObject);
					if (aa_cb_getSide(ctx) == 'visitor') aa_trigger(appContext,'customerEvent',eventObject);
				};

				appContext.CoBrowseGotoParticipant = function() {
					aa_cb_gotoParticipant(appContext,context);
				};
				appContext.CoBrowseSuggestGoto = function() {
					aa_lmc_suggestGoto(appContext,context);
				};

				if (!window.jbOnHashChanged && aa_cb_getSide(ctx) == 'visitor') {
					window.onhashchange = function() {
						window.jbOnHashChanged();
					};
				}
				window.jbOnHashChanged = function() {
					if (window.jbIgnoreHashChange) return;
					window.jbInRefreshAfterHashChange = true;
					try {
						var newItem = aa_urlHashValue('item');
						var item = appContext.cbMyUIState.getAttribute('itemShown');
						if (item != newItem) {
							appContext.cbMyUIState.setAttribute('itemShown',newItem);
							appContext.cbMyUIState.setAttribute('scrollY','0');
							aa_cb_gotoState(appContext,context,appContext.cbMyUIState);
						}
					} catch(e) { ajaxart.logException('in jbOnHashChanged',e)}
					window.jbInRefreshAfterHashChange = false;
				};

				appContext.SendJumpAcknowledged = function(uistate,ctx) {
					var evt = {
						command: 'jumped',
						args: {
							uiState: ajaxart.xml2text(uistate)
						}
					};
					appContext.SendCoBrowseEvent(evt);
				};

				if (!ajaxart.jbart_studio) {
					window.onbeforeunload = function() {
						var msg = aa_lmc_filesBeforeWindowUnload(ctx);
						if (msg) return msg;
					};
				}

			}
		}];

		function getRoomPart(xml) {
			var iter = xml.nodeType == 1 ? xml : aa_xpath(xml,'..')[0];
			for(var iter;iter && iter.nodeType == 1;iter=iter.parentNode) {
				if (iter.tagName == 'items') return 'content';
				if (iter.tagName == 'filter') return 'filter';
			}
			return '';
		}

		function findLastItemShownEvent() {
			if (!appContext.lmcCustomerEvents) return null;
			for(var i=appContext.lmcCustomerEvents.length-2;i>=0;i--) {
				var cmd = appContext.lmcCustomerEvents[i].command;
				if (cmd == 'join') return null;
				if (cmd == 'itemShown') return appContext.lmcCustomerEvents[i];
			}
			return null;
		}

		function isJoinBecauseOfRefresh(eventObject) {
			if (!appContext.lmcCustomerEvents) return false;
			for(var i=appContext.lmcCustomerEvents.length-2;i>=0;i--) {
				var cmd = appContext.lmcCustomerEvents[i].command;
				if (cmd == 'join' || cmd == 'itemShown') {
					var evt = appContext.lmcCustomerEvents[i];
					if (cmd == 'join') {
						if (evt.args.visitorID && evt.args.visitorID != eventObject.args.visitorID) return false;
						if (evt.args.device != eventObject.args.device || evt.args.browser != eventObject.args.browser) return false;
					}
					return (evt.time + 60000*10 > eventObject.time);
				}
			}
			return false;
		}
	},
	IntegrationInitGetOrCreate: function(profile, data, context) {
		var embedConfig = aa_var_first(context,'EmbedConfig');
		if (ajaxart.jbart_studio && !embedConfig.getAttribute('roomid')) {
			embedConfig.setAttribute('roomid',aa_urlHashValue("sf_room") || "sf_room");
			embedConfig.setAttribute('name',aa_urlHashValue("sf_name") || "name from sf");
		}

		var roomID = embedConfig.getAttribute('roomid');
		var deferred = $.Deferred();

		aa_lmc_init(context,'getorcreate').then(function() {
			var roomFileObj = aa_lmcRoomFileObject(context,roomID);
			roomFileObj.loadCanFail = true;
			$.when(aa_lmc_loadAppFile(context,roomFileObj)).then(function(result) {
				embedConfig.setAttribute('found','true');
				deferred.resolve();
			},deferred.resolve);
		},deferred.reject);

		return [deferred.promise()];
	},
	InitLetMeSee: function(profile, data, context) {
		var fromEmbed = aa_bool(data,profile,'FromEmbed',context);

		var deferred = $.Deferred();
		aa_lmc_init(context,fromEmbed ? 'manager' : null).then(function() {
			aa_lmc_log('InitLetMeSee resolved');
			deferred.resolve();
		},function() {
			if (aa_bool(data,profile,'ShowErrorsWithoutRejecting',context)) {
				$('#lmc_vloading_progress').hide();
				if (!$('#lmc_vloading_error').text()) $('#lmc_vloading_error').text('Could not open LetMeSee');
			} else
				deferred.reject();
		});
		return [deferred.promise()];
	},	
	LMCChannel: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];
		var side = aa_cb_getSide(context);
		var roomID = ajaxart.urlparam('roomid') || aa_urlHashValue('roomid');
		var project = aa_var_first(context,'Project');

		ajaxart.runNativeHelper(data,profile,'Init',context);

		var channel = {			
			roomID: roomID,
			eventsToSend: [],
			SendPendingScrollEvent: function() {
				if (this.lmcPendingScrollEvent) {
					var evt = this.lmcPendingScrollEvent;
					this.lmcPendingScrollEvent = null;
					this.SendCoBrowseEvent(evt);
				}				
			},
			SendCoBrowseEvent: function(eventObject) {
				if (!this.roomID) {
					if (!ajaxart.jbart_studio) aa_errorLog('Error - cannot send event because room id is empty');
					return;
				}
				if (aa_cb_getSide(context) == 'agent' && !appContext.lmcInRealtimeSession) return; // no need to add to agent log if not in session
				if (window.location.href.indexOf('notracking=true') > -1) return;

				if (appContext.lmcWatchedInSession) aa_lmc_addWatchedInSessionToEvent(context,eventObject);

				if (this.lmcPendingScrollEvent) {
					this.eventsToSend.push(this.prepareAppendToFileEvent(this.lmcPendingScrollEvent));
					this.lmcPendingScrollEvent = null;
				}
				
				this.eventsToSend.push(this.prepareAppendToFileEvent(eventObject));
				this.sendEvents();							
			},
			prepareAppendToFileEvent: function(eventObject) {
				try {
					if (aa_cb_getSide(context) == 'visitor') {
						if (!window.localStorage.lmcVisitorID) 
							window.localStorage.lmcVisitorID = window.localStorage.lmcVisitorID || parseInt((Math.random() * 10000) + 1);
						
						eventObject.args.visitorID = window.localStorage.lmcVisitorID;
					}
				} catch(e) {}
				var args = JSON.stringify(eventObject.args || {});
				args.replace(/\n/g,'\\n');
				var now = new Date().getTime() + window.jbServerTimeDiff;
				eventObject.time = eventObject.time || now;
				var appendToFile = now + '|' + eventObject.command + '|' + args + '\n';
				return appendToFile;
			},
			cleanSendEventBuffer: function() {
				this.eventsToSend = [];
				this.sendingEvents = false;
			},
			sendEvents: function() {
				var channel = this;
				if (this.sendingEvents) return;
				this.sendingEvents = true;

				if (this.eventsToSend.length == 0) {
					this.sendingEvents = false;	// we're done
					return;
				}
				var toAppend = this.eventsToSend[0];
				this.eventsToSend = this.eventsToSend.slice(1); // remove the first item

				aa_consoleLog('append event to customer log:  ' + toAppend);
				$.when(aa_lmcApi_appendToLog({
					project: aa_lmc_projectID(context),
					room: channel.roomID,
					logFile: side,
					toAppend: toAppend
				})).done(function() {
						channel.sendingEvents = false;
						if (channel.eventsToSend.length) 
							channel.sendEvents();
						else if (jBart.callHome)
							jBart.callHome.fireCallHome(channel.roomID + '_' + aa_cb_getSide(context));
				}).fail(function() {
					channel.sendingEvents = false;
				});
			},
			Init: function(data1,ctx) {
				return aa_lmc_init(ctx);
			},
			SaveVisitorStats: function(stats) {
				if (!this.roomID || side != 'visitor') return;
				if (window.location.href.indexOf('notracking=true') > -1) return;

				aa_lmcApi_saveStats({ content: ajaxart.xml2text(stats), project: aa_lmc_projectID(context), room: this.roomID }).then(function() {},function() {
					aa_lmcApi_ServerErrorLog('visitor_save_stats','',ajaxart.xml2text(stats));
				});
			}
		};

		return [channel];		
	},
	CustomerActivityLogItems: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];
		var roomID = aa_text(data,profile,'RoomID',context);
		var out = appContext.lmcActivityLog[roomID] || [];

		return out.concat().reverse();
	},
	LoadVisitorStats: function(profile, data, context) {
		return aa_fromPromise(aa_lmcLoadVisitorStats(context));
	},
	LMCSendSMS: function(profile, data, context) {
		var deferred = $.Deferred();
		aa_lmcApi_SendSMS({
			project: aa_lmc_projectID(context),
			key: aa_cb_getSide(context) == 'agent' ?  aa_lmc_projectKey(context) : 'visitor',
			from: aa_text(data,profile,'From',context),
			to: aa_text(data,profile,'To',context),
			content: aa_text(data,profile,'Content',context),
			noUnicode: aa_bool(data,profile,'NoUnicodeChars',context)
		}).then(function() {
			if (aa_bool(data,profile,'AddInvitationToVisitorLog',context))
				ajaxart.runNativeHelper(data,profile,'AddInvitation',context);
			deferred.resolve();
		},deferred.reject);
		return [deferred.promise()];
	}
});


function aa_lmcLoadVisitorStats(context) {
	var appContext = context.vars._AppContext[0];
	var channel = appContext.cbChannel;

	if (!channel.roomID) return [];
	var deferred = $.Deferred();

	$.when(aa_lmcApi_loadStats({
		project: aa_lmc_projectID(context),
		room: channel.roomID
	})).then(function(result) {
		var stats = aa_var_first(context,'RoomVisitorStats');
		aa_setDataResource(context,'RoomVisitorStats',aa_parsexml(result));
		if (aa_cb_getSide(context) == 'agent') aa_lmc_agentCheckVisitorStats(context);
		aa_trigger(appContext,'visitorStatsLoaded');
		deferred.resolve();
	},deferred.reject);

	return deferred.promise();
}

function aa_lmcEnsureProjectCreated(context) {
	aa_lmc_log('EnsureProjectCreated');
	if (aa_cb_getSide(context) == 'visitor') return null;
	if (aa_var_first(context,'Project').getAttribute('nodrive') == 'true') return null;
	var project = aa_var_first(context,'Project');

	if (project.getAttribute('id') && window.googledrive_lib && googledrive_lib.CurrentFile && project.getAttribute('driveid') != googledrive_lib.CurrentFile.id) {
		if (window.jbGoogleDriveDocument && !ajaxart.jbart_studio) {
			project.setAttribute('driveid',googledrive_lib.CurrentFile.id);
			jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(project);
			jbGoogleDriveDocument.save();
		}
	}
	if (window.jbGoogleDriveDocument && project.getAttribute('name') != jbGoogleDriveDocument.title && !ajaxart.jbart_studio) {
			project.setAttribute('name',jbGoogleDriveDocument.title);
			jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(project);
			jbGoogleDriveDocument.save();				
	}
	if (project.getAttribute('id')) return null;
	return aa_lmc_createProject(context);
}

function aa_lmc_init_visitor(context) {	
	var appContext = context.vars._AppContext[0];
	var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
	var endTime;

	aa_lmc_log('starting lmc init visitor');
	aa_lmc_addPreloadLogs();
	appContext.lmcInitialized = true;
	appContext.lmcInInit = true;
	var deferred = $.Deferred();

	$.when(aa_lmcApi_syncServerTime(),aa_lmc_initVisitorRoom(context)).fail(deferred.reject).done(function() {
		appContext.lmcInInit = false;
		aa_lmc_sendJoinLog(context);
		resolveByTimeout();
	});
	return deferred.promise();

	function resolveByTimeout() {
		aa_lmc_log('resolveByTimeout (in lmc init)');
		endTime = new Date().getTime();
		$('#lmc_vloading_progress').stop().animate({ width: screenWidth+'px'},30);

		var delay = 0;
		if (window.jbStartLoadingTime) {
			var diff = endTime - window.jbStartLoadingTime;
			delay = Math.max(2000 - diff,0);
		}
		setTimeout(function() {
			aa_lmc_log('lmc init resolved');
			tryFinish();			
			// setTimeout(function() {
			// 	aa_lmc_initMobileBookmarkBubble(aa_var_first(context,'Room').getAttribute('id'));				
			// },15000);
		},delay);				
	}

	function tryFinish() {
		if ($('#lmc_vloading_progress').width() > screenWidth - 10 || new Date().getTime() - endTime > 1500)
			deferred.resolve();
		else
			setTimeout(tryFinish,200);
	}
}

function aa_lmc_initVisitorRoom(context) {
	aa_lmc_log('aa_lmc_initVisitorRoom');	
	var deferred = $.Deferred();

	var appContext = context.vars._AppContext[0];
	var roomID = appContext.cbChannel.roomID;
	aa_lmcApi_getFile(aa_lmc_projectID(context),'rooms/' + roomID + '.xml',true,1,progress).then(function(result,gen) {
		var roomXml = aa_parsexml(result);
		if (roomXml.getAttribute('redirect'))
			window.location.href = roomXml.getAttribute('redirect');

		appContext.lmcVisitorRoomGeneration = gen;
		aa_setDataResource(context,'Room',roomXml);
		aa_trigger(appContext,'roomLoaded',{ firstTime: true });
		deferred.resolve();
		var browserTitle = aa_xpath_text(result,'settings/@browserTitle');
		if (browserTitle) document.title = browserTitle;
		
		// loading it in the background (after we're shown the room to the user)
		setTimeout(function() {
			aa_lmc_readRoomActivityLogs(context,roomID); 
			aa_lmcLoadVisitorStats(context);			
		},50);
	},function(e) {
		if (e == 'not found' && aa_urlAttribute('mode') == 'getorcreate')
			return $.when(aa_lmc_initVisitorRoomLazyCreate(context)).then(deferred.resolve,deferred.reject);

		// room not loaded
		roomDeletedOrArchived().then(function(deletedOrArchived,roomContentXml) {
			if (deletedOrArchived != 'archive') {
				$('#lmc_vloading_error').text('Room is not available').show();
				$('#lmc_vloading_progress').hide();
				window.jbDoNotSendNotLoadingError = true; // no need - we have the error we need
			}

			var notLoading = 'not_loading_';
			// TODO: show something intelligent to the user
			if (deletedOrArchived == 'archive') {
				aa_lmcApi_restoreFromArchive({ project: aa_lmc_projectID(context), room: roomID	}).then(function() {
					aa_lmc_initVisitorRoom(context).then(function() {
						var roomXml = aa_var_first(context,'Room');
						deferred.resolve();
						if (appContext.lmcNotifyAgentForRestoredRoom) 
							appContext.lmcNotifyAgentForRestoredRoom([roomXml],context);
						aa_lmcApi_ServerLog_RestoreRoom(roomXml);
					},deferred.reject);
				},function() {
					deferred.reject;
					aa_lmcApi_ServerErrorLog('could_not_auto_restore_archived_room_from_customer');	
				});
			}
			else if (deletedOrArchived == 'deleted') {
				aa_lmcApi_ServerErrorLog(notLoading+'room_deleted_'+roomID);
				if (appContext.lmcNotifyAgentForDeletedRoom) appContext.lmcNotifyAgentForDeletedRoom([roomContentXml],context);
			} else {
				var message = 'Error loading file';
				aa_lmcApi_ServerErrorLog(notLoading+'room_not_found_'+roomID,message);
			}
		});
	});

	return deferred.promise();

	function roomDeletedOrArchived() {
		var deferred2 = $.Deferred();
		aa_lmcApi_getFile(aa_lmc_projectID(context),'archive/rooms/' + roomID + '.xml',true).then(function() {
			deferred2.resolve('archive');
		},function() {
			aa_lmcApi_getFile(aa_lmc_projectID(context),'deleted/rooms/' + roomID + '.xml',true).then(function(result) {
				deferred2.resolve('deleted',aa_parsexml(result));
			},function() {
				deferred2.resolve();
			});
		});
		return deferred2.promise();		
	}

	function progress(evt) {
		if (!evt.total || evt.total == evt.loaded) return;
		var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);

		var pixels = parseInt( screenWidth * ( 0.5 + (evt.loaded * 0.5 / evt.total) ) );
		$('#lmc_vloading_progress').animate({ width: pixels+'px' },100);
	}
}

function aa_lmc_initVisitorRoomLazyCreate(context) {
	var deferred = $.Deferred();

	var appContext = context.vars._AppContext[0];
	var template = aa_urlAttribute('template');
	var roomID = appContext.cbChannel.roomID;

	aa_lmcApi_getFile(aa_lmc_projectID(context),'rooms/' + template + '.xml',false).then(function(result) {
		var roomXml = aa_parsexml(result);
		$(roomXml).attr('isTemplate','').attr('id',roomID);
		$(roomXml).attr('customerName',aa_urlAttribute('name')).attr('customerCompany',aa_urlAttribute('company'));
		$(roomXml).attr('phone',aa_urlAttribute('phone'));

		finish();
	},deferred.reject);

	function finish(roomXml) {
		appContext.lmcVisitorRoomGeneration = gen;
		aa_setDataResource(context,'Room',roomXml);
		deferred.resolve();
		var browserTitle = aa_xpath_text(roomXml,'settings/@browserTitle');
		if (browserTitle) document.title = browserTitle;	

		setTimeout(function() {
			// create the room first time (after we've shown it to the user)
			$.when(aa_lmcApi_createRoom({content: ajaxart.xml2text(roomXml), roomID: roomID })).then(function() {
				aa_trigger(appContext,'roomLoaded',{ firstTime: true });
				aa_lmc_readRoomActivityLogs(context,roomID);
				aa_lmcLoadVisitorStats(context);
			},function() {});
		},50);
	}

	return deferred.promise();
}

function aa_lmc_init(context,fromEmbed) {
	var appContext = context.vars._AppContext[0];
	if (appContext.lmcInitialized) return $.Deferred().resolve().promise();
	
	aa_lmc_initGlobalJSFunctions(context);	

	if (aa_cb_getSide(context) == 'visitor') 
		return aa_lmc_init_visitor(context);

	aa_lmc_sendJoinLog(context);

	aa_lmc_addPreloadLogs();
	appContext.lmcInitialized = true;
	appContext.lmcInInit = true;
	var channel = appContext.cbChannel;
	if (fromEmbed == 'manager') {
		var embedConfig = aa_var_first(context,'EmbedConfig');
		var type = embedConfig.getAttribute('type');
		var project = embedConfig.getAttribute('project');
		var room = embedConfig.getAttribute('room');
		var key = embedConfig.getAttribute('key');
		if (project) aa_var_first(context,'Project').setAttribute('id',project);		
		if (key) aa_var_first(context,'Project').setAttribute('key',key);		
		if (room) channel.roomID = room;
		appContext.fromEmbed = true;
	}
	if (fromEmbed == 'getorcreate') {
		var embedConfig = aa_var_first(context,'EmbedConfig');
		var room = null;
		appContext.fromEmbed = true;
	}

	var loadHeaders = aa_cb_getSide(context) == 'agent' && !fromEmbed;

	var deferred = $.Deferred();

	$.when(aa_lmcApi_syncServerTime()).fail(deferred.reject).done(function() {
		aa_lmc_log('lmc init after syncServerTime');
		aa_lmcCheckForVersionUpdate(context);
		aa_lmc_log('lmc after aa_lmcCheckForVersionUpdate');
		aa_lmcAgentSuggestRestartAfterTooLong(context);
		aa_lmc_log('lmc after aa_lmcAgentSuggestRestartAfterTooLong');
		$.when(aa_lmcEnsureProjectCreated(context)).then(function() {
			aa_lmc_log('lmc after EnsureProjectCreated');
			$.when(loadHeaders ? aa_lmc_loadRoomHeaders(context) : null).then(function() {
				if (!channel.roomID && aa_cb_getSide(context) == 'agent' && !aa_urlHashValue('lmcpage')) {
					var rooms = aa_xpath(aa_var_first(context,'RoomHeaders'),'*');
					if (rooms.length > 5)
						aa_setUrlHashValue('lmcpage','news');
					else
						channel.roomID = rooms[0] && rooms[0].getAttribute('id');
				}
	
				$.when(aa_lmc_loadProjectSettings(context),aa_lmc_setCurrentRoom(context,channel.roomID),aa_lmcGetUserInfo(context)).then(function() {
					appContext.lmcInInit = false;
					aa_lmc_log('lmc init resolved');
					deferred.resolve();
					// setTimeout(function() {
					// 	aa_lmc_initMobileBookmarkBubble(aa_lmc_projectID(context));				
					// },15000);

				},function() {
					aa_errorLog('Error - could not set current room');
					$('#lmc_vloading_error').text('Room is not available');
					deferred.reject();
				});
			},function() { 
				aa_errorLog('Error - could not load room headers');
				deferred.reject(); 
			});
		},function() { 
			aa_errorLog('Error - could not create project properly');
			deferred.reject(); 
		});
		
	});
	return deferred.promise();
}
aa_gcs("lmc",{
	SaveVisitorHtmlForInstance:function(profile,data,context) {
		aa_lmc_saveProjectVisitorHtml(context);
	},
	DeleteLMCRoom: function(profile,data,context) {
		var room = aa_first(data,profile,'Room',context);
		return [aa_lmc_deleteRoom(context,room)];
	},
	LMCMoveRoomToArchive: function(profile,data,context) {
		var room = aa_first(data,profile,'Room',context);
		return [aa_lmc_moveToArchive(context,room)];
	},
	LMCRestoreRoomFromArchive: function(profile,data,context) {
		var roomID = aa_text(data,profile,'RoomID',context);
		return [aa_lmc_restoreFromArchive(context,roomID)];
	},
	EnsureRoomUrl: function(profile,data,context) {
		return [aa_lmc_ensureVisitorUrlInRoom(context,aa_first(data,profile,'RoomXml',context))];
	},
	EnsureCustomerActivityLog: function(profile,data,context) {
		var roomID = aa_text(data,profile,'RoomID',context);
		if (!roomID) return;
		var projectID = aa_text(data,profile,'ProjectID',context);
		var appContext = context.vars._AppContext[0];

		appContext.lmcActivityLog[roomID] = [];

		return [aa_lmcLoadCustomerActivityFile(context,projectID,roomID,false,true)];
	},
	EnsureRoomInFullRooms: function(profile,data,context) {
		var id = aa_text(data,profile,'RoomID',context);
		var projectID = aa_text(data,profile,'ProjectID',context);
		var externalLink = aa_text(data,profile,'ExternalLink',context);
		if (externalLink) {
			id = externalLink.split('/rooms/')[1].split('.')[0];
			projectID = externalLink.split('/letmesee1/')[1].split('/')[0];
		}

		if (!id) return;
		var fullRooms = aa_var_first(context,'FullRooms');

		if (id != 'All Templates') {
			return aa_fromPromise(fullLoad(id,projectID));
		} else {
			if (aa_var_first(context,'ProjectSettings').getAttribute("useCatalogIndex") == "true") {	// index
				var deferred2 = $.Deferred();
				var index = aa_var_first(context,'CatalogIndex');
				if (aa_xpath(index,'*')[0]) return;	// index already exist

				$.when(aa_lmcApi_getFile(projectID,'catalogIndex.xml',true)).then(function(result,generation) {
					var resultAsXml = aa_parsexml(result);
					ajaxart.xml.copyElementContents(index,resultAsXml,false);
					deferred2.resolve();
				},deferred2.reject);

				return [ deferred2 ];
			} else { // load all templates
				var templates = aa_xpath(aa_var_first(context,'RoomHeaders'),"*[@isTemplate='true']");
				var promises = [];
				for(var i=0;i<templates.length;i++)
					promises.push(fullLoad(templates[i].getAttribute('id'),projectID));

				var externalTemplates = ajaxart.runNativeHelper(data,profile,'ExternalTemplates',context);
				for(var i=0;i<externalTemplates.length;i++) {
					var link = externalTemplates[i].getAttribute('link') || '';
					var exid = link.split('/rooms/')[1].split('.')[0];
					var exproject = link.split('/letmesee1/')[1].split('/')[0];
					promises.push(fullLoad(exid,exproject));
				}
			}


			return [ $.when.apply($,promises) ];
		}

		function fullLoad(roomid,project_id) {
			var deferred2 = $.Deferred();
			if (aa_xpath(fullRooms,'*[#'+roomid+']')[0]) return;

			$.when(aa_lmcApi_loadRoom({
				project: project_id,
				room: roomid
			})).then(function(result,generation) {
				var resultAsXml = aa_parsexml(result);
				if (!aa_xpath(fullRooms,'*[#'+roomid+']')[0]) 
					aa_xml_appendChild(fullRooms,resultAsXml);
				deferred2.resolve();
			},deferred2.reject);

			return deferred2;
		}
	},
	LoadRoomHeaders: function(profile,data,context) {
		var promise = aa_lmc_loadRoomHeaders(context);
		return promise ? [promise] : [];
	},
	LoadRoomArchiveHeaders: function(profile,data,context) {
		var deferred = $.Deferred();
		aa_lmcApi_getFile(aa_lmc_projectID(context),'archive/roomHeaders_' + aa_lmc_projectKey(context)+'.xml',true).then(function(result) {
			aa_run([aa_parsexml(result)],profile,'DoWithHeaders',context);
			deferred.resolve();
		},function() {
			aa_run([aa_parsexml('<headers/>')],profile,'DoWithHeaders',context);
			deferred.resolve();
		});
		return [deferred.promise()];
	},
	LMCRoomsInHeaders: function(profile,data,context) {
		var alsoArchives = aa_bool(data,profile,'AlsoArchies',context);
		if (aa_var_first(context,'RoomHeaders')) {
			var out = aa_xpath(aa_var_first(context,'RoomHeaders'),'*');
			if (alsoArchives) out = out.concat(aa_xpath(aa_var_first(context,'ArchiveHeaders'),'*'));
			return out;
		}

		// if we're here it's the manager
		var projectOrGroup = aa_text(data,profile,'ProjectOrGroup',context);
		var allHeaders = aa_xpath(aa_var_first(context,'AllRoomHeaders'),'*');
		if (alsoArchives)
			allHeaders = allHeaders.concat(aa_xpath(aa_var_first(context,'AllRoomArchiveHeaders'),'*'));

		var projects = [],out=[];
		if (projectOrGroup) {
			var groupXml = aa_xpath(aa_var_first(context,'Projects'),'group[#'+projectOrGroup+']')[0];
			if (!groupXml) 
				projects.push(projectOrGroup);
			else {
				projects = aa_split(groupXml.getAttribute('projects'),',',true);
			}
		}
		for(var i=0;i<allHeaders.length;i++) {
			if (!projectOrGroup || projects.indexOf(allHeaders[i].getAttribute('id')) > -1)
				out = out.concat(aa_xpath(allHeaders[i],'*/*'));
		}
		return out;
	},
	SetCurrentRoom: function(profile,data,context) {
		var roomID = aa_text(data,profile,'RoomID',context);
		var deferred = $.Deferred();
		var pageToShow = aa_text(data,profile,'PageToShow',context);
		aa_setUrlHashValue('lmcpage',pageToShow);
		aa_setUrlHashValue('view','room');

		$.when(aa_lmc_setCurrentRoom(context,roomID)).then(deferred.resolve,deferred.reject);
		return [deferred.promise()];
	},
	DriveID: function(profile,data,context) {
		if (window.jbLMCDriveID) return [jbLMCDriveID];
	},
	CreateRoom: function(profile,data,context) {		
		var roomXml = aa_first(data,profile,'RoomXml',context).cloneNode(true);
		if (aa_bool(data,profile,'AllocateNewID',context))
			roomXml.setAttribute('id','');

		var sms = aa_xpath(roomXml,'sms')[0];
		if (sms) sms.parentNode.removeChild(sms);
		var waitForTinyUrl = aa_bool(data,profile,'WaitForTinyUrl',context);
		var promise = aa_lmc_createRoom(context,roomXml,false,false,!waitForTinyUrl);
		if (waitForTinyUrl) {
			var deferred = $.Deferred();
			promise.done(function() {
				roomXml = aa_var_first(context,'Room');
				var url = 'http://jb-letmesee.appspot.com/LetMeSee/'+ aa_lmc_projectID(context) + '.html?roomid='+roomXml.getAttribute('id');
				roomXml.setAttribute('url',url);
				roomXml.setAttribute('tinyUrl',url);
				aa_triggerXmlChange(roomXml);
				aa_lmcTinyUrl(url).then(function(tiny) {
					roomXml.setAttribute('tinyUrl',tiny);
					aa_triggerXmlChange(roomXml);
					deferred.resolve();
				},deferred.resolve);
			});
			return [deferred.promise()];
		}
		return promise ? [promise] : [];
	},
	RefreshCustomerActivity: function(profile,data,context) {
		var roomID = aa_var_first(context,'Room').getAttribute('id');
		if (!roomID) return;

		var appContext = context.vars._AppContext[0];
		var index = appContext.lmcLastReadCustomerEvent;
		var wasInSession = appContext.lmcInRealtimeSession;
		var prevLength = appContext.lmcCustomerEvents && appContext.lmcCustomerEvents.length;
		aa_lmcLoadCustomerActivityFile(context,aa_lmc_projectID(context),roomID,true).then(function() {
			if (aa_bool(data,profile,'ForceListening',context)) appContext.lmcInRealtimeSession = true;
			
			if (!wasInSession && appContext.lmcInRealtimeSession) aa_lmc_listenToCallHomeIfNeeded(context);

			if (prevLength != appContext.lmcCustomerEvents.length)
				ajaxart.runNativeHelper(data,profile,'OnUpdate',context);
		});
	}
});

function aa_lmc_readRoomActivityLogs(context,roomID) {
	var appContext = context.vars._AppContext[0];
	var side = aa_cb_getSide(context);
	var channel = appContext.cbChannel;
	channel.cleanSendEventBuffer();
	appContext.lmcActivityLog[roomID] = [];
	appContext.lmcCustomerEvents = []; 

	appContext.lmcLastReadCustomerEvent = appContext.lmcLastReadAgentEvent = -1; // for call home

	return $.when(
			aa_lmcLoadAgentActivityFile(context,roomID),
			aa_lmcLoadCustomerActivityFile(context,aa_lmc_projectID(context),roomID))
//			aa_lmcLoadReplies(context,roomID))
	.then(function() {
			aa_lmc_listenToCallHomeIfNeeded(context);

			if (!ajaxart.jbart_studio && side == 'visitor') {
				setTimeout(function() {
						aa_trigger(appContext,'joinChannel');			
				},10);
			}			
	});
}

function aa_lmcCallHomeFired(context) {
	var roomID = aa_var_first(context,'Room').getAttribute('id');
	if (!roomID) return;
	aa_lmc_log('Got call home');

	if (aa_cb_getSide(context) == 'agent')
		aa_lmcLoadCustomerActivityFile(context,aa_lmc_projectID(context),roomID,true);

	if (aa_cb_getSide(context) == 'visitor') {
		aa_lmc_visitor_checkForRoomUpdate(context);
		aa_lmcLoadAgentActivityFile(context,roomID,true);
		setTimeout(function() {aa_lmcApi_ServerLog_VisitorReltimeCollab();},3000);
	}
}

function aa_lmc_visitor_checkForRoomUpdate(context) {
	var appContext = context.vars._AppContext[0];
	var roomID = appContext.cbChannel.roomID;
	aa_lmcApi_getFile(aa_lmc_projectID(context),'rooms/' + roomID + '.xml').then(function(result,gen) {
		if (gen == appContext.lmcVisitorRoomGeneration) return;
		appContext.lmcVisitorRoomGeneration = gen;
		result = aa_parsexml(result);
		var oldRoom = aa_var_first(context,'Room');
		aa_setDataResource(context,'Room',result);

		if ( ajaxart.xml2text(aa_xpath(oldRoom,'items')[0]) != ajaxart.xml2text(aa_xpath(result,'items')[0]) ) {
			aa_lmc_runActionAndKeepUIState(context,function() {
				aa_refresh_field(['items_cntr']);
			});
			aa_trigger(appContext,'roomUpdatedNotification');
		}
	});
}

function aa_lmc_listenToCallHomeIfNeeded(context) {
	var appContext = context.vars._AppContext[0];
	if (window.location.href.indexOf('notracking=true') > -1) return;
	if (aa_cb_getSide(context) == 'agent' && !appContext.lmcInRealtimeSession) return;
	if (appContext.fromEmbed) return; 
	var otherSide = aa_cb_getSide(context) == 'agent' ? 'visitor' : 'agent';
	var roomID = aa_var_first(context,'Room').getAttribute('id');
	if (!roomID) return;
	var startTime = new Date().getTime();

	if (jBart.callHome) {
		if (jBart.callHome.iframe) jBart.callHome.iframe.remove();
		if (jBart.callHome.listener) window.removeEventListener('message', jBart.callHome.listener);  // a single call home listener
	}
	var channel_server = 'https://jb-letmesee.appspot.com/';
	var hostDomain = window.location.href.split('/').slice(0,3).join('/');
	var client = roomID + '_' + otherSide;

	jBart.callHomeTokenCallback = function(xml) {
		var token = xml.split('token="')[1].split('"')[0];
		var url = channel_server + 'CallHomeListener.html?token=' + token + '&hostDomain=' + hostDomain;

		if (jBart.callHome && jBart.callHome.listener) {
			window.removeEventListener('message', jBart.callHome.listener);
		}

		jBart.callHome = {
			iframe: $('<iframe />').attr('src', url).css('display', 'none').appendTo($('body')),
			listener: function(evt) {
				if (evt.data == 'CallHome') aa_lmcCallHomeFired(context);
				if (evt.data && evt.data.indexOf('CallHomeError') == 0 ){
					if (new Date().getTime() - startTime < 5000) {
						appContext.lmcInRealtimeSession = false;
						aa_lmcApi_ServerErrorLog('channel_error','There was an error establishing realtime connection with the customer',evt.data);
					} else {
						// probably a timeout. try opnening the connection again
						aa_lmc_log('reopening realtime channel ' + evt.data);
//						aa_lmc_listenToCallHomeIfNeeded(context);
					}
				}
			},
			fireCallHome: function(clientToFire) {
				aa_lmc_log('Firing call home - ' + clientToFire);
				$.getScript(channel_server + 'LetMeSee/?op=sendCallHomeToClient&client=' + clientToFire);
			}
		};
		aa_addEventListener(window,'message', jBart.callHome.listener);
	};

	aa_lmc_log('opening realtime channel for room ' + roomID);

	$.getScript(channel_server + 'LetMeSee/?op=getClientChannelToken&client='+client+'&callback=jBart.callHomeTokenCallback').fail(function() {
		aa_lmcApi_ServerErrorLog('creating_callhome_channel');
	});

}

function aa_lmcLoadReplies(context,roomID,fromCallHome) {
	var appContext = context.vars._AppContext[0];
	appContext.lmcRoomReplies = [];
	var deferred2 = $.Deferred();

	aa_lmcApi_getFile(aa_lmc_projectID(context),'reply/'+roomID+'.txt',true).then(function(result) {
		var lines = result.split('\n');
		for(var i=0;i<lines.length;i++) {
			if (!lines[i]) continue;
			try {
				var parts = lines[i].split(',');
				var text = lines[i].substring(parts[0].length+parts[1].length+parts[2].length+parts[3].length+4);
				text = text.replace(/<br>/g,'\n');
				appContext.lmcRoomReplies.push({
					time: parseInt(parts[0]) - window.jbServerTimeDiff,
					from: parts[1],
					userName: parts[2],
					item: parts[3],
					text: text
				});
			} catch(e) {
			}
		}
		deferred2.resolve();
	},deferred2.resolve);  // it's ok if the replies file cannot be read
	return deferred2.promise();
}

function aa_lmcLoadCustomerActivityFile(context,projectID,roomID,fromCallHome,notCurrentRoom) {
	var appContext = context.vars._AppContext[0];
	var deferred2 = $.Deferred();
	if (!projectID) {
		ajaxart.log('Calling aa_lmcLoadCustomerActivityFile with empty projectid','error');
		return deferred2.reject().promise();
	}
	if (!roomID) {
		return deferred2.reject().promise();
		ajaxart.log('Calling aa_lmcLoadCustomerActivityFile with empty roomID','error');
	}
	if (!notCurrentRoom) appContext.lmcInRealtimeSession = false;	

	return aa_lmcApi_loadLogFile({
		project: projectID,
		room: roomID,
		logFile: 'visitor'
	}).then(function(result) {
		if (!appContext.lmcLastReadCustomerEvent || notCurrentRoom) appContext.lmcCustomerEvents = [];

		var now = new Date().getTime() + window.jbServerTimeDiff;
		var lines = result.split('\n');
		for(var i=0;i<lines.length;i++) {
			if (lines[i] && (i > appContext.lmcLastReadCustomerEvent || notCurrentRoom)) {
				var eventObject = aa_lmc_lineToEvent(lines[i]);
				if (!eventObject) continue;
				eventObject.roomID = roomID;
				eventObject.firedByRefresh = !fromCallHome || notCurrentRoom;
				if (fromCallHome) calculateDelay(eventObject);
				eventObject.fromCustomer = true;
				if (notCurrentRoom) {
					appContext.lmcCustomerEvents.push(eventObject);
					appContext.FixEventObject(eventObject);
				} else {
					appContext.lmcCustomerEvents.push(eventObject);
					aa_trigger(appContext, 'customerEvent', eventObject); 
					appContext.lmcLastReadCustomerEvent = i;
					if (now - eventObject.time < 1000*60*30) appContext.lmcInRealtimeSession = true; // there was an activity in the last 30 minutes
				}
			}
		}
		deferred2.resolve();
	},deferred2.resolve);

	return deferred2.promise();

	function calculateDelay(evt) {
		var myServerTime = new Date().getTime() + window.jbServerTimeDiff;
		var evtServerTime = parseInt(evt.time) + window.jbServerTimeDiff;
		evt.delay = myServerTime - evtServerTime;
		if (evt.delay > 20000) evt.delay= null;
		aa_lmc_log('event delay='+evt.delay);
	}	
}

function aa_lmcLoadAgentActivityFile(context,roomID,fromCallHome) {
	if (aa_cb_getSide(context) == 'agent') return $.Deferred().resolve().promise(); // the agent log is interesting only in the visitor side
	var appContext = context.vars._AppContext[0];

	var deferred2 = $.Deferred();
	if (!roomID) {
		return deferred2.reject().promise();
		ajaxart.log('Calling aa_lmcLoadAgentActivityFile with empty roomID','error');
	}

	return aa_lmcApi_loadLogFile({
		project: aa_lmc_projectID(context),
		room: roomID,
		logFile: 'agent'
	}).then(function(result) {
		var lines = result.split('\n');
		for(var i=0;i<lines.length;i++) {
			if (lines[i] && i > appContext.lmcLastReadAgentEvent) {
				if (fromCallHome) {
					var eventObject = aa_lmc_lineToEvent(lines[i]);
					if (eventObject) aa_trigger(appContext, 'agentEvent', eventObject);
				}
				appContext.lmcLastReadAgentEvent = i;
			}
		}
		deferred2.resolve();
	},deferred2.resolve);  // it's ok if the replies file cannot be read
	return deferred2.promise();
}

function aa_lmc_setCurrentRoom(context,roomID) {
	aa_lmc_log('aa_lmc_setCurrentRoom',context,true);	
	var appContext = context.vars._AppContext[0];
	var deferred = $.Deferred();
	if (!roomID) {
		aa_setDataResource(context,'Room',aa_parsexml('<room/>'));
		aa_setUrlHashValue('roomid','');
		if (aa_cb_getSide(context) == 'agent' && !appContext.lmcInInit) {
			aa_trigger(appContext,'lmcShownRoomChanged',{});
		}
		return null;
	}
	if (aa_var_first(context,'Room') && roomID == aa_var_first(context,'Room').getAttribute('id') && aa_lmc_getFileObj(context,'room') && aa_lmc_getFileObj(context,'room').modified) {
		// a rare case when someone changes a room and then tries to refresh it before the auto save
		aa_lmc_log('save room and refresh before auto save');	
		return;
	}
	if (aa_cb_getSide(context) == 'agent')
		aa_setUrlHashValue('roomid',roomID);

	$('#activity').text('Loading Room...');

	var roomFileObj = aa_lmcRoomFileObject(context,roomID);
	$.when(aa_lmc_loadAppFile(context,roomFileObj)).then(function(result) {
		roomLoaded();
	},function() {
		aa_setUrlHashValue('roomid','');
		aa_setUrlHashValue('lmcpage','rooms_list');
		aa_refresh_field(['AgentDesktop']);

		deferred.resolve();			
	});

	return deferred.promise();

	function roomLoaded() {
		appContext.cbChannel.roomID = roomID;
		if (aa_var_first(context,'Room').getAttribute('isTemplate') == 'true')
			return finish();
		
		aa_lmc_readRoomActivityLogs(context,roomID).then(function() {
			aa_lmc_log('room activity logs loaded');
			loadVisitorStats();
		},function() {
			// an error - we still continue
			aa_lmc_log('error loading activity logs - continue anyway');
			loadVisitorStats();
		});
	}
	function loadVisitorStats() {
		if (aa_cb_getSide(context) == 'agent')
			aa_lmcLoadVisitorStats(context).then(loadAgentInfo,deferred.reject);
		else 
			loadAgentInfo();
	}
	function loadAgentInfo() {
		if (aa_cb_getSide(context) == 'visitor') return finish();
		if (aa_var_first(context,'RoomAgentInfo').getAttribute('id') == roomID) return finish();
		if (!aa_lmc_projectKey(context)) return finish();

		var fileObj = aa_lmc_initFileObj(context,{
			name: 'agentInfo',
			DataResourceName: 'RoomAgentInfo',
			filePath: 'rooms_agent_info/' + roomID + '_' + aa_lmc_projectKey(context)+'.xml',
			autoSave: true,
			autoSaveUserMessage: function(agentInfo) { 
				var id = agentInfo.getAttribute('id');
				var customerName = aa_totext(aa_xpath(aa_var_first(context,'RoomHeaders') , 'room[#'+id+']/@customerName'));
				return 'Customer Room agent info auto saved' ;
			},
			putBadSavesInLocalStorage: true
		});
		aa_bind(fileObj,'afterSave',function(agentInfo) {
			aa_lmcHeadersRoomAgentInfoUpdated(context,agentInfo);
		});

		$.when(aa_lmc_loadAppFile(context,fileObj)).then(finish,deferred.reject);
	}

	function finish() {
		try {
			aa_trigger(appContext,'roomLoaded',{ firstTime: true });

			if (aa_cb_getSide(context) == 'agent' && !appContext.lmcInInit) {
				aa_trigger(appContext,'lmcShownRoomChanged',{});
			}

			if (aa_cb_getSide(context) == 'agent') {
				var room = aa_var_first(context,'Room');
				var itemsArr = aa_xpath(room,'items');
				if (itemsArr.length > 1) {
					var length = itemsArr.length;
					for(var i=1;i<itemsArr.length;i++)
						room.removeChild(itemsArr[i]);
					aa_triggerXmlChange(room);
					aa_lmcApi_ServerErrorLog('room_with_'+length+'_items_element'+room.getAttribute('id'),'');
				}
				var stylesArr = aa_xpath(room,'style');
				if (stylesArr.length > 1) {
					var length = stylesArr.length;
					for(var i=1;i<stylesArr.length;i++)
						room.removeChild(stylesArr[i]);
					aa_triggerXmlChange(room);
					aa_lmcApi_ServerErrorLog('room_with_'+length+'_style_element'+room.getAttribute('id'),'');
				}
			}
		} catch(e) {
			ajaxart.logException('error after loading room',e);
		}
		deferred.resolve();		
	}
}

function aa_lmc_createRoom(context,roomXml,isAutoFirstRoom,isDuplicate,noUrlInRoom,waitForTinyUrl) {
	var deferred = $.Deferred();
	var appContext = context.vars._AppContext[0];	
	aa_setUrlHashValue('lmcpage','');

	roomXml = roomXml || aa_parsexml('<room />');
	roomXml.setAttribute('createdDate',new Date().getTime()+window.jbServerTimeDiff);
	roomXml.setAttribute('modifiedDate',new Date().getTime()+window.jbServerTimeDiff);
	roomXml.setAttribute('url','');
	roomXml.setAttribute('tinyUrl','');
	roomXml.setAttribute('version','1_1');

	var projectSettings = aa_var_first(context,'ProjectSettings');
	var realUser = aa_var_first(context,'User');
	var user = aa_xpath(projectSettings,'defaultAgent')[0] || aa_var_first(context,'User');

	if (!roomXml.getAttribute('agent')) roomXml.setAttribute('agent',user.getAttribute('name')||'');
	if (!roomXml.getAttribute('agentPhone')) roomXml.setAttribute('agentPhone',user.getAttribute('phoneNumber')||'');
	if (!roomXml.getAttribute('agentID')) roomXml.setAttribute('agentID',user.getAttribute('email')||'');
	if (!roomXml.getAttribute('agentEmail')) roomXml.setAttribute('agentEmail',user.getAttribute('workEmail') || user.getAttribute('email')||'');
	if (!roomXml.getAttribute('sendEmailToAgent')) roomXml.setAttribute('sendEmailToAgent','true');
	roomXml.setAttribute('createdByUser',realUser.getAttribute('name') || realUser.getAttribute('email'));

	var newStatsGeneration,newRoomGeneration;

	$.when(aa_lmc_initRoomID(roomXml,context),copyTemplate()).then(function() {
		if (aa_xpath(roomXml,'style').length == 0) {
			var general = aa_xpath(aa_var_first(context,'Styles'),'style/styleProps/general')[0].cloneNode(true);
			var newStyle = roomXml.ownerDocument.createElement('style');
			aa_xml_appendChild(newStyle,general);
			roomXml.appendChild(newStyle);
		}
		saveNewRoom();
	},deferred.reject);

	return deferred.promise();

	function copyTemplate() {
		var templateID = roomXml.getAttribute('createdByTemplate');
		if (!templateID || isDuplicate || aa_xpath(roomXml,'items')[0] ) return null;
		var deferred2 = $.Deferred();

		aa_consoleLog('Loading template...');
		var projectID = aa_lmc_projectID(context);
		if (templateID.indexOf('https://storage.googleapis.com/') == 0) {  // external template: https://storage.googleapis.com/letmesee1/1gfk837tc4/rooms/ekn0kj.xml
			projectID = templateID.split('letmesee1/')[1].split('/')[0];
			templateID = templateID.split('rooms/')[1].split('.xml')[0];
			if (!projectID || !templateID) return deferred2.reject().promise();
		}
		$.when(aa_lmcApi_loadRoom({
			project: projectID,
			room: templateID
		})).then(function(template) {
			var templateXml = aa_parsexml(template);
			var templateNodes = aa_xpath(templateXml,'*');
			for(var i=0;i<templateNodes.length;i++) {
				if (templateNodes[i].tagName == 'sms') continue;
				aa_xml_appendChild(roomXml,aa_lmc_instantiateXmlFromTemplate(templateNodes[i].cloneNode(true)));
			}
			roomXml.setAttribute('templateName',templateXml.getAttribute('name') || '');
			deferred2.resolve();
		},deferred2.reject);

		return deferred2.promise();
	}
  function saveNewRoom() {
		$.when(aa_lmcApi_saveRoom({
			project: aa_lmc_projectID(context),
			room: roomXml.getAttribute('id'),
			content: ajaxart.xml2text(roomXml)
		})).then(function(result) {
			aa_xml_appendChild(aa_var_first(context,'FullRooms'),roomXml.cloneNode(true));
			newRoomGeneration = result.getAttribute('generation');

			$.when(createAgentInfo(),createVisitorStats(),createEmptyLogs()).then(function() {			
				aa_consoleLog('Created room additional files.');
				var tinyUrlPromise = !noUrlInRoom && aa_lmc_ensureVisitorUrlInRoom(context,roomXml);
				if (!waitForTinyUrl) tinyUrlPromise = null;

				$.when(tinyUrlPromise).then(function () {
					$.when(aa_lmc_setCurrentRoom(context,roomXml.getAttribute('id'))).then(function() {
						if (!isAutoFirstRoom)
							aa_lmcApi_ServerRoomCreationLog(aa_var_first(context,'Room'),isDuplicate);
						deferred.resolve();
						aa_lmcTrack('create room',roomXml.getAttribute('customerName') || 'template ' + roomXml.getAttribute('name'));
					},deferred.reject);
				});
			},function() {
				aa_errorLog('Could not create room additional files');
				deferred.reject();
			});

		}).fail(function(result) {
			alert('Critical error - could not create room');
			deferred.reject();
		});
	}

	function createEmptyLogs() {
		aa_consoleLog('Creating empty room logs...');

		return aa_lmcApi_createEmptyLogs({
			project: aa_lmc_projectID(context),
			room: roomXml.getAttribute('id'),
			key: aa_lmc_projectKey(context)
		});
	}
  function createVisitorStats() {
  	var deferred2 = $.Deferred();
   	var stats = aa_parsexml('<stats />');
   	stats.setAttribute('id',roomXml.getAttribute('id'));
  	stats.setAttribute('visitorTimeMin','0');
  	stats.setAttribute('visitorJoinCount','0');
  	stats.setAttribute('createdDate',new Date().getTime()+window.jbServerTimeDiff);

		aa_consoleLog('Creating room visitor stats...');

		$.when(aa_lmcApi_saveStats({
			project: aa_lmc_projectID(context),
			room: roomXml.getAttribute('id'),
			content: ajaxart.xml2text(stats)
		})).then(function(generation) {
			newStatsGeneration = generation;
			aa_lmc_updateRoomHeadersFileForNewRoom(context,roomXml,newRoomGeneration,stats,newStatsGeneration);
			aa_refresh_field(['rooms_list'],'screen');

			deferred2.resolve();
		},deferred2.reject);

		return deferred2.promise();
  }

	function createAgentInfo() {	
		var info = aa_parsexml('<agentinfo />');
		info.setAttribute('id',roomXml.getAttribute('id'));

		aa_consoleLog('Creating room agent info...');

		return aa_lmcApi_saveRoomAgentInfo({
			project: aa_lmc_projectID(context),
			room: roomXml.getAttribute('id'),
			key: aa_var_first(context,'Project').getAttribute('key'),
			content: ajaxart.xml2text(info)
		});
	}  
}

function aa_lmc_initRoomID(roomXml,context) {
	if (roomXml.getAttribute('id')) return null; // ok
	var deferred = $.Deferred();

	aa_consoleLog('Getting an id for the new room...');

	$.when(aa_lmcApi_generateID({ 
		length: 6
	})).then(function(key) {
		roomXml.setAttribute('id',key);
		deferred.resolve();
	},deferred.reject);

	return deferred.promise();
}

function aa_lmc_createProject(context) {
		var deferred = $.Deferred();
		aa_lmc_userNotification(context,'Creating first room','saving');
		var project = aa_var_first(context,'Project');

		$.when(aa_lmcApi_createProject({})).then(function(projectInfo) {
			var project = aa_var_first(context,'Project');
			aa_consoleLog('Creating a new project. id='+projectInfo.getAttribute('project'));
			project.setAttribute('id',projectInfo.getAttribute('project'));
			project.setAttribute('key',projectInfo.getAttribute('key'));
			aa_lmc_saveProjectVisitorHtml(context);
			createFirstRoom();
		},function() {
			// TODO: add server error
			deferred.reject();
		});

		return deferred.promise();

		function createFirstRoom() {
			var projectID = aa_lmc_projectID(context);
			var room = aa_var_first(context,'SampleData').cloneNode(true);
			aa_consoleLog('Creating the first project room');

			$.when(aa_lmc_initRoomID(room,context)).then(function() {
				$.when(aa_lmc_createRoomHeaders(context,room)).then(function() {
					aa_setDataResource(context,'ProjectSettings',aa_parsexml('<project_settings />'));
					$.when(aa_lmc_createRoom(context,room,true),aa_lmc_saveProjectSettings(context,true)).then(function() {
						aa_consoleLog('First room successfully created');

						var project = aa_var_first(context,'Project');
						if (window.jbGoogleDriveDocument && !ajaxart.jbart_studio) {
							jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(project);
							jbGoogleDriveDocument.save();
							aa_consoleLog('saving google drive content');
						}

						deferred.resolve();
					},deferred.reject);
				},deferred.reject);
			},deferred.reject);
		}
}

function aa_lmc_saveProjectVisitorHtml(context) {
		var project = aa_var_first(context,'Project');
		var visitorHtmlContent = aa_totext( context.vars._AppContext[0].VisitorHtmlContent([],context) );

		aa_consoleLog('Sacing customer html file');

		return aa_lmcApi_saveFile({
			file: 'visitor.html',
			project: project.getAttribute('id'),
			key: project.getAttribute('key'),
			content: visitorHtmlContent
		});
}
function aa_lmc_projectID(context) {
	return aa_var_first(context,'Project').getAttribute('id');
}
function aa_lmc_projectKey(context) {
	return aa_var_first(context,'Project').getAttribute('key');
}

function aa_lmc_userNotification(context,text,status,duration) {
	context.vars._AppContext[0].NotifyUser([{Text: text, Status: status || 'info', Duration: duration || 2000 }],context);
}


function aa_lmc_updateRoomsListWithFullRoom(context,room) {
	var rooms = aa_var_first(context,'FullRooms');
	var id = room.getAttribute('id');
	if (!id) return;
	var roomInRooms = aa_xpath(rooms,'*[#'+id+']')[0];
	if (roomInRooms) 
		ajaxart.xml.copyElementContents(roomInRooms,room);
	else
		aa_xml_appendChild(rooms,room.cloneNode(true));
}

function aa_lmc_deleteRoom(context,room) {
	var deferred = $.Deferred();
	var id = room.getAttribute('id');
	var isCurrent = false;
	var roomFileObj = aa_lmc_getFileObj(context,'room');
	if (roomFileObj && roomFileObj.xml.getAttribute('id') == id) isCurrent = true;
	if (isCurrent)
		aa_lmc_cancelFileSaves(context,roomFileObj);

	var room = aa_var_first(context,'Room');

	$.when(aa_lmcApi_deleteRoom({
		project: aa_lmc_projectID(context),
		key: aa_lmc_projectKey(context),
		room: id
	})).then(function() {
		if (isCurrent) {
			aa_setUrlHashValue('roomid','');
			aa_lmc_setCurrentRoom(context,'');
		}
		
		aa_lmc_userNotification(context,'Customer room deleted','info');

		aa_lmc_updateRoomHeadersFileForDeletedRoom(context,id);
		aa_refresh_field(['rooms_list'],'screen');

		deferred.resolve();

		aa_lmcApi_ServerLog_DeleteRoom(room);
		aa_lmcTrack('delete room',room.getAttribute('customerName'));
	}).fail(deferred.reject);

	return deferred.promise();
}

function aa_lmc_moveToArchive(context,room) {
	var deferred = $.Deferred();

	$.when(aa_lmcApi_moveToArchive({
		project: aa_lmc_projectID(context),
		key: aa_lmc_projectKey(context),
		room: room.getAttribute('id'),
		context: context
	})).then(function() {
		aa_setUrlHashValue('roomid','');
		aa_lmc_setCurrentRoom(context,'');
		deferred.resolve();

		aa_lmcApi_ServerLog_ArchiveRoom(room);
	}).fail(deferred.reject);

	return deferred.promise();
}

function aa_lmc_restoreFromArchive(context,roomID) {
	var deferred = $.Deferred();

	$.when(aa_lmcApi_restoreFromArchive({
		project: aa_lmc_projectID(context),
		key: aa_lmc_projectKey(context),
		room: roomID,
		context: context
	})).then(function() {
		aa_lmc_setCurrentRoom(context,roomID).then(function() {
			aa_lmcApi_ServerLog_RestoreRoom(aa_var_first(context,'Room'));
		});		
		deferred.resolve();
	}).fail(deferred.reject);

	return deferred.promise();
}

aa_gcs("lmc",{
	LoadProjectSettings: function(profile,data,context) {
		return aa_fromPromise(aa_lmc_loadProjectSettings(context));
	},
	SaveProjectSettings: function(profile,data,context) {
		return aa_fromPromise(aa_lmc_saveProjectSettings(context));
	}
});

function aa_lmc_getUserinfoFromClient(context,clientID) {
	var deferred = $.Deferred();
	if (aa_cb_getSide(context) == 'visitor') return deferred.resolve().promise();
	var user = aa_var_first(context,'User');
	if (aa_var_first(context,'Project').getAttribute('nodrive') == 'true') return deferred.resolve().promise();

	var email = user.getAttribute('email');
	if (!email) {
		aa_bind(context.vars._AppContext[0],'userEmail',function() {
			aa_lmc_getUserinfoFromClient(context,clientID).then(deferred.resolve,deferred.reject);
		});
		return deferred.resolve().promise();
	}
	aa_lmcApi_getFile('clients/'+clientID,'settings.xml').then(function(result) {
		try {
			result = aa_parsexml(result);
			// TODO: check user count
			var userInClient = aa_xpath(result,'users/user[#'+email+']')[0];
			if (!userInClient) {
				var reps= aa_xpath_text(result,'@lmcReps');
				if (reps.indexOf(email) == -1)
					reportNotAllowedUser();
			}	else {
				if (userInClient.getAttribute('phoneNumber'))
					user.setAttribute('phoneNumber',userInClient.getAttribute('phoneNumber'));
				if (userInClient.getAttribute('name'))
					user.setAttribute('name',userInClient.getAttribute('name'));
				user.setAttribute('workEmail',userInClient.getAttribute('workEmail') || email);
			}
		} catch(e) {
			ajaxart.logException('aa_lmc_getUserinfoFromClient',e);
		}
		deferred.resolve();
	},function() {
		deferred.resolve(); // never mind, we should be robust in this case
	});
	return deferred.promise();

	function reportNotAllowedUser() {
//		aa_lmcApi_ServerErrorLog('unpayed_user_'+email,null,null);
	}
}
function aa_lmc_loadProjectSettings(context) {
	aa_lmc_log('aa_lmc_loadProjectSettings side='+aa_cb_getSide(context));
	if (aa_cb_getSide(context) != 'agent' || !aa_lmc_projectKey(context)) return $.Deferred().resolve().promise();

	var deferred = $.Deferred();
	var appContext = context.vars._AppContext[0];
	$.when(aa_lmcApi_getFile(aa_lmc_projectID(context),'settings_'+aa_lmc_projectKey(context)+'.xml')).then(function(result,generation) {
		appContext.lmcSettingsGeneration = generation;
		appContext.lmcProjectSettingsClone = ajaxart.xml2text(aa_parsexml(result));
		result = aa_parsexml(result);
		aa_setDataResource(context,'ProjectSettings',result);
		if (aa_var_first(context,'Project').getAttribute('nodrive') != 'true') {
			result.setAttribute('overrideSiteSettings','true');	
			result.setAttribute('overrideSiteAgentInfo','true');	
		}
		if (result.getAttribute('name'))
			document.title = result.getAttribute('name');

		var projectXml = aa_var_first(context,'Project');
		if (projectXml.getAttribute('nodrive') == 'true' && projectXml.getAttribute('_version') != result.getAttribute('visitorHtmlVersion')) {
			// update the visitor.html after a version has been updated (or a new project was created)
			aa_lmc_saveProjectVisitorHtml(context).done(function() {
				result.setAttribute('visitorHtmlVersion',projectXml.getAttribute('_version'));
				aa_lmc_saveProjectSettings(context);
			});
		}

		if (result.getAttribute('clientID'))
			return aa_lmc_getUserinfoFromClient(context,result.getAttribute('clientID')).then(deferred.resolve,deferred.reject);
		else
			deferred.resolve();
	},function() {
		aa_setDataResource(context,'ProjectSettings',aa_parsexml('<project_settings />'));
		deferred.resolve();
	});
	return deferred.promise();
}

function aa_lmc_saveProjectSettings(context,firstTime) {
	if (aa_cb_getSide(context) != 'agent') return;

	aa_consoleLog('Saving project settings...');

	var deferred = $.Deferred();
	var appContext = context.vars._AppContext[0];
	$.when(aa_lmcApi_saveFile({
		project: aa_lmc_projectID(context),
		file: 'settings_'+aa_lmc_projectKey(context)+'.xml',
		key: aa_lmc_projectKey(context),
		generation:appContext.lmcSettingsGeneration,
		content: ajaxart.xml2text( aa_var_first(context,'ProjectSettings') )
	})).then(function(generation) {
		appContext.lmcSettingsGeneration = generation;
		if (!firstTime) {
			var moreContent = '\n\nSettings:\n' + ajaxart.xml2text(aa_var_first(context,'ProjectSettings')) + '\n\nSettings before save:\n' + appContext.lmcProjectSettingsClone + '\n';
			aa_lmcApi_ServerLog_SaveSettings(moreContent);
		}
		deferred.resolve();
	},function() {
		deferred.resolve();
	});
	return deferred.promise();
}



aa_gcs("lmc",{
	TestSavingRoom: function(profile,data,context) {
		var deferred = $.Deferred();

		var roomSize = aa_int(data,profile,'RoomSize',context);
		var saveCount = aa_int(data,profile,'SaveCount',context);
		var generation = null;

		var roomXml = '<room id="test" txt="';
		for(var i=0;i<roomSize;i++) 
			roomXml += 'b';

		roomXml += '"/>';

		var counter = 0;
		var data = aa_var_first(context,'Data');
		doSave();

		return [deferred.promise()];

		function doSave() {
			if (++counter > saveCount) return deferred.resolve();

			$.when(aa_lmcApi_saveFileWithPut({
				project: '4pv11pglut',
				file: 'a.txt',
				key: 'bf9h7654vg',
				content: roomXml,
				generation: generation
			})).then(function(result) {
				
				if (result.getAttribute('generation')) generation = result.getAttribute('generation');
				data.setAttribute('results',(data.getAttribute('results')||'')+'\n'+ajaxart.xml2text(result));
				data.setAttribute('successCount',parseInt(data.getAttribute('successCount')||0)+1);
				aa_refresh_field(['results']);
				doSave();
			},function(result) {
				data.setAttribute('results',(data.getAttribute('results')||'')+'\n'+ajaxart.xml2text(result));
				data.setAttribute('errorCount',parseInt(data.getAttribute('errorCount')||0)+1);
				aa_refresh_field(['results']);
				doSave();
			});
		}

	}
});

function aa_lmcCheckForVersionUpdate(context) {
	try {
		if (aa_cb_getSide(context) == 'visitor' || !window.sessionStorage || sessionStorage.LetMeSee_VersionUpload != 'true') return;
	} catch(e) {
		return;
	}
	try {
		sessionStorage.LetMeSee_VersionUpload = '';
	} catch(e) {
		ajaxart.logException('writing to session storage',e);
	}
	setTimeout(function() {
		aa_lmc_saveProjectVisitorHtml(context);
	},2000);
}

function aa_lmcGetUserInfo(context) {
	var deferred = $.Deferred();
	if (aa_var_first(context,'Project') && aa_var_first(context,'Project').getAttribute('nodrive') == 'true' ||
			aa_var_first(context,'Projects') && aa_var_first(context,'Projects').getAttribute('nodrive') == 'true' ) {
		var user = aa_var_first(context,'User');
		window.jbUserEmail = window.jbUserEmail || '';
		user.setAttribute('email',window.jbUserEmail);
		if (!user.getAttribute('name')) user.setAttribute('name',window.jbUserEmail);
		return deferred.resolve().promise();
  }

	if (!ajaxart.jbart_studio)
		aa_var_first(context,'User').setAttribute('name','');
	
	if (!window.gapi || aa_cb_getSide(context) == 'visitor') return deferred.resolve().promise();

	googledrive_lib.ready().then(function() {
	  var request = gapi.client.drive.about.get();
	  request.execute(function(resp) {
	  	aa_var_first(context,'User').setAttribute('name',resp.name);
	  	finish();
	  });
		gapi.client.request({ 'path': 'oauth2/v2/userinfo', 'method': 'GET' }).execute(function(resp) {
			if (resp && resp.email) {
				aa_var_first(context,'User').setAttribute('email',resp.email);
				finish();
			} else {
				ajaxart.log('using google+ to get email');
				// fallback - read from plus api
				gapi.client.load('plus','v1', function(){
				  gapi.client.plus.people.get( {'userId' : 'me'} ).execute(function (obj) {
				   if (obj.error) return;
				   var email = obj['emails'].filter(function(v) {
				        return v.type === 'account'; // Filter out the primary email
				   })[0].value; // get the email from the filtered results, should always be defined.
				   aa_var_first(context,'User').setAttribute('email',email);
				   finish();
				  });
				});
			}
		});
	});
	return deferred.promise();

	function finish(email) {
		var user = aa_var_first(context,'User');
		if (user.getAttribute('name') && user.getAttribute('email')) {
	   aa_refresh_field(['LMC_User_Name']);
	   aa_lmc_autologoffAgentFromTwoComputers(context);
	   deferred.resolve();

	   aa_trigger(context.vars._AppContext[0],'userEmail');
	 }
	}
}

aa_gcs("lmc",{
	AddRoomReply: function(profile,data,context) {
		var appContext = context.vars._AppContext[0];
		var item = aa_text(data,profile,'Item',context);
		var userName = aa_text(data,profile,'UserName',context).replace(/[,\n\r]/g,' ');
		var replyText = aa_text(data,profile,'ReplyText',context);
		replyText = replyText.replace(/\n/g,'<br>').replace(/\r/g,'');
		var roomID = aa_var_first(context,'Room').getAttribute('id');
		// TODO SECURITY: clean javascripts in html

		var settings = {
			project: aa_lmc_projectID(context),
			room: roomID,
			from: aa_cb_getSide(context),
			userName: userName,
			item: item,
			replyText: replyText
		};
		if (settings.from == 'agent') settings.key = aa_lmc_projectKey(context);

		appContext.lmcRoomReplies.push({
			item: item,
			text: replyText,
			userName: userName,
			from: aa_cb_getSide(context),
			time: new Date().getTime() + window.jbServerTimeDiff
		});
		appContext.SendCoBrowseEvent({
			command: 'addReply',
			args: {
				item: item,
				text: replyText,
				userName: userName
			}
		});
		var room = aa_var_first(context,'Room');

		return aa_fromPromise(aa_lmcApi_addRoomReply(settings).done(function() {
			if (aa_cb_getSide(context) == 'visitor')
				ajaxart.runNativeHelper([replyText],profile,'SendEmailToAgent',context);
		}));
	},
	RoomItemReplies: function(profile,data,context) {
		var appContext = context.vars._AppContext[0];
		var item = aa_text(data,profile,'Item',context);
		var out = [];
		for(var i=0;i<appContext.lmcRoomReplies.length;i++) {
			var reply = appContext.lmcRoomReplies[i];
			if (reply.item == item) out.push(reply);
		}
		return out;
	}
});

function aa_lmcHandleAddReplyEvent(context,eventObject) {
	aa_refresh_field(['lmc_replies']);
}


function aa_lmc_agentCheckVisitorStats(context) {
		var appContext = context.vars._AppContext[0];
		if (aa_var_first(context,'Room').getAttribute('isTemplate') == 'true') return;
		try {
			aa_lmc_calcVisitorTime(context,appContext.lmcCustomerEvents);
		} catch(e) {
			ajaxart.logException('error in aa_lmc_calcVisitorTime',e);
		}
}

function aa_lmc_ensureVisitorUrlInRoom(context,roomXml) {
	var deferred = $.Deferred();
	if (!roomXml.getAttribute('id') || roomXml.getAttribute('isTemplate') == 'true') return deferred.resolve().promise();
	if (roomXml.getAttribute('tinyUrl') && roomXml.getAttribute('tinyUrl').indexOf('tinyurl') > -1) return deferred.resolve().promise();

	var url = 'http://jb-letmesee.appspot.com/LetMeSee/'+ aa_lmc_projectID(context) + '.html?roomid='+roomXml.getAttribute('id');
	roomXml.setAttribute('url',url);
	roomXml.setAttribute('tinyUrl',url);
	aa_triggerXmlChange(roomXml);

	aa_consoleLog('Calling tinyurl for url ' + url);

	if (roomXml.getAttribute('callingTinyUrl')) {		
		if (parseInt(roomXml.getAttribute('callingTinyUrl')) + 2000 > new Date().getTime())
			return waitForCallingTinyUrl(); // we are already calling tiny url
	}
	roomXml.setAttribute('callingTinyUrl',new Date().getTime());
	$.when(aa_lmcTinyUrl(url)).then(function(tinyurl) {
		roomXml.removeAttribute('callingTinyUrl');
		roomXml.setAttribute('tinyUrl',tinyurl);
		var smsElem = aa_xpath(roomXml,'sms')[0];
		if (smsElem) smsElem.removeAttribute('text');

		aa_triggerXmlChange(roomXml);
		deferred.resolve();
	},deferred.resolve);
	return deferred.promise();

	function waitForCallingTinyUrl() {
		if (roomXml.getAttribute('callingTinyUrl') == 'true')
			setTimeout(waitForCallingTinyUrl,1000);
		else
			deferred.resolve();
	}
}

function aa_lmcRoomFileObject(context,roomID) {
	var appContext = context.vars._AppContext[0];

	var fileObj = aa_lmc_initFileObj(context,{
		name: 'room',
		DataResourceName: 'Room',
		filePath: 'rooms/' + roomID + '.xml',
		autoSave: true,
		putBadSavesInLocalStorage: true,
		addModifiedDate: true,
		autoSaveUserMessage: function(room) { 
			if (room.getAttribute('isTemplate') == 'true')
				return 'Template auto saved';
			if (room.getAttribute('customerName'))
				return 'Customer room auto saved';
			return '';
		}
	});

	aa_bind(fileObj,'afterSave',function(room) {
		aa_lmcHeadersRoomSaved(context);
		aa_trigger(appContext,'roomSaved',{ changedXml: fileObj.changedInnerXml });
		aa_lmc_updateRoomsListWithFullRoom(context,room);

		if (aa_cb_getSide(context) == 'agent' && appContext.lmcInRealtimeSession && jBart.callHome) {
			jBart.callHome.fireCallHome(room.getAttribute('id') + '_agent'); // the visitor will check if the room is updated on callHome
		}
	});

	aa_bind(fileObj,'afterMerge',function() {
		aa_trigger(appContext,'lmcShownRoomChanged',{});
		aa_lmc_userNotification(context,'Room has been updated by another agent. Updating display...','info',10000);
	});

	aa_bind(fileObj,'trackSave',function(trackingObject) {
		var room = aa_var_first(context,'Room');
		if (room.getAttribute('isTemplate') == 'true') {
			trackingObject.type = 'save template';
			trackingObject.moreText = 'room='+room.getAttribute('name');
		} else {
			trackingObject.type = 'save room';
			trackingObject.moreText = 'room='+room.getAttribute('customerName');
		}
		trackingObject.text = 'roomid='+room.getAttribute('id');
	});

	aa_bind(fileObj,'beforeSave',function(args) {
		var id = fileObj.xml.getAttribute('id');
		if (id != roomID) {
			aa_lmcApi_ServerErrorLog('room_bad_id_'+id+'___'+roomID,'Critical error while saving room, please refresh your page.',ajaxart.xml2text(fileObj.xml));
			args.stopSaving = true;
		}
	});


	return fileObj;
}

		function aa_lmc_lineToEvent(line) {
			try {
				var parts = line.split('|');
				var args = parts[2];
				if (parts.length > 3) {  // | inside args
					args = line.substring(parts[0].length + parts[1].length+2);
				}
				args = args || '{}';

				var argsAsJson = JSON.parse(args);
				for (var i in argsAsJson) {
					if (argsAsJson.hasOwnProperty(i) && typeof argsAsJson[i] == 'string')
						argsAsJson[i] = argsAsJson[i].replace(/\\n/g,'\n');
				}

				return {
					time: parseInt(parts[0]) - window.jbServerTimeDiff,
					command: parts[1],
					args: JSON.parse(args)
				};
			} catch(e) {
				ajaxart.logException('bad event line ' + line,e);
				return null;				
			}
		}


function aa_lmc_log(msg,context,visitorOnly) {
	if (visitorOnly && context && aa_cb_getSide(context) != 'visitor') return;
	if (window.jbStartLoadingTime) msg += ' ' + Math.floor((new Date().getTime() - jbStartLoadingTime)/1000) + 's';
	ajaxart.log(msg,'lmc');
}

function aa_lmc_addPreloadLogs() {
	if (!window.jbPreloadLogs) return;
	for(var i=0;i<jbPreloadLogs.length;i++)
		aa_lmc_log(jbPreloadLogs[i]);
	
	jbPreloadLogs = [];
}

function aa_lmc_autologoffAgentFromTwoComputers(context) {
	if (aa_cb_getSide(context) != 'agent' || ajaxart.jbart_studio) return;
	if (window.screen && screen.width <= 600) return; // mobile phones are out of the game
	if (window.orientation) return;// mobile phones are out of the game

	try {
		var stationID = localStorage.lmcStationID;
		if (stationID) stationIDPresent();
		else
			aa_lmcApi_generateID({ length: 5}).done(function(id) {
				stationID = id;
				localStorage.lmcStationID = id;
				stationIDPresent();
			});
	} catch(e) {
		ajaxart.logException('aa_lmc_autologoffAgentFromTwoComputers',e);
	}

	function stationIDPresent() {
		var appContext = context.vars._AppContext[0];
		var lastServerCheckTime = 0;
		var agentEmail = aa_var_first(context,'User').getAttribute('email');
		if (!agentEmail) return;
		appContext.lmcAgentStationID = stationID;

		aa_lmcApi_writeAgentStation(agentEmail,appContext.lmcAgentStationID).done(function() {
			aa_bind(appContext,'lmcSave',function() {
				if (lastServerCheckTime + 1000*60 < new Date().getTime()) {
					lastServerCheckTime = new Date().getTime();
					aa_lmcApi_checkAgentStation(agentEmail,appContext.lmcAgentStationID).then(function(isSameStation) {
						if (!isSameStation) {
							if (!window.jbLoggedOff)
								aa_lmcApi_ServerLog_Logoff(agentEmail);
							window.jbLoggedOff = true;
						}
					});
				}
			});
		});
	}
}

aa_gcs("lmc",{
	NewGeneratedID: function(profile, data, context) {
		var deferred = $.Deferred();

		aa_lmcApi_generateID({ 
			length: aa_int(data,profile,'Length',context)
		}).then(function(key) {
			deferred.resolve([key]);
		},deferred.reject);

		var out = [];
		out.promise = deferred.promise();
		return out;

	},
	BatchCreateRooms: function(profile, data, context) {
		var deferred = $.Deferred();
		var rooms = aa_run(data,profile,'Rooms',context);

		var index = 0;

		createNextRoom();

		return [deferred.promise()];

		function createNextRoom() {
			if (index == rooms.length) {				
				aa_lmc_userNotification(context,'Rooms created and sms sent','saved');				
				return deferred.resolve();
			}
			aa_showNotification(context,'lmc_batch_rooms_notify',10000,'Creating room ' + (index+1) + ' of ' + (rooms.length) ,'saving');

			var roomInfo = rooms[index];
			var roomXml = aa_parsexml('<room/>');
			ajaxart.runNativeHelper([roomXml],profile,'UpdateRoomXml',aa_ctx(context,{RoomInfo: [roomInfo]}));

			aa_lmc_createRoom(context,roomXml,false,false,true).then(function() {
				var url = 'http://jb-letmesee.appspot.com/LetMeSee/'+ aa_lmc_projectID(context) + '.html?roomid='+roomXml.getAttribute('id');
				roomXml.setAttribute('url',url);
				roomXml.setAttribute('tinyUrl',url);

				aa_lmcTinyUrl(url).then(function(tinyurl) {
					roomXml.setAttribute('tinyUrl',tinyurl);
					aa_showNotification(context,'lmc_batch_rooms_notify',10000,'Sending sms ' + (index+1) + ' of ' + (rooms.length) ,'saving');
					ajaxart.runNativeHelper([roomXml],profile,'SendSMS',context)[0].then(function() {
//						addInvitationToVisitorLog(roomXml);

						index++;						
						createNextRoom();						
					},fail);
				},fail);
			},fail);
		}

		function addInvitationToVisitorLog(roomXml) {
			try {
				var eventObject = {
					time: new Date().getTime() + window.jbServerTimeDiff,
					command: 'agentInvitation',
					fromCustomer: true,
					roomID: roomXml.getAttribute('id'),
					args: {
						type: 'sms',
						phoneNumber: roomXml.getAttribute('phone'),
						body: aa_xpath_text(roomXml,'sms/@text')
					}
				};
				var args = JSON.stringify(eventObject.args || {});
				args = args.replace(/\n/g,'\\n').replace(/\r/g,'');

				aa_lmcApi_appendToLog({
						project: aa_lmc_projectID(context),
						room: roomXml.getAttribute('id'),
						logFile: 'visitor',
						toAppend: eventObject.time + '|' + eventObject.command + '|' + args + '\n'
				});
			} catch(e) {
				ajaxart.logException('addInvitationToVisitorLog',e);
			}
		}
		function fail() {
				aa_lmc_userNotification(context,'Error creating rooms in batch','error');			
				deferred.reject();
		}
	}
});

