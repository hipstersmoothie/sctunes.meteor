Template.player.helpers({
  currentTrack: function() {
    return Session.get('currentTrack');
  },
  player_orientation: function() {
    return {
      value: Session.get("player_orientation"),
      transition: { curve: 'easeOutBounce', duration: 300 },
      halt: true
    };
  }
});

Template.currentTrackPlayer.helpers({
  currentTrack: function() {
    return Session.get('currentTrack');
  },
});

Template.currentTrackPlayer.events = ({
  'click #time-slider' : function(event) {
    currentTrack.setPosition(event.currentTarget.value);
  }
});

Template.controls.helpers({
  currentTrack: function() {
    return Session.get('currentTrack');
  }
});

Template.controls.events = ({
  'click #playpause' : function() {
    togglePauseIcon();
    currentTrack.togglePause();
  },
  'click #nextButton' : function() {
    playNextOrPrevTrack(true);
  },
  'click #prevButton' : function() {
    playNextOrPrevTrack(false);
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