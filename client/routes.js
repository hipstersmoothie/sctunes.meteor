import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';
import { Router } from 'meteor/iron:router';
import _ from 'lodash';

import { setArt, setPlayingToCurrent, prepareTracks } from './utilities'

let getRoute = function(user, route, array, length, prepFunction) {
  const loadingText = `Getting ${route}`;
  Session.set('loadingText', loadingText + '...');

  let collection = [];
  let resolve = (data) => {
    collection = collection.concat(prepFunction ? prepFunction(data.collection) : data.collection);
    Session.set('loadingText', loadingText + ': ' + collection.length + ' of ' + length);

    if(data.next_href)
      SC.get(data.next_href, resolve);
    else {
      Session.set(array, collection);
      Session.set('loaded', true);
    }
  }

  SC.get(`/users/${user}/${route}`, { limit: 200, linked_partitioning: 1 }, resolve);
}

var getFollowedArtists = function(me) {
  getRoute(me.id, 'followings', 'artists', me.followings_count)
};

var getTracks = function () {
  getRoute(Session.get('me').id, 'favorites', 'tracks', Session.get('me').public_favorites_count, prepareTracks)
};

var extractSongsAndPlaylists = function(tracks) {
  return _.map(_.filter(tracks, track => track.track || track.playlist), function(track) {
    if(track.track)
      return track.track;
    if(track.playlist)
      return track.playlist;
  });
};

var likedPlaylists = null;
var getLikePlaylists = function() {
  Session.set('loadingText', 'Getting liked playlists.... ');
  
  Meteor.call('getLikedPlaylists', function(err, playlist) {
    var playlists = setArt(playlist.artwork_url, extractSongsAndPlaylists(playlist));
    likedPlaylists = playlists;
    Session.set('tracks', playlists); 
    Session.set('loaded', true);
  });
};

var splitData = function(artist, data) {
  return prepareTracks(extractSongsAndPlaylists(data), true, artist.avatar_url);
};

var getResource = function(type, artist, resourceCount, processFunc) {
  var currentData = Session.get('artist' + type);

  if(currentData && currentData.data && currentData.id === artist.id) {
    Session.set('tracks', setPlayingToCurrent(currentData.data));
    return Session.set('artistLoaded', true);
  }

  for(var i = 0; i < Math.ceil(artist[resourceCount] / 200); i++) {
    Meteor.call('getArtist' + type, artist.id, function(error, data) {
      data  = setPlayingToCurrent(processFunc(data));
      Session.set('tracks', data);
      Session.set('artist' + type, {
        data,
        id: artist.id
      });

      if(i === Math.ceil(artist[resourceCount] / 200)) {
        Session.set('loaded', true);
        Session.set('artistLoaded', true);
      }
    });
  }
  if(artist[resourceCount] < 1) {
    // toastr.error('User has no' + type + '!');
    Session.set('artistLoaded', true);
  }
};

var getArtistPlaylists = function(artist) {
  getResource('Playlists', artist, 'playlist_count', _.bind(setArt, this, artist));
};

var getFavorites = function(artist) {                
  getResource('Favorites', artist, 'public_favorites_count', _.bind(splitData, this, artist));
};

var getArtistTracks = function(artist) {
  getResource('Tracks', artist, 'track_count', _.bind(splitData, this, artist));
};


var loadArtist = function(id, resource) {
  var currentArtist = Session.get('currentArtist');
  Session.set('artistLoaded', false);
  Session.set('loadingText', 'Getting user\'s profile...');

  if(currentArtist && currentArtist.id == id) {
    if(resource === 'favorites') 
      return getFavorites(currentArtist);
    else if(resource === 'playlists')
      return getArtistPlaylists(currentArtist);
    else
      return getArtistTracks(currentArtist);
  }

  Meteor.call('getArtist', id, function(error, info) {    
    info.big_avatar = info.avatar_url.replace('large', 't300x300');
    Session.set('currentArtist', info);
    Session.set('artistFavorites', null);
    Session.set('artistTracks', null);

    if(resource === 'favorites' || info.track_count === 0)
      getFavorites(info);
    else if(resource === 'playlists')
      getArtistPlaylists(info);
    else
      getArtistTracks(info);
  });  
};

Router.configure({
  layoutTemplate: 'trackLayout',
  templateNameConverter: 'upperCamelCase'
});

Router.plugin('auth', {
  authenticate: {
    route: 'login'
  }
});

// With options on use
Router.onBeforeAction('authenticate', {
  authenticate: {
    layout: 'ApplicationLayout',
    template: 'login'
  },
  except: ['login']
});

Router.configure({
  authenticate: 'login'
});

var initRoot = function() {
  Session.set('loaded', false);

  if(Session.get('origTracks').length) {
    Session.set('tracks', setPlayingToCurrent(Session.get('origTracks'), {}));
    Session.set('loaded', true);
  } else {
    Meteor.call('getMe', function(error, me) {
      Session.set('me', me);
      getTracks(me);
    });
  }

  Session.set('currentArtist', null);
  this.next();
};

Router.map(function() {
  this.route('app', {
    path: '/',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: initRoot
  });

  this.route('myFavorites', {
    path: '/favorites',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: initRoot
  });

  this.route('following', {
    path: '/following',
    layoutTemplate: 'trackLayout',
    template: 'artistList',
    onBeforeAction: function() {
      Session.set('loaded', false);

      if(!Session.get('artists')) {
        if(!Session.get('me'))
          Meteor.call('getMe', function(error, me) {
            Session.set('me', me);
            getFollowedArtists(me);
          });
        else
          getFollowedArtists(Session.get('me'));
      } else {
        Session.set('loaded', true);
      }

      this.next();
    }
  });

  this.route('myPlaylists', {
    path: '/likedPlaylists',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      Session.set('loaded', false);
      Session.set('currentArtist', null);

      if(likedPlaylists) {
        Session.set('tracks', likedPlaylists); 
        Session.set('loaded', true);
      } else
        getLikePlaylists();

      this.next();
    }
  });

  this.route('artist', {
    path: '/artist/:_id',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id);
      this.next();
    }
  });

  this.route('artistFavorites', {
    path: '/artist/:_id/favorites',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id, 'favorites');
      this.next();
    }
  });

  this.route('artistTracks', {
    path: '/artist/:_id/tracks',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id);
      this.next();
    }
  });

  this.route('artistPlaylists', {
    path: '/artist/:_id/playlists',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id, 'playlists');
      this.next();
    }
  });

  this.route('login', {
    path: '/login',
    redirectOnLogin: true,
    layoutTemplate: 'ApplicationLayout',
    onBeforeAction: function() {
      if(Meteor.user())
        Router.go('/');
      this.next();
    }
  });
});