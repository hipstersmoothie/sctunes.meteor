import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { playNextOrPrevTrack } from '../../utilities';
import { ReactiveVar } from 'meteor/reactive-var';

const pauseIcon = new ReactiveVar(true);
const trackPosition = new ReactiveVar(0);

Template.player.helpers({
  trackPosition: () => trackPosition.get(),
  queueShowing: () => Session.get('queueAction') === 'Hide',
  pauseIcon: () => pauseIcon.get()
});

Template.player.events({
  'click #time-slider': event => currentSound.setPosition(event.currentTarget.value),
  'click #playpause'() {
    pauseIcon.set(!pauseIcon.get());
    currentSound.togglePause();
  },
  'click #nextButton': () => playNextOrPrevTrack(true),
  'click #prevButton': () => playNextOrPrevTrack(false)
});
