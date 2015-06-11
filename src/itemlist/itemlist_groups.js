ajaxart.load_plugin("", "plugins/itemlist/itemlist_groups.xtml");

aa_gcs("itemlist_aspect", {
    GroupItems: function(profile,data,context)
    {
		// Groups are added between item elements, so the html keeps its structure
	
    	var field = context.vars._Field[0];
    	var style = aa_first(data,profile,'Style',context);
    	
    	jBart.bind(field,'initItemList',function(itemlist) {
    		var itemListCntr = itemlist.itemlistCntr;
        	jBart.bind(itemListCntr,'afterItemDeleted',function() { itemlist.Refresh(); },'GroupItems'+field.Id);
        	jBart.bind(itemListCntr,'afterItemAdded',function() { itemlist.Refresh(); },'GroupItems'+field.Id);
        	itemlist.GroupSorter = aa_first(data,profile,'SortGroups',context);
        	
    		itemlist.RefreshGroups = function() {
    	        var items = this.itemlistCntr.Items;
    			itemlist.Groups = {};
    			itemlist.SortedGroups = [];
    			
    			for(var i=0;i<items.length;i++) {
    				var item = [items[i]];
    				var groupName = aa_text(item,profile,'GroupOfItem',context);
    				if (!itemlist.Groups[groupName]) {
    					var group = { Name: groupName, Items: [] };
    					group.DisplayName = aa_text(ajaxart.run(item,profile,'GroupOfItem',context),profile,'GroupDisplayName',context);
    					itemlist.SortedGroups.push(group);
    					itemlist.Groups[groupName] = group;
    				}
    				itemlist.Groups[groupName].Items.push(items[i]);
    			}
    			
    			itemlist.SortGroups();
    		}
    		itemlist.SortGroups = function() {
    			if (!itemlist.GroupSorter) return;
    			
    			var arr = [];
    			for(var i=0;i<itemlist.SortedGroups.length;i++) {
    				var group = itemlist.SortedGroups[i];
    				arr[i] = { index: i, value: itemlist.GroupSorter.compileValue([group.Name]) };
    			}
    			arr.sort(itemlist.GroupSorter.sort);
    			
    			var newArr = [];
    			for(var i=0;i<arr.length;i++) {
    				newArr.push( itemlist.SortedGroups[arr[i].index] );
    			}
    			
    			itemlist.SortedGroups = newArr;
    		}
    	    itemlist.ShowItems = function () {
    	        var items = this.itemlistCntr.Items;
    	        // Incremental build is done by an aspect - this code is simple rendering
    	        for (var i = 0; i < items.length; i++) {
    	            var item = [items[i]];
    	            var elem = itemlist.ElementOfItem(item);
    	            this.AppendItemElement(elem);
    	        }
    	    }
    		
    	    itemlist.ShowItems = function () {
    	    	itemlist.RefreshGroups();
    	        var groups = this.SortedGroups;
    	        
    	        // Incremental build is done by an aspect - this code is simple rendering
    	        for (var i = 0;i<groups.length;i++) {
    	        	var group = groups[i];
    	        	var elemsOfGroup = [];
    	        	for(var j=0;j<group.Items.length;j++) {
    	        		var item = [ group.Items[j] ];
    	        		var elem = itemlist.ElementOfItem(item);
    	        		elemsOfGroup.push(elem);
                        if (j == 0)
                            $(elem).addClass('aa_first_in_group');
                        if (j == group.Items.length-1)
                            $(elem).addClass('aa_last_in_group');
    	        	}
    	        	var groupElem = aa_renderStyleObject(style,{ 
    	        		text: group.DisplayName, group: group,
    	        		Items: group.Items,
    	        		ItemElements: elemsOfGroup
    	        	},context);
    	        	
    	        	this.ParentOfItems.appendChild(groupElem); 
    	        	
    	        	for(var j=0;j<elemsOfGroup.length;j++)
    	        		this.AppendItemElement(elemsOfGroup[j]);
    	        }
    	    }
    	});    	
    }
});

