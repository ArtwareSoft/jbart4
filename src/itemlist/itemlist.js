ajaxart.load_plugin("", "plugins/itemlist/itemlist.xtml");
ajaxart.load_plugin("", "plugins/itemlist/itemlist_styles.xtml");

aa_gcs("itemlist", {
    XmlItems: function (profile, data, context) {
        var parent = aa_first(data,profile,'ParentXml',context);
        if (!parent) { 
        //    ajaxart.log("XmlItems - parent is empty","error"); 
            return []; 
        }
        var tag = aa_text(data,profile,'Tag',context);
        var items = aa_xpath(parent,tag);
        if (aa_paramExists(profile,'Filter')) {
            var newitems = [];
            for(var i=0;i<items.length;i++)
                if ( aa_bool([items[i]],profile,'Filter',context) )
                    newitems.push( items[i] );
            
            items = newitems;
        }
        items.Parent = parent;
        items.Tag = tag;
        items.addItem = function(item,addSettings) {
            if (item.nodeType != 1) 
                return ajaxart.log('trying to add non xml item to XmlItems','error');

            addSettings = addSettings || { location: 'last' };
            var added = false;
            if (addSettings.location == 'afterItem') {
                var index = addSettings.itemIndex;
                if (index == this.length-1) {
                    addSettings.location = 'last'; 
                } else {
                    parent.insertBefore(item,this[index+1]);
                    this.push(this[index]);
                    this[index] = item;
                    added = true;
                }
            }
            if (!added && addSettings.location == 'first' && this.length > 0) {
                parent.insertBefore(item,this[0]);
                this.push(this[0]);
                this[0] = item;

                added = true;
            }
            if (!added) {  // last
                this.push(item);
                parent.appendChild(item);
            }
            aa_triggerXmlChange(item);
        };
        items.MoveBefore = function(item,beforeItem) {
            parent.insertBefore(item,beforeItem);
            aa_triggerXmlChange(parent);
        };
        items.MoveToEnd = function(item) {
            parent.appendChild(item);
            aa_triggerXmlChange(parent);
        };
        items.doDeleteItem = function(item) {
            aa_remove(item);
            aa_triggerXmlChange(parent,{ type: 'delete', deletedElem: item });
        };
        ajaxart.run(data,profile,'AutoFirstItem',aa_ctx(context,{ XmlItems:items }));
        return items;
    }
});
aa_gcs("xmlitems", {
    AutoFirstItem: function(profile, data, context) {
        var items = context.vars.XmlItems;

        var defaultXml = aa_first(data,profile,'DefaultXml',context);
        var itemsCount = aa_int(data,profile,'ItemsCount',context);
        for (i=items.length; i<itemsCount; i++)
            addEptyItem(i);

        function addEptyItem(index) {
            var newItem = aa_createElement(items.Parent,items.Tag);

            if (defaultXml)
                ajaxart.xml.copyElementContents(defaultXml,newItem);

            items.push(newItem);

            var listenerID = aa_bindXmlChange(newItem,function(changeType) {

                if (changeType == 'default value') return;

                var addAfter;
                for (i=index; i<itemsCount; i++)// if one of the items after us was already attached, we should come before
                    if (items[i].parentNode)
                        addAfter = items[i];

                if (addAfter)
                    items.Parent.insertBefore(newItem,addAfter);
                else
                    items.Parent.appendChild(newItem);     // TODO: insert first

                aa_unbindXmlChange(listenerID);

                ajaxart.run(data,profile,'OnAdded',context);

            },context);

            aa_bind(items,'initContainer',function(itemlistCntr) {
                aa_bind(itemlistCntr,'detach',function() {
                    aa_unbindXmlChange(listenerID);
                });
            });
        }
    }
});

aa_gcs("field", {
    ItemList: function (profile, data, context) 
    {
        var field = {
            Title: aa_multilang_text(data, profile, 'Title', context),
            FieldData: function (data) { return data; },
            IsItemList: true
        };
        field.Id = aa_text(data, profile, 'ID', context);
        field.ID = [field.Id];
        field.SectionStyle = aa_first(data,profile,'SectionStyle',context);
        
        var ctx = aa_ctx(context, { _Field: [field] });
        field.View = aa_first(data, profile, 'View', ctx);
        field.Control = function (data1, ctx) {
            var ctx2 = aa_ctx(ctx,{});
            aa_trigger(field,'ModifyInstanceContext',{ Context: ctx2, FieldData: data1 });
            
            var itemlist = aa_create_itemList(field,ctx2,data1);
            itemlist.Fields = ajaxart.runsubprofiles(data, profile, 'Field', aa_merge_ctx(context, ctx2));
            itemlist.VisibleFields = [];
            for(var i=0;i<itemlist.Fields.length;i++) {
                if (itemlist.Fields[i].CalculatedOnly) itemlist.Fields[i].Calculate(data1,ctx2);
                if (itemlist.Fields[i].IsHidden ) continue;
                if (itemlist.Fields[i].IsFieldHidden && itemlist.Fields[i].IsFieldHidden(data1,ctx) ) continue;
                itemlist.VisibleFields.push(itemlist.Fields[i]);
            }
            aa_trigger(field,'innerFields',{ Context: ctx2, FieldData: data1, Fields: itemlist.VisibleFields });

            aa_renderStyleObject2(field.View,itemlist,data1,field,ctx2);
            itemlist.el.jbApiObject = itemlist.el.jbItemList = itemlist;
            aa_trigger(field, 'initItemList', itemlist); // allows aspects to alter the itemlist (e.g. incremental build)

            itemlist.Refresh();
            itemlist.el.jbContext = ctx2;
            
            if (field.SectionStyle) return [ aa_wrapWithSection(itemlist.el,field,field.SectionStyle,data1,ctx2) ];
            return [itemlist.el];
        };
        ajaxart.runsubprofiles(data, profile, 'FieldAspect', ctx);

        return [field];
    },
    DragAndDropItemsHandle: function(profile,data,context) {
        var field = {
          Id: aa_text(data,profile,'ID',context),
          Title: aa_multilang_text(data,profile,'Title',context),
          Style: aa_first(data,profile,'Style',context)
        };
        field.ID = [field.Id];
        field.Control = function(field_data,ctx) {
            if (ctx.vars.ItemList) {
                if (ctx.vars.ItemList && !ctx.vars.ItemList[0].DragAndDropInitiated) {
                    ctx.vars.ItemList[0].DragAndDropInitiated = true;
                    var itemlist = ctx.vars.ItemList[0];
                    var draggedCssClass = aa_attach_global_css( aa_text(data,profile,'CssForDraggedElement',context) , null, 'draggedItem' );
                    var draggedSpaceCssClass = aa_attach_global_css( aa_text(data,profile,'CssForDraggedSpace',context) , null, 'draggedItemSpace' );

                    var items = itemlist.itemlistCntr.Items;
                    if (!items.MoveBefore) {
                        ajaxart.log("DragAndDropItemsHandle : itemlist does not support moving items","error");
                        return [ document.createElement("div") ];
                    }
                    
                    aa_dragDropItems({
                        parent: itemlist.ParentOfItems,
                        isItemElement: function(elem) { return elem.jbItem != null; },
                        moveBefore: function(elem,beforeElem) {
                            items.MoveBefore(elem.jbItem[0],beforeElem.jbItem[0]);
                        },
                        moveToEnd: function(elem) {
                            items.MoveToEnd(elem.jbItem[0]);
                        },
                        draggedSpaceCssClass: draggedSpaceCssClass,
                        draggedCssClass: draggedCssClass,
                        canStartDrag: function(mouseX,mouseY) {
                            var elem = document.elementFromPoint(mouseX, mouseY);
                            if ($(elem).hasClass('fld_' + field.Id))
                                return true;
                            else if ($(elem).parents(".fld_" + field.Id).length && 
                                $(elem).parents(".fld_" + field.Id).parents().is(itemlist.Ctrl))
                                return true;
                            else 
                                return false;
                        }
                    });
                }
            }
            if (ctx.vars.ItemList[0].itemlistCntr.Items.MoveBefore) {   // support D&D
                var ctx2 = aa_merge_ctx(context,ctx);
                return [aa_renderStyleObject(field.Style,{},ctx2,true)];
            } else return [ document.createElement("div")];
        }
        ajaxart.runsubprofiles(data,profile,'FieldAspect',aa_ctx(context,{_Field: [field]}));
        
        return [field];
    }
});
aa_gcs("field_aspect", {
    ItemListContainer: function (profile, data, context) {
        var field = context.vars._Field[0];
        jBart.bind(field,'ModifyInstanceContext',function(args) {
            var items = ajaxart.run(args.FieldData, profile, 'Items', aa_ctx(context,args.Context));
            args.Context.vars.ItemListCntr = [aa_itemlistContainer(items,field.Id,field)];
            
            jBart.trigger(field,'initItemlistCntr',args.Context.vars.ItemListCntr[0]);
        });
        field.hasItemlistContainer = true;
    },
    ItemListSelectionWithKeyboard: function (profile,data,context)
    {
        var field = context.vars._Field[0];
        var enterActivatesClick = aa_bool(data,profile,'EnterActivatesItemClick',context);

        aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
            var input = $(cell).find('input');
            var cntr = ctx.vars.ItemListCntr && ctx.vars.ItemListCntr[0];

            input.keydown(function(e) {
                if (e.keyCode == 40 || e.keyCode == 38) {   // arrow down/up
                    if (cntr.SelectionKeyDown) cntr.SelectionKeyDown(e); // delegate to cntr selection
                    return false;
                } else if (e.keyCode == 13 && cntr.SelectedElement && enterActivatesClick) {
                    var selected = cntr.SelectedElement;
                    $(selected).click();
                }
                
              return true;                  
            });
        },'ItemListSelectionWithKeyboard');
    },    
    CustomizeTableHeader: function (profile, data, context) {
        var field = context.vars._Field[0];
        var cssClass = aa_attach_global_css( aa_text(data,profile,'Css',context) , null, field.Id+'_header' );
        var colspan = aa_int(data,profile,'ColSpan',context);
        
        jBart.bind(field,'ModifyTableHeader',function(args) {
            $(args.th).addClass(cssClass);
            if (colspan) $(args.th).attr('colspan',colspan);
        },'CustomizeTableHeader');
    },
    PopupOfTableHeader: function (profile, data, context) {
        var field = context.vars._Field[0];
        var popupStrategy = aa_first(data,profile,'OpenPopup',context);

        jBart.bind(field,'ModifyTableHeader',function(args) {
          var ctx2 = aa_ctx(context,{ControlElement: [args.th]});

          var popupAdapter = {
            wrapper: args.th,
            $wrapper: $(args.th),
            openPopup: function() {
              ajaxart.runNativeHelper(data,profile,'OpenPopup',ctx2);
            },
            closePopup: function() {
            }
          };
          aa_renderStyleObject(popupStrategy,popupAdapter,ctx2,true,{ funcName: 'attach'});
          aa_apply_style_js(popupAdapter,popupStrategy,ctx2,'attach');
        },'PopupOfTableHeader');
    }
});

aa_gcs("itemlist_aspect", {
    ItemSelection: function (profile, data, context) 
    {
        var selectionClass = aa_attach_global_css( aa_text(data,profile,'Css',context) , null, 'selected' ) + ' aa_selected';
        var mouseSupport = aa_text(data,profile,'MouseSupport',context);
        var alwaysOneSelected = aa_bool(data,profile,'AlwaysOneSelected',context);
        var hasSelectedByDefault = aa_paramExists(profile,'SelectedByDefault');
        jBart.bind(context.vars._Field[0], 'initItemList', function (itemlist) 
        {
            var ItemListCntr = itemlist.itemlistCntr;
            
            ItemListCntr.SetNewSelected = function(selectedElement) {
                var prevSelectedElement = ItemListCntr.SelectedElement; 
                if (prevSelectedElement == selectedElement) return;
                ItemListCntr.SelectedElement = selectedElement;

                var args = { 
                    PrevSelectedElem: prevSelectedElement, 
                    PrevSelectedItem: prevSelectedElement && prevSelectedElement.jbItem,
                    SelectedElem: ItemListCntr.SelectedElement, 
                    SelectedItem: ItemListCntr.SelectedElement && ItemListCntr.SelectedElement.jbItem
                };
                ItemListCntr.trigger('showSelection',args);
                ItemListCntr.trigger('selectionChanged',args);
            }
            ItemListCntr.bind('showSelection',function(selectionArgs) {
                if (selectionArgs.PrevSelectedElem)
                    $(selectionArgs.PrevSelectedElem).removeClass(selectionClass);
                
                $(selectionArgs.SelectedElem).addClass(selectionClass);
            },'ItemSelection');

            ItemListCntr.SelectionKeyDown = function(e) { ItemListCntr.trigger('selectionKeyDown',e); }
            ItemListCntr.bind('selectionKeyDown',function(e) {
                var current = ItemListCntr.SelectedElement;
                var isDown = e.keyCode == 40, isUp = e.keyCode == 38;
                var elements = itemlist.GetElements();
                var index = -1;
                for(var i=0;i<elements.length;i++) {
                    if (elements[i]==current) {
                        index = i;
                        break;
                    }
                }
                var newSelected = elements[0];
                if (isDown && index+1<elements.length) newSelected = elements[index+1];
                if (isUp && index-1>=0) newSelected = elements[index-1];
                
                ItemListCntr.SetNewSelected(newSelected);
            },'ItemSelection');

            if (aa_paramExists(profile,'OnSelect',true)) {
                ItemListCntr.bind('selectionChanged',function(selectionArgs) {
                    var item = selectionArgs.SelectedItem;
                    var ctx = aa_ctx(itemlist.Context,{ ControlElement: selectionArgs.SelectedElem });
                    ajaxart.run(item,profile,'OnSelect',aa_merge_ctx(context,ctx));
                },'ItemSelection');
            }
            
            if (mouseSupport != 'none') {
                itemlist.bind('itemElement',function(element) {
                    var evt = 'mousedown';
                    if (mouseSupport == 'mouse click') evt = 'click';
                    if (mouseSupport == 'mouse hover') evt = 'mouseover';
                    
                    $(element).bind(evt,function() {
                        ItemListCntr.SetNewSelected(element);
                    });
                },'ItemSelection');
            }
            
            function ensureOneSelected() {
                if (ItemListCntr.SelectedElement) return;
                var elements = itemlist.GetElements();
                if (elements[0]) ItemListCntr.SetNewSelected( elements[0] );
            }
            function selectByDefault() {
                var selectedItem = aa_first(ItemListCntr.Items,profile,'SelectedByDefault',context);
                var elements = itemlist.GetElements();
                for(var i=0;i<elements.length;i++) {
                    if (elements[i].jbItem[0] == selectedItem) {
                        ItemListCntr.SetNewSelected( elements[i] );
                        return;
                    }
                }
            }
            
            itemlist.bind('refresh',function() {
                var prevSelection = ItemListCntr.SelectedElement;
                ItemListCntr.SelectedElement = null;
                if (hasSelectedByDefault) selectByDefault();
                if (!ItemListCntr.SelectedElement && alwaysOneSelected) ensureOneSelected();

                if (!ItemListCntr.SelectedElement) {
                    ItemListCntr.SelectedElement = prevSelection;
                    ItemListCntr.SetNewSelected(null);
                }
            });
            itemlist.bind('refreshItemElement',function(args) {
                if (ItemListCntr.SelectedElement == args.PreviousElement) {
                    ItemListCntr.SetNewSelected(args.NewElement);
                }
            });
            
            if (alwaysOneSelected) {
                ItemListCntr.bind('afterItemDeleted',function(args) {
                    if (args.ItemElement == ItemListCntr.SelectedElement) {
                        ItemListCntr.SelectedElement = null;
                        ensureOneSelected();
                    }
                },'ItemSelection');
                ItemListCntr.bind('afterItemAdded',function(args) {
                    if (!ItemListCntr.SelectedElement) ensureOneSelected();
                },'ItemSelection');
            }
            
        },'ItemSelection');
    },
    UpdateOnAddOrDeleteItem: function (profile, data, context) 
    {
        jBart.bind(context.vars._Field[0], 'initItemList', function (itemlist) 
        {
            ItemListCntr = itemlist.itemlistCntr;
            
            aa_bind(ItemListCntr,'itemDeleted',function(args) {
                itemlist.ParentOfItems.removeChild( args.ItemElement );
            },'UpdateOnAddOrDeleteItem');
            aa_bind(ItemListCntr.Items,'itemDeleted',function(args) {
                itemlist.ParentOfItems.removeChild( args.ItemElement );
            },'UpdateOnAddOrDeleteItem');
            
            aa_bind(ItemListCntr,'itemAdded',function(args) {
                itemAdded(itemlist,args);
            },'UpdateOnAddOrDeleteItem');

            aa_bind(ItemListCntr.Items,'itemAdded',function(args) {
                itemAdded(itemlist,args);
            },'UpdateOnAddOrDeleteItem');
            
        },'UpdateOnAddOrDeleteItem');

        function itemAdded(itemlist,args) {
            var elem = itemlist.ElementOfItem(args.Item);
            args.ItemElement = elem;
            itemlist.AppendItemElement(elem,args.addSettings);
            aa_element_attached(elem);
            elem.scrollIntoView();        
        }
    },
    RefreshOnItemsChange: function (profile, data, context)
    {
        var field = context.vars._Field[0];
        aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
            if (!ctx.vars.ItemListCntr) return;
            var ItemListCntr = ctx.vars.ItemListCntr[0];
            ItemListCntr.bind('itemsChanged',function() {
                aa_refresh_cell(cell,ctx);
            },'RefreshOnItemsChange'+field.Id);
            
        },'RefreshOnItemsChange');      
    },
    CssForItem: function (profile, data, context)
    {
        var cssClass = aa_attach_global_css( aa_text(data,profile,'Css',context) , null, 'item' );
        aa_bind(context.vars._Field[0],'initItemList',function(itemlist) {
            itemlist.bind('itemElement',function(element) {
                if (aa_bool(element.jbItem,profile,'ConditionOnItem',context))
                    $(element).addClass(cssClass);
            });
        });     
    },
    CssClassForItem: function (profile, data, context)
    {
        var cssClass = aa_text(data,profile,'CssClass',context);
        aa_bind(context.vars._Field[0],'initItemList',function(itemlist) {
            itemlist.bind('itemElement',function(element) {
                if (aa_bool(element.jbItem,profile,'ConditionOnItem',context))
                    $(element).addClass(cssClass);
            });
        });     
    },
    ItemClick: function (profile, data, context)
    {
        var cssClass = aa_cssClass(data,profile,'Css',context);

        jBart.bind(context.vars._Field[0],'initItemList',function(itemlist) {
            itemlist.bind('itemElement',function(element) {
                $(element).addClass(cssClass);
                $(element).click(function() {
                    var ctx = aa_ctx(context,{ ControlElement: [element], ItemList: [itemlist], ItemListCntr: [itemlist.cntr]});
                    ctx = aa_contextWithEventExtraVars(ctx);
                    ajaxart.run(element.jbItem,profile,'OnClick',ctx);
                });
            },'ItemClick');
        },'ItemClick');     
    },
    RefreshOnSelectionChange: function (profile, data, context)
    {
        aa_field_aspect_RefreshOnSelectionChange(data,profile,context,'ItemListCntr');
    },
    Filter: function(profile,data,context)
    {
        var field = context.vars._Field[0];
        field.FieldData = function(data1,ctx) {
            var out = aa_xpath(data1[0],'@'+field.Id,true);   // TODO: Talk about it with Shai to understand the limitations
            if (field.HasDefaultValue)
                aa_trigger(field, 'FieldData', { Item: data1, FieldData: out, Context: ctx });
            return out;
        };
        field.FilterData = function(data1,ctx) {
            return ajaxart.run(data1,profile,'FieldData',context);
        };
        field.GetFilterObject = function(itemListCntr) {
            return {
                Id: field.Id,
                FieldDataCompiled:ajaxart.compile(profile,'FieldData',context),
                FieldData: function(item) {
                    return this.FieldDataCompiled([item],context);
                },
                FilterType: aa_first(data,profile,'FilterType',context)
            }
        }
        field.InitFilter = function(itemListCntr) {
            aa_initContainerFilters(itemListCntr);
            if (itemListCntr.Filters[field.Id]) return; // already initialized            
            
            var filterObject = this.GetFilterObject(itemListCntr);
            itemListCntr.AddFilter(filterObject);
        };
        aa_field_handler(field,'ModifyControl', function(wrapper,field_data,cell_presentation,ctx,item) {
            if (!ctx.vars.ItemListCntr) return;
            var ItemListCntr = ctx.vars.ItemListCntr[0];
            wrapper.jbItemListCntr = ItemListCntr;
            wrapper.jbQueryXml = ctx.vars._ItemListQueryXml[0];
            field.InitFilter(ItemListCntr);
        },'Filter');
        
        if (aa_bool(data,profile,'ImmediateFilter',context)) {
            aa_field_handler(field,'OnUpdate',function(field,field_data,input,e,extra){
                var cell = input.parentNode;
                if (aa_intest) { runQuery(cell); }
                else {
                    if (cell.jbItemListCntr.filterTimeoutID) clearTimeout(cell.jbItemListCntr.filterTimeoutID);
                    cell.jbItemListCntr.filterTimeoutID = setTimeout(function() { runQuery(cell); },200);
                }
            },'Filter');            
        }
        
        if (context.vars.ItemListCntr) {
            // for dt preview
            var item = context.vars.ItemListCntr[0].Items[0];
            if (item) ajaxart.run([item],profile,'FieldData',context);
        }

        function runQuery(cell) {
            cell.jbItemListCntr.RunQuery(cell.jbQueryXml);
        }
    },
    TableColumnDragAndDrop: function(profile,data,context)
    {
        var field = context.vars._Field[0];
        var draggedCssClass = aa_attach_global_css( aa_text(data,profile,'CssForDraggedElement',context) , null, 'draggedColumn' );
        var draggedSpaceCssClass = aa_attach_global_css( aa_text(data,profile,'CssForDraggedSpace',context) , null, 'draggedColumnSpace' );
        
        jBart.bind(field,'initItemList',function(itemlist) {
            var table = $(itemlist.Ctrl).find('table')[0];
            if (!table && itemlist.Ctrl.tagName.toLowerCase() == 'table') table = itemlist.Ctrl;
            if (!table) return;
            
            var reorderHappened = false;
            
            var permutation = [];
            
            aa_dragAndDropTableColumns(table,{
                draggedSpaceCssClass: draggedSpaceCssClass,
                draggedCssClass: draggedCssClass,
                onDrop: function(dragIndex,dropIndex) {
                    reorderHappened = true; 
                    var maxIndex = Math.max(dragIndex,dropIndex);
                    if (permutation.length < maxIndex) {
                        for(var i=permutation.length;i<=maxIndex;i++)
                            permutation[i] = i;
                    }
                    if (dropIndex > dragIndex) {
                        for(var i=dragIndex;i<dropIndex;i++) 
                            swap(permutation,i,i+1);
                    } else {
                        for(var i=dragIndex;i>dropIndex;i--) 
                            swap(permutation,i-1,i);
                    }
                }
            });
            
            itemlist.bind('itemElement',function(itemElement) {
                if (!reorderHappened) return;
                // we need to reorder the tds by the drag and drop order
                var tds = $(itemElement).find('>td');
                for(var index=0;index<tds.length;index++) {
                    var nextIndex = (index < permutation.length) ? permutation[index] : index;
                    var nextTD = tds[nextIndex];
                    if (nextTD)
                        itemElement.appendChild(nextTD);
                }
            });
        },'TableColumnDragAndDrop');

        function swap(arr,i,j) {
            var x = arr[i];
            arr[i] = arr[j];
            arr[j] = x;            
        }
    },
    DragAndDropItems: function(profile,data,context)
    {
        var field = context.vars._Field[0];
        var draggedCssClass = aa_attach_global_css( aa_text(data,profile,'CssForDraggedElement',context) , null, 'draggedItem' );
        var draggedSpaceCssClass = aa_attach_global_css( aa_text(data,profile,'CssForDraggedSpace',context) , null, 'draggedItemSpace' );

        jBart.bind(field,'initItemList',function(itemlist) {
            var items = itemlist.itemlistCntr.Items;
            if (!items.MoveBefore) return;
            
            aa_dragDropItems({
                parent: itemlist.ParentOfItems,
                isItemElement: function(elem) { return elem.jbItem != null; },
                moveBefore: function(elem,beforeElem) {
                    items.MoveBefore(elem.jbItem[0],beforeElem.jbItem[0]);
                    aa_run(data,profile,'OnDrop',context);
                },
                moveToEnd: function(elem) {
                    items.MoveToEnd(elem.jbItem[0]);
                    aa_run(data,profile,'OnDrop',context);
                },
                draggedSpaceCssClass: draggedSpaceCssClass,
                draggedCssClass: draggedCssClass,
                cntr: itemlist.itemlistCntr
            });
        });     
    },
    LongList: function(profile,data,context)
    {
        var field = context.vars._Field[0];
        var style = aa_first(data,profile,'Style',context);
        var maxTimeToRenderItems = aa_int(data,profile,'MaxTimeToRenderItems',context);
        var maxItems = aa_int(data,profile,'MaxItemsPerPage',context);
        var showMoreText = aa_multilang_text(data,profile,'TextForShowMore',context);
        var autoAddAll = aa_bool(data,profile,'ShowAllItemsOnTimer',context);

        jBart.bind(field,'initItemList',function(itemlist) {
            itemlist.IsLongList = true;
            itemlist.ShowItems = function (fromIndex) {
                if (itemlist.ShowMoreItems) {
                    if (itemlist.ShowMoreItems) itemlist.ShowMoreItems.detach();
                    itemlist.ShowMoreItems = null;
                }
                fromIndex = fromIndex || 0;
                var startTime = new Date().getTime();
                
                var items = this.itemlistCntr.Items;
                // Incremental build is done by an aspect - this code is simple rendering
                for (var i = fromIndex; i < items.length; i++) {
                    var item = [items[i]];
                    var elem = itemlist.ElementOfItem(item,i+1);
                    this.AppendItemElement(elem);
                    
                    var tooLong = false;
                    if (maxTimeToRenderItems && new Date().getTime() - startTime > maxTimeToRenderItems) tooLong = true;
                    if (!tooLong && maxItems && ((fromIndex+i+1) % maxItems) == 0) tooLong = true;
                    if (tooLong && i >= items.length-2) tooLong = false;

                    if (tooLong) {
                        if (autoAddAll) {
                            setTimeout(function() {
                                itemlist.ShowItems(i+1);
                            },200);
                            return; // and do not show ui for 'more items'
                        }

                        itemlist.ShowMoreItems = aa_renderStyleObject(style,{ 
                            nextIndex: i+1,
                            text: showMoreText,
                            itemlist: itemlist,
                            attachShowMore: function(parent) {
                                $(this.control).addClass('jb_show_more');
                                parent.appendChild( this.control );
                            },
                            detach: function() {
                                aa_remove(this.control);
                            },
                            showMore: function() {
                                itemlist.ShowItems(this.nextIndex);
                                aa_element_attached(itemlist.el);
                            }
                        },context);
                        
                        itemlist.ShowMoreItems.attachShowMore(itemlist.ParentOfItems);
                        return;
                    }
                }

            };            
            itemlist.EnsureItemElementExists = function(item) {
                var showMore = $(itemlist.ParentOfItems).find('>.jb_show_more')[0];
                if (!showMore) return;

                var elems = itemlist.GetElements();
                for(var i=0;i<elems.length;i++)
                    if (elems[i].jbItem == item) return elems[i];

                var items = this.cntr.Items;
                for(var i=showMore.jbApiObject.nextIndex;i<items.length;i++) {
                    var elem = this.ElementOfItem([items[i]]);
                    this.AppendItemElement(elem);
                    if (items[i] == item) {
                        itemlist.ParentOfItems.appendChild(showMore);                
                        return elem;
                    }
                }
            }

        });     
    },
    ShowTextWhenNoItems: function(profile,data,context)
    {
        var field = context.vars._Field[0];
        var style = aa_first(data,profile,'Style',context);

        aa_bind(field,'initItemList',function(itemlist) {
            var itemListCntr = itemlist.itemlistCntr;
            var parent = itemlist.ParentOfItems;
            if (!parent) return;

            var no_items_text = aa_multilang_text(data,profile,'Text',context);
            var no_items_after_filter = aa_multilang_text(data,profile,'TextWhenNoItemsMatchFilter',context) || no_items_text;
            var noItemsElement = aa_renderStyleObject(style,{ text: no_items_text, data: no_items_text, itemlist: itemlist },context).el;
            var noItemsFilterElement = aa_renderStyleObject(style,{ text: no_items_after_filter, data: no_items_after_filter, itemlist: itemlist },context).el;
                        
            var refreshFunc = function() { refresh(itemListCntr,parent,noItemsElement,noItemsFilterElement); };
            itemlist.bind('refresh',refreshFunc,'ShowTextWhenNoItems');
            aa_bind(itemListCntr,'afterItemDeleted',refreshFunc,'ShowTextWhenNoItems'+field.Id);
            aa_bind(itemListCntr,'afterItemAdded',refreshFunc,'ShowTextWhenNoItems'+field.Id);
            
        });

        function refresh(itemListCntr,parent,noItemsElement,noItemsFilterElement) {
            if (itemListCntr.Items.length == 0 && itemListCntr.AllItems && itemListCntr.AllItems.length > 0) 
                parent.appendChild(noItemsFilterElement);
            else {
                if (noItemsFilterElement.parentNode == parent) parent.removeChild(noItemsFilterElement);                    
                if (itemListCntr.Items.length == 0) 
                    parent.appendChild(noItemsElement);
                else if (noItemsElement.parentNode == parent)
                    parent.removeChild(noItemsElement);
            }
        }        
    },
    SelectedItemByFilter: function(profile,data,context)
    {
        var items = data;
        for(var i=0;i<items.length;i++)
            if (aa_bool([items[i]],profile,'Filter',context))
                return [items[i]];
    },
    SelectedItemByTextValue: function(profile,data,context)
    {
        var value = aa_text(data,profile,'Value',context);
        for(var i=0;i<data.length;i++)
            if (aa_text([data[i]],profile,'ItemValue',context) == value)
                return [data[i]];
    },
    FilterGroup: function(profile,data,context)
    {
        var field = context.vars._Field[0];
        field.IsFilterGroup = true; 
        var storage = aa_first(data,profile,'StorageForQuery',context);
        var storageID = 'filters_' + (context.vars.ItemListCntr ? context.vars.ItemListCntr[0].Id : '');

        field.FieldData = function() {
            var xmlStr = '';
            if (storage) {
                var value = storage.get(storageID);
                if (value && value.charAt(0) == '<')
                    xmlStr = value;
            }
            return [jBart.parsexml(xmlStr || '<query/>')];
        }
        jBart.bind(field,'ModifyInstanceContext',function(args) {
            args.Context.vars._ItemListQueryXml = args.FieldData; 
        });
        
        jBart.bind(field,'ModifyControl',function(args) {
            var content = args.Wrapper.jbContent || args.Wrapper.firstChild;
            var ctx = content.jbContext;
            var queryXml = ctx.vars._ItemListQueryXml && ctx.vars._ItemListQueryXml[0];
            var cntr = ctx.vars.ItemListCntr && ctx.vars.ItemListCntr[0];
            
            if (queryXml && aa_notEmptyQuery(queryXml) && cntr && cntr.RunQuery) {
                cntr.RunQuery(queryXml);
            }

            if (storage) {
                aa_bind(cntr,'runQuery',function() {
                    storage.set(storageID,ajaxart.xml2text(queryXml));
                });
            }
        });
    }
});

aa_gcs("itemlist_filter", {
    Text: function (profile, data, context) 
    {
        return [{
            FieldDataToColumnData: function(fieldData) {
                return aa_totext(fieldData);
            },
            PrepareQueryData: function(expression) {
                return expression.toLowerCase();
            },
            Match: function(queryData,columnData) {
                if (columnData.toLowerCase().indexOf(queryData) > - 1) return true;
                return false;
            },
            HighlightSelectedText: function(control,highlightClass,queryData) {
                var pattern = queryData;
                
                if (control.innerHTML.toLowerCase().indexOf(pattern) != -1)
                   control.innerHTML = ajaxart_field_highlight_text(control.innerHTML,pattern,highlightClass);
            }
        }];
    },
    TextWords: function (profile, data, context) 
    {
        return [{
            FieldDataToColumnData: function(fieldData) {
                return aa_totext(fieldData);
            },
            PrepareQueryData: function(expression) {
                return aa_text_capitalizeToSeperateWords(expression).toLowerCase();
            },
            Match: function(queryData,columnData) {
                var words = aa_split(queryData,' ',true);
                for (var i=0;i<words.length;i++)
                    if (columnData.toLowerCase().indexOf(words[i]) == - 1) return false;

                return words.length > 0;
            },
            HighlightSelectedText: function(control,highlightClass,queryData) {
                var pattern = queryData;
                
                if (control.innerHTML.toLowerCase().indexOf(pattern) != -1)
                   control.innerHTML = ajaxart_field_highlight_text(control.innerHTML,pattern,highlightClass);
            }
        }];
    },
    ExactMatch: function (profile, data, context) 
    {
        return [{
            FieldDataToColumnData: function(fieldData) {
                return aa_totext(fieldData);
            },
            PrepareQueryData: function(expression) {
                return expression;
            },
            Match: function(queryData,columnData) {
                return (columnData == queryData || (queryData == '{$empty}' && columnData == ''));
            }
        }];
    },
    NumberGTOrEquals: function (profile, data, context) 
    {
        return [{
            FieldDataToColumnData: function(fieldData) {
                return aa_toint(fieldData);
            },
            PrepareQueryData: function(expression) {
                return parseInt(expression);
            },
            Match: function(queryData,columnData) {
                return (columnData >= queryData);
            }
        }];
    },
    ValuesFromItems: function (profile, data, context)
    {
        var field = context.vars._Field[0]; 
        field.RecalculateForEachCell = true; // so ItemListCntr will be available 
        if (!context.vars.ItemListCntr || !field.InitFilter) return;
        var itemListCntr = context.vars.ItemListCntr[0];
        var filterId = field.Id;
        
        var options = [],uniqueNames = {};
        // look in filter values
        field.InitFilter(itemListCntr);
        var dataCol = itemListCntr.DataColumns[filterId];
        for(var i=0;i<dataCol.length;i++) {
            var val = dataCol[i];
            if (uniqueNames[val]) {
                uniqueNames[val]++;
                continue;
            }
            uniqueNames[val] = 1;
            options.push({ code: val });
        }
        
        return [{ Options: options } ];
    }
});

aa_gcs("itemsort", {
    SortItems: function (profile, data, context) 
    {
        var sortDirection = aa_text(data,profile,'SortDirection',context);
        var sortType = aa_first(data,profile,'SortType',context);
        var field = context.vars._Field[0];
        
        aa_register_init_itemlistCntr(field,function(cntr) {
            aa_bind(cntr,'sortItems',function() { doSort(cntr); },'SortItems');
            aa_bind(cntr,'originalItemsChanged',function() {
                cntr.Items = cntr.OriginalItems;
                doSort(cntr);
            });
            
            aa_bind(field,'innerFields',function(args) {
                doSort(cntr);
            },'SortItems_InnerFields');                       

        },'SortItems');

        function doSort(cntr) {
            aa_sort_items(cntr,{
                direction: sortDirection,
                sortType: sortType,
                itemValue: function(item) {
                    return ajaxart.run(item,profile,'ItemValueToSort',context);
                },
                context: context
            });
        }

    },
    Lexical: function (profile, data, context)
    {
        return [{
            compileValue: function(value) {
                return aa_totext(value).toLowerCase();
            },
            sort: function(a,b) {
                if (a.value > b.value) return -1;
                if (a.value == b.value) return 0;
                return 1;
            }
        }];
    },
    Numeric: function (profile, data, context)
    {
        return [{
            compileValue: function(value) {
                return parseInt( aa_totext(value) );
            },
            sort: function(a,b) { return a.value-b.value; }
        }];
    },
    PromoteValues: function (profile, data, context)
    {
        var promoted = aa_split( aa_text(data,profile,'ValuesToPromote',context), ',',true);
        var promotedIndex = {};
        for(var i=0;i<promoted.length;i++)
            promotedIndex[promoted[i]] = i+1;
            
        var maxIndex = promoted.length+1;
        
        return [{
            compileValue: function(value) { return aa_totext(value); },
            sort: function(a,b) {
                var aIndex = promotedIndex[a.value] || maxIndex;
                var bIndex = promotedIndex[b.value] || maxIndex;
                
                return aIndex - bIndex; 
            }
        }];
        
    },
    TableColumnSort: function (profile, data, context)
    {
        var field = context.vars._Field[0];
        var defaultSortType = aa_first(data,profile,'DefaultSortType',context);
        var keepSortState = aa_first(data,profile,'KeepSortState',context);
        var itemlist,thList;
            
        jBart.bind(field,'initItemList',function(_itemlist) {
            itemlist = _itemlist;
            var table = $(itemlist.Ctrl).find('table')[0];

            var sortState = keepSortState && keepSortState.get('') && JSON.parse(keepSortState.get(''));
            var thead = $(table).find('>thead')[0];
            thList = $(thead).find('>tr>th').get();
            aa_registerHeaderEvent(thead,'mouseup',clickHandler,'Sort','no dominant');
            
            if (sortState && sortState.index > -1)
                thClicked(thead,thList[sortState.index]);

            itemlist.itemlistCntr.bind('sortItems',doSort,'TableColumnSort');           
        },'TableColumnSort');

        function clickHandler(e,thead,th) {
            if (!thead.LastMouseDown || thead.LastMouseDown.th != th) return;
            thClicked(thead,th);
        }
        function thClicked(thead,th) {
            if (!th) return;
            if ($(th).hasClass('sort_ascending')) {
                removeCssClasses(thead);
                $(th).addClass('sort_descending');
                changeSort(th,'descending');
            } else if ($(th).hasClass('sort_descending')) {
                removeCssClasses(thead);
                changeSort(null);  // remove the sort
            } else {
                removeCssClasses(thead);
                $(th).addClass('sort_ascending');
                changeSort(th,'ascending');
            }
        }

        function removeCssClasses(thead)    {
            $(thead).find('th').removeClass('sort_ascending').removeClass('sort_descending');
        }

        function changeSort(th,direction) {
            if (th) {
                sortState = { 
                    index:  thList.indexOf(th),
                    direction: direction
                }
            } else 
                sortState = {}; // clear sort
            
            if (keepSortState) keepSortState.set('',JSON.stringify(sortState));
            
            doSort(sortState);
        }
        
        function doSort(sortState) {
            $('body').css('cursor','progress');
            if (!sortState || sortState.index == -1) {
                aa_unsort_items(itemlist.itemlistCntr);
            } else {
                var field = thList[sortState.index] && thList[sortState.index].jbField;
                if (!field) return;
                aa_sort_items(itemlist.itemlistCntr,{
                    direction: sortState.direction,
                    sortType: field.SortType || defaultSortType,
                    itemValue: function(item) {
                      var field_data = field.FieldData ? field.FieldData(item,context) : item;
                      if (field.Label) return field.Label(field_data,context);
                      return field_data;                            
                    }
                });
            }
                
            itemlist.Refresh();
            $('body').css('cursor','auto');
        }

    }
});

aa_gcs("itemlist_item", {
    ItemOfList: function (profile, data, context)
    {
        var elem = aa_first(data,profile,'Item',context);
        if (!elem) return [];
        if (aa_text(data,profile,'Result',context) == 'element') return [elem];
        return elem.jbItem;
    },
    ItemInContext: function (profile, data, context) 
    {
        var elem = context.vars.ControlElement && context.vars.ControlElement[0];
        for(;elem && elem.nodeType == 1;elem = elem.parentNode) {
            if (elem.jbItemElement) return [elem.jbItemElement];
            if ($(elem).hasClass('aa_item')) return [elem];
        }
    },
    ItemLaunchingThePopup: function (profile, data, context) 
    {
        var elem = aa_var_first(context,'PopupLaunchingElement');
        for(;elem && elem.nodeType == 1;elem = elem.parentNode) {
            if (elem.jbItemElement) return [elem.jbItemElement];
            if ($(elem).hasClass('aa_item')) return [elem];
        }
    },
    SelectedItem: function (profile, data, context) 
    {
        var itemListCntr = context.vars.ItemListCntr && context.vars.ItemListCntr[0];
        if (!itemListCntr || !itemListCntr.SelectedElement) return [];
        return [itemListCntr.SelectedElement];
    },
    SpecificItem: function (profile, data, context) {
        var itemList = aa_findItemList(null,context); 
        var item = aa_first(data,profile,'Item',context);
        if (!item || !itemList) return [];
        var elems = itemList.GetElements();
        for(var i=0;i<elems.length;i++) 
            if (elems[i].jbItem[0] == item) return [elems[i]];
        return [];
    },
    LastItem: function (profile, data, context)
    {
        var itemList = context.vars.ItemList && context.vars.ItemList[0];
        return itemList.GetElements().slice(-1);
    }
});

aa_gcs("itemlist_action", {
    DeleteItem: function (profile, data, context) 
    {
        aa_itemlist_deleteItem({
            cntr: aa_var_first(context,'ItemListCntr'),
            itemElement: aa_first(data,profile,'Item',context)
        });
    },
    AddItemToItemList: function (profile, data, context)
    {
        var item = aa_first(data,profile,'Item',context);
        var addObject = aa_itemlist_addItem({
            context: context,
            item: item,
            itemlistID: aa_text(data,profile,'ItemList',context),
            updateAddObject: function(ao) {
                ajaxart.run([ao],profile,'Location',context); // adds addSettings to addObject
            }
        });
        if (addObject) {
          ajaxart.run([item],profile,'DoOnAddedItem',aa_ctx(context,{
              ControlElement: addObject.ItemElement ? [addObject.ItemElement] : []
          }));
        }
    },
    AsLastItem: function (profile, data, context)
    {
        data[0].addSettings = { location: 'last' };
    },
    AsFirstItem: function (profile, data, context)
    {
        data[0].addSettings = { location: 'first' };
    },
    BeforeOrAfterAnItem: function (profile, data, context)
    {
        var id = aa_text(context.vars.Item,profile,'SpecificItemID',context);
        var items = data[0].items;
        var isBefore = (aa_text(data,profile,'Location',context) == 'before');

        for(var i=0;i<items.length;i++) {
            var itemid = aa_text([items[i]],profile,'ItemIdentifier',context);
            if (id == itemid) {
                if (isBefore) {                    
                    if (i == 0) data[0].addSettings = { location: 'first' };
                    else data[0].addSettings = { location: 'afterItem', itemIndex: i-1, item: items[i-1] };
                } else { // after
                    data[0].addSettings = { location: 'afterItem', itemIndex: i, item: items[i] };
                }
                return;
            }
        }
    },
    CloseDetailsReplacingAll: function (profile, data, context)
    {
        if (!context.vars._DetailsReplacingAll) {
            if (!context.vars.ItemList) return;
            var itemlist = context.vars.ItemList[0];
            var topControl = $(itemlist.el).parents('.fld_'+itemlist.cntr.Id)[0].parentNode;
            if (!topControl.jbDetailsReplacingAll) return;
            var detailsReplacingAllObject = topControl.jbDetailsReplacingAll.jbDetailsReplacingAllObject;
        } else {
            var detailsReplacingAllObject = context.vars._DetailsReplacingAll[0];
        }

        var topControl = detailsReplacingAllObject.topControl;
        var itemElement = detailsReplacingAllObject.itemElement;
        var itemlist = detailsReplacingAllObject.itemlist;
        var transition = aa_first(data,profile,'Transition',context);

        if (!transition || window.aa_intest || ajaxart.isIE78) {
            aa_remove(topControl.jbDetailsReplacingAll,true);
            topControl.jbOriginalCtrl.style.display = 'block';
            topControl.jbDetailsReplacingAll = null;
            if (itemElement) {
              itemElement = itemlist.RefreshItemElement(itemElement);
              //aa_scrollToShowElement(itemElement, '');
              itemElement.scrollIntoView();
            }
        } else {
            if (itemElement) itemElement = itemlist.RefreshItemElement(itemElement);
            aa_replace_transition({
              transition: transition,
              elOriginal: topControl.jbDetailsReplacingAll, 
              elNew: topControl.jbOriginalCtrl,
              itemElement: itemElement,
              onBeforeTransitionBegin: function() { $(topControl.jbOriginalCtrl).css({display: 'block'}); },
              onTransitionEnd: function() {
                //aa_scrollToShowElement(itemElement, '');
                if (aa_bool(data,profile,'AutoScrollToMasterItem',context))
                    itemElement.scrollIntoView();
              }
            },context);
        }
        aa_trigger(itemlist,'backFromDetails',{ itemElement: itemElement, context: context });
    },
    NextItemOfDetailsReplacingAll: function (profile, data, context) {
        if (!context.vars._DetailsReplacingAll) return [];
        var detailsReplacingAllObject = context.vars._DetailsReplacingAll[0];
        var item = detailsReplacingAllObject.item[0];
        while(item) {
            item = aa_cntr_getNextItem(detailsReplacingAllObject.cntr,item);
            if (item && aa_bool([item],profile,'FilterForNextItem',context))
                return [item];
        }       
    },
    PrevItemOfDetailsReplacingAll: function (profile, data, context) {
        if (!context.vars._DetailsReplacingAll) return [];
        var detailsReplacingAllObject = context.vars._DetailsReplacingAll[0];
        var item = detailsReplacingAllObject.item[0];
        while(item) {
            item = aa_cntr_getPrevItem(detailsReplacingAllObject.cntr,item);
            if (item && aa_bool([item],profile,'FilterForPrevItem',context))
                return [item];
        }       
    },
    DetailsReplacingAllGotoItem: function (profile, data, context)
    {
        if (!context.vars._DetailsReplacingAll) return;
        var detailsReplacingAllObject = context.vars._DetailsReplacingAll[0];
        var transition = aa_first(data,profile,'Transition',context);

        var newItem = aa_first(data,profile,'Item',context);        
        if (!newItem) return;        
        var newItemElement = aa_find_itemElement(detailsReplacingAllObject.itemlist,newItem);
        if (!newItemElement) return;

        aa_remove(detailsReplacingAllObject.topControl.jbDetailsReplacingAll,true);
        
        aa_openDetailsReplacingAll({
            transition: transition,
            topControl: detailsReplacingAllObject.topControl,
            itemElement: newItemElement,
            itemlist: detailsReplacingAllObject.itemlist,
            detailsPage: detailsReplacingAllObject.detailsPage,
            context: context
        });
    },
    ChangeItemsOfItemlist: function (profile, data, context) {
        var cntr = aa_find_itemlist_container(context,aa_text(data,profile,'ItemListContainer',context));
        if (!cntr) return;

        cntr.Items = ajaxart.run(data,profile,'Items',context);
        if (cntr.RefreshDataColumns) {
            cntr.AllItems = cntr.Items;
            cntr.RefreshDataColumns();    
        }
    },
    OpenDetailsReplacingAll: function (profile, data, context)
    {
        var itemlist;
        var fieldToReplace = aa_text(data,profile,'FieldToReplace',context);
        if (aa_text(data,profile,'ItemList',context)) {             // 1. If specified, use specific itemlist
            var itemlistID =  aa_text(data,profile,'ItemList',context)
            var root = ajaxart.xml.root(context.vars.ControlElement[0]);
            var jItemlistElem = $(root).find('.fld_' + itemlistID);
            if (jItemlistElem && jItemlistElem[0] && jItemlistElem[0].jbItemList)
                itemlist = jItemlistElem[0].jbItemList;
            else {
                ajaxart.log("cannot find itemlist for " + itemlistID, jItemlistElem.length ? "error" : "location");
                return [];
            }
        }
        if (!itemlist)                                             // 2. If in context, use our itemlist
            itemlist = context.vars.ItemList && context.vars.ItemList[0];
        if (!itemlist) {                                           // 3. Use the last item list from container
            var itemlistContainer = context.vars.ItemListCntr && context.vars.ItemListCntr[0];
            itemlist = itemlistContainer.ItemLists.slice(-1)[0];   
        }
        var itemElement = aa_first(data,profile,'Item',aa_ctx(context, {ItemList: [itemlist]} ));
        var itemlist = aa_findItemList(itemElement);
        if (!itemlist) return;
        var itemlistContainer = itemlist.itemlistCntr;
        
        var topControlContent = $(itemElement).parents('.fld_'+itemlistContainer.Id)[0];
        if (fieldToReplace && aad_find_field(fieldToReplace)[0])
            topControlContent = aad_find_field(fieldToReplace)[0];
        if (!topControlContent || !topControlContent.parentNode) return;
        var topControl = topControlContent.parentNode;
        topControl.jbOriginalCtrl = topControlContent;
        
        var detailsField = aa_first(data,profile,'Details',context);
        if (!detailsField) return;
        var replaceTransition = aa_first(data,profile,'Transition',context);

        aa_openDetailsReplacingAll({
            transition: replaceTransition,
            topControl: topControl,
            itemElement: itemElement,
            itemlist: itemlist,
            detailsPage: detailsField,
            context: context
        });
    },
    RefreshItem: function (profile, data, context)
    {
        var itemElement = aa_first(data,profile,'Item',context);
        var itemlist = aa_findItemList(itemElement);
        if (!itemlist) return;
        itemlist.RefreshItemElement( itemElement );
    },
    ClickOnItem: function (profile, data, context)
    {
        var itemElement = aa_first(data,profile,'Item',context);
        if (!itemElement) return;

        var old_in_test = window.aa_intest;
        var old_intest_topControl = window.aa_intest_topControl;

        var noTransition = aa_bool(data,profile,'NoTransitions',context);
        if (noTransition) {
            window.aa_intest = true;
            window.aa_intest_topControl = document;
        }

        aa_setEventExtraVariables( ajaxart.runsubprofiles(data,profile,'ExtraVariable',context) );
        $(itemElement).click();
        aa_removeEventExtraVariables();
        if (noTransition) {
            window.aa_intest = old_in_test;
            window.aa_intest_topControl = old_intest_topControl;
        }
    },
    ToggleDetailsInplace: function (profile, data, context)
    {
        var itemElement = aa_first(data,profile,'Item',context);
        var itemlist = aa_findItemList(itemElement);
        if (!itemlist) return;
        if (itemElement.jbDetailsOpen || ( itemElement.nextSibling && itemElement.nextSibling.jbIsDetailsOpen) ) {
            // close
            if (itemlist.CloseInplace) itemlist.CloseInplace(itemElement);
            itemElement.jbDetailsOpen = false;
            // now refresh the item
            itemlist.RefreshItemElement( itemElement );
        } else {
            // open
            var detailsField = aa_fieldById(aa_text(data,profile,'DetailsField',context),itemlist.Fields);
            var detailsElement = document.createElement('div');
            detailsElement.jbItem = itemElement.jbItem;
            detailsElement.jbItemElement = itemElement;
            
            if (detailsField) {
                aa_fieldControl({ Field: detailsField, Item: itemElement.jbItem, Wrapper: detailsElement, Context: itemlist.Context });
                aa_show(detailsElement); // in case it's hidden
            } else {
            }
            if (itemlist.OpenInplace) itemlist.OpenInplace(itemElement,detailsElement);
            itemElement.jbDetailsOpen = true;
        }
        if (aa_bool(data,profile,'CloseOtherInplaceDetails',context) && itemElement) {
            var elems = $(itemElement).siblings();
            for(var i=0;i<elems.length;i++)
                if (elems[i].jbDetailsOpen) {
                    itemlist.CloseInplace(elems[i]);
                    elems[i].jbDetailsOpen = false;
                }
        }
    }
});

function aa_itemlistContainer(items,id,field) {
    var cntr = {
        Id: id,
        Items: items,
        OriginalItems: items,
        ItemLists: []
    };
    items.cntr = cntr;
    // .bind ,.trigger are here to make the using code look a bit nicer
    cntr.bind = function(evt,callback,id) { aa_bind(cntr,evt,callback,id); }
    cntr.trigger = function(evt,obj) { aa_trigger(cntr,evt,obj); }

    if (ajaxart.xtmls_to_trace && ajaxart.xtmls_to_trace.length && field) {     // Tracing container 
        for (i in ajaxart.xtmls_to_trace) {  
            if (field.XtmlSource[0].script == ajaxart.xtmls_to_trace[i].xtml) 
                ajaxart.xtmls_to_trace[i].itemlistCntr = cntr;
        }
    }

    return cntr;
}

function aa_create_itemList(field,context,inputData) {
    var itemlist = {
        Id: field.Id, id: field.Id,
        Fields: [],
        InputData: inputData
    };
    itemlist.context= itemlist.Context = aa_ctx(context,{ItemList: [itemlist], _Field: [field] });
    itemlist.cntr = itemlist.itemlistCntr = context.vars.ItemListCntr ? context.vars.ItemListCntr[0] : aa_itemlistContainer([],'cntr',field);
    itemlist.cntr.ItemLists.push(itemlist);
    itemlist.classForItem = 'aa_item_' + itemlist.Id;

    itemlist.RenderItem = function (item, elem,itemindex) { // the view should override this method
        itemlist.CreateFieldControls(item,elem,itemindex);
    }
    itemlist.ClearItems = function () {
        aa_empty(this.ParentOfItems, true);
    }
    itemlist.AppendItemElement = function (elem,addSettings) {
        addSettings = addSettings || { location: 'last' };

        if (addSettings.location == 'last') {
            this.ParentOfItems.appendChild(elem);
            return;
        }
        if (addSettings.location == 'first') {
            if (this.ParentOfItems.firstChild) 
                return this.ParentOfItems.insertBefore(elem,this.ParentOfItems.firstChild);
        }
        if (addSettings.location == 'afterItem') {
            for(var iter=this.ParentOfItems.firstChild;iter;iter=iter.nextSibling) {
                if (iter.jbItem[0] == addSettings.item) {
                    this.ParentOfItems.insertBefore(elem, iter.nextSibling);
                    return;
                }
            }
            // not implemented yet
        }

        // default begavior
        this.ParentOfItems.appendChild(elem);
    }
    itemlist.ElementOfItem = function(item,itemindex) {
        var elem = this.ItemTemplate.cloneNode(true);
        $(elem).addClass('aa_item').addClass(this.classForItem);
        elem.jbItem = item;
        this.RenderItem(item, elem,itemindex);
        this.trigger('itemElement',elem);
        this.cntr.trigger('renderItem',elem);
        return elem;
    }
    itemlist.ShowItems = function () {
        itemlist.trigger('beforeItemsShown');
        var items = this.itemlistCntr.Items;
        // Incremental build is done by an aspect - this code is simple rendering
        for (var i = 0; i < items.length; i++) {
            var item = [items[i]];
            var elem = itemlist.ElementOfItem(item,i+1);
            this.AppendItemElement(elem);
        }
        aa_element_attached(this.el);
        itemlist.trigger('afterItemsShown');
    }
    itemlist.Refresh = function () {
        itemlist.trigger('beforeRefresh');
        itemlist.ClearItems();
        itemlist.ShowItems();
        itemlist.trigger('refresh');
    }
    itemlist.SetHtmlTemplate = function (html) {
        this.Ctrl = this.el;
        this.el.jbItemList = itemlist;
        this.ParentOfItems = this.el;
    }
    itemlist.CreateFieldControls = function (item, elem,itemindex) {
        var item = elem.jbItem;
        for (var i = 0; i < this.VisibleFields.length; i++) {
            var field = this.VisibleFields[i];

            var wrapper = $('<div/>')[0];
            itemlist.CreateFieldControl(item, wrapper,field,itemindex);
            elem.appendChild(wrapper);
        }
    }
    itemlist.RefreshItemElement = function(elem) {
        var newElem = this.ElementOfItem(elem.jbItem);
        aa_replaceElement(elem,newElem,true);
        itemlist.trigger('refreshItemElement',{ NewElement: newElem, PreviousElement: elem } );
        return newElem;
    }
    itemlist.CreateFieldControl = function (item, wrapper,field,itemindex) {
        var ctx = aa_ctx(this.Context,{ _Field: [field], _Item: item , _ClassForItem: itemlist.classForItem, _ItemIndex: [itemindex || 0]});
        var fieldData = field.FieldData ? field.FieldData(item, ctx) : item;
        if (field.IsCellHidden && field.IsCellHidden(item,ctx,fieldData)) return;
        aa_fieldControl({ Field: field, Item: item, Wrapper: wrapper, Context: ctx });
    }
    itemlist.GetElements = function() {
        var out=[]; // An aspect can change this logic
        for(var elem=this.ParentOfItems.firstChild;elem;elem=elem.nextSibling)
            if (elem.jbItem) out.push(elem);
        return out;
    }
    // itemlist.bind ,itemlist.trigger are here to make the using code look a bit nicer
    itemlist.bind = function(evt,callback,id) { jBart.bind(itemlist,evt,callback,id); }
    itemlist.trigger = function(evt,obj) { jBart.trigger(itemlist,evt,obj); }
    
    itemlist.itemlistCntr.bind('itemsChanged',function(args) {
        if (!args.uiUpdated) {
            itemlist.Refresh();
            aa_element_attached(itemlist.el);
        }
    });


    if (ajaxart.xtmls_to_trace && ajaxart.xtmls_to_trace.length && field) {     // Tracing container 
        for (i in ajaxart.xtmls_to_trace) {  
            if (field.XtmlSource[0].script == ajaxart.xtmls_to_trace[i].xtml) 
                ajaxart.xtmls_to_trace[i].itemlistCntr = itemlist.cntr;
        }
    }

    return itemlist;
}

function aa_itemlist(itemlist,settings) {
    settings = aa_defaults(settings,{
        templateElem: itemlist.$el.find('.aa_item')
    });
    itemlist.$el.addClass('aa_itemlist');
    itemlist.SetHtmlTemplate('<div><div class="aa_item"/></div>'); // default
    itemlist.ItemTemplate = $(settings.templateElem)[0];
    itemlist.ParentOfItems = itemlist.ItemTemplate.parentNode;
    $(itemlist.ItemTemplate).remove();
}

function aa_horizontal_scroll_itemlist(itemlist,settings) {
    settings.itemTemplate = settings.itemTemplate || itemlist.$el.firstOfClass('aa_item');

    itemlist.ItemTemplate = $(settings.itemTemplate)[0];
    itemlist.ParentOfItems = itemlist.ItemTemplate.parentNode;
    aa_remove(itemlist.ItemTemplate);

    var itemWidth = parseInt(settings.itemWidth.split('px')[0]);
    var itemHeight = parseInt(settings.itemHeight.split('px')[0]);
    var itemsToShow = parseInt(settings.itemsToShow);
    var arrowWidth = parseInt(settings.arrowWidth.split('px')[0]);
    var arrowHeight = parseInt(settings.arrowHeight.split('px')[0]);
    var arrowMargin = parseInt(settings.arrowMargin.split('px')[0]);

    var arrowTop = itemHeight/2 - arrowHeight;
    var arrowLeft = (arrowMargin - arrowWidth)/2;

    var rightMargin = settings.rightMargin || 0;

    itemlist.$el.css('width',itemWidth*itemsToShow + rightMargin + arrowMargin*2).css('height',itemHeight);
    itemlist.$el.find('.body').css('width',itemWidth*itemsToShow+rightMargin).css('height',itemHeight);
    itemlist.$el.find('.left').css('width',arrowMargin);
    itemlist.$el.find('.right').css('width',arrowMargin);
    itemlist.$el.find('.left_arrow').css('width',arrowWidth).css('height',arrowHeight).css('top',arrowTop+'px').css('left',arrowLeft);
    itemlist.$el.find('.right_arrow').css('width',arrowWidth).css('height',arrowHeight).css('top',arrowTop+'px').css('right',arrowLeft);

    itemlist.ItemTemplate.style.width = itemWidth + 'px';
    itemlist.ItemTemplate.style.height = itemHeight + 'px';

    var sliderWidth = itemWidth*itemsToShow;
    var innerBody = itemlist.$el.find('.body_inner');
    var currLeft = 0;

    var leftArrow = itemlist.$el.find('.left_arrow');
    var rightArrow = itemlist.$el.find('.right_arrow');

    leftArrow.click(function() {
        if ($(this).hasClass('disabled')) return;
        if (currLeft > -sliderWidth) return;
        innerBody.animate( { left: '+='+sliderWidth },'slow');
        currLeft += sliderWidth;
        checkDisabled();
    });

    rightArrow.click(function() {
        if ($(this).hasClass('disabled')) return;

        innerBody.animate( { left: '-='+sliderWidth },'slow');
        currLeft -= sliderWidth;
        checkDisabled();
    });

    itemlist.bind('afterItemsShown', function() { setTimeout(checkDisabled,1); }) ;
    aa_bind(itemlist,'refresh',function() { checkDisabled(); },'Horizontal Scroll');

    if (settings.onSelection)
        notifyWithSelectionIndex();

    function checkDisabled() {
        if (currLeft == 0) 
            leftArrow.addClass('disabled');
        else 
            leftArrow.removeClass('disabled');

        var lastItem = innerBody.find('>div:last');
        if (lastItem[0] && lastItem[0].offsetLeft) {
            var lastLeft = lastItem[0].offsetLeft + currLeft;
            if (lastLeft + lastItem.outerWidth(true) <= sliderWidth ) 
                rightArrow.addClass('disabled');
            else 
                rightArrow.removeClass('disabled');
        }
    }

    function notifyWithSelectionIndex() {
        aa_bind(itemlist.itemlistCntr,'selectionChanged',function(args) {
            var elem = args.SelectedElem;
            var isFirst = (elem.offsetLeft == currLeft);
            try {
                if (ajaxart.isattached(elem))
                    settings.onSelection(isFirst);
                else {
                    aa_addOnAttach(elem,function() {
                      settings.onSelection(isFirst);  
                    });
                }
            } catch(ex) {
                ajaxart.logException('error calling horiz list onSelect',ex);
            }
        },'horizontal_scroll_itemlist' + itemlist.Id);
    }
}

function aa_findItemList(element,context) {
    if (context && aa_var_first(context,'ItemList')) return aa_var_first(context,'ItemList');
    if (!element && context) element = aa_var_first(context,'ControlElement');
    if (!element) return null;

    for(var iter = element;iter && iter.nodeType == 1;iter=iter.parentNode) {
        if (iter.jbItemList) return iter.jbItemList;
    }
    return null;
}

function aa_find_itemlist_container(context,fieldID) {
    if (!fieldID) return aa_var_first(context,'ItemListCntr');

    // TODO: find it by fieldID
    return null;
}
function aa_initContainerFilters(itemlistCntr)
{
    if (itemlistCntr.RunQuery) return; // already initialized
    
    aa_bind(itemlistCntr,'originalItemsChanged',function() {
        itemlistCntr.AllItems = itemlistCntr.OriginalItems;
        if (itemlistCntr.lastXmlQuery)
            itemlistCntr.RunQuery(itemlistCntr.lastXmlQuery);
        else {
            itemlistCntr.Items = itemlistCntr.AllItems;
        }
    });

    itemlistCntr.Filters = itemlistCntr.Filters || {};
    itemlistCntr.AllItems = itemlistCntr.Items;
    itemlistCntr.DataColumns = {};
    
    itemlistCntr.RefreshDataColumns = function() {
        itemlistCntr.DataColumns = {};
        for(var i in this.Filters) 
            if (this.Filters.hasOwnProperty(i))
                this.RefreshDataColumn(this.Filters[i]);
    }
    itemlistCntr.RefreshDataColumn = function(filter) {
        var column = this.DataColumns[filter.Id] = [];
        for(var j=0;j<this.AllItems.length;j++) {
            var item = this.AllItems[j];
            var fieldData = filter.FieldData(item);
            column.push( filter.FilterType.FieldDataToColumnData(fieldData) );
        }
    }
    itemlistCntr.AddFilter = function(filter) {
        this.Filters[filter.Id] = filter;        
//        this.RefreshDataColumn(filter);
    }

    itemlistCntr.RunQuery = function(xmlQuery) {
        this.DataColumns = this.DataColumns || {};

        var logQueryTime = false;
        var startTime = logQueryTime ? new Date().getTime() : 0;
        
        this.lastXmlQuery = xmlQuery;
        this.ItemsVersion = this.ItemsVersion ? this.ItemsVersion+1 : 1; // can be used for caches (e.g. filters/group by/occurrences)
        
        this.FilterData = {};
        
        for (var i=0; i<xmlQuery.attributes.length; i++) {
            var id = xmlQuery.attributes.item(i).name;
            if (!xmlQuery.getAttribute(id)) continue; // empty attribute is no filter
            var filter = this.Filters[id]; 
            if (!filter) continue;
            var filterType = filter.FilterType;
            this.FilterData[id] = filterType.PrepareQueryData ? filterType.PrepareQueryData(xmlQuery.getAttribute(id)) : xmlQuery.getAttribute(id);

            if (!this.DataColumns[id]) this.RefreshDataColumn(filter);  // lazy creation of filter
        }
        
        // now we should run the filters and intersect the results
        var cols = {};
        var prevCol = null,lastCol=null;
        for(var filterId in this.FilterData) {
            if (!this.FilterData.hasOwnProperty(filterId)) continue;
            var col = [];
            var filter = this.Filters[filterId];
            var filterType = filter.FilterType;
            var filterData = this.FilterData[filterId];
            var dataColumn= this.DataColumns[filterId];
            for(var j=0;j<dataColumn.length;j++) {
                if (prevCol && !prevCol[j]) {
                    col[j] = false; // no need to check this value. it has not passed previous filters
                } else {
                    col[j] = filterType.Match(filterData,dataColumn[j]);
                }
            }
            lastCol = prevCol = col;
        }
        // here we need to check only lastCol (because it integrated previous columns)
        if (lastCol) {
            var items = [];
            for(var j=0;j<this.AllItems.length;j++) {
                if (lastCol[j]) { // passed the filter
                    items.push( this.AllItems[j] );
                }
            }
            this.Items = items;
        } else {
            this.Items = this.AllItems;
        }
        this.FilteredDataColumn = lastCol;
        
//        this.trigger('sortItems',{});
        this.trigger('itemsChanged',{});
        this.trigger('runQuery',{});
        
        if (logQueryTime) {
            var time = new Date().getTime() - startTime;
            ajaxart.log('RunQuery Time - ' + time,'timing');
        }
    }
    
    itemlistCntr.GetFilterOfSpecificResult = function(item,field_data) {
        for(var i in this.Filters) {
            if (!this.Filters.hasOwnProperty(i)) continue;
            var filter = this.Filters[i];
            if (filter.FieldData) {
                var filterFieldData = filter.FieldData(item);
                if (filterFieldData && filterFieldData[0] && field_data[0] && filterFieldData[0] == field_data[0])
                    return filter;
            }
        }
        return null;
    }
    itemlistCntr.GetFilterQueryData = function(filter) {
        return this.FilterData && this.FilterData[filter.Id];
    }    
}
function aa_calculateFilterOccurrences(itemlistCntr,filterId,filteredOccurrences)
{
    itemlistCntr.DataColumns = itemlistCntr.DataColumns || {};
    itemlistCntr.ItemsVersion = itemlistCntr.ItemsVersion || 1;
    
    itemlistCntr.Occurrences = itemlistCntr.Occurrences || {};
    itemlistCntr.FilteredOccurrences = itemlistCntr.FilteredOccurrences || {}; 
    itemlistCntr.OccurrencesVersions = itemlistCntr.OccurrencesVersions || {};
    if (itemlistCntr.OccurrencesVersions[filterId] == itemlistCntr.ItemsVersion) return; // already calculated
    if (filteredOccurrences && !itemlistCntr.FilteredDataColumn) filteredOccurrences= false;
    
    var occ = {},filteredOcc = {};
    if (!itemlistCntr.DataColumns[filterId]) {
        itemlistCntr.RefreshDataColumn(itemlistCntr.Filters[filterId]);
    }

    var dataCol = itemlistCntr.DataColumns[filterId];
    for(var i=0;i<dataCol.length;i++) {
        var val = dataCol[i];
        occ[val] = occ[val] ? occ[val]+1 : 1; 
        if (filteredOccurrences && itemlistCntr.FilteredDataColumn[i] ) {
            filteredOcc[val] = filteredOcc[val] ? filteredOcc[val]+1 : 1; 
        }
    }
    itemlistCntr.Occurrences[filterId] = occ;
    if (filteredOccurrences) {
        itemlistCntr.FilteredOccurrences[filterId] = filteredOcc; 
    }
    itemlistCntr.OccurrencesVersions[filterId] = itemlistCntr.ItemsVersion;
}

// aa_register_init_itemlistCntr allows a field aspect to init an itemlistCntr (e.g. set default sort or filter)
function aa_register_init_itemlistCntr(field,callback,identifier)
{
    if (field.hasItemlistContainer) {
        // the field itself has ItemListCntr aspect
        jBart.bind(field,'initItemlistCntr',callback,identifier);
    } else {
        // the field in inside the itemlist container
        aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
            if (!ctx.vars.ItemListCntr) return;
            callback(ctx.vars.ItemListCntr[0]);
        },identifier);
    }
}
function aa_unsort_items(itemlistCntr)
{
    if (itemlistCntr.ItemsBeforeSort)
        itemlistCntr.Items = itemlistCntr.ItemsBeforeSort;
}

// settings include: direction, sortType, itemValue (function), context
function aa_sort_items(itemlistCntr,settings)
{
    var context = settings.context;
    var sortType = settings.sortType;
    if (!sortType) return;
    
    itemlistCntr.ItemsVersion = itemlistCntr.ItemsVersion || 1;
    if (itemlistCntr.ItemsBeforeSortVersion != itemlistCntr.ItemsVersion) {
        itemlistCntr.ItemsBeforeSort = itemlistCntr.Items;
        itemlistCntr.ItemsBeforeSortVersion = itemlistCntr.ItemsVersion;
    }
    
    var arr = [];
    
    for(var i=0;i<itemlistCntr.Items.length;i++) {
        var item = [itemlistCntr.Items[i]];
        var val = settings.itemValue(item);
        arr[i] = { index: i, value: sortType.compileValue(val) };
    }
    arr.sort(sortType.sort);
    
    // now create the new array
    var newArr = [];
    for(var i=0;i<arr.length;i++) {
        newArr.push( itemlistCntr.Items[arr[i].index] );
    }

    if (settings.direction == 'ascending') newArr = newArr.reverse();
    itemlistCntr.Items = newArr;

    aa_bind(itemlistCntr,'appendItemElementLocation',function(args) {
        var valForNewItem = sortType.compileValue( settings.itemValue([args.item]) );
        for(var i=0;i<itemlistCntr.Items.length;i++) {
            var val = sortType.compileValue( settings.itemValue([itemlistCntr.Items[i]]) );
            if ((settings.direction == 'ascending' && valForNewItem < val) || (settings.direction == 'descending' && valForNewItem > val)) {
              if (i==0)
                return $.extend(args.addSettings,{location: 'first'});
              else
                return $.extend(args.addSettings,{location: 'afterItem', item: itemlistCntr.Items[i-1] })
            }
        }
        $.extend(args.addSettings,{location: 'last'});
    },'sort');
}

//aa_itemlist_as_table is used in table styles
function aa_itemlist_as_table(itemlist,settings) 
{
      settings = aa_defaults(settings, { showHeaders: true, titleClass: 'title' });
      
      aa_itemlist(itemlist);
      itemlist.ParentOfItems = itemlist.$el.find('tbody')[0]; 
      itemlist.RenderItem = function (item, elem,itemindex) {
        var fields = itemlist.VisibleFields;
        var cellTemplate = $(elem).find('.aa_cell').remove()[0];
        for(var i=0;i<fields.length;i++) {
          var cell = cellTemplate.cloneNode(true);
          itemlist.CreateFieldControl(item,cell,fields[i],itemindex);
          elem.appendChild(cell);
        }
      }
      var headerTemplate = itemlist.$el.find('.aa_header_field')[0];
      if (headerTemplate) {
          var headerParent = headerTemplate.parentNode;
          $(headerTemplate).remove();
          
          if (settings.showHeaders) {
              var fields = itemlist.VisibleFields;
              for(var i=0;i<fields.length;i++) {
                  var headerCell = headerTemplate.cloneNode(true);
                  headerCell.jbField = fields[i]; // needed for sort and group by
                  var title = aa_fieldTitle(fields[i],itemlist.InputData,itemlist.Context);
                  $(headerCell).find('.' + settings.titleClass).html( title );
                  jBart.trigger(fields[i],'ModifyTableHeader',{th: headerCell, itemlist: itemlist});
                  headerParent.appendChild(headerCell);
              }
          }
      }
      
      itemlist.OpenInplace = function(itemElement,inplaceControl) {
        var inplaceTR = $('<tr class="aa_details_inplace"><td/></tr>');
        inplaceTR.find('td').attr('colspan',$(itemElement).find('>td').length).append(inplaceControl);
        inplaceTR.insertAfter(itemElement);
        itemElement.jbDetailsElement = inplaceTR[0];
        inplaceTR[0].jbIsDetailsOpen = true;
      }
      itemlist.CloseInplace = function(itemElement,inplaceControl) {
        itemElement.jbDetailsElement = itemElement.jbDetailsElement || itemElement.nextSibling;
        if (itemElement.jbDetailsElement) {
          jBart.remove(itemElement.jbDetailsElement);
          itemElement.jbDetailsElement = null;
        }
      }
}

function aa_notEmptyQuery(xmlQuery) 
{
    for (var i=0; i<xmlQuery.attributes.length; i++) {
        var name = xmlQuery.attributes.item(i).name;
        if (xmlQuery.getAttribute(name)) return true;
    }
    return false;
}

function aa_deleteItemFromItemList(itemlist,itemElement)
{
    var ItemListCntr = itemlist.itemlistCntr;
    var items = ItemListCntr.Items,item = itemElement.jbItem[0],found=false;
    for(var i=0;i<items.length;i++) {
      if (items[i] == item) {
          items.splice(i,1);
          found = true;
          if (item.nodeType == 1 && item.parentNode) item.parentNode.removeChild( item );  
          if (items.doDeleteItem) items.doDeleteItem(item);
          break;
      }
    }   
    if ( found ) {
        ItemListCntr.trigger('itemDeleted',{ Item: itemElement.jbItem, ItemElement: itemElement });
        ItemListCntr.trigger('afterItemDeleted',{ Item: itemElement.jbItem, ItemElement: itemElement });
        ItemListCntr.trigger('itemsChanged',{});
        //aa_remove(itemElement);
    }
}

function aa_item_data(obj)
{
    if (!obj) return;
    var context = obj.jbContext || obj.context || obj.Context;
    if (context && context.vars.Item)
        return context.vars.Item[0];
}
function aa_find_itemElement(itemlist,item) {
    var elems = itemlist.GetElements();
    for(var i=0;i<elems.length;i++) {
        if (elems[i].jbItem[0]==item) 
            return elems[i];
    }
    return null;
}
function aa_cntr_getPrevItem(cntr,item) {
    var items = cntr.Items,prev=null;
    for(var i=0;i<items.length;i++) {
        if (items[i] == item) return prev;
        prev = items[i];
    }
    return null;
}

function aa_cntr_getNextItem(cntr,item) {
    var items = cntr.Items;
    for(var i=0;i<items.length;i++) {
        if (items[i] == item) 
            return items[i+1];
    }
    return null;
}

function aa_openDetailsReplacingAll(settings) 
{
    var itemElement = settings.itemElement;
    var itemlistContainer = settings.itemlist.itemlistCntr;
    var context = settings.context;
    var topControl = settings.topControl;

    if (topControl.jbDetailsReplacingAll) {
        aa_remove(topControl.jbDetailsReplacingAll,true);
    }
    var detailsElement = document.createElement('div');
    detailsElement.jbItem = itemElement.jbItem;
    detailsElement.jbItemElement = itemElement;
    detailsElement.jbItemlistCntr = itemlistContainer;

    var detailsReplacingAllObject = {
        cntr: itemlistContainer,
        itemlistContainer: itemlistContainer,
        item: itemElement.jbItem,
        PrevItem: aa_cntr_getPrevItem(itemlistContainer,itemElement.jbItem[0]),
        NextItem: aa_cntr_getNextItem(itemlistContainer,itemElement.jbItem[0]),
        context: context,
        topControl: topControl,
        itemlist: settings.itemlist,
        itemElement: itemElement,
        detailsPage: settings.detailsPage
    };
    detailsElement.jbDetailsReplacingAllObject = detailsReplacingAllObject;

    var ctx2 = aa_ctx(context,{ _DetailsReplacingAll: [detailsReplacingAllObject] });

    aa_fieldControl({ Field: settings.detailsPage, Item: itemElement.jbItem, Wrapper: detailsElement, Context: ctx2,
        DoAfterShow: function() {
            detailsElement.style.display = 'block';  // for async usages
        }
    });

    topControl.jbDetailsReplacingAll = detailsElement;

    if (!settings.transition || window.aa_intest || ajaxart.isIE78) {
        topControl.jbOriginalCtrl.style.display = 'none';
        topControl.appendChild(detailsElement);
        aa_element_attached(topControl);
        aa_scrollToShowElement(detailsElement,'up');
    } else {
        aa_replace_transition({
            transition: settings.transition,
            elOriginal: topControl.jbOriginalCtrl, 
            elNew: detailsElement,
            removeOriginal: function() { $(topControl.jbOriginalCtrl).css({display: 'none'}); },
            onTransitionEnd: function() {
                aa_scrollToShowElement(detailsElement,'up');
                aa_trigger(settings.itemlist,'showDetailsTransitionEnd',{ Item: itemElement.jbItem, itemElement: itemElement, context: settings.context });
            }
          },context);
    }

    aa_trigger(settings.itemlist,'showDetails',{ Item: itemElement.jbItem, itemElement: itemElement, context: settings.context });
}

function aa_text_as_item(showMoreObject) {
    showMoreObject.$el.html( showMoreObject.text );
    showMoreObject.$el.click(function() { 
        showMoreObject.showMore() 
    });
    // Table fix
    var parent = showMoreObject.itemlist.ParentOfItems;
    if (!parent) return;
    var isTable = parent.tagName.toLowerCase() == 'tbody';
    if (isTable) {
        var cols = showMoreObject.itemlist.VisibleFields.length;
        var wrapper = $('<tr class="aa_noitems"><td colspan="' + cols + '" class="td_nocontent"/></tr>')[0];
        $(wrapper).find('>td').append( showMoreObject.$el );
        showMoreObject.$el.addClass("in_table");
        showMoreObject.control = showMoreObject.el = $(wrapper)[0];
        showMoreObject.$el = $(showMoreObject.el);
    }
}

function aa_itemlistcntr_findItemElement(cntr,item) {
    var itemlists = cntr.ItemLists || [];
    for(var i=0;i<itemlists.length;i++) {
        var itemlist = itemlists[i];
        var elems = itemlist.GetElements();
        for(var j=0;j<elems.length;j++)
            if (elems[j].jbItem[0] == item)
                return elems[j];
    }
}

function aa_itemlist_deleteItem(settings) {
    var itemElement = settings.itemElement;
    var cntr = settings.cntr;
    if (!itemElement && settings.item && cntr) {
        itemElement = aa_itemlistcntr_findItemElement(cntr,settings.item);
    }
    if (!cntr || !itemElement || !itemElement.jbItem || !itemElement.jbItem[0]) return;

    var items = cntr.Items,item = itemElement.jbItem[0],found=false;
    for(var i=0;i<items.length;i++) {
      if (items[i] == item) {
          items.splice(i,1);
          found = true;
          if (items.doDeleteItem) 
            items.doDeleteItem(item);
          else if (item.nodeType == 1 && item.parentNode) {
            var parent = item.parentNode;
            if (parent) {
                parent.removeChild(item);
                aa_triggerXmlChange(parent,{ type: 'delete', deletedElem: item });
            }
          }              
          break;
      }
    }   
    if (found) {
        aa_trigger(cntr,'itemDeleted',{ Item: itemElement.jbItem, ItemElement: itemElement });
        aa_trigger(cntr,'afterItemDeleted',{ Item: itemElement.jbItem, ItemElement: itemElement });
        aa_trigger(cntr,'itemsChanged',{ uiUpdated: true });
    }
}

function aa_itemlist_addItem(settings) {
  var item = settings.item, context = settings.context;
  var itemlistID = settings.itemlistID;
  var cntr = settings.cntr || aa_var_first(context,'ItemListCntr');
  if (itemlistID) {
    var control = aa_find_field_controls({ fieldID: itemlistID, context: context })[0];
    if (!control || !control.jbContext) return;
    cntr = control.jbContext.vars.ItemListCntr[0];
    if (!cntr) return;
  }
  var items = cntr.OriginalItems;        
  var addObject = { Item: [item], items: items, addSettings: { location: 'last' } };
  if (settings.updateAddObject) settings.updateAddObject(addObject);
  aa_trigger(cntr,'appendItemElementLocation', { item: settings.item, addSettings: addObject.addSettings});

  if (items.addItem) items.addItem(item,addObject.addSettings);
  if (cntr.Items != cntr.OriginalItems)
    aa_trigger(cntr,'originalItemsChanged');

  cntr.trigger('itemAdded',addObject);
  cntr.trigger('afterItemAdded',addObject);
  cntr.trigger('itemsChanged',{ uiUpdated: true });

  return addObject;
}

function aa_field_aspect_RefreshOnSelectionChange(data,profile,context,cntrVarName) {
    var field = context.vars._Field[0];
    var animation = aa_first(data,profile,'Animation',context);
    var hideWhenNoSelection = aa_bool(data,profile,'HideWhenNoSelection',context);

    if (aa_bool(data,profile,'SelectedItemAsData',context)) {
        field.FieldData = function(data1,ctx) {
            return ctx.vars.SelectedItem || [];
        }
    }

    aa_field_handler(field,'ModifyControl', function(cell,field_data,cell_presentation,ctx,item) {
        var cntr = aa_var_first(ctx,cntrVarName);
        if (!cntr) return;
        
        function refresh(firstTime) {
            var selElement = cntr.SelectedElement ? [cntr.SelectedElement] : [];
            var selItem = cntr.SelectedElement ? cntr.SelectedElement.jbItem : [];
            
            var ctx2 = aa_ctx(field.XtmlSource[0].context,{ SelectedElement: selElement, SelectedItem: selItem, cntrVarName: [cntr] });
            var newField = aa_first(field.XtmlSource[0].input,field.XtmlSource[0].script,'',ctx2);
            cell.Field = newField; 
            var transition = firstTime ? null : animation;
            aa_refresh_cell(cell,ctx2,transition,{
                SelectedElement: selElement, SelectedItem: selItem
            });
            
            if (hideWhenNoSelection && !selElement && cell.firstChild) $(cell.firstChild).css('display','none');
        }
        
        aa_bind(cntr,'selectionChanged',function() {
            refresh();
        },'SelectionContext_'+field.Id);
        
        if (cntr.SelectedElement) {
            if (!context.vars.SelectedElement || context.vars.SelectedElement[0] != cntr.SelectedElement ) 
                refresh(true);
        } else {
            if (hideWhenNoSelection && cell.firstChild) $(cell.firstChild).css('display','none');
        }        
    },'RefreshOnSelectionChange');
}