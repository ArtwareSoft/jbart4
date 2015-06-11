function aa_moment(arg) {
	if (!window.moment)
		console.error('moment.js lib is not loaded: http://momentjs.com/');
	if (arg)
		return moment.apply(moment,arguments);
	else
		return moment;
}