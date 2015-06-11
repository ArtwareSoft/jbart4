ajaxart.load_plugin("", "plugins/cobrowse/cobrowse.xtml");
ajaxart.load_plugin("", "plugins/cobrowse/cobrowse_style.xtml");

aa_gcs("cobrowse", {
	CoBrowseAgentSideOnly: function(profile, data, context) {
		if (aa_cb_getSide(context) != 'agent') context.vars._Field[0].IsHidden = true;
	},
	CoBrowseVisitorSideOnly: function(profile, data, context) {
		if (aa_cb_getSide(context) != 'visitor') context.vars._Field[0].IsHidden = true;
	}
});

function aa_cb_getSide(context) {
	return aa_totext(ajaxart.getVariable(context, 'CoBrowseSide')) || 'agent';
}

/************************************* UI States ***********************************************************************/

aa_gcs("cobrowse",{
	RunActionAndKeepUIState: function(profile,data,context) {
		aa_lmc_runActionAndKeepUIState(context,function() {
			ajaxart.run(data,profile,'Action',context);	
		});
	},
	GoToUIState: function(profile,data,context) {
		var appContext = context.vars._AppContext[0];

		if (!window.aa_intest) {
			window.aa_intest = true;	
			window.aa_intest_topControl = window.aa_intest_topControl || document;
		}
		var ctx = aa_ctx(context, { ControlElement: [aa_intest_topControl]} );

		var uiState = aa_first(data,profile,'NewUIState',context);
		if (uiState != appContext.cbMyUIState)
			ajaxart.xml.copyElementContents(appContext.cbMyUIState,uiState);
		aa_cb_gotoState(appContext,ctx,uiState);
		aa_intest = false;		
	}
});

function aa_lmc_runActionAndKeepUIState(context,callback) {
	var appContext = context.vars._AppContext[0];
	aa_updateUIStateScroll(appContext);
	var uiState = appContext.cbMyUIState.cloneNode(true);

	if (!window.aa_intest) {
		window.aa_intest = true;	
		window.aa_intest_topControl = window.aa_intest_topControl || document;
	}
	var ctx = aa_ctx(context, { ControlElement: [aa_intest_topControl]} );
	callback();

	ajaxart.xml.copyElementContents(appContext.cbMyUIState,uiState);

	aa_cb_gotoState(appContext,ctx,uiState);
	aa_intest = false;	
}
function aa_cb_UIStateDescription(context,uiState) {
	var stateXml = aa_parsexml(uiState);
	var appContext = context.vars._AppContext[0];
	if (appContext.DescriptionOfUIState) return aa_totext( appContext.DescriptionOfUIState([stateXml],context) );
	return '';
}

function aa_cb_emptyUIState(appContext) {
	var state = aa_parsexml('<state/>');
	aa_trigger(appContext,'emptyUIState',state);
	return state;
}

function aa_updateUIStateScroll(appContext) {
	appContext.cbMyUIState.setAttribute('scrollY',aa_cb_scrollPosition());	
}

function aa_cb_gotoState(appContext,context,state,doNotSendEvent) {
	aa_trigger(appContext,'cbGotoUIState',{state: state, doNotSendEvent: doNotSendEvent});
	var scrollY = state.getAttribute('scrollY') || 0;
	var visualCntr = aa_findVisualCntrByID('cobrowse_main_cntr') || aa_windowVisualContainer();
	visualCntr.scrollTop(scrollY);
}

function aa_cb_gotoParticipant(appContext,context,eventObject) {
	if (eventObject && eventObject.args.uiState) {
		appContext.cbOtherUIState	= aa_parsexml(eventObject.args.uiState);
	}
	var doNotSendEvent = !!eventObject;
	aa_cb_gotoState(appContext,context,appContext.cbOtherUIState,doNotSendEvent);
	if (eventObject && !eventObject.firedByRefresh) {
		appContext.SendJumpAcknowledged(appContext.cbOtherUIState,context);
	}
}

/**************************************** Scroll position *************************************************************/

function aa_cb_scrollPosition() {
	var visualCntr = aa_findVisualCntrByID('cobrowse_main_cntr') || aa_windowVisualContainer();
	return visualCntr.scrollY();
}

aa_gcs("cobrowse", {
	CoBrowseVisualContainerScrollPosition: function(profile, data, context) {
		aa_bind(context.vars._Field[0],'initVisualContainer',function (args) {
			aa_addActionOnScroll(args.visualContainer.el,function() {
				aa_cbUpdateScrollPosition(args.visualContainer.scrollY(),context);
			});
		});
	},
	CoBrowseScrollPosition: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];

		aa_bind(appContext,'cbUpdateUIState',function(updateArgs) {
			var evt = updateArgs.eventObject;
			if (evt.command == 'scroll')
				updateArgs.state.setAttribute('scrollY',evt.args.y);
		});

		if (aa_screen_size().width < 600) {	// mobile
			$(window).scroll(function() {
				aa_cbUpdateScrollPosition(window.pageYOffset,context);
			});
		}
	}
});

function aa_cbUpdateScrollPosition(scrollY,context,forceUpdate) {
	var appContext = context.vars._AppContext[0];
	var uiState = aa_var_first(context,'UIState');
	if (scrollY == uiState.getAttribute('scrollY') && !forceUpdate) return;
	uiState.setAttribute('scrollY',scrollY);

	if (aa_cb_getSide(context) == 'visitor') {
		appContext.cbChannel.lmcPendingScrollEvent = {
			time: new Date().getTime() + window.jbServerTimeDiff,
			command: 'scroll',
			args: {
				y: scrollY
			}
		};		
		aa_run_delayed_action('cb_scroll',function() { 
			appContext.cbChannel.SendPendingScrollEvent();
		}, 1000);

		aa_run_delayed_action('updateWatchedOfCurrentDisplay',function() { 
			aa_lmc_updateWatchedOfCurrentDisplay(context);
		},10);
	}
}

/**************************************** Join *************************************************************/

aa_gcs("cobrowse", {
	CoBrowseJoinNotification: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];
		var visitorStatsNode = null;

		aa_bind(appContext,'joinChannel',function(){
			if (aa_cb_getSide(context) == 'visitor') {
				appContext.SendCoBrowseEvent(createEvent());
				appContext.lmcJoinEventSent = true;
			}
			
		});
		aa_bind(appContext,'visitorStatsLoaded',function(args) {
			visitorStatsNode = aa_var_first(context,'RoomVisitorStats');
			if (aa_cb_getSide(context) == 'visitor')
				updateVisitorStats();
		});

		aa_bind(appContext, 'customerEvent', function(eventObject) {
			if (eventObject.command == 'join' && aa_cb_getSide(context) == 'agent' && !eventObject.firedByRefresh)
				aa_run(data,profile,'NotificationInAgentWhenVisitorJoins',context);
		});

		function createEvent() {
			var agentInfo = aa_userAgentInfo();
			var width = window.innerWidth, height = window.innerHeight;
			if (window.orientation == 90 || window.orientation == -90) {
				width = window.innerHeight;
				height = window.innerWidth;
			}
			var evt = {
				command: 'join',
				args: {
					device: agentInfo.device,
					userAgent: navigator.userAgent,
					width: width,
					height: height,
					browser: agentInfo.browser,
					platform: navigator.platform
				},
				time: new Date().getTime()				
			};
			return evt;			
		}
		function updateVisitorStats() {
			if (window.jbVisitorJoinCountAdded) return;
			window.jbVisitorJoinCountAdded = true;
			var count= parseInt(visitorStatsNode.getAttribute('visitorJoinCount') || '0');
			visitorStatsNode.setAttribute('visitorJoinCount',count+1);
			visitorStatsNode.setAttribute('lastEventTime',new Date().getTime() - (window.jbServerTimeDiff||0));
			appContext.cbChannel.SaveVisitorStats(visitorStatsNode);			
		}
	}
});

function aa_userAgentInfo() {
	var devices = {
	'Samsung Galaxy S III':
	'GT-I9300,GT-I9305,SHV-E210K/L/S,SGH-T999/L,SGH-I747,SGH-N064,(SC-06D),SGH-N035,(SC-03E),SCH-J021,SCH-R530,SCH-I535,SPH-L710,GT-I9308,SCH-I939'
	};

	var ag = navigator.userAgent;
	var out = {
		device: (ag.match(/iPhone/i) || ag.match(/Windows/i) || 	ag.match(/Android/i) || ag.match(/IEMobile/i) || ag.match(/Macintosh/i)|| [''])[0],
		browser: (ag.match(/Chrome/i) || ag.match(/MSIE 10/i) || ag.match(/MSIE 9/i) || ag.match(/MSIE 8/i) || ag.match(/MSIE 7/i) || ag.match(/MSIE 6/i)	|| ag.match(/MSIE 11/i) || ag.match(/MSIE/i) || ag.match(/Opera/i) ||
			ag.match(/Firefox/i) || ag.match(/Mobile Safari/i) || ag.match(/Safari/i)|| [''])[0]
	};
	if (!out.browser && ag.toLowerCase().indexOf('trident') > -1) out.browser = 'IE';

	for(var device_name in devices) {
		var keys = devices[device_name].split(',');
		for(var i=0;i<keys.length;i++)
			if (ag.indexOf(keys[i]) != -1)
				out.device = device_name;
	}
	return out;
}

/***************************************** sending current size **************************************/
aa_gcs("cobrowse", {
	CoBrowseSendRecieveCurrentSize: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];

		aa_bind(appContext,'joinChannel',sendSize,'CoBrowseSendRecieveCurrentSize');
		aa_addActionOnWindowResize(document.body,sendSize,'CoBrowseSendRecieveCurrentSize');

		aa_bind(appContext,'customerEvent',function(evt) {
			if (evt.command == 'windowsize') {
				var cbOtherUIState = appContext.cbOtherUIState;
				cbOtherUIState.setAttribute('width',evt.args.width);
				cbOtherUIState.setAttribute('height',evt.args.height);
				appContext.cbParticipantWindowSize = evt.args;				
				aa_trigger(appContext,'participantWindowSize',evt.args);
				var elems = $('.cb_participant_size');
				for(var i=0;i<elems.length;i++)
					aa_trigger(elems[i],'participantWindowSize');
			}
		});
		aa_bind(appContext,'participantWindowSize',function(args) {
		});

		function sendSize() {
			if (ajaxart.jbart_studio || aa_cb_getSide(context) == 'agent') return;
			if (!appContext.cbChannel.eventsToSend) return;
			
			var body = aa_body();

			var width = (body == document.body) ? window.innerWidth : $(body).width();
			var height = (body == document.body) ? window.innerHeight : $(body).height();

			var evt = {
				command: 'windowsize',
				args: {
					width: width,
					height: height
				}				
			};
			appContext.SendCoBrowseEvent(evt);
		}
	}
});

