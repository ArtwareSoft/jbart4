ajaxart.load_plugin("googledrive","plugins/googledrive/google_drive.xtml");

aa_gcs("google_drive",{
  ToggleStudioCollapse: function(profile, data, context) {
    var val = (sessionStorage.studio_collapsed == 'true');
    sessionStorage.studio_collapsed = val ? '' : 'true';

    $('.studio_collapsed_placeholder').toggleClass('studio_collapsed');
    aa_refresh_field(['studio_toggle_button'], 'screen', false, null, context,true);    
  },
  OpenShareSettingsDialog: function(profile, data, context) {
    aa_gd_showSharingSettings();
  },
  InLocalHost: function(profile, data, context) {
    return aa_frombool(window.location.href.indexOf('http://localhost') === 0);
  },
  WidgetDeployID: function(profile, data, context) {
    if (!window.googledrive_lib) {
      var debugID = aa_text(data,profile,"DebugIDInLocalhost",context);
      if (debugID)
        return [debugID];
      else {
        ajaxart.log('cannot provide google drive deploy id when not in google drive','error');
        return;
      }
    }
    var out = 'jbart_' + window.googledrive_lib.CurrentFile.id;
    out = out.replace(/[- ]/g,'_');
    return [out];
  }
});


function aa_gd_saveFile(fileName,folder,content,contentType,method,fileID) {
    if (typeof content == 'string')
      return googledrive_lib.saveTextFile(fileName,folder,content,contentType,method,fileID);

    if (typeof content == 'File') {
      var fileObj = content;
      var deferred = jQuery.Deferred();
      var reader = new FileReader();
      reader.readAsBinaryString(fileObj);
      reader.onload = function(e) {
        var contentType = fileObj.type || 'application/octet-stream';
        var base64Data = btoa(reader.result);
        googledrive_lib.saveTextFile(fileObj.name,folder,'Content-Transfer-Encoding: base64\r\n\r\n' + base64Data,contentType,method,fileID).then(deferred.resolve,deferred.reject,deferred.notify);
      }
      return deferred.promise();
    }
};

function aa_gd_saveFileByName(fileName,folder,content,contentType) {
  var deferred = $.Deferred();

  var request = gapi.client.drive.files.list({ q: "'" + folder + "' in parents and title='"+ fileName + "'" } );
   request.execute(function(resp) { 
    if (resp.items && resp.items[0])
      $.when(aa_gd_saveFile(fileName,folder,content,contentType,'PUT')).then(deferred.resolve,deferred.reject);
    else
      $.when(aa_gd_saveFile(fileName,folder,content,contentType,'POST')).then(deferred.resolve,deferred.reject);
  });
  return deferred.promise();
}

function aa_gd_saveFileByID(fileName,folder,content,contentType,fileID) {
    return aa_gd_saveFile(fileName,folder,content,contentType,'PUT',fileID);
}

function aa_gd_uploadFileToPublicFolder(fileObj) {
    $when(aa_gd_getOrCreatejBartPublicFolder()).then(function(jbart_public_folder_id) {
          $.when(aa_gd_updateFileInFolder(fileObj.name,jbart_public_folder_id,fileObj)).then(function(resp) {
            return { link : 'https://googledrive.com/host/' + jbart_public_folder_id + '/' + fileObj.name };
          });
    });
}

function aa_gd_createFolder(folderName) {
  var deferred = jQuery.Deferred();
  var body = {
    'title': folderName,
    'mimeType': "application/vnd.google-apps.folder"
  };

  var request = gapi.client.drive.files.insert({'resource': body });
  request.execute(function(resp) {
    if (resp.error) {
        console.log ('error creating folder ' + resp.error.code);
        deferred.reject(resp);
        return;
    }
    deferred.resolve(resp);
  });
  return deferred.promise();
}

function aa_gd_makePublic(fileId) {
  var deferred = jQuery.Deferred();
    var permissionBody = {
      'value': '',
      'type': 'anyone',
      'role': 'reader'
    };
    var permissionRequest = gapi.client.drive.permissions.insert({
      'fileId': fileId,
      'resource': permissionBody
    });
    permissionRequest.execute(function(resp) { 
      if (resp.error) {
        console.log ('error in getting public permission ' + resp.error.code);
        deferred.reject(resp);
      }
      else
        deferred.resolve(resp);
    });
  return deferred.promise();
}

function aa_gd_getOrCreatejBartPublicFolder(folderName) {
    var deferred = $.Deferred();
    var public_folder = 'jBart Public';

    var request = gapi.client.drive.files.list({ q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false and title='"+ public_folder + "'" } );
    request.execute(function(resp) { 
      if (resp.items && resp.items[0]) {
          deferred.resolve(resp.items[0].id);
          return;
      }
      $.when(aa_gd_createFolder(public_folder)).done(function(resp) {
        var public_folder_id = resp.id;
        $.when(aa_gd_makePublic(public_folder_id)).done(function(resp2) {
          deferred.resolve(public_folder_id);
        })
      });
    });
  return deferred.promise();
}

function aa_gd_showSharingSettings() {
  googledrive_lib.ready().done(function() {
    if (gapi.drive && gapi.drive.share)
      showDialog();
    else
      gapi.load('drive-share', showDialog);
  });

  function showDialog() {
    var shareClient = new gapi.drive.share.ShareClient(jbGDriveApp.appId);
    shareClient.setItemIds(googledrive_lib.CurrentFile.id);
    shareClient.showSettingsDialog();
  };
}

function aa_gd_saveCurrentDoc() {
  return aa_gd_saveFileByID(googledrive_lib.CurrentFile.title,'',googledrive_lib.CurrentFile.content,jbGDriveApp.mimeType,googledrive_lib.CurrentFile.id); 
}

