
/* jBart.exec runs a jBart action component
 * It gets the action name (to be seen under xtml components), the data for the action and a jbart context object 
 *   
 * example usage (in foursquare4Ipad app):
 * jBart.exec('SelectCurrentVenueInList','',context);
 */
jBart.exec = function (action_name,data,context)
{
	var profile = aa_parsexml('<xtml t="sample.'+action_name+'" />');
	ajaxart.run([],profile,[data],context);
};
/* jBart.get evaluates a jbart expression
 * It gets the jbart expression, its data, a context object and result type (text/array/xml) 
 * Note that the expression will contain %. To put % in jbart js you need to write \%, otherwise it will be evaluated before compiling  
 * 
 * example usage (in foursquare4Ipad app):
 * var selected = jBart.get('%$FSState/@item%','',context,'text');
 */
jBart.get = function(expression,data,context,result_type)
{
	data = data || '';
	if (!result_type) result_type = 'text';
	context = context || ajaxart.newContext();
	var value = ajaxart.dynamicText([data],expression,context,null,false);
	if (result_type == 'text') return aa_totext(value);
	if (result_type == 'array')	return value;
	if (result_type == 'xml' || result_type == 'native') return value[0];
	if (result_type == 'int') {
		var text = aa_totext(value)
		return text ? parseInt(text) : Number.NaN;
	}
	if (result_type == 'bool') return aa_totext(value) == 'true';
	
	return value[0];
};
/* jBart.set( is used to write a value using a jbart expression (usually to a resource)
 * It gets a jbart expression for the 'to' , the value to set and a context object
 * 'data' is the input for the 'to expression'. E.g. it can be used to set values inside an item
 *  
 * Note that the expression will contain %. To put % in jbart js you need to write \%, otherwise it will be evaluated before compiling  
 * 
 * example usage (in foursquare4Ipad app):
 * jBart.set('\%$FSState/@lat\%',position.coords.latitude,'',context);
 */
jBart.set = function(to_as_expression,value,data,context)
{
	context = context || ajaxart.newContext();
	var to = ajaxart.dynamicText([data],to_as_expression,context,null,false);
	ajaxart.writevalue(to,[value]);
};
