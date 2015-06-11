ajaxart.load_plugin("bart", "plugins/jbart/app_features.xtml");

aa_gcs("appfeature", {
	Responsive: function(profile, data, context) { 
		var cssClasses = '';
		var ctx2 = context;

		return [{
			Load: function(data1,ctx) {
				ctx2 = aa_merge_ctx(context,ctx);
				calculateCssClasses();

				if (ajaxart.jbart_studio) {
					aa_bind(context.vars._AppContext[0],'showPageInStudio',function(args) {
						studioRefresh(args);
					});
				} else 
					$(aa_body()).addClass(cssClasses);
			}
		}];

		function calculateCssClasses() {
			cssClasses = '';
			if (ajaxart.jbart_studio) {
				var width = aa_toint( ajaxart.runNativeHelper(data,profile,'WidthForStudio',ctx2) );
			} else
				var width = $(aa_body()).width();

			if (width >= 800 && width <= 1024) cssClasses += ' width_1024';
			if (width <= 600) cssClasses += ' width_mobile_phone';

			if (ajaxart.isIE78) cssClasses += ' nocss3';
		}

		function studioRefresh(args) {
			calculateCssClasses();

			var classes = (args.Wrapper.classNames || '').split(' ');
			for(var i=0;i<classes.length;i++)
				if (classes[i].indexOf('width_') == 0)
					$(args.Wrapper).removeClass(cssClasses);		

			$(args.Wrapper).addClass(cssClasses);
		}
	},
	ConfirmationOnCloseBrowserPage: function(profile, data, context) { 
		if (ajaxart.jbart_studio) {
			return;
		}
		window.onbeforeunload = function() {
			if (window.jbIgnoreWindowUnload) return;
			if (aa_bool([],profile,'ConditionForConfirmation',context)) 
				return aa_text(data,profile,'ConfirmationText',context);
		}
	},
	CssForHtmlHead: function(profile, data, context) { 
		var headCss = aa_text(data,profile,'Css',context);
		if (!headCss) return;

		jBart.headStyles = jBart.headStyles || {};
		if (jBart.headStyles[headCss]) return;
		jBart.headStyles[headCss] = true;

		var styleElem = $("<style></style>")[0];
		styleElem.innerHTML = headCss;
		var head = document.getElementsByTagName("head")[0];
		head.appendChild(styleElem);		
	},
	RunAction: function(profile, data, context) { 
		return [{
			Load: function(data1,ctx) {
				ajaxart.run(data1,profile,'Action',aa_ctx(context,ctx));
			}
		}];
	}
});

