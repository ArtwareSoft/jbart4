function aa_clear_jb_classes(elem)
{
    var classes = elem.className.split(' ');
    for(var i=0;i<classes.length;i++)
   	 if (classes[i].indexOf('jb') == 0) 
   		 jQuery(elem).removeClass(classes[i]);
}


function aa_find_field_controls(settings) 
{
/**
 * Finds field instances in the DOM
 *
 * You can look for the dom instances of a field giving its id and search scope
 * @param settings of javascript object with the following properties:
 *   - fieldID
 *   - scope (can be 'screen','parent','siblings'), default is 'screen' 
 *   - result (can be 'content','wrapper'), default is 'content'
 *   - context
 * @return an array of dom elements
 * @example var myButtonElement = aa_find_field_controls({ fieldId: 'my_button', context: context })[0];
 * 
 * @category General
 */
 	settings.result = settings.result || 'content';
	settings.scope = settings.scope || 'screen';
	
	var top = aa_intest ? aa_intest_topControl : document;
	var ctrls = jQuery(top).find(".fld_" + settings.fieldID);

	var cls = "fld_" + settings.fieldID;
	var ctrls = (settings.scope == 'parent') ? jQuery(top).parents('.'+cls).get() : jQuery(top).find('.'+cls).get();
	if (jQuery(top).hasClass(cls)) ctrls.push(top);
	
	if (settings.result == 'content') return ctrls;
	if (settings.result == 'wrapper') {
		var out = [];
		for(var i=0;i<ctrls.length;i++) {
			var wrapper = ctrls[i].parentNode || ctrls[i];
			out.push(wrapper);
		}
		return out;
	}
}
function aa_refresh_cell(cell,context,transition,moreVars,recreateField)
{
   var td = $(cell).hasClass('aa_cell_element') ? cell : jQuery(cell).parents('.aa_cell_element')[0];
   if (!td) return;

   aa_show(td);
   
   var newContext = td.jbContext || (td.jbApiObject && td.jbApiObject.context);
   if (moreVars) newContext = aa_ctx(newContext,moreVars);

   if (td.Refresh) return td.Refresh();
   var field = td.Field;
   if (!field) return;
   if (recreateField) {
      var xtmlSource = field.XtmlSource[0];
      newContext = xtmlSource.context;
      if (moreVars) newContext = aa_ctx(newContext,moreVars);
      field = aa_first(xtmlSource.input,xtmlSource.script,'',newContext);
   } else if (field.Refresh) field.Refresh([],newContext);

   transition = transition || field.TransitionForRefresh;
   var field_data = td.FieldData;
   var item_data = td.ItemData;
   var parent = jQuery(td).parents('.aa_container')[0];
   var cntr = parent ? parent.Cntr : {}; 
   var scrollPos = {x: window.scrollX, y: window.scrollY};
//   newContext = aa_ctx(context,{_Field: [field], FieldTitle: [field.Title], _Item: item_data, _Cntr: [cntr] });
   field_data = ajaxart_field_calc_field_data(field,item_data,newContext);
   
   if (transition && td.childNodes.length == 1) {
     var oldElem = td.firstChild;
     while (td.firstChild) aa_remove(td.firstChild,true);
     jBart.trigger(td,'cleanWrapper',{});
     if (td.jbRefresh) td.jbRefresh();
     ajaxart_field_createCellControl(item_data,cntr,td,td.CellPresentation,field,field_data,newContext);
     var newElem = td.firstChild;
     td.insertBefore(oldElem,td.firstChild);
     transition.replace(oldElem,newElem,context);
   }
   else {
     aa_empty(td,true);
     aa_clear_jb_classes(td);
     aa_clear_events(td);
     jBart.trigger(td,'cleanWrapper',{});
     if (td.jbRefresh) td.jbRefresh();
     
 	 if (field.AsSection && !field.HideTitle) {
 		var section = jQuery(td).parents('.aa_section')[0];
 		if (!section || !section.parentNode) return;
 		td = section.parentNode;
 		aa_empty(td,true);
	    aa_clear_jb_classes(td);
		td.appendChild(aa_buildSectionControl(cntr,field,field_data,item_data,newContext));
	 } else {
	 	 if (td.jbFrom_aa_fieldControl) {
	 	 	aa_fieldControl({Field: field, Wrapper: td, Item: item_data, FieldData:field_data, Context: newContext });
	 	 } else {
		 	ajaxart_field_createCellControl(item_data,cntr,td,td.CellPresentation,field,field_data,newContext);
		 }
	 }
   }
   aa_element_attached(td);
   window.scrollTo(scrollPos.x,scrollPos.y);
}

function aa_find_field_input(wrapper)
{
  if (!wrapper) return null;
	if (wrapper.tagName.toLowerCase() == 'input') return wrapper;
	return jQuery(wrapper).find('input')[0] || jQuery(wrapper).find('.field_control')[0];
}

// settings contains: Field, Item, Wrapper, FieldData (optional), Context
function aa_fieldControl(settings,runAfterAsyncAction) {
    try {
    var field = settings.Field;
    var wrapper = settings.Wrapper;
    wrapper.jbFrom_aa_fieldControl = true;

    var ctx = aa_ctx(settings.Context, { _Field: [field], Item: settings.Item, Wrapper: [wrapper] });

    if (field.AsyncActionRunner && !runAfterAsyncAction) {
    	return field.AsyncActionRunner(settings);
    }

    var field_data = settings.FieldData;
    if (!field_data) field_data = field.FieldData ? field.FieldData(settings.Item, ctx) : settings.Item;

    for (i in ajaxart.xtmls_to_trace) {  // Tracing field data
        if (ajaxart.xtmls_to_trace.hasOwnProperty(i) && field.XtmlSource[0].script == ajaxart.xtmls_to_trace[i].xtml) {
            ajaxart.xtmls_to_trace[i].fieldData = ajaxart.xtmls_to_trace[i].fieldData || [];
            ajaxart.xtmls_to_trace[i].fieldData = ajaxart.xtmls_to_trace[i].fieldData.concat(field_data);
        }
    }
    
    aa_trigger(field,'ModifyInstanceContext',{ Context: ctx, FieldData: field_data});

    aa_extend(wrapper, {
    	Field: field, FieldData: field_data, 
    	ItemData: settings.Item, jbContext: settings.Context
    })
    jQuery(wrapper).addClass('aa_cell_element');
    var contentCtrl;
    try {
        contentCtrl = field.Control && field.Control(field_data, ctx)[0];
    } catch(e) {
        ajaxart.logException(e);
        contentCtrl = document.createElement("DIV");
    }
    if (contentCtrl) { 
      wrapper.appendChild(contentCtrl);
   	  wrapper.jbControl = contentCtrl;
   	  
      jQuery(contentCtrl).addClass('field_control fld_'+field.Id);
      contentCtrl.jbCell = wrapper;
      contentCtrl.Field = field;
    	
	  jBart.trigger(field,'ModifyControl',{ Wrapper: wrapper, FieldData: field_data, Context: ctx, Item: settings.Item });
      if (field.ModifyControl) { 
	    	for (var i = 0; i < field.ModifyControl.length; i++)
	    		field.ModifyControl[i](wrapper, field_data, 'control', ctx, settings.Item);
	  }
    }

    jBart.trigger(field,'ModifyCell',{ Wrapper: wrapper, FieldData: field_data, Context: ctx, Item: settings.Item });
    if (field.ModifyCell) { 
    	for (var i = 0; i < field.ModifyCell.length; i++)
    		field.ModifyCell[i](wrapper, field_data, 'control', ctx, settings.Item);
    }
    
    if (contentCtrl) aa_element_attached(contentCtrl);

    if (settings.DoAfterShow) settings.DoAfterShow(settings);
    } catch(e) {
        ajaxart.logException('error rendering field ' + (settings.Field && settings.Field.Id),e);
    }   
}
