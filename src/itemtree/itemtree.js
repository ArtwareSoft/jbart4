ajaxart.load_plugin("", "plugins/itemtree/itemtree.xtml");

// white-space: nowrap;
// http://wwwendt.de/tech/dynatree/doc/samples.html

aa_gcs("itemtree_aspect", {
  ItemTreeContainer: function(profile, data, context) {
    var field = context.vars._Field[0];
    aa_bind(field,'ModifyInstanceContext',function(args) {
        var items = aa_run(args.FieldData, profile, 'Items', aa_merge_ctx(context,args.Context));
        args.Context.vars.ItemTreeCntr = [aa_itemtreeContainer(items,field.Id,field)];
        
        aa_trigger(field,'initItemtreeCntr',args.Context.vars.ItemTreeCntr[0]);
    });
    field.hasItemtreeContainer = true;
  },
  RefreshOnTreeSelectionChange: function(profile, data, context) {
    aa_field_aspect_RefreshOnSelectionChange(data,profile,context,'ItemTreeCntr');    
  },
  TreeProperties: function(profile, data, context) {
    aa_bind(context.vars._Field[0],'initApiObject',function(args) {
      args.apiObject.lazy = aa_bool(data,profile,'LazyCreation',context);
      if (aa_hasParam(profile,'ControlForItem')) {
        args.apiObject.controlForItem = function(item,wrapper) {
          aa_fieldControl({
            Field: aa_first([item],profile,'ControlForItem',context),
            Item: [item],
            Wrapper: wrapper,
            Context: context
          });
        }
      }
    })
  },
  TreeLongList: function(profile, data, context) {
    aa_bind(context.vars._Field[0],'initApiObject',function(args) {
      args.apiObject.MaxItemsPerPage = aa_int(data,profile,'MaxItemsPerPage',context);
      var style = aa_first(data,profile,'Style',context);
      var text = aa_first(data,profile,'TextForShowMore',context);
      args.apiObject.longListMaxItems = aa_int(data,profile,'MaxItemsPerPage',context);
      args.apiObject.longListShowMoreButton = function() {
        return aa_renderStyleObject(style, { text: text }, context);
      };
    });
  }
});

aa_gcs("itemtree", {
  TreeItems: function(profile, data, context) {
    var items = ajaxart.run(data, profile, 'Items', context);
    items.SubItems = function(item) {
      return subitemsFunc(item, items);
    };
    return items;

    function subitemsFunc(item, list) {
      // make sure the item is in the list
      var found = false;
      for (var i = 0; i < list.length; i++) {
        if (list[i] == item) {
          found = true;
          break;
        }
      }

      if (!found) return null;

      var subitems = ajaxart.run([item], profile, 'SubItems', context);
      subitems.SubItems = function(item) {
        return subitemsFunc(item, this);
      };
      return subitems;
    }
  },
  Tree: function(profile, data, context) {
    var field = aa_create_base_field(data, profile, context);
    aa_init_class_Tree();
    if (aa_xpath(profile,'Items').length > 0) // defines its own items (acts as a container)
      ajaxart.runNativeHelper(data,profile,'ContainerAspect',aa_ctx(context,{ _Field: [field] }));

    field.Control = function(field_data, ctx) {
      var ctx2 = aa_merge_ctx(context,ctx);
      jBart.trigger(field,'ModifyInstanceContext',{ Context: ctx2, FieldData: field_data });

      var cntr = aa_var_first(ctx2,'ItemTreeCntr');
      if (!cntr) return $('<div/>').get();
      var items = cntr.Items;

      var treeObject = new ajaxart.classes.Tree({
        items: items,
        _fieldData: field_data,
        _profile: profile,
        context: ctx2,
        cntr: cntr,
        lazy: true,
        itemSelection: aa_bool(data,profile,'ItemSelection',context)
      });
      var out = aa_renderStyleObject2(field.Style, treeObject, field_data,field,ctx2);
      return [out];
    };

    return [field];
  }
});

aa_gcs("itemtree_event", {
  BeforeTreeSelectAsync: function(profile, data, context) {
    var field = context.vars._Field[0];
    field.BeforeTreeSelectAsync = function(item,ctx,treeSelectObject) {
      var ctx2 = aa_merge_ctx(context,ctx,{_TreeSelect: [treeSelectObject]});
      context.vars.EventAction[0].run(item,ctx2);
    };
  }
});


function aa_init_class_Tree() {
  if (ajaxart.classes.Tree) return;

  ajaxart.classes.Tree = function(settings) {
    aa_extend(this, settings);
  };
  ajaxart.classes.Tree.prototype.itemText = function(item) {
    return aa_text([item], this._profile, 'ItemText', this.context);
  };
  ajaxart.classes.Tree.prototype.itemImage = function(item) {
    return aa_first([item], this._profile, 'ItemImage', this.context);
  };
}

function aa_item_tree(tree, settings) {
  settings = aa_defaults(settings, {
    nodeElement: tree.$el.firstOfClass('aa_tree_node')[0],
    nodeSettings: function(node) {
      return {
        toggleElement: node.$el.find('.aa_tree_node_expandbox'),
        imageElement: node.$el.find('.aa_tree_node_image'),
        textElement: node.$el.find('.aa_tree_node_text'),
        subnodesElement: node.$el.find('.aa_tree_node_subnodes'),
        subnodeElement: node.$el.find('.aa_tree_node')
      };
    }
  });

  var allItems = [];
  var baseNodeTemplate = settings.nodeElement;
  renderNodes(tree.items, settings.nodeElement,0);
  if (tree.itemSelection)
    supportSelected();

  function renderNodes(subitems, nodeTemplate, depth) {
    var nodeParent = $(nodeTemplate).parent()[0] || nodeTemplate.nodeParent;
    nodeTemplate.nodeParent = nodeParent;	// Keep node parent for next render
    $(nodeTemplate).remove();

    nodeTemplate.jbIsRendered = false;
    nodeTemplate.jbRender = function() {
      nodeTemplate.jbIsRendered = true;

      for (var i = 0; i < subitems.length; i++) {
        var item = subitems[i];
        if (isItemInTree(item)) continue;
        var nodeElement = $(baseNodeTemplate).clone().appendTo(nodeParent);
        nodeElement[0].jbItem = [item];

        renderNode({
          item: item,
          items: subitems,
          el: nodeElement[0],
          $el: nodeElement
        },depth);
      }
    }

    if (depth<2 || !tree.lazy)
      nodeTemplate.jbRender();
    else
      if (depth > 1) 
        $(nodeParent).closest('.aa_tree_node').addClass('collapsed');
  }

  function renderNode(node,depth) {
    var nodeSettings = settings.nodeSettings(node);
    var nodeText = tree.itemText(node.item);
    var nodeImage = tree.itemImage(node.item);
    if (nodeImage && nodeImage.Url) {
      nodeImage.StaticUrl = aa_totext(nodeImage.Url([node.item], tree.context));
      nodeImage = aa_create_static_image_object(nodeImage);
    }

    if (tree.controlForItem) {
      tree.controlForItem(node.item,$(nodeSettings.textElement)[0]);
    } else {
      $(nodeSettings.textElement).text(nodeText);
    }
    aa_setImage(nodeSettings.imageElement, nodeImage, {
      removeIfNoImage: true
    });

    var subitems = (node.items.SubItems && node.items.SubItems(node.item)) || [];
    if (!subitems.length) {
      node.$el.addClass('leaf');
      $(nodeSettings.subnodesElement).hide();
      node.$el.firstOfClass('aa_tree_node_subnodes').remove();
    } else {
      if (tree.longListMaxItems && subitems.length > tree.longListMaxItems) {
        var nodeParent = $(nodeSettings.subnodeElement).parent();
        renderNodesWithLongList(0);
        function renderNodesWithLongList(renderedSoFar) {
          var items = subitems.slice(renderedSoFar,renderedSoFar + tree.longListMaxItems);
          renderNodes(items, nodeSettings.subnodeElement,depth+1);
          if (subitems.length > renderedSoFar + tree.longListMaxItems) {
            var showMoreButton = tree.longListShowMoreButton();
            $(showMoreButton).click( function() { 
                $(this).hide();
                renderNodesWithLongList(renderedSoFar + tree.longListMaxItems);
              });
            nodeParent.append(showMoreButton);
          }
        }
      } else
        renderNodes(subitems, nodeSettings.subnodeElement,depth+1);
      $(nodeSettings.toggleElement).click(function() {
        node.$el.toggleClass('collapsed');
        if (!nodeSettings.subnodeElement.jbIsRendered)
          nodeSettings.subnodeElement.jbRender();
      });
    }
  }

  function supportSelected() {
    aa_bind(tree, 'selectionChanged', function(args) {
      tree.cntr.SelectedElement = args.el;
      aa_trigger(tree.cntr,'selectionChanged');
    });

    var firstEl = tree.$el.firstOfClass('aa_tree_node_line')[0];
    setSelectedElement(firstEl);

    tree.$el.click(function(event) {
      var line = $(event.target).has('.aa_tree_node_line').length ? $(event.target) : $(event.target).closest('.aa_tree_node_line');
      if (line[0] && tree.field.BeforeTreeSelectAsync && !line.hasClass('selected')) {
        var selectObject = {
          Cancel: function() {},
          Approve: function() {
            setSelectedElement(line[0]);
          }
        }
        tree.field.BeforeTreeSelectAsync(line[0].parentNode.jbItem || [],tree.context,selectObject);
        return;
      }
      setSelectedElement(line[0]);
    });

    tree.$el.keydown(function(event) {
      if (event.keyCode == 40) { moveSelectionDown(); aa_stop_prop(event); }
      if (event.keyCode == 38) { moveSelectionUp(); aa_stop_prop(event); }
      if (event.keyCode == 37) { collapseSelected(); aa_stop_prop(event); }
      if (event.keyCode == 39) { expandSelected(); aa_stop_prop(event); }
    });

    if (tree.el.tabIndex == -1) tree.el.tabIndex = 0;
    tree.$el.focus();
  }

  function setSelectedElement(newSelected) {    
    if ($(newSelected).hasClass('selected')) return;
    tree.$el.find('.selected').removeClass('selected');
    if (!newSelected) return;
    $(newSelected).addClass('selected');

    aa_trigger(tree, 'selectionChanged', {
      el: newSelected.parentNode
    });
  }

  function moveSelectionDown() {
    var selected = tree.$el.find('.selected');
    var node = selected.closest('.aa_tree_node');
    var nextNode = (!node.hasClass('collapsed') && node.find('.aa_tree_node_subnodes .aa_tree_node')[0]);
    if (!nextNode) {
      var iter = node[0];
      // try the next sibling, or the next sibling of the parent
      while (iter && !nextNode) {
        nextNode = iter.nextSibling;
        iter=$(iter.parentNode).closest('.aa_tree_node')[0];
      }      
    }
    if (!nextNode) {
      nextNode = tree.$el.firstOfClass('aa_tree_node')[0];
    }
    var newSelected = $(nextNode).find('.aa_tree_node_line')[0];

    setSelectedElement(newSelected);
  }

  function moveSelectionUp() {
    var selected = tree.$el.find('.selected');
    var node = selected.closest('.aa_tree_node');
    var prevNode = node[0].previousSibling;

    while(prevNode) {
      if ($(prevNode).hasClass('collapsed') || $(prevNode).hasClass('leaf')) break;
      var subnodes = $(prevNode).find('.aa_tree_node_subnodes>.aa_tree_node');
      prevNode = subnodes[subnodes.length-1];
    }

    if (!prevNode) {
      prevNode = node.parent().closest('.aa_tree_node')[0];
    }

    if (prevNode) {
      var newSelected = $(prevNode).find('.aa_tree_node_line')[0];
      setSelectedElement(newSelected);
    }
  }

  function collapseSelected() {
    var selected = tree.$el.find('.selected');
    var node = selected.closest('.aa_tree_node');
    node.addClass('collapsed');
  }

  function expandSelected() {
    var selected = tree.$el.find('.selected');
    var node = selected.closest('.aa_tree_node');
    node.removeClass('collapsed');
  }

  function isItemInTree(anitem) {
    for(var i=0;i<allItems.length;i++)
      if (allItems[i] == anitem) return true;

    allItems.push(anitem);
    return false;
  }

}

function aa_itemtreeContainer(items,id,field) {
  var cntr = {
    Id: id,
    Items: items,
    Field: field,
    ItemTrees: []
  };
  items.cntr = cntr;
  return cntr;
}

