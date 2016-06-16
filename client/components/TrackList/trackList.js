import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';
import { $ } from 'meteor/jquery';
import _ from 'lodash';

import { streamTrack, setPlayingToCurrent, prepareTracks, findTrackWithId } from '../../utilities'

let qIndex = 0;
function addToQueue(node) {
  let queue = Session.get('queue');
  let track = Session.get('tracks')[node.index];

  Session.set('queueMode', true);
  track.queueIndex = qIndex++;
  queue.push(track);
  Session.set('queue', queue);
}

function stopLastTrack() {
  if(currentTrack) {
    Session.set('trackPosition', 0);
    currentTrack.stop();

    if(Session.get('queuePlaying') && $('#' + Session.get('currentTrack').id + '-queue').length) {
      let queue = Session.get('queue');
      Session.set('queuePlaying', false);
      queue[$('#' + Session.get('currentTrack').id + '-queue')[0].index].qplaystatus = 'notplaying';
      Session.set('queue', queue);
    }
  }
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
  lots:() => Session.get('me').public_favorites_count > 1000,
  toTime:(ms) => msToTime(ms),
  loaded: () => Session.get('loaded'),
  currentTrack:() => Session.get('currentTrack'),
  artist:() => Session.get('currentArtist') != null
});

Template.trackList.events({
  'click .trackItem' : function(event) {
    let tracks = Session.get('tracks');

    // if(event.altKey)
    //   addToPlaylistClick(tracks, this.index, this.id);
    if(this.kind == 'playlist'){
      Session.set('loaded', false);
      console.log(SC)
      SC.get('/playlists/' + this.id, function(playlist) {
        Session.set('tracks', prepareTracks(playlist.tracks, true, playlist.artwork_url));
        Session.set('loaded', true);
      });
    } else if (event.shiftKey)
      addToQueue(this);
    else if(this.id == Session.get('currentTrack').id)
      currentTrack.togglePause();
    else { 
      Session.set('playing', true);
      stopLastTrack();
      streamTrack(findTrackWithId(tracks, this.id), false);
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

