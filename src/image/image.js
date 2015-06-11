ajaxart.load_plugin("", "plugins/image/image.xtml");
ajaxart.load_plugin("", "plugins/image/image_styles.xtml");


aa_gcs("img", {
	Image: function(profile,data,context) {
		aa_init_class_image();

		var origWidthRef = ajaxart.run(data,profile,'OriginalWidth',context);
		var origHeightRef = ajaxart.run(data,profile,'OriginalHeight',context);

		var ctx2 = aa_ctx(context,{ ImageOriginalWidth: origWidthRef, ImageOriginalHeight: origHeightRef });
		var frameWidth = aa_first(data,profile,'FrameWidth',ctx2);
		var frameHeight = aa_first(data,profile,'FrameHeight',ctx2);

		var image = new ajaxart.classes.Image({
			url: aa_text(data,profile,'Url',context),
			originalWidth: parseInt(aa_totext(origWidthRef)),
			originalHeight: parseInt(aa_totext(origHeightRef)),
			originalWidthRef: origWidthRef,
			originalHeightRef: origHeightRef,
			width: frameWidth ? frameWidth.val : 0,
			height: frameHeight ? frameHeight.val : 0,
			adjustSize: aa_first(data,profile,'AdjustSize',context),
			needsRefreshOnResize: (frameWidth && frameWidth.refreshOnResize) || (frameHeight && frameHeight.refreshOnResize),
			refresh: function() {
				var frameWidth = aa_first(data,profile,'FrameWidth',ctx2);
				var frameHeight = aa_first(data,profile,'FrameHeight',ctx2);

				this.width = frameWidth ? frameWidth.val : 0;
				this.height = frameHeight ? frameHeight.val : 0;

				aa_trigger(this,'refresh');
			}
		});

		return [image];
	},
	ImageInSprite: function(profile,data,context) {
		aa_init_class_sprite_image();

		var image = new ajaxart.classes.SpriteImage({
			url: aa_text(data,profile,'Url',context),
			width: aa_int(data,profile,'Width',context),
			height: aa_int(data,profile,'Height',context),
			positionInSprite: aa_text(data,profile,'PositionInSprite',context),
			positionForHover: aa_text(data,profile,'PositionForHover',context),
			positionForClick: aa_text(data,profile,'PositionForClick',context)			
		});

		return [image];
	},
	Center: function(profile,data,context) {
		aa_init_class('CenterImage',{
			fix: function(image,div,innerDiv,settings) {
				var backgroundWidth = image.width,backgroundHeight = image.height;
				if (image.width / image.height > image.originalWidth / image.originalHeight) {
					backgroundWidth = parseInt(backgroundHeight * image.originalWidth / image.originalHeight);
					var marginType = this.isRTL ? 'margin-right' : 'margin-left';
					$(innerDiv).css(marginType,Math.abs(parseInt((image.width - backgroundWidth)/2)) + 'px');
				} else {
					backgroundHeight = parseInt(backgroundWidth * image.originalHeight / image.originalWidth);
					$(innerDiv).css('margin-top',Math.abs(parseInt((image.height - backgroundHeight)/2)) + 'px');
				}
				$(innerDiv).width(backgroundWidth).height(backgroundHeight);
			}
		});
		return [new ajaxart.classes.CenterImage({ isRTL: aa_bool(data,profile,'RightToLeft',context)})];
	},
	Fill: function(profile,data,context) {
		aa_init_class('FillImage',{
			fix: function(image,div,innerDiv,settings) {
				var backgroundWidth = image.width,backgroundHeight = image.height;
				if (image.width / image.height > image.originalWidth / image.originalHeight) {
					backgroundHeight = parseInt(backgroundWidth * image.originalHeight / image.originalWidth);
					$(innerDiv).css('margin-top','-'+Math.abs(parseInt((image.height - backgroundHeight)/2)) + 'px');
				} else {
					backgroundWidth = parseInt(backgroundHeight * image.originalWidth / image.originalHeight);
					$(innerDiv).css('margin-left','-'+Math.abs(parseInt((image.width - backgroundWidth)/2)) + 'px');
				}
				$(innerDiv).width(backgroundWidth).height(backgroundHeight);
			}
		});
		return [new ajaxart.classes.FillImage()];
	},
	CustomFill: function(profile,data,context) {
		return [{
			fix: function(image,div,innerDiv,settings) {
				var backgroundWidth = image.width,backgroundHeight = image.height;
				if (image.width / image.height > image.originalWidth / image.originalHeight) {
					backgroundHeight = parseInt(backgroundWidth * image.originalHeight / image.originalWidth);
				} else {
					backgroundWidth = parseInt(backgroundHeight * image.originalWidth / image.originalHeight);
				}
				$(innerDiv).width(backgroundWidth).height(backgroundHeight);
				$(innerDiv).css('margin-top','-'+aa_text(data,profile,'MarginTop',context) + 'px');
				$(innerDiv).css('margin-left','-'+aa_text(data,profile,'MarginLeft',context) + 'px');
			}
		}];
	},
	Stretch: function(profile,data,context) {
		aa_init_class('StretchImage',{
			fix: function(image,div,innerDiv,settings) {
				var backgroundWidth = image.width,backgroundHeight = image.height;
				$(innerDiv).width(backgroundWidth).height(backgroundHeight);
			}
		});
		return [new ajaxart.classes.StretchImage()];
	},
	FixedWidth: function(profile,data,context) {
		return [{ val: aa_int(data,profile,'Width',context)}];
	},
	FixedHeight: function(profile,data,context) {
		return [{ val: aa_int(data,profile,'Height',context)}];
	},
	ContainerWidth: function(profile,data,context) {
		var visualCntr = aa_findVisualContainer(null,context);
	  var num = visualCntr.width;

		var perc = aa_int(data,profile,'Percentage',context);
		num = parseInt(num * (perc / 100));		
	  num -= aa_int(data,profile,'Margin',context);
	  
	  return [{ val: num, refreshOnResize: true }];
	},
	DeviceHeight: function(profile,data,context) {
	  var num = window.innerHeight || (document.documentElement.clientHeight || document.body.clientHeight);
	  
	  if ($('.jbart_screen_simulator')[0])
	  	num = $('.jbart_screen_simulator').height();
		else if (context.vars._PagePreview) {
			num = context.vars._PagePreview[0].Height;
		}
		var perc = aa_int(data,profile,'Percentage',context);
		num = parseInt(num * (perc / 100));
	  num -= aa_int(data,profile,'Margin',context);
	  
	  return [{ val: num, refreshOnResize: true }];
	},
	CalculateImageSize: function(profile,data,context) {
		var url = aa_text(data,profile,'Url',context);
		var deferred = $.Deferred();
		aa_calc_image_size(url,function(width,height) {
			deferred.resolve([{ Width: [width], Height: [height]}]);
		});
		return aa_asyncDataPromiseResult(deferred.promise());
	}
});

aa_gcs("img_type", {
	Image: function(profile,data,context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);
		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context,ctx);
			var image = aa_first(field_data, profile, 'Image', ctx2);
			if (!image || !image.url)
				image = aa_first(field_data, profile, 'DefaultImage', ctx2);

			return [aa_renderStyleObject(field.Style, {
				field: field, field_data: field_data, context: ctx2,
				image: image
			}, ctx2, true)];
		};
	},
	EditableImage: function(profile,data,context) {
		var field = context.vars._Field[0];
		field.Style = aa_first(data, profile, 'Style', context);

		aa_init_class_image();
		aa_init_class_EditableImage2();

		field.Control = function(field_data, ctx) {
			var ctx2 = aa_merge_ctx(context, ctx);

			var origWidthRef = aa_run(field_data,profile,'FieldDataForImageWidth',context);
			var origHeightRef = aa_run(field_data,profile,'FieldDataForImageHeight',context);

			var frameWidth = aa_first(data,profile,'PreviewWidth',context);
			var frameHeight = aa_first(data,profile,'PreviewHeight',context);

			var imageObject = new ajaxart.classes.Image({
				url: aa_totext(field_data),
				originalWidth: parseInt(aa_totext(origWidthRef)),
				originalHeight: parseInt(aa_totext(origHeightRef)),
				originalWidthRef: origWidthRef,
				originalHeightRef: origHeightRef,
				width: frameWidth ? frameWidth.val : 0,
				height: frameHeight ? frameHeight.val : 0,
				adjustSize: aa_first(data,profile,'AdjustSizeForPreview',context)
			});

			var editableImage = new ajaxart.classes.EditableImage2({
				field: field, field_data: field_data, context: context,
				image: imageObject,
				value: imageObject.url,
				emptyImageUrl: aa_first(data,profile,'EmptyImageURL',context),
				placeholder: field.DescriptionForEmptyText || ''
			});
			return [aa_renderStyleObject(field.Style, editableImage, ctx2, true)];
		};
	}
});

function aa_init_class_image() {
	if (ajaxart.classes && ajaxart.classes.Image) return;

	aa_init_class('Image',{
		_ctor: function() {
			this.css3Image = true;
		},
		render: function(settings) {
			var image = this;
			var el = settings.el;
			$(el).addClass('aa_image_outer');

			aa_empty(el,true);

			if (!this.originalWidth || !this.originalHeight) {
				aa_calc_image_size(image.url,function(width,height) {
					if (!width) return; // an invalid url
					image.originalWidth = width;
					image.originalHeight = height;
					image.render(settings);
				});
				// if (this.width) $(el).width(this.width);
				// if (this.height) $(el).height(this.height);
				return;
			}

			var innerImg = $('<img class="aa_image"/>').appendTo(el).attr('src',this.url);
			if (!innerImg[0].width) {
				innerImg.addClass('loading_image');
				innerImg.load(function() {
					innerImg.removeClass('loading_image');
				});
			}


			if (!this.width && !this.height) {
				this.width = this.originalWidth;
				this.height = this.originalHeight;
			}
			if (this.width && !this.height) {
				this.height = Math.ceil( this.originalHeight * this.width / this.originalWidth );
			}
			if (this.height && !this.width) {
				this.width = Math.ceil( this.originalWidth * this.height / this.originalHeight );
			}

			$(el).css({ overflow: 'hidden' , 'margin-left': 0, 'margin-top': 0 }).width(this.width).height(this.height);

			if (!this.adjustSize) {
				innerImg.width(this.width).height(this.height);
			} else {
				this.adjustSize.fix(image,el,innerImg[0],settings);
			}

			if (this.url.indexOf('//static.wix.com/media/') > -1) {
				// images hosted at wix
				var newUrl = aa_wix_image_url(this.url,{ width: this.width, height: this.height });
			}
		}
	});
}

function aa_init_class_sprite_image() {
	if (ajaxart.classes && ajaxart.classes.SpriteImage) return;

	aa_init_class('SpriteImage',{
		_ctor: function() {
			this.css3Image = true;
		},
		render: function(settings) {
			var image = this;
			var el = settings.el;
			aa_empty(el,true);
			var $innerDiv = $('<div />').css('display','inline-block').appendTo(el);

			$innerDiv.css('width',this.width+'px').css('height',this.height+'px');
			var position = '-' + this.positionInSprite.replace(/,/,'px -') + 'px';
			$innerDiv.css('background','url('+this.url+') no-repeat ' + position);

			var css = '';
			if (this.positionForHover) {
				var hoverPosition = '-' + this.positionForHover.replace(/,/,'px -') + 'px';
				css += '#this:hover { background-position: ' + hoverPosition + ';} ';
			}
			if (this.positionForClick) {
				var activePosition = '-' + this.positionForClick.replace(/,/,'px -') + 'px';
				css += '#this:active { background-position: ' + activePosition + ';} ';
			}

			$innerDiv.addClass(aa_attach_global_css(css));
		}
	});
}

function aa_image(image, settings) {
	if (!settings && !settings.el) return;
	if (!image && settings.hideForEmpty) aa_hide(settings.el);
	if (!image) return;
	if (image.url) image.url = image.url.replace(/_jbartImages_/g,aa_base_images());
	if (image && image.render) image.render(settings);

	if (image.needsRefreshOnResize) {
		aa_addActionOnWindowResize(settings.el,function() {
			image.refresh();
			aa_image(image,settings);
		},'refresh image');
	}
}

function aa_calc_image_size(url,callback) {
	if (!url) return callback();

	var img = $('<img/>')[0];
	var doneCalled = false;

	img.onload = function() {
		if (!doneCalled)
			callback(img.width,img.height); 
	};

	img.onerror = function() {
		doneCalled=true;
		callback(); 
	};

	img.setAttribute('src',url);			
	if (img.width) { doneCalled = true; callback(img.width,img.height); } // already loaded
}


function aa_init_class_EditableImage2() {
	if (ajaxart.classes && ajaxart.classes.EditableImage2) return;

	aa_init_class('EditableImage2', {
		setValue: function(url) {
			this.setImageValue(url);
		},
		setImageValue: function(url, width, height,isErrorInImage) {
			var that = this;
			if (this.image.originalWidthRef[0]) {
				if (!width && !isErrorInImage) { // we need to calculate the image size and then call setImage
					aa_calc_image_size(url,function(width,height) {
						that.setImageValue(url, width, height, !width);
					});
					return; // wait fot the onload
				}
				ajaxart.writevalue(this.image.originalWidthRef, [width]);
				ajaxart.writevalue(this.image.originalHeightRef, [height]);
				this.image.originalWidth = width;
				this.image.originalHeight = height;
			}
			this.value = this.image.url = url;
			ajaxart.writevalue(this.field_data, [url]);
			aa_invoke_field_handlers(this.field.OnUpdate, this.el, null, this.field, this.field_data, {});
			aa_trigger(this.field, 'update', {
				FieldData: this.field_data,
				wrapper: this.el.parentNode
			});
			aa_trigger(this, 'change');
			if (this.refresh) this.refresh();
		}
	});
}

function aa_init_class_EditableImage() {
		aa_init_class('EditableImage', {
			setValue: function(url) {
				this.setImageValue(url);
			},
			setImageValue: function(url, width, height,errorInImage) {
				if (aa_totext(this.field_data) == url) return;
				if (this.imageWidthData[0]) {
					if (!width && !errorInImage) { // we need to calculate the image size and then call setImage
						var that = this;
						aa_calc_image_size(url,function(width,height) {
							that.setImageValue(url, width, height, !width);
						});
						return; // wait fot the onload
					}
					ajaxart.writevalue(this.imageWidthData, [width]);
					ajaxart.writevalue(this.imageHeightData, [height]);
					this.imageWidth = width;
					this.imageHeight = height;
				}
				this.value = this.image.url = url;
				ajaxart.writevalue(this.field_data, [url]);
				aa_invoke_field_handlers(this.field.OnUpdate, this.el, null, this.field, this.field_data, {});
				aa_trigger(this.field, 'update', {
					FieldData: this.field_data,
					wrapper: this.el.parentNode
				});
				aa_trigger(this, 'change');
			},
			CalcImageSize: function(data1) {
				if (! this.imageWidthData[0]) return;
				var url= aa_totext(this.field_data);
				var that = this;

				aa_calc_image_size(url,function(width,height) {
					ajaxart.writevalue(that.imageWidthData, [width]);
					ajaxart.writevalue(that.imageHeightData, [height]);
					that.imageWidth = width;
					that.imageHeight = height;
				});
			}			
		});	
}

function aa_editableImage_default(editableImage,settings) {
	settings = settings || {};
	aa_editableImageBase(editableImage,settings);

	editableImage.$el.click(function() {
		var url = window.prompt(settings.message,editableImage.image.url);
		editableImage.setValue(url);
	});		
}

function aa_editableImageBase(editableImage,settings) {
	settings = aa_defaults(settings,{
		message: editableImage.params.Question || 'Please enter image url:',
		imageWrapper: editableImage.el,
		inputElement: editableImage.$el.find("input")[0]
	});
	var $imageWrapper = $(settings.imageWrapper);

	$imageWrapper.width(editableImage.image.width).height(editableImage.image.height);

	editableImage.refresh = function() {
		$imageWrapper.toggleClass('aa_empty_image',editableImage.image.url == '');
		editableImage.$el.toggleClass('aa_empty_image',editableImage.image.url == '');
		if (editableImage.image.url) {
			aa_empty($imageWrapper[0],true);
			aa_image(editableImage.image,{el: settings.imageWrapper});
		}	else if (editableImage.emptyImageUrl) {
			var imageObj = aa_defaults({ url: editableImage.emptyImageUrl }, editableImage.image);
			aa_image(imageObj, {el: settings.imageWrapper});
		}	else
			aa_empty($imageWrapper[0],true);
	}

  	editableImage.refresh();
    if (settings.inputElement) {
		var $input = $(settings.inputElement);
		$input.css('width', editableImage.params.TextBoxWidth );
		$input.attr("placeholder",editableImage.placeholder);
		$input.val(editableImage.image.url);
		$input.on('input', function() {
			var inputValue = $input.val();
			if ($input.val() != editableImage.image.url) {
				editableImage.setValue($input.val());
			}
		});
	}
	var mask = editableImage.$el.find(".aa_drop_sink_mask");
	if (mask.length)
		mask[0].jbDropImage = function (e) {
			var files = e.dataTransfer.files;
			for(var i=0;i<files.length;i++) {
				editableImage.$el.addClass('uploading');
				$.when(editableImage.doUpload({file: files[i]})).then(function(image_url) { 
					editableImage.setValue(image_url);
					editableImage.$el.removeClass('uploading');
					if ($input) $input[0].value = image_url;
				}, function(er) { editableImage.$el.removeClass('uploading'); } );
				return; // one file is enough at this stage ...
			}

			var items = e.dataTransfer.items;
			if (items) {	// Chrome
				for(var i=0;i<items.length;i++)
					if (items[i].type == "text/html" )
						items[i].getAsString(useDroppedHtml);
			}
			else {	// Firefox
				useDroppedHtml(e.dataTransfer.getData('text/html'));
			}
			function useDroppedHtml(html){ 
	          var image_url = html.match(/src="([^"]*)/);
	          if (image_url && image_url[1]) {
	          	editableImage.setValue(image_url[1]);
	            if ($input) $input[0].value = image_url[1];
	          }
			}
		}
	aa_init_dropImage();
}

function aa_init_dropImage() {
	if (window.aa_dropImageInitialized) return;
	window.aa_dropImageInitialized = true;

 	function dragover(e) {
        e.stopPropagation();
        e.preventDefault();	
        var box = $(e.target).parents('*').andSelf().filter('.image_drop_area');
        if (box.length > 0) {
        	$(".aa_drop_sink_mask").hide();	// hide other drop masks
            box.addClass('hover');
            var mask = box.find('.aa_drop_sink_mask');
            var borderWidth = parseInt(mask.css('border-width')) || 0;
            mask.width(box.width()-borderWidth*2);
            mask.height(box.height()-borderWidth*2);
            box.css('position','relative');
            mask.show();
        }
	}

	function dragleave(e) {
        e.stopPropagation ();
        e.preventDefault();
        $(e.target).parents('*').andSelf().filter('.aa_drop_sink_mask').hide();
	}

	function drop(e) {
        e.stopPropagation();
        e.preventDefault();	
        var mask = $(e.target).parents('*').andSelf().filter('.aa_drop_sink_mask');
        if (mask.length > 0) {
            mask[0].jbDropImage && mask[0].jbDropImage(e);
        }
        $('.aa_drop_sink_mask').hide();
	}
	document.addEventListener('drop', drop, false);
	document.addEventListener('dragover', dragover, false);
	document.addEventListener('dragleave', dragleave, false);
}


function aa_editableImageTextAndPreview(editableImage,settings) {
	settings = aa_defaults(settings,{ imageWrapper: editableImage.$el.find("span")[0] });
	aa_editableImageBase(editableImage, settings);
}
function aa_editableImageInPopup(editableImage,settings) {
	var $imageWrapper = editableImage.$el.find(".main_image_wrapper");
	settings = aa_defaults(settings,{ imageWrapper: $imageWrapper[0] });
	aa_editableImageBase(editableImage, settings);
	var popup = aa_createLightPopup({
		el: editableImage.$el.find(".popup")[0],
		launchingElement: $imageWrapper[0],
		location:  aa_popupNearLauncherLocation({ minWidthOfLaunchingElement: true }),
		features: [
			aa_popup_feature_closeOnEsc(),
			aa_popup_feature_autoFocus()
		],
		apiObject: editableImage,
		type: 'image',
		popupSettings: {
			closeWhenClickingOutside: 'except launching element',
			reusablePopup: true
		}
	});
	$imageWrapper.click( function() {
		if (!ajaxart.isattached(popup.el))
			popup.show();
		else
			popup.close();
	} );
}