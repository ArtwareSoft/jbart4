function aa_lmc_initFileObj(context,fileObj) {
	var appContext = context.vars._AppContext[0];
	appContext.lmcFiles = appContext.lmcFiles || [];
	if (appContext.lmcFiles[fileObj.name]) {
		var prevFileObj = appContext.lmcFiles[fileObj.name];
		aa_unbindXmlChange(prevFileObj.xmlChangeID);
		fileObj.prevFileObj = prevFileObj;
	}
	appContext.lmcFiles[fileObj.name] = fileObj;
	fileObj = aa_defaults(fileObj,{
		autoSaveTimeout: 2000
	});
	return fileObj;
}

function aa_lmc_getFileObj(context,name) {
	var appContext = context.vars._AppContext[0];
	return appContext.lmcFiles && appContext.lmcFiles[name];
}

function aa_lmc_loadAppFile(context,fileObj) {
	if (fileObj.saving) return;

	var deferred = $.Deferred();

	var prefix = fileObj.projectID || aa_lmc_projectID(context);

	$.when(aa_lmcApi_getFile(prefix,fileObj.filePath,fileObj.loadCanFail)).then(function(result,generation) {
		result = aa_parsexml(result);
		fileObj.generation = generation;
		fileObj.clone = ajaxart.xml2text(result);
		fileObj.xml = result;
		aa_setDataResource(context,fileObj.DataResourceName,result);

		if (fileObj.autoSave) {
			aa_unbindXmlChange(fileObj.xmlChangeID);
			fileObj.changedInnerXml = null;
			fileObj.xmlChangeID = aa_bindXmlChange(result,function(changedXml) {
				fileObj.modified = true;
				fileObj.changedInnerXml = changedXml;
				aa_lmc_runSaveDelayedAction(context,fileObj);
			});
		}
		deferred.resolve(result);
		aa_trigger(fileObj,'loadFile');
	},deferred.reject);

	return deferred.promise();
}

function aa_lmc_runSaveDelayedAction(context,fileObj) {
	aa_run_delayed_action('lmc_autosave_'+fileObj.filePath,function() {
		aa_trigger(fileObj,'autoSave',fileObj.changedInnerXml);
		$.when(aa_lmc_saveAppFile(context,fileObj)).then(function() {
			fileObj.modified = false;
			if (fileObj.autoSaveUserMessage)
				aa_lmc_userNotification(context,fileObj.autoSaveUserMessage(fileObj.xml),'saved');
			aa_trigger(context.vars._AppContext[0],'lmcSave');
		});

	},fileObj.autoSaveTimeout,true);
}

function aa_lmc_saveAppFile(context,fileObj)
{
	var deferred = $.Deferred();
	if (window.location.href.match(/playground=true/)) {
		console.log('playground - lmc files are not saved');
		return;
	}
	
	if (fileObj.clone && fileObj.clone == ajaxart.xml2text(fileObj.xml) ) return deferred.resolve().promise();

	if (fileObj.saving && fileObj.timeOfSaving < new Date().getTime() - 60000)
		fileObj.saving = false;
	
	if (fileObj.saving) {
		fileObj.autoSaveTimeout = fileObj.autoSaveTimeout || 2000;
		aa_lmc_runSaveDelayedAction(context,fileObj);
		return fileObj.savingDeferred.promise();
	}
	fileObj.saving = true;
	fileObj.timeOfSaving = new Date().getTime();
	fileObj.savingDeferred = deferred;
	var sentGeneration = fileObj.generation;

	if (fileObj.addModifiedDate)
		fileObj.xml.setAttribute('modifiedDate',new Date().getTime()+window.jbServerTimeDiff);
	var saveContent = ajaxart.xml2text(fileObj.xml);

	var allowStop = {};
	aa_trigger(fileObj,'beforeSave',allowStop);
	if (allowStop.stopSaving) {
		fileObj.saving = false;
		return;
	}

	if (!fileObj.isClient) {
		var promise = aa_lmcApi_saveFile({ 
			project: aa_lmc_projectID(context), 
			key: aa_lmc_projectKey(context),	
			file: fileObj.filePath,	
			content: saveContent,	
			generation: fileObj.generation
		});
	} else {
		var promise = aa_lmcApi_clientSaveFile({ 
			client: fileObj.clientID,
			key: fileObj.clientKey,
			file: fileObj.filePath,
			content: saveContent,
			generation: fileObj.generation
		});
	}
	
	$.when(promise).then(function(result) {
		fileObj.generation = result.getAttribute('generation');
		fileObj.saving = false;
		fileObj.clone = saveContent;
		aa_consoleLog('file ' + fileObj.filePath + ' saved');
		aa_trigger(fileObj,'afterSave',fileObj.xml);

		var trackingObject = { type: 'save', text: fileObj.filePath};
		aa_trigger(fileObj,'trackSave',trackingObject);
		if (!trackingObject.noTracking)
			aa_lmcTrack(trackingObject.type,trackingObject.text,trackingObject.moreText);
		deferred.resolve();
	}).fail(function(result) {
		if (result && result == 'wrong generation') {
			fileObj.saving = false;
			handleWrongGeneration(sentGeneration);
		} else {
			fileObj.saving = false;
			if (fileObj.putBadSavesInLocalStorage) {
				try {
					window.localStorage['lmc_'+fileObj.filePath] = saveContent;
					window.localStorage['lmc_generation_'+fileObj.filePath] = fileObj.generation;
				} catch(e) {}
			}
			deferred.reject(result);
		}
	});

	return deferred.promise();

	function handleWrongGeneration(sentGeneration) {
		$.when(aa_lmcApi_getFile(aa_lmc_projectID(context),fileObj.filePath)).then(function(result,generation) {
			if (generation == sentGeneration) {
				// if we got here it means there was no real generation mismatch, but just a saving error
				aa_lmcApi_ServerErrorLog('saving_file_not_wrong_generation_+'+aa_string2id(fileObj.filePath),'Critical error while saving your changes');
				aa_errorLog('Error saving file...getting wrong generation but the generation is ok');
				fileObj.saving = false;
				return deferred.reject();
			}
			var resultAsXml = aa_parsexml(result);
			aa_consoleLog('Merging file ' + fileObj.filePath);
			aa_cb_mergeXmlFile(aa_parsexml(fileObj.clone),fileObj.xml,resultAsXml);

			fileObj.generation = generation;
			fileObj.saving = false;
			aa_trigger(fileObj,'afterMerge');			
			$.when(aa_lmc_saveAppFile(context,fileObj)).then(deferred.resolve,deferred.reject);			
		},function (err) {
			fileObj.saving = false;
			aa_lmcApi_ServerErrorLog('loading_file_after_wrong_generation_+'+aa_string2id(fileObj.filePath),'Critical error while saving your changes');
			deferred.reject();
		});		
	}
}

function aa_lmc_filesBeforeWindowUnload(context) {
	var appContext = context.vars._AppContext[0];
	appContext.lmcFiles = appContext.lmcFiles || [];
	for(var file in appContext.lmcFiles) {
		var fileObj = appContext.lmcFiles.hasOwnProperty(file) && appContext.lmcFiles[file];
		if (fileObj.modified && fileObj.autoSave) return 'There are changes waiting to be auto saved';
		if (fileObj.prevFileObj && fileObj.prevFileObj.modified && fileObj.prevFileObj.autoSave) return 'There are changes waiting to be auto saved';
	}	
}

function aa_lmc_cancelFileSaves(context,fileObj) {
		aa_unbindXmlChange(fileObj.xmlChangeID);
		aa_cancel_delayed_action('lmc_autosave_'+fileObj.filePath);
}