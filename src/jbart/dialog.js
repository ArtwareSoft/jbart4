ajaxart.load_plugin("jbart","plugins/jbart/dialog.xtml");

aa_noOfOpenDialogs = 0;
aa_dialogCounter = 0;
openDialogs = [];
aa_openDialogs = [];

aa_gcs("dlg", {
  OpenDialog: function (profile,data,context) 
  {
	var dlg = { isObject: true }
	dlg.Title = aa_multilang_text(data,profile,'Title',context);
	dlg.Data = ajaxart.run(data,profile,'DialogData',context);
	dlg.Contents = aa_first(dlg.Data,profile,'Contents',context);
	dlg.noOfOpenDialogs = window.aa_noOfOpenDialogs;
	dlg.Style = aa_first(data,profile,'Style',context);
	dlg.Mode = dlg.Style.Mode;
	dlg.Context = context;
	
	dlg.onElem = aa_first(data,profile,'LauncherElement',context);
	dlg.JBStudio = (dlg.onElem && jQuery(dlg.onElem).parents('.jbstudio_dlg').length > 0);
	
	function init(dlg) {
	    dlg.createFrame = function() {
	    	if (!dlg.ShowFocusUnderline) {
	    		dlg.Style.Css += ' #this *:focus { outline:none; }';
	    	}
	    	this.StyleClass = aa_attach_global_css(this.Style.Css);
	    	var jElem = jQuery(this.Style.Html);
	    	jElem.addClass(this.StyleClass);
	    	jElem.addClass(ajaxart.deviceCssClass || '');
	    	if (dlg.JBStudio) jElem.addClass('jbstudio_dlg');
	    	
	    	var dialogObject = aa_api_object(jElem);
	    	aa_apply_style_js(dialogObject,this.Style);
	    	return jElem[0];
	    }
		
		dlg.ContentsPlaceholder = function() {
			var out = this.Frame;
			if (jQuery(out).hasClass('aa_dialogcontents')) return out;
			return jQuery(out).find('.aa_dialogcontents')[0];
		}
		dlg.RunOnOK = function() { ajaxart.run(this.Data,profile,'RunOnOK',context); }
		
		dlg.OK = function(data1,ctx) {
			if (!dlg.Frame) return;
			var contents = dlg.ContentsPlaceholder();
			if (! aa_passing_validations(contents) ) return;
			aad_runMethodAsync(this,this.RunBeforeOK,this.Data,dlg.Context,function() {		// allow asyc call before ok (e.g. trying to save on the server)
				if ( jQuery(contents).find('.aa_noclose_message').length > 0 ) return;
				dlg.Close(data1,ctx);
				var ctx2 = aa_ctx(context,{ DialogOriginalData: dlg.Data });
				if (dlg.onElem) ctx2.ControlElement = [dlg.onElem];
				ajaxart.run(dlg.Data,profile,'RunOnOK',ctx2);
			});
		}
		dlg.Apply = function(data1,ctx) {
			var ctx2 = aa_ctx(context,{ DialogOriginalData: dlg.Data});
			ajaxart.run(this.Data,profile,'RunOnOK',ctx2);
		}
		dlg.Cancel = function(data1,ctx) {
//			if (dlg.NoCancel) return this.OK(data1,ctx);
			this.Close(data1,ctx);
			if (this.RunOnCancel) this.RunOnCancel(data,context);
			jBart.trigger(dlg,'cancel');
		}
		dlg.Open = function(data1,ctx) {
			var dlg = this;

			aa_invoke_dialog_handlers(dlg.BeforeOpenFunc,dlg,context);  // dialog size etc.
			if (dlg._cancelOpen) return;

			// first close all popups
			if (! ajaxart.inPreviewMode) {
				if (!this.DontCloseOtherPopupsOnOpen) {
					if (! dlg.JBStudio) {
						var stop = false;
						while (ajaxart.dialog.openPopups.length > 0 && !stop) {
							var dialogCount = ajaxart.dialog.openPopups.length;
						    aa_closePopup(ajaxart.dialog.openPopups[ajaxart.dialog.openPopups.length-1]);
						    if (ajaxart.dialog.openPopups.length == dialogCount)	// the popup is not closed
						    	stop = true;
						}
					} else {
						// a studio dialog...do not close runtime popups
						var openPopups= [];
						for(var i=0;i<ajaxart.dialog.openPopups.length;i++) {
							var popup = ajaxart.dialog.openPopups[i];
							if (!popup.Dlg || !popup.Dlg.JBStudio) {
								openPopups.push(popup);
							} else {
								// a design time popup - closing it
								aa_uncapture_for_popup(popup);
								if (!popup.Dlg) {	
									aa_remove(popup.contents.parentNode,true);
								}
								if (popup.Dlg) popup.Dlg.Close([],ajaxart.newContext(),true);
							}
						}
						ajaxart.dialog.openPopups = openPopups;
					} 
				}
			}
			
			if (this.Mode == 'dialog') aa_noOfOpenDialogs++;
			
			//var cls = dlg.DialogClass;
			dlg.Frame = dlg.createFrame();
			aa_invoke_dialog_handlers(dlg.BeforeOpen,dlg,context);  // screen cover etc.
			
			aa_openDialogs.push(dlg);
			
			if (this.Mode == 'popup') {
			  dlg.Popup = {Dlg: dlg, contents: dlg.Frame, onElem: dlg.onElem };
			  ajaxart.dialog.openPopups.push(dlg.Popup);
			  setTimeout( function() { 
//				  aa_capture_for_popup(dlg.Popup); 
				  dlg.Popup.initialized = true; 
			  }, 1 );
			}
			
			dlg.Frame.Dialog = dlg;
			var jFrame = jQuery(dlg.Frame);
			aa_defineElemProperties(dlg.Frame,'counter');

			dlg.Rtl = aa_is_rtl(dlg.onElem) && ! dlg.AlwaysLTR;
			if (jQuery(dlg.onElem).parents('.jbstudio').length > 0) jFrame.addClass('jbstudio');
			
			dlg.Frame.counter = ++aa_dialogCounter;		// used to determine who is the current dialog, in case of more than one dialog
			if (dlg.ZIndex) {
				jFrame.css('zIndex',dlg.ZIndex);
			}	else { 
				jFrame.css('zIndex',aad_dialog_zindex(2001 + aa_dialogCounter,jFrame[0]));
			}
			jFrame.addClass('aa_dlg').addClass(dlg.DialogClass || '');
			
			
			if (dlg.Rtl) jFrame.addClass('right2left');
			
			if (! ajaxart.inPreviewMode) jFrame.addClass('aa_dlg').css('position','absolute');
			if (dlg.Title && jFrame.find('.aa_dialog_title').length >0) {
				var titleDiv = jQuery('<div class="aa_dialog_title_text"/>')[0];
				titleDiv.innerHTML = dlg.Title;
				jFrame.find('.aa_dialog_title')[0].appendChild(titleDiv);
			}
			if (dlg.Contents) {
				dlg.ContentsPlaceholder().appendChild(dlg.Contents);
			  dlg.Contents.tabIndex = 0;
			}
			if (dlg.Buttons && dlg.Buttons.length > 0 && dlg.ButtonsControl) {
				jQuery(dlg.Frame).find('.aa_dialogbuttons')[0].appendChild(dlg.ButtonsControl(data1,ctx));
			}
			dlg._FixDialogPosition = function() {
				var oldIsReady = dlg.isReady; 
				if (!dlg.isReady && jFrame.find('.aa_dialog_not_ready').length > 0) {
					dlg.isReady = false;
					return;
				}
				dlg.isReady = true;
				if (dlg.FixDialogPosition) dlg.FixDialogPosition(oldIsReady ? false : true);
			    jFrame.show();
			}
			if (! ajaxart.inPreviewMode) {
				document.body.appendChild(dlg.Frame);
			    jFrame.hide();
		    	dlg._FixDialogPosition(true); 
		    	aa_element_attached(dlg.Frame); 
			}
//			setTimeout(function() {
//				if (dlg.Disabled) return;
//				else if (dlg.Contents) dlg.Contents.focus();
//			},1);

		    jQuery(dlg.Frame).keydown( function(e){
				aa_invoke_dialog_handlers(dlg.KeyDown,e||event,context);
			});
			
			if (dlg.onElem) dlg.onElem.jbDialog = dlg;
		    
			aa_invoke_dialog_handlers(dlg.AfterOpen,dlg,context);  // dialog size etc.
		}
		dlg.Close = function(data1,ctx,fromClosePopup) {
			var ctx = this.Context || ctx;
			aa_invoke_dialog_handlers(this.BeforeClose,this);  
			if (this.RunBeforeClose) this.RunBeforeClose(data1,aa_ctx(ctx,{ControlElement: [this.Frame]}));
			var frame = this.Frame;
			if (!this.Frame) return;
			aa_remove(this.Frame,true);
			this.Frame = null;
			if (this.Mode == 'dialog') aa_noOfOpenDialogs--;
			else if (!fromClosePopup) aa_closePopup(this.Popup); 
			
			aa_invoke_dialog_handlers(this.AfterClose,this);  // screen cover etc.
			if (this.RunOnClose) this.RunOnClose(data1,ctx);
			
			jBart.utils.removeFromArray(aa_openDialogs,this);
			if (dlg.onElem) dlg.onElem.jbDialog = null;
		}
		var newContext = aa_ctx(context,{_Dialog: [dlg]} );
	
		dlg.Style.Features(data,newContext);
		ajaxart.runNativeHelper(data,profile,'MoreFeatures',newContext);
		ajaxart.runsubprofiles(data,profile,'Feature',newContext);
		
		dlg.Open(data,newContext);
	}
	init(dlg);
  },
  AboveLauncher: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.FixDialogPosition = function(firstTime) 
	  {
		  var control = this.onElem;
		  if (!firstTime || !control || !this.Frame) return;
		  var jPopup = jQuery(this.Frame);
		  
		  var mode = aa_text(data,profile,'Location',context);
		  var d;
		  if( window.innerHeight ) 
			  d = { pageYOffset: window.pageYOffset,pageXOffset:window.pageXOffset, innerHeight: window.innerHeight ,innerWidth: window.innerWidth }
		  else if( document.documentElement &&document.documentElement.clientHeight )
			  d = { pageYOffset: document.documentElement.scrollTop , pageXOffset : document.documentElement.scrollLeft, innerHeight : document.documentElement.clientHeight, innerWidth : document.documentElement.clientWidth}
		  else if( document.body )
			  d = { pageYOffset :document.body.scrollTop, pageXOffset :document.body.scrollLeft,innerHeight: document.body.clientHeight,innerWidth :document.body.clientWidth};
		  d.innerWidth -= 18;	//dirty, considering vertical scroll's width
		  var fixed_location = false;
		  jQuery(control).parents().each(function() { if (jQuery(this).css("position") == 'fixed') fixed_location=true; } );
		  if (fixed_location) { d.pageYOffset = d.pageXOffset = 0; jPopup[0].style.position = 'fixed'; }
			  
		  jPopup.show();		// shows before moving so offsetHeight,offsetWidth are correct
		  var p_height = this.Frame.offsetHeight;
		  var p_width = this.Frame.offsetWidth;
		  var l_ctrl_height = control.offsetHeight;
		  var l_ctrl_width = control.offsetWidth;
		  
		  var pageX = aa_absLeft(control) + l_ctrl_width/2 - p_width/2;
		  var pageY = aa_absTop(control) + l_ctrl_height/2 - p_height/2;
		  
		  var padding = 4;
		  if (pageX < d.pageXOffset + padding) pageX = d.pageXOffset + padding;
		  if (pageY < d.pageYOffset + padding) pageY = d.pageYOffset + padding;
		  if (pageX + p_width + padding> d.pageXOffset + d.innerWidth)
			  pageX = d.pageXOffset + d.innerWidth - p_width - padding;
		  if (pageY + p_height + padding> d.pageYOffset + d.innerHeight)
			  pageY = d.pageYOffset + d.innerHeight - p_height - padding;
		  jPopup.css("top",pageY).show();
		  jPopup.css("left",pageX);
	  }
  },
  CenteringLauncher: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.FixDialogPosition = function(firstTime,forceFixLocation) 
	  {
		  var control = this.onElem;
		  if (!control || !this.Frame) return;

		  var jPopup = jQuery(this.Frame);

		  var centerX = aa_absLeft(control) + (jQuery(control).width()/2);
		  var centerY = aa_absTop(control) + (jQuery(control).height()/2);
			  
		  var width = jPopup.outerWidth();
		  var height = jPopup.outerHeight();
		  
		  var dlgLeft = centerX - (width/2);
		  var dlgTop = centerY - (height/2);;
		  
		  if (dlgLeft<0) dlgLeft=0;
		  if (dlgTop<0) dlgTop=0;

		  jPopup.css("left",dlgLeft).css('top',dlgTop).show();
		  
		  aa_invoke_dialog_handlers(dlg.PositionChanged,dlg,context);
	  };
  },
  NearLauncher: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.FixDialogPosition = function(firstTime,forceFixLocation) 
	  {
		  var control = this.onElem;
		  if (!control || !this.Frame) return;
		  if (!firstTime && this.Frame.offsetHeight == this.lastHeight) return;
		  var jPopup = $(this.Frame);
		  
		  var mode = aa_text(data,profile,'Location',context);
		  var d;
		  if( window.innerHeight ) 
			  d = { pageYOffset: window.pageYOffset,pageXOffset:window.pageXOffset, innerHeight: window.innerHeight ,innerWidth: window.innerWidth }
		  else if( document.documentElement &&document.documentElement.clientHeight )
			  d = { pageYOffset: document.documentElement.scrollTop , pageXOffset : document.documentElement.scrollLeft, innerHeight : document.documentElement.clientHeight, innerWidth : document.documentElement.clientWidth}
		  else if( document.body )
			  d = { pageYOffset :document.body.scrollTop, pageXOffset :document.body.scrollLeft,innerHeight: document.body.clientHeight,innerWidth :document.body.clientWidth};
		  var launcher_fixed_location = false;
		  $(control).parents().each(function() { if ($(this).css("position") == 'fixed') launcher_fixed_location=true; } );
		  if (launcher_fixed_location) { d.pageYOffset = d.pageXOffset = 0; jPopup[0].style.position = 'fixed'; }
			  
		  jPopup.show();		// shows before moving so offsetHeight,offsetWidth are correct
		  var p_height = this.Frame.offsetHeight;
		  var p_width = this.Frame.offsetWidth;
		  var l_ctrl_height = control.offsetHeight;
		  var l_ctrl_width = control.offsetWidth;
		  var goLeft = aa_bool(data,profile,'PopupLeftOfLauncher',context);
		  this.lastHeight = p_height;
		  
		  // makes sure it doesn't goes more than screen size
			if (p_width > d.innerWidth) { jPopup.css("max-width", d.innerWidth + "px"); p_width = this.Frame.offsetWidth; }
			if (p_height > d.innerHeight) { jPopup.css("max-height", d.innerHeight + "px"); p_height = this.Frame.offsetHeight;}
  		  
		  var pageX = aa_absLeft(control), pageY = aa_absTop(control);
		  if (!aa_bool(data,profile,'HidingLauncher',context))
			  pageY += l_ctrl_height +2;
		  
		  var padding = 2;
		  if (this.popupLocation == 'up' || (mode != 'below launcher' && d.innerHeight + d.pageYOffset < pageY + p_height && d.pageYOffset <= pageY - p_height - l_ctrl_height - padding)) {	// jPopup going up
			this.popupLocation = 'up';
			pageY  -= p_height + l_ctrl_height + padding +2;
		  }
  		  else if (mode == 'below,above or aside of launcher' && d.innerHeight + d.pageYOffset < pageY + p_height && 
  				d.pageYOffset > pageY - p_height - l_ctrl_height - padding*2) {	// cannot go not up and not down
  			pageY = d.innerHeight/2 - p_height/2 + d.pageYOffset;	// put at center vertically
  			
			if (!goLeft && pageX + l_ctrl_width + p_width +padding <= d.pageXOffset + d.innerWidth) // go right 
				pageX = pageX + l_ctrl_width + padding;
			else if (pageX - p_width >= d.pageXOffset || goLeft) {	// go left
				pageX = pageX - p_width - padding;
				goLeft = false;  // no need to calc the go left again...
			}
			else // go center
				pageX = d.innerWidth/2 - p_width/2+ d.pageXOffset;
		  }
  		  if (d.innerHeight + d.pageYOffset < pageY + p_height)	{ // overflows downwards
  			  var height_diff = p_height - jPopup.height();
  			  jPopup.css("max-height", d.innerHeight + d.pageYOffset - pageY - height_diff - padding + "px");
  			  if (d.innerHeight + d.pageYOffset - pageY - height_diff - padding <= 0)	// dialog too small
  				dlg.Close();
  		  }
		  if (d.pageXOffset + d.innerWidth < pageX + p_width ) {	// overflows rightwards
			  // if (pageX - p_width + l_ctrl_width >= d.pageXOffset) {	// go left
			  pageX = pageX + l_ctrl_width - p_width;
			  goLeft = false; // no need to calc the go left again...
			  // }
			  // else {	// attach center to launching element
//				  pageX = pageX + l_ctrl_width/2 - p_width/2;
//				  if (d.pageXOffset + d.innerWidth < pageX + p_width + padding)	// overflows rightwards
//					 pageX = d.pageXOffset + d.innerWidth - p_width - padding;
//				  else if (d.pageXOffset > pageX )	// overflows leftwards
//						 pageX = d.pageXOffset + padding;
			  // }
		  }
		  if (aa_bool(data,profile,'UseFixedPosition',context) && !launcher_fixed_location) {
			  jPopup[0].style.position = 'fixed';
			  pageX -= d.pageXOffset;
			  pageY -= d.pageYOffset;
		  }
		  if (firstTime || forceFixLocation) {
			  var left = goLeft ? pageX - jPopup.width() : pageX, top = pageY;
			  left += aa_int(data,profile,'DeltaX',context);
			  top += aa_int(data,profile,'DeltaY',context);
			  if (left + jPopup.width() > d.innerWidth) 
				  left = d.innerWidth - jPopup.width();
			  if (left < 0 ) left = 0;
			  if (window.fb_params) left += 9;	// TODO: fix this !!!  
			  jPopup.css("left",left).css('top',top).show();
			  
			  aa_invoke_dialog_handlers(dlg.PositionChanged,dlg,context);
		  }
		  
		  if (aa_bool(data,profile,'PopupAtLeastWideAsLauncher',context))
			  jPopup.css('min-width',l_ctrl_width+'px');
	  }
  },
  StudioStyleDialogOf: function (profile,data,context)
  {
  	var dlg = aa_var_first(context,'_Dialog');
	  aa_register_handler(dlg,'AfterOpen', function(dlg,ctx) {
	  	jQuery(dlg.Frame).addClass('jbstudio_style_dialog');
	  	dlg.Frame.jbStyleXtml = aa_first(data,profile,'Xtml',context);
	  });

  },
  TopZIndexWhenTouching: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  aa_register_handler(dlg,'AfterOpen', function(dlg,ctx) {
		  jQuery(dlg.Frame).find(".aa_dialog_title").mousedown(function() {
//		  jQuery(dlg.Frame).mousedown(function() {
			  dlg.setAsTop();
  		   });
		  dlg.setAsTop();
	  });
	  dlg.setAsTop = function() {
		var other_dialogs = jQuery(".aa_dlg");
		var topZIndex = 0;
		for(var i=0;i<other_dialogs.length;i++) {
			if (other_dialogs[i].Dialog == dlg) continue;
			var zindex = parseInt( jQuery(other_dialogs[i]).css('z-index') || '0') || 0;
			if (zindex > topZIndex) topZIndex = zindex;
		}
		var myzindex = parseInt(jQuery(dlg.Frame).css('z-index') || '0') || 0;
		if (myzindex <= topZIndex) 
			jQuery(dlg.Frame).css('z-index',topZIndex+1);
	  }
  },
  InScreenCenter: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.FixDialogPosition = function(firstTime) 
	  {
		if (!dlg.alreadyShown && !firstTime) return;
		if (firstTime) dlg.firstTimeShow = new Date().getTime();
		
		var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
		var screenHeight = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);

		var scrollOffsetX = document.body.scrollLeft || document.documentElement.scrollLeft;
		var scrollOffsetY = document.body.scrollTop || document.documentElement.scrollTop;
		if (!this.Frame) return;
		var jFrame = jQuery(this.Frame);
	  	
	  	var jDlgBody = jQuery(this.ContentsPlaceholder());
	  	if (jDlgBody.height() > jDlgBody[0].scrollHeight) jDlgBody.height(jDlgBody[0].scrollHeight);
	  	if (jDlgBody.width() > jDlgBody[0].scrollWidth) jDlgBody.width(jDlgBody[0].scrollWidth);

	  	var yCaption = jFrame.height() - jDlgBody.height();
	  	var xCaption = jFrame.width() - jDlgBody.width();
	  	if (jFrame.height() > screenHeight) jDlgBody.height(screenHeight-yCaption-50);
	  	if (jFrame.width() > screenWidth) jDlgBody.width(screenWidth-xCaption-50);

	  	// Handle out of screen
	  	var fixPos = false;
	  	if (aa_absLeft(jFrame[0]) < 0 || screenWidth - jFrame.width() - aa_absLeft(jFrame[0]) < 0) fixPos = true;
	  	if (aa_absTop(jFrame[0]) < 0 || screenHeight - jFrame.height() - aa_absTop(jFrame[0]) < 0) fixPos = true; 
	  	
	  	if (firstTime || aa_bool(data,profile,'AlwaysInScreenCenter',context) || fixPos) {
		  jFrame.css('left',Math.max(5,(screenWidth - jFrame.width())/2) + "px");
		  jFrame.css('top',Math.max(5,(screenHeight - jFrame.height())/2) + "px");
		  jFrame[0].style.position = 'fixed';
	  	}
	  	dlg.alreadyShown = true;
	  }
  },
  UniquePopup: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
  	  var id = aa_text(data,profile,'Identifier',context);
  	  
//	  aa_register_handler(dlg,'AfterOpen', function(dlg,ctx) {
		if (aa_bool(data,profile,'AutoClose',context)) {
			var popups = jQuery('body').find('.aa_dlg');
			for(var i=0;i<popups.length;i++)
			  if (popups[i].Dialog.Identifier == id) popups[i].Dialog.Close([],context);
		}
		dlg.Identifier = id;
//	  });
	  if (aa_bool(data,profile,'KeepPopupLocation',context)) 
	  {
		  jBart.vars.dialogLocations = jBart.vars.dialogLocations || {};
		  aa_register_handler(dlg,'BeforeClose', function(dlg,ctx) {
			  jBart.vars.dialogLocations[id] = { left: dlg.Frame.style.left , top: dlg.Frame.style.top, position: dlg.Frame.style.position, right:dlg.Frame.style.right }; 
		  });
		  aa_register_handler(dlg,'BeforeOpen', function(dlg,ctx) {
			  if (!jBart.vars.dialogLocations[id]) return;
			  dlg.OrigFixDialogPosition = dlg.FixDialogPosition;
			  dlg.FixDialogPosition = function(firstTime) {
				  if (!firstTime) {
					  if (! dlg.OrigFixDialogPosition) return;
					  return dlg.OrigFixDialogPosition(firstTime);
				  }
				  dlg.Frame.style.left = jBart.vars.dialogLocations[id].left;
				  dlg.Frame.style.top = jBart.vars.dialogLocations[id].top;
				  dlg.Frame.style.position = jBart.vars.dialogLocations[id].position;
				  dlg.Frame.style.right = jBart.vars.dialogLocations[id].right;
				  dlg.OrigFixDialogPosition(false);
			  }
		  });
	  }
  },
  DragDialog: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  aa_register_handler(dlg,'AfterOpen', function(dlg,ctx) {
		  var titleElem = jQuery(dlg.Frame).find(".aa_dialog_title")[0] || (jQuery(dlg.Frame).hasClass('aa_dialog_title') && dlg.Frame);
		  aa_enable_move_by_dragging(dlg.Frame,titleElem,function() { /*ajaxart_dialog_close_all_popups();*/ });
	  });	  
  },
  DialogFrame: function (profile,data,context) 
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.createFrame = function() {
		  var dlg = this;
		  var allText = '<table cellpadding="0" cellspacing="0"><tbody class="aa_dlg_tbody">'
			  +  '<tr><td class="aa_dialog_title"/></tr>'
			  +  '<tr><td style="vertical-align:top"><div class="aa_dialogcontents"/></td></tr>'
		      +  '<tr><td class="aa_dialogbuttons"/></tr></tbody></table>';
		  var jFrame = jQuery(allText);
		  aa_enable_move_by_dragging(jFrame[0],jFrame.find(".aa_dialog_title")[0],function() { ajaxart_dialog_close_all_popups(); });
		  return jFrame[0];
	  }
  },
  ToggleDialog: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];

	  aa_register_handler(dlg,'BeforeOpenFunc', function(dlg,ctx) {
		 if (dlg.onElem && dlg.onElem.jbDialog && ajaxart.isattached(dlg.onElem.jbDialog.Frame)) {
			 dlg.onElem.jbDialog.Close();
			 dlg.onElem.jbDialog = null;
			 dlg._cancelOpen = true;
		 } 
	  });
  },
  PopupFrame: function (profile,data,context) 
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.PopupStyle = aa_text(data,profile,'Style',context); 
	  dlg.createFrame = function() {
		  var allText = '<div class="aa_popup aa_dialogcontents" style="'+this.PopupStyle+'"/>';
		  return jQuery(allText)[0];
	  }
  },
  Css: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  aa_register_handler(dlg,'AfterOpen', function(dlg,ctx) {
		var cls = aa_attach_global_css(aa_text(data,profile,'Css',context));
		jQuery(dlg.Frame).addClass(cls);
	  }); 
  },
  HoverPopup: function (profile,data,context)
  {
	var dlg = context.vars._Dialog[0];

	aa_register_handler(dlg,'BeforeOpen', function(dlg,ctx) 
	{
		// close all other hover-popus
		var new_popups = [];
		for (var i in ajaxart.dialog.openPopups) {
			var popup = ajaxart.dialog.openPopups[i];
			if (popup.Dlg && popup.Dlg.HoverPopup && popup.Dlg != dlg)
				popup.Dlg.Close();
			else
				new_popups.push(popup)
		}
		ajaxart.dialog.openPopups = new_popups;
	});
	aa_register_handler(dlg,'AfterOpen', function(dlg,ctx) {
		dlg.HoverPopup = true;
		dlg.OrigMouseOut = dlg.onElem.onmouseout;
		dlg.OrigMouseOver = dlg.onElem.onmouseover;
		dlg.StartClosingPopup = function()	{
    		setTimeout(function() { 
    			if (dlg.Frame && ! dlg.Frame.isInside) { dlg.OK(data,context); }
    		},200);
		}
		dlg.onElem.onmouseout = function() {
			if (dlg.Frame) dlg.Frame.isInside = false;
			if (!dlg.Frame.hasFocus) dlg.StartClosingPopup();
			if (dlg.OrigMouseOut) dlg.OrigMouseOut();
		}
		dlg.onElem.onmouseover = function() {
			if (dlg.Frame) dlg.Frame.isInside = true;
		}
    	dlg.Frame.onmouseover = function() { dlg.Frame.isInside = true; }
    	dlg.Frame.onmouseout = function() { 
    		dlg.Frame.isInside = false;
    		if (!dlg.Frame.hasFocus) dlg.StartClosingPopup();
    	}
    	dlg.Frame.onfocus = function() { dlg.Frame.hasFocus = true; }
    	dlg.Frame.onblur = function() { dlg.Frame.hasFocus = false; }
    });
    aa_register_handler(dlg,'AfterClose', function(dlg,ctx) {
    	dlg.onElem.onmouseout = dlg.OrigMouseOut;
    	dlg.onElem.onmouseover = dlg.OrigMouseOver;
    });
  },
  CloseWhenClickingOutside: function (profile,data,context)
  {
		var dlg = context.vars._Dialog[0];
		dlg.Orig_mousedown = (window.captureEvents) ? window.onmousedown : document.onmousedown;
		var ignoreLaunchingElement = aa_bool(data,profile,'IgnoreLaunchingElement',context);
		
		function isChild(child,parent) {
			if (!child) return false;
			if (child == parent) return true;
			return isChild(child.parentNode,parent);  
		}
		function captureClick(e) {
			var dlg = context.vars._Dialog[0];
		    var elem = jQuery( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );

		    if (elem.parents('html').length == 0) return; // detached - should not close..?
		    if (dlg.Frame == elem.parents('.aa_dlg')[0] || elem.hasClass('aa_dlg')) return;  // clicking inside us should not close
		    if (ignoreLaunchingElement && isChild(elem[0],dlg.onElem)) return;
		    
		    dlg.OK(data,context);
		}
		
		setTimeout( function() { 	
			if (window.captureEvents) window.onmousedown=captureClick;
			else document.onmousedown=captureClick;
		},1);
		
	  aa_register_handler(dlg,'AfterClose', function(dlg,ctx) 
		{
	    	if (window.captureEvents) 
	    	  window.onmousedown = dlg.Orig_mousedown;
	    	else 
	    	  document.onmouseclick = dlg.Orig_mousedown;
		});	
  },
  OKOnEnter: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.OKOnEnter = aa_bool(data,profile,'Enabled',context);
	  aa_register_handler(dlg,'KeyDown', function(e,ctx) 
	  {
		 if(e.keyCode != 13 || !dlg.OKOnEnter) return;
		 
		 var elem = (typeof(event)== 'undefined')? e.target : event.srcElement;
	     if (!elem || elem.tagName.toLowerCase() != 'textarea') 
	       dlg.OK(data,context);
	  });
  },
  CloseOnEsc: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.CloseOnEsc = aa_bool(data,profile,'Enabled',context);
	  aa_register_handler(dlg,'KeyDown', function(e,ctx) 
	  {
		 if(e.keyCode == 27) dlg.Cancel();
	  });
  },
  ButtonsHorizontal: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.ButtonsControl = function(data1,ctx) {
		var out = jQuery('<table cellpadding="4"><tr/></table>')[0];
		var align_param = aa_text(data,profile,'Align',context);
		var align = align_param;
		if (align_param == "auto")
			align = dlg.Rtl ? 'left' : 'right';
		jQuery(out).css('float',align);
		var tr = jQuery(out).find('tr')[0];
		for(var i=0;i<this.Buttons.length;i++) {
			var btn = this.Buttons[i].Control(data1,ctx)[0];
			var td = jQuery('<td/>')[0];
			td.appendChild(btn);
			tr.appendChild(td);
		}
		return out;
	  }
  },
  DialogShadow: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  aa_register_handler(dlg,'AfterOpen', function(dlg,ctx) 
	  {
		var shade1 = jQuery('<tr class="dialog_right_shadow_tr"><th class="dialog_shadow_extra_th"/>'
					      + '<th rowspan="6" class="dialog_right_shadow_th"><div class="dialog_right_shadow" /></th></tr>');
	
		var shade2 = jQuery('<tr class="dialog_bottom_shadow" ><td><span class="dialog_bottom_outer" ><span class="dialog_bottom_inner" ></span>'
				          + '</span></td></tr>');
		
		if (ajaxart.isIE) { // causes the title to be two lines (we should refactor the dialog not to use table)
			shade1.find('.dialog_right_shadow_th').css('display','none');
			shade2.css('display','none');
		}
		
		var tbody = jQuery(dlg.Frame).find('tbody')[0];
		tbody.insertBefore(shade1[0],tbody.firstChild);
		tbody.appendChild(shade2[0]);
		jQuery(dlg.Frame).css('border','none');
	  });
  },
  Size: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  aa_register_handler(dlg,'BeforeOpen', function(dlg,ctx) 
	  { 
		  var top = dlg.ContentsPlaceholder();
		  aa_set_element_size(top,aa_text_with_percent(data,profile,'Size',context));
		  aa_set_element_size(top,aa_text_with_percent(data,profile,'MaxSize',context),"max-");
	  });
  },
  Resizer: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  aa_register_handler(dlg,'BeforeOpen', function(dlg,ctx) 
	  { 
		  var top = dlg.ContentsPlaceholder();
		  
		  aa_addResizer(top,{
		  	onResize: function(width,height) {
			    jQuery(top).width(width).height(height).css('max-width',width+'px').css('max-height',height+'px');

			    var right = jQuery(dlg.Frame).css('right');
			    if (right && right != 'auto') {
				    var dlgLeft = aa_absLeft(dlg.Frame);
				    jQuery(dlg.Frame).css('left',dlgLeft + 'px').css('right','');
			    }
			},
		    insertResizer1: function(element,resizer) {
			  element.appendChild(resizer);
			}
  		  });
	  });
  },
  CloseDialogFrame: function (profile,data,context)
  {
	  var topDialog = aa_top_dialog();
	  if (!topDialog) return;
	  if (topDialog.OldDialog) aad_close_dialog_old('Cancel',true);
	  else topDialog.Dialog.Close([],context);
  },
  CloseContainingDialog: function (profile,data,context)
  {
	  var ctrl = context.vars.ControlElement[0];
	  while (ctrl) {
		  var dialog = ctrl.Dialog;
		  if (dialog) 
			return dialog.Cancel(dialog.Data,dialog.Context);
		  ctrl = ctrl.parentNode;
	  }
  },
  InplaceDialog: function (profile,data,context)
  {
	var previewValue =  ajaxart.inPreviewMode;
	ajaxart.inPreviewMode = true;
    ajaxart.runNativeHelper(data,profile,'OpenDialog',context);
    ajaxart.inPreviewMode = previewValue;
    
    var dialog = aa_openDialogs[aa_openDialogs.length-1];
    if (!dialog || dialog.Title != aa_text(data,profile,'Title',context)) return;
    jQuery(dialog.Frame).addClass('aa_inplace_dialog');
    var out = dialog.Frame;
    dialog.Cancel(dialog.Data,dialog.Context);
    var field = context.vars._Field[0];
    field.Control = function() { 
    	return [out]; 
    }
  },
  CloseDialog: function (profile,data,context)
  {
	  var topDialog = aa_top_dialog();
	  if (!topDialog) return;
	  if (topDialog.OldDialog) {
		  // close by clicking on the OK button (because of async checks etc.)
		  var okButton = jQuery(topDialog.dialogContent).find('.OKButton')[0];
		  if (okButton) {
		    aa_fire_event(okButton,'mousedown',context,{});
		    aa_fire_event(okButton,'mouseup',context,{});
		  }
	  }
	  else {
		  if (aa_text(data,profile,'CloseType',context) == "OK")
			  topDialog.Dialog.OK(topDialog.Dialog.Data,topDialog.Dialog.Context);
		  else
			  topDialog.Dialog.Cancel(topDialog.Dialog.Data,topDialog.Dialog.Context);
	  }
  },
  CloseIconOld: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  aa_register_handler(dlg,'AfterOpen', function(dlg,ctx) 
	  {
		var jTitle = jQuery(dlg.Frame).find('.aa_dialog_title');
		if (jTitle.length == 0)
			jTitle = jQuery(dlg.Frame);
		if (aa_bool(data,profile,'UseXCharacter',context)) {
			var img = jQuery('<div class="aa_dialog_caption_close xchar"><div></div>');
			img.find('>div').text(aa_text(data,profile,'XCharacter',context));
			img = img[0];
		} else {
			var src = aa_text(data,profile,'Image',context);
			var img = jQuery('<img class="aa_dialog_caption_close" src="'+src+'"/>')[0];
		}
		jQuery(img).addClass( aa_attach_global_css(aa_text(data,profile,'Css',context),null,'close_dialog_old') );
		img.onclick = function() { dlg.Cancel(dlg.Data,ctx); }
		
		jTitle[0].insertBefore(img,jTitle[0].firstChild);
	  });
  },
  CloseIcon: function (profile,data,context)
  {
	  var style = aa_first(data,profile,'Style',context);

	  aa_register_handler(context.vars._Dialog[0],'AfterOpen', function(dlg,ctx) {
		  aa_renderStyleObject(style,{
			 dialog: dlg.Frame,
			 CloseDialog: function() { dlg.Cancel(dlg.Data,ctx); }
		  },ctx)
	  },'CloseIcon');
  },
  AutomaticFocus: function (profile,data,context)
  {
	  if (ajaxart.inPreviewMode) return;
	  var dlg = context.vars._Dialog[0];
	  var focus_on = aa_text(data,profile,'FocusOn',context);
	  aa_register_handler(dlg,'AfterOpen', function(dlg,ctx) {
		  if (focus_on == "first input") {
				setTimeout(function() {
					if (dlg.Disabled) return;
					if (ajaxart.controlOfFocus)
	    	  	  		ajaxart.controlOfFocus.IgnoreBlur = true;
					
					var inp = jQuery(dlg.Contents).find('input');
					if (inp.length > 0) inp[0].focus();
				},1);
		  }
	  },"AutomaticFocus");
  },
  NoCancel: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.NoCancel = true;
	  if (!dlg.Buttons) return;
	  for(var i=0;i<dlg.Buttons.length;i++) {
		  if (dlg.Buttons[i].ID == 'OK') {
			  var okbtn = ajaxart.runNativeHelper(data,profile,'OKButton',context)[0];
			  if (okbtn) dlg.Buttons[i] = okbtn;
		  }
		  if (dlg.Buttons[i].ID == 'Cancel') {
			  dlg.Buttons.splice(i,1);
		  }
	  }
  },
  DisableBodyScroll: function (profile,data,context)
  {
	  var dlg = context.vars._Dialog[0];
	  dlg.DisableBodyScroll = aa_bool(data,profile,'Enabled',context);
	  aa_register_handler(dlg,'BeforeOpen', function(dlg,ctx) 
	  {
		  if (!dlg.DisableBodyScroll) return;
		  if (!jBart.dialogs.DisableBodyScroll_counter) jBart.dialogs.DisableBodyScroll_counter =0;
		  jBart.dialogs.DisableBodyScroll_counter++;
		  
		  jQuery('body').css('overflow','hidden');
	  });
	  aa_register_handler(dlg,'AfterClose', function(dlg,ctx) 
	  {
		  if (!dlg.DisableBodyScroll) return;
		  if (--jBart.dialogs.DisableBodyScroll_counter == 0)
			jQuery('body').css('overflow','auto');
	  });
  },
  ScreenCover: function (profile,data,context) 
  {
	  var dlg = context.vars._Dialog[0];
	  var alreadyExists = dlg.CoverColor != null;
	  dlg.CoverColor = aa_text(data,profile,'Color',context);
	  dlg.CoverOpacity = aa_text(data,profile,'Opacity',context);
	  if (alreadyExists) return;
	  aa_register_handler(dlg,'BeforeOpen', function(dlg,ctx) 
	  {
		//var wrappingDiv = jQuery('<div class="dialog_cover" style="position:absolute;top:0px;left:0px;" />')[0];
		var wrappingDiv = jQuery('<div class="dialog_cover" style="position:fixed;top:0px;left:0px;" />')[0];
		
		wrappingDiv.style.backgroundColor = dlg.CoverColor;
		wrappingDiv.onmousedown = function(e) {
			e = e || event;
			if (e == null) return;
		    if (typeof(Event) != 'undefined' && Event.resolve) Event.cancelBubble(Event.resolve(e)); 
		}
		wrappingDiv.Dialog = dlg;
		var scree_size = aa_screen_size();
		//wrappingDiv.style.width = Math.max(document.documentElement.scrollWidth,scree_size.width) -18 + "px";
		//wrappingDiv.style.height = Math.max(document.documentElement.scrollHeight,scree_size.height) -18 + "px";
		wrappingDiv.style.width = '100%';
		wrappingDiv.style.height = '100%';
		wrappingDiv.style.zIndex = aa_int(data,profile,'MinZIndex',context) + aa_noOfOpenDialogs;
		wrappingDiv.style.opacity = dlg.CoverOpacity;
		wrappingDiv.style.filter = "alpha(opacity=" + dlg.CoverOpacity *100 + ")";	// IE	
		wrappingDiv.tabIndex = 0;
		
	    jQuery(wrappingDiv).keydown( function(event){
	    	if(event.keyCode == 27)	wrappingDiv.Dialog.Cancel();
	    } );
		if (!ajaxart.inPreviewMode) document.body.appendChild(wrappingDiv);
	  });
	  aa_register_handler(dlg,'AfterClose', function(dlg,ctx) 
	  {
		  var covers = jQuery('body').find('.dialog_cover');
		  for(var i=0;i<covers.length;i++)
			  if (covers[i].Dialog == dlg) {
				  aa_remove(covers[i],true);
				  return;
			  }
	  });
  },
  TopDialog: function (profile,data,context)
  {
	  var topDialog = aa_top_dialog();
	  if (!topDialog) return [];
	  if (aa_bool(data,profile,'ReturnContent',context))
		  return [topDialog.Dialog.Contents];
	  else
		  return [topDialog.Dialog];
  },
  CloseAllDialogs: function (profile,data,context)
  {
	  for (var i=0; i<aa_openDialogs.length; i++)
		  aa_openDialogs[i].Close();
	  aa_openDialogs = [];
	  return [];
  },
  CloseDialogByID: function (profile,data,context)
  {
	  var id = aa_text(data,profile,'Identifier',context);
 	  var popups = jQuery('body').find('.aa_dlg');
	  for(var i=0;i<popups.length;i++) {
		  if (id != '' && popups[i].Dialog.Identifier == id) { 
			  popups[i].Dialog.Close();
			  return;
		  }
	  }
  }
});


function aa_invoke_dialog_handlers(eventFuncs,dlg,context)
{
	if (eventFuncs)
		for(var i=0;i<eventFuncs.length;i++)
			eventFuncs[i](dlg,context);
}

function aa_top_dialog()
{
  var dialogs = jQuery('body').find('.aa_dlg');
  var maxCounter = 0,topDialog=null;
  for(var i=0;i<dialogs.length;i++) {
	  if (dialogs[i].counter > maxCounter) { topDialog = dialogs[i]; maxCounter = topDialog.counter; }
  }
  if (openDialogs.length == 0) return topDialog;
  
  var topOldDialog = openDialogs[openDialogs.length-1];
  if (!topDialog || topDialog.noOfOpenDialogs < topOldDialog.noOfOpenDialogs) return topOldDialog;
  
  return topDialog;
}

function aa_enable_move_by_dragging(draggable_frame,draggable_area,onstartdrag,onenddrag)
{
	if (!draggable_area) return;
	jQuery(draggable_area).mousedown(function(e) {
		  e = e || event;
		  if (! draggable_frame.Moving) {
			  	var right_pos = (draggable_frame.style.right.split("px").length > 1) ? draggable_frame.style.right.split("px")[0] : null;
			  	draggable_frame.Moving = { mouse_x: (e.clientX || e.pageX), mouse_y: (e.clientY || e.pageY), 
				  	frame_x: draggable_frame.offsetLeft, frame_y: draggable_frame.offsetTop, frame_right: right_pos };
			  	onstartdrag();
			  	ajaxart_disableSelection(document.body);
			  	ajaxart_disableSelection(jQuery(draggable_area).parents(".aa_dlg")[0]);
		  }
		  var mouse_move = function(e) {
			  e = e || event;
			  var top = Math.max( (e.clientY || e.pageY) - draggable_frame.Moving.mouse_y + draggable_frame.Moving.frame_y, 0);
			  draggable_frame.style.top = top + "px";
			  draggable_frame.style.bottom = 'inherit';
			  if (draggable_frame.Moving.frame_right) {	//	anchoring to the right side
				  draggable_frame.style.right = draggable_frame.Moving.frame_right - ((e.clientX || e.pageX) - draggable_frame.Moving.mouse_x) + "px";
			  } else {
				  draggable_frame.style.left = (e.clientX || e.pageX) - draggable_frame.Moving.mouse_x + draggable_frame.Moving.frame_x + "px";
				  draggable_frame.style.right = 'inherit';
			  }
		  }
		  var mouse_up = function(e) {
			  e = e || event;
			  draggable_frame.Moving = null;
			  window.onmousemove = null; window.onmouseup =null;  document.onmouseup=null; document.onmousemove=null; 
			  ajaxart_restoreSelection(document.body);
			  ajaxart_restoreSelection(jQuery(draggable_area).parents(".aa_dlg")[0]);
			  if (onenddrag) onenddrag();
		  }
		  if (window.captureEvents){ window.onmousemove = mouse_move;window.onmouseup = mouse_up; }
		  else { document.onmouseup=mouse_up;	document.onmousemove=mouse_move;  }
	  });
}

aa_gcs("dialog", {
	  TogglePopup: function (profile,data,context)
	  {
		var onElem = aa_first(data,profile,'OnElement',context);
		var widthOption = aa_text(data,profile,'WidthOption',context);
		if (widthOption == '') widthOption = 'launcher width';
		var width = aa_text(data,profile,'Width',context);
		var height = aa_text(data,profile,'Height',context);
	    var popupdata = ajaxart.run(data,profile,'PopupData',context);
	    var closeOnEnter = aa_bool(data,profile,'CloseOnEnter',context);
	    var closeOnDoubleClick = aa_bool(data,profile,'CloseOnDoubleClick',context);
	    var popupCssClass = aa_text(data,profile,'PopupCssClass',context);
	    var returnFocusTo = aa_first(data,profile,'ReturnFocusTo',context);
	    var style = aa_text(data,profile,'Style',context);
		for(i=0; i<ajaxart.dialog.openPopups.length; i++)
		{
			if (ajaxart.dialog.openPopups[i].onElem == onElem)
			{
				var popupContents = ajaxart.dialog.openPopups[i].contents;
			    var popup = jQuery(popupContents).parents('.aapopup');
			    if (popup.length > 0 && popup[0].parentNode != null) {
			    	aa_remove(popup[0],true);
			    }
				
			    var newArr= [];
			    for(var j in ajaxart.dialog.openPopups)
			    {
			    	if (i != j)
			    		newArr.push( ajaxart.dialog.openPopups[j] );
			    }
			    aa_uncapture_for_popup(ajaxart.dialog.openPopups[i]);
			    ajaxart.dialog.openPopups = newArr;
			    
				return ["true"];
			}
		}
		ajaxart.setVariable(context,"_LaunchingElement",[onElem]);
		var contents = aa_first(popupdata,profile,'Contents',context);
		if (!contents) return;
		var popupObj = {contents: contents , onElem: onElem, profile: profile, returnFocusTo: returnFocusTo };
		contents.PopupObj = popupObj;
		// console.log("TogglePopup " + popupObj.onElem.parentNode.Field.Id);
		if (contents != null)
			ajaxart.dialog.openPopups.push(popupObj);
		if (onElem == null || contents == null ) { ajaxart.log("toggle popup - empty contents or no launching element","warning"); return []; }
		contents.LaunchingElement = onElem;
		if (onElem.offsetParent == null) { ajaxart.log("toggle popup - launching element has no offsetParent","warning");  }
		var jOnElem = jQuery(onElem);
		var popup = jQuery(document.createElement("div")).addClass("aapopup " + popupCssClass);
		popup[0].profile = profile;
		popup[0].context = context;
		popup[0].data = data;
		if (style != "") {
			if (style.indexOf(":") > 0)
				aa_setCssText(popup[0],style);
			else
				popup[0].className = popup[0].className + style;
		}
		if (! aa_intest)
		{
			popup[0].style.display = 'none';
			popup[0].display = 'none';
		}
		jQuery(contents).appendTo(popup);
		if (aa_bool(data,profile,'ShowCloseButton',context))
		{
			var deleteDiv = jQuery('<div style="padding: 0 0 16px 16px; position:absolute; top: 7px; right:4px; cursor:pointer;" />')[0];
			deleteDiv.style.background = "url(" + aa_text(data,profile,'CloseImage',context) + ') no-repeat';
			deleteDiv.popup = popupObj;
			deleteDiv.onmousedown = function() {
				aa_closePopup(this.popup);
			}
			popup[0].insertBefore(deleteDiv,popup[0].firstChild);
		}

		var registerFunc = function(popup,popupdata,popupObj,closeOnEnter) {
			popup[0].onkeyup = function(e) { 
				e = e || event;
				if (typeof(e) == "undefined") e = event;
				if (closeOnEnter && e.keyCode == 13 && this.parentNode != null) // ENTER
				{
			    	var elem = jQuery( (typeof(event)== 'undefined')? e.target : event.srcElement  );
			    	if (elem[0] && elem[0].tagName.toLowerCase() == 'textarea') return;
					
//					this.parentNode.removeChild(this);
//					aa_element_detached( this );
					aa_closePopup(popupObj);
					ajaxart.run(popupdata,profile,'OnSuccess',context);
					ajaxart_stop_event_propogation(e);
				}
				if (e.keyCode == 27) {
					if (ajaxart.currentContextMenu == null || $(ajaxart.currentContextMenu).css("display") != 'block' ) {// ESC
//						this.parentNode.removeChild(this);
//						aa_element_detached(this);
						ajaxart.run(data,profile,"OnCancel",context);
						ajaxart_stop_event_propogation(e);
						aa_closePopup(popupObj);
					}
				}
			};
			if (closeOnDoubleClick)
			  popup[0].ondblclick = function() {
				this.parentNode.removeChild(this);
				aa_element_detached( this );
				ajaxart.run(popupdata,profile,'OnSuccess',context);
			  }
		}
		registerFunc(popup,popupdata,popupObj,closeOnEnter);
		
		window.aa_noOfOpenDialogs = window.aa_noOfOpenDialogs || 0;

		var xydelta = aa_text(data,profile,'XYCorrections',context).split(',');
		
		if (jOnElem.parents('.jbstudio').length > 0) popup.addClass('jbstudio');
		
		if (jOnElem.parents('.right2left').length > 0)
		{
			popup.addClass('right2left');
		}
		else
		{
			popup.css('left',aa_absLeft(onElem)+parseInt(xydelta[0]));
			if (width == "" && widthOption == 'launcher width') 
				jQuery(popup).css('min-width',jOnElem.width() + 100); //width = jOnElem.width()+"px";
			else
				popup[0].style.minWidth = width;
			//popup[0].style.minWidth = width;
		}
		++aa_dialogCounter;
		var zindex = aad_dialog_zindex(2000 + aa_dialogCounter+1,popup[0]);
		popup.css('z-index',zindex);
		//popup.css('top',aa_absTop(onElem) + jOnElem[0].clientHeight + 50); // + parseInt(xydelta[1]));
		
		if (height != "") popup.height(height);
		//popup.height('100px');
		//popup.width('60px');
		
		popup.appendTo("body");
		aa_element_attached(popup);

		var newcontext = ajaxart.clone_context(context);
		ajaxart.setVariable(newcontext,"ControlElement",[contents]);
		if (ajaxart.fieldscript(profile,'AutoFocusOn',true) != null && !ajaxart.inPreviewMode)
		{
			var autoFocusParams = ajaxart.calcParamsForRunOn(newcontext,ajaxart.run(data,profile,'AutoFocusOn',newcontext));
			var autoFocusOn = ajaxart.getControlElement(autoFocusParams);
			if (autoFocusOn.length > 0 && 'focus' in autoFocusOn[0])
			{
			    var timeout = 1;
			    if (ajaxart.isSafari || ajaxart.isFireFox) timeout = 100;
		    	var set_focus = function(e) {  setTimeout(function() 
		    	{
		    		e = e || event;
	    	  	  	if (ajaxart.controlOfFocus != null)
	    	  	  		ajaxart.controlOfFocus.IgnoreBlur = true;
		    		if (jQuery(e).parents("body").length > 0) e.focus();  
		    	},timeout) }
		    	set_focus(autoFocusOn[0]);
			}
		}

		var init_popup = function(popup,width,widthOption,popupObj) { return function() {
			ajaxart.dialog.positionPopup(popup[0], onElem, null, false);
			if (width == '' && widthOption == 'launcher width' && jOnElem[0].offsetWidth > 2)
				popup.css('min-width',jOnElem[0].offsetWidth - 2); // potential bug - 2 for the border
			if (popup.hasClass('right2left'))
			{
				var lanchingElementRight = aa_absLeft(onElem) + jOnElem[0].offsetWidth;
				var popupLeft = lanchingElementRight - popup[0].offsetWidth;
				popup.css('left',popupLeft + 'px');
				popup.css('right','');
			}
			aa_capture_for_popup(popupObj);
			popupObj.initialized = true;
			if (aa_bool(data,profile,'AutoCloseOnMouseOut',context)) 
			{
				popup[0].onmouseover = function() { popup[0].isInside = true; }
				popup[0].onmouseout = function() { popup[0].isInside = false; setTimeout(function() {
					if (! popup[0].isInside)
						aa_closePopup(popup[0]);
				},500)}
			}
			if (ajaxart.isIE) // avoid scroll - IE bug?
				popup.height((popup.height() +2) + 'px');
			popup[0].style.display = '';
			popup[0].display = '';
			ajaxart.run(data,profile,'OnPopupOpen',aa_ctx(context, {ControlElement: [popup[0]]}) );
		}}
		setTimeout(init_popup(popup,width,widthOption,popupObj),1);
			
	  },
	  ClosePopup: function (profile,data,context)
	  {
		  var counter = 10;
		  if (aa_bool(data,profile,'AllPopups',context))
			  while (ajaxart.dialog.openPopups.length > 0 && counter > 0)
			  {
				  aa_closePopup(ajaxart.dialog.openPopups[ajaxart.dialog.openPopups.length-1]);
				  counter--;
			  }
		  if (ajaxart.dialog.openPopups.length > 0)
			  return aa_closePopup(ajaxart.dialog.openPopups[ajaxart.dialog.openPopups.length-1]);
	  }
});

jBart.disableSelections = function() {
  	ajaxart_disableSelection(document.body);
  	var frames = document.frames;
}
jBart.restoreSelections = function() {
	ajaxart_restoreSelection(document.body);
  	var frames = document.frames;
}

// jBart.addResizer assumes element has a div parent, and that it has no visible siblings 
function aa_addResizer(element,resizeProperties)
{
	var defaultProperties = { image: aa_base_images() + '/resizer.gif', width: '16px', height: '16px', minWidth: 20, minHeight: 20,
		zIndex: 10,
	  onResize: function(width,height) {},
	  onResizeEnd: function(width,height) {},
	  insertResizer: function(element,resizer) {
		  element.parentNode.appendChild(resizer);
	  }
	};
	
	resizeProperties = $.extend(defaultProperties,resizeProperties);
	
	if (!element || !element.parentNode) return;
	jQuery(element.parentNode).css('position','relative');
	var jResizer = jQuery('<div style="position:absolute;bottom:0;right:0;background-repeat:no-repeat;" />');
	jResizer.css('background','url('+resizeProperties.image+')').css('width',resizeProperties.width).css('height',resizeProperties.height).css('cursor','se-resize').
		css("z-index",resizeProperties.zIndex);
	resizeProperties.insertResizer(element,jResizer[0]);

	jResizer.mousedown(function(e) {
		  if (! jResizer[0].jbResizingProps) {
		  	var width = jQuery(element).width();
		  	var height = jQuery(element).height();
		  	jResizer[0].jbResizingProps = { mouse_x: (e.clientX || e.pageX), mouse_y: (e.clientY || e.pageY), width: width, height: height };
		  	jBart.disableSelections();

		  	var resizeCover = jQuery('<div id="aa_resize_cover" style="height:100%; width: 100%; background:pink;z-index:10000; opacity:0; filter: alpha(opacity=0);position:fixed;top:0;left:0;top:0;bottom:0"/>');
			jQuery('body').append(resizeCover);
		  }
		  var mouse_move = function(e) {
			  e = e || event;
			  var props = jResizer[0].jbResizingProps;
			  var mouse_x = (e.clientX || e.pageX), mouse_y = (e.clientY || e.pageY);
			  var newWidth = props.width + (mouse_x - props.mouse_x);
			  var newHeight = props.height + (mouse_y - props.mouse_y);
			  if (newWidth > resizeProperties.minWidth) jQuery(element).width(newWidth); 
			  if (newHeight > resizeProperties.minHeight) jQuery(element).height(newHeight);
			  
			  resizeProperties.onResize(newWidth,newHeight);
		  }
		  var mouse_up = function(e) {
			  e = e || event;
			  jResizer[0].jbResizingProps = null;
			  window.onmousemove = null; window.onmouseup =null;  document.onmouseup=null; document.onmousemove=null; 
		  	  jBart.restoreSelections();
		  	  resizeProperties.onResizeEnd(jQuery(element).width(),jQuery(element).height());
		  	  jQuery('#aa_resize_cover').remove();

		  }
		  if (window.captureEvents){ window.onmousemove = mouse_move;window.onmouseup = mouse_up; }
		  else { document.onmouseup=mouse_up; document.onmousemove=mouse_move; }
    });
}

function aad_dialog_zindex(proposedZIndex,popupElement,isStudio) {
//	return proposedZIndex;

	if (typeof(isStudio) === 'undefined')
		isStudio = $(popupElement).hasClass('jbstudio') || $(popupElement).hasClass('jbstudio_dlg') || $(popupElement).hasClass('xtml_dt_popup');

	var max = proposedZIndex-1,zindex;

	if (isStudio) {
		// we should also be jbstudio_dlg
		var otherStudioPopups = $('.jbstudio_dlg, .aaeditor');
		for(var i=0;i<otherStudioPopups.length;i++) {
			try {
				zindex = parseInt(otherStudioPopups[i].style.zIndex || '0') || 0;
			} catch(e) {
				zindex = 0;
			}
			max = Math.max(max,zindex+2);
		}
	} else {
		var openPopus = aa_open_popups();
		for(var i=0;i<openPopus.length;i++) {
			max = Math.max(max,openPopus[i].zindex+2);
		}
	}

	return max+1;
}
