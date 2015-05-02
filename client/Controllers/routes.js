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

Router.map(function() {
  this.route('app', {
    path: '/',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      getMe();
      this.next();
      //setTracks(this);
    },
    yieldTemplates: {
      'myInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('myFavorites', {
    path: '/favorites',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      setTracks(this);
    },
    yieldTemplates: {
      'myInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('myPlaylists', {
    path: '/likedPlaylists',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      var playlists = Session.get('likedPlaylists');
      $('#my-playlists').addClass('active').siblings().removeClass('active');
      Session.set('loaded', false);
      if(playlists) {
        Session.set('tracks', playlists); 
        Session.set('loaded', true);
      } else
        getLikePlaylists();
      this.next();
    },
    yieldTemplates: {
      'myInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('artist', {
    path: '/artist/:_id',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id);
      this.next();
    },
    yieldTemplates: {
      'artistInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('artistFavorites', {
    path: '/artist/:_id/favorites',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id, 'favorites');
      this.next();
    },
    yieldTemplates: {
      'artistInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('artistTracks', {
    path: '/artist/:_id/tracks',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id);
      this.next();
    },
    yieldTemplates: {
      'artistInfo': {to: 'userTrackChooser'}
    }
  });

  this.route('artistPlaylists', {
    path: '/artist/:_id/playlists',
    layoutTemplate: 'trackLayout',
    template: 'trackList',
    onBeforeAction: function() {
      loadArtist(this.params._id, 'playlists');
      this.next();
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
      if(Meteor.user())
        Router.go('/');
      this.next();
    }
  });

  this.route('findNewArtists', {
    path: '/findNewArtists',
    layoutTemplate: 'trackLayout',
    template: 'findNewArtistsList',
    onBeforeAction: function() {
      Session.set('loadingText', "");
      var me = Session.get('me');

      if (compilingArtist == false) {
        Session.set('loaded', false);
        if (me != null) {
          compileArtists(me);
        } else {
          Meteor.call('getMe', function(error, me) {
            Session.set('me', me);
            compileArtists(me);
          });
        }
      }
      
      this.next();
    },
    yieldTemplates: {
      'myInfo': {to: 'userTrackChooser'}
    }
  });
});

var compilingArtist = false;

var updateArtistCount = function(artists) {
  Session.set('loadingText', "Got " + artists.length + " artists of " + Session.get("me").followings_count);
};

var compileArtists = function(me) {
  compilingArtist = true;
  var artists = Session.get('artists');
  if(artists === null) // get all the artists first
    getAll('getArtists', Math.ceil(me.followings_count / 200), function(artists) {
      Session.set('artists', artists);
      compileArtistFollowings(artists);
    }, null, false, updateArtistCount);
  else
    compileArtistFollowings(artists)
}

var setTracks = function(that) {
  var tracks = Session.get('origTracks');
  Session.set('loaded', false);

  $('#my-tracks').addClass('active').siblings().removeClass('active');

  if (Session.get('me') == null)
    Meteor.call('getMe', function(error, me) {
      Session.set('me', me);
      if(tracks)
        Session.set('tracks', setPlayingToCurrent(tracks));
      else
        getTracks(me);
    });
  else
    Session.set('tracks', setPlayingToCurrent(tracks));

  Session.set('loaded', true);
  that.next();
};

var compileArtistFollowings = function(artists) {
   //now we compile a list of all the people they follow
   var allArtistFollowings = [];
   var getThisMany = artists.length;

   for (var j = 0; j < getThisMany; j++) {
      var artist = artists[j];
      var calls = Math.ceil(artist.followings_count / 200);
      for(var i = 0; i < calls; i++) {
          Meteor.call('getArtistFollowing', artist, i, j, calls, function(error, data){
            Session.set('loadingText', "Geting " + data["artist"].username + " following list.");
            allArtistFollowings = updateFollowingCount(allArtistFollowings, data["data"]);

            if (data["index"] === data["calls"] - 1 && ((data["artistIndex"] == getThisMany - 1) || (artists[parseInt(data["artistIndex"]) + 1].followings_count == 0 && data["artistIndex"] + 1 == getThisMany - 1))) {
              Session.set('loaded', true);
              printList(allArtistFollowings);
            }
          });
      }
   }
}

var updateFollowingCount = function(currentCounts, artists) {
  console.log(artists.length);
  for (var i = 0; i < artists.length; i++) {
    var index = findArtistIndex(currentCounts, artists[i]);
    if (index == -1) {
      currentCounts = addCounter(currentCounts, artists[i]);
    } else {
      currentCounts[index].counter++;
    }
  }

  return currentCounts;
}

var printList = function(currentCounts) {
  currentCounts.sort(function(a, b){
      return a.counter > b.counter;
  });

  console.log("UserName : Count");
  for (var i = 0; i < currentCounts.length; i++) {
    console.log(currentCounts[i].username + " : " + currentCounts[i].counter);
  }
}

var addCounter = function(currentCounts, artist) {
  var newCounter = artist;
  newCounter.counter = 1;
  currentCounts.push(newCounter)

  return currentCounts; 
}

var findArtistIndex = function(currentCounts, artist) {
  for (var i = 0; i < currentCounts.length; i++) {
    if (currentCounts[i].id == artist.id) {
      return i;
    }
  }

  return -1; 
}

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

var getResource = function(type, artist, resourceCount, processFunc) {
  var currentData = Session.get('artist' + type);

  $('#artist-' + type.toLowerCase()).addClass('active').siblings().removeClass('active');

  if(currentData) {
    Session.set('tracks', setPlayingToCurrent(currentData));
    return Session.set('loaded', true);
  }

  Session.set('loaded', false);
  for(var i = 0; i < Math.ceil(artist[resourceCount] / 200); i++) {
    Meteor.call('getArtist' + type, artist.id, function(error, data) {
      data  = setPlayingToCurrent(processFunc(data));
      Session.set('tracks', data);
      Session.set('artist' + type, data);
      if(i === Math.ceil(artist[resourceCount] / 200)) 
        Session.set('loaded', true);
    });
  }
  if(artist[resourceCount] < 1) {
    toastr.error('User has no' + type + '!');
    Session.set('loaded', true);
  }
};

getAll = function(path, calls, callback, prepFunction, updateFunction, loaderText) {
  var args = Array.prototype.slice.apply(arguments);
  var collection = [];

  for(var i = 0; i < calls; i++) {
    Meteor.call(path, i, function(error, data){
      var index = data["index"];
      if(prepFunction)
        collection = collection.concat(prepFunction(data["data"], args[args.length]));
      else
        collection = collection.concat(data["data"]);

      if (loaderText) 
        loaderText(collection)

      if (index === calls - 1) {
        Session.set('loaded', updateFunction);
        return callback(collection);
      }
    });
  }
};

var updateTrackCount = function(tracks) {
  Session.set('loadingText', "Got " + tracks.length + " tracks of " + Session.get("me").public_favorites_count);
};

var getLikePlaylists = function() {
  Meteor.call('getLikedPlaylists', function(err, playlist) {
    var playlists = setArt(playlist.artwork_url, extractSongsAndPlaylists(playlist));
    Session.set('likedPlaylists', playlists);
    Session.set('tracks', playlists); 
    Session.set('loaded', true);
  });
};

var getTracks = function (me) {
  getAll('getFavorites', Math.ceil(me.public_favorites_count / 200), function(tracks) {
    Session.set('tracks', tracks);
    Session.set('origTracks', tracks);    
  }, prepareTracks, true, updateTrackCount);
};

var getMe = function() {
  if(!madeTracks) {
    madeTracks = true;
    Meteor.call('getMe', function(error, me) {
      Session.set('me', me);
      getTracks(me);
       
    });
  }
};

var splitData = function(artist, data) {
  return prepareTracks(extractSongsAndPlaylists(data), true, artist.avatar_url);
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
  Session.set('loaded', false);
  console.log('here');

  if(currentArtist && currentArtist.id == id) {
    if(resource === 'favorites') 
      return getFavorites(currentArtist);
    else if(resource === 'playlists')
      return getArtistPlaylists(currentArtist);
    else
      return getArtistTracks(currentArtist);
  }

  Meteor.call('getArtist', id, function(error, info) {    
    info.big_avatar = (info.avatar_url).replace('large', 't300x300');
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