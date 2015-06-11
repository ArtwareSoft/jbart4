// allows drag and drop of items
function aa_dragDropItems(settings)
{
	var list = settings.parent;
	var isTable = list.tagName.toLowerCase() == 'tbody';
	var listTopDiv = list;

	var draggedElem = null,spaceElem = null,DAndDOwner = "",SuspectItemDrag = null,OriginalElem = null;
	var onmousemoveOrig=null,listOriginalPosition=null,onkeydownOrig=null;
	
	aa_bind_ui_event(list,'mousedown',suspectDrag);
	aa_bind_ui_event(list,'mouseup',unSuspectDrag);
		
	function inElem(elem,top,left) {
		return (elem.offsetTop < top && elem.offsetLeft < left && 
				elem.offsetTop + elem.offsetHeight > top && 
				elem.offsetLeft + elem.offsetWidth > left); 
	}
	function elemAtPosition(top,left) {
		for(var elem=list.firstChild;elem;elem=elem.nextSibling) {
			if (inElem(elem,top,left) && settings.isItemElement(elem)) 
				return elem;
		}
	}
	function numbersBetween(num,num1,num2) {
		return ((num1 <= num && num <= num2) || (num2 <= num && num <= num1)); 
	}
	function findCandidate(elemAtPos,spaceElem,mousepos) {
		for(var iter=spaceElem;iter;iter=iter.nextSibling) {
			if (iter == elemAtPos) {
				var sameLine = (spaceElem.nextSibling && spaceElem.nextSibling.offsetTop == spaceElem.offsetTop);
				if (!sameLine && draggedElem.jbLastMouse &&  mousepos.y < draggedElem.jbLastMouse.y) return null;
				return spaceElem.nextSibling;
			}
		}
		var sameLine = (spaceElem.previousSibling && spaceElem.previousSibling.offsetTop == spaceElem.offsetTop);
		if (!sameLine && draggedElem.jbLastMouse && mousepos.y > draggedElem.jbLastMouse.y) return null;
		return spaceElem.previousSibling;
	}
	
	function drag(e) {
		var offsetParent = listTopDiv;
		
		var mousepos = aa_mousePos(e,true);
		var mouseTop = mousepos.y - aa_absTop(offsetParent);
		var mouseLeft = mousepos.x - aa_absLeft(offsetParent);
		var posyDelta = aa_absTop(offsetParent);

		if (SuspectItemDrag)
		{
			var distance = Math.abs(mousepos.y - SuspectItemDrag.mousePos.y) + Math.abs(mousepos.x - SuspectItemDrag.mousePos.x);
			if (distance < 5) return aa_stop_prop(e);
			var elemAtMousePos = elemAtPosition(mouseTop,mouseLeft);
			if (! elemAtMousePos)
				unSuspectDrag();
			else
				dragBegin(elemAtMousePos,e);
			SuspectItemDrag = null;
			
			return true;
		}
		if (!draggedElem) return true;
		var elemAtMousePos = elemAtPosition(mouseTop,mouseLeft);

		// move dragged elem
		draggedElem.style.top = (mouseTop - posyDelta - draggedElem.initialMouseOffset.top)  + 'px'; 
		draggedElem.style.left = (mouseLeft - draggedElem.initialMouseOffset.left)  + 'px';
		if (isTable) {
			draggedElem.style.left = '0px';
		}
			
		if (elemAtMousePos == spaceElem) return aa_stop_prop(e);

		if (!elemAtMousePos) return aa_stop_prop(e); // can be fixed so the external elem will be the candidate
		var candidate = findCandidate(elemAtMousePos,spaceElem,mousepos);
		if (!candidate) return aa_stop_prop(e);
		
		$(spaceElem).css('box-shadow','inset 0 0 5px 0 #999');
		if (isTable) {
			if (candidate.nextSibling && isGoingDown(candidate,spaceElem))
			  list.insertBefore(spaceElem,candidate.nextSibling); // going down
			else 
			  list.insertBefore(spaceElem,candidate); // going up
		} else {
			var margin = 3;
			var candidateBeforeSpace = (candidate.nextSibling == spaceElem);

			if (candidateBeforeSpace)
				list.insertBefore(spaceElem,candidate);
			else 
				list.insertBefore(spaceElem,candidate.nextSibling);		
		}
		
		draggedElem.jbLastMouse = mousepos;
		return aa_stop_prop(e);
	}
	function isGoingDown(candidate,spaceElem) {
		for(var iter=candidate;iter;iter=iter.nextSibling)
			if (iter == spaceElem) return false;
		return true;
	}
	function dragEnd(e,cancel) {
	  ajaxart_restoreSelection(document.body);
		jBart.trigger(settings.cntr,'dragEnd');
		list.removeChild(draggedElem);
		if (!cancel)
			jQuery(spaceElem).replaceWith(OriginalElem);
		else
			list.removeChild(spaceElem);
		OriginalElem.style.display = '';
		OriginalElem.display = '';
		

		list.onmousemove = onmousemoveOrig;
		list.style.position = listOriginalPosition;
		document.onkeydown = onkeydownOrig;
		document.onmouseup = null;
		draggedElem = null;
		
		var nextElem = null;
		for(var elem=OriginalElem.nextSibling;elem;elem=elem.nextSibling) {
			if (settings.isItemElement(elem)) {
				nextElem = elem;
				break;
			}
		}
		
		try {
			if (nextElem) 
				settings.moveBefore(OriginalElem,nextElem);
			else 
				settings.moveToEnd(OriginalElem);
		} catch(e) {
			ajaxart.logException(e,'Could not complete drag and drop in the model');
		}
		
	  DAndDOwner = "";
		return aa_stop_prop(e);
	}
	function dragBegin(item_elem,e) {
		jBart.trigger(settings.cntr,'dragBegin');
		ajaxart_disableSelection(list);
		DAndDOwner = "DragAndDropItems";
		var posx = aa_absLeft(item_elem);
		var posy = aa_absTop(item_elem);
		var offsetParent = listTopDiv;
		var posyDelta = aa_absTop(offsetParent);
		
		draggedElem = item_elem.cloneNode(true);
		OriginalElem = item_elem;
		list.appendChild(draggedElem);
		spaceElem = item_elem.cloneNode(true);
		spaceElem.jbItem = item_elem.jbItem;
		list.insertBefore(spaceElem,OriginalElem);
		
		OriginalElem.style.display = 'none';
		OriginalElem.display = 'none';

		jQuery(draggedElem).addClass(settings.draggedCssClass);
		jQuery(spaceElem).addClass(settings.draggedSpaceCssClass);

		if (isTable) {
			var tds = jQuery(draggedElem).find('>td');
			for(var i=0;i<tds.length;i++)
				jQuery(tds[i]).width(jQuery(tds[i]).width());
		}
		
		draggedElem.style.position = 'absolute';
		
		var mousepos = SuspectItemDrag.mousePos;
//		draggedElem.initialMouseOffset = { top: mousepos.y - posy, left: mousepos.x - posx } ;
		draggedElem.initialMouseOffset = { top: mousepos.y - posy - posyDelta, left: mousepos.x - posx } ;
		draggedElem.style.left = posx + 'px';
		draggedElem.style.top = (posy - posyDelta) + 'px';

		document.onmouseup = dragEnd;
		onkeydownOrig = document.onkeydown; 
		document.onkeydown = function(e)
		{
			if (e.keyCode == 27) 
				dragEnd(e,true);
			return true;
		}
		
		ajaxart_disableSelection(document.body);
		return aa_stop_prop(e);
	}

	function suspectDrag(e) {
		if (DAndDOwner != "") return true;
		if (settings.canStartDrag && !settings.canStartDrag(e.clientX,e.clientY)) return;
		
	    listTopDiv = list.tagName.toLowerCase() == 'div' ? list : jQuery(list).closest('div')[0];

		listOriginalPosition = listTopDiv.style.position;
		listTopDiv.style.position = 'relative';
		
		SuspectItemDrag = { mousePos : aa_mousePos(e,true), time: new Date().getTime()};
		onmousemoveOrig = list.onmousemove;
		list.onmousemove = drag;
		return true;
	}

	function unSuspectDrag(e) {
		if (DAndDOwner != "") return true;
		ajaxart_restoreSelection(list);
		if (SuspectItemDrag)
		{
			SuspectItemDrag = null;
			list.onmousemove = onmousemoveOrig;
			listTopDiv.style.position = listOriginalPosition;
		}
		return true;
	}
}