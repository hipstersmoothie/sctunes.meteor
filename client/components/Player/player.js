import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import { playNextOrPrevTrack } from '../../utilities';

let togglePauseIcon = () => {
  let playPause = $('#playPauseIcon');
  let play = 'glyphicon-play';
  let pause = 'glyphicon-pause';

  if(playPause.hasClass(play)) {
    playPause.removeClass(play);
    playPause.addClass(pause);
  } else {
    playPause.removeClass(pause);
    playPause.addClass(play);
  }
};

Template.player.helpers({
  player_orientation: () => {
    return {
      value: Session.get('player_orientation'),
      transition: { curve: 'easeIn', duration: 300 },
      halt: true
    };
  },
  currentTrack: () => Session.get('currentTrack') || { duration: 100 },
  trackPosition: () => Session.get('trackPosition') || 0
});

Template.player.events({
  'click #time-slider' : event => currentSound.setPosition(event.currentTarget.value),
  'click #playpause' :() => {
    togglePauseIcon();
    currentSound.togglePause();
  },
  'click #nextButton' :() => playNextOrPrevTrack(true),
  'click #prevButton' :() => playNextOrPrevTrack(false)
});
