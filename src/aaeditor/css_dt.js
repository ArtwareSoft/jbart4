ajaxart.load_plugin("css_dt","plugins/aaeditor/css_dt.xtml");
ajaxart.load_plugin("css_dt","plugins/aaeditor/colors.xtml");

aa_gcs("css_designer",{
	CssDesignerProperty: function (profile,data,context) {
		var field = context.vars._Field[0];
		var prop = aa_text(data,profile,'Property',context);

		var xpath = 'Simplifiers/' + prop + '/@value';
		field.FieldData = function(item_data,ctx) {
			return aa_xpath(item_data[0],xpath,true);
		};
	},
	CssDesignerAutoRefreshPreview: function (profile,data,context) {
		var field = context.vars._Field[0];

		aa_bind(field,'ModifyControl', function(args) {
			var cssObject = aa_var_first(args.Context,'CssObject');
			var xml = cssObject && cssObject.Xml;
			if (!xml) return;

			aa_addOnAttach(args.Wrapper,function() {
				if (args.Wrapper.jbXmlListenerID) return;
				args.Wrapper.jbXmlListenerID = aa_bindXmlChange(xml,function() {
					cssObject.WriteXmlToCss([xml],args.context);
					cssObject.RefreshPreview([],args.context);
				});
			});

			aa_addOnDetach(args.Wrapper,function() {
				aa_unbindXmlChange(args.Wrapper.jbXmlListenerID); 
			});
		},1000);

	}
});

aa_gcs("css_dt", {
	ParseCssDeclaration: function (profile,data,context) {
		ajaxart.css_dt = ajaxart.css_dt || {
			numericProps: ',font-size,width,height,border-radius,padding-top,padding-right,padding-bottom,padding-left,margin-top,margin-right,margin-bottom,margin-left,',
			tokenProps: ',cursor,font-family,overflow,text-transform,text-align,text-overflow,position,float,opacity,'
		}
	
		var result = aa_parsexml('<Css/>');
		var css = aa_text(data,profile,'Css',context) + ';';
		var color_result = aa_build_color_lookup(css); // replacing color expressions with ##colorIndex
		var css = color_result.css;
		var colors = color_result.colors;

		function setAtt(output,att,val) {
			var important = val.indexOf('!important');
			if (important != -1) {
				output.setAttribute('important',(output.getAttribute('important') || '') + ',' + att + ',');
				val = val.substr(0,important);
			}
			output.setAttribute(att,val);
		}
		function injectColors(css) {
			return css.replace(/\#\#([0-9]+)/, function(colorCode) { return aa_color_lookup(colors,colorCode)});
		}
		function parseColor(att,css,result) {
			var color_match = (' ' +css).match(/((\s+[a-zA-Z]+)|(\#[\#0-9A-Fa-f]+))/);
			if (color_match)
				setAtt(result,att,color_match[2] || aa_color_lookup(colors,color_match[3]));
			return color_match[2] || color_match[3];
		}
		function parseBackground(css,result) {
			setAtt(result,'background',css);
		}
		function parseBorder(css,result) {
			function setAtts(pattern,side) {
				var match = css.match(pattern);
				if (!match) return;
				var output = aa_parsexml('<border/>');
				setAtt(output,'size',match[1]);
				setAtt(output,'style',match[2]);
				setAtt(output,'color',injectColors(match[3]));
				setAtt(output,'side',side);
		        result.appendChild(output);
			}
			setAtts(/^border:\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)/,'');
			setAtts(/^border-left:\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)/,'left');
			setAtts(/^border-right:\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)/,'right');
			setAtts(/^border-top:\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)/,'top');
			setAtts(/^border-bottom:\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)/,'bottom');
		}

		function parseShadow(css,result) {
			var shadows = css.split(',');
			for(var i=0;i<shadows.length;i++) {
				var shadow = shadows[i];
				var output = aa_parsexml('<shadow/>');
				var inset_match = shadow.match(/(.*)inset(.*)/);
				if (inset_match) {
					setAtt(output,'shadow_inset','true');
					shadow = inset_match[1] + inset_match[2];
				}
				var color = parseColor('shadow_color',shadow,output);
				if (color) shadow = shadow.replace(color,''); // remove the color from the css
				var match = shadow.match(/\s*([^\s]+)\s+([^\s]+)(\s+([^\s]+))?(\s+([^\s]+))?/);
				if (match) {
					setAtt(output,'shadow_x',match[1]);setAtt(output,'shadow_y',match[2]);setAtt(output,'shadow_blur',match[3] || '0');
					setAtt(output,'shadow_spread',match[5] || '0');
				}
		        result.appendChild(output);
			}
		}
		function parseTextShadow(css,result) {
			var shadows = css.split(',');
			for(var i=0;i<shadows.length;i++) {
				var shadow = shadows[i];
				var output = aa_parsexml('<textshadow/>');
				var match = shadow.match(/^\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/); // Todo: blur and colors are optional
				if (!match) return;
				setAtt(output,'x',match[1]);
				setAtt(output,'y',match[2]);
				setAtt(output,'blur',match[3]);
				setAtt(output,'color',match[4]);
		        result.appendChild(output);
			}
		}
		function parseGradient(type,css,result) {
			setAtt(result,'gradientType',type);
			var stops = css.split(',');
			var dir = stops[0].match(/deg$/) ? stops[0].slice(0,-3) : stops[0];
			setAtt(result,'gradientDir',dir);
			for(var i=1;i<stops.length;i++) {
				var grad = stops[i];
				var output = aa_parsexml('<grad/>');
				var match = grad.match(/^\s*([^\s]+)\s+([0-9]+)/);
				if (!match) return;
				setAtt(output,'color',match[1]);
				setAtt(output,'pos',match[2]);
		        result.appendChild(output);
			}
		}
		var specialProps = [ 
		          [/^font-weight:\s*bold/,function(output) { setAtt(output,'bold','true') }], 
		          [/^white-space:\s*nowrap/,function(output) { setAtt(output,'nowrap','true') }], 
		          [/^font-style:\s*italic/,function(output) { setAtt(output,'italic','true') }], 
		          [/^text-decoration:\s*underline/,function(output) { setAtt(output,'underline','true') }],
		          		          
			      [/^padding:\s*([^\s]+)$/,function(output,match) { 
			    	  setAtt(output,'padding_left',match[1]);setAtt(output,'padding_right',match[1]);setAtt(output,'padding_top',match[1]);setAtt(output,'padding_bottom',match[1]); }],
			      [/^padding:\s*([^\s]+)\s+([^\s]+)$/,function(output,match) { 
			    	  setAtt(output,'padding_left',match[2]);setAtt(output,'padding_right',match[2]);setAtt(output,'padding_top',match[1]);setAtt(output,'padding_bottom',match[1]); }],
			      [/^padding:\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/,function(output,match) 
			          { setAtt(output,'padding_top',match[1]);setAtt(output,'padding_right',match[2]);setAtt(output,'padding_bottom',match[3]);setAtt(output,'padding_left',match[4]);}],
			      [/^margin:\s*([^\s]+)$/,function(output,match) { 
			    	  setAtt(output,'margin_left',match[1]);setAtt(output,'margin_right',match[1]);setAtt(output,'margin_top',match[1]);setAtt(output,'margin_bottom',match[1]); }],
			      [/^margin:\s*([^\s]+)\s+([^\s]+)$/,function(output,match) { 
			    	  setAtt(output,'margin_left',match[2]);setAtt(output,'margin_right',match[2]);setAtt(output,'margin_top',match[1]);setAtt(output,'margin_bottom',match[1]); }],
			      [/^margin:\s*([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/,function(output,match) 
			          { setAtt(output,'margin_top',match[1]);setAtt(output,'margin_right',match[2]);setAtt(output,'margin_bottom',match[3]);setAtt(output,'margin_left',match[4]); }],
			      [/^text-shadow:(.+)/,function(output,match) { parseTextShadow(match[1],output) }],
			      [/^border:.+/,function(output,match) { parseBorder(match[0],output) }],
			      [/^border-left:.+/,function(output,match) { parseBorder(match[0],output) }],
			      [/^border-right:.+/,function(output,match) { parseBorder(match[0],output) }],
			      [/^border-top:.+/,function(output,match) { parseBorder(match[0],output) }],
			      [/^border-bottom:.+/,function(output,match) { parseBorder(match[0],output) }],
			      [/^box-shadow:\s*(.+)/,function(output,match) { parseShadow(match[1],output) }],
			      [/^color:\s*(.+)/,function(output,match) { setAtt(output,'color',injectColors(match[1])) }],
			      [/^background-color:\s*(.+)/,function(output,match) { setAtt(output,'background_color',injectColors(match[1])) }],
			      [/^background:\s*(.+)/,function(output,match) { parseBackground(injectColors(match[1]),output) }],
			      [/^background-image:\s*(-webkit-)?([^-]+)-gradient\(([^)]+)/,function(output,match) { parseGradient(match[2],injectColors(match[3]),output) }]
		 ];
		var props = css.split(';');
		var unknown = '';
		for (var p=0;p<props.length;p++) {
			var prop = props[p].replace(/^\s*/, '').replace(/\s*$/, ''); // trim
			if (!prop) continue;
			var prop_parts = prop.split(':');
			var propName = ',' + prop_parts[0] + ',';
			var attName = prop_parts[0].replace(/-/,'_');
			if (ajaxart.css_dt.numericProps.indexOf(propName) != -1 || ajaxart.css_dt.tokenProps.indexOf(propName) != -1)
				setAtt(result,attName,prop_parts[1]);
			else {
				var found = false;
				for(var i=0;i<specialProps.length;i++)
				{
					try {
					var match = prop.match(specialProps[i][0]);
					if (match) { specialProps[i][1].call({},result,match); found = true; }
					} catch(e) {
					}
				}
				if (!found) 
					unknown += (unknown == '' ? '' : ';') + injectColors(prop);
			}
		}
		if (unknown) result.setAttribute('unknown',unknown);
		//result = result.replace(/^\s*/, '').replace(/\s*$/, '');
		return [result];
	},
	ParseCssBlock: function(profile,data,context)
	{
		// e.g. >div>div { width: 30px; height2:40px; } >div>div>div { width2: 40px } 
		// TBD: @-moz-document url-prefix() { >div>div { width: 30px; height2:40px; } >div>div>div { width2: 40px } }
		var block = aa_text(data,profile,'Block',context);
		var pattern = /([^\{]*)?\{([^}]*)\}/g;
		var result = aa_parsexml('<Block/>');
		while (match = pattern.exec(block)) {
			var selector = match[1] ? match[1].replace(/^\s*/, '').replace(/\s*$/, '') : '##'; // ## as key for empty selector
			var rule = ajaxart.runNativeHelper([match[2]],profile,'ParseDeclaration',context)[0];
			var exiting_rule = aa_xpath(result,"Css[@selector='"+ selector +"']")[0];
			if (exiting_rule) { // adding and overriding existing rule
				for (var i=0; i<rule.attributes.length; i++) {
					var attr = rule.attributes.item(i).name;
					var curVal = exiting_rule.getAttribute(attr);
					if (attr == 'unknown' && curVal)
						exiting_rule.setAttribute(attr,rule.getAttribute(attr) + '; ' + curVal);
					else
						exiting_rule.setAttribute(attr,rule.getAttribute(attr));
				}
		   		for (var child = rule.firstChild; child != null; child=child.nextSibling)
		   			exiting_rule.appendChild(child.cloneNode(true));
			} else {
				rule.setAttribute('selector',selector);
				result.appendChild(rule);
			}
		}
		return [result];
	},
	WorkingElementToCss: function(profile,data,context)
	{
		var elem = aa_first(data,profile,'WorkingElement',context);
		if (!elem) return [''];

		if (elem.tagName == 'Block') {
			var result = '';
			var rules = aa_xpath(elem,'Css');
			for(var i=0;i<rules.length;i++) {
				var rule = rules[i];
				var selector = rule.getAttribute('selector') + ' ';
				if (selector == '## ') selector = '';
				result += selector + '{ ' + splitLines(processCssElem(rule),80-selector.length) + '}\n';
			}
			return [result];
		} else 
			return [processCssElem(elem)];

		function splitLines(css,maxLineSize) {
			var arr = css.split(';'), lineSize = 0, result = '';
			for(var i=0;i<arr.length;i++) {
				if (lineSize + arr[i].length > maxLineSize) {
					result += '\n  ';
					lineSize = 0;
				}
				lineSize += arr[i].length;
				if (arr[i]) result += arr[i] + '; ';
			}
			return result;
		}

		function processCssElem(elem) {
			function attVal(att) {
				return attElemVal(elem,att);
			} 
			function attElemVal(elem,att) {
				var val = elem.getAttribute(att); 
				if (!val || val == '0') return ' 0';
				val = val.replace(/^\s+/,'').replace(/\s+$/,''); // trim
				var units = ''; // in value
				if (val.match(/^[0-9]+$/)) units = 'px';
				var important = ((elem.getAttribute('important') || '').indexOf(',' + att+ ',') == -1) ? '' : ' !important'; 
					
				return ' ' + val + units + important;  
			} 
			function hasValue(elem,att) {
				return elem.getAttribute(att) && elem.getAttribute(att) != '0';
			}
			function isTrue(elem,att) {
				return elem.getAttribute(att) && elem.getAttribute(att) == 'true';
			}
			// Prepare atts
			elem.setAttribute('font_weight',elem.getAttribute('bold') == 'true' ? 'bold' : '');
			elem.setAttribute('font_style',elem.getAttribute('italic') == 'true' ? 'italic' : '');
			elem.setAttribute('text_decoration',elem.getAttribute('underline') == 'true' ? 'underline' : '');
			elem.setAttribute('white_space',elem.getAttribute('nowrap') == 'true' ? 'absolute' : '');
			//elem.setAttribute('overflow',elem.getAttribute('text_overflow') == 'ellipsis' ? 'hidden' : '');
			
			var result = '';

			var fields = (ajaxart.css_dt.tokenProps + 'white-space,color,background,background-color,font-weight,font-style,text-decoration,text-shadow,text-overflow,text-transform').split(',');
			for(var i=0;i<fields.length;i++) {
			  var fld = fields[i];
			  var key = fld.replace(/-/,'_');
			  if (elem.getAttribute(key) != null && elem.getAttribute(key) != '')
			    result += fld + ':' + elem.getAttribute(key)+ ';';
			}
			var numeric_fields = ajaxart.css_dt.numericProps.split(',');
			for(var i=0;i<numeric_fields.length;i++) {
			  var fld = numeric_fields[i];
			  var key = fld.replace(/-/,'_');
			  if (elem.getAttribute(key) != null && elem.getAttribute(key) != '')
			    result += fld + ':' + attVal(key)+ ';';
			}
			
			var all_border = aa_xpath(elem,"border[@side='']")[0];
			if (all_border)
				result += 'border:' + attElemVal(all_border,'size') + ' ' + all_border.getAttribute('style') + ' ' + all_border.getAttribute('color') + ';';
			var borders = aa_xpath(elem,"border[@side!='']");
			for(var i=0;i<borders.length;i++) {
			  var border = borders[i];
			  result += 'border-' + border.getAttribute('side') + ':' + attElemVal(border,'size') + ' ' + border.getAttribute('style') + ' ' + border.getAttribute('color') + ';';
			}
			var tshadows = aa_xpath(elem,"textshadow");
			var tresult = [];
			for(var i=0;i<tshadows.length;i++) {
			  var shadow = tshadows[i];
			  tresult.push( attElemVal(shadow,'x') + attElemVal(shadow,'y') + attElemVal(shadow,'blur') + ' ' + shadow.getAttribute('color'));
			}
			if (tresult.length > 0) result += 'text-shadow: ' + tresult.join(', ') + ';';
			
			var shadows = aa_xpath(elem,'shadow');
			var sresult = [];
			for(var i=0;i<shadows.length;i++) {
			  var shadow_elem = shadows[i];
			  sresult.push( (isTrue(shadow_elem,'shadow_inset') ? ' inset' : '') + attElemVal(shadow_elem,'shadow_x')  + attElemVal(shadow_elem,'shadow_y') + 
				  attElemVal(shadow_elem,'shadow_blur') + attElemVal(shadow_elem,'shadow_spread') + ' ' + shadow_elem.getAttribute('shadow_color'));
			}
			if (sresult.length > 0) result += 'box-shadow: ' + sresult.join(', ') + ';';

			var grads = aa_xpath(elem,'grad');
			var gresult = [];
			for(var i=0;i<grads.length;i++) {
			  var grad = grads[i];
			  gresult.push( grad.getAttribute('color') + ' ' + grad.getAttribute('pos').match(/^([0-9]*)/)[1] + '% ');
			}
			var dir = elem.getAttribute('gradientDir');
			if (elem.getAttribute('gradientType') == 'radial')
				dir = 'ellipse cover'; 
			else if (!isNaN(parseFloat(dir))) 
				dir += 'deg';
			if (gresult.length > 0) result += 'background-image: -webkit-'+ elem.getAttribute('gradientType') + '-gradient(' + 
				dir + ', ' + gresult.join(', ') + ');';

			if (hasValue(elem,'unknown')) result += elem.getAttribute('unknown') + ';';
			return result.replace(/^\s*/, '').replace(/\s*$/, '');
		}
	},
	RelatedColors: function(profile,data,context)
	{
		var c = aa_text(data,profile,'Color',context);
		c = c.replace(/^\#/,'');
		var name = aa_text(data,profile,'ColorName',context);
		var hsv = rgbToHsv(parseInt(c.substring(0,2),16),parseInt(c.substring(2,4),16),parseInt(c.substring(4,6),16));
		var cur = Math.floor(hsv[2]*100);

		var result = [];
		for (var i=100;i>=0;) {
			var color = {
				isObject: true,
				color: '#' + hsvToRgbHex(hsv[0],hsv[1],i/100)
			}
			if (cur == i) color = { 
				isObject: true, 
				current: 'true',
				color: '#' + c,
				name: name
			}
			result.push(color);
			var delta = Math.max(1,Math.floor(Math.abs(cur-i)/6));
			i-=delta;
		}
		return result;
	}
});

function rgbToHsv(r, g, b){
    r = r/255, g = g/255, b = b/255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if(max == min){
        h = 0; // achromatic
    }else{
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, v];
}
function hsvToRgbHex(h, s, v){
	function toHex(i) {
		if (i<16)
			return '0'+ i.toString(16).toUpperCase();
		return i.toString(16).toUpperCase();
	}
	var rgb = hsvToRgb(h, s, v);
	return '' + toHex(Math.floor(rgb[0])) + toHex(Math.floor(rgb[1])) + toHex(Math.floor(rgb[2])); 
}
function hsvToRgb(h, s, v){
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [r * 255, g * 255, b * 255];
}
