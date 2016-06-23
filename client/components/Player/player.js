import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { playNextOrPrevTrack } from '../../utilities';

Session.set('pauseIcon', true);

Template.player.helpers({
  trackPosition: () => Session.get('trackPosition') || 0,
  queueShowing: () => Session.get('queueAction') === 'Hide',
  pauseIcon: () => Session.get('pauseIcon')
});

Template.player.events({
  'click #time-slider': event => currentSound.setPosition(event.currentTarget.value),
  'click #playpause'() {
    Session.set('pauseIcon', !Session.get('pauseIcon'));
    currentSound.togglePause();
  },
  'click #nextButton': () => playNextOrPrevTrack(true),
  'click #prevButton': () => playNextOrPrevTrack(false)
});
