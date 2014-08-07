if (Meteor.isClient) {
   Meteor.startup(function() {
      Session.set("queue", []);
      Session.set("playlistMode", true);
       Mousetrap.bind('q', function() { Session.set("playlistMode", false);});
       Mousetrap.bind('p', function() {
          $("#playlists").css('visibility', 'visible');
          Session.set("playlistMode", true);});
   });

   var queueOn = false, addToPlaylistQueue = [], accessTokenS, currentTrack = null, qIndex = 0, tIndex = 0, currentTrackId, madeTracks = false, sortUploader = false, sortArtist = false;

   Template.app.create = function() {
      Meteor.loginWithSoundcloud({

      }, function (err) {
           if (err)
             Session.set('errorMessage', err.reason || 'Unknown error');
         });
   };

  Template.app.loggedIn = function () {
   // update user's profile description
      if(Meteor.user()) {
         getTracks();
         madeTracks = true;
         Session.set("favoritesView", true);
         return true;
      }
      else
         return false;
  };

  Template.app.artist = function () {
   // update user's profile description
      return sortArtist;
  };

  Template.app.uploader = function () {
   // update user's profile description
      return sortUploader;
  };

  var getArtist = function(tracks) {
     for(var i = 0; i < tracks.length; i++)  {
        tracks[i].playstatus = "notplaying";
        if(tracks[i].title.indexOf(tracks[i].user.username) === -1 && tracks[i].title.indexOf('-') > -1) {
           var checkValid = parseInt(tracks[i].title.substr(0, tracks[i].title.indexOf('-'))) || 0;
           if(checkValid > 0) {
              tracks[i].artist = tracks[i].title.substr(tracks[i].title.indexOf('-') + 1, tracks[i].title.substr(tracks[i].title.indexOf('-') + 1, tracks[i].title.length).indexOf('-'));
              if(tracks[i].artist == "")
                 tracks[i].artist = tracks[i].title.substr(0, tracks[i].title.indexOf('-'));
           } else
              tracks[i].artist = tracks[i].title.substr(0, tracks[i].title.indexOf('-'));
           tracks[i].titleWithoutArtist = tracks[i].title.substr(tracks[i].title.indexOf('-') + 1, tracks[i].title.length);
        } else {
           if(tracks[i].title.indexOf('-') > -1 && tracks[i].user.username.localeCompare(tracks[i].title.substr(0, tracks[i].title.indexOf('-') - 1)) == 0)
              tracks[i].titleWithoutArtist = tracks[i].title.substr(tracks[i].title.indexOf('-') + 1, tracks[i].title.length);
           else
              tracks[i].titleWithoutArtist = tracks[i].title;
           tracks[i].artist = tracks[i].user.username;
        }
     }

     return tracks;
  }

   var getTracks = function () {
      // update user's profile description
         var tracks = [], offset = 0;
         if(!madeTracks)
            Meteor.call("getAccessToken", function(error, accessToken){
                accessTokenS = accessToken;
                Meteor.call("getMe", accessToken, function(error, me) {
                   for(var i = 0; i < Math.ceil(me.public_favorites_count / 200); i++) {
                      Meteor.call("getFavorites", accessToken, i, function(error, favorites) {
                        i += favorites.length;
                        tracks.push.apply(tracks, getArtist(indexTracks(favorites, tracks.length)));
                        Session.set("tracks", tracks);
                        Session.set("origTracks", tracks);
                      });
                   }
                   Meteor.call("getPlaylists", accessToken, function(error, playlists) {
                     $("#loadingTracks").hide();
                     Session.set("playlists", playlists);
                     Session.set("playlistChange", false);
                   });
                });
            })
     };

   var indexTracks = function(tracksToIndex) {
      for(var i = 0; i < tracksToIndex.length; i++)
        tracksToIndex[i].index = tIndex++;

      return tracksToIndex;
   }

  Template.app.tracks = function () {
   // update user's profile description
   SC.initialize({
     client_id: '51c5ebff845639af50314b134ae1e904',
     redirect_uri: 'http://localhost:3000/_oauth/soundcloud?close',
     access_token: accessTokenS
   });
   $("#ui").css('visibility', 'visible');
   return Session.get("tracks");
  };

  Template.app.playlists = function () {
   // update user's profile description
   if(Session.get("playlistChange"))
      Session.set("playlistChange", false);
   return Session.get("playlists");
  };

  Template.app.favorites = function () {
   // update user's profile description
   return Session.get("favoritesView");
  };

  Template.app.playlistMode = function () {
   // update user's profile description
   return Session.get("playlistMode");
  };

  Template.app.queue = function () {
   // update user's profile description
   return Session.get("queue");
  };

  Template.app.titleDoesNotContainUsername = function (title, username) {
   // update user's profile description
      if(title.indexOf(username) == -1)
         return true;
      else
         return false;
  };

  var shuffle = function(array) {
     var currentIndex = array.length, temporaryValue, randomIndex;

     // While there remain elements to shuffle...
     while (0 !== currentIndex) {
       // Pick a remaining element...
       randomIndex = Math.floor(Math.random() * currentIndex);
       currentIndex -= 1;
       // And swap it with the current element.
       temporaryValue = array[currentIndex];
       array[currentIndex] = array[randomIndex];
       array[randomIndex] = temporaryValue;
     }

     return array;
   }

   var getIds = function(tracks) {
      var ret = [];
      for(var i = 0; i < tracks.length; i++)
         ret.push({id: tracks[i].id});

      return ret;
   };

  Template.app.events = ({
   // update user's profile description
      'click .trackItem' : function(event) {
         var tracks = Session.get("tracks");
         var node;
         queueOn = false;
         if(event.target.classList[0] === "trackItem")
            node = event.target;
         else
            node = event.target.parentNode;
         if(event.altKey) {
            tracks[$("#" + node.id)[0].classList[3]].playstatus = "selected";
            Session.set("tracks", tracks);
            addToPlaylistQueue.push({id: node.id});
         } else if (event.shiftKey) {
            var queue = Session.get("queue");
            var track = Session.get("tracks")[$("#" + node.id)[0].classList[3]];
            track.queueIndex = qIndex++;
            queue.push(track);
            Session.set("queue", queue);
         } else {
            if(currentTrack) {
               currentTrack.stop();
               $("#" + currentTrackId)[0].children[2].remove();
               if($("#" + currentTrackId).length)
                  tracks[$("#" + currentTrackId)[0].classList[3]].playstatus = "notplaying";
            }
            tracks[$("#" + node.id)[0].classList[3]].playstatus = "playing";
            Session.set("tracks", tracks);

            SC.get("/tracks/" + node.id, function(track){
               var waveform = new Waveform({
                container: document.getElementById(node.id),
                innerColor: "#333"
              });
                waveform.dataFromSoundCloudTrack(track);
                var streamOptions = waveform.optionsForSyncedStream();
                streamOptions.onfinish = function() {
                   $("#" + node.id)[0].children[2].remove();
                   playNextTrack();
                };
               sound = SC.stream("/tracks/" + node.id,
                                 streamOptions,
                                 function(sound){
                                    currentTrack = sound;
                                    currentTrackId = node.id;
                                    currentTrack.play({onload: function() {
                                                         if(this.readyState == 2)
                                                            playNextTrack();
                                                      }})
                                 });
            });
         }
      },
      'change #sBU' : function(event) {
         if(!sortUploader) {
            var tracks = Session.get("tracks");
            if(sortArtist) {
               $(".sortByArtist").prop('checked', false);
               sortArtist = false;
            }
            tIndex = 0;
            madeTracks = false;
            Session.set("tracks",indexTracks(tracks.sort(function(a, b){
                                       // console.log(a.user.username);
                                       // console.log(b.user.username);
                                       return (a.user.username).localeCompare(b.user.username);
                                    })));
            madeTracks = true;

         } else {
            Session.set("tracks", Session.get("origTracks"));
         }
         sortUploader = !sortUploader;
      },
      'change #sBA' : function(event) {
         if(!sortArtist) {
            var tracks = Session.get("tracks");
            if(sortUploader) {
               $(".sortByName").prop('checked', false);
               sortUploader = false;
            }
            tIndex = 0;
            madeTracks = false;
            Session.set("tracks",indexTracks(tracks.sort(function(a, b){
                                       // console.log(a.user.username);
                                       // console.log(b.user.username);
                                       return (a.artist).localeCompare(b.artist);
                                    })));
            madeTracks = true;
         } else {
            Session.set("tracks", Session.get("origTracks"));
         }
         sortArtist = !sortArtist;
      },
      'click #shuffle' : function() {
         tIndex = 0;
         $(".sortByName").prop('checked', false);
         $(".sortByArtist").prop('checked', false);
         Session.set("tracks", indexTracks(shuffle(Session.get("tracks"))));
      },
      'click #reset' : function() {
         $(".sortByName").prop('checked', false);
         $(".sortByArtist").prop('checked', false);
         Session.set("tracks", Session.get("origTracks"));
      },
      'keyup' : function(event) {
         console.log(event);
      },
      'click #newPlaylistSubmit' : function() {
      SC.connect(function() {
           var tracks = [22448500, 21928809].map(function(id) { return { id: id } });
           SC.put('/playlists', {
             playlist: { title: 'My Playlist', tracks: tracks }
           });
       });
      },
      'click .playlistRow' : function(event) {
           console.log(event.target.id);
           if(addToPlaylistQueue < 1) {
              if(event.target.id.localeCompare("favorites") === 0) {
                 var tracks =  Session.get("origTracks");
                 for(var i = 0; i < tracks.length; i++)
                    if(parseInt(tracks[i].id) === parseInt(currentTrackId))
                       tracks[i].playstatus = "playing";
                 Session.set("tracks", tracks);
             } else {
                 tIndex = 0;
                 SC.get('/playlists/' + event.target.id, function(playlist) {
                    var tracks = getArtist(indexTracks(playlist.tracks));
                    for(var i = 0; i < tracks.length; i++) {
                       if(parseInt(tracks[i].id) === parseInt(currentTrackId))
                          tracks[i].playstatus = "playing";
                   }
                    Session.set("tracks", tracks);
                  });
               }


           } else {
            SC.get('/me/playlists/' + event.target.id, function(playlist) {
               var oldTracks = getIds(playlist.tracks), tracks = Session.get("tracks");
               oldTracks.push.apply(oldTracks, addToPlaylistQueue);
               console.log($("#" + addToPlaylistQueue[0].id));
               for(var i = 0; i < addToPlaylistQueue.length; i++)
                  tracks[parseInt($("#" + addToPlaylistQueue[i].id)[0].classList[3])].playstatus = "notplaying";
               addToPlaylistQueue = [];
               Session.set("tracks", tracks);
                SC.put('/me/playlists/' + event.target.id, { playlist: { tracks: oldTracks } }, function(playlist) {
                   console.log(playlist);
                });
           });
           $("#" + event.target.id).addClass("selected");
           setTimeout(function(){
              $("#" + event.target.id).removeClass("selected");
              setTimeout(function(){
                 $("#" + event.target.id).addClass("selected");
                 setTimeout(function(){
                    $("#" + event.target.id).removeClass("selected");
                 }, 200);
              }, 200);
           }, 200);
        }
     },
     'click .queueRow' : function(event) {
        var queue = Session.get("queue");
        var tracks = Session.get("tracks");
        var id = event.target.id.substr(0, event.target.id.indexOf("-"));
        if(currentTrackId > -1 && !queueOn) {
           currentTrack.stop();
           $("#" + currentTrackId)[0].children[2].remove();
           tracks[$("#" + currentTrackId)[0].classList[3]].playstatus = "notplaying";
        } else if(queueOn) {
           queue[$("#" + currentTrackId + "-queue")[0].classList[1]].qplaystatus = "notplaying";
        }
        console.log(event);
        queue[event.target.classList[1]].qplaystatus = "playing";
        Session.set("queue", queue);
        Session.set("tracks", tracks);
        sound = SC.stream("/tracks/" + id,
                          {onfinish: function() {
                             playNextTrack();
                          }},function(sound){
                             currentTrack = sound;
                             currentTrackId = id;
                             queueOn = true;
                             currentTrack.play({onload: function() {
                                                  if(this.readyState == 2)
                                                     playNextTrack();
                                               }})
                          });
     },
  });

  var playNextTrack = function() {
     var stream, tracks, nextIndex, currentIndex, nextToPlay, nextId;
     if(!queueOn) {
        tracks = Session.get("tracks");
        currentIndex = parseInt($("#" + currentTrackId)[0].classList[3]);
        nextToPlay = currentIndex + 1;
        if(nextToPlay === tracks.length)
          nextToPlay = 0;
        tracks[currentIndex].playstatus = "notplaying";
        tracks[nextToPlay].playstatus = "playing";
        nextId = tracks[nextToPlay].id;
        Session.set("tracks", tracks);
     } else {
        tracks = Session.get("queue");
        currentIndex = parseInt($("#" + currentTrackId + "-queue")[0].classList[1]);
        nextToPlay = currentIndex + 1;
        if(nextToPlay === tracks.length) {
           tracks[currentIndex].qplaystatus = "notplaying";
           stream = Session.get("tracks");
           stream[0].playstatus = "playing";
           nextId = stream[0].id;
           queueOn = false;
           Session.set("tracks", stream);
        } else {
          tracks[currentIndex].qplaystatus = "notplaying";
          tracks[nextToPlay].qplaystatus = "playing";
          nextId = tracks[nextToPlay].id;
        }
        Session.set("queue", tracks);
     }
     SC.get("/tracks/" + nextId, function(track){
        var streamOptions, waveform;
        if(!queueOn) {
           waveform = new Waveform({
              container: document.getElementById(nextId),
              innerColor: "#333"
             });
           waveform.dataFromSoundCloudTrack(track);
           streamOptions = waveform.optionsForSyncedStream();
           streamOptions.onfinish = function() {
               $("#" + nextId)[0].children[2].remove();
               playNextTrack();
           };
        } else {
           streamOptions.onfinish = function() {
               $("#" + nextId)[0].children[2].remove();
               playNextTrack();
           };
        }

        sound = SC.stream("/tracks/" + nextId,
                          streamOptions,
                          function(sound){
                            currentTrack = sound;
                            currentTrackId = nextId;
                            currentTrack.play({onload: function() {
                                                 if(this.readyState == 2)
                                                    playNextTrack();
                                              }})
                          });
      });
  };

  Accounts.ui.config({
     requestPermissions: {
        soundcloud: []
     },
     passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
   });

   Meteor.Router.add({
     '/callback.html': 'callback',
     '/': 'app',
     '*': 'not_found'
   });

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });

  Meteor.methods({
     getAccessToken : function() {
       try {
         return Meteor.user().services.soundcloud.accessToken;
       } catch(e) {
         return null;
       }
    },
    getMe : function(accessToken) {
       try {                                                                                            // 53
         return Meteor.http.get("https://api.soundcloud.com/me", {                                      // 54
           params: {                                                                                    // 55
             oauth_token: accessToken,                                                                  // 56
             format: "json"                                                                             // 57
           }                                                                                            // 58
         }).data;                                                                                       // 59
       } catch (err) {                                                                                  // 60
         throw new Error("Failed to fetch identity from Soundcloud. " + err.message);                   // 61
       }
    },
    getFavorites : function(accessToken, offset) {
       try {                                                                                            // 53
         return Meteor.http.get("https://api.soundcloud.com/me/favorites", {                                      // 54
          params: {                                                                                    // 55
             oauth_token: accessToken,                                                                  // 56
             format: "json" ,
             limit: 200,
             offset: offset * 200                                                                            // 57
          }                                                                                            // 58
         }).data;                                                                                       // 59
       } catch (err) {                                                                                  // 60
         throw new Error("Failed to fetch identity from Soundcloud. " + err.message);                   // 61
       }
    },
    getPlaylists : function(accessToken) {
       try {                                                                                            // 53
         return Meteor.http.get("https://api.soundcloud.com/me/playlists", {                                      // 54
          params: {                                                                                    // 55
             oauth_token: accessToken,                                                                  // 56
             format: "json"                                                                     // 57
          }                                                                                            // 58
         }).data;                                                                                       // 59
       } catch (err) {                                                                                  // 60
         throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   // 61
       }
    }
   });
}
