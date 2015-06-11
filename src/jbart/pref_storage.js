ajaxart.load_plugin("prefstorage","plugins/jbart/pref_storage.xtml");

aa_gcs("prefstorage", {
	UrlFragmentKey: function(profile,data,context) {
		var separator = aa_text(data,profile,'Separator',context);
		var keyPrefix = aa_text(data,profile,'KeyPrefix',context);
		var regSeparator = separator == '?' ? '\\?' : separator;
		return [{
			get: function(key) {
				var keyToUse = keyPrefix + key;
				return aa_urlHashValue(keyToUse);
			},
			set: function(key,value) {
				var keyToUse = keyPrefix + key;
				aa_setUrlHashValue(keyToUse,value);
			}
		}];
	},
	LocalStorage: function(profile,data,context) {
		var keyPrefix = aa_text(data,profile,'KeyPrefix',context);
		var browserSupport = 'localStorage' in window && window['localStorage'] !== null;
		return [{
			get: function(key) {
				if (!browserSupport) { ajaxart.log("cannot read '" + key + "' from local storage, no browser support","error"); return ""; }
				return localStorage.getItem(keyPrefix + key);
			},
			set: function(key,value) {
				if (!browserSupport) { ajaxart.log("cannot write '" + key + "'='" + value + "' to local storage, no browser support","error"); return; }
				if (value)
					localStorage.setItem(keyPrefix + key, value);
				else
					localStorage.removeItem(keyPrefix + key);
			}
		}];
	},
	SessionStorage: function(profile,data,context) {
		var keyPrefix = aa_text(data,profile,'KeyPrefix',context);
		var browserSupport = 'sessionStorage' in window && window['sessionStorage'] !== null;
		return [{
			get: function(key) {
				if (!browserSupport) { ajaxart.log("cannot read '" + key + "' from local storage, no browser support","error"); return ""; }
				return sessionStorage.getItem(keyPrefix + key);
			},
			set: function(key,value) {
				if (!browserSupport) { ajaxart.log("cannot write '" + key + "'='" + value + "' to local storage, no browser support","error"); return; }
				if (value)
					sessionStorage.setItem(keyPrefix + key, value);
				else
					sessionStorage.removeItem(keyPrefix + key);
			}
		}];
	},
	Cookie: function(profile,data,context) {
		var keyPrefix = aa_text(data,profile,'KeyPrefix',context);
		return [{
			get: function(key) {
				return aa_valueFromCookie(keyPrefix + key);
			},
			set: function(key,value) {
				aa_writeCookie(keyPrefix + key,value);				
			}
		}];
	},
	GetPreferenceValue: function(profile,data,context) {
		var storage = aa_first(data,profile,'Storage',context);
		var key = aa_text(data,profile,'Key',context);
		return [ "" + storage.get(key) ];
	},
	SetPreferenceValue: function(profile,data,context) {
		var storage = aa_first(data,profile,'Storage',context);
		var key = aa_text(data,profile,'Key',context);
		var value = aa_text(data,profile,'Value',context);
		storage.set(key,value);
		return [];
	}
});