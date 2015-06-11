function aa_roundabout(imagegallery, settings) {
  settings = aa_defaults(settings, {
    autoPlayAfter: 5000,
    roundDuration: 600
  })
  var baseUrl = imagegallery.BaseUrl || aa_base_lib() + '/roundabout/';
  aa_loadRequiresJSFiles({
    jsFiles: [{
      url: baseUrl + 'jquery.roundabout.js',
      jsVariable: 'jQuery.fn.roundabout'
    }, {
      url: baseUrl + 'jquery.roundabout-shapes.js',
      jsVariable: 'jQuery.roundaboutShapes.waterWheel'
    }],
    onload: function() {
      var ul = imagegallery.$el.find("ul");
      var images = imagegallery.images;
      if (images.length < 4 && images.length > 1) { // works well with at-least 4 items
        images = [];
        for (i = 0; i < imagegallery.images.length * 4; i++)
        images.push(imagegallery.images[i % imagegallery.images.length]);
      }
      for (i in images) {
        var imageObj = images[i];
        var li = jQuery('<li><a href="javascript:;"><img class="roundabout_image"/></a></li>');
        li.find("img").attr("src", imageObj.url).attr("title", imageObj.title)[0].jbImageObject = imageObj;
        if (imageObj.link) li.find("a").attr("href", imageObj.link).attr("target", "_blank");
        li.appendTo(ul);
      }
      aa_addOnAttach(imagegallery.el, function() {
        if (images.length == 1) {
          ul.addClass("roundabout-holder single-image");
          ul.find("li").addClass("roundabout-moveable-item");
        } else {
          ul.roundabout({
            shape: 'waterWheel',
            minOpacity: 0,
            duration: settings.roundDuration
          });
          // fix image positions on every move
          $('ul').bind('childrenUpdated', {}, function() {
            $('ul').children('.li').each(function() {
              fixImagePosition($(this).find('.roundabout_image')[0], this);
            });
          });
          ul.inHover = false;
          imagegallery.$el.mousemove(function() {
            ul.inHover = true;
          }).mouseout(function() {
            ul.inHover = false;
          });

          function autoPlay() {
            if (!ajaxart.isattached(ul)) return;
            if (!ul.inHover) ul.roundabout('animateToNextChild');
            setTimeout(autoPlay, settings.autoPlayAfter);
          }
          setTimeout(autoPlay, settings.autoPlayAfter);
        }
        // fix initial image positions
        $('ul').find('.roundabout_image').each(function(index, image) {
          function fix() {
            fixImagePosition(image, $(image).parents('li')[0]);
          }
          if (this.width) fix(); // already loaded
          else {
            $(this).css('width', $(this).parent().width() + 'px');
            this.onload = fix;
          }
        });
      });
    }
  });

  function fixImagePosition(img, li) {
    var imageObject = img.jbImageObject;
    var boxHeight = settings.height;
    var boxWidth = settings.width;

    if (imageObject.originalHeight) {
      $(img).height(boxHeight);
      var width = boxHeight * imageObject.originalWidth / imageObject.originalHeight;
      var marginLeft = Math.max(parseInt((boxWidth - width) / 2),0);
      $(img).width(parseInt(width)).css('margin-left', marginLeft + 'px');
    } else {
      $(img).css('width', '');
      var imageRatio = img.naturalWidth / img.naturalHeight;
      var desiredRatio = boxWidth / boxHeight;
      var $img = jQuery(img);
      if (imageRatio == desiredRatio) {
        $img.css('width', '100%').css('height', '100%;');
      } else if (imageRatio < desiredRatio) {
        $img.css('width', '100%').css('height', 'none');
        var marginTop = ((imageRatio - desiredRatio) * boxHeight) * 0.5;
        $img.css('margin-top', marginTop + 'px');
      } else {
        $img.css('height', '100%').css('width', 'none');
        var marginLeft = ((desiredRatio - imageRatio) * boxWidth) * 0.5;
        $img.css('margin-left', marginLeft + 'px');
      }
    }
  }

}


function aa_ImageWithNextPrevButtons(imagegallery,settings) {
  if (!imagegallery.images.length) imagegallery.$el.css('opacity', 0);

  $find(".visible").width(settings.width + "px");
  if (imagegallery.images.length == 0) return;
  var current = 0;
  var max_circles = 10;
  for (i = 0; i < imagegallery.images.length; i++) {
    var imageObject = imagegallery.images[i];

    var td = $('<td><div/></td>').appendTo($find('tr'));
    var div = td.find('div');
    if (imagegallery.images[i].originalHeight) {
      var width = settings.height * imageObject.originalWidth / imageObject.originalHeight;
      aa_setImage(div[0], {
        url: imageObject.url,
        height: settings.height,
        width: width,
        keepImageProportions: false
      });
      var marginLeft = Math.max(parseInt((settings.width - width) / 2),0);
      div.find('img').css('margin-left',marginLeft + 'px');
      $(div).width(settings.width).css('overflow','hidden');
    } else {
      aa_setImage(div[0], {
        url: imageObject.url,
        height: settings.height,
        width: settings.width,
        keepImageProportions: true,
        fillImage: true,
        centerImage: true
      });
    }
    if (i < max_circles) {
      var circle = jQuery("<div class='circle'></div>").appendTo($find('.circles'));
      circle.click(function() {
        current = $(this).index();
        show();
      });
    }
  }
  if (imagegallery.images.length < 2) $find('.circles').hide();
  $find('.button').css('top', settings.height / 2);
  show();

  function show() {
    $find('.images').css('margin-left', "-" + $find('.visible').width() * current + "px");
    $find('.prev').removeClass('disable').addClass(current == 0 ? 'disable' : '');
    $find('.next').removeClass('disable').addClass(current >= imagegallery.images.length - 1 ? 'disable' : '');
    $find('.circles').children().removeClass("current");
    $find('.circles').children(":nth-child(" + (current + 1) + ")").addClass("current");
  }
  $find('.next').click(function() {
    if (current < imagegallery.images.length - 1) {
      current++;
      show();
    }
  });
  $find('.prev').click(function() {
    if (current > 0) {
      current--;
      show();
    }
  });

  function $find(selector) {
    return imagegallery.$el.find(selector);
  }

}