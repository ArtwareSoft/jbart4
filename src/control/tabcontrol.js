ajaxart.load_plugin("","plugins/control/tabcontrol_styles.xtml");

aa_gcs("control", {
	TabControl: function(profile, data, context) // gc of control.TabControl
	{
		var field = aa_create_base_field(data, profile, context);

		aa_init_class_TabControl();

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context,ctx);
			field.Fields = ajaxart.runsubprofiles(data,profile,'Field',ctx2);
			var tabControl = new ajaxart.classes.TabControl({
				fields: field.Fields,
				data: field_data, profile: profile, context: ctx2, field: field, field_data: field_data,
				disableFurtherNextTabs: field.DisableFurtherNextTabs,
				checkValidationsWhenMovingForward: field.CheckValidationsWhenMovingForward,
				transition: field.TabTransition,
				tabContentsWidth: field.TabContentsWidth,
				tabContentsHeight: field.TabContentsHeight
			});

			var out = aa_renderStyleObject(field.Style,tabControl,ctx2,true);
			$(out).addClass('aa_tabcontrol');
			return [out];
		};
		return [field];
	}
});

aa_gcs("fld_aspect", {
	TabControlProperties: function(profile, data, context)
	{
		var field = context.vars._Field[0];

		field.KeepSelectedTab = aa_first(data,profile,'KeepSelectedTab',context);
		field.RefreshTabsOnSelect = aa_bool(data,profile,'RefreshTabsOnSelect',context);
		field.TabTransition = aa_first(data,profile,'Transition',context);
		field.TabContentsWidth = aa_int(data,profile,'TabContentsWidth',context);
		field.TabContentsHeight = aa_int(data,profile,'TabContentsHeight',context);

		field.DoOnTabChange = function(prevtab,newtab,fromUser) {
			ajaxart.run(data,profile,'DoOnTabChange',aa_ctx(context,{ PrevTab: [prevtab], NewTab: [newtab], OriginatedByUser: aa_frombool(fromUser) }));
		};
		aa_bind(field,'TabControlSelect',function(props) {
			ajaxart.run(data,profile,'DoOnTabChange',aa_ctx(context,{ NewTab: [props.TabField], PrevTab: [props.PrevTabField], OriginatedByUser: aa_frombool(props.fromUser) }));			
		});
		field.KeepHiddenTabInTheDOM = aa_bool(data,profile,'KeepHiddenTabInTheDOM',context);
	},
	ControlInTab: function(profile, data, context) {
		context.vars._Field[0].ControlInTab = function(data1,ctx) {
			ctx = aa_merge_ctx(context,ctx);
			var page = aa_first(data1,profile,'Page',ctx);
			if (page) {
				var out = $('<div/>')[0];
				aa_fieldControl({Wrapper: out, Field: page, Item: data1, Context: ctx });
				return [out];
			}
		};
	},
	TabControlAsWizard: function(profile, data, context) {
		var field = context.vars._Field[0];
		field.DisableFurtherNextTabs = aa_bool(data,profile,'DisableFurtherNextTabs',context);
		field.CheckValidationsWhenMovingForward = aa_bool(data,profile,'CheckValidationsWhenMovingForward',context);
	}
});

aa_gcs("tabcontrol",{
	RefreshTabControlTitles: function(profile, data, context) {
		var field_id = aa_text(data,profile,'TabControl',context);
		var tabControl = aad_find_field(field_id)[0];
		if (tabControl && tabControl.jbApiObject)
			tabControl.jbApiObject.refreshTitles();
	}
});

function aa_init_class_TabControl() {
	aa_init_class('TabControl',{
		_ctor: function() {
			var field_data = this.field_data,context = this.context;

			this.tabs = [];
			for(var i=0;i<this.fields.length;i++) {
				var tabField = this.fields[i];
				if (tabField.IsHidden) continue;
				if (tabField.IsFieldHidden && tabField.IsFieldHidden(field_data,context)) continue;
				if (tabField.IsCellHidden && tabField.IsCellHidden(field_data,context)) continue;
					
				var tabInfo = {
					id: tabField.Id,
					text: aa_fieldTitle(tabField ,field_data, context,true),
					image: aa_init_image_object(tabField.TabImage,field_data,context),
					tabField: tabField,
					buildControl: function() {
				    var tab_data = ajaxart_field_calc_field_data(this.tabField,field_data,context);
				    var control = $('<div/>')[0];
				    aa_fieldControl({Field: this.tabField, FieldData: tab_data, Item: field_data, Wrapper: control, Context: context});
				    return control;
					},
					refreshControlOnSelect: this.field.RefreshTabsOnSelect
				};
				if (tabField.ControlInTab) {
					tabInfo.controlInTab = function() {
						return this.tabField.ControlInTab(field_data,context)[0];
					};
				}
				this.tabs.push(tabInfo);
			}
			this.firstSelectedTabIndex = this.field.KeepSelectedTab ? this.field.KeepSelectedTab.get(this.field.Id) : 0;
		},
		selectTab: function(moveTo,tabID) {
			this.el.jbChangeTab(moveTo,tabID);
		},
		onSelectTab: function(selectedTab,previousTab,fromUser) {
			try {
				if (this.field.KeepSelectedTab) { 
					this.field.KeepSelectedTab.set(this.field.Id,selectedTab.index);
				}
			} catch(e) { 
				ajaxart.logException('keep selected tab',e);
			}
			aa_trigger(this.field,'TabControlSelect',{ TabField: selectedTab.tabField, PrevTabField: previousTab && previousTab.tabField, fromUser: fromUser });
		},
		refreshTitles: function() {
			for(var i=0;i<this.tabs.length;i++) {
				var tabField = this.fields[i];
				this.tabs[i].text = aa_fieldTitle(tabField ,this.field_data, this.context,true);
			}
			aa_trigger(this,'refreshTitles');
		}
	});	
}

function aa_tabcontrol(tabcontrol, settings) {
	settings = settings || {};
	settings.tabElement = settings.tabElement || tabcontrol.$el.find('.aatabs_tab');
	settings.tabContents = settings.tabContents || tabcontrol.$el.find('.aatabs_contents');
	settings.tabSettings = settings.tabSettings || function(tab,$tab) {
		return {
			tabTextElement: $tab.find('.aatabs_tab_text'),
			tabImageElement: $tab.find('.aatabs_tab_image'),
			tabIndexElement: $tab.find('.aatabs_tab_index')			
		};
	};
	var tabContents = $(settings.tabContents);
	var tabTemplate = $(settings.tabElement);

	var tabs = tabcontrol.tabs;

	for(var i=0;i<tabs.length;i++) {
		var tabInfo = tabs[i];
		tabInfo.index = i;
		var $tab = tabTemplate.clone().insertBefore(tabTemplate);

		var tabSettings = settings.tabSettings($tab[0],$tab);
		$(tabSettings.tabTextElement).text( tabInfo.text );
		aa_setImage($(tabSettings.tabImageElement),tabInfo.image,true);
		$(tabSettings.tabIndexElement).text(i+1);
		var controlInTab = tabInfo.controlInTab && tabInfo.controlInTab();
		if (controlInTab)
			$(controlInTab).insertAfter(tabSettings.tabTextElement).addClass('aa_tabs_control_in_tab');

		aa_extend($tab[0],{
			jbTabInfo: tabInfo,
			jbTabControl: tabcontrol
		});
		tabInfo.$tabElement = $tab;

		$tab.click(function() {
			if ($(this).hasClass('disabled')) return;
			selectTab(this.jbTabInfo,true);
		});
	}
	tabTemplate.remove();

	var firstSelected = tabcontrol.firstSelectedTabIndex || 0;
	if (!tabs[firstSelected]) firstSelected = 0;

	if (tabs[firstSelected]) {
		selectTab(tabs[firstSelected]);
	}

	setTabContentsSize();

	function selectTab(tabInfo,fromUser) {
		if (!tabInfo) return;
		var currentTabInfo = tabcontrol.el.jbCurrentTabInfo;
		if (currentTabInfo == tabInfo) return;

		if (currentTabInfo && tabcontrol.checkValidationsWhenMovingForward) 
			if ( tabInfo.index > currentTabInfo.index && !aa_checkValidations(currentTabInfo.control) )
				return;

		if (!tabInfo.control || tabInfo.refreshControlOnSelect) {
			aa_remove(tabInfo.control,true);
			tabInfo.control = $(tabInfo.buildControl())[0];
		}

		if (tabcontrol.transition && currentTabInfo) {
			prevTabInfo = currentTabInfo;
			aa_replace_transition({
	            transition: tabcontrol.transition,
	            elOriginal: currentTabInfo.control, 
	            elNew: tabInfo.control,
				removeOriginal: function() { 
					removePrevTab(prevTabInfo);
	            },
	            onTransitionEnd: function() {
					aa_element_attached(tabcontrol.el);	            	
	            }
	        },tabcontrol.context);
		} else {
			if (currentTabInfo) {
				removePrevTab(currentTabInfo);
			}
			aa_empty(tabContents[0],true);
			tabContents[0].appendChild(tabInfo.control);				
		}
		tabcontrol.el.jbCurrentTabInfo = tabInfo;
		tabInfo.$tabElement.addClass('aa_selected_tab');
		tabInfo.$tabElement.parent().children().removeClass('aa_next_to_selected_tab');
		tabInfo.$tabElement.next().addClass('aa_next_to_selected_tab');
		
		if ($(tabInfo.control).hasClass('jbHidden')) {
			$(tabInfo.control).removeClass('jbHidden');
			tabInfo.control.style.display = 'block';
		}
		aa_element_attached(tabcontrol.el);

		if (tabcontrol.onSelectTab) tabcontrol.onSelectTab(tabInfo,currentTabInfo,fromUser);

		refreshEnabledTabs(tabInfo);
	}

	function removePrevTab(tabInfo) {
		if (tabcontrol.keepHiddenTabInTheDOM) {
			tabInfo.control.style.display = 'none';
			$(tabInfo.control).addClass('jbHidden');
		} else {
			aa_remove(tabInfo.control,false);
//			tabInfo.control = null;
		}
		tabInfo.$tabElement.removeClass('aa_selected_tab');
		aa_element_detached(tabInfo.control);		
	}

	function refreshEnabledTabs(currentTabInfo) {
		if (tabcontrol.disableFurtherNextTabs) {
			for(var i=0;i<tabcontrol.tabs.length;i++) {
				if (i <= currentTabInfo.index+1)
					tabcontrol.tabs[i].$tabElement.removeClass('disabled');
				else 
					tabcontrol.tabs[i].$tabElement.addClass('disabled');
			}
		}
	}

	function setTabContentsSize() {
		if (tabcontrol.tabContentsWidth) $(tabContents).width(tabcontrol.tabContentsWidth);
		if (tabcontrol.tabContentsHeight) $(tabContents).height(tabcontrol.tabContentsHeight);
	}

	// jbChangeTab is needed for the ChangeTab operation
	tabcontrol.el.jbChangeTab = function(moveto,tabid) {
			if (moveto == "refresh current tab") selectTab(tabcontrol.el.jbCurrentTabInfo);
			var newTab = null;
			if (moveto == 'first tab' && tabs.length) {
				newTab = tabs[0];
			}
			else if (moveto == 'specific tab') {
				for(var i=0;i<tabs.length;i++) {
					if (tabs[i].id == tabid) {
						newTab = tabs[i];
						break;
					}
				}
			}
			if (moveto == "next tab" || moveto == "previous tab") {
				if (!tabcontrol.el.jbCurrentTabInfo) return;
				var newIndex = tabcontrol.el.jbCurrentTabInfo.index + (moveto == "next tab" ? 1 : -1);
				if (tabs[newIndex]) newTab = tabs[newIndex];
			}
			if (newTab && newTab != tabcontrol.el.jbCurrentTabInfo) selectTab(newTab);
	};

	aa_addOnDetach(tabcontrol.el,function() {
		for(var i=0;i<tabs.length;i++) {
			if (tabs[i].control && tabs[i].$tabElement && !tabs[i].$tabElement.hasClass('aa_selected_tab'))
				aa_empty(tabs[i].control,true);
		}		
	});
}

function aa_tabcontrolAsAccordion(tabcontrol, settings) {
	settings.tabElement = settings.tabElement || tabcontrol.$el.find('.aatabs_tab');
	settings.tabContents = settings.tabContents || tabcontrol.$el.find('.aatabs_contents');
	settings.collapseAnimationTime = settings.collapseAnimationTime || 200;
	settings.expandAnimationTime = settings.expandAnimationTime || 200;

	settings.tabSettings = settings.tabSettings || function(tab,$tab) {
		return {
			tabTextElement: $tab.find('.aatabs_tab_text'),
			tabImageElement: $tab.find('.aatabs_tab_image'),
			tabToggleElement: $tab.find('.aatabs_tab_toggle'),			
			tabCaptionElement: $tab.find('.aatabs_tab_caption'),			
			tabContentsElement: $tab.find('.aatabs_tab_contents')
		};
	};
	var tabTemplate = $(settings.tabElement);

	var tabs = tabcontrol.tabs;
	for(var i=0;i<tabs.length;i++) {
		var tabInfo = tabs[i];
		tabInfo.index = i;
		var $tab = tabTemplate.clone().insertBefore(tabTemplate);

		var tabSettings = settings.tabSettings($tab[0],$tab);
		tabInfo.tabSettings = tabSettings;

		$(tabSettings.tabTextElement).text( tabInfo.text );
		aa_setImage($(tabSettings.tabImageElement),tabInfo.image,true);
		var controlInTab = tabInfo.controlInTab && tabInfo.controlInTab();
		if (controlInTab)
			$(controlInTab).insertAfter(tabSettings.tabTextElement).addClass('aa_tabs_control_in_tab');
		
		aa_extend($tab[0],{
			jbTabInfo: tabInfo,
			jbTabControl: tabcontrol
		});
		tabInfo.$tabElement = $tab;
		$(tabSettings.tabCaptionElement)[0].jbTabInfo = tabInfo;

		$(tabSettings.tabCaptionElement).click(function() {
			toggleTab(this.jbTabInfo);
		});

		if (settings.autoExpand == 'all') expandTab(tabInfo,true);
	}
	tabTemplate.remove();

	var firstSelected = tabcontrol.firstSelectedTabIndex || 0;

	if (tabs[firstSelected] && settings.autoExpand != 'none' && settings.autoExpand != 'all') {
		toggleTab(tabs[firstSelected],true);
	}

	aa_bind(tabcontrol,'refreshTitles',function() {
		for(var i=0;i<tabs.length;i++) {
			var tabInfo = tabs[i];
			var $tab = tabInfo.$tabElement;
			var tabSettings = settings.tabSettings($tab[0],$tab);

			$(tabSettings.tabTextElement).text( tabInfo.text );
			aa_setImage($(tabSettings.tabImageElement),tabInfo.image,true);
		}
	});

	function toggleTab(tabInfo,firstTime) {
		if (!tabInfo) return;
		if (tabInfo.$tabElement.hasClass('expanded')) {
			collapseTab(tabInfo);
			tabcontrol.el.jbCurrentTabInfo = null;
			return;
		}
		var currentTabInfo = tabcontrol.el.jbCurrentTabInfo;
		if (currentTabInfo == tabInfo) return;
		if (currentTabInfo) collapseTab(currentTabInfo);
		expandTab(tabInfo,firstTime);
	}
	function collapseTab(tabInfo) {
		var tabElement = $(tabInfo.tabSettings.tabContentsElement)[0];
		var tabContentsElement = $(tabInfo.tabSettings.tabContentsElement)[0];
		if (settings.doCollapse) {
		 settings.doCollapse( tabInfo.$tabElement );
		} else {
			if (window.aa_intest) 
				$(tabContentsElement).hide();
			else 
				$(tabContentsElement).animate({ height: 'hide'},settings.collapseAnimationTime);
		}
		tabInfo.$tabElement.removeClass('expanded');
	}
	function expandTab(tabInfo,firstTime) {
		if (!tabInfo.control || tabInfo.refreshControlOnSelect) {
			aa_remove(tabInfo.control,true);
			tabInfo.control = $(tabInfo.buildControl())[0];
		}

		var tabElement = $(tabInfo.tabSettings.tabContentsElement)[0];
		if (tabInfo.control.parentNode != tabElement) {
			aa_empty(tabElement,true);
			tabElement.appendChild(tabInfo.control);
			aa_element_attached(tabInfo.control);
		}

		tabInfo.$tabElement.addClass('expanded');
		if (window.aa_intest || firstTime) 
			$(tabElement).show();
		else
			$(tabElement).animate({ height: 'show'},settings.collapseAnimationTime);
		tabcontrol.el.jbCurrentTabInfo = tabInfo;

		if (tabcontrol.onSelectTab) tabcontrol.onSelectTab(tabInfo);	
	}
	// jbChangeTab is needed for the ChangeTab operation
	tabcontrol.el.jbChangeTab = function(moveto,tabid) {
			if (moveto == 'specific tab') {
				for(var i=0;i<tabs.length;i++) {
					if (tabs[i].id == tabid)
						return toggleTab( tabs[i] );
				}
			}
			if (moveto == "refresh current tab") toggleTab(tabcontrol.el.jbCurrentTabInfo);
			if (moveto == "next tab" || moveto == "previous tab") {
				if (!tabcontrol.el.jbCurrentTabInfo) return;
				var newIndex = tabcontrol.el.jbCurrentTabInfo.index + (moveto == "next tab" ? 1 : -1);
				if (tabs[newIndex]) toggleTab(tabs[newIndex]);
			}			
	};
}
