function bartdt_page_params(page,context) {
	if (page.ResourceID && page.ResourceID != "") return [];	// no need for page params. it contains its own resource within
	var ct = page.ContentType;
	if (context.vars._ServerAdapter && context.vars._ServerAdapter[0].DB) {
	  var db = context.vars._ServerAdapter[0].DB[0];
	  var items = aa_xpath(db,aa_totext(ct)+'/*');
	  if (items.length == 0) items = [ aa_parsexml('xml') ];
	  var dataitems = { isObject:true, Items: items }
	  return [ { isObject: true, DataItems: dataitems} ];
	}
	return [];
}
function bart_find_top_circuit_of_page(xtml,context)
{
	var page = null;
	for (var node=xtml; node!=null; node=ajaxart.xml.parentNode(node)) {
		if (node.nodeType == 1 && node.getAttribute("type") == "jbart.MyWidgetPage")
			page = ajaxart.childElem(node,'xtml');
		if (aa_tag(node) == "Page")
			page = node;
		if (page != null) {
			var circuit = {isObject:true };
			var top_circuit_runner = {isObject:true, PageDef: ajaxart.run([],page,'',context)[0] };
			top_circuit_runner.TopCircuit = function() {
				var newContext = aa_ctx(context,{_PageParams: bartdt_page_params(this.PageDef,context)});
				var baseData = [];
				if (this.PageDef.FieldData) baseData = this.PageDef.FieldData([],context); // a page which is a field
				
				if (this.PageDef.Control) this.PageDef.Control(baseData,newContext);
			};
			// Run page once and find inputs for xtml
			var ctx1 = aa_ctx(ajaxart.newContext(), { AAEditorState: [{isObject:true, SelectedInTree: [{isObject:true, Xtml: [xtml]}] }] });
			var inputs = aa_run_component("xtml_dt.CalcPreviewHelper",[top_circuit_runner],ctx1);
			if (inputs.length > 0 && inputs[0].Input.length > 0)
				circuit.Input = inputs[0];
			circuit.RunCircuit = function() {
				var out;
				if (this.Input)
					out = ajaxart.run(this.Input.Input, xtml, '', this.Input.context);
				else // rerun entire page
					top_circuit_runner.TopCircuit();
//					out = ajaxart.run([], xtml, '', context);	// todo: put bart global data sources here
				return out;
			}
			if (aa_tag(xtml) == 'Page') {
				circuit.RunCircuit = function() {
					var page_def = ajaxart.run([],xtml,'',context)[0];
					if (page_def.Control) return page_def.Control([],aa_ctx(context,{_PageParams: bartdt_page_params(page_def,context)}));
				}
			}
			if (aa_tag(xtml) == "Field" && circuit.Input)
				bart_find_top_circuit_handle_field(xtml,circuit);
			if (aa_tag(xtml) == "Operation" || aa_tag(xtml) == "Action") {
				circuit.GlobalPreview = function() {};	// no preview
			}
			else {
				circuit.GlobalPreview = function() {
					var out = this.RunCircuit();
					if (ajaxart.ishtml(out)) 
						return out;
					else 	// text to html
						return [jQuery("<span/>").text(ajaxart.totext_array(out))[0]];
				};
			}
			return circuit;
		}
	}
	return null;
}
function bart_find_top_circuit(xtml,context)
{
	var page_result = bart_find_top_circuit_of_page(xtml,context);
	if (page_result) return page_result;		// First try to run as page
	
	var circuit = {isObject:true };

	var elems = [xtml];
	var parent = aa_xpath(xtml,'..')[0];
	if (parent == null) return null;
	while (parent.getAttribute('t') != 'bart.Application' && parent.tagName != 'Usage') {
		if (parent.tagName == 'Component' && parent.parentNode && parent.parentNode.getAttribute('_type')=='bart_unit') {
			// a component. try to find its usage
			var fullid = parent.parentNode.getAttribute('id') + '.' + parent.getAttribute('id');
			var usage = aa_xpath(parent.parentNode,"Component[@id='App']/xtml/Usage[@Of='"+fullid+"']")[0];		// TODO: move the usages
			if (usage == null)
				usage = aa_xpath(parent.parentNode,"Usage[@Of='"+fullid+"']")[0];
//			if (usage == null)
//				usage = elems[elems.length-1];  // the xtml
			
			if (usage != null) {  // the usage is our main circuit
				var circuit = {isObject:true, Usage: usage, Context: context };
				circuit.RunCircuit = function() { ajaxart.run([],this.Usage,'',this.Context); }
				circuit.GlobalPreview = function() { return ajaxart.run([],this.Usage,'',this.Context,'Result'); } 
				return circuit;
			}
		}
		elems.push(parent);
		parent = parent.parentNode;
		if (parent == null || parent.nodeType == 9) return null; // not bart
	}
	elems = elems.reverse();
	if (elems[0].tagName == 'Usage') {
		var init = function(circuit,usageProf) {
		  circuit.RunCircuit = function() { ajaxart.run([],usageProf,'',context); }
		}
		init(circuit,elems[0]);
		return circuit;
	}
	if (elems[0].tagName != "Pages" || elems.length <= 1) return null;
	var page = elems[1];
}
function bart_find_top_circuit_handle_field(xtml,circuit)
{
	var dummy_container = ajaxart.xml.clone([xtml.parentNode]);
	if (dummy_container.getAttribute("t") == "bart.MultiplePage")
		dummy_container.setAttribute("t","ui.ItemList");
	if (dummy_container.getAttribute("t") == "bart.SinglePage" || dummy_container.getAttribute("t") == "field.XmlGroup" )
		dummy_container.setAttribute("t","ui.Document");
	var to_remove = ajaxart.childElems(dummy_container,"Field");
	to_remove = to_remove.concat(ajaxart.childElems(dummy_container,"Fields"));
	to_remove = to_remove.concat(ajaxart.childElems(dummy_container,"Items"));
	to_remove = to_remove.concat(ajaxart.childElems(dummy_container,"Item"));
	for (var i=to_remove.length-1; i>=0; i--)
		dummy_container.removeChild(to_remove[i]);
	if (dummy_container.getAttribute("t") == "ui.ItemList") {
		dummy_container.appendChild(aa_parsexml('<Items t="data_items.Items" Items="%%" />','','',true,dummy_container));
	}
	dummy_container.appendChild(aa_parsexml('<Fields t="xtml_dt.DummyFieldForPreview" />','','',true,dummy_container));
	circuit.DummyContainer = dummy_container;
	circuit.ContainerInput = ajaxart.dynamicText([],'%$_Cntr/Items/Items%',circuit.Input.context);
	circuit.RunCircuit = function() {
		return ajaxart.run(this.ContainerInput, this.DummyContainer, '', aa_ctx(this.Input.context, {_FieldForPreview: [xtml]}));
	}
}
