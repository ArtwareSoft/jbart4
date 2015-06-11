ajaxart.load_plugin("","plugins/jbart/multi_picklist.xtml");

aa_gcs("fld_type",{
  MultiplePicklist: function (profile,data,context)
  {
    var field = context.vars._Field[0];
  
    field.RefreshOptions = function(data1,ctx) {
      field.Options = ajaxart.run(data1,profile,'Options',aa_ctx(context,ctx));
    };
    field.RefreshOptions(data,context);
    field.Style = aa_first(data,profile,'Style',context);
    field.AllowValueNotInOptions = aa_bool(data,profile,'AllowValueNotInOptions',context);
    
    field.Control = function(field_data,ctx) {
      ctx = aa_merge_ctx(context,ctx);
      var mpicklist = aa_initMultiPicklistObject(field,field_data,ctx);
      var out = [aa_renderStyleObject2(field.Style,mpicklist,field_data,field,ctx)];  
      return out;
    };
  }
});

function aa_multi_picklist(mpicklist,settings) {
  settings = aa_defaults(settings,{
    baseElement: mpicklist.$el.firstOfClass('aa_mpicklist_div'),
    itemElement: mpicklist.$el.firstOfClass('aa_mpicklist_item'),
    searchElement: mpicklist.$el.firstOfClass('aa_mpicklist_search'),
    maxItemsToShow: 50,
    popupElement: mpicklist.$el.firstOfClass('aa_mpicklist_popup'),
    popupItemElement: mpicklist.$el.firstOfClass('aa_picklist_item'),
    popupItemSettings: function(itemElement) {
      return {
        itemTextElement: $(itemElement).firstOfClass('aa_picklist_item_text'),
        itemImageElement: $(itemElement).firstOfClass('aa_picklist_item_image')
      };
    },
    itemInnerElements: function(item) {
      return {
        itemTextElement: $(item).firstOfClass('aa_mpicklist_item_text'),
        itemCloseElement: $(item).firstOfClass('aa_mpicklist_item_del')
      }
    } 
  });
  settings.search = settings.search || aa_searchbox_search; // for Compress: aa_searchbox_search()

  var $popupItemParent = $(settings.popupItemElement).parent();
  var $popupItemTemplate = $(settings.popupItemElement).remove();
  var disableSelectionOnHover = false;
  var itemsParent = $(settings.itemElement)[0].parentNode;
  $(settings.itemElement).remove();
  var $input = $(settings.searchElement);
  var searchValue = '';

  initPopup();
  bindInputEvents();
  aa_addOnAttach($input[0],function() { fixInputSize(); });

  refreshPicklistBase();
  dragNDrop();

  function refreshPicklistBase() {
    aa_empty(itemsParent,true);
    var values = mpicklist.getValues();
    for(var i=0;i<values.length;i++) {
       var option = aa_picklist_optionByCode(mpicklist.field.Options,values[i]) || { code: values[i], text: values[i] };
       
       var itemElement = $(settings.itemElement)[0].cloneNode(true);
       itemElement.jbOption = option;
       
       var innerElements = settings.itemInnerElements(itemElement);
       $(innerElements.itemTextElement).html(option.text);
       $(innerElements.itemCloseElement)[0].jbItemElement = itemElement;
       $(innerElements.itemCloseElement).click(function() {
         mpicklist.removeValue(this.jbItemElement.jbOption.code);
         
         aa_remove(this.jbItemElement,true);
         fixInputSize();
       });
       itemsParent.appendChild(itemElement);
    }
    if (ajaxart.isattached($input[0])) fixInputSize();
  }

  function findLastElement() {
    var nodes = itemsParent.childNodes;
    return nodes[nodes.length-1];
  }
  function fixInputSize() {
    setTimeout(function() {
      var totalWidth = $(settings.baseElement).width();
      var lastElement = findLastElement();

      var left =0;
      if (lastElement) 
          left = aa_absLeft(lastElement) + $(lastElement).outerWidth() - aa_absLeft($(settings.baseElement)[0]);

      var newWidth = totalWidth - left;

      if (settings.rtl && lastElement) 
        newWidth = aa_absLeft(lastElement) - aa_absLeft($(settings.baseElement)[0]) - 5;
      
      
      if (newWidth < 10) newWidth = totalWidth;
      $input.width(newWidth-8);
    },ajaxart.isIE ? 300 : 0);
  }

  function initPopup() {
    mpicklist.selectorPopup = aa_createLightPopup({
      el: $(settings.popupElement)[0],
      launchingElement: $(settings.baseElement)[0],
      location:  aa_popupNearLauncherLocation({ minWidthOfLaunchingElement: true }),
      features: [
        aa_popup_feature_closeOnEsc()
      ],
      apiObject: mpicklist,
      type: 'mpicklist',
      popupSettings: {
        closeWhenClickingOutside: 'except launching element',
        reusablePopup: true
      }
    });

    if (aa_isStudioRefreshAndPopupIsOpen('mpicklist',mpicklist)) {
      setTimeout(openPopup,100);
    }

    $(settings.popupNoResultsElement).text(mpicklist.field.TextForNoResults || 'No results match your search');
    $(settings.popupShowAllElement).text(mpicklist.field.TextForShowAll || 'Show All');
  } 

  function syncPopup() {
    if (mpicklist.selectorPopup.isOpen)
      refreshPopupOptions();
    else
      openPopup();
  }

  function openPopup() {
    if (mpicklist.field.OnOpenPopup) {
      mpicklist.field.OnOpenPopup(mpicklist.field_data,mpicklist.context);
    }
    if (mpicklist.field.CustomPopupContents) {
      showPicklistCustomContents();
    } else {
      refreshPopupOptions();
    }
    mpicklist.selectorPopup.show();
  }

  function showPicklistCustomContents() {
    var obj = {
      SelectAndClose: function(data1) {
        var code = aa_totext(data1);
        mpicklist.selectorPopup.close();
        mpicklist.setValue(code);
        refreshPicklistBase();
      }
    };
    aa_empty(mpicklist.selectorPopup.el.firstChild);
    aa_fieldControl({ 
      Field: mpicklist.field.CustomPopupContents, 
      Wrapper: mpicklist.selectorPopup.el.firstChild,
      FieldData: [],
      Context: aa_ctx(mpicklist.context,{ _Picklist: [obj]})
    });
  }
  function bindInputEvents() {
    $input.click(function() {
      if (!ajaxart.isattached(mpicklist.selectorPopup.el)) {
        searchValue = $input.val();
        openPopup();
      } else
        mpicklist.selectorPopup.close();
    });
    $input.focus(function() {
      mpicklist.$el.addClass('aa_focus');
    });
    $input.blur(function() {
      mpicklist.$el.removeClass('aa_focus');
    });
    $input.keydown(function(e) {
      this.jbValueForKeyDown = $(this).val();
      if (e.keyCode == 27 && mpicklist.selectorPopup)  // esc
        mpicklist.selectorPopup.close();
      
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
          selected.nextSibling.scrollIntoView();
          
          return;
        }
      }
      if (e.keyCode == 38) { // arrow up
        var selected = $popupItemParent.find('>.selected')[0];
        if (selected && selected.previousSibling) {
          $(selected).removeClass('selected');
          $(selected.previousSibling).addClass('selected');
          selected.previousSibling.scrollIntoView();
          return;
        }
      }     
    });

    $input.keyup(function(e) {
      if (this.jbValueForKeyDown == $(this).val()) return;
      if (!ajaxart.isattached(mpicklist.selectorPopup.el)) {
        searchValue = $input.val();
        openPopup();
      }     
      refreshPopupOptions();
    });
  }

  function refreshPopupOptions(showAll) {
    while ($popupItemParent[0].firstChild)
      aa_remove($popupItemParent[0].firstChild,true);

    var items = mpicklist.OptionsLeft();
    settings.search($input.val(),items);

    var added = 0;
  if (mpicklist.field.AllowValueNotInOptions && $input.val()) {
      items = items.concat([{ code: $input.val(), text: $input.val(), passed: true }]);
    }

    if (mpicklist.field && mpicklist.field.SortPicklistOptions) 
      items = mpicklist.field.SortPicklistOptions(items,mpicklist.context,picklist);

    for(var i=0;i<items.length;i++) {
      if (!items[i].passed) continue;
      var $item = $popupItemTemplate.clone().appendTo($popupItemParent);
      $item[0].jbItem = items[i];

      var innerSettings = settings.popupItemSettings($item[0]);
      $(innerSettings.itemTextElement).text(items[i].text);
      highlightText($(innerSettings.itemTextElement),$input.val());

      aa_trigger(mpicklist.field,'picklistRenderOption',{ 
        optionTextEl: $(innerSettings.itemTextElement)[0], 
        context: mpicklist.context, 
        option: items[i], 
        picklist: mpicklist
     });

      var imageObject = aa_create_static_image_object(items[i].image);
      if (imageObject && imageObject.url) {
        imageObject.keepImageProportions = imageObject.fillImage = imageObject.centerImage =  true;
        imageObject.height = settings.imageHeight;
        imageObject.width = settings.imageWidth;        
      }
      aa_setImage($(innerSettings.itemImageElement)[0],imageObject);

      try {
        if (settings.onRenderOption) settings.onRenderOption($item[0],items[i]);
      } catch(e) {
        ajaxart.logException('error calling onRenderOption',e);
      }

      if (added === 0) $item.addClass('selected');
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
        if (this == $(settings.popupShowAllElement)[0] || disableSelectionOnHover) return;

        if ( $(this).hasClass('selected') ) return;
        $popupItemParent.children().removeClass('selected');
        $(this).addClass('selected');
    });
    if (!added) {
      $(settings.popupNoResultsElement).appendTo($popupItemParent);
    }
  }

  function selectItem(itemElement) {
    var code = itemElement.jbItem.code;
    mpicklist.selectorPopup.close();
    mpicklist.addValue(code);
    $input.val('');
    refreshPicklistBase();
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

  function makeItemVisible(element,direction) {
    if (!element) return;

    var frame = picklist.selectorPopup.frameElement;
    var top = aa_relTop(element,frame);
    var bottom = top + $(element).outerHeight();
    var scrollY = $(frame).scrollTop();
    var frameHeight = $(frame).height();

    disableSelectionOnHover = true;

    if (direction == 'down') {
      if (bottom > scrollY + frameHeight ) {
        $(frame).scrollTop(bottom-frameHeight);  
      }
    }
    if (direction == 'up') {
      if (top < scrollY) {
        $(frame).scrollTop(top);
      }
    }

    setTimeout(function() {     // to prevent the selection to go to the mouse
      disableSelectionOnHover = false;
    },100);
  }

  function dragNDrop() {
    aa_dragDropItems({
      parent:itemsParent,
      isItemElement: function(elem) { return $(elem).hasClass('aa_mpicklist_item'); },
      moveBefore: function(elem,beforeElem) {
        var code = elem.jbOption.code;
        var beforeCode = beforeElem.jbOption.code;
        mpicklist.removeValue(code,true);
        var values = aa_totext(mpicklist.field_data).split(',');
        var startIndex = values.indexOf(beforeCode);
        if (startIndex<0) startIndex=0;
        values = values.slice(0,startIndex).concat([code]).concat(values.slice(startIndex));

        mpicklist.updateValue(values.join(','));
      },
      moveToEnd: function(elem) {
        var code = elem.jbOption.code;
        mpicklist.removeValue(code,true);
        mpicklist.addValue(code);
      },
      draggedSpaceCssClass: 'draggedItem',
      draggedCssClass: 'draggedItemSpace',
      canStartDrag: function(mouseX,mouseY) {
          return true;
      }     
    });
  }

}


/********************* old **************************/
aa_gcs("multiple_picklist",{
  MultiPicklistBaseArea: function (profile,data,context)
  {
    var field = {
      Id: aa_text(data,profile,'ID',context),
      Title: aa_multilang_text(data,profile,'Title',context),
      Style: aa_first(data,profile,'Style',context),
      MultiPicklistApiObject: aa_first(data,profile,'MultiPicklistApiObject',context)
    };

    field.Control = function(field_data,ctx) {
      var multipicklistBase = aa_initMultiPicklistBaseObject(field,field_data,ctx);
      multipicklistBase.OpenPopup = function() {
        ajaxart.runNativeHelper(data,profile,'OpenPopup',aa_ctx(context,{ _MultiPicklistBase: [multipicklistBase], ControlElement: [this.SearchInput] }));
      }
      multipicklistBase.FilterType = aa_first(data,profile,'SearchFilterType',context);
      
      return [ aa_renderStyleObject(field.Style,multipicklistBase,ctx,true)];
    }
    return [field];
  },
  PicklistSelect: function (profile,data,context)
  {
    var option = aa_first(data,profile,'Option',context);
    var multipicklistBase = context.vars._MultiPicklistBase[0];
    var multiPicklist = multipicklistBase.multiPicklist;
    
    var code = option.code;
    multiPicklist.addValue(code);
    if (multipicklistBase.SearchInput.jbPopup) multipicklistBase.SearchInput.jbPopup.close();

    aa_refresh_cell(multiPicklist.wrapperForStyleByField,context);
  }
});

function aa_initMultiPicklistObject(field,field_data,context)
{
  var multi_picklist = {
    Multiple: true,
    Field: field, FieldData: field_data, data: field_data[0], Context: context,
    getValues: function() {
      return aa_split(aa_totext(field_data),',',true);
    },
    addValue: function(code) {
      var val = aa_totext(field_data);
      if (val) val += ',';
      val += code;

      this.updateValue(val);
    },
    updateValue: function(val,noUpdateEvent) {
      ajaxart.writevalue(field_data,val);
      if (!noUpdateEvent) {
        var content = this.el;
        aa_invoke_field_handlers(field.OnUpdate,content,null,field,field_data,{});
        aa_trigger(field,'update',{ FieldData: field_data, wrapper: content.parentNode });
      }
    },
    removeValue: function(code,noUpdateEvent) {
      var vals = aa_totext( field_data ).split(',');
      for(var i=0;i<vals.length;i++) {
        if (vals[i] == code) {
          vals.splice(i,1);
          break;
        }
      }
      var newval = vals.join(',');
      this.updateValue(newval,noUpdateEvent);
      aa_trigger(this,'removeItem',{ });
    },
    OptionsLeft: function() {
      var values = this.getValues();
      var options = field.Options;
      var optionsLeft = [];
      for(var i=0;i<options.length;i++) {
        var optionCode = options[i].code;
        var added=false;
        for(var j=0;j<values.length;j++)
          if (values[j]==optionCode) added = true;
        if (!added) optionsLeft.push(options[i]);
      }
      return optionsLeft;
    }
  };
  return multi_picklist;
}

function aa_initMultiPicklistBaseObject(field,field_data,context)
{
  var multipicklistBase = {
    Field: field,
    multiPicklist: field.MultiPicklistApiObject,
    context: context,
    SearchValue: '',
    PopupFeatures: [ {
      init: function(popup) {
        multipicklistBase.Popup = popup;
        aa_bind(popup,'show',function() {
          var cntr = multipicklistBase.GetItemListCntr();
          aa_initContainerFilters(cntr);
          cntr.AddFilter({
            Id: 'search',
            FieldData: function(item) { return [item.text]; },
            FilterType: multipicklistBase.FilterType
          });
          
          cntr.RunQuery(multipicklistBase.QueryXml());
        });
      }
    }],
    GetItemListCntr: function() {
      var elem = jQuery(this.Popup.frameElement).find('.fld_Picklist_options')[0];
      return elem.jbContext.vars.ItemListCntr[0];
    },
    SyncPopup: function() {
      if (!this.Popup || !ajaxart.isattached(this.Popup.frameElement)) {
        this.OpenPopup();
      } else {
        // just update the filter
        var cntr = this.GetItemListCntr();
        cntr.RunQuery(this.QueryXml());
      }
    },
    QueryXml: function() {
      var xml = aa_parsexml('<query/>');
      xml.setAttribute('search',this.SearchValue);
      return xml;
    }
  };
  return multipicklistBase;
}

function aa_multipicklistbase(multipicklistBase,settings)
{
  var itemTemplate = settings.itemElement;
  multipicklistBase.jbItemsParent = itemTemplate.parentNode;
  
  var multiPicklist = multipicklistBase.multiPicklist;
  
  var values = multiPicklist.getValues();
  for(var i=0;i<values.length;i++) {
     var option = aa_picklist_optionByCode(multiPicklist.Field.Options,values[i]) || { code: values[i], text: values[i] };
     
     var itemElement = itemTemplate.cloneNode(true);
     itemElement.jbOption = option;
     
     var innerElements = settings.itemInnerElements(itemElement);
     innerElements.itemTextElement.innerHTML = option.text;
     innerElements.itemCloseElement.jbItemElement = itemElement;
     innerElements.itemCloseElement.onclick = function() {
       var itemElement = this.jbItemElement;
       var option = itemElement.jbOption;
       multiPicklist.removeValue(option.code);
       
       aa_remove(itemElement,true);
       fixInputSize();
     }   
     jQuery(itemTemplate).before(itemElement);
  }
  var jInput = jQuery(settings.searchElement);
  multipicklistBase.SearchInput = jInput[0];
  jInput[0].onkeyup = jInput[0].onclick = function() {
    multipicklistBase.SearchValue = jInput.val();
    multipicklistBase.SyncPopup([],multipicklistBase.context);
  }
  aa_remove(itemTemplate,true);

  function findLastElement() {
    var last = null;
    for(var iter=multipicklistBase.jbItemsParent.firstChild;iter;iter=iter.nextSibling) {
      if (iter.jbOption) last = iter;
    }
    return last;
  }
  function fixInputSize() {
    var totalWidth = multipicklistBase.$el.width();
    var lastElement = findLastElement();
    if (lastElement)
      var left = aa_absLeft(lastElement) + jQuery(lastElement).width() - aa_absLeft(multipicklistBase.el);
    else 
      var left = 0;
      
    var padding = (jInput.outerWidth() - jInput.width())*2; 
    jInput.width(totalWidth - left - padding - 5);
  }
  
  aa_addOnAttach(jInput[0],function() {fixInputSize();});
}
function aa_picklist_checkboxes(multi_picklist,settings)
{
  settings = aa_defaults(settings,{
    OptionElement: multi_picklist.$el.find('.aa_option')[0],
    OptionInnerElements: function(optionEl) {
      return {
        CheckBoxElement: jQuery(optionEl).find('.aa_option_checkbox')[0],
        TextElement: jQuery(optionEl).find('.aa_option_text')[0]
      }
    }    
  });
  
  var optionTemplate = settings.OptionElement;
  var templateParent = optionTemplate.parentNode;
  var values = multi_picklist.getValues();  
  var options = multi_picklist.Field.Options;
  for(var i=0;i<options.length;i++) {
    var option = options[i];
    var optionElem = optionTemplate.cloneNode(true);
    var optionSettings = settings.OptionInnerElements(optionElem);
    optionElem.jbOption = option;
    if (optionSettings.TextElement) { 
      optionSettings.TextElement.innerHTML = option.text; 
      optionSettings.TextElement.jbCheckbox = optionSettings.CheckBoxElement; 
      optionSettings.TextElement.jbOption = option;
      optionSettings.TextElement.onclick = function() {
        $(this.jbCheckbox).click();
      };
    }
    if (optionSettings.CheckBoxElement) {
      optionSettings.CheckBoxElement.jbOption = option;
      var checked = false;
      for (var j in values) {
        if (values[j] == option.code)
          checked = true;
      }
      if (checked) 
        optionSettings.CheckBoxElement.checked = true;
      optionSettings.CheckBoxElement.onchange = function() {
        if (this.checked) 
          multi_picklist.addValue(this.jbOption.code);
        else
          multi_picklist.removeValue(this.jbOption.code);
      };
    }   
    $(optionTemplate).before(optionElem);
  } 
  templateParent.removeChild(optionTemplate);
}
