import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { TimelineLite } from 'gsap';
import { $ } from 'meteor/jquery';

Session.set('queueAction', 'Show');
let animation = null;

Template.queue.helpers({
  queue: () => Session.get('queue'),
  action: () => Session.get('queueAction')
});

Template.queue.events({
  'click .showQueue':() => {
    let duration = 1.2;

    if(!animation) {
      animation = new TimelineLite()
        .fromTo($('.footer'), duration, {bottom: 0}, {bottom: 99})
        .fromTo($('.queueContainer'), duration, {bottom: 0}, {bottom: 100}, 0)
    }

    if(Session.get('queueAction') == 'Show') {
      Session.set('queueAction', 'Hide');
      animation.play()
    } else {
      Session.set('queueAction', 'Show');
      animation.progress(1, false);
      animation.reverse()
    }
  }
});
