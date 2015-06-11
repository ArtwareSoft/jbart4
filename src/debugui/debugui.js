ajaxart.load_plugin("debugui");

aa_gcs("debugui", 
{
	Traces:function (profile,data,context)
	{
		var counter = 1;
		for(var i=0;i<ajaxart.traces.length;i++) 
			ajaxart.traces[i].counter = ''+(counter++);
		return ajaxart.traces;
	},
	ClearTraces: function (profile,data,context)
	{
		ajaxart.traces = [];
	},
	ClearLogs: function (profile,data,context)
	{
		ajaxart.logs = {};
		jQuery("#aa_immediate_log").remove();
		jQuery(".fld_toolbar_errors_sign").addClass("hidden");
	},
	LogsAsHtml: function (profile,data,context) {
		// ajaxart.log('hi','error');
		// ajaxart.log('50','timing');
		var out = '';
		var errorStyle = aa_text(data,profile,'StyleForError',context);

		var errors = ajaxart.logs.error;
		if (errors && errors.length) {
			out += errorString('errors: ('+errors.length+')\n');
			out += errorString('------------\n');
			for(var i=errors.length-1;i>=0;i--)
				out += errorString(errors[i] + '\n');
			out += '\n';
		}

		for(var logType in ajaxart.logs) {
			if (logType == 'error') continue;

			out += errorString(logType + ' (' + ajaxart.logs[logType].length + ')\n');
			out += errorString('----------------------\n');
			for(var i=ajaxart.logs[logType].length-1;i>=0;i--)
				out += ajaxart.logs[logType][i] + '\n';

			out += '\n';
		}

		out = out || 'No logs';
		
		return [out];

		function errorString(str) {
			return str;
			// var span = $('<span/>').text(str).attr('style',errorStyle);
			// return $('<div/>').append(span).html();
		}
	},
	RuntimeObjectControl: function (profile,data,context) {
		var data = ajaxart.run(data,profile,'Object',context);
		if (data.length==0) return [];
		if (data.length > 1) {
			return ajaxart.runNativeHelper(data,profile,'Multiple',context);
		}
		var out = $('<div />')[0];
		var css = aa_totext(ajaxart.runNativeHelper(data,profile,'Css',context));
		$(out).addClass(aa_attach_global_css(css));

		var item = data[0];
		if (!item) return [out];
		if (typeof item == 'string' || typeof item == 'boolean' || typeof item == 'number' ) {
			out.appendChild(renderTextValue(item));
			return [out];
		}

		if (item.nodeType) {
			out.appendChild(renderXmlValue(item));
			return [out];
		}

		// if we got here it means it's an object
		for(var i in item) {
			if (!item.hasOwnProperty(i) || i == 'XtmlSource' || i == 'isObject' || i == 'jbListeners' || !item[i]) continue;
			var innerValue = item[i];
			var $property = $('<div class="aa_runtime_property" />').appendTo(out);
			var $toggle = $('<div class="aa_runtime_property_toggle primitive" />').appendTo($property);
			var $propIcon = $('<div class="aa_runtime_property_icon" />').appendTo($property);
			var $propName = $('<div class="aa_runtime_property_name" />').text(i+':').appendTo($property);

			var isArray = false;
			if (innerValue.length && typeof innerValue != 'string') {
				// an array
				if (innerValue.length == 1) innerValue = innerValue[0];
				else isArray = true;
			}
			if (!innerValue && !isArray) continue;
			if (!isArray && typeof innerValue == 'string' || typeof innerValue == 'boolean') {
				$property.append( renderTextValue(innerValue,i) );
			} else if (innerValue.nodeType) {
				$property.append( renderXmlValue(innerValue,i) );
			} else if (typeof innerValue == 'function') {
				$property.append('function');
			} else {
				$property[0].jbInnerValue = isArray ? innerValue : [innerValue];
				$toggle.removeClass('primitive');
				$toggle[0].jbPropValue = $('<div class="aa_runtime_property_complex_value"/>').appendTo($property)[0];
				$toggle.click(function() {
					var $parentProperty = $(this).closest('.aa_runtime_property');
					if (!this.jbPropValue.jbRendered) {
						this.jbPropValue.jbRendered = true;
						var innerElem = aa_run_component('debugui.RuntimeObjectControl',$parentProperty[0].jbInnerValue,context,{})[0];
						if (innerElem) this.jbPropValue.appendChild(innerElem);
					}
					$parentProperty.toggleClass('expanded');
				});
			}
		}

		return [out];

		function renderXmlValue(xml,propName) {
			if (xml.nodeType == 1) {
				var xmlTreeField = aa_run_component('xmlui.XmlTree',[xml],context)[0];
				var wrapper = $('<div class="aa_xml_object" />')[0];
				aa_fieldControl({ Field: xmlTreeField, Item: [xml], Context: context, Wrapper: wrapper });
				return wrapper;
			}
			if (xml.nodeValue) return renderTextValue(xml.nodeValue,propName);
			
			return $('<div/>')[0];
		}

		function renderTextValue(text,propName) {
			var inner = $('<div class="aa_text_object" />')[0];
			var maxCharsToShow = aa_preview_settings().maxCharsToShow;
			if (text.length > maxCharsToShow) {
				$(inner).text(text.substring(0,maxCharsToShow) + "...");
				var more = $('<span class="aa_text_object_more long">[More...]</span>');
				$(inner).append(more);
				function open() {
					aa_run_component('xmlui.ShowTextDialog',[text],context,{ Title: [propName || 'Long text'], StudioPopup: ['true'] });
				}
				$(more).click(open);
				$(inner).dblclick(open);
			} else
				$(inner).text(text);
			return inner;
		}

	}
});
