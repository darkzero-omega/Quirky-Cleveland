$("#carousel > div:gt(0)").hide();

setInterval(function() {
  $('#carousel > div:first')
    .fadeOut(1000)
    .next()
    .fadeIn(1000)
    .end()
    .appendTo('#slideshow');
}, 3000);