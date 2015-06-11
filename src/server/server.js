ajaxart.load_plugin("server");

ajaxart.gcs.server = 
{
  CallServer: function (profile,data,context)
  {
	var indication = aa_bool(data,profile,'ProgressIndication',context);
	
	aad_server_RunParallelCalls(profile,data,context,'Call',function() {} );
	return ["true"];
  },
  ParallelCalls: function (profile,data,context)
  {
	aad_server_RunParallelCalls(profile,data,context,'Call',null);
	return ["true"];
  },
  BasicServerCall: function (profile,data,context)
  {
  	ajaxart.serverCache = ajaxart.serverCache || [];
	var varname = aa_text(data,profile,'VarNameForResult',context);
	var reusable = aa_bool(data,profile,'Reusable',context);
	var mySync = ajaxart.getVariable(context,"_CallServerObject");
	if (mySync.length > 0) 
		mySync[0].register(mySync[0],varname);
		
	var onresult = function(result,varname,reusable,isSuccess) {
		if (reusable && isSuccess) ajaxart.serverCache[varname] = result;
    	var mySync = ajaxart.getVariable(context,"_CallServerObject");
    	if (mySync.length > 0) { 
    		if (isSuccess) {
    		  mySync[0].servervars[varname] = result;
    		  ajaxart.run(result,profile,'OnLoad',aad_server_contextWithServerVars(context, mySync[0].servervars));
    		}
    		mySync[0].serverResult(mySync[0],isSuccess,varname);
    	}    	
	}
	
    if ( reusable && ajaxart.serverCache[varname] != null )
    	onresult(ajaxart.serverCache[varname],varname,reusable,true);
    else
    {
    	var options = { cache: false };
    	
	    options.url = aa_text(data,profile,'Url',context);;
	    options.type = ( aa_text(data,profile,'Method',context) == 'get' ) ? "GET" : "POST" ;
	    options.contentType = (options.type == "GET") ? "text/xml;charset=UTF-8" : "application/x-www-form-urlencoded; charset=UTF-8"; 
	    options.httpHeaders = [];
	    options.data = {};
	    
	    options.beforeSend = function(XMLHttpRequest) {
//			XMLHttpRequest.setRequestHeader(callObj.httpHeaders[i].name, callObj.httpHeaders[i].value);
	    };
	    
 	    var postDatas = ajaxart.run(data,profile,'PostData',context);
		for(var i=0;i<postDatas.length;i++) {
		  var obj = postDatas[i];
		  var name = ajaxart.totext(obj["Name"]);
		  var val = ajaxart.totext(obj["Value"]);
		  if (val != null)
			  options.data[name] = val; 
		}
	    
	    aad_server_basicCall(options,onresult,varname,reusable,context);
    }
	    
    return ["true"];
  },
  ImmediateResult: function (profile,data,context)
  {
	var mySync = ajaxart.getVariable(context,"_CallServerObject");
	
	if (mySync.length > 0) { 
	  var varname = aa_text(data,profile,'VarNameForResult',context);
	  var result = ajaxart.run(data,profile,'Result',context);
	  mySync[0].servervars[varname] = result;
	  ajaxart.run(result,profile,'OnLoad', context);
  	  mySync[0].register(mySync[0],varname);
	  mySync[0].serverResult(mySync[0],true,varname);
	}
    return ["true"];
  },
  ExportVirtualFile: function (profile,data,context)
  {
	var fileName = aa_text(data,profile,'FileName',context);
	var content = aa_text(data,profile,'Content',context);
	var contentType = aa_text(data,profile,'ContentType',context);
	if (ajaxart.inPreviewMode) return;
	if (ajaxart.serverCounter == null)
		ajaxart.serverCounter = 1;
	  ajaxart.serverCounter++;
	  // counter : chrome dosent open the same file twice
	  var d = document;
	  
	  form = d.createElement('form');
	  form.setAttribute('accept-charset','utf-8');
	  d.body.appendChild(form);
	  form.method='POST';
	  form.setAttribute('method',form.method);
	  form["Accept-Charset"] = "ISO-8859-1,utf-8;q=0.7,*;q=0.7";
	  form.setAttribute("Accept-Charset","ISO-8859-1,utf-8;q=0.7,*;q=0.7");
	  var url = aa_text(data,profile,'Url',aa_ctx(context,{Counter: [""+ajaxart.serverCounter]}));
//	  form.action='main.php?cnt=' + ajaxart.serverCounter + '&op=exportFile';
	  form.action=url;
	  form.setAttribute('action',form.action);
	  form.target='_new';
	  form.setAttribute('target',form.target);
	  
	  Filename=d.createElement('input');
	  Filename.name= 'Filename';
	  Filename.type='hidden';
	  Filename.value = fileName;
	  Filename.setAttribute('value',Filename.value);
	  form.appendChild(Filename);
	  FileData=d.createElement('input');
	  FileData.name='FileData';
	  FileData.type='hidden';
	  FileData.value= content;
	  FileData.setAttribute('value',FileData.value);
	  form.appendChild(FileData);
	  ContentType=d.createElement('input');
	  ContentType.name='ContentType';
	  ContentType.type='hidden';
	  ContentType.value = contentType;
	  ContentType.setAttribute('value',ContentType.value);
	  form.appendChild(ContentType);
	  form.submit();
	  
	  return [];
  }
}




