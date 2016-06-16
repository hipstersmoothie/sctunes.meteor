Template.player.helpers({
  currentTrack: function() {
    console.log( Session.get('currentTrack'))
    return Session.get('currentTrack');
  },
  player_orientation: function() {
    return {
      value: Session.get('player_orientation'),
      transition: { curve: 'easeIn', duration: 300 },
      halt: true
    };
  }
});

Template.currentTrackPlayer.helpers({
  currentTrack: function() {
    console.log()
    return Session.get('currentTrack') || { duration: 100};
  },
  trackPosition: function() {
    return Session.get('trackPosition') || 0;
  }
});

Template.currentTrackPlayer.events = {
  'click #time-slider' : function(event) {
    currentTrack.setPosition(event.currentTarget.value);
  }
};

Template.controls.helpers({
  currentTrack: function() {
    return Session.get('currentTrack');
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

Template.controls.events = {
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
};
