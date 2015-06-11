ajaxart.load_plugin("", "plugins/popup/popup.xtml");
ajaxart.load_plugin("", "plugins/popup/popup_styles.xtml");

aa_gcs("popup", {
	OpenPopup: function (profile, data, context) {
		var style = aa_first(data,profile,'Style',context);

		aa_init_class_Popup();

		var popup = new ajaxart.classes.Popup({
			title: aa_text(data,profile,'PopupTitle',context),
			data: data, context: context, profile: profile,
			launchingElement: aa_var_first(context,'ControlElement'),
			base_features: ajaxart.runsubprofiles(data,profile,'Feature',context)
		});

		aa_renderStyleObject(style,popup,context,true,{
			jsFunctionName: 'show'
		});
		return [popup];
	},
	CloseContainingPopup: function (profile, data, context) {
		var exitMode = aa_text(data,profile,'ExitMode',context);
		var control = aa_var_first(context,'ControlElement');
		aa_close_containing_popup(control,function() {
			ajaxart.run(data,profile,'DoOnExit',context);
		},exitMode);
	},
	CloseUniquePopup: function (profile, data, context) {
		var uniqueID = aa_text(data,profile,'UniqueID',context);
		var openPopups = aa_open_popups();
		for(var i=0;i<openPopups.length;i++) {
			if (openPopups[i].uniqueID && openPopups[i].uniqueID == uniqueID)
				openPopups[i].close();
		}
	},
	RunAsyncActionAndCloseContainingPopup: function (profile, data, context) {
		var deferred = $.Deferred();
		var control = aa_var_first(context,'ControlElement');
		var top = control && $(control).closest('.aa_popup')[0];
		if (!top || !top.jbPopup || !aa_checkValidations(top.jbPopup.frameElement)) return;

		var promise = aa_first(data,profile,'Action',context);
		$.when(promise).then(function() {
			top.jbPopup.close();
			deferred.resolve();
		},function() {
		});
		return [deferred.promise()];
	},
	RunOnPopup: function (profile, data, context) {
		var openPopups = aa_open_popups();
		if (openPopups.length>0) {
			var popup = openPopups[openPopups.length-1];
			ajaxart.run(data,profile,'Action',aa_ctx(context,{ControlElement: [popup.el]}));
		}
	},
	ZIndex: function (profile, data, context) {
		return [aa_popup_feature_zindex({
			zindex: aa_int(data,profile,'ZIndex',context)
		})];
	},
	UniquePopup: function (profile, data, context) {
		return [aa_popup_feature_UniquePopup({
			uniqueID: aa_text(data,profile,'UniqueID',context)
		})];
	},
	TitleDragAndDrop: function (profile, data, context) {
		return [aa_popup_title_dragAndDrop()];
	},
	CloseOnEnter: function (profile, data, context) {
		return [aa_popup_closeOnEnter()];
	},
	CloseOnBrowserBackButton: function (profile, data, context) {
		return [aa_popup_feature_closeOnBackButton()];
	},
	AutoFocusOnFirstInput: function (profile, data, context) {
		return [aa_popup_feature_autoFocus()];
	},
	StudioPopupFeature: function (profile, data, context) {
		return [{
			init: function(popup) {
				popup.jbStudio = true;
			}
		}];
	}, 
	PopupSize: function (profile, data, context) {
		return [aa_popup_feature_size({ 
			width: aa_text(data,profile,'Width',context),
			height: aa_text(data,profile,'Height',context)
		})];
	},
	FloatingPopup: function (profile, data, context) {
		return [aa_popup_feature_floating_popup({ 
			identifier: aa_text(data,profile,'Identifier',context),
			autoBringToFront: aa_bool(data,profile,'AutoBringToFront',context),
			rememberLocations: aa_bool(data,profile,'RememberPopupLocations',context),
			fieldsToRefresh: aa_text(data,profile,'FieldIdsToRefreshWhenOpenOrClosed',context),
			location: aa_first(data,profile,'Location',context),
			closeCondition: function() {
				return aa_bool(data,profile,'CloseCondition',context)
			}
		})];
	},
	IsFloatingPopupOpen: function (profile, data, context) {
		var popups = aa_open_popups();
		var id = aa_text(data,profile,'Identifier',context);
		if (!id) return [];
		
		for(var i=0;i<popups.length;i++)
			if (popups[i].identifier == id) return ['true'];
	},
	HandleEvent: function (profile, data, context) {
		return [{
			init: function(popup) {
				var eventAction = {
					run: function(data1, ctx) {
						var ctx2 = aa_merge_ctx(context, ctx);
						if (ctx2.vars.EventAction) delete ctx2.vars.EventAction;
						ajaxart.run(data1, profile, 'Action', ctx2);
					}
				};
				ajaxart.run(data, profile, 'Event', aa_ctx(context, {
					EventAction: [eventAction], 
					_Popup: [popup]
				}));
			}
		}];
	},
	CloseFloatingPopup: function (profile, data, context) {
		var id = aa_text(data,profile,'Identifier',context);

		var openPopups = aa_open_popups();
		for(var i=openPopups.length-1;i>=0;i--) {
			if (openPopups[i].identifier == id) 
				openPopups[i].close();
		}
	},
	CheckFloatingPopupsCloseCondition: function (profile, data, context) {
		var openPopups = aa_open_popups();
		for(var i=openPopups.length-1;i>=0;i--) {
			var popup = openPopups[i];
			if (popup.identifier && popup.closeCondition && popup.closeCondition() )
				popup.close();
		}
	},
	RestoreFloatingPopup: function (profile, data, context) {
		var id = aa_text(data,profile,'Identifier',context);
		if (sessionStorage['jbFloatingPopupIsOpen_'+id] != 'true') return;

		var openPopups = aa_open_popups();
		for(var i=openPopups.length-1;i>=0;i--) {
			if (openPopups[i].identifier == id) return; // already open
		}

		ajaxart.run(data,profile,'OpenPopup',context);
	}
});

aa_gcs("popup_event", {
	Close: function(profile, data, context) {
		var popup = context.vars._Popup[0];
		aa_bind(popup,'close',function() {
			context.vars.EventAction[0].run([], context);
		});
	},
	Show: function(profile, data, context) {
		var popup = context.vars._Popup[0];
		aa_bind(popup,'show',function() {
			context.vars.EventAction[0].run([], context);
		});
	}
});

aa_gcs("popup_field_aspect", {
  PopupOnHover: function (profile, data, context) {
      var field = context.vars._Field[0];
      var popupStrategy = aa_first(data,profile,'OpenPopup',context);

      aa_bind(field,'ModifyControl',function(args) {
        var ctx2 = aa_ctx(context,{ControlElement: [args.Wrapper]});

        var popupAdapter = {
          wrapper: args.Wrapper,
          $wrapper: $(args.Wrapper),
          openPopup: function() {
            this.popup = ajaxart.runNativeHelper(args.FieldData,profile,'OpenPopup',ctx2)[0];
          },
          closePopup: function() {
            if (this.popup) {
            	this.popup.close();
            	this.popup = null;
            }
          }
        };
        aa_renderStyleObject(popupStrategy,popupAdapter,ctx2,true,{ funcName: 'attach'});
        aa_apply_style_js(popupAdapter,popupStrategy,ctx2,'attach');
      },'Popup');
  },
	ToolbarPopup: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.PopupToolbarID = aa_text(data,profile,'ToolbarID',context);
		field.ToolBarPopupStyle = aa_first(data,profile,'PopupStyle',context);

		aa_init_class_Popup();

		aa_bind(field,'ModifyControl',function(args) {
			var contentElement = args.Wrapper.firstChild;
			contentElement.onclick = function() {
				if (contentElement.jbPopup && ajaxart.isattached(contentElement.jbPopup.frameElement)) {
					contentElement.jbPopup.close();
				}
				else 
					openPopup(contentElement,args.FieldData);
			};
			contentElement.onmouseover = function() {
				if (hasPopupOfToolbar(contentElement)) {
					openPopup(contentElement,args.FieldData);	
				};
			}
		});

		function openPopup(launchingElement,field_data) {
			var features = ajaxart.runsubprofiles(data,profile,'PopupFeature',context);
			features.push(aa_popup_feature_toolbar_popup({ toolbarID: field.PopupToolbarID }));

			var popup = new ajaxart.classes.Popup({
				title: '',
				data: data, context: context, profile: profile,
				launchingElement: launchingElement,
				base_features: features
			});
			aa_bind(popup,'close',function() {
				$(launchingElement).removeClass('toolbarPopupOpen');
			});
			// close other popups
			var openPopups = aa_open_popups();
			for(var i=openPopups.length-1;i>=0;i--) {
				if (openPopups[i].toolbarID == field.PopupToolbarID) {
					openPopups[i].close();
				}
			}

			launchingElement.jbPopup = popup;
			$(launchingElement).addClass('toolbarPopupOpen');

			aa_renderStyleObject(field.ToolBarPopupStyle,popup,context,true,{
				jsFunctionName: 'show'
			});
		}

		function hasPopupOfToolbar(contentElement) {
			var openPopups = aa_open_popups();
			for(var i=openPopups.length-1;i>=0;i--) {
				if (openPopups[i].toolbarID == field.PopupToolbarID && openPopups[i] != contentElement.jbPopup) {
					return true;
				}
			}
			return false;
		}
	},
	CascadingMenuPopup: function(profile,data,context) {
		var field = context.vars._Field[0];
		field.ToolBarPopupStyle = aa_first(data,profile,'PopupStyle',context);
		field.CascadingMenuPopup = true;
		aa_init_class_Popup();

		aa_bind(field,'ModifyControl',function(args) {
			aa_addOnAttach(args.Wrapper,function() {
				var containingPopup = getContainingPopup(args.Wrapper);
				if (!containingPopup) return;

				var contentElement = args.Wrapper.firstChild;
				contentElement.onmouseover = function() {
					openPopup(containingPopup,contentElement,args.FieldData);	
				};				
			});
		});

		function getContainingPopup(elem) {
			var top = elem && $(elem).closest('.aa_popup')[0];			
			var containingPopup = top && top.jbPopup;
			if (!containingPopup) return;
			if (!containingPopup.innerCascadingPopupInitialized) {
				containingPopup.innerCascadingPopupInitialized = true;

				var elems = $(elem).siblings('.aa_cell_element');
				for(var i=0;i<elems.length;i++) {
					if (elems[i].Field && !elems[i].Field.CascadingMenuPopup) {
						elems[i].onmouseover = function() {
							containingPopup.closeInnerPopups();			
						};
					}
				}

			}
			return containingPopup;
		}
		function openPopup(containingPopup,launchingElement,field_data) {
			containingPopup.closeInnerPopups();

			var features = ajaxart.runsubprofiles(data,profile,'PopupFeature',context);

			var popup = new ajaxart.classes.Popup({
				title: '',
				data: data, context: context, profile: profile,
				launchingElement: launchingElement,
				base_features: features
			});
			aa_bind(popup,'close',function() {
				if (!popup.closedByParent) containingPopup.close();
				$(launchingElement).removeClass('cascadingPopupOpen');
			});

			containingPopup.innerPopups = [popup];
			launchingElement.jbPopup = popup;
			$(launchingElement).addClass('cascadingPopupOpen');

			aa_renderStyleObject(field.ToolBarPopupStyle,popup,context,true,{
				jsFunctionName: 'show'
			});
		}

		function hasPopupOfToolbar(contentElement) {
			var openPopups = aa_open_popups();
			for(var i=openPopups.length-1;i>=0;i--) {
				if (openPopups[i].toolbarID == field.PopupToolbarID && openPopups[i] != contentElement.jbPopup) {
					return true;
				}
			}
			return false;
		}
	}
});

aa_gcs("popup_confirmation",{
	OpenConfirmationPopup: function(profile,data,context) {
		var confirmationPopup = {
			title: aa_text(data,profile,'Title',context),
			question: aa_text(data,profile,'Question',context),
			labelForYes: aa_text(data,profile,'LabelForYes',context),
			labelForNo: aa_text(data,profile,'LabelForNo',context),
			launchingElement: aa_var_first(context,'ControlElement'),
			features: ajaxart.runsubprofiles(data,profile,'Feature',context),
			action: function() {
				return ajaxart.run(data,profile,'Action',context);
			}
		};

		var style = aa_first(data,profile,'Style',context);

		aa_renderStyleObject(style,confirmationPopup,context,true,{
			jsFunctionName: 'show'
		});
	}
});

function aa_init_class_Popup() {	
	if (ajaxart.classes.Popup) return;

	ajaxart.classes.Popup = function(settings) {	
		aa_extend(this,settings);
		this.intest = window.aa_intest;
		this.timeOpened = new Date();
		this.base_features = this.base_features || [];
	};
	
	ajaxart.classes.Popup.prototype.appendContents = function(contentsTop) {
		if (!contentsTop) return;
		var ctx2 = aa_ctx(this.context,{ PopupLaunchingElement: [this.launchingElement]});
		this.field = aa_first(this.data,this.profile,'Contents',ctx2);
		if (this.field)
			aa_fieldControl({ Field: this.field, Item: this.data, Wrapper: contentsTop, Context: ctx2 });
	};

	ajaxart.classes.Popup.prototype.RefreshPreview = function(contentsTop) {
		this.close();
		ajaxart.gcs.popup.OpenPopup(this.profile,this.data,this.context);
	};
}

function aa_createLightPopup(settings) {
	aa_init_class('LightPopup',{
		_ctor: function() {
			this.intest = window.aa_intest;
			this.timeOpened = new Date();
			this.base_features = this.features || [];
			this.$el = $(this.el);
			if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
			this.$el.css('visibility','none');
			if (this.apiObject.elem_class)
				this.$el.addClass(this.apiObject.elem_class+'_popup');
		},
		appendContents: function() {},
		show: function() {
			this.zindex = null;
			aa_popup(this,this.popupSettings);
		}
	});
	return new ajaxart.classes.LightPopup(settings);
}

function aa_popupDefaultSettings(popup,more) {
	return aa_extend({
		frameElement: popup.$el.find('.aa_popup_frame'),
		titleElement: popup.$el.find('.aa_popup_title'),
		contentsElement: popup.$el.find('.aa_popup_contents'),
		closeElement: popup.$el.find('.aa_popup_close'),
		defaultLocation: aa_popupCenterLocation()
	},more);	
}

function aa_popup(popup,settings) {
	settings = aa_popupDefaultSettings(popup,settings || {});
	if (popup.intest) popup.$el.css('display','block');
	popup.frameElement = $(settings.frameElement)[0] || popup.el;
	$(popup.frameElement).addClass('aa_popup').addClass(ajaxart.deviceCssClass);

	if (settings.features) 
		popup.features = [].concat(popup.base_features,settings.features);
	else
		popup.features = popup.base_features;

	popup.contentsEl = $(settings.contentsElement)[0];

	for(var i=0;i<popup.features.length;i++) {
		try {
			popup.features[i].init(popup);
		} catch(e) {
			if (window.ajaxart) ajaxart.logException('error initialing popup feature',e);
		}
	}

	if (popup.PreventOpen && popup.PreventOpen()) return;

	// add it to body
	var popupsTop = $('body').children('.jbart_popups');
	if (!popupsTop.length)
		popupsTop = $('<div class="jbart_popups" />').appendTo( $('body') );

	// notify previous popups (some of them might close themselves)
	var openPopups = popupsTop.children();
	for(i=0;i<openPopups.length;i++) {
		var prevPopup = openPopups[i];
		if (prevPopup.jbPopup != popup)
			aa_trigger(prevPopup.jbPopup,'anotherPopupOpened',{ popup: popup });
	}

	popup.el.jbPopup = popup.frameElement.jbPopup = popup;

	$(settings.titleElement).text(popup.title);
	if (popup.contentsEl)
		popup.appendContents(popup.contentsEl);

	popup.close = function(closeType) {
		popup.preventClose = false;
		var closeArgs = { closeType: closeType};
		aa_trigger(popup,'beforeClose',closeArgs);		
		if (closeArgs.preventClose) return false; // allow beforeClose to prevent the closing of the popup
		
		aa_remove(this.el,!settings.reusablePopup);

		if (popup.launchingElement) {
			popup.launchingElement.jbPopup = null;
			$(popup.launchingElement).removeClass('aa_opened_popup');
		}
		aa_trigger(popup,'close',{ closeType: closeType });

		this.closeInnerPopups();
		return true;
	};
	popup.dispose = function() {		
		aa_remove(this.el,true);
	};

	popup.closeInnerPopups = function() {
		if (this.innerPopups) {
			for(var i=0;i<this.innerPopups.length;i++) {
				this.innerPopups[i].closedByParent = true;
				this.innerPopups[i].close();
				this.innerPopups[i].closedByParent = false;
			}
	  }
	};
	popup.isOpen = function() {
		return ajaxart.isattached(this.el);
	}

	var $close = $(settings.closeElement);
	$close.click(function() {
		popup.close(false);
	});

	doOpen();
	if (popup.reusablePopup) {
		aa_addOnDetach(popup.launchingElement,function() {
			popup.dispose();
		});
	}

	function doOpen() {
		popupsTop[0].appendChild(popup.el);

		if (settings.closeWhenClickingOutside) closeWhenClickingOutside();	
		aa_popup_setMaxZIndex(popup);

		positionPopup();
		markLaunchingElement();
		addValidationChecks();
		aa_element_attached(popup.el);
	}

	function addValidationChecks() {
		aa_bind(popup,'beforeClose',function(args) {
			if (args.closeType == 'OK') {
				var passed = aa_checkValidations(popup.frameElement);
				if (!passed) args.preventClose = true;
			}
		});
	}
	function markLaunchingElement() {
		if (popup.launchingElement) {
			popup.launchingElement.jbPopup = popup;
			$(popup.launchingElement).addClass('aa_opened_popup');
		}		
	}
	function positionPopup() {
		try {
			popup.location = popup.location || settings.defaultLocation || aa_popupCenterLocation();
			popup.location.setPopupLocation(popup);
			aa_trigger(popup,'show');
		} catch(e) {
			ajaxart.logException('error positioning popup',e);
		}	
	}

	function closeWhenClickingOutside() {
		popup.origMousedown = (window.captureEvents) ? window.onmousedown : document.onmousedown;
		var ignoreLaunchingElement = (settings.closeWhenClickingOutside == 'except launching element') && (popup.launchingElement);
		
		function isDescendant(child,parent) {
			if (!child) return false;
			if (child == parent) return true;
			return isDescendant(child.parentNode,parent);  
		}
		function captureClick(e) {
		    var $elem = $( (typeof(event)== 'undefined')? e.target : event.srcElement );

		    if ($elem.parents('html').length === 0 && $elem[0].tagName.toLowerCase() != 'html') return; // detached
		    if (isDescendant($elem[0],popup.el)) return;  // inside the popup
		    ignoreLaunchingElement = ignoreLaunchingElement || popup.ignoreCloseOnLaunchingElementClick;
		    if (ignoreLaunchingElement && isDescendant($elem[0],popup.launchingElement)) return; // from the launching element
				
				var clickedPopup = $elem.closest('.aa_popup')[0];
				if (clickedPopup && isDescendant(clickedPopup.jbPopup.launchingElement,popup.el)) return;  // clicked from an inner popup opened by us

				if (popup.innerPopups) {
					for(var i=0;i<popup.innerPopups.length;i++) {
						if ( isDescendant($elem[0],popup.innerPopups[0].frameElement) )
							return;
					}
			  }

		    popup.close('cancel');
	    }		
		
		aa_bindBodyMouseDown(captureClick);
		
		aa_bind(popup,'close',function() {
			aa_unbindBodyMouseDown(captureClick);
		},'clicking outside');
	}
}

function aa_open_popups() {
	var out = [];
	var openPopups = $('body').children('.jbart_popups').children();
	for(var i=0;i<openPopups.length;i++) {
		out.push(openPopups[i].jbPopup);
	}
	return out;
}

function aa_bindBodyMouseDown(callback) {
	var obj = window.captureEvents ? window : document;
	if (obj.addEventListener) 
		obj.addEventListener('mousedown',callback,true);
	else 
		obj.attachEvent('onmousedown',callback,true);
}
function aa_unbindBodyMouseDown(callback) {
	var obj = window.captureEvents ? window : document;
	if (obj.removeEventListener) 
		obj.removeEventListener('mousedown',callback,true);
	else 
		obj.detachEvent('onmousedown',callback);
}

function aa_popup_setMaxZIndex(popup) {
	var max = 20;

	if (!popup.zindex) {
		if (popup.launchingElement && $(popup.launchingElement).closest('.jbstudio_dlg').length > 0 || popup.jbStudio) {
			max = 2000;
			// we should also be jbstudio_dlg
			var otherStudioPopups = $('.jbstudio_dlg');
			for(var i=0;i<otherStudioPopups.length;i++) {
				if (otherStudioPopups[i].jbPopup == popup) continue;
				var zindex = parseInt($(otherStudioPopups[i])[0].style.zIndex || '0') || 0;
				if (!isInnerOldPopup(otherStudioPopups[i]))
					max = Math.max(max,zindex+2);
			}
			$(popup.el).addClass('jbstudio_dlg');
		} else {
			var openPopups = aa_open_popups();
			for(var i=0;i<openPopups.length;i++) {
				if (openPopups[i] != popup && !openPopups[i].jbStudio)
					max = Math.max(max,openPopups[i].zindex+2);
			}
			if (ajaxart.jbart_studio) {
				// make it the heightest z-index if ctrl+click
				$(popup.frameElement).click(function (e) {
					if (e.ctrlKey) {
						popup.jbStudio = true;
						popup.zindex = null;
						aa_popup_setMaxZIndex(popup);
					}
				});
			}
		}

		popup.zindex = max+1;
	} else {
		max = popup.zindex-1;
	}
	popup.$el.css('z-index',max);
	popup.$el.children().css('z-index',max);
	$(popup.frameElement).css('z-index',max+1);	

	function isInnerOldPopup(otherElem) {
		if (otherElem.Dialog && otherElem.Dialog.Mode == 'popup' && otherElem.Dialog.onElem && aa_isParent(otherElem.Dialog.onElem,popup.frameElement))

			return true;

		return false;
	}
}

function aa_new_popup_feature(settings,className,prototypeFunctions) {
	aa_init_class(className,prototypeFunctions);
	return new ajaxart.classes[className](settings || {});
}
function aa_popup_title_dragAndDrop() {
	return aa_new_popup_feature({},'PopupFeatureTitleDragNDrop',{
		init: function(popup) {
			var draggable_area = popup.$el.find('.aa_popup_title')[0];
			var draggable_frame = popup.frameElement;
			aa_enable_move_by_dragging(draggable_frame,draggable_area,this.onstartdrag,function() {
				aa_trigger(popup,'endDrag');
			});
		},
		onstartdrag: function() {},
		onenddrag: function() {}
	});
}

function aa_popup_feature_autoFocus() {
	return aa_new_popup_feature({},'PopupFeatureAutoFocus',{
		init: function(popup) {
			aa_bind(popup,'show',function() {
				setTimeout(function() {					
					var inp = $(popup.frameElement).find('input');
					if (!inp[0]) inp = $(popup.frameElement).find('textarea');
					if (inp[0]) inp[0].focus();
				},1);
			});
		}
	});
}

function aa_popup_feature_zindex(settings) {
	return aa_new_popup_feature(settings,'PopupFeatureZIndex',{
		init: function(popup) {
			popup.zindex = this.zindex
		}
	});
}
function aa_popup_feature_UniquePopup(settings) {
	return aa_new_popup_feature(settings,'UniquePopup',{
		init: function(popup) {
			popup.uniqueID = this.uniqueID;
			aa_bind(popup,'anotherPopupOpened',function(args) {
				var otherpopup = args.popup;
				if (otherpopup.uniqueID && otherpopup.uniqueID == popup.uniqueID) {
					popup.close();
				}
			});			
		}
	});
}
function aa_popup_feature_size(settings) {	
	return aa_new_popup_feature(settings,'PopupFeatureSize',{
		init: function(popup) {
			if (this.width) $(popup.contentsEl).width(this.width).css('overflow-x','auto');
			if (this.height) $(popup.contentsEl).height(this.height).css('overflow-y','auto');
		}
	});
}
function aa_popup_feature_floating_popup(settings) {
	return aa_new_popup_feature(settings,'PopupFeatureFloatingPopup',{
		init: function(popup) {
			var feature = this;
			popup.floatingPopup = true;
			popup.identifier = this.identifier;
			popup.closeCondition = this.closeCondition;
			// close others with the same identifier
			aa_bind(popup,'anotherPopupOpened',function(args) {
				var otherpopup = args.popup;
				if (otherpopup.floatingPopup && otherpopup.identifier == popup.identifier)
					popup.close();
			});

			aa_bind(popup,'show',refreshFields);
			aa_bind(popup,'close',refreshFields);

			if (feature.autoBringToFront) {
				$(popup.frameElement).mousedown(function() {
					var startZindex = popup.zindex;
					popup.zindex = null;
					aa_popup_setMaxZIndex(popup);
					if (popup.zindex < startZindex) {
						popup.zindex = startZindex;
						popup.$el.css('z-index',startZindex);
						$(popup.frameElement).css('z-index',startZindex+1);
					}
					$('.jbFloatingPopupActive').removeClass('jbFloatingPopupActive');
					$(popup.frameElement).addClass('jbFloatingPopupActive');
				});
			}

			if (feature.rememberLocations) {
				aa_bind(popup,'show',function() {
					sessionStorage['jbFloatingPopupIsOpen_'+popup.identifier] = 'true';
					if (feature.autoBringToFront) {
						$('.jbFloatingPopupActive').removeClass('jbFloatingPopupActive');
						$(popup.frameElement).addClass('jbFloatingPopupActive');
					}
				});

				aa_bind(popup,'endDrag',function() {
					var left = $(popup.frameElement).css('left').split('px')[0];
					var top = $(popup.frameElement).css('top').split('px')[0];

					sessionStorage['jbFloatingPopupLeft_'+popup.identifier] = left;
					sessionStorage['jbFloatingPopupTop_'+popup.identifier] = top;
				});

				aa_bind(popup,'beforeClose',function() {
					sessionStorage['jbFloatingPopupIsOpen_'+popup.identifier] = 'false';
				});
			}
			if (this.location) popup.location = this.location;
			popup.previousLocation = popup.location;
			popup.location = {
				setPopupLocation: function(popup) {
					var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
					var screenHeight = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);
					var usePrevLocation;

					var top = 20,left=0;
					if (feature.rememberLocations && sessionStorage['jbFloatingPopupLeft_'+popup.identifier]) {
						left = sessionStorage['jbFloatingPopupLeft_'+popup.identifier];
						top = sessionStorage['jbFloatingPopupTop_'+popup.identifier];
						left = Math.min(Math.max(0,left),screenWidth-50);
						top = Math.min(Math.max(0,top),screenHeight-50);
					} else {
						if (popup.previousLocation) {
						 popup.previousLocation.setPopupLocation(popup);
						 usePrevLocation = true;
						} else {
							// auto location
							$(popup.frameElement).css('display','inline-block'); // so that width() will work

							var popupWidth = $(popup.frameElement).outerWidth();
							left = screenWidth - popupWidth - 30;

							var openPopups = aa_open_popups();
							for(var i=0;i<openPopups.length;i++) {
								if (openPopups[i].floatingPopup) {
									top += 30;
									left -= 30;
								}
							}							
						}
					}
					var maxWidth = $(popup.frameElement).css('max-width');
					if (!maxWidth || maxWidth == 'none')
						$(popup.frameElement).css('max-width',parseInt(screenWidth * 0.9)+'px');
					
					var $popupContents = $(popup.frameElement).find('.aa_popup_contents');
					var maxHeight = $popupContents.css('max-height');
					if (!maxHeight || maxHeight == 'none')
						$popupContents.css('max-height',parseInt(screenHeight * 0.9)+'px');
					
					if (!usePrevLocation)
						$(popup.frameElement).css('position','fixed').css('left',left+'px').css('top',top+'px');						
				}
			};

			aa_bind(popup,'beforeResizer',function() {
				if (window.sessionStorage && sessionStorage['jbUniquePopupWidth_'+popup.identifier]) {
					$(popup.contentsEl).width(sessionStorage['jbUniquePopupWidth_'+popup.identifier]);
					$(popup.contentsEl).height(sessionStorage['jbUniquePopupHeight_'+popup.identifier]);				
				}
			});

			aa_bind(popup,'resize',function(args) {
				if (window.sessionStorage) {
					sessionStorage['jbUniquePopupWidth_'+popup.identifier] = args.width + 'px';
					sessionStorage['jbUniquePopupHeight_'+popup.identifier] = args.height + 'px';
				}
			});

			function refreshFields() {
				var fields = aa_split(feature.fieldsToRefresh,',',true);
				aa_refresh_field(fields,'screen',false,null,popup.context);
			}
		}
	});
}
function aa_popup_feature_toolbar_popup(settings) {
	return aa_new_popup_feature(settings,'PopupFeatureToolbar',{
		init: function(popup) {
			popup.toolbarID = this.toolbarID;
		}
	});
}
function aa_closePopupsInTest() {
	var openPopups = aa_open_popups();
	for(var i=openPopups.length-1;i>=0;i--) {
		if (openPopups[i].intest) {
			aa_remove(openPopups[i].el,true);
		}
	}
}

function aa_popupElementForTests() {
	var openPopups = aa_open_popups();
	for(var i=openPopups.length-1;i>=0;i--) {
		if (openPopups[i].intest) {
			return [openPopups[i].el];
		}
	}
	return null;
}
function aa_popupsForPreview() {
	var out = [];
	var openPopups = aa_open_popups();
	for(var i=openPopups.length-1;i>=0;i--) {
		if (openPopups[i].RefreshPreview) {
			out.push(openPopups[i]);
		}
	}
	return out;
}

function aa_popup_closeOnEnter() {
	return aa_new_popup_feature({},'PopupFeatureCloseOnEnter',{
		init: function(popup) {
			$(popup.frameElement).attr('tabindex','0').keydown(function(e) {
				if(e.keyCode == 13) popup.close();
			});
		}
	});
}
function aa_popup_feature_closeOnBackButton() {
	return aa_new_popup_feature({},'PopupFeatureCloseOnBackButton',{
		init: function(popup) {
			aa_bind(popup,'show',function() {
				jBart.popupToClose = popup;
				aa_setUrlHashValue('openDialog','true');
			});
			aa_bind(popup,'close',function() {
				jBart.popupToClose = null;
				aa_setUrlHashValue('openDialog','');
			});

			if (!jBart.hashValueChangedClosePopup) {
				jBart.hashValueChangedClosePopup = function() {
					if (aa_urlHashValue('openDialog') != 'true' && jBart.popupToClose) {
						jBart.popupToClose.close();
					}
				};
				$(window).bind('hashchange',jBart.hashValueChangedClosePopup);
			}
		}
	});
}
function aa_popup_feature_closeOnEsc(settings) {
	return aa_new_popup_feature(settings,'PopupFeatureCloseOnEsc',{
		init: function(popup) {
			$(popup.frameElement).attr('tabindex','0').keydown(function(e) {
				if(e.keyCode == 27) popup.close();
			});
		}
	});
}

function aa_popup_feature_hoverPopup(settings) {
	return aa_new_popup_feature(settings,'PopupFeatureHoverPopup',{
		init: function(popup) {
			var isInside,hasFocus;
			popup.isHoverPopup = true;

			aa_bind(popup,'anotherPopupOpened',function(otherPopup) {
				if (otherPopup.isHoverPopup) popup.close();
			});

			$(popup.launchingElement).mouseout(mouseOut);
			$(popup.frameElement).mouseout(mouseOut);
			$(popup.launchingElement).mouseover(mouseOver);
			$(popup.frameElement).mouseover(mouseOver);
			$(popup.frameElement).focus(function() {
				hasFocus = true;
			});
			$(popup.frameElement).blur(function() {
				hasFocus = false;
			});

			function mouseOut() {
				isInside = false;
				if (!hasFocus) startClosingPopup();				
			}
			function mouseOver() {
				isInside = true;
			}
			function startClosingPopup() {
				setTimeout(function() { 
					if (ajaxart.isattached(popup.frameElement) && !isInside) { popup.close(); }
				},200);
			}
		}
	});
}


function aa_isStudioRefreshAndPopupIsOpen(type,apiObject) {
	if (ajaxart.inStudioRefresh) {
		var field = apiObject && (apiObject.Field || apiObject.field);
		var openPopups = aa_open_popups();
		for(var i=openPopups.length-1;i>=0;i--) {
			var popup = openPopups[i];
			var popupField = popup.apiObject && (popup.apiObject.Field || popup.apiObject.field);
			if (popup.type == type && popupField && field && field.Id == popupField.Id) {
				popup.close();
				return true;			
			}
		}
	}
	return false;
}

function aa_close_containing_popup(elem,doOnExitCallback,exitMode) {
	exitMode = exitMode || null;
	doOnExitCallback = doOnExitCallback || function() {};

	var top = elem && $(elem).closest('.aa_popup')[0];
	if (top && top.jbPopup) {
		var closeReturn = top.jbPopup.close(exitMode);
		if (closeReturn) { // closed properly without failing validations
			doOnExitCallback();			
		}
	}
}

function aa_confirmation_popup(confirmationPopup,settings) {
	settings = aa_defaults(settings,{
		yesButtonElement: confirmationPopup.$el.firstOfClass('aa_popup_yes'),
		noButtonElement: confirmationPopup.$el.firstOfClass('aa_popup_no'),
		questionElement: confirmationPopup.$el.firstOfClass('aa_popup_question'),
		location: aa_popupCenterLocation(),
		features: []
	});

	$(settings.questionElement).text(confirmationPopup.question);
	$(settings.yesButtonElement).text(confirmationPopup.labelForYes);
	$(settings.noButtonElement).text(confirmationPopup.labelForNo);

	var features = (confirmationPopup.features || []).concat(settings.features);

	var popup = aa_createLightPopup({
		el: confirmationPopup.el,
		launchingElement: confirmationPopup.launchingElement,
		location: settings.location,
		apiObject: confirmationPopup,
		type: 'confirmation',
		features: features,
		title: confirmationPopup.title,
		popupSettings: {
			closeWhenClickingOutside: settings.closeWhenClickingOutside
		}
	});

	$(settings.yesButtonElement).click(function() {
		popup.close();
		confirmationPopup.action();
	});

	$(settings.noButtonElement).click(function() {
		popup.close();
	});

	popup.show();
}

function aa_hasPositionFixedParent(elem) {
	for(var iter=elem;iter && iter.nodeType ==1;iter=iter.parentNode) {
		if ($(iter).css('position') == 'fixed') return true;
	}
	return false;
}

function aa_windowHeight() {
	var height = $(window).height();
	if (jBart.footerHeight) height -= jBart.footerHeight;
	return height;
}

function aa_popup_strategy_onhover(popupAdapterObject,settings) {
	settings = aa_defaults(settings,{ delay: 1000 });
	var isInside,timerID = false;

	popupAdapterObject.$wrapper.mouseover(function() {
		if (isInside || !ajaxart.isattached(popupAdapterObject.$wrapper[0])) return;
		if (timerID) clearTimeout(timerID);
		timerID = setTimeout(function() {
			if (isInside && ajaxart.isattached(popupAdapterObject.$wrapper[0])) popupAdapterObject.openPopup();
			timerID = null;
		},settings.delay);
		isInside = true;
	});
	popupAdapterObject.$wrapper.mouseout(function() { 
		isInside = false;
	});
	if (settings.alsoOpenOnClick) {
		popupAdapterObject.$wrapper.click(function() {
			if (timerID) { clearTimeout(timerID); timerID=null; }
			popupAdapterObject.openPopup();
		});
	}

	aa_addOnDetach(popupAdapterObject.$wrapper[0],function() {
		popupAdapterObject.closePopup();
	});
}

aa_gcs("popup_feature",{
	RunOnClose: function(profile,data,context) {
		var closeTypeFilter = aa_text(data,profile,'CloseType',context);
		return [{
			init: function(popup) {
				aa_bind(popup,'close',function(closeType) {
					if (closeTypeFilter && closeType != closeTypeFilter) return;
					ajaxart.run(data,profile,'Action',context);
				});				
			}			
		}];
	}
});

//******************* popup resizer ************************/

aa_gcs("popup_feature",{
	Variable: function(profile,data,context) {
		return [{
			init: function(popup) {
				popup.context.vars[aa_text(data,profile,'VarName',context)] = aa_run(data,profile,'Value',context);
			}
		}];
	},
	PopupData: function(profile,data,context) {
		return [{
			init: function(popup) {
				popup.data = aa_run(data,profile,'Value',context);
			}
		}];
	},
	Resizer: function(profile,data,context) {
		return [{
			init: function(popup) {
				var style = aa_first(data,profile,'Style',context);
				var resizerObj = {
					popup: popup
				};
				aa_renderStyleObject2(style,resizerObj,data,null,context,{ funcName: 'add' });
			}
		}];
	}
});

function aa_popup_resizer(resizerObj,settings) {
	var popup = resizerObj.popup;
	aa_bind(popup,'show',function() {		
		var resizeCover = $('<div id="aa_resize_cover" style="height:100%; width: 100%; background:pink;z-index:10000; opacity:0; filter: alpha(opacity=0);position:fixed;top:0;left:0;top:0;bottom:0"/>');
		var contentsEl = popup.contentsEl;
		contentsEl.parentNode.appendChild(resizerObj.el);
		var props = null;
		if (resizerObj.minWidth) $(contentsEl).css('min-width',resizerObj.minWidth+'px');
		if (resizerObj.minHeight) $(contentsEl).css('min-height',resizerObj.minHeight+'px');

		aa_trigger(popup,'beforeResizer');

		resizerObj.$el.css('z-index',popup.zIndex+1);

		resizerObj.$el.mousedown(function(e) {
			if (! props) {
				var width = $(contentsEl).width();
				var height = $(contentsEl).height();
				props = { mouse_x: (e.clientX || e.pageX), mouse_y: (e.clientY || e.pageY), width: width, height: height };
				jBart.disableSelections();

				$('body').append(resizeCover);
			}
			var mouse_move = function(e) {
				  e = e || event;
				  var mouse_x = (e.clientX || e.pageX), mouse_y = (e.clientY || e.pageY);
				  var newWidth = props.width + (mouse_x - props.mouse_x);
				  var newHeight = props.height + (mouse_y - props.mouse_y);
				  $(contentsEl).width(newWidth).height(newHeight);				  
				  aa_trigger(popup,'resize',{ width: newWidth, height: newHeight });
		  };
			var mouse_up = function(e) {
				  e = e || event;
				  props = null;
				  window.onmousemove = null; window.onmouseup =null;  document.onmouseup=null; document.onmousemove=null; 
					jBart.restoreSelections();
					$('#aa_resize_cover').remove();
			  }
			  if (window.captureEvents){ window.onmousemove = mouse_move;window.onmouseup = mouse_up; }
			  else { document.onmouseup=mouse_up; document.onmousemove=mouse_move; }
	    });
	},'resizer');	
}

/******************************** features *******************************************************/

aa_gcs("popup_feature",{
	TogglePopup: function(profile,data,context) {
		var identifier =  aa_text(data,profile,'PopupIdentifier',context);

		return [{
			init: function(popup) {
				popup.identifier = identifier;
				popup.ignoreCloseOnLaunchingElementClick = true;
				popup.PreventOpen = function() {
					var openPopups = aa_open_popups();
					for(var i=openPopups.length-1;i>=0;i--) {
						if (openPopups[i].identifier == identifier) {
							openPopups[i].close();
							return true;
						}
					}
				};
			}
		}];
	}
});


function aa_popup_feature_closeButton(settings) {
	return aa_new_popup_feature(settings,'PopupFeatureCloseButton',{
		init: function(popup) {
			var $btn = $(popup.frameElement).find('.aa_popup_close_button');
			$btn.text(settings.text);
			$(popup.frameElement).find('.aa_popup_close').click(function() {
				popup.close();
			});
		}		
	});	
}

function aa_popup_feature_autoClose(settings) {
	return aa_new_popup_feature(settings,'AutoClose',{
		init: function(popup) {
			if (window.jbDoNotAutoClosePopups) return; // for debugging
			setTimeout(function(){
				$(popup.frameElement).fadeOut("slow",function() {
					popup.close();	
				});				
			},this.closeTimeout || 1000);
		}		
	});	
}


/************************ locations *************************/

aa_gcs("popup",{
	PopupLocation: function (profile, data, context) {
		return [{
			init: function(popup) {
				popup.location = aa_first(data,profile,'Location',context);
			}
		}];
	},
	ScreenCenter: function (profile, data, context) {
		return [aa_popupCenterLocation()];
	},
	ScreenTopRight: function (profile, data, context) {
		return [aa_popupScreenTopRightLocation({
			marginTop: aa_int(data,profile,'MarginTop',context),
			marginRight: aa_int(data,profile,'MarginRight',context)
		})];
	},
	NearLauncher: function (profile, data, context) {
		return [aa_popupNearLauncherLocation({
			minWidthOfLaunchingElement: aa_bool(data,profile,'MinWidthAsLaunchingElement',context),
			location: aa_text(data,profile,'Location',context)
		})];
	}	
});


function aa_popupCenterLocation(settings) {
	jBart.footerHeight = jBart.footerHeight || 0;
	return aa_new_popup_feature(settings,'PopupCenterLocation',{
		setPopupLocation: function(popup) {
			var hasHeaderHeight = jBart.headerHeight && !popup.$el.hasClass('jbstudio_dlg');
			var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
			var screenHeight = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);
			if (hasHeaderHeight) screenHeight -= (jBart.headerHeight+jBart.footerHeight);

			$(popup.frameElement).css('display','inline-block'); // so that width() will work
			
			var popupWidth = $(popup.frameElement).outerWidth();
			var popupHeight = $(popup.frameElement).outerHeight();

			$(popup.frameElement).css('max-width',parseInt(screenWidth * 0.9)+'px');

			if (popupWidth > screenWidth) {
				// can be relevant in mobile scenarios
				popupWidth = parseInt(screenWidth * 0.85);
				$(popup.frameElement).css('max-width',popupWidth+'px');
			}
			var $popupContents = $(popup.frameElement).find('.aa_popup_contents');
			// var maxHeight = $popupContents.css('max-height');
			// if (!maxHeight || maxHeight == 'none')
			// 	$popupContents.css('max-height',parseInt(screenHeight * 0.8)+'px');

			var left = parseInt( (screenWidth - popupWidth)/2 );
			var top = parseInt( (screenHeight - popupHeight)/2 );
			if (top<0) top = 0;
			if (left<0) left = 0;
			if (hasHeaderHeight) top += jBart.headerHeight;

			$(popup.frameElement).css('position','fixed').css('left',left+'px').css('top',top+'px');
		}
	});
}

function aa_popupScreenTopRightLocation(settings) {
	return aa_new_popup_feature(settings,'PopupScreenTopRightLocation',{
		setPopupLocation: function(popup) {
			var hasHeaderHeight = jBart.headerHeight && !popup.$el.hasClass('jbstudio_dlg');
			var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);

			$(popup.frameElement).css('display','inline-block'); // so that width() will work
			
			var popupWidth = $(popup.frameElement).outerWidth();

			var left = screenWidth - popupWidth - this.marginRight;
			var top = this.marginTop;
			if (hasHeaderHeight) top += jBart.headerHeight;

			$(popup.frameElement).css('position','fixed').css('left',left+'px').css('top',top+'px');
		}
	});
}

function aa_popupStackingNotificationLocation(settings) {
	settings = aa_defaults(settings,{
		marginBottom: 0,
		marginLeft: 0,
		marginTop: 0
	});
	return aa_new_popup_feature(settings,'StackingNotificationLocation',{
		setPopupLocation: function(popup) {
			popup.isStackingNotificationLocation = true;
			this.marginBottom = this.marginBottom || 0;
			this.marginRight = this.marginRight || 0;

			$(popup.frameElement).css('display','inline-block'); // so that width() will work
			
			var popupHeight = $(popup.frameElement).outerHeight();

			var bottom = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);

			var openPopups = aa_open_popups();
			for(var i=0;i<openPopups.length;i++) {
				if (openPopups[i].isStackingNotificationLocation && openPopups[i] != popup)
					$(openPopups[i].frameElement).animate({top: '-='+ (popupHeight+this.marginBottom) },'slow');
			}

			var right = this.marginRight;
			var top = bottom - popupHeight - this.marginBottom;
			popup.stackingTop = top;

			$(popup.frameElement).css('position','fixed').css('right',right+'px').css('top',top+popupHeight+'px');
			$(popup.frameElement).animate({top: '-='+ popupHeight },'slow');
		}
	});
}

function aa_popupNearLauncherLocation(settings) {
	settings = aa_defaults(settings,{ 
		location: 'bottom',
		marginFromWindowTop: 10,
		marginFromWindowBottom: 10,
		marginFromWindowRight: 10,
		marginFromWindowLeft: 10
	});

	return aa_new_popup_feature(settings,'PopupNearLauncherLocation',{
		setPopupLocation: function(popup) {
			var feature = this;
			//  See Sample: http://localhost/ajaxart/gstudio.html?widget=features/PopupLauncherLocations
			var position = 'absolute';
			if (aa_hasPositionFixedParent(popup.launchingElement)) position = 'fixed';

			$(popup.frameElement).css('position',position);
			if (!popup.launchingElement) return;

			var top = aa_absTop(popup.launchingElement);
			var left = aa_absLeft(popup.launchingElement);
			var width = $(popup.launchingElement).outerWidth();
			var height = $(popup.frameElement).outerHeight();
			var popupTop = top + $(popup.launchingElement).outerHeight();
			var popupLeft = left;
			var windowHeight = aa_windowHeight();
			var windowWidth = $(window).width();
			var windowTop = (position == 'fixed' ? 0 : window.pageYOffset);
			var windowLeft = (position == 'fixed' ? 0 : window.pageXOffset);
			// if (ajaxart.jbart_studio) {
			// 	var studio_header_pos = $(".fld_gstudio_widget_wrapper").children().position();
			// 	windowTop += studio_header_pos.top;
			// 	windowHeight -= studio_header_pos.top;
			// 	windowLeft += studio_header_pos.left
			// 	windowWidth -= studio_header_pos.left;
			// }

			// Vertical Positioning
			if (popupTop+height-windowTop + this.marginFromWindowBottom > windowHeight) // going up instead of down (no room enough down)
				popupTop = top - height;

			if (popupTop < windowTop + this.marginFromWindowTop)
				popupTop = top - $(popup.launchingElement).outerHeight()/2 -height/2; // try centering it

			if (popupTop+height+this.marginFromWindowBottom > windowHeight + windowTop ||	// overflowing to bottom
					 popupTop < windowTop + this.marginFromWindowTop)						// overflowing to top
				popupTop = windowTop + this.marginFromWindowTop;	// Overflowing to top or to bottom, try adjusting it to top

			if (popupTop+height+this.marginFromWindowBottom > windowHeight + windowTop)	// too high: make the popup shorter
				$(popup.frameElement).css("max-height",windowHeight - this.marginFromWindowTop - this.marginFromWindowBottom).css("overflow-y","auto");

			if (this.minWidthOfLaunchingElement)
				$(popup.frameElement).css('min-width',width+'px');

			// Horizontal Positioning
			var popupWidth = $(popup.frameElement).outerWidth();
			if (popupLeft + popupWidth + this.marginFromWindowRight > windowLeft + windowWidth)	// try going left instead of right
				popupLeft -= popupWidth - $(popup.launchingElement).outerWidth();
			if (popupLeft < windowLeft + this.marginFromWindowRight)	// too left, align to window left
				popupLeft = windowLeft + this.marginFromWindowRight;
			if (popupLeft + popupWidth + this.marginFromWindowRight > windowLeft + windowWidth)	// too wide, make the popup narrower
				$(popup.frameElement).css("max-width",windowWidth - this.marginFromWindowRight - this.marginFromWindowLeft).css("overflow-x","auto");

			if (feature.location == 'right') {	// TODO: handle going too right or too low
				popupTop = top;
				popupLeft = left + width + 2;				
			}
			if (feature.location == 'above center') {	
				popupTop = top - height;
				popupLeft = parseInt(left + (width/2) - (popupWidth/2));
				if (settings.topMargin) popupTop -= settings.topMargin;
			}

			$(popup.frameElement).css('top',popupTop+'px').css('left',popupLeft+'px').css("box-sizing","border-box");

		}
	});
};


/******************************  async popup ***************************************/

aa_gcs("popup_async", {
	OpenPopupAsync: function (profile, data, context) {
		var deferred = $.Deferred();

		var style = aa_first(data,profile,'Style',context);

		aa_init_class_Popup();
		var base_features = ajaxart.runsubprofiles(data,profile,'Feature',context);
		base_features.push(aa_popup_feature_asyncPopupResult({
			deferred: deferred
		}));

		var popup = new ajaxart.classes.Popup({
			title: aa_text(data,profile,'PopupTitle',context),
			data: data, context: context, profile: profile,
			launchingElement: aa_var_first(context,'ControlElement'),
			base_features: base_features
		});

		aa_renderStyleObject(style,popup,context,true,{	jsFunctionName: 'show' });

		return [deferred.promise()];
	}
});

function aa_popup_feature_asyncPopupResult(settings) {
	return aa_new_popup_feature(settings,'PopupFeatureAsyncPopupResult',{
		init: function(popup) {
			var feature = this;
			aa_bind(popup,'close',function(args) {
				if (args.closeType == 'OK')
					feature.deferred.resolve();
				else
					feature.deferred.reject();
			});				
		}
	});
}
