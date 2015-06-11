ajaxart.load_plugin("", "plugins/wcf/wcf.xtml");

aa_gcs("wcf", {
	GenerateSampleRequestXml: function(profile, data, context) {
		var wsdl = aa_first(data, profile, 'WSDL', context);
		var operationXml = aa_first(data, profile, 'OperationXmlInWSDL', context);
		var operation = operationXml.getAttribute('name');

		var resultXml = wsdl.ownerDocument.createElement(operation);

		var topXsdElement = aa_xpath(wsdl, "types/schema/element[@name='" + operation + "']/complexType")[0];
		addSampleToXml(resultXml, topXsdElement);

		return [resultXml];

		function addSampleToXml(xml, xsdElement) {
			if (!xml || !xsdElement) return;

			var subXsdElems = aa_xpath(xsdElement, 'sequence/element');
			var baseType = aa_xpath_text(xsdElement, 'complexContent/extension/@base');
			if (baseType) {
				var innerXsdElement = aa_xpath(wsdl, "types/schema/complexType[@name='" + removePrefix(baseType) + "']")[0];
				addSampleToXml(xml, innerXsdElement);

				subXsdElems = aa_xpath(xsdElement, 'complexContent/extension/sequence/element');
			}

			for (var i = 0; i < subXsdElems.length; i++) {
				var subXsdElem = subXsdElems[i];
				var type = subXsdElem.getAttribute('type') || '';
				var name = subXsdElem.getAttribute('name');

				if (type.indexOf("xs:") == 0 || type.indexOf('ser:') == 0) // primitive
					xml.setAttribute(name, "");
				else {
					type = removePrefix(type);
					var innerXsdElement = aa_xpath(wsdl, "types/schema/complexType[@name='" + type + "']")[0];
					var innerXml = xml.ownerDocument.createElement(name);
					xml.appendChild(innerXml);

					if (type.indexOf('ArrayOf') == 0) {
						if (type == 'ArrayOfstring') {
							innerXml.setAttribute('_jbType', 'string[]');
							var item = xml.ownerDocument.createElement('item');
							item.appendChild(xml.ownerDocument.createTextNode(""));
							innerXml.appendChild(item);
						} else {
							innerXml.setAttribute('_jbType', 'array');
							addSampleToXml(innerXml, innerXsdElement);
						}
					} else {
						addSampleToXml(innerXml, innerXsdElement);						
					}
				}
			}
		}

		function removePrefix(text) {
			if (text.indexOf(":") > -1) return text.split(':')[1];
			return text;
		}

		// <complexType name="CustomerCredentials">
		//   <complexContent mixed="false">
		//     <extension base="tns:BaseCredentials">
		//       <sequence>
		//         <element minOccurs="0" name="ApplicationId" type="xs:int"/>
		//       </sequence>
		//     </extension>
		//   </complexContent>
		// </complexType>

		// <complexType name="BaseCredentials">
		//   <sequence>
		//     <element minOccurs="0" name="Password" nillable="true" type="xs:string"/>
		//     <element minOccurs="0" name="UniqueId" nillable="true" type="xs:string"/>
		//     <element minOccurs="0" name="Username" nillable="true" type="xs:string"/>
		//   </sequence>
		// </complexType>


		// <element name="GetCredit">
		//   <complexType>
		//     <sequence>
		//       <element minOccurs="0" name="credentials" nillable="true" type="q8:CustomerCredentials"/>
		//     </sequence>
		//   </complexType>
		// </element>


		// <complexType name="ArrayOfSmsMessage">
		//   <sequence>
		//     <element minOccurs="0" maxOccurs="unbounded" name="SmsMessage" nillable="true" type="tns:SmsMessage"/>
		//   </sequence>
		// </complexType>

	},
	CleanXmlSpecified: function(profile, data, context) {
		var xml = aa_first(data,profile,'Xml',context);
		if (!xml || xml.nodeType != 1) return;
		xml = xml.cloneNode(true);
		fix(xml);
		return [xml];

		function fix(elem) {
			for (var i=0; i<elem.attributes.length; i++) {
				var name = elem.attributes.item(i).name;
				if (endsWith(name,'Specified'))
					elem.removeAttribute(name);
			}
			for(var iter=elem.firstChild;iter;iter=iter.nextSibling)
				if (iter.nodeType == 1) fix(iter);
		}
		function endsWith(str,end) {
			return (str.indexOf(end) > -1 && str.indexOf(end) == str.length - end.length);
		}
		return [xml];
	},
	GenerateCSharpWebApiCode: function(profile, data, context) {
		var wsdl = aa_first(data, profile, 'WSDL', context);
		var classesGenerated = !aa_bool(data,profile,'GenerateRequestResponseClasses',context);

		var out = "",
			requestResponseClasses = "",
			controllerClassMethods = "";
		var serviceName = wsdl.getAttribute('name');

		var operations = aa_xpath(wsdl, 'portType/operation');
		for (var i = 0; i < operations.length; i++) {
			var operationXml = operations[i];
			var name = operationXml.getAttribute('name');
			var portType = aa_xpath_text(operationXml, '../@name');
			var responseType = getResponseDotNetType(operationXml);

			requestResponseClasses += '\npublic class ' + name + 'Request\n{\n';

			controllerClassMethods += '\t[ActionName("' + name + '")]\n';
			controllerClassMethods += '\tpublic ' + name + 'Response Post' + name + '([FromBody]' + name + 'Request request)\n\t{\n';
			controllerClassMethods += '\t\tI' + serviceName + ' service = new ' + serviceName + 'Client();\n';

			var serviceActivationCode = 'service.' + name + '(';

			var requestParams = getRequestParamNames(operationXml);
			for (var j = 0; j < requestParams.length; j++) {
				serviceActivationCode += "request." + requestParams[j].getAttribute("name");
				if (j != requestParams.length - 1) serviceActivationCode += ',';

				requestResponseClasses += '\tpublic ' + toDotNetType(requestParams[j].getAttribute('type')) + ' ' + requestParams[j].getAttribute("name") + ';\n';
			}
			serviceActivationCode += ')';

			if (classesGenerated) {
				controllerClassMethods += '\t\treturn service.' + name+'(request);\n';
			} else {
				if (responseType) controllerClassMethods += '\t\treturn new ' + name + 'Response{ ' + name + 'Result = ' + serviceActivationCode + '};\n';
				else {
					controllerClassMethods += '\t\t' + serviceActivationCode + ';\n';
					controllerClassMethods += '\t\treturn new ' + name + 'Response();\n';
				}
			}

			requestResponseClasses += '\n}\n';
			controllerClassMethods += "\t}\n\n";

			requestResponseClasses += '\npublic class ' + name + 'Response\n{\n';
			if (responseType) requestResponseClasses += '\tpublic ' + responseType + ' ' + name + 'Result;';
			requestResponseClasses += '\n}\n';
		}

		out += 'using System;\nusing System.Collections.Generic;\nusing System.Linq;\nusing System.Net;\nusing System.Net.Http;\nusing System.Web.Http;\n';
		out += '\nnamespace '+serviceName+'_WebApi\n{\n\n';

		out += '[Authorize]\n';
		out += "public class " + serviceName + "Controller : ApiController\n{\n";
		out += controllerClassMethods;
		out += "}\n";
		if (!classesGenerated)
			out += requestResponseClasses;

		out += '\n}\n';
		return [out];

		function toDotNetType(type) {
			if (type.indexOf('xs:') == 0) {
				if (type == 'xs:boolean') return 'bool';
				if (type == 'xs:int') return 'int';
			}
			type = removePrefix(type);
			if (type.indexOf('ArrayOf') == 0) 
				return type.substring(7) + '[]';
			return type;
		}

		function getResponseDotNetType(operationXml) {
			var element = aa_xpath(wsdl, "types/schema/element[@name='" + operationXml.getAttribute('name') + "Response']")[0];
			var type = aa_xpath_text(element, 'complexType/sequence/element/@type');
			return toDotNetType(type);
		}

		function getRequestParamNames(operationXml) {
			var element = aa_xpath(wsdl, "types/schema/element[@name='" + operationXml.getAttribute('name') + "']")[0];
			return aa_xpath(element, 'complexType/sequence/element'); // TODO: handle inheritance

			// <element name="GetHistoryMessages">
			//   <complexType>
			//     <sequence>
			//       <element minOccurs="0" name="credentials" nillable="true" type="q9:CustomerCredentials"/>
			//       <element minOccurs="0" name="filter" nillable="true" type="q10:HistoryMessageFilter"/>
			//     </sequence>
			//   </complexType>
			// </element>
		}

		function removePrefix(text) {
			if (text.indexOf(":") > -1) return text.split(':')[1];
			return text;
		}

	},
	AspNetCrossDomainProxy: function(profile, data, context) {
		if (ajaxart.jbart_studio) return ajaxart.runNativeHelper(data, profile, 'InStudio', context);

		var httpCall = context.vars._HttpCall[0];

		aa_bind(httpCall, 'prepare', function() {
			httpCall.options.type = 'POST';
			httpCall.options.data = JSON.stringify(httpCall.options.url);
			httpCall.options.headers = {
				'Content-Type': 'application/json'
			};
			httpCall.options.url = aa_text(data, profile, 'UrlForWebAPI', context);
		});
	}
});