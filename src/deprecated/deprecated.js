ajaxart.load_plugin("", "plugins/deprecated/deprecated.xtml");
ajaxart.load_plugin("headerfooter","plugins/ui/headerfooter.xtml");
ajaxart.load_plugin("bart", "plugins/bart/bart.xtml");

aa_gcs("uiaction",{
   SetTextSelectionOld: function(profile, data, context)
   {
	   var input = ajaxart.getControlElement(context,true);
	   var start = aa_int(data,profile,'SelectionStart',context);
	   var end = aa_int(data,profile,'SelectionEnd',context);
	   if (input == null) return [];

	   aa_defineElemProperties(input,'selectionStart,selectionEnd');
	   input.focus();
	   setTimeout(function() {
	       if (input.selectionStart === undefined) {   // Internet Explorer
	           var inputRange = input.createTextRange ();
	           inputRange.moveStart ("character", start);
	           inputRange.collapse ();
	    	   if (! isNaN(end))
	    		   inputRange.moveEnd ("character", end-start);
	    	   else
	    		   inputRange.moveEnd ("character", input.value.length-start);
	           inputRange.select ();
	       }
	       else {      // Firefox, Opera, Google Chrome and Safari
		    	   if (start && !isNaN(start))
		    		   input.selectionStart = start;
		    	   if (end && !isNaN(end))
		    		   input.selectionEnd = end;
	       }
	   },ajaxart.isFireFox ? 100 : 1);
       return [];
   }
});

aa_gcs("uiaspect",{
	  DeleteOnHover: function (profile,data,context)
	  {
		var aspect = {};
		aspect.InitializeElements = function(data1,ctx) {
			var cntr = ctx.vars._Cntr[0];
			if (cntr.ReadOnly) return;
			var delClass = 'aa_delete_hover';
			var delImage = aa_text(data,profile,'DeleteImage',context);
			cntr.HoverRightMargin = aa_int(data,profile,'RightMargin',context);
			cntr.HoverTopMargin = aa_int(data,profile,'TopMargin',context);
			
			var hoverClass = aa_attach_global_css('#this { position: relative; } #this>.aa_delete_hover { display: none; }');
			var hoverShowClass = aa_attach_global_css('#this:hover .aa_delete_hover { display: inline-block; }');
			
			var elems = ctx.vars._Elems;
			for(var i=0;i<elems.length;i++) {
				var jElem = $(elems[i]);
				var delDiv = jElem[0].jbDeleteDiv = $('<div/>').css('position','absolute')
					.css('right',cntr.HoverRightMargin+'px').css('top',cntr.HoverTopMargin+'px').addClass(delClass)[0];
				
				delDiv.jbElem = jElem[0];
				delDiv.style.background = "url(" + delImage + ') no-repeat';
				delDiv.onclick = function() {
					var itemData = this.jbElem.ItemData;
					var ctx2 = aa_ctx(aa_merge_ctx(context,ctx),{_ElemsOfOperation: [this.jbElem],_ItemsOfOperation: itemData });
					ajaxart.runNativeHelper(itemData,profile,'Delete',ctx2);
				}
				
				if (jElem[0].tagName.toLowerCase() == 'tr') {
				  var tds = jElem.children('td').get();
				  if (tds.length) tds[tds.length-1].appendChild(delDiv);
				}
				else 
					jElem[0].appendChild(delDiv);
				
				$(delDiv.parentNode).addClass(hoverClass);
				jElem.addClass(hoverShowClass);
			}
		};
		return [aspect];
	  },
		TreeDragAndDrop: function (profile,data,context)
		  {
			var aspect = { isObject : true };
			var initializeContainer = function(initData,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
				var top_cntr = ajaxart_topCntr($(cntr.Ctrl));
				
				cntr.TreeDrag = function(e) {
					var cntr = ctx.vars._Cntr[0];
					var top_cntr = ajaxart_topCntr($(cntr.Ctrl));
					var top_cntr_list = ajaxart_find_aa_list(top_cntr);
					var mousepos = aa_mousePos(e);
					if (top_cntr.SuspectItemDrag != null)
					{
						var distance = Math.abs(mousepos.y - top_cntr.SuspectItemDrag.mousePos.y);
						if (distance < 5) return aa_stop_prop(e);
						var elem = top_cntr.SuspectItemDrag.elem;
						if (! elem.hasClass('aa_item'))
							elem = elem.parents('.aa_item').slice(0,1);
						var cntr_ctrl = elem.parents('.aa_container')[0];
						if (cntr_ctrl == null) return aa_stop_prop(e);

						cntr.TreeDragBegin(e);
						top_cntr.SuspectItemDrag = null;
					}
			
					if (top_cntr.draggedElem == null) return true;
					var table = top_cntr_list;
					var actualY = mousepos.y;
					if (cntr.isFixedPosition) actualY -= window.pageYOffset;
					
					// keep drag in container boundaries
					
					var nearest = { distance: 1000};
					if (!top_cntr.SpaceElem.Positioned) // first time only. look for nearest place holder
					{
						// look for place holder near
						var holders = $(top_cntr.Ctrl).find('.aa_move_place_holder').filter(function() {return $(this).parents(':hidden').length == 0} );
						for(var i=0;i<holders.length;i++) {
							var distance = Math.abs(aa_absTop(holders[i]) - actualY);
							if (nearest.distance > distance) nearest = { distance: distance, holder: holders[i]};
						}
						if (nearest.holder) {
							nearest.holder.appendChild(top_cntr.SpaceElem);
							top_cntr.SpaceElem.Positioned = true;
						}
						else {
							ajaxart.log('Can not find nearest place holder');
							cntr.TreeDragEnd({},true);
							return;
						}
					}


					var holder = top_cntr.SpaceElem.parentNode;
					if (!holder) return;
					// calc next up & down
					var pre_holder = holder.PreHolder;
					while ($(pre_holder).parents(':hidden').length > 0)
						pre_holder = pre_holder.PreHolder;
					var next_holder = holder.NextHolder;
					while ($(next_holder).parents(':hidden').length > 0)
						next_holder = next_holder.NextHolder;

					// go up or down or stay in place
					var draggedElemTop = aa_absTop(top_cntr.draggedElem,false); 
					var draggedElemBottom = aa_absTop(top_cntr.draggedElem,false) + $(top_cntr.draggedElem).height();
					
					if (pre_holder && aa_absTop(pre_holder,false) > draggedElemTop )
						pre_holder.appendChild(top_cntr.SpaceElem);
					if (next_holder && aa_absTop(next_holder,false) < draggedElemBottom )
						next_holder.appendChild(top_cntr.SpaceElem);
					
					top_cntr.draggedElem.style.top = actualY - aa_absTop(top_cntr_list,false) + 'px';
					var left = aa_absLeft(top_cntr.SpaceElem,false);
					if ( aa_is_rtl(top_cntr.Ctrl) )
						left = left + $(top_cntr.SpaceElem).width() - $(top_cntr.draggedElem).width();  
					top_cntr.draggedElem.style.left = left - aa_absLeft(top_cntr_list,false) + 'px';
					return aa_stop_prop(e);
				};
			 
				cntr.TreeDragEnd = function(e, cancel) {
					var cntr = ctx.vars._Cntr[0];
		  	    	var top_cntr = ajaxart_topCntr($(cntr.Ctrl));
		  	    	var top_cntr_list = ajaxart_find_aa_list(top_cntr);
		  	    	
		  	    	if (cancel)
		  	    	{
		  	    		$(top_cntr.OriginalElem).show();
		  	    	}
		  	    	else
		  	    	{

						if (top_cntr.SpaceElem.parentNode)
							top_cntr.SpaceElem.parentNode.dragEnd(top_cntr.OriginalElem);		  	    		
		  	    		top_cntr.OriginalElem = null;
		  	    	}

					top_cntr_list.onmousemove = top_cntr.onmousemoveOrig;
					top_cntr_list.onmousedown = top_cntr.onmousedownOrig;
					top_cntr_list.onmouseup = top_cntr.onmouseupOrig;
				    top_cntr_list.style.position = top_cntr_list.PrevPosition;
					document.onmouseup = null;
					document.onkeydown = null;
					top_cntr.draggedElem = null;

					$(document).find('.aa_move_place_holder').remove();
					$(document).find('.aa_dragged_elem').remove();
					
				  	ajaxart_restoreSelection(document.body);
				  	top_cntr.DAndDOwner = "";
				  	aa_invoke_cntr_handlers(cntr,cntr.ContainerChange,[],ctx);
					return aa_stop_prop(e);
				};
		 
				cntr.TreeDragBegin = function(e,simulate) {
					var cntr = ctx.vars._Cntr[0];
					var top_cntr = ajaxart_topCntr($(cntr.Ctrl));
					var top_cntr_list = ajaxart_find_aa_list(top_cntr);
					cntr.isFixedPosition = aa_hasPositionFixedParent(top_cntr_list);

				    var elem = top_cntr.SuspectItemDrag.elem;
		  		    if (elem.hasClass("aa_item"))
		  		    	var item_elem = elem;
		  		    else
		  		    	var item_elem = elem.parents('.aa_item').slice(0,1);
		  		    
		  		    if (item_elem.length == 0) return aa_stop_prop(e);
					var posx = aa_absLeft(item_elem[0],false) - aa_absLeft(top_cntr_list,false);
					var posy = aa_absTop(item_elem[0],false) - aa_absTop(top_cntr_list,false);
					// do not drag root item, if there is one root
					var root = !item_elem.parent().hasClass('aa_treenode');
					if (root && item_elem.parent().children().length == 1)
						return aa_stop_prop(e);
		  		    
		  		    top_cntr.DAndDOwner = "TreeDragAndDrop";
				    ajaxart_disableSelection(document.body);
					var dragged_data_items = [aa_dataitems_of_elem(item_elem)];

					var fixHitArea = function(list,originalList)
					{
						var elem = $(list).parents('.aa_item')[0];
						
						if ($(list).children('.aa_item').length > 0 && $(elem).children('.hitarea').length == 0 )
						{
							$(elem).addClass('non_leaf');
							elem.collapsed = false;
							
							var hitarea = document.createElement('div');
							hitarea.className = "hitarea collapsable " + cntr.hitAreaCssClass;
							elem.insertBefore(hitarea,elem.firstChild);
						}
						if (originalList && $(originalList).children('.aa_item').length == 0)
							$(originalList).parent().children('.hitarea').remove();
					}

					var addPlaceHolders = function(list,at_elem,last_element)
					{
						var dropped_cntr = $(list).hasClass('aa_container') ? list.Cntr : $(list).parents('.aa_container')[0].Cntr;
						var dropped_items = aa_dataitems_of_elem(at_elem || list);
						var can_paste = aa_runMethod(dragged_data_items,dropped_items,'CanPasteFromDataItems',ctx);
						if (can_paste.length == 0 || can_paste[0] != 'true') return;
						var place_holder = document.createElement('div');
						place_holder.className = 'aa_move_place_holder';

						if (last_element)
							cntr.insertNewElement(place_holder,list);
						else
							$(place_holder).insertBefore(at_elem);

						place_holder.dragEnd = function(original)
						{
							var originalList = $(original).parents('ul').slice(0,1)[0];
							var item_data = top_cntr.draggedElem.ItemData;
							var parentElem = $(this).parents('.aa_item')[0];
							var cntr = $(this).parents('.aa_container')[0].Cntr;
							var dropped_items = aa_dataitems_of_elem(this);
							if (last_element)
							{
								aa_runMethod(item_data,dropped_items,'MoveToEnd',dropped_items.MoveToEnd.context);
							}
							else
							{
				  				var move_params = { isObject: true, Item: item_data, BeforeItem: at_elem.ItemData };
								aa_runMethod([move_params],dropped_items,'MoveBefore',dropped_items.MoveBefore.context);
							}
							// fix UI
							//var new_element = ajaxart_uiaspects_addElement(item_data,cntr,parentElem);
							//if (!last_element)
							//	$(this).replaceWith(new_element);
							$(this).replaceWith(original);
							original.style.display = '';
							original.display = '';
							
							fixHitArea(list,originalList);

							aa_first([],profile, 'OnDrop', aa_ctx(context, {_DND_DroppedItems: [dropped_items], _DND_OriginalItems: [aa_dataitems_of_elem(originalList)] } ));
						}
					}
					
					var oElem = top_cntr.draggedElem = item_elem[0].cloneNode(true);
				    top_cntr.SpaceElem = item_elem[0].cloneNode(true);
				    top_cntr.OriginalElem = item_elem[0];
				    top_cntr.draggedElem.ItemData = top_cntr.SpaceElem.ItemData = item_elem[0].ItemData;
				    
				    top_cntr.OriginalElem.style.display = 'none';
				    top_cntr.OriginalElem.display = 'none';

					$(top_cntr.draggedElem).addClass('aa_dragged_elem');
					$(top_cntr.SpaceElem).addClass('aa_dragged_space_elem');
				    ajaxart_disableSelection(top_cntr.SpaceElem);
				    ajaxart_disableSelection(top_cntr.draggedElem);

				    var top_cntr_list = aa_find_list(top_cntr);
				    top_cntr_list.appendChild(top_cntr.draggedElem);
				    top_cntr_list.PrevPosition = top_cntr_list.style.position;
				    top_cntr_list.style.position = 'relative';	// locating relative to tree top to solve scrolling issues
					
					var all_items = $(top_cntr.Ctrl).find('.aa_item');
					for(var i=0;i<all_items.length;i++)
					{
						var item = all_items[i];
						var jitem = $(item);
						if (jitem.hasClass('aa_dragged_elem') || jitem.parents('.aa_dragged_elem').length > 0) continue;
						var list = jitem.parents('.aa_list')[0];
						if (list == null) continue;
						addPlaceHolders(list,item,false);
						if (jitem.next().length == 0)
							addPlaceHolders(list,item,true);
					}	
					// add to empty lists!
					var empty_lists = $(top_cntr.Ctrl).find('.aa_list').filter(function() { 
						return $(this).find('.aa_item').length == 0 && ! $(this).hasClass('aa_dragged_space_elem') && $(this).find('.aa_dragged_space_elem').length == 0 ;
					} );
					for(var i=0;i<empty_lists.length;i++)
						addPlaceHolders(empty_lists[i],null,true);
					
					// link place holders
					var holders = $(top_cntr.Ctrl).find('.aa_move_place_holder');
					for(var i=0;i<holders.length;i++)
					{
						holders[i].PreHolder = i > 0 ? holders[i-1] : null;
						holders[i].NextHolder = i < holders.length-1 ? holders[i+1] : null;
					}
					top_cntr.draggedElemToMove = item_elem;
					top_cntr.draggedElemToMove.hide();
					var mousepos = top_cntr.SuspectItemDrag.mousePos;
					
					
					top_cntr.draggedElem.style.position = 'absolute';
					top_cntr.draggedElem.style.left = posx + 'px';
					top_cntr.draggedElem.style.top = posy + 'px';

					if (!simulate) // simulate
					{
						document.onmouseup = ctx.vars._Cntr[0].TreeDragEnd;
						top_cntr.onkeydownOrig = document.onkeydown; 
						document.onkeydown = function(e)
						{
							if (e.keyCode == 27) 
							ctx.vars._Cntr[0].TreeDragEnd(e,true);
							return true;
						}
					}
					
					return aa_stop_prop(e);
				};

				var suspectDrag = function(e) {
					var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );
					if (elem.hasClass('hitarea')) return true;
					
					var cntr = ctx.vars._Cntr[0];
		  	    	var top_cntr = ajaxart_topCntr($(cntr.Ctrl));
		  	    	var top_cntr_list = ajaxart_find_aa_list(top_cntr);

		  	    	if (top_cntr.DAndDOwner != "") return true;
					var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );  
					if (elem.parents('thead').length > 0) return true;
					top_cntr.SuspectItemDrag = { elem: elem, mousePos : aa_mousePos(e)};
					top_cntr.onmousemoveOrig = top_cntr_list.onmousemove;
					top_cntr.onmouseupOrig = top_cntr_list.onmouseup;
					top_cntr.onmousedownOrig = top_cntr_list.onmousedown;
					top_cntr_list.onmousemove = cntr.TreeDrag;
					return false;
				}

				var unSuspectDrag = function(e) {
					var cntr = ctx.vars._Cntr[0];
		  	    	var top_cntr = ajaxart_topCntr($(cntr.Ctrl));
		  	    	var top_cntr_list = ajaxart_find_aa_list(top_cntr);

					if (top_cntr.DAndDOwner != "") return true;
					if (top_cntr.SuspectItemDrag != null)
					{
						top_cntr.SuspectItemDrag = null;
						top_cntr_list.onmousemove = top_cntr.onmousemoveOrig;
						top_cntr_list.onmouseup = top_cntr.onmouseupOrig;
					}
					return true;
				}

				var cntr = ctx.vars._Cntr[0];
	  	    	var top_cntr = ajaxart_topCntr($(cntr.Ctrl)) || cntr;
	  	    	var top_cntr_list = ajaxart_find_aa_list(top_cntr);

	  	    	top_cntr.draggedElem = null;
	  	    	top_cntr.DAndDOwner = "";
				//aa_bind_ui_event(top_cntr_list,'mousedown',suspectDrag);
	  	    	top_cntr_list.onmousedown = suspectDrag;
				aa_bind_ui_event(top_cntr_list,'mouseup',unSuspectDrag);
			}
			ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
			return [aspect];
		  },
		  DragAndDropItems: function (profile,data,context)
		  {
			var aspect = { isObject : true };
			var initializeContainer = function(initData,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
			    var list = aa_find_list(cntr);
				cntr.draggedElem = null;
				cntr.DAndDOwner = "";
				aa_bind_ui_event(list,'mousedown',suspectDrag);
				aa_bind_ui_event(list,'mouseup',unSuspectDrag);
				
				function depthFirstLists(elem) {
					var result = [];
					$(elem).find('>*').each(function() { result = result.concat(depthFirstLists(this)); } );
					if ($(elem).hasClass('aa_list')) result.push(elem);
					return result;
				}
				function allElems() {
					var result = [];
					var lists = depthFirstLists(cntr.Ctrl);
					for(var i=0;i<lists.length;i++) {
						var inner_cntr = $(lists[i]).parents('.aa_container')[0].Cntr;
						if (inner_cntr.Items[0].CanPasteFromDataItems && inner_cntr.Items[0].CanPasteFromDataItems(cntr.Items)[0] == 'true')
							result = result.concat($(lists[i]).find('>.aa_item').get());
					}
					return result;
				}
				function drag(e) {
				    var list = aa_find_list(cntr);
					var mousepos = aa_mousePos(e);
					var mouseTop = mousepos.y - aa_absTop(list);
					var mouseLeft = mousepos.x - aa_absLeft(list);

					function inElem(elem,top,left) {
						return (elem.offsetTop < top && elem.offsetLeft < left && 
								elem.offsetTop + elem.offsetHeight > top && elem.offsetLeft + elem.offsetWidth > left); 
					}
					function elemAtPosition(top,left) {
						for(var i=0;i<cntr.elems4drag.length;i++)
							if (inElem(cntr.elems4drag[i],top,left)) return cntr.elems4drag[i];
					}
					function numbersBetween(num,num1,num2) {
						return ((num1 <= num && num <= num2) || (num2 <= num && num <= num1)); 
					}
					function elemsBetween(elem1,elem2) {
						for(var i=0;i<cntr.elems4drag.length;i++) {
							var elem = cntr.elems4drag[i];
							if (elem == elem1 || elem == elem2) return null;
							if (numbersBetween(elem.offsetTop,elem1.offsetTop,elem2.offsetTop) && numbersBetween(elem.offsetLeft,elem1.offsetLeft,elem2.offsetLeft)) {
								return elem;
							}
						}
					}
					if (cntr.SuspectItemDrag != null)
					{
						var distance = Math.abs(mousepos.y - cntr.SuspectItemDrag.mousePos.y) + Math.abs(mousepos.x - cntr.SuspectItemDrag.mousePos.x);
						if (distance < 5) return aa_stop_prop(e);
						cntr.elems4drag = cntr.elems4drag || allElems();
						var elemAtMousePos = elemAtPosition(mouseTop,mouseLeft);
						if (! elemAtMousePos)
							unSuspectDrag();
						else
							dragBegin(elemAtMousePos,e);
						cntr.SuspectItemDrag = null;
						return true;
					}
					if (cntr.draggedElem == null) return true;
					var elemAtMousePos = elemAtPosition(mouseTop,mouseLeft);

					// move dragged elem
					var draggedElem = cntr.draggedElem;
					draggedElem.style.top = (mouseTop - draggedElem.initialMouseOffset.top)  + 'px'; 
					draggedElem.style.left = (mouseLeft - draggedElem.initialMouseOffset.left)  + 'px';
					if (elemAtMousePos == cntr.spaceElem) return aa_stop_prop(e);

					// element nearest to space elem
					var candidate = elemAtMousePos;
					if (!candidate) return aa_stop_prop(e); // can be fixed so the external elem will be the candidate
					while (true) {
						var closer_element = elemsBetween(candidate,cntr.spaceElem);
						if (!closer_element) break;
						candidate = closer_element;
					}

					var margin = 3;
					if (candidate.offsetLeft <= cntr.spaceElem.offsetLeft && candidate.offsetLeft + margin > cntr.draggedElem.offsetLeft) // left to us - insert before
						list.insertBefore(cntr.spaceElem,candidate);
					else if (candidate.offsetLeft >= cntr.spaceElem.offsetLeft && candidate.offsetLeft + candidate.offsetWidth - margin > cntr.draggedElem.offsetLeft && candidate.nextSibling) // right to us - insert after 
						list.insertBefore(cntr.spaceElem,candidate.nextSibling);

					return aa_stop_prop(e);
				}
				function dragEnd(e,cancel) {
				    var list = aa_find_list(cntr);
					list.removeChild(cntr.draggedElem);
					if (! cancel)
						$(cntr.spaceElem).replaceWith(cntr.OriginalElem);
					else
						list.removeChild(cntr.spaceElem);
					cntr.OriginalElem.style.display = '';
					cntr.OriginalElem.display = '';
					

					list.onmousemove = cntr.onmousemoveOrig;
					list.style.position = cntr.listOriginalPosition;
					document.onkeydown = cntr.onkeydownOrig;
					document.onmouseup = null;
					cntr.draggedElem = null;
					cntr.elems4drag = null;
					
					if ($(cntr.OriginalElem).nextAll('.aa_item').length == 0)
						aa_runMethod(cntr.OriginalElem.ItemData,cntr.Items[0],'MoveToEnd',cntr.Items[0].MoveToEnd.context);
					else
					{
		  				var move_params = { isObject: true, 
		  						Item: cntr.OriginalElem.ItemData, 
		  						BeforeItem: $(cntr.OriginalElem).nextAll('.aa_item')[0].ItemData 
		  				}
		  				aa_runMethod([move_params],cntr.Items[0],'MoveBefore',cntr.Items[0].MoveBefore.context);
					}
				  	aa_first([cntr],profile, 'OnDrop', ctx);
				  	aa_invoke_cntr_handlers(cntr,cntr.ContainerChange,[],ctx);
				  	
		  		    cntr.DAndDOwner = "";
					return aa_stop_prop(e);
				}
				function dragBegin(item_elem,e) {
				    var list = $(item_elem).parents('.aa_list')[0];
		  		    //if (!cntr.Items[0].MoveBefore) return aa_stop_prop(e);
		  		    cntr.DAndDOwner = "DragAndDropItems";
				    var posx = aa_absLeft(item_elem);
					var posy = aa_absTop(item_elem);

					cntr.draggedElem = item_elem.cloneNode(true);
					cntr.OriginalElem = item_elem;
					list.appendChild(cntr.draggedElem);
					cntr.spaceElem = item_elem.cloneNode(true);
					list.insertBefore(cntr.spaceElem,cntr.OriginalElem);
					
					cntr.draggedElem.ItemData = cntr.spaceElem.ItemData = item_elem.ItemData;
					cntr.OriginalElem.style.display = 'none';
					cntr.OriginalElem.display = 'none';

					$(cntr.draggedElem).addClass('aa_dragged_elem1');
					$(cntr.spaceElem).addClass('aa_dragged_space_elem1');
					
					cntr.draggedElem.style.position = 'absolute';
					
					var mousepos = cntr.SuspectItemDrag.mousePos;
					cntr.draggedElem.initialMouseOffset = { top: mousepos.y - posy, left: mousepos.x - posx } ;
					cntr.draggedElem.style.left = posx + 'px';
					cntr.draggedElem.style.top = posy + 'px';

					document.onmouseup = dragEnd;
					cntr.onkeydownOrig = document.onkeydown; 
					document.onkeydown = function(e)
					{
						if (e.keyCode == 27) 
							dragEnd(e,true);
						return true;
					}
					
					return aa_stop_prop(e);
				}

				function suspectDrag(e) {
				    var list = aa_find_list(cntr);
					if (cntr.DAndDOwner != "") return true;
					cntr.listOriginalPosition = list.style.position;
					list.style.position = 'relative';
				    ajaxart_disableSelection(cntr.Ctrl);
					
					cntr.SuspectItemDrag = { mousePos : aa_mousePos(e), time: new Date().getTime()};
					cntr.onmousemoveOrig = list.onmousemove;
					list.onmousemove = drag;
					return true;
				}

				function unSuspectDrag(e) {
				    var list = aa_find_list(cntr);
					if (cntr.DAndDOwner != "") return true;
				  	ajaxart_restoreSelection(cntr.Ctrl);
					if (cntr.SuspectItemDrag != null)
					{
						cntr.SuspectItemDrag = null;
						list.onmousemove = cntr.onmousemoveOrig;
						list.style.position = cntr.listOriginalPosition;
					}
					return true;
				}
			}
			ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
			return [aspect];
		  },
		  DragAndDropMover: function (profile,data,context)
		  {
			var aspect = { isObject : true };
			var initializeContainer = function(initData,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
				cntr.draggedElem = null;
				cntr.DAndDOwner = "";
				
				var _drag = function(e) {
					var cntr = ctx.vars._Cntr[0];
					var mousepos = aa_mousePos(e);
					if (cntr.SuspectItemDrag != null)
					{
						var distance = Math.abs(mousepos.y - cntr.SuspectItemDrag.mousePos.y);
						if (distance < 5) return aa_stop_prop(e);
						if (new Date().getTime() - cntr.SuspectItemDrag.time > 1000) // if old drag suspension cancel it
							unSuspectDrag();
						else
							_dragBegin(e);
						cntr.SuspectItemDrag = null;
					}
					var oElem = cntr.draggedElem;
			
					if (oElem == null) return true;
					var table = aa_find_list(cntr);
					var actualY = mousepos.y - oElem.mouseY;
					var table_top = aa_absTop(table,false);
					var table_bottom = aa_absTop(table,false) + $(table).height();
					if ( actualY < table_top  || actualY > table_bottom ) 
						return true;
					
					oElem.style.top = actualY + 'px'; 
			 
					var spaceTop = aa_absTop(cntr.spaceElem,false);
					if (mousepos.y - spaceTop  < 3)
						if (cntr.spaceElem.previousSibling != null)
							cntr.draggedParent.insertBefore(cntr.spaceElem,cntr.spaceElem.previousSibling);
					if ((spaceTop + cntr.spaceElem.offsetHeight) - mousepos.y < -5)
						if (cntr.spaceElem.nextSibling.nextSibling != null)
							cntr.draggedParent.insertBefore(cntr.spaceElem,cntr.spaceElem.nextSibling.nextSibling);

					return aa_stop_prop(e);
				};

				var _dragEnd = function(e,cancel) {
					var cntr = ctx.vars._Cntr[0];
					cntr.draggedParent.removeChild(cntr.draggedElem);
					if (! cancel)
						$(cntr.spaceElem).replaceWith(cntr.OriginalElem);
					else
						cntr.draggedParent.removeChild(cntr.spaceElem);
					cntr.OriginalElem.style.display = '';
					cntr.OriginalElem.display = '';

					cntr.Ctrl.onmousemove = cntr.onmousemoveOrig;
					document.onkeydown = cntr.onkeydownOrig;
					document.onmouseup = null;
					cntr.draggedElem = null;
					
					if ($(cntr.OriginalElem).nextAll('.aa_item').length == 0)
						aa_runMethod(cntr.OriginalElem.ItemData,cntr.Items[0],'MoveToEnd',cntr.Items[0].MoveToEnd.context);
					else
					{
		  				var move_params = { isObject : true };
		  				move_params.Item = cntr.OriginalElem.ItemData;
		  				move_params.BeforeItem = $(cntr.OriginalElem).nextAll('.aa_item')[0].ItemData;
		  				
		  				aa_runMethod([move_params],cntr.Items[0],'MoveBefore',cntr.Items[0].MoveBefore.context);
					}
				  	aa_first([cntr],profile, 'OnDrop', ctx);
				  	aa_invoke_cntr_handlers(cntr,cntr.ContainerChange,[],ctx);
				  	
				  	ajaxart_restoreSelection(cntr.Ctrl);
		  		    cntr.DAndDOwner = "";

					return aa_stop_prop(e);
				};
		 
				var _dragBegin = function(e) {
					var cntr = ctx.vars._Cntr[0];
				    var elem = cntr.SuspectItemDrag.elem;
		  		    if (elem.hasClass("aa_item"))
		  		    	var item_elem = elem;
		  		    else
		  		    	var item_elem = elem.parents('.aa_item').slice(0,1);
		  		    if (item_elem.length == 0) return aa_stop_prop(e);
					
		  		    if (cntr.ReadOnly || !cntr.Items[0].MoveBefore) return aa_stop_prop(e);
		  		    
		  		    cntr.DAndDOwner = "DragAndDropMover";

				    ajaxart_disableSelection(cntr.Ctrl);

				    var top_cntr_list = aa_find_list(cntr);
				    var posx = aa_absLeft(item_elem[0],false);
					var posy = aa_absTop(item_elem[0],false);

					cntr.draggedElem = item_elem[0].cloneNode(true);
					cntr.OriginalElem = item_elem[0];
					cntr.draggedParent = item_elem[0].parentNode; 
					cntr.draggedParent.appendChild(cntr.draggedElem);
					cntr.spaceElem = item_elem[0].cloneNode(true);
					cntr.draggedParent.insertBefore(cntr.spaceElem,cntr.OriginalElem);
					
					cntr.draggedElem.ItemData = cntr.spaceElem.ItemData = item_elem[0].ItemData;
					cntr.OriginalElem.style.display = 'none';
					cntr.OriginalElem.display = 'none';

					$(cntr.draggedElem).addClass('aa_dragged_elem');
					$(cntr.spaceElem).addClass('aa_dragged_space_elem');
					
					var mousepos = cntr.SuspectItemDrag.mousePos;
					
					var tds = $(cntr.draggedElem).find('td');
					for(var i=0;i<tds.length;i++)
						$(tds[i]).width($(tds[i]).width());

					cntr.draggedElem.style.position = 'absolute';
					if ($(cntr.Ctrl).parents('.aa_dlg').length > 0)
						cntr.draggedElem.style.position = 'fixed';
					
					cntr.draggedElem.style.left = posx + 'px';
					cntr.draggedElem.style.top = posy + 'px';
					cntr.draggedElem.mouseY = mousepos.y - posy;

					document.onmouseup = _dragEnd;
					cntr.onkeydownOrig = document.onkeydown; 
					document.onkeydown = function(e)
					{
						if (e.keyCode == 27) 
							_dragEnd(e,true);
						return true;
					}
					
					return aa_stop_prop(e);
				};

				var suspectDrag = function(e) {
					var cntr = ctx.vars._Cntr[0];
					if (cntr.DAndDOwner != "") return true;
					var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );  
					if (elem.parents('thead').length > 0) return true;
					// ensure (1) it is an elem (2) not elem of inner cntr
					if (elem.hasClass('aa_item')) 
						var inner_cntr = elem.parents('.aa_container')[0];
					else
						var inner_cntr = elem.parents('.aa_item').parents('.aa_container')[0];
					if (inner_cntr == null || inner_cntr.Cntr != cntr) return true;
					var table = aa_find_list(cntr);
					// no inplace item-details allowed
					if ( $(table).find('>.detailsInplace_tr').length > 0) return;
					
					cntr.SuspectItemDrag = { elem: elem, mousePos : aa_mousePos(e), time: new Date().getTime()};
					cntr.onmousemoveOrig = cntr.Ctrl.onmousemove;
					cntr.Ctrl.onmousemove = _drag;
					return true;
				}

				var unSuspectDrag = function(e) {
					var cntr = ctx.vars._Cntr[0];
					if (cntr.DAndDOwner != "") return true;
					if (cntr.SuspectItemDrag != null)
					{
						cntr.SuspectItemDrag = null;
						cntr.Ctrl.onmousemove = cntr.onmousemoveOrig;
					}
					return true;
				}

				cntr.DAndDOwner = "";
				aa_bind_ui_event(cntr.Ctrl,'mousedown',suspectDrag);
				aa_bind_ui_event(cntr.Ctrl,'mouseup',unSuspectDrag);
			}
			ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
			return [aspect];
		  }
});
aa_gcs("cntr", {
	SelectedItem: function(profile, data, context)
	{
	  var cntr = aa_first(data,profile,'Cntr',context);
	  if (cntr && cntr.Ctrl) {
		  var item = $(cntr.Ctrl).find('.aa_selected_item')[0];
		  if (item && item.ItemData) return item.ItemData; 
	  }
	},
	ItemDataFromElement: function(profile, data, context)
	{
		var elem = aa_first(data,profile,'Element',context);
		if (elem && elem.ItemData) return elem.ItemData;
	},
	RefreshSelectedTextAndImage: function(profile, data, context)
	{
		var cntr = aa_first(data,profile,'Cntr',context);
		var elem = cntr && $(cntr.Ctrl).find(".aa_selected_item")[0];
		if (cntr && elem)
		  aa_invoke_cntr_handlers(cntr,cntr.RefreshItemTextAndImage,[elem],cntr.Context);
	},
	ParentItemElement: function(profile, data, context) 
	{
		var items = $(context.vars.ControlElement).parents('.aa_item');
		if (items.length > 0) return [items[0]];
	}
});


aa_gcs("field", {
	OptionsFilter: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		
		if (field == null) return [];

		field.SelectedList = "";
		field.FilterControl = function(filter_context)
		{
			var newContext = aa_ctx(filter_context,{_Field: [this]} );
			var ctrl = ajaxart.runNativeHelper(filter_context.vars.FilterData,profile,'Control',newContext);
			$(ctrl).find('.aa_filter_input').addClass('aa_filter_' + this.Id);
			return ctrl;
		};
		field.newFilter = function(initialFilterData)
		{
			var field = this;
			return {
				isObject: true,
				filterData: ajaxart.totext_array(initialFilterData),
				SetFilterData: function(filterData) { this.filterData = ajaxart.totext_array(filterData); },
				ToSQLText: function(rawData) { return ajaxart.totext_array(rawData) },
				PrepareElemCache: function(field,wrapper)
				{
				  var item_txt = wrapper[field.Id];
				  //if (item_txt == '') item_txt = 'no value';

				  wrapper["__FilterCache_" + field.Id] = "," + item_txt + ",";
				  if (field.OptionCategories)
					  if (field.Multiple)
					  {
						  var items = item_txt.split(',');
						  for(var i=0;i<items.length;i++)
							  wrapper["__FilterCache_" + field.Id] += field.OptionCategories[items[i]];
					  }
					  else
						  wrapper["__FilterCache_" + field.Id] += field.OptionCategories[item_txt];
				},
				Match: function(field,wrapper)
				{
					if (this.filterData == "") return true;
					var cache = wrapper["__FilterCache_" + field.Id];
					if (!cache && this.PrepareElemCache) {
						this.PrepareElemCache(field,wrapper);
						cache = wrapper["__FilterCache_" + field.Id];
					}
					if (!cache) { ajaxart.log("no cache preparation for filter of " + field.Id,"error"); return false; }
					result = false;
					var options= this.filterData.split(',');
					for(var i=0;i<options.length;i++)
						if (cache.indexOf("," + options[i] + ",") != -1)
							result = true;
					return result;
				}
			};
		};
		return [];
	},	
	RefreshFilteredItems: function(profile,data,context)
	{
		var cntr = (context.vars.HeaderFooterCntr || context.vars._Cntr)[0];
		if (cntr == null) return;
		if (!cntr.DelayedFiltering)
			aa_recalc_filters_and_refresh(cntr,context.vars._Item,aa_ctx(context, {_Cntr:[cntr]}));
		var field = context.vars._Field[0];
		var filters = cntr.DataHolder && cntr.DataHolder.UserDataView && cntr.DataHolder.UserDataView.Filters;
		for(var i in filters)
			if (filters[i].field.Id == field.Id)
				ajaxart_setUiPref(cntr.ID[0],'Filter_Field_' + field.Id,ajaxart.totext_array(filters[i].rawFilterData),context);
		return [];
	},
	TextFilter: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];

		field.FilterControl = function(filter_context)
		{
			var newContext = aa_ctx(filter_context,{_Field: [this] } );
			var ctrl = ajaxart.runNativeHelper(filter_context.vars.FilterData,profile,'Control',newContext);
			$(ctrl).find('.aa_filter_input').addClass('aa_filter_' + this.Id);
			return ctrl;
		};
		
		field.newFilter = aa_create_text_filter(aa_bool(data,profile,'MatchOnlyTextBeginning'));
	},
	NumberFilter: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];

		field.FilterControl = function(filter_context)
		{
			var newContext = aa_ctx(filter_context,{_Field: [this] } );
			var ctrl = ajaxart.runNativeHelper(filter_context.vars.FilterData,profile,'Control',newContext);
			$(ctrl).find('.aa_filter_input').addClass('aa_filter_' + this.Id);
			return ctrl;
		}
		field.newFilter = function(initialFilterData)
		{
			var CompileFilterData = function(filter_data)
			{
				var result = [];
				var filter_txt = aa_totext(filter_data).replace(/[ ]*-[ ]*/,'-');
				var groups_txt = filter_txt.split(',');
				for(var i in groups_txt)
					if (groups_txt[i] != '')
					{
						var range;
						if (groups_txt[i][0] == '<' && groups_txt[i][1] == '=') 
							range = { 
								from: -2147483648,
								to: parseFloat(groups_txt[i].split('<=').pop()),
								match: function(num) { return this.to >= num }
							}
						else if (groups_txt[i][0] == '<') 
							range = { 
								from: -2147483648,
								to: parseFloat(groups_txt[i].split('<').pop()),
								match: function(num) { return this.to > num }
							}
						else if (groups_txt[i][0] == '>' && groups_txt[i][1] == '=') 
							range = { 
								to: 2147483647,
								from: parseFloat(groups_txt[i].split('>=').pop()),
								match: function(num) { return this.from <= num }
							}
						else if (groups_txt[i][0] == '>') 
							range = { 
								to: 2147483647,
								from: parseFloat(groups_txt[i].split('>').pop()),
								match: function(num) { return this.from < num }
							}
						else
						{
							var fromTo = groups_txt[i].split('-');
							var range = { 
								from: parseFloat(fromTo[0]), 
								match: function(num) { return this.from <= num && this.to >= num }
							}
							if (fromTo[1] == null)
								range.to = range.from;
							else
								range.to = parseFloat(fromTo[1]);
						}
						if (isNaN(range.from))
							range.from = -2147483648;
						if (isNaN(range.to))
							range.to = 2147483647;
						
						result.push(range);
					}
				return result;
			}
			return	{
				filterData: CompileFilterData(initialFilterData),
				SetFilterData: function(filterData) { this.filterData = CompileFilterData(filterData); }, 
				ToSQLText: function(rawData) { return ajaxart.totext_array(rawData) },
				Match: function(field,wrapper)
				{
					if (this.filterData.length == 0) return true;
					for(var i in this.filterData)
					{
						var result = this.filterData[i].match(wrapper[field.Id]);
						if (result) return true;
					}
					return false;
				}
			}
		}
		return [];
	},
	Field: function (profile,data,context) // GC of field.Field
	{
		var field = { isObject : true};
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		field.Title = aa_multilang_text(data,profile,'Title',context);
		field.ReadOnlyText = aa_bool(data,profile,'ReadOnlyText',context);

		var dataAttr = profile.getAttribute('FieldData'); 
		if (!field.ReadOnlyText && dataAttr && dataAttr.indexOf('%') == -1) field.ReadOnlyText = true;
		
		if (field.ReadOnlyText) {
			field.ReadOnly = true;
			field.FieldData = function(item,ctx) { ctx = ctx || {}; return ajaxart_multilang_run(item,profile,'FieldData',aa_merge_ctx(context,ctx)); }
		}
		else {
			if (dataAttr && dataAttr != '') {
				var isPath = /^%.*%$/.test(dataAttr);
				if (!isPath) field.ReadOnly = true;
				if (isPath && dataAttr.charAt(1) != '!') // always add !
					profile.setAttribute('FieldData','%!' + dataAttr.substring(1));
			}
			aa_setMethod(field,'FieldData',profile,'FieldData',context);
		}
		
		var ctx = aa_ctx(context,{_Field: [field]} );
		field.TypeStyle = aa_first(data,profile,'Type',ctx);
		if (field.TypeStyle && field.TypeStyle.IsTriplet) {
			aa_add_field_type_triplet(field,field.TypeStyle,data,context); // FIX: should be for simple text field only!!
		}
		ajaxart.runsubprofiles(data,profile,'FieldAspect',ctx);
		
		if (field.DefaultValue || field.ForceCData) {	// we need to change the FieldData function
			field.FieldData = function(data1,ctx)
			{
				var out = ajaxart.run(data1,profile,'FieldData',aa_merge_ctx(context,ctx));
				if ( aa_totext(out) == '' && this.DefaultValue)
					ajaxart.writevalue(out,this.DefaultValue(data1,ctx),true);
				
				if (this.ForceCData && out[0].nodeType == 1) {
					var currentValue = aa_totext(out);
					for(var iter=out[0].firstChild;iter;iter=iter.nextSibling) {
						if (iter.nodeType == 4) return out; // we already have cdata. nothing to change
					}
					
					while (out[0].firstChild) out[0].removeChild(out[0].firstChild); // empty
					out[0].appendChild(out[0].ownerDocument.createCDATASection(currentValue)); // add cdata
				}
				
				return out;
			}
		}
		// TODO: add compile_text and put it in ItemToText
		return [field];
	},
	FilterField: function (profile,data,context) 
	{
		var field = { isObject : true};
		field.Id = aa_text(data,profile,'ID',context);
		field.ID = [field.Id];
		field.Title = aa_multilang_text(data,profile,'Title',context);

		var baseFieldID = field.FilterBaseFieldID = aa_text(data,profile,'BasedOn',context);
		field.FieldData = function(data1,ctx) {
		  return aa_xpath(data1[0],'@'+baseFieldID,true);
		}
		
		var ctx = aa_ctx(context,{_Field: [field]} );
		field.TypeStyle = aa_first(data,profile,'Type',ctx);
		if (field.TypeStyle && field.TypeStyle.IsTriplet) {
			aa_add_field_type_triplet(field,field.TypeStyle,data,context);
		}
		ajaxart.runsubprofiles(data,profile,'FieldAspect',ctx);
		
		if (field.DefaultValue) {	// we need to change the FieldData function
			field.FieldData = function(data1,ctx)
			{
				var out = ajaxart.run(data1,profile,'FieldData',aa_merge_ctx(context,ctx));
				if ( aa_totext(out) == '' )
					ajaxart.writevalue(out,this.DefaultValue(data1,ctx),true);
				return out;
			}
		}
		return [field];
	},
	XmlField: function (profile,data,context)
	{
		var field = { isObject : true};
		var path = aa_text(data,profile,'Path',context);
		field.Id = aa_text(data,profile,'ID',context);
		if (field.Id == '') 
			field.Id = path.split('@').pop();
		field.ID = [field.Id];
		field.Title = aa_multilang_text(data,profile,'Title',context);
		if (aa_paramExists(profile,'Title')) {
		  field.RecalcTitle = function(item,ctx) {
			this.Title = aa_multilang_text(item,profile,'Title',context);
		  }
		}
		field.Path = path;
		ajaxart_field_fix_title(field,path,context);
		
		var isAttribute= /^@[\w]*$/.test(path);
		
		if (path == "") 
			field.FieldData = function(data1) { return data1;}
		else
			aa_set_fielddata_method(field,path);
		
		var newContext = aa_ctx(context,{_Field: [field]} );
		ajaxart.run(data,profile,'Type',newContext);
		ajaxart.runsubprofiles(data,profile,'FieldAspect',newContext);
		ajaxart.run(data,profile,'Multiple',newContext);
		if (isAttribute)
			field.ItemToText = function(att) { return function(item) { 
				if (!item.nodeType) return item[att] || '';
				return item.getAttribute(att) || ''; 
			} } (path.substring(1));
			
			return [field];
	},
	XmlGroup: function (profile,data,context)
	{
		var out = ajaxart.gcs.field.XmlField(profile,data,context);
		var field = out[0];
		field.IsGroup = true;
		field.HideTitle = aa_bool(data,profile,'HideTitle',context);
		field.Path = aa_text(data,profile,'Path',context);
		if (aa_text(data,profile,'Path',context) == "") {
			field.IsVirtualGroup = true;
//			var id = aa_text(data,profile,'ID',context);
//			field.Id = id;
//			field.ID = [id];
			field.FieldData = function(data1) { return data1; }
		}
		field.Fields = ajaxart.runsubprofiles(data,profile,'Field',context);
		
		field.Control = function(data1,ctx) {
			var field = this;
			var cntr = ctx.vars._Cntr[0] || {};
			var parentItems = cntr.Items || [];
			var newContext = aa_merge_ctx(context,ctx);
			var id = aa_totext(cntr.ID) + '_' + field.Path;
			var dataitems = [{ isObject: true , Items: data1 }];
			if (field.HeaderFooter && ctx.vars.DataHolderCntr) dataitems = ctx.vars.DataHolderCntr[0].Items; 
			
			var operationsFunc = function(field) { return function(data2,ctx2) { 
				field.Operations = ajaxart.run(data1,profile,'Operations',aa_merge_ctx(context,ctx2));  
				return field.Operations;
			}} 
			var aspectsFunc = function(field) { return function(data2,ctx2) {
				if (field.Aspects) return field.Aspects;	// reuse the apsects (e.g. when using uiaspect.List with group inside)
				
				var newContext = aa_merge_ctx(context,ctx2);
				field.Aspects = ajaxart.run(data,profile,'Presentation',newContext);
				var aspect = {isObject:true}
				aa_set_initialize_container(aspect,function(aspect,ctx2,cntr) {
					if (ctx.vars._Cntr && ctx.vars._Cntr[0].ReadOnly) cntr.ReadOnly = true;
					if (aa_text(data,profile,'Path',context) == "")
					  cntr.IsVirtualGroup = true;
				});
				field.Aspects.push(aspect);
				ajaxart.concat(field.Aspects,ajaxart.runsubprofiles(data,profile,'Aspect',newContext));
				for(var i=0;i<field.Fields.length;i++)
				  if (field.Fields[i].CntrAspects)
					  field.Aspects = field.Aspects.concat(field.Fields[i].CntrAspects);
				
				return field.Aspects;
			}} 
	
			var out = aa_uidocument(data1,id,dataitems,field.Fields,aspectsFunc(field),operationsFunc(field),newContext);
			out.Field = field;
			if (field.IsGroup) $(out).addClass('aa_layoutgroup');
			return [out];
		}
		field.ItemDetailsControl = field.Control; // ???
		
		var newContext = aa_ctx(context,{_Field: [field]} );
		ajaxart.runsubprofiles(data,profile,'FieldAspect',newContext);
		
		multipleItems_func = function(data1,ctx) {
			return ajaxart.runNativeHelper(data1,profile,'MultipleItems',aa_merge_ctx(context,ctx));
		}; 
		aa_addMethod_js(field,'MultipleItems',multipleItems_func,context);
		return out;
	},
	Group: function (profile,data,context)  // GC of field.Group
	{
		var out = ajaxart.gcs.field.XmlField(profile,data,context);
		var field = out[0];
		field.IsGroup = true;
		field.HideTitle = aa_bool(data,profile,'HideTitle',context);
		field.CalcFieldsInAdvance = aa_bool(data,profile,'CalcFieldsInAdvance',context);
		field.Fields = (field.CalcFieldsInAdvance) ? ajaxart.runsubprofiles(data,profile,'Field',context) : [];
		field.GroupData = aa_first(data,profile,'GroupData',context);
		if (field.GroupData) {
			field.FieldData = function(data1,ctx) { 
				return this.GroupData.FieldData(data1,ctx) 
			} 
		} else
			field.IsGroupOnlyForLayout = true;
		field.Control = function(data1,ctx) {
			var field = this;
			if (! field.CalcFieldsInAdvance && field.Fields.length == 0)
				field.Fields = ajaxart.runsubprofiles(data,profile,'Field',aa_ctx(context,ctx));
			
			var cntr = (ctx.vars._Cntr && ctx.vars._Cntr[0]) || {};
			var parentItems = cntr.Items || [];
			var newContext = aa_merge_ctx(context,ctx);
			var id = aa_totext(cntr.ID) + '_' + field.Id;
			
			var dataitems = null;
			if (field.GroupData) dataitems = field.GroupData.DataItems(data1,newContext)[0]; 
			if (!dataitems) dataitems = { isObject: true, Items: data1 };
			
			var operationsFunc = function() { return []; }
			var aspectsFunc = function(field) { return function(data2,ctx2) {
				if (field.Aspects) return field.Aspects;	// reuse the apsects (e.g. when using uiaspect.List with group inside)
				
				var newContext = aa_merge_ctx(context,ctx2);
				field.Aspects = ajaxart.run(data,profile,'Layout',newContext);
				var aspect = {isObject:true}
				aa_set_initialize_container(aspect,function(aspect,ctx2,cntr) {
					if (ctx.vars._Cntr && ctx.vars._Cntr[0].ReadOnly) cntr.ReadOnly = true;
				});
				field.Aspects.push(aspect);
				ajaxart.concat(field.Aspects,ajaxart.runsubprofiles(data,profile,'Aspect',newContext));
				for(var i=0;i<field.Fields.length;i++)
					if (field.Fields[i].CntrAspects)
						field.Aspects = field.Aspects.concat(field.Fields[i].CntrAspects);
				
				return field.Aspects;
			}} 
			
			var out = aa_uidocument(data1,id,[dataitems],field.Fields,aspectsFunc(field),operationsFunc,newContext);
//			ajaxart.databind([out],data,newContext,profile,data);
			out.Field = field;
			if (field.IsGroup) $(out).addClass('aa_layoutgroup');
			return [out];
		}
		field.ItemDetailsControl = field.Control; // ???
		
		var newContext = aa_ctx(context,{_Field: [field]} );
		ajaxart.runsubprofiles(data,profile,'FieldAspect',newContext);
		return out;
	},
	SimpleXmlFields: function (profile,data,context)
	{
		var paths = aa_text(data,profile,'Paths',context);
		var paths_arr = paths.split(',');
		var fields = [];
		for(var i=0;i<paths_arr.length;i++) {
			var path = paths_arr[i];
			var field = { isObject : true, Id: path.split('@').pop(), Path: path };
			field.ID = [field.Id];
			ajaxart_field_fix_title(field,path,context);
			
			var myFunc = function(path) { return function(data,context) {
				if (data.length == 0) return [];
				return aa_xpath(data[0],path,true);
			} };
			ajaxart_addScriptParam_js(field,'FieldData',myFunc(path),context );
			fields.push(field);
		}

		return fields;
	},
	ShowFieldControl: function (profile,data,context)
	{
		var item = ajaxart.run(data,profile,'Item',context);
		//var cntr = aa_first(data,profile,'Cntr',context) || (context.vars._Cntr != null) ? context.vars._Cntr[0] : null;
		//var newContext = context;
		var cntr = { isObject: true, ID: ["show_field"] , Items: [{ isObject:true , ReadOnly: false, Items: [] }]};
		if (context.vars._Cntr) cntr.ParentCntr = context.vars._Cntr[0]; 
		var newContext = aa_ctx(context,{ _Cntr: [cntr] });
			
		var field = aa_first(data,profile,'Field',newContext);
		if (!field) return [];
		var field_data = ajaxart_field_calc_field_data(field,item,newContext);
		var out = document.createElement(aa_text(data,profile,'CellTag',context)); 
		newContext = aa_ctx(newContext,{_Field: [field], FieldTitle: [field.Title], _Item: item, Items: aa_items(cntr) } ); // TODO: do not call aa_items

		if (field.Hidden && aa_tobool(field.Hidden(item,newContext)) ) return [];

		if (field.AsSection)
			aa_buildSection(cntr,out,field,item,null,context);
		else
			ajaxart_field_createCellControl(item,cntr,out,'control',field,field_data,newContext);

		return [out];
	},
	BooleanFilter: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];

		field.BooleanFilterValue = "";
		field.FilterControl = function(filter_context)
		{
			var newContext = aa_ctx(filter_context,{_Field: [this] } );
			var ctrl = ajaxart.runNativeHelper(filter_context.vars.FilterData,profile,'Control',newContext);
			$(ctrl).find('.aa_filter_input').addClass('aa_filter_' + this.Id);
			return ctrl;
		};
		
		field.newFilter = function(initialFilterData)
		{
			var CompileFilterData = function(filter_data)
			{
				var result = ajaxart.totext_array(filter_data);
				if (result == 'true') return true;
				if (result == '') return ''; // any value
				return false;
			};
			return	{
				isObject: true,
				filterData: CompileFilterData(initialFilterData),
				SetFilterData: function(filterData) { this.filterData = CompileFilterData(filterData); }, 
				ToSQLText: function(rawData) { return ajaxart.totext_array(rawData) },
				Match: function(field,wrapper)
				{
					if (typeof(this.filterData) == 'string' && this.filterData == '') return true;
					return this.filterData == (wrapper[field.Id] == 'true');
				}
			};
		};
		return [];
	},
	SortBox: function (profile,data,context)
	{
		var sort = function(data,ctx) {
			var field_cntr = context.vars._Cntr[0];
			var sorter_obj = ctx.vars.Option[0];
//			ajaxart_setUiPref(field_cntr.ID[0],aa_text(data,profile,'ID',context) +'_SortBox',sorter_obj.Label,ctx);
			var cntr = (context.vars.HeaderFooterCntr || context.vars._Cntr)[0];
			cntr.DataHolder = cntr.DataHolder || aad_createDataHolderFromCntr(cntr,context);
			cntr.DataHolder.UserDataView.Sort = [ { SortBy: sorter_obj.SortBy, SortDirection: sorter_obj.SortDirection} ];
  		    aa_recalc_filters_and_refresh(cntr,data);
		}
		var field = ajaxart.runNativeHelper(data,profile,'Field',context);
		field[0].SortOfSortBox = sort;
		return field;
	},
	Layout: function(profile, data, context)
	{
		var layout_field = {};
		layout_field.Id = aa_text(data,profile,'ID',context);
		layout_field.ID = [layout_field.Id];
		layout_field.Title = aa_multilang_text(data,profile,'Title',context);
		layout_field.FieldData = function(data1) { return data1; }
		layout_field.HideTitle = aa_bool(data,profile,'HideTitle',context);
		layout_field.CellPresentation = ["control"];
		layout_field.Style = aa_first(data,profile,'Layout',aa_ctx(context,{_Field:[layout_field]}));
		layout_field.SectionStyle = aa_first(data,profile,'SectionStyle',context);
		
		if (layout_field.Style) {
			layout_field.Control = function(field_data,ctx) {
				var baseCtx = aa_ctx(ctx,{});
//				jBart.trigger(layout_field,'ModifyInstanceContext',{ Context: baseCtx, FieldData: field_data });					
	      var fields = ajaxart.runsubprofiles(field_data,profile,'Field',aa_merge_ctx(context,baseCtx));
	      var newFields = [];
        for(var i=0;i<fields.length;i++) { // we do not need the constant hidden fields
        	if (fields[i].CalculatedOnly) fields[i].Calculate(field_data,baseCtx);
        	if (fields[i].IsHidden) continue;
        	if (fields[i].IsFieldHidden && fields[i].IsFieldHidden(field_data,baseCtx)) continue;
        	
        	newFields.push(fields[i]);
        }
        fields = newFields;
				aa_trigger(layout_field,'innerFields',{ Context: baseCtx, FieldData: field_data, Fields: fields });

				var layout = aa_api_object($(layout_field.Style.Html), { Fields:fields } );
				var setControl = function(classOrElement) {
					var inner = this.getInnerElement(classOrElement);
					inner.jbFieldElement = this;
					if (!inner) return;
					var ctx2 = aa_ctx(baseCtx,{_Field: [this.Field]});
					var field = this.Field;

					if (this.Field.AsyncActionRunner) {
						this.Field.AsyncActionRunner({ CreateCellControl: true, wrapper: inner, context: ctx2, field_data: field_data});
					} else {
						var cell_data = ajaxart_field_calc_field_data(this.Field,field_data,ctx2);
						var cntr = ctx.vars._Cntr && ctx.vars._Cntr[0];

				    aa_trigger(field,'ModifyInstanceContext',{ Context: ctx2, FieldData: cell_data });
						
						if (field.AsSection && !field.HideTitle) {
							var sectionCtrl = aa_buildSectionControl(cntr,field,field_data,cell_data,ctx2);
							inner.appendChild(sectionCtrl);
						} else {
							ajaxart_field_createCellControl(field_data,cntr,inner,"control",field,cell_data,ctx2);
						}
						if (inner.firstChild)
							aa_element_attached(inner.firstChild);
					}
					if (field.HiddenForEdit || field.HiddenForProperties) $(inner).hide().css('display','none');
			  	};
				layout.addFields = function(classOrElement,init_field_func) {
					var inner = this.getInnerElement(classOrElement);
					if (!inner || !init_field_func) return;
					var innerParent = inner.parentNode;
					var fields = this.Fields;
					
					for(var i=0;i<fields.length;i++) {
						var field = fields[i];
						var elem = inner.cloneNode(true);
						innerParent.insertBefore(elem,inner);
						aa_element_attached(elem);
						var cntr = ctx.vars._Cntr && ctx.vars._Cntr[0];
						
						var field_obj = aa_api_object(elem,{ Field: field, data : this.data, 
							Title: field.Title, cntr: cntr , HideTitle: field.HideTitle, setControl: setControl});
						init_field_func.call(field_obj,field_obj);
						}
					inner.parentNode.removeChild(inner);
				}
				$(layout).addClass( aa_attach_global_css(layout_field.Style.Css) );
				aa_apply_style_js(layout,layout_field.Style);
				
				if (layout_field.SectionStyle) {
					return [ aa_wrapWithSection(layout,layout_field,layout_field.SectionStyle,field_data,ctx) ];
				}
				layout.jbContext = baseCtx;
				return [layout];
			}
		}
		ajaxart.runsubprofiles(data,profile,'FieldAspect',aa_ctx(context,{_Field: [layout_field]}));
		return [layout_field];
	},
	TabControl: function(profile, data,context)
	{
		var tab_field = { isObject : true };
		tab_field.Id = aa_text(data,profile,'ID',context);
		tab_field.Title= aa_text(data,profile,'Title',context);
		tab_field.ID = [tab_field.Id];
		tab_field.FieldData = function(data1) { return data1; };
		tab_field.CellPresentation = ["control"];
		tab_field.HideTitle = true;
		tab_field.KeepSelectedTabIn = aa_first(data,profile,'KeepSelectedTab',context);
		tab_field.RefreshTabsOnSelect = aa_bool(data,profile,'RefreshTabsOnSelect',context);
		tab_field.Control = function(field_data,ctx) {
			tab_field.Style = aa_first(data,profile,'Style',context);
	        var tabcontrol = aa_api_object($(tab_field.Style.Html),{data: field_data, Tabs: []});
	        var ctx2 = aa_ctx(ctx, {ControlElement:[tabcontrol]});
	        aa_defineElemProperties(tabcontrol,'Fields,addTabs,cntr,Tabs,data,tabContents,tabsParent');
	        tabcontrol.Fields = ajaxart.runsubprofiles(data,profile,'Field',context);
	        tabcontrol.addTabs = function(classOrElementForTab,classOrElementForTabContents,init_tab_func)
	        {
	        	var tabcontrol = this;
				var inner = this.getInnerElement(classOrElementForTab);
				tabcontrol.tabContents = this.getInnerElement(classOrElementForTabContents);
				if (!inner || !init_tab_func || !tabcontrol.tabContents) return;
				tabcontrol.tabsParent = inner.parentNode;
				tabcontrol.initTabFunc = init_tab_func;
				
				for(var i=0;i<tabcontrol.Fields.length;i++) {
					var field = tabcontrol.Fields[i];
					if (field.IsHidden) continue;
					if (field.IsFieldHidden && field.IsFieldHidden(field_data,ctx)) continue;
					if (field.IsCellHidden && field.IsCellHidden(field_data,ctx)) continue;
					
					switch (field.RefreshTabOnSelect) {
						case 'refresh': field.RefreshTabOnSelect = true; break;
						case 'no refresh': field.RefreshTabOnSelect = false; break;
						default: field.RefreshTabOnSelect = tab_field.RefreshTabsOnSelect;// inherit
					}
					var tab = inner.cloneNode(true);
					tab.Field = field; tab.tabcontrol = tabcontrol;
					if (field.Id) $(tab).addClass("tab_" + field.Id);
					tabcontrol.Tabs.push(tab);
					inner.parentNode.insertBefore(tab,inner);
					var tab_obj = aa_api_object($(tab),{ Field: field, data : tabcontrol.data, Title: field.Title });
					aa_defineElemProperties(tab,'tab_obj,Select,tabcontrol,Field,Contents');
					tab_obj.Image = aa_init_image_object(field.TabImage,field_data,ctx);
					tab.tab_obj = tab_obj;
					if (field.TabNumericIndication)
						tab_obj.NumberIndication = field.TabNumericIndication(field_data,ctx2);
					var initEvents = function(tab) {
						tab.Select = function() {
							this.tab_obj.Select();
						}
						tab_obj.Select = function (e,animation,automaticSelect) {
							jBart.trigger(tab,'OnBeforeSelect',{});
							if (tab.Field.TabOnBeforeSelect) {
								tab.Field.TabOnBeforeSelect(field_data, ctx2);
								tab.tabcontrol.RefreshTabsHead();	// a shortcut for changing the numeric indication with no call to refresh
							}
				    		var jTab = $(tab),field = tab.Field,tabcontrol = tab.tabcontrol;
				    		var cntr = ctx.vars._Cntr ? ctx.vars._Cntr[0] : {};
				    		var current_cntr = $(tabcontrol.tabContents).find('>.aa_container')[0];
//				    		if ( current_cntr && ! aa_passing_validations(current_cntr) )
//				    		  return aa_stop_prop(e);
				    		
				  		    var currentID = tab.Field.Id,prevTabField=[];
				  		    var currrentSelectedTab = $(tabcontrol.tabsParent).find('>.aa_selected_tab')[0];
				  		    var prevTabId = [];
				  		    if (currrentSelectedTab) {
				  		      prevTabField = [currrentSelectedTab.Field];
				  		      prevTabId = [currrentSelectedTab.Field.Id];
				  		      if (cntr.BeforeChangeTab) cntr.BeforeChangeTab(prevTabField,ctx2);
				  		      $(currrentSelectedTab).removeClass('aa_selected_tab');
				  		    }
							ajaxart.run(data,profile,'OnTabChange', aa_ctx(ctx2, { PrevTab: prevTabId, NewTab: [tab.Field.Id] }));
				  		    jTab.addClass('aa_selected_tab');
						    if (tab_field.ID != "" && tab_field.KeepSelectedTabIn && tab_field.KeepSelectedTabIn.set)
						    	tab_field.KeepSelectedTabIn.set(tab_field.Id, currentID);

						    var cleanLeaks = true;
						    if (currrentSelectedTab && currrentSelectedTab.Field.RefreshTabOnSelect == 'no refresh' )
						    	cleanLeaks = false;
						    
				    		if (!tab.Contents || field.RefreshTabOnSelect) {
							    var tab_data = ajaxart_field_calc_field_data(field,field_data,ctx);
							    var control = $('<div/>').get();
							    aa_fieldControl({Field: field, FieldData: tab_data, Item: field_data, Wrapper: control[0], Context: ctx});
								if (control.length > 0) {
									tab.Contents = control[0];
								}
				    		}
						    if (!animation) {
						    	aa_element_detached(tabcontrol.tabContents.firstChild);
							    aa_empty(tabcontrol.tabContents,cleanLeaks);
								tabcontrol.tabContents.appendChild(tab.Contents);
								aa_element_attached(tab.Contents);
							} else {
								// animation
								tabcontrol.tabContents.style.cssText = 'position:relative';
								tab.Contents.style.cssText = 'position:absolute; z-index:100; top:0px; left:0px;';
								var prev_tab = tabcontrol.tabContents.firstChild;
								tabcontrol.tabContents.appendChild(tab.Contents);
								aa_element_attached(tab.Contents);
								animation.animate(tab.Contents, function() {
									aa_element_detached(prev_tab);
									aa_remove(prev_tab,cleanLeaks);
									tabcontrol.tabContents.appendChild(tab.Contents);
									tab.Contents.style.cssText = 'position:none; z-index:none; top:none; left:none;';
								});
							}

						    if (field.DoWhenUserClicksTab) field.DoWhenUserClicksTab([],context);
			  		        if (cntr.AfterTabLoaded) cntr.AfterTabLoaded([tab.Field],aa_ctx(context,{PreviousTab: prevTabField}));
			  		        aa_fixTopDialogPosition();
							jBart.trigger(tab,'OnAfterSelect',{});
							aa_trigger(tab_field,'TabControlSelect',{
								FieldData: field_data,
								TabField: tab.Field,
								automaticSelect: automaticSelect
							});
							if (tab.Field.TabOnAfterSelect)
								tab.Field.TabOnAfterSelect(field_data, ctx2);
						}
						tab_obj.ApplyDynamicProperties = function() {
							var field = this.Field;
							if (field.TabNumericIndication)
								this.NumericIndication = ajaxart.totext(field.TabNumericIndication(field_data,ctx2));
							if (field.ShowTabOnCondition && !ajaxart.tobool_array(field.ShowTabOnCondition(field_data,ctx2)))
								aa_hide(this);
							else
								aa_show(this);
						}
					}
					initEvents(tab);
					tab_obj.ApplyDynamicProperties();
					init_tab_func(tab_obj);
				}
				tabcontrol.RefreshTabsHead = function() {
					for(var i=0;i<tabcontrol.Tabs.length;i++) {
						tabcontrol.Tabs[i].ApplyDynamicProperties();
						tabcontrol.initTabFunc(tabcontrol.Tabs[i],true);
					}
					jBart.trigger(tabcontrol, 'TabsChanged', {});
				}
				inner.parentNode.removeChild(inner);
	        }
			aa_apply_style_js(tabcontrol,tab_field.Style);
			tabcontrol.jElem.addClass( aa_attach_global_css(tab_field.Style.Css) );
	        
 		    // select a tab
 		    var visible_tabs = $(tabcontrol.Tabs).filter(function() { return this.style.display != 'none' });
 		    if (visible_tabs.length > 0) {
 		      var selectedTab = visible_tabs[0];
 		      if (tab_field.KeepSelectedTabIn && tab_field.KeepSelectedTabIn.get) {
			      var currentID = aa_totext( tab_field.KeepSelectedTabIn.get(tab_field.ID) );
	 		      for(var i=0;i<visible_tabs.length;i++) {
	 		    	  if (currentID == visible_tabs[i].Field.Id) 
	 		    	  	selectedTab = visible_tabs[i];
	 		      }
 		      }
 		      selectedTab.Select(null,null,true);
 		    }
 		    tabcontrol.jElem.addClass('aa_tabcontrol'); // for ChangeTab operation
// 		    tabcontrol.jElem[0].Cntr = cntr; // for ChangeTab operation
 		    tabcontrol.jElem[0].TabControl = tabcontrol;
 		    tabcontrol.jElem[0].Field = tab_field;
 		    
		    return [tabcontrol.jElem[0]];
		}
		ajaxart.runsubprofiles(data,profile,'FieldAspect',aa_ctx(context,{_Field: [tab_field]} ));
		return [tab_field];
	},
	PropertySheet1: function (profile, data, context) 
	{
	    var field = {
        	Title: aa_multilang_text(data, profile, 'Title', context),
        	FieldData: function (data) { return data; },
        	SectionStyle: aa_first(data,profile,'SectionStyle',context)
        };
        field.Id = aa_text(data, profile, 'ID', context);
        field.ID = [field.Id];
	
        var ctx = aa_ctx(context, { _Field: [field] });
	    field.Style = aa_first(data, profile, 'Style', ctx);
	    field.HideTitle = aa_bool(data,profile,'HideTitle',context);
	    
	    field.Control = function (field_data, ctx) 
	    {
	        var fields = ajaxart.runsubprofiles(data,profile,'Field',aa_merge_ctx(context,ctx));

            var visibleFields = [];
            for(var i=0;i<fields.length;i++) {
                if (fields[i].IsFieldHidden && fields[i].IsFieldHidden(field_data,ctx) ) continue;
                if (fields[i].IsCellHidden && fields[i].IsCellHidden(field_data,ctx) ) continue;
                if (fields[i].IsHidden) continue; 
                visibleFields.push(fields[i]);
            }
	        
	        var out = aa_renderStyleObject(field.Style,{ 
				data: field_data,
	  	  		Fields: visibleFields,
	  	  		addFields: addFields
	  	  	},ctx);
	  	  	
	  	  	function addFields(classOrElement,init_field_func) {
	  			var inner = this.getInnerElement(classOrElement);
	  			if (!inner || !init_field_func ) return;
	  			var innerParent = inner.parentNode;
	  			
	  			for(var i=0;i<this.Fields.length;i++) {
	  				var field = this.Fields[i];
	  				var elem = inner.cloneNode(true);
	  				innerParent.insertBefore(elem,inner);
	  				aa_element_attached(elem);
	  				var field_obj = aa_api_object(elem,{ 
	  					Field: field, data : this.data, 
	  					Title: field.Title, HideTitle: field.HideTitle, IsSection: field.AsSection,
	  					Description: field.Description,
	  					setControl: set_field_control
	  				});
	  				aa_defineElemProperties(field_obj,'setPlaceholderForMoreFields');
	  				
	  				field_obj.setPlaceholderForMoreFields = function(init_picklistoptions_func) {
	  					this.jbOptionsPage = function() {
	  						if (!this.jbOptionsPageElement) {
	  							var elem = inner.cloneNode(true);
	  							optionsFieldObj = aa_api_object(elem,{
	  								field_obj: this,
	  								setOptionsPage: function(classOrElement) {
	  									this.field_obj.jbOptionsPageElement = this.getInnerElement(classOrElement);
	  								}
	  							}); 
	  							init_picklistoptions_func.call(optionsFieldObj,optionsFieldObj);
	  							if (this.Field.IndentOptionPage) $(elem).addClass('aa_indent');
	  							$(elem).insertAfter(this);
	  						}
	  						return this.jbOptionsPageElement;
	  					}
	  				};
	  				init_field_func.call(field_obj,field_obj);
	  				if (field.Mandatory) $(elem).addClass("aa_mandatory");
	  			}
	  			inner.parentNode.removeChild(inner);
	  	  	}
	  			
	  	    function set_field_control(classOrElement,notSectionTitle) {
				var inner = this.getInnerElement(classOrElement);
				inner.jbFieldElement = this;
				if (!inner) return;
    			aa_fieldControl({ Field: this.Field, Item: this.data, Wrapper: inner, Context: ctx });
	  	    };
	  	    
			if (field.SectionStyle) {
				return [ aa_wrapWithSection(out,field,field.SectionStyle,field_data,ctx) ];
			}
	  	    
	  	    return [out];
	    }
	    
        ajaxart.runsubprofiles(data, profile, 'FieldAspect', ctx);
	    
	    return [field]
	}
});

function aa_propertysheet_old(group,settings)
{
	aa_defaults(settings,{
		FieldElement: $(group).find('.field')[0],
		MoreOptionsCssClass: 'field_for_more_options',
		FieldTitle: function(title) { return title ? title+':' : '' },
		SetDescription: function(field,description) {
			$(field).find('.field_contents').append('<div class="field_description"/>');
		    field.setInnerHTML('.field_description',description);  
		}
	});
	
    group.addFields(settings.FieldElement,function(field) {
    	var field_id = field.Field && field.Field.Id;
		field.setPlaceholderForMoreFields(function(fieldForOptions) {
	      $(fieldForOptions).addClass(settings.MoreOptionsCssClass + ' ' + settings.MoreOptionsCssClass + "_" + field_id).find('>.field_title').remove();
	      var jContents = $(fieldForOptions).find('>.field_contents').attr('colspan',2).append('<div class="field_options_page"/>');
	      fieldForOptions.setOptionsPage('.field_options_page');
	    });

		if (field.HideTitle || field.IsSection) {
		    $(field).find('>.field_title').remove();
		    $(field).find('>.field_contents').attr('colspan',2);
		} else {
		    field.setInnerHTML('.field_title',settings.FieldTitle(field.Title));  
		    $(field).find('>.field_title').addClass("field_title_" + field_id);
		}
		
		var jFieldContents = $(field).find('.field_contents');
		jFieldContents.addClass("field_contents_" + field_id);
		field.setControl('.field_contents'); 
		if (field.Field.Description) settings.SetDescription(field,field.Field.Description);
    });
}

aa_gcs("uiaspect",{
	ItemClass: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeElements = function(initData,ctx)
		{
			var elems = ctx.vars._Elems;
			for(var i=0;i<elems.length;i++)
			{
				var elem = elems[i];
				var cls = aa_text(elem.ItemData,profile,'Class',context).replace(/\s/,'_');
				if (cls != '')
					elem.className += " " + cls;
			}
		}
		ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
		return [aspect];
	},
	FastFindInHtmlTree: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var setSearchVal = function(elem)
		{
			elem.FFSearchVal = "";
			$.each($(elem).find('>.aa_text,>span>.aa_text'), function(index, value) { 
				elem.FFSearchVal += value.innerHTML.toLowerCase();  // += ensures that the parent nodes will not be removed
			});
		}
		var postAction = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var elems_exp = cntr.Tree ? '.aa_item' : '>.aa_item';
			var elems = $(ajaxart_find_aa_list(cntr)).find(elems_exp);
			for(var i=0;i<elems.length;i++)
				setSearchVal(elems[i]);
		}
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.RegisterForPostAction(ctx._This);
			var filterData = ajaxart_writabledata();

			cntr.FilterControl = ajaxart.runNativeHelper(filterData,profile,'Control',ctx);
			
			cntr.SelectByPattern = function(pattern)
			{
				var cntr = this;
				var elems_exp = cntr.Tree ? '.aa_item' : '>.aa_item';
				var elems = $(ajaxart_find_aa_list(cntr)).find(elems_exp);
				var new_selected = elems.find('>.aa_text').filter(function() {
					return this.innerHTML.toLowerCase() == pattern;
				}).slice(0,1);
				if (pattern != '' && new_selected.length > 0 )
					ajaxart_uiaspects_select(new_selected.parents('.aa_item').slice(0,1),$(),"keyboard",ctx);
			}
			cntr.DoFind = function(pattern)
			{
				pattern = pattern.toLowerCase();
				var cntr = this;
				if (cntr.SaveAndCloseInplace) cntr.SaveAndCloseInplace([],ctx);
				if (cntr.PartialView && cntr.PartialView.RemoveSummary)
					cntr.PartialView.RemoveSummary(cntr);
				
				var elems_exp = cntr.Tree ? '.aa_item' : '>.aa_item';
				
				if (!cntr.elems)
					cntr.elems = $(ajaxart_find_aa_list(cntr)).find(elems_exp); 
				var elems = cntr.elems;
				var noOfMatches = 0;
				var inFirstItems = 100;
				var firstItem = true;
				for(var i=0;i<elems.length;i++)
				{
					var elem = elems[i];
					if (elem.FFSearchVal == null)
						setSearchVal(elem);
					elem.hidden = false;
					var itemOptionObj = elem.ItemData[0];
					var selectable = !itemOptionObj.UnSelectable;
					var match = selectable && (elem.FFSearchVal.indexOf(pattern) != -1 || pattern == '');
					if (! match)
						elem.hidden = true;
					if (match) {
						if (inFirstItems >0)// highlight first ten
						{
							inFirstItems--; 
							$.each($(elem).find('>.aa_text,>span>.aa_text'), function(index, value) { 
								if (value.OrigText == null)
									value.OrigText = value.innerHTML;
								if (value.OrigText.toLowerCase().indexOf(pattern) != -1)
									value.innerHTML = ajaxart_field_highlight_text(value.OrigText,pattern);
								else
									value.innerHTML = value.OrigText;
							});
						}
						if (firstItem) { // soft select
							ajaxart_uiaspects_select($(elem),$(),"keyboard",ctx);
							firstItem = false;
						}
						if (cntr.Tree)
							$(elem).parents('.aa_item').each(function() { this.hidden = false; } ) // unhide parents in tree
						noOfMatches++;
					}
				}
			
				if (elems.length < aa_int(data,profile,'FilterTreshold',context) && aa_bool(data,profile,'DoNotFilterSmallLists',context)) 
					var minItems = elems.length;
				else
					var minItems = 0;
				var noOfUnmatchedToShow = minItems - noOfMatches;
				for(var i=0;i<elems.length;i++)
				{
					var elem = elems[i];
					if (noOfUnmatchedToShow > 0 && elem.hidden)
					{
						elem.hidden = false;
						noOfUnmatchedToShow--;
					}
				    if (elem.hidden)
				    {
				    	elem.style.display = 'none';
					  	elem.display = 'none';
				    }
				    else
				    {
				    	elem.style.display = '';
				    	elem.display = '';
				    }
				}

				// soft select 
				aa_invoke_cntr_handlers(cntr,cntr.ContainerChange,[],ctx);
			}
		}

		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		ajaxart_addScriptParam_js(aspect,'PostAction',postAction,context);
		var result = [aspect];
		if (!aa_bool(data,profile,'HideExposedFilters',context))
			result = result.concat(ajaxart.gcs.uiaspect.ExposedFiltersSection(profile,data,context));
		else
			context.vars._Cntr[0].HideFastFind = true;

		return result;
	 },
	FastFind: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var filterData = ajaxart_writabledata();

			cntr.FilterControl = ajaxart.runNativeHelper(filterData,profile,'Control',ctx);
			cntr.MaxItemsInSearch = aa_int(data,profile,'MaxItemsToShow',context);
			
			cntr.DoFind = function(pattern,showAll)
			{
				pattern = pattern.toLowerCase();
				var pp = pattern.split(' ');
				var p1 = (pp.length > 0 && ' ' + pp[0].toLowerCase());
				var p2=  (pp.length > 1 && pp[1] && ' ' + pp[1].toLowerCase());
				var p3=  (pp.length > 2 && pp[2] && ' ' + pp[2].toLowerCase());
				var _p1 = pp.length == 1 && pp[0].toLowerCase();	// for searching half text (only with one word)
				if (showAll && showAll.length == 0) showAll = null;
				cntr = this;
				if (aa_bool(data,profile,'DoNotLookInAllFields',context))
					var ItemText = function(data1,ctx2) { 
						return [aa_text(data1,profile,'LookIn',context)]; 
					}
				else
					var ItemText = aa_concat_atts;// for compression: aa_concat_atts()
				cntr.DataHolder = cntr.DataHolder || aad_createDataHolderFromCntr(cntr,context);
				if (! cntr.FFInitialized)
				{
					for(var i in cntr.DataHolder.Wrappers)
					{
						var wrapper = cntr.DataHolder.Wrappers[i];
						wrapper.__Search = ' ' + ajaxart.totext_array(ItemText([wrapper.__item || wrapper],ctx)).toLowerCase().replace(/^\s*|\s*$/g, ' ');
					}
					cntr.FFInitialized = true;
				}

				var shownItems = 0,filteredItems = 0;
			    var all_elems = [];
			    var top = ajaxart_find_aa_list(cntr);
			    aa_clear_cntr_items(top,cntr);
			    cntr.FilteredWrappers = [];

			    var firstItem = true;
				function addFound(wrapper)
				{
					filteredItems++;
					shownItems++;
			    	var li = cntr.createNewElement([wrapper.__item || wrapper],all_elems,ctx);
			    	if (li) {
			    		top.appendChild(li);
						if (firstItem) { // soft select
							ajaxart_uiaspects_select($(li),$(),"keyboard",ctx);
							firstItem = false;
						}
			    	}
					cntr.FilteredWrappers.push(wrapper);
				}
				var candidates = [];
				var worst_rank = 100;
				// look at text beginning
				for(var i in cntr.DataHolder.Wrappers)
				{
					var wrapper = cntr.DataHolder.Wrappers[i];
					var s = wrapper.__Search;
					// two words 
					  // add 1 - first word not covered
					  // add 1 - for sequence
					  // add 1 - not in order
					  // add 4 - word is not there
					var match = (p1 && s.indexOf(p1) != -1) || (p2 && s.indexOf(p2) != -1) || (p3 && s.indexOf(p3) != -1) || pattern == '' || (_p1 && s.indexOf(_p1) != -1);
					if (!match) continue;
					wrapper.__rank = 0;
					if (s.indexOf(p1) > 1) wrapper.__rank++;
					if (s.indexOf(p1) == -1) wrapper.__rank += 2;
					if (p2 && s.indexOf(p2) < s.indexOf(p1)) wrapper.__rank++;
					if (p2 && s.indexOf(pattern) == -1) wrapper.__rank++;
					if (p2 && s.indexOf(p1) == -1) wrapper.__rank+= 4;
					if (p2 && s.indexOf(p2) == -1) wrapper.__rank+= 4;
					if (p3 && s.indexOf(p3) == -1) wrapper.__rank+= 4;
					if (showAll || candidates.length < 20)
					{
						candidates.push(wrapper);
						if (wrapper.__rank < worst_rank) worst_rank = wrapper.__rank;
					}
					else
					{
						if (wrapper.__rank < candidates[19].__rank) candidates[19] = wrapper;
						candidates.sort(function(w1,w2){ return w1.__rank > w2.__rank; });
						worst_rank = candidates[19].__rank;
					}
				}
				candidates.sort(function(w1,w2) { 
					if (w1.__rank != w2.__rank)
						return w1.__rank - w2.__rank;
					else	// keep original index
						return w1.__OriginalIndex - w2.__OriginalIndex;
				});
				for(var i in candidates)
					if (showAll || shownItems < cntr.MaxItemsInSearch || cntr.MaxItemsInSearch == 0)
						addFound(candidates[i]);

				var newcontext = aa_ctx(cntr.Context,{_Elems: all_elems } );
			    for(var i=0;i<cntr.Aspects.length;i++) {
			    	ajaxart.trycatch( function() {
			    		aa_runMethod(data,cntr.Aspects[i],'InitializeElements',newcontext);
			    	}, function(e) { ajaxart.logException(e); });
			    }

			    for(var i=0;i<cntr.PostActors.length;i++) {
			    	ajaxart.trycatch( function() {
				    	  ajaxart.runScriptParam(data,cntr.PostActors[i].aspect.PostAction,newcontext);
			    	}, function(e) { ajaxart.logException(e); });
			    }
			    if (p1) p1 = p1.substring(1); if (p2) p2 = p2.substring(1); if (p3) p3 = p3.substring(1);// remove space prefix
				$.each($(top).find('.aa_text'), function() { 
					if (p1 && this.innerHTML.toLowerCase().indexOf(p1) != -1)
						this.innerHTML = ajaxart_field_highlight_text(this.innerHTML,p1);
					if (p2 && this.innerHTML.toLowerCase().indexOf(p2) != -1)
						this.innerHTML = ajaxart_field_highlight_text(this.innerHTML,p2);
					if (p3 && this.innerHTML.toLowerCase().indexOf(p3) != -1)
						this.innerHTML = ajaxart_field_highlight_text(this.innerHTML,p3);
				});

				if (cntr.PartialView && cntr.PartialView.RemoveSummary)
					cntr.PartialView.RemoveSummary(cntr);
				if (!aa_bool(data,profile,'DoNotShowPartialStatus',context))
					aa_add_partial_suffix(cntr,shownItems,filteredItems,ctx);
				if (cntr.PartialView) 
					cntr.PartialView.ShowAll = function() {
						cntr.DoFind(pattern,true);
					} 
				
				// soft select 
				aa_invoke_cntr_handlers(cntr,cntr.ContainerChange,[],ctx);
			}
		}

		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		
		var cntr = context.vars._Cntr[0];  // TODO: move to InitializeContainer
		var result = [aspect];
		if (!aa_bool(data,profile,'HideExposedFilters',context))
			result = result.concat(ajaxart.gcs.uiaspect.ExposedFiltersSection(profile,data,context));
		else
			cntr.HideFastFind = true;
		
		return result;
	 },
	 OccurrencesFollowup:function (profile,data,context)
	 {
 		aa_addMethod(context.vars._Cntr[0],'OccurrencesFollowup',profile,'OccurrencesFollowup',context);
	 },
	  ExposedFiltersSection: function (profile,data,context)
	  {
		var aspect = { isObject : true };

		var initializeContainer = function(data1,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
		    var filters = [];
		    var fieldIds = aa_text(data,profile, 'FieldIds', ctx).split(',');
	    	for(var i in fieldIds) 
		    {
		    	var field = aa_fieldById(fieldIds[i],cntr.Fields);
		    	if (field && field.newFilter)
		    		filters.push(aad_create_filter(field,ajaxart_getUiPref(cntr.ID[0],'Filter_Field_' + field.Id,ctx)));
		    }
	    	cntr.ExposedFilters = filters;
	    		
			var aspect = ctx._This;
			cntr.RegisterForPreAction(aspect,aa_int(data,profile,'Phase',context));
		}
		aspect.PreAction = function(data1,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			if (! cntr.HasExposedFiltersSection) // build filter section
			{
				cntr.HasExposedFiltersSection = true;
				
			    var filters_section = document.createElement("ul");
			    filters_section.className = 'aa_filters';
			    
				if (cntr.FilterControl != null && !cntr.HideFastFind) // cntr fast find
				{
			    	var filter_elem = document.createElement("li");
			    	filter_elem.className = "aa_filter";
			    	filter_elem.appendChild(cntr.FilterControl[0]);
			    	filters_section.appendChild(filter_elem);
				}
	
		    	for(var i in cntr.ExposedFilters) // create exposed filter controls
			    {
			    	var filter = cntr.ExposedFilters[i];
			    	var field = filter.field;
					if (field.FilterControl == null)
				    	continue;
	
					var newContext = aa_ctx(ctx,{ FilterData: filter.rawFilterData, HeaderFooterCntr: [cntr], DataHolderCntr: [cntr] });
				    var ctrl = field.FilterControl(newContext);
				    filter.Ctrl = ctrl[0];
	
			    	var filter_elem = document.createElement("li");
			    	filter_elem.className = "aa_filter";
			    	filter_elem.appendChild(ctrl[0]);
			    	filters_section.appendChild(filter_elem);
			    }
		    	cntr.FiltersSection = filters_section;
			}
	    	if ($(aa_find_header(cntr)).find('>.aa_filters').length == 0)
				aa_find_header(cntr).appendChild(cntr.FiltersSection);
	    	
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	  },
	  ExpandCollapseSections: function (profile,data,context)
		{
			var aspect = { isObject : true };
			var initializeContainer = function(initData,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
		  		cntr.toggleSectionElem = function (elem)
		  		{
		 			var ctrl = elem.find('.aa_section_ctrl');
		 			if (ctrl.length == 0) return;
		 			ctrl = ctrl[0];
					var hitarea = elem.find('>.aa_title').slice(0,1);
		 			elem[0].collapsed = ! elem[0].collapsed;
					if (elem[0].collapsed)
					{
						ctrl.style.display = 'none';
						ctrl.display = 'none';
						hitarea.addClass("expandable");
						hitarea.removeClass("collapsable");
					}
					else
					{
						ctrl.style.display = 'block';
						ctrl.display = 'block';
						hitarea.addClass("collapsable");
						hitarea.removeClass("expandable");
					}
		  		};
			
				var toggleByClick = function (e)
		  		{
				    var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );  
		  		    if (! elem.hasClass("aa_title")) return true;
			    	var section_elem = elem.parents('.aa_section').slice(0,1);
			    	if (section_elem.length == 0) return true;
				    cntr.toggleSectionElem(section_elem);
				    return aa_stop_prop(e);
		  		};
				aa_bind_ui_event(cntr.Ctrl,'click',toggleByClick);
			}
			var initializeElements = function(initData,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
				var elems = ctx.vars._Elems;
				for(var i=0;i<elems.length;i++)
				{
					var elem = $(elems[i]);
					var title = elem.find('>.aa_section>.section_in_list_title'); 
					title.addClass('collapsable');
					title.disableTextSelect();
				};
			};

			ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
			ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
			return [aspect];
		},
	  Sort: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var removeCssClasses = function(thead,th)
			{
  		    	var ths = $(thead).find('th');
  		    	ths.removeClass('sort_ascending');
  		    	ths.removeClass('sort_descending');
			}
			var clickHandler = function(e,thead,th) {
	  		    var jth = $(th);
  		    	if (thead.LastMouseDown == null || thead.LastMouseDown.th != th) return;
				var cntr = ctx.vars._Cntr[0];
	  		    if (jth.hasClass('sort_ascending'))
	    		{
	  		    	removeCssClasses(thead,th);
	  		    	jth.addClass('sort_descending');
					ajaxart_setUiPref(cntr.ID[0],'Sort_Field',th.Field.Id,ctx);
					ajaxart_setUiPref(cntr.ID[0],'Sort_Direction','sort_descending',ctx);
	    		}
	  		    else if (jth.hasClass('sort_descending'))
	  		    {
	  		    	removeCssClasses(thead,th);
					ajaxart_setUiPref(cntr.ID[0],'Sort_Field','',ctx);
					ajaxart_setUiPref(cntr.ID[0],'Sort_Direction','',ctx);
	  		    }
		  		else 
		  		{
		  			removeCssClasses(thead,th);
		  			jth.addClass('sort_ascending');
					ajaxart_setUiPref(cntr.ID[0],'Sort_Field',th.Field.Id,ctx);
					ajaxart_setUiPref(cntr.ID[0],'Sort_Direction','sort_ascending',ctx);
		  		}
	  		    aa_recalc_filters_and_refresh(cntr,data);
			}
			var thead = $(cntr.Ctrl).find('.aatable>thead')[0];
			if (thead)
				aa_registerHeaderEvent(thead,'mouseup',clickHandler,'Sort','no dominant');
			// initByUIPref 
			var sort_field = ajaxart_getUiPref(cntr.ID[0],'Sort_Field',ctx);
			var jth = $(thead).find('>tr>th').filter(function() {return this.Field.Id == sort_field});
			jth.addClass(ajaxart_getUiPref(cntr.ID[0],'Sort_Direction',ctx));
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	  },
	  TableColumnsDragAndDrop: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var initDD = function(dragged_class,horizontal,select_on_drag)
			{
			var cntr = ctx.vars._Cntr[0];

			var _drag = function(e,thead,th) {
				var ltr = 1;
				var rtl = 0;
				if ($(thead).parents('.right2left').length > 0)
				{
					ltr = 0; rtl = 1;
				}
				var mousepos = aa_mousePos(e);
				var oElem = thead.draggedElem;
		
				if (oElem == null) return true;
				
				oElem.style.left = (mousepos.x - oElem.mouseX) + 'px'; 

				var spaceLeft = aa_absLeft(thead.spaceElem);
				var nextRight = ltr ? -1 : 5000;
				if ($(thead.spaceElem).next().length > 0)
				{
					var next = $(thead.spaceElem).next()[0];
					nextRight = aa_absLeft(next) + ltr * next.offsetWidth;
				}
				var prevLeft = ltr ? -1 : 5000;
				if ($(thead.spaceElem).prev().length > 0)
				{
					var prev = $(thead.spaceElem).prev()[0];
					prevLeft = aa_absLeft(prev) + rtl * prev.offsetWidth;
				}
						
				var draggedLeft = aa_absLeft(thead.draggedElem) + rtl * thead.draggedElem.offsetWidth;
				var draggedRight = aa_absLeft(thead.draggedElem) + ltr * thead.draggedElem.offsetWidth;
				var nearRight = nextRight < draggedRight + 5;
				if (rtl) nearRight = !nearRight;
				var nearLeft = prevLeft > draggedLeft - 5;
				if (rtl) nearLeft = !nearLeft;

				var parent_table = $(thead).parents('.aatable').slice(0,1);
				if (parent_table[0].ElementsTable)
					var trs = $(parent_table[0].ElementsTable).slice(0,1).find('.aa_item');
				else
					var trs = $(thead).parents('.aatable').slice(0,1).find('.aa_item');
				if (nearRight)
					if (thead.spaceElem.nextSibling.nextSibling != null)
					{
						var draggedFieldId = thead.spaceElem.Field.Id;
						var droppedFieldId = thead.spaceElem.nextSibling.Field.Id;
						for(var j=0;j<trs.length;j++)
						{
							var tr = trs[j];
							var tds = $(tr).find('>td');
							var dragged_td = tds.filter( function() { return this.Field.Id == draggedFieldId} );
							var dropped_td = tds.filter( function() { return this.Field.Id == droppedFieldId} );
							if (dragged_td.length > 0 && dropped_td.length > 0)
								dragged_td.insertAfter(dropped_td);
						}
						$(thead.spaceElem).insertAfter($(thead.spaceElem.nextSibling));
						if (parent_table[0].ResizeColumn)
							parent_table[0].ResizeColumn(thead.spaceElem);
					}
				if (nearLeft)
					if (thead.spaceElem.previousSibling != null)
					{
						var draggedFieldId = thead.spaceElem.Field.Id;
						var droppedFieldId = thead.spaceElem.previousSibling.Field.Id;
						for(var j=0;j<trs.length;j++)
						{
							var tr = trs[j];
							var tds = $(tr).find('>td');
							var dragged_td = tds.filter( function() { return this.Field.Id == draggedFieldId} );
							var dropped_td = tds.filter( function() { return this.Field.Id == droppedFieldId} );
							if (dragged_td.length > 0 && dropped_td.length > 0)
								dragged_td.insertBefore(dropped_td);
						}
						$(thead.spaceElem).insertBefore($(thead.spaceElem.previousSibling));
						if (parent_table[0].ResizeColumn)
							parent_table[0].ResizeColumn(thead.spaceElem);
					}
				return aa_stop_prop(e);
			};
		 
			var _dragEnd = function(e) {
				var cntr = ctx.vars._Cntr[0];
				var thead = $(cntr.Ctrl).find('.aatable>thead')[0];
				var fieldIds = '';
				$(thead).find('th').each(function() { if (this.Field && this.Field.Id) fieldIds = fieldIds + ',' + this.Field.Id});
				ajaxart_setUiPref(cntr.ID[0],'Table_Fields_Order',fieldIds,ctx);
				$(thead.spaceElem).removeClass('aa_dragged_space_elem');
				thead.draggedParent.removeChild(thead.draggedElem);
				document.onmouseup = thead.origDocMouseup;
				thead.draggedElem = null;
				thead.Suspect = null;
			  	ajaxart.run([],profile, 'OnDrop', context);
			  	aa_invoke_cntr_handlers(cntr,cntr.ContainerChange,[],ctx);
				thead.Owner = null;
				return aa_stop_prop(e);
			};
	 
			var suspectDrag = function(e,thead,th) {
				thead.Suspect = { owner: "TableColumnsDragAndDrop", mousePos : aa_mousePos(e)};
				return aa_stop_prop(e);
			}

			var checkSuspection = function(e,thead,th) {
				var mousepos = aa_mousePos(e);
				if (thead.Suspect != null)
				{
					var distance = Math.abs(mousepos.x - thead.Suspect.mousePos.x);
					if (distance < 5) return true;
					thead.Suspect = null;
					dragBegin(e,thead,th);
				}
			}

			var unSuspectDrag = function(e,thead,th) {
				if (thead.Owner == "TableColumnsDragAndDrop") return true;
				thead.Suspect = null;
				return true;
			}

			var dragBegin = function(e,thead,th) {
				ajaxart_disableSelection(thead);
				thead.Owner = "TableColumnsDragAndDrop";

				var posx = aa_absLeft(th,false) ;
				var posy = aa_absTop(th,false) ;
	  		    
				var oElem = thead.draggedElem = th.cloneNode(true);
				thead.draggedParent = th.parentNode; 
				thead.draggedParent.appendChild(oElem);
				thead.spaceElem = th; 

				$(oElem).addClass('aa_dragged_elem');
				$(thead.spaceElem).addClass('aa_dragged_space_elem');
		 
				var mousepos = aa_mousePos(e);
				oElem.mouseX = mousepos.x - posx;

				oElem.style.position = 'absolute';
				oElem.style.top = posy + 'px';
				oElem.style.left = posx + 'px';
		 
				thead.origDocMouseup = document.onmouseup;
				document.onmouseup = _dragEnd;
				if(e.preventDefault)
				  e.preventDefault();

				return aa_stop_prop(e);
			};
			var thead = $(cntr.Ctrl).find('.aatable>thead')[0];
			if (thead)
			{
				aa_registerHeaderEvent(thead,'mousedown',suspectDrag,'TableColumnsDragAndDrop','no dominant');
				aa_registerHeaderEvent(thead,'mousemove',checkSuspection,'TableColumnsDragAndDrop','suspect');
				aa_registerHeaderEvent(thead,'mouseup',unSuspectDrag,'TableColumnsDragAndDrop','suspect');
				aa_registerHeaderEvent(thead,'mouseout',unSuspectDrag,'TableColumnsDragAndDrop','suspect');
				aa_registerHeaderEvent(thead,'mousemove',_drag,'TableColumnsDragAndDrop','dominant');
			}
			};
			initDD('fieldtitle',true);
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	  },
	  TableColumnsResizer: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];

			var colResizeDetect = function(e,thead,th) {
				var mousepos = aa_mousePos(e);

				var in_resize_place = aa_absLeft(th,false) + th.offsetWidth - mousepos.x < 6;
				if ($(thead).parents('.right2left').length > 0)
					in_resize_place = mousepos.x - aa_absLeft(th,false) < 6;
				if (in_resize_place)
				{
					$(th).addClass('col_resize');
					thead.ResizedCol = th;
					thead.Owner = "TableColumnsResizer";
				}
				else
				{
					$(th).removeClass('col_resize');
					thead.ResizedCol = null;
					thead.Owner = null;
				}
				return aa_stop_prop(e);
			}

			var colResizeStart = function(e,thead,th) {
				thead.ResizedColStart = true;
				ajaxart_disableSelection(thead);
				document.onmouseup = colResizeStop;
				return aa_stop_prop(e);
			}

			var colResizeMove = function(e,thead,th) {
				if (thead.ResizedColStart)
				{
					var mousepos = aa_mousePos(e);
					var new_size = mousepos.x - aa_absLeft(thead.ResizedCol,false);
					if ($(thead).parents('.right2left').length > 0)
						new_size = aa_absLeft(thead.ResizedCol,false) + thead.ResizedCol.offsetWidth - mousepos.x;
					
					$(thead.ResizedCol).width(new_size);

					var cntr = ctx.vars._Cntr[0];
					ajaxart_setUiPref(cntr.ID[0],thead.ResizedCol.Field.Id+'_ColumnWidth','' + new_size + 'px',ctx);

					var parent_table = $(thead.ResizedCol).parents('.aatable').slice(0,1);
					if (parent_table[0].ResizeColumn)
						parent_table[0].ResizeColumn(thead.ResizedCol);

					// if fusion change tds out of the table
					if ($(thead.ResizedCol).parents('table').slice(0,1).hasClass('aa_inner_header'))
					{
						var tds = parent_table.find('td').filter(function() { 
							return this.Field != null && this.Field.Id == thead.ResizedCol.Field.Id } 
						);
						tds.width(new_size + 1);
					}
					return aa_stop_prop(e);
				}
				else
					colResizeDetect(e,thead,th);
			}

			var colResizeStop = function(e) {
				var cntr = ctx.vars._Cntr[0];
				$(cntr.Ctrl).find('th').removeClass('col_resize');
				document.onmouseup = null;
				$(cntr.Ctrl).find('thead').each( function()
						{
							var thead = this;
							thead.ResizedColStart = false;
							thead.ResizedCol = null;
							thead.Owner = null;
						});
				return aa_stop_prop(e);
			}

			var thead = $(cntr.Ctrl).find('.aatable>thead')[0];
			if (thead)
			{
				aa_registerHeaderEvent(thead,'mousemove',colResizeDetect,'TableColumnsResizer','no dominant');
				aa_registerHeaderEvent(thead,'mousedown',colResizeStart,'TableColumnsResizer','dominant');
				aa_registerHeaderEvent(thead,'mousemove',colResizeMove,'TableColumnsResizer','dominant');
				aa_registerHeaderEvent(thead,'mouseup',colResizeStop,'TableColumnsResizer','dominant');
			}
		};
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	  },
	  ScrollItems: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		aspect.InitializeContainer = function(data1,ctx) {
			var cntr = ctx.vars._Cntr[0];
			
			cntr.ScrollStyle = aa_first(data,profile,'Style',context);
			cntr.ScrollWidth = aa_first(data,profile,'Width',context);
			cntr.ScrollHeight = aa_first(data,profile,'Height',context);
			
			var cntrBody = ajaxart_find_aa_list(cntr);
			var topDiv = cntrBody;
			
			while (topDiv && ",table,tbody,tr,td,".indexOf(topDiv.tagName.toLowerCase()) > -1) {
				topDiv = topDiv.parentNode;
			}
				
			var topClass = aa_attach_global_css(cntr.ScrollStyle.Css,context);
			
			cntr.ScrollObject = aa_renderStyleObject(cntr.ScrollStyle,{
				ScrollHeight: cntr.ScrollHeight,
				ScrollWidth: cntr.ScrollWidth,
				fixSize: function(element) {
				  if (cntr.ScrollHeight) cntr.ScrollHeight.apply(element);
				  if (cntr.ScrollWidth) cntr.ScrollWidth.apply(element);
				},
				init: function(settings) {
					this.refresh = settings.refresh;
					this.requiresDivWrapper = settings.requiresDivWrapper;
				},
				cntrBody: cntrBody,
				topDiv: topDiv
			},ctx);
			var scroll = cntr.ScrollObject; 

			if (cntr.ScrollHeight) 
				jBart.bind(cntr.ScrollHeight,'update',function() { cntr.ScrollObject.refresh(); });
			
			if (cntr.ScrollWidth) 
				jBart.bind(cntr.ScrollWidth,'update',function() { cntr.ScrollObject.refresh(); });
			
			if (cntr.ScrollObject.requiresDivWrapper) {
				aa_addOnAttach(cntrBody,function() {
					var parent = scroll.topDiv.parentNode;
					scroll.divWrapper = $('<div class="aa_scroll_wrapper"/>').addClass(topClass).append(scroll.topDiv)[0];
					parent.appendChild(scroll.divWrapper);
					cntr.ScrollObject.refresh();	
				});
			} else {
				$(topDiv).addClass(topClass);
				cntr.ScrollObject.refresh();
			}
		}
		return [aspect];
	  },
	  TableScroll: function (profile,data,context)
	  {
		var aspect = { isObject : true };

		function addScroll(cntr)
		{
			var table = $(cntr.Ctrl).find('.aatable').slice(0,1);
			var tWidth = table.width();
			var fixedHeight = aa_int(data,profile, 'Height', context);
			if (fixedHeight > table.height()) return;
				
			var headers_table = $('<table class="aa_headers_table aatable"></table>');
			headers_table.append(table.find('thead'));
			headers_table.insertBefore(table);
			var tableWrapper = $('<div class="aa_scroll_wrapper" style="overflow: auto"></div>');
			tableWrapper.insertBefore(table);
			tableWrapper.append(table);
			tableWrapper.height(fixedHeight);
			headers_table[0].ElementsTable = table[0];
			setWidths(headers_table);
			
			function setWidths(headers_table)
			{
				var scrollerWidth = 18;
				var paddingDiff = 10; // diff in padding between header and content

				var tableWrapper = headers_table.parent().find('>.aa_scroll_wrapper');
				var table = tableWrapper.find('>.aatable');

				var tWidth = headers_table.width();
				var fix = 1;
				if (ajaxart.isChrome || ajaxart.isIE)
					fix = 2;
				tableWrapper.width(tWidth+fix);
				//tableWrapper.width(headers_table.width());
	
				// set the columns widths by the header
				var trs = table.find('>tbody>tr');
				var widths = [];
				headers_table.find('>thead>tr>th').each(function() { widths.push($(this).width() - paddingDiff)} );
				widths[widths.length-1] = widths[widths.length-1] - scrollerWidth + 1; // fix last column width
				if (ajaxart.isIE)
					table[0].setAttribute('width',''+(tWidth - scrollerWidth));
				for(var i=0;i<trs.length;i++)
				{
					var tds = $(trs[i]).find('>td');
					for(var j=0;j<tds.length;j++)
					{
						$(tds[j]).width(widths[j]);
						$(tds[j]).css("min-width",widths[j]);
						$(tds[j]).css("max-width",widths[j]);
					}
				}
			}
			headers_table[0].ResizeColumn = function()
			{
				setWidths($(this));
			}
		}
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.RegisterForPostAction(ctx._This);
		}
		aspect.PostAction = function(data1,ctx)
		{
			setTimeout(function() { 
				var cntr = ctx.vars._Cntr[0];
				addScroll(cntr) } ,1);
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	  },
	  CustomListPresentation: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		var init = function(aspect) {
			function refresh(data1,ctx)
			{
				var cntr = context.vars._Cntr[0];  
				var newContext = aa_merge_ctx(context,ctx, {Items: aa_items(cntr) });
				var ctrl = aa_first(data,profile,'List',newContext);
				if (ctrl) 
				{
					$(ctrl).addClass('aa_list');
					$(ajaxart_find_aa_list(cntr)).replaceWith(ctrl);
				}
			    for(var i=0;i<cntr.PostActors.length;i++) {
			    	ajaxart.trycatch( function() {
				    	  ajaxart.runScriptParam([],cntr.PostActors[i].aspect.PostAction,cntr.Context);
			    	}, function(e) { ajaxart.logException(e); });
			    }
			}
			aspect.InitializeContainer = function(data1,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
				cntr.createNewElement = null;
				//cntr.RegisterForPostAction(aspect);
				aa_register_handler(cntr,'ContainerChange', refresh);
			}
		}
		init(aspect);
		return [aspect];
	  },
	  Tiles: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
			aspect.CreateContainer = function(initData,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
			    var div = $('<div class="teasers_list_tiles aa_list aa_listtop aa_cntr_body"/>');
				$(cntr.Ctrl).find('>.aa_listtop').replaceWith(div);
				$(cntr.Ctrl).find('>.aa_container_footer').css('clear','both');				
				return [];
			}
			aspect.InitializeContainer = function(data1,ctx) {
				var cntr = ctx.vars._Cntr[0];
				var imageSize = aa_text(data,profile,'ImageSize',context).split(',');
				var tileExtra = aa_text(data,profile,'TileExtraSize',context).split(',');

				cntr.TilesImageWidth = parseInt(imageSize[0].split('px')[0]); 
				cntr.TilesImageHeight = parseInt(imageSize[1].split('px')[0]);
				cntr.TilesWidth = cntr.TilesImageWidth + parseInt(tileExtra[0].split('px')[0]); 
				cntr.TilesHeight = cntr.TilesImageHeight + parseInt(tileExtra[1].split('px')[0]); 
				cntr.TilesMaxTextLength = aa_int(data,profile,'MaxTextLength',context);
				cntr.DefaultTileImage = aa_text(data,profile,'DefaultImage',context);
				cntr.MoreFields = aa_text(data,profile,'MoreFields',context);
				cntr.Tiles = aa_bool(data,profile,'Tiles',context);
				var imageScript = ajaxart.fieldscript(profile,'ImageOrVideo',true);
				cntr.Clickable = aa_text(data,profile,'Clickable',context);
				cntr.TilesHasImage = (imageScript != null && imageScript.nodeValue != "");
				cntr.TilesKeepImageProportion = aa_bool(data,profile,'KeepImageProportion',context);
				
			    cntr.createNewElement = function(item_data,item_aggregator,ctx2)
			    {
					var cntr = ctx.vars._Cntr[0];

					var div = $('<div class="aa_teaser tiles aa_item">'
							+ '<div class="aa_teaserimage"><img class="aa_teaser_image"/></div>'
							+ '<div class="aa_teaser_title aa_text"/><div class="aa_teaser_text aa_text"/>'
							+ '</div>');
					
			    	if (cntr.CustomItemControl)
			    	{
			    		div = $('<div class="aa_teaser tiles aa_item"></div>');
			    		var ctrl = cntr.CustomItemControl(item_data,ctx2 || ctx);
			    		if (ctrl.length > 0)
			    			div[0].appendChild(ctrl[0]);
			    	}
			    	else
			    	{
						var text = aa_text(item_data,profile,'Text',context);
						if (text.length >= cntr.TilesMaxTextLength && cntr.TilesMaxTextLength > 0) 
							text = text.substring(0,cntr.TilesMaxTextLength)+"...";
						
						var img_txt = aa_text(item_data,profile,'ImageOrVideo',context) || cntr.DefaultTileImage;
						if (cntr.TilesHasImage) {
							var isVideo = img_txt.indexOf('<object') != -1;
							if (isVideo)
							{
								img_txt = img_txt.replace(new RegExp('width=.[0-9]*','g'),'width="' + cntr.TilesImageWidth );
								img_txt = img_txt.replace(new RegExp('height=.[0-9]*','g'),'height="' + cntr.TilesImageHeight );
								var video = $(img_txt);
								div.find('.aa_teaserimage_td').empty().append(video);
							}
							else
							{
								if (img_txt != "")
									div.find('.aa_teaser_image')[0].src = img_txt;
								if (cntr.TilesImageWidth)
									div.find('.aa_teaser_image')[0].width = cntr.TilesImageWidth;//setAttribute('width',cntr.TilesImageWidth);
								if (cntr.TilesImageHeight)
									div.find('.aa_teaser_image')[0].height = cntr.TilesImageHeight;// setAttribute('height',cntr.TilesImageHeight);
								if (cntr.TilesWidth)	
									div.find('.aa_teaser_image')[0].style.maxWidth = cntr.TilesWidth+"px";
								if (cntr.TilesHeight)	
									div.find('.aa_teaser_image')[0].style.maxHeight = cntr.TilesHeight+"px";
							}
							div.find('.aa_teaserimage_td').width(cntr.TilesImageWidth);
				    		div.find('.aa_teaserimage').height(cntr.TilesImageHeight+'px');
						}
						function FixImageSize(img) 
						{
							var cntr = ctx.vars._Cntr[0];
							var imgObj = new Image(); imgObj.src = img.getAttribute('src');
							var naturalWidth = imgObj.width,naturalHeight = imgObj.height;
							if (naturalWidth < cntr.TilesImageWidth) img.width = naturalWidth; 
							if (naturalHeight < cntr.TilesImageHeight) img.height = naturalHeight;
							var width = Math.min(naturalWidth,cntr.TilesImageWidth), height = Math.min(naturalHeight,cntr.TilesImageHeight); // IE hates img.width
							
							if (cntr.TilesKeepImageProportion) {
								var ratio = naturalWidth / naturalHeight;
								var currRatio = width / height;
								if (ratio != currRatio) {
									if (naturalWidth >= naturalHeight * currRatio) {
										img.width = cntr.TilesImageWidth;
										img.height = Math.floor(width / ratio);
									} else {
										img.height = cntr.TilesImageHeight;
										img.width = Math.floor(height * ratio);
									}
								}
							}
						}
						if (img_txt) {
						  var img = div.find('.aa_teaser_image')[0]; 
						  var imgObj = new Image(); imgObj.src = img_txt;
						  if (imgObj.complete) FixImageSize(img);
						  else img.onload = function() { FixImageSize(this);}
						}
						
						div.find('.aa_teaser_title')[0].innerHTML = aa_text(item_data,profile,'Title',context);
						div.find('.aa_teaser_text')[0].innerHTML = text;
						if (cntr.TilesWidth != "")	{
							div.find('.aa_teaser_text')[0].style.maxWidth = cntr.TilesWidth+"px";
							div.find('.aa_teaser_text')[0].style.overflow = "hidden" ;
							div.find('.aa_teaser_title')[0].style.maxWidth = cntr.TilesWidth+"px";
							div.find('.aa_teaser_title')[0].style.overflow = "hidden" ;
						}
			    	}
					var clickable = null;
					if (cntr.Clickable == "tile")
						clickable = div;
					else if (cntr.Clickable == "title")
						clickable = div.find('.aa_teaser_title');
					if (clickable != null) {
						clickable.addClass('teasers_clickable');
						clickable.click(function(e)
						{
							if (window.aa_incapture) return;
							var cntr = ctx.vars._Cntr[0];
							var item = this;
							if (!$(this).hasClass('aa_item'))
								item = $(this).parents('.aa_item')[0];
							var newContext = aa_ctx(ctx2 || ctx,{ _InnerItem: item.ItemData, _ItemsOfOperation: item.ItemData, ControlElement: [this]} );
							ajaxart.run(item.ItemData,profile,'Action',newContext);
							return false;
						});
					}
					if (cntr.TilesWidth != "")	div[0].style.width = cntr.TilesWidth+"px";
					if (cntr.TilesHeight != "") div[0].style.height = cntr.TilesHeight+"px";
					var more_fields = cntr.MoreFields.split(",");
					for (var i=0; i<more_fields.length; i++) {
						var field_id = more_fields[i];
				    	if (field_id == "") continue;
				    	var field = null;
					    for(var j=0;j<cntr.Fields.length;j++)
					    	if (cntr.Fields[j].Id == field_id)
					    		field = cntr.Fields[j];
					    if (field == null) { ajaxart.log("Tiles: field " + field_id + " not found");continue; }
				    	var newContext = aa_ctx(ctx2 || ctx,{_Field: [field], FieldTitle: [field.Title], _InnerItem : item_data, _Elem : [div], _Item: item_data });
			    		var cell = document.createElement("div");
			    		cell.className = 'teasers_field';
					    var cell_data = ajaxart_field_calc_field_data(field,item_data,newContext);
				    	ajaxart_field_createCellControl(item_data,cntr,cell,cntr.CellPresentation,field,cell_data,newContext); 
				    	div[0].appendChild(cell);
					}
						
					var out = div[0];
					out.ItemData = item_data;
			    	if (item_aggregator) item_aggregator.push(out);
					return out;
			    }
			}
			return [aspect];	
	  },
	  ElementItemData: function (profile,data,context)
	  {
		var elem = aa_first(data,profile,'Element',context);
		if (elem && elem.ItemData) return elem.ItemData;
		return [];
	  },
	  Css: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		aspect.InitializeContainer = function(data1,ctx) {
			var css_for = aa_text(data,profile,'OnElement',context);
			if (css_for == "") css_for = "container";
			var class_compiled = ajaxart.compile(profile,'Class',context);
			var inline_compiled = ajaxart.compile(profile,'Inline',context);
			var condition_compiled = ajaxart.compile(profile,'OnCondition',context, null, false, true);
			var apply_css = function(elems,data2) {
				for (var i=0; i<elems.length; i++) {
					if (! ajaxart_runcompiled_bool(condition_compiled, data2, profile, "OnCondition", context, true )) return;
					var cls = ajaxart_runcompiled_text(class_compiled, data2, profile, "Class" ,context);
					var inline = ajaxart_runcompiled_text(inline_compiled, data2, profile, "Inline" ,context);
					if (inline != "") aa_setCssText(elems[i],elems[i].style.cssText + ";" + inline);
					$(elems[i]).addClass(cls);
				}
			};
			var register = function(apply_css,css_for) {
				var cntr = ctx.vars._Cntr[0];
				aspect.PostAction = function(data1,ctx) {
					var cntr = ctx.vars._Cntr[0];
					if (css_for == "container")
						apply_css([cntr.Ctrl], data1);
					if (css_for == "container body")
						apply_css($(cntr.Ctrl).children(".aa_cntr_body"), data1);
					if (css_for == "table")
						apply_css($(cntr.Ctrl).find(">.aa_cntr_body>table,>table"), data1);
					if (css_for == "title row")
						apply_css($(cntr.Ctrl).find(".aatable_header"), data1);
					if (css_for == "title cell (th)")
						apply_css($(cntr.Ctrl).find(".fieldtitle"), data1);
					if (css_for == "title text")
						apply_css($(cntr.Ctrl).find(".fieldtitle_title"), data1);
				}
				var initializeElements = function(initData,ctx)
				{
					var elems = ctx.vars._Elems;
					if (css_for == "items") {
						for(var j=0;j<elems.length;j++)
							apply_css([elems[j]], elems[j].ItemData);
					}
					if (css_for == "tree item text") {
						for(var j=0;j<elems.length;j++) {
							var itemtext = $(elems[j]).find('>.item_text')[0];
							if (itemtext)
							  apply_css([itemtext], elems[j].ItemData);
						}
					}
					if (css_for == "cells") {
						for(var j=0;j<elems.length;j++)
							apply_css($(elems[j]).find(">td"), elems[j].ItemData);
					}
				};
				ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
				cntr.RegisterForPostAction(aspect); 
			}
			register(apply_css,css_for);
		}
			
		return [aspect];
	  },
	  CssClass: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
		  aspect.InitializeContainer = function(data1,ctx) {
			  var cntr = ctx.vars._Cntr[0];
			  var cssClass = aa_text(data,profile,'CssClass',context);
			  $(cntr.Ctrl).addClass(cssClass);
		  }
		  return [aspect];
	  },
	  PathOfElement: function (profile,data,context)
	  {
		var elem = aa_first(data,profile,'Element',context);
		
		var path = "";
		while (elem != null && ! aa_hasClass(elem,'aa_container') ) {
			if (aa_hasClass(elem,'aa_item')) {
			  var subpath = $(elem).find('>.aa_text').text();
			  if (subpath != "") {
				  if (path == "") path = subpath;
				  else	path = subpath + "/" + path;
			  }
			}
			elem = elem.parentNode;
		}
		return [path];
	  },
	  HiddenFields: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		aspect.CreateContainer = function(initData,ctx) // to run before the table...
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.HiddenFields = aa_text(data,profile,'FieldIds',context);
			return [];
		}
		return [aspect];
	  },
	  Table: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		var createContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
		    var table = $('<table class="aatable aa_listtop aa_cntr_body"><thead><tr class="aatable_header"></tr></thead><tbody class="aatable_tbody aa_list" tabindex="1"></tbody></table>');
		    table.addClass(aa_attach_global_css(aa_text(data,profile,'Css',context),null,'table'));
		    
			$(cntr.Ctrl).find('>.aa_listtop').replaceWith(table);
			return [];
		}
		
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var cols_str = aa_text(data,profile,'Columns',ctx);
			var pref_str = ajaxart_getUiPref(cntr.ID[0],'Table_Fields_Order',ctx);
			var hidden_fields = ',' + ajaxart_getUiPref(cntr.ID[0],'Table_Hidden_Fields',ctx) + ',' + (cntr.HiddenFields || '') + ',';
	    	var fieldsOrig = ajaxart_field_getFields(cntr,"table");
	    	var fields = [];
    		for (var i=0;i<fieldsOrig.length;i++)
    			if (fieldsOrig[i].Id == '' || hidden_fields.indexOf(fieldsOrig[i].Id) == -1)
    				fields.push(fieldsOrig[i]);
			var columns = cols_str.split(',');
			if (pref_str)
			{
				var merged_cols = ',' + pref_str + ',';
				if (cols_str != '')
				{
					var cols = cols_str.split(',')
					for(var i=0;i<cols.length;i++)
					{
						if (cols[i] != '' && merged_cols.indexOf(cols[i]) == -1)
							merged_cols += cols[i] + ',';
					}
				}
				else
				{
					for(var i=0;i<fields.length;i++)
					{
						if (merged_cols.indexOf(fields[i].Id) == -1)
							merged_cols += fields[i].Id + ',';
					}
				}
				columns = merged_cols.split(',');
			}
			if (columns.length == 1 && columns[0] == "") columns = [];
			
			cntr.columns = [];
			if (cntr.CellPresentation == null) cntr.CellPresentation = 'text';

	    	var operations = aa_runMethod([],cntr,'Operations',ctx);
	    	if (columns.length == 0)
	    	{
	    		for (var i=0;i<fields.length;i++)
		    		cntr.columns.push(fields[i]);
	    	}
		    else
		    {
				for(var i=0;i<columns.length;i++)
				{
					if (columns[i] == '') continue;
					var found = false;
		    		for (var j=0;j<fields.length;j++)
		    			if (columns[i] == fields[j].Id)
		    			{
		    				cntr.columns.push(fields[j]);
		    				found = true;
		    			}
		    		for (var j=0;j<operations.length;j++)
		    			if (columns[i] == operations[j].Id)
		    			{
		    				cntr.columns.push(operations[j]);
		    				found = true;
		    			}
		    		if (! found)
		    			ajaxart.log("table column (field or operation) '" + columns[i] + "' was not found");
				}
		    }

		    var table = $(cntr.Ctrl).find('.aatable'); 
	    	var header = $(cntr.Ctrl).find('thead');
	    	if (header.length == 0) return;
			var header_tr = header.find('>tr')[0];
	    	// set headers - should be an aspect
	    	var fields = ajaxart_field_getFields(cntr,"table");
		    for (var j=0;j<cntr.columns.length;j++) {
		    	var field = cntr.columns[j];
		    	var th = $('<th class="fieldtitle th_' + field.Id + '"><span class="fieldtitle_title"/><span class="fieldtitle_sort">&nbsp;</span></th>');
		    	if (field.AddInfoIcon) 
		    		field.AddInfoIcon(th.get(),cntr.Context);
		    	
		    	aa_defineElemProperties(th[0],'fieldId');
		    	th[0].fieldId = field.Id;
		    	th[0].Field = field;
		    	th[0].Cntr = cntr; // As headers may move in the fusion process, it is useful to remember their origin.
		    	var title = field.isOperation ? aa_runMethod(data,field,'Title',cntr.Context)[0] : field.Title;
		    	if (field.HideTitle) title=" ";
	    		th.find('>.fieldtitle_title').html(title);
		    	if (field.Width) 
		    		th.css('width',field.Width);
		    	ajaxart_field_fix_th(cntr,th[0],field,ctx);
		    	header_tr.appendChild(th[0]);
		    	if (cntr.EnableFieldMenu)
		    	{
		    		th.find('>span').slice(0,1).insertBefore('<span class="aa_field_menu">&nbsp;</span>');
		    		th.find('>.aa_field_menu')[0].onmousedown = function(e) 
		    		{ 
	  	  	    		var newContext = aa_ctx( ctx, {
	  	  	    			MousePos: [ { isObject: true, pageX: e.pageX || e.clientX, pageY: e.pageY || e.clientY} ]
	  	  	    		});
		    			ajaxart.runNativeHelper([field],profile,'FieldMenu',newContext); 
		    			return aa_stop_prop(e);
		    		}
		    	}
		    }
		    cntr.createNewElement = function(item_data,item_aggregator,ctx2,forGroup)
		    {
	    		var cntr = this;
		    	var tr = document.createElement("TR");
		    	tr.className = "aa_item tablerow";
				tr.ItemData = item_data;
				ajaxart.databind([tr],item_data,context,profile,data);	// for runtime inspect
		    	
		    	var fields = cntr.columns;
		    	if (cntr.CustomItemControl)
		    	{
		    		var td = document.createElement("TD");
		    		td.colSpan = fields.length;
		    		var ctrl = cntr.CustomItemControl(item_data,ctx);
		    		if (ctrl.length > 0)
		    			td.appendChild(ctrl[0]);
		    		tr.appendChild(td);
		    	}
		    	else if (!cntr.GroupByFields || cntr.GroupByFields.length == 0 || forGroup)
		    	{
				    for (var j=0;j<fields.length;j++) {
				    	var field = fields[j];
				    	var newContext = aa_ctx(ctx2 || ctx,{_Field: [field], FieldTitle: [field.Title], _InnerItem : item_data, _Elem : [tr], _Item: item_data });
			    		var td = document.createElement("TD");
			    		td.Field = field;
				    	if (field.Id == '#_TitleField') {
				    		td.className = "aa_title_td content";
				    		tr.titleTd = td;
				    	}
				    	else
				    	{
				    		if (cntr.WrappersAsItems || (field.IsCalculated && field.WrapperToValue && item_data[0] && item_data[0].__hiddenForView))
				    		{
				    			td.className = "content aa_text fld_" + field.Id;
				    			td.innerHTML = '' + item_data[0][field.Id];
				    			tr.appendChild(td);
				    			continue;
				    		}
				    		if (field.CellPresentation == "text" && !field.isOperation && !field.CalculatedControl && !field.IsCalculated && !field.ModifyCell)
				    		{
				    			td.className = "content aa_text fld_" + field.Id;
				    			if (field.Text) {
				    				var field_data = ajaxart_field_calc_field_data(field,item_data,newContext);
				    				td.innerHTML = ajaxart_field_text(field,field_data,item_data,newContext);
				    				td.Data = field_data;
				    			} else if (field.ItemToText) {
				    				td.innerHTML = field.ItemToText(item_data[0]);
				    				td.Data = item_data;
				    			} else if (item_data[0] && item_data[0].__hiddenForView) // wrapper
				    				td.innerHTML = item_data[0][field.Id];
				    			else
				    			{
				    				var cell_data = ajaxart_field_calc_field_data(field,item_data,newContext);
				    				td.Data = cell_data;
				    				td.innerHTML = ajaxart_field_text(field,cell_data,item_data,newContext);
				    			}
				    			if (field.ModifyCell) {
					    			var field_data = ajaxart_field_calc_field_data(field,item_data,newContext);
				    				for(var i=0;i<field.ModifyCell.length;i++)
				    					field.ModifyCell[i](td,field_data,"text",newContext,item);
				    			}
				    			tr.appendChild(td);
				    			continue;
				    		}
					    	td.className = "content";
					    		  
						    var cell_data = ajaxart_field_calc_field_data(field,item_data,newContext);
					    	ajaxart_field_createCellControl(item_data,cntr,td,cntr.CellPresentation,field,cell_data,newContext);
					    	// fusion - if has inner table
					    	var inner_cntr = $(td).find('.aa_container');
					    	if (inner_cntr.length > 0) // fusion
					    	{
					    		var inner_table_body = ajaxart_find_list_under_element(inner_cntr[0]);
					    		if ($(inner_table_body).parent().hasClass('aatable'))
					    		{
					    			$(td).addClass('td_of_embedded_table');
						    		// merge headers
						    		var parent_header = $(ajaxart_find_aa_list(cntr)).parent().find('>thead');
					    			if (! parent_header[0].HeaderFusionDone)
					    			{
							    		parent_header.find('>tr>th').filter(function() { return this.fieldId != field.Id } ).attr('rowSpan','2');
							    		var new_tr = $('<tr><th class="fieldtitle td_of_embedded_table"><table class="aa_inner_header"></table></th></tr>');
							    		new_tr.find('.fieldtitle')[0].Field = field;
							    		var orig_thead = $(inner_table_body).parent().find('>thead');
							    		// cloning header
							    		var inner_thead = $('<thead><tr></tr></thead>');
							    		var inner_tr = inner_thead.find('tr')[0];
							    		orig_thead.find('th').each(function() { 
							    					var inner_th = this.cloneNode(true);
							    					inner_th.Field = this.Field;
							    					inner_tr.appendChild(inner_th);
							    			} );
							    		inner_thead.find('th').slice(0,1).addClass('first');
							    		new_tr.find('.aa_inner_header')[0].appendChild(inner_thead[0]);
							    		parent_header[0].appendChild(new_tr[0]);
							    		parent_header[0].HeaderFusionDone = true;
					    			}
					    		}
					    	}
				    	}
				    	tr.appendChild(td);
				    }
		    	}
		    	if (item_aggregator) item_aggregator.push(tr);
				return tr;
		    }
		    cntr.wrapElement = function(data1,ctx2)
		    {
		    	var tr = document.createElement("TR");
		    	tr.className = "aa_item tablerow";
				tr.ItemData = item_data;
				tr.setAttribute("ColSpan", cntr.columns.length);
		    }
		}

		ajaxart_addScriptParam_js(aspect,'CreateContainer',createContainer,context);
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);

		return [aspect];
	  },
	  CustomItemControl: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
		  aspect.InitializeContainer = function(initData,ctx)
		  {
			  var cntr = ctx.vars._Cntr[0];
			  cntr.CustomItemControl = function(data2,ctx2)
			  {
				  return ajaxart.run(data2,profile,'Control',aa_merge_ctx(context,ctx2));
			  }
		  }
		  return [aspect];
	  },
	  ShowTextWhenNoItems: function (profile,data,context)
	  {
		  var aspect = {
			  isObject: true,
			  InitializeContainer: function(initData,ctx) {
			  	var cntr = ctx.vars._Cntr[0];
			  	cntr.DescriptionWhenNoItems = function() {
			  		return ajaxart_multilang_run(data,profile,'TextWhenNoItems',context);
			  	}
			  	cntr.NoItemsStyle = aa_first(data,profile,'Style',context);
			  	cntr.RegisterForPostAction(aspect);
			  	aa_register_handler(cntr,'ContainerChange',aspect.Refresh);
		  	  },
		  	  Refresh: function(data1,ctx) {
			  	var cntr = ctx.vars._Cntr[0];
				if ($(cntr.Ctrl).find('>.aatable>.aatable_tbody').length > 0) return;
				var top = ajaxart_find_aa_list(cntr);
				aa_remove(cntr.ElementForNoItems,true);
				$(top).removeClass('aa_noitems');
				
				if ($(top).find('>.aa_item').length == 0) {
					cntr.ElementForNoItems = aa_renderStyleObject(cntr.NoItemsStyle,{
						text: aa_totext(cntr.DescriptionWhenNoItems(data,context))
					},context);
					top.appendChild( cntr.ElementForNoItems );
					$(top).addClass('aa_noitems');
				} 
		  	  },
		  	  PostAction: function(data1,ctx) { aspect.Refresh(data1,ctx); }
		  };
		  return [aspect];
	  },
	  TableNoItems: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		function refresh(data1,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			if (cntr.GroupByUsingUIPref) return [];
			var body = $(cntr.Ctrl).find('>.aatable>.aatable_tbody');
			if (body.length == 0) return [];
			$(cntr.Ctrl).find('>.aatable').show();
			body.find('>tr.noitems').remove();
			if (body.find('>tr').length == 0)
			{
				if (aa_bool(data,profile,'HideTable',context))
				{
					$(cntr.Ctrl).find('>.aatable').hide();
				}
				else
				{
					var no_items_text = aa_totext(cntr.DescriptionWhenNoItems(data,context));
					var no_items = $('<tr class="noitems"><td colspan="' + cntr.columns.length + '" class="td_nocontent"><span>'+no_items_text+'</span></td></tr>');
					if (body.length > 0)
						body[0].appendChild(no_items[0]);
				}
			} else {
			}
		}
		aspect.PostAction = function(data1,ctx)
		{
			refresh(data1,ctx);
		}
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.DescriptionWhenNoItems = function() {
				return ajaxart_multilang_run(data,profile,'DescriptionWhenNoItems',context);
			}
			cntr.RegisterForPostAction(ctx._This);
			aa_register_handler(cntr,'ContainerChange',refresh);
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	  },
	  TableNoHeader : function (profile,data,context)
	  {
		var aspect = { isObject : true };
		aspect.PostAction = function(data1,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			if (cntr.GroupByUsingUIPref) return [];
			var table = ajaxart_find_aa_list(cntr);
			$(table).parent().find('>thead').slice(0,1).addClass('hidden_header'); //.hide();
		};
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.RegisterForPostAction(ctx._This);
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	  },
	  Horizontal: function (profile,data,context)
	  {
		  var cssClass = aa_attach_global_css( aa_text(data,profile,'Css',context), null, 'horiz' );
		  
		  var aspect = { isObject : true };
		  aspect.InitializeContainer = function(initData,ctx)
		  {
			  var cntr = ctx.vars._Cntr[0];
			  cntr.createNewElement = function(item_data,item_aggregator,ctx2)
			  {
				  ctx = aa_merge_ctx(context,ctx);
				  var cntr = ctx.vars._Cntr[0];
				  aa_prepare_calculated_fields_for_item(cntr.Fields,item_data,aa_merge_ctx(context,ctx2));
				  
				  var noInnerTitles = aa_bool(data,profile,'HideInnerTitles',context);
				  var fields = ajaxart_field_getFields(cntr,"property sheet",item_data);
				  var table = $('<table class="aahoriz" cellspacing="0" cellpadding="0"><tbody><tr class="aahoriz_tr"/></tbody></table>')[0];
				  if (aa_bool(data,profile,'FullWidth',context)) $(table).width('100%');
				  var tr = $(table).find('.aahoriz_tr')[0];
				  tr.ItemData = item_data;

				  var spacingStr = aa_text(data,profile,'Spacing',context).replace(/ /g,'');
				  var hasSpacing = spacingStr != "" && spacingStr != "0";
				  var spacing = spacingStr.split(',');
				  var enfore_spacing = aa_bool(data,profile,'EnforceSpacing',context);
				  var minWidths = ajaxart_run_commas(data,profile,'MinWidths',context);
				  var maxWidths = ajaxart_run_commas(data,profile,'MaxWidths',context);
				  var widths = ajaxart_run_commas(data,profile,'Widths',context);

				  if (aa_bool(data,profile,'AlighLastToRight',context))		// divs with floats 
				  {
					  var out = $('<div style="aa_item" />').addClass(cssClass)[0];
					  out.ItemData = item_data;
					  for(var i=0;i<fields.length;i++) {
						  var field= fields[i];
						  var inner = ajaxart_properties_and_sections(cntr,item_aggregator,item_data,profile,ctx2 || ctx,[fields[i]],true);
						  var wrap = $('<div class="aa_float_left"/>')[0];
						  if (i == fields.length-1) wrap = $('<div class="aa_float_right"/>')[0];
						  wrap.appendChild(inner);
						  out.appendChild(wrap);
					  }					  
					  if (item_aggregator) item_aggregator.push(out);
					  return out;
				  }
				  for(var i=fields.length-1;i>=0;i--)
					  if (typeof(fields[i].Hidden) == "function" && aa_tobool(fields[i].Hidden(item_data,ctx)) )
					    fields.splice(i,1);
					  
				  for(var i=0;i<fields.length;i++) {
					  if (i > 0 && hasSpacing) {
					    var space = spacingStr;
					    if (spacing.length > 1 && i <= spacing.length) space = spacing[i-1]; 
					    if (space != "")	{// adding spacing column
						  var gap = document.createElement('td');
						  gap.className = 'aahoriz_space';
						  if (enfore_spacing)
							  gap.style.minWidth = space;
						  else
							  gap.style.width = space;
						  if (cntr.SeparatorControl) {
							  var spaceCntr = cntr.SeparatorControl(item_data,ctx)[0];
							  if (spaceCntr) gap.appendChild(spaceCntr);
						  }
						  tr.appendChild(gap);
					    }
					  }
					  var td = document.createElement('td');
					  td.className = "aahoriz_td";

					  if (noInnerTitles) {
					    var cell_data = ajaxart_field_calc_field_data(fields[i],item_data,ctx2||ctx);
				        ajaxart_field_createCellControl(item_data,cntr,td,"control",fields[i],cell_data,ctx2||ctx);
					  } else {
						  var inner = ajaxart_properties_and_sections(cntr,item_aggregator,item_data,profile,ctx2 || ctx,[fields[i]],true);
						  td.appendChild(inner);
					  }
					  tr.appendChild(td);
					  if (i < minWidths.length) inner.style.minWidth = minWidths[i];
					  if (i < maxWidths.length) inner.style.minWidth = maxWidths[i];
					  if (i < widths.length) td.style.width = inner.style.width = widths[i];
				  }
				  $(table).addClass(cssClass);
				  if (item_aggregator) item_aggregator.push(table);
				  return table;
			  }			  
		  }
		  return [aspect];
	  },
	  MultipleColumns: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
		  var initializeContainer = function(initData,ctx)
		  {
			  var cntr = ctx.vars._Cntr[0];
			  
			  cntr.createNewElement = function(item_data,item_aggregator,ctx2)
			  {
				  aa_prepare_calculated_fields_for_item(cntr.Fields,item_data,aa_merge_ctx(context,ctx2));
				  var cols = aa_int(data,profile,'Columns',context) + 0.0;
				  var fields = ajaxart_field_getFields(cntr,"property sheet");

				  var space = aa_text(data,profile,'Space',context),header = aa_text(data,profile,'HeaderSpace',context),footer=aa_text(data,profile,'FooterSpace',context);
				  var width = aa_text(data,profile,'PropertiesWidth',context);
				  
				  var colFields = [];
				  var index = -1;
				  var fieldsInCol = Math.ceil(fields.length / cols);
				  for(var i=0;i<fields.length;i++) {
					  if ( i % fieldsInCol == 0) {
						  colFields.push([]);
						  index++;
					  }
					  colFields[index].push(fields[i]);
				  }
				  var table = $('<table class="aacolumns aa_item" cellspacing="0" cellpadding="0"><tbody><tr class="aacolumns_tr"/></tbody></table>')[0];
				  var tr = $(table).find('.aacolumns_tr')[0];
				  tr.ItemData = item_data;

				  for(var i=0;i<colFields.length;i++) {
					  if (i>0)	{// adding gap column
						  var gap = document.createElement('td');
						  gap.className = 'aacolumns_gap';
						  gap.style.width = aa_text(data,profile,'Gap',context);
						  tr.appendChild(gap);
					  }
					  var td = document.createElement('td');
					  td.className = "aacolumns_td";
					  var inner = ajaxart_properties_and_sections(cntr,item_aggregator,item_data,profile,ctx2 || ctx,colFields[i],space,false,width,header,footer);
					  td.appendChild(inner);
					  tr.appendChild(td);
				  }
				  if (item_aggregator) item_aggregator.push(table);
				  return table;
			  }
		  }
		  ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		  return [aspect];
	  },
	  StretchToBottomRight: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
		  aspect.InitializeContainer = function(initData,ctx)
		  {
			  var cntr = ctx.vars._Cntr[0];
			  cntr.RegisterForPostAction(this);
		  }		
		  aspect.PostAction = function(data1,ctx) {
			var cntr = ctx.vars._Cntr[0];
			var elem = cntr.Ctrl;
			var tab = aa_find_just_in_container(cntr,'.aa_tab_page');
			if (tab) { 
				elem = tab;
				if (! aa_bool(data,profile,'StretchToRight',context)) elem.style.paddingRight = "17px";
			}
			if (aa_bool(data,profile,'StretchToBottom',context)) {
				aa_stretchToBottom(elem,aa_int(data,profile,'MarginFromBrowserBottom',context));
			}
			if (aa_bool(data,profile,'StretchToRight',context)) {
				aa_stretchToRight(elem,aa_int(data,profile,'MarginFromBrowserRight',context));
			}
		  }
		  return [aspect];
	  },
	  AspectByXtml: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
		  aspect.InitializeContainer = function(initData,ctx)
		  {
			  ajaxart.run(data,profile,'InitializeContainer',aa_merge_ctx(context,ctx));
		  }
		  return [aspect];
	  },
	  Group: function (profile,data,context)  // GC of uiaspect.Group
	  {
		  var aspect = { isObject : true };
		  aspect.InitializeContainer = function(initData,ctx)
		  {
			  var cntr = ctx.vars._Cntr[0];
			  cntr.createNewElement = function(item_data,item_aggregator,ctx2)
			  {
				  var cntr = ctx.vars._Cntr[0];
				  cntr.Style = aa_first(data,profile,'Style',context);

				  if (cntr.Style.Html == '') return null;
				  var html = cntr.Style.Html;
				  if (cntr.Style.DynamicDataInHtml == 'true') {
					  var index =0;
					  while (1) {
						  index = html.indexOf('jBartRawData(',index);
						  if (index == -1) break;
						  var end = html.indexOf(')',index);
						  var content = html.substring(index + 'jBartRawData('.length,end);
						  var str = aa_totext(ajaxart.dynamicText(item_data,'%' + content + '%',ctx2));
						  html = html.substring(0,index) + str + html.substring(end+1);
					  }
					  var fields = ajaxart_field_getFields(cntr,"property sheet");
					  while (1) {
						  index = html.indexOf('jBartData(',index);
						  if (index == -1) break;
						  var end = html.indexOf(')',index);
						  var field_id = html.substring(index + 'jBartData('.length,end);
						  var str = "";
						  for(var i=0;i<fields.length;i++) 
							  if (fields[i].Id == field_id) {
								  str = aa_totext(fields[i].FieldData(item_data,ctx2));
								  break;
							  }
						  html = html.substring(0,index) + str + html.substring(end+1);
					  }
				  }
				  var group = aa_api_object($(html),{data: item_data, cntr: cntr});
				  aa_prepare_calculated_fields_for_item(cntr.Fields,item_data,aa_merge_ctx(context,ctx));
				  aa_defineElemProperties(group,'Fields,addFields,addManualFields');
				  group.Fields = ajaxart_field_getFields(cntr,"property sheet");
				  var set_control = function(classOrElement,notSectionTitle) {
						var inner = this.getInnerElement(classOrElement);
						inner.jbFieldElement = this;
						if (!inner) return;
						var ctx = aa_ctx(this.cntr.Context,{_Field: [this.Field], _Item: this.data });
						var cell_data = ajaxart_field_calc_field_data(this.Field,this.data || [],ctx);
				    aa_trigger(this.Field,'ModifyInstanceContext',{ Context: ctx, FieldData: cell_data});

						if (!notSectionTitle && this.Field.AsSection)
						  inner.appendChild( aa_buildSectionControl(this.cntr,this.Field,cell_data,this.data,ctx) );
						else
						  ajaxart_field_createCellControl(this.data,this.cntr,inner,this.cntr.CellPresentation,this.Field,cell_data,ctx);
						if (inner.firstChild)
							aa_element_attached(inner.firstChild);
				  };
				  group.addFields = function(classOrElement,init_field_func) {
					var inner = this.getInnerElement(classOrElement);
					if (!inner || !init_field_func ) return;
					var innerParent = inner.parentNode;
					
					for(var i=0;i<this.Fields.length;i++) {
						var field = this.Fields[i];
						var elem = inner.cloneNode(true);
					    if (field.IsCellHidden && field.IsCellHidden(item_data,ctx)) {
					      if (field.RenderHiddenCell) 
					        elem.style.display = 'none';
					      else continue;  // remove row
					    }
						innerParent.insertBefore(elem,inner);
						aa_element_attached(elem);
						var field_obj = aa_api_object(elem,{ Field: field, data : this.data, 
							Title: field.Title, cntr: this.cntr , HideTitle: field.HideTitle, IsSection: field.AsSection,
							setControl: set_control
						});
						aa_defineElemProperties(field_obj,'setPlaceholderForMoreFields');
						
						field_obj.setPlaceholderForMoreFields = function(init_picklistoptions_func) {
							this.jbOptionsPage = function() {
								if (!this.jbOptionsPageElement) {
									var elem = inner.cloneNode(true);
									optionsFieldObj = aa_api_object(elem,{
										field_obj: this,
										setOptionsPage: function(classOrElement) {
											this.field_obj.jbOptionsPageElement = this.getInnerElement(classOrElement);
										}
									}); 
									init_picklistoptions_func.call(optionsFieldObj,optionsFieldObj);
									if (this.Field.IndentOptionPage) $(elem).addClass('aa_indent');
									$(elem).insertAfter(this);
								}
								return this.jbOptionsPageElement;
							}
						};
						init_field_func.call(field_obj,field_obj);
						if (field.Mandatory) $(elem).addClass("aa_mandatory");
					}
					inner.parentNode.removeChild(inner);
				  }
				  group.addManualFields = function(classPrefix,init_field_func) {
					  for(var i=0;i<this.Fields.length;i++) {
						  var field = this.Fields[i];
						  var place_holders = $(this).find(classPrefix + field.ID);
						  for (var p=0; p<place_holders.length; p++) {
							  var field_obj = aa_api_object($(place_holders[p]),{ Field: field, data : this.data, Title: field.Title, cntr: this.cntr , HideTitle: field.HideTitle, IsSection: field.AsSection, setControl: set_control});
							  init_field_func(field_obj);
						  }
					  }
				  }
					
				  group.jElem.addClass( aa_attach_global_css(cntr.Style.Css) ).addClass('aa_item');
				  aa_apply_style_js(group,cntr.Style);

				  group.jElem[0].ItemData = item_data;
				  if (item_aggregator) item_aggregator.push(group.jElem[0]);
				  return group.jElem[0];
			  }
		  }
		  return [aspect];
	  },
	  PropertySheet: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
		  var initializeContainer = function(initData,ctx)
		  {
			  var cntr = ctx.vars._Cntr[0];
			  cntr.createNewElement = function(item_data,item_aggregator,ctx2)
			  {
				  var cntr = ctx.vars._Cntr[0];
				  aa_prepare_calculated_fields_for_item(cntr.Fields,item_data,aa_merge_ctx(context,ctx2));

				  var fields = ajaxart_field_getFields(cntr,"property sheet");
				  var space = aa_text(data,profile,'Space',context),header = aa_text(data,profile,'HeaderSpace',context),footer=aa_text(data,profile,'FooterSpace',context);
				  
				  var full_width = aa_bool(data,profile,'FullWidth',context);
				  var width = aa_text(data,profile,'PropertiesWidth',context);
				  var result = ajaxart_properties_and_sections(cntr,item_aggregator,item_data,profile,ctx2 || ctx,fields,space,full_width,width,header,footer);
				  $(result).addClass('aa_item');
				  
				  if (item_aggregator) item_aggregator.push(result);
				  return result;
			  };
		  }
		  ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		  return [aspect];
	  },
	  BoxLayout: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
		  aspect.InitializeContainer = function(initData,ctx)
		  {
			  var cntr = ctx.vars._Cntr[0];
			  if (!cntr.IsSingleItem) return; // todo: handle item list
			  
			  cntr.createNewElement = function(item_data,item_aggregator,ctx2)
			  {
				  var cntr = ctx.vars._Cntr[0];
				  var fields = ajaxart_field_getFields(cntr,"property sheet");
				  
				  var orient = aa_text(data,profile,'Orient',context).replace(' ','_');
				  var out = $('<div class="aa_item aa_box_'+orient+'" />')[0]; 

				  for (var j=0;j<fields.length;j++) {
						var field = fields[j];
					    var cell_data = ajaxart_field_calc_field_data(field,item_data,ctx2);
						var field_div = document.createElement('div');
						out.appendChild(field_div);
				    	ajaxart_field_createCellControl(item_data,cntr,field_div,"control",field,cell_data,ctx2);
				  }
				  out.ItemData = item_data;
				  if (item_aggregator) item_aggregator.push(out);
				  return out;
			  }
		  }		 
		  return [aspect];
	  },
	  Vertical: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
		  var initializeContainer = function(initData,ctx)
		  {
			  var cntr = ctx.vars._Cntr[0];
			  cntr.createNewElement = function(item_data,item_aggregator,ctx2)
			  {
				  var cntr = ctx.vars._Cntr[0];
				  var fields = ajaxart_field_getFields(cntr,"property sheet");
				  var space = aa_text(data,profile,'Space',context),header_space = aa_text(data,profile,'HeaderSpace',context),footer_space=aa_text(data,profile,'FooterSpace',context);
				  var align = aa_text(data,profile,'Align',context);
				  var hideTitle = true;
				  
				  var out = $('<div class="aa_item"/>')[0];
				  if (header_space != "")
						$(out).append($('<div style="height: '+ header_space +'"/>'));
				  for (var j=0;j<fields.length;j++) {
						if (j>0)
							$(out).append($('<div style="height: '+ space +'"/>'));
						var field = fields[j];
					    var cell_data = ajaxart_field_calc_field_data(field,item_data,ctx2);
						var field_div = document.createElement('div');
						if (align != "")
							field_div.style.textAlign = align;
						out.appendChild(field_div);
				    	ajaxart_field_createCellControl(item_data,cntr,field_div,"control",field,cell_data,ctx2);
				  }
				  if (footer_space != "")
						$(out).append($('<div style="height: '+ footer_space +'"/>'));
				  out.ItemData = item_data;
				  if (item_aggregator) item_aggregator.push(out);
				  return out;
			  };
		  }
		  ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		  return [aspect];
	  },
	  TabControl: function (profile,data,context)
	  {
		  var aspect = { isObject : true };
		  aspect.InitializeContainer = function(initData,ctx) {
 		    var cntr = ctx.vars._Cntr[0];
 		    cntr.KeepSelectedTabIn = aa_first(data,profile,'KeepSelectedTab',context);
 		    
			cntr.createNewElement = function(item_data,item_aggregator,ctx2)
		    {
 		        var cntr = ctx.vars._Cntr[0];
 		        cntr.Style = aa_first(data,profile,'Style',context);
 		        var tabcontrol = aa_api_object($(cntr.Style.Html),{cntr: cntr, data: item_data, Tabs: []});
 		        aa_defineElemProperties(tabcontrol,'Fields,addTabs,cntr,Tabs,data,tabContents,tabsParent');
 		        tabcontrol.Fields = ajaxart_field_getFields(cntr,"tabs",item_data); 
 		        tabcontrol.addTabs = function(classOrElementForTab,classOrElementForTabContents,init_tab_func)
 		        {
 		        	var tabcontrol = this;
					var inner = this.getInnerElement(classOrElementForTab);
					tabcontrol.tabContents = this.getInnerElement(classOrElementForTabContents);
					if (!inner || !init_tab_func || !tabcontrol.tabContents) return;
					tabcontrol.tabsParent = inner.parentNode;
					
					for(var i=0;i<tabcontrol.Fields.length;i++) {
						var field = tabcontrol.Fields[i];
		 		    	if (!field.RefreshTabOnSelect) field.RefreshTabOnSelect = 'refresh';

						var tab = inner.cloneNode(true);
						tab.Field = field; tab.tabcontrol = tabcontrol;
						if (field.Id) $(tab).addClass("tab_" + field.Id);
						tabcontrol.Tabs.push(tab);
						inner.parentNode.insertBefore(tab,inner);
						var tab_obj = aa_api_object($(tab),{ Field: field, data : tabcontrol.data, Title: field.Title, cntr: tabcontrol.cntr });
						aa_defineElemProperties(tab,'tab_obj,Select,tabcontrol,Field,Contents');						
						tab.tab_obj = tab_obj;
						tab_obj.Image = aa_init_image_object(field.SectionImage,item_data,context);
						var initEvents = function(tab) {
							tab.Select = function() {
								this.tab_obj.Select();
							}
							tab_obj.Select = function () {
								jBart.trigger(tab,'OnBeforeSelect',{});
					    		var jTab = $(tab),cntr = ctx.vars._Cntr[0],field = tab.Field,tabcontrol = tab.tabcontrol; 
					    		// first run validations
					    		var current_cntr = $(tabcontrol.tabContents).find('>.aa_container')[0];
					    		if ( current_cntr && ! aa_passing_validations(current_cntr) )
					    		  return aa_stop_prop(e);
					    		
					  		    var currentID = tab.Field.Id,prevTabField=[];
					  		    var currrentSelectedTab = $(tabcontrol.tabsParent).find('>.aa_selected_tab')[0];
					  		    if (currrentSelectedTab) {
					  		      prevTabField = [currrentSelectedTab.Field];
					  		      if (cntr.BeforeChangeTab) cntr.BeforeChangeTab(prevTabField,context);
					  		      $(currrentSelectedTab).removeClass('aa_selected_tab');
					  		    }
					  		    jTab.addClass('aa_selected_tab');
							    if (cntr.ID != "" && cntr.KeepSelectedTabIn && cntr.KeepSelectedTabIn.Set)
							    	cntr.KeepSelectedTabIn.Set([{Key: cntr.ID + "_tab" , Value: currentID }],context);
	
							    var cleanLeaks = true;
							    if (currrentSelectedTab && currrentSelectedTab.Field.RefreshTabOnSelect == 'no refresh' )
							    	cleanLeaks = false;
							    
							    aa_empty(tabcontrol.tabContents,cleanLeaks);
							    
					    		if (field.RefreshTabOnSelect == 'no refresh' && tab.Contents) {
					    			tabcontrol.tabContents.appendChild(tab.Contents);
					    		}
							    if (field.DoWhenUserClicksTab) field.DoWhenUserClicksTab([],context);
							    
					    		if (field.RefreshTabOnSelect == 'refresh' || ! tab.Contents) {
								    var field_data = ajaxart_field_calc_field_data(field,item_data,ctx2 || ctx);
							    	var control = aa_runMethod(field_data,field,'Control',ctx2 || ctx);
									if (control.length > 0) {
										tabcontrol.tabContents.appendChild(control[0]);
										tab.Contents = control[0];
										aa_element_attached(control[0]);
									}
					    		}
				  		        if (cntr.AfterTabLoaded) cntr.AfterTabLoaded([tab.Field],aa_ctx(context,{PreviousTab: prevTabField}));
				  		        aa_fixTopDialogPosition();
								jBart.trigger(tab,'OnAfterSelect',{});
							}
						}
						initEvents(tab);
						init_tab_func(tab_obj);
					}
					tabcontrol.RefreshTabsVisibility = function(data2,ctx3) {
						for(var i=0;i<tabcontrol.Tabs.length;i++) {
							var tab = tabcontrol.Tabs[i];
							if (tab.Field.ShowTabOnCondition && !ajaxart.tobool_array(tab.Field.ShowTabOnCondition(data2,ctx3)))
								tab.style.display = 'none';
							else
								$(tab).show();
						}
						jBart.trigger(tabcontrol, 'TabsChanged', {});
					}
					tabcontrol.RefreshTabsVisibility(item_data,ctx2);
					inner.parentNode.removeChild(inner);
 		        }
				aa_apply_style_js(tabcontrol,cntr.Style);
				tabcontrol.jElem.addClass( aa_attach_global_css(cntr.Style.Css) );
 		        
	 		    // select a tab
	 		    var tabs = tabcontrol.Tabs;
	 		    if (tabs.length > 0) {
	 		      var selectedTab = tabs[0];
	 		      if (cntr.KeepSelectedTabIn && cntr.KeepSelectedTabIn.Get) {
				      var currentID = aa_totext( cntr.KeepSelectedTabIn.Get([cntr.ID + "_tab"],context) );
		 		      for(var i=0;i<tabs.length;i++) {
		 		    	  if (currentID == tabs[i].Field.Id) selectedTab = tabs[i];
		 		      }
	 		      }
	 		      selectedTab.Select();
	 		    }
	 		    tabcontrol.jElem.addClass('aa_tabcontrol'); // for ChangeTab operation
	 		    tabcontrol.jElem[0].Cntr = cntr; // for ChangeTab operation
	 		    tabcontrol.jElem[0].TabControl = tabcontrol;
	 		    
		        if (item_aggregator) item_aggregator.push(tabcontrol.jElem[0]);
			    return tabcontrol.jElem[0];
		    }			  
		  }
		  return [aspect];
	  },
	  AlignRight: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		var init = function(aspect) {
			aspect.InitializeContainer = function(data1,ctx) {
				var cntr = ctx.vars._Cntr[0];
				$(cntr.Ctrl).addClass('aa_rightalign');
			}
		}
		init(aspect);
		
		return [aspect];
	  },
	  ItemText: function (profile,data,context)
	  {
		var aspect = { isObject : true };
		var useHtml = aa_bool(data,profile,'UsingHtmlElement',context);
		aspect.InitializeContainer = function(initData,ctx)
		{
			var cntr = context.vars._Cntr[0];  //  TODO: change to ctx
			if (!aa_bool(data,profile,'Secondary',context))
				aa_addMethod(cntr,'ItemText',profile,'ItemText',context);
			var refresh = function(elems,ctx) {
				var elem = elems[0];
				var text = ajaxart.totext_array(aa_runMethod(elem.ItemData,cntr,aa_ctx(ctx,{_ItemElement: [elem]})));
				$(elem).children(".aa_text").text(text);
			};
			if (useHtml) {
				refresh = function(elems,ctx) {
					var elem = elems[0];
					var text = aa_runMethod(elem.ItemData,cntr,'ItemText',aa_ctx(ctx,{_ItemElement: [elem]}));
					if (useHtml && text[0] && text[0].nodeType && text[0].nodeType == 1) 
	  				  text = text[0]; // html
					else
					  text = aa_totext(text);
					
					$(elem).children(".aa_text").html(text);
				};
			}
			aa_register_handler(cntr,'RefreshItemTextAndImage', refresh);
		}		
		aspect.InitializeElements = function(initData,ctx)
		{
			var cntr = context.vars._Cntr[0]; // //  TODO: change to ctx
			var id = aa_text(data,profile,"ID",context);
			var cls = aa_text(data,profile,"Class",context);
			if (cls) cls = ' ' + cls;
			var elems = ctx.vars._Elems;
			if ( elems.length == 0 ) return [];
			aa_addMethod(this,'ItemText',profile,'ItemText',context);
			for(var i=0;i<elems.length;i++)
			{
				var elem = elems[i];
				var text = this.ItemText(elem.ItemData,aa_ctx(ctx,{_ItemElement: [elem]}));
				if (useHtml && text[0] && text[0].nodeType && text[0].nodeType == 1) 
  				  text = text[0]; // html
				else
				  text = aa_totext(text);
				
				var span = document.createElement('span');
				span.className = "aa_text " + id + cls;
				span.setAttribute("tabindex",1);
				if (useHtml)
					$(span).html(text);
				else
					$(span).text(text);
				
				ajaxart_uiaspects_append(elem,span);
			}
		}
		return [aspect];
	},
	Indent: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var indentCss = aa_attach_global_css(aa_text(data,profile,'Css',context),null,'indented');
		
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			$(cntr.Ctrl).find('.aa_list').addClass('aa_indented').addClass(indentCss);
			if (aa_bool(data,profile,"Lines",ctx))
				$(cntr.Ctrl).addClass('aa_lined');
		}

		var initializeElements = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var elems = ctx.vars._Elems;
			if (aa_bool(data,profile,"Lines",ctx))
				for(var i=0;i<elems.length;i++)
				{
					var elem = $(elems[i]);
					var hitarea = elem.find('>.hitarea');
					if (elem.nextAll('.aa_item').length == 0)
					{
						elem.addClass("last");
						hitarea.addClass("last");
					}
					else
					{
						elem.removeClass("last");
						hitarea.removeClass("last");
					}
				}
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
		return [aspect];
	},
	ExpandAllText: function (profile,data,context)
	{
		var isNewItem = false;
		if (context.vars.IsNewItem && ajaxart.totext_array(context.vars.IsNewItem) == "true")
			isNewItem = true;
		
		ajaxart_saveDetailsAndRefresh(context.vars._InnerItem,context.vars.ItemPage[0].Fields,context,function() {});
		var item = ajaxart.runNativeHelper(data,profile,'Elem',context);

		var tds = $(item).find('>.aa_cell_element');
		for(var i=0;i<tds.length;i++)
			if (tds[i].expandableText)
				tds[i].expandableText.Build(tds[i].expandableText.States['control']);
		
		return [];
	},
	DisableSelection: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			if (aa_bool(data,prfile,'Disable',context))
				$(cntr.Ctrl).addClass('aa_non_selectable');
			else
				$(cntr.Ctrl).removeClass('aa_non_selectable');
		}
		
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	InheritSelection: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			if (aa_bool(data,profile,'Inherit',context))
				$(cntr.Ctrl).addClass('aa_inherit_selection');
			else
				$(cntr.Ctrl).removeClass('aa_inherit_selection');
			return [];
		}
		
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	TreeNode: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var createContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.Ctrl = $('<ul style="list-style: none; padding:0; white-space: normal;" class="aa_container aa_list aa_inherit_selection"/>')[0];
			cntr.TreeNode = true;
			if (ctx.vars._ParentCntr && ! ctx.vars._ParentCntr.TreeNode)
				ctx.vars._ParentCntr[0].Tree = true;
		}
		
		ajaxart_addScriptParam_js(aspect,'CreateContainer',createContainer,context);
		return [aspect];
	},
	NextLevelsByFields: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.Tree = true;
		    cntr.createNewElement = function(item_data,item_aggregator,ctx2)
		    {
				var cntr = ctx.vars._Cntr[0];
				var li = document.createElement('li');
				li.className = "aa_item";
				li.ItemData = item_data;
		    	ajaxart_add_foucs_place(li);

				var fieldIds = ajaxart.run(item_data,profile, 'FieldIds', context);
				for(var i=0;i<fieldIds.length;i++)
				{
					var id = fieldIds[i];
					var field = aa_fieldById(id,cntr.Fields);
					if (field == null) {
						ajaxart.log("Can not find field '" + id +"'");
						continue;
					}
					var field_data = ajaxart_field_calc_field_data(field,item_data,ctx2 || ctx);
					ajaxart_field_createCellControl(item_data,cntr,li,'control',field,field_data,ctx2||ctx)
//					var ctrl = ajaxart.runScriptParam(field_data,field.Control,context)[0];
//					li.appendChild(ctrl);
				}
				
		    	if (item_aggregator) item_aggregator.push(li);
				return li;
		    };
		    cntr.next = function(elem,cntr) { return ajaxart_tree_next(elem,cntr) };
		    cntr.prev = function(elem,cntr) { return ajaxart_tree_prev(elem,cntr) };
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	NextLevels: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.Tree = true;
		    cntr.createNewElement = function(item_data,item_aggregator,ctx2)
		    {
				var li = document.createElement('li');
				li.className = "aa_item";
				li.ItemData = item_data;
		    	ajaxart_add_foucs_place(li);

				var newContext = aa_merge_ctx(context,ctx2||ctx); 
				var innerContainer = ajaxart.runNativeHelper(item_data,profile,'InnerContainer',newContext);
				if (innerContainer.length > 0)
					li.appendChild(innerContainer[0]);
				
		    	if (item_aggregator) item_aggregator.push(li);
				return li;
		    };
		    cntr.next = function(elem,cntr) { return ajaxart_tree_next(elem,cntr) };
		    cntr.prev = function(elem,cntr) { return ajaxart_tree_prev(elem,cntr) };
		}
		aa_addMethod_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	
	NextLevelsLight: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.Tree = true;
			$(cntr.Ctrl).find('.aa_listtop');
		    cntr.createFlatElement = function(item_data)
		    {
				var li = document.createElement('li');
				li.className = "aa_item";
				li.ItemData = item_data;
		    	ajaxart_add_foucs_place(li);
				
				return li;
		    };
		    cntr.createNewElement = function(item_data,item_aggregator,ctx2,depth,data_items)
		    {
		    	if (data_items == null) data_items = cntr.Items[0];
		    	if (depth == undefined) depth = cntr.DefaultDepth;
		    	var li = this.createFlatElement(item_data);
		    	var nextlevelItems = aa_first(item_data,profile,'NextLevel',aa_ctx(context,{_DataItems: [data_items] })); 
//		    	var nextlevelItems = aa_runMethod(item_data,data_items,'NextLevel',context)[0];
		    	if (nextlevelItems)
				  this.buildNodesUnderElement(li,nextlevelItems,depth,item_aggregator,ctx2);
		    	if (item_aggregator) item_aggregator.push(li);
				return li;
		    };
		    cntr.insertNewElement = function(elem,parent)
		    {
		    	var ul = $(ajaxart_find_list_under_element(parent));
		    	if (ul.length == 0)
		    	{
		    		ul = document.createElement('ul');
		    		ul.className = "aa_list";
		    		parent.appendChild(ul);
		    		ul.appendChild(elem);
		    	}
		    	else
		    		ul[0].appendChild(elem);
		    };
		    cntr.buildNodesUnderElement = function(elem,data_items,depth,item_aggregator,ctx2) 
		    {
		    	if (depth == 0) return;
		    	if (data_items != null) // && data_items.Items.length > 0)
		    	{
		    		var ul = document.createElement('ul');
		    		ul.className = "aa_list aa_treenode aa_items_listener";
		    		ul._Items = data_items;
		    		aa_defineElemProperties(ul,'RefreshAfterItemsChanged');
		    		ul.RefreshAfterItemsChanged = function() {
		    			aa_remove(this,true); 
		    			var cntr = ctx.vars._Cntr[0]; 
		    			cntr.buildNodesUnderElement(elem,data_items,depth,item_aggregator,ctx2);
		    			var newcontext = aa_ctx(ctx2 || ctx,{_Elems: $(elem).find('>.aa_list .aa_item').get() });
		    			for(var i=0;i<cntr.Aspects.length;i++)
		    		    	aa_runMethod([],cntr.Aspects[i],'InitializeElements',newcontext)
		    		}
		    		elem.appendChild(ul);
					for(var i=0;i<data_items.Items.length;i++)
					{
						var child = data_items.Items[i];
				    	var li = this.createNewElement([child],item_aggregator,ctx2,depth-1,data_items);
				    	ul.appendChild(li);
					}
		    	}
		    };
		    cntr.next = function(elem,cntr) { return ajaxart_tree_next(elem,cntr) };
		    cntr.prev = function(elem,cntr) { return ajaxart_tree_prev(elem,cntr) };
	  		var expandLevel = aa_text(data,profile, 'ExpandLevel', ctx);

	  		if (!cntr.DefaultDepth) {
		  		cntr.DefaultDepth = 1;
				if (expandLevel == "root level") cntr.DefaultDepth = 1;
				else if (expandLevel == "first level") cntr.DefaultDepth = 2;
				else if (expandLevel == "all") cntr.DefaultDepth = 17;
	  		}
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	MaxTreeDepth: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var depth = aa_int(data,profile,'Depth',context);
			if (depth > 0) 
				cntr.DefaultDepth = depth;
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	Shortcuts: function (profile,data,context)
    {
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.ShortcutsEnabled = ["true"];
			var shortcut_matchs_event = ajaxart_shortcut_matchs_event(); // returns a function. used to initializes constants.
			var handleShortcutsFunc = function(cntr) { return function(e)
			{
				// prevent the browser scroll bar from moving. dangerous code for html primitive tags (e.g. input)
				var selection_codes = [32,33,34,35,36,37,38,39,40, 63277,63276];
				for(var i=0;i<selection_codes.length;i++)
					if (e.keyCode == selection_codes[i]) {
						ajaxart_stop_event_propogation(e);
						break;
					}
				
			    var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  ); 
			    if (elem.filter(':input,:radio,:checkbox').length > 0) return true;
	  		    if (elem.hasClass("aa_item"))
	  		    	var item_elem = elem;
	  		    else
	  		    	var item_elem = elem.parents('.aa_item').slice(0,1);
		    	var cntrs = elem.parents('.aa_container').filter(function() { return !this.Cntr.TreeNode; } );
		    	if (cntrs.length == 0 || cntrs[0].Cntr != ctx.vars._Cntr[0]) return true;
				var cntr = ctx.vars._Cntr[0];

	  	    	var top_cntr = ajaxart_topCntr($(cntr.Ctrl));
	  	    	var top_cntr_list = ajaxart_find_aa_list(top_cntr);
	  		    if ($(top_cntr_list).find('.aa_selected_item').length)
	  		    	item_elem = $(top_cntr_list).find('.aa_selected_item');
	
				var ops = aa_runMethod([],cntr,'Operations',cntr.Context);
				for(var i=0;i<ops.length;i++)
				{
					var op = ops[i];
					if (op.Shortcut != null)
					{
						if (shortcut_matchs_event(op.Shortcut,e))
						{
							var item_data = item_elem[0].ItemData;
	  	  	    			var newContext = aa_ctx(ctx, 
  	    					{	_Cntr: [cntr], 
  	    						 ControlElement : [elem[0]],
  	    						_ItemsOfOperation: item_data,
  	    						_ElemsOfOperation: [item_elem[0]] });
							aa_runMethod(item_data,op,'Action',newContext);
						}
					}
		  	    }
		  	    return true; 
			}}
			var cntr = ctx.vars._Cntr[0];
			aa_bind_ui_event(aa_find_list(cntr),'keydown',handleShortcutsFunc(cntr));
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
    },
    OnDoubleClick: function (profile,data,context)
    {
	var aspect = { isObject : true };
	var initializeContainer = function(initData,ctx)
	{
		var cntr = ctx.vars._Cntr[0];
		var runOperation = function(elem)
		{
			if (elem.length == 0) return;
			var item = elem[0].ItemData;
	    	var newContext = aa_ctx (ctx,{ _ItemsOfOperation: item, _ElemsOfOperation: elem.get(), ControlElement: elem.get() });
	    	ajaxart.run(item,profile,'Action',newContext);
		}
  		var keyHit = function (e)
  		{
	  	    if (e.keyCode == 13 && !e.ctrlKey && !e.altKey && !e.shiftKey)
	  	    {
	  	    	var cntr = ctx.vars._Cntr[0];
	  	    	var elem = $(cntr.Ctrl).find('.aa_selected_item').slice(0,1);
	  		    if (elem.length > 0)
	  		    	runOperation(elem);	
	  	    }
  		};
  		var dblClick = function (e)
  		{
		    var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );
		    var item_elem  = $([]);
		    if (elem.hasClass("aa_item"))
		    	item_elem = elem;
		    else if (elem.parent().hasClass("aa_item"))
		    	item_elem = elem.parent();
	
  		    if (item_elem.length > 0)
  		    	runOperation(item_elem);	
  		};
  		aa_bind_ui_event(cntr.Ctrl,'keyup',keyHit);
  		aa_bind_ui_event(cntr.Ctrl,'dblclick',dblClick);
	}
	ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
	return [aspect];
    },
	ExpandCollapse: function (profile,data,context)
	{
		var hitAreaCssClass = aa_attach_global_css( aa_text(data,profile,'HitAreaCss',context),null,'hitarea');
		var aspect = { isObject : true };
		var itemSelectionCssClass = aa_attach_global_css(aa_first(data,profile,'Css',context).Css);
  		
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.IgnoreItemSelectionCssClass = true;
			cntr.hitAreaCssClass = hitAreaCssClass;
			cntr.CollapseElem = function (elem,collapse)
	  		{
				if (!elem) return;
	 			var uls = elem.find('>.aa_list,>.aa_container');
	 			if (uls.length == 0) return;
  				if (elem.find('>.hitarea').length == 0 && elem.find('>.aa_list>.aa_item').length > 0) {
				  var hitarea = document.createElement('div');
				  hitarea.className = "hitarea expandable " + hitAreaCssClass;
				  elem[0].insertBefore(hitarea,elem[0].firstChild);
		  		}

	 			if (collapse == null)
	  			{
	  				elem[0].collapsed = ! elem[0].collapsed;
	  				collapse = elem[0].collapsed;
	  			}
	  			else
	  				elem[0].collapsed = collapse;

	 			for(var i=0;i<uls.length;i++)
	 			{
		 			var ul = uls[i];
					var hitarea = elem.find('>.hitarea').slice(0,1);
					if (elem[0].collapsed && $(ul).find('.aa_item').length > 0) // a ul fitout items is always expanded (for drag and drop purposes) 
					{
						ul.style.display = 'none';
						ul.display = 'none';
						hitarea.addClass("expandable");
						hitarea.removeClass("collapsable");
					}
					else
					{
						ul.style.display = 'block';
						ul.display = 'block';
						hitarea.addClass("collapsable");
						hitarea.removeClass("expandable");
					}
	 			}
	 			aa_invoke_cntr_handlers(cntr,cntr.RefreshItemTextAndImage,elem,ctx);
	  		}
	  		cntr.CollapseSiblings = function (data1,ctx)
		    {
	  			var elem = $(data1);
		    	var other_elems = elem.parent().find('.aa_item').filter(function(){ return elem[0] != this });
		    	other_elems.each( function() { 
		    		cntr.CollapseElem($(this),true);
		    	} );
		    }

	  		cntr.ToggleByKeyboard = function (e)
	  		{
		  	    if (e.keyCode == 39 || e.keyCode == 37)  // right - expand
		  	    {
		  		    var cntr = ctx.vars._Cntr[0];
		  		    var item_elem = $(cntr.Ctrl).find('.aa_selected_item').slice(0,1);
		  		    if (item_elem.length == 0) return true; 
		  		    
		  	    	var expand = (e.keyCode == 39);
		  	    	if (item_elem.parents('.right2left').length>0)
		  	    		expand = ! expand;

		  	    	if (expand && item_elem[0].collapsed || (!expand && ! item_elem[0].collapsed) )
		  	    		cntr.CollapseElem(item_elem);
		  	    	return false;
	  	        }
	  	  	    return true;
	  		}
			var toggleByClick = function (e)
	  		{
				var cntr = ctx.vars._Cntr[0];
			    var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );  

	  		    if (! (elem.hasClass("hitarea") || elem.hasClass("aa_item_image") || aa_bool(data,profile,'TextInHitArea',context) )) return true;
	  		    // important - otherwise parent cntrs will expand/collapse it again.
			    if (elem.parents('.aa_container')[0].Cntr != cntr) 
			    	return true;

		    	var item_elem = elem.parents('.aa_item').slice(0,1);
			    cntr.CollapseElem(item_elem);
			    return false;
	  		};

	  		var collapseLevel = aa_text(data,profile,'CollapseLevel',context);
			var collapseFirstLevels = function(initData,ctx2)
			{
				var cntr = ctx.vars._Cntr[0];
				var elems = $(ajaxart_container_elems(cntr)); //.filter(aa_visible);
				elems.each(function() { 
					cntr.CollapseElem($(this),true); 
				});
				if (collapseLevel == 'first') // open first level
				{
					var first_level = function() 
					{ 
						var jcntr = $(this).parents('.aa_item').slice(0,1).parents('.aa_container');
						return jcntr.length == 0 || jcntr[0].Cntr != cntr; 
					}
					elems.filter(first_level).each(function() { 
						cntr.CollapseElem($(this),false); 
					});
				}
			}
			if (collapseLevel != 'expand all')
			{
				ctx.vars._Cntr[0].RegisterForPostAction(ctx._This);
				ajaxart_addScriptParam_js(ctx._This,'PostAction',collapseFirstLevels,ctx);
			}

	  		aa_bind_ui_event(aa_find_list(cntr),'keyup',cntr.ToggleByKeyboard);
			aa_bind_ui_event(cntr.Ctrl,'click',toggleByClick);
		}
		var initializeElements = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var elems = ctx.vars._Elems;
			for(var i=0;i<elems.length;i++)
			{
				var elem = elems[i];
				$(elem).addClass(itemSelectionCssClass);
				if (!ajaxart_isLeaf(elem))
				{
					$(elem).addClass('non_leaf');
					elem.collapsed = false;
					
					var hitarea = document.createElement('div');
					hitarea.className = "hitarea collapsable " + hitAreaCssClass;
					elem.insertBefore(hitarea,elem.firstChild);
				}
			};
		};

		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
		return [aspect];
	},
	ItemImage: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var itemImageCss = aa_attach_global_css( aa_text(data,profile,'Css',context) , context, 'item_image');
		
		aspect.InitializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			aa_addMethod(cntr,'ItemImage',profile,'ItemImage',context);
		}
		var initializeElements = function(initData,ctx)
		{
			if (aa_bool(data,profile,'CapabilitiesOnly')) return;
			var cntr = ctx.vars._Cntr[0];
			var elems = ctx.vars._Elems;
			var compiledFunc = ajaxart.compile(profile,'ItemImage',ctx);
			var imageForLeafs = aa_text(data,profile,'ImageForLeafs',ctx);

			for(var i=0;i<elems.length;i++)
			{
				var elem = elems[i];
				if ($(elem).find('>.aa_item_image').length) continue;

				var ctx2 = aa_ctx(ctx,{_ItemElement: [elem]});
				var image = "";
				var isLeaf = ajaxart_isLeaf(elem);
				if (imageForLeafs == 'none' && isLeaf) continue;
				if (imageForLeafs != '' && isLeaf) 
					image = imageForLeafs;
				else if (compiledFunc == "same") 
					image = ajaxart.totext_array(elem.ItemData);
				else if (compiledFunc == null)
					image = aa_text(elem.ItemData,profile,"ItemImage",ctx2);
				else
					image = ajaxart.totext_array(compiledFunc(elem.ItemData,ctx2));
				if (image == "") continue;
				var newElem = document.createElement('img');
				newElem.className = "aa_item_image " + itemImageCss;
				newElem.setAttribute("src",image);
				newElem.setAttribute("height","16px");
				newElem.style.maxWidth = '26px';

				ajaxart_uiaspects_append(elem,newElem);
			}
		}
		ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
		return [aspect];
	},
	  CheckBox: function (profile,data,context)
	  {
		var aspect = { isObject : true };

		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];

			cntr.ToogleCheckbox = function(ctx,item_elem)
	  		{
				var cntr = ctx.vars._Cntr[0];
				var item_data = item_elem[0].ItemData;
	  			var selector = cntr.Selector;
	  			var newContext = aa_ctx(ctx,{ControlElement: [cntr.Ctrl], _Item: item_data, _Elem : item_elem });
	  			if (selector != null)
	  				ajaxart.run(item_data,selector.Toggle.script, '', selector.Toggle.context);
				ajaxart.run(item_data,profile, 'OnSelect', newContext);
	  		};

			var checkboxClicked = function (e)
 	  		{
				var cntr = ctx.vars._Cntr[0];
			    var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );  
 			    if (! elem.hasClass('aacheckbox_value')) return;

 			    var item_elem = elem.parents('.aa_item').slice(0,1);
 			    if (aa_bool(data,profile, 'SelectOnCheck', context))
 			    	ajaxart_uiaspects_select(item_elem,$(),"mouse",ctx);
 			    cntr.ToogleCheckbox(ctx,item_elem);
 			    if (ajaxart.controlOfFocus != null) // give the focus back
  	  	    		$(ajaxart.controlOfFocus).focus();

 				return true;
 	  		};

 	  		var onkeyup = function(e) { 
				var cntr = ctx.vars._Cntr[0];
  				var selectWithEnter = aa_bool(data,profile, 'SelectWithEnter', ctx);
	  	        if (e.keyCode == 32 || (selectWithEnter && e.keyCode == 13) )  // Spacebar or Enter
	  	        {
				    var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );  

	  			    if (elem.hasClass('aa_item'))
	  			    	var item_elem = elem;
	  			    else
	  			    	var item_elem = elem.parents('.aa_item').slice(0,1);
	  			    var checkbox = item_elem.find('>.aacheckbox_value');
	  	        	if (checkbox.length > 0)
	  	        	{
	  	        		aa_checked(checkbox[0], ! checkbox[0].checked) ;
	  	 			    cntr.ToogleCheckbox(ctx,item_elem);
	  	        	}
  	        	return false;
	  	        }
	  	  	    return true;
			  }
			
			aa_bind_ui_event(cntr.Ctrl,'keyup',onkeyup);
			aa_bind_ui_event(cntr.Ctrl,'click',checkboxClicked);

			var selector = aa_first(data,profile, 'Selector', ctx);
			cntr.Selector = selector;
		}
		var initializeElements = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var elems = ctx.vars._Elems;
			var selector = aa_first(data,profile, 'Selector', ctx);
			var includeIntermediateNodes = aa_bool(data,profile, 'IncludeIntermediateNodes', ctx);
			
			for(var i=0;i<elems.length;i++)
			{
				var elem = elems[i];
				var use_checkbox = ajaxart_isLeaf(elem) || includeIntermediateNodes;
		
				if (use_checkbox && selector != null)
				{
						var input = document.createElement('input');
						input.className = "aacheckbox_value";
						input.setAttribute("type","checkbox");
						if (selector.IsSelected != undefined && aa_bool(elem.ItemData,selector.IsSelected.script, '', selector.IsSelected.context))
							aa_checked(input,true);
						ajaxart_uiaspects_append(elem,input);
				}
			}
		};
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
		return [aspect];
	  },
	ContextMenu: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			  var openContextMenu = function(e) {
				  	e = e || event;
				    if (e.button != 2) return true;
				 
					var cntr = ctx.vars._Cntr[0];
			    var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  );  

					if (! elem.hasClass("aa_item"))
						elem = elem.parents(".aa_item").slice(0,1);
				    if (elem.length == 0) return true;
				    // check that elem is of the same container
				    if (elem.parents('.aa_container')[0].Cntr != cntr) 
				    	return true;
				    var item_data = elem[0].ItemData;
	
				    // select first
//				    var selected = $(cntr.Ctrl).find(".aa_selected_item");
//				    ajaxart_uiaspects_select(elem, selected,"uiaction",ctx);

  	  	    		var newContext = aa_ctx( cntr.Context, {
  	  	    			_CurrentFocus: [elem.find('>.aa_text')[0]], 
  	  	    			_ItemsOfOperation: item_data, 
  	  	    			_ElemsOfOperation: [elem[0]],
  	  	    			MousePos: [ { isObject: true, pageX: e.pageX || e.clientX, pageY: e.pageY || e.clientY} ],
  	  	    			_RefreshAfterOperation : aa_text(data,profile, 'RefreshAfterOperation', ctx)
  	  	    			 });

  	  	    		ajaxart.runNativeHelper(item_data,profile,'ContextMenuImp',newContext);
				    return false;
				  };
		    var top = ajaxart_find_aa_list(cntr);

		    $(top).bind('contextmenu', function() { return false; });
			aa_bind_ui_event(top,"mouseup",openContextMenu);
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	HeaderFooter: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var init = function(aspect) {
		aspect.HeaderFooterID = aa_text(data,profile, 'Identifier', context);
		aspect.ID = "headerfooter_" + aa_text(data,profile, 'Identifier', context); 
		aspect.refresh = function(data1,ctx)
		{
			var cntr = ctx.vars._Cntr[0]; 
			var items = cntr.Items[0].Items || [];
			var newContext = aa_merge_ctx(context,ctx,{
				HeaderFooterCntr: cntr,
				TotalItemsCount: [items.length],
				FilteredItemsCount: [cntr.FilteredWrappers? cntr.FilteredWrappers.length : items.length]
				});
			newContext.vars.HeaderFooterCntr = ctx.vars._Cntr;
			newContext.vars.DataHolderCntr = ctx.vars.DataHolderCntr || ctx.vars._Cntr;
			newContext.vars.Items = aa_items(cntr);
			var id = aspect.HeaderFooterID;
			var location = aa_text(data,profile, 'Location', newContext);
			var ctrl = ajaxart.run(data,profile,'Control',newContext);
			var cls = 'HeaderFooter_' + id;
			var header = $(aa_find_header(cntr));
			if (header.length == 0) return;
			
			if ( aa_text(data,profile,'RefreshStrategy',context) == 'none'	&& header.find('>.' + cls).length > 0 )
				return;

			if (ctrl.length > 0)
			{
				$(ctrl[0]).addClass(cls);
				
				if (location.indexOf('header') != -1)
				{
					var existing = header.find('>.' + cls);
					if (existing.length > 0)
						existing.replaceWith(ctrl[0]);
					else
					{
						var placeToAdd = header;
						if (placeToAdd.length > 0) 
							placeToAdd[0].appendChild(ctrl[0]);
					}
				}
				if (location.indexOf('footer') != -1)
				{
					var ctrl = ajaxart.run(data,profile,"Control",newContext); // another copy of ctrl
					$(ctrl[0]).addClass('HeaderFooter_' + id);
					var existing = $(aa_find_footer(cntr)).find('>.' + cls);
					if (existing.length > 0)
						existing.replaceWith(ctrl[0]);
					else
					{
						var placeToAdd = $(cntr.Ctrl).find('>.aa_container_footer');
						if (placeToAdd.length > 0) 
							placeToAdd[0].appendChild(ctrl[0]);
					}
				}
			}
			return [];
		}
		aspect.PreAction = aspect.PostAction = function(data1,ctx) { return aspect.refresh(data1,ctx); }
		aspect.InitializeContainer = function(data1,ctx)
		{
			var cntr = ctx.vars._Cntr[0]; 
			var phase = aa_int(data,profile,'Phase',context);
			if (aa_bool(data,profile,'RunAfterPresentation',context))
				cntr.RegisterForPostAction(aspect,phase);
			else
				cntr.RegisterForPreAction(aspect,phase);

			if (aa_text(data,profile,"RefreshStrategy",context) == "item selection")
			{
				function refreshHeaderFooter(selected_elem,ctx2)
				{
		  	    	var newContext = aa_ctx(ctx2,{ 
		  	    			_ItemsOfOperation: selected_elem.ItemData, 
		  	    			_ElemsOfOperation: [selected_elem] });
		  	    		
		  	    	aspect.refresh(data,newContext);
				}
				aa_register_handler(cntr,'Selection', refreshHeaderFooter);
			}
			if (aa_text(data,profile,"RefreshStrategy",context) != "none")
			{
				aa_register_handler(cntr,'ContainerChange', aspect.refresh);
			}
			return [];
		}
		}
		init(aspect);
		return [aspect];
	},
	SeparatorControl: function (profile,data,context)
	{
		var aspect = {isObject:true};
		aa_set_initialize_container(aspect,function(aspect,ctx,cntr) {
			cntr.SeparatorControl = function(data1,ctx) {
				return ajaxart.run(data1,profile,'Control',aa_merge_ctx(context,ctx));
			}
		});
		return [aspect];
	},
	ItemSelection: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var select =  function(new_selected,selected,method,ctx,focus)
		{
	  	    if (new_selected.length > 0 && (selected.length == 0 || new_selected[0] != selected[0]))
  	  	    {
  	  	    	var inner_cntr = new_selected.parents('.aa_container')[0].Cntr;
	  	    	var top_cntr = ajaxart_topCntr(new_selected);

	  	    	var top_cntr_list = ajaxart_find_aa_list(top_cntr);

  	  	    	$(top_cntr_list).find('.aa_selected_item').removeClass("aa_selected_item " + top_cntr.ItemSelectionCssClass);
	  	    	$(top_cntr_list).find('.aa_selected_itemtext').removeClass("aa_selected_itemtext");

  	  	    	new_selected.addClass("aa_selected_item ");
  	  	    	if (! top_cntr.IgnoreItemSelectionCssClass)
  	  	    	  new_selected.addClass(top_cntr.ItemSelectionCssClass);

  	  	    	new_selected.find('>.aa_text').addClass("aa_selected_itemtext");
  	  	    
  	  	    	if (inner_cntr.SoftSelector)
  	  	    	{
  	  	    		var id = inner_cntr.ItemId(new_selected[0].ItemData,new_selected[0]);
  				    ajaxart.runScriptParam([id],inner_cntr.SoftSelector.WriteValue,ctx);
  	  	    	}

  	  	    	var selectionAction = function()
  	  	    	{
  		  	    	var top_cntr = ctx.vars._Cntr[0];
  		  	    	if (new_selected.parents('.aa_container')[0])
  		  	    		var inner_cntr = new_selected.parents('.aa_container')[0].Cntr;
  		  	    	else
  		  	    		var inner_cntr = top_cntr;
  		  	    	
  	  	    		var newContext = aa_ctx(ctx,{_Cntr: [inner_cntr], _SelectionMethod: [method], _Item : new_selected[0].ItemData
  	  	    		               , _SelectedItem : new_selected[0].ItemData, _Elem : [new_selected[0]] , ControlElement : [new_selected[0]], _ElemsOfOperation: [new_selected[0]] });
  	  	    		ajaxart.run(new_selected[0].ItemData,profile,'OnSelect',newContext);
  	  	    		
  	  	    		aa_invoke_cntr_handlers(inner_cntr,inner_cntr.Selection,new_selected[0],newContext); // depricated - should be removed
  	  	    		jBart.trigger(inner_cntr,'selection',{selected: new_selected[0], context: newContext, method: method});
  	  	    		
  	  	    		// notify the top container
  	  	    		if (top_cntr != inner_cntr)
  	  	    		{
  	  	  	    		var newContext = aa_ctx(ctx,{_InnerCntr: [inner_cntr], _SelectionMethod: [method], _Item : new_selected[0].ItemData
 	    		               , _SelectedItem : new_selected[0].ItemData, _Elem : [new_selected[0]] , ControlElement : [new_selected[0]] });
  	  	  	    		aa_invoke_cntr_handlers(top_cntr,top_cntr.Selection,new_selected[0],newContext);
  	  	    		}
  	  	    		
  	  	    		var focuson = new_selected;  // aa_item should have tabindex="1"

  	  	    		if (method == "keyboard" || (method == "mouse" && top_cntr.PicklistPopup )) // move popup scroll after arrow down, to make sure element is visible
  	    	  	    {
  		    	  	  	if (ajaxart.controlOfFocus)
  		    	  	  		ajaxart.controlOfFocus.IgnoreBlur = true;
  		    	  	  	focuson.focus();
  		  	  	    	if (ajaxart.controlOfFocus) // give the focus back
  		  	  	    		$(ajaxart.controlOfFocus).focus();
  	    	  	    }
  	    	  	    else if (method == "mouse" || focus) {
  	    	  	    	focuson.focus();
  	    	  	    }

  	  	    		return true;
  	  	    	};
  	  	    	if (method == "keyboard")
  	  	    		aa_delayedRun(selectionAction,ctx,300,0);
  	  	    	else
  	  	    		selectionAction();
  	  	    }
		}
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.Select = select;
			cntr.DAndDOwner = "";

			cntr.ItemSelectionCssClass = aa_attach_global_css(aa_text(data,profile,'Css',context),cntr);  // allows overriding
			
			if (aa_paramExists(profile,'FilterOnFirstSelected')) {
				cntr.FilterOnFirstSelected = function(data1,ctx) {
				  return aa_frombool( aa_bool(data1,profile,'FilterOnFirstSelected',aa_merge_ctx(context,ctx)) );
				}
			}
			var auto_select = aa_text(data,profile,"AutoSelectFirstItem",ctx);
			var postAction = function(initData,ctx2)
			{
				var cntr = ctx.vars._Cntr[0];
				var elems = $(ajaxart_container_elems(cntr)); //.filter(aa_visible);
				if (ajaxart_itemlist_getSelectedItems(cntr).length > 0) return;	// already one selected
				if (cntr.SoftSelector) return [];
				if (cntr.FilterOnFirstSelected) {
					for(var i=0;i<elems.length;i++) {
						if (aa_tobool(cntr.FilterOnFirstSelected(elems[i].ItemData,ctx2))) {
					      ajaxart_uiaspects_select($(elems[i]),$([]),"auto",ctx2);
					      return;
						}
					}
				}
				if (aa_bool(data,profile,"KeyboardSupport",ctx))
				{
					var filters = $(aa_find_header(cntr)).find('>.aa_filters');
					if (filters.length > 0)
						aa_bind_ui_event(filters[0],'keydown',onkeydown);
				}

				if (elems.length > 0) {
					if (auto_select == 'true' || auto_select == 'select and focus')
						ajaxart_uiaspects_select(elems.slice(0,1),$([]),"auto",ctx2);
				    if (auto_select == 'select and focus')
				    	setTimeout(function() {elems.slice(0,1).focus(); },100);//use 100ms to make sure attachment, test: http://localhost/ajaxart/showsamples.html#?Of=xtml_dt.OpenScriptEditor;
				}
				return [];
			}
			ctx.vars._Cntr[0].RegisterForPostAction(ctx._This);
			ajaxart_addScriptParam_js(ctx._This,'PostAction',postAction,ctx);

			var onkeydown = function(e) { 
				e = e || event;
				var elem = (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement);
				var isinput = elem.tagName.toLowerCase() == 'input';
				
				var cntr = ctx.vars._Cntr[0];
				if (aa_bool(data,profile,'IncludeSubContainers',context))
					var cntr_elems = $(cntr.Ctrl).find('.aa_list').slice(0,1).find('.aa_item').filter(aa_visible);
				else
					var cntr_elems = $(ajaxart_container_elems(cntr)).filter(aa_visible);
				var selected = cntr_elems.filter(".aa_selected_item").slice(0,1);
				var new_selected = [];
				if (e.ctrlKey) return true;
	  	        if (e.keyCode == 40) { // down
	  	        	if (selected.length == 0) // if no selected, pick the first
	  	        		new_selected = $(ajaxart_container_elems(cntr)[0]);
	  	        	else
	  	        		new_selected = cntr.next(selected,cntr);
  	        		while (new_selected.length > 0 && new_selected[0].hidden)
	        			new_selected = cntr.next(new_selected,cntr);
	  	        }
	  	        else if (e.keyCode == 38) { // up
	  	        	new_selected = cntr.prev(selected,cntr);
  	        		while (new_selected.length > 0 && new_selected[0].hidden)
	        			new_selected = cntr.prev(new_selected,cntr);
	  	        }
	  	        else if (e.keyCode == 36 && !isinput) { // home
	  	        	new_selected = cntr_elems.filter('.aa_item').filter(aa_visible).slice(0,1);
	        		while (new_selected.length > 0 && new_selected[0].hidden)
	        			new_selected = cntr.next(new_selected,cntr);
	  	        }
	  	        else if (e.keyCode == 35 && !isinput) { // end
	  	        	new_selected = cntr_elems.filter('.aa_item').filter(aa_visible).slice(-1);
	        		while (new_selected.length > 0 && new_selected[0].hidden)
	        			new_selected = cntr.prev(new_selected,cntr);
	  	        }
	  	        else if (e.keyCode == 34 || e.keyCode == 63277)  // page down
	  	        {
	  	        	var last_valid_selection = selected; 
	  	        	new_selected = selected;
	  	        	var times = 0;
	  	        	while ( cntr.next(new_selected,cntr).length > 0 && (new_selected[0].hidden || times < 3))
	  	        	{
	  	        		if (! new_selected[0].hidden)
	  	        		{
	  	        			times++;
	  	        			last_valid_selection = new_selected;
	  	        		}
 	        			new_selected = cntr.next(new_selected,cntr);
	  	        	}
	  	        	if (new_selected.length == 0)
	  	        		new_selected = last_valid_selection;
	  	        }
	  	        else if (e.keyCode == 33 || e.keyCode == 63276)  // page up
	  	  	    {
	  	        	var last_valid_selection = selected; 
	  	        	new_selected = selected;
	  	        	var times = 0;
	  	        	while ( cntr.prev(new_selected,cntr).length > 0 && (new_selected[0].hidden || times < 3))
	  	        	{
	  	        		if (! new_selected[0].hidden)
	  	        		{
	  	        			times++;
	  	        			last_valid_selection = new_selected;
	  	        		}
 	        			new_selected = cntr.prev(new_selected,cntr);
	  	        	}
	  	        	if (new_selected.length == 0)
	  	        		new_selected = last_valid_selection;
	  	  	    }
	  	        else
	  	        	return true;
	  	  	    
	  	  	    if (new_selected.length > 0 && (selected.length == 0 || new_selected[0] != selected[0]) ) {
	  	  	    	ajaxart_uiaspects_select(new_selected,selected,"keyboard",ctx);
	  	  	    	return aa_stop_prop(e);
	  	  	    }
		  }
		  var mouse_select = function(e) {
			    var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  ); 
			    if (!aa_intest && (elem.parents('body').length == 0 || elem.filter(aa_visible).length == 0 || elem.hasClass('aa_not_selectable') || elem.parents('.aa_not_selectable').length > 0)) return;
			    if (elem.hasClass('hitarea')) return true;
			    
			  	var cntr = ctx.vars._Cntr[0];
			  	if (cntr.DAndDOwner != "" ) return true;
			  	if (! cntr.PicklistPopup)
			  		ajaxart.controlOfFocus = null;
			  	if( e.button == 2 ) return true;

			  	var new_selected = $();
			    if (elem.hasClass('aa_item'))
			    	new_selected = elem;
			    else {
			    	// maybe we are uiaspect.List and have a group inside aa_item  [ a group has aa_item in itself ]
			    	var optionItems = elem.parents(".aa_item").get();
			    	for(var i=0;i<optionItems.length;i++) {
			    		var item = optionItems[i];
			    		var itemCntr = $(item).parents('.aa_container')[0].Cntr;
			    		if (itemCntr == cntr) {
			    		  new_selected = $(item);
			    		  break;
			    		}
			    	}
			    }
			    if (new_selected.length > 0)
	  	  	    	ajaxart_uiaspects_select(new_selected,$(),"mouse",ctx);
	  	  	    return true;
		  }

		  // aa list may be replaced in cntrs - table should work in container generation
		  var cntr_list = ajaxart_find_aa_list(cntr);
		  if (!cntr.SelectionEnabled) // do not register twice
		  {
			  var mouseSupport = aa_text(data,profile,'MouseSupport',context);
			  if (mouseSupport == 'mouse click') {
				    aa_bind_ui_event(cntr_list,'click', mouse_select);
			  }
			  else if (mouseSupport != 'none'){
			    aa_bind_ui_event(cntr_list,'mousedown', mouse_select);
			    aa_bind_ui_event(cntr_list,'touchstart', mouse_select);
			  }
			  cntr.SelectionKeydown = onkeydown;
			  if (aa_bool(data,profile,"KeyboardSupport",ctx))
				  aa_bind_ui_event(cntr_list,'keydown',onkeydown);
//			  cntr_list.onkeydown = function(e) - for Yaron to play
//			  { 
//				  if (e.keyCode == 38 || e.keyCode == 40)
//					  return aa_stop_prop(e);
//				  return true;
//			  }
		  }
		  cntr.SelectionEnabled = true;

		  var selector = aa_first(data,profile,"Selector",ctx);
		  if (selector != null)
		  {
			  cntr.SoftSelector = selector;
		  }
		}
		var make_selected_visible = function(cntr) {}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);

		return [aspect];
	},
	BindSelectedItem: function (profile,data,context)
	{
		var aspect = { isObject : true };
		aspect.InitializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.DefaultIdentifier = aa_text(data,profile,'SelectedIdentifier',context);
			if (!cntr.DefaultIdentifier) return;
			cntr.FilterOnFirstSelected = function(data1,ctx) {
				var id = aa_text(data1,profile,'ItemIdentifier',context);
				if (id == cntr.DefaultIdentifier) return ['true'];
			}
		}
		return [aspect];
	},
	TreeInitialSelection: function (profile,data,context) {
		return [{
			InitializeContainer: function(initData,ctx) {
				var cntr = ctx.vars._Cntr[0];
				cntr.RegisterForPostAction(this);
			},
			PostAction: function(initData,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
				var path = aa_text(data,profile,'Path',context);
				if (path == "") return;
				var parts = path.split('/');
				var jList = $(aa_find_list(cntr));
				var item = null;
				
				for (var i=0;i<parts.length;i++) {
					var part = parts[i];
					var items = jList.find('>.aa_item>.aa_text');
					item = null;
					for(var j=0;j<items.length;j++) {
						var itemtext = items[j].innerHTML;
						itemtext = itemtext.replace(new RegExp(' \\([0-9]*\\)', "g"), '');   // turn pages (3) to pages
						if (itemtext == part) {
							item = items[j].parentNode;
							cntr.CollapseElem($(item),false); // make sure it is expanded
							break;
						}
					}
					if (!item) return;
					jList = $(item).find('>.aa_list');
				}
				if (!item) return;
				cntr.Select($(item),$([]),"auto",ctx,true);
			}
		}];
	},
	TreeSelectedInUrl: function (profile,data,context)
	{
		var aspect = { };
		aspect.InitializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var selectionChanged = function(selected_elem,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
				if (aa_totext(cntr.ID)=="") return;
				var url = "?" + aa_totext(cntr.ID) + "_path=";
				var path = "";
				var jElem = $(selected_elem);
				while (! jElem.hasClass('aa_container')) {
					if (jElem.hasClass('aa_item')) {
						var text = jElem.find('.aa_text')[0].innerHTML;
						text = text.replace(new RegExp(' \\([0-9]*\\)', "g"), '');   // turn pages (3) to pages
						if (path != "") path = '/' + path;
						path = text + path;
					}
					jElem = jElem.parent();
				}
				url += path;
				aa_urlChange(context,url);
			}
			aa_register_handler(cntr,'Selection', selectionChanged);
			cntr.RegisterForPostAction(this);
		}
		aspect.PostAction = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			if (aa_totext(cntr.ID)=="") return;
			var path = aa_urlAttribute(context,aa_totext(cntr.ID) + "_path");
			if (path == "") return;
			var parts = path.split('/');
			var jList = $(aa_find_list(cntr));
			var item = null;
			
			for (var i=0;i<parts.length;i++) {
				var part = parts[i];
				var items = jList.find('>.aa_item>.aa_text');
				item = null;
				for(var j=0;j<items.length;j++) {
					var itemtext = items[j].innerHTML;
					itemtext = itemtext.replace(new RegExp(' \\([0-9]*\\)', "g"), '');   // turn pages (3) to pages
					if (itemtext == part) {
						item = items[j].parentNode;
						cntr.CollapseElem($(item),false); // make sure it is expanded
						break;
					}
				}
				if (!item) return;
				jList = $(item).find('>.aa_list');
			}
			if (!item) return;
			cntr.Select($(item),$([]),"auto",ctx,true);
		}
		return [aspect];
	},
	DoOnSelection: function (profile,data,context)
	{
		var aspect = { isObject : true };
		aspect.InitializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.SelectionChangeOnTimer = aa_bool(data,profile,'DoOnNextTimer',context);
			
			var selectionChanged = function(selected_elem,ctx2)
			{
				var cntr = ctx.vars._Cntr[0];
				if (cntr.SelectionChangeOnTimer) {
					setTimeout(function() {
						ajaxart.run(selected_elem.ItemData,profile,'Action',aa_merge_ctx(context,ctx2));
					},200);
					return;
				}
				ajaxart.run(selected_elem.ItemData,profile,'Action',aa_merge_ctx(context,ctx2));
			}
			aa_register_handler(cntr,'Selection', selectionChanged);
		}
		return [aspect];
	},
	HighlightSelectionOnHover: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			  var onmouseover = function(e) {
					var cntr = ctx.vars._Cntr[0];
					var elem = (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement);
					
					var new_selected = $([]),top_cntr = null;
					for(;elem;elem = elem.parentNode) {
						if ($(elem).hasClass('aa_item')) new_selected = $(elem);
						if (elem.Cntr == cntr) {
							top_cntr = elem.Cntr; 
							break;
						}
					}
		  	  	    if (new_selected.length > 0 && top_cntr && !new_selected.hasClass('aa_selected_item'))
		  	  	    {
			  	    	var top_cntr_list = ajaxart_find_aa_list(top_cntr);

		  	  	    	$(top_cntr_list).find('.aa_selected_item').removeClass("aa_selected_item");
			  	    	$(top_cntr_list).find('.aa_selected_itemtext').removeClass("aa_selected_itemtext");

		  	  	    	new_selected.addClass("aa_selected_item");
		  	  	    	if (! top_cntr.IgnoreItemSelectionCssClass)
		    	  	    	  new_selected.addClass(top_cntr.ItemSelectionCssClass);

		  	  	    	new_selected.find('>.aa_text').addClass("aa_selected_itemtext");
		  	  	    	jBart.trigger(top_cntr,'selection',{selected: new_selected[0], context: ctx, method: 'hover'});
		  	  	    	ajaxart.run(new_selected[0].ItemData,profile,'Action',aa_ctx(ctx,{_ItemsOfOperation: new_selected[0].ItemData, _ElemsOfOperation: new_selected , method: ['hover']}))
		  	  	    }
		  	  	    return true;
			  }
			
			  // aa list may be replaced in cntrs - table should work in container generation
			  var cntr = ctx.vars._Cntr[0];
			  var cntr_list = ajaxart_find_aa_list(cntr);
			  if (! cntr.HighlightSelectionOnHover) { // avoid duplicates
				  aa_bind_ui_event(cntr_list,'mouseover', onmouseover);
				  cntr.HighlightSelectionOnHover = true;
			  }
		}
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	CellPresentation: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.CellPresentation = aa_text(data,profile,'Content',ctx);
		}
		
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	SaveDetailsAndRefersh: function (profile,data,context)
	{
		var item = ajaxart.run(data,profile,'Item',context);
		ajaxart_saveDetailsAndRefresh(item,context.vars.ItemPage[0].Fields,context);
		return [];
	},
	ItemDetails: function (profile,data,context)
	{
		var aspect = { isObject : true , ItemDetails : true};
		var init = function(aspect) {
		aspect.InitializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var mctx = aa_merge_ctx(context,ctx);
			
			if (aa_paramExists(profile,'ItemPage'))
				cntr.ItemPage = aa_first(data,profile,'ItemPage',mctx);
			else if (! cntr.ItemPage)
				cntr.ItemPage = ajaxart.runNativeHelper(data,profile,'DefaultItemPage',mctx)[0];

			if (aa_paramExists(profile,'OpenIn'))
				cntr.OpenIn = function(data2,ctx2) { return ajaxart.run(data2,profile,'OpenIn',aa_merge_ctx(context,ctx2)); }
			else if (! cntr.OpenIn) {
				cntr.OpenIn = function(data2,ctx2) { return ajaxart.runNativeHelper(data2,profile,'DefaultOpenIn',aa_merge_ctx(context,ctx2)); };
			}
			
			if (aa_paramExists(profile,'NewItemPage'))
				cntr.NewItemPage = aa_first(data,profile,'NewItemPage',mctx);
			else if (! cntr.NewItemPage)
				cntr.NewItemPage = cntr.ItemPage;
			
			if (aa_paramExists(profile,'OpenNewIn'))
				cntr.OpenNewIn = function(data2,ctx2) { return ajaxart.run(data2,profile,'OpenNewIn',aa_merge_ctx(context,ctx2)); }
			else if (! cntr.OpenNewIn) {
				cntr.OpenNewIn = function(data2,ctx2) { return ajaxart.runNativeHelper(data2,profile,'DefaultOpenIn',aa_merge_ctx(context,ctx2)); };
			}

			if (aa_paramExists(profile,'Transactional',true))
			  cntr.EditTransactional = aa_bool(data,profile,'Transactional',mctx);
			else if (cntr.EditTransactional == null) cntr.EditTransactional = ["true"];
			
			cntr.ItemDetailsControl = function(data3,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
				var page_params = {isObject:true, DataItems: ctx.vars._InnerItems , ReadOnly: cntr.ReadOnly }
				var newContext = aa_ctx(ctx,{ _PageParams: [page_params] });
				var page = aa_tobool(ctx.vars.IsNewItem) ? cntr.NewItemPage : cntr.ItemPage; 
			    var control = aa_runMethod(data3,page,'Control',newContext);
			    if (control.length == 0) control = [document.createElement('div')];
				$(control[0]).addClass('DetailsControl');
				control[0].Context = ctx;  // for master-detail...saving when changing selection
				control[0].ItemData = ctx.vars._InnerItem; // for master-detail...saving when changing selection
					
				return control;
			}
			
			cntr.OpenItemDetails = function(data,ctx)
			{
				var originalItems = data;
				var dataitems = ctx.vars._Cntr[0].Items[0];
				var newContext = aa_ctx(ctx,{ _Transactional: aa_frombool(cntr.EditTransactional) });
				if (aa_tobool(ctx.vars.IsNewItem)) {
					var subset = newContext.vars._InnerItems = aa_runMethod(data,dataitems,'SubsetForNewItem',newContext);
					var info = aa_getXmlInfo(subset[0].Items[0],context);

					if (ctx.vars._SaveActions && ctx.vars._SaveActions[0].BeforeEdit)
						ctx.vars._SaveActions[0].BeforeEdit([subset[0].Items[0]],ctx);
				}
				else {
					var subset = newContext.vars._InnerItems = aa_runMethod(data,dataitems,'Subset',newContext);
					if (subset.length == 0) {
					  subset = newContext.vars._InnerItems = [{ isObject: true , Items: newContext.vars._InnerItem }];
					  subset[0].Save = function(data2,ctx2) { 
					    var info = aa_getXmlInfo(this.Items[0],context);
						if (info.Save) return info.Save(data2,ctx2);
					  }
					}
					var info = aa_getXmlInfo(subset[0].Items[0],context);
					if (info && info.PrepareForEdit && ! $(ctx.vars._ElemsOfOperation).hasClass('aa_details_open'))  
						info.PrepareForEdit([],ctx);
				}
				if (subset.length == 0) return []; 

				var openCtrl_func = function(subset,originalItems) { return function() 
				{
					var cntr = ctx.vars._Cntr[0];
					if (cntr.BeforeOpenDetails)
						cntr.BeforeOpenDetails(subset.Items,ctx);

					var newContext = aa_ctx(ctx,{ _InnerItems: [subset] , _Transactional: aa_frombool(cntr.EditTransactional) , OriginalItems: originalItems });
					var itemDetailsObj = { isObject: true }
					var page = aa_tobool(ctx.vars.IsNewItem) ? cntr.NewItemPage : cntr.ItemPage;
					var info = aa_getXmlInfo(subset.Items[0],context);
					aa_init_itemdetails_object(itemDetailsObj,originalItems,info,subset,page,ctx);

					newContext.vars._ItemDetailsObject = [ itemDetailsObj ];
					newContext.vars.DetailsControl = cntr.ItemDetailsControl(subset.Items,newContext);
					
					var innercntr = aa_html_findclass(newContext.vars.DetailsControl,'aa_container');
					if (innercntr.length >0) innercntr[0].Cntr.IsNewItem = aa_tobool(ctx.vars.IsNewItem);
						
					var page = aa_tobool(ctx.vars.IsNewItem) ? cntr.NewItemPage : cntr.ItemPage; 
					newContext.vars.ItemPage = [page];
					
					ajaxart.run(subset.Items,profile,'ChangeItemBeforeOpen',context);
					
					if (aa_tobool(ctx.vars.IsNewItem))
					  return cntr.OpenNewIn(subset.Items,newContext);
					else
					  return cntr.OpenIn(subset.Items,newContext);
				}};

				if (aa_bool(data,profile,'KeepOpenItemInUrl',context) && cntr.ID != "") {
					var id = aa_text(data,profile,'ItemIdentifier',context);
					aa_urlChange(context,"?"+cntr.ID+"_open="+id+";");
				}
				var prepareAndOpen = function(subset,info) {
					aad_runMethodAsync(subset[0],subset[0].Prepare,data,ctx,function() {
						if (aa_bool(data,profile,'FullLoadItem',context) && info && info.LoadFullItem )
							  aad_runMethodAsync(info,info.LoadFullItem,data,ctx,openCtrl_func(subset[0],data));
							else
							  openCtrl_func(subset[0],data)();
					});
				}
				prepareAndOpen(subset,info);
				
				return ["true"];
			}

			cntr.Transactional = aa_bool(data,profile,'Transactional',context);
			aa_addMethod(cntr,'ItemIdentifier',profile,'ItemIdentifier',context);
				
			if (aa_bool(data,profile,'KeepOpenItemInUrl',context) && cntr.ID != "" && ! cntr.OpenDetailsFromUrlRegistered ) 
			{
				cntr.OpenDetailsFromUrlRegistered = true;
				cntr.RegisterForPostAction(aspect);
				aspect.PostAction = function(data2,ctx2) {
					var cntr = ctx.vars._Cntr[0];
					var id = aa_urlAttribute(ctx2,cntr.ID+'_open');
					if (id == "") return;
					
					var items = cntr.Items[0].Items;
					for(var i=0;i<items.length;i++)
					{
						var item = [items[i]];
						if (aa_totext(cntr.ItemIdentifier(item,context)) == id) {
							cntr.OpenItemDetails(item,aa_ctx(ctx2,{IsNewItem: [], _OperationID: ["OpenItemDetails"] , _InnerItem: item }));
						}
					}
				}
			}
		}
		}
		init(aspect);
		
		return [aspect];
	},
	OpenPageFromDetails: function (profile,data,context)
	{
		if (! context.vars._ItemsOfOperation || context.vars._ItemsOfOperation.length == 0) return;
		
		var item = context.vars._ItemsOfOperation[0];
		var page = aa_first(data,profile,'Page',context);
		var page_params = ajaxart.run([item],profile,'PageParams',context);
		var control = page.Control([item],aa_ctx(context,{_PageParams: [page_params]}));
		var obj = { isObject: true };
		ajaxart.run([item],profile,'OpenIn',aa_ctx(context,{ _ItemDetailsObject: [obj] , DetailsControl: control }));
	},
	BottomLocation: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var createContainer = function(initData,ctx)
		{
			var bottom = $('<div class="aa_bottom"/>');
			bottom.addClass( aa_text(data,profile,'Css',context) );
			var cntr = ctx.vars._Cntr[0];
			var footer = $(cntr.Ctrl).find('>.aa_container_footer');
			if (footer.length > 0 && footer[0].parentNode != null)
				footer[0].parentNode.insertBefore(bottom[0],footer[0]);
			return [];
		}
		ajaxart_addScriptParam_js(aspect,'CreateContainer',createContainer,context);
		return [aspect];
	},
	RightLocation: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var cssClass = aa_attach_global_css(aa_text(data,profile,'Css',context),null,'right_location');
		
		var createContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var all = $('<table cellpadding="0" cellspacing="0"><tbody><tr><td class="aa_left"/><td class="aa_horiz_resizer"/><td class="aa_right"/></td></tr></tbody></table>');
			all.addClass(cssClass);
			
			if (aa_bool(data,profile,'LeftExpandCollpase',context)) {
				var exp_td = document.createElement('td');
				var expcol = document.createElement('div');
				expcol.className = 'aa_left_expcol collapse';
				expcol.ShowSubject = all.find('.aa_left')[0];
				expcol.onmouseup = function() {
					var left = this.ShowSubject;
					var cntr = ctx.vars._Cntr[0];
					
					if ($(this).hasClass('collapse')) {
						$(this).removeClass('collapse').addClass('expand');
						left.display = left.style.display = 'none';
						ajaxart_setUiPref(cntr.ID[0],'ExpandCollapseState',"collpased",context);
					}
					else {
						$(this).addClass('collapse').removeClass('expand');
						left.display = left.style.display = '';
						ajaxart_setUiPref(cntr.ID[0],'ExpandCollapseState',"expanded",context);
					}					
				}
				all.find('.aa_left').append($(expcol));
				exp_td.appendChild(expcol);
				$(expcol).insertAfter(all.find('.aa_left'));
				if ( ajaxart_getUiPref(cntr.ID[0],'ExpandCollapseState',context) == "collpased") {
					$(expcol).removeClass('collapse').addClass('expand');
					expcol.ShowSubject.display = expcol.ShowSubject.style.display = 'none';
				}
			}
			aa_init_horiz_resizer(all.find('.aa_left')[0],all.find('.aa_horiz_resizer')[0]);
			var left = all.find('.aa_left'); 
			var subelems = $(cntr.Ctrl).find('>*');
			left.append(subelems);
			$(cntr.Ctrl).append(all);
			return [];
		}
		ajaxart_addScriptParam_js(aspect,'CreateContainer',createContainer,context);
		
		return [aspect];
	},
	SelectedElement: function (profile,data,context)
	{
		var cntr = context.vars._Cntr[0];
		var selected = $(cntr.Ctrl).find(".aa_selected_item").filter(aa_visible);
		if (selected.length > 0)
			return [selected[0]];
		return [];
	},
	SelectedItem: function (profile,data,context)
	{
		var cntr = ajaxart_uiaspects_container(context);
		return ajaxart_itemlist_getSelectedItems(cntr);
	},
	DetailsReplacingAll: function (profile,data,context)
	{
		var cntr = context.vars._Cntr[0]; 
		var control = context.vars.DetailsControl;
		
		if (control == null || control.length == 0) return [];

		cntr.ReplacingControl = document.createElement('div');
		cntr.ReplacingControl.className = "aa_replacingall";

		var itemDetailsObj = context.vars._ItemDetailsObject[0];
				
		itemDetailsObj.HideDetails = function(data2,ctx2) {
			var cntr = context.vars._Cntr[0]; 
			var detailsControl = cntr.Ctrl.DetailsControl;
			aa_replaceElement(cntr.Ctrl,cntr.OriginalCtrl,true,aa_first(data,profile,'TransitionBack',context));
			cntr.Ctrl = cntr.OriginalCtrl;
		}
		var topControl = ajaxart.runNativeHelper(data,profile,'TopControl',context);
		$(topControl).addClass('aa_replacingall_top');
		if (topControl.length > 0) cntr.ReplacingControl.appendChild( topControl[0] );
		cntr.ReplacingControl.appendChild(control[0]);
		cntr.ReplacingControl.DetailsControl = control[0];
		cntr.OriginalCtrl = cntr.Ctrl;

		aa_replaceElement(cntr.Ctrl,cntr.ReplacingControl,true,aa_first(data,profile,'Transition',context));
		cntr.Ctrl = cntr.ReplacingControl;
		if (cntr.AfterDetailsReplacingAll)
			cntr.AfterDetailsReplacingAll();
		
		return [];
	},
	DetailsInFixedLocation: function (profile,data,context)
	{
		var setNewControlFunc = function(holder,cntr) { return function(data1,context1)
		{
			var oldContent = holder[0].firstChild;
			holder.empty();
			holder[0].appendChild(cntr.DetailsControl);
			if (oldContent) aa_element_detached(oldContent);
			aa_element_attached(cntr.DetailsControl);
			return [];
		}}

		var findHolder = function(location,cntrCtrl)
		{
			return $(cntrCtrl).find('.aa_' + location).filter( function() { return $(this).parents('.aa_container')[0] == cntrCtrl });
		}
		var location = aa_text(data,profile,'Location',context);
		var cntr = ajaxart_uiaspects_container(context);
		cntr.DetailsControl = context.vars.DetailsControl[0];
		cntrs = [cntr.Ctrl].concat($(cntr.Ctrl).parents('.aa_container').get());
		var holder = []; 
		for(var i=0;i<cntrs.length;i++)
		{
			holder = findHolder(location,cntrs[i]); 
			if (holder.length > 0)
				break;
		}

		if (holder.length > 0)
		{
			var existing_ctrl = holder.find('.DetailsControl');
			var cb = setNewControlFunc(holder,cntr);
			cb();
//			if (existing_ctrl.length == 0) 
//				cb();
//			else
//				ajaxart_saveDetailsAndRefresh(existing_ctrl[0].ItemData,context.vars.ItemPage[0].Fields,existing_ctrl[0].Context,setNewControlFunc(holder,cntr));
		}

		
		return [];
	},
	DetailsInExternalLocation: function (profile,data,context)
	{
		var cntr = ajaxart_uiaspects_container(context);
		cntr.DetailsControl = context.vars.DetailsControl[0];
		var holder = aad_find_field( aa_text(data,profile,'FieldID',context) )[0];
		if (holder) { 
			putDetailsInHolder(holder);
		} else {  // maybe we are detached...let's try with timeout
			setTimeout(function() {
				var holder = aad_find_field( aa_text(data,profile,'FieldID',context) )[0];
				if (holder) putDetailsInHolder(holder);
			},500);
		}
		
		function putDetailsInHolder(holder) {
			var saveFormerDetails = null;
			var existing_ctrl = $(holder).find('.DetailsControl');
			if (existing_ctrl.length > 0)
				saveFormerDetails = existing_ctrl[0].SaveDetailsAndRefresh;
			
			ajaxart_RunAsync(data,saveFormerDetails,context,function() {
				aa_empty(holder,true);
				holder.appendChild(cntr.DetailsControl);
				aa_element_attached(cntr.DetailsControl);
				return [];
			});
		}
	},
	DetailsInplace: function(profile,data,context)
	{
		if (aa_tobool(context.vars.IsNewItem)) {
			// in case of a new item, we first add it and then open it
			ajaxart_saveDetailsAndRefresh(context.vars._InnerItems[0].Items,context.vars.ItemPage[0].Fields,context,function(data1,ctx) {
				ajaxart.gcs.uiaspect.DetailsInplace(profile,data,aa_ctx(ctx,{IsNewItem: []}));
			});
			return;
		}

		var cntr = ajaxart_uiaspects_container(context);
		var detailsControl = context.vars.DetailsControl;
		var tr = context.vars._ElemsOfOperation[0];
		
		if (aa_bool(data,profile,'CloseInplaceSiblings',context)) {
			var siblings = $(tr).siblings('.detailsInplace_tr');
			for (var i=0;i<siblings.length;i++) {
				siblings[i].jbHideDetails();
			}
		}
		if ($(cntr.Ctrl).find('>.teasers_list_tiles')[0])
			tr = context.vars.ControlElement[0];
		
		if (tr == null) return; // || context.vars._OperationID == null) return [];
		var opID = context.vars._OperationID && context.vars._OperationID[0];

		var itemDetailsObj = context.vars._ItemDetailsObject[0];
		itemDetailsObj.TR = tr;
		itemDetailsObj.ElemsOfOperation = [tr];
		itemDetailsObj.HideDetails = function(data2,ctx2) {
			aa_remove(this.TR.nextSibling,true);
			ajaxart_uiaspects_refreshElements(this.ElemsOfOperation);
		}
		if (opID != null)
		{
			var opCell = $(tr).find("." + opID).parent();
			if (opCell.length > 0) { // has a button
  			  opCell.empty();
			  var buttons = ajaxart.run(data,profile,'Buttons',context);
			  opCell[0].appendChild(buttons[0]);
			}
		}
		
	    if (tr.nextSibling != null && $(tr.nextSibling).hasClass('detailsInplace_tr')) {  // closing
	    	var innerCntr = $(tr.nextSibling).find('.detailsInplace')[0];
	    	if (innerCntr && ! aa_passing_validations(innerCntr)) return; // not passing validation 
	    	aa_remove(tr.nextSibling,true);
			ajaxart_saveDetailsAndRefresh(tr.ItemData,context.vars.ItemPage[0].Fields,context); 
			return [];
	    }
	    
		if (tr.tagName == 'TR')
		{
		    var tr_details = document.createElement("TR");
		    tr_details.className="detailsInplace_tr aa_item_extended";
		    var td_details = document.createElement("TD");
		    td_details.className="detailsInplace_td";
		    aa_setCssText(td_details,aa_text(data,profile,'CssForDetails',context));
		    td_details.setAttribute("colspan",$(tr).find('>TD').length);
		    
		    tr_details.jbHideDetails = function() {
				aa_remove(this,true);
				ajaxart_uiaspects_refreshElements([tr]);
		    }
		    if (detailsControl.length > 0)
		    {
		    	detailsControl[0].className="detailsInplace";
		    	td_details.appendChild(detailsControl[0]);
		    }
		    // add the toolbar
		    var toolbar = aa_first(data,profile,'InplaceToolbar',context);
		    var location = aa_text(data,profile,'ToolbarLocation',context);
		    if (toolbar) {
		      $(toolbar).addClass('aa_toolbar_inplace_'+location);
		      if (location == 'bottom') td_details.appendChild(toolbar);
		      if (location == 'top') $(toolbar).insertBefore(detailsControl[0]);
		    }
		    
		    tr_details.appendChild(td_details);
		    tr.parentNode.insertBefore( tr_details, tr.nextSibling );
		}
		if (tr.tagName == 'LI')
		{
		    var tr_details = document.createElement("LI");
		    tr_details.className="detailsInplace_tr aa_item_extended";
		    var td_details = document.createElement("DIV");
		    td_details.className="detailsInplace_td";
		    tr_details.jbHideDetails = function() {
				aa_remove(this,true);
				ajaxart_uiaspects_refreshElements([tr]);
		    }
		    if (detailsControl.length > 0)
		    {
		    	detailsControl[0].className="detailsInplace";
		    	td_details.appendChild(detailsControl[0]);
		    }
		    tr_details.appendChild(td_details);
		    tr.parentNode.insertBefore( tr_details, tr.nextSibling );
		}
		$(tr).addClass('aa_details_open');
    	aa_element_attached(tr_details);
    	ajaxart_uiaspects_select($(tr),$(),"auto",cntr.Context,false);

    	var openButton = $(tr).find('.aa_open_button');
    	if (openButton.length > 0) {
			var newBtn = aa_first([],openButton[0].ajaxart.script,"",aa_ctx(openButton[0].ajaxart.params,{InplaceIsOpen:['true']}));
			if (newBtn) aa_replaceElement(openButton[0],newBtn,true);
    	}
    	
    	var firstInput = $(detailsControl).find('input,textarea')[0];
    	if (firstInput && ajaxart.isattached(firstInput) ) firstInput.focus();
    	
		return [];
	},
	ShowItemInItemList: function (profile,data,context)
	{
		var itemlist = aa_first(data,profile,'ItemList',context);
		if (itemlist == null) return [];
		if ( ! aa_bool(data,profile,'ShowOnlyItem',context) ) return [itemlist];
		
		var innerDataItems = ajaxart.run(data,profile,'InnerItems',context);
		
		var newContext = aa_ctx(context,{ _InnerDataItems: innerDataItems });
		
		return ajaxart.runScriptParam(data,itemlist.EditItemControl,newContext);
	},
	ContainerControl: function (profile,data,context)
	{
		var cntr = aa_first(data,profile,'Container',context);
		if (cntr == null || cntr.Ctrl == null) return [];
		return [cntr.Ctrl];
	},
	ContainerFromControl: function (profile,data,context)
	{
		var control = aa_first(data,profile,'Control',context);
		if (control == null || control.Cntr == null) return [];
		return [control.Cntr];
	},
	ContainerItems: function (profile,data,context)
	{
		var cntr = aa_first(data,profile,'Container',context);
		var elems  = ajaxart_container_elems(cntr);
		var out = [];
		for(var i=0;i<elems.length;i++)
			out.push(elems[i].ItemData[0]);
		
		return out;
	},
	ContainerElementByItemFilter: function (profile,data,context)
	{
		var cntr = aa_first(data,profile,'Container',context);
		var elems = ajaxart_container_elems(cntr);
		for(var i in elems) {
			var item = elems[i].ItemData;
			if (aa_bool(item,profile,'ItemFilter',context)) return [elems[i]];
		}
		return [];
	},
	ContainerElements: function (profile,data,context)
	{
		var cntr = aa_first(data,profile,'Container',context);
		return ajaxart_container_elems(cntr);
		
	},
	FirstSubContainer: function (profile,data,context)
	{
		var elem = aa_first(data,profile,'Element',context);
		if (elem == null) return [];
		var cntrs = $(elem).find('.aa_container');
		if (cntrs.length > 0) return [cntrs[0].Cntr];
		return [];
	},
	ItemHighlight: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var initializeElements = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var elems = ctx.vars._Elems;
			var class_compiled = ajaxart.compile(profile,'CssClass',ctx);
			var bgcolor_compiled = ajaxart.compile(profile,'BackgroundColor',ctx);
			var color_compiled = ajaxart.compile(profile,'FontColor',ctx);
			var weight_compiled = ajaxart.compile(profile,'FontWeight',ctx);
			for(var i=0;i<elems.length;i++)
			{
				var elem = elems[i];
				var css_class = ajaxart_runcompiled_text(class_compiled, elem.ItemData, profile, "CssClass", ctx );
				var bgcolor = ajaxart_runcompiled_text(bgcolor_compiled, elem.ItemData, profile, "BackgroundColor", ctx );
				var color = ajaxart_runcompiled_text(color_compiled, elem.ItemData, profile, "FontColor", ctx );
				var weight = ajaxart_runcompiled_text(weight_compiled, elem.ItemData, profile, "FontWeight", ctx );
				// keep and clean original settings
				if (elem.Highlighted != true) {
					elem.Highlighted = true;
					elem.OrigFontWeight = elem.style.fontWeight;
					elem.OrigColor = elem.style.color;
					elem.OrigBg = elem.style.backgroundColor;
					elem.classAdded = css_class;
				} else {
					elem.style.fontWeight = elem.OrigFontWeight;
					elem.style.color = elem.OrigColor;
					elem.style.backgroundColor = elem.OrigBg;
					if (elem.classAdded != "")	$(elem).removeClass(elem.classAdded);
				}
				if (weight != "") 		elem.style.fontWeight = weight;
				if (color != "") 		elem.style.color = color;
				if (bgcolor != "") 		elem.style.backgroundColor = bgcolor;
				if (css_class != "")	$(elem).addClass(css_class);
			}
		};
		ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
		return [aspect];
	},
	Teasers: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var openOnClick = aa_bool(data,profile,'OpenOnClick',context);
		var initializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
		    cntr.createNewElement = function(item_data,item_aggregator,ctx2)
		    {
		    	var open_item = function() {
					var newContext = aa_ctx(ctx,{ _InnerItem: item_data });
				    ajaxart.runScriptParam(item_data,cntr.OpenItemDetails,newContext);
		    	};
		    	var teaser_cxt = { isObject: true };
				ajaxart_addScriptParam_js(teaser_cxt,'OpenItem',open_item,ctx2||ctx);
				var ctx1 = aa_ctx(ctx2||ctx,{ _TeasersContext: [teaser_cxt] });
		    	var ctrl = ajaxart.runNativeHelper(item_data,profile,'Control',ctx1)[0];
		    	ctrl.ItemData = item_data;
		    	$(ctrl).addClass('aa_item');

		    	if (openOnClick) {
			    	$(ctrl).click( open_item );
			    	ctrl.style.cursor = 'pointer';
		    	}
		    	if (item_aggregator) item_aggregator.push(ctrl);
		    	return ctrl;
		    };
		};
		ajaxart_addScriptParam_js(aspect,'InitializeContainer',initializeContainer,context);
		return [aspect];
	},
	ControlForNoData: function (profile,data,context)
	{
		var aspect = { isObject : true };
		aspect.InitializeContainer = function(data1,ctx) {
			var cntr = ctx.vars._Cntr[0];
			cntr.ControlForNoData = function(data1,ctx) { return ajaxart.run(data1,profile,'Control',aa_merge_ctx(context,ctx)); }
		}
		return [aspect];
	},
	Permissions: function (profile,data,context)
	{
		  var aspect = { isObject : true };
		  var init = function(aspect) {
			  aspect.InitializeContainer = function(data1,ctx) {
				  ctx = aa_merge_ctx(context,ctx);
				  var cntr = ctx.vars._Cntr[0]; 
				  cntr.RegisterForPostAction(aspect);
				  if ( ! aa_bool(cntr.Items[0].Items,profile,'WritableIf',ctx) ) {
					  cntr.ReadOnly = true;
				  }
			  }
			  aspect.PostAction = function(data1,ctx) {
				  ctx = aa_merge_ctx(context,ctx);
				  
				  var cntr = ctx.vars._Cntr[0];
				  if ( ! aa_bool(data,profile,'VisibleIf',ctx) )
					  cntr.Ctrl = aa_first(data,profile,'ControlIfNotVisible',ctx) || document.createElement('div');
			  }
		  }
		  init(aspect);
		  
		  return [aspect];
	},
	RunAction: function (profile,data,context)
	{
	  var aspect = { isObject : true };
	  aspect.InitializeContainer = function(data1,ctx) {
		  ctx = aa_merge_ctx(context,ctx);
		  var cntr = ctx.vars._Cntr[0];  
		  cntr.RegisterForPostAction(this);
		  ajaxart.run(aa_items(cntr),profile,'RunBeforeControl',context);
		  var onAttachScript = ajaxart.fieldscript(profile, 'OnAttach');
		  if (onAttachScript) 
			  aa_addOnAttach(cntr.Ctrl,function() { 
				  ctx = aa_merge_ctx(context,ctx);
				  var cntr = ctx.vars._Cntr[0]; 
				  ajaxart.run(data,profile,'OnAttach',aa_ctx(ctx,{ControlElement:[cntr.Ctrl]}));
			  });
	  }
	  aspect.PostAction = function(data1,ctx) {
		  ctx = aa_merge_ctx(context,ctx);
		  var cntr = ctx.vars._Cntr[0]; 
		  ajaxart.run(data,profile,'RunAfterControl',aa_ctx(ctx,{ControlElement:[cntr.Ctrl]}));
	  }
	  
	  return [aspect];
	},
	MultiSelect: function(profile,data,context)
	{
		var aspect = { 
			isObject : true,
			InitializeContainer: function(initData,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
				cntr.MultiSelect = true;
				cntr.SelectAll = function(data1,ctx2)
				{
					var cntr = ctx.vars._Cntr[0];
					var elems = ajaxart_container_elems(cntr);
					$(elems).find('>td>.aa_multiselect_checkbox').each(function() { aa_checked(this,true); });
				}
				cntr.ClearAll = function(data1,ctx2)
				{
					var cntr = ctx.vars._Cntr[0];
					var elems = ajaxart_container_elems(cntr);
					$(elems).find('>td>.aa_multiselect_checkbox').each(function() { aa_checked(this,false); });
				}
				cntr.GetMultiSelectedItems = function(data1,ctx2)
				{
					var cntr = ctx.vars._Cntr[0];
					var elems = ajaxart_container_elems(cntr);
					var selected = $(elems).filter(function() { var check_box = $(this).find('>td>.aa_multiselect_checkbox')[0]; return check_box && check_box.checked }).get();
					return selected;
				}
			},
			InitializeElements: function(initData,ctx)
			{
				// add th
				var cntr = ctx.vars._Cntr[0];
				var thead = $(cntr.Ctrl).find('.aatable>thead>tr');
				if (thead.length == 0) return;
				if (thead.find('>.aa_multiselect_th').length == 0)
				{
			    	var th = document.createElement('th');
			    	th.className = "fieldtitle aa_multiselect_th";
					thead[0].insertBefore(th,thead[0].firstChild);
					$(th).text(aa_text(data,profile,'SelectionFieldTitle',context));
				}
				
				var elems = ctx.vars._Elems;
				for(var i=0;i<elems.length;i++)
				{
					var elem = elems[i];
					if (elem.ItemData[0].UnSelectable) continue;
					var checkbox = document.createElement('input');
					checkbox.className = "aacheckbox_value aa_multiselect_checkbox";
					checkbox.setAttribute("type","checkbox");
					var td = document.createElement('td');
					checkbox.onclick = function(e)
					{
						var cntr = ctx.vars.HeaderFooterCntr && ctx.vars.HeaderFooterCntr[0];
						if (cntr)
							aa_invoke_cntr_handlers(cntr,cntr.Selection,cntr.ElemsOfOperation(),ctx);
					    return true;
					}
					td.className = "content";
					td.appendChild(checkbox);
					elem.insertBefore(td,elem.firstChild);
				}
			}
		}
		return [aspect];
	},
	ClickableRows: function(profile,data,context)
	{
		var aspect = { isObject : true };
		var cssClass = aa_attach_global_css(aa_text(data,profile,'Css',context),context,'clickable');
		var initializeElements = function(initData,ctx)
		{
			var elems = ctx.vars._Elems;
			for(var i=0;i<elems.length;i++)
			{
				var elem = elems[i];
				elem.onclick = function(e) {
					if (window.aa_incapture) return;
					ajaxart.run(this.ItemData,profile,'Action',aa_ctx(context, {_ItemsOfOperation:this.ItemData, Item:this.ItemData, _ElemsOfOperation:[this], ControlElement:[this] }));
				};
				$(elem).addClass('aa_clickable').addClass(cssClass);
			}
			if (aa_bool(data,profile,'DisableSelection',context))
				;// todo: disable selection
		}
		ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
		return [aspect];
	},
	HoverCss: function(profile,data,context)
	{
		var aspect = { isObject : true };
		var css = aa_text(data,profile,'Css',context);
		var inline = (css.indexOf(":") >= 0);
		var initializeElements = function(initData,ctx)
		{
			var elems = ctx.vars._Elems;
			for(var i=0;i<elems.length;i++)
			{
				var elem = elems[i];
				if (inline) {
					elem.onmouseover = function() {
						this["original_css"] = this.style.cssText;
						aa_setCssText(this,this.style.cssText + ";" + css);
					};
					elem.onmouseout = function() {
						this.style.cssText = this["original_css"];
					}
				} else {
					elem.onmouseover = function() {
						$(this).addClass(css);
					};
					elem.onmouseout = function() {
						$(this).removeClass(css);
					}
				}
			}
		}
		ajaxart_addScriptParam_js(aspect,'InitializeElements',initializeElements,context);
		return [aspect];
	},
	ItemClickable: function(profile,data,context)
	{
		var aspect = { isObject : true };
		aspect.InitializeContainer = function(data1,ctx) {
			var cntr = ctx.vars._Cntr[0];
			cntr.ItemClickable = true;
			cntr.CursorPointerForItem = aa_bool(data,profile,'PointerCursor',context);
		}
		aspect.InitializeElements = function(data1,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var elems = ctx.vars._Elems;
			if (!cntr.ItemClickable) return;
			for(var i=0;i<elems.length;i++) {
				var elem = elems[i];
				$(elem).addClass('aa_list_clickable');
				if (cntr.CursorPointerForItem) $(elem).css('cursor','pointer');
				
				var clickFunc = function(elem) { return function() {
					if (window.aa_incapture) return;
					var newContext = aa_ctx(ctx,{ _InnerItem: elem.ItemData, _ItemsOfOperation: elem.ItemData, ControlElement: [elem]} );
					newContext = aa_merge_ctx(context,newContext);
					ajaxart.run(elem.ItemData,profile,'ClickAction',newContext);
					return false;
				}};
				elem.onclick = clickFunc(elem);
			}
		}
		return [aspect];
	},
	ItemList: function(profile,data,context)
	{
		var aspect = { isObject : true };
		aspect.CreateContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			cntr.Style = aa_first(data,profile,'Style',context);
			var itemlist = cntr.ApiObject = aa_api_object($(cntr.Style.Html),{cntr: cntr, setItemsOld: null, setItems: null });
			itemlist.newItem = function() { return $('<div/>')[0]; }	// will probably be changed by the style
			itemlist.setItemsOld = function(classOrElement,init_item_func) {
				itemlist.setItems({ itemElement: classOrElement, initItem: init_item_func});
			};
			itemlist.bind = function(evt,callback) {
				jBart.bind(this.cntr,evt,callback);
			}
			itemlist.trigger = function(evt,eventObject) {
				jBart.trigger(this.cntr,evt,eventObject);
			}
			itemlist.setItems = function(settings) {
				var inner = this.itemTemplate = this.getInnerElement(settings.itemElement);
				if (!inner || !inner.parentNode || !settings.initItem) return;

				if (settings.blockElement) {
					settings.initBlock = settings.initBlock || function() {};
					settings.itemsInBlock = settings.itemsInBlock || 12;
					settings.blockTemplate = this.getInnerElement(settings.blockElement);
					if (settings.blockTemplate && settings.blockTemplate.parentNode) {
					  settings.blockParent = settings.blockTemplate.parentNode;
					  if (inner.parentNode == settings.blockTemplate) 
						  settings.itemXPathInBlock = '';
					  else 
						  settings.itemXPathInBlock = ajaxart.xml.xpath_of_node(inner.parentNode,false,true,settings.blockTemplate);
					  
					  settings.itemParentInBlock = function(block) {
						  if (settings.itemXPathInBlock)
						    return aa_xpath(block,settings.itemXPathInBlock)[0];
						  else
								return block;
					  }  
					}
				}
				
				$(inner.parentNode).addClass('aa_list aa_listtop aa_cntr_body aa_cntrlist');
				inner.parentNode.removeChild(inner);
				
				this.newItem = function(item_data,ctx) {
					var out = this.itemTemplate.cloneNode(true);
					var cntr = this.cntr;
					
					var item_object = aa_api_object($(out),{ itemlist: this, data: item_data });
					item_object.name = aa_totext(cntr.ItemName(item_data,cntr.Context))
					if (cntr.ItemImage) {
						cntr.ItemImage.StaticUrl = aa_totext(cntr.ItemImage.Url(item_data,cntr.Context));
						item_object.image = cntr.ItemImage; 
					}
					item_object.setFields = function(classOrElement) {
						var inner = this.getInnerElement(classOrElement);
						if (!inner) return;
						var cntr = ctx.vars._Cntr[0];
						
						var fields = ajaxart_field_getFields(cntr,"table");
						for (var j=0;j<fields.length;j++) {
							var field = fields[j];
						    var cell_data = ajaxart_field_calc_field_data(field,this.data,cntr.Context);
							var field_div = document.createElement('div');
							inner.appendChild(field_div);
						   	ajaxart_field_createCellControl(this.data,cntr,field_div,cntr.CellPresentation,field,cell_data,cntr.Context);
//							ajaxart.databind([field_div],cell_data,context,profile,data);	// for runtime inspect
						}
					}
					item_object.setField = function(classOrElement,fieldId) {
						var inner = this.getInnerElement(classOrElement);
						var cntr = ctx.vars._Cntr[0];
						var field = aa_fieldById(fieldId, cntr.Fields);
						if (!field || !inner) return;
					    var cell_data = ajaxart_field_calc_field_data(field,this.data,cntr.Context);
						var field_div = document.createElement('div');
						inner.appendChild(field_div);
					   	ajaxart_field_createCellControl(this.data,cntr,field_div,cntr.CellPresentation,field,cell_data,cntr.Context);
					}
					settings.initItem(item_object);
					return out;
				}
				if (settings.blockElement) {
					itemlist.PostActions = itemlist.PostActions || [];
					itemlist.PostActions.push({
						PostAction: function(data1,ctx) {
							var top = ajaxart_find_aa_list(cntr);
							var newTop = settings.blockParent;
							$(newTop).addClass('aa_list aa_listtop aa_cntr_body aa_cntrlist');
							$(top).removeClass('aa_list aa_listtop aa_cntr_body aa_cntrlist');

							if (settings.blockTemplate && settings.blockTemplate.parentNode) 
								settings.blockTemplate.parentNode.removeChild(settings.blockTemplate);
							
							var items = $(top).find('>.aa_item');
							var lastblock = null;
							for(var i=0;i<items.length;i++) {
								if (!lastblock || lastblock.jbItemsInBlock == settings.itemsInBlock) {
									lastblock = $(settings.blockTemplate)[0].cloneNode(true);
									$(settings.itemParentInBlock(lastblock)).children().remove();	// remove item clones
									lastblock.jbItemsInBlock = 0;
									newTop.appendChild(lastblock);
									settings.initBlock(lastblock);
								}
								$(settings.itemParentInBlock(lastblock)).append(items[i]);
								lastblock.jbItemsInBlock++;
							}
							$(settings.blockTemplate)
						} 
					});
				}
			}
			aa_apply_style_js(itemlist,cntr.Style);
			$(itemlist.jElem[0]).addClass(aa_attach_global_css(cntr.Style.Css, cntr.Ctrl));
			$(cntr.Ctrl).addClass('aa_has_style');
//			itemlist.jElem.addClass( aa_attach_global_css(cntr.Style.Css) );
			$(cntr.Ctrl).find('>.aa_listtop').replaceWith(itemlist.jElem);
			//grid.jElem.addClass('aa_list aa_listtop aa_cntr_body aa_cntrlist');
			
			return [];
		}
		aspect.InitializeContainer = function(data1,ctx) {
			var cntr = ctx.vars._Cntr[0];
			aa_setMethod(cntr,'ItemName',profile,'ItemName',context); 
			cntr.ItemImage = aa_first(data,profile,'ItemImage',context);
			
			cntr.createNewElement = function(item_data,item_aggregator,ctx2)
		    {
				var cntr = ctx.vars._Cntr[0];
				var out = cntr.ApiObject.newItem(item_data,ctx2);
				$(out).addClass('aa_item');
				out.Cntr = cntr;
//				ajaxart.databind([out],item_data,context,profile.parentNode,data);	// for runtime inspect
				out.ItemData = item_data;
		    	if (item_aggregator) item_aggregator.push(out);
				return out;
		    }
			if (cntr.ApiObject.PostActions) {
				for(var i=0;i<cntr.ApiObject.PostActions.length;i++)
					cntr.RegisterForPostAction(cntr.ApiObject.PostActions[i]);
			}
		}
		return [aspect];	
	},
	List: function(profile,data,context)
	{
		var aspect = { isObject : true };
		aspect.CreateContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var ctrl = $('<div class="aa_list aa_listtop aa_cntr_body aa_cntrlist"/>');
			$(cntr.Ctrl).find('>.aa_listtop').replaceWith(ctrl);
			return [];
		}
		aspect.InitializeContainer = function(data1,ctx) {
			var cntr = ctx.vars._Cntr[0];
				
			var eachItemInLine = aa_bool(data,profile,'EachItemInLine',context);
			cntr.ListItemCss = aa_comma_size_to_css(aa_text(data,profile,'ItemSize',context));
			cntr.ListItemCss += aa_text(data,profile,'ItemCss',context);
			var itemClickable = aa_bool(data,profile,'ItemClickable',context);
			var spacingBetweenFields = aa_text(data,profile,'SpacingBetweenFields',context);
		    cntr.createNewElement = function(item_data,item_aggregator,ctx2)
		    {
				var cntr = ctx.vars._Cntr[0];
				var out = $('<div class="aa_item" tabindex="1">')[0];
		    	if (!eachItemInLine)  
		    		$(out).css('float',aa_is_rtl(cntr.Ctrl,ctx) ? 'right' : 'left');
		    	aa_apply_css(out,cntr.ListItemCss);
				var fields = ajaxart_field_getFields(cntr,"table");
				for (var j=0;j<fields.length;j++) {
					if (j>0)
						$(out).append($('<div style="height: '+ spacingBetweenFields +'"/>'));
					var field = fields[j];
				    var cell_data = ajaxart_field_calc_field_data(field,item_data,ctx2);
					var field_div = document.createElement('div');
					out.appendChild(field_div);
			    	ajaxart_field_createCellControl(item_data,cntr,field_div,"control",field,cell_data,ctx2);
				}
				out.ItemData = item_data;
				if (itemClickable) {
					$(out).addClass('aa_list_clickable');
					out.onclick = function(e)
					{
						var item = this;
						var newContext = aa_ctx(ctx2 || ctx,{ _InnerItem: item.ItemData, _ItemsOfOperation: item.ItemData, ControlElement: [this]} );
						ajaxart.run(item.ItemData,profile,'ClickAction',newContext);
						return false;
					};
				}
		    	if (item_aggregator) item_aggregator.push(out);
				return out;
		    }
		}
		return [aspect];	
	}
});
aa_gcs("uiaspect_config",{
	InUrlFragment: function (profile,data,context)
	{
		return [{
			isObject:true,
			Set: function(data1,ctx) {
				if (data1[0])
				  aa_urlChange(ctx,"?"+data1[0].Key + "="+data1[0].Value+"");
			},
			Get: function(key,ctx) { return [aa_urlAttribute(ctx,aa_totext(key))]; }
		}];
	}
});

function aad_jbart_data_arrived(widget_id,resource,data_as_string) {
	var data_as_xml = aa_parsexml(data_as_string);
	if (!data_as_xml) return;
	var data_holder = aad_jbart_get_data_holder(widget_id,resource);
	var new_items = [];
	for (var node = data_as_xml.firstChild; node != null; node=node.nextSibling) {
		if (node.nodeType == 1) {
			new_items.push(node);
			data_holder.items.push(node);
		}
	}
	// calling on_data_arrive
	for (i in data_holder.on_data_arrive) {
		var f = data_holder.on_data_arrive[i];
		f(new_items,data_holder.items);
	}
}
function aad_jbart_get_data_holder(widget_id,resource) {
	var key = 'jBartWidget_' + widget_id;
	if (!window[key]) window[key] = {resource: {items:[], on_data_arrive:[]}};
	return window[key].resource;
}

aa_gcs("aaeditor",{
  ComponentsOfType: function (profile,data,context)
  {
	  if (! window.aa_search_comp_of_type_cache) {
		  aa_search_comp_of_type_cache = {};
		  ajaxart_comp_of_type_advanced_cache = {};
		  var is_jbart = aa_isjbart() && !context.vars._ShowNonJBartComponents;
		  for (var i in ajaxart.components) {
			  var advanced = false;
			  if (i.lastIndexOf("_dt") == i.length-3 && i.length > 3 || i == "aaeditor") advanced = true;
			  for(var j in ajaxart.components[i]) {
				  var comp = ajaxart.components[i][j];
				  
				  if (comp.getAttribute('hidden') == 'true' || comp.getAttribute('deprecated') == 'true') continue;
				  if (is_jbart && comp.parentNode.getAttribute('jbart') != 'true') continue;
				  if (is_jbart && comp.getAttribute('jbart') == 'false') continue;
//				  if (! advanced && comp.getAttribute('advanced') == "true") advanced = true;
				  var types = (comp.getAttribute('type') || '').split(',');
				  for(var k=0;k<types.length;k++) {
					  if (types[k].split('.').length > 2) // e.g. data_items.Items.PageData
						  types.push(types[k].substring(0,types[k].lastIndexOf('.')));
				  }
				  var category = comp.getAttribute('category');
				  if (category) types.push(types[0]+'.'+category);

				  for(var t in types)
				  {
					  type = types[t];
					  if (!type) continue;
					  if (!advanced) {
					    if (aa_search_comp_of_type_cache[type] == null) aa_search_comp_of_type_cache[type] = [];
					    var comp = "" + i + "." + j;
					    aa_search_comp_of_type_cache[type].push({comp:comp, lower:comp.toLowerCase()});
					  }
					  else {
						    if (aa_search_comp_of_type_cache[type] == null) aa_search_comp_of_type_cache[type] = [];
						    var comp = "" + i + "." + j;
						    aa_search_comp_of_type_cache[type].push({comp:comp, lower:comp.toLowerCase()});
					  }
				  }
			    if (aa_search_comp_of_type_cache["*"] == null) aa_search_comp_of_type_cache["*"] = [];
			    aa_search_comp_of_type_cache["*"].push("" + i + "." + j);
			  }
		  }
	  }
	  var type = aa_text(data,profile,'Type',context);
	  if (type.lastIndexOf("[]") > -1 && type.lastIndexOf("[]") == type.length - 2)	// remove []
        type = type.substring(0,type.length-2);
	  if (type == "enum" || type=="dynamic_enum" || type=="dynamic_enum_multi")
		  type = "data.Data";
	  var out = aa_search_comp_of_type_cache[type];
	  if (aa_bool(data,profile,'IncludeAdvancedComponents',context))
		  ajaxart.concat(out,ajaxart_comp_of_type_advanced_cache[type]);

	  if (aa_bool(data,profile,'ForAllTypes',context)) {
		  ajaxart.concat(out,ajaxart_comp_of_type_advanced_cache[type]);
		  ajaxart.concat(out,aa_search_comp_of_type_cache["*"]);
	  }
	  if (out == null) out = [];
	  
	  var textFilter = aa_text(data,profile,'TextFilter',context).toLowerCase().replace(" ","");
	  if (textFilter != "") {
		  var items = [];
		  var first_items = [];
		  for (i in out) {
			  if (out[i].lower && out[i].lower.indexOf(textFilter) >= 0) {
				  var index = out[i].lower.lastIndexOf(textFilter);
				  if (index > 0 && out[i].lower[index-1] == ".")	// "Pi" for "data.Pipeline"
					  first_items.push(out[i].comp);
				  else
					  items.push(out[i].comp);
			  }
		  }
		  first_items.sort(function(a, b) { return a.length - b.length; });
		  out = first_items.concat(items);
	  } else {
		  var items = [];
		  for (i in out)
			  items.push(out[i].comp);
		  out = items;
	  }
	  
	  return out;
  }
});




ajaxart.gcs.tree = 
{
  RefreshNode: function (profile,data,context)
  {
	  var depth = aa_text(data,profile, 'Depth', context);
	  var li = data[0];
	  var item_data = ajaxart_treeitem_data(li);
	  var children = ajaxart_runevent(item_data,'TreeContext','NextLevel');
	  var ul = $(li).find('ul');
	  ul.html(''); // clean children.
	  ajaxart_tree_addChildren(ul[0],children,profile,data,context,depth);
  },
  AddChildren: function (profile,data,params)
  {
	var inputForChanges = ajaxart.getVariable(params,"InputForChanges");
	var treeview_cls = ajaxart.run(data,profile, 'TreeViewCls', params);
	var children = ajaxart.run(inputForChanges,profile, 'Children', params);

	var jqdata = $(data);
	
	if ( jqdata.hasClass(treeview_cls) )
		var treeview = jqdata;
	else
		var treeview = jqdata.parents("." + treeview_cls);

	jqdata.css('display','block'); // fixing strange bug in safari
	
	var branches = $(children).appendTo(jqdata);
	treeview.treeview({add: branches});

	return data;	
  },  
  InternalAfterAddingItem: function (profile,data,context)
  {
	  var item = aa_first(data,profile,'Item',context);
	  if (item == null) return [];

	  var treeview_cls = 'treeview';
	  var jqdata = $(item);
	  if (jqdata.find('.hitarea').length > 0) return [];//already tree view
	  
	  if ( jqdata.hasClass(treeview_cls) )
			var treeview = jqdata;
		else
			var treeview = jqdata.parents("." + treeview_cls);

	  jqdata.css('display','block'); // fixing strange bug in safari
	  
	  treeview.treeview({add: $(item)});
	  
	  return ["true"];
  },
  SelectFirst:function (profile,data,context)
  {
  	var first_tree_items = $(data[0]).find('.treeitem_text');
    var dataElem = ajaxart_tree_find_databound_elem(first_tree_items[0]);
    if (dataElem != null)
    {
    		ajaxart_css_selection(dataElem,'treeview');
    		ajaxart_selectionchanged(dataElem);
    }
    return ["true"];
  },
  InternalRefreshAddingItem: function (profile,data,context)
  {
	  var aboveUl = aa_first(data,profile,'AboveUL',context);
	  var newItems = ajaxart.run(data,profile,'NewItems',context);

	  if (aboveUl == null) return [];
	  var addingTopUl = false;
	  
	  if ($(aboveUl).find('>ul').length > 0) 
		  var topUl = $(aboveUl).find('>ul')[0];
	  else
	  {
		  addingTopUl = true;
		  var topUl = document.createElement('ul');
		  topUl.clasName = 'treeul';
		  aa_xml_appendChild(aboveUl,topUl);
	  }

	  if (topUl == null) return [];
	  var lis = $(topUl).find('>li');
	  var items_to_add = newItems.length - lis.length;
	  
	  for(var i=0;i<newItems.length;i++)
	  {
		if (items_to_add == 0) break;
		var addBefore = null;
		
		if (i<lis.length && lis[i].ajaxart.data.length > 0) {
  		  var newItem = newItems[i];
		  var currentItem = lis[i].ajaxart.data[0];
		  
		  if (currentItem != newItem) {
			  addBefore = lis[i];
		  }
		}
		
		if (lis.length <=i || addBefore != null)
		{
			var treeContext = null;
			if ('ajaxart' in topUl)
				treeContext = topUl.ajaxart.params;
			else
				treeContext = topUl.parentNode.ajaxart.params;
			
			var newLI = aa_first([newItems[i]],profile,'NewNodeItem',treeContext);
			if (newLI != null)
			{
				if (addBefore == null)
					aa_xml_appendChild(topUl,newLI);
				else 
					topUl.insertBefore(newLI,addBefore);
				
				ajaxart.run([newLI],profile,'OnNewItem',context);
				var treeview = $(topUl);
				if ( ! treeview.hasClass("treeview") )
				  treeview = treeview.parents(".treeview");		
				
				treeview.treeview({add: $(newLI)});
			}
			items_to_add--;
		}
		
	  }
	  if (addingTopUl)
	  {
		  var branches = $(aboveUl);
		  $(aboveUl).parents('.treeview').treeview({add: branches});
	  }
	  return ["true"];
  },
  SelectItem: function (profile,data,context)
  {
	  var item = aa_first(data,profile,'Item',context);
	  if (item == null) return [];
      var dataElem = ajaxart_tree_find_databound_elem(item);

	  ajaxart_css_selection(dataElem,'treeview');
	  ajaxart_selectionchanged(dataElem);
	  ajaxart_runevent(dataElem,'TreeContext','OnSelect');
	  
	  return ["true"];
  },
  OpenAllNodes: function (profile,data,context)
  {
	  var depth = aa_int(data,profile,'MaxDepth',context);
	  if (isNaN(depth) || typeof(depth) != 'number') 
		  depth = 10;
		var elements = data;
		if (elements.length == 0 || !ajaxart.ishtml(elements[0]))
			elements = ajaxart.getControlElement(context);

	  if (elements.length == 0) return [];
	  var tree = elements[0];

	  for (var i=0;i<depth;i++)
	  {
		  var expandable_elems = $(tree).find('.expandable .hitarea');
		  if (expandable_elems.length == 0) break;
		  for(var t=0;t<expandable_elems.length;t++)
			  $(expandable_elems[t]).click();
	  }
	  return ["true"];
  },
  DeleteSelected: function (profile,data,context)
  {
	  // the 'selected' class should be on the LI, not the SPAN. that would allow us to use uiaction.RefreshAfterSelectedDeleted
  	 var controls = ajaxart.getControlElement(context);
  	 var selected = $(controls).find('.selected').parent();
  	 if (selected.length ==1)
  	 {
  		 var elem = selected[0];
  		 var newSel = elem.nextSibling;
  		 if (newSel == null) newSel = elem.previousSibling; 
  		 if (newSel == null) {
  			 var parents = $(elem).parents('.treeitem');
  			 if (parents.length > 0) newSel = parents[0];
  		 }
  		 elem.parentNode.removeChild(elem);
  		 if (newSel != null) {
  			 $(newSel).find('>span').addClass('selected');
  			 aa_xFireEvent(newSel, 'click', null);
  		 }
  	 }
  	 return ["true"];
  },
  SelectTreeNodeByPath: function (profile,data,context)
  {
	  var pathItems = ajaxart.run(data,profile,'PathItems',context);
	  var node = $(ajaxart.getControlElement(context)).find('.tree_wrapper');
	  for(var i=0;i<pathItems.length;i++) {
		  if (node.hasClass("expandable"))
			  node.find('>.hitarea').trigger('click');	// expand
		  var candidates = $(node).children("ul").children("li");
		  var found=false;
		  for(var j=0;j<candidates.length;j++) {
			  if ( $(candidates[j]).children('.treeitem_text').find('.treeitem_text_content').text() == ajaxart.totext(pathItems[i]) )
			  {
				  node = $(candidates[j]);
				  found = true;
				  break;
			  }
		  }
		  if (!found)
			  return [];	// not found
	  }
	  var dataElem = $(node).children(".treeitem_text")[0];
	  ajaxart_css_selection(dataElem,'treeview');
	  ajaxart_selectionchanged(dataElem);
	  
	  return [];
  },
  TreeNodeByPath: function (profile,data,context)
  {
	  var path = aa_text(data,profile,'TreePath',context);
	  var elements = $(ajaxart.getControlElement(context)).find('.tree_wrapper');
	  if (elements.length == 0) return [];
	  var tree = elements[0];
	  var elems = path.split('/');
	  var result = tree;
	  for(var i=0;i<elems.length;i++) {
		  var found = false;
		  
		  var candidates = $(result).children('ul').children('li');
		  for(var j=0;j<candidates.length;j++)
			  if ( $(candidates[j]).children('span').find('.treeitem_text_content').text() == elems[i] )
			  {
				  found = true;
				  result = candidates[j];
			  }
		  if (! found) return [];
	  }
	  return [result];
  },
  PathOfSelectedItem: function (profile,data,context)
  {
	var elements = ajaxart.getControlElement(context);
	if (elements.length == 0) return [];
	var tree = elements[0];
	var selected = $(tree).find('.selected');
	var path = "";
//	var spans = selected.parents('.treeitem').find('>span');
	var spans = selected.parents('.treeitem').children('span');
	for(var i=0;i<spans.length;i++)
	{
		var text = $(spans[i]).find('.treeitem_text_content').text();
		if (path != "")
			path = text + "/" + path;
		else
			path = text;
	}
	return [path];
  },
  PickTreeRoots: function (profile,data,context)
  {
	  if (data.length == 0) return [];
	  var values = aa_xpath(data[0],"Value");
	  var make_unique = {};
	  var result = [];
	  for(var i=0;i<values.length;i++)
	  {
		  var value= values[i];
		  var category = value.getAttribute("category");
		  if (category == null)
			  result.push(value.getAttribute("val"));
		  else
		  {
			  var root = category.split('.')[0];
			  if (make_unique[root] == undefined)
			  {
				  result.push(root);
				  make_unique[root] = true;
			  }
		  }
	  }
	  return result;
  }
};

ajaxart_tree_keydown = function(event)
{
	if (event.keyCode == 40 || event.keyCode == 38)
		  ajaxart_stop_event_propogation(event);	//canceling scroll when clicking key up or down
}
ajaxart_tree_event = function(event)
{
    var element = (typeof(event.target)== 'undefined')? event.srcElement : event.target;
    if ($(element).hasClass("hitarea")) return;
    if (event.type == 'keyup') {
    	var selectedItems = $(element).parents(".tree_top").find('.selected');
    	if (selectedItems.length > 0)
    		element = selectedItems[0];
    }
    	
    var dataElem = ajaxart_tree_find_databound_elem(element);
    var refocus=false;
    if (dataElem != null)
    {
    	if (event.type == 'click') {
    		ajaxart_css_selection(dataElem,'treeview');
    		ajaxart_selectionchanged(dataElem);
    		ajaxart_runevent(dataElem,'TreeContext','OnSelect');
    		refocus=true;
    		// bug workaround: manually activate capture event
    		if (window.captureEvents && window.onmousedown != null)
    			window.onmousedown(event);
    		if (!window.captureEvents && document.onmouseclick != null)	// IE
    			document.onmouseclick(event);
    	}
    	else if (event.type == 'dblclick')
    		ajaxart_runevent(dataElem,'TreeContext','OnDoubleClick');
    	else if (event.type == 'keyup')
    	{
    		if (event.keyCode == 13 && ! event.ctrlKey) // enter
        	  ajaxart_runevent(dataElem,'TreeContext','OnDoubleClick');
    		if (event.keyCode == 46) // DEL
          	  ajaxart_runevent(dataElem,'TreeContext','OnDelete');
  	        if (event.keyCode == 40) {  // down
  			  ajaxart_stop_event_propogation(event);
			  ajaxart_tree_move_cursor(dataElem,1,event.altKey);
  	        }
	  	    if (event.keyCode == 38)  // up  
  			  ajaxart_tree_move_cursor(dataElem,-1,event.altKey);
	  	    if (event.keyCode == 39 || event.keyCode == 37)  // right - expand
	  	    {
	  	    	var expand = (event.keyCode == 39);
	  	    	if ($(dataElem).parents('.right2left').length>0)
	  	    		expand = !expand;
	  	    	
	  	    	if (!expand) {
	  	    		if ($(dataElem.parentNode).hasClass('collapsable'))
	  	    			ajaxart_tree_expandCollapse(dataElem,expand);
	  	    		else
	  	    			ajaxart_tree_move_cursor(dataElem,-2,event.altKey);	// go up
	  	    	}
	  	    	else
	  	    		ajaxart_tree_expandCollapse(dataElem,expand);
	  	    }
	  	    //if (event.keyCode >= 37 && event.keyCode <= 40) {refocus=true;}
	  	    ajaxart_tree_make_selected_visible($(dataElem).parents(".tree_top").find('.tree_wrapper'));
	  	    ajaxart.setVariable(dataElem.ajaxart.params,"_CurrentFocus",[ $(dataElem).find('.treeitem_dummy4focus')[0] ]);
	  	    ajaxart_runevent(dataElem,'TreeContext','OnKeyPressed','',event);
    	}
    }
    
    if (dataElem != null && refocus)
    {
    	if (dataElem.tabIndex == 1)
    		$(dataElem).focus();
    	else
    		$(dataElem).find('.treeitem_dummy4focus').focus();
    }
}

ajaxart_tree_find_databound_elem = function(element)
{
	while (element != null && element.nodeType == 1)
	{
		if (element.tagName.toLowerCase() == "li")
			return ajaxart_tree_item_from_li(element);
		element = element.parentNode;
	}
	return null;
}

ajaxart_tree_item_from_li = function(li)
{
	// find our span and return it
	var node = li.firstChild;
	while (node != null)
	{
		if (node.nodeType == 1 && node.tagName.toLowerCase() == 'span') 
			return node;

		node=node.nextSibling;
	}
}

ajaxart_tree_expandCollapse = function(dataElem,expand)
{
	var li = dataElem.parentNode;
	
	if (expand && $(li).hasClass('expandable'))
		$(li).find('>.hitarea').trigger('click');
	if (!expand && $(li).hasClass('collapsable'))
		$(li).find('>.hitarea').trigger('click');
}
ajaxart_tree_move_cursor = function(dataElem,advance,do_not_select)
{
	var newElem = null;
	
	var li = dataElem.parentNode;

	if (advance == 1) 
	{		
		if ($(li).hasClass("collapsable")) // go inside
		{
			var ul = $(li).find(".treeul")[0];
			if (ul.firstChild.tagName.toLowerCase() == 'li')
				newElem = (ul.firstChild);
		}
		while(newElem == null && li != null)
		{
			if (li.nextSibling != null)
				newElem = li.nextSibling;

			if ( $(li.parentNode).hasClass("treeul") )
				li = li.parentNode.parentNode;
			else 
				li = null;
		}
	}
	if (advance == -1) 
	{
		var prevTop = li.previousSibling;
		if (prevTop == null)
		{
			if ( $(li.parentNode).hasClass("treeul") )
				newElem = li.parentNode.parentNode;
		}
		// find the innermost under prevTop
		while(newElem == null && prevTop != null)
		{
			if (! $(prevTop).hasClass("collapsable") ) newElem = prevTop;
			var treeItems = $(prevTop).find(".treeitem");
			if (treeItems.length == 0) newElem = prevTop;
			else
				prevTop = treeItems[treeItems.length-1];
		}
	}
	if (advance == -2) {
		newElem = li.parentNode.parentNode;
	}
	if (newElem != null)
	{
		var dataElem = ajaxart_tree_item_from_li(newElem)
		ajaxart_css_selection(dataElem ,'treeview');
		ajaxart_selectionchanged(dataElem);
		if (do_not_select == null || do_not_select != true)
			ajaxart_runevent(dataElem,'TreeContext','OnSelect');

		if (dataElem != null)
	    	if (dataElem.tabIndex == 1)
	    		$(dataElem).focus();
	    	else
	    		$(dataElem).find('.treeitem_dummy4focus').focus();
	}
}

ajaxart_tree_toggle = function(element,actionContext,actionToRun)
{
	var elem = $(element);
	if (elem.hasClass("collapsable")) // opening
	{
		if( elem.children("ul").children("li").length === 0) {	// lazy
			var ul = elem.children("ul")[0];
			var treeitem = ajaxart_tree_item_from_li(element);

			var elem_context = treeitem["ajaxart"];
			if (typeof(elem_context)=="undefined") return;
			var params = elem_context.params;

			var actionContextPack = params.vars[actionContext];
			if (actionContextPack == null || actionContextPack.length == 0) return;
			var actionToRunPack = actionContextPack[0][actionToRun];
			if (actionToRunPack == null || typeof(actionToRunPack) == "undefined") return;
			
			var newContext = ajaxart.clone_context(actionToRunPack.context);
			newContext.vars = elem_context.params.vars;
			ajaxart.setVariable(newContext,"InputForChanges",elem_context.data);

			ajaxart.run([ul],actionToRunPack.script,"",newContext);
		}
	}
}

ajaxart_tree_make_selected_visible = function(treewrapper)
{
  var selected = treewrapper.find('.selected');
  if (selected.length == 0) return;
  var item = selected[0];

  var avgHeight = 20;
  var scrollBarHeight = 20;
  
  var realOffset = 0;
  while (item != null && item != treewrapper)
  {
      realOffset += item.offsetTop;
      item = item.offsetParent;
  }
  var treeTop = aa_absTop(treewrapper[0],true);
  var isSeen = false;
  var scrollTop = treewrapper[0].scrollTop;
  var innerLoc = realOffset - treeTop;
  if ( innerLoc >= scrollTop && innerLoc+avgHeight < treewrapper.height() + scrollTop - scrollBarHeight) isSeen = true;
  if (isSeen) return;
  
  if (innerLoc - scrollTop < treewrapper.height() /2 ) //going up
	  var newScrollTop = Math.max(innerLoc - avgHeight,0);
  else
	  var newScrollTop = innerLoc - treewrapper.height() + avgHeight*2;
  
  treewrapper[0].scrollTop = newScrollTop;
}

ajaxart_treeitem_data = function (element)
{
	if (element.tagName.toLowerCase() == 'span') return element.ajaxart.data;
	if (element.tagName.toLowerCase() == 'li') 
		return ajaxart_tree_item_from_li(element).ajaxart.data;
	return null;
}

ajaxart_tree_addChildren = function (parent,children,profile,data,context,depth)
{
	var checkbox = "";
	var selector = aa_first(data,profile, 'MultiSelector', context);
	var result = [];

	for(var i=0;i<children.length;i++)
	{	
		var child = children[i];
		var title = aa_text([child],profile, 'ItemText', context);
		var image = aa_jbart_image('/default1616.gif',context);
		if (profile.getAttribute('ItemImage') != null || aa_xpath(profile,'ItemImage').length > 0)
			image = aa_text([child],profile, 'ItemImage', context);
		
		var subItems = ajaxart.run([child],profile, 'NextLevel', context);
		var isLeaf = subItems.length == 0;
		if (isLeaf && selector != null)
		{
			if (selector.IsSelected != undefined && aa_bool([child],selector.IsSelected.script, '', selector.IsSelected.context))
				checkbox = '<input type="checkbox" onclick="ajaxart_tree_checkbox_clicked(this,event)" class="aacheckbox_value" checked="checked"/>';
			else
				checkbox = '<input type="checkbox" onclick="ajaxart_tree_checkbox_clicked(this,event)" class="aacheckbox_value" />';
		}
		var closed = "";
		if (subItems.length > 0 && depth == 1) closed = " closed";
		var node = $('<li class="aa_item treeitem' + closed + '">'
				+ '<image class="treeitem_image" src="' + image + '" align="top" height="16px"/>'
				+ checkbox
				+ '<span style="position:relative;" class="treeitem_text text_item" tabindex="1" onkeyup="ajaxart_tree_event(event);return false;">' + title + ' </span></li>')[0];
		node.selector = selector;
		// binding the span and the li
		var text_node = $(node).find('.text_item')[0];
		ajaxart.databind([text_node],[child],context,profile);
		//ajaxart.databind([node],[child],context,profile);
		if (aa_xpath(profile,'ItemColoring').length > 0)
			ajaxart.run([text_node],profile, 'ItemColoring', context);
		
		parent.appendChild(node);
		result.push(node);
		if (subItems.length > 0)
		{
			var childsParent = $('<ul class="treeul"/>')[0];
			node.appendChild(childsParent);
			if (depth == 1)
				node.Lazy = true;
			else
				ajaxart_tree_addChildren(childsParent,subItems,profile,data,context,depth-1);
		}
	}
	return result;
}

ajaxart_tree_LazyExpand = function(element,data,profile,context)
{
//    ajaxart.log("ajaxart_tree_LazyExpand " + element.tagName);
	var itemdata = ajaxart_treeitem_data(element);
	var li = $(element);
	var ul = $(element).find('ul');
	if (li.hasClass("collapsable")) // opening
	{
		if( element.Lazy ) {	// lazy
			var subItems = ajaxart.run(itemdata,profile, 'NextLevel', context);
			var children = ajaxart_tree_addChildren(ul[0],subItems,profile,data,context,1);
			element.Lazy = false;

			ul.css('display','block'); // fixing strange bug in safari & chrome
			
			var branches = $(children);
			
			li.parents(".tree_top").treeview({
				add: branches, 
				toggle: function() { ajaxart_tree_LazyExpand(this,data,profile,context);}
			});
		}
	}
}
ajaxart_tree_checkbox_clicked = function (elem,event)
{
	var item = elem.parentNode;
	var selector = item.selector;
	if (selector != null)
	{
		var result = ajaxart.run(item.ajaxart.data,selector.Toggle.script, '', selector.Toggle.context);
		ajaxart_runevent(item,'TreeContext','MultiSelect');
	}
}

// ********************** action_async.js **************************************



aa_gcs("action_async", {
	RunAsync: function(profile, data, context)
	{
	    var failure = aa_xpath(aa_parsexml('<xml value=""/>'),'@value');
	    var newContext = aa_ctx(context,{ AyncFailure : failure });
	    
		ajaxart_RunAsync(data,ajaxart.fieldscript(profile,'Action'),newContext,function(data1,ctx,success) {
			ajaxart.run(data,profile,success ? 'OnSuccess' : 'OnFailure',context);
		});
		return ["true"];
	},
	RunAsyncActions: function(profile, data, context)
	{
	    var failure = aa_xpath(aa_parsexml('<xml value=""/>'),'@value');
	    var newContext = aa_ctx(context,{ AyncFailure : failure, _AsyncCallback: null });

	    return ajaxart.gcs.action_async.SequentialRun(profile,data,newContext);
	},
	RunAsyncWithSuccessFailure: function(profile, data, context)
	{
		
	},
	SyncAction: function(profile, data, context)
	{
		ajaxart.runsubprofiles(data,profile,'Action',context);
		return ["true"];
	},
	RunActionOnItems: function(profile, data, context)
	{
		var cbObj = ajaxart_async_GetCallbackObj(context);
		cbObj.marked = true;
		cbObj.index = 0;
		cbObj.items = ajaxart.run(data,profile,'Items',context);
		cbObj.actionProf = ajaxart.fieldscript(profile,'Action');
		
		var callBack = function(data1,context1) {
			var cbObj = ajaxart_async_GetCallbackObj(context);
			if (cbObj.index >= cbObj.items.length) {
				ajaxart_async_CallBack(data,context); return;
			}
			cbObj.index++;
			ajaxart_RunAsync([cbObj.items[cbObj.index-1]],cbObj.actionProf,context,cbObj.seqCallBack);
		}
		cbObj.seqCallBack = callBack;
		callBack(data,context);
		return ["true"];
	},
	ActionOnAsyncData: function(profile, data, context)
	{
		var inPreviewMode = ajaxart.inPreviewMode;
		if (ajaxart.inPreviewMode && jBart.vars._previewAsyncs) {
			for(var i=0;i<jBart.vars._previewAsyncs.length;i++)
				if (jBart.vars._previewAsyncs[i].profile == profile)  // result data found - run it in a sync way
					ajaxart.run(jBart.vars._previewAsyncs[i].data,profile,'Action',context);
		}

		ajaxart_async_Mark(context);
		
		var callBack = function(newdata,context1) 
		{
			if (inPreviewMode) { // if it was originated in preview mode
				if (! jBart.vars._previewAsyncs) jBart.vars._previewAsyncs = [];
				var found=false;
				for(var i=0;i<jBart.vars._previewAsyncs.length;i++) {
					if (jBart.vars._previewAsyncs[i].profile == profile) { 
						found=true;
						jBart.vars._previewAsyncs[i].data = newdata;
					}
				}
				if (!found) jBart.vars._previewAsyncs.push({profile: profile, data: newdata})
			}
			ajaxart.run(newdata,profile,'Action',context);
			ajaxart_async_CallBack(data,context);
		}

		aa_RunAsyncQuery(data,ajaxart.fieldscript(profile,'Query'),context,callBack);

		return ["true"];
	},
	AsyncActionOnAsyncData: function(profile, data, context)
	{
		ajaxart_async_Mark(context);
		
		var callBack = function(newdata,context1) {
			var ret = function(data1,context2) { ajaxart_async_CallBack(data,context); };
			ajaxart_RunAsync(newdata,ajaxart.fieldscript(profile,'Action'),context,ret);
		}
		aa_RunAsyncQuery(data,ajaxart.fieldscript(profile,'Query'),context,callBack);
		return ["true"];
	},
	SuccessByHttpCode:function(profile, data, context) {
		// Todo
	},
	Rest: function(profile, data, context)
	{
		return ajaxart.gcs.data_async.Rest(profile,data,context);
	},
	UrlGet: function(profile, data, context)
	{
		return ajaxart.gcs.data_async.UrlGet(profile,data,context);
	},
	UrlPost: function(profile, data, context)
	{
		return ajaxart.gcs.data_async.UrlPost(profile,data,context);
	},
	LoadJsFiles: function(profile, data, context)
	{
		var files = ajaxart_run_commas(data,profile,'JsFiles',context);
		for(var i=0;i<files.length;i++) {
		  var file = files[i],callbackFunc = '';
		  if (file.split(' ').length > 1) {  // with a callback func
			  callbackFunc = file.split(' ')[1];
			  file = file.split(' ')[0];
		  }
		  if (!aa_jsfiles[file]) aa_jsfiles[file] = { file: file , afterLoad: []};
		  if (aa_jsfiles[file].loaded) continue; 
		  
		  var myFunc = function(file,callbackFunc) {
		    ajaxart_async_Mark(context);
		  
		    aa_jsfiles[file].afterLoad.push({data:data,context:context});
		    if (!aa_jsfiles[file].loading) {
		    	aa_jsfiles[file].loading = true;
		    	
		    	if (callbackFunc) { 
			    	window[callbackFunc] = function() {
				    	aa_jsfiles[file].loaded = true;
				    	var calls = aa_jsfiles[file].afterLoad;
				    	for(var i=0;i<calls.length;i++)
				    	  ajaxart_async_CallBack(calls[i].data,calls[i].context);    // TODO: put a counter not to run it more than once
				    }
		    		$.getScript(file);
		    	}
		    	else {
		    		$.ajax({ url: file, dataType: "script",
		    			  success: function() {  // TODO: write in global status bar, and remove it when loaded
					    	aa_jsfiles[file].loaded = true;
					    	var calls = aa_jsfiles[file].afterLoad;
					    	for(var i=0;i<calls.length;i++)
					    	  ajaxart_async_CallBack(calls[i].data,calls[i].context);    // TODO: put a counter not to run it more than once
		    			  },
		    			  error: function() {
		    				  ajaxart.log('could not load script file ' + file,'error');
		    				  var calls = aa_jsfiles[file].afterLoad;
		    				  for(var i=0;i<calls.length;i++)
					    	    ajaxart_async_CallBack(calls[i].data,calls[i].context);    // TODO: put a counter not to run it more than once
		    			  }
			         });	
		    	}
		    }
		  }
		  myFunc(file,callbackFunc);
		}
	},
	LoadXtmlPackage: function(profile, data, context)
	{
		var _package = aa_text(data,profile,'Package',context);
		if (_package == "") return [];
		ajaxart_async_Mark(context);
		
	    var options = { cache: false , type: "GET", httpHeaders : [], url: _package };
        options.success = function(server_content) {
     	  var xtml = ajaxart_server_content2result(server_content)[0];
     	  ajaxart.load_xtml_content(aa_text(data,profile,'Package',context),xtml);
     	  
      	  ajaxart_async_CallBack([],context); 
        }
        options.error = function(e) {
        	aa_handleHttpError(e,this,context);
      	  ajaxart_async_CallBack([],context); 
        }
        $.ajax(options);
	}
});


ajaxart.gcs.data_async = 
{
	Rest: function(profile, data, context)
	{
	  ajaxart_async_Mark(context,true);

	  if (aa_tobool(context.vars._NoExternalCalls)) {
		  var results = ajaxart.run([],profile,'SampleResults',context);
      	  ajaxart_async_CallBack(ajaxart.run(results,profile,'ConvertResult',context),context); 
		  return [];
	  }
	  
	  var req_id = aa_text(data,profile,"ID",context);
	  if (req_id != '')
	  {
		  if (ajaxart.Requests == null) ajaxart.Requests = {}
		  if (ajaxart.Requests[req_id])
			  ajaxart.Requests[req_id].abort();
	  }
	  var method = aa_text(data,profile,'Method',context);
	  var contentType = aa_text(data,profile,"ContentType",context);

	  var options = { cache: false , type: method, headers:{'Content-Type': contentType } };
	  options.url = aa_text(data,profile,'Url',context);
      options.data = aa_text(data,profile,'PostData',context);

      var resultType = aa_text(data,profile,'ResultType',context);
      
      options.success = function(server_content) {
    	  var newdata = ajaxart_server_content2result(server_content,resultType);
    	  var result = ajaxart.run(newdata,profile,'ConvertResult',context);
    	  ajaxart.run(result,profile,'ActionOnResult',context);
    	  aad_hideProgressIndicator(context);
    	  ajaxart.run(result,profile,'OnSuccess',context);
      	  ajaxart_async_CallBack(result,context); 
      }
      options.error = function(e) {
    	  aa_handleHttpError(e,this,context);
   		  ajaxart.writevalue(context.vars.AsyncFailure,["true"]);
    	  aad_hideProgressIndicator(context);
    	  ajaxart.run(result,profile,'OnError',context);
      	  ajaxart_async_CallBack([],context); 
      }
      
      if (aa_bool(data,profile,'TunnelRequest',context)) {
    	  if (method == 'GET') {
    		  aa_crossdomain_call({ 
    			  url: '//jbartdb.appspot.com/jbart_db.js?op=proxy&url='+encodeURIComponent(options.url), 
    			  success: options.success,
    			  error: options.error
    		  },true);
    		  options._doNotRunAjax = true;
    	  } else {
	    	  options.type = "POST";
	    	  options.headers = {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'} // needed to escape the tunneling data
	    	  options.data = { 
	    			  'contents' : options.url, 
	    			  'headers': 'Content-Type: ' + contentType,
	    			  '__METHOD': method, 
	    			  '__POSTDATA': options.data
	    	  }
	    	  options.url = "get.php";
    	  }
      }
      
      if (!options._doNotRunAjax) {
		  var req = $.ajax( options );
		  aad_showProgressIndicator(context);
		  if (req_id != '') ajaxart.Requests[req_id] = req;
      }
	},
	CurrentGeoLocation: function(profile, data, context)
	{
	  if (navigator.geolocation) {
		  ajaxart_async_Mark(context,true);
		  navigator.geolocation.getCurrentPosition(function (position) {
			  ajaxart_async_CallBack([position.coords],context);
		  });
	  }
	  return [];
	},
	JBartJsonP: function(profile, data, context)
	{
	  var baseUrl = aa_text(data,profile,'Url',context);
	  if (ajaxart.inPreviewMode) {
		  if (!window.aa_preview_cache) window.aa_preview_cache = {};
		  if (window.aa_preview_cache[baseUrl])
			  return window.aa_preview_cache[baseUrl];
	  }
	  ajaxart_async_Mark(context,true);
	  if (!ajaxart.jSonRequests) ajaxart.jSonRequests = {}
	  if (!ajaxart.jsonReqCounter) ajaxart.jsonReqCounter = 0;
	  if (! window.aa_jsonp_callback) aa_jsonp_callback = function(server_content,id,url)
	  {
	  	 var req = ajaxart && ajaxart.jSonRequests[id];
	  	 if (req)
	  	 {
	  		  ajaxart.jSonRequests[id] = null;
	   		  var newdata = ajaxart_server_content2result(server_content,aa_text(req.data,req.profile,"ResultType",req.context));
	     	  ajaxart.run(newdata,req.profile,'OnSuccess',req.context);
	     	  aad_hideProgressIndicator(context);
	     	  
	     	  if (ajaxart.jbart_studio && window.aa_preview_cache) window.aa_preview_cache[req.baseUrl] = newdata;
	     	  
	      	  ajaxart_async_CallBack(newdata,req.context); 
	  	 }
	  }
	  ajaxart.jsonReqCounter = (ajaxart.jsonReqCounter + 1) % 1000;
	  ajaxart.jSonRequests[ajaxart.jsonReqCounter] = { data: data, profile: profile, context: context, baseUrl: baseUrl }; 
	  var url = baseUrl + '&aa_req_id=' + ajaxart.jsonReqCounter;

	  $.ajax( { 
			  cache: false , 
			  dataType: 'script',
			  httpHeaders : [],
			  url: url,
      		  error: function(e) {
      			 aa_handleHttpError(e,this,context);
      			 ajaxart.writevalue(context.vars.AsyncFailure,["true"]);
      			 aad_hideProgressIndicator(context);
		  		 ajaxart.run(newdata,profile,'OnFailure',context);
		  		 ajaxart_async_CallBack([],context); 
      		 }
	  });
	  aad_showProgressIndicator(context);
	  
	  return [];
	},
	Parallel: function(profile, data, context)
	{
		var cbObj = ajaxart_async_GetCallbackObj(context);
		cbObj.marked = true;
		cbObj.index = 0;
		cbObj.mergeInputs = ajaxart.subprofiles(profile,'Input');
		var newContext = ajaxart.clone_context(context);
		newContext.vars._ASyncContextForMerge = [newContext];
		
		var init = function(newContext) {
			var callBack = function(data1,context1) {
				var cbObj = ajaxart_async_GetCallbackObj(context);
				if (cbObj.index >= cbObj.mergeInputs.length) {
					var result = ajaxart.run(data,profile,'Result',newContext);
					ajaxart_async_CallBack(result,context); return;
				}
				cbObj.index++;
				ajaxart_RunAsync(data,cbObj.mergeInputs[cbObj.index-1],newContext,cbObj.pCallBack);
			}
			cbObj.pCallBack = callBack;
			callBack(data,newContext);
		}
		init(newContext);
		
		return [];
	},
	MergeInput: function(profile, data, context)
	{
		ajaxart_async_Mark(context,true);
		var callBack = function(data1,ctx) {
			var name = aa_text(data,profile,'Name',context);
			context.vars._ASyncContextForMerge[0].vars[name] = data1;
			ajaxart_async_CallBack([],context);
		}
		aa_RunAsyncQuery(data,ajaxart.fieldscript(profile,'Query',true),context,callBack);
		return [];
	},
	CurrentGeoLocation: function(profile, data, context)
	{
		if (!navigator.geolocation) return;
 	    ajaxart_async_Mark(context,true);
		navigator.geolocation.getCurrentPosition(function (position) {
			var out = {isObject:true, Latitude: ''+position.coords.latitude , Longitude: ''+position.coords.longitude };
			ajaxart_async_CallBack([out],context);
		});
	},
	UrlPost: function(profile, data, context)
	{
	  ajaxart_async_Mark(context,true);

	  var req_id = aa_text(data,profile,"ID",context);
	  if (req_id != '')
	  {
		  if (ajaxart.Requests == null) ajaxart.Requests = {}
		  if (ajaxart.Requests[req_id])
			  ajaxart.Requests[req_id].abort();
	  }
	  var contentType = aa_text(data,profile,"ContentType",context);

	  var request = { 
	  	cache: false, 
	  	type: "POST", 
	  	headers: {'Content-Type': contentType},
	  	url: aa_text(data,profile,'Url',context),
	  	data: {},
	  	success: function(server_content) {
    	  aad_hideProgressIndicator(context);
   		  var newdata = ajaxart_server_content2result(server_content,aa_text(data,profile,"ResultType",context));
     	  ajaxart.run(newdata,profile,'OnSuccess',context);
      	  ajaxart_async_CallBack(newdata,context); 
      },
      error: function(e) {
		  	aad_hideProgressIndicator(context);
		  	aa_handleHttpError(e,this,context);
   		  ajaxart.writevalue(context.vars.AsyncFailure,["true"]);
   		  ajaxart_async_Failure(context)
     	  ajaxart.run([],profile,'OnFailure',context);
      	ajaxart_async_CallBack([],context); 
      }
	  };

    var postDatas = ajaxart.runsubprofiles(data,profile,'PostData',context);
	  for(var i=0;i<postDatas.length;i++) {
	    var obj = postDatas[i];
	    if (obj.Name)
	    {
	  	  var name = ajaxart.totext(obj.Name);
		    var val = ajaxart.totext(obj.Value);
		    if (val != null) request.data[name] = val;
	    }
	    else // raw data overrides properties
	    	request.data = ajaxart.totext(obj);
	  }

    if (aa_bool(data,profile,"TunnelRequest",context)) {
    	var raw_data = request.data;
    	request.data = {}
    	if (typeof raw_data === 'string')
    		request.data.__POSTDATA = raw_data;
    	request.data.contents = request.url;
    	request.data.headers = 'Content-Type: ' + contentType;
    	request.data.__METHOD = 'POST';
    	request.url = 'get.php';
    }

	  var req = $.ajax( request );
	  aad_showProgressIndicator(context);
	  if (req_id != '')
		  ajaxart.Requests[req_id] = req;
	  return [];
	},
	UrlGet: function(profile, data, context)
	{
	  ajaxart_async_Mark(context,true);
	  var url = aa_text(data,profile,'Url',context);
	  if (!ajaxart.UrlGetResults) ajaxart.UrlGetResults = {};
	  if (aa_bool(data,profile,"CacheResult",context) && ajaxart.UrlGetResults[url])
	  {
		  ajaxart_async_CallBack(ajaxart.UrlGetResults[url],context);
		  return ajaxart.UrlGetResults[url];
	  }
	  if (aa_bool(data,profile,"TunnelRequest",context))
		  return ajaxart.runNativeHelper(data,profile,'TunnelRequest',context);
	  var req_id = aa_text(data,profile,"ID",context);
	  if (req_id != '')
	  {
		  if (ajaxart.Requests == null) ajaxart.Requests = {}
		  if (ajaxart.Requests[req_id])
			  ajaxart.Requests[req_id].abort();
	  }
	  var options = { cache: false , type: "GET", httpHeaders : [] };
      options.url = options.originalUrl = url;

      options.success = function(server_content) {
     	  var fixedData = ajaxart_server_content2result(server_content,aa_text(data,profile,"ResultType",context));
     	  ajaxart.UrlGetResults[this.originalUrl] = fixedData;
		  aa_text(fixedData,profile,'OnSuccess',aa_ctx(context,{_UrlGetResult: [fixedData]}));
      	  ajaxart_async_CallBack(fixedData,context); 
      }
      options.error = function(e) {
    	  aa_handleHttpError(e,this,context);
      	  ajaxart_async_CallBack([],context); 
      }

	  var req = $.ajax( options );
	  if (req_id != '')
		  ajaxart.Requests[req_id] = req;
	  return [];
	},
	Calculate: function(profile, data, context)
	{
  	  ajaxart_async_Mark(context,true);
  	  var newdata = ajaxart.run(data,profile,'Query',context);
  	  ajaxart_async_CallBack(newdata,context); 
	  return [];
	},
	SyncDataOnNextTimer: function(profile, data, context)
	{
	   ajaxart_async_Mark(context,true);
	   setTimeout(function(){
	  	  var newdata = ajaxart.run(data,profile,'Query',context);
	  	  ajaxart_async_CallBack(newdata,context); 
	   },10);
	},
	AsyncDataOnNextTimer: function(profile, data, context)
	{
		ajaxart_async_Mark(context,true);
		setTimeout(function(){
			aa_RunAsyncQuery(data,ajaxart.fieldscript(profile,'Query'),context,function(newdata,ctx) {
				ajaxart_async_CallBack(newdata,context); 
			});
		},10);
	},
	SyncData: function(profile, data, context)
	{
  	  ajaxart_async_Mark(context,true);
  	  var newdata = ajaxart.run(data,profile,'Query',context);
  	  ajaxart_async_CallBack(newdata,context); 
	  return [];
	}
}

aa_gcs("jbart",{
	ApiCall: function(profile, data, context)
	{
	  var url = aa_text(data,profile,'Url',context);
	  var resultType = aa_text(data,profile,'ResultType',context);
	  var previewMode = aa_totext(context.vars._PreviewMode) == 'true';
	  var id = previewMode ? aa_totext(aa_xpath(profile,'../@id')) : '';
	  if (previewMode) {
		  writeToPreviewTextbox('running api call...')
	  }
	  if (!previewMode) {
		  var target = context.vars._Target && context.vars._Target[0];
		  if (!target) target = aa_first(data,profile,'DefaultTarget',context);
		  if (!target) return;
		  if (target.firstChild && aa_bool(data,profile,'SkipCallIfDataPresent',context)) return;
		  while (target.firstChild && !previewMode) target.removeChild(target.firstChild);
	  }
	  
	  var options = {
	    url: url,
	    success: function(result) {
		  if (previewMode) {
			  if (result.trim) result = aa_trim(result); 
			  writeToPreviewTextbox(result);
			  return ajaxart_async_CallBack([result],context);
		  }
		  
    	  var newdata = ajaxart_server_content2result(result,resultType);
    	  if (newdata[0]) {
			ajaxart.xml.copyElementContents(target,newdata[0]);    	  	
    	  }
    	  
      	  ajaxart_async_CallBack(newdata,context); 
	    },
	    error: function(error) {
	      error = error || {};
		  if (previewMode) {
			  writeToPreviewTextbox('error ' + error.message || '');
			  return ajaxart_async_CallBack([],context);
		  }

		  ajaxart.writevalue(context.vars.AsyncFailure,["true"]);
      	  ajaxart_async_CallBack([],context); 
	    }
	 }
	  
     ajaxart_async_Mark(context);
	 ajaxart.run([options],profile,'CommunicationType',context);
	 
	 function writeToPreviewTextbox(message) {
		 $('.fld_api_preview_result').val(message);
	 }
	},
	MultipleApiCalls: function(profile, data, context)
	{
		aad_async_XtmlSequentialRun(data,profile,'Call',context);
	},
	RestWithJBartDBProxy: function(profile, data, context)
	{
	  aa_crossdomain_call({ 
		  url: '//jbartdb.appspot.com/jbart_db.js?op=proxy&url='+encodeURIComponent(data[0].url), 
		  success: data[0].success,
		  error: data[0].error
	  },true);
	},
	JSONP: function(profile, data, context)
	{
		window.aa_jsonp_cb_counter = window.aa_jsonp_cb_counter || 0;
		var cbName = 'aa_jsonp_cb' + (++aa_jsonp_cb_counter);
		window[cbName] = function(result) {
			if (typeof(result) == 'object' && !result.nodeType)
				result = JSON.stringify(result);

			window[cbName] = null;
			data[0].success(result);
		}
		setTimeout(function() {
			if (window[cbName]) {
				// the callback was not called
				window[cbName] = null;
				data[0].error({ text: 'callback was not called'});
			}
		},aa_int(data,profile,'Timeout',context));
		
		var url = data[0].url;
		url += '&'+aa_text(data,profile,'UrlParameterForCallback',context)+'='+cbName;
		aa_load_js_css(url,'js');
	}
});

function ajaxart_async_IsFailure(context)
{
	var cb = context.vars._AsyncCallback; 
	if ( cb != null && cb.success == false ) return true;
	return false;
}
function ajaxart_async_Failure(context)
{
	if ( context.vars._AsyncCallback != null ) context.vars._AsyncCallback.success = false;
}
function aad_showProgressIndicator(context,autoHide)
{
	aa_showIndicator = true;
	$(context.vars.ControlElement).addClass('aa_loading');
	
	setTimeout(function() {
		if (! aa_showIndicator) return;
		var newtext = ajaxart_multilang_text( aa_totext(context.vars.ProgressIndicationText) , context);
		
		if (newtext == "") newtext = ajaxart_multilang_text("loading...",context);
		var jIndicator = $('.aa_progress_indicator');
		if (! jIndicator.hasClass('right2left') && ajaxart_language(context) == 'hebrew')
			jIndicator.addClass('right2left')
			
		jIndicator.find('.aa_progress_indicator_text').html(newtext);
		jIndicator.show();
		if (autoHide)
		{
			setTimeout(function() {
				aad_hideProgressIndicator(context);
			},3000);
		}
	},300);
}
function aad_hideProgressIndicator(context)
{
	aa_showIndicator = false;
	$(context.vars.ControlElement).removeClass('aa_loading');
	
	$('.aa_progress_indicator').hide();
	aa_fire_async_finished();
}
aa_showIndicator = false;

function aad_remove_async_finished_listener(listener)
{
  for(var i=0;i<aa_async_finished_listeners.length;i++) { 
	  if (aa_async_finished_listeners[i]==listener) {
		  aa_async_finished_listeners.splice(i,1);
		  return;
	  }
  }
}
aa_jsfiles = {};

function aad_async_XtmlSequentialRun(data,profile,actionsField,context)
{
	var cbObj = ajaxart_async_GetCallbackObj(context);
	cbObj.marked = true;
	cbObj.index = 0;
	cbObj.actionProfs = ajaxart.subprofiles(profile,actionsField);
	
	var callBack = function(data1,context1) {
		var cbObj = ajaxart_async_GetCallbackObj(context);
		if (cbObj.index >= cbObj.actionProfs.length) {
			ajaxart_async_CallBack(data,context); return;
		}
		var actionProf = cbObj.actionProfs[cbObj.index];
		cbObj.index++;
		ajaxart_RunAsync(data,actionProf,context,cbObj.seqCallBack);
	}
	cbObj.seqCallBack = callBack;
	
	callBack(data,context);
}

// ********************************** bart.js *****************************************

aa_gcs("bart", {
	UIPreferences: function(profile, data, context) {
		var obj = {
			isObject: true
		}
		obj.AlsoInCookie = aa_bool(data, profile, 'AlsoInCookie', context);

		var getPropertyFunc = function(obj) {
			return function(data1, ctx) {
				if (obj.Xml == null || obj.Xml.length == 0) obj.Xml = ajaxart.runNativeHelper(data, profile, 'AppXml', context);

				var prefix = ajaxart.totext_array(ctx.vars.Prefix);
				var property = ajaxart.totext_array(ctx.vars.Property);
				if (context.vars._BartDevDtContext != null && context.vars._BartDevDtContext[0].WriteUiPrefs != null && context.vars._BartDevDtContext[0].WriteUiPrefs[0] == "true") var value = null;
				else if (obj.AlsoInCookie) var value = aa_valueFromCookie(prefix + '_' + property);

				if (value != null) return [value];
				else {
					var value = aa_xpath(obj.Xml[0], prefix + '/@' + property);
					if (value.length > 0) return [value[0].nodeValue];
					return [""];
				}
				return []
			}
		}
		var setPropertyFunc = function(obj) {
			return function(data1, ctx) {
				var prefix = ajaxart.totext_array(ctx.vars.Prefix);
				var property = ajaxart.totext_array(ctx.vars.Property);
				var value = ajaxart.totext_array(ctx.vars.Value);

				if (context.vars._BartDevDtContext != null && context.vars._BartDevDtContext[0].WriteUiPrefs != null && context.vars._BartDevDtContext[0].WriteUiPrefs[0] == "true") ajaxart.runNativeHelper(data, profile, 'WritePref', ctx);
				else if (obj.AlsoInCookie) aa_writeCookie(prefix + '_' + property, value);

				return [];
			}
		}
		obj.CleanPrefValues = function(data1, ctx) {
			var prefix = aa_totext(ctx.vars.Prefix);
			if (context.vars._BartDevDtContext != null && context.vars._BartDevDtContext[0].WriteUiPrefs != null && context.vars._BartDevDtContext[0].WriteUiPrefs[0] == "true") ajaxart.runNativeHelper(data, profile, 'CleanPref', ctx);
			else if (obj.AlsoInCookie) aa_cleanCookies(prefix);
		}
		aa_addMethod_js(obj, 'GetProperty', getPropertyFunc(obj), context);
		aa_addMethod_js(obj, 'SetProperty', setPropertyFunc(obj), context);
		return [obj];
	}
});

ajaxart.gcs.bart_screen = {
	ShowScreen: function(profile, data, context) {
		var lang = ajaxart.totext_array(aa_runMethod([], context.vars._AppContext[0], 'Language', context));
		var newContext = ajaxart.clone_context(context);
		newContext.vars._Cntr = newContext.vars.DataHolderCntr = null;

		if (lang != "") newContext.vars.Language = [lang];

		var cssDefinitions = ajaxart.totext_array(context.vars._AppContext[0].CssDefinitions);

		var out = null;

		// try by field
		var pageID = aa_text(data, profile, 'PageID', context);
		var bctx = context.vars._AppContext[0];
		var pageAsField = null;
		if (pageID) {
			var pageXtml = aa_xpath(bctx.AppXtml[0], "../../Component[@id='" + pageID + "']/xtml")[0];
			if (pageXtml) pageAsField = aa_first([], pageXtml, '', context);
		}
		var pageAsField = pageAsField || (bctx.MainPage && bctx.MainPage(data, context)[0]);
		if (pageAsField && pageAsField.Id) {
			out = $('<div/>')[0];
			// settings contains: Field, Item, Wrapper, FieldData (optional)
			var itemData = pageAsField.PagePreviewData ? pageAsField.PagePreviewData([],context) : [];

			aa_fieldControl({
				Field: pageAsField,
				Wrapper: out,
				Item: itemData,
				Context: aa_ctx(context, {
					Language: [lang]
				})
			});
		}

		if (!out) {
			var outByPage = ajaxart.runNativeHelper(data, profile, 'ByPage', newContext);
			if (outByPage.length > 0) {
				out = outByPage[0]; // new screen - a page
				$(out).addClass('bart_top runtime');
				if (out.ajaxart) {
					out.ajaxart.params = context;
					out.ajaxart.script = profile;
				}
				if (context.vars._AppContext) {
					context.vars._AppContext[0].ControlHolder = [out];
					aa_defineElemProperties(out, 'ParentObject');
					out.ParentObject = context.vars._AppContext;
				}
			}
			if (cssDefinitions != "") {
				var styleElem = $('<style type="text/css">' + cssDefinitions + "</style>")[0];
				out.appendChild(styleElem);
			}
		}

		if (lang == "hebrew") {
			$(out).addClass('right2left');
			if (context.vars.GalleryNode) // in gallery
			out.style.width = aa_screen_size().width - 70 + "px";
		}

		return [out];
	}
};

aa_gcs("bart_resource", {
	ResourceAspect: function(profile, data, context) {
		var obj = ajaxart_dataitem_getItems(context);
		obj.Id = aa_text(data, profile, 'ID', context);
		obj.ID = [obj.Id];
		obj.DependsOn = ajaxart.run(data, profile, 'DependsOn', context);
		obj.Summary = aa_text(data, profile, 'Summary', context);
		obj.ContentType = ajaxart.run(data, profile, 'ContentType', context);
		obj.Type = ajaxart.run(data, profile, 'Type', context);
		return [];
	}
});

ajaxart.gcs.bart_server = {
	LoadNode: function(profile, data, context) {
		var id = aa_text(data, profile, 'ID', context);
		var ct = aa_text(data, profile, 'ContentType', context);

		var node = bart_clientDB_getnode(context, id, ct);
		if (node) return [node];
		ajaxart_async_Mark(context);
		aad_bart_loadNode(context, id, ct, function(newdata, ctx2) {
			var noresult = (newdata.length == 0 || newdata[0].getAttribute('_type') == "error");
			if (!noresult && context.vars._AppContext) aad_bart_clientDB_setnode(context, newdata[0]);
			ajaxart_async_CallBack(newdata, context);
		});
	}
};

function aad_bart_loadNode(context,id,contentType,returnCallback)
{
	var newContext = aa_ctx(context,{ ContentType: [contentType], ID: [id] });
	aa_runMethod_async([],context.vars._ServerAdapter[0],'LoadNode',newContext,returnCallback);
}

function aad_bart_clientDB_setnode(context,node)
{
	var id = node.getAttribute("id");
	var ct = node.getAttribute("_type");
	
	var bctx = context.vars._AppContext[0];
	if (bctx.ClientDB == null) bctx.ClientDB = { isObject: true};
	if (bctx.ClientDB[ct] == null) bctx.ClientDB[ct] = [];
	var items = bctx.ClientDB[ct];
	
	for(var i=0;i<items.length;i++)
		if (items[i].getAttribute('id') == id) { items[i] = node; return; }
	
	items.push(node);
}

function bart_clientDB_getnode(context,id,contentType)
{
	var nodeInGlobalVar = window['BartNode_'+contentType+'__'+id];
	if (nodeInGlobalVar) return nodeInGlobalVar;

	if (!context.vars._AppContext) return null;
	
	var ct = contentType;
	var property = 'ClientDB' ;
	var bctx = context.vars._AppContext[0];
	if (bctx.ClientDB == null || bctx.ClientDB[ct] == null) return null;
	var items = bctx.ClientDB[ct];
	for(var i=0;i<items.length;i++)
	  if (items[i].getAttribute('id') == id)
		  return items[i];
	
	return null;
}

function aad_runMethodAsync(object,methodFunc,data,context,callBack)
{
	if (object == null || methodFunc == null) { callBack(data,context); return; }
	
	var callBackObj = { callBack: callBack, marked: false };
	var newContext = aa_ctx(context,{ _AsyncCallback : callBackObj });
    try {
	  methodFunc.call(object,data,newContext); 
    } catch(e) { ajaxart.logException(e); }
	if (! callBackObj.marked && callBack)	// method did not mark. running callback now
	  callBack(data,context);
}
function aad_runMethodAsyncQuery(object,methodFunc,data,context,callBack)
{
	if (object == null || methodFunc == null) { callBack([],context); return; }
	
	var callBackObj = { callBack: callBack, marked: false };
	var result = [];
	var newContext = aa_ctx(context,{ _AsyncCallback : callBackObj });
	try {
		result = methodFunc.call(object,data,newContext); 
	} catch(e) { ajaxart.logException(e); }
	if (! callBackObj.marked && callBack)	// method did not mark. running callback now
		callBack(result,context);
}
function aa_runMethod_async(data,object,method,context,callBack)
{
	if (object == null || method == "") return [];
	if (object[method] == null) { callBack(data,context); return; }
	
	var scriptParam = object[method];
	if (typeof(scriptParam) == "function") {
		ajaxart_RunAsync(data,scriptParam,context,callBack,object);
		return [];
	}
	
	var newContext = { params: scriptParam.context.params 
			, vars: context.vars
			, componentContext: scriptParam.context.componentContext} // TODO: avoid this if paramVars == ""
	
    if (typeof(scriptParam.objectForMethod) != 'undefined') {
	  newContext.vars = [];
	  for(var j in context.vars) 
		  newContext.vars[j] = context.vars[j]; 
	  newContext._This = object;
    }
	if (scriptParam.script != null)		// TODO: clean these
	  ajaxart_RunAsync(data,scriptParam.script,newContext,callBack,object);
	else
	  ajaxart_RunAsync(data,scriptParam,newContext,callBack,object);
	
	return [];
}

function aa_addControlMethod_js(object,method,jsFunc,context)
{
	var getControl = function(data1,context1) {
		var out = jsFunc(data1,context1);
		if (out.length > 0)
			out[0].XtmlSource = object.XtmlSource;
		
		return out;
	};
	aa_addMethod_js(object,method,getControl,context);	  
}

function aa_addControlMethod(object,method,data,profile,field,context)
{
  var getControl = function(data1,context1) {
	  var out = ajaxart.run(data1,profile,field,context1);
	  if (out.length > 0)
	    out[0].XtmlSource = object.XtmlSource;
	  
	  return out;
  };
  aa_addMethod_js(object,method,getControl,context);	  
}

function aa_object_boolean_value(obj,property)
{
	if (obj[property] == null ) return null;
	if (typeof(obj[property])=="boolean") return obj[property];
	if (obj[property].length == 0 || obj[property] != "true") return false;
	return true;
}

function aad_object_run_boolean_method(object,method,data,context)
{
	if (object[method] == null ) return false;
	var result = aa_runMethod(data,object,method,context);
	if (result.length == 0) return false;
	if (ajaxart.totext_array(result) == "true") return true;
	
	return false;
}

function aad_object_byid(list,id)
{
	if (list == null || typeof(list) == "undefined" ) return null;
	for(var i=0;i<list.length;i++) {
		var item = list[i];
		if (item.Id != null ) {
			if (item.Id == id) return item;
		} else if (item.ID != null && item.ID.length > 0 && item.ID[0] == id) return item;
	}
	return null;
}

// dialog_old.js 

aa_gcs("dialog", {
  ContentsOfOpenPopup: function (profile,data,context)
  {
	  return aa_contentsOfOpenPopup();
  },
  TopDialogContent: function (profile,data,context)
  {
	  var part = aa_text(data,profile,'Part',context);
	  var find_class = ".dialog_content";
	  var topDialogNew = aa_top_dialog();
	  if (openDialogs.length == 0 && !topDialogNew) return [];
	  var dlg = openDialogs[openDialogs.length-1];
	  if (part == "Content") {  // backward compatability
		  if (!dlg) return topDialogNew;  // only new dialogs are opened
	  }
	  if (part == "Data") {
		  if (dlg == null || dlg.dialogContent == null ||dlg.dialogContent.ajaxart == null) return [];
		  return ajaxart.getVariable(dlg.dialogContent.ajaxart.params,"DialogWorkingData");
	  }
	  if (part == "Title")
		  find_class = ".dialog_title_text";
	  var result = $(dlg.dialogContent).find(find_class);
	  if (part == "All")
			result = $(dlg.dialogContent);
	  if (result.length == 0) return [];
	  return [result[0]];
  },
  CloseDialog: function (profile,data,context)
  {
	  // close old dialogs
	  var closeType = aa_text(data,profile,'CloseType',context);
	  var ignoreAAEditor = aa_bool(data,profile,'IgnoreAAEditor',context);
	  
	  aad_close_dialog_old(closeType,ignoreAAEditor);
  },
  FixTopDialogPosition:  function (profile,data,context)
  {
	  return aa_fixTopDialogPosition();
  },
  IsRuntimeDialog: function (profile,data,context)
  {
		var activating_controls = ajaxart.getVariable(context,"OriginalControlElement");
		if ($(activating_controls[0]).parents(".runtime").length > 0 ) return ["true"];
  },
  PopUpDialog:  function (profile,data,context)
  {
	  	var content = aa_first(data,profile,'Dialog',context);
	  	var screenColor = aa_text(data,profile,'ScreenColor',context);
	  	var screenOpacity = aa_first(data,profile,'ScreenOpacity',context);
	  	var previewMode = ajaxart.inPreviewMode == true; 
	  	if (previewMode) return [];
	  	$('body').addClass('body_with_open_dialog');
			// determining direction
	  	var activating_controls = ajaxart.getVariable(context,"OriginalControlElement");
	  	if ($(activating_controls[0]).parents(".runtime").length > 0 ) 
	  	  $(content).addClass('runtime');
  		
	  	var isRtl = false;
	  	if (!aa_bool(data,profile,'AlwaysLTR',context)) {
	  		if ($(activating_controls[0]).parents(".right2left").length > 0) isRtl = true;
	  		else {
	  			if (activating_controls.length == 0 || ! ajaxart.isattached(activating_controls[0])) {
	  				// sometimes activating_controls is empty or detached and it still should be rtl
	  				isRtl = $("body").find('.right2left').length > 0;
	  			}
	  		}
	  	}
	  	if (isRtl)
    	  $(content).addClass("right2left");
	  		
	  	    if (!previewMode) content.style.position="absolute";
			$(content).addClass("ajaxart " + ajaxart.deviceCssClass);
			
			if (!previewMode)
				document.body.appendChild(content);

			// making sure that width/height are not too big
			var screenWidth = window.innerWidth || (document.documentElement.clientWidth || document.body.clientWidth);
			var screenHeight = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);
			/*			if ($(content).width() > screenWidth - 10) {
				$(content).width(screenWidth - 10);
				content.style.tableLayout = "fixed";
			}
			if ($(content).height() > screenHeight - 10) {
				$(content).height(screenHeight - 10);
				content.style.tableLayout = "fixed";
			}*/
			var fix_height_width = function() {
				content.style.visibility = 'visible';
				// determining center position
				var scrollOffsetX = 0;
				var scrollOffsetY = 0;
				// taken fron http://www.howtocreate.co.uk/tutorials/javascript/browserwindow
				if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
			    //DOM compliant
					scrollOffsetY = document.body.scrollTop;
					scrollOffsetX = document.body.scrollLeft;
			  } else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
			    //IE standards compliant mode
			  	scrollOffsetY = document.documentElement.scrollTop;
			    scrollOffsetX = document.documentElement.scrollLeft;
			  }	
				content.style.left = Math.max(5,(screenWidth - $(content).width())/2) + scrollOffsetX + "px";
				content.style.top = Math.max(5,(screenHeight - $(content).height())/2) + scrollOffsetY + "px";

				ajaxart.setVariable(context,"ControlElement",[ content ]);
				content.focus();
			  	ajaxart.run(data,profile,'RunAfterPopup',context);
			}
//	  		content.position = "absolute";
			aa_enable_move_by_dragging(content,$(content).find(".dialog_title")[0],function() { ajaxart_dialog_close_all_popups(); });
//			$(content).draggable(
//					{ 
//					  cancel: '.dialog_body',
//					  start: function(event, ui) { ajaxart_dialog_close_all_popups(); } // close open popups
//				});

			var doc = document;
			window.aa_noOfOpenDialogs = window.aa_noOfOpenDialogs || 0;
			if (!previewMode) aa_noOfOpenDialogs++;
			
			var docHeight = Math.max(doc.body.scrollHeight, doc.body.clientHeight);
			var docWidth = Math.max(doc.body.clientWidth, doc.body.scrollWidth);
						
			wrappingDiv = doc.createElement("DIV");
			aa_defineElemProperties(wrappingDiv,'OldDialog,aa_noOfOpenDialogs,dialogContent');

			wrappingDiv.noOfOpenDialogs = aa_noOfOpenDialogs;
			wrappingDiv.OldDialog = true;
			wrappingDiv.className = "dialog_cover";
			//wrappingDiv.style.position="absolute";
			wrappingDiv.style.position="fixed";
			if (!previewMode) 
			  doc.body.appendChild(wrappingDiv);
			
			wrappingDiv.style.backgroundColor = screenColor;
			wrappingDiv.onmousedown = function(e) {
				e = e || event;
				if (e == null) return;
//				ajaxart_stop_event_propogation(e);

			   if (typeof(Event) != 'undefined' && Event.resolve)
					Event.cancelBubble(Event.resolve(e)); 
			}
			wrappingDiv.dialogContent = content;
			var scree_size = aa_screen_size();
			//wrappingDiv.style.width = Math.max(document.documentElement.scrollWidth,scree_size.width) + "px";
			//wrappingDiv.style.height = Math.max(document.documentElement.scrollHeight,scree_size.height) + "px";
			wrappingDiv.style.width = "100%";
			wrappingDiv.style.height = "100%";
			++aa_dialogCounter;
			wrappingDiv.style.zIndex = aad_dialog_zindex(2000 + aa_dialogCounter,wrappingDiv,true);
			wrappingDiv.style.top="0px";
			wrappingDiv.style.left="0px";
			wrappingDiv.style.opacity = screenOpacity;
			if (typeof(wrappingDiv.style.filter) != "undefined") { wrappingDiv.style.filter = "alpha(opacity=" + screenOpacity*100 + ")"; }	


			content.style.zIndex = aad_dialog_zindex(2001 + aa_dialogCounter,wrappingDiv,true)+1;
			content.tabIndex = 0;
			
			if (!previewMode) openDialogs.push(wrappingDiv);
			
			if (!previewMode) {
				content.style.visibility = 'hidden';
 			    setTimeout( function() { fix_height_width(); } ,1);
			}
			aa_element_attached(content);

			return [content];
	  }
});


function aad_close_dialog_old(closeType,ignoreAAEditor)
{
  if (openDialogs.length == 0) return ;
  $('body').removeClass('body_with_open_dialog');
  var dlg = openDialogs[openDialogs.length-1];
  if (closeType == 'OK' && $(dlg.dialogContent).find('.aa_noclose_message').length > 0 ) return;
  
  if (ignoreAAEditor && $(dlg.dialogContent).hasClass('aaeditor')) return ["true"];
  ajaxart_dialog_close_all_popups();                         
  var div = ajaxart.dialog.closeDialog(dlg);
  if (closeType == 'OK') 
	  ajaxart_runevent(dlg.dialogContent,'DialogContext','OnOK');
  else if (closeType == 'Cancel')
	  ajaxart_runevent(dlg.dialogContent,'DialogContext','OnCancel');
  else if (closeType == 'Delete')
	  ajaxart_runevent(dlg.dialogContent,'DialogContext','OnDelete');
  
  aa_remove(div,true); // clean memory leaks
}


// picklist.js

var aa_navigation_codes = [38,40, 33,34,63277,63276]; // up,down,pageup,pagedown,

aa_gcs("field_aspect", {	
	ReadOnlyControl: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		aa_addMethod(field,'ReadOnlyControl',profile,'Control',context);
		
		return [];
	},
	Mandatory: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.Mandatory = true;
		if (! field.Validations ) field.Validations = [];
		var obj = { isObject: true, CheckValidation: 'on save' , Mandatory: true };

	  obj.Validation = function(data1,ctx) {
		  if (field.CheckMandatoryValidation) 
		  	return aa_frombool(field.CheckMandatoryValidation(data1,ctx));
		  return aa_frombool(aa_totext(data1) === "");
	  }
	  obj.ErrorMessage = function(data1,ctx) {
		  if (field.MandatoryMessage)
			  return field.MandatoryMessage(data1,ctx);
		  return ajaxart.runComponent('ui.MandatoryMessage',[],aa_ctx(ctx,{ FieldTitle: [field.Title] }));
	  }
	  if (ajaxart.fieldscript(profile,'ErrorMessage',true)) {
		  field.MandatoryMessage = function(data1,ctx) {
		    ctx = aa_merge_ctx(context,ctx);
		  	return ajaxart.run(data1,profile,'ErrorMessage',ctx);
	  	};
	  }
		
		field.Validations.push(obj);

		aa_bind(field,'ModifyControl',function(args){
			var contentElement = $(args.Wrapper).find('input')[0] || args.Wrapper.firstChild;
			if (!contentElement) return;
			$(contentElement).addClass('aa_has_validations');
			aa_bind(contentElement,'validation',function(validationObject) {
				if (aa_totext(args.FieldData) === "") {
					validationObject.passed = false;
					validationObject.errorMessage = aa_text(args.FieldData,profile,'ErrorMessage',context);
					validationObject.mandatoryFailure = true;
				}
			},'Mandatory');
		},'Mandatory');
		return [];
	},
	Calculated: function (profile,data,context)
	{
		var toggleButtonCss = aa_attach_global_css(aa_text(data,profile,'ToggleButtonCss',context),null,'toggle_button');
		
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		field.CalcFormula = function(item_data,ctx)
		{
			var result = aa_text(item_data,profile,'Formula',aa_merge_ctx(context,ctx));
			if (aa_bool(data,profile,'MathFormula',context))
				return [eval_math_formula(result) || ''];
			else
				return [result];
		}
		field.WrapperToValue = function(wrapper)
		{
			if (!wrapper.__item || (context.vars.DataHolderCntr && context.vars.DataHolderCntr[0].WrappersAsItems))
				var item = wrapper;
			else
				var item = wrapper.__item;
			return this.CalcFormula([item],context)[0];
		}
		if (! aa_bool(data,profile,'PrimitiveField',context)) {
			field.IsCalculated = true;
			return [];
		}
		field.IsManual = function(field_data,ctx)
		{
			if (ajaxart.isxml(field_data) && field_data[0].nodeType == 2) 
			{
				var att_name = field_data[0].nodeName + "__Manual";
				return aa_xpath(field_data[0],"../@" + att_name,true,'');
			}
 			return [];
		}
//		aa_addMethod_js(field,'IsManual',isManual,context);
		
		field.DependsOnFields = ajaxart_run_commas(data,profile,'DependsOnFields',context);
		field.ManualOverride = aa_bool(data,profile,'ManualOverride',context);

		var CalculatedWithOverride = function(td,field,field_data,ctx)
		{
		var toggleControl = {
				States : {
					"manual" : {
						Control : function() 
						{ 
							var ctrl = ajaxart_field_createSimpleInput(field_data,ctx);
							$(ctrl).addClass("field_control fld_" + field.Id);
							ctrl.Field = field;
							return ctrl;
						},
						ChangeStateLabel : "recalc",
						ChangeToState : "calculated"
					},
					"calculated" : {
						Control : function() 
						{ 
							var txt = aa_text(ctx.vars._Item,profile,'Formula',context);
							if (aa_bool(data,profile,'MathFormula',context))
								txt = eval_math_formula(txt, 2);
							ajaxart.writevalue(field_data,[txt]);
							var ctrl = $('<span>' + txt + '</span>');
							$(ctrl).addClass("field_control fld_" + field.Id);
							return ctrl[0];
						},
						ChangeStateLabel : "override",
						ChangeToState : "manual"
					}
				},
				Detect : function() 
				{ 
					var result = aa_runMethod(field_data,field,'IsManual',context);
					if (ajaxart.tobool_array(result))
						return "manual";
					return "calculated";
				},
				Build : function(state)
				{
					aa_empty(td,true);
					td.appendChild(state.Control());

					var button = $('<span class="aa_toggle_button">' + ajaxart_multilang_text(state.ChangeStateLabel,context) + ' </span>')
					button.addClass(toggleButtonCss);
					td.appendChild(button[0]);
					button[0].onmousedown = function() 
					{
						var new_state = td.toggleControl.States[state.ChangeToState];
						if (state.ChangeToState == "manual")
							ajaxart.writevalue(aa_runMethod(field_data,field,'IsManual',ctx),'true');
						else
						{
							var att_to_delete = aa_runMethod(field_data,field,'IsManual',ctx)[0];
							var parent = ajaxart.xml.parentNode(att_to_delete);
							if (parent != null)
								parent.removeAttribute(att_to_delete.nodeName);
						}
						td.toggleControl.Build(new_state);
					}
//					if (field.ModifyControl)
//						for(var i=0;i<field.ModifyControl.length;i++)
//							field.ModifyControl[i](td,field_data,"control",ctx,[]);
				}
		}
		td.toggleControl = toggleControl;
		toggleControl.Build(toggleControl.States[toggleControl.Detect()]);
		}
		if (field.ManualOverride)
			field.CalculatedControl = CalculatedWithOverride;
		else
		{
			field.IsCalculated = true;
			field.CellPresentation = 'text';
		}
		
		return [];
	},
	Multiple: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		if (field == null) return [];
		
		field.Multiple = true;
		field.MultipleTitle = ajaxart_multilang_run(data,profile,'MultipleTitle',context);
		if (field.MultipleTitle != "")
			field.Title = field.MultipleTitle;
		if (ajaxart.fieldscript(profile,'Items') != null)
			aa_addMethod(field,'MultipleItems',profile,'Items',context);
		
		var getControl = function(field) { return function(data1,ctx) {
			var newContext = aa_ctx(aa_merge_ctx(context,ctx), { _Field: [field]});
			return ajaxart.runNativeHelper(data1,profile,'Control',newContext); 
		}};
	    aa_addControlMethod_js(field,'MultipleControl',getControl(field),context);
		
		return [];
	},
	CheckBox: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.HideTitle = true;
		aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
			  if (ajaxart_field_is_readOnly(ctx.vars._Cntr && ctx.vars._Cntr[0],cell.Field,ctx)) return;
			  var title = document.createElement("span");
			  title.className = "checkbox_title";
			  title.innerHTML = field.Title;
			  cell.appendChild(title);
		},'boolean_checkbox');
		return [];
	},	
	Boolean: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		field.WritableControl = function(field_data,ctx)
		{
			var field = context.vars._Field[0];
			var input = ajaxart_field_createSimpleInput(field_data,context,false,'checkbox');
			$(input).addClass('aa_checkbox');
			if (input.jbRemoveTextboxClass) input.jbRemoveTextboxClass();
			input.getValue = function() {
				return (this.checked) ? "true" : "false";
			}
			input.onclick = function(e) {
				this.updateValue();
			}
			input.onblur = function(e) {} // disable onblur
			aa_checked(input,aa_tobool(field_data));

			return [input];
		}
		ajaxart.runNativeHelper(data,profile,'FieldAspect',context);
		return [];
	},
	BooleanTextSummary: function (profile,data,context)
	{
		var trueText = ajaxart_multilang_run(data,profile,'TextForTrue',context);
		var falseText = ajaxart_multilang_run(data,profile,'TextForTrue',context);
		
		function init(trueResult,falseResult) {
			context.vars._Field[0].Text = function(data1,ctx) {
				return aa_tobool(data1) ? trueResult : falseResult;
			}
		}
		init(trueText,falseText);
	},
	Picklist: function (profile,data,context)
	{
		var field = ajaxart_fieldaspect_getField(context);
		field.Multiple = aa_bool(data,profile,'Multiple',context);
		field.RecalculateForEachCell = aa_bool(data,profile,'RecalculateForEachCell',context);
		if (aa_paramExists(profile,'AllowValueNotInOptions'))
			field.AllowValueNotInOptions = aa_bool(data,profile,'AllowValueNotInOptions',context);
		field.AllowEmptyValue = aa_bool(data,profile,'AllowEmptyValue',context)
		if (!field.RecalcOptions)
			field.RecalcOptions = function(data1,ctx)
			{
				var optionsObj = aa_first(data1,profile,'Options',aa_merge_ctx(context,ctx)) || { Options: []} ;
				optionsObj.TreeSeparator = aa_text(data,profile,'PickTreePathSeparator',context);
				if (optionsObj.TreeSeparator == '') optionsObj.TreeSeparator = null;
					
				aa_initOptionsObject(optionsObj,ctx);
				return optionsObj;
			}
		field.ManualWriteValue = true;
	
		field.OptionsObject = field.Options;
		field.Options = field.RecalcOptions(data,context);
		aa_initPicklistField(field,data,profile,context)
		var controlStyle = aa_first(data,profile,'ControlStyle',context);
		if (controlStyle && controlStyle.Triplet) {
			field.Control = function(field_data,ctx) {
				var inputObj = {};
				field.initInput(inputObj,field_data,ctx);
				return [aa_renderStyleObject(controlStyle,inputObj,context)];
			}
		}
			
		//ajaxart.run(data,profile,'Presentation',context); // popup - todo rename
	
		return [];
	}
});

function aa_initOptionsObject(optionsObj,context)
{
	if (optionsObj == null || optionsObj.Initialized) return;

	optionsObj.codeToOption = function(code) { return this.CodeToOptionHash[code]; } // js
	optionsObj.codeToText = function(code) { return this.CodeToTextHash[code] || code; } // js
	optionsObj.textToCode = function(text) { return this.TextToCodeHash[text] || text; } // js
	optionsObj.codeToImage = function(code) 
	{
		if (! this.CodeToOptionHash[code]) return '';
		return this.CodeToOptionHash[code].image || ''; 
	}
	optionsObj.SourceToOption = function(src)
	{
		for(var i in this.Options)
			if (this.Options[i].source == src[0])
				return [this.Options[i]];
		return [];
	}
	optionsObj.CodeToText = function(code,ctx) { return [this.codeToText(code[0])]; } // xtml
	optionsObj.TextToCode = function(text,ctx) { return [this.textToCode(text[0])]; } // xtml
	optionsObj.OptionText = function(option,ctx) { return [option[0].text]; } // xtml
	optionsObj.OptionImage = function(option,ctx) { return [option[0].image || '']; } // xtml

	optionsObj.TextToCodeHash = {};
	optionsObj.CodeToTextHash = {};
	optionsObj.CodeToOptionHash = {};
	optionsObj.HasImages = false;
	function buildOptionsHash(options,prefix)
	{
		if (prefix == null) prefix = '';
		if (options == null) return;
		for(var i=0;i<options.length;i++)
		{
			var option = options[i];
			if (option == null) continue;
			if (option.Categories)
				buildOptionsHash(option.Categories,option.IsCategory && optionsObj.TreeSeparator ? option.text + optionsObj.TreeSeparator  : prefix);
			if (option.Options)
				buildOptionsHash(option.Options,option.IsCategory && optionsObj.TreeSeparator ? option.text + optionsObj.TreeSeparator : prefix);

			option.text = prefix + (option.text || option.code);
			option.code = option.code || option.text;
			if (option.text.constructor.toString().indexOf("Array") != -1)
				option.text = option.text[0];
			option.text = ajaxart_multilang_text(option.text,context);
			if (option.image && option.image != '') 
				optionsObj.HasImages = true;
			optionsObj.TextToCodeHash[option.text] = option.code;
			optionsObj.CodeToTextHash[option.code] = option.text;
			optionsObj.CodeToOptionHash[option.code] = option;
		}
	}
	buildOptionsHash(optionsObj.Options);
	if (optionsObj.IsTree)
		buildOptionsHash(optionsObj.Categories);
	
	optionsObj.IsValidOptionText = function(field,txt)
	{
		return this.TextToCodeHash[txt] != null;
	}
	optionsObj.IsValidOptionCode = function(field,code)
	{
		return this.CodeToTextHash[code] != null || (field.AllowEmptyValue && code == '');
	}
	optionsObj.FixedCodes = function(field,value,old_value)
	{
		var optionsObj = this;
		var result = value;
		if (field.Multiple) // trim ','
			result = result.replace(/[,]+$/, '').replace(/^[,]+/, ''); 
		if (field.AllowValueNotInOptions) return result;
		if (field.Multiple) // remove non-options
		{
			var new_val = '';
			var values = result.split(',');
			
			for(var i=0;i<values.length;i++)
			{
				if (optionsObj.IsValidOptionCode(field,values[i]))
					new_val += values[i];
				if (i != values.length-1) 
					new_val += ',';
			}
			result = new_val;
		}
		else // if not an option, back to old value
			if ( ! optionsObj.IsValidOptionCode(field,result))
				result = old_value;
		return result;
	}
	optionsObj.CodesToText = function(field,options)
	{
		var optionsObj = this;
		if (options == '') return '';
		if (field.Multiple)
		{
			var result = '';
			var values = options.split(',');
			for(var i=0;i<values.length;i++) {
				result += optionsObj.codeToText(values[i]);
				if (i != values.length-1) 
					result += ',';
			}
			return result;
		}
		// single
		return optionsObj.codeToText(options);
	}
	optionsObj.TextToCodes = function(field,options)
	{
		var optionsObj = this;
		if (options == '') return '';
		if (field.Multiple)
		{
			var result = '';
			var values = options.split(',');
			for(var i=0;i<values.length;i++) {
				result += optionsObj.textToCode(values[i]);
				if (i != values.length-1) 
					result += ',';
			}
			return result;
		}
		// single
		return optionsObj.textToCode(options);
	}
	optionsObj.Text = function(field,data1)
	{
		var optionsObj = this;
		var value = ajaxart.totext_array(data1);
		var fixed_value = optionsObj.FixedCodes(field,value,'');
		return optionsObj.CodesToText(field,fixed_value);
	}
	optionsObj.Initialized = true;
}

function aa_initPicklistField(field,data,profile,context)
{
	if (! field.AllowEmptyValue)
		field.DefaultValue= function(data1,ctx) 
		{  
			// first option as default value
			var optionsObj = field.Options;
			if (optionsObj.IsTree && optionsObj.Categories[0] && optionsObj.Categories[0].Options[0]) 
				return [optionsObj.Categories[0].Options[0].code]; // option from first category - can be a bug
			if (optionsObj.Options[0])
				return [optionsObj.Options[0].code];
			return [];
		}

	field.Text = function(data1,ctx) {
		var result = ajaxart.totext_array(data1);
		if (field.Multiple)
		{
			var options = result.split(',');
			result = '';
			for(var i=0;i<options.length;i++)
			{
				result += field.Options.codeToText(options[i]);
				if (i!=options.length-1)
					result += ", ";
			}
		}
		else
		{
			var code = result;
			var result = field.Options.codeToText(code);
			if (field.Options.HasImages) {
				var img = field.Options.codeToImage(code);
				if (img != null && img != "") result = "<img class='aa_imagebeforetext' src='"+img+"'/>"+result; // should be fixed
			}
		}
		return [result];
	}

	field.OptionPage = function(option,field,field_data,item,readonly,picklist_input) 
	{
		var out = document.createElement('span');
		if (option != null && option.OptionPage != null)
		{
			item = option.ItemForOptionPage || item; 
			var pageId = aa_totext(field_data).replace(new RegExp(' ', "g"),'_').replace(new RegExp('/', "g"),'_');
			var page_params = {isObject:true, PageID: pageId , DataItems: {isObject: true, Items: item }}
			if (readonly) page_params.ReadOnly = true; 
			var newContext = aa_ctx(context, { _PageParams: [page_params] , _PicklistOfOptionPage: [ picklist_input ] } ); 
			out = aa_runMethod(item,option.OptionPage,'Control',newContext)[0];
		}
		$(out).addClass('aa_option_page');
		
		return out;
	}
	field.RefreshOptionPage = function(cell,item,isUpdated,prevValue)
	{
		var field_data = cell.FieldData;
		var input = aa_find_field_input(cell);
		if (!input || !input.relevantOptionsObject) return;
		var optionsObj = input.relevantOptionsObject() || input.Options;
		if (optionsObj == null) return;
		
		var option = optionsObj.codeToOption(ajaxart.totext_array(field_data));
		var new_ctrl = this.OptionPage(option,field,field_data,item,false,input);

		if (! cell.jbOptionsPageElement) {
			if (cell.jbFieldElement && cell.jbFieldElement.jbOptionsPage) 
				cell.jbOptionsPageElement = cell.jbFieldElement.jbOptionsPage();
			
			if (!cell.jbOptionsPageElement) {
				cell.jbOptionsPageElement = $('<div/>')[0];
				cell.appendChild(cell.jbOptionsPageElement);
			}
		}
		cell.jbOptionsPageElement = aa_replaceElement(cell.jbOptionsPageElement,new_ctrl,true);
	}

	field.initInput = function(input,field_data,ctx)
	{
		aa_defineElemProperties(input,'FixValue,Refresh,Clear,Save,ContainsValue,UpdateFromPopupAndClose,PopupCntr,relevantField,relevantOptionsObject,setValue,ClosePopup,OpenPopup,TogglePopup');
		
		input.FixValue = function(save)
		{
			var input = this;
			if (!input.getValue) return;
			var optionsObj = input.relevantOptionsObject();
			var field = input.relevantField();
			var oldValue = ajaxart.totext_array(field_data);
			var fixedOldValue = optionsObj.FixedCodes(field,oldValue,''); // if old value is not valid, use '' instead. useful for country/city
			var new_val = optionsObj.TextToCodes(field,input.getValue());
			var fixed_value = optionsObj.FixedCodes(field,new_val,fixedOldValue);
			var option = optionsObj.CodeToOptionHash[new_val];
			if (option) option = [option.source]; else option = [];
			if (oldValue != fixed_value && save)
			{
				ajaxart.writevalue(field_data, fixed_value);
				if (field.EnrichData) field.EnrichData(field,field_data);
				aa_invoke_field_handlers(field.OnUpdate,input,null,field,field_data,{ isObject:true, OldValue: [oldValue] , Option: option});
			}
			input.setValue(optionsObj.CodesToText(field,fixed_value));
		}
		input.SetPicklistValue = function(new_value,ctx1)
		{
			var field = input.relevantField();
			var oldValue = ajaxart.totext_array(field_data);
			var forPreviewOnly = aa_tobool(ctx1.vars.ForPreviewOnly);
			if (!forPreviewOnly) 
				input.LastValue = ajaxart.totext_array(new_value);
			ajaxart.writevalue(field_data, new_value,forPreviewOnly);
			if (field.EnrichData) field.EnrichData(field,field_data);
			aa_invoke_field_handlers(field.OnUpdate,input,null,field,field_data,{ isObject:true, OldValue: [oldValue]});
			input.Refresh();
		}
		input.RecalcOptions = function(new_value,ctx1)
		{
			var field = input.relevantField();
			input.OptionObjects[field.Id || ''] = field.RecalcOptions([],ctx1);
		}
		input.Refresh = function()
		 { 
			var input = this;
			var optionsObj = input.relevantOptionsObject();
			var field = input.relevantField();
			input.setValue(optionsObj.Text(field,field_data));
			if (input.RefreshDescriptionForEmptyText)
				input.RefreshDescriptionForEmptyText();
		 }
		input.Clear = function()
		{
			this.value = "";
			this.FixValue(true);
		}
		input.Save = function()
		{
			this.FixValue(true);
		}
		input.ContainsValue = function(option)
		{
			var current_codes = ajaxart.totext_array(field_data);
			var option_code = option[0].code;
			return ((',' + current_codes + ',').indexOf(',' + option_code + ',') != -1);
		}
		// handle select and keyboard from popup
		input.UpdateFromPopupAndClose = function(selected,ctx1,keyboard) { return input.UpdateFromPopup(selected,ctx1,keyboard,true);} 
		input.UpdateFromPopup = function(selected,ctx1,keyboard,autoClose) 
		{
			var input = this;
			var popup = input.PopupCntr();
			if (popup && popup.PicklistField)
			{
				var optionsObj = input.OptionObjects[popup.PicklistField.Id || ''];
	
				if (!selected || selected.length == 0) selected = ajaxart_itemlist_getSelectedItems(popup);
				
				if (field.SearchBox) {
				  input.ClosePopup();
				  input.value="";
				  if (input.RefreshDescriptionForEmptyText)
			        input.RefreshDescriptionForEmptyText();
				  aa_invoke_field_handlers(field.OnUpdate,input,null,field,selected,{ Option: selected});
				  return;
				}
				
				if (selected.length > 0 && !selected[0].code) { // for pick page and customize operation
					var selected1 = optionsObj.SourceToOption(selected)[0];
					if (!selected1) selected1 = optionsObj.codeToOption(selected);
					if (selected1) selected = [selected1];
				}
				 
				if (autoClose) // unselect
					$(popup.Ctrl).find('.aa_selected_item').removeClass('aa_selected_item');
				
				if (selected.length > 0 && !selected[0].UnSelectable)
				{
					var selected_text = optionsObj.OptionText(selected)[0];
					if (field.Multiple)
					{
						var lastValue = input.getValue().split(',').pop();
						var inList = optionsObj.IsValidOptionText(popup.PicklistField,lastValue);
						if (!inList)
						{
							if (input.getValue().indexOf(',') == -1) // remove last value typed by the user
								input.setValue('');
							else
								input.setValue(input.getValue().replace(/[,][^,]*$/, '')); // remove last value
						}
						
						// if value exists remove it
						if ((',' + input.getValue() + ',').indexOf(',' + selected_text + ',') != -1)
						{
							var value = ',' + input.getValue() + ',';
							value = value.replace(',' + selected_text + ',',','); // remove
							value = value.replace(/[,]+$/, '').replace(/^[,]+/, '');// trim ',' 
							input.setValue(value); 
						}
						else // otherwise add it at the end
						{
							if (input.getValue() == '')
								input.setValue(selected_text);
							else
								input.setValue(input.getValue() + ',' + selected_text);
						}
					}
					else 
						input.setValue(selected_text);
					
					input.Save();
				}
				if (field.Multiple) // do with and without selection
				{
					var elems = $(popup.Ctrl).find('.aa_item').get();
					ajaxart_uiaspects_refreshElements(elems);
					if (keyboard && !field.AllowValueNotInOptions)
						input.setValue(input.getValue() + ',');
				} else if (autoClose) {
					input.ClosePopup();
					jBart.trigger(jBart,'userChoice',{ selection: field_data[0], fieldId: field.Id, fieldXtml: field.XtmlSource && field.XtmlSource[0] && field.XtmlSource[0].script, context: ctx });
				}
				if (selected.length == 0)
				{
					if (autoClose) input.ClosePopup();
					input.Save();
					//$(input).focus().trigger({ type : 'keypress', which : 9 });
				}
			}
			if (field.AllowValueNotInOptions && keyboard) // do with and without popup
				input.Save();
			
			return [];
		}
	    input.PopupCntr = function()
	    {
	    	var popups = ajaxart.dialog.openPopups;
	    	for(var i in popups)
	    		if (popups[i].onElem == input)
	    		{
	    			var popup = popups[i].contents;
					var cntr_ctrl = $(popup).hasClass('aa_container') ? popup : $(popup).find('.aa_container')[0];
					if (!cntr_ctrl) return;
					cntr_ctrl.Cntr.Dlg = popups[i].Dlg; 
					return cntr_ctrl.Cntr;
	    		}
	    }
	    input.relevantField = function()
	    {
	    	return field;
	    }
	    input.relevantOptionsObject = function()
	    {
	    	return this.OptionObjects[this.relevantField().Id || ''];
	    }
	    input.setValue = function(newVal)
	    {
	    	if (input.value != newVal) 
		    	input.value = newVal;
		    input.setAttribute('value',newVal);
	    }
		input.ClosePopup = function() 
		{
			var field = this.relevantField();
			if (input.PopupCntr())
				aa_closePopup();
		}
		input.RevertToLastValue = function() {
			if (input.LastValue != null && input.value != input.LastValue) {
				input.setValue(input.LastValue);
				input.Save();
			}
			if (field.RevertToOriginalValue) field.RevertToOriginalValue(input,field_data,ctx);
		},
		input.OpenPopup = function(keyboard) 
		{
			var input = this;
			if (input.calcOpenPopupField) input.calcOpenPopupField();
			var field = this.relevantField();
			if (field.DynamicSuggestions || field.RecalculateForEachCell)
				input.OptionObjects[field.Id || ''] = field.RecalcOptions([],ctx);
			if (field.RecalcOccurrences)
				field.RecalcOccurrences(input.OptionObjects[field.Id || ''],ctx);
			var popup = input.PopupCntr();
			if (popup && (popup.PicklistField != field || input.relevantOptionsObject().Options.length == 0 ))
			{
				input.ClosePopup();
				popup = input.PopupCntr();
			}
			if (! popup && field.OpenPopup) { 
				input.LastValue = input.value;
				if (field.StoreOriginalValue) field.StoreOriginalValue(input,ctx);
				field.OpenPopup(data,aa_ctx(ctx,{_PicklistInput: [input], _Field:[field], OptionsObj: [input.OptionObjects[field.Id || '']] }));
			}
			// wait for the popup
			var tries = 0;
			function checkPopup() {
				if (tries++ < 10) {
					popup = input.PopupCntr();
					if (popup) { 
						initPopup(); 
						return; 
					} else {
						setTimeout(checkPopup,100);
					} 
				}
			}
			checkPopup();
			function initPopup() {
				if (popup.Dlg && !field.Multiple)
					jBart.bind(popup.Dlg,'cancel',function() {
						input.RevertToLastValue();
					});
				if (popup)
				{
					popup.PicklistPopup = true;
					popup.InputCtrl = input;
					popup.PicklistField = field;
					var searchText = input.getValue();
					if (field.Multiple)
						searchText = input.getValue().split(',').pop();
					if (keyboard && popup.DoFind && !$(input).attr('readonly'))
					{
						popup.DoFind(searchText.toLowerCase());
						if (popup.Ctrl.parentNode && popup.Ctrl.parentNode.RePosition)
							popup.Ctrl.parentNode.RePosition();
					}
					if (!keyboard && popup.SelectByPattern)
						popup.SelectByPattern(searchText.toLowerCase())
				}
			}
		}
		input.TogglePopup = function() 
		{
			if (! input.PopupCntr()) 
				input.OpenPopup();
			else
				input.ClosePopup();
		}
		// API
		input.addOptions = function(classOrElem,initOptionFunc) 
		{
			var picklist = this;
			picklist.optionElems = [];
		    var inner = this.getInnerElement(classOrElem);
			if (!inner || !initOptionFunc ) return;
			var innerParent = inner.parentNode;
			
			for(var i=0;i<field.Options.Options.length;i++) {
				var option = field.Options.Options[i];
				var elem = inner.cloneNode(true);
				innerParent.insertBefore(elem,inner);
				var option_obj = aa_api_object(elem,{ Option: option, Field: field,
					Text: option.text,
					isSelected: function() {
						var val = aa_totext(field_data);
						var optionCode = this.Option.code;
						if (val.indexOf(optionCode) == -1) return false;
						if (field.Multiple) {
							return (','+val+',').indexOf(','+optionCode+',') > -1;
						} else {
							return val == optionCode;
						}
					},
					select: function() {
						if (field.Multiple && aa_totext(field_data)) {
							var val = this.Option.code;
							var vals = aa_totext(field_data).split(',');
							for(var i=0;i<vals.length;i++)
								if (vals[i] == val) return;
							vals.push(val);
							picklist.set(vals.join(','));
						} else {
							picklist.set(this.Option.code);
						}
					},
					toggleSelection: function() {
						if (this.isSelected()) 
						  this.unSelect();
						else 
						  this.select();
					},
					unSelect: function() {
						if (! this.isSelected()) return;
						if (field.Multiple) {
							var val = this.Option.code;
							var vals = aa_totext(field_data).split(',');
							for(var i=0;i<vals.length;i++) {
								if (vals[i] == val) {
									vals.splice(i,1);
									break;
								}
							}
							picklist.set(vals.length > 0 ? vals.join(',') : '');
						} else {
							picklist.set('');
						}
					},
					setSelectedOnClick: function(selectedClass) {
						var option = this;
					    if ( option.isSelected() ) $(option).addClass(selectedClass);
					    $(option).click(function() {
					      var wasSelected = option.isSelected();
					      option.toggleSelection();
					      
					      if (picklist.Multiple) {
					        $(option).toggleClass(selectedClass);
					      } else {
					        $(picklist.optionElems).removeClass(selectedClass);
					        if (!wasSelected)
					          $(option).addClass(selectedClass);
					      }
					    });
					}
				});
			    this.optionElems.push(option_obj);
				initOptionFunc(option_obj,picklist);
			}
			inner.parentNode.removeChild(inner);
		  };
		  input.set = function(value) {
			ajaxart.writevalue(field_data,value);
			field.RefreshOptionPage(this.parentNode,ctx.vars._Item,false);
			jBart.trigger(jBart,'userChoice',{ selection: field_data[0], fieldId: field.Id, fieldXtml: field.XtmlSource && field.XtmlSource[0] && field.XtmlSource[0].script, context: ctx });
			aa_invoke_field_handlers(field.OnUpdate,this,null,field,field_data);	
			jBart.trigger(this,'update');
		  }
		  input.get =  function() {
			  return aa_totext(field_data);
		  }
		  input.clear = function() {
			  this.set('');
		  }
		  input.createClearButton = function(selectedClass,text) {
			var picklist = this; 
		    var jClearBtn = $('<div />').text(text);
		    if (picklist.get() == '') jClearBtn.addClass(selectedClass);
		    jClearBtn.click(function() { 
		      picklist.clear();
		      $(picklist.optionElems).removeClass(selectedClass);
		      jClearBtn.addClass(selectedClass);
		    });
		    picklist.bind('update',function() { 
		      if (picklist.get()) 
		    	  jClearBtn.removeClass(selectedClass);
		      else 
		    	  jClearBtn.addClass('selected');
		    });
		    return jClearBtn[0];
		  }
	};

	aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
		var cntr = ctx.vars._Cntr && ctx.vars._Cntr[0];
		if (ajaxart_field_is_readOnly(cntr,cell.Field,ctx)) {
			if (cell_presentation == "control") {
			  var option = field.Options.CodeToOptionHash[aa_totext(field_data)];
			  if (option && option.OptionPage) 
			    cell.appendChild(field.OptionPage(option,cell.Field,field_data,item,true));
			}
			return;
		}
		var input = aa_find_field_input(cell);
		if (field.DelayedOptionCalculation)
			field.DynamicSuggestions = true;

		if (input != null)
		{
			aa_defineElemProperties(input,'OptionObjects');
			
			input.OptionObjects = {};
			if (field.RecalculateForEachCell)
				input.OptionObjects[field.Id || ''] = field.RecalcOptions(item,ctx);
			else
				input.OptionObjects[field.Id || ''] = field.Options;
			var newContext = aa_ctx(ctx,{_Field: [field], _FieldData: field_data, _Input: [input], _Item: item} );
			field.initInput(input, field_data, aa_merge_ctx(context,newContext));
			input.FixValue();
			if (!field.AllowValueNotInOptions && field.Options && field.Options.Options.length < 3 && ! field.Options.Categories)
				$(input).attr('readonly', 'readonly');
		}

		if (cell_presentation == "control" && field.RefreshOptionPage)
			field.RefreshOptionPage(cell,item,false);
	});

	aa_field_handler(field,'OnUpdate', function(field,field_data,input,e,extra) {
		var cell = $(input).parents('.aa_cell_element')[0];
		if ($(cell).parents('.aa_item')[0])
		{
			var item = $(cell).parents('.aa_item')[0].ItemData;
			field.RefreshOptionPage(cell,item,true, (extra && extra.OldValue) ? extra.OldValue[0] : null);
		}
	});

	aa_field_handler(field,'OnKeydown', function(field,field_data,input,e)
	{
		var navigation = false;
		var keyCode = e.keyCode;
		for(var i=0;i<aa_navigation_codes.length;i++)
			if (keyCode == aa_navigation_codes[i]) navigation = true;
		if (field.Options.IsTree) // left-right for tree navigation
			navigation = navigation || keyCode == 37 || keyCode == 39;

		if (navigation) // up/down
		{
			if (ajaxart.dialog.openPopups.length > 0)
				ajaxart_stop_event_propogation(e);

			var popup = input.PopupCntr();
			if (popup)
			{
				popup.SelectionKeydown(e); // delegate to cntr selection
				if (popup.ToggleByKeyboard)
					popup.ToggleByKeyboard(e);
			}
			return false;
		}
		if (keyCode == 13 ) // enter - UpdateValueAndClose
		{
			if (ajaxart.dialog.openPopups.length > 0) // TODO: fix for nested popups
				ajaxart_stop_event_propogation(e);

			input.UpdateFromPopupAndClose(null,null,true);
		}
		if (keyCode == 9) {// tab - clean and next
			input.FixValue();
			return;
		}
		if (keyCode == 27) // escape
		{
			var popup = input.PopupCntr();
			if (popup) {
			  jBart.trigger(popup.Dlg ,'cancel');
			  input.ClosePopup();
			  
			  ajaxart_stop_event_propogation(e);	// if the picklist is inside a dialog, do not close the dialog
			}
			return false;
		}
	});

	aa_field_handler(field,'OnKeyup',function(field,field_data,input,e)
	{
		var navigation = false;
		var keyCode = e.keyCode;
		if (keyCode == 40 && input.PopupCntr() == null) // arrow down should open the popup
		{
			input.OpenPopup();
			return false;
		}
		for(var i=0;i<aa_navigation_codes.length;i++)
			if (keyCode == aa_navigation_codes[i]) navigation = true;
		if (field.Options.IsTree) // left-right for tree navigation
			navigation = navigation || keyCode == 37 || keyCode == 39;
		if (navigation) return true;

		if (keyCode == 9) {// tab - UpdateValueAndClose and next
			input.UpdateFromPopupAndClose(null,null,true);
			return;
		}
		if (keyCode == 13 || keyCode == 27 || keyCode == 9) return true;
		if (keyCode == 8 && !input.value) // last backspace should close popup
		{
			input.ClosePopup();
			return false;
		}
		
		if (field.Multiple && keyCode == 188) // comma - do not save, to avoid 'fixing' the comma
		{
			if (! aa_bool(data,profile,'DoNotOpenFromInputArea',context))
				input.OpenPopup(true);
			return;
		}
		if (field.AllowValueNotInOptions || (field.AllowEmptyValue && input.getValue() == '') )
			input.Save();
		if (! aa_bool(data,profile,'DoNotOpenFromInputArea',context))
			input.OpenPopup(true);
	});
	aa_field_handler(field,'OnBlur',function(field,field_data,input,e)
	{
		input.FixValue();
		input.Save();
//		input.ClosePopup(); 
		if (ajaxart.controlOfFocus == input)
		  ajaxart.controlOfFocus = null;
		if (input.RefreshDescriptionForEmptyText)
			input.RefreshDescriptionForEmptyText();
		return true;
	});
	aa_field_handler(field,'OnMouseDown',function(field,field_data,input,e)
	{
		if (! aa_bool(data,profile,'DoNotOpenFromInputArea',context))
			input.OpenPopup();
	});

}

ajaxart.gcs.picklist =
{
	SoftPickOnHover: function (profile,data,context)
	{
		var aspect = { isObject : true };
		var timeBeteenPicks = aa_int(data,profile,'TimeBeteenPicks',context) || 500;
		aspect.InitializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			var input = ctx.vars._Input && ctx.vars._Input[0];
			if (!input) return;
			input.SoftPickOnHover = true;
			jBart.bind(cntr,'selection', function(evt){
				if (evt.method == 'hover' || evt.method == 'keyboard') {
					input.UpdateFromPopup(evt.selected.ItemData,evt.context,false,false);
				}
			});
		}
		var result = ajaxart.runNativeHelper(data,profile,'RequiresAspects',context);
		result.push(aspect);
		return result;
	},
	CheckBox: function (profile,data,context)
	{
		var aspect = { isObject : true };
	
		aspect.InitializeContainer = function(initData,ctx)
		{
			var cntr = ctx.vars._Cntr[0];
			function refreshValue(ctx2,new_value)
			{
				var input = ctx2.vars._Input[0];
				var field_data = ctx2.vars._FieldData;
				var field = ctx2.vars._Field[0];
				var oldValue = ajaxart.totext_array(field_data);
				ajaxart.writevalue(field_data, new_value);
				if (field.EnrichData) field.EnrichData(field,field_data);
				aa_invoke_field_handlers(field.OnUpdate,input,null,field,field_data,{ OldValue: [oldValue]});

				input.Refresh();
			}
			cntr.SelectAll = function(data1,ctx2)
			{
				var input = ctx2.vars._Input[0];
				var all_values = '';
				$(this.Ctrl).find('.aacheckbox_value').parent().filter('.aa_item').each(function () {
						all_values += this.ItemData[0].code + ','; 
				});
				all_values = all_values.substring(0,all_values.length-1); // trim last comma
				refreshValue(ctx2,all_values);
				input.ClosePopup();
				input.OpenPopup();
			}
			cntr.ClearAll = function(data1,ctx2)
			{
				var input = ctx2.vars._Input[0];
				refreshValue(ctx2,'');
				input.ClosePopup();
			}
		}
		aspect.InitializeElements = function(initData,ctx)
		{
			var elems = ctx.vars._Elems;
			var input = ctx.vars._Input[0];
			
			for(var i=0;i<elems.length;i++)
			{
				var elem = elems[i];
				if (elem.ItemData[0].UnSelectable) continue;
				var checkbox = document.createElement('input');
				checkbox.className = "aacheckbox_value";
				checkbox.setAttribute("type","checkbox");
				checkbox.onclick = function(e)
				{
	  	  	    	input.focus();
				    return false;
				}
				if (input.ContainsValue(elem.ItemData))
					aa_checked(checkbox,true);
				$(elem).find('>.aacheckbox_value').remove();
				ajaxart_uiaspects_append(elem,checkbox);
			}
		}
		return [aspect];
	},
	ItemTextForPicklist: function (profile,data,context)
	{
	    var textClass = aa_attach_global_css( aa_text(data,profile,'ItemCss',context),null,'picklistitem' ); 
	    var occClass = aa_attach_global_css( aa_text(data,profile,'OccurrencesCss',context),null,'occurrences' ); 
	    
		return [{
			InitializeContainer: function(data1,ctx)
			{
				var cntr = ctx.vars._Cntr[0];
				cntr.ItemText = function(data2,ctx2)
				{
					var item = data2[0];
					return [item.IsOperation ? item.Title() : item.text];
				}
			},
			InitializeElements: function(data1,ctx)
			{
				var elems = ctx.vars._Elems;
				var field = ctx.vars._Field[0];
				for(var i in elems)
				{
					var elem = elems[i];
					if ($(elem).find('>.aa_text').length) continue;
					var text_span = document.createElement('span');
					text_span.className = "aa_text " + textClass;
					text_span.setAttribute("tabindex",1);
					var item = elem.ItemData[0];
					if (item.IsOperation)
						var text = item.Title();
					else
						var text = item.text; // option
					if (field.Options.IsTree && field.Options.TreeSeparator)
						text = item.text.split(field.Options.TreeSeparator).pop();
					
					text_span.innerHTML = text;
					
					$(elem).find('>.aa_text_and_occ').remove();
					
					if (field && field.OccurrencesCtrl)
					{
						var text_and_occurrences = document.createElement('span');
						text_and_occurrences.className = 'aa_text_and_occ';
						text_and_occurrences.appendChild(text_span);
						$(text_span).css('padding','0 3px 0 0');
						var occ_elem = field.OccurrencesCtrl(elem.ItemData,ctx);
						$(occ_elem).addClass('aa_not_selectable aa_occurences').addClass(occClass);
						text_and_occurrences.appendChild(occ_elem);
						if (elem.ItemData[0].Occ && elem.ItemData[0].Occ.length == 0)
							$(elem).addClass('aa_zero_occ');
						ajaxart_uiaspects_append(elem,text_and_occurrences);
					}
					else
						ajaxart_uiaspects_append(elem,text_span);
				}
			}
		}];
	},
	PopupItems: function (profile,data,context)
	{
		var out = [];
		var optionsObj = context.vars._Input[0].relevantOptionsObject();
		var options = optionsObj.Options; 
		if (optionsObj.IsTree) ajaxart.concat(out,optionsObj.Categories);
		
		for(var i=0;i<options.length;i++)
			if (! options[i].Hidden) out.push(options[i]);
		return out;
	},
	SimpleOptions: function (profile,data,context)
	{
	  var out = { isObject: true, Options: [] };
	  var options = ajaxart_run_commas(data,profile,'Options',context);
	  for (var i=0;i<options.length;i++)
		  options[i] = options[i].replace(/^\s+|\s+$/g,"");
	  var default_image = aa_text(data,profile,'DefaultImage',context);
	  default_image = default_image != '' ? default_image : null;
	  for (var i=0;i<options.length;i++)
		  out.Options.push( { isObject: true, code: options[i], image: default_image } );
	  return [out];
	},
	RichOptions: function (profile,data,context)
	{
		var out = { isObject: true, Options: [] };
		var options = ajaxart.runsubprofiles(data,profile,'Option',context);
		out.Options = options;
		return [out];
	},
	OptionsWithOperations: function (profile,data,context)
	{
		var out = aa_first(data,profile,'Options',context);
		out.Operations = function(data1,ctx) {
			return ajaxart.runsubprofiles(data1,profile,'Operation',aa_merge_ctx(context,ctx));
		}
		return [out];
	},
	DynamicOptions: function (profile,data,context)
	{
		var out = { isObject: true, Options: [] };
		// data = context.vars._Item || data;
		var options = ajaxart.run(data,profile,'Options',context);
		var codeScript = ajaxart.fieldscript(profile,'OptionCode',true);
		var openPageScript = ajaxart.fieldscript(profile,'OptionPage',true);
		var textScript = ajaxart.fieldscript(profile,'OptionLabel',true);
		var imageScript = ajaxart.fieldscript(profile,'OptionImage',true);
		var code_compiled = aa_optimized_compile_text_single(profile,'OptionCode',context);
		var label_compiled = aa_optimized_compile_text_single(profile,'OptionLabel',context);
		var image_compiled = aa_optimized_compile_text_single(profile,'OptionImage',context);
		var autoCode = aa_bool(data,profile,'OptionCodeByIndex',context);
		
		for(var i=0;i<options.length;i++) {
			var opt = options[i];
			var code = null;
			var text = null;
			var image = null;
			if (codeScript) 
				code = code_compiled(opt ,context);
			else if (autoCode) code = "" + i;
			else code = ajaxart.totext_item(opt);
			if (textScript) text = label_compiled(opt ,context);
			if (imageScript) image = image_compiled(opt ,context);
			
			var optionObject = { code: code, text: text, image: image, source: opt, Node: opt };
			if (openPageScript)
				optionObject.OptionPage = aa_first([opt],profile,'OptionPage',context);
			out.Options.push(optionObject);
		}
		return [out];
	},
	CalcOccurrencesWithFilters: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		if (field == null) return;
		field.CountOccurences = function(wrappers,baseField,options) {
			for(var i in options.Options) {
				var option = options.Options[i];
				option.filter = baseField.newFilter([option.code]);
			}
			for(i in wrappers)
			{
				var wrapper = wrappers[i];
				for (var j in options.Options) {
					var option = options.Options[j];
					if (option.filter.Match(baseField,wrapper)) {
						if (!option.Total) option.Total = [];
						if (!option.Occ) option.Occ = [];
						option.Total.push(wrapper);
						if (!wrapper.hidden) option.Occ.push(wrapper);
					}
				}
			}
		};
	},
	ShowOccurrences: function (profile,data,context)
	{
		var field = context.vars._Field[0];
		if (field == null) return;
		field.DelayedOptionCalculation = true;
		field.DynamicSuggestions = true;
		
		function cleanOptions(options)
		{
			for(var i in options)
			{
				options[i].Total = []; 
				options[i].Occ = [];
			}
		}
		function cleanCategory(category)
		{
			cleanOptions(category.Options);
			for(var i in category.Categories)
				cleanCategory(category.Categories[i]);
		}
		if (!field.CountOccurences) {
			field.CountOccurences = function(wrappers,baseField,options) {	// every option is a simple value
				var field_id = baseField.Id;
				if (baseField.Options && baseField.Options.FilteredField) field_id = baseField.Options.FilteredField.Id;
				for(var i in wrappers)
				{
					var wrapper = wrappers[i];
					var val = wrapper[field_id];
					if (baseField.Multiple)
						var vals = val.split(',');
					else
						var vals = [val];
					for(var j in vals)
					{
						var val = vals[j];
						var option = options.CodeToOptionHash[val];
						if (!option) continue;
						if (!option.Total) option.Total = [];
						if (!option.Occ) option.Occ = [];
						option.Total.push(wrapper);
						if (!wrapper.hidden) option.Occ.push(wrapper);
					}
				}
			};
		}
		field.RecalcOccurrences = function(options)
		{
			var cntr = context.vars.DataHolderCntr[0];
			var baseField = null;
			if (field.FilterBaseFieldID) {
				baseField = aa_fieldById(field.FilterBaseFieldID,cntr.Fields);
			}
			baseField = baseField || (context.vars._OriginalField || context.vars._Field)[0];
			var field_id = baseField.Id;
			if (field.Options && field.Options.FilteredField) field_id = field.Options.FilteredField.Id;
			
			cntr.DataHolder = cntr.DataHolder || aad_createDataHolderFromCntr(cntr,context);
			var wrappers = cntr.DataHolder.Wrappers;
			var filters = cntr.DataHolder.UserDataView.Filters;
			if (!options) return;
			
			cleanOptions(options.Options);
			for(var i in options.Categories)
				cleanCategory(options.Categories[i]);

			for(var i in wrappers)
			{
				var wrapper = wrappers[i];
				var val = wrapper[field_id];
				var hidden = false;
				for(j in filters)
				{
					var filter = filters[j];
					if (filter.field.Id == field_id) continue; // ignore current field
					filter.SetFilterData(filter.rawFilterData);
					if (filter.Match(filter.field,wrapper) == false)
						hidden = true;
				}
				wrapper.hidden = hidden;
			}
			this.CountOccurences(wrappers,baseField,options);
			var sortBy = aa_text(data,profile,'SortBy',context);
			if (sortBy == 'filtered occurrences')
				options.Options.sort(function(a,b) { return b.Occ.length - a.Occ.length; });
			else if (sortBy == 'original occurrences')
				options.Options.sort(function(a,b) { return b.Total.length - a.Total.length; });
			else if (sortBy == 'ascending')
				options.Options.sort(function(a,b) { return ( a.code < b.code ) ? -1 : 1; });
			else if (sortBy == 'descending')
				options.Options.sort(function(a,b) { return ( b.code < a.code ) ? -1 : 1; });
		}
		field.CalcOccOfCategory = function(category)
		{
			var occ = [];
			var total = [];
			for(var i in category.Options)
			{
				occ = occ.concat(this.Options.CodeToOptionHash[category.Options[i].code].Occ || []);
				total = total.concat(this.Options.CodeToOptionHash[category.Options[i].code].Total || []);
			}
			for(var i in category.Categories)
			{
				var res = this.CalcOccOfCategory(category.Categories[i]);
				occ = occ.concat(res.Occ);
				total = total.concat(res.Total);
			}
			category.Occ = occ;
			category.Total = total;
			return { Occ: occ, Total: total} 
		}

		function buildOccurrencesCtrl(occ,noParanthesis)
		{
			var cntr = context.vars.DataHolderCntr[0];
			var rlm = aa_is_rtl(cntr.Ctrl,context) ? '&rlm;' : '';
			if (noParanthesis)
				var span = $('<span>' + occ.length + '</span>')[0];
			else
				var span = $('<span>' + rlm + ' (' + occ.length + ')</span>')[0];
			span.Occ = occ;
			if (cntr.OccurrencesFollowup)
			{
				$(span).addClass('aa_hyperlink');
				span.onclick = function(e) {
					cntr.OccurrencesFollowup(this.Occ,aa_ctx( cntr.Context, {ControlElement:[span], _ItemsOfOperation: this.Occ} ));
					//aa_stop_prop(e);
				}
			}
			return span;
		}
		
		field.OccurrencesCtrl = null;
		var show = aa_text(data,profile,'Show',context);
		if (show == 'filtered occurrences')
			field.OccurrencesCtrl = function(data1,ctx)
			{
				if (!this.Options) return [''];
				if (!data1[0].Occ) this.CalcOccOfCategory(data1[0]);
				var ctrl = buildOccurrencesCtrl(data1[0].Occ);
				$(ctrl).addClass('aa_filter_occurrences');
				return ctrl;
			}
		else if (show == 'original occurrences')
			field.OccurrencesCtrl = function(data1,ctx)
			{
				if (!this.Options) return [''];
				if (!data1[0].Occ) this.CalcOccOfCategory(data1[0]);
				var ctrl = buildOccurrencesCtrl(data1[0].Total);
				$(ctrl).addClass('aa_filter_occurrences');
				return ctrl;
			}
		else if (show == 'filtered and original')
			field.OccurrencesCtrl = function(data1,ctx)
			{
				if (!this.Options) return [''];
				if (!data1[0].Occ) this.CalcOccOfCategory(data1[0]);
				var result = '';
				var of = ajaxart_multilang_text("Of",context);
				var option = data1[0];
				var occ = option.Occ;
				var total = option.Total;
				var ctrl;
				if (occ.length == total.length)
					ctrl = buildOccurrencesCtrl(data1[0].Occ);
				else 
				{
					ctrl = document.createElement('span');
					ctrl.appendChild($('<span> (</span>')[0]);
					ctrl.appendChild(buildOccurrencesCtrl(occ,true));
					ctrl.appendChild($('<span style="padding:3px;">of</span>')[0]);
					ctrl.appendChild(buildOccurrencesCtrl(total,true));
					ctrl.appendChild($('<span>)</span>')[0]);
				}
				return ctrl;
			}
			
		return [];
	},
	SuggestionsFromData: function (profile,data,context)
	{
		var cntr = context.vars.DataHolderCntr[0];
		var field = context.vars._Field[0];
		cntr.DataHolder = cntr.DataHolder || aad_createDataHolderFromCntr(cntr,context);
		var dataholder = cntr.DataHolder;
		field.DelayedOptionCalculation = true;
		if (!aa_bool(data,profile,'Static',context))
			field.DynamicSuggestions = true;
		var support_multiple = aa_bool(data,profile,'SupportMultiple',context);
		var out = { isObject: true, Options: [] };
		if (!cntr || !field || !cntr || !dataholder.UserDataView || !dataholder.Wrappers) 
				return [out];
		var wrappers = dataholder.Wrappers;
		var values = {};
		var original_field = context.vars._OriginalField[0];
		var field_id = original_field ? original_field.Id : field.Id;
		var as_text = ajaxart.compile_text(profile, "TextPattern",context);
		
		for(var i in wrappers)
		{
			var wrapper = wrappers[i];
			var hidden = false;
			var current_value = wrapper[field_id];
			var vals = [current_value];
			if (support_multiple) {
				vals = current_value.split(",");
				for (j in vals)
					vals[j] = aa_text_trim(vals[j]);
			}
			for(j in dataholder.UserDataView.Filters)
			{
				var filter = dataholder.UserDataView.Filters[j];
				if (filter.field.Id == field_id) continue; // ignore current field
				if (filter.Match(filter.field,wrapper) == false)
					hidden = true;
			}
			for (j in vals) {
				var val = vals[j];
				values[val] = values[val] || {isObject: true, code: val, Total :0, Occ: [], text:as_text([val],context) };
				values[val].Total++;
				if (!hidden) values[val].Occ.push(wrapper);
			}
		}
		if (!aa_bool(data,profile,'IncludeSpace',context) && values[''])
			delete values[''];
		for(var val in values)
			out.Options.push(values[val]);
		out.Options.sort(function(a,b) { return a.Occ.length < b.Occ.length ? 1 : -1; });
		original_field.Options = out;
		if (support_multiple)
			original_field.Multiple = true;
		original_field.Options.CodeToOptionHash = values;
		return [out];
	},
	OptionsTree: function (profile,data,context)
	{
		var out = { isObject: true, Options: [], IsTree: true };
		out.Categories = ajaxart.runsubprofiles(data,profile,'Category',context);
				
		return [out];
	},
	DynamicTree: function (profile,data,context)
	{
		var out = { isObject: true, IsTree: true, Options: [], Categories: [] };
		var recursive = aa_bool(data,profile,'Recursive',context);
		
		var fillCategory = function(category,nextLevelItems,depth)
		{
			for(var i=0;i<nextLevelItems.length;i++) {
				var item = nextLevelItems[i];
				var nextLevel = ajaxart.run([item],profile,'NextLevel',context);
				var opt = { isObject: true }
				opt.code = aa_text([item],profile,'OptionCode',context);
				opt.text = aa_text([item],profile,'OptionLabel',context);
				opt.image = aa_text([item],profile,'OptionImage',context);
				opt.source = item;
				if (nextLevel.length > 0) {
					opt.IsCategory = true;
					opt.Options = []; opt.Categories = [];
					opt.UnSelectable = ! aa_bool([item],profile,'MiddleNodeSelectable',context);
					category.Categories.push(opt);
					if (recursive && depth < 20)
						fillCategory(opt,nextLevel,depth+1);
				}
				else
					category.Options.push(opt);
			}
		}
		
		var firstLevel = ajaxart.run(data,profile,'FirstLevel',context);
		fillCategory(out,firstLevel,0);
		return [out];
	},
	DynamicTreeByCategories: function (profile,data,context)
	{
		var out = { isObject: true, IsTree: true, Options: [], Categories: [] };
		var categories = ajaxart.run(data,profile,'Categories',context);
		category_set = {}
		for(var i=0;i<categories.length;i++)
		{
			var cat = { isObject: true, Options: [], IsCategory: true, UnSelectable: ! aa_bool([categories[i]],profile,'CategorySelectable',context) };
			cat.text = aa_text([categories[i]],profile,'CategoryName',context);
			cat.code = aa_text([categories[i]],profile,'CategoryCode',context);
			cat.image = aa_text([categories[i]],profile,'CategoryImage',context);
			var subTree = aa_first([categories[i]],profile,'SubTree',context);
			cat.Options = subTree ? subTree.Options : [];
			cat.Categories = subTree ? subTree.Categories : [];
			if (!cat.code || !category_set[cat.code])
				out.Categories.push(cat);
				
			category_set[cat.code] = true;
		}
		var options = ajaxart.run(data,profile,'Options',context);
		for(var i=0;i<options.length;i++)
		{
			var option = { isObject: true };
			option.code = aa_text([options[i]],profile,'OptionCode',context);
			option.text = aa_text([options[i]],profile,'OptionName',context);
			option.image = aa_text([options[i]],profile,'OptionImage',context);
			out.Options.push(option);
		}
		return [out];
	},
	OptionCategory: function (profile,data,context)
	{
		var out = ajaxart.gcs.picklist.RichOptions(profile,data,context)[0];
		out.text = aa_text(data,profile,'Name',context);
		out.code = aa_text(data,profile,'Code',context);
		out.image = aa_text(data,profile,'Image',context);
		out.Categories = ajaxart.runsubprofiles(data,profile,'Category',context);
		out.IsCategory = true;
		out.UnSelectable = ! aa_bool(data,profile,'Selectable',context);
		
		return [out];
	},
	Option: function (profile,data,context)
	{
		var option = 
		{
			isObject: true, 
			code: aa_text(data,profile,'Option',context),
			image: aa_text(data,profile,'Image',context),
			text: ajaxart_multilang_text(aa_text(data,profile,'DisplayName',context),context),
			OptionPage: aa_first(data,profile,'OptionPage',context)
		}
		if (option.text == '') option.text = null;
		return [option];
	},
	InlineItems: function (profile,data,context)
	{
		var image = aa_text(data,profile,'Image',context);
		var items = aa_text_comma_seperate(aa_text(data,profile,'Items',context));
		var out = [];
		for (var i=0; i<items.length; i++) {
			out.push({ isObject:true, Label: items[i], Code: items[i], Image: image });
		}
	    var advItems = ajaxart.subprofiles(profile,'AdvancedItem');
	    for(var i=0;i<advItems.length;i++) {
	    	var advItem = aa_first(data,advItems[i],"",context);
	    	var exists = false;
	    	for (var j=0; j<out.length; j++) {
	    		if (out[j].Label == advItem.Label) {
	    			out[j] = advItem;
	    			exists = true;
	    		}
	    	}
	    	if (!exists)
	    		out.push(advItem);
	    }
	    return out;
	},
	OptionsOfFilteredField: function(profile,data,context)
	{
		var fieldId = context.vars._Field[0].FilterBaseFieldID;
		if (!context.vars.DataHolderCntr || !fieldId) return;
		var cntr = context.vars.DataHolderCntr[0];
		var field = aa_fieldById(fieldId,cntr.Fields);
		if (field && field.Options) 
			return [{ isObject:true, Options: field.Options.Options, FilteredField: field, Categories: field.Options.Categories} ];
	},
	DataOfFilteredField: function(profile,data,context)
	{
		var fieldId = context.vars._Field[0].FilterBaseFieldID;
		if (!context.vars.DataHolderCntr || !fieldId) return;
		var cntr = context.vars.DataHolderCntr[0];
		var field = aa_fieldById(fieldId,cntr.Fields);
		if (!field) return;
		
		var out = { isObject: true, Options: [], FilteredField: field } , values = {};
		cntr.DataHolder = cntr.DataHolder || aad_createDataHolderFromCntr(cntr,context);
		var wrappers = cntr.DataHolder.Wrappers;

		for(var i in wrappers)
		{
			var rawValue = wrappers[i][fieldId]; 
			var val = typeof(rawValue) == 'number' ? '' + rawValue : aa_totext(rawValue);
			values[val] = values[val] || {isObject: true, code: val, Total :0, Occ: [], text:val };
			values[val].Total++;
		}
		
		for(var val in values) out.Options.push(values[val]);

		return [out];
	} 
}


function ajaxart_field_option_text(field,field_data,context)
{
	var code = ajaxart.totext_array(field_data); 
	if (field.Options && field.Options.codeToText)
		return field.Options.codeToText(code);
	return code;
}

function aa_optimized_compile_text_single(profile,field,context)	// Best for %@xyz%. Assumes no default value
{
	var fieldscript = ajaxart.fieldscript(profile,field,true);
	if (!fieldscript) return null;
	if (fieldscript.nodeType == 2) {
		var script = fieldscript.nodeValue;
		var att = script.match(/^%@([a-zA-Z_0-9]+$)%/);
		if (att && att[1])
			return function (single_item) {
				return single_item.getAttribute(att[1]);
			}
	}
	var compiled = ajaxart.compile(profile,field,context);
	return function(single_data,context) {
		return ajaxart_runcompiled_text(compiled, [single_data], profile, field ,context);
	}
}

// dataview.js 

function aad_newDataHolder(wrappers,context)
{
	var dataHolder = {
		isObject: true,
		idGen: 0,
		groupIdGen: 0,
		Context: context,
		UserDataView: { 
			isObject: true, Id: 'user', Filters: [],
			CalcFilters: function() { return aad_calcFilters(this) }, CalcResults: function() { return aad_calcResults(this) }
		},
		Wrappers: wrappers,
		newFiltersDataView: function(filters,sort,id)
		{
			var dataview = { 
				isObject: true, dataholder: this, Id: id || this.idGen++, Filters: filters, Sort: sort,
				CalcFilters: function() { return aad_calcFilters(this) }, CalcResults: function() { return aad_calcResults(this) }
			}
			return dataview;
		}
	}
	dataHolder.UserDataView.dataholder = dataHolder;
	return dataHolder;
}

function aad_createDataHolderFromCntr(cntr,context)
{
	var fields = aad_DataviewFields(cntr.Fields);
	var items = cntr.Items[0].Items || [];
	var exp = cntr.Dataview_PreFilter ? cntr.Dataview_PreFilter.join(' AND ') : '';
	if (cntr.Dataview_PreTextQuery)
		exp += cntr.Dataview_PreTextQuery;
	var pre_filters = exp ? aad_filters_from_expression(exp,fields) : [];
	var filters = [].concat(pre_filters).concat(cntr.ExposedFilters || []);
	var wrappers = aad_create_wrappers(items,fields,filters,context);
	var calculatedFields = aad_CalculatedFields(fields);
	var dataholder = aad_newDataHolder(wrappers,context);
	dataholder.UserDataView.Sort = cntr.Dataview_PreSort || [];
	dataholder.UserDataView.Filters = cntr.ExposedFilters || [];
	dataholder.Fields = fields;
	aad_calcFields(dataholder.Wrappers,calculatedFields,dataholder,filters);
	if (pre_filters[0])
		dataholder.newFiltersDataView(pre_filters,[],'pre').CalcFilters();
	return dataholder;
}

function aad_DataviewFields(fields)
{
	var result = [];
	for(var i in fields) {
		if (!fields[i].HeaderFooter && !fields[i].IsGroup)
			result.push(fields[i]);
		if (fields[i].IsGroupOnlyForLayout)	// getting inside groups
			ajaxart.concat( result, aad_DataviewFields(fields[i].Fields) );
	}
	return result;
}
function aad_CalculatedFields(fields)
{
	var result = [];
	for(var i in fields)
		if (fields[i].WrapperToValue)
			result.push(fields[i]);
	return result;
}
function aad_filters_from_expression(exp,fields)
{
	var filters = [];
	exp = exp.replace(/^\s*/, "").replace(/\s*$/, ""); // trim spaces
	var filters_txt = exp.split(' AND ');
	for(var i in filters_txt)
	{
		var txt = filters_txt[i];
		txt = txt.replace(/^\s*/, "").replace(/\s*$/, ""); // trim spaces
		// Name likes 'abc' || Age in 1-10
		var fieldId = txt.match(/^[^ ]*/)[0];
		if (!fieldId) continue;
		var txt = txt.substring(fieldId.length);
		var op_parse = txt.match(/^\s*([^\s]*)\s*/);
		var op = (op_parse && op_parse[1]) || '=';
		var txt = txt.substring(op_parse[0].length);
		value = txt.replace(/^\s*/, "").replace(/\s*$/, ""); // trim spaces
		if (value.charAt(0) == '"' || value.charAt(0) == "'")
			value = value.substring(1,value.length-1);
		
		var field = aa_fieldById(fieldId,fields);
		if (field)
		{
			filter = aad_create_filter(field,value,op);
			ajaxart.writevalue(filter.rawFilterData,[value]);
			if (op.charAt(0) == '<' || op.charAt(0) == '>') 
				value = op + value;
			filter.SetFilterData([value]);
			filters.push(filter);
		}
	}
	return filters;
}

function aad_create_wrappers(items,fields,filters,context)
{
	var result = [];
	if (items.length > 0 && items[0] && items[0].__hiddenForView) // wrappers 
		return items;
	for(var i in items)
	{
		var item = items[i];
		var wrapper = { isObject: true, __item: item, __hidden: false, __FilterResults: {}, __hiddenForView: {}, __OriginalIndex: i};
		for(var j in fields)
		{
			var field = fields[j];
			var txt = field.ItemToText ? field.ItemToText(item) : ajaxart.totext_array(ajaxart_field_calc_field_data(field,[item],context));
			wrapper[field.Id] = field.SortValFunc? field.SortValFunc(txt) : txt;
			if (field.Options && field.Options.codeToText)
				wrapper['__text_' + field.Id] = field.Options.codeToText(wrapper[field.Id]);
		}
		for(var j in filters)
		{
			var filter = filters[j];
			if (filter && filter.PrepareElemCache)
				filter.PrepareElemCache(filter.field,wrapper);
		}
		result.push(wrapper);
	}
	return result;
}
function aad_calcFilters(dataview)
{
	var id = dataview.Id;
	var wrappers = dataview.dataholder.Wrappers;
	for(var i in wrappers)
	{
		var wrapper = wrappers[i];
		wrapper.__hiddenForView[id] = false;
		for(var j in dataview.Filters)
		{
			var filter = dataview.Filters[j];
			var res = filter.Match(filter.field,wrapper);
			if (res == false)
				wrapper.__hiddenForView[id] = true;
		}
	}
}
function aad_calcResults(dataview)
{
	var id = dataview.Id;
	var result = {isObject: true, Items: [], query: dataview}
	var items = result.Items;
	var wrappers = dataview.dataholder.Wrappers;
	for(var i in wrappers)
	{
		var wrapper = wrappers[i];
		if (! wrapper.__hiddenForView[id] && ! wrapper.__hiddenForView.user && ! wrapper.__hiddenForView.pre)
			items.push(wrapper);
	}
	if (dataview.Sort)
		aad_sort_dataview(items,dataview.Sort);
	return [result];
}
function aad_sort_dataview(wrappers,sort)
{
	if (!sort || sort.length == 0) return wrappers;
	if (sort.length  == 1)
	{
		var fieldId = sort[0].SortBy;
		for(var i in wrappers)
			wrappers[i].__Val = wrappers[i]['__text_' + fieldId] || wrappers[i][fieldId];

		if (sort[0].SortDirection == 'ascending')
			wrappers.sort(function(a,b) { return a.__Val > b.__Val ? 1 : -1; });
		else
			wrappers.sort(function(a,b) { return a.__Val < b.__Val ? 1 : -1; });
	}
	else
	{
		function compare(wrapperA,wrapperB)
		{
			for(var i in sort)
			{
				var sortElem = sort[i];
				var fld = sortElem.SortBy;
				if (wrapperA[fld] == wrapperB[fld]) continue; 
				if (sortElem.SortDirection == 'ascending')
					return wrapperA[fld] > wrapperB[fld] ? 1 : -1;
				else
					return wrapperA[fld] < wrapperB[fld] ? 1 : -1;
			}
		}
		wrappers.sort(compare);
	}
	return wrappers;
}
function aad_calcFields(wrappers,calculatedFields,dataHolder,filters)
{
	if (calculatedFields.length == 0) return;
	
	var prev_wrapper = null;
	for(var i in wrappers)
	{
		var wrapper = wrappers[i];
		for(var j in calculatedFields)
		{
			var fld = calculatedFields[j];
			if (fld.Id == '' || fld.CalcSequence) continue;
			var item = wrapper.__item;
			wrapper[fld.Id] = aad_CalcValueFromWrapper(wrapper,fld,prev_wrapper);
			if (fld.SortValFunc) wrapper[fld.Id] = fld.SortValFunc(wrapper[fld.Id]);
			if (ajaxart.isxml(item) && wrapper[fld.Id])
				item.setAttribute(fld.Id,wrapper[fld.Id]);
			else if (item && wrapper[fld.Id])
				item[fld.Id] = wrapper[fld.Id];
		}
		prev_wrapper = wrapper;
	}

	var relevant_filters = []; // filters on the calculated field
	for(var j in calculatedFields)
	{
		var fld = calculatedFields[j];
		if (fld.Id != '' && fld.CalcSequence)
			fld.CalcSequence(wrappers,dataHolder);
		for(var k in filters)
			if (filters[k].field.Id == fld.Id) relevant_filters.push(filters[k]);
	}
	// filters on calculated fields
	for(var i in relevant_filters)
		for(var j in wrappers)
			if (relevant_filters[i].PrepareElemCache)
			  relevant_filters[i].PrepareElemCache(relevant_filters[i].field,wrappers[j]);
			
}

function aad_FilterAndSort(data1,context)
{
	var data = data1[0];
	var cntr = data1[1];
	var data_items = cntr.Items[0];
	if (data_items.LargeDataItems && data_items.ServerQuery) {
		// server-side sort, filter and aggregate
		var query = aa_calcCntrQuery(cntr,context);
		ajaxart_async_Mark(context);
		$(cntr.Ctrl).addClass('aa_loading');
		aad_runMethodAsync(data_items,data_items.ServerQuery,[cntr.Query],context,function (result,ctx) {
			if (! cntr.Query.GroupByField)
			  cntr.FilteredItems = result;
			else 
			  cntr.Groups = result;
			
			$(cntr.Ctrl).removeClass('aa_loading');
			ajaxart_async_CallBack([],context); 
		});
		return;
	}

	cntr.DataHolder = cntr.DataHolder || aad_createDataHolderFromCntr(cntr,context);
	var exp = aad_FilterExpression(cntr,cntr.ExposedFilters,data,context);
	var dataview;
	var sort = cntr.DataHolder.UserDataView.Sort = aad_cntrSortPrefrences(cntr) || cntr.DataHolder.UserDataView.Sort;
	if (exp)
		var filters = aad_filters_from_expression(exp,cntr.Fields);
	else
		var filters = [];
	cntr.Filters = filters;
	cntr.IDForFilteredResults = cntr.IDForFilteredResults ? cntr.IDForFilteredResults+1 : 1;
	
	var dataview = cntr.DataHolder.newFiltersDataView(filters,sort,'user');
	dataview.CalcFilters();
	var result = dataview.CalcResults();
	cntr.FilteredWrappers = result[0].Items;
	return result;
}

function aad_FilterExpression(cntr,filters,data,context)
{
	var out = '';
	var filters = filters || (cntr.DataHolder && cntr.DataHolder.UserDataView.Filters);
	var first = true;
	for(var i in filters)
	{
		var filter = filters[i];
		var sqlValue = filter.ToSQLText(filter.rawFilterData);
		if (sqlValue == '') continue;
		if (!first)
			out+= ' AND ';
		out += filter.field.Id + " " + filter.op + " '" + sqlValue + "'";
		first = false;
	}
	if (cntr.ExtraQueryExpression)
		out = cntr.ExtraQueryExpression(data,aa_ctx(context,{Exp: [out]}))[0];
	if (out.indexOf(' AND ') == 0)
		out = out.substring(5);
	return out;
}

function aad_CalcValueFromWrapper(wrapper,field,prev_wrapper)
{
	try
	{
		if (field.WrapperToValue)
			return field.WrapperToValue(wrapper,prev_wrapper);
		if (field.ItemToText && wrapper.__item)
			return field.ItemToText(wrapper.__item);
		if (field.FieldData && wrapper.__item)
		{
			var item = wrapper.__item;
			var txt = field.ItemToText ? field.ItemToText(item) : ajaxart.totext_array(ajaxart_field_calc_field_data(field,[item],context));
			return field.SortValFunc? field.SortValFunc(txt) : txt;
		}
	} catch (e) {}
	return [];
}

function aad_cntrSortPrefrences(cntr)
{
	var thead = $(cntr.Ctrl).find('.aatable>thead').slice(0,1);
	var th = thead.find('>tr>th').filter('.sort_ascending,.sort_descending')[0];
	if (th != null)
		return [{ SortBy: th.Field.Id, SortDirection: $(th).hasClass('sort_ascending') ? 'ascending' : 'descending' }]
}
function aad_create_filter(field,filterValue,op)
{
	var op = op || '=';
    if (!field.newFilter) return;

    var filterData = ajaxart_writabledata();
	if (filterValue)
		ajaxart.writevalue(filterData,[filterValue]);

    var filter = field.newFilter(filterData);
	filter.rawFilterData = filterData;
	filter.field = field;
	filter.Id = field.Id + '_' + op;
	filter.op = op;

    return filter;
}



function aad_cntr_filterXml2Objects(cntr,filterXml) 
{
	var out = [];
	for (var i=0; i<filterXml.attributes.length; i++) {
		var attr = filterXml.attributes.item(i);
		var field = aa_fieldById(attr.name,cntr.Fields);
		if (!field) continue;
		var filter = aad_create_filter(field,filterXml.getAttribute(attr.name),'=');
		if (!filter) {
			field.newFilter = aa_create_text_filter();
			filter = aad_create_filter(field,filterXml.getAttribute(attr.name),'=');
		}
		if (filter) out.push(filter);
	}
	
	return out;
}


// field.js

aa_gcs("field_aspect",{
	TextAreaProperties: function(profile,data,context)
	{
		var field = context.vars._Field[0];
		
		aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
			var textareas = $(cell).find('textarea');
			var readonly = aa_text(field_data,profile,'ReadOnly',context);
			if (readonly == 'readonly') textareas.attr('readonly','readonly');
			if (readonly == 'writable') textareas.removeAttr('readonly');
			
			var disabled = aa_text(field_data,profile,'Disabled',context);
			if (readonly == 'disabled') textareas.attr('disabled','disabled');
			if (readonly == 'enabled') textareas.removeAttr('disabled');
		});
	},
	HandleEvent: function(profile,data,context)
	{
		var field = context.vars._Field[0];
		
		var events = aa_split(aa_text(data,profile,'Event',context),',',true);
		
		for(var i=0;i<events.length;i++) {
			var evt = events[i];
			
			if (evt == 'update') {
				aa_field_handler(field,'OnUpdate',function(field,field_data,input,e,extra) {
					var ctx1 = input.ajaxart ? aa_merge_ctx(context,input.ajaxart.params) : context;
					var parent_elem = $(input).parents('.aa_item')[0]; 
					var item = parent_elem && parent_elem.ItemData;
					var newContext = aa_ctx(ctx1,{ _Field: [field], _FieldData: field_data
						, _Input: [input], ControlElement: [input], _Item: item || [] } );
					if (extra) newContext = aa_ctx(newContext,extra);
					if ($(input).parents('.aa_container').length > 0)
						newContext.vars._Cntr = [ $(input).parents('.aa_container')[0].Cntr ];
					
					ajaxart.run(field_data,profile,'Action',newContext);
				});
			};
			if (evt == 'blur' ) {
				aa_field_handler(field,'OnBlur',function(field,field_data,input,e,extra) {
					var newContext = aa_ctx(context,{ _Field: [field], _FieldData: field_data , _Input: [input], ControlElement: [input] } );
					if ($(input).parents('.aa_container').length > 0)
						newContext.vars._Cntr = [ $(input).parents('.aa_container')[0].Cntr ];
					ajaxart.run(field_data,profile,'Action',newContext);
				});
			};
			if (evt == 'keydown' ) {
				aa_field_handler(field,'OnKeydown',function(field,field_data,input,e,extra) {
					var newContext = aa_ctx(context,{ _Field: [field], _FieldData: field_data , _Input: [input], ControlElement: [input] } );
					if ($(input).parents('.aa_container').length > 0)
						newContext.vars._Cntr = [ $(input).parents('.aa_container')[0].Cntr ];
					ajaxart.run(field_data,profile,'Action',newContext);
				});
			};
			if (evt == 'keyup' || evt == 'enter pressed' || evt == 'ctrl enter pressed') {
				aa_field_handler(field,'OnKeyup',function(field,field_data,input,e,extra) {
					if (evt == 'enter pressed' && aa_totext(extra.KeyCode) != 13) return;
					if (evt == 'ctrl enter pressed' && aa_totext(extra.KeyCode) != 13) return;
					if (evt == 'enter pressed' && aa_tobool(extra.CtrlKey)) return;
					if (evt == 'ctrl enter pressed' && ! aa_tobool(extra.CtrlKey)) return;
	
					var newContext = aa_ctx(context,{ _Field: [field], _FieldData: field_data , _Input: [input], ControlElement: [input] } );
					if ($(input).parents('.aa_container').length > 0)
						newContext.vars._Cntr = [ $(input).parents('.aa_container')[0].Cntr ];
					if (extra && extra.KeyCode)	newContext.vars.KeyCode = extra.KeyCode;
					if (extra && extra.CtrlKey)	newContext.vars.CtrlKey = extra.CtrlKey;
					
					ajaxart.run(field_data,profile,'Action',newContext);
				});
			};
			if (evt == 'control attached') {
				aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
					aa_addOnAttach(cell,function() {
						ajaxart.run(field_data,profile,'Action',aa_merge_ctx(context,ctx,{_ElemsOfOperation: [cell]}));
					});
				},1000);
			};
			if (evt == 'load') {
				ajaxart.runNativeHelper(data,profile,'OnLoad',context);
			}
			if (evt == 'focus') {
				aa_field_handler(field,'OnFocus',function(field,field_data,input,e,extra) {
					var newContext = aa_ctx(context,{_Field: [field], _FieldData: field_data, _Input: [input], ControlElement: [input]} );
					ajaxart.run(field_data,profile,'Action',newContext);
				});
			};
			if (evt == 'mouse over') {
				aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
					cell.onmouseover = function() {
						if (!cell.isInside)
							ajaxart.run(field_data,profile,'Action',aa_merge_ctx(context,ctx,{ControlElement: [cell]}));
						cell.isInside = true;
					};
					cell.onmouseout = function() { cell.isInside = false; };
				},'PopupOnHover');
			}
			if (evt == 'mouse click') {
				aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
					cell.onclick = function(e) {
						if (window.aa_incapture) return;
						ajaxart.run(field_data,profile,'Action',aa_merge_ctx(context,ctx,{ControlElement: [cell], _DomEvent: [e] }));
					};
				},'MouseClick');
			}
		}
	}
});


// server.js
function aad_server_ensureSyncObject(profile, data, context, onSuccessFunc) {
	var callSync;
	if (ajaxart.getVariable(context, "_CallServerObject").length > 0) // composite inside composite
	callSync = ajaxart.getVariable(context, "_CallServerObject")[0];
	else {
		callSync = {
			countLeft: 0,
			servervars: [],
			success: true,
			onSuccess: [],
			onFailure: [],
			mode: "parallel"
		};
		callSync.register = function(callSync, debugInfo) {
			callSync.countLeft++;
		};
		callSync.serverResult = function(callSync, isSuccess, debugInfo) {
			callSync.countLeft--;

			if (!isSuccess) callSync.success = false;
			if (callSync.countLeft <= 0) {
				aad_server_callSuccessOrFailure(callSync);
			}
		}
		context.vars["_CallServerObject"] = [callSync];
	}

	if (onSuccessFunc != null) callSync.onSuccess.push(function(callSync) {
		onSuccessFunc(aad_server_contextWithServerVars(context, callSync.servervars));
	});

	return ajaxart.getVariable(context, "_CallServerObject")[0];
}

function aad_server_RunParallelCalls(profile, data, context, fieldName, onSuccessFunc) {
	var newContext = ajaxart.clone_context(context);

	var currentSync = null;
	var currentSyncArr = ajaxart.getVariable(context, "_CallServerObject");
	if (currentSyncArr.length > 0 && currentSyncArr[0].mode != "parallel") {
		currentSync = currentSyncArr[0];
		currentSync.register(currentSync);
		delete newContext.vars["_CallServerObject"];
	}

	var callSync = aad_server_ensureSyncObject(profile, data, newContext, onSuccessFunc);
	if (currentSync != null) callSync.servervars = currentSync.servervars;
	callSync.onSuccess.push(function(callSync) {
		ajaxart.run(data, profile, 'OnSuccess', aad_server_contextWithServerVars(newContext, callSync.servervars));
	});
	callSync.onFailure.push(function(callSync) {
		ajaxart.run(data, profile, 'OnFailure', aad_server_contextWithServerVars(newContext, callSync.servervars));
	});

	if (currentSync != null) {
		var fWithVars = function(currentSync) {
			callSync.onSuccess.push(function(callSync) {
				currentSync.serverResult(currentSync, true);
			});
		};
		fWithVars(currentSync);
	}

	callSync.register(callSync, "parallel_internal");
	var callProfiles = ajaxart.subprofiles(profile, fieldName);
	for (var i = 0; i < callProfiles.length; i++)
	ajaxart.run(data, callProfiles[i], "", newContext);
	callSync.serverResult(callSync, true, "parallel_internal");
}

function aad_server_content2result(server_content, varname) {
	try {
		var out = null;
		if (ajaxart.isxml(server_content)) server_content = ajaxart.xml2text(server_content);
		else if (server_content.length > 0 && server_content.charAt(0) != "<") // not xml
		return [server_content];

		var server_content_no_ns = ajaxart.ajaxart_clean_ns(server_content);
		if (server_content.length > 0 && server_content.charAt(0) == "<") out = [aa_parsexml(server_content_no_ns, varname)];

		if (out == null) out = [server_content];
		if (out.length == 1 && out[0] == null) out = [server_content];

		if (ajaxart.ishtml(out[0]) || (ajaxart.isxml(out[0]) && aa_xpath(out[0].ownerDocument.documentElement, "Body/Fault").length != 0)) { // not xml, probably error
			ajaxart.log("failed calling server", "error");
			if (ajaxart.ishtml(out)) $("<div>error back from server:" + server_content + "</div>").appendTo($("#ajaxart_log"));
		} else if (ajaxart.isxml(out)) {
			if (out[0].nodeType == 7) out = [out[0].nextSibling]; // <?xml
			if (out[0].tagName.toLowerCase() == 'envelope') // web service
			out = [ajaxart.body_contents_of_soap_envelope(out[0])];
		}

		return out;
	} catch (e) {
		ajaxart.logException(e);
		return null;
	}
};

function aad_server_basicCall(options, onresult, varname, reusable, context) {
	options.inPreviewMode = ajaxart.inPreviewMode;
	options.success = function(server_content) {
		var success = true;
		if (server_content && server_content.nodeType == 9) server_content = server_content.documentElement;

		var result = aad_server_content2result(server_content, varname);
		if (result == null) {
			success = false;
			result = [];
		}
		var currPreviewMode = options.inPreviewMode;
		if (options.inPreviewMode == true) ajaxart.inPreviewMode = true;

		onresult(result, varname, reusable, success);
		ajaxart.inPreviewMode = false;
	}
	options.error = function(XMLHttpRequest, textStatus, errorThrown) {
		onresult([], varname, reusable, false);
	}

	$.ajax(options);
}

function aad_server_contextWithServerVars(context, servervars) {
	var newContext = ajaxart.clone_context(context);
	for (var i in servervars)
	newContext.vars[i] = servervars[i];
	delete newContext.vars["_CallServerObject"];
	return newContext;
}

function aad_server_callSuccessOrFailure(callSync) {
	if (callSync.success) for (var i = 0; i < callSync.onSuccess.length; i++) // running backwards, so inner 'OnSuccess" are run first
	callSync.onSuccess[callSync.onSuccess.length - i - 1](callSync);
	else for (var i = 0; i < callSync.onFailure.length; i++)
	callSync.onFailure[callSync.onFailure.length - i - 1](callSync);
}

// field_control.js

function ajaxart_field_createControl(cntr,field,field_data,context)
{
	return ajaxart.trycatch( function()  {
		var ctrl = null;
		if (field.Multiple == true && field.MultipleControl != null)
			ctrl = aa_runMethod(field_data,field,'MultipleControl',context);
		else if (ajaxart_field_is_readOnly(cntr,field,context))
		{
			if (field.ReadOnlyControl)
				ctrl = aa_runMethod(field_data,field,'ReadOnlyControl',context); 
			else if (field.Control)
				ctrl = aa_runMethod(field_data,field,'Control',context);
			else return [];
		}
		else if (field.WritableControl)
			ctrl = ajaxart.runScriptParam(field_data,field.WritableControl,context);
		else if (field.Control)
			ctrl = aa_runMethod(field_data,field,'Control',context);
	
		if (ctrl == null) // default is text input 
			ctrl = [ajaxart_field_createSimpleInput(field_data,context, ajaxart_field_is_readOnly(cntr,field,context))];
		if (ctrl.length == 0) // empty control was defined, use text
			return []; //ctrl = [document.createElement('span')];
		$(ctrl[0]).addClass("field_control fld_" + field.Id);
		ctrl[0].Field = field;
		ctrl[0].FieldData = field_data;
		ctrl[0].jbContext = ctrl[0].jbContext || context;
		if (field.Css) {
	    	var newContext = aa_ctx(context,{ _FieldCtrl: ctrl });
			ajaxart.runScriptParam(field_data,field.Css,newContext);
		}
		return ctrl;
	}, function (e) {	// catch
	   	   ajaxart.logException(e);   
	   	   return [];
	});
}

function ajaxart_field_createCellControl(item,cntr,td,cell_presentation,field,field_data,context)
{
	var newContext = aa_ctx(context,{Item: item, FieldData: field_data});
	$(td).addClass('aa_cell_element');
	if (cell_presentation == null) cell_presentation = "control";
	if (field.CellPresentation != null)
		cell_presentation = field.CellPresentation;
	if (field.Width != null)
		$(td).css("width",field.Width);
	td.CellPresentation = cell_presentation;
	td.Field = field;
	td.FieldData = field_data;
	td.ItemData = item;
	td.jbContext = context;

    for (i in ajaxart.xtmls_to_trace) {  // Tracing field data to go over gaps
        if (field.XtmlSource && field.XtmlSource[0].script == ajaxart.xtmls_to_trace[i].xtml) {
            ajaxart.xtmls_to_trace[i].fieldData = ajaxart.xtmls_to_trace[i].fieldData || [];
            ajaxart.xtmls_to_trace[i].fieldData = ajaxart.xtmls_to_trace[i].fieldData.concat(field_data);
        }
    }

	if (field.IsCellHidden && field.IsCellHidden(item,context,field_data)) {
		if (field.RenderHiddenCell) 
			td.style.display = 'none';
		else
			return;
	}
	if (field.isOperation)
	{
    	var newContext = aa_ctx(newContext,{ _ItemsOfOperation: item });

		var opCell = ajaxart.runComponent('operation.OperationCell',[field],newContext); 
		if (opCell.length > 0)
			td.appendChild(opCell[0]);
		return;
	}
	if (field.CalculatedControl)
	{
		$(td).addClass("aa_text fld_" + field.Id);
		field.CalculatedControl(td,field,field_data,newContext);
		return;
	}
	if (field.IsCalculated)
	{
		var calculated_val = field.CalcFormula(item,newContext);
		var assigned = ajaxart.writevalue(field_data,calculated_val,true);
		if (!assigned)
			field_data = calculated_val;
	}
	if (cell_presentation == "text")
	{
		$(td).addClass("aa_text fld_" + field.Id);
		td.innerHTML = ajaxart_field_text(field,field_data,item,newContext);
	}
	else if (cell_presentation == "expandable text")
		ajaxart_field_expandableText(td,cntr,field,field_data,item,newContext);
	else // "control"
	{
		td.ReadOnly = ajaxart_field_is_readOnly(cntr,field,context);
	    var new_control = ajaxart_field_createControl(cntr,field,field_data,newContext)[0];
	    if (new_control != null)
	    {
	    	td.appendChild(new_control);
			if (field.Validations) { 
				$(new_control).addClass('aa_hasvalidations'); 
				new_control.jbCell = td;
			}
	    }
	    else
		{
			$(td).addClass("aa_text fld_" + field.Id);
			td.innerHTML = ajaxart_field_text(field,field_data,item,newContext);
		}
	}
	aa_trigger(field,'ModifyControl',{ Wrapper: td, FieldData: field_data, Context: newContext, Item: item });
	if (field.ModifyControl)
		for(var i=0;i<field.ModifyControl.length;i++)
			field.ModifyControl[i](td,field_data,cell_presentation,newContext,item);

	aa_trigger(field,'ModifyCell',{ Wrapper: td, FieldData: field_data, Context: newContext, Item: item });
	if (field.ModifyCell)
		for(var i=0;i<field.ModifyCell.length;i++)
			field.ModifyCell[i](td,field_data,cell_presentation,newContext,item);

	return ["true"];
}

function ajaxart_field_createSimpleInput(data,context,readonly,input_type)
{
	var field = context.vars._Field[0];
	var text = ajaxart_field_option_text(field,data,context);
	if (readonly) {
		if (field.Text) text = aa_totext(field.Text(data,context));
		var out = $("<div/>").text(text).addClass('readonly')[0];
		return out;
	}
	if (field.MultiLineTextStyle && field.MultiLineText ) {
		var input = null;
		var style = field.MultiLineTextStyle;
		var textAreaElem = $(style.Html)[0];
		var textAreaObj = aa_api_object(textAreaElem,{Field: field,
			initTextArea: function(classOrElement) {
				var inner = this.getInnerElement(classOrElement);
				if (!inner) return;
				input = inner;
				input.jbApiObject = textAreaObj;
			}
		});
		aa_apply_style_js(textAreaObj,style);
		$(textAreaObj).addClass(aa_attach_global_css(style.Css));
	} else {
		var input = document.createElement(field.MultiLineText ? 'textarea' : 'input');
	}
	
	aa_defineElemProperties(input,'Blur,Refresh,getValue,updateValue');
	
	if (!input_type) input_type = 'text';
	input.setAttribute('type',input_type);
	if (field.XtmlSource && field.XtmlSource[0].script)
		ajaxart.databind([input],data,context,field.XtmlSource[0].script); // for validation - should be cleaned

	input.jbData = data;
	input.onfocus = function(e) {
		aa_validation_removeNoCloseMessages();		
		
	    // select all on next timer
		var field = context.vars._Field[0];
		if (! field.DoNotSelectAllOnFocus)
		{
		    var selectAllText = function(input) { setTimeout(function() {
				if (input.setSelectionRange) { // Mozilla
					try {input.setSelectionRange(0, input.value.length); } catch(e) {}
				}
				else if (input.createTextRange) // IE
					{
					try { 
						var range = input.createTextRange();
						range.moveStart('character', 0);
						range.moveEnd('character', input.value.length);
						range.select();
					} catch (e) {}
					}
		    })};
		    if (ajaxart.controlOfFocus != this)
		    	selectAllText(this);
		}
	    ajaxart.controlOfFocus = this;
	    var field = context.vars._Field[0];
	    aa_invoke_field_handlers(field.OnFocus,this,e,field,data);
	    
		for(var parent=input.parentNode;parent;parent=parent.parentNode) if (parent.onfocus) parent.onfocus(e);  // for HoverOnPopup 
	    return true;
	}
	input.onblur = function(e) {
		for(var parent=input.parentNode;parent;parent=parent.parentNode) if (parent.onblur) parent.onblur(e);  // for HoverOnPopup 
	    
		if (this.IgnoreBlur) 
		{ 
			this.IgnoreBlur = false; 
			return false; 
		}

	    var field = context.vars._Field[0];
	    ajaxart_field_RefreshDependentFields(field,this,context);
	    aa_invoke_field_handlers(field.OnBlur,this,e,field,data);
	    if (field.Validations) aa_handleValidations(field,this,data,context,"on blur");
	    
	    return true;
	}

	input.onkeydown = function(e) {
		var field = context.vars._Field[0];
		e = e || event;
		
	    if (field.KeyPressValidator && e.keyCode != 8) // backspace is fine 
	    {
			var ch = String.fromCharCode(e.keyCode);
			if (! field.KeyPressValidator.test(ch)) return aa_stop_prop(e);
	    }
		
		var had_popups = ajaxart.dialog.openPopups.length > 0;
	    aa_invoke_field_handlers(field.OnKeydown,this,e,field,data);
//		if (e.keyCode == 13 && had_popups) 
//			return aa_stop_prop(e);
	    
		if (aa_intest && e.CharByChar)
			input.value += String.fromCharCode(e.keyCode);

		return true;
	}
	input.onmousedown = function(e) {
	    var field = context.vars._Field[0];
		e = e || event;
	    aa_invoke_field_handlers(field.OnMouseDown,this,e,field,data);
	    
		return true;
	}
	input.onmouseup = function(e) {
	    var field = context.vars._Field[0];
		e = e || event;
	    aa_invoke_field_handlers(field.OnMouseUp,this,e,field,data);
	    
		return true;
	}
	
	// oninput is for mouse context menu of cut,paste
	input.oninput = function(e) {
		input.updateValue(e);
	}
	// support paste,cut for IE8,IE7
	if (ajaxart.isIE78) {
		$(input).bind('cut paste',null,function(e) {
			setTimeout(function() {
				input.updateValue(e);	
			},50);
		});
	}
	input.onkeyup = function(e) {
		var input = this;
	    var field = context.vars._Field[0];
		e = e || event;

		var keyCode = e.keyCode;
		if (keyCode == undefined && !aa_intest && !aa_inuiaction) return; // a mouse click !!!
		aa_invoke_field_handlers(field.OnKeyup,this,e,field,data,{isObject: true, KeyCode: ['' + keyCode], CtrlKey: aa_frombool(e.ctrlKey) });
		var codes = [9,13,16,17,18,27, 63277,63276]; // controls and navigation 
		for(var i=0;i<codes.length;i++)
			if (keyCode == codes[i]) return true;
//		if (keyCode>=33 && keyCode<=45) return true; // symbols !@# (may be moved to an aspect)
		
	    if (field.KeyPressValidator && keyCode != 8) // backspace is fine 
	    {
			var ch = String.fromCharCode(keyCode);
			if (! field.KeyPressValidator.test(ch)) return aa_stop_prop(e);
	    }
	    if (e.keyCode)
	    	input.KeyUp = true;
    	input.updateValue(e);
	    input.KeyUp = null;
		return true;
	}
	input.Blur = function()
	 {
		$(this).blur();
	 }

	input.Refresh = function()
	 { 
		var input = this;
		if (input.RefreshDescriptionForEmptyText)
			input.RefreshDescriptionForEmptyText();
		
		if (input.jbApiObject) input.jbApiObject.trigger('refresh');
	 }

	input.getValue = function() { return this.value; }
	input.updateValue = function(e) 
	{
	    var field = context.vars._Field[0];
	    if (! field.ManualWriteValue)
	    {
	    	var value = this.getValue();
	    	//value = value.replace(RegExp(String.fromCharCode(160),'g'), ' ');  // fixed strange bug. charcode 160 is nbsp
	    	if (aa_totext(data) == value) return;  // nothing has changed
	    	ajaxart.writevalue(data,value);
		    if (field.RefreshOn != 'exit field')
		    	aa_invoke_field_handlers(field.OnUpdate,this,e,field,data);
	    }
	    if (field.Validations) aa_handleValidations(field,this,data,context,"on change");
	}
	//if (!aa_intest && input.tagName.toLowerCase() == 'textarea')
	  //text = text.replace(RegExp(' ','g'), String.fromCharCode(160));  // fixed strange bug. charcode 160 is nbsp
	input.value = text;
	input.setAttribute('value',text); // so the tests will pass on all browsers
	var textboxCssClass = aa_attach_global_css( aa_totext(ajaxart.run([],aa_parsexml('<xtml t="jbart.TextboxCss" />'),'',context)) , null, 'textbox',null,true );
	$(input).addClass('aa_simple_cell aatextbox').addClass(textboxCssClass);
	input.jbRemoveTextboxClass = function() {
		$(input).removeClass('aatextbox').removeClass(textboxCssClass);
	}

	if (!readonly && (field.Validations || field.Validation)) 
	  $(input).addClass('aa_hasvalidations');

	return input;
}

function ajaxart_field_expandableText(td,cntr,field,field_data,item,context)
{
	td.expandableText =  {
			States : {
				"control" : {
					Control : function() 
					{ 
						td.State = 'control';
						$(td).removeClass('aa_toggle_button');
						var ctrl = ajaxart_field_createControl(cntr,field,field_data,context)[0];
						if (!cntr) return $('<div></div>')[0];
						td.appendChild(ctrl);
						jBart.trigger(field,'ModifyControl',{ Wrapper: td, FieldData: field_data, Context: context, Item: item });
						if (field.ModifyControl)
							for(var i=0;i<field.ModifyControl.length;i++)
								field.ModifyControl[i](td,field_data,'control',context,item);
						return ctrl;
					},
					ChangeStateLabel : "close",
					ChangeToState : "text"
				},
				"text" : {
					Control : function() 
					{
						var txt = ajaxart_field_text(field,field_data,item,context);
						if (txt == "" && field.DescriptionForEmptyText)
							txt = field.DescriptionForEmptyText;
						if (td.firstChild) aa_remove(td.firstChild,true);
						td.innerHTML = txt;
						$(td).addClass("aa_text fld_" + field.Id);	
						td.setAttribute("tabindex","1");
						td.State = 'text';
						if (field.ModifyCell) {
							for(var i=0;i<field.ModifyCell.length;i++)
								field.ModifyCell[i](td,field_data,'text',context,item);
						}
						
						td.onkeydown = function(e) {
							if ($(td).find('.field_control').length > 0) return;
							field.ToggleExpandable(field,field_data,td,e);
							if (e.keyCode == 13) 
								return aa_stop_prop(e);
						    
							return true;
						}

						return td;
					},
					ChangeStateLabel : "",
					ChangeToState : "control"
				}
			},
			Build: function(state)
			{
				aa_empty(td);
				td.onclick = null;
				$(td).removeClass('aa_text');
				var ctrl = state.Control();
				if (ctrl == null) return td.expandableText.Build(td.expandableText.States['text']);
				var button = $(ctrl);
				if (state.ChangeStateLabel != '')
				{
					button = $('<div>' + state.ChangeStateLabel + ' </div>')
					td.appendChild(button[0]);
					aa_element_attached(td);
				}
				button.addClass('aa_toggle_button');
				button[0].onclick = function(e) 
				{
				    var elem = $( (typeof(event)== 'undefined')? e.target : event.srcElement  ); 
		  		    if (elem[0].parentNode == null) return true;
					var new_state = td.expandableText.States[state.ChangeToState];
					td.expandableText.Build(new_state);
					$(td).find('>input').slice(0,1).focus();
					if (state.ChangeToState == "control")
						aa_fixTopDialogPosition();
				}
			}
		};
	td.expandableText.Build(td.expandableText.States['text']);
	field.ToggleExpandable = function(field,field_data,input,e)
	{
		if (e.keyCode == 27)
		{
			var td = input;
			if (! $(td).hasClass('aa_cell_element'))
				td = $(input).parents('.aa_cell_element')[0];
			if (td == null) return;
			var current_state = td.expandableText.States[td.State];
			var new_state = td.expandableText.States[current_state.ChangeToState];
			td.expandableText.Build(new_state);
			if ($(td).find('.field_control').length > 0)
				$(td).find('.field_control').focus();
			else
				$(td).focus();
		}
	}
}

function ajaxart_properties_and_sections(cntr,item_aggregator,item_data,profile,ctx,fields,space,full_width,properties_width,header,footer)
{
  if (typeof(properties_width) == "undefined") properties_width = "80";
  properties_width = parseInt(properties_width.split('px')[0]);
  var table = $('<table class="propertysheet" cellpadding="0" cellspacing="0"><tbody class="propertysheet_tbody"></tbody></table>')[0];
  if (full_width) $(table).width("100%");
  var tbody = table.firstChild;

  for (var j=0;j<fields.length;j++) 
	  if (fields[j].PropertiesWidth) properties_width = Math.max(properties_width,parseInt(fields[j].PropertiesWidth));

  if (header && header != "") { tbody.appendChild($('<tr class="aa_propertysheet_tr_space" style="height:'+header+'"/>')[0]); }
  for (var j=0;j<fields.length;j++) {
	  var field = fields[j];
	  if ( aa_object_boolean_value(field,'IsOperation') ) continue;
	  var tr = document.createElement("TR");
	  tbody.appendChild(tr);
	  tr.className = "field_row value field_" +field.Id + "_row";
	  tr.Field = field;
	  
	  var hideTitle = field.HideTitle;
	  if (!hideTitle && field.RecalcTitle) field.RecalcTitle(item_data,ctx);
	  
	  if (field.AsSection && !field.HideTitle)
		  aa_buildSection(cntr,tr,field,item_data,properties_width,ctx);
	  else 
		  aa_buildProperty(cntr,tr,field,item_data,properties_width,ctx);
	  
	  if (space == true || space == "true") space = "5px";
	  if (space == false|| space == "false") space = "";
	  if (j != fields.length-1 && space != "")
	  {
		  var trSpace = document.createElement('tr');
		  trSpace.className="aa_propertysheet_tr_space";
		  trSpace.style.height = space;
		  tbody.appendChild(trSpace);
	  }
  }
  if (footer && footer != "") { tbody.appendChild($('<tr class="aa_propertysheet_tr_space" style="height:'+footer+'"/>')[0]); }
  table.ItemData = item_data;
  // on load validations
  if (!cntr.ReadOnly) aa_handle_onload_validations(table);

  return table;
}

function aa_handle_onload_validations(top)
{
  var optionals = $(top).find('.aa_hasvalidations');
  for(var i=0;i<optionals.length;i++) {
    var ctrl = optionals[i];
    if (! ctrl.ajaxart) continue;
    aa_handleValidations(ctrl.ajaxart.params.vars._Field[0],ctrl,ctrl.ajaxart.data,ctrl.ajaxart.params,"on load");
  }
}

function aa_handleValidations(field,input,data,context,evt)
{
  if (! field.Validations) return;
  var validationStyle = context.vars._AppContext ? context.vars._AppContext[0].ValidationStyle : aa_first([],aa_parsexml('<xtml t="validation.DefaultOld" />'),'',context);
  if (!validationStyle) return true;
  validationStyle.inputForErrorClass = validationStyle.inputForErrorClass || aa_attach_global_css( validationStyle.CssForInput );

  if (input.ValidationErrorElement) $(input.ValidationErrorElement).remove();
  $(input).removeClass('aa_input_with_error ' + validationStyle.inputForErrorClass);
  $(input).removeClass('aa_mandatory_error');

  if ($(input).parents('.aa_hidden_field').length > 0) // a hidden field
	  return;
	  
  for (var i=0;i<field.Validations.length;i++) {
	  var vObj = field.Validations[i];
	  if (evt != "on save") {
	    if (evt != vObj.CheckValidation && evt != "on load") continue;
	    if (evt == "on load" && vObj.CheckValidation == "on save") continue;
	  }
	  var pass = ! aa_tobool(vObj.Validation(data,context));
	  if (!pass) {
	      input.Error = ajaxart_multilang_text(aa_totext(vObj.ErrorMessage(data,context)),context);
	      $(input).addClass('aa_input_with_error ' + validationStyle.inputForErrorClass);
		  
		  var errorText = ajaxart_multilang_text(aa_totext(vObj.ErrorMessage(data,context)),context);
		  if (vObj.AddTitleToErrorMessage) errorText = ajaxart_multilang_text(field.Title + ' ' + errorText,context);
		  
 		  var div = aa_renderStyleObject(validationStyle,{
			  errorText: errorText,
			  Error: errorText,
			  init: function(settings) {
 			    this.showError = settings.showError;
 			    this.jbShowErrorSummary = settings.showErrorSummary;
 		      },
 		      styleObject: validationStyle,
 		      showError: function() {}
		  },context);
		  $(div).addClass('aa_validation_error');
		  if (vObj.Mandatory) $(div).addClass('aa_mandatory_error'); 
		  
		  if (vObj.HideErrorMessage) aa_hide(div);
		  input.ValidationErrorElement = div;
		  var insertFunc = function() {
			  div.showError(input,div,vObj.Mandatory);
		  }
		  if (input.parentNode != null) 
			insertFunc();
		  else 
			aa_addOnAttach(input,insertFunc);
		  
		  return;
	  }
  }
}
function aa_validation_removeNoCloseMessages()
{
	$(document).find('.aa_noclose_message').remove();
}
function aa_validation_showerror(topControl,error,validationDiv,context)
{
	if (!topControl) return;
    
	if (!validationDiv || !validationDiv.styleObject) {
	  var validationStyle = aa_first([],aa_parsexml('<xtml t="validation.DefaultOld" />'),'',ajaxart.newContext());
      // deprecated - for old dialogs
	  validationDiv = aa_renderStyleObject(validationStyle,{
		  errorText: '',
		  init: function(settings) {
		    this.jbShowErrorSummary = settings.showErrorSummary;
	      }
	  },context);
	} else {
		var validationStyle = validationDiv.styleObject;
	}
	$(topControl).find('.aa_noclose_message').remove();

	if (! validationDiv.jbShowErrorSummary) return;
	
	var summary = $('<div class="aa_noclose_message" />').addClass(aa_attach_global_css(validationStyle.CssForSummary))[0];
	summary.innerHTML = error || '';
	validationDiv.jbShowErrorSummary(topControl,summary);
	aa_fixTopDialogPosition();
}
function aa_passing_validations(topControl)
{
	if (topControl == null) return true;
	var context = ajaxart.newContext();
	
	$(topControl).find('.aa_noclose_message').remove();
	var optionals = $(topControl).find('.aa_hasvalidations');
	for(var i=0;i<optionals.length;i++) {
	  var elem = optionals[i];
	  if (elem.updateValue) elem.updateValue();
	  aa_handleValidations(elem.jbCell.Field,elem,elem.jbCell.FieldData,elem.jbCell.jbContext,'on save');
	  context = elem.jbCell.jbContext;
	}
	
	var errorInput = $(topControl).find('.aa_mandatory_error')[0];
	if (errorInput && errorInput.jbShowErrorSummary) { aa_validation_showerror(topControl,errorInput.Error,errorInput,context); return false;}
	
	var errors = $(topControl).find('.aa_validation_error');
	if (errors.length > 0) {
		if (errors[0].jbShowErrorSummary) {
		  aa_validation_showerror(topControl,ajaxart_multilang_text(errors[0].innerHTML,context),errors[0],context);
		  errors[0].innerHTML = "";
		}
		return false;
	}
	
	return true;
}

function aa_add_field_type_triplet(field,style,data,context)
{
	field.Control = function(field_data,ctx) {
		ctx = aa_ctx(ctx,{_Field: [field]});
		var cntr = ctx.vars._Cntr && ctx.vars._Cntr[0];
		var rawtext = field.Text ? ''+field.Text(field_data,ctx) : aa_totext(field_data,ctx);
		var text = rawtext.replace(/\n/g,'</BR>');
		var properties = {
			text: text,
			Field: field,
			FieldData: field_data,
			Context: context,
			rawtext : rawtext,
			val: aa_totext(field_data,ctx),
			totext: function() {
				return aa_totext(field_data,ctx);
			},
			readonly: ajaxart_field_is_readOnly(cntr,field,ctx),
			set: function(value) {
				if (aa_totext(value) == aa_totext(field_data)) return; 
			    if (! field.ManualWriteValue) {
			    	ajaxart.writevalue(field_data,value);
			    	aa_invoke_field_handlers(field.OnUpdate,this.jbInput,null,field,field_data);
			    }
			    if (field.Validations) aa_handleValidations(field,this,data,context,"on change");
			},
			data: field_data[0],
			initInput: function(classOrElement) {
				this.jbInput = $(this.getInnerElement(classOrElement))[0];
				aa_init_std_input(this.jbInput,this);
			}
		};
		var out = aa_renderStyleObject(style,properties,ctx);
/*		var jElem = $(style.Html);
		var object = aa_api_object(jElem,properties);
		var control = aa_apply_style_js(object,style,ctx);
		if (control) jElem = $(control);
		aa_api_object(jElem,properties);	// re-assigning properties
		jElem.addClass(aa_attach_global_css(style.Css));
		
		return [jElem[0]];
*/
		return [out];
	}
}

function aa_init_std_input(input,inputObject)
{
	var field = inputObject.Field;
	var field_data = inputObject.FieldData;
	var context = inputObject.Context;
	
	input.jbInput = input;
	var textbox = inputObject;
	var text = textbox.totext();
	
	input.onfocus = function(e) {
	    // select all on next timer
	    ajaxart.controlOfFocus = this;
	    aa_invoke_field_handlers(field.OnFocus,this,e,field,field_data);
		for(var parent=input.parentNode;parent;parent=parent.parentNode) if (parent.onfocus) parent.onfocus(e);  // for HoverOnPopup 
	    return true;
	}
	input.onblur = function(e) {
		for(var parent=input.parentNode;parent;parent=parent.parentNode) if (parent.onblur) parent.onblur(e);  // for HoverOnPopup 
	    ajaxart_field_RefreshDependentFields(field,this,context);
	    aa_invoke_field_handlers(field.OnBlur,this,e,field,field_data);
	    if (field.Validations) aa_handleValidations(field,this,field_data,context,"on blur");
	    return true;
	}

	input.onkeydown = function(e) {
		e = e || event;
		
	    if (field.KeyPressValidator && e.keyCode != 8) // backspace is fine 
	    {
			var ch = String.fromCharCode(e.keyCode);
			if (! field.KeyPressValidator.test(ch)) return aa_stop_prop(e);
	    }
	    aa_invoke_field_handlers(field.OnKeydown,this,e,field,field_data);
	    
		if (aa_intest && e.CharByChar)
			input.value += String.fromCharCode(e.keyCode);

		return true;
	}
	input.onmousedown = function(e) {
		e = e || event;
	    aa_invoke_field_handlers(field.OnMouseDown,this,e,field,field_data);
		return true;
	}
	input.onmouseup = function(e) {
		e = e || event;
	    aa_invoke_field_handlers(field.OnMouseUp,this,e,field,field_data);
		return true;
	}
	
	// oninput is for mouse context menu of cut,paste
	input.oninput = function(e) {
		input.updateValue(e);
	}
	// support paste,cut for IE8,IE7
	if (ajaxart.isIE78) {
		$(input).bind('cut paste',null,function(e) {
			setTimeout(function() {
				input.updateValue(e);	
			},50);
		});
	}
	input.onkeyup = function(e) {
		var input = this;
		e = e || event;

		var keyCode = e.keyCode;
		if (keyCode == undefined && !aa_intest && !aa_inuiaction) return; // a mouse click !!!
		aa_invoke_field_handlers(field.OnKeyup,this,e,field,field_data,{isObject: true, KeyCode: ['' + keyCode], CtrlKey: aa_frombool(e.ctrlKey) });
		var codes = [9,13,16,17,18,27, 63277,63276]; // controls and navigation are masked
		for(var i=0;i<codes.length;i++)
			if (keyCode == codes[i]) return true;
		
	    if (field.KeyPressValidator && keyCode != 8) // backspace is masked 
	    {
			var ch = String.fromCharCode(keyCode);
			if (! field.KeyPressValidator.test(ch)) return aa_stop_prop(e);
	    }
	    if (e.keyCode)
	    	input.KeyUp = true;
    	input.updateValue(e);
	    input.KeyUp = null;
		return true;
	}
	input.Blur = function() {
		$(this).blur();
	}
	input.Refresh = function()
	 { 
		var input = this;
		if (input.RefreshDescriptionForEmptyText)
			input.RefreshDescriptionForEmptyText();
		if (input.jbApiObject) input.jbApiObject.trigger('refresh');
	 }

	input.getValue = function() { return this.value; }
	input.updateValue = function(e) 
	{
	    if (! field.ManualWriteValue)
	    	textbox.set(this.value);
	}
	input.value = text;
	input.setAttribute('value',text); // so the tests will pass on all browsers
}

// aspect_utils.js

function ajaxart_uiaspects_container(context) 
{
	if (context.vars._Cntr)
		return context.vars._Cntr[0];
	return null;
}

function ajaxart_uiaspects_select(new_selected,selected,method,ctx,focus) 
{
	  var top_cntr = ajaxart_topCntr(new_selected);
	  if (top_cntr != null)
		  top_cntr.Select(new_selected,selected,method,ctx,focus);
}

function ajaxart_uiaspects_append(item_elem,to_append) // append text/image inside aaitem. 
{
	    if (item_elem.titleTd != undefined)
	    	var parent = item_elem.titleTd;
	    else
	    	var parent = item_elem;
	    var first_ul = $(parent).children().filter('.aa_list,.aa_container');
	    if (first_ul.length > 0)
	    	parent.insertBefore(to_append,first_ul[0]);
	    else
	    	parent.appendChild(to_append);
}
function ajaxart_uiaspects_refreshElements(elems,focus)
{
	  if (elems.length == 0) return;
	  var cntr = $(elems[0]).parents('.aa_container')[0].Cntr;
	  var new_selected = null;

	    var new_elems = [];
	    for(var i=0;i<elems.length;i++)
		{
	    	var new_elem = cntr.createNewElement(elems[i].ItemData,new_elems,cntr.Context);
	    	$(elems[i]).replaceWith(new_elem);
	    	aa_remove(elems[i],true); // memory leaks
	    	if ($(elems[i]).hasClass('aa_selected_item') ) 
	    		new_selected = new_elem;
		}
		var newcontext = aa_ctx(cntr.Context,{_Elems: new_elems } );
	    for(var i=0;i<cntr.Aspects.length;i++) {
	    	ajaxart.trycatch( function() {
	    		aa_runMethod([],cntr.Aspects[i],'InitializeElements',newcontext);
	    	}, function(e) { ajaxart.logException(e); });
	    }
	    if (new_selected)
	    	ajaxart_uiaspects_select($(new_selected),$(),"auto",cntr.Context,focus);
	    return new_elems;
}

function aa_items(cntr) 
{ 
	if (cntr.IsSingleItem)
		return (cntr.Items == null || cntr.Items.length == 0 || cntr.Items[0].Items.length == 0) ? [] : [cntr.Items[0].Items[0]];

	var source_cntr = cntr;
	if (cntr.InheritsItems)
	{
		source_cntr = source_cntr.Context.vars._ParentCntr[0];
		while (source_cntr && source_cntr.IsVirtualGroup)
			source_cntr = source_cntr.Context.vars._ParentCntr[0];
	}
	if (!source_cntr) return [];
	var result;
	if (source_cntr.FilteredWrappers && cntr.WrappersAsItems)
		result = source_cntr.FilteredWrappers;
	else if (source_cntr.FilteredWrappers)
	{
		result = [];
		var wrappers = source_cntr.FilteredWrappers;
		for(var i=0;i<wrappers.length;i++)
			result.push(wrappers[i].__item || wrappers[i]);
	}
	else if (source_cntr.FilteredItems)
		return source_cntr.FilteredItems;
	else
		result = source_cntr.Items[0].Items;
	return result;
}
function aa_wrappers(cntr) 
{ 
	return cntr.FilteredWrappers;
}

function ajaxart_uiaspects_addElement(item_data,cntr,parent_elem,create_only)
  {
	  var context = cntr.Context;
	  var new_element = cntr.createNewElement(item_data,null,context);

	  if (new_element)
	  {
		  if (parent_elem == null)
			  var parent = cntr.Ctrl;
		  else
			  var parent = parent_elem;
		  var top = ajaxart_find_list_under_element(parent);
		  if (!create_only)
		  {
			  if (! ajaxart.isxml(item_data) && item_data[0]) item_data[0].__NewItem = true;
			  
			  cntr.DataHolder = null;
			    aa_RunAsyncQuery([item_data, cntr],aad_FilterAndSort,context,function(dataview) {	// for compression: aad_FilterAndSort()
			    	// compare and add new elem
			    	var item_before;
			    	for(var i=0;i<cntr.FilteredWrappers.length-1;i++) // do not look at the last item
			    	{
			    		if (item_data[0] == cntr.FilteredWrappers[i].__item) {  
			    			item_before = cntr.FilteredWrappers[i+1].__item;
			    			break;
			    		}
			    	}
			    	var elem_before = $(top).find('>.aa_item').filter(function() { return this.ItemData[0] == item_before })[0];
			    	if (cntr.FilteredWrappers.length == 0 || item_before == cntr.FilteredWrappers[cntr.FilteredWrappers.length-1].__item || !elem_before)
			    		cntr.insertNewElement(new_element,top);
			    	else
				    	$(new_element).insertBefore(elem_before);
			    });
			    if (! ajaxart.isxml(item_data)) delete item_data['__NewItem'];
		  }
		  
	      $(top).find('>.noitems').remove();
	  }

	  var newcontext = aa_ctx(context,{_Elems: [new_element], _Cntr: [cntr]} );
	  for(var i=0;i<cntr.Aspects.length;i++)
    		aa_runMethod([],cntr.Aspects[i],'InitializeElements',newcontext)

      if ($(parent).find('>.aa_list').length > 0 && $(parent).find('>.collapsable').length == 0 && cntr.CollapseElem && parent.ItemData)
  	    cntr.CollapseElem($(parent),false);
    		
      aa_invoke_cntr_handlers(cntr,cntr.ContainerChange,[],cntr.Context);

	  return new_element;
  }

function ajaxart_topCntr(item) {
	  var parents = [];
	  if (item.hasClass('aa_container')) 
		  parents = item.get();
	  var parents = parents.concat(item.parents().filter(function() 
			  { return $(this).hasClass('aa_container') || $(this).hasClass('DetailsControl'); }
			  ).get());
	  if (parents.length == 0) return null;
	  if ($(parents[0]).hasClass('DetailsControl')) return parents[0].Cntr;
	  
	  var top_cntr = null;
	  for(var i=0;i<parents.length;i++) // while hasClass aa_inherit_selection
	  {
		  var parent = parents[i];
		  if ($(parent).hasClass('DetailsControl')) break;
		  if (parent.Cntr.Select)
			  top_cntr = parent;
		  if ( ! $(parent).hasClass('aa_inherit_selection'))
			  break;
	  }
	  if (top_cntr)
		  return top_cntr.Cntr;
	  return null;
}
function ajaxart_getsection(context) {
	var out = context.vars['_Section'];
	if (out == null || out.length == 0) return null;
	return out[0];
}
function ajaxart_itemlist_getSelectedItems(cntr)
{
	var selected = $(cntr.Ctrl).find(".aa_selected_item").filter(aa_visible);
	var out = [];
	for(var i=0;i<selected.length;i++)
		ajaxart.concat(out,selected[i].ItemData);
	
	return out;
}
function aa_find_header(cntr) { return aa_find_just_in_container(cntr,'.aa_container_header',true); }
function aa_find_footer(cntr) { return aa_find_just_in_container(cntr,'.aa_container_footer',true); }
function aa_find_list(cntr) { return aa_find_just_in_container(cntr,'.aa_list',true); }

function aa_find_just_in_container(cntr,cls,mustBeInContainer)  
{
	var ctrl = cntr.Ctrl;
	var elems = $(ctrl).find(cls);
	if (mustBeInContainer && elems.length == 1) return elems[0];
	
	// in case of container in container, do not return aa_list of inner container (e.g. fast add header footer )
	for (var i=0;i<elems.length;i++)
		if ( $(elems[i]).parents('.aa_container')[0] == ctrl )
			return elems[i];
	
    return null;
}

function ajaxart_find_aa_list(cntr) { 
	return ajaxart_find_list_under_element(cntr.Ctrl); 
}

function ajaxart_find_list_under_element(elem)
{
	if ($(elem).hasClass('aa_list')) return elem;
	
	var lists = $(elem).find('.aa_list');
	if (lists.length == 1) return lists[0];
	
	// in case of container in container, do not return aa_list of inner container (e.g. fast add header footer )
	var top_ctrl = $(elem).hasClass('aa_container') ? elem : $(elem).parents('.aa_container')[0];
	for (var i=0;i<lists.length;i++)
		if ( $(lists[i]).parents('.aa_container')[0] == top_ctrl )
			return lists[i];
	
    return null;
}

function ajaxart_tree_next(elem,cntr)
{
	if (!cntr.Tree) return elem.next();
	
	if (!elem[0].collapsed)
	{
		var next = elem.find('.aa_item').filter(aa_visible_selectable).slice(0,1);
		if (next.length > 0) return next;
	}
	
	next = elem.next();
	if (next.length > 0) return next;

	var parent = elem.parent();
	while (parent.length > 0)
	{
		if (parent.next().hasClass("aa_item"))
			return parent.next();
		if (parent.next().hasClass("aa_list"))
		{
			var next = ajaxart_tree_next(parent.next());
			if (next.length > 0) return next;
		}
		parent = parent.parent();
	}
	return [];
}
function ajaxart_tree_prev(elem,cntr)
{
	var prev = elem.prev();
	if (!cntr.Tree) return prev;
	
	if (prev.length > 0)
	{
		if (! prev[0].collapsed)
		{
			var last_child = prev.find('.aa_item').filter(aa_visible_selectable).slice(-1);
			if (last_child.length > 0) return last_child;
		}
		return prev;
	}
	
	var parent = elem.parent();
	while (parent.length > 0)
	{
		if (parent.hasClass("aa_item"))
			return parent;
		if (parent.hasClass("aa_list"))
		{
			var last_child = parent.prev().find('.aa_item').filter(aa_visible_selectable).slice(-1);
			if (last_child.length > 0) 
				return last_child;
		}
		parent = parent.parent();
	}
	return parent;
}
function ajaxart_isLeaf(elem)
{
	return $(elem).find('>.aa_list,>.aa_container').find('.aa_item').length == 0;
}
function ajaxart_add_foucs_place(li)
{
	$(li).addClass('aa_focus_place');
	li.setAttribute("tabindex","1");
}
function aa_visible() { return this.hidden != true } // && $(this).parents(':hidden').length == 0 TODO: not working in chrome
function aa_visible_selectable() { return this.hidden != true } // && ! $(this).parents('.aa_container').slice(0,1).hasClass('aa_non_selectable') } // && $(this).parents(':hidden').length == 0 

function ajaxart_container_elems(cntr)
{
	var elems = [];
	
	var add_elems_in_cntr = function(node)
	{
		var jnode = $(node);
		if (node.hidden == true) return;
		if (jnode.hasClass('aa_item'))
			elems.push(node);
		if (jnode.hasClass('aa_container')) return;
		$(node).children().each(function() { add_elems_in_cntr(this) } );
	}
	
	var list = ajaxart_find_aa_list(cntr); 
	if (list != null)
		add_elems_in_cntr(list);
	
	return elems;	
}

function aa_prepare_calculated_fields_for_item(fields,item_data,context)
{
	for(var i=0;i<fields.length;i++) {
		var field = fields[i];
		if (field.DefaultValue) field.FieldData(item_data,context);
		if (field.IsGroup && field.Fields) {
			var field_data = field.FieldData(item_data,context);
			aa_prepare_calculated_fields_for_item(field.Fields,field_data,context);
		}
		// TODO: add logic if calculated
	}
}
function aa_buildSectionControl(cntr,field,field_data,item_data,ctx)
{
	var newContext = aa_ctx(ctx,{_Field: [field], FieldTitle: [field.Title], _Item: item_data } );
	var style = field.SectionStyle;
	if (!style || !style.Html || field.HideTitle) {
		var out = $('<div class="aa_section"/>')[0];
		ajaxart_field_createCellControl(item_data,cntr,out,"control",field,field_data,newContext);  
		return out;
	}
	var jElem = $(style.Html);
	field.SectionImage = aa_init_image_object(field.SectionImage,item_data,ctx);
	
	var section = aa_api_object(jElem,{Title: field.Title ,Image: field.SectionImage});
	aa_defineElemProperties(section,'addSectionBody,updateCollapsed');
	if (field.SectionCollapsedByDefault) section.collapsed = true;
	
	section.addSectionBody = function(classOrElement) {
		var inner = this.getInnerElement(classOrElement);
		if (inner) 
		  ajaxart_field_createCellControl(item_data,cntr,inner,"control",field,field_data,newContext);
		if (this.collapsed) $(inner).css('display','none');
	}
	section.updateCollapsed = function(collapsed) {
		section.collapsed = collapsed;
	}
	jElem.addClass(aa_attach_style_css(style)).addClass('aa_section');
	aa_apply_style_js(section,style);
	return jElem[0];
}
function aa_buildSection(cntr,tr,field,item_data,properties_width,ctx)
{
	var newContext = aa_ctx(ctx,{_Field: [field], FieldTitle: [field.Title], _Item: item_data } );
	var field_data = ajaxart_field_calc_field_data(field,item_data,newContext);

	var value_td = document.createElement("TD");
	value_td.colSpan = 2;
	tr.appendChild(value_td);
	var li = aa_buildSectionControl(cntr,field,field_data,item_data,ctx);
	value_td.appendChild(li);
}
function aa_buildProperty(cntr,tr,field,item_data,properties_width,ctx,title_tr,dont_add_colon)
{
	  var newContext = aa_ctx(ctx,{_Field: [field], FieldTitle: [field.Title], _Item: item_data } );
	  var field_data = ajaxart_field_calc_field_data(field,item_data,newContext);
	  var value_td = document.createElement("TD");
	  if (field.HideTitle) { value_td.colSpan = 2; }
	  tr.appendChild(value_td);
	  
	  if ( ! field.HideTitle ) {
		  var title_td = document.createElement("TD");
		  title_td.className = "field propertysheet_title_td fld_" + field.Id + "_title";
		  if (properties_width)
			  $(title_td).width(properties_width + 'px');
		  var txt = field.Title;
		  if (txt != "" && !dont_add_colon) txt += ":";
		  title_td.innerHTML = txt;
		  
		  if (!title_tr) title_tr = tr;
		  title_tr.appendChild(title_td);
		  tr.appendChild(value_td);
	  }
	  
	  value_td.className = "propertysheet_value_td";
	  
	  ajaxart_field_createCellControl(item_data,cntr,value_td,cntr.CellPresentation,field,field_data,newContext); 
	  if (field.Description) {
		  var descElem = $('<div class="field_desc"/>').html(field.Description)[0];
		  value_td.appendChild(descElem);
	  }
	  if (field.Mandatory)
	  {
		  var jControl = $(value_td).find(".field_control");
		  if (jControl.length > 0)
		  {
			  $(title_td).addClass("aa_mandatory");
			  jControl.addClass("aa_mandatory");
		  }
	  }
}
function ajaxart_dataitems_save(data_items,fields,context,callback)
{
  if (data_items==null) return [];
  // TODO: recalc calculated fields before save
  ajaxart_async_Mark(context);
  
  var afterSave = function(originalData) { return function(data1,ctx) {
	  var data = data_items.Items;
	  if (originalData == null) originalData = []; else originalData = [originalData];
	  // call after save for the fields
	  ajaxart_fields_aftersave(data,data,originalData,fields,context);
	  
	  callback(data1,ctx);
	  if (ajaxart_async_IsFailure(ctx)) ajaxart_async_Failure(context);
	  ajaxart_async_CallBack([],context); 
  }}
  var info = aa_getXmlInfo(data_items.Items[0],context);
  aad_runMethodAsync(data_items,data_items.Save,data_items.Items,context,afterSave(info ? info.OriginalCopy : null));
}
function ajaxart_saveDetailsAndRefresh(item,fields,context,returnCallback) 
{
	var subset = context.vars._InnerItems[0];
	
	var callback = function(data1,ctx) {
		var cntr = ctx.vars._Cntr[0];
		var subset = context.vars._InnerItems[0];
		
		if (aa_tobool(context.vars.IsNewItem)) {
		    var parent = null;
		    
		    item = subset.Items;
		    var dataitems = cntr.Items[0];
		    if (dataitems.NewValueFromDetached) item = aa_runMethod(item,dataitems,'NewValueFromDetached',context);
		    var updatedElem = ajaxart_uiaspects_addElement(item,cntr,parent);
		}
		else {
			var all_elems = $(ajaxart_find_aa_list(cntr)).find('>.aa_item');
			var elems = [];
			for(var i=0;i<all_elems.length;i++)
				if (all_elems[i].ItemData && all_elems[i].ItemData[0] == item[0]) 
					elems.push(all_elems[i]);
			
			var updatedElem = ajaxart_uiaspects_refreshElements(elems);
		}
		if (ctx.vars._SaveActions)
			aa_runMethod(item,ctx.vars._SaveActions[0],'AfterSave',context);
		
		aa_refreshAfterDataItemsChanged(context);
		aa_invoke_cntr_handlers(cntr,cntr.ContainerChange,[],ctx);
		if (cntr.Ctrl.PopupObj)
			cntr.Ctrl.PopupObj.contents = cntr.Ctrl;

		if (returnCallback) returnCallback(data1,aa_ctx(ctx,{_ElemsOfOperation: [updatedElem]}));
		return [];
	}
	if (context.vars._SaveActions)
		aa_runMethod(subset.Items,context.vars._SaveActions[0],'BeforeSave',context);
	
	ajaxart_dataitems_save(subset,fields,context,callback);
}
function aa_aspectId(aspect) {
  if (aspect.ID) return aspect.ID;
  return aspect.XtmlSource[0].script.getAttribute('t');
}
function aa_dataitems_of_elem(elem)
{
	if ($(elem).hasClass('aa_container')) return elem.Cntr.Items[0];
	if ($(elem).hasClass('aa_treenode')) return elem._Items;
	
	var top = $(elem).parents('.aa_treenode,.aa_container')[0];
	return top._Items || top.Cntr.Items[0];
}
function aa_hasClass(elem,cls) {
	if (elem.className.indexOf(cls) == -1) return false;
	return $(elem).hasClass(cls);
}

function aa_init_itemdetails_object(object,originalItem,info,subset,page,context)
{
	if (subset.Save) subset.HasSave = true;
	
	object.ParentCntr = context.vars._Cntr[0];
	object.Save = function(data1,ctx2) {
		ajaxart_saveDetailsAndRefresh(originalItem,page.Fields,ctx2);
		object.ClearUrl();
	}
	object.SaveAndClose = function(data1,ctx2) {
		if (! aa_passing_validations(object.ParentCntr.Ctrl) ) return;
		object.HideDetails(data1,ctx2);
		ajaxart_saveDetailsAndRefresh(originalItem,page.Fields,aa_ctx(ctx2,{_Cntr: context.vars._Cntr}));
		object.ClearUrl();
	}
	object.Close = function(data1,ctx2) {
		object.HideDetails(data1,ctx2);
		object.ClearUrl();
	}
	object.Cancel = function(data1,ctx2) {
		var refresh = false;
	    if (info && info.Cancel) info.Cancel(data1,ctx2);
		
		object.HideDetails(data1,ctx2);
		object.ClearUrl();
		if (refresh)
			ajaxart_saveDetailsAndRefresh(originalItem,page.Fields,ctx2);
	}
	object.HideDetails = function() {}
	object.ElemsOfOperation = context.vars._ElemsOfOperation;
	object.RefreshMasterElement = function(data1,ctx) {
		var elem = object.ElemsOfOperation;
		if (!elem || elem.length == 0) return;
		var cntr = object.ParentCntr;
		if (cntr.Tree)
			aa_invoke_cntr_handlers(cntr,cntr.RefreshItemTextAndImage,elem,ctx);
		else {
			var new_elems = [];
	    	var new_elem = cntr.createNewElement(elem[0].ItemData,new_elems);
	    	$(elem).replaceWith(new_elem);
	    	if ($(elem).hasClass('aa_selected_item') ) $(new_elem).addClass('aa_selected_item');
	    	object.ElemsOfOperation = [new_elem];
		}
	}
	object.ClearUrl = function() {
	  aa_urlChange(context,"?"+object.ParentCntr.ID+"_open=;");
	}
	object.DataItems = object.ParentCntr.Items[0];
	var jparent = $(context.vars._ElemsOfOperation).parents('.aa_treenode,.aa_container');
	if (jparent.length > 0 && jparent[0]._Items) object.DataItems = jparent[0]._Items;
}

function aa_invoke_cntr_handlers(cntr,eventFuncs,data,ctx,extra)
{
	if (! eventFuncs || eventFuncs.RunningFlag) return;
	eventFuncs.RunningFlag = true; // avoid recursion
	var newContext = aa_ctx(ctx,{_Cntr: [cntr]});
	try
	{
		for(var i=0;i<eventFuncs.length;i++)
			eventFuncs[i](data,newContext,extra);
	}
	catch (e) {}
	eventFuncs.RunningFlag = false;
}


function aa_concat_atts(data,ctx)
{
	var item = data[0];
	if (!item) return '';
	if (typeof(item) == 'string') return [item];
	var result = '';
	if (ajaxart.isxml(item) && item.nodeType == 1)
	{
		var out = [];
		var atts = item.attributes;
		if (atts != null)
			for (var i = 0; i < atts.length; i++)
				result += atts.item(i).value + ", ";
		var subElem = item.firstChild;
		while (subElem) {
			var subElemTxt = subElem.firstChild;
			if (subElem.nodeType == 1 && subElemTxt && subElemTxt.nodeValue != '')
				if (subElemTxt.nodeType == 3 || subElemTxt.nodeType == 4) 
					result += subElemTxt.nodeValue + ", ";
			subElem = subElem.nextSibling;
		}
	}
	else if (ajaxart.isObject(item))
	{
		for(var i in item)
			if (i != 'isObject' && i.indexOf('__') != 0 && typeof(item[i]) == 'string')
				result += item[i] + ", ";
		if (item.Node)
			result += ", " + aa_concat_atts([item.Node],ctx);
		if (item.__item)
			result += ", " + aa_concat_atts([item.__item],ctx);
	}
	return [result];
}

function aa_add_partial_suffix(cntr,shownItems,totalItems,context)
{
	if (cntr.PartialView && cntr.PartialView.RemoveSummary)
		cntr.PartialView.RemoveSummary(cntr);

	if (shownItems == totalItems) return;
	cntr.PartialView = { isObject: true, From: 0, ShownItems: shownItems, TotalItems: totalItems }
	var header_footer = $(cntr.Ctrl).find('>.aa_container_footer');
	var summary = header_footer.find('.PartialViewSummary');
	if (summary.length == 0)
	{
		summary = $('<div></div>');
		summary.addClass('PartialViewSummary');
		header_footer.append(summary);
	}
	cntr.PartialView.ShowAll = function() { 
		cntr.PartialView.RemoveSummary(cntr);
		aa_recalc_filters_and_refresh(cntr,[],context,true);
	} 
	var show_all_items = $('<span class="aa_show_all_items">' + ajaxart_multilang_text('show all items',cntr.Context) + '</span>');
	show_all_items.click(function() { if (!window.aa_incapture) { cntr.PartialView.ShowAll(); }  } );
	summary.text(cntr.PartialView.ShownItems + ' ' + ajaxart_multilang_text('of',cntr.Context) + ' ' + cntr.PartialView.TotalItems);
	summary.append(show_all_items);
	cntr.PartialView.RemoveSummary = function(cntr)
	{
		var header_footer = $(cntr.Ctrl).find('>.aa_container_footer');
		var summary = header_footer.find('.PartialViewSummary');
		summary.remove();
	}
}

function aa_loading(cntr,context)
{
	cntr.PartialView = { isObject: true, Loading: true,
		RemoveSummary: function(cntr)
		{
			var header_footer = $(cntr.Ctrl).find('>.aa_container_footer');
			var summary = header_footer.find('.PartialViewSummary');
			summary.remove();
			aa_fire_async_finished();
		}
	}
	var header_footer = $(cntr.Ctrl).find('>.aa_container_footer');
	var summary = header_footer.find('.PartialViewSummary');
	if (summary.find('.aa_show_all_items').length > 0)
	{
		summary.remove();
		summary = header_footer.find('.PartialViewSummary');
	}

	if (summary.length == 0)
	{
		summary = $('<div class="PartialViewSummary"></div>');
		header_footer.append(summary);
	}
	var loading = summary.find('>.aa_loading');
	if (loading.length == 0)
	{
//		loading = $('<span class="aa_loading">' + ajaxart_multilang_text('loading ',cntr.Context) + '</span>');
		loading = $('<span class="aa_loading" />');
		summary.append(loading);
	}
	loading.text(loading.text() + '.');
}

function aa_recalc_filters_and_refresh(cntr,data,context,show_all)
{
	context = context || cntr.Context;
    var top = ajaxart_find_aa_list(cntr);
    if (!top) return;
    aa_RunAsyncQuery([data, cntr],aad_FilterAndSort,context,function(dataview) { aa_refresh_itemlist(cntr,aa_ctx(context,{DataView:dataview}),show_all) });// for compression: aad_FilterAndSort()
    //ajaxart_RunAsync([data, cntr],aad_FilterAndSort,context,function() { aa_refresh_itemlist(cntr,context,show_all) } );
}

function aa_refresh_itemlist(cntr,context,show_all)
{
	context = context || cntr.Context;
	show_all = show_all || cntr.DoNotUseIncrementalBuilder; 
	if (show_all) cntr.ShowAll = true;
    var top = ajaxart_find_aa_list(cntr);
	var items_data = aa_items(cntr);
	if (items_data == null) return;
	if (items_data.length == 0 && cntr.ControlForNoData) {
		var ctrl = cntr.ControlForNoData([],context)[0];
		$(ctrl).addClass('aa_list');
		aa_replaceElement(top,ctrl);
	}
	if (cntr.createNewElement)
	{
		if (cntr.IsSingleItem && items_data.length > 0) {  // Document
			aa_clear_cntr_items(top,cntr);
			var elem = cntr.createNewElement([items_data[0]],[],context);
			top.appendChild(elem);
			var newcontext = aa_ctx( cntr.Context, {_Elems: [elem] })
		    for(var i=0;i<cntr.Aspects.length;i++) 
		    	aa_runMethod([],cntr.Aspects[i],'InitializeElements',newcontext);
		    for(var i=0;i<cntr.PostActors.length;i++) 
			    ajaxart.runScriptParam([],cntr.PostActors[i].aspect.PostAction,context);
		} 
		else  // ItemList 
		{
	    	var all_elems = [];
	    	var chunkTimeLimit = cntr.ChunkLimitMSec || 200;
	    	var timeLimit = cntr.PageLimitMSec || 2000;
	    	var show_incremental = cntr.ShowIncrementalBuild == null ? true : cntr.ShowIncrementalBuild;
	    	if (show_all && !window.inJBartRefresh) {
	    		timeLimit = 60000;
	    		cntr.ShowAll = true;
	    	}
	    	else
	    		cntr.ShowAll = null;
	    	ajaxart_uiaspects_incrementalBuild(cntr,context,items_data,all_elems,chunkTimeLimit,timeLimit,show_incremental,cntr.ShowItemsInSyncMode);
		}
	}
	aa_invoke_cntr_handlers(cntr,cntr.ContainerChange,[],context);
}

function ajaxart_uiaspects_incrementalBuild(cntr,context,items_data,all_elems,chunkTimeLimit,timeLimit,show_incremental,syncmode)
{
	var incrementalBuilder = 
	{ 
		start: function() {
		    if (cntr.ItemText)
		    {
		    	// fixing createElement measurement - ItemText is calculated outside the measurement
		    	timeLimit = Math.floor(timeLimit / 15);
		    	chunkTimeLimit = Math.floor(chunkTimeLimit / 3);
		    }
		    var top = ajaxart_find_aa_list(cntr);
		    if (!top) return;

			this.startTime = new Date().getTime();
			if (show_incremental)
				aa_clear_cntr_items(top,cntr);
			if (cntr.Tree)
			{
				aa_clear_cntr_items(top,cntr);
				for(var i=0;i<items_data.length;i++)
					top.appendChild(cntr.createNewElement([items_data[i]],all_elems,context));
				this.build(items_data.length);
				return;
			}
			if (cntr.GroupByFields && cntr.GroupByFields.length > 0)
			{
				cntr.DoGroupBy();
				return;
			}
			this.build(0);
		},
		build: function(index) {
			aa_loading(cntr,context);  
			
			var top = ajaxart_find_aa_list(cntr);
			if (!top) return;
			var start = new Date().getTime();
			var start_index = index;
			var elems = [];
			if (!cntr.ShowAll && cntr.MaxItemsToShow)
				var max_length = Math.min(items_data.length,cntr.MaxItemsToShow);
			else
				var max_length = items_data.length;
			while(new Date().getTime() - start < chunkTimeLimit && index < max_length && index - start_index < 300)
			{
				var elem = cntr.createNewElement([items_data[index]],all_elems,context);
				if (elem && show_incremental) elems.push(elem); // to be appended after InitializeElements
	//			if (elem && show_incremental) top.appendChild(elem);
				index++;
			}
			var newcontext = aa_ctx( cntr.Context, {_Elems: all_elems })
		    for(var i=0;i<cntr.Aspects.length;i++) {
		    	ajaxart.trycatch( function() {
		    		aa_runMethod([],cntr.Aspects[i],'InitializeElements',newcontext);
		    	}, function(e) { ajaxart.logException(e); });
		    }
	    	for(var i in elems)	top.appendChild(elems[i]);		 
			
			if (index >= max_length || (new Date().getTime() - this.startTime) > timeLimit)
			{
				if (!cntr.Tree && !show_incremental) 
				{
					aa_clear_cntr_items(top,cntr);
					for(var i=0;i<all_elems.length;i++)
						top.appendChild(all_elems[i]);
				}
		    	
			    for(var i=0;i<cntr.PostActors.length;i++) {
			    	ajaxart.trycatch( function() {
				    	  ajaxart.runScriptParam([],cntr.PostActors[i].aspect.PostAction,cntr.Context);
			    	}, function(e) { ajaxart.logException(e); });
			    }
			    aa_add_partial_suffix(cntr,index,max_length,context);
			    return;
			}
			else
			{
				var nextTimer = function(builder) { setTimeout(function() { 
					if (!ajaxart.isattached(cntr.Ctrl)) return;
					if (cntr.IncrementalBuilder === builder) // stop if the incremental builder was replaced
						cntr.IncrementalBuilder.build(index);
				} ,1) };
			}
			if (!window.inJBartRefresh)
			  nextTimer(this);
		}
	}
	if (!syncmode) {
		cntr.IncrementalBuilder = incrementalBuilder;
		cntr.IncrementalBuilder.start();
	} else {	// syncronized mode, simply show all the items
		var top = ajaxart_find_aa_list(cntr);
		if (!top) return;
		var elems = [];
		for (var i=0; i<items_data.length; i++)
		{
			var elem = cntr.createNewElement([items_data[i]],all_elems,context);
			elems.push(elem); // to be appended after InitializeElements
		}
		var newcontext = aa_ctx( cntr.Context, {_Elems: all_elems })
	    for(var i=0;i<cntr.Aspects.length;i++) {
	    	ajaxart.trycatch( function() {
	    		aa_runMethod([],cntr.Aspects[i],'InitializeElements',newcontext);
	    	}, function(e) { ajaxart.logException(e); });
	    }
    	for(var i in elems)	top.appendChild(elems[i]);		 
	}
}
function aa_dummysubet(node) // will be removed after the xml refactor is completed and subsets will be no more
{
  var subset = { isObject: true, Items: [node] }
  subset.Save = function(data1,ctx) {
	  var info = aa_getXmlInfo(node,ctx);
	  if (info.Save) return info.Save([node],ctx);
  }
  return subset;
}

function aa_apply_css(elem,css)
{
	if (!css) return;
	if (typeof(css) != "string")
		css = ajaxart.totext_array(css);
	if (css == "") return;
	if (css.indexOf(":") > 0)	// inline
		elem.style.cssText = elem.style.cssText + ";" + css;
	else	// class
		elem.className = elem.className + " " + css;
}

function ajaxart_getUiPref(prefix,property,context) { 
	if (context.vars._UIPref == null) return null;
	var newContext = aa_ctx(context,{ Prefix: [prefix] , Property: [property]} );
	var result = ajaxart.totext_array( aa_runMethod([],context.vars._UIPref[0],'GetProperty',newContext) );
	if (result == "") return null;
	return result;
}
function ajaxart_setUiPref(prefix,property,value,context) { 
	if (context.vars._UIPref == null) return;
	var newContext = aa_ctx(context,{ Prefix: [prefix] , Property: [property], Value: [value] } );
	aa_runMethod([],context.vars._UIPref[0],'SetProperty',newContext);
}
function aa_clear_cntr_items(list_top,cntr)
{
	var prev = null,iter = list_top.firstChild;
	while (prev != null || iter != null) {
		if (prev && prev.className && prev.className.indexOf('aa_item') > -1) 
			prev.parentNode.removeChild(prev);
		
		prev = iter;
		if (iter) iter = iter.nextSibling;
	}
	jBart.trigger(cntr,'clearItems');
}

function aa_checked(input,checked)
{
	input.checked = checked; input.defaultChecked = checked;
}

function aa_html_findclass(elem,className) 
{
  if ($(elem).hasClass(className)) return $(elem);
  return $(elem).find('.'+className);
}


// image.js

aa_gcs("image", {
	Image: function (profile,data,context)  // GC of image.Image
	{
		var image = {};
		image.Size = aa_text(data,profile,'Width',context)+','+aa_text(data,profile,'Height',context);

		ajaxart.run(data,profile,'ImageProportions',aa_ctx(context,{ _Image: [image] }));		
//		image.KeepImageProportions = aa_bool(data,profile,'KeepImageProportions',context);
		image.Url = function(data1,ctx) {
			var url = aa_text(data1,profile,'Url',aa_merge_ctx(context,ctx));
			url = url.replace(/_jbartImages_/g,aa_base_images());
			return [url];
		};
		return [image];
	},
	KeepProportions: function (profile,data,context) {
		var image= context.vars._Image[0];
		image.KeepImageProportions = true;
		image.FillImage = aa_bool(data,profile,'FillImage',context);
		image.CenterImage = aa_bool(data,profile,'CenterImage',context);
	},
	ZoomAndOffet: function (profile,data,context) {
		var image= context.vars._Image[0];
		image.ZoomAndOffet = true;
		image.OffsetY = '' + aa_int(data,profile,'OffsetY',context) + '%';
		image.OffsetX = '' + aa_int(data,profile,'OffsetX',context) + '%';
		image.Zoom = '' + aa_int(data,profile,'Zoom',context) + '%';
	},
	ImageOld: function (profile,data,context)  // GC of image.ImageOld
	{
		var image = { };
		image.SecondUrl = aa_text(data,profile,'SecondUrl',context);
		image.Size = aa_text(data,profile,'Size',context);
		
		image.KeepImageProportions = aa_bool(data,profile,'KeepImageProportions',context);
		aa_setMethod(image,'Url',profile,'Url',context);
		image.asDivBackground = aa_bool(data,profile,'AsDivBackground',context);
		if (image.asDivBackground) {
			image.x = image.y = 0;
			var size = image.Size.split(',');
			image.width = size[0] + 'px';
			image.height = size[1] + 'px';
		}
		return [image]
	},
	ImageInCss: function(profile,data,context)
	{
		return [ { InCssClass: true, CssClass: aa_text(data,profile,'CssClass',context)} ];
	},
	ImageInSprite: function(profile,data,context)
	{
		var image = { inSprite: true };
		var size = aa_text(data,profile,'Size',context).split(',');
		image.width = size[0] + 'px';
		image.height = size[1] + 'px';
		var pos = aa_text(data,profile,'PositionInSprite',context).split(',');
		image.x = '-' + pos[0] + 'px';
		image.y = '-' + pos[1] + 'px';

		var hover_pos = aa_text(data,profile,'PositionForHover',context).split(',');
		if (hover_pos.length > 1) {
			image.hoverx = 0 - parseInt(hover_pos[0]) + 'px';
			image.hovery = 0 - parseInt(hover_pos[1]) + 'px';
		}
		var active_pos = aa_text(data,profile,'PositionForClick',context).split(',');
		if (active_pos.length > 1) {
			image.activex = '-' + active_pos[0] + 'px';
			image.activey = '-' + active_pos[1] + 'px';
		}
		
		aa_setMethod(image,'Url',profile,'Url',context);
		return [image]
	},
	ShowImage: function(profile,data,context)
	{
		var image = aa_first(data,profile,'Image',context);
		if (image && image.Url) image.StaticUrl = aa_totext(image.Url(data,context));
		var out = $('<span/>')[0];
		aa_set_image(out,image,true);
		return [out];
	}
});

aa_gcs("field_type", {
	Image: function (profile,data,context)  // GC of field_type.Image
	{
		var field = context.vars._Field[0];
		field.ImageStyle = aa_first(data,profile,'Style',context); 
		field.Control = function(field_data,ctx) {
			var image = aa_first(field_data,profile,'Image',context);
			if (image && image.Url)
			  image.StaticUrl = aa_totext(image.Url(field_data,context));
			
			var style = field.ImageStyle;
			
			return [aa_renderStyleObject(style,{ Field: field, image: image, data: field_data[0] },context)];
		}
	}
});



function aa_setImage(elem,imageObject,settings)
{
	if (imageObject && imageObject.css3Image) return aa_image(imageObject,aa_defaults(settings,{ el: elem }));
	/* aa_setImage is used to add an image to the DOM. 
	   It is a general purpose functions and can be used by any type. 
	   For image sprites the imageObject should have the property inSprite as true and also the following properties: width, height, x, y
	*/
	elem = $(elem)[0]; /* to accept $ objects as well*/
	if (!elem) return;
	settings = settings || {};
	if (!settings.hasOwnProperty('removeIfNoImage')) settings.removeIfNoImage=true;

	if ((!imageObject || !imageObject.url) && settings.removeIfNoImage) {
		$(elem).remove();
		return;
	}
	if (!imageObject) return;
	var $img,$div;

	if (imageObject.url && imageObject.url.indexOf('_jbartImages_') > -1)
		imageObject.url = imageObject.url.replace(/_jbartImages_/g,aa_base_images());
	
	if (imageObject.inSprite) {
		$div = $('<div/>').appendTo(elem);
		$div.width(imageObject.width).height(imageObject.height);
		$div.css('display','inline-block');
		$div.css('background-image','url('+imageObject.url+')');
		$div.css('background-position','' + imageObject.x + ' ' + imageObject.y);
	} else if (imageObject.zoomAndOffet) {
		$div = $('<div/>').appendTo(elem);
		$div.width(imageObject.width || '100px').height(imageObject.height || '100px');
		$div.css('display','inline-block');
		$div.css('background-image','url('+imageObject.url+')');
		$div.css('background-position','' + imageObject.offsetX + ' ' + imageObject.offsetY);
		$div.css('background-repeat','no-repeat');
		$div.css('background-size',imageObject.zoom);
	} else if (imageObject.width && imageObject.height && imageObject.keepImageProportions) {
		keepImageProportions();
	} else {
		while (elem.firstChild) aa_remove(elem.firstChild,true);
		if (imageObject.boxWidth) $(elem).width(imageObject.boxWidth).css('overflow-x','hidden');
		if (imageObject.boxHeight) $(elem).height(imageObject.boxHeight).css('overflow-y','hidden');

		$img = $('<img/>').attr('src',imageObject.url).appendTo(elem);
		if (imageObject.marginLeft) $img.css('margin-left',imageObject.marginLeft+'px');
		if (imageObject.marginTop) $img.css('margin-top',imageObject.marginTop+'px');

		// removeAttr is needed for IE
		if (imageObject.width) $img.attr('width',imageObject.width); else $img.removeAttr('width');
		if (imageObject.height) $img.attr('height',imageObject.height); else $img.removeAttr('height');
	}

	if (imageObject.baseImageObject && imageObject.baseImageObject.onImageCreated) imageObject.baseImageObject.onImageCreated(elem,imageObject,settings);

	function keepImageProportions() {
		while (elem.firstChild) aa_remove(elem.firstChild,true);
		$div = $('<div/>').appendTo(elem).css('overflow','hidden').width(imageObject.width).height(imageObject.height);
		$img = $('<img/>').appendTo($div);
		if (imageObject.fillImage || imageObject.centerImage) {
			$img[0].onload = onLoadImage;
			$img.attr('src',imageObject.url);
			if ($img[0].width) {
			  onLoadImage(); // already loaded
			} else {
				$img.css('width',imageObject.width+'px');
			}
		} else {
			$img.css('max-width','100%').css('max-height','100%');
			$img.attr('src',imageObject.url);
		}
	}

	function onLoadImage() {
		$img.css('width','');
		var imageRatio = $img[0].width / $img[0].height;
		var desiredRatio = imageObject.width / imageObject.height;
		if (imageObject.fillImage) {
			if (imageRatio == desiredRatio) {
				$img.css('max-width','100%').css('max-height','100%;');
			} else if (imageRatio < desiredRatio) {
				$img.css('max-width','100%');
				if (imageObject.centerImage) {
					var actual_width = Math.min($img[0].width,imageObject.width);	// image does not expand beyond its size
					var virtual_height = actual_width / imageRatio;				// image height before cutting it
					var marginTop = (imageObject.height-virtual_height) * 0.5;

					// var marginTop = ((imageRatio-desiredRatio)*imageObject.height) * 0.5;
					$img.css('margin-top',marginTop+'px');
				}
			} else {
				$img.css('max-height','100%');
				if (imageObject.centerImage) {
					var actual_height = Math.min($img[0].height,imageObject.height); // image does not expand beyond its size
					var virtual_width = imageRatio * actual_height;					 // image width before cutting it
					var marginLeft = (imageObject.width-virtual_width) * 0.5;
					// var marginLeft = ((desiredRatio-imageRatio)*imageObject.width) * 0.5;
					$img.css('margin-left',marginLeft+'px');
				}
			}
		}
		else if (imageObject.centerImage) {
			$img.css('max-width','100%').css('max-height','100%');
			if (imageRatio < desiredRatio) {
				var actual_height = Math.min($img[0].height,imageObject.height); // image does not expand beyond its size
				var virtual_width = imageRatio * actual_height;					 // image width as shown
				$img.css('margin-left', imageObject.width/2 - virtual_width/2 + 'px');
			}
			else {
				var actual_width = Math.min($img[0].width,imageObject.width);	// image does not expand beyond its size
				var virtual_height = actual_width / imageRatio;				// image height as shown
				$img.css('margin-top', imageObject.height/2 - virtual_height/2 + 'px');

			}
		}
	}
}

// aa_create_static_image_object converts an old image object to the new imageObject
function aa_create_static_image_object(imageObject)
{
	if (!imageObject) return null;
	if (typeof(imageObject) == 'string') return { url: imageObject};
	if (imageObject && imageObject.css3Image) return imageObject;
	
	var width = imageObject.width, height = imageObject.height;
	if (imageObject.Size) {
		var sizeArr = aa_split(imageObject.Size,',',false);
		width = sizeArr[0] ? parseInt(sizeArr[0]) : null;
		height = sizeArr[1] ? parseInt(sizeArr[1]) : null;
	}

	return {
		url: imageObject.StaticUrl,
		width: width,
		height: height,
		inSprite: imageObject.inSprite,
		x: imageObject.x,
		y: imageObject.y,
		keepImageProportions: imageObject.KeepImageProportions,
		fillImage: imageObject.FillImage,
		zoomAndOffet: imageObject.ZoomAndOffet,
		offsetY: imageObject.OffsetY,
		offsetX: imageObject.OffsetX,
		zoom: imageObject.Zoom,
		centerImage: imageObject.CenterImage,
		baseImageObject: imageObject,
		marginTop: imageObject.MarginTop,
		marginLeft: imageObject.MarginLeft,
		boxWidth: imageObject.boxWidth,
		boxHeight: imageObject.boxHeight
	};
}

/**  menu.js **/

aa_gcs("menu",{
  ContextMenu: function (profile,data,context)
  {
	var items = [];
	var itemProfiles = ajaxart.subprofiles(profile,'Item');
	for (prof in itemProfiles)
		ajaxart.concat(items,ajaxart.run(data,itemProfiles[prof],'',context));
	var ctx_menu_input = ajaxart.dynamicText(data,"%$_ContextMenuContext/Input%",context);
	var fromMenu = ajaxart.dynamicText(data,"%$_ContextMenuContext/FromMenu%",context);
	
	var footerMessage = aa_text(data,profile,"FooterMessage",context);
	var headerMessage = aa_text(data,profile,"HeaderMessage",context);
	aad_closeCurrentContextMenu();
	var menu = $('<div class="contextmenu" style="z-index: 9000"/>');
	menu.addClass( aa_attach_global_css(aa_text(data,profile,'Css',context),context,'contextmenu') );
	if (headerMessage != "") {
		var header = $('<div class="context_menu_header_message" />'); header.text(headerMessage);	menu.append(header);
	}
	menu.bind('contextmenu', function() { return false; });
	var ul = $('<ul class="contextmenu_ul">'); menu.append(ul);
	for (var i=0; i<items.length; i++) {
		var image = ajaxart.totext(items[i].Image);
		var text = ajaxart.totext(items[i].Text);
		var img = $('<img class="contextmenu_image" />').attr("src",image);
		var span = $('<span class="contextmenu_span" />').text(text);
		var li = $('<li class="contextmenu_li" />').append(img).append(span);
		li.addClass("menu_item_" + ajaxart.totext(items[i].ID));
		ul.append(li);	
		li[0]["menu_item"] = items[i];
		li[0]["input"] = items[i].Input;
		if (i==0) li.addClass("selected");
		li.click(function(e) {
			if (window.aa_incapture) return;
			var newContext = ajaxart.clone_context(this.menu_item.Action.context);
			ajaxart.setVariable(newContext,"MenuItemInfo", [this.menu_item]);
			aad_closeCurrentContextMenu();
			ajaxart.run(this.input, this.menu_item.Action.script, "" ,newContext);
		} );
		li.hover(
				    function() { $(this.parentNode).find('.selected:visible').removeClass('selected'); $(this).addClass('selected'); },
				    function() {}
		);
	}
	if (footerMessage != "") {
		var footer = $('<div class="context_menu_footer_message" />'); footer.text(footerMessage);	menu.append(footer);
	}
	$(document).mouseup( function(e) {
		if (e.which == 3) return;// double-click
		if (ajaxart.currentContextMenu == null) return;
		var element = (typeof(e.target)== 'undefined')? e.srcElement : e.target;
		if ($(element).parents(".contextmenu").length == 0)	// clicking out
			aad_closeCurrentContextMenu();
	});
	$(document).mousemove( function(e) {
		if (ajaxart.currentContextMenu == null) return;
		var x = e.pageX;
		var y = e.pageY;
		var cm_left = aa_absLeft( ajaxart.currentContextMenu[0] );
		var cm_top = aa_absTop( ajaxart.currentContextMenu[0] );
		var cm_right = cm_left + $( ajaxart.currentContextMenu[0] ).width();
		var cm_bottom = cm_top + $( ajaxart.currentContextMenu[0] ).height();
		
		// if ( x < cm_left - 80 || x > cm_right + 80 || y < cm_top - 40 || y > cm_bottom + 80) {
		// 	aad_closeCurrentContextMenu();
		// }
		return true;
	});
	var focusControl = ajaxart.getVariable(context, "_CurrentFocus");
	if (focusControl.length > 0 && focusControl[0].alreadyBounded != true) {
		focusControl[0]["alreadyBounded"] = true;
		$(focusControl[0]).keyup( function(e) {
			if (ajaxart.currentContextMenu == null) return;
			  if (e.keyCode == 13) { // enter
				  var selected = ajaxart.currentContextMenu.find('.selected')[0];
					var newContext = ajaxart.clone_context(selected.menu_item.Action.context);
					ajaxart.setVariable(newContext,"MenuItemInfo", [selected.menu_item]);
					aad_closeCurrentContextMenu();
					ajaxart.run(selected.input, selected.menu_item.Action.script, "" ,newContext);
			  }
			ajaxart_stop_event_propogation(e);
		});
		$(focusControl[0]).keydown( function(e) {
			if (ajaxart.currentContextMenu == null) return;
			  if (e.keyCode == 27)  // esc
				  aad_closeCurrentContextMenu();
			  if (e.keyCode == 38 || e.keyCode == 40) { // arrows up/down
				  var jSelected = ajaxart.currentContextMenu.find('.selected');
				  var nextItem;
				  if (e.keyCode == 38)  // up
					  nextItem = jSelected[0].previousSibling;
				  if (e.keyCode == 40)  // arrow down
					  nextItem = jSelected[0].nextSibling;;
				  if (nextItem != null) {
					  jSelected.removeClass('selected');
					  $(nextItem).addClass('selected');
				  }
			  }
			  ajaxart_stop_event_propogation(e);
			  return false;
		});
	}
	$(document).keypress( function(e) {
		if(e.keyCode == 27) // esc
				aad_closeCurrentContextMenu();
	});
	menu.appendTo("body");
	ajaxart.currentContextMenu = menu;
	var controlForPosition = ajaxart.getControlElement(context,true);
	if (ajaxart.getVariable(context, "_CurrentFocus").length > 0)
		controlForPosition = ajaxart.getVariable(context, "_CurrentFocus")[0];
	if (fromMenu == 'vmenu') {
		controlForPosition = $(ajaxart.getControlElement(context)).find('>*');
		if (controlForPosition.length > 0)
			controlForPosition = controlForPosition[0];
		else
			controlForPosition = null;
	}
 	var isFixedPosition = aa_hasPositionFixedParent(controlForPosition);
	ajaxart.dialog.positionPopup(menu, controlForPosition, null, true,context);
	menu.css('position',isFixedPosition ? 'fixed' : 'absolute');
  },
  ContextMenuContents: function (profile,data,context)
  {
    if (ajaxart.currentContextMenu == null) return [];
    var menu = ajaxart.currentContextMenu[0];
    return [menu];
  },
  CloseContextMenu: function (profile,data,context)
  {
	aad_closeCurrentContextMenu();
	return ["true"];
  }
});

function aad_closeCurrentContextMenu()
{
  if (!ajaxart.currentContextMenu) return;
  
  $(document).unbind('click').unbind('keypress').unbind('mousemove');
  ajaxart.currentContextMenu.fadeOut(175);
  ajaxart.currentContextMenu[0].parentNode.removeChild(ajaxart.currentContextMenu[0]);
  
  ajaxart.currentContextMenu = null;
};


aa_gcs("operation", {
	ContainerOperations: function (profile,data,context)
	{
		return [{ isObject: true, addOperations: function()
		{
		var menu = context.vars._Menu[0];
		var cntr = context.vars._Cntr[0];
		var items = ajaxart.runScriptParam(data,cntr.Operations,cntr.Context);
		var target = aa_text(data,profile,'Target',context);
		if (target == '') 
			target = 'all';
		for(var i=0;i<items.length;i++)
		{
			var op = items[i];
			var elem = context.vars._ElemsOfOperation && context.vars._ElemsOfOperation[0];
			var item_cntr = elem ? $(elem).parents('.aa_container')[0].Cntr : null;
			if (!op.Target || op.Target[0] == 'item' && elem 
						&& (item_cntr == cntr || menu.IncludeOperationsFromParent ))
				menu.Items.push(op);
			else if (op.Target && op.Target[0] == 'new' && (target == 'new' || target == 'all'))
				menu.Items.push(op);
			else if (op.Target && op.Target[0] == 'items' && target == 'all')
				menu.Items.push(op);
		}
		
		return [];
		}}];
	},
	Menu: function (profile,data,context)
	{
		var menu = { isObject : true,  Items : [], IncludeOperationsFromParent: true };
		var cntr = context.vars._Cntr[0];
		menu.Presentation = function(data1, ctx) { return aa_run_component("ui.ButtonAsHyperlink",data1,ctx); };
		aa_addMethod(menu,'Style',profile,'Style',context);
		var newContext = aa_ctx(context,{_Menu: [menu], _ElemsOfOperation: cntr.ElemsOfOperation() , _ItemsOfOperation: cntr.ItemsOfOperation() } );
		menu.Items = ajaxart.run(data,profile,'Operations',context);
		var aspects = ajaxart.runsubprofiles(data,profile,'MenuAspect',newContext);
		for(var i=0;i<aspects.length;i++)
			if (aspects[i].addOperations) aspects[i].addOperations();
		
		menu.Ctrl = ajaxart.runNativeHelper(data,profile,'Control',newContext);

		return [menu]; //.Ctrl;
	},
	Operations: function (profile,data,context)
	{
		return ajaxart.runsubprofiles(data,profile,'Operation',context);
	},
	RemoveDisabled: function (profile,data,context)
	{
		return [{ isObject: true, addOperations: function()
		{
		var menu = context.vars._Menu[0];
		var cntr = context.vars._Cntr[0];
		var result = [];
		for(var i=0;i<menu.Items.length;i++)
		{
			op = menu.Items[i];
			var disabled = op.Disabled(context.vars._ItemsOfOperation,context); 
			if (! disabled)
				result.push(op);
		}
		menu.Items = result;
		return [];
		}}];
	},
	Operation: function (profile,data,context)
	{
		var titleFunc = function(op)  { return function(data1,ctx)
		{
			if (ctx.vars._Cntr) {
				var cntr = ctx.vars._Cntr[0];
				if (op.Shortcut != '' && cntr.ShortcutsEnabled != null && cntr.ShortcutsEnabled[0] == 'true' )
					return [ajaxart_multilang_text(aa_text(data1,profile,'Title',ctx),ctx) 
						+ ' ('+ aa_text(data1,profile,'Shortcut',ctx) +')'];
				return ajaxart_multilang_run(data1,profile,'Title',ctx);
			} else {
				return ajaxart_multilang_run(data1,profile,'Title',ctx);
			}
		}}
		var actionFunc = function(op)  { return function(data1,ctx)
		{
			if (aa_incapture) return;
			var cntr = ctx.vars._Cntr[0];

			var dataitems = cntr.Items[0] , child_dataitems = [];
			if (ctx.vars._ElemsOfOperation && ctx.vars._ElemsOfOperation.length > 0) {
				var top = $(ctx.vars._ElemsOfOperation[0]).parents('.aa_treenode,.aa_list')[0];
				if ($(top).hasClass('aa_treenode'))
					dataitems = top._Items;
				var childUls = $(ctx.vars._ElemsOfOperation[0]).find('>.aa_treenode');
				for(var i=0;i<childUls.length;i++)
					child_dataitems.push(childUls[i]._Items);
			}
			var newContext = aa_ctx(ctx,{_Items: [dataitems] , ChildDataItems: child_dataitems });
			var items = data1;
			if (op.Target && op.Target[0] == 'items')
			{
				var elems  = ajaxart_container_elems(cntr);
				items = [];
				for(var i=0;i<elems.length;i++)
					ajaxart.concat(items,elems[i].ItemData);
				newContext = aa_ctx(ctx,{_ElemsOfOperation: elems, _ItemsOfOperation: items} );
			}
			
			return ajaxart.run(items,profile,'Action',newContext);
		}}
		var op = { isObject : true, isOperation : true };
		op.Id = aa_text(data,profile,'ID',context);
		op.ID = [ op.Id ];
		op.Shortcut = aa_text(data,profile,'Shortcut',context);
		op.Target = ajaxart.run(data,profile,'Target',context);

		aa_setMethod(op,'Icon',profile,'Icon',context);
		aa_setMethod(op,'CssClass',profile,'CssClass',context);
		aa_setMethod(op,'CleanTitle',profile,'Title',context);
		op.Disabled = function(data1,ctx) { return aa_bool(data1,profile,'Disabled',aa_merge_ctx(context,ctx)) };
		ajaxart_addScriptParam_js(op,'Title',titleFunc(op),context);
		ajaxart_addScriptParam_js(op,'Action',actionFunc(op),context);

		var newContext = aa_ctx(context,{_Operation: [op]} );
		ajaxart.runsubprofiles(data,profile,'Aspect',newContext);
		
		op.Context = newContext;

		if ( aa_bool(data,profile,'WritableOnly',context) && context.vars._Cntr && context.vars._Cntr[0].ReadOnly ) return [];
		
	    return [op];
	}

});

aa_gcs("ui", {
	IfThenElse: function (profile,data,params)
	{
		  return aa_ifThenElse(profile,data,params);
	}
});

function aad_find_field(field_id,class_to_guess,return_cell)
{
	var root = aa_intest ? aa_intest_topControl : document;
	var class_to_find = field_id ? "fld_" + field_id : class_to_guess;
	if (!class_to_find) return [];
	var fields = $(root).find('.' + class_to_find);
	return return_cell ? fields.parent().get() : fields.get();
}

/************* dialog **************/
ajaxart.dialog = { openPopups: []};
ajaxart.dialog.currentPopup = function(context)
{
  if (ajaxart.dialog.openPopups.length > 0)
	  return ajaxart.dialog.openPopups[ajaxart.dialog.openPopups.length-1];
}

ajaxart.dialog.closeDialog = function()
{
	var topDialogDiv = openDialogs.pop();
	aa_remove(topDialogDiv.dialogContent,false);
	aa_remove(topDialogDiv,false);
	aa_noOfOpenDialogs--;
	return topDialogDiv;
}
ajaxart.dialog.positionPopup = function(popup, callerControl, __to_del, noPaddingToCallerControl, context, forceUpperPopup)
{
 	var isFixedPosition = callerControl && aa_hasPositionFixedParent(callerControl);
	var jPopup = $(popup);
	$(popup).css('display','inline-block');
	var scroll = isFixedPosition ? {x: 0,y: 0} : ajaxart_scroll_offset();
	var screen = aa_screen_size();
	
	var popup_pos = { left:0, top:0 }, caller_control_d = { width:0, height:0 };
	if (callerControl != null) {
		popup_pos = {  left : aa_absLeft(callerControl) 
			  ,top: aa_absTop(callerControl) + callerControl.offsetHeight  };
		caller_control_d = { width: jQuery(callerControl).width(), height:jQuery(callerControl).height()};
	}
	else if (context && context.vars.MousePos)
		popup_pos = { left: context.vars.MousePos[0].pageX, top: context.vars.MousePos[0].pageY };
	
	var padding = (noPaddingToCallerControl) ? 0 : 2;
	if (forceUpperPopup || (screen.height + scroll.y < popup_pos.top + jPopup.height() &&
			scroll.y <= popup_pos.top - jPopup.height() - caller_control_d.height))	// going up
	{
		popup_pos.top  -= jPopup.height() + caller_control_d.height + padding ;
		popup.RePosition = function() {
			ajaxart.dialog.positionPopup(popup, callerControl, null, noPaddingToCallerControl, context, true);
		}
	}
	else
		popup_pos.top += padding;
	
	if ((screen.width + scroll.x < popup_pos.left + jPopup.width() &&
			scroll.x <= popup_pos.left - jPopup.width() - caller_control_d.width))	// going left
	{
		popup_pos.left  = screen.width + scroll.x - jPopup.width() - caller_control_d.width;
		popup.RePosition = function() {
			ajaxart.dialog.positionPopup(popup, callerControl, null, noPaddingToCallerControl, context, true);
		}
	}
	  if (isFixedPosition) { jPopup[0].style.position = 'fixed'; }
	
	if (jQuery(callerControl).parents('.right2left').length > 0) {
		jPopup.css("right",document.body.clientWidth - caller_control_d.width - popup_pos.left);
		jPopup.addClass('right2left');
	}
	else
		jPopup.css("left",popup_pos.left);
	jPopup.css("top",popup_pos.top).fadeIn(150);
}
