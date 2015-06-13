aa_gcs("lmc",{
	BatchTestGetFile: function(profile,data,context) {
		var project = aa_text(data,profile,'Project',context);
		var path = aa_text(data,profile,'Path',context);
		var tries = aa_int(data,profile,'Tries',context);
		var waitTime = aa_int(data,profile,'WaitTime',context);

		var count=0;
		nextTry();

		function nextTry() {
			if (count >=tries) return;
			count++;
			aa_lmcApi_getFile(project,path,true).then(function() {
				log(count + ') success');
				setTimeout(nextTry,waitTime);
			},function() {
				log(count + ') error');
				setTimeout(nextTry,waitTime);
			});
		}

		function log(msg) {
			$('.fld_log').val($('.fld_log').val()+'\n'+msg);
		}
	},
	ConvertToSmallerRoom: function(profile,data,context) {
		return [aa_lmcConvertToSmallerRoom(context)];
	},
	ConvertMotorHomeVisitorHtml: function(profile,data,context) {
		var htmlContent = "<script>var roomid = location.href.split('?roomid=')[1].split('#')[0];window.location.href = 'http://jb-letmesee.appspot.com/LetMeSee/dueuja35ka.html?roomid='+roomid;</script>";

		// TODO: change file name to 0B-m8Ujeo0s77VlZtVkczUy1MZW8.html

		jBart.db.saveFile({
			id: 'jbart_0B_m8Ujeo0s77Sy1UamcxczB6M0U.html',
			content: htmlContent,
			success: function(success_result) {
				alert('success');
			},
			error: function(error) {
				alert('error');
			},
			server: 'http://jbartwix1.appspot.com/'
		});
	},
	ConvertMotorHome: function(profile,data,context) {
		aa_lmc_convertMotorhomeToLMCServer2(context,
			aa_text(data,profile,'Project',context),
			aa_text(data,profile,'Room',context),
			aa_text(data,profile,'Key',context),
			false
		);
	}
});

function aa_lmc_convertMotorhomeToLMCServer2(context,project,roomid1,key) {
	var instanceID = '0B_m8Ujeo0s77V1FPdldRdjdRbUk';
	var project = 'dueuja35ka';
	var totalCount = 0;

	var badLogFile;

	jBart.db.getFile({
		id: 'cb_1387809845006_524__visitor',
		success: function(result) {
			badLogFile = fixBadLog(result);

			if (roomid1)
				convertLogs(roomid1);
			else {
				jBart.db.query({
					contentType: 'cobrowse_room',
					headersOnly: true,
					success: function(nodes) {
						var rooms = aa_xpath(nodes,'*');
						var counter=1;
						for(var i=0;i<rooms.length;i++) {
							if (rooms[i].getAttribute('instance') != instanceID) continue;
							var rid = rooms[i].getAttribute('id');
							if (rid) {
								convertLogs(rid,counter++);
								totalCount++;
							}
						}			
					},
					server: 'http://jbartwix1.appspot.com/'
				});
			}
		},
		error: function() {
			aa_errorLog('could not load file cb_1387809845006_524__visitor');
		},
		server: 'http://jbartwix1.appspot.com/'
	});

	function fixBadLog(contents) {
		var lines = contents.split('\n'),newlines=[];
		for(var i=0;i<lines.length;i++) {
			var command = lines[i].split('|')[1];
			if (command == 'join' || command == 'windowsize') newlines.push(lines[i]);
			if (command == 'itemShown') {
				var itemid = lines[i].split('"itemid":"')[1].split('"')[0];
				var line = lines[i].split('itemShown|')[0] + 'itemShown|{"itemid":"'+itemid+'"}';
				newlines.push(line);
			}

		}
		var x = newlines.join('\n').split('1392632604605')[0];
		return x.substring(0,x.length-1);
	}

	function log(msg) {
		$('.convert_log').val($('.convert_log').val() + '\n' + msg);
	}

	function convertLogs(roomid,counter,withtimeout) {
		log('converting logs for  ' + roomid + ' ('+counter + ' of ' + totalCount + ')');
		var newRoomID = roomid;
		var oldVisitorFile,newVisitorFile;
		var cutsomerName;

		$.when(loadOldLogs(),loadNewLogs()).then(function() {		
			var newLog = convertLogFile();

			$.when(aa_lmcApi_saveFile({
				project: project,
				key: key,
				file: 'log/' + roomid + '_visitor.txt',
				content: newLog,
				empty: newLog == ''
			})).then(function() {
				log('saving visitor log ' + roomid);			
			});
		});

		function loadNewLogs() {
			var deferred2 = $.Deferred();
			$.when(aa_lmcApi_getFile(project,'log/' + roomid + '_visitor.txt')).then(function(result) {
				if (result.nodeType == 9) {
					aa_errorLog('Could not load new visitor log');
					return deferred2.reject();
				}
				newVisitorFile = result;
				deferred2.resolve();
			},deferred2.reject);
			return deferred2.promise();
		}

		function loadOldLogs() {
			var deferred2 = $.Deferred();
			jBart.db.getFile({
				id: 'cb_'+roomid+'__visitor',
				success: function(result) {
					;
					oldVisitorFile = result;
					deferred2.resolve();
				},
				error: deferred2.reject,
				server: 'http://jbartwix1.appspot.com/'
			});
			return deferred2.promise();
		}

		function convertLogFile() {
			;
			var out = '';
			var lines = oldVisitorFile.split('\n'),newlines=[];
			for(var i=0;i<lines.length;i++) {
				var command = lines[i].split('|')[1];
				if (command == 'join' || command == 'windowsize') newlines.push(lines[i]);
				if (command == 'itemShown') {
					var itemid = lines[i].split('"itemid":"')[1].split('"')[0];
					var line = lines[i].split('itemShown|')[0] + 'itemShown|{"itemid":"'+itemid+'"}';
					newlines.push(line);
				}
			}
			;
			out = newVisitorFile.replace(badLogFile,newlines.join('\n')+'\n');
			return out;
		}

	}

}

/*
function aa_lmc_convertMotorhomeToLMCServer_____(context,project,roomid1,key,alsoRedirectVisitorHtmls) {
	// convertion from jbartwix1 to lmc server
	var instanceID = '0B_m8Ujeo0s77V1FPdldRdjdRbUk';
	var project = 'dueuja35ka';
//	var roomid = '1387809845006_524';
	var totalCount = 0;

	if (roomid1)
		convertRoom(roomid1);
	else {
		jBart.db.query({
			contentType: 'cobrowse_room',
			headersOnly: true,
			success: function(nodes) {
				var rooms = aa_xpath(nodes,'*');
				var counter=1;
				for(var i=0;i<rooms.length;i++) {
					if (rooms[i].getAttribute('instance') != instanceID) continue;
					var rid = rooms[i].getAttribute('id');
					if (rid) {
						convertRoom(rid,counter++);
						totalCount++;
					}
				}			
			},
			server: 'http://jbartwix1.appspot.com/'
		});
	}

	function convertRoom(roomid,counter,withtimeout) {
		if (!withtimeout) {
			return setTimeout(function() {
				convertRoom(roomid,counter,true);
			},500*counter);
		}
		log('converting roomid ' + roomid + ' ('+counter + ' of ' + totalCount + ')');
		var newRoomID = roomid;
		var oldRoomXml,newRoomXml,oldStats,newStats,oldVisitorFile,oldAgentFile,newVisitorFile,newAgentFile;
		var cutsomerName;

		$.when(loadOldRoom(),loadOldStats(),loadOldLogs1(),loadOldLogs2()).then(function() {		
			cutsomerName = oldRoomXml.getAttribute('customerName');

			fixContents();

			$.when(addRoomUrl()).then(function() {
				$.when(aa_lmcApi_saveRoom({
					project: project,
					room: newRoomID,
					content: ajaxart.xml2text(newRoomXml)
				})).then(function() {
					log('saving room ' + cutsomerName);
				});
			});

			$.when(aa_lmcApi_saveRoomAgentInfo({
				project: project,
				room: newRoomID,
				key: key,
				content: '<agentinfo id="'+newRoomID+'" />'
			})).then(function() {
				log('saving room info ' + cutsomerName);			
			});

			$.when(aa_lmcApi_saveStats({
				project: project,
				room: newRoomID,
				content: ajaxart.xml2text(newStats)
			})).then(function() {
				log('saving room stats ' + cutsomerName);			
			});

			$.when(aa_lmcApi_saveFile({
				project: project,
				key: key,
				file: 'log/' + newRoomID + '_visitor.txt',
				content: newVisitorFile,
				empty: newVisitorFile == ''
			})).then(function() {
				log('saving visitor log ' + cutsomerName);			
			});

			$.when(aa_lmcApi_saveFile({
				project: project,
				key: key,
				file: 'log/' + newRoomID + '_agent.txt',
				content: newAgentFile,
				empty: true
			})).then(function() {
				log('saving agent log ' + cutsomerName);			
			});
		});

		function loadOldLogs1() {
			var deferred2 = $.Deferred();

			jBart.db.getFile({
				id: 'cb_1387809845006_524__agent',
				success: function(result) {
					oldAgentFile = result;
					deferred2.resolve();
				},
				error: deferred2.reject,
				server: 'http://jbartwix1.appspot.com/'
			});
			return deferred2.promise();
		}

		function loadOldLogs2() {
			var deferred2 = $.Deferred();
			jBart.db.getFile({
				id: 'cb_1387809845006_524__visitor',
				success: function(result) {
					oldVisitorFile = result;
					deferred2.resolve();
				},
				error: deferred2.reject,
				server: 'http://jbartwix1.appspot.com/'
			});
			return deferred2.promise();
		}

		function loadOldStats() {
			var deferred2 = $.Deferred();

			jBart.db.get({
				id: roomid,
				contentType: 'cobrowse_visitor_stats',
				success: function(node) {
					oldStats = node;
					deferred2.resolve();
				},
				error: deferred2.reject,
				server: 'http://jbartwix1.appspot.com/'
			});
			return deferred2.promise();
		}

		function loadOldRoom() {
			var deferred2 = $.Deferred();

			jBart.db.get({
				id: roomid,
				contentType: 'cobrowse_room',
				success: function(node) {
					oldRoomXml = node;
					deferred2.resolve();
				},
				error: deferred2.reject,
				server: 'http://jbartwix1.appspot.com/'
			});
			return deferred2.promise();
		}

		function fixContents() {
			newRoomXml = oldRoomXml.cloneNode(true);
			var modifiedDate = oldRoomXml.getAttribute('_lastModified'); // 06/01/2014 10:01
			var arr = modifiedDate.split(' ')[0].split('/'),timeArr = modifiedDate.split(' ')[1].split(':');
			newRoomXml.setAttribute('modifiedDate',new Date(arr[2],parseInt(arr[1])-1,arr[0],timeArr[0],timeArr[1]).getTime());  
			aa_xml_appendChild(newRoomXml,aa_parsexml('<style><general mainImageHeight="200" marginForImageInItem="40" paragraphCounter="true" mobileViewInDesktop="true" rtl="true"/></style>'));

			var paragraphs = aa_xpath(newRoomXml,'items/item/paragraph');
			for(var i=0;i<paragraphs.length;i++) {
				if (paragraphs[i].getAttribute('text') && paragraphs[i].getAttribute('text').indexOf('<div') == 0 && paragraphs[i].getAttribute('type') == 'text') {
					paragraphs[i].setAttribute('type','rich text');				
					paragraphs[i].setAttribute('html',paragraphs[i].getAttribute('text'));
					paragraphs[i].setAttribute('text','');
				} else
				if (paragraphs[i].getAttribute('html') && paragraphs[i].getAttribute('type') != 'rich text')
					paragraphs[i].setAttribute('type','html');
			}
			newStats = aa_parsexml('<stats/>');

			$(newStats).attr('id',newRoomID).attr('visitorTimeMin',oldStats.getAttribute('visitorTimeMin') || 0);
			$(newStats).attr('visitorJoinCount',oldStats.getAttribute('visitorJoinCount') || 0);
			$(newStats).attr('createdDate',oldStats.getAttribute('createdDate') || '');

			newVisitorFile = convertLogFile(oldVisitorFile);
			newAgentFile = '';
		}

		function convertLogFile(contents) {
			var lines = contents.split('\n'),newlines=[];
			for(var i=0;i<lines.length;i++) {
				var command = lines[i].split('|')[1];
				if (command == 'join' || command == 'windowsize') newlines.push(lines[i]);
				if (command == 'itemShown') {
					var itemid = lines[i].split('"itemid":"')[1].split('"')[0];
					var line = lines[i].split('itemShown|')[0] + 'itemShown|{"itemid":"'+itemid+'"}';
					newlines.push(line);
				}

			}
			return newlines.join('\n');
		}

		function addRoomUrl() {
			var deferred2 = $.Deferred();
			var url = 'http://jb-letmesee.appspot.com/LetMeSee/'+ project + '.html?roomid='+newRoomXml.getAttribute('id');
			newRoomXml.setAttribute('url',url);
			newRoomXml.setAttribute('tinyUrl',url);

			$.when(aa_lmcTinyUrl(url)).then(function(tinyurl) {
				log('getting tinyUrl for ' + newRoomXml.getAttribute('customerName'));
				newRoomXml.setAttribute('tinyUrl',tinyurl);
				deferred2.resolve();
			},deferred2.resolve);

			return deferred2.promise();
		}
	}

	function log(msg) {
		$('.convert_log').val($('.convert_log').val() + '\n' + msg);
	}
}

function aa_lmcConvertToSmallerRoom(context) {
	var deferred = $.Deferred();
	var rooms = aa_var_first(context,'Rooms');
	$.when(aa_lmcApi_loadRoom({
		project: '1ta3tcg7ej',
		room: 'dmoq8d'
	})).then(function(result) {
		rooms.setAttribute('big_size',parseInt(ajaxart.xml2text(result).length / 1000) +'K');
		aa_refresh_field(['Room']);
		setTimeout(function() {
			doConvert(result);
		},1);		
	});

	function doConvert(bigRoom) {
		var smallRoom = aa_parsexml(bigRoom);
		var paragraphs = aa_xpath(smallRoom,'items/item/paragraph');
		for(var i=0;i<paragraphs.length;i++) {
			var par = paragraphs[i];
			var html = par.getAttribute('html');
			par.removeAttribute('html');
			if (html) {
				aa_consoleLog('html length='+html.length);
				html = html.replace(/style="[^"]*"/g,'');
				aa_consoleLog('html length after removing styles='+html.length);
				html = html.replace(/class="[^"]*"/g,'');
				aa_consoleLog('html length after removing classes='+html.length);
				html = html.replace(/<span\s*>\s*<\/span>/g,'');
				aa_consoleLog('html length after removing spans='+html.length);
				aa_consoleLog('html length after fix ='+html.length);
				if (html.length>1000) aa_consoleLog('html='+html);
				var htmlElem = par.ownerDocument.createElement('_html');
				aa_write_cdata(htmlElem,html);
				par.appendChild(htmlElem);
			}
		}
		rooms.setAttribute('small_size',parseInt(ajaxart.xml2text(smallRoom).length / 1000) +'K');
		aa_refresh_field(['Room']);
		deferred.resolve();
	}
	return deferred.promise();
}
*/