import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import { playNextOrPrevTrack } from '../../utilities';

Template.player.helpers({
  player_orientation: () => {
    return {
      value: Session.get('player_orientation'),
      transition: { curve: 'easeIn', duration: 300 },
      halt: true
    };
  }
});

Template.currentTrackPlayer.helpers({
  currentTrack: () => Session.get('currentTrack') || { duration: 100 },
  trackPosition: () => Session.get('trackPosition') || 0
});

Template.currentTrackPlayer.events = {
  'click #time-slider' : event => currentSound.setPosition(event.currentTarget.value)
};

var togglePauseIcon = () => {
  var playPause = $('#playPauseIcon');
  if(playPause.hasClass('glyphicon-play')) {
    playPause.removeClass('glyphicon-play');
    playPause.addClass('glyphicon-pause');
  } else {
    playPause.removeClass('glyphicon-pause');
    playPause.addClass('glyphicon-play');
  }
};

Template.controls.events({
  'click #playpause' :() => {
    togglePauseIcon();
    currentSound.togglePause();
  },
  'click #nextButton' :() => playNextOrPrevTrack(true),
  'click #prevButton' :() => playNextOrPrevTrack(false)
});
