// tree html structure:
// --------------------
// <div class="aa_tree_node">   
//   <div class="aa_tree_node_line">
//     <div class="aa_tree_node_expandbox" />
//     <div class="aa_tree_node_text" />
//   </div>
//   <div class="aa_tree_node_subnodes">
//     <div class="aa_tree_node leaf" />
//		 ...
//   </div>
// </div>
// <div class="aa_tree_node collapsed">

function aa_dragDropTreeItems(settings) 
{
	var rootElem = settings.rootElem;

	var draggedElem = null;
	var DAndDOwner = "";
	var SuspectItemDrag = null;
	var isFixedPosition = false;
	var SpaceElem = null;
	var OriginalElem;

	rootElem.onmousedown = treeSuspectDrag;
	rootElem.onmouseup = treeUnSuspectDrag;

	function treeSuspectDrag(e) {
		var $elem = $((typeof(event)== 'undefined') ? e.target : event.srcElement);
		if ($elem.hasClass('aa_tree_node_expandbox')) return true;
		if (DAndDOwner) return true;
		SuspectItemDrag = { elem: $elem, mousePos : aa_mousePos(e)};
		rootElem.jonmousemoveOrig = rootElem.onmousemove;
		rootElem.jonmouseupOrig = rootElem.onmouseup;
		rootElem.jonmousedownOrig = rootElem.onmousedown;
		rootElem.onmousemove = treeDrag;
		return false;
	}

	function treeFixNodeLine(node)
	{
		// var elem = $(list).parents('.aa_tree_node')[0];
		
		// if ($(list).children('.aa_item').length > 0 && $(elem).children('.hitarea').length == 0 )
		// {
		// 	$(elem).addClass('non_leaf');
		// 	elem.collapsed = false;
			
		// 	var hitarea = document.createElement('div');
		// 	hitarea.className = "hitarea collapsable " + cntr.hitAreaCssClass;
		// 	elem.insertBefore(hitarea,elem.firstChild);
		// }
		// if (originalList && $(originalList).children('.aa_item').length == 0)
		// 	$(originalList).parent().children('.hitarea').remove();
	}

	function treeAddPlaceHolders(parent,at_elem,last_element)
	{
		var place_holder = document.createElement('div');
		place_holder.className = 'aa_move_place_holder';

		if (last_element)
			parent.appendChild(place_holder);
		else
			$(place_holder).insertBefore(at_elem);

		place_holder.dragEnd = function(original)
		{
			var item_data = draggedElem.ItemData;
			var parentElem = $(this).parents('.aa_tree_node')[0];
			if (last_element) {
				settings.moveAtEnd(item_data,parentElem.ItemData);
			} else {
				settings.moveBefore(item_data,at_elem.ItemData);
			}
			$(this).replaceWith(original);
			original.style.display = '';
			original.display = '';
			
			treeFixNodeLine(parentElem);
		};
	}


	function treeDragBegin(e,simulate) {
		isFixedPosition = aa_hasPositionFixedParent(rootElem);
		var elem = SuspectItemDrag.elem;
		var item_elem = elem;
		if (!elem.hasClass("aa_tree_node"))
			item_elem = elem.parents('.aa_tree_node').slice(0,1);

		if (!item_elem[0]) return aa_stop_prop(e);
		var posx = aa_absLeft(item_elem[0],false) - aa_absLeft(rootElem,false);
		var posy = aa_absTop(item_elem[0],false) - aa_absTop(rootElem,false);
		// do not drag root item, if there is one root
		var isRoot = !item_elem.parent().hasClass('aa_tree_node');
		if (isRoot && item_elem.parent().children().length == 1)
			return aa_stop_prop(e);

		DAndDOwner = "TreeDragAndDrop";
		ajaxart_disableSelection(document.body);
		
		var oElem = draggedElem = item_elem[0].cloneNode(true);
		SpaceElem = item_elem[0].cloneNode(true);
		OriginalElem = item_elem[0];
		draggedElem.ItemData = SpaceElem.ItemData = item_elem[0].ItemData;
	    
	  OriginalElem.style.display = 'none';
	  OriginalElem.display = 'none';

		$(draggedElem).addClass('aa_dragged_elem');
		$(SpaceElem).addClass('aa_dragged_space_elem');
		ajaxart_disableSelection(SpaceElem);
		ajaxart_disableSelection(draggedElem);

	  rootElem.appendChild(draggedElem);
	  rootElem.jbPrevPosition = rootElem.style.position;
	  rootElem.style.position = 'relative';	// locating relative to tree top to solve scrolling issues
		
		var all_parents = $.merge( [rootElem] , $(rootElem).find('.aa_tree_node_subnodes') );
		for(var i=0;i<all_parents.length;i++)
		{
			var $parent = $(all_parents[i]);
			var children = $parent.find('>.aa_tree_node');
			for (var j=0;j<children.length;j++) {
				var $node = $(children[j]);
				if ($node.hasClass('aa_dragged_elem') || $node.parents('.aa_dragged_elem').length > 0) continue;
				treeAddPlaceHolders($parent[0],$node[0],false);				
			}
			treeAddPlaceHolders($parent[0],null,true);
		}
		
		// link place holders
		var holders = $(rootElem).find('.aa_move_place_holder');
		for(var i=0;i<holders.length;i++)
		{
			holders[i].jbPreHolder = i > 0 ? holders[i-1] : null;
			holders[i].jbNextHolder = i < holders.length-1 ? holders[i+1] : null;
		}
		var mousepos = SuspectItemDrag.mousePos;		
		
		draggedElem.style.position = 'absolute';
		draggedElem.style.left = posx + 'px';
		draggedElem.style.top = posy + 'px';

		if (!simulate) 
		{
			document.onmouseup = treeDragEnd;
			rootElem.jb_onkeydownOrig = document.onkeydown; 
			document.onkeydown = function(e){
				if (e.keyCode == 27) treeDragEnd(e,true);	// esc
				return true;
			};
		}
		
		return aa_stop_prop(e);
	};

	function treeDrag(e) {
		var mousepos = aa_mousePos(e);
		if (SuspectItemDrag) {
			var distance = Math.abs(mousepos.y - SuspectItemDrag.mousePos.y);
			if (distance < 5) return aa_stop_prop(e);
			var elem = SuspectItemDrag.elem;
			if (! elem.hasClass('aa_tree_node'))
				elem = elem.parents('.aa_tree_node').slice(0,1);

				treeDragBegin(e);
				SuspectItemDrag = null;
			}
	
			if (!draggedElem) return true;
			var actualY = mousepos.y;
			if (isFixedPosition) actualY -= window.pageYOffset;
			
			// keep drag in container boundaries			
			var nearest = { distance: 1000 };
			if (!SpaceElem.jbPositioned) // first time only. look for nearest place holder
			{
				// look for place holder near
				var holders = $(rootElem).find('.aa_move_place_holder').filter(function() {return $(this).parents(':hidden').length == 0} );
				for(var i=0;i<holders.length;i++) {
					var distance = Math.abs(aa_absTop(holders[i]) - actualY);
					if (nearest.distance > distance) nearest = { distance: distance, holder: holders[i]};
				}
				if (nearest.holder) {
					nearest.holder.appendChild(SpaceElem);
					SpaceElem.jbPositioned = true;
				}
				else {
					ajaxart.log('Can not find nearest place holder');
					treeDragEnd({},true);
					return;
				}
			}

			var holder = SpaceElem.parentNode;
			if (!holder) return;
			// calc next up & down
			var pre_holder = holder.PreHolder;
			while ($(pre_holder).parents(':hidden').length > 0)
				pre_holder = pre_holder.PreHolder;
			var next_holder = holder.NextHolder;
			while ($(next_holder).parents(':hidden').length > 0)
				next_holder = next_holder.NextHolder;

			// go up or down or stay in place
			var draggedElemTop = aa_absTop(draggedElem,false); 
			var draggedElemBottom = aa_absTop(draggedElem,false) + $(draggedElem).height();
			
			if (pre_holder && aa_absTop(pre_holder,false) > draggedElemTop )
				pre_holder.appendChild(SpaceElem);
			if (next_holder && aa_absTop(next_holder,false) < draggedElemBottom )
				next_holder.appendChild(SpaceElem);
			
			draggedElem.style.top = actualY - aa_absTop(top,false) + 'px';
			var left = aa_absLeft(SpaceElem,false);
			if ( aa_is_rtl(top_cntr.Ctrl) )
				left = left + $(SpaceElem).width() - $(draggedElem).width();  
			draggedElem.style.left = left - aa_absLeft(top,false) + 'px';
			return aa_stop_prop(e);
		};
			 
		function treeDragEnd(e, cancel) {
			if (cancel) {
	  		OriginalElem.show();
	  	} else {
				if (SpaceElem.parentNode)
					SpaceElem.parentNode.dragEnd(top_cntr.OriginalElem);
				top_cntr.OriginalElem = null;
			}

			top.onmousemove = top_cntr.onmousemoveOrig;
			top.onmousedown = top_cntr.onmousedownOrig;
			top.onmouseup = top_cntr.onmouseupOrig;
			top.style.position = top.jbPrevPosition;

			document.onmouseup = null;
			document.onkeydown = null;
			draggedElem = null;

			$(document).find('.aa_move_place_holder').remove();
			$(document).find('.aa_dragged_elem').remove();

			ajaxart_restoreSelection(document.body);
			DAndDOwner = "";
			return aa_stop_prop(e);
		};

		function treeUnSuspectDrag(e) {
			if (DAndDOwner != "") return true;
			if (SuspectItemDrag) {
				SuspectItemDrag = null;
				top.onmousemove = top_cntr.onmousemoveOrig;
				top.onmouseup = top_cntr.onmouseupOrig;
			}
			return true;
		}

}
