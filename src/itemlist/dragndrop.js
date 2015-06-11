// This file contains utility functions for drag and drop

function aa_dragAndDropTableColumns(table,settings)
{
	settings = aa_extend({
		draggedSpaceCssClass: 'aa1_dragged_space_elem',
		draggedCssClass: 'aa1_dragged_elem',
		onDrop: function() {},
		rtl: false
	},settings);  
	
	var thead = $(table).find('>thead')[0];
	if (!thead || table.jbDragAndDropColsInitialized) return;
	table.jbDragAndDropColsInitialized = true;
	
	aa_registerTableHeaderEvent(thead,'mousedown',suspectDrag,'TableColumnsDragAndDrop','no dominant');
	aa_registerTableHeaderEvent(thead,'mousemove',checkSuspection,'TableColumnsDragAndDrop','suspect');
	aa_registerTableHeaderEvent(thead,'mouseup',unSuspectDrag,'TableColumnsDragAndDrop','suspect');
	aa_registerTableHeaderEvent(thead,'mouseout',unSuspectDrag,'TableColumnsDragAndDrop','suspect');
	aa_registerTableHeaderEvent(thead,'mousemove',_drag,'TableColumnsDragAndDrop','dominant');

	var ltr = !settings.rtl;
	var rtl = !ltr;

	function _drag(e,thead,th) 
	{
		var mousepos = aa_mousePos(e);
		var oElem = thead.draggedElem;
		if (!oElem) return true;
				
		oElem.style.left = (mousepos.x - oElem.mouseX) + 'px'; 

		var spaceLeft = aa_absLeft(thead.spaceElem);
		var nextRight = ltr ? -1 : 5000;
		if ($(thead.spaceElem).next().length > 0)	{
			var next = $(thead.spaceElem).next()[0];
			nextRight = aa_absLeft(next) + ltr * next.offsetWidth;
		}
		var prevLeft = ltr ? -1 : 5000;
		if ($(thead.spaceElem).prev().length > 0)	{
			var prev = $(thead.spaceElem).prev()[0];
			prevLeft = aa_absLeft(prev) + rtl * prev.offsetWidth;
		}

		var draggedRight = aa_absLeft(oElem) + ltr * (oElem.offsetWidth + oElem.deltaMouseX);
		var draggedLeft = aa_absLeft(oElem) + rtl * (oElem.offsetWidth + oElem.deltaMouseX);
		var nearRight = nextRight < draggedRight + 5;
		if (rtl) nearRight = !nearRight;
		var nearLeft = prevLeft > draggedLeft - 5;
		if (rtl) nearLeft = !nearLeft;

		var trs = $(table).find('>tbody>tr').get();
		
		if (nearRight) {
			if (thead.spaceElem.nextSibling.nextSibling) {
				var colIndex = calcColumnIndex(thead.spaceElem);
				
				for(var j=0;j<trs.length;j++)
				{
					var tr = trs[j];
					var tds = $(tr).find('>td');
					$(tds[colIndex]).insertAfter(tds[colIndex+1]);
				}
				$(thead.spaceElem).insertAfter(thead.spaceElem.nextSibling);
				thead.jbDropColumnIndex = colIndex+1;
			}
		}
		if (nearLeft) {
			if (thead.spaceElem.previousSibling) {
				var colIndex = calcColumnIndex(thead.spaceElem);
				
				for(var j=0;j<trs.length;j++)
				{
					var tr = trs[j];
					var tds = $(tr).find('>td');
					tr.insertBefore(tds[colIndex],tds[colIndex-1]);
				}
				$(thead.spaceElem).insertBefore(thead.spaceElem.previousSibling);
				thead.jbDropColumnIndex = colIndex-1;
			}
		}
		return aa_stop_prop(e);
	}
		 
	function _dragEnd(e) {
		$(thead.spaceElem).removeClass(settings.draggedSpaceCssClass);
		thead.draggedParent.removeChild(thead.draggedElem);
		document.onmouseup = thead.origDocMouseup;
		thead.draggedElem = null;
		thead.Suspect = null;
		thead.Owner = null;
		
		if (thead.jbDropColumnIndex != -1)
			settings.onDrop(thead.jbDragColumnIndex,thead.jbDropColumnIndex);
		return aa_stop_prop(e);
	}
	 
	function suspectDrag(e,thead,th) {
		thead.Suspect = { owner: "TableColumnsDragAndDrop", mousePos : aa_mousePos(e) };
		return aa_stop_prop(e);
	}

	function checkSuspection(e,thead,th) {
		var mousepos = aa_mousePos(e);
		if (thead.Suspect) {
			var distance = Math.abs(mousepos.x - thead.Suspect.mousePos.x);
			if (distance < 5) return true;
			thead.Suspect = null;
			dragBegin(e,thead,th);
		}
	}

	function unSuspectDrag(e,thead,th) {
		if (thead.Owner == "TableColumnsDragAndDrop") return true;
		thead.Suspect = null;
		return true;
	}

	function dragBegin(e,thead,th) {
		ajaxart_disableSelection(thead);
		thead.Owner = "TableColumnsDragAndDrop";

		var posx = aa_absLeft(th,false);
		var posy = aa_absTop(th,false);

		for(var iter=th;iter && iter != document.body;iter=iter.parentNode) {
			var iterPos = $(iter).css('position');
			if (iterPos == 'absolute' || iterPos == 'fixed' || iterPos == 'relative') {
				posy -= aa_absTop(iter,false);
				posx -= aa_absLeft(iter,false);
				if (iterPos == 'fixed') { posX -= window.scrollX; posY -= window.scrollY; }
				break;
			}
		}
		var oElem = thead.draggedElem = th.cloneNode(true);
		thead.draggedParent = th.parentNode; 
		thead.draggedParent.appendChild(oElem);

		thead.spaceElem = th; 

		$(oElem).addClass(settings.draggedCssClass);
		$(thead.spaceElem).addClass(settings.draggedSpaceCssClass);

		thead.jbDragColumnIndex = calcColumnIndex(th);
		thead.jbDropColumnIndex = -1;
		
		var mousepos = aa_mousePos(e);
		oElem.mouseX = mousepos.x - posx;
		oElem.deltaMouseX = mousepos.x - aa_absLeft(th,false);

		$(oElem).css('position','absolute').css('top',posy+'px').css('left',posx+'px').css('width',$(th).width()+'px');
		thead.origDocMouseup = document.onmouseup;
		document.onmouseup = _dragEnd;
		if(e.preventDefault) e.preventDefault();
		return aa_stop_prop(e);
	}
	
	function calcColumnIndex(th) {
		var parent = th.parentNode;
		var index = 0;
		for(var iter=parent.firstChild;iter;iter = iter.nextSibling) {
			if (iter == th) return index;
			if (iter.tagName.toLowerCase() == 'th') index++;
		}
	}
}


function aa_registerTableHeaderEvent(thead,eventType,func,ownerId,activation_mode)
{
	if (thead.EventHandler == null)
	{
		aa_defineElemProperties(thead,'handlers,EventHandler');
		thead.handlers = [];
		thead.EventHandler = function(e)
		{
			var elem = $( (typeof(event)== 'undefined')? e.target : (event.tDebug || event.srcElement)  ); 
		    e = e || event; // IE
		    
		    if (elem[0].tagName.toLowerCase() == 'th')
		    	var th = elem;
		    else
		    	var th = elem.parents('th');
		    if (th.length == 0) return true;
		    
		    if (e.type == 'mousedown')
		    	thead.LastMouseDown = { th: th[0] }; 
		    if (e.type == 'mouseout')
		    	thead.LastMouseDown = null;
		    
			for(var i=0;i<thead.handlers.length;i++)
			{
				var handler = thead.handlers[i];
				if (handler.eventType != e.type) continue;
				if (e.button == 2)
				{
					if (handler.activation_mode == 'right mouse')
						handler.func(e,thead,th[0]);
				}
				else
				{
					var activate = 
						(handler.activation_mode == 'no dominant' && thead.Owner == null) ||  
						(handler.activation_mode == 'suspect' && thead.Suspect != null && thead.Owner == null) ||
						(handler.activation_mode == 'dominant' && thead.Owner == handler.ownerId);
					if (activate)
						handler.func(e,thead,th[0]);
				}
			}
		}
		thead.onmousedown = thead.onmouseout =thead.onmouseup = thead.onmousemove = thead.EventHandler;
	}
	thead.handlers.push({eventType : eventType, func: func, ownerId: ownerId, activation_mode : activation_mode } )
}


