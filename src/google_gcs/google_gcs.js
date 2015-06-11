ajaxart.load_plugin("google_gcs","plugins/google_gcs/google_gcs.xtml");

aa_gcs("google_gcs",{
  LogoutGoogleUser: function(profile, data, context) {
    if (ajaxart.inPreviewMode) return;
    if (window.jbLogoutUrl) return location.href = jbLogoutUrl;
    var newUrl = 'https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue=' + window.location.href;
    location.href = newUrl;

    // var deferred = $.Deferred();
    // var $frame = $('<iframe src="https://www.google.com/accounts/Logout" style="display:none;" />').appendTo($('body'));

    // setTimeout(function() {
    //   if (aa_bool(data,profile,'ReloadPageAfter',context))
    //     location.reload(true);
    //   deferred.resolve();
    // },2000);

    // return [deferred.promise()];
  },
  UploadFileToGoogleCloudStorage: function(profile, data, context) {
    var deferred = $.Deferred();
    $.when(aa_uploadFileToGoogleCloudStorage({
      content: aa_text(data,profile,'Content',context),
      fileName: aa_text(data,profile,'FileName',context),
      bucket: aa_text(data,profile,'Bucket',context),
      contentType: aa_text(data,profile,'ContentType',context)
    })).then(
      function(result) { deferred.resolve([result]); },
      function(er) { deferred.reject(er); }
    );
    return [deferred];
  }
});

function aa_uploadFileToGoogleCloudStorage(settings) {
  if (!settings.bucket)
    settings.bucket = 'letmesee2';
  aa_defaults(settings, { addWaitCursorToBody: true, addGUID: true });

  var deferred = $.Deferred();

  if (!jBart.googleCloudAccessToken) {
    jBart.googleCloudAccessToken = { loaded:false, waiting: [] };
    jBart.googleCloudAccessToken.waitCursorCss = aa_attach_global_css("cursor:wait");
    $.get('//jb-letmesee.appspot.com/CloudStorage').then(function (access_token) {
      jBart.googleCloudAccessToken.accessToken = access_token;
      jBart.googleCloudAccessToken.loaded = true;
      for (var i=0; i<jBart.googleCloudAccessToken.waiting.length; i++)
        jBart.googleCloudAccessToken.waiting[i]();
    },function() {
      aa_errorLog('Could not get CouldStorage token');
    });
  } 
  if (!jBart.googleCloudAccessToken.loaded)
    jBart.googleCloudAccessToken.waiting.push(upload);
  else
    upload();

  if (settings.addWaitCursorToBody)
    $("body").addClass(jBart.googleCloudAccessToken.waitCursorCss);

  return deferred.promise();

  function upload() {
    var size = settings.file ? settings.file.size : settings.content.length;
    var contentType = settings.file ? settings.file.type : settings.contentType
    var fileName = settings.file ? settings.file.name : settings.fileName;
    fileName = fileName.replace(/[^a-zA-Z_0-9\.\/]/g,'').replace(/\-/g,'');
    var key = settings.addGUID ? aa_guid() + '_' + fileName : fileName;
    if (size > 4000000) {
      ajaxart.log("Cannot upload to Google Storage file bigger than 4M");
      deferred.reject("Cannot upload to Google Storage file bigger than 4M");
      return;
    }
    var xhr = new XMLHttpRequest();
    // xhr.upload.addEventListener("progress", function(e) {
    //   var pc = parseInt(100 - (e.loaded / e.total * 100));
    //   deferred.notify(file.name + ': ' + pc + '%');
    // }, false);
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4) {
        deferred.resolve('//' + settings.bucket + '.storage.googleapis.com/' + key);
        $("body").removeClass(jBart.googleCloudAccessToken.waitCursorCss);
      }
    }
    // we do not get onerror well
    // xhr.onerror = function(e) {
    //   $("body").removeClass(jBart.googleCloudAccessToken.waitCursorCss);
    //   deferred.reject(e && (e.error||e));
    // }
    xhr.open("POST", 'https://www.googleapis.com/upload/storage/v1beta2/b/' + settings.bucket + '/o?uploadType=media&name=' + key, true);
    xhr.setRequestHeader('Authorization', 'OAuth ' + jBart.googleCloudAccessToken.accessToken);
    // xhr.setRequestHeader('Content-Length', size);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(settings.file ? settings.file : settings.content);
    // xhr.send();//settings.file ? settings.file : settings.content);
  }
}

