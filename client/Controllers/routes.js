Router.configure({
  layoutTemplate: 'trackLayout',
  templateNameConverter: 'upperCamelCase'
});

var auth = {
  name: 'login',
  // shouldRoute: false,
  layout: 'ApplicationLayout'
};

Router.map(function() {
  this.route('app', {
    path: '/',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    loginRequired: auth,
    onBeforeAction: function() {
      GAnalytics.pageview('app');
      getMe();
    },
    yieldTemplates: {
      'myInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('myFavorites', {
    path: '/favorites',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    loginRequired: auth,
    onBeforeAction: function() {
      var tracks = Session.get("origTracks");
      Session.set('loaded', false);

      $('#my-tracks').addClass('active').siblings().removeClass('active');
      if(tracks)
        Session.set("tracks", setPlayingToCurrent(tracks));
      else 
        Meteor.call("getMe", function(error, me) {
          getTracks(me);
        });

      Session.set('loaded', true);
    },
    yieldTemplates: {
      'myInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('myPlaylists', {
    path: '/likedPlaylists',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    loginRequired: auth,
    onBeforeAction: function() {
      var playlists = Session.get('likedPlaylists');
      $('#my-playlists').addClass('active').siblings().removeClass('active');
      Session.set('loaded', false);
      if(playlists) {
        Session.set('tracks', playlists); 
        Session.set('loaded', true);
      } else
        getLikePlaylists();
    },
    yieldTemplates: {
      'myInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('artist', {
    path: '/artist/:_id',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    loginRequired: auth,
    onBeforeAction: function() {
      loadArtist(this.params._id);
    },
    yieldTemplates: {
      'artistInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('artistFavorites', {
    path: '/artist/:_id/favorites',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    loginRequired: auth,
    onBeforeAction: function() {
      loadArtist(this.params._id, "favorites");
    },
    yieldTemplates: {
      'artistInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('artistTracks', {
    path: '/artist/:_id/tracks',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    loginRequired: auth,
    onBeforeAction: function() {
      loadArtist(this.params._id);
    },
    yieldTemplates: {
      'artistInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('artistPlaylists', {
    path: '/artist/:_id/playlists',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    loginRequired: auth,
    onBeforeAction: function() {
      loadArtist(this.params._id, "playlists");
    },
    yieldTemplates: {
      'artistInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('login', {
    path: '/login',
    redirectOnLogin: true,
    layoutTemplate: 'ApplicationLayout',
    onBeforeAction: function() {
      GAnalytics.pageview('login');
      if(Meteor.user())
        Router.go('/');
    }
  });
});

var extractSongsAndPlaylists = function(tracks) {
  return _.map(_.filter(tracks, function(track) {
    return track.track || track.playlist;
  }), function(track) {
    if(track.track)
      return track.track;
    if(track.playlist)
      return track.playlist;
  });
};

var getResource = function(type, artist, resourceCount, processFunc, callback) {
  var allTracks, currentData = Session.get('artist' + type);

  $('#artist-' + type.toLowerCase()).addClass('active').siblings().removeClass('active');

  if(currentData) {
    Session.set('tracks', setPlayingToCurrent(currentData));
    return Session.set("loaded", true);
  }

  Session.set('loaded', false);
  for(var i = 0; i < Math.ceil(artist[resourceCount] / 200); i++) {
    Meteor.call("getArtist" + type, artist.id, function(error, data) {
      data  = setPlayingToCurrent(processFunc(data));
      Session.set('tracks', data);
      Session.set('artist' + type, data);
      if(i === Math.ceil(artist[resourceCount] / 200)) 
        Session.set("loaded", true);
    });
  }
  if(artist[resourceCount] < 1) {
    toastr.error('User has no' + type + '!');
    Session.set('loaded', true);
  }
};

var getPlaylists = function() {
  Meteor.call("getPlaylists", function(error, playlists) {
    Session.set("playlists", playlists);
  });
};   

var getAll = function(path, calls, callback, prepFunction) {
  var args = Array.prototype.slice.apply(arguments);
  var collection = [], offset = 0;

  for(var i = 0; i < calls; i++) {
    Meteor.call(path, i, function(error, data){
      if(prepFunction)
        collection = collection.concat(prepFunction(data, args[args.length]));
      else
        collection = collection.concat(data);

      if (i === calls) 
        return callback(collection);
    });
  }
};

var getFollowedArtists = function(me) {
  getAll("getArtists", Math.ceil(me.followings_count / 200), function(artists) {
     Session.set("artists", artists);
  }, null);
};

var getLikePlaylists = function() {
  Meteor.call("getLikedPlaylists", function(err, playlist) {
    var playlists = setArt(playlist.artwork_url, extractSongsAndPlaylists(playlist));
    Session.set('likedPlaylists', playlists);
    Session.set('tracks', playlists); 
    Session.set('loaded', true);
  });
};

var getTracks = function (me) {
  getAll("getFavorites", Math.ceil(me.public_favorites_count / 200), function(tracks) {
    Session.set("tracks", tracks);
    Session.set("origTracks", tracks);
    Session.set('loaded', true);
    console.log('here');
  }, prepareTracks, true);
};

var getMe = function() {
  if(!madeTracks) {
    madeTracks = true;
    Meteor.call("getAccessToken", function(err, res) { access_token = res });
    Meteor.call("getMe", function(error, me) {
      getTracks(me);
      // getPlaylists();       
      // getFollowedArtists(me);
    });
  }
};

var splitData = function(artist, data) {
  return prepareTracks(extractSongsAndPlaylists(data), true, artist.avatar_url);
};

var getArtistPlaylists = function(artist) {
  getResource("Playlists", artist, 'playlist_count', _.bind(setArt, this, artist));
};

var getFavorites = function(artist) {                
  getResource("Favorites", artist, 'public_favorites_count', _.bind(splitData, this, artist));
};

var getArtistTracks = function(artist) {
  getResource("Tracks", artist, 'track_count', _.bind(splitData, this, artist));
};

var loadArtist = function(id, resource) {
  var currentArtist = Session.get('currentArtist');
  Session.set("loaded", false);
  console.log('here');

  if(currentArtist && currentArtist.id == id) {
    if(resource === "favorites") 
      return getFavorites(currentArtist);
    else if(resource === "playlists")
      return getArtistPlaylists(currentArtist);
    else
      return getArtistTracks(currentArtist);
  }

  Meteor.call("getArtist", id, function(error, info) {    
    info.big_avatar = (info.avatar_url).replace("large", "t300x300");
    Session.set('currentArtist', info);
    Session.set('artistFavorites', null);
    Session.set('artistTracks', null);

    if(resource === "favorites" || info.track_count === 0)
      getFavorites(info);
    else if(resource === "playlists")
      getArtistPlaylists(info);
    else
      getArtistTracks(info);
  });  
}