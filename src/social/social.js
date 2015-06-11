ajaxart.load_plugin("","plugins/social/social.xtml");

aa_gcs("twitter", {
	TwitterShare: function (profile,data,context)
	{
		context.vars._Field[0].Control = function(field_data,ctx) {
			var out = jQuery('<a href="https://twitter.com/share">Tweet</a>').addClass('twitter-share-button');

			var text = aa_text(field_data,profile,'Text',context);
			var url = aa_text(field_data,profile,'Url',context);
			out.attr('data-url',url).attr('data-text',text);

			if (!aa_bool(field_data,profile,'ShowCount',context)) out.attr('data-count','none');
			if (aa_bool(field_data,profile,'Large',context)) out.attr('data-size','large');

			aa_addOnAttach(out[0],function() {
				jQuery.getScript('//platform.twitter.com/widgets.js');
			});
			//aa_load_js_css('//platform.twitter.com/widgets.js','js');

			return out.get();
		};
	}
});


aa_gcs("facebook", {
	LikeButton: function (profile,data,context)
	{
		var appid = aa_text(data,profile,'AppID',context);

		context.vars._Field[0].Control = function(field_data,ctx) {
			var url = 'https://www.facebook.com/plugins/like.php?href=' + encodeURIComponent(aa_text(data,profile,'Url',context));
			url += '&layout=' + aa_text(data,profile,'LayoutStyle',context);
			var out = jQuery('<iframe scrolling="no" frameborder="0" />').attr('src',url).attr('style','border:none;height:30px').css('width',aa_text(data,profile,'Width',context));

			return out.get();
		}

		context.vars._Field[0].Control1 = function(field_data,ctx) {
			var out = jQuery('<div data-send="true" data-show-faces="false" data-action="like" />').addClass('fb-like');
			out.attr('data-width',aa_text(data,profile,'Width',context));
			out.attr('data-href',aa_text(data,profile,'Url',context));
			out.attr('data-layout',aa_text(data,profile,'LayoutStyle',context));
			out.attr('data-send',aa_bool(data,profile,'SendButton',context) ? 'true' : 'false');

			aa_addOnAttach(out[0],function() {
				aa_init_facebook(appid);
			});

			return out.get();
		}
	}
});


function aa_init_facebook(appid)
{
	if (window.FB) {
		FB.XFBML.parse();
		return;
	}
	aa_load_js_css('//connect.facebook.net/en_US/all.js#xfbml=1&appId='+appid,'js');
}