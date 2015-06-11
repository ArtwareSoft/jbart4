ajaxart.load_plugin("xtml_dt", "plugins/aaeditor/xtml_dt_tree.xtml");
// AA BeginModule
ajaxart.gcs.xtml_dt_tree = {
	TreeDataItems : function(profile, data, context) {
		var out = {
			isObject : true,
			Top : true,
			Xtml : aa_first(data, profile, 'TopXtml', context),
			Type : aa_text(data, profile, 'Type', context)
		};
		var topObj = {
			isObject : true,
			ParentXtml : out.Xtml,
			Top : true,
			Type : aa_text(data, profile, 'Type', context)
		};
		topObj.ParamXml = aa_parsexml("<Param type='" + topObj.Type
				+ "' script='true' />", "top param", null, false);
		out.Items = [ topObj ];
		if (aa_tag(topObj.ParentXtml) == 'Component')
			topObj.Component = true;
		aa_xtmldt_setnextlevel(out, context);
		aa_xtmldt_setfunctions(topObj);

		return [ out ];
	},
	SaveManager: function(profile, data, context) {
		return [ aa_save_manager ];
	},
	FindTreeTopInDialog : function(profile, data, context) {
		var dialog = context.vars.ControlElement[0];
		return [ jQuery(dialog).find(".aa_xtml_tree").children("ul").children("li").children(".aa_text")[0] ];
	},
	TreeObject : function(profile, data, context) {
		var top = {
			isObject : true
		};
		// putting properties and methods
	for ( var elem = profile.firstChild; elem != null; elem = elem.nextSibling) {
		if (elem.nodeType == 1) {
			var tag = elem.tagName;
			var name = elem.getAttribute('name');
			if (name == null || name == "")
				continue;
			if (tag == 'Property') {
				top[name] = ajaxart.run(data, elem, '', context);
			} else if (tag == 'Method') {
				aa_addMethod(top, name, elem, '', context);
			}
		}
	}
	top.SetTreeTop = function(item, ctx) {
		var top = this;
		top.TreeTop = jQuery(ctx.vars._Cntr[0].Ctrl).find(".aa_listtop").find(">.aa_item")[0];
		// calc path
		top.Path = "";
		for ( var current = top.TopXtml[0]; current != null
				&& current.getAttribute; current = current.parentNode) {
			if (aa_tag(current) == 'Component') {
				top.Path = current.getAttribute("id") + "/" + top.Path;
				break;
			}
			var current_text = aa_tag(current);
			var id = null;
			if (current.getAttribute("ID"))
				id = current.getAttribute("ID");
			if (current.getAttribute("name"))
				id = current.getAttribute("name");
			if (id)
				current_text += "[" + id + "]";
			top.Path = current_text + "/" + top.Path;
		}
		if (top.Path.lastIndexOf("/") == top.Path.length - 1)
			top.Path = top.Path.substring(0, top.Path.length - 1);
		ajaxart.log(top.Path);
	};
	top.KeepCurrentPath = function(item, ctx) {
		var top = this;
		var current_elem = ctx.vars._ElemsOfOperation;
		var path = "";
		while (!current_elem[0].ItemData[0].Top) {
			var text = current_elem[0].ItemData[0].Text(current_elem[0].ItemData, ctx)[0].split(" =")[0];
			path = text + ((path == "") ? "" : "/" + path);
			current_elem = jQuery(current_elem[0]).parents('.aa_item');
		}
		if (path)
			sessionStorage.aaeditor_path = path;
	}
	top.GoToPreviousPath = function(item, ctx) {
		var top = this;
		var path = sessionStorage.aaeditor_path;
		if (path == null)
			return;
		var current_elem = top.GoToPath(path, ctx);
		if (current_elem)
			ajaxart_uiaspects_select(jQuery(current_elem), jQuery(), "auto", ctx, true);
	};
	top.GoToPath = function(path, ctx) {
		var top = this;
		var current_elem = top.TreeTop;
		if (path == "")
			return current_elem;
		var path_items = path.split("/");
		for ( var i = 0; i < path_items.length; i++) {
			if (!current_elem)
				continue;
			// var pt = current_elem.ItemData[0].ParentXtml.getAttribute("t");
			// if (pt && path_items[i] == pt.split(".")[1]) {
			// // goto component
			// current_elem.ItemData[0].ShowGoto = true;
			// current_elem = aa_xtmldt_refresh_elem(ctx,[current_elem])[0];
			// }
			if (current_elem.collapsed)
				ctx.vars._Cntr[0].CollapseElem(jQuery(current_elem), false);
			var sub_elems = jQuery(current_elem).children('.aa_list').children('.aa_item');
			var next_elem = null;
			for ( var j = 0; j < sub_elems.length; j++) {
				if (jQuery(sub_elems[j]).children('.aa_text').text()
						.split(" =")[0] == path_items[i]) {
					next_elem = sub_elems[j];
					break;
				}
			}
			if (!next_elem && current_elem.ItemData && current_elem.ItemData[0].GetXtml() && (current_elem.ItemData[0].GetXtml()[0].getAttribute("t")||'').split(".")[1] == path_items[i]) {
				// Goto ptdef
				var parent_elem = current_elem.parentNode;
				var pt = current_elem.ItemData[0].GetXtml()[0].getAttribute("t");
				var param_xml = aa_parsexml("<Param name='" + pt + "' goto='true' />");
				current_elem.ItemData[0].AddParam(current_elem.ItemData[0], aa_ctx(ctx, { Param: [param_xml], _ElemsOfOperation: [current_elem], _UndoData: null }));				
				current_elem = jQuery(parent_elem).children('.aa_item').children(".aa_text:contains('" + path_items[i-1] + "')").parent();
				next_elem = jQuery(current_elem).children('.aa_list').children('.aa_item').children(".aa_text:contains('" + path_items[i] + "')").parent();
				next_elem.collapsed = true;
			}
			current_elem = next_elem;
		}
		// if (current_elem == null) { ajaxart.log("cannot find " +
		// path,"error"); return null; }
		return current_elem;
	};
	top.Undo = function(item, ctx) {
		var top = this;
		var current_elem = null, undo_operation;
		var stack = (!ctx.vars.Redo) ? ctx.vars._UndoData[0].UndoOperations
				: ctx.vars._UndoData[0].RedoOperations;
		if (stack.length == 0)
			return [];
		if (!ctx.vars.GotoLastEdit)
			undo_operation = stack.pop();
		else
			undo_operation = stack[stack.length - 1];
		var current_elem = top.GoToPath(undo_operation.Path, ctx);
		if (!current_elem)
			return;
		if (ctx.vars.GotoLastEdit) {
			ajaxart_uiaspects_select(jQuery(current_elem), jQuery(), "auto",
					ctx, true);
			return [];
		}
		var func = current_elem.ItemData[0][undo_operation.Operation];
		func(current_elem.ItemData, aa_ctx(ctx, {
			Undo : [ ctx.vars.Redo == null ],
			Value : undo_operation.Primitive,
			Xml : undo_operation.Component,
			_ElemsOfOperation : [ current_elem ],
			Direction : undo_operation.Direction
		}));
	};
	return [ top ];
},
PreviewSettings: function(profile,data,context) {
	return [aa_preview_settings()];
},
HandlePreviewTimeout: function(profile,data,context) {
	var messageTextClass = aa_text(data,profile,'MessageTextClass',context);
	var messageClass = aa_text(data,profile,'MessageClass',context);
	var out = $("<div/>")[0];
	var handler = {
		handleTimeout: function(timemoutMessage) {
			aa_addOnAttachMultiple(out, function() {
				var message = aa_text([timemoutMessage],profile,'TextPattern',context);
				$(out).find("." + messageClass).find("." + messageTextClass).html(message);
				$(out).find("." + messageClass).show();
				if (aa_bool(data,profile,'AttachCtrlSpace',context)) {
					$(out).find(".fld_primitive_text_box").keydown(function(e) {
						if (e.ctrlKey && e.keyCode == 32) {	// ctrl-space
							$(out).find("." + messageClass).find("." + messageTextClass).trigger("click");
							return aa_stop_prop(e);
						}
					});
				}
			});
		}
	};
	var control = aa_first(data,profile,'Control',aa_ctx(context, {_PreviewTimeoutHandler: [handler] } ) );
	$(out).append(control)
	$(out).find("." + messageClass).hide();
	return [out];
}
}
// AA EndModule
function aa_xtmldt_setfunctions(obj) {
	obj._Type = [ obj.Type ];
	obj._ParamXml = [ obj.ParamXml ];
	if (obj.Param)
		obj._Param = [ obj.Param ];
	obj.Text = function(item, ctx) {
		if (obj.Component)
			return [ obj.ParentXtml.getAttribute("id") ];
		var param = obj.Param, xtml = obj.ParentXtml;
		if (obj.ArrayExtra)
			return [ param + "[+]" ];
		if (aa_is_static_bool(obj) && param)
			return [ param ];
		var out = obj.Top ? "" : param + " = ";
		if (obj.ParamXml != null && obj.ParamXml.getAttribute("title") != null)
			out = obj.ParamXml.getAttribute("title") + " = ";
		if (obj.IsArrayItem) {
			out = param + "[" + (obj.Index + 1) + "] = ";
			elems = aa_xpath(obj.ParentXtml, obj.Param + "["
					+ (1 + obj.Index) + "]");
		} else if (obj.Top) {
			elems = [ obj.ParentXtml ];
		} else {
			var att = obj.ParentXtml.getAttribute(obj.Param);
			if (att != null)
				return [ aa_xmlescape(out + att) ];
			elems = ajaxart.childElems(obj.ParentXtml, obj.Param);
		}
		if (elems.length == 0)
			return [ aa_xmlescape(out) ];
		if (obj.HasName && elems[0].getAttribute("name") != null) // Var,
																	// Param
			out = param + "[" + elems[0].getAttribute("name") + "]" + " = ";
		var value = elems[0].getAttribute("value");
		if (value != null)
			out = out + value;
		else {
			var type = elems[0].getAttribute("t");
			if (type == null) {
				out = out.replace(" = ", "");
				if (ctx.vars.AddTextSummary
						|| (ctx.vars._ItemElement != null && ctx.vars._ItemElement[0].collapsed)) {
					if (elems[0].tagName == 'Case'
							&& elems[0].getAttribute('If'))
						out += ": " + elems[0].getAttribute('If');
					if (elems[0].tagName == 'Case'
							&& elems[0].getAttribute('IfCondition'))
						out += ": " + elems[0].getAttribute('IfCondition');
					if (elems[0].getAttribute('Remark') != null
							&& elems[0].getAttribute('Remark') != "")
						out += " : " + elems[0].getAttribute('Remark');
					if (elems[0].tagName == 'Attribute'	&& elems[0].parentNode.getAttribute('t') == 'xml.CreateXml' && elems[0].getAttribute('Name'))
						out += ": " + elems[0].getAttribute('Name');
				}
				return [ aa_xmlescape(out) ];
			}
			out = out + elems[0].getAttribute("t").split("\.")[1];
			// summary
			if (ctx.vars.AddTextSummary
					|| (ctx.vars._ItemElement != null && ctx.vars._ItemElement[0].collapsed)) {
				if (elems[0].getAttribute('Remark') != null
						&& elems[0].getAttribute('Remark') != "")
					out += ": " + elems[0].getAttribute('Remark');
				else {
					var ptdef = aa_component_definition(elems[0]
							.getAttribute("t"));
					var params_to_show = [];
					if (ptdef != null) {
						var params = aa_xpath(ptdef,
								"Param[@essential='true']");
						for ( var i = 0; i < params.length; i++)
							params_to_show.push(params[i].getAttribute("name"));
					}
					var texts_to_add = [];
					for ( var i = 0; i < params_to_show.length; i++) {
						var text = elems[0].getAttribute(params_to_show[i]);
						if (text != null)
							texts_to_add.push(text);
						else {
							var sub_elems = ajaxart.childElems(elems[0],
									params_to_show[i]);
							for ( var j = 0; j < sub_elems.length; j++) {
								if (sub_elems[j].getAttribute("value") != null)
									texts_to_add.push(sub_elems[j]
											.getAttribute("value"));
								else {
									var t = sub_elems[j].getAttribute("t");
									if (t != null && t.indexOf(".") != -1)
										texts_to_add.push(t.split("\.")[1]);
								}
							}
						}
					}
					var items_added = 0;
					for ( var i = 0; i < texts_to_add.length; i++) {
						if (texts_to_add[i] == null || texts_to_add[i] == "")
							break;
						if (items_added == 3) {
							out += ", ...";
							break;
						}
						out += (items_added == 0 ? ": " : ", ")
								+ texts_to_add[i];
						items_added++;
					}
				}
			}
		}
		// if (out.length > 50)
		// 	out = out.substring(0, 47) + "...";
		return [ aa_xmlescape(out) ];
	}
	obj.Update = function(item, ctx) {
		aa_xtmldt_writeundodata(ctx.vars._ElemsOfOperation, ctx);
		var cntr = aa_xtmldt_treecntr(ctx);
		var value = ajaxart.totext_array(ctx.vars.Value);
		var primitive = value.match(/^=[a-z_A-Z0-9]+[.][a-z_A-Z0-9]+$/) == null;
		var xml = ajaxart.totext_array(ctx.vars.Xml), xml_elem = null;
		if (xml != "") {
			xml_elem = aa_parsexml(xml, "script update", null, false,
					obj.ParentXtml);
			if (xml_elem == null)
				return [];
			var desired_tag = (obj.Top) ? aa_tag(obj.ParentXtml) : obj.Param;
			if (aa_tag(xml_elem) != desired_tag) {
				var new_elem = aa_createElement(obj.ParentXtml, desired_tag);
				ajaxart.xml.copyElementContents(new_elem, xml_elem);
				xml_elem = new_elem;
			}
		}
		if (obj.ArrayExtra) {
			var elem = aa_createElement(obj.ParentXtml, obj.Param);
			if (primitive)
				elem.setAttribute("value", value);
			else
				elem.setAttribute("t", value.substring(1));
			if (xml_elem != null)
				elem = xml_elem;
			obj.ParentXtml.appendChild(elem);

			obj.ArrayExtra = false;
			var new_item = {
				isObject : true,
				ParentXtml : obj.ParentXtml,
				ParamXml : obj.ParamXml,
				Param : obj.Param,
				Type : obj.Type,
				Index : obj.Index + 1,
				IsArrayItem : true,
				ArrayExtra : true
			};
			aa_xtmldt_setfunctions(new_item);
			var current_elem = jQuery(ctx.vars._ElemsOfOperation);
			if (cntr) {
				var new_elem = ajaxart_uiaspects_addElement( [ new_item ], cntr);
				jQuery(new_elem).insertAfter(current_elem);
			}
		} else if (obj.IsArrayItem) {
			var old_elem = aa_xpath(obj.ParentXtml, obj.Param + "["
					+ (1 + obj.Index) + "]")[0];
			var new_elem = aa_createElement(obj.ParentXtml, obj.Param);
			if (old_elem.getAttribute("name") != null)
				new_elem.setAttribute("name", old_elem.getAttribute("name"));
			var vars = ajaxart.childElems(old_elem, "Var"); // coping old vars
			for (i in vars)
				new_elem.appendChild(aa_importNode(vars[i].cloneNode(true),
						new_elem));
			if (primitive)
				new_elem.setAttribute("value", value);
			else
				obj.SwitchComponent(new_elem,value.substring(1));
			if (xml_elem != null)
				new_elem = xml_elem;
			ajaxart.replaceXmlElement(old_elem, new_elem, false);
		} else if (obj.Param == "name") {
			obj.ParentXtml.setAttribute("name", value.replace(new RegExp(
					"[^a-zA-Z_0-9]", "g"), ""));
			// refresh text of parent
			aa_invoke_cntr_handlers(
					cntr,
					cntr.RefreshItemTextAndImage,
					[ jQuery(ctx.vars._ElemsOfOperation[0]).parents('.aa_item')[0] ],
					ctx);
		} else if (obj.OnlyPrimitive) {
			obj.ParentXtml.setAttribute(obj.Param, value);
		} else if (xml_elem != null) {
			if (obj.Top)
				ajaxart.xml.copyElementContents(obj.ParentXtml, xml_elem);
			else {
				var old_elem = ajaxart.childElem(obj.ParentXtml, obj.Param);
				if (old_elem != null)
					ajaxart.replaceXmlElement(old_elem, xml_elem, false);
				else
					obj.ParentXtml.appendChild(xml_elem);
				obj.ParentXtml.removeAttribute(obj.Param);
			}
		} else if (obj.Top) {
			if (xml_elem != null)
				obj.ParentXtml = xml_elem;
			else if (primitive)
				obj.ParentXtml.setAttribute("value", value);
			else
				// component
				obj.SwitchComponent(obj.ParentXtml,value.substring(1));
		} else if (primitive && obj.OnlyElement) { // only element (line "xtml"
													// of component)
			var elem = ajaxart.childElem(obj.ParentXtml, obj.Param);
			if (elem == null) {
				elem = aa_createElement(obj.ParentXtml, obj.Param);
				obj.ParentXtml.appendChild(elem);
			}
			elem.setAttribute("value", value);
		} else if (primitive) { // single primitive
			obj.ParentXtml.setAttribute(obj.Param, value);
			var elem = ajaxart.childElem(obj.ParentXtml, obj.Param);
			if (elem != null)
				elem.parentNode.removeChild(elem);
		} else { // single component
			var component = value.substring(1);
			obj.ParentXtml.removeAttribute(obj.Param);
			var elem = ajaxart.childElem(obj.ParentXtml, obj.Param);
			if (elem == null) {
				elem = aa_createElement(obj.ParentXtml, obj.Param);
				obj.ParentXtml.appendChild(elem);
			}
			obj.SwitchComponent(elem, component);
		}
		if (ctx.vars._ElemsOfOperation != null) { // refresh
			aa_save_manager.MarkAsModified( [ obj.ParentXtml ], ctx);
			var new_elem = aa_xtmldt_refresh_elem(ctx,
					ctx.vars._ElemsOfOperation);
			cntr.CollapseElem(jQuery(new_elem[new_elem.length - 1]), true);
			aa_after_update(obj, aa_ctx(ctx, {
				_ElemsOfOperation : new_elem,
				_ItemsOfOperation : new_elem[0].ItemData
			}));
			if (ctx.vars._XtmlTreeObj)
				aa_runMethod( [], ctx.vars._XtmlTreeObj[0],
						"RefreshLocalPreview", aa_ctx(ctx, {
							_Item : [ new_elem[0].ItemData ]
						}));
		}
		if (obj.Param == 'type')	// maybe updating type of component, refreshing components cache
			aa_search_comp_of_type_cache = null;
		aa_triggerXmlChange(obj.ParentXtml);
	}
	obj.SwitchComponent = function(xtml, newComponent) {
		var oldComponent = xtml.getAttribute("t");
		xtml.setAttribute("t",newComponent);
		if (oldComponent)
			xtmldt_cleanXtmlOfParams(xtml,oldComponent);
	},
	obj.Delete = function(item, ctx) {
		var new_selected;
		if (obj.Top)
			return;
		if (obj.Param == "name")
			return;
		if (obj.IsArrayItem) {
			if (obj.ArrayExtra)
				return [];
			var parent_item = jQuery(ctx.vars._ElemsOfOperation).parents('.aa_item');
			aa_xtmldt_writeundodata(parent_item, ctx);// write undo data of
														// parent
			aa_save_manager.MarkAsModified( [ obj.ParentXtml ], ctx);
			var xml_elem = aa_xpath(obj.ParentXtml, obj.Param + "["
					+ (1 + obj.Index) + "]")[0];
			xml_elem.parentNode.removeChild(xml_elem);
			new_selected = jQuery(ctx.vars._ElemsOfOperation).next();
			jQuery(ctx.vars._ElemsOfOperation).remove();
			ajaxart_uiaspects_select(new_selected, jQuery(), "auto", ctx, true);
			// refresh the index of siblings
			for ( var sibling = new_selected[0]; sibling != null; sibling = sibling.nextSibling) {
				if (sibling.ItemData[0].Param == obj.Param) {
					sibling.ItemData[0].Index--;
					jQuery(sibling).children('.aa_text').text(
							sibling.ItemData[0].Text(sibling.ItemData, ctx)[0]);
				}
			}
		} else { // not an array
			var parent_item = $(ctx.vars._ElemsOfOperation).parents('.aa_item');
			aa_xtmldt_writeundodata(parent_item, ctx);// write undo data of
														// parent
			obj.ParentXtml.removeAttribute(obj.Param);
			var elem = ajaxart.childElem(obj.ParentXtml, obj.Param);
			if (elem != null)
				elem.parentNode.removeChild(elem);
			aa_save_manager.MarkAsModified( [ obj.ParentXtml ], ctx);
			if ((obj.ParamXml == null || obj.ParamXml.getAttribute("essential") != "true")
					&& ajaxart.totext_array(ctx.vars._HideEmpties) == "true") {
				// remove from tree
				new_selected = jQuery(ctx.vars._ElemsOfOperation).next();
				if (new_selected.length == 0)
					new_selected = jQuery(ctx.vars._ElemsOfOperation).prev();
				if (new_selected.length == 0)
					new_selected = jQuery(ctx.vars._ElemsOfOperation).parent()
							.parent();
				jQuery(ctx.vars._ElemsOfOperation).remove();
				ajaxart_uiaspects_select(new_selected, jQuery(), "auto", ctx,
						true);
			} else { // refresh
				new_selected = ajaxart_uiaspects_refreshElements(
						ctx.vars._ElemsOfOperation, true);
				ajaxart_uiaspects_select(
						jQuery(new_selected[new_selected.length - 1]),
						jQuery(), "auto", ctx, true);
				cntr.CollapseElem(
						jQuery(new_selected[new_selected.length - 1]), true);
			}
		}
		aa_after_update(obj, aa_ctx(ctx, {
			_ElemsOfOperation : [ new_selected[0] ],
			_ItemsOfOperation : new_selected[0].ItemData
		}));
		aa_triggerXmlChange(obj.ParentXtml);
	}
	obj.AsPrimitive = function(item, ctx) {
		var elems;
		if (obj.IsArrayItem) {
			if (obj.ArrayExtra)
				return "";
			elems = aa_xpath(obj.ParentXtml, obj.Param + "["
					+ (1 + obj.Index) + "]");
		} else if (obj.Top) {
			elems = [ obj.ParentXtml ];
		} else {
			var att = obj.ParentXtml.getAttribute(obj.Param);
			if (att != null)
				return [ att ];
			elems = ajaxart.childElems(obj.ParentXtml, obj.Param);
		}
		if (elems.length == 0)
			return [];
		var value = elems[0].getAttribute("value");
		if (value != null)
			return [ value ];
		if (elems[0].getAttribute("t") == null)
			return [ "" ];
		return [ "=" + elems[0].getAttribute("t") ];
	}
	obj.GetXtml = function(item, ctx) {
		if (obj.Top)
			return [ obj.ParentXtml ];
		else if (obj.IsArrayItem) {
			if (obj.ArrayExtra)
				return [];
			return aa_xpath(obj.ParentXtml, obj.Param + "["
					+ (1 + obj.Index) + "]");
		} else {
			if (obj.ParentXtml.getAttribute(obj.Param) != null) { // primitive
				var atts = obj.ParentXtml.attributes;
				for ( var j = 0; j < atts.length; j++)
					if (atts.item(j).nodeName == obj.Param)
						return [ atts.item(j) ];
			} else
				// component
				return ajaxart.childElems(obj.ParentXtml, obj.Param);
		}
	}
	obj.AsXml = function(item, ctx, dont_create_for_null) {
		var elems;
		if (obj.IsArrayItem) {
			if (obj.ArrayExtra)
				return [];
			return aa_xpath(obj.ParentXtml, obj.Param + "["
					+ (1 + obj.Index) + "]");
		}
		if (obj.Top || obj.Component) {
			return [ obj.ParentXtml ];
		} else {
			elems = ajaxart.childElems(obj.ParentXtml, obj.Param);
			if (elems.length > 0)
				return elems;
			else if (dont_create_for_null)
				return [];
			else { // primitive or empty
				var att = obj.ParentXtml.getAttribute(obj.Param);
				if (att == null)
					att = "";
				var xml = aa_createElement(obj.ParentXtml, obj.Param);
				xml.setAttribute("value", att);
				return [ xml ];
			}
		}
	}
	obj.Copy = function(item, ctx) {
		ajaxart.xtml_clipboard = {
			isObject : true
		};
		if (obj.ArrayExtra)
			return [];
		var xml = obj.AsXml(item, ctx)[0].cloneNode(true);
		xml.removeAttribute('name');	// when copying-pasting variables and params, we don't copy the name
		ajaxart.xtml_clipboard.Xml = ajaxart.xml2text(xml);
	}
	obj.Cut = function(item, ctx) {
		obj.Copy(item, ctx);
		obj.Delete(item, ctx);
	}
	obj.Paste = function(item, ctx) {
		if (ajaxart.xtml_clipboard == null)
			return;
		obj.Update(item, aa_ctx(ctx, {
			Xml : [ ajaxart.xtml_clipboard.Xml ]
		}));
	}
	obj.Move = function(item, ctx) {
		var direction = ajaxart.totext_array(ctx.vars.Direction);
		if (!obj.IsArrayItem || obj.ArrayExtra)
			return;
		var xml_elem = aa_xpath(obj.ParentXtml, obj.Param + "["
				+ (1 + obj.Index) + "]")[0];
		var diff = (direction == "down") ? 1 : -1;
		var new_xml_elem = aa_xpath(obj.ParentXtml, obj.Param + "["
				+ (1 + obj.Index + diff) + "]");
		if (new_xml_elem.length == 0)
			return;
		var elem = jQuery(ctx.vars._ElemsOfOperation[0]);
		if (direction == "down") {
			new_xml_elem[0].parentNode.insertBefore(new_xml_elem[0], xml_elem);
			obj.Index++;
			elem.next()[0].ItemData[0].Index--;
			aa_invoke_cntr_handlers(ctx.vars._Cntr[0],
					ctx.vars._Cntr[0].RefreshItemTextAndImage, [ elem[0] ], ctx);
			aa_invoke_cntr_handlers(ctx.vars._Cntr[0],
					ctx.vars._Cntr[0].RefreshItemTextAndImage,
					[ elem.next()[0] ], ctx);
			elem.insertAfter(elem.next());
		} else {
			new_xml_elem[0].parentNode.insertBefore(xml_elem, new_xml_elem[0]);
			obj.Index--;
			elem.prev()[0].ItemData[0].Index++;
			aa_invoke_cntr_handlers(ctx.vars._Cntr[0],
					ctx.vars._Cntr[0].RefreshItemTextAndImage, [ elem[0] ], ctx);
			aa_invoke_cntr_handlers(ctx.vars._Cntr[0],
					ctx.vars._Cntr[0].RefreshItemTextAndImage,
					[ elem.prev()[0] ], ctx);
			elem.prev().insertAfter(elem);
		}
		if (ctx.vars._Cntr)
			ajaxart_uiaspects_select(elem, jQuery(), "auto", ctx, true);
		aa_xtmldt_writeundodata(elem, ctx, {
			isObject : true,
			Operation : "Move",
			Direction : [ (direction == "down" ? "up" : "down") ]
		});
		aa_save_manager.MarkAsModified( [ obj.ParentXtml ], ctx);
	}
	obj.HasNoContent = function(item, ctx) {
		if (obj.ArrayExtra)
			return [ "true" ];
		if (obj.Top)
			return [];
		if (obj.IsArrayItem)
			return [];
		var elems = ajaxart.childElems(obj.ParentXtml, obj.Param);
		if (elems.length > 0)
			return [];
		if (obj.ParentXtml.getAttribute(obj.Param))
			return [];
		return [ "true" ];
	}
	obj.IsActionDisabled = function(item, ctx) {
		var op = ajaxart.totext_array(ctx.vars.Operation);
		if (op == "Paste" && ajaxart.xtml_clipboard != null)
			return [];
		if (op == "MoveDown"
				&& obj.IsArrayItem
				&& !obj.ArrayExtra
				&& aa_xpath(obj.ParentXtml, obj.Param + "["
						+ (2 + obj.Index) + "]").length > 0)
			return [];
		if (op == "MoveUp" && obj.IsArrayItem && !obj.ArrayExtra
				&& obj.Index > 0)
			return [];
		if (op == "OpenAAEditor" && obj.Top && ctx.vars.AAEditorState)
			return [];
		return [ "true" ];
	}
	obj.ParamsToAdd = function(item, ctx) {
		var as_xml = obj.AsXml(item, ctx, true);
		if (as_xml.length == 0)
			return [];
		var out = [];
		var ptdef = aa_pt_def(as_xml[0], obj);
		if (ptdef != null) {
			var params = aa_xpath(ptdef, "Param");
			for ( var i = 0; i < params.length; i++) {
				var paramXml = params[i];
				var alreadyExists = false;
				if (ctx.vars._ElemsOfOperation) {
					var sub_elems = jQuery(ctx.vars._ElemsOfOperation[0])
							.children('.aa_list').children('.aa_item');
					for (j = 0; j < sub_elems.length; j++)
						if (sub_elems[j].ItemData[0].Param == paramXml
								.getAttribute("name"))
							alreadyExists = true;
				}
				if (!alreadyExists)
					out.push(paramXml);
			}
		}
		out.push(aa_parsexml("<Param name='Var' title='Add Variable' icon='"
				+ ctx.vars._Images[0] + "/studio/bucket.jpg' />"));
		if (ptdef && ptdef.getAttribute("id") != null) {
			out.push(aa_parsexml("<Param name='"
					+ ptdef.getAttribute("id") + "' goto='true' title='Goto "
					+ ptdef.getAttribute("id") + " Def ...' icon='"
					+ ctx.vars._Images[0] + "/studio/redo.png' />"));
		}
		return out;
	}
	obj.AddParam = function(item, ctx) {
		aa_xtmldt_writeundodata(ctx.vars._ElemsOfOperation, ctx);
		var param_xml;
		if (ctx.vars.Param && ajaxart.isxml(ctx.vars.Param))
			param_xml = ctx.vars.Param[0];
		else if (ctx.vars.SimpleParam) {
			param_xml = aa_createElement(obj.ParentXtml, "Param");
			param_xml.setAttribute("name", ajaxart
					.totext_array(ctx.vars.SimpleParam));
		}
		var param_name = param_xml.getAttribute("name");
		var as_xml = obj.AsXml(item, ctx, true);
		if (as_xml.length == 0)
			return [];
		if (!param_name ) return;
		if (param_name == "Var") {
			var new_xml_elem = aa_createElement(as_xml[0], param_name);
			if (ctx.vars._ElemsOfOperation && ajaxart.isattached(ctx.vars._ElemsOfOperation[0])) {
				// prmopting for variable name only if not in test
				var var_name = window.prompt("Variable name:");
				if (var_name)
					new_xml_elem.setAttribute("name",var_name.replace(/[^a-zA-Z_0-9]/g,""));
			}
			as_xml[0].appendChild(new_xml_elem);
		} else if (param_xml.getAttribute("goto")) {
			obj.ShowGoto = true;
		} else if ((param_xml.getAttribute("type") == null || param_xml
				.getAttribute("type").indexOf('[]') == -1)
				&& as_xml[0].getAttribute(param_name) == null
				&& ajaxart.childElem(as_xml[0], param_name) == null) {
			// coping default value
			if (param_xml.getAttribute('Default'))
				as_xml[0].setAttribute(param_name, param_xml
						.getAttribute('Default'));
			else {
				var def = ajaxart.childElems(param_xml, "Default");
				if (def.length > 0) {
					if (def[0].getAttribute("value"))
						as_xml[0].setAttribute(param_name, def[0]
								.getAttribute("value"));
					else {// default with component
						var new_xml_elem = aa_createElement(as_xml[0],
								param_name);
						ajaxart.xml.copyElementContents(new_xml_elem, def[0]);
						as_xml[0].appendChild(new_xml_elem);
					}
				} else {
					as_xml[0].setAttribute(param_name, " ");
					as_xml[0].setAttribute(param_name, "");
				}
			}
		} else {
			obj.ShowMoreParams = param_name;
		}
		aa_save_manager.MarkAsModified(as_xml, ctx);
		if (ctx.vars._ElemsOfOperation) {
			var new_elem = aa_xtmldt_refresh_elem(ctx,
					ctx.vars._ElemsOfOperation);
			var sub_elems = jQuery(new_elem).children('.aa_list').children(
					'.aa_item');
			for (j = 0; j < sub_elems.length; j++)
				if (jQuery(sub_elems[j]).children('.aa_text').text().indexOf(
						param_name) == 0) {
					ajaxart_uiaspects_select(jQuery(sub_elems[j]), jQuery(),
							"auto", ctx, true);
					if (param_name != 'Var' && !param_xml.getAttribute("goto")
							&& !aa_is_static_bool(sub_elems[j].ItemData[0]))
						sub_elems[j].ItemData[0].DoubleClick(
								sub_elems[j].ItemData, aa_ctx(ctx, {
									_ElemsOfOperation : [ sub_elems[j] ],
									_ItemsOfOperation : sub_elems[j].ItemData
								}));
				}
		}
	}
	obj.Image = function(item, ctx) {
		var data_image = aa_base_images() + "/studio/paper.jpg";
		var default_image = aa_base_images() + "/studio/boolean.gif";
		var enum_image = aa_base_images() + "/studio/enum.gif";
		if (obj.Param == "name")
			return [ aa_base_images() + "/studio/fonts1616.png" ];
		if (obj.Component)
			return [ aa_base_images() + "/studio/plugin1616.png" ];
		if (obj.Param == "Param")
			return [ aa_base_images() + "/studio/mini-corp-mem.jpg" ];
		if (aa_is_static_bool(obj)) {
			// static boolean
			if (obj.ParentXtml.getAttribute(obj.Param) == "true")
				return [ aa_base_images() + "/studio/true.bmp" ];
			else
				return [ aa_base_images() + "/studio/false.bmp" ];
		}
		if (!obj.Type || obj.Type == "data.Data")
			return [ data_image ];
		var type = obj.Type;
		if (type.indexOf('[]') != -1)
			type = type.substring(0, type.length - 2);
		type = type.replace("\.", "_");
		if (type == "enum" || type == "dynamic_enum"
				|| type == "dynamic_enum_multi")
			return [ enum_image ];
		if (ajaxart.types[type]
				&& ajaxart.types[type].getAttribute("icon") != null)
			return ajaxart.run( [], aa_xpath(ajaxart.types[type], '@icon')[0],
					'', ctx);

		return [ default_image ];
	}
	obj.DoubleClick = function(item, ctx) {
		if (aa_is_static_bool(obj)) {
			var new_val;
			if (obj.ParentXtml.getAttribute(obj.Param) == "true")
				new_val = "false";
			else
				new_val = "true";
			obj.Update(item, aa_ctx(ctx, {
				Value : [ new_val ]
			}));
		} else if (obj.Type == "inline" || obj.Type == "struct") {
			if (obj.ArrayExtra)
				obj.Update(item, aa_ctx(ctx, {
					Xml : [ "<" + obj.Param + "/>" ]
				}));
			return;
		} else if (obj.Component)
			return;
		else {
			var only_primitive = (obj.OnlyPrimitive || obj.Param == "name") ? [ "true" ]
					: [];
			var param_xml = obj.ParamXml;
			var ctx2 = aa_ctx( ctx, {	ParamXml : [ param_xml ],	OnlyPrimitive : only_primitive });
			if (param_xml && param_xml.getAttribute('codemirror') == 'true') {
				return aa_run_component("xtml_dt_tree.OpenCodeMirror",[item[0].ParentXtml],ctx2);
			}

			if (obj.Type == "parent_type") { // for xtml of Component or
												// default value of param
				param_xml = aa_parsexml("<Param type='"
						+ obj.ParentXtml.getAttribute("type") + "' />");
			}
			aa_run_component("xtml_dt_tree.OpenPrimitivePopup", item, ctx2);
		}
	}
	obj.ObjectForPreview = function(item, ctx) {
		var out = {
			isObject : true,
			ParentXtml : [ obj.ParentXtml ],
			Field : [ obj.Param ],
			Xtml : obj.AsXml(item, ctx, true)
		};
		if (obj.ArrayExtra)
			out.Field = [ obj.Param + '[+]' ];
		return [ out ];
	}
	obj.More = function(item, ctx) {
		var more_component = ctx.vars.MoreComponent[0];
		var old_xml = obj.AsXml(item, ctx)[0];
		var new_xml = aa_createElement(old_xml, aa_tag(old_xml));
		var inner = aa_createElement(new_xml, more_component
				.getAttribute("itemsParam"));
		ajaxart.xml.copyElementContents(inner, old_xml);
		if (inner.getAttribute("name")) { // moving 'name' upwards
			new_xml.setAttribute("name", inner.getAttribute("name"));
			inner.removeAttribute("name");
		}
		new_xml.setAttribute("t", more_component.getAttribute("id"));
		new_xml.appendChild(inner);
		obj.Update(item, aa_ctx(ctx, {
			Xml : [ ajaxart.xml2text(new_xml) ]
		}));
	},
	obj.IsTop = function(item, ctx) {
		if (obj.Top) return ["true"];
		else return [];
	}
	obj.RightArrow = function(item,ctx) {
		if ($(ctx.vars._ElemsOfOperation).find(">.expandable").length == 0) {
			var cntr = ctx.vars._Cntr[0];
			var ops = aa_runMethod([],cntr,'Operations',cntr.Context);
			var op = aad_object_byid(ops,'AddParam');
			aa_runMethod(item,op,'Action',ctx);
		}
	}
}
function aa_is_static_bool(obj) {
	if (!(obj.Type == "data.Boolean" && obj.ParamXml != null && obj.ParamXml
			.getAttribute("script") == null))
		return false;
	var val = obj.ParentXtml.getAttribute(obj.Param);
	if (val == "" || val == "true" || val == "false")
		return true;
	if (val == null) {
		elems = ajaxart.childElems(obj.ParentXtml, obj.Param);
		if (elems.length > 0) {
			var value = elems[0].getAttribute("value");
			if (value == "true" || value == "false" || value == "")
				return true;
		} else
			return true;
	}
	return false;
}
function aa_after_update(obj, ctx) {
	ctx.vars._XtmlTreeObj[0].AfterUpdate( [ obj.ParentXtml ], ctx);
}
function aa_xtmldt_writeundodata(elem, ctx, undo_op) {
	if (ctx.vars._UndoData == null)
		return;
	var undo_operation = (undo_op) ? undo_op : {
		isObject : true
	};
	undo_operation.Path = "";
	var current_elem = elem;
	while (!current_elem[0].ItemData[0].Top) {
		var text = current_elem[0].ItemData[0].Text(current_elem[0].ItemData,
				ctx)[0].split(" =")[0];
		undo_operation.Path = text
				+ ((undo_operation.Path == "") ? "" : "/" + undo_operation.Path);
		current_elem = jQuery(current_elem[0]).parents('.aa_item');
	}
	if (undo_operation.Operation == null)
		undo_operation.Operation = "Update";
	var obj = elem[0].ItemData[0];
	if (obj.Top)
		undo_operation.Component = [ ajaxart.xml2text(obj.ParentXtml) ];
	else if (obj.IsArrayItem) {
		if (obj.ArrayExtra) {
			undo_operation.Operation = "Delete";
			undo_operation.Path = undo_operation.Path.replace("\+",
					obj.Index + 1);
		} else {
			var old_elem = aa_xpath(obj.ParentXtml, obj.Param + "["
					+ (1 + obj.Index) + "]")[0];
			undo_operation.Component = [ ajaxart.xml2text(old_elem) ];
		}
	} else {
		if (obj.ParentXtml.getAttribute(obj.Param) != null)
			undo_operation.Primitive = [ obj.ParentXtml.getAttribute(obj.Param) ];
		else {
			var elem = ajaxart.childElem(obj.ParentXtml, obj.Param);
			if (elem != null)
				undo_operation.Component = [ ajaxart.xml2text(elem) ];
			else
				undo_operation.Operation = "Delete";
		}
	}
	if (ctx.vars.Undo == null || ctx.vars.Undo[0] == false)
		ctx.vars._UndoData[0].UndoOperations.push(undo_operation);
	else
		ctx.vars._UndoData[0].RedoOperations.push(undo_operation);
}
function aa_xtmldt_refresh_elem(ctx, elem) {
	if (!elem.length)
		return [];
	var item_data = elem[0].ItemData;
	var new_elem = ajaxart_uiaspects_refreshElements(elem, true);
	ajaxart_uiaspects_select(jQuery(new_elem[new_elem.length - 1]), jQuery(),
			"auto", ctx, true);
	// collapse elem and it's sub elements
	var sub_elems = jQuery(new_elem[new_elem.length - 1]).find(".aa_item");
	sub_elems.each(function() {
		var cntr = aa_xtmldt_treecntr(ctx);
		cntr.CollapseElem(jQuery(this), true);
	});
	// finding the real new elem, becuase 'ajaxart_uiaspects_refreshElements'
	// returns all of the new elemens, including the tree descendents
	for ( var i = 0; i < new_elem.length; i++)
		if (new_elem[i].ItemData == item_data)
			return [ new_elem[i] ];
	return [];
}
function aa_xtmldt_treecntr(ctx) {
	if (ctx.vars._Cntr) {
		var cntr = ctx.vars._Cntr[0];
		while (aa_totext(cntr.ID) == "show_field" && cntr.ParentCntr)
			cntr = cntr.ParentCntr;

		return cntr;
	}
	return null;
}
function aa_xtmldt_create_xml_obj(ParentXtml, name, default_tag) {
	var obj = {};
	obj.IsActionDisabled = function(item, ctx) {
		return [ "true" ];
	}
	obj.HasNoContent = function(item, ctx) {
		return [ "true" ];
	}
	obj.ParamsToAdd = function(item, ctx) {
		return [];
	}
	obj.Image = function(item, ctx) {
		return [ aa_base_images() + "/studio/xml1616.gif" ];
	}
	obj.Text = function(item, ctx) {
		var elem = ajaxart.childElem(ParentXtml, "*");
		if (!elem)
			return [ name ];
		else
			return [ aa_tag(elem) + " ..." ];
	};
	obj.DoubleClick = function(item, ctx) {
		var input = {
			isObject : true,
			ParentXtml : [ ParentXtml ],
			DynamicContent : ParentXtml.getAttribute("DynamicContent") == "true"
		};
		var elem = ajaxart.childElems(ParentXtml, "*");
		if (elem.length != 0)
			input.Xml = elem;
		else
			input.Xml = [ aa_createElement(ParentXtml, default_tag) ];
		input.OnOK = function(item, ctx1) {
			var cntr = aa_xtmldt_treecntr(ctx);
			if (ajaxart.totext_array(item[0].DynamicContent) == "true")
				ParentXtml.setAttribute("DynamicContent", "true");
			else
				ParentXtml.removeAttribute("DynamicContent");
			var elem = ajaxart.childElem(ParentXtml, "*");
			if (elem != null)
				ParentXtml.removeChild(elem);
			ParentXtml.appendChild(aa_importNode(item[0].Xml[0], ParentXtml));
			aa_invoke_cntr_handlers(cntr, cntr.RefreshItemTextAndImage,
					ctx.vars._ElemsOfOperation, ctx);
			ajaxart_uiaspects_select(jQuery(ctx.vars._ElemsOfOperation[0]),
					jQuery(), "auto", ctx, true);
			aa_triggerXmlChange(ParentXtml);
			aa_save_manager.MarkAsModified( [ ParentXtml ], ctx);
		};
		aa_run_component("xtml_dt_tree.OpenXmlDialog", [ input ], ctx);
	};
	obj.GetXtml = function() {
		return [ ParentXtml ];
	};
	return obj;
}
function aa_pt_def(xtml, obj) {
	var ptdef = null
	var pt = xtml.getAttribute('t');
	if (obj.Type == "inline")
		ptdef = obj.ParamXml;
	else if ((xtml.getAttribute('t') || obj.Component)
			&& xtml.getAttribute('value') == null) {
		if (obj.Component)
			pt = "xtml_dt_tree.ComponentDef";
		ptdef = aa_component_definition(pt);
	}
	return ptdef;
}
function aa_xtmldt_setnextlevel(xtmlitems, context) {
	xtmlitems.NextLevel = function(item_, ctx) {
		obj = item_[0];
		var xtml = obj.ParentXtml;
		if (obj.IsArrayItem) {
			if (obj.ArrayExtra)
				return [];
			xtml = aa_xpath(obj.ParentXtml, obj.Param + "["
					+ (1 + obj.Index) + "]")[0];
		} else if (obj.Param) {
			var param = obj.Param;
			if (xtml.getAttribute(param))
				return [];
			var elema = aa_xpath(xtml, param);
			if (elema.length == 0)
				return [];
			xtml = elema[0];
		}
		if (obj.ArrayExtra)
			return [];
		if (!xtml || xtml.nodeType != 1)
			return [];
		// if ( (xtml.getAttribute('t')==null ||
		// xtml.getAttribute('value')!=null) && !obj.HasName) return [];
		var param_items = [];
		var out_item_names = {};
		var out = {
			isObject : true,
			Xtml : xtml,
			Items : []
		};
		var ptdef = aa_pt_def(xtml, obj);
		if (ptdef != null) {
			var params = aa_xpath(ptdef, "Param");
			for ( var i = 0; i < params.length; i++) {
				var paramXml = params[i];
				var param_obj = {
					isObject : true,
					ParentXtml : xtml,
					ParamXml : paramXml,
					Param : paramXml.getAttribute('name'),
					Type : paramXml.getAttribute('type')
				}
				if (ajaxart.totext_array(ctx.vars._HideEmpties) == "true"
						&& xtml.getAttribute(param_obj.Param) == null
						&& ajaxart.childElems(xtml, param_obj.Param).length == 0
						&& param_obj.Param != obj.ShowMoreParams)
					if (!paramXml.getAttribute("essential")
							|| ajaxart.childElem(paramXml, 'Default')
							|| paramXml.getAttribute('Default')) // showing
																	// empty
																	// values
																	// for
																	// essential
																	// with no
																	// default
																	// value
						continue;
				if (paramXml.getAttribute("has_name"))
					param_obj.HasName = true;
				if (paramXml.getAttribute("only_primitive"))
					param_obj.OnlyPrimitive = true;
				if (paramXml.getAttribute("only_element"))
					param_obj.OnlyElement = true;
				out_item_names[param_obj.Param] = true;
				if (!param_obj.Type)
					param_obj.Type = "data.Data";
				if (param_obj.Type.indexOf('[]') == -1) {
					param_items.push(param_obj);
					aa_xtmldt_setfunctions(param_obj);
				} else {
					var subitems = aa_xpath(xtml, param_obj.Param);
					var type = param_obj.Type;
					var type1 = type.substring(0, type.length - 2);
					for ( var j = 0; j <= subitems.length; j++) {
						var obj1 = {
							isObject : true,
							ParentXtml : xtml,
							ParamXml : paramXml,
							Param : param_obj.Param,
							Type : type1,
							Index : j,
							IsArrayItem : true
						}
						if (paramXml.getAttribute("has_name"))
							obj1.HasName = true;
						if (j == subitems.length)
							obj1.ArrayExtra = true;
						param_items.push(obj1);
						aa_xtmldt_setfunctions(obj1);
					}
				}
			}
			if (xtml.getAttribute("t") == "xml.Xml")
				param_items = [ aa_xtmldt_create_xml_obj(xtml, "xml", "xml") ];
			if (xtml.getAttribute("t") == "ui.Html")
				param_items = [ aa_xtmldt_create_xml_obj(xtml, "html", "div") ];
		}
		var extra_params = [];
		var items_after_params = [], items_before_params = [];
		var atts = xtml.attributes; // adding non-param values
		if (obj.HasName && !out_item_names["name"]) { // adding name
			extra_params.push("name");
			out_item_names["name"] = true;
		}
		for ( var i = 0; i < atts.length; i++) {
			var att_name = atts.item(i).nodeName;
			if (out_item_names[att_name] == null && att_name != "t"
					&& att_name != "value" && att_name != 'customxtml') { // not
																			// used
																			// yet
				extra_params.push(att_name);
				out_item_names[att_name] = true;
			}
		}
		var vars_count = 0;
		var childs_length = xtml.childNodes.length;
		for ( var i = 0; i < childs_length; i++) {
			if (xtml.childNodes.item(i).nodeType != 1)
				continue;
			var tag = aa_tag(xtml.childNodes.item(i));
			if (out_item_names[tag] == null) {
				if (tag == 'Var') {
					var param_obj = {
						isObject : true,
						ParentXtml : xtml,
						Param : "Var",
						IsArrayItem : true,
						Index : vars_count,
						Type : "data.Data",
						HasName : true
					};
					vars_count++;
					param_obj.ParamXml = ajaxart
							.parsexml('<Param type="data.Data" name="' + param_obj.Param + '" />');
					aa_xtmldt_setfunctions(param_obj);
					items_before_params.push(param_obj);
				} else if (xtml.getAttribute("t") != "xml.Xml"
						&& xtml.getAttribute("t") != "ui.Html") {
					extra_params.push(tag);
					out_item_names[tag] = true;
				}
			}
		}
		for ( var i = 0; i < extra_params.length; i++) {
			var param_name = extra_params[i];
			var param_obj = {
				isObject : true,
				ParentXtml : xtml,
				Param : param_name
			};
			param_obj.ParamXml = ajaxart
					.parsexml('<Param type="data.Data" name="' + param_obj.Param + '" />');
			if (param_obj.Param == "Condition") {
				param_obj.Type = 'data.Boolean';
				param_obj.ParamXml.setAttribute("type", "data.Boolean");
				param_obj.ParamXml.setAttribute("script", "true");
			}
			if (param_obj.Param == "Trace") {
				param_obj.ParamXml.setAttribute("type", "enum");
				for ( var val = 0; val <= 9; val++)
					param_obj.ParamXml.appendChild(aa_parsexml("<value>"
							+ val + "</value>", "", "", true,
							param_obj.ParamXml));
			}
			out_item_names[param_obj.Param] = true;
			aa_xtmldt_setfunctions(param_obj);
			if (param_obj.Param == "Condition" || param_obj.Param == "Data")
				items_before_params.push(param_obj);
			else
				items_after_params.push(param_obj);
		}
		out.Items = items_before_params.concat(param_items).concat(
				items_after_params);
		aa_xtmldt_setnextlevel(out, context);
		if (obj.ShowGoto) {
			var obj1 = {
				isObject : true,
				Component : true,
				ParentXtml : aa_component_definition(xtml.getAttribute("t"))
			};
			aa_xtmldt_setfunctions(obj1);
			out.Items.push(obj1);
		}
		return [ out ];
	}
}
var aa_save_manager = {
	modified : {},
	MarkAsModified : function(item, ctx) {
		var xml = item[0];
		while (xml != null && xml.nodeType != 9 && aa_tag(xml) != "Component") {// 9 -
																				// document
																				// top
		xml = xml.parentNode;
	}
	if (!xml || xml.nodeType == 9 || !xml.parentNode
			|| xml.parentNode.getAttribute("ns") == null)
		return; // not infrastructure
	var id = xml.parentNode.getAttribute("ns") + "." + xml.getAttribute("id");
	if (aa_save_manager.modified[id] == null)
		aa_save_manager.modified[id] = true;
	aa_save_manager.modified.not_empty = true;
},
Save : function(item, ctx) {
	var modified_components = [];
	for (i in aa_save_manager.modified)
		if (i != "not_empty")
			modified_components.push(i);
	aa_run_component("xtml_dt_tree.SaveToServer", item, aa_ctx(ctx, {
		_ModifiedComponents : modified_components
	}));
},
NoModified : function(item, ctx) {
	if (aa_save_manager.modified.not_empty != null)
		return [];
	return [ "true" ];
},
Clean : function(item, ctx) {
	aa_save_manager.modified = {};
	var elem = jQuery(".dialog_box").find(".aa_xtml_tree")[0];
	var cntr = elem && elem.Cntr;
	if (cntr)
		container.ContainerChange[0](item, ctx); // refresh toolbar
}
};
function aa_preview_settings() {
	var settings = {
		maxItemsToFind: sessionStorage.Preview_MaxItemsToFind || 5,
		maxTime: sessionStorage.Preview_MaxTime || 300,
		maxTableViewTime: sessionStorage.Preview_MaxTableViewTime || 150,
		maxCharsToShow: sessionStorage.Preview_MaxCharsToShow || 1000
		 };
	settings.MaxItemsToFind = [ "" + settings.maxItemsToFind ];
	settings.MaxTime = [ "" + settings.maxTime ];
	settings.MaxTableViewTime = [ "" + settings.maxTableViewTime ];
	settings.MaxCharsToShow = [ "" + settings.maxCharsToShow ];
	return settings;
}