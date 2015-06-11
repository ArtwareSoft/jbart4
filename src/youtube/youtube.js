ajaxart.load_plugin("", "plugins/youtube/youtube.xtml");

aa_gcs("youtube",{
	YoutubeVideo: function(profile,data,context) {
		var field = aa_create_base_field(data, profile, context);
		var style = aa_first(data, profile, 'Style', context);

		field.Control = function(field_data, ctx) {
			ctx = aa_merge_ctx(context,ctx);
			var key = aa_text(field_data,profile,'YoutubeKey',ctx);
			if (key.indexOf('http') == 0)
				key = aa_extractYoutubeKeyFromUrl(key);

			var youtubeVideo = { 
				key: key
			};
			return [aa_renderStyleObject2(style,youtubeVideo,field_data,field,ctx,{})];
		};
		return [field];
	},
	ExtractYoutubeKey: function (profile,data,context)
	{
		var url = aa_text(data,profile,'Url',context);

		var key = '';
		if (url.indexOf('youtube.com/watch') > -1 || url.indexOf('youtube.com/user/') > -1) {
			var vars = [], hash;
			var hashes = url.slice(url.indexOf('?') + 1).split('&');
			for(var i = 0; i < hashes.length; i++)
			{
			    hash = hashes[i].split('=');
			    vars.push(hash[0]);
			    vars[hash[0]] = hash[1];
			}
			key = vars.v;
		}
		else if (url.indexOf('youtube.com/embed/') > -1)
	    	key = url.match('youtube.com/embed/([a-zA-Z0-9_\\-]*)')[1] || '';
		else if (url.indexOf('youtube.com/v/') > -1)
			key = url.match('youtube.com/v/([a-zA-Z0-9_\\-]*)')[1] || '';
		else if (url.indexOf('youtube.googleapis.com/v/') > -1)
			key = url.match('youtube.googleapis.com/v/([a-zA-Z0-9_\\-]*)')[1] || '';
		
		if (key) {
			return [key];
		}
	    return [];
	}	
});

function aa_youtube_video(youtubeVideo,settings) {
	settings = aa_defaults(settings,{});
	var out;

	if (!settings.useAPI)
		out = $('<iframe frameborder="0" allowfullscreen="true" />').attr('src','//www.youtube.com/embed/'+youtubeVideo.key);
	else {
		// https://developers.google.com/youtube/iframe_api_reference
		var id = 'video_'+ (++ajaxart.unique_number);
		out = $('<div />').attr("id",id);

		out[0].jbInit = function() {
			aa_addOnAttachMultiple(out[0], function() {
		        player = new YT.Player(id, {
		          videoId: youtubeVideo.key,
		          events: settings.events 
		        });
		    });
		}
		if (window.YT)
			out[0].jbInit();
		else {
			out.addClass("jbYoutube");
			window.onYouTubeIframeAPIReady = function() {
				var youtubeItems = $(".jbYoutube");
				for (var i=0; i<youtubeItems.length; i++) {
					youtubeItems[i].jbInit();
					$(youtubeItems[i]).removeClass("jbYoutube");
				}
			}
			aa_loadLib("youtubeapi", [] , ["//www.youtube.com/iframe_api"]);
		}
	}
	youtubeVideo.el.appendChild(out[0]);
}

function aa_extractYoutubeKeyFromUrl(url) {
	var key = '';
	if (url.indexOf('youtube.com/watch') > -1 || url.indexOf('youtube.com/user/') > -1) {
		var vars = [], hash;
		var hashes = url.slice(url.indexOf('?') + 1).split('&');
		for(var i = 0; i < hashes.length; i++) {
			hash = hashes[i].split('=');
			vars.push(hash[0]);
			vars[hash[0]] = hash[1];
		}
		key = vars.v;
	}
	else if (url.indexOf('youtube.com/embed/') > -1)
		key = url.match('youtube.com/embed/([a-zA-Z0-9_\\-]*)')[1] || '';
	else if (url.indexOf('youtube.com/v/') > -1)
		key = url.match('youtube.com/v/([a-zA-Z0-9_\\-]*)')[1] || '';
	else if (url.indexOf('youtube.googleapis.com/v/') > -1)
		key = url.match('youtube.googleapis.com/v/([a-zA-Z0-9_\\-]*)')[1] || '';
	
	return key;
}