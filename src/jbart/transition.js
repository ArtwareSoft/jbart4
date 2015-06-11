ajaxart.load_plugin("", "plugins/itemlist/transition.xtml");

function aa_replace_transition(settings,context)
{	/* settings must have: transition, elOriginal, elNew 
	   optional: onTransitionEnd, removeOriginal, onBeforeTransitionBegin
	*/
	aa_defaults(settings, {
		$elOriginal: 	$(settings.elOriginal),
		$elNew: 		$(settings.elNew),
		css: 			settings.transition.Css,
		onTransitionEnd:function() {},
		removeOriginal: function(original) { aa_remove(settings.elOriginal); },
		onBeforeTransitionBegin: function() {},
		context: context,
		params: settings.transition.params
	});
	aa_apply_style_js(settings,settings.transition,context,'animate');
}

function aa_fade_transition(transition, duration) {
	  function onTransitionEnd() {
	    transition.$elOriginal.css( { opacity: 1 } );
	    transition.$elOriginal.removeClass('aa_original');
	    transition.removeOriginal(transition.elOriginal);
	    transition.$elNew.removeClass('aa_new');
	    transition.$elOriginal.parent().removeClass(cssClass);
	    transition.onTransitionEnd();
	  }
	  transition.$elOriginal.addClass('aa_original');
	  transition.$elNew.addClass('aa_new');
	  transition.$elNew.css("height",transition.$elOriginal.height());		// To keep original size before attaching
	  transition.$elNew.css("width",transition.$elOriginal.width());
	  transition.$elOriginal.css("height",transition.$elOriginal.height());	// To keep the size after detaching it
	  transition.$elOriginal.css("width",transition.$elOriginal.width());
	  transition.elOriginal.parentNode.appendChild(transition.elNew);
	  aa_element_attached(transition.elNew);
	  var cssClass = aa_attach_global_css(transition.css);
	  transition.$elOriginal.parent().addClass(cssClass);
	  transition.$elNew.css({opacity:0});
	  transition.onBeforeTransitionBegin();
	  transition.$elOriginal.animate({ opacity:0 },duration, "swing");
	  transition.$elNew.animate({ opacity:1 },duration, "swing", onTransitionEnd);
}


