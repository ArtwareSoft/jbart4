
ajaxart.load_plugin("operation","plugins/ui/operation.xtml");

aa_gcs("operation", {
  RunActionInJavascript: function(profile, data, context) {
    var result = aa_apply_style_js(data,{
      Javascript: aa_text(data,profile,'Code',context)
    },context,'run');
    return aa_isArray(result) ? result : [];
  },
  RunInOperationContext: function (profile,data,context)
    {
      var jElem = $(context.vars.ControlElement);
      var itemElem = null;
      while (jElem.length > 0) {
        if (jElem.hasClass('aa_item') && !itemElem) itemElem = jElem[0];
        if (jElem.hasClass('aa_layoutgroup') ) itemElem = null; // try the next one
        if (jElem.hasClass('aa_container') && itemElem ) break; // all found
        
        jElem = jElem.parent();
      }
      if (itemElem == null) var ctx = context;
      else var ctx = aa_ctx(context,{_ElemsOfOperation: [itemElem] , _ItemsOfOperation: itemElem.ItemData , _Items: context.vars._Cntr[0].Items });
      
      return ajaxart.run(data,profile,'Action',ctx);
    },
    OpenSecondaryItemDetails: function (profile,data,context)
    {
      var dataitems = context.vars._Cntr[0].Items[0];
      var newContext = aa_ctx(context,{ _Transactional: ajaxart.run(data,profile,'Transactional',context), 
        _InnerItem: context.vars._ItemsOfOperation });
      var subset = newContext.vars._InnerItems = aa_runMethod(data,dataitems,'Subset',newContext);
      if (subset.length == 0) {
        var subsetObj = { isObject: true , Items: newContext.vars._InnerItem };
        subsetObj.Save = function(data1,ctx) {
          var info = aa_getXmlInfo(this.Items[0],context);
          if (info.Save) return info.Save(data1,ctx);
        }
        subset = newContext.vars._InnerItems = [subsetObj];
      }
      if (subset.length == 0) return []; 
      if (aa_bool(data,profile,'ReadOnly',context))
        subset[0].ReadOnly = ["true"];

      var openCtrl_func = function(subset) { return function() 
      {
        var cntr = context.vars._Cntr[0];
        var item = [subset.Items[0]];
        ajaxart.run(item,profile,'ChangeItemBeforeOpen',context);
        var page_params = {isObject:true, DataItems: subset};
        var newContext = aa_ctx(context,{ _InnerItems: [subset], _PageParams: [page_params], _Transactional: ajaxart.run(data,profile,'Transactional',context) });
        var page = aa_first(item,profile,'ItemPage',context);
        var itemDetailsObj = { isObject: true }

        var info = aa_getXmlInfo(subset.Items[0],context);
        if (info && info.PrepareForEdit) info.PrepareForEdit([],newContext);
        
        aa_init_itemdetails_object(itemDetailsObj,item,info,subset,page,context);
        newContext.vars._ItemDetailsObject = [ itemDetailsObj ];
        newContext.vars.DetailsControl = aa_runMethod(item,page,'Control',newContext);
        newContext.vars.ItemPage = [page];
        
        return ajaxart.run(item,profile,'OpenIn',newContext);
      }};
      
      ajaxart_RunAsync(data,subset[0].Prepare,context, openCtrl_func(subset[0]));
      return ["true"];
    },
    RunOperationFromParent: function (profile,data,context)
    {
      var parentCntr = context.vars._ItemDetailsObject[0].ParentCntr;
      var opid = aa_text(data,profile,'Operation',context);
      var ops = aa_runMethod([],parentCntr,'Operations',context)
      var op = aad_object_byid(ops,opid);
      if (op != null) {
        var newContext = aa_ctx(context,{_ElemsOfOperation: context.vars._ItemDetailsObject[0].ElemsOfOperation , _Cntr: [parentCntr]});
        aa_runMethod(data,op,'Action',newContext);
      }
    },
    ChangeTab: function (profile,data,context)
    {
      var moveto = aa_text(data,profile,'MoveTo',context);
      var movetotab = aa_text(data,profile,'TabToMoveTo',context);
      var tabcontrol = aa_text(data,profile,'TabControl',context);
      var animation = aa_first(data,profile,'Animation',context);
      
      // new tab control
      var controlElement = aa_var_first(context,'ControlElement');
      var root = (controlElement && (ajaxart.isattached(controlElement) || aa_intest) ) ? ajaxart.xml.root(controlElement) : document.body;
      var tabcontrols = $(root).find('.aa_tabcontrol').get();
      if (!tabcontrols[0] && root != document.body) tabcontrols = $('body').find('.aa_tabcontrol').get();
      var closestTab = (controlElement && (ajaxart.isattached(controlElement) || aa_intest) ) ? $(controlElement).closest('.aa_tabcontrol.fld_'+tabcontrol) : $([]);
      if (closestTab[0]) tabcontrols.unshift(closestTab[0]);
       
      for(var i=0;i<tabcontrols.length;i++) { 
        var tabID = '';
        if (tabcontrols[i].Field) tabID = tabcontrols[i].Field.Id || aa_totext(tabcontrols[i].Field.ID);
        if (tabcontrols[i].Cntr) tabID = aa_totext(tabcontrols[i].Cntr.ID); 
        if (tabID == tabcontrol) {
          if (tabcontrols[i].jbChangeTab) {
            tabcontrols[i].jbChangeTab(moveto,movetotab);
            return;
          }
          if (tabcontrols[i].jbContext)
            if (tabcontrols[i].jbContext.vars._AppContext[0] != context.vars._AppContext[0]) continue;
          
          var tabs = tabcontrols[i].TabControl.Tabs;
          if (tabcontrols[i].RefreshTabsHead)
            tabcontrols[i].RefreshTabsHead();
          if (moveto == 'specific tab') {
            for(var j=0;j<tabs.length;j++)
              if (tabs[j].Field.Id == movetotab) { 
                if (tabs[j].Select) tabs[j].Select(null,animation);
                else if (tabs[j].onmousedown) tabs[j].onmousedown(); 
                return; 
              }
          } else {
            var selected = $(tabs).filter('.aa_selected_tab')[0];
            if (moveto == "refresh current tab") selected.Select(null,animation);
            if (moveto == "next tab" && selected.nextSibling) selected.nextSibling.Select(null,animation);
            if (moveto == "previous tab" && selected.previousSibling) selected.previousSibling.Select(null,animation);
          } 
          return;
        }
      }
      return;
    },
    Copy: function (profile,data,context)
    {
      var op = { isObject : true, isOperation : true };
      op.Id = aa_text(data,profile,'Copy',context);
      
      var copy = function(data1,ctx)
      {
        var cntr = ctx.vars._Cntr[0]; 
        var selected = ctx.vars._ItemsOfOperation;
        if (selected.length > 0)
        {
          document.aa_clipboard = selected[0];
          document.aa_cut = false;
        }
        return [];
      };

      ajaxart_addScriptParam_js(op,'Action',copy ,context);

      op.Shortcut = aa_text(data,profile,'Shortcut',context);
      aa_addMethod(op,'Icon',profile,'Icon',context);
      aa_addMethod(op,'Title',profile,'Title',context);
      op.Disabled = function(data1,ctx) { return aa_bool(data1,profile,'Disabled',aa_merge_ctx(context,ctx)) };

      var newContext = aa_ctx(context,{_Operation: [op]} );
      ajaxart.runsubprofiles(data,profile,'Aspect',newContext);

      return [op];
    },
    Cut: function (profile,data,context)
    {
      var op = { isObject : true, isOperation : true };
      op.Id = aa_text(data,profile,'Cut',context);
      
      var cut = function(data1,ctx)
      {
        var cntr = ctx.vars._Cntr[0]; 
        var selected = ctx.vars._ItemsOfOperation;
        if (selected.length > 0)
        {
          document.aa_clipboard = selected[0];
          document.aa_cut = true;
        }
        return [];
      };
      ajaxart_addScriptParam_js(op,'Action',cut ,context);

      op.Shortcut = aa_text(data,profile,'Shortcut',context);
      aa_addMethod(op,'Icon',profile,'Icon',context);
      aa_addMethod(op,'Title',profile,'Title',context);
      op.Disabled = function(data1,ctx) { return aa_bool(data1,profile,'Disabled',aa_merge_ctx(context,ctx)); };

      var newContext = aa_ctx(context,{_Operation: [op]} );
      ajaxart.runsubprofiles(data,profile,'Aspect',newContext);
      
      return [op];
    },
    Paste: function (profile,data,context)
    {
      var op = { isObject : true, isOperation : true };
      op.Id = aa_text(data,profile,'Paste',context);
      
      var paste = function(data1,ctx)
      {
        var cntr = ctx.vars._Cntr[0]; 
        var selected = ctx.vars._ItemsOfOperation;
        if (selected.length > 0)
        {
          var newcontext = aa_ctx(context,{Clipboard: document.aa_clipboard} );
          ajaxart.run(selected,profile,document.aa_cut ? 'CutPasteAction' : 'CopyPasteAction',newcontext);
        }
        return [];
      };
      ajaxart_addScriptParam_js(op,'Action',paste ,context);

      op.Shortcut = aa_text(data,profile,'Shortcut',context);
      aa_addMethod(op,'Icon',profile,'Icon',context);
      aa_addMethod(op,'Title',profile,'Title',context);
      op.Disabled = function(data1,ctx) { return aa_bool(data1,profile,'Disabled',aa_merge_ctx(context,ctx)) };

      var newContext = aa_ctx(context,{_Operation: [op]} );
      ajaxart.runsubprofiles(data,profile,'Aspect',newContext);

      return [op];
    },
    ContextMenu: function (profile,data,context)
    {
      var menu = { isObject : true,  Items : [], IncludeOperationsFromParent: true };
      menu.Presentation = function(data1, ctx) { return aa_run_component("ui.ButtonAsHyperlink",data1,ctx); };
      var cntr = context.vars._Cntr[0];
      var newContext = aa_ctx(context,{_Menu: [menu], _ElemsOfOperation: cntr.ElemsOfOperation() , _ItemsOfOperation: cntr.ItemsOfOperation() } );
      var aspects = ajaxart.runsubprofiles(data,profile,'MenuAspect',newContext);
      for(var i=0;i<aspects.length;i++)
        if (aspects[i].addOperations) aspects[i].addOperations();
      
      return [menu];
    },
    OperationsByIDs: function (profile,data,context)
    {
      return [{ isObject: true, addOperations: function()
        {
      var menu = context.vars._Menu[0];
      var cntr = context.vars._Cntr[0];
      var operations = aa_text(data,profile,'OperationIDs',context).split(',');
      var result = [];
      for(var i=0;i<operations.length;i++)
      {
        op = aad_object_byid(menu.Items,operations[i]); 
        if (op != null)
          result.push(op);
      }

      menu.Items = result;
      return [];
      }}];
    },
    Validate: function (profile,data,context)
    {
      var groupID = aa_text(data,profile,'Group',context);
      var controls = [];
      
        var top = aa_intest ? aa_intest_topControl : document;
      var controls = groupID ? $(top).find('.fld_'+groupID).get() : [];
      
      for(var i=0;i<controls.length;i++) {
        if (!aa_passing_validations(controls[i])) return;
      }
      
      return ajaxart.run(data,profile,'WhenValid',context);
    },
    IncludeItemOperationsFromParent: function (profile,data,context)
    {
      var menu = context.vars._Menu[0];
      menu.IncludeOperationsFromParent = aa_bool(data,profile,'Include',context);
      return [];
    },
    Presentation: function (profile,data,context)
    {
      var menu = context.vars._Menu[0];
      aa_addMethod(menu,'Presentation',profile,'Style',context);
      return [];
    },
    ExportItemlistTableToExcel: function (profile,data,context)
    {
      var control = aa_find_field_controls({ fieldID: aa_text(data,profile,'Itemlist',context) , context: context })[0];
      if (!control || !control.jbItemList) return;
      var itemlist = control.jbItemList;
      
      var csv='';

      var fields = itemlist.VisibleFields;
      for(var i=0;i<fields.length;i++) {
        var title = aa_fieldTitle(fields[i],itemlist.InputData,itemlist.Context);
        csv += fixCsvCell(title);
        if (i < fields.length-1) csv += ',';
      }

      var items = itemlist.itemlistCntr.Items;
      for(var i=0;i<items.length;i++) {
        csv += '\n';
        for (var j=0; j<fields.length; j++) {
          var item = [items[i]];
          var cell = $('<td/>')[0];
          itemlist.CreateFieldControl(item,cell,fields[j],i+1);
          var val = $(cell).text();
          csv += fixCsvCell(val);

          if (j < fields.length-1) csv += ',';
        }
      }

      var fileName = aa_text(data,profile,'FileName',context);
      // var url = aa_text(data,profile,'ServerBaseUrl','context') + '&fileName=' + encodeURIComponent(fileName);
      // url += '&fileData=' + encodeURIComponent(csv) + '&_' + new Date().getTime();

      // var $link = $('<a/>').attr('href',url).attr('target','_new').attr('download',fileName);
      // $link[0].click();

      var url = aa_text(data,profile,'ServerBaseUrl','context');
      var $form = $('<form />').attr('action',url).attr('method','post').attr('target','_new');
      $('<input/>').attr('type','hidden').attr('name','fileData').val(csv).attr('value',csv).appendTo($form);
      $('<input/>').attr('type','hidden').attr('name','fileName').val(fileName).attr('value',fileName).appendTo($form);
      $form[0].submit();

      function fixCsvCell(cell) {
        if (cell.indexOf(',') > -1)
          return '"'+cell.replace(/"/,'""')+'"';
        return cell;
      }
    },
    Search: function(profile,data,context)
    {
      var cntr = (context.vars.HeaderFooterCntr || context.vars._Cntr)[0];
      if (cntr == null) return;
      
      aa_recalc_filters_and_refresh(cntr,context.vars._Item,context);
      var pagesToRefresh = aa_text(data,profile,'MorePagesToRefresh',context).split(',');
      for(var i in pagesToRefresh)
      {
        var page = pagesToRefresh[i];
        var top = aa_intest ? $(cntr.Ctrl).parents().slice(-1) : $();
        var cntr_ctrl = top.find('.aa_container').filter(function() { return this.Cntr.ID[0] == page })[0];
        if (cntr_ctrl)
        {
          var target_cntr = cntr_ctrl.Cntr; 
          target_cntr.FilteredWrappers = cntr.FilteredWrappers;
          aa_refresh_itemlist(target_cntr,context);
        }
      }
      return [];
    },
    RunJavascript :function(profile,data,context)
    {
      aa_run_js_code(aa_text(data,profile,'Code',context),data,context);
      return [];
    }
});


aa_gcs("action",{
  Validate: function(profile,data,context) {
    var groupID = aa_text(data,profile,'Group',context);
    var controls = [];
    
    var top = aa_intest ? aa_intest_topControl : document;
    var control = groupID ? $(top).find('.fld_'+groupID)[0] : null;
    if (!control) return;

    if (!aa_checkValidations(control)) {
      ajaxart.run(data,profile,'WhenError',context);
      return;
    }

    return ajaxart.run(data,profile,'WhenValid',context);
  }
});