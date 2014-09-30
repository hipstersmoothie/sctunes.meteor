Template.player.helpers({
  currentTrack: function() {
    return Session.get('currentTrack');
  }
});

Template.player.events = ({
  'click #playpause' : function() {
    togglePauseIcon();
    currentTrack.togglePause();
  },
  'click #nextButton' : function() {
    playNextOrPrevTrack(true);
  },
  'click #prevButton' : function() {
    playNextOrPrevTrack(false);
  },
  'click #time-slider' : function(event) {
    currentTrack.setPosition(event.currentTarget.value);
  }
});

var togglePauseIcon = function() {
  var playPause = $('#playPauseIcon');
  if(playPause.hasClass('glyphicon-play')) {
    playPause.removeClass('glyphicon-play');
    playPause.addClass('glyphicon-pause');
  } else {
    playPause.removeClass('glyphicon-pause');
    playPause.addClass('glyphicon-play');
  }
};