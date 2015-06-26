GLOBAL.fs = require('fs');
GLOBAL.http = require('http');
GLOBAL.https = require('https');
GLOBAL.child = require('child_process');
GLOBAL.url = require('url');
GLOBAL.zlib = require('zlib');
GLOBAL.pathNS = require('path');
require('./nodejs_http.js');
GLOBAL.ns_url = require('url');
GLOBAL.ns_querystring = require('querystring');
GLOBAL.$ = GLOBAL.jQuery = require('jquery-deferred');
GLOBAL.op_get_handlers = {};
GLOBAL.op_post_handlers = {};
GLOBAL.file_type_handlers = {};

var port = process.env.npm_package_config_port;
var widgets_base_dir = process.env.npm_package_config_widgets_base_dir;
var client;

_os = /^win/.test(process.platform) ? 'windows' : '';
http_dir = '';
tmp_dir = 'c:\\temp';
log_level = 3;
log_file = 'c:\\temp\\log\\log.dat';

// Http server
function serve(req, res) {
  var user_machine = 'localhost';
   try {
    user_machine = '' + req.connection ? req.connection.remoteAddress : '';
//    log(user_machine,'new request ' + req.url,2); 
    var url_parts = req.url.split('?');
    var path = url_parts[0].substring(1), query= url_parts[1];
    var file_type = path.split('.').pop();
    var op = getURLParam(req,'op');

    res.setHeader("Access-Control-Allow-Origin", "*:*");
    if (req.url.indexOf('/LetMeSee/') == 0)
      return LetMeSeeProxy(req,res);

    if (op && op_get_handlers[op] && req.method == 'GET') {
      return op_get_handlers[op](req,res,path,user_machine);
    } else if (op && op_post_handlers[op] && req.method == 'POST') {
      var body = '';
      req.on('data', function (data) {
        body += '' + data;
      });
      req.on('end', function () {
        log(user_machine,'post: ' + body,2); 
        return op_post_handlers[op](req, res,body,path,user_machine);
      });
    } else if (file_type && file_type_handlers[file_type]) {
//      log(user_machine,file_type,2); 
      return file_type_handlers[file_type](req,res,path,user_machine);
    }
    else
      res.end('<xml type="error" desc="no handler for the request" request="' + req.url + '"/>');
   } catch(e) {
      var st = e.stack || ''
      log(user_machine,'main loop exception: ' + st,1,'');
    }
}
http.createServer(serve).listen(port); 

console.log('Running jbart studio server on port ' + port + '...');
console.log('Visit http://localhost' + ((port == 80) ? '' : ':' + port) + '/studio/studio.html to open studio');

extend(op_get_handlers, {   
    'ls': function(req,res,path,user_machine) {
      var files = {};
      var dir = getURLParam(req,'dir');
      if (!dir) { res.end('<xml type="failure" desc="no dir argument" />'); return; }
      try {
        files = fs.readdirSync(dir);
        var result = [];
        for(var i in files) result.push(files[i]);
        res.end('<xml type="success">' + result.join(',') + '</xml>');
      } catch(e) {
        res.end('<xml type="failure" desc="' + e + '"/>');
      }
    },
    'mkdir': function(req,res,path,user_machine) {
      var path = getURLParam(req,'path');
      if (!path) { res.end('<xml type="failure" desc="no path argument" />'); return; }
      try {
        fs.mkdirSync(path);
        res.end('<xml type="success"/>');
      } catch(e) {
        res.end('<xml type="failure" desc="' + e + '"/>');return;
      }
    },
    'runR': function(req,res,path,user_machine) {
      var dir = getURLParam(req,'dir');
      if (!dir) { res.end('<xml type="failure" desc="no dir argument" />'); return; }
      if (_os == 'windows' && !dir.match(/\\$/)) dir = dir + '\\';
      var cmd = 'RunR.bat "' + dir +'"';
      log(user_machine,'activating script ' + cmd ,1);
      var op = child.exec(cmd);
      var out = '',err= '';
      op.stdout.on('data', function (data) { out += data; });
      op.stderr.on('data', function (data) { err += data; });
      op.on('exit', function (code) {
        if (code) {
           res.end('<xml type="error" desc="Can not run command "' + cmd + '" errcode="' + code + '"><file name="stdout"><![CDATA[' + out + ']]></file>'
           + '<file name="stderr"><![CDATA[' + err + ']]></file></xml>');
        } else {
           try {
            rout = fs.readFileSync(dir + 'temp\\script.Rout');
            if (typeof rout == 'string')
              rout = rout.split("Type 'q()' to quit R.").pop();
            res.end('<xml type="success"><file name="script.Rout"><![CDATA[' + rout + ']]></file><file name="stdout"><![CDATA[' + out + ']]></file><file name="stderr"><![CDATA[' + err + ']]></file></xml>');
          } catch(e) {
            res.end('<xml type="failure"><file name="stderr"><![CDATA[' + e + ']]></file></xml>');
          }
        }
      });
    },
    'removeTempFiles': function(req,res,path,user_machine) {
      var dir = getURLParam(req,'dir');
      if (!dir) { res.end('<xml type="failure" desc="no dir argument" />'); return; }
      var files = getURLParam(req,'files');
      if (!files) { res.end('<xml type="failure" desc="no files argument" />'); return; }
      if (_os == 'windows' && !dir.match(/\\$/)) dir = dir + '\\';
      dir = dir + 'temp\\';
      try {
        var file_names = files.split(',');
        if (files == '*') {
          file_names = [];
          var files_in_dir = fs.readdirSync(dir);
          for(var i in files_in_dir) file_names.push(files_in_dir[i]);
        }
        for(var i=0;i<file_names.length;i++) 
          fs.unlinkSync(dir+file_names[i]);
        res.end('<xml type="success"/>');
      } catch(e) {
        res.end('<xml type="failure" desc="' + e + '"/>');
      }
    },
    'filesContent': function(req,res,path,user_machine) {
      var dir = getURLParam(req,'dir');
      if (!dir) { res.end('<xml type="failure" desc="no dir argument" />'); return; }
      var files = getURLParam(req,'files');
      if (!files) { res.end('<xml type="failure" desc="no files argument" />'); return; }
      if (_os == 'windows' && !dir.match(/\\$/)) dir = dir + '\\';
      try {
        var file_names = files.split(',');
        var result = '<xml type="success">';
        var stat = {};
        for(var i=0;i<file_names.length;i++) {
          try {
            stat = fs.statSync(dir + file_names[i]);
          } catch (e) {}
          if (!stat.size) {
            result += '<file error="file not exists" name="' + file_names[i] + '"/>';
          } else if (stat.size > 4000000) {
            result += '<file name="' + file_names[i] + '" size="' + stat.size +'"/>';
          } else {
            var content;
            try {
              content = fs.readFileSync(dir + file_names[i]);
            } catch(e) {
              content = '' + e;
            }
            if (!file_names[i].match('.xml'))
              content = '<![CDATA[' + content + ']]>';
            else
              content = content.toString().replace(/<\?xml[^?]*\?>/,''); // remove xml header
            result += '<file name="' + file_names[i] + '" size="' + stat.size +'">' + content + '</file>';
          }
        }
        result += '</xml>';
        res.end(result);
      } catch(e) {
        res.end(result + '##<xml type="failure" desc="' + e + '"/>');return;
      }
    },
    'httpCall': function(req,res,path,user_machine) {
        try {
          var urlObj = ns_url.parse(req.url,true);
          var urlParams = ns_querystring.parse(urlObj.search);
          var method = urlParams.method || 'GET';
          var post_data = urlParams.post_data ||'';
          var url = urlParams.url || '';
          var extendedResult = urlParams.extendedResult == 'true';

          var options = {
            url: url,
            method: method,
            headers: req.headers // heuristic: copy browser headers
          };
          options.headers.host = urlObj.host;

          if (post_data) options.data = post_data;        

          for(var param in urlParams) {
            if (param.indexOf('header_') == 0) {
              var headerName = param.split('header_')[1];
              options.headers[headerName] = urlParams[param];
            } else if (param.indexOf('jb_') == 0) {
              var op = param.split('jb_')[1];
              options[op] = urlParams[param];
            }
          }
          options.no_decode = true; // proxy should not decode result

          var promise = aa_httpCall(options,extendedResult);
          $.when(promise).then(function(result) {
            var result_headers = getURLParam(req,'result_headers_to_pass');
            if (!extendedResult && result_headers) {
              var r_headers = result_headers.split(',');
              for(var head in result.responseHeaders)
                for(var i=0;i<r_headers.length;i++)
                   if (head.toLowerCase() == r_headers[i].toLowerCase())
                      res.setHeader(head,result.responseHeaders[head]);
            }
            res.end(result.content || result.toString());
          },function(result) {
            res.end(result.content || result.toString());
          });
        } catch(e) {
          res.end(e.stack);
        }
    }
});

extend(op_post_handlers, {   
    'SaveFile': function(req, res,body,path,user_machine) {
        var clientReq;
        log(user_machine,'SaveFile',1); 
        try {
          clientReq = JSON.parse(body);
        } catch(e) {}
        if (!clientReq)
          return res.end(error(0,body,'Can not parse json request',user_machine));
        var consolelog = '';
        var path = clientReq.Path || '';
        if (path.indexOf('/widgets/') == 0)
          path = path.replace('/widgets/',widgets_base_dir);

        var normalized_path = path; // nodejs can not use cygwin path (same on unix)
        if (getURLParam(req,'mkdir') == 'true') {
          var dir = pathNS.dirname(normalized_path);
          if (!fs.existsSync(dir))
            fs.mkdirSync(dir);          
        }
        fs.writeFile(normalized_path, clientReq.Contents || '' , function (err) {
          if (err) 
            res.end(error(0,consolelog,'Can not write to file ' + clientReq.Path + '. error: ' + err,user_machine));
          else
            res.end('<xml type="success"/>');
        });
    }
});

// static file handlers
supported_ext =  ['js','gif','png','jpg','html','xml','css','xtml','txt','bmp','woff','otf'];
for(i=0;i<supported_ext.length;i++)
  file_type_handlers[supported_ext[i]] = function(req, res,path) { serveFile(req,res,path); };

log('',file_type_handlers.js + '2',2); 

extend(op_get_handlers, {   
    'download': function(req,res,path,user_machine) {
      res.writeHead(200, {'Content-Type': 'application/csv', 'Content-disposition': 'attachment; filename=' + path });
      var content = getURLParam(req,'data');
      log(user_machine,'download. file content: ' + content,2); 
      res.end(content);
    }
});

function serveFile(req,res,path) {
  var full_path = http_dir + path;
  if (path.match(/^studio\/plugins\//))
    full_path = path.replace(/^studio\/plugins\//,'src/');
  else if (path.match(/^jbart\/lib\//))
    full_path = path.replace(/^jbart\/lib\//,'studio/lib/');
  else if (path.match(/^jbart\/images\//))
    full_path = path.replace(/^jbart\/images\//,'studio/images/');
  else if (path.match(/^jbart\//))
    full_path = path.replace(/^jbart\//,'');
  else if (path.match(/^widgets/))
    full_path = path.replace(/^widgets\//,widgets_base_dir);
  else if (path.match(/^dropbox\//))
    full_path = path.replace(/^dropbox\//,'c:\\dropbox\\public/');
  var extension = path.split('.').pop();

  fs.readFile(_path(full_path), function (err, content) {
    if (err) {
      if (err.errno === 34)
        res.statusCode = 404;
      else
        res.statusCode = 500;
      return res.end(error(0,'','Can not read file ' + full_path + ' ' + err,''));
    } else {
      fs.stat(_path(full_path), function (err, stat) {
        if (err) {
          res.statusCode = 500;
          return res.end(error(0,'','file status code 500 ' + full_path + ' ' + err,''));
        } else {
          var etag = stat.size + '-' + Date.parse(stat.mtime);
          res.setHeader('Last-Modified', stat.mtime);

          if (extension == 'css') res.setHeader('Content-Type', 'text/css');
          if (extension == 'xml') res.setHeader('Content-Type', 'application/xml');
          if (extension == 'js') res.setHeader('Content-Type', 'application/javascript');
          if (extension == 'woff') res.setHeader('Content-Type', 'application/x-font-woff');

          if (req.headers['if-none-match'] === etag) {
            res.statusCode = 304;
            res.end();
          } else {
            res.setHeader('Content-Length', content.length);
            res.setHeader('ETag', etag);
            res.statusCode = 200;
            res.end(content);
          }
        }
      })
    }
  });     
}

// nodejs_utils

function _path(path) { return path.replace(/[\\\/]/g,'/'); }

function getURLParam(req,name) {
  try {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(req.url)||[,""])[1].replace(/\+/g, '%20'))||null;
  } catch(e) {}
}

function removeDir(user_machine,tmp_dir) {
    tmp_dir = tmp_dir.replace(/\//g,'\\'); // windows slashes
    log(user_machine,'Remving directory ' + tmp_dir,1); 
    if (tmp_dir.match(/[Tt]e?mp.*[\\]/)) {
          var remove = child.exec('RMDIR /S /Q ' + tmp_dir);
          var consolelog = '';
          remove.stdout.on('data', function (data) { consolelog += data; });
          remove.stderr.on('data', function (data) { consolelog += data; });
          remove.on('exit', function (code) {
            if (code)
              error(code,'','Can not remove directory ' + consolelog + ' ' + tmp_dir,user_machine);
          });
    } else {
      log(user_machine,'Temp dir" "' + tmp_dir + '"" does not match temp dir pattern ',1); 
    }
}

function map_reduce(array, params) {
  var remaining = array.length;
  var result = [];

  if(array.length==0) params.reduce(result);

  for(var i=0;i<array.length;++i) {
    params.map(array[i], {
      i: i,
      end: function(entry) {
        result[this.i] = entry;
        remaining--;
        if(remaining==0) params.reduce(result);
      }
    });
  }
}

function seq_run(array) {
  function runAtIndex(index,data) {
  try {
  array[index](data, { 
    end: function(ret_val) {
      if (index+1 < array.length)
        runAtIndex(index+1,ret_val);
    }
  });
  } catch(e) { console.log('seq_run: error in function ' + index,e) }
  }
  runAtIndex(0,'');
}

function error(code,consolelog,message,user_machine) {
 log(user_machine,message + (consolelog ? ' console: ' : '') + consolelog ,0,'Error');
 return '<xml type="error" desc="' + message + ' . code ' + code + '"><file name="console"><![CDATA[' + consolelog + ']]></file></xml>';
}

function log(user_machine,msg,level,type) {
  if (level && level > log_level) return;

  function pad(num) { return ((num < 10) ? '0' : '') + num }
  var date = new Date();
  var time =  pad(date.getDate()) + '/' + pad(date.getMonth()+1) + '/' + date.getFullYear() + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());

  var msg2 = (msg.length > 200) ? msg.substring(0,200) + '...' : msg;
  msg2 = msg2.replace(/\r\n/g,' ').replace(/\n/g,' ');
  var msg3 = (type || 'Info') + ": " + user_machine + " " + time + " " + msg2 + '\n';
  if ( _os != 'windows') { // linux
    fs.open(log_file, 'a', 666, function(e, id) {
      fs.write( id, msg3, null, 'utf8', function() {
      fs.close(id, function(){});
      });
    });
  } else {
     fs.appendFile(log_file, msg3,function(code) {});
  }
  //console.log(msg3);
}

function extend(object,ext) {
  for(i in ext)
    if (ext.hasOwnProperty(i))
      object[i] = ext[i];
}

extend(GLOBAL, { error: error, getURLParam: getURLParam, _path: _path, log: log,extend: extend, removeDir: removeDir, seq_run: seq_run, map_reduce: map_reduce });

extend(op_get_handlers, {
  'jbartProjects': function(req, res, path, user_machine) {
    var dir = getURLParam(req, 'dir');
    if (!dir) {
      res.end('<xml type="failure" desc="no dir argument" />');
      return;
    }
    try {
      var files = [];

      var dirs = dir.split(',');
      for(var i=0;i<dirs.length;i++) {
        dirs[i] = dirs[i].replace('/widgets/',widgets_base_dir);
        getFilesRecursively(dirs[i],'',files);
      }

      files = files.map(function(v) {
        return {
          name: v,
          time: fs.statSync(v).mtime.getTime()
        };
      });
      files.sort(function(a, b) { return b.time - a.time; });
      files = files.map(function(v) { return v.name; });

      var result = '<nodes>';
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (!file.match(/[.]xml$/)) continue;

        var fileContent = fs.readFileSync(file).toString();
        var firstLine = fileContent.substring(0, fileContent.indexOf('>'));
        result += firstLine + '/>';
      }
      result += '</nodes>';
      res.end(result);
    } catch (e) {
      res.end('<xml type="failure" desc="' + e + '"/>');
    }

    function getFilesRecursively(basedir,dir,result) {     
	 try {	
      var files = fs.readdirSync(basedir + '/' + dir);
      for(var i=0;i<files.length;i++) {
        var filename = files[i];        
        if (fs.statSync(basedir + '/' + dir + filename).isDirectory()) {
          getFilesRecursively(basedir,dir + filename+'/',result);
        } else {
          if (filename.match(/[.]xml$/))
            result.push(basedir + '/' + dir + filename);
        }
      }
      } catch(e) {}    }
  },
  'jbartProjectsWithTests': function(req, res, path, user_machine) {
    var dir = getURLParam(req, 'dir');
    if (!dir) {
      res.end('<xml type="failure" desc="no dir argument" />');
      return;
    }
    try {
      var files = [];
      getFilesRecursively(dir+'/',files);
      var result = '<nodes>';
      for (var i = 0; i < files.length; i++) {
        var file = files[i];

        var fileContent = fs.readFileSync(file).toString();
        if (fileContent.indexOf('<Test') > -1)
          result += fileContent;
      }
      result += '</nodes>';
      res.setHeader('Content-Type', 'application/xml');
      res.end(result);
    } catch (e) {
      res.end('<xml type="failure" desc="' + e + '"/>');
    }

    function getFilesRecursively(dir,result) {     
      var files = fs.readdirSync(dir);
      for(var i=0;i<files.length;i++) {
        var filename = files[i];
        if (fs.statSync(dir + filename).isDirectory()) {
          getFilesRecursively(dir + filename+'/',result);
        } else {
          if (filename.match(/[.]xml$/))
            result.push(dir + filename);
        }
      }
    }

  }
});

extend(op_post_handlers, {
    'saveAndCompressJS': function(req, res,body,path,user_machine) {path = path.replace('^/widgets/','../' + widgets_base_dir);
      var path = getURLParam(req,'filename');
      var minifiedPath = getURLParam(req,'minfilename') || path.replace(/[.]js$/,'.min.js');
      path = path.replace(/^\/widgets\//,widgets_base_dir);
      minifiedPath = minifiedPath.replace(/^\/widgets\//,widgets_base_dir);

      if (!path) {
        res.end('<xml type="error" reason="empty file name" />');
        return;
      }
      var dir = pathNS.dirname(path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);

      fs.writeFile(path, body || '' , function (err) {
        if (!err) {
          var grunt = require('grunt');
          grunt.task.init = function() {};// hack to avoid loading a Gruntfile, http://stackoverflow.com/questions/16564064/running-grunt-task-with-api-without-command-line

          grunt.initConfig({
            uglify: {
              widget: {
                src: path,
                dest: minifiedPath
              }
            }
          });

          // Load tasks from npm
          grunt.loadNpmTasks('grunt-contrib-uglify');

          // Finally run the tasks, with options and a callback when we're done
          grunt.tasks(['uglify'], {}, function() {
            res.end('<xml type="success">' + path + '</xml>');
          });
        } else {
          res.end(error(0,consolelog,'Can not write to file ' +path + '. error: ' + err,user_machine));          
        }
      });
    },
});

if (client) {
  var js_file = '../../' + client + '/nodejs/' + client + '.js';
  console.log(js_file)
  require(js_file);
}

process.on('uncaughtException', function(err) {
 console.log(err);
});


function LetMeSeeProxy(req,res) {
  var body = '';
  if (req.method == 'POST') {
    req.on('data', function (data) {
      body += '' + data;
    });
    req.on('end', function () {
      activate(body);  
    });
  }
  if (req.method == 'GET')
    activate();


  function activate(post_data) {
    try {
      var urlObj = ns_url.parse(req.url,true);
      var options = {
          url: 'https://jb-letmesee.appspot.com' + urlObj.path,
          method: req.method,
          data: post_data
      };
      
      var promise = aa_httpCall(options,false);
      $.when(promise).then(function(result) {
        if (result.responseHeaders && result.responseHeaders['x-goog-generation'])
          res.setHeader('x-goog-generation',result.responseHeaders['x-goog-generation']);

        res.end(result.content || result.toString());
      },function(result) {
        res.end(result.content || result.toString());
      });
    } catch(e) {
      res.end(e.stack);
    }
  }
}