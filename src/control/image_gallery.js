
aa_gcs("control", {
	ImageGallery: function(profile, data, context) {
		var field = aa_create_base_field(data, profile, context);
		field.Control = function(field_data, ctx) {
			var images = ajaxart.run(field_data, profile, 'Images', context);
			var ctx2 = aa_merge_ctx(context, ctx);
			return [aa_renderStyleObject(field.Style, {
				images: images
			}, ctx2, true)];
		};
		return [field];
	}
});

aa_gcs("imagegallery", {
	ImageGallery: function(profile, data, context) {
		aa_init_class_image();

		var field = aa_create_base_field(data, profile, context);
		field.Style = aa_first(data,profile,'Style',context);

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context, ctx);
			var images = ajaxart.run(field_data, profile, 'Images', ctx2);
			var imageObjects = [];
			for(var i=0;i<images.length;i++) {
				if (!images[i].image) continue;
				images[i].image.title = images[i].title;
				imageObjects.push(images[i].image);
			}

			var imageGallery = {
				images: imageObjects
			};
			return [aa_renderStyleObject2(field.Style,imageGallery,field_data,field,ctx2)];
		};
		return [field];
	}
});

aa_gcs("imagegallery_style", {
	SlideShow: function(profile, data, context) {
		var imageStyle = aa_first(data,profile,'ImageStyle',context);
		var buttonStyle = aa_first(data,profile,'Buttons',context);
		var transitionStyle = aa_first(data,profile,'Transition',context);
		var frameWidth = aa_int(data,profile,'FrameWidth',context);
		var frameHeight = aa_int(data,profile,'FrameHeight',context);
		var adjustSize = aa_first(data,profile,'AdjustImageSize',context);

		return [{
			render: function(imageGallery) {
				var out = $('<div />').width(frameWidth).height(frameHeight)[0];
				var field_data = imageGallery.field_data,field = imageGallery.field, context = imageGallery.context;

				var $poster = $('<div class="poster"/>').appendTo(out);

				for(var i=0;i<imageGallery.images.length;i++) {
					aa_extend(imageGallery.images[i],{
						width: frameWidth,
						height: frameHeight,
						adjustSize: adjustSize	
					});
				}

				if (imageGallery.images.length == 0) return out;

				var slideshow = {
					imageGallery: imageGallery,
					el: out,
					$el: $(out),
					$poster: $poster,
					frameWidth: frameWidth,
					frameHeight: frameHeight,
					index: 0,
					showNextImage: function(loop) {
						if (this.index == imageGallery.images.length-1) {
							if (loop) this.showImageByIndex(0);
							return;
						}
						this.showImageByIndex(this.index+1);
					},
					showPrevImage: function() {
						if (index == 0) return;
						this.showImageByIndex(this.index-1);
					},
					showImageByIndex: function(index,no_transition) {
						var prevIndex = this.index;
						this.index = index;

						if (no_transition || !transitionStyle) {
							showImage(imageGallery.images[index],$poster[0]);
							return;
						}
						var $incoming = $('<div/>').addClass('incoming');
						var $outgoing = $('<div/>').addClass('outgoing');
						
						showImage(imageGallery.images[index],$incoming[0]);
						showImage(imageGallery.images[prevIndex],$outgoing[0]);

						var transitionObject = {
							slideshow: this,
							$incoming: $incoming,
							$outgoing: $outgoing
						};
						aa_hide($poster[0]);
						aa_renderStyleObject2(transitionStyle,transitionObject,field_data,field,context,{ funcName: 'animate' });
					},
					endAnimation: function() {
						showImage(imageGallery.images[this.index],$poster[0]);
						this.$el.find('.incoming').remove();
						this.$el.find('.outgoing').remove();
						aa_show($poster[0]);
					}
				};
				aa_renderStyleObject2(buttonStyle,{ slideshow: slideshow },field_data,field,context,{ funcName: 'add' });
				slideshow.showImageByIndex(0,true);

				return out;

				function showImage(image,el) {
					aa_empty(el);
					el.appendChild( aa_renderStyleObject2(imageStyle,{image: image},field_data,field,context) );
				}
			}
		}];
	}
});

function aa_image_transition_slide(transition,settings) {
	var slideshow = transition.slideshow;
	var $incoming = transition.$incoming, $outgoing = transition.$outgoing;

	settings = aa_defaults(settings);
	$incoming.on('webkitTransitionEnd', onEnd);

	slideshow.$el.css('position','relative').css('overflow','hidden');

	$incoming.add($outgoing).css({
		position: 'absolute',
		top:0,
		left:0
	});
	$incoming.css('left',slideshow.frameWidth+'px');
	slideshow.$el.append($outgoing).append($incoming);
	$incoming.add($outgoing).css('-webkit-transition',settings.timing + ' ' + settings.duration);

	setTimeout(function() {
		$incoming.css('left','0');
		$outgoing.css('left','-'+slideshow.frameWidth+'px');
	},0);

	function onEnd() {
		slideshow.endAnimation();
	}
}

function aa_image_transition_fade(transition,settings) {
	var slideshow = transition.slideshow;
	var $incoming = transition.$incoming, $outgoing = transition.$outgoing;

	settings = aa_defaults(settings,{});
	$incoming.on('webkitTransitionEnd', onEnd);

	slideshow.$el.css('position','relative').css('overflow','hidden');

	$incoming.add($outgoing).css({
		position: 'absolute',
		top:0,
		left:0
	});
	$incoming.css('opacity','0');
	slideshow.$el.append($outgoing).append($incoming);
	$incoming.add($outgoing).css('-webkit-transition',settings.timing + ' ' + settings.duration);

	setTimeout(function() {
		$incoming.css('opacity','1');
		$outgoing.css('opacity','0');
	},0);

	function onEnd() {
		slideshow.endAnimation();
	}

}

function aa_image_transition_toss(transition,settings) {
	var slideshow = transition.slideshow;
	var $incoming = transition.$incoming, $outgoing = transition.$outgoing;

	settings = aa_defaults(settings,{});
	$incoming.on('webkitTransitionEnd', onEnd);

	slideshow.$el.css('position','relative');

	$incoming.add($outgoing).css({
		position: 'absolute',
		top:0,
		left:0
	});
	transform = 'rotate(-30deg) scale(1.3) translate(-20px,-250px)';

	$incoming.css('-webkit-transform',transform).css('opacity','0');
	slideshow.$el.append($outgoing).append($incoming);
	$incoming.add($outgoing).css('-webkit-transition',settings.timing + ' ' + settings.duration);

	setTimeout(function() {
		$incoming.css('-webkit-transform','rotate(0) scale(1) translate(0,0)').css('opacity',1);
		$outgoing.css('opacity','0');
	},0);

	function onEnd() {
		slideshow.endAnimation();
	}

}

function aa_slideshow_buttons(slideshowButtons) {
	var slideshow = slideshowButtons.slideshow;

	slideshow.$el.click(function() {
		slideshow.showNextImage(true);
	}).css('cursor','pointer');
}
