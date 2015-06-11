ajaxart.load_plugin("", "plugins/control/searchbox.xtml");

aa_gcs("searchbox",{
	SearchBox: function(profile,data,context) {
		aa_init_class_Searchbox();

		var field = aa_create_base_field(data, profile, context);
		var itemDisplayPage = aa_first(data,profile,'ItemDisplayPage',context);

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context, ctx);

			var items = ajaxart.run(field_data,profile,'Items',ctx2);
			var itemObjects = [];
			for(var i=0;i<items.length;i++) {
				var img = aa_first([items[i]],profile,'ItemImage',ctx2);
				if (img) img.StaticUrl = aa_totext(img.Url([items[i]], ctx2));

				itemObjects.push({
					item: [items[i]],
					text: aa_text([items[i]],profile,'ItemText',ctx2),
					extraText: aa_text([items[i]],profile,'ItemExtraText',ctx2),
					image: aa_create_static_image_object(img)
				});
			}

			var searchboxObject = new ajaxart.classes.Searchbox({
				profile: profile,
				field: field,
				field_data: field_data,
				context: ctx2,
				items: itemObjects,
				descriptionForEmptyText: aa_fieldTitle(field,aa_getItemData(ctx), ctx2,true),
				itemDisplayPage: itemDisplayPage
			});

			return [aa_renderStyleObject(field.Style, searchboxObject, ctx2, true)];
		};
		return [field];		
	}
});

function aa_searchbox(searchbox,settings) {
	settings = settings || {};
	settings.inputElement = settings.inputElement || searchbox.$el.firstOfClass('aa_searchbox_input');
	settings.popupElement = settings.popupElement || searchbox.$el.firstOfClass('aa_searchbox_popup');
	settings.popupItemElement = settings.popupItemElement || searchbox.$el.firstOfClass('aa_searchbox_item');	
	settings.popupItemSettings = settings.popupItemSettings || function(itemElement) {
		return {
			itemTextElement: $(itemElement).firstOfClass('aa_searchbox_item_text'),
			itemImageElement: $(itemElement).firstOfClass('aa_searchbox_item_image'),
			itemExtraTextElement: $(itemElement).firstOfClass('aa_searchbox_item_extra_text')
		};
	};
	settings.maxItemsToShow = settings.maxItemsToShow || 20;
	settings.popupShowAllElement = settings.popupShowAllElement || searchbox.$el.firstOfClass('aa_searchbox_show_all');	

	settings.search = settings.search || aa_searchbox_search;	// for Compress: aa_searchbox_search() 

	var $input = $(settings.inputElement);
	var $popupItemParent = $(settings.popupItemElement).parent();
	var $popupItemTemplate = $(settings.popupItemElement).remove();

	$input.attr('placeholder',searchbox.descriptionForEmptyText||'');
	initPopups();
	var items = searchbox.items;

	$input.click(function() {
		if (!ajaxart.isattached(searchbox.selectorPopup.frameElement))
			openPopup();
	});
	$input.keydown(function(e) {
		if (e.keyCode == 13) {
			var selected = $popupItemParent.find('>.selected')[0];
			if (selected) {
				selectItem(selected);
				return;
			}
		}
		if (e.keyCode == 40) { // arrow down
			var selected = $popupItemParent.find('>.selected')[0];
			if (selected && selected.nextSibling) {
				$(selected).removeClass('selected');
				$(selected.nextSibling).addClass('selected');
				makeItemVisible(selected);
				return;
			}
		}
		if (e.keyCode == 38) { // arrow up
			var selected = $popupItemParent.find('>.selected')[0];
			if (selected && selected.previousSibling) {
				$(selected).removeClass('selected');
				$(selected.previousSibling).addClass('selected');
				makeItemVisible(selected);
				return;
			}
		}
		openPopup();
	});

	function initPopups() {
		searchbox.selectorPopup = aa_createLightPopup({
			el: $(settings.popupElement)[0],
			launchingElement: $input[0],
			location: aa_popupNearLauncherLocation({minWidthAsLauncherElement: true}),
			features: [

			],
			apiObject: searchbox,
			type: 'searchbox',
			popupSettings: {
				closeWhenClickingOutside: 'except launching element'
			}
		});

		if (aa_isStudioRefreshAndPopupIsOpen('searchbox',searchbox)) {
			setTimeout(openPopup,100);
		}			
		$(settings.popupShowAllElement).text(searchbox.TextForShowAll || 'Show All');
	}	

	function openPopup() {		
		refreshPopupOptions();
	}
	function refreshPopupOptions(showAll) {
		settings.search($input.val(),items);

		while ($popupItemParent[0].firstChild)
			aa_remove($popupItemParent[0].firstChild,true);

		var added = 0;
		for(var i=0;i<items.length;i++) {
			if (!items[i].passed) continue;
			var $item = $popupItemTemplate.clone().appendTo($popupItemParent);
			$item[0].jbItem = items[i];
			if (! searchbox.injectItemControl($item[0],items[i],$input.val()) ) {
				var innerSettings = settings.popupItemSettings($item[0]);
				$(innerSettings.itemTextElement).text(items[i].text);
				highlightText($(innerSettings.itemTextElement),$input.val());

				$(innerSettings.itemExtraTextElement).text(items[i].extraText);
				highlightText($(innerSettings.itemExtraTextElement),$input.val());

				aa_setImage($(innerSettings.itemImageElement)[0],items[i].image);
			}

			if (added == 0) $item.addClass('selected');
			if (++added >= settings.maxItemsToShow && !showAll) {
				addShowAll();
				break;
			}
		}
		$popupItemParent.children().click(function() {
			if (this == $(settings.popupShowAllElement)[0]) return;
			selectItem(this);
		});
		$popupItemParent.children().mouseover(function() {
			if (this == $(settings.popupShowAllElement)[0]) return;
			if ( $(this).hasClass('selected') ) return;
			$popupItemParent.children().removeClass('selected');
			$(this).addClass('selected');
		});

		searchbox.selectorPopup.show();
	}

	function selectItem(itemElement) {
		searchbox.selectorPopup.close();
		searchbox.onSelect(itemElement.jbItem.item);
		$input.val('');
	}

	function addShowAll() {
		$(settings.popupShowAllElement).appendTo($popupItemParent);
		$(settings.popupShowAllElement).click(function() {
			var lastItem = this.previousSibling && this.previousSibling.jbItem;
			refreshPopupOptions(true);

			var children = $popupItemParent.children();
			for(var i=0;i<children.length;i++)
				if (children[i].jbItem == lastItem) {
					if (children[i].tabIndex == -1) children[i].tabIndex = 0;
					children[i].focus();
					children[i].tabIndex = -1;
				}
		});
	}

	function highlightText($elem,searchtext) {
		$elem.html( ajaxart_field_highlight_text($elem.text(),searchtext,'.aa_highlight') );
	}
}

function aa_init_class_Searchbox() {
	
	if (ajaxart.classes.Searchbox) return;

	ajaxart.classes.Searchbox = function(settings) {
		aa_extend(this, settings);
	};
	ajaxart.classes.Searchbox.prototype.onSelect = function(item) {
		ajaxart.run(item,this.profile,'OnSelect',this.context);
	};
	ajaxart.classes.Searchbox.prototype.getItemControl = function(item) {
		ajaxart.run(item,this.profile,'OnSelect',this.context);
	};
	ajaxart.classes.Searchbox.prototype.injectItemControl = function(parentDiv,item) {
		if (!this.itemDisplayPage) return false;
		$(parentDiv).children().remove();
		aa_fieldControl({ Field: this.itemDisplayPage, FieldData: item.item, Wrapper: parentDiv, Context: this.context });
		return true;
	}
}

function aa_searchbox_search(searchtext,items) {
	searchtext = searchtext.toLowerCase();
	for(var i=0;i<items.length;i++) {
		var item = items[i];
		if (!searchtext) {
			item.passed=true;
			continue;
		}
		var text = item.extraText ? item.text + '  ' + item.extraText : item.text;
		
		if (!item.searchCache) item.searchCache = (text).toLowerCase();

		if (item.searchCache.indexOf(searchtext) > -1) {
			item.passed=true;
			continue;
		}
		item.passed = false;
	}
}

// TODO in searchbox:
// 2. Add (+) icon
// 4. better looking scrollbar
// 5. show all
// 6. search algorithm generic (with tests) - also sort results
