// TODO: make it all function aa_suggestbox_...
ajaxart.suggestbox = {};
ajaxart.contextWithControlToRunOn = function(context,control) {
	  var newContext = ajaxart.clone_context(context);
	  newContext.vars['ControlElement'] = control;
	  return newContext;
	}

ajaxart.suggestbox.attachToTextbox = function(data,profile,context,textbox)
{
  if (data.length == 0) return ;
	  
  ajaxart.suggestbox.setTextBoxValue(data,profile,context,textbox);
  var max = aa_text(data,profile,'MaxItems',context);
  
  jQuery(textbox).addClass('suggestion_box_input');
  
  jQuery(textbox).blur(function(e) {
	  var element = (typeof(e.target)== 'undefined')? e.srcElement : e.target;
	  if (jQuery(element).parents(".suggestionpopup").length > 0 )	// event from the popup
		  return;
//	  ajaxart.suggestbox.setValue(data,profile,context,textbox,false);
	  setTimeout(function() { 
		  ajaxart.suggestbox.setValue(data,profile,context,textbox,false);
	  },300);
  });

  jQuery(textbox).click(function(e) {
	  if (this.value == "")
		  ajaxart.suggestbox.openPopup(data,profile,context,textbox,true);
  });

  jQuery(textbox).focus(function(e) {
	  if (this.value == "") {
		  var options = ajaxart.run(data,profile,'Options',context);
		  if (options.length > 0 && options.length <= max)
			  ajaxart.suggestbox.openPopup(data,profile,context,textbox,true);
	  }
  });
  
  jQuery(textbox).keydown(function(e) {
	  if (e.keyCode == 27) {
		  if ( ajaxart.suggestbox.isPopupOpen()  ) {
			  jQuery(ajaxart.ui.suggestBoxPopup).hide();
			  ajaxart_stop_event_propogation(e);
		  }
	  }
	  if (e.keyCode == 13 && ajaxart.suggestbox.isPopupOpen())
		  ajaxart_stop_event_propogation(e);
  });
  jQuery(textbox).keyup(function(e) {
	  if (e.keyCode == 27) {
		  if ( ajaxart.suggestbox.isPopupOpen()  )
			  ajaxart_stop_event_propogation(e);
		  return;
	  }
	  if (e.keyCode == 9) {
		  ajaxart_stop_event_propogation(e);
		  return;
	  }
	  if (e.keyCode == 13 ) {
		  if (ajaxart.suggestbox.isPopupOpen()) {
			  ajaxart.suggestbox.setValue(data,profile,context,textbox,true);
			  ajaxart_stop_event_propogation(e);
		  }
		  return;
	  }
	  if (e.keyCode == 38 || e.keyCode == 40) { // arrows up/down
		  var jSelected = jQuery(ajaxart.ui.suggestBoxPopup).find('.selected:visible');
		  if (jSelected.length == 0) {
			  if (ajaxart.ui.suggestBoxPopup.allowTextNotInOptions) {
				  var items = jQuery(ajaxart.ui.suggestBoxPopup).find('.suggestion_item');
				  if (items.length > 0) jQuery(items[0]).addClass('selected');
			  }
			  return;
		  }
		  var nextItem = null;
		  if (e.keyCode == 38) {
			  nextItem = jSelected[0].previousSibling;
			  while (nextItem != null && nextItem.style.display == 'none')
				  nextItem = nextItem.previousSibling;
		  }
		  if (e.keyCode == 40) { 
			  nextItem = jSelected[0].nextSibling;
			  while (nextItem != null && nextItem.style.display == 'none')
				  nextItem = nextItem.nextSibling;
		  }
		  if (nextItem != null) {
			  jSelected.removeClass('selected');
			  jQuery(nextItem).addClass('selected');
		  }
		  return;
	  }
	  ajaxart.suggestbox.openPopup(data,profile,context,textbox,false);
  });
}
ajaxart.suggestbox.setValue = function(data,profile,context,textbox,clickOnSelected)
{
	  var allowNotInCombo = aa_bool(data,profile,'AllowTextNotInOptions',context);
	  if (ajaxart.ui.suggestBoxPopupInput != textbox) return;
	  
	  var jPopup = jQuery(ajaxart.ui.suggestBoxPopup);
	  var sel = jPopup.find('.selected:visible');
	  if (sel.length > 0 && sel[0].ajaxart_menu != null && clickOnSelected) {
		  var newContext = ajaxart.clone_context(context);
		  newContext.vars['ControlElement'] = [textbox];
		  newContext.vars['SuggestionBoxText'] = [ textbox.value ];
		  ajaxart.run_xtml_object(data,sel[0].ajaxart_menu['Action'],newContext);
		  return;
	  }
	  var newval = "";
	  if (allowNotInCombo) newval = textbox.value;
	  if (sel.length > 0 && sel[0].ajaxart_menu == null)
		  var newval = sel[0].ajaxart_value;
	  
	  if (textbox.value == "" && !clickOnSelected)
		  newval = "";
	  
	  if (sel.length == 0 && !allowNotInCombo && !clickOnSelected) {
		  ajaxart.suggestbox.setTextBoxValue(data,profile,context,textbox);
		  return;
	  } else if (allowNotInCombo && !clickOnSelected) 
		  newval = textbox.value;
	  else 
		  ajaxart.suggestbox.setTextBoxValue([newval],profile,context,textbox);
	  
	  ajaxart.writevalue(data,[newval]);
	  ajaxart.run(data,profile,'OnUpdate',ajaxart.contextWithControlToRunOn(context,[textbox]));
	  
	  jPopup.hide();
}
ajaxart.suggestbox.setTextBoxValue = function(value,profile,context,textbox)
{
  jQuery(textbox).removeClass('suggetion_text_for_empty');
  
  var label = aa_text(value,profile,'OptionLabelInTextbox',context);
  if (label == "") label = ajaxart.totext(value);
  if (label == "") { 
	  label = aa_text(value,profile,'TextForEmpty',context);
	  if (label != "")
		  jQuery(textbox).addClass('suggetion_text_for_empty');
  }
  if (label.indexOf('_') == 0)
	  label = label.substring(1);
  textbox.value = label;
}
ajaxart.suggestbox.openPopup = function(data,profile,context,textbox,showAll)
{
	  var max =  aa_text(data,profile,'MaxItems',context);

	  var searchAnywhere = true; //aa_bool(value,profile,'SearchAnywhere',context);
	  if (ajaxart.ui.suggestBoxPopupInput != textbox) {
		  var popup = ajaxart.ui.suggestBoxPopup;
		  if(popup != null && popup.parentNode != null)
			  aa_remove(popup,true);
		  
		  ajaxart.ui.suggestBoxPopup = document.createElement('div');
		  jQuery(ajaxart.ui.suggestBoxPopup).addClass('aapopup suggestionpopup');
		  var hasDescription = true, hasImage = true, hasOptionText = false;
		  if (profile.getAttribute('OptionLabel') != null || aa_xpath(profile,'OptionLabel').length > 0)
			  hasOptionText = true;
		  
		  var optionDivs = [];
		  var options = ajaxart.run(data,profile,'Options',context);
		  var hasMore = false;
		  
		  for(var i=0;i<options.length;i++) {
			  var option = options[i];
			  var optionText = "";
			  if (hasOptionText)
				  optionText = aa_text([option],profile,'OptionLabel',context); 
			    else optionText = ajaxart.totext(option);
			  
			  var optionDescription = "",optionImage="";
			  if (hasDescription) optionDescription = aa_text([option],profile,'OptionDescription',context);
			  if (hasImage) optionImage = aa_text([option],profile,'OptionImage',context);
			  
			  var itemDiv = document.createElement('div');
			  jQuery(itemDiv).addClass('suggestion_item');
			  itemDiv.ajaxart_value = option;
			  itemDiv.ajaxart_text = optionText.toLowerCase();
			  var itemText = document.createElement('div'); itemText.innerHTML = optionText; itemDiv.appendChild(itemText);
			  if (hasImage) {
				  itemText.style.backgroundImage = 'url(' + optionImage + ')';
				  jQuery(itemText).addClass('suggestion_withimage');
			  }
			  if (optionDescription != null) {
				  var itemDescDiv = document.createElement('div'); jQuery(itemDescDiv).addClass('suggestion_description'); itemDescDiv.innerHTML = optionDescription; itemDiv.appendChild(itemDescDiv);
			  }
			  ajaxart.ui.suggestBoxPopup.appendChild(itemDiv);
			  optionDivs.push(itemDiv);
			  if (i >= max) { itemDiv.style.display = 'none'; hasMore = true; }
		  }
		  ajaxart.ui.suggestBoxPopup.aaitems = optionDivs;	  
		  
		  var moreDiv = jQuery('<div class="suggestion_item suggestion_menuitem suggestion_more">more</div>')[0];
		  ajaxart.ui.suggestBoxPopup.appendChild(moreDiv);
		  ajaxart.ui.suggestBoxPopup.aamore = moreDiv;
		  
		  ajaxart.ui.suggestBoxPopup.aamore.style.display = (hasMore) ? 'block' : 'none';
		  
		  var menuItems = ajaxart.runsubprofiles(data,profile,'AdditionalMenuItem',context);
		  for(var i=0;i<menuItems.length;i++) {
			  var itemDiv = document.createElement('div');
			  jQuery(itemDiv).addClass('suggestion_item suggestion_menuitem');
			  itemDiv.ajaxart_menu = menuItems[i];
			  var itemText = document.createElement('div'); itemText.innerHTML = ajaxart.totext(itemDiv.ajaxart_menu['Text']); itemDiv.appendChild(itemText);
			  var itemImage = itemDiv.ajaxart_menu['Image'];
			  if (itemImage != null && itemImage != "") {
				  itemText.style.backgroundImage = 'url(' + itemImage + ')';
				  jQuery(itemText).addClass('suggestion_withimage');
			  }
			  ajaxart.ui.suggestBoxPopup.appendChild(itemDiv);
			  ajaxart.ui.suggestBoxPopup.aaitems.push(itemDiv);
		  }

		  ajaxart.ui.suggestBoxPopup.allowTextNotInOptions = aa_bool(data,profile,'AllowTextNotInOptions',context);
		  
		  jQuery(ajaxart.ui.suggestBoxPopup.aaitems).hover(
				    function() { jQuery(this.parentNode).find('.selected:visible').removeClass('selected'); jQuery(this).addClass('selected'); },
				    function() {}
		  );

		  ajaxart.ui.suggestBoxPopupInput = textbox;
		  
		  jQuery(ajaxart.ui.suggestBoxPopup).click(function(event) {
			  var element = (typeof(event.target)== 'undefined')? event.srcElement : event.target;
			  if (!jQuery(element.parentNode).hasClass("suggestion_item") || jQuery(element.parentNode).hasClass("suggestion_more"))
				  return;
			  var jPopup = jQuery(ajaxart.ui.suggestBoxPopup);
			  jPopup.find('.selected').removeClass('selected');
			  jQuery(element).parent().addClass('selected');
			  ajaxart.suggestbox.setValue(data,profile,context,textbox,true);
		  });
		  
		  jQuery('body').append(jQuery(ajaxart.ui.suggestBoxPopup));
	  }
	  var jPopup = jQuery(ajaxart.ui.suggestBoxPopup);
//	  var left = aa_absLeft(textbox);
//	  var top = aa_absTop(textbox) + jQuery(textbox).height()+5;
	  
	  jQuery(ajaxart.ui.suggestBoxPopup).width(jQuery(textbox).width()-5);
	  ajaxart.ui.suggestBoxPopup.style.display = 'block';
	  ajaxart.dialog.positionPopup(jQuery(ajaxart.ui.suggestBoxPopup), textbox);

//	  var width = jQuery(textbox).width()-5;
//	  jPopup.css("left",left).css('top',top).css('min-width',""+width+"px").find('.selected').removeClass('selected');
	  var text = textbox.value.toLowerCase();
	  var count=0; var items = ajaxart.ui.suggestBoxPopup.aaitems; var hasSelected=false; var hasMore = false;
	  if ( ajaxart.ui.suggestBoxPopup.allowTextNotInOptions ) hasSelected = true;
	  
	  for(var i=0;i<items.length;i++) {
		  if (items[i].ajaxart_menu != null) { if (! hasSelected) { jQuery(items[i]).addClass('selected'); hasSelected=true;} continue;  }
		  if (count >=max) { items[i].style.display = 'none'; hasMore = true; }
		  else {
			  var found_at = items[i].ajaxart_text.indexOf(text);
			  var found = (searchAnywhere && found_at != -1) || (!searchAnywhere && found_at == 0);
			  if (!showAll && !found ) items[i].style.display = 'none';
			  else {
				  items[i].style.display = 'block';
				  count++;
				  if (! hasSelected) { jQuery(items[i]).addClass('selected'); hasSelected=true;}
				  else
					  jQuery(items[i]).removeClass('selected');
			  }
		  }
	  }
	  ajaxart.ui.suggestBoxPopup.aamore.style.display = (hasMore) ? 'block' : 'none';
	  if (count == 0)
		  ajaxart.suggestbox.closePopup();
}
ajaxart.suggestbox.closePopup = function()
{
	jQuery(ajaxart.ui.suggestBoxPopup).hide();
}
ajaxart.suggestbox.isPopupOpen = function()
{
	return (ajaxart.ui.suggestBoxPopup != null && jQuery(ajaxart.ui.suggestBoxPopup).css("display") == 'block');
}
ajaxart.customsuggestbox = {};
ajaxart.customsuggestbox.init = function(field,data,profile,context)
{
	aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
		if (ajaxart_field_is_readOnly(ctx.vars._Cntr[0],cell.Field,ctx)) return; 
		var input = jQuery(cell).find('.field_control')[0];
		  input["profile"] = profile;
		  input["context"] = context;
		  input["data"] = field_data;
		  jQuery(input).keypress(function(e) {
			  if (e.charCode == 32 && e.ctrlKey) { // ctrl + space
				  ajaxart.run(data,profile,'OnCtrlSpace',ajaxart.ui.contextWithCurrentControl(context, this)); 
				  return false;
			  }
			  return true;
		  });
		  // dirty
		  jQuery(input).focus(function(e) {
			  if (ajaxart.getVariable(context,"_Context").length == 0 && input["context_calculated"] == null) {
				  var obj = ajaxart.getVariable(context,"_XtmlDt");
				  if (obj == null || obj.length == 0) return;
				  var scriptParam = obj[0]["Context"];
				  ajaxart.setVariable(context,"_Context", ajaxart.runScriptParam(data,scriptParam,aa_ctx(context,{_FieldData: field_data})) );
				  input["context_calculated"] = true;
			  }
		  });
		  jQuery(input).change(function(e) {
			  var prev_value = ajaxart.totext(data);
			  ajaxart.writevalue(data,this.value);
			  ajaxart.run(data,profile,'OnUpdate',ajaxart.ui.contextWithCurrentControl(context, this));
		  });
	});
	aa_field_handler(field,'OnKeydown',function(field,field_data,input,e) {
		  if (e.keyCode == 27) { //escape
			  if ( ajaxart.suggestbox.isPopupOpen()  ) {
				  jQuery(ajaxart.ui.suggestBoxPopup).hide();
				  ajaxart_stop_event_propogation(e);
			  }
		  }
		  if (e.keyCode == 13 && ajaxart.suggestbox.isPopupOpen())
			  ajaxart_stop_event_propogation(e);
	  });
	aa_field_handler(field,'OnKeyup',function(field,field_data,input,e) {
		  if (e.keyCode == 27) {
			  if ( ajaxart.suggestbox.isPopupOpen()  )
				  ajaxart_stop_event_propogation(e);
			  return;
		  }
		  if (e.keyCode == 13) { //enter
			  if ( ajaxart.suggestbox.isPopupOpen()  ) {
				  var selected = jQuery(ajaxart.ui.suggestBoxPopup).find('.selected:visible');
				  if (selected.length > 0) {
					  jQuery(ajaxart.ui.suggestBoxPopup).hide();
					  var textToAdd = selected[0].ajaxart_text;
					  if (input.openedWithTrigger)
					  	  textToAdd = aa_text( [textToAdd], input.triggerProfile, "TextPatternToAdd", input.triggerContext );
					  input.value = input.value + textToAdd;
					  ajaxart.writevalue(field_data,input.value);
					  aa_runMethod([selected[0].ajaxart_value],ajaxart.ui.suggestBoxPopup,"OnSelect",context);
					  input["openedWithTrigger"] = false;
					  ajaxart.run(field_data,profile,'OnAfterTextAdded',ajaxart.ui.contextWithCurrentControl(context, input) );
					  ajaxart.run(field_data,profile,'OnUpdate',ajaxart.ui.contextWithCurrentControl(context, input) );
					  ajaxart_stop_event_propogation(e);
				  }
			  }
			  return;
		  }
		  var prev_value = ajaxart.totext(field_data);
		  ajaxart.writevalue(field_data,input.value);
		  if (prev_value != input.value)
			  ajaxart.run(field_data,profile,'OnUpdate',ajaxart.ui.contextWithCurrentControl(context, input));
		  var lastChar = "";
		  if (e.keyCode == 9)
			  ajaxart_stop_event_propogation(e);
		  else if (e.keyCode == 38 || e.keyCode == 40) { // arrows up/down
			  var jSelected = jQuery(ajaxart.ui.suggestBoxPopup).find('.selected:visible');
			  var nextItem = null;
			  if (e.keyCode == 38)  // up
				  nextItem = jSelected[0].previousSibling;
			  if (e.keyCode == 40)  // arrow down
				  nextItem = jSelected[0].nextSibling;
			  if (nextItem != null) {
				  jSelected.removeClass('selected');
				  jQuery(nextItem).addClass('selected');
			  }
			  ajaxart_stop_event_propogation(e);
		  }
		  else {
			  if (prev_value != input.value && ajaxart.ui.suggestBoxPopup != null) // not for non-function keys like shift
				  jQuery(ajaxart.ui.suggestBoxPopup).hide();
			  var selEnd = input.selectionEnd;
//			  if ((input.value.length == prev_value.length+1 && prev_value == input.value.substring(0,input.value.length-1)) ||  
//					  (input.value.length == prev_value.length-1 && input.value == prev_value.substring(0,prev_value.length-1)) ) {// todo: fix
			  if ( selEnd == null || selEnd == input.value.length ) {	// at end of text or IE and 
				  if (!(e.keyCode == 32 && e.ctrlKey) && e.keyCode != 17 && e.keyCode != 16)  {// not clicking Ctrl+Space or loosing the Ctrl
					  input["openedWithTrigger"] = false;
					  ajaxart.run(field_data,profile,'OnChangeAtEndOfText',ajaxart.ui.contextWithCurrentControl(context,input) );
				  }
			  }
		  }
	  });
}
ajaxart.customsuggestbox.openSuggestionBoxList = function(profile,data,context)
{
	var textbox = ajaxart.getControlElement(context,true);
	if (textbox == null) return [];
	
	  var popup = document.createElement('table');
	  popup.setAttribute("cellpadding","0");
	  popup.setAttribute("cellspacing","0");
	  var halfWrittenPart = aa_text(data,profile,'HalfWrittenPart',context);
	  var halfWrittenAlwaysOnStart = aa_bool(data,profile,'HalfWrittenAlwaysOnStart',context);
	  var filterItemsDifferantThanHalfWrittern = aa_bool(data,profile,'FilterItemsDifferantThanHalfWrittern',context);
	  var halfWrittenPartLower = halfWrittenPart.toLowerCase();
	  aa_addMethod(popup,"OnSelect",profile,"OnSelect",context);
	  var label_compiled = ajaxart.compile(profile,'OptionLabel',context);
	  
	  var options = ajaxart.run(data,profile,'Options',context);
	  var empty = true;
	  for(var i=0;i<options.length;i++) {
		  var option = options[i];
		  var optionText = ajaxart_runcompiled_text(label_compiled, [option], profile, "OptionLabel" ,context);
		  if (optionText.indexOf('__') == 0) continue;
		  if (halfWrittenPart != "" && optionText.indexOf(halfWrittenPart) != 0 && halfWrittenAlwaysOnStart) continue;
		  if (filterItemsDifferantThanHalfWrittern && halfWrittenPart != "" && optionText.toLowerCase().indexOf(halfWrittenPartLower) == -1) continue;
		  if (filterItemsDifferantThanHalfWrittern && halfWrittenPart != "" && optionText.length == halfWrittenPart.length) continue;
		  var optionDescription = aa_text([option],profile,'OptionDescription',context);
		  var optionImage = aa_text([option],profile,'OptionImage',context);
		  var itemDiv = document.createElement('tr');
		  jQuery(itemDiv).addClass('suggestion_item');
		  if (empty) {
			  empty = false;
			  jQuery(itemDiv).addClass('selected');
		  }
		  itemDiv.ajaxart_value = option;
		  itemDiv["ajaxart_text"] = optionText;
		  var td =  document.createElement('td'); itemDiv.appendChild(td); //itemDiv.className="suggestion_item";
		  var itemText;
		  if (halfWrittenPart != "" && halfWrittenAlwaysOnStart) {
			  var halfWrittenSpan = document.createElement('span'); halfWrittenSpan.className="half_written"; jQuery(halfWrittenSpan).text(halfWrittenPart); td.appendChild(halfWrittenSpan);
			  var restText = optionText.substring(halfWrittenPart.length);
			  var rest = document.createElement('span'); jQuery(rest).text(restText ); td.appendChild(rest);
			  rest.className = "suggestion_text";
			  itemText = halfWrittenSpan;
			  itemDiv["ajaxart_text"] = restText;
		  } else if (halfWrittenPart != "" && !halfWrittenAlwaysOnStart) {
			  var index = optionText.toLowerCase().indexOf(halfWrittenPartLower);
			  if (index == -1) {itemText = document.createElement('span'); jQuery(itemText).text(optionText); td.appendChild(itemText); itemText.className = "suggestion_text"; }
			  else {
				  var start = document.createElement('span'); jQuery(start).text(optionText.substring(0,index)); td.appendChild(start);
				  var highlighted_text = optionText.substring(index, index+halfWrittenPart.length);
				  var halfWrittenSpan = document.createElement('span'); halfWrittenSpan.className="half_written"; jQuery(halfWrittenSpan).text(highlighted_text); td.appendChild(halfWrittenSpan);
				  var restText = optionText.substring(index+halfWrittenPart.length);
				  var rest = document.createElement('span'); jQuery(rest).text(restText ); td.appendChild(rest);
				  rest.className = "suggestion_text";
				  itemText = start;
				  itemDiv["ajaxart_text"] = restText;
			  }
		  }	else {
			  itemText = document.createElement('span'); jQuery(itemText).text(optionText); td.appendChild(itemText); itemText.className = "suggestion_text";
		  }
		  if (optionImage != null) {
			  itemText.style.backgroundImage = 'url(' + optionImage + ')';
			  jQuery(itemText).addClass('suggestion_withimage');
		  }
		  if (optionDescription != null) {
			  var itemDescDiv = document.createElement('span'); jQuery(itemDescDiv).addClass('suggestion_description');
			  if (optionDescription.length > 30) optionDescription = optionDescription.substring(0,30)+"..."; 
			  ajaxart_set_text(itemDescDiv,optionDescription); itemDiv.appendChild(itemDescDiv);
			  var td =  document.createElement('td'); td.style.width="100%"; td.appendChild(itemDescDiv); itemDiv.appendChild(td);
		  }
		  popup.appendChild(itemDiv);
		  jQuery(itemDiv).hover(
				    function() { jQuery(this.parentNode).find('.selected:visible').removeClass('selected'); jQuery(this).addClass('selected'); },
				    function() {}
		  );
		  jQuery(itemDiv).click(function(event) {
			  var element = (typeof(event.target)== 'undefined') ? event.srcElement : event.target;
			  var parent = jQuery(element).parents(".suggestion_item");
			  if (parent.length == 0) return;
			  var jPopup = jQuery(ajaxart.ui.suggestBoxPopup);
			  jQuery(ajaxart.ui.suggestBoxPopup).hide();
			  var textToAdd = parent[0].ajaxart_text;
			  if (textbox.openedWithTrigger)
			    textToAdd = aa_text( [textToAdd], textbox.triggerProfile, "TextPatternToAdd", textbox.triggerContext );
			  textbox.value = textbox.value + textToAdd;
			  ajaxart.writevalue(ajaxart.ui.suggestBoxPopup.textbox.ajaxart.data,textbox.value);
			  aa_runMethod([parent[0].ajaxart_value],ajaxart.ui.suggestBoxPopup,"OnSelect",context);
			  textbox["openedWithTrigger"] = false;
			  ajaxart.run(textbox.data,textbox.profile,'OnAfterTextAdded', ajaxart.ui.contextWithCurrentControl(textbox.context,textbox) );
			  ajaxart.run(textbox.data,textbox.profile,'OnUpdate', ajaxart.ui.contextWithCurrentControl(textbox.context,textbox) );
			  ajaxart.ui.suggestBoxPopup.textbox.focus();
		  });
	  }
	  if (!empty)
		  ajaxart.customsuggestbox.openPopup(popup,textbox);
		else
		  if (ajaxart.ui.suggestBoxPopup) jQuery(ajaxart.ui.suggestBoxPopup).hide();
}
ajaxart.customsuggestbox.openSuggestionBoxPopup = function(profile,data,context)
{
	var textbox = ajaxart.getControlElement(context,true);
	if (textbox == null) return [];
	  var control = aa_first(data,profile,'Control',context);
	  if (control != null)
		  ajaxart.customsuggestbox.openPopup(control,textbox);
	  return [];
}
ajaxart.customsuggestbox.openPopup = function(element, textbox)
{
	  var popup = ajaxart.ui.suggestBoxPopup;
	  if (popup != null && popup.parentNode != null)
		  popup.parentNode.removeChild(popup);
	  
	  ajaxart.ui.suggestBoxPopup = element;
	  ajaxart.ui.suggestBoxPopup.textbox = textbox;
	  jQuery(ajaxart.ui.suggestBoxPopup).addClass('aapopup suggestionpopup customsuggestionpopup');
	  
	  var close_button = jQuery('<IMG src="' + aa_base_images() + '/close2.png" class="suggestionpopup_close_button"></IMG>');
	  close_button.click(function(e) {
			ajaxart_stop_event_propogation(e);
			jQuery(ajaxart.ui.suggestBoxPopup).hide();
			textbox.focus();
	  });
	  ajaxart.ui.suggestBoxPopup.appendChild(close_button[0]);

	  jQuery('body').append(jQuery(ajaxart.ui.suggestBoxPopup));
	  var width = jQuery(textbox).width()-5;
	  if (width < 300) width = 300;
	  jQuery(ajaxart.ui.suggestBoxPopup).width(width);
	  ajaxart.ui.suggestBoxPopup.style.display = 'block';
	  ajaxart.dialog.positionPopup(jQuery(ajaxart.ui.suggestBoxPopup), textbox);
//	  var left = aa_absLeft(textbox);
//	  var top = aa_absTop(textbox) + jQuery(textbox).height()+5;
	  
//	  jPopup.css("left",left).css('top',top);//.css('min-width',""+width+"px");
}
ajaxart.customsuggestbox.addTextToSuggestionBox = function(profile, data,context)
{
	var textToAdd = aa_text(data,profile,'Text',context);
	var textbox = ajaxart.getControlElement(context,true);
	if (ajaxart.ui.suggestBoxPopup != null && ajaxart.ui.suggestBoxPopup.textbox != null)
		textbox = ajaxart.ui.suggestBoxPopup.textbox;
    if (textbox.openedWithTrigger)
	  textToAdd = aa_text( [textToAdd], textbox.triggerProfile, "TextPatternToAdd", textbox.triggerContext );
	textbox.value = textbox.value + textToAdd;
	ajaxart.writevalue(textbox.data,textbox.value);
	textbox.focus();
	if (ajaxart.ui.suggestBoxPopup != null)
		jQuery(ajaxart.ui.suggestBoxPopup).hide();
	 textbox["openedWithTrigger"] = false;
	var textboxCtx = textbox.context || textbox.jbContext;
	if ( aa_bool(data,profile,'TriggerOnAfterTextAdded',context) )
		ajaxart.run(textbox.data,textbox.profile,'OnAfterTextAdded', ajaxart.ui.contextWithCurrentControl(textboxCtx,textbox) );
	ajaxart.run(textbox.data,textbox.profile,'OnUpdate', ajaxart.ui.contextWithCurrentControl(textboxCtx,textbox) );
	if ( aa_bool(data,profile,'TriggerPopup',context) )
		ajaxart.run(data,textbox.profile,'OnChangeAtEndOfText', ajaxart.ui.contextWithCurrentControl(textboxCtx,textbox) );
}
ajaxart.customsuggestbox.triggerSuggestionBoxPopup = function(profile, data,context)
{
	var textbox = ajaxart.getControlElement(context,true);
	if (textbox == null) return [];
	var textToSimulate = ajaxart.run(data,profile,'TextToSimulate',context);
	textbox["openedWithTrigger"] = true;
	textbox["triggerProfile"] = profile;
	textbox["triggerContext"] = context;
	ajaxart.run(textToSimulate,textbox.profile,'OnChangeAtEndOfText', ajaxart.ui.contextWithCurrentControl(textbox.context,textbox) );
}
