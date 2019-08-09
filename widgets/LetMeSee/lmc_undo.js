ajaxart.load_plugin("","../widgets/LetMeSee/lmc_undo.xtml");

aa_gcs("lmc_undo",{
	LMCUndo: function(profile,data,context) {
		var appContext = context.vars._AppContext[0];
		appContext.lmcUndos = appContext.lmcUndos || [];
		appContext.lmcRedos = appContext.Redos || [];

		if (appContext.lmcUndos.length == 0)	return;
		var undoObject = appContext.lmcUndos.pop();
		if (undoObject && undoObject.run) {
			var redoObject = undoObject.run(context);
			if (redoObject) appContext.lmcRedos.push(redoObject);
		}
	},
	LMCRedo: function(profile,data,context) {
		var appContext = context.vars._AppContext[0];
		appContext.lmcUndos = appContext.lmcUndos || [];
		appContext.lmcRedos = appContext.lmcRedos || [];

		if (appContext.lmcRedos.length == 0)	return;
		var redoObject = appContext.lmcRedos.pop();
		if (redoObject && redoObject.run) {
			var undoObject = redoObject.run(context);
			if (undoObject) appContext.lmcUndos.push(undoObject);
		}
	},
	LMCXmlItemsWithUndo: function(profile,data,context) {
		if (!ajaxart.classes.LMCUndoDelete) aa_lmc_initUndoClasses();

		var xmlItems = ajaxart.runNativeHelper(data,profile,'XmlItems',context);
		if (!xmlItems.Parent) return [];

		var items = [];
		for(var i=0;i<xmlItems.length;i++) items.push(xmlItems[i]);

    items.Parent = xmlItems.Parent;
    items.Tag = xmlItems.Tag;
    items.XmlItems = xmlItems;
    items.context = context;
    items.addItem = function(item,addSettings) {
    	xmlItems.addItem.call(this,item,addSettings);
    	aa_lmc_addUndoObject(this,new ajaxart.classes.LMCUndoAdd(item));
    };
    items.MoveBefore = function(item,beforeItem) {
    	aa_lmc_addUndoObject(this,new ajaxart.classes.LMCUndoMove(item,beforeItem) );
    	xmlItems.MoveBefore.call(this,item,beforeItem);
    }
    items.MoveToEnd = function(item) {
    	aa_lmc_addUndoObject(this,new ajaxart.classes.LMCUndoMove(item) );
    	xmlItems.MoveToEnd.call(this,item);
    }
    items.doDeleteItem = function(item) {
    	aa_lmc_addUndoObject(this,new ajaxart.classes.LMCUndoDelete(item) );
    	xmlItems.doDeleteItem.call(this,item);
    }
    return items;		
	}
});

function aa_lmc_addUndoObject(items,undoObject) {
		var context = items.context;
		var appContext = context.vars._AppContext[0];
		appContext.lmcUndos = appContext.lmcUndos || [];
		appContext.lmcRedos = appContext.lmcRedos || [];
		undoObject.roomID = aa_var_first(context,'Room').getAttribute('id');
		undoObject.items = items;
		if (!appContext.lmcInUndoAction)
			appContext.lmcUndos.push(undoObject);
		else
			appContext.lmcRedos.push(undoObject);
}
function aa_lmcRunUndoAction(context,action) {
		var appContext = context.vars._AppContext[0];
		appContext.lmcInUndoAction = appContext.lmcInUndoAction || 0;
		appContext.lmcInUndoAction++;
		try {
			action();
		} catch(e) {
			ajaxart.logException('error running undo action',e);
		}
		appContext.lmcInUndoAction--;
}
function aa_lmc_initUndoClasses() {
	if (ajaxart.classes.LMCUndoDelete) return;

	ajaxart.classes.LMCUndoDelete = function(item) {
		this.item = item;
		this.parent = item.parentNode;
		this.previousSibling = item.previousSibling;
		while (this.previousSibling && this.previousSibling.nodeType != 1)
			this.previousSibling = this.previousSibling.previousSibling;
	};
	ajaxart.classes.LMCUndoDelete.prototype.run = function(context) {
		var previousItemIndex = -1;
		for(var i=0;i<this.items.length;i++) {
			if (this.items[i] == this.previousSibling)
				previousItemIndex = i;
		}
		var addObject = aa_itemlist_addItem({
			context: this.items.context,
			item: this.item,
			cntr: this.items.cntr,
			updateAddObject: function(addObject) {
				if (previousItemIndex == -1) {
					addObject.addSettings = {
						location: 'first'
					};
				} else {
					addObject.addSettings = {
						location: 'afterItem',
						itemIndex: previousItemIndex
					};
				}				
			}			
		});
		if (addObject && addObject.ItemElement) {
			var appearCss = aa_attach_global_css('#this { background: pink !important; }');
			$(addObject.ItemElement).addClass(appearCss);
			setTimeout(function() {
				$(addObject.ItemElement).removeClass(appearCss);
			},800);
		}
	};

	ajaxart.classes.LMCUndoAdd = function(item) {
		this.item = item;
	};
	ajaxart.classes.LMCUndoAdd.prototype.run = function(context) {
		var items = this.items;
		var command = this;

		aa_lmcRunUndoAction(items.context,function() {
			aa_itemlist_deleteItem({
				cntr: items.cntr,
				item: command.item
			});
		});
	};
	ajaxart.classes.LMCUndoMove = function(item) {
	};

}