import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';
import { $ } from 'meteor/jquery';
import _ from 'lodash';
import { TimelineLite } from 'gsap';

import { streamTrack, setPlayingToCurrent, prepareTracks, findTrackWithId } from '../../utilities'

let qIndex = 0;
function addToQueue(node) {
  let orange = '#ee7600';
  let origColor = $(`#${node.id} .overlay`).css('backgroundColor');
  let duration = 0.4;

  let queueMessage = $(`#${node.id} .queueMessage`);
  new TimelineLite()
    .to(queueMessage, duration, {backgroundColor: orange, opacity: 1})
    .to(queueMessage, duration, {backgroundColor: origColor})
    .to(queueMessage, duration, {backgroundColor: orange})
    .to(queueMessage, duration, {backgroundColor: origColor, clearProps: 'all'});

  let queue = Session.get('queue');
  let track = Session.get('tracks')[node.index];
  track.queueIndex = qIndex++;
  queue.push(track);
  Session.set('queue', queue);
}


function msToTime(duration) {
  var seconds = parseInt(duration/1000 % 60),
      minutes = parseInt(duration/(1000*60) % 60),
      hours = parseInt(duration/(1000*60*60) % 24);

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  return hours + ':' + minutes + ':' + seconds;
}

Template.trackList.helpers({
  tracks:() => Session.get('tracks'),
  toTime:(ms) => msToTime(ms),
  artist:() => Session.get('currentArtist') != null
});
Template.registerHelper('loaded', () => Session.get('loaded'));
Template.registerHelper('currentTrack', () => Session.get('currentTrack'));

Template.trackList.events({
  'click .trackItem' : function(event) {
    let tracks = Session.get('tracks');

    // if(event.altKey)
    //   addToPlaylistClick(tracks, this.index, this.id);
    if(this.kind == 'playlist'){
      Session.set('loaded', false);
      SC.get('/playlists/' + this.id, function(playlist) {
        Session.set('tracks', prepareTracks(playlist.tracks, true, playlist.artwork_url));
        Session.set('loaded', true);
      });
    } else if (event.shiftKey)
      addToQueue(this);
    else if(this.id == Session.get('currentTrack').id)
      currentSound.togglePause();
    else { 
      Session.set('playing', true);
      streamTrack(findTrackWithId(tracks, this.id));
      Session.set('tracks', setPlayingToCurrent(tracks));
    }
  },
  'click [id*=artist-profile]' : event => {
    event.stopPropagation()
    Router.go('artist', { _id : event.currentTarget.id.split('-')[0] });
  },
  'click .heartCount' : event => {
    try {
      if(event.target.classList[1] === 'hearted')
        SC.delete('/me/favorites/' + event.target.parentNode.parentNode.parentNode.id);
      else {
        SC.put('/me/favorites/' + event.target.parentNode.parentNode.parentNode.id);
      }
    } catch (error) {
      console.log('ioeno');
    }

    let tracks = Session.get('tracks');
    let track = _.find(tracks, track => track.id == event.target.parentNode.parentNode.parentNode.id);

    track.user_favorite = !track.user_favorite;
    tracks[track.index] = track;
    Session.set('tracks', tracks);
  },
  artist: () => Session.get('sortType') === 'Artist',
  uploader: () => Session.get('sortType') === 'Uploader',
  titleDoesNotContainUsername: (title, username) => title.indexOf(username) == -1
});  

