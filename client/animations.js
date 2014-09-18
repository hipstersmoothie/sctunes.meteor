$(document).ready(function () {
  $('.overlay').mouseenter(function () {
      console.log('animate');
    $('.overlay').velocity({boxShadowBlur:25},{
        duration: 400
    });
    $('.overlay .info .title').velocity({scale:1.5},{
        duration: 400
    });
    // $('.trackItem figcaption').velocity({
    //     translateX: [0, '100%'],
    //     opacity: [1, 0]
    // }, {
    //     duration: 400
    // });
    // $('.figcaption-wrap').velocity('transition.perspectiveUpIn', {delay:400});
  }).mouseleave(function () {
    $('.caption').velocity('reverse');
  });
});