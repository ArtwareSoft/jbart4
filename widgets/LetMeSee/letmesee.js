ajaxart.load_plugin("","../widgets/letmesee/letmesee.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_agent.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_content.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_desktop.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_mobile.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_details.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_editor.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_agent_desktop.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_style_editor.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_rooms.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_news.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_embed.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_agent_phone.xtml");
ajaxart.load_plugin("","../widgets/letmesee/lmc_crm.xtml");

aa_gcs("lmc",	{
	CallMeButtonClicked: function(profile,data,context) {
    if (aa_cb_getSide(context) == 'visitor') {
	    var appContext = context.vars._AppContext[0];
			var evt = {
				command: 'callme',	
				args: { }
			};

			appContext.SendCoBrowseEvent(evt);			
			ajaxart.runNativeHelper(data,profile,'SendAgentNotification',context);
		}
	},
	LMCPrintCurrentItem: function(profile,data,context) {
		var docTitle = aa_text(data,profile,'DocumentTitle',context);

		var elem = context.vars.ControlElement[0];
		var toPrint = $(elem).closest('.lmc_item_details')[0];
		if (!toPrint) return;

		var clone = toPrint.cloneNode(true);
		$(clone).addClass('lmc_print');
		$(clone).find('.print_button').remove();
		$(clone).find('.fld_Item_topbar').remove();
		$(clone).find('.hide_in_print').remove();

		var head = '<title>'+docTitle+'</title>';

		if ($(elem).closest('.right_to_left')[0])
			head += '<style>body { direction:rtl; }</style>';

		head += '<style>' + aa_text(data,profile,'Css',context) + '</style>';
		head += '<script type="text/javascript">function printPage(){focus(); setTimeout(function() { print() },500);}</script>';

		var htmlTemplate = aa_text(data,profile,'HTmlTemplate',context);
		if (!htmlTemplate) htmlTemplate = '<html><head>{{head}}</head><body class="lmc_print">{{contents}}</body></html>';
		var html = htmlTemplate.replace(/{{head}}/,head).replace(/{{contents}}/,$(clone).html());

		var popupWindow = window.open('about:blank', 'printElementWindow', 'width=650,height=440,scrollbars=yes');
		var documentToWriteTo = popupWindow.document;

    documentToWriteTo.open();
    documentToWriteTo.write(html);
    documentToWriteTo.close();
    _callPrint(popupWindow);

    var tryCount = 0;

    function _callPrint() {
      if (popupWindow && popupWindow['printPage']) {
      	popupWindow['printPage']();
      } else {
      	tryCount++;
      	if (tryCount < 20)
      		setTimeout(_callPrint, 50);
      }
    }

    if (aa_cb_getSide(context) == 'visitor') {
	    var appContext = context.vars._AppContext[0];
	    var itemID = aa_var_first(context,'UIState').getAttribute('itemShown') || '';
			var evt = {
				command: 'printItem',	
				args: {
					itemid: itemID
				}
			};

			appContext.SendCoBrowseEvent(evt);			
			ajaxart.runNativeHelper(data,profile,'SendAgentNotification',context);
		}

	},
	LMCCalcVisitorIDColors: function(profile,data,context) {
		var roomID = aa_text(data,profile,'RoomID',context);
		var appContext = context.vars._AppContext[0];
		if (!appContext.lmcCustomerEvents) return;

		var differentColors = ['#3498db','#75300a','#076d59','#2ecc71','#cc7900','#f1c40f','#8e44ad','#ef6cef','#566472','#e74c3c'];
		var colorCounter=-1;
		appContext.lmcCustomerEvents.colors = [];

		for(var i=0;i<appContext.lmcCustomerEvents.length;i++) {
			var evt = appContext.lmcCustomerEvents[i];
			var iVisitorID = evt.args.visitorID;
			if (!iVisitorID) continue;
			if (!appContext.lmcCustomerEvents.colors[iVisitorID]) {
				colorCounter = ((colorCounter+1) % differentColors.length);
				appContext.lmcCustomerEvents.colors[iVisitorID] = differentColors[colorCounter];
			}				
		}
	
		for(var i=0;i<appContext.lmcCustomerEvents.length;i++) {
			var visitorID = appContext.lmcCustomerEvents[i].args.visitorID;
			if (visitorID) appContext.lmcCustomerEvents[i].lmcColor = appContext.lmcCustomerEvents.colors[visitorID] || '';
		}
	},
	ReplaceVariablesWhenInstantiatingTemplate: function(profile,data,context) {
		return [aa_lmc_instantiateXmlFromTemplate(data[0])];
	},
	TrackUserAction: function(profile,data,context) {
		var roomName = aa_text(data,profile,'RoomName',context);
		aa_lmcTrack(aa_text(data,profile,'Type',context),aa_text(data,profile,'Text',context),aa_text(data,profile,'MoreInfo',context),roomName);
	},
	ClickOnViralItem: function(profile,data,context) {
		aa_lmcApi_ServerLog_ViralItemClicked('');
	},
	LMCAutoRefreshAfterHours: function(profile,data,context) {
		context.vars._AppContext[0].OpenRestartPopup = function(data1,ctx) {
			if (aa_cb_getSide(ctx) != 'agent' ||  aa_screen_size(false).width < 500 ) return;
			ajaxart.runNativeHelper([],profile,'ShowRefreshDialog',context);
		};
	},
	WaitForSendingJumpAcknowledge: function(profile,data,context) {
		var acknowledged = false;
		var itemID = aa_text(data,profile,'ItemID',context);

		aa_bind(context.vars._AppContext[0],'customerEvent',function(evt) {
			if (evt.command == 'jumped' && !acknowledged) {
				acknowledged = true;
				$('.fld_sending_progress').hide();
				var itemName = aa_lmc_itemid2itemname(context,itemID,aa_var_first(context,'Room').getAttribute('id'));
				aa_showNotification(context,'SendJumpNotification',200000,'The customer was jumped to ' + itemName ,'success');
				setTimeout(function() {
					aa_close_containing_popup(aa_var_first(context,'ControlElement'));
				},2000);
				aa_lmcApi_ServerSendCustomerToLocationLog(aa_var_first(context,'Room'),itemName);
			}
		},'WaitForSendingJumpAcknowledge');

		setTimeout(function() {
			if (!acknowledged) {
				$('.fld_sending_progress').hide();
				aa_showNotification(context,'SendJumpNotification',200000,'The customer is either offline or did not get the send request','error');
				aa_lmcApi_ServerErrorLog('jumping_customer_'+aa_var_first(context,'User').getAttribute('name'));
			}
		},8000);
	},
	LMCHighlightSelectedInNavigation: function(profile,data,context) {
		var itemID = aa_text(data,profile,'SelectedItemID',context);
		var $topNav = $('.fld_Visitor_Navigation');
		$topNav.find('.aa_lmc_selectedItem').removeClass('aa_lmc_selectedItem');
		if (!itemID) return;

		var items = $topNav.find('.aa_item_items_desktop');
		for(var i=0;i<items.length;i++) {
			var item = items[i].jbItem && items[i].jbItem[0];
			if (item && item.getAttribute('id') == itemID) {
				$(items[i]).addClass('aa_lmc_selectedItem');
				return;
			}
		}
	},
	AddInvitationToVisitorLog: function(profile,data,context) {
		if (aa_cb_getSide(context) != 'agent') return;
		var type = aa_text(data,profile,'InvitationType',context);
		var roomID = aa_var_first(context,'Room').getAttribute('id');

		var appContext = context.vars._AppContext[0];
		var eventObject = {
			time: new Date().getTime() + window.jbServerTimeDiff,
			command: 'agentInvitation',
			fromCustomer: true,
			roomID: roomID,
			args: {
				type: type,
				phoneNumber: aa_text(data,profile,'PhoneNumber',context),
				body: aa_text(data,profile,'Body',context),
				email: aa_text(data,profile,'Email',context)
			}
		};
		appContext.lmcCustomerEvents = appContext.lmcCustomerEvents || [];
		appContext.lmcCustomerEvents.push(eventObject);

		var args = JSON.stringify(eventObject.args || {});
		args = args.replace(/\n/g,'\\n').replace(/\r/g,'');
		var toAppend = eventObject.time + '|' + eventObject.command + '|' + args + '\n';

		appContext.lmcActivityLog[roomID] = appContext.lmcActivityLog[roomID] || [];

		appContext.FixEventObject(eventObject);
		var wasInSession = appContext.lmcInRealtimeSession;
		appContext.lmcInRealtimeSession = true;
		if (!wasInSession) aa_lmc_listenToCallHomeIfNeeded(context);

		appContext.lmcLastReadCustomerEvent++;

		return [aa_lmcApi_appendToLog({
				project: aa_lmc_projectID(context),
				room: aa_var_first(context,'Room').getAttribute('id'),
				logFile: 'visitor',
				toAppend: toAppend
		})];
	},
	RemoveItemFromCurrentRoom: function(profile,data,context) {
		var itemInTemplate = aa_first(data,profile,'ItemInTemplate',context);
		var itemID = itemInTemplate.getAttribute('id');
		var roomXml = aa_first(data,profile,'RoomXml',context);
		var roomItems = aa_xpath(roomXml,'items',true)[0];

		var itemInRoom = aa_xpath(roomItems,'*[#'+itemID+']')[0];
		if (itemInRoom) {
			var prevSibling = itemInRoom.previousSibling;
			var nextSibling = itemInRoom.nextSibling;
			roomItems.removeChild(itemInRoom);
			if (prevSibling && prevSibling.getAttribute('type') == 'heading' && prevSibling.getAttribute('group') == 'true')
				if (!nextSibling || nextSibling.getAttribute('type') == 'heading' )
					roomItems.removeChild(prevSibling);
		}
	},
	AddItemsToCurrentRoom: function(profile,data,context) {
		var items = aa_run(data,profile,'Items',context);
		var roomXml = aa_first(data,profile,'RoomXml',context);
		var roomItems = aa_xpath(roomXml,'items',true)[0];
		var wizardTemplateItems = aa_run(data,profile,'WizardTemplateItems',context);		// wizardTemplateItems is used to add the item in the right place

		if (items.length == 0) return;

		var footerItemID = roomItems.getAttribute('footerStartItem') || '';
		var footerItem = findItem(footerItemID);

		var templateHeader = findTemplateHeader();
		if (templateHeader && templateHeader.getAttribute('group') == 'true') {
			var headingInRoom = findItem(templateHeader.getAttribute('id'));
			if (!headingInRoom) {
				addItemsToRoom([templateHeader],true);
				headingInRoom = findItem(templateHeader.getAttribute('id'));
			}

			var nextHeading = headingInRoom.nextSibling;
			for(;nextHeading!=null;nextHeading=nextHeading.nextSibling) {
				if (nextHeading.nodeType == 1 && nextHeading.getAttribute('type') == 'heading')
					break;
			}
			if (nextHeading)
				footerItem = nextHeading;

			footerItem = findItemToAddBefore(items[i],footerItem);
		}

		addItemsToRoom(items);
		aa_triggerXmlChange(roomItems);

		function findTemplateHeader() {
			var item = items[0];
			for(var iter=item;iter;iter=iter.previousSibling) {
				if (iter.nodeType == 1 && iter.getAttribute('type') == 'heading')
					return iter;
			}
			return null;
		}
		function findItem(id) {
			if (!id) return null;
			return aa_xpath(roomItems,'*[#'+id+']')[0];
		}

		function addItemsToRoom(itemsToAdd,isHeaderGroup) {
			var lastItem = footerItem;
			if (isHeaderGroup && wizardTemplateItems.length) {
				lastItem = findItemToAddBefore(itemsToAdd[0],footerItem,true);
			}

			for(var i=0;i<itemsToAdd.length;i++) {
				// if an item with the same id exists - remove it
				var itemWithSameID = aa_xpath(roomItems,'*[#'+itemsToAdd[i].getAttribute('id')+']')[0];
				if (itemWithSameID) roomItems.removeChild(itemWithSameID);
				
				var itemXml = aa_importNode(itemsToAdd[i],roomItems).cloneNode(true);
				itemXml = aa_lmc_instantiateXmlFromTemplate(itemXml);
				roomItems.insertBefore(itemXml,lastItem);
			}
		}

		function findItemToAddBefore(item,lastItem,isHeaderGroup) {
			var out = lastItem;
			var itemID = item.getAttribute('id');
			var beforeLast = null;
			if (lastItem)
				beforeLast = lastItem.previousSibling;
			if (!lastItem) {
				var allRoomItems = aa_xpath(roomItems,'*');
				beforeLast = allRoomItems[allRoomItems.length-1];
			}
			for(var iter=beforeLast;iter;iter=iter.previousSibling) {
				if (iter && iter.nodeType == 1) {
					var iterID = iter.getAttribute('id');
					
					if (!isHeaderGroup) {
						if (iter.getAttribute('type') == 'heading') return out;
						if (iter.getAttribute('type') == 'heading') return out;
						if (shouldBeBeforeItem(itemID,iterID,isHeaderGroup)) out = iter;
						else return out;
					} else {
						var isIterGroup = (iter.getAttribute('type') == 'heading' && iter.getAttribute('group') == 'true');
						if (isIterGroup) {
							if (shouldBeBeforeHeaderGroup(item,iter)) out = iter;
							else return out;
						}
					}
				}
			}
			return out;
		}

		function shouldBeBeforeItem(itemID,iterID) {
			for(var i=0;i<wizardTemplateItems.length;i++) {
				var wizardItemID = wizardTemplateItems[i].getAttribute('id');
				if (wizardItemID == itemID) return true;
				if (wizardItemID == iterID) return false;
			}
			return true;
		}

		function shouldBeBeforeHeaderGroup(heading,iterHeading) {
			var item = aa_nextElementSibling(heading);
			var iter = aa_nextElementSibling(iterHeading);
			if (!item || !iter) return false;
			return shouldBeBeforeItem(item.getAttribute('id'),iter.getAttribute('id'));
		}
	},
	GotoLogEventLocation: function(profile,data,context) {
		var evt = aa_first(data,profile,'Event',context);
		if (!evt) return;
		var appContext = context.vars._AppContext[0];

		if (evt.args.uiState) {
			var uiState = aa_parsexml(evt.args.uiState);
		} else if (evt.args.item || evt.args.itemid) {
			var uiState = aa_parsexml('<uiState itemShown="'+(evt.args.item||evt.args.itemid)+'"/>');
		} else {
			var uiState = aa_cb_emptyUIState(appContext);
			aa_trigger(appContext,'cbUpdateUIState',{ state: uiState, eventObject: evt });					
		}

		aa_cb_gotoState(appContext,context,uiState);
	},
	CanMoveItemUpOrDownInHeading: function(profile, data, context) {
		var item = aa_first(data,profile,'Item',context);
		var direction = aa_text(data,profile,'Direction',context);

		var roomItems = item.parentNode;
		if (direction == 'up') {
			var previous = aa_prevElementSibling(item);
			if (previous && previous.tagName == 'item' && previous.getAttribute("type") != 'heading')
				return ["true"];
		} else {
			var next = aa_nextElementSibling(item);
			if (next && next.tagName == 'item' && next.getAttribute("type") != 'heading')
				return ["true"];
		}
	},
	MoveItemUpOrDownInHeading: function(profile, data, context) {
		var item = aa_first(data,profile,'Item',context);
		var direction = aa_text(data,profile,'Direction',context);

		var roomItems = item.parentNode;
		if (direction == 'up') {
			var previous = aa_prevElementSibling(item);
			if (previous && previous.tagName == 'item' && previous.getAttribute("type") != 'heading')
				roomItems.insertBefore(item,previous);
		} else {
			var next = aa_nextElementSibling(item);
			if (next && next.tagName == 'item' && next.getAttribute("type") != 'heading')
				aa_insertAfter(item,next);			
		}
	},
	CanMoveHeadingUpOrDown: function(profile, data, context) {
		var heading = aa_first(data,profile,'Heading',context);
		var direction = aa_text(data,profile,'Direction',context);

		if (findNextHeading()) return ["true"];

		function findNextHeading() {
			for(var iter=heading;iter;) {
				iter = (direction == 'down') ? iter.nextSibling : iter.previousSibling;
				if (iter && iter.nodeType == 1 && iter.getAttribute('type') == 'heading') return iter;
			}
		}		
	},
	MoveHeadingUpOrDown: function(profile, data, context) {
		var heading = aa_first(data,profile,'Heading',context);
		var direction = aa_text(data,profile,'Direction',context);

		var roomItems = heading.parentNode;

		var items = [];
		for(var iter=heading.nextSibling;iter;iter=aa_nextElementSibling(iter)) {
			if (iter.nodeType != 1) continue;
			if (iter.getAttribute('type') == 'heading') break;
			items.push(iter);
		}

		var nextHeading = findNextHeading();
		if (!nextHeading) return;
		if (direction == 'down') {
			var lastItem = lastItemInHeading(nextHeading);
			lastItem = lastItem && aa_nextElementSibling(lastItem);
			roomItems.insertBefore(heading,lastItem);
		} else {
			roomItems.insertBefore(heading,nextHeading);
		}

		for(var i=items.length-1;i>=0;i--)
			aa_insertAfter(items[i],heading);		

		aa_triggerXmlChange(roomItems);

		function findNextHeading() {
			for(var iter=heading;iter;) {
				iter = (direction == 'down') ? iter.nextSibling : iter.previousSibling;
				if (iter && iter.nodeType == 1 && iter.getAttribute('type') == 'heading') return iter;
			}
		}
		function lastItemInHeading(headingIter) {
			var prev = headingIter;
			for(var iter=aa_nextElementSibling(headingIter);iter;iter=aa_nextElementSibling(iter)) {
				if (iter.getAttribute('type') == 'heading') return prev;
				prev = iter;
			}
		}
	},
	DeleteHeadingWithItems: function(profile, data, context) {
		var cntr = aa_var_first(context,'ItemListCntr');
		var elems = [];
		var itemElement = aa_first(data,profile,'Item',context);
		elems.push(itemElement);
		for(var iter=itemElement.nextSibling;iter;iter=iter.nextSibling) {
			if (!iter.jbItem) continue;
			if (iter.jbItem[0].getAttribute('type') == 'heading') break;
			elems.push(iter);
		}

		for(var i=0;i<elems.length;i++) 
      aa_itemlist_deleteItem({ cntr: cntr, itemElement: elems[i] });    
	},
	ItemsInHeading: function(profile, data, context) {
		var out = [];
		var roomXml = aa_first(data,profile,'RoomXml',context);
		var heading = aa_first(data,profile,'Heading',context);
		var hasHeading = heading && heading.getAttribute('type') != 'null heading';
		var iter = hasHeading ? aa_nextElementSibling(heading) : aa_xpath(roomXml,'items/*')[0];

		for(;iter;iter=aa_nextElementSibling(iter)) {
			if (iter.getAttribute("type") == 'heading') return out;
			out.push(iter);
		}
		return out;
	},
	LMCVisitorNotification: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];		
		if (aa_cb_getSide(context) != 'visitor') return;

		aa_bind(appContext,'roomUpdatedNotification',function() { 
			ajaxart.runNativeHelper([],profile,'ShowNotification',aa_ctx(context,{ NotifyType: ['update room']}));
		});

		aa_bind(appContext,'agentEvent',function(eventObject) { 
			if (eventObject.command != 'goto' || eventObject.firedByRefresh) return;

			ajaxart.runNativeHelper([eventObject],profile,'ShowNotification',aa_ctx(context,{ NotifyType: ['change location']}));
		},'LMCVisitorNotification');		
	},
	LMCUIUpdates: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];		
		return [{
			Load: function(data1,ctx) {
				if (aa_cb_getSide(ctx) == 'agent') {
					aa_bind(appContext,'lmcShownRoomChanged',function(args) {
						var roomID = aa_var_first(ctx,'Room').getAttribute('id');
						aa_refresh_field(['Room_Details','LMC_Content_Preview','agent_mobile_phone','expand_collapse_buttons']);
						$('.selected_room').removeClass('selected_room');
						var roomElems = $.merge($('.aa_item_master_rooms'),$('.aa_item_master_templates'));
						for(var i=0;i<roomElems.length;i++)
							if (roomElems[i].jbItem[0].getAttribute('id') == roomID)
								$(roomElems[i]).addClass('selected_room');
					});
				}
				if (aa_cb_getSide(ctx) == 'visitor') {
					aa_bind(appContext,'cbGotoUIState',function(args) {
						var $topNav = $('.fld_Visitor_Navigation');
						var itemID = args.state.getAttribute('itemShown');
						ajaxart.runNativeHelper([itemID],profile,'GotoItemInDesktop',context);
					});
				}
			}
		}];
	},
	MinHeightForViralItem:function (profile, data, context) {
			var field = context.vars._Field[0];
			var bottomPadding = aa_int(data,profile,'BottomPadding',context);
			if (aa_cb_getSide(context) != 'visitor') bottomPadding=0;

			aa_bind(field,'ModifyControl',function (args) {
				var visualCntr = aa_findVisualContainer(args.Wrapper,args.Context);
				if (visualCntr) {
					if (visualCntr.heightByCss && !visualCntr.height) 
						setTimeout(function() {fix(args,visualCntr);},10);
					else
						fix(args,visualCntr);

					aa_attach_window_resize(function(){
						fix(args,visualCntr);
					},visualCntr.el);
				}
			});

			function fix(args,visualCntr) {
				var height = ($(visualCntr.el).height() || visualCntr.height ) - bottomPadding;
				if (visualCntr.ID == 'cobrowse_main_cntr_desktop') height = $('body').height() - 52 - bottomPadding;

				$(args.Wrapper.firstChild).css('min-height',height+'px');
			}
		},
		ShowParagraphOnRefreshPreview: function(profile, data, context) {
		var changedXml = aa_first(data,profile,'ChangedXml',context);
		if (!changedXml) return;
		var paragraph = changedXml.nodeType == 1 ? changedXml : aa_xpath(changedXml,'..')[0];
		if (paragraph.tagName != 'paragraph') return;
		
		var elems = $('.aa_item_paragraphs_table1');
		for(var i=0;i<elems.length;i++)
			if (elems[i].jbItem[0] == paragraph) {
				elems[i].scrollIntoView();
				//aa_scrollToShowElement(elems[i],''); 
			}
	},
	LMCSyncPreviewWithEditor: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];
		appContext.LMCEditorItemChanged = function(data1,ctx) {
			if (aa_cb_getSide(ctx) != 'agent') return;

			var id = aa_totext(data1);
			var uiState = aa_var_first(ctx,'UIState');
			if ((uiState.getAttribute('itemShown') || '') == id) return;

			uiState.setAttribute('itemShown',id);
			uiState.setAttribute('scrollY',0);
			aa_cb_gotoState(appContext,ctx,uiState);
		};
		appContext.LMCShowingItem = function(data1,ctx) {
			if (aa_cb_getSide(ctx) != 'agent') return;

			var uiState = aa_var_first(ctx,'UIState');
			var id = uiState.getAttribute('itemShown') || '';

			var ctrl = $('.fld_room_content_editor')[0];
			if (!ctrl) return;
			var itemlist = ctrl.jbItemList;
			var topControl = $(ctrl).parents('.fld_'+itemlist.cntr.Id)[0].parentNode;
			var replacingAllObj = topControl.jbDetailsReplacingAll;
			var currentID = replacingAllObj ? replacingAllObj.jbItem[0].getAttribute('id') : '';
			if (id == currentID) return;

			if (replacingAllObj) {
        aa_remove(topControl.jbDetailsReplacingAll,true);
        topControl.jbOriginalCtrl.style.display = 'block';
        topControl.jbDetailsReplacingAll = null;
			}

			if (id) {
				var elems = itemlist.GetElements();
				for(var i=0;i<elems.length;i++) {
					if (elems[i].jbItem[0].getAttribute('id') == id)
						elems[i].click();
				}
	    }
		};
	},
	LMCPreviewShowVisitorSize: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];
		var buttonClass = aa_cssClass(data,profile,'ButtonCss',context);

		aa_bind(context.vars._Field[0],'ModifyControl',function(args) {
			aa_bind(appContext,'customerEvent',function(eventObject) { 
				if (eventObject.command == 'windowsize' && ( !eventObject.firedByRefresh || eventObject.time + 1000*60*30 >= new Date().getTime() ))
					aa_run_delayed_action('lmc_LMCPreviewShowVisitorSize',function() {
						handle(eventObject,args);
					},10);
			},'LMCPreviewShowVisitorSize');

			var events = appContext.lmcCustomerEvents || [];
			for(var i=events.length-1;i>=0;i--) {
				var eventObject = events[i];
				if (eventObject.time + 1000*60*30 < new Date().getTime() ) return; // ignore it if it's not in the last 30 minutes (probably out of session)

				if (eventObject.command == 'windowsize') return handle(eventObject,args);
			}
			aa_addOnDetach(args.Wrapper,function() {
				$('.lmc_undo_visitor_size_preview').remove();
			});

		},'LMCPreviewShowVisitorSize');

		function handle(eventObject,args) {
				var visualCntr = args.Context.vars.VisualContainer[0];
				var width = parseInt(eventObject.args.width);
				var height = parseInt(eventObject.args.height);
				if (width > height) { var x = width; width = height; height=width; } // show as portrait
				if (width > 450) return; // we are interested only in mobile devices

				if (visualCntr.ForceWidth) visualCntr.ForceWidth(width);
				if (visualCntr.ForceHeight) visualCntr.ForceHeight(height);

				var showAllButton = $('<button class="lmc_undo_visitor_size_preview" />').addClass(buttonClass).click(function() {
					visualCntr.forceHeight = 0;
					visualCntr.forceWidth = 450;
					$(visualCntr.el).css({width: '450px', height: 'auto' });
					if (visualCntr.fireResize) visualCntr.fireResize();
					$('.lmc_undo_visitor_size_preview').remove();
				});
				showAllButton.width(visualCntr.width+2).css('top',145 + height + 'px');

				$('.lmc_undo_visitor_size_preview').remove();
				if (height)
					$(args.Wrapper.parentNode).append(showAllButton[0]);
		}
	},
	LMCDescriptionOfUIState: function (profile,data,context) {
		var appContext = context.vars._AppContext[0];
		appContext.DescriptionOfUIState = function(uiState,ctx) {
			var room = aa_var_first(context,'Room');
			var itemID = uiState[0].getAttribute('itemShown');
			if (itemID) 
				return [aa_totext( aa_xpath(room,'items/item[#'+itemID+']/@name'))];
			else
				return ['Main Page'];
		};
	},
	SaveLMCProject: function (profile,data,context) {
			if (aa_var_first(context,'Project').getAttribute('nodrive') == 'true') {
				return [aa_lmc_saveProjectSettings(context,false)];
			}
			if (window.jbGoogleDriveDocument && !ajaxart.jbart_studio) {
				var project = aa_var_first(context,'Project');
				jbGoogleDriveDocument.content = ajaxart.xml.prettyPrint(project);
				jbGoogleDriveDocument.title = project.getAttribute('name');
				return [jbGoogleDriveDocument.save()];
			}
		}, 
		AddUniqueID: function (profile,data,context) {
			if (!data[0] || data[0].nodeType != 1) return;
			var chars = '0123456789abcdefghijklmnopqrstuvwxyz';

			var tag = data[0].tagName;
			var lmcItem = (tag != 'item' && aa_var_first(context,'LMCItem'));

			newid = randomStr(4);
			if (tag != 'item' && lmcItem) newid = nextID(aa_xpath(lmcItem,tag+'/@id'));

			data[0].setAttribute('id',newid);

			function randomStr(length) {
				var out = '';
				for(var i=0;i<length;i++) {
					var num = Math.floor((Math.random()*chars.length));
					out += chars.charAt(num);
				}
				return out;
			}
			function nextID(results) {
				var out = 1;
				for(var i=0;i<results.length;i++) {
					var num = parseInt(aa_totext([results[i]]));
					if (num && num >= out) out = num+1;
				}
				return out;
			}
		},
		LMCImageHeight: function (profile,data,context) {
			var room = aa_var_first(context,'Room');
			var height = aa_toint(aa_xpath(data[0],'@CustomHeight')) || aa_toint(aa_xpath(room,'style/general/@mainImageHeight'));
			var width = aa_int(data,profile,'Width',context);

			if (width) {
				height = Math.floor(height * width / 300);
				return [height];
			}
	  	var visualContainer = aa_findVisualContainer(null,context);
	  	if (visualContainer.ID == 'cobrowse_main_cntr')
	  		if (visualContainer.width >= 450) height = parseInt(height * 1.5);

	  	return [height];
	  },
	  LMCAdjustImageInBox: function (profile,data,context) {
	  	return [{
				fix: function(image,div,innerDiv,settings) {
					var item = aa_first(data,profile,'Item',context);
					if (item) {
						var fit = item.getAttribute('fit') || 'Fit';
						var room = aa_var_first(context,'Room');
						var height = aa_toint(aa_xpath(item,'@CustomHeight')) || aa_toint(aa_xpath(room,'style/general/@mainImageHeight'));
						var width = image.width;
						var boxHeight = image.height;

						var proportionalHeight = parseInt(height * width / 300);
						if (proportionalHeight < boxHeight) {
							image.height = proportionalHeight;
							ajaxart.runNativeHelper(data,profile,'Fill',context)[0].fix(image,div,innerDiv,settings);
							$(div).css('margin-top',parseInt( (boxHeight-proportionalHeight)/2 ) + 'px');
							var marginTop = parseInt( $(innerDiv).css('margin-top').split('px')[0] );
							$(innerDiv).css('height',proportionalHeight-marginTop+'px');
							return;
						}

						if (proportionalHeight > boxHeight && height) {
							var proportionalWidth = parseInt(width * proportionalHeight / boxHeight);
							image.width = proportionalWidth;
							ajaxart.runNativeHelper(data,profile,'Fill',context)[0].fix(image,div,innerDiv,settings);
							$(div).css('margin-left',parseInt( (width-proportionalWidth)/2 ) + 'px');
							var marginLeft = parseInt( $(innerDiv).css('margin-left').split('px')[0] );
							$(innerDiv).css('width',proportionalWidth-marginLeft+'px');
							return;
						}
					}
					ajaxart.runNativeHelper(data,profile,'Default',context)[0].fix(image,div,innerDiv,settings);
				}	  		
	  	}];
	  },
	  HtmlCleansing: function (profile,data,context) {
	  	var cleansing = ',' + aa_text(data,profile,'Options',context) + ',';
	  	var html = aa_text(data,profile,'Html',context);
	  	var paragraphs = [{content: html, type: 'html'}];
	  	//phase I - split to paragraphs
	  	//phase II - clean paragraphs
	  	for(var i=0;i<paragraphs.length;i++) {
	  		if (cleansing.indexOf('remove html table') != -1)
	  			paragraphs[i] = { content: paragraphs[i].content.replace(/<tbody/gi, "<div").replace(/<tr/gi, "<div").replace(/<\/tr>/gi, "</div>").replace(/<td/gi, "<span").replace(/<\/td>/gi, "</span>").replace(/<\/tbody/gi, "<\/div") } 
	  		if (cleansing.indexOf('adaptable width') != -1)
	  			paragraphs[i] = { content: paragraphs[i].content.replace(/width="[^"]+"/gi, '').replace(/width='[^'']+'/gi, '') };
	  		// if (cleansing.indexOf('font size') != -1) {
	  		// 	var c = paragraphs[i];
	  		// 	c.replace(/font-size:[^p]+/gi, function(size) {
	  		// 		if ()
	  		// 	});

	  		// 	paragraphs[i] = { content: paragraphs[i].content.replace(/font-size:[^;"]+/gi, '').replace(/width='[^'']+'/gi, '');
	  		// }
	  		if (cleansing.indexOf('plain text') != -1)
	  			paragraphs[i] = { content: paragraphs[i].content.replace(/<\/?[^>]+>/gi, '') , type: 'text'};
	  	}

	  	//Phase III - paragraphs to xml
	  	var result = [];
	  	for(var i=0;i<paragraphs.length;i++) {
	  		var par = aa_parsexml('<paragraph/>');
	  		if (paragraphs[i].type == 'text')
	  			par.setAttribute('text',paragraphs[i].content);
	  		if (paragraphs[i].type == 'html')
	  			par.setAttribute('html',paragraphs[i].content);
	  		result.push(par);
	  	}
		return result;
  },
  FixParagraphImageDimensions: function (profile,data,context) {
  	var par = data[0];
  	var url = par.getAttribute('image');
  	aa_calc_image_size(url,function(width,height) {
  		if (width) par.setAttribute('imageWidth',width); else par.removeAttribute('imageWidth');
  		if (height) par.setAttribute('imageHeight',height); else par.removeAttribute('imageHeight');
  	});
  },
	NotifyAgentWhenVisitorJoins: function (profile,data,context) {
		return [{
			Load: function(data1,ctx) {
				var appContext = aa_var_first(context,'_AppContext');
				if (aa_cb_getSide(context) != 'visitor' || window.location.href.indexOf('notracking=true') > -1 ) return;
				aa_bind(appContext,'roomLoaded',function(args) {
					ajaxart.runNativeHelper(data,profile,'NotifyAgent',aa_merge_ctx(context,ctx));
				});
				appContext.lmcNotifyAgentForDeletedRoom = function(roomContent,ctx) {
					ajaxart.runNativeHelper(roomContent,profile,'VisitorOpensDeletedRoom',aa_merge_ctx(context,ctx));
				}
				appContext.lmcNotifyAgentForRestoredRoom = function(roomContent,ctx) {
					ajaxart.runNativeHelper(roomContent,profile,'VisitorRestoresFromArchive',aa_merge_ctx(context,ctx));
				}
			}
		}];
	},
	ReplaceSMSEmailContent: function (profile,data,context) {
		 var text = jBart.get("%$Room/sms/@text%",data,context);
		 if (text.indexOf('{URL}') >= 0 || text.indexOf('{Customer}') >= 0) {
		   text = text.replace('{URL}',jBart.get("%$Room/@tinyUrl%",data,context));
		   text = text.replace('{Customer}',jBart.get("%$Room/@customerName%",data,context));
		   text = aa_totext(ajaxart.runNativeHelper([text],profile,'ReplaceVariableFields',context));
		   jBart.set("%$Room/sms/@text%",text,data,context);
		   aa_refresh_field(['lmc_sms_text'],'screen',false,null,context);
		   aa_refresh_field(['SMSWarning'],'screen',false,null,context);
		   // setTimeout( function() { $('fld_lmc_sms_text').focus() },1);
		 }
	}
});

aa_gcs("lmc",{
	AddBodyCssFromSettings: function(profile,data,context) {
		var visualCntr = aa_findVisualContainer(null,context);
		var css = aa_totext( ajaxart.runNativeHelper(data,profile,'Css',context));
		var cssClass = aa_attach_global_css(css);

		if (visualCntr.el)
			$(visualCntr.el).addClass(cssClass);
		else
			setTimeout(function() {
				$(visualCntr.el).addClass(cssClass);				
			},1);
	},
	AddAllCssFromSettings: function(profile,data,context) {
		var visualCntr = aa_findVisualContainer(null,context);
		var css = aa_totext( ajaxart.runNativeHelper(data,profile,'Css',context));
		var cssClass = aa_attach_global_css(css);

		if (visualCntr.el)
			$(visualCntr.el).addClass(cssClass);
		else
			setTimeout(function() {
				$(visualCntr.el).addClass(cssClass);				
			},1);
	},
	CssFromSettings: function(profile,data,context) {
		var field = context.vars._Field[0];
		ajaxart.runNativeHelper(data,profile,'CssAspect',context);
		var cssID = aa_text(data,profile,'CssID',context);

		aa_field_handler(field,'ModifyCell',function(cell)
		{
			$(cell).addClass('jb_css_settings');
			cell.jbCssID = cssID;
		});	
	}
});

function aa_lmc_itemid2itemname(context,itemid,roomid) {	
	var currentRoom = aa_var_first(context,'Room');
	var room = null;
	if (currentRoom && currentRoom.getAttribute('id') == roomid) 
		room = currentRoom;
	else {
		room = aa_xpath(aa_var_first(context,'FullRooms'),'*[#'+roomid+']')[0];
	}
	if (!room) {
		ajaxart.log('error in aa_lmc_itemid2itemname, room ' + roomid + ' is not the current room and it does not appear in FullRooms','error');
		return '';
	}

	if (itemid) {
		var name = aa_totext( aa_xpath(room,'items/item[#'+itemid+']/@name'));
		if (!name) return '';
		var itemsWithThisName = aa_xpath(room,"items/item[@name='"+name+"']");
		if (itemsWithThisName.length > 1) {
			// not unique, we'll add the heading name to it
			var item = aa_xpath(room,'items/item[#'+itemid+']')[0];
			var heading = findHeadingOfItem(item);		
			if (heading && heading.getAttribute('name'))
				return name + ' - ' + heading.getAttribute('name');
		}
		return name;
	}
	else
		return 'Main Page';

	function findHeadingOfItem(item) {
		for(var iter=item;iter;iter=aa_prevElementSibling(iter)) {
			if (iter && iter.getAttribute('type') == 'heading') return iter;
		}
		return null;
	}	
}


aa_gcs("lmc",{
	LMCSendShownItemChanged: function(profile, data, context) {
		if (aa_cb_getSide(context) != 'visitor') return;
		if (window.location.href.indexOf('notracking=true') > -1) return;

		var itemID = aa_text(data,profile,'ItemID',context);
		var appContext = context.vars._AppContext[0];
		if (appContext.lmcLastItemShown == itemID) return;
		appContext.lmcLastItemShown = itemID;

		var evt = {
			command: 'itemShown',	args: {
				itemid: itemID
			}
		};
		doSendAfterJoin();

		function doSendAfterJoin() {
			if (appContext.lmcJoinEventSent)
				appContext.SendCoBrowseEvent(evt);
			else
				setTimeout(doSendAfterJoin,300);
		}
	},
	FormatEventDuration: function(profile, data, context) {
//		return [];
		var millis = aa_int(data,profile,'DurationInMillis',context);
		if (!millis) return;
		var seconds = Math.ceil(millis / 1000);
		if (seconds > 60) {
			var mins = Math.floor(seconds / 60);
			var secs = seconds - (mins*60);
			return [mins+'m ' + secs + 's'];
		} else {
			return [seconds+'s'];
		}

		function pad(num) {
			return (num<10) ? '0'+num : num;
		}
	},
	LMCItemslist: function(profile, data, context) {
		var field = context.vars._Field[0],appContext = context.vars._AppContext[0];
		var style = aa_first(data,profile,'Style',context);
		appContext.lmcLastItemShown = '';

		aa_bind(field, 'initItemList', function (itemlist) {
			aa_bind(itemlist,'showDetails',function(args) {
				sendShownEvent(args.Item);
			});
			aa_bind(itemlist,'showDetailsTransitionEnd',function(args) {
				aa_cbUpdateScrollPosition(0,context,true);
			});

			aa_bind(itemlist,'backFromDetails',function(args) {
				sendShownEvent(null);
			});

			aa_bind(appContext, 'customerEvent', function(eventObject) {
				if (eventObject.command != 'itemShown') return;
				var markShownItem = {
					itemlist: itemlist,
					itemid: eventObject.args.itemid,
					itemElem: find_itemElement(itemlist,eventObject.args.itemid)
				};
				if (! markShownItem.itemElem && markShownItem.itemid) return;
				aa_renderStyleObject2(style,markShownItem,data,field,aa_ctx(context,{ _ClassForItem: itemlist.classForItem }),{ funcName: 'show' });
			});

			aa_bind(appContext,'cbUpdateUIState',function(updateArgs) {
				var evt = updateArgs.eventObject;
				if (evt.command != 'itemShown') return;
				updateArgs.state.setAttribute('itemShown',evt.args.itemid);	
			},'itemshown_'+field.Id);

			aa_bind(appContext,'cbGotoUIState',function(args) {
				var itemID = args.state.getAttribute('itemShown');
				if (itemID) {
					var itemElem = find_itemElement(itemlist,itemID);				
					if (!itemElem) return;
					var ctx2 = aa_merge_ctx(context,aa_ctx(itemlist.context,{ ControlElement: [itemElem] } ));
					window.jbDoNotSendViewEvent = true;
					ajaxart.run(itemElem.Item,profile,'ActionToShowItem',ctx2);
					window.jbDoNotSendViewEvent = false;
				} else {
					var ctx2 = aa_merge_ctx(context,aa_ctx(itemlist.context,{ControlElement: [itemlist.el], ItemList: [itemlist] }));
					ajaxart.run([],profile,'ActionToShowNoItem',ctx2);
				}
			},'itemshown_'+field.Id);

				setTimeout(function() {
					aa_cbUpdateScrollPosition(0,context);
				},50);

			function sendShownEvent(Item) {
				var itemID = Item ? Item[0].getAttribute('id') : '';
				if (appContext.lmcLastItemShown == itemID) return;
				appContext.lmcLastItemShown = itemID;

				var evt = {
					command: 'itemShown',
					args: {
						itemid: itemID
					}
				};

				if (aa_cb_getSide(context) == 'visitor') {
					appContext.SendCoBrowseEvent(evt);
					if (!window.jbInRefreshAfterHashChange) {
						window.jbIgnoreHashChange = true;
						if (!ajaxart.isAndroid)
							aa_setUrlHashValue('item',itemID);
						setTimeout(function() {window.jbIgnoreHashChange = false;},1);
					}
				}

				var uiState = aa_var_first(context,'UIState');
				uiState.setAttribute('itemShown',itemID);
			}
    });

		function find_item(itemlist,itemid) {
			var items = itemlist.cntr.Items;
			for(var i=0;i<items.length;i++)
				if (items[i].getAttribute('id') == itemid) return items[i];
		}

		function find_itemElement(itemlist,itemid) {
			if (!itemid) return null;
	    var elems = itemlist.GetElements();
	    for(var i=0;i<elems.length;i++) {
        if (elems[i].jbItem[0].getAttribute('id') == itemid) return elems[i];
	    }

			if (itemlist.IsLongList) {
				var item = find_item(itemlist,itemid);
				if (!item) return;
				var elem = itemlist.EnsureItemElementExists(item);
				if (elem) return elem;
			}

	    return null;
		}
	}
});

function aa_lmcItemName(context,itemID) {
	var room = aa_var_first(context,'Room');
	return aa_totext( aa_xpath(room,'items/item[#'+itemID+']/@name') );
}

/**************************************** Notifications *************************************************************/

aa_gcs("lmc", {
	LMCNotificationOnLogEntry: function(profile, data, context) {
		var appContext = context.vars._AppContext[0];
		if (aa_cb_getSide(context) == 'visitor') return;
		
		aa_bind(appContext,'cbLogItemAdded',function(args) {
			if (!aa_totext(args.Text) || args.type == 'agentInvitation' || args.Event.firedByRefresh) return;
			aa_refresh_field(['cobrowse_logs']);
			ajaxart.runNativeHelper([args],profile,'Show',context);
		},'LMCNotificationOnLogEntry');
	}
});

/**************************************** Notifications *************************************************************/

function aa_lmc_slide_transition(transition,settings,slideToLeft,time) {
	var controlElement = aa_var_first(transition.context,'ControlElement');
	if (controlElement) $(controlElement).addClass('aa_active_in_transition');
	if (aa_screen_size(false).width < 450) {
		$('body').css('overflow-x','hidden');
		setTimeout(function() {
			slideToLeft = (settings.direction == 'From Right');
			transition.onBeforeTransitionBegin();
			var width = aa_screen_size(false).width;
			var height = aa_screen_size(false).height;
			var origPos = $(transition.elOriginal).css('position'),newPos=$(transition.elNew).css('position');
			var transitionTime = 400; 
			
			var origLeft2 = slideToLeft ? -width : width;
			$(transition.elOriginal).css({ position: 'absolute', left: 0, width: '100%' });

			var newMarginLeft = slideToLeft ? width : -width;
			var topDiff = 0;

			if (slideToLeft) {
				window.jbLMCMainMenuScrollY = window.scrollY;
				topDiff = 0;
				$(transition.elNew).css('margin-top','-'+topDiff+'px');
			}
			
			$('.lmc_viral_item').hide();

			if (!slideToLeft) {
				topDiff = window.jbLMCMainMenuScrollY || 0;
				$(transition.elNew).css('margin-top','-'+topDiff+'px');
			}

			$(transition.elNew).css('position','fixed').css('width','100%').css('margin-left',newMarginLeft);

			if (transition.elOriginal.parentNode) {
				transition.elOriginal.parentNode.appendChild(transition.elNew);
			}

			$(transition.elOriginal).animate({ left: origLeft2 },transitionTime,'swing');
			$(transition.elNew).animate({ marginLeft: 0 },{ duration : transitionTime, complete: function() {
				transition.removeOriginal(transition.elOriginal); //
				$(transition.elOriginal).css('position',origPos).css('left',0);
				var bodyMinHeight = $('body').css('min-height');
				//$('body').css('min-height',(topDiff+window.innerHeight+100)+'px');
				$('body').css('min-height','5000px');
			  window.scrollTo(0,topDiff);
				 $(transition.elNew).css('margin-top',0).css('position',newPos);
				$('body').css('min-height',bodyMinHeight);
				aa_element_attached(transition.elNew);

				$('.lmc_viral_item').show();
				if (controlElement) $(controlElement).removeClass('aa_active_in_transition');
				transition.onTransitionEnd();
			}});
				
		},100);

		return;
	}
	settings = aa_defaults(settings, { scrollDuration: 200 });
	var transition = settings.transition;
	var directionClass = settings.direction == 'From Right' ? "slide_from_right" : "slide_from_left";

	aa_body().scrollTop = navigator.userAgent.toLowerCase().match(/android/) ? 1 : 0;
	transition.$elNew.addClass("aa_new");
 	var cssClass = aa_attach_global_css(transition.css);
	transition.$elOriginal.parent().addClass(cssClass).addClass(directionClass);
	transition.elOriginal.parentNode.appendChild(transition.elNew);
  aa_element_attached(transition.elNew);  	
	transition.onBeforeTransitionBegin();

	var _transitionEndEvents = "animationend animationend webkitAnimationEnd oanimationend MSAnimationEnd webkitTransitionEnd";
	transition.$elNew.on( _transitionEndEvents, onTransitionEnd );

	function onTransitionEnd() {
		transition.$elOriginal.parent().removeClass(cssClass).removeClass(directionClass);
	  transition.removeOriginal(transition.elOriginal);
	  transition.$elNew.removeClass('aa_new');
		transition.onTransitionEnd();
		if (transition.itemElement) transition.itemElement.scrollIntoView();
		if (controlElement) $(controlElement).removeClass('aa_active_in_transition');
	}
}

/************************************* visitor stats ***************************************/

function aa_lmc_calcVisitorTime(context,visitorEvents) {
	if (visitorEvents && visitorEvents.length == 0) return;
	var visitorStatsNode = aa_var_first(context,'RoomVisitorStats');
	var side = aa_cb_getSide(context);
	var appContext = context.vars._AppContext[0];
	var statsClone = ajaxart.xml2text(visitorStatsNode);

	var visitorTime = 0,joinCount=0,mobileJoinCount=0,mobileVisitorTime=0;
	var prevEventTime = 0,currentItem='main page',timeOfItem = {},lastEventTime=0;
	var isMobile = false,device = '';
	var lastJoinTime=0,prevJoinArgs=null;

	for(var i=0;i<visitorEvents.length;i++) {
		var evt = visitorEvents[i],command = visitorEvents[i].command;
		if (command == 'agentInvitation') continue; // we do not count it in times
		var timeDiff = evt.time - prevEventTime;
		var normalizedTimeDiff = prevEventTime ? Math.min(timeDiff,1000*60) : 0; // normalized time diff does not count more than a minute between events
		if (normalizedTimeDiff < 0) normalizedTimeDiff = 0; // very strange!!!
		
		if (!evt.time || isNaN(evt.time)) 
			timeDiff = normalizedTimeDiff = 0;
		else {
			prevEventTime = evt.time;
			lastEventTime = evt.time;
		}

		if (command == 'join') {
			device = evt.args.device || '';
			isMobile = device.toLowerCase().indexOf('iphone') > -1 || device.toLowerCase().indexOf('android') > -1;

			
			if (!lastJoinTime || 
				   evt.args.visitorID != prevJoinArgs.visitorID || 
				   evt.args.device != prevJoinArgs.device || evt.args.browser != prevJoinArgs.browser || 
				   evt.time - lastJoinTime > 60000*10 ) { // two joins after 10 minutes count as one join
				joinCount++;
			}

			lastJoinTime = evt.time;
			prevJoinArgs = evt.args;
			if (isMobile) mobileJoinCount++;
			currentItem='main page';
		} else {
			visitorTime += normalizedTimeDiff;
			if (isMobile) mobileVisitorTime += normalizedTimeDiff;

			timeOfItem[currentItem] = timeOfItem[currentItem] || 0;
			timeOfItem[currentItem] += parseInt(normalizedTimeDiff/1000);

			if (command == 'itemShown') {
				currentItem = evt.args.itemid || 'main page';
				timeOfItem[currentItem] = timeOfItem[currentItem] || 1;
			}
		}
	}
	if (joinCount > 0 && visitorTime < 60000) visitorTime = 60000; // do not show 0 minutes, but 1 minute if there was a join	
	visitorStatsNode.setAttribute('visitorTimeMin', Math.round(visitorTime / 60000));
	visitorStatsNode.setAttribute('visitorMobileTimeMin', Math.round(mobileVisitorTime / 60000));
	visitorStatsNode.setAttribute('visitorJoinCount', joinCount);
	visitorStatsNode.setAttribute('visitorMobileJoinCount', mobileJoinCount);

	aa_empty(visitorStatsNode);

	for(var i in timeOfItem) {
		if (timeOfItem.hasOwnProperty(i)) {
			var entry = aa_xpath(visitorStatsNode,'item[#'+i+']',true)[0];
			if (entry) entry.setAttribute('timeSec',timeOfItem[i]);
		}
	}

	if (lastEventTime) {
		visitorStatsNode.setAttribute('lastEventTime',lastEventTime - window.jbServerTimeDiff);
	}

	if (statsClone != ajaxart.xml2text(visitorStatsNode)) {
		// there has been a change. save the stats and update the headers if you're agent
		if (side == 'visitor') {
			appContext.cbChannel.SaveVisitorStats(visitorStatsNode);
		}
		if (side == 'agent') {
			// something is wrong with the visitor stats, and we need to fix it
			aa_lmcApi_saveStats({ content: ajaxart.xml2text(visitorStatsNode), project: aa_lmc_projectID(context), room: visitorStatsNode.getAttribute('id') });
			aa_lmcHeadersRoomStatsUpdated(context,visitorStatsNode);
		}
	}
}

aa_gcs("lmc",{
	VisitorStatistics: function(profile,data,context) {
		return [{
			Load: function(data1,ctx) {
				var appContext = ctx.vars._AppContext[0];
				if (aa_cb_getSide(ctx) != 'visitor') return;

				aa_bind(appContext,'customerEvent',function(evt) {
					if (evt.firedByRefresh) return;
					aa_run_delayed_action('calcAndSaveLMCVisitorStats',function() {
						aa_lmc_calcVisitorTime(ctx,appContext.lmcCustomerEvents);
					},evt.command == 'join' ? 2000 : 20000,false);
				});
			}
		}];
	}
});

function aa_lmcUploadFile(file,e) {
	var context = window.jbLMCContext;
	var deferred = $.Deferred();

	var baseName = aa_guid()+'_'+file.name;
	var fileName = 'files/' + baseName.replace(/[^a-zA-Z_0-9\.\/]/g,'').replace(/\-/g,'');
	var waitCursorCss = aa_attach_global_css("#this { cursor:wait !important; }");

	$('body').addClass(waitCursorCss);
		aa_lmcApi_saveFileWithPost({
			project: aa_lmc_projectID(context),
			key: aa_lmc_projectKey(context),
			file: fileName,
			content: file,
			contentType: file.type
		}).done(function(result) {
			$('body').removeClass(waitCursorCss);
			var publicUrl = aa_lmcApi_getFileUrl(aa_lmc_projectID(context),fileName);
			deferred.resolve(publicUrl, file.name);
		}).fail(function(err) {
			$('body').removeClass(waitCursorCss);
			aa_lmcApi_ServerErrorLog('upload_file','Failed to upload file',err || '');
			deferred.reject();
		});	
   return deferred.promise();
}

function aa_lmc_drop_button(button,settings) {
	settings = aa_defaults(settings, {});
  var input_file = button.$el.find("input");
  var params = { 
  	MAX_IMAGE_SIZE: 120000,			// if image is larger than that we reduce it
  	DESIRED_IMAGE_WIDTH: 600 	// reducing image to this size
  };
  bindEvents();

	function uploadFile(file,e) {
	  setWaitingIndication(true);
  	if (file.name.toLowerCase().match(/(jpg)|(png)|(jpeg)$/) && file.size > params.MAX_IMAGE_SIZE) {  // gif removed because of animated gifs
  		reduceImageSize(file);
  	} else {
	  	aa_lmcUploadFile(file).done(afterUpload);
  	}
	}
	function uploadDataUrl(dataURL, fileName) {
     // Convert to Binary and Upload
		fileName = fileName || 'image';
  	var b64Data = dataURL.split('base64,')[1];
  	var content_type = dataURL.split(':')[1].split(';')[0];
		var blob = aa_b64toBlob(b64Data,content_type);
		blob.name = fileName.split(".")[0] + ".jpg";
  	aa_lmcUploadFile(blob).done(afterUpload);
	}
	function setWaitingIndication(on) {
  	var dropHereText = button.$el.find(".drop_here")[0];
		if (on) {
			button.$el.find(".image_drop_area").css('cursor','wait');
	  	dropHereText.OriginalText = $(dropHereText).text();
	  	$(dropHereText).text("Uploading ...");
	  	button.$el.find(".plus").css("opacity",0);  			
		}
		else {
			button.$el.find(".image_drop_area").css('cursor','pointer');
			$(dropHereText).text(dropHereText.OriginalText);	  		
			button.$el.find(".plus").css("opacity",1);
		}
	}
 function afterUpload(publicUrl, fileName) {
		var fake_html = '<a href="' + publicUrl + '">' + fileName + '</a>';
		if (publicUrl.toLowerCase().match(/(jpg)|(gif)|(png)|(jpeg)$/))
  		fake_html = '<img src="' + publicUrl + '"/>';
		setWaitingIndication(false);
		button.action(null, { DraggedHtml: [fake_html] }  );
		input_file.wrap('<form>').parent('form').trigger('reset');
		input_file.unwrap();
  }
 	function reduceImageSize(file) {
    var img = new Image;	//	 using the browser image and canvas to reduce the image size
    img.src = URL.createObjectURL(file);
    button.$el.find(".drop_here").html("Reducing<br/>Image<br/>Size ...");
    img.onload = function() {
	    var canvas = document.createElement('canvas');
        canvas.width = params.DESIRED_IMAGE_WIDTH;
        canvas.height = img.height * canvas.width / img.width;
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        var dataURL = canvas.toDataURL('image/jpeg');
        uploadDataUrl(dataURL,file.name);
    }
	}
  function cleanDraggedHtml(html) {
  	var deferred = $.Deferred();
		if (html.replace(/<[^>]*>/g,'').replace(/\s/g,'').length == 0) { 	// if html has no inner texts, and has only single image -> take the image
			var images = $(html).find("img").add($(html).filter("img"));
			if (images.length == 1) {
				var image = images[0];
				if (image.getAttribute("src").indexOf('data:image') != 0)
					deferred.resolve(image.outerHTML);			// take the img
				else {
					setWaitingIndication(true);
					uploadDataUrl(image.getAttribute("src"));	// inline image: upload to Google Cloud Storage
					deferred.reject();												// uploadDataUrl func does the post action, no need to do it twice
				} 
			}
		}
		else 	// use full HTML as it is
			deferred.resolve(html);
		return deferred;
  }
  function bindEvents() {
	  input_file.bind('change',function(e) {
			var file = e.target && e.target.files && e.target.files[0];
			if (file) uploadFile(file,e);
	  });
		aa_init_dropImage();
		if (settings.bindClickEvent)
		  button.$el.find('.image_drop_area').bind('click',function(e) { 
		  	button.action(e,{ DraggedHtml: [''], OpenPopup: ['true'] }) 
		  });
	  button.$el.attr("title",button.tooltip);  
	  button.$el.find("button").click( function() {
	    button.$el.find("input").trigger("click");
	  });
	  var mask = button.$el.find(".aa_drop_sink_mask");
		if (mask.length) {
			mask[0].jbDropImage = function (e) {
	      var files = e.dataTransfer.files;
	      if (files.length)
	      	uploadFile(files[0],e);	// one file is enough at this stage ...
				var items = e.dataTransfer.items;
				if (items) {	// Chrome
					for(var i=0;i<items.length;i++)
						if (items[i].type == "text/html" )
							items[i].getAsString(function(html){
								if (isHtmlValid(html))
									cleanDraggedHtml(html).then( function(cleanHtml) {
										button.action(e, { DraggedHtml: [ cleanHtml ] }  );                     
									} );
				      });
				} else {	// Firefox
					var draggedHtml = e.dataTransfer.getData('text/html');
					if (isHtmlValid(draggedHtml))
						cleanDraggedHtml(draggedHtml).then( function(cleanHtml) {
							button.action(e, { DraggedHtml: [ cleanHtml ] }  );                     
						} );
				}
			}
		}
	}
  function isHtmlValid(html) {
  	var testxml = aa_parsexml('<xml><![CDATA['+html+']]></xml>');
  	if (!testxml) {
  		aa_lmcApi_ServerErrorLog('invalid_dropped_html','Bad encoding in dropped html',html);
  		return false;
  	}
  	return true;
  }
}

function aa_b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
}

function aa_cb_markShownItem(markShownItem,settings) {
	settings = aa_defaults(settings,{});

	if (!markShownItem.itemElem) {
		var elems = markShownItem.itemlist.GetElements(); 
		$(elems).removeClass('cobrowse_other');
		return;
	}

	$(markShownItem.itemElem).css('position','relative');
	var other = $(markShownItem.itemElem).find('>.cb_other_indication')[0];
	aa_remove(other,true);
	$(markShownItem.itemElem)[0].appendChild(markShownItem.el);
	$(markShownItem.itemElem).siblings().removeClass('cobrowse_other');
	if (aa_cb_getSide(markShownItem.context) == 'agent')
		$(markShownItem.itemElem).addClass('cobrowse_other');
}


function aa_lmc_suggestGoto(appContext,context) {
	var itemID = appContext.lmcLastItemShown;
	var uiState = '<state scrollY="'+aa_cb_scrollPosition()+'" itemShown="'+itemID+'"/>';

	var evt = {
		command: 'goto',
		args: {
			uiState: uiState
		}
	};
	appContext.SendCoBrowseEvent(evt);

	var room = aa_var_first(context,'Room');
	var itemName = itemID ? aa_totext(aa_xpath(room,'items/item[#'+itemID+']/@name')) : 'main page';
}


function aa_lmcEditableImageUploadSupport(editableImage) {
	editableImage.doUpload = function(settings) {
		return aa_lmcUploadFile(settings.file);
	};
}

function aa_lmcAgentSuggestRestartAfterTooLong(context) {
	var lastLogFileName = '';
	var appContext = context.vars._AppContext[0];
	if (aa_cb_getSide(context) == 'visitor') return;
	try {
		window.jbStartLoadingTime = window.jbStartLoadingTime || new Date().getTime();
		nextCall();
	} catch(e) {
		ajaxart.logException('aa_lmcAgentSuggestRestartAfterTooLong',e);
	}

	function nextCall() {
		setTimeout(function() {
			var hoursPassed = Math.floor( (new Date().getTime() - jbStartLoadingTime) / 3600000 );
			nextCall();

			if (hoursPassed >= 5) {
//				aa_lmcTrack('show restart dialog','after ' + hoursPassed + ' hours');
				appContext.OpenRestartPopup([],context);
			}

		},3600000);
	}
}

function aa_lmcSetParagraphImage(image) {
  if (!image.data) return aa_setImage(image.el,image.image);

  var hpad = parseInt( image.data.getAttribute('hpadding') || 0 );
  var vpad = parseInt( image.data.getAttribute('vpadding') || 0 );
  var imageBoxHeight = parseInt( image.data.getAttribute('imageBoxHeight') || 0 );
  var bg = image.data.getAttribute('background') || '';

  var inMainMenu= image.params.InMainMenu == 'true';
  var isRTL = image.params.RTL == 'true';

  image.image.adjustSize = {
		fix: function(image2,div,innerDiv,settings) {
			var backgroundWidth = image2.width,backgroundHeight = image2.height;
			if (image2.originalWidth < image2.width) {
				// do not enlarge image
				$(div).height(image2.originalHeight);
				if (inMainMenu) $(innerDiv).css({ margin: 'auto', display: 'block'});
				if (imageBoxHeight && imageBoxHeight < image2.originalHeight) {
					var backgroundWidth = parseInt(imageBoxHeight * image2.originalWidth / image2.originalHeight);
					$(innerDiv).width(backgroundWidth).height(imageBoxHeight);
					$(div).height(imageBoxHeight);
				}

				return;
			}

			if (image2.width / image2.height > image2.originalWidth / image2.originalHeight) {
				backgroundWidth = parseInt(backgroundHeight * image2.originalWidth / image2.originalHeight);
				var marginType = isRTL ? 'margin-right' : 'margin-left';
				$(innerDiv).css(marginType,Math.abs(parseInt((image2.width - backgroundWidth)/2)) + 'px');
			} else {
				backgroundHeight = parseInt(backgroundWidth * image2.originalHeight / image2.originalWidth);
				$(innerDiv).css('margin-top',Math.abs(parseInt((image2.height - backgroundHeight)/2)) + 'px');
			}
			$(innerDiv).width(backgroundWidth).height(backgroundHeight);
		}  	
  };

	aa_bind(image.image,'refresh',function() {  
	  image.image.width -= hpad*2;

	  image.$el.css('padding',vpad + 'px ' + hpad + 'px');
	  image.$el.css('background',bg);
      if (imageBoxHeight) {
        image.image.height = imageBoxHeight;
      }
	});

	aa_trigger(image.image,'refresh');
  
  aa_setImage(image.el,image.image);
  image.$el.css('padding',vpad + 'px ' + hpad + 'px');
  image.$el.css('background',bg);
}

function aa_lmc_instantiateXmlFromTemplate(xml) {
	var xmlAsText = ajaxart.xml2text(xml);
	var replaced = false;

	while(xmlAsText.indexOf('{date:') > -1) {
		var pos = xmlAsText.indexOf('{date:');
		var end = xmlAsText.indexOf('}',pos);
		var format = xmlAsText.substring(pos+6,end);
		var replaceWith = aa_moment(new Date().getTime()).format(format);
		xmlAsText = xmlAsText.replace(xmlAsText.substring(pos,end+1),replaceWith);
		replaced = true;
	}
	return replaced ? aa_parsexml(xmlAsText) : xml;
}

function aa_lmc_render_youtube_video(youtubeVideo) {
	var context = youtubeVideo.context;
	var appContext = context.vars._AppContext[0];
	var events = {};
	if (aa_cb_getSide(context) == 'visitor') {
	 events.onStateChange = function(evt) {
	  if (evt.data == YT.PlayerState.PLAYING) {	
	  	var videoTitle = '';
	  	try { 
	  		videoTitle = evt.target.getVideoData().title;
	  	} catch(e) {}
			var lmcEvent = {
				command: 'youtube_playing',
				args: {
					videoID: youtubeVideo.key,
					videoTitle: videoTitle
				}
			};
			appContext.SendCoBrowseEvent(lmcEvent);
	  }
	 };
	};

  aa_youtube_video(youtubeVideo,{useAPI: true, events: events});
}

function aa_lmc_drawActivityLines(context) {
  var $base = $(context.vars.ControlElement);
  var baseTop =  aa_absTop($base[0]);
  var baseLeft =  aa_absLeft($base[0]);
  var circles = $base.find('.activity_circle');

  var prevColor;
  var lineCircles = [];
                       
  for(var i=0;i<circles.length;i++) {
    var color = circles[i].jbActivityColor;
    if (color == 'transparent') color = null;
  	var isJoin = circles[i].jbLMCEvent.command == 'join' && !circles[i].jbLMCEvent.isRefreshJoin;

  	var colorChanged = prevColor && (prevColor != color);
    if (isJoin || colorChanged) {
    	if (isJoin) lineCircles.push(circles[i]);
    	drawLine(prevColor);
      lineCircles = isJoin ? [] : [circles[i]];
      prevColor = null;
    } else {
    	prevColor = color;
	    if (color) lineCircles.push(circles[i]);
    }
  }
  drawLine(prevColor); // last line

  function drawLine(lineColor) {
  	if (lineCircles.length < 2 || !lineColor) return;

    var topOfLine = lineCircles[0];
    var bottomOfLine = lineCircles[lineCircles.length-1];

    var $line = $('<div class="activity_line"/>');
    $line.css({position: 'absolute', width: '2px',background: lineColor });
    $line.css('top',aa_absTop(topOfLine) - baseTop).css('left', aa_absLeft(topOfLine) - baseLeft+2);
    $line.css('height',aa_absTop(bottomOfLine) - aa_absTop(topOfLine));
               
    $base.append($line);
    for(var j=1;j<lineCircles.length-1;j++) $(lineCircles[j]).hide();
  }
}

function aa_lmc_updateWatchedInThisSession(context,itemID,lastParagraphID) {
	var appContext = context.vars._AppContext[0];
	if (aa_cb_getSide(context) != 'visitor') return;
	var room = aa_var_first(context,'Room');

	appContext.lmcWatchedInSession = appContext.lmcWatchedInSession || {};
	var max_lastParagraphID = lastParagraphID;
	var current_lastParagraphID = appContext.lmcWatchedInSession[itemID];
	if (current_lastParagraphID) {
		var xpath = itemID == '' ?  'items/*/@id' : 'items/item[#'+ItemID+']/*/@id';
		var ids = aa_xpath(room,xpath);
		for(var i=0;i<ids.length;i++) {
			var id = aa_totext([ids[i]]);
			if (id == current_lastParagraphID) break;
			if (id == lastParagraphID) {
				max_lastParagraphID = current_lastParagraphID;
				break;
			}
		}
	}
	appContext.lmcWatchedInSession[itemID] = max_lastParagraphID;
}

function aa_lmc_addWatchedInSessionToEvent(context,eventObject) {
	var appContext = context.vars._AppContext[0];
	if (appContext.lmcWatchedInSession) {
		eventObject.args = eventObject.args || {};
		eventObject.args.watched = appContext.lmcWatchedInSession;
	}
}

function aa_lmc_updateWatchedOfCurrentDisplay(context) {
	return; 
	// TODO: 
	// - vistor desktop and mobile simulator desktop
  // - show it to the agent
	try {
		var itemID = aa_var_first(context,'UIState').getAttribute('itemShown') || '';
		
		var visualCntr = aa_findVisualContainer(null,context); // TODO: find the right visual cntr.
		var el = visualCntr ? visualCntr.el : document.body;
		var visibleAmount = el.offsetHeight + el.scrollTop;

		var lastParagraphID = '';

		var items = $(el).find(itemID == '' ? '.aa_item_items_table1' : '.aa_item_paragraphs_table1');
		for(var i=0;i<items.length;i++) {
			var id = items[i].jbItem[0].getAttribute('id');
			var bottom = aa_relTop(items[i],el) + ( $(items[i]).height() / 2);
			if (bottom <= visibleAmount)
				lastParagraphID = id;
		}
		if (lastParagraphID)
			aa_lmc_updateWatchedInThisSession(context,itemID,lastParagraphID);
	} catch(e) {
		ajaxart.logException('aa_lmc_updateWatchedOfCurrentDisplay',e);
	}
}

function aa_lmc_agent_room_watch_cover(elem,context) {
	return;
	$(elem).hide();
	var room = aa_var_first(context,'Room');
	if (!room |!room.getAttribute('id')) return;
	var appContext = context.vars._AppContext[0];
	if (!appContext.lmcCustomerEvents) return;
	var shown = {};

	for(var i=0;i<appContext.lmcCustomerEvents.length;i++) {
		updateMaxShown(appContext.lmcCustomerEvents.args.watched);
	}

	function updateMaxShown(shown2) {
		if (!shown2) return;
		if (JSON.stringify(shown) == JSON.stringify(shown2)) return;


	}
}

function aa_lmc_initGlobalJSFunctions(context) {
  window.jbLMCGotoItem = function(itemID) {
  	var appContext = context.vars._AppContext[0];
  	var uiState = aa_parsexml('<state/>');
  	uiState.setAttribute('itemShown',itemID);
		aa_trigger(appContext,'cbGotoUIState',{ state: uiState });
  }
}

aa_gcs("lmc",{
	LMCStyleEditorContext: function(profile,data,context) {
    var lmcCssEditor = {
    	xmls: {},
    	getCssXml: function(cssID) {
    		if (!this.xmls[cssID]) {
    			this.xmls[cssID] = ajaxart.runNativeHelper([cssID],profile,'CssXml',context)[0];
    		}
    		return this.xmls[cssID];
    	},
    	cssXmlUpdated: function(cssID) {
    		var xml = this.xmls[cssID];
    		if (!xml) return;
    		var css = ajaxart.runNativeHelper([],profile,'WriteCss',aa_ctx(context,{ CssID: [cssID] , CssXml: [xml] }))[0];
    	}
    }
    return [lmcCssEditor];
	},
	LMCStyleValueByRef: function(profile,data,context) {
		var lmcCssEditor = aa_var_first(context,'LMCStyleEditorContext');
		if (!lmcCssEditor) return [];

		var cssID = aa_text(data,profile,'CssID',context);
		var selector = aa_text(data,profile,'Selector',context);
		var xpath = aa_text(data,profile,'CssXPath',context);

		return [{
			GetValue: function(data1,ctx) {
				if (this.entry) return aa_totext(this.entry);
				var xml = lmcCssEditor.getCssXml(cssID);				
				var selectorXml = aa_xpath(xml,"Css[@selector='"+selector+"']")[0];
				if (!selectorXml)
					selectorXml = aa_xml_appendChild(xml,aa_parsexml('<Css selector="'+selector+'"><Simplifiers/></Css>'));
				
				this.entry = aa_xpath(selectorXml,'Simplifiers/'+xpath,true);
				return aa_totext(this.entry) || aa_text(data,profile,'DefaultValue',context);
			},
			WriteValue: function(data1,ctx) {
				if (!this.entry) this.GetValue(data1,ctx);
				ajaxart.writevalue(this.entry,data1);
				aa_run_delayed_action('lmc_LMCPreviewShowVisitorSize',function() {
					lmcCssEditor.cssXmlUpdated(cssID);
				},100);
			}
		}];
	}
});


function aa_lmc_zoom_paragraph(elem,context,isGrid,hMargin) {
	var lastContainerWidth;
	var inMainMenu = jBart.get("%$InMainMenu%",[],context,'bool');
	if (!isGrid && inMainMenu) return;
	if (isGrid && hMargin) $(elem).css('padding','0 ' + hMargin + 'px');

	aa_addOnAttach(elem,fixZoom);
	aa_addActionOnWindowResize(elem,function() {
  	if (lastContainerWidth == aa_findVisualContainer(elem).width) return;
  	lastContainerWidth = aa_findVisualContainer(elem).width;

  	fixZoom();
  });
   
	function fixZoom() {
	  var width = elem.scrollWidth;

	  var totalWidth = aa_findVisualContainer(elem).width;
	  
	  var padding=0;
	  if (isGrid) {
	  	padding = jBart.get('%$Room/style/general/@marginForGrid%',[],context,'int') || 0;
	  } else {
		  if (inMainMenu)
		  	padding = jBart.get('%$Room/style/general/@marginForImageInMainMenu%',[],context,'int') || 0;
		  else
		  	padding = jBart.get('%$Room/style/general/@marginForImageInItem%',[],context,'int') || 0;
		}
	  totalWidth -= padding;
	  if (width > totalWidth) {
	    var perc = parseInt(totalWidth * 100 / width);
	    perc -= 2;
	    if (perc < 20) perc = 20;
	    $(elem).css('zoom',perc+'\%').css('overflow','hidden');
	    if (isGrid)
	    	$(elem).find("table").css('zoom',perc+'\%');
	  }
	  if (navigator.platform.indexOf("iPhone") != -1) {
	    elem.style.display = 'none';
	    setTimeout(function() {
	      elem.style.display = 'block';
	    },1);        
	  }
	}
}