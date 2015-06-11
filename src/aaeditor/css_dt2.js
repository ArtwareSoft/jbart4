ajaxart.load_plugin("css_dt","plugins/aaeditor/css_dt2_parser.xtml");
ajaxart.load_plugin("css_dt","plugins/aaeditor/css_dt2.xtml");

aa_gcs("css_dt", {
// basic types
Length: function (profile,data,context) {
	var regex = new RegExp('^\s*'+aa_text(data,profile,'Regex',context));
	var enums = ',' + aa_text(data,profile,'Enum',context) + ',';
	var prefix = aa_text(data,profile,'Prefix',context);
	return[ {
			parseBegin: function(text) {
				if (prefix) {
					if (text.indexOf(prefix) != 0) return;
					text = text.substring(prefix.length);
				}

				var match = text.match(regex); // /^(\s*[-]?[0-9]+[a-z]*)/);
				if (match && match[1])
					return text.substring(0,prefix.length + match[1].length);
				var token_match = text.match(/^[0a-z\-]+/);
				if (token_match && token_match[0])
					if (enums.indexOf(',' + token_match[0] + ',') == 0) 
						return token_match[0];
			},
			serialize: function(sElem,prop) {
				var val = sElem.getAttribute(prop.replace(/-/g,'_')); 
				//if (!val || val == '0') return prop + ':' + ' 0';
				val = val.replace(/^\s+/,'').replace(/\s+$/,''); // trim
				var units = ''; // in value
				if (val.match(/^[0-9]+$/)) units = 'px';
				var css_elem = elem.parentNode;
				var important = ((css_elem.getAttribute('important') || '').indexOf(',' + prop+ ',') == -1) ? '' : ' !important'; 
				return prop + ':' + ' ' + val + units + important;
			}
		}]
},
Or: function (profile,data,context) {
	var options = ajaxart.runsubprofiles(data,profile,'Type',context);
	var editorIds = aa_text(data,profile,'EditorIDs',context).split(',');
	return[ {
			parseBegin: function(text) {
				for(var i=0;i<options.length;i++) {
					var result = options[i].parseBegin(text);
					if (result) 
						return result;
				}
			},
			parseComplexValue: function(value,sElem) {
				for(var i=0;i<options.length;i++)
					if (options[i].parseBegin(value)) {
						if (options[i].parseComplexValue)
							options[i].parseComplexValue(value,sElem);
						return;
					}
			},
			serializeComplexValue: function(sElem) {
				var index = -1;
				var editor_id = sElem.getAttribute('editorID');
				var value = sElem.getAttribute('value');

				if (editor_id) 
					for(var i=0;i<editorIds.length;i++)
						if (editorIds[i] == editor_id) index = i;
				if (index == -1) { // not found by editor Id. try first that parse the value
					if (value == null)
						return '';
					for(var i=0;i<options.length;i++)
						if (options[i].parseBegin(value)) {
							index = i;
							break;
						}
				}
				if (index != -1 && options[index].serializeComplexValue)
					return options[index].serializeComplexValue(sElem);
				return '';
			}
	}]
},
Enum: function (profile,data,context) {
	var options = ',' + aa_text(data,profile,'Options',context) + ',';
	return[ {
		parseBegin: function(text) {
				var match = text.match(/^\s*([a-zA-Z0-9_\-]+)/);
				if (match && options.indexOf(',' + match[1] + ',') != -1)
					return match[0];
		}
	}]
},
ByRegex: function (profile,data,context) {
	var regex = new RegExp('^\s*'+aa_text(data,profile,'Regex',context));
	return [{
		parseBegin: function(text) {
			var match = text.match(regex);
			if (match && match[0])
				return match[0];
		}
	}];
},
RepeatingValue: function (profile,data,context) {
	var separator = aa_text(data,profile,'Separator',context);
	var tag = aa_text(data,profile,'Tag',context);
	var type = aa_first(data,profile,'Type',context);
	return [{
		parseBegin: function(text) {
			var out = '',remaining=text;
			while(remaining.length > 0) {
				res = type.parseBegin(remaining);
				if (!res || res.length==0) break;
				out +=res;
				remaining = remaining.substring(res.length);
				while(remaining.length >0 && remaining[0] == separator) {
					out += separator;
					remaining = remaining.substring(1);
				}
			}
			return out;
		},
		parseComplexValue: function(value,sElem) {
			var out = '',remaining=value;
			var innerElems = [];
			while(remaining.length > 0) {
				res = type.parseBegin(remaining);
				if (!res || res.length==0) break;
				var innerElem = aa_parsexml('<' + tag + '/>');
				innerElems.push(innerElem)
				if (type.parseComplexValue)
					type.parseComplexValue(res,innerElem);
				else
					innerElem.setAttribute('value',res);

				remaining = remaining.substring(res.length);
				while(remaining.length >0 && remaining[0] == separator) {
					out += separator;
					remaining = remaining.substring(1);
				}
			}
			for(var i=0;i<innerElems.length;i++)
				sElem.appendChild(innerElems[i]);
		},
		serializeComplexValue: function(sElem) {
			var innerElems = aa_xpath(sElem,tag);
			var res = [];
			for(var i=0;i<innerElems.length;i++) {
				var val = type.serializeComplexValue && type.serializeComplexValue(innerElems[i]);
				res.push(val || innerElems[i].getAttribute('value'));
			}
			return res.join(separator);
		}
	}];
},
SequenceValue: function (profile,data,context) {
	var inner_props = ajaxart.runsubprofiles(data,profile,'Prop',context);
	var separator = aa_text(data,profile,'Separator',context);
	return [{
		parseBegin: function(text) {
			var out = '',remaining=text;
			for(var i=0;i<inner_props.length;i++) {
				var res;
				if (inner_props[i].text && remaining.indexOf(inner_props[i].text) == 0) // SequenceValueFiller
					res = inner_props[i].text;
				if (inner_props[i].type)
					res = inner_props[i].type.parseBegin(remaining);
				if ((res == null || res.length==0) && !inner_props[i].optional) return; // error
				res = res || '';
				out +=res;
				remaining = remaining.substring(res.length);
				while(remaining.length >0 && remaining[0] === separator) {
					out += separator;
					remaining = remaining.substring(1);
				}
			}
			return out;
		},
		parseComplexValue: function(value,sElem) {
			var out = '',remaining=value;
			var vals = [];
			for(var i=0;i<inner_props.length;i++) {
				var res;
				if (inner_props[i].text && remaining.indexOf(inner_props[i].text) == 0) // SequenceValueFiller
					res = inner_props[i].text;
				if (inner_props[i].type)
					res = inner_props[i].type.parseBegin(remaining);
				if ((res == null || res.length==0) && !inner_props[i].optional) return; // error
				res = res || '';
				vals.push(res);
				remaining = remaining.substring(res.length);
				while(remaining.length >0 && remaining[0] === separator) { // space separators
					out += separator;
					remaining = remaining.substring(1);
				}
			}
			for(var i=0;i<inner_props.length;i++) {
				if (inner_props[i].name) 
					sElem.setAttribute(inner_props[i].name,vals[i]);
				if (inner_props[i].type && inner_props[i].type.parseComplexValue)
					inner_props[i].type.parseComplexValue(vals[i],sElem);
			}
		},
		serializeComplexValue: function(sElem) {
			var res=[];
			for(var i=0;i<inner_props.length;i++) {
				var inner = inner_props[i];
				var value = inner.type && inner.type.serializeComplexValue && inner.type.serializeComplexValue(sElem);
				var value = value || sElem.getAttribute(inner.name) || inner.text;
				if (value)
					res.push(value);
				else
					if (!inner.optional) return ''; // mandatory value is empty
			}
			return res.join(separator);
		}
	}];
},
SequenceValueProp: function (profile,data,context) {
	return [{
		name: aa_text(data,profile,'Name',context),
		type: aa_first(data,profile,'Type',context),
		optional: aa_bool(data,profile,'Optional',context)
	}];
},
SequenceValueFiller: function (profile,data,context) {
	return [{
		text: aa_text(data,profile,'Text',context),
		optional: aa_bool(data,profile,'Optional',context)
	}];
},
SimplifyToBoolean: function (profile,data,context) {
	var prop = aa_text(data,profile,'Prop',context);
	var feature = aa_text(data,profile,'Feature',context);
	var value = aa_text(data,profile,'Value',context);
	var rule = {
		registerHandlers: function(parsers,serializers) {
			parsers.push(function(css_elem,simplifiers) {
				var sElem = aa_parsexml('<' + feature + '/>');
				var val = aa_xpath(css_elem,"P[@name='" + prop + "']/@value")[0];
				val = val && val.nodeValue;
				if (val && val != value)
					sElem.setAttribute('error','Can not simplify to boolean value: ' + val);
				else
					sElem.setAttribute('value',(val == value) ? 'true' : 'false');
				simplifiers.appendChild(sElem);
			});
			serializers.push(function(css_elem,simplifiers) {
				var sElem = aa_xpath(simplifiers,feature)[0];
				if (sElem && sElem.getAttribute('error')) return;
				var existing = aa_xpath(css_elem,"P[@name='" + prop + "']")[0];
				var css_value = sElem && sElem.getAttribute('value') == 'true' ? value : '';
				if (css_value && existing)
					existing.setAttribute('value',css_value);
				else if (css_value && !existing) {
					var pElem = aa_parsexml('<P name="' + prop + '"/>');
					pElem.setAttribute('value',css_value);
					css_elem.appendChild(pElem);
				} else if (!css_value && existing)
					css_elem.removeChild(existing);
			});
		}
	}
	return [rule];
},
Props: function (profile,data,context) {
	var type = aa_first(data,profile,'Type',context);
	var props = aa_text(data,profile,'Props',context).split(',');
	var rule = {
		registerHandlers: function(parsers,serializers) {
			for (var i = 0; i < props.length; i++) {
				var prop = props[i];
				aa_register_property(parsers,serializers,prop,type);
			}
		}
	}
	return [rule];
},
Prop: function (profile,data,context) {
	var prop = aa_text(data,profile,'Prop',context);
	var type = aa_first(data,profile,'Type',context);
	var rule = {
		registerHandlers: function(parsers,serializers) {
			aa_register_property(parsers,serializers,prop,type);
		}
	}
	return [rule];
},
ExtractSequence: function (profile,data,context) { // must come after the defintion of the specific componenets. So it will override them in serialization
	var prop = aa_text(data,profile,'Prop',context);
	var elems = ajaxart.runsubprofiles(data,profile,'Elem',context);
	var rule = {
		registerHandlers: function(parsers,serializers) {
			var feature = prop.replace(/-/g,'_');
			parsers.push(function(css_elem, simplifiers) {
				var sElems = [];
				var propElem = aa_xpath(css_elem,"P[@name='" + prop + "']/@value")[0];
				var remaining = propElem ? propElem.nodeValue : '';
				if (!remaining) return; // no/empty sequence property
				for (var i = 0; i < elems.length; i++) {
					remaining = remaining.match(/[ ]*(.*)/)[1];
					var result = elems[i].calcSimplifiers(remaining,simplifiers);
					remaining = remaining.substring(result.value ? result.value.length : 0);
					sElems = sElems.concat(result.sElems);
				};
				remaining = remaining.match(/[ ]*(.*)/)[1];
				var error_in_elems = false;
				for (var i = 0; i < sElems.length; i++)
					error_in_elems = error_in_elems || sElems[i].getAttribute('error');

				if (!remaining && !error_in_elems) { // if sequence is OK, accept all simplifiers
					for (var i = 0; i < sElems.length; i++)
						simplifiers.appendChild(sElems[i]);
				} else { // else rollback and add error
					var sElem = aa_parsexml('<' + feature + '/>');
					sElem.setAttribute('error','Can not parse sequence ' + propElem.nodeValue + ' of ' + prop);
					simplifiers.appendChild(sElem);
				}
			});
			serializers.push(function(css_elem,simplifiers) {
				var sElems = [];
				for (var i=0;i<elems.length;i++)
					sElems = sElems.concat(elems[i].sElems(simplifiers));
				var no_change = true,gui_generated = true,only_from_sequence=true,error_in_children=false,missingMandatory=false;
				for (var i=0;i<sElems.length;i++) {
					var sElem = sElems[i];
					if (sElem.getAttribute('value') != sElem.getAttribute('original'))
						no_change = false;
					if (sElem.getAttribute('original'))
						gui_generated = false;
					if (!sElem.getAttribute('from_sequence'))
						only_from_sequence = false;
					if (sElem.getAttribute('error'))
						error_in_children = true;
				}

				for (var i = 0; i < elems.length; i++) 
					if (elems[i].missingMandatory(simplifiers))
						missingMandatory = true;

				var feature = prop.replace(/-/g,'_');
				var error = aa_xpath(simplifiers,feature + '/@error')[0];
				if (error || error_in_children || no_change) return;
				var existing = aa_xpath(css_elem,"P[@name='" + prop + "']")[0];

				var serialized_items = [];
				for (var i=0; i<elems.length; i++)
					serialized_items = serialized_items.concat(elems[i].serializedItems(css_elem,simplifiers));

				if (!missingMandatory && (gui_generated || only_from_sequence)) { // set in the main property
					var vals = [];
					for (var i=0; i<serialized_items.length; i++)
						vals.push(serialized_items[i].val);
					var css_value = vals.join(' ');

					aa_set_pElem(css_elem,prop,css_value);
				} else {
					// move all values to specific properties
					for (var i=0; i<serialized_items.length; i++)
						aa_set_pElem(css_elem,serialized_items[i].prop,serialized_items[i].val);
					// remove the shorthand
					var existing1 = aa_xpath(css_elem,"P[@name='" + prop + "']")[0];
					if (existing1) css_elem.removeChild(existing1);
				}
			});
			for (var i=0;i<elems.length; i++) // register as separate props AFTER the sequence, so 'serialized_as_sequence' will prevent double serialization
			 	elems[i].registerPropHandlers(parsers,serializers);
		}
	}
	return [rule];
},
SequenceElems: function (profile,data,context) {
	var elems = ajaxart.runsubprofiles(data,profile,'Elem',context);
	var prefix = aa_text(data,profile,'Prefix',context);
	return [ {
		registerPropHandlers: function(parsers,serializers) {
			for (var i=0; i<elems.length; i++)
				elems[i].registerPropHandlers(parsers,serializers,prefix);
		},
		calcSimplifiers: function(text, simplifiers) {
			if (aa_bool(data,profile,'AnyOrder',context))
				return aa_calcAnyOrderSequence(text, elems, simplifiers,prefix);
			return aa_calcSequence(text, elems, simplifiers,prefix)
		},
		sElems: function(simplifiers) {
			var result = [];
			for (var i=0; i<elems.length; i++)
				result = result.concat(elems[i].sElems(simplifiers,prefix));
			return result;
		},
		serializedItems: function(css_elem,simplifiers) {
			var result = [];
			for (var i=0; i<elems.length; i++)
				result = result.concat(elems[i].serializedItems(css_elem,simplifiers,prefix));
			return result;
		},
		missingMandatory: function(simplifiers) {
			var result = false;
			for (var i=0; i<elems.length; i++)
				result = result || elems[i].missingMandatory(simplifiers,prefix);
			return result;
		}
	}];
},
SequenceElem: function (profile,data,context) {
	var type = aa_first(data,profile,'Type',context);
	var prop = aa_text(data,profile,'Prop',context);
	var optional = aa_bool(data,profile,'Optional',context);
	return [ {
		registerPropHandlers: function(parsers,serializers,prefix) {
			var Prop = prefix ? prefix + '-' + prop : prop;
			aa_register_property(parsers,serializers,Prop,type);
		},
		calcSimplifiers: function(text, simplifiers,prefix) {
			var Prop = prefix ? prefix + '-' + prop : prop;
			var feature = Prop.replace(/-/g,'_');
			var existing = aa_xpath(simplifiers,feature)[0];
			var sElem = existing || aa_parsexml('<' + feature + '/>');
			sElem.setAttribute('from_sequence','true');
			var value = type.parseBegin(text);
			if (value && sElem.getAttribute('value'))
				sElem.setAttribute('error','Duplicate value: ' + value + ' in ' + Prop);
			else if (!optional && !value)
				sElem.setAttribute('error','Unrecognized value ' + text + ' in ' + Prop);
			else
				sElem.setAttribute('value',value || '');
			if (type.parseComplexValue && value)
				type.parseComplexValue(value,sElem);

			return { value: value, sElems: existing ? [] : [sElem] }
		},
		sElems: function(simplifiers,prefix) {
			var Prop = prefix ? prefix + '-' + prop : prop;
			var feature = Prop.replace(/-/g,'_');
			return aa_xpath(simplifiers,feature);
		},
		serializedItems: function(css_elem,simplifiers,prefix) {
			var Prop = prefix ? prefix + '-' + prop : prop;
			var feature = Prop.replace(/-/g,'_');
			var sElem = aa_xpath(simplifiers,feature)[0];
			if (!sElem) return [];

			var val = type.serializeComplexValue && type.serializeComplexValue(sElem);
			val = val || sElem.getAttribute('value');
			if (sElem.getAttribute('error') || !val || !sElem.getAttribute('from_sequence')) return [];
			return [{ prop: Prop, val: val}];
		},
		missingMandatory: function(simplifiers,prefix) {
			var Prop = prefix ? prefix + '-' + prop : prop;
			var feature = Prop.replace(/-/g,'_');
			var sElem = aa_xpath(simplifiers,feature)[0];
			if (!sElem || optional) return false;
			return sElem.getAttribute('value') == '' || sElem.getAttribute('value') == null;
		}
	}]
},
ExpandDirections: function (profile,data,context) {
	var type = aa_first(data,profile,'Type',context);
	var edges = ['top','right','bottom','left'];
	var corners = ['top-left','top-right','bottom-left','bottom-right'];
	var prop = aa_text(data,profile,'Prop',context);
	var expand_key = aa_text(data,profile,'Expand',context);
	var expand = [];
	if (expand_key.indexOf('Edges') != -1) expand = expand.concat(edges);
	if (expand_key.indexOf('Coreners') != -1) expand = expand.concat(corners);
	var rule = {
		registerHandlers: function(parsers,serializers) {
			parsers.push(function(css_elem,simplifiers) {
				if (expand_key.indexOf('Edges') == -1) return; // TODO: support Corners
				var sElem = aa_parsexml('<' + prop + '/>');
				simplifiers.appendChild(sElem);

				function setAtts(atts,text,propName) {
					for(var i=0;i<atts.length;i++) {
						var attName = atts[i];
						if (sElem.getAttribute(attName))
							sElem.setAttribute('error','Ambiguous ' + prop + '-' + attName + ': ' + sElem.getAttribute(attName) + ' versus ' + text);	

						var value = type.parseBegin(text);
						if (!value || text != value)
							sElem.setAttribute('error','Unrecognized value ' + text + ' in ' + propName || attName);
						else
							sElem.setAttribute(attName,value);
					}
				}
				var props = aa_xpath(css_elem,'P');
				for(var i=0;i<props.length;i++) {
					var name = props[i].getAttribute('name');
					if (name.indexOf(prop) != 0) continue;
					var value = props[i].getAttribute('value');

					// separated
					if (name.indexOf('-') != -1) {
						var dir = name.split('-').pop();
						setAtts([dir],value,name);
						sElem.setAttribute('type','separated');
						continue;
					}
					// unified
					var match = value.match(/^([^\s]+)$/);
					if (match) {
						setAtts(edges,match[1],name); // for error detection
						setAtts(['all'],match[1],name);
						sElem.setAttribute('type','unified');
						continue;
					}
					match = value.match(/^([^\s]+)\s+([^\s]+)$/);
					if (match) {
						setAtts(['top','bottom'],match[1],name);setAtts(['left','right'],match[2],name); // for error detection
						setAtts(['y'],match[1],name);setAtts(['x'],match[2],name);
						sElem.setAttribute('type','xy');
						continue;
					}
					match = value.match(/^([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)$/);
					if (match) {
						setAtts(['top'],match[1],name);setAtts(['right'],match[2],name);setAtts(['bottom'],match[3],name);setAtts(['left'],match[4],name); // for error detection
						sElem.setAttribute('type','separated');
						continue;
					}
				}
			});
			serializers.push(function(css_elem,simplifiers) {
				function deleteNodes(dir) {
					for (var i = 0; i < dir.length; i++) {
						var to_delete = aa_xpath(css_elem,"P[@name='" + prop + '-' + dir[i] + "']")
						for (var j = 0; j < to_delete.length; j++)
							css_elem.removeChild(to_delete[j]);
					}
				}
				function setValueToOneAtt(val) {
					var existing = aa_xpath(css_elem,"P[@name='" + prop + "']")[0];
					if (existing) 
						existing.setAttribute('value',val);
					else
						css_elem.appendChild(aa_parsexml('<P name="' + prop + '" value="' + val + '"/>'));
					deleteNodes(['top','right','bottom','left']);
				}
				function setValueToSpecificAtts(sElem, dir) {
					for (var i = 0; i < dir.length; i++) {
						val = sElem.getAttribute(dir[i]);
						if (val) {
							var existing = aa_xpath(css_elem,"P[@name='" + prop + '-' + dir[i] + "']")[0];
							if (existing) 
								existing.setAttribute('value',val);
							else
								css_elem.appendChild(aa_parsexml('<P name="' + prop + '-' + dir[i] + '" value="' + val + '"/>'));
						} else {
							var to_delete = aa_xpath(css_elem,"P[@name='" + prop + '-' + dir[i] + "']")
							for (var j = 0; j < to_delete.length; j++)
								css_elem.removeChild(to_delete[j]);
						}
					}
				}

				var sElem = aa_xpath(simplifiers,prop)[0];
				if (sElem && sElem.getAttribute('error')) return;
				var type = sElem && sElem.getAttribute('type');
				if (type == '')
					deleteNodes(['top','right','bottom','left']);
				else if (type == 'unified')
					setValueToOneAtt(sElem.getAttribute('all') || '0');
				else if (type == 'xy')
					setValueToOneAtt((sElem.getAttribute('y') || '0') + ' ' + (sElem.getAttribute('x') || '0'));
				else if (type == 'separated') {
					var all_non_empty = sElem.getAttribute('top') && sElem.getAttribute('right') && sElem.getAttribute('bottom') && sElem.getAttribute('left');
					if (all_non_empty)
						setValueToOneAtt(sElem.getAttribute('top') + ' ' + sElem.getAttribute('right') +  ' ' + sElem.getAttribute('bottom') +  ' ' + sElem.getAttribute('left'));
					else {
						setValueToSpecificAtts(sElem,['right','bottom','top','left']);
					}
				}
				return '';
			});
		}
	}
	return [rule];
},
CssXmlMapper: function (profile,data,context) {
	return [{
		parsers: [],
		serializers: [],
		init: function() {
			var rules = ajaxart.runsubprofiles(data,profile,'Rule',context);
			for(var i=0;i<rules.length;i++)
				rules[i].registerHandlers(this.parsers,this.serializers,'');
		},
		parse: function(css,css_elem) {
			var simplifiers = aa_xpath(css_elem,'!Simplifiers')[0];
			var props = css.split(';');
			var unknown = '';
			for (var p=0;p<props.length;p++) {
				var prop = props[p].replace(/^\s*/, '').replace(/\s*$/, ''); // trim
				if (!prop) continue;
				var name = prop.split(':')[0];
				var val = prop.substring(prop.indexOf(':')+1);
				var prop_elem = aa_parsexml('<P/>');
				css_elem.appendChild(prop_elem);
				var important = val.indexOf('!important');
				if (important != -1) {
					prop_elem.setAttribute('important','true');
					val = val.substr(0,important);
				}
				val = val.replace(/^\s*/, '').replace(/\s*$/, '');
				prop_elem.setAttribute('name',name);
				prop_elem.setAttribute('value',val);
			}
			for (var i = 0; i < this.parsers.length; i++)
				this.parsers[i](css_elem,simplifiers);
			var sElems = aa_xpath(css_elem,'Simplifiers/*');
			for(var i=0;i<sElems.length;i++) {
				var sElem = sElems[i];
				if (sElem.getAttribute('value') == null) sElem.setAttribute('value','');
				sElem.setAttribute('original',sElem.getAttribute('value'));
			}
		},
		serialize: function(css_elem) {
			var simplifiers = aa_xpath(css_elem,'Simplifiers')[0];
			var css_result = '';
			for (var i = 0; i < this.serializers.length; i++)
				this.serializers[i](css_elem,simplifiers,'');

			var props = aa_xpath(css_elem,'P');
			for (var i=0; i<props.length; i++) {
				css_result += (css_result == '' ? '' : ';') + props[i].getAttribute('name') + ': ' + props[i].getAttribute('value');
				if (props[i].getAttribute('important') == 'true')
					css_result += ' !important';
			}
	   		return css_result;
		}
	}];
},
	Css2Xml: function(profile,data,context)
	{
		// e.g. >div>div { width: 30px; height2:40px; } >div>div>div { width2: 40px } 
		// TBD: @-moz-document url-prefix() { >div>div { width: 30px; height2:40px; } >div>div>div { width2: 40px } }
		var mapper =  aa_first(data,profile,'Mapper',context);
		mapper.init();
		var block = aa_text(data,profile,'Css',context);
		block = block.replace(/\\%/g,'%'); // css is in xtml and can contain \%. we would like to replace it with %
		var result = aa_parsexml('<Block/>');
		var pattern = /([^\{]*)?\{([^}]*)\}/g;
		while (match = pattern.exec(block)) {
			var selector = match[1] ? match[1].replace(/^\s*/, '').replace(/\s*$/, '') : '#this';
			var rule = aa_xpath(result,"Css[@selector='"+ selector +"']")[0];
			if (!rule) {
				rule = aa_parsexml('<Css/>');
				rule.setAttribute('selector',selector);
				result.appendChild(rule);
			}
			mapper.parse(match[2],rule);
		}
		return [result];
	},
	Xml2Css: function(profile,data,context)
	{
		var elem = aa_first(data,profile,'Xml',context);
		if (!elem) return [''];
		elem = elem.cloneNode(true);
		var LineSize = aa_int(data,profile,'LineSize',context);
		var mapper =  aa_first(data,profile,'Mapper',context);
		mapper.init();
		var result = '';

		var rules = aa_xpath(elem,'Css');
		for(var i=0;i<rules.length;i++) {
				var rule = rules[i];
				var selector = rule.getAttribute('selector') + ' ';
				if (selector == '## ') selector = '';
				result += selector + '{ ' + splitLines(mapper.serialize(rule),LineSize-selector.length) + '}\n';
		}
		return [result];

		function splitLines(css,maxLineSize) {
			var arr = css.split(';'), lineSize = 0, fixed = '';
			for(var i=0;i<arr.length;i++) {
				if (lineSize + arr[i].length > maxLineSize) {
					fixed += '\n  ';
					lineSize = 0;
				}
				lineSize += arr[i].length;
				if (arr[i]) fixed += arr[i] + '; ';
			}
			return fixed;
		}
	},
	PositivePx: function(profile,data,context)	{
		aa_init_px_Unit();
		return [new ajaxart.classes.PxUnit({ min: 0 })];
	},
	OffsetPx: function(profile,data,context) {
		aa_init_px_Unit();
		return [new ajaxart.classes.PxUnit({})];
	},
	ColorLuminance: function(profile,data,context)	{
		var lum = aa_float(data,profile,'Luminance',context);
		var hex = aa_text(data,profile,'Color',context);
		hex = aa_fixHex(hex);
		if (isNaN(hex)) 
			return ['#ffffff'];
		lum = lum || 0;
	
		var rgb = "#", c, i;
		for (i = 0; i < 3; i++) {
			c = parseInt(hex.substr(i*2,2), 16);
			c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
			rgb += ("00"+c).substr(c.length);
		}
		return [rgb];
	},
	LuminanceOfColors: function(profile,data,context)	{
		function splitRGB(hex) {
			if (!hex) return [255,255,255];
			var res = [];
			for (i=0; i<3; i++) 
				res.push(parseInt(hex.substr(i*2,2), 16)); 
			return res;
		}

		var base = splitRGB(aa_fixHex(aa_text(data,profile,'BaseColor',context)));
		var clr1 = splitRGB(aa_fixHex(aa_text(data,profile,'Color1',context)));
		var clr2 = splitRGB(aa_fixHex(aa_text(data,profile,'Color2',context)));
		var lum;
		for (var i=0; i<3; i++) {
			if (clr1[i] != 0 && clr1[i] != 255) {
				var new_lum = clr1[i]/base[i]-1;
				if (lum && (Math.abs(new_lum - lum) > 0.1))
					return;
				lum = new_lum;
			}
			if (clr2[i] != 0 && clr2[i] != 255){
				var new_lum = 1-clr2[i]/base[i];
				if (lum && (Math.abs(new_lum - lum) > 0.1))
					return;
				lum = new_lum;
			}
		}
		return lum ? [lum.toFixed(2)] : [];
	}
});

function aa_init_px_Unit() {
	
	if (ajaxart.classes.PxUnit) return;

	ajaxart.classes.PxUnit = function(settings) {	
		aa_extend(this,settings);
	};
	ajaxart.classes.PxUnit.prototype.parse = function(dataString) {
		if (!dataString) return NaN;
		var valuePart = dataString.match(/([0-9.\-]+)/);
		if (!valuePart) return NaN;
		return parseFloat(valuePart[1]); 
	};
	ajaxart.classes.PxUnit.prototype.getDisplayString = function(number) {
		if (number === '') return '';
		if (number === '0') return '0';
		return number + 'px';
	};

	ajaxart.classes.PxUnit.prototype.getDataString = function(number) {
		if (number === '') return '';
		if (number === '0') return '0';
		return number + 'px';
	};
	ajaxart.classes.PxUnit.prototype.min = NaN;
	ajaxart.classes.PxUnit.prototype.max = NaN;
	ajaxart.classes.PxUnit.prototype.step = 1;
	ajaxart.classes.PxUnit.prototype.initialPixelsPerUnit = 1;

}

function aa_register_property(parsers,serializers,prop,type) {
	var feature = prop.replace(/-/g,'_');
	parsers.push(function(css_elem,simplifiers) {
		var sElem = aa_parsexml('<' + feature + '/>');
		if (!aa_xpath(simplifiers,feature)[0])
			simplifiers.appendChild(sElem);
		if (!aa_xpath(css_elem,"P[@name='" + prop + "']")[0]) return;
		var text = aa_xpath(css_elem,"P[@name='" + prop + "']/@value")[0];
		text = text && text.nodeValue;
		var value = type.parseBegin(text);
		if (!value || text != value) 
			sElem.setAttribute('error',"Unrecognized value '" + text + "' in " + prop);
		else
			sElem.setAttribute('value',value);
		if (type.parseComplexValue && value)
			type.parseComplexValue(value,sElem);
	});
	serializers.push(function(css_elem,simplifiers) {
		var sElem = aa_xpath(simplifiers,feature)[0];
		if (!sElem || sElem.getAttribute('error') || sElem.getAttribute('from_sequence') || sElem.getAttribute('serialized_as_sequence')) return;
		var existing = aa_xpath(css_elem,"P[@name='" + prop + "']")[0];
		var css_value = type.serializeComplexValue && type.serializeComplexValue(sElem);
		css_value = css_value || sElem.getAttribute('value');

		if (css_value && existing)
			existing.setAttribute('value',css_value);
		else if (css_value && !existing) {
			var pElem = aa_parsexml('<P name="' + prop + '"/>');
			pElem.setAttribute('value',css_value);
			css_elem.appendChild(pElem);
		} else if (!css_value && existing)
			css_elem.removeChild(existing);
	});
}

function aa_set_pElem(css_elem,prop,css_value) {
	var existing = aa_xpath(css_elem,"P[@name='" + prop + "']")[0];
	if (css_value && existing)
		existing.setAttribute('value',css_value);
	else if (css_value && !existing) {
		var pElem = aa_parsexml('<P name="' + prop + '"/>');
		pElem.setAttribute('value',css_value);
		css_elem.appendChild(pElem);
	} else if (!css_value && existing)
		css_elem.removeChild(existing);
}

function aa_calcSequence(allText, allElems, simplifiers,prefix) {
	var sElems = [];
	var value = '';
	var remaining = allText;
	for (var i = 0; i < allElems.length; i++) {
		var space = remaining.match(/([ ]*)(.*)/)[1];
		remaining = remaining.match(/([ ]*)(.*)/)[2];
		var result = allElems[i].calcSimplifiers(remaining,simplifiers,prefix);
		sElems = sElems.concat(result.sElems);
		value += space + result.value;
		remaining = remaining.substring(result.value ? result.value.length : 0);
	};
	return { value: value, sElems: sElems }
}

function aa_calcAnyOrderSequence(allText, allElems, simplifiers,prefix) {
	var sElems = [], value = '', error = false;
	var elems = allElems.slice(0); // clone elems array
	var remaining= allText;
	while (!error && remaining.length > 0 && elems.length > 0)
		findNextElem();
	if (error)
		return { value: '', sElems: [] }   
	return { value: value, sElems: sElems }

	function findNextElem() {
		var res,i=0;
		while (i<elems.length) {
			res = elems[i].calcSimplifiers(remaining,simplifiers,prefix);
			if (res.value) break;
			i++;
		}
		if (res.value) {
			var rem = remaining.substring(res.value.length);
			var space = rem.match(/([ ]*)(.*)/)[1];
			var rem = rem.match(/([ ]*)(.*)/)[2];
			value += res.value + space;
			sElems = sElems.concat(res.sElems);
			elems.splice(i,1); // remove the elem
			remaining = rem;
		} else {
			error = true;
		}
	}
}

function aa_fixHex(hex) {
	hex = String(hex).replace(/[^0-9a-f]/gi, '');
	if (hex.length < 6)
		hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
	return hex;
}
