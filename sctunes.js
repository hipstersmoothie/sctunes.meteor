if (Meteor.isClient) {
   Meteor.startup(function() {
      Session.set("queue", []);
      Session.set("playlistMode", true);
      Session.set("ctTitle", null);
      Session.set("ctUploader", null);
      Session.set("playing", false);
      Mousetrap.bind('q', function() { Session.set("playlistMode", false);});
      Mousetrap.bind('p', function() { 
         $("#playlists").css('visibility', 'visible'); 
         Session.set("playlistMode", true);});
   });
      
   var queueOn = false, 
       addToPlaylistQueue = [], 
       accessTokenS, 
       currentTrack = null, 
       qIndex = 0, tIndex = 0, 
       currentTrackId, 
       madeTracks = false, 
       sortUploader = false, 
       sortArtist = false;
   
   Template.app.create = function() {
      Meteor.loginWithSoundcloud({
      }, function (err) {
         if (err)
            Session.set('errorMessage', err.reason || 'Unknown error');
      });      
   };
   
   Template.app.loggedIn = function () {
      if(Meteor.user()) {
         getTracks();
         $('html, body').css("background", "none");
         madeTracks = true;
         Session.set("favoritesView", true);
         return true;
      }
      else
         return false;
   };
   
   Template.app.artist = function () {
      return sortArtist;
   };
   
   Template.app.currentTrack = function () {
      return Session.get("playing");
   };
   
   Template.app.uploader = function () {
      return sortUploader;
   };
   
   Template.app.ctTitle = function () {
      return Session.get("ctTitle");
   };
   
   Template.app.ctUploader = function () {
      return Session.get("ctUploader");
   };
   
   var getArtist = function(tracks) {
      var keys = Object.keys(tracks);
      for(var i = 0; i < keys.lengt; i++)  {
         tracks[keys[i]].playstatus = "notplaying";
         if(tracks[keys[i]].title.indexOf(tracks[keys[i]].user.username) === -1 && tracks[keys[i]].title.indexOf('-') > -1) {
            var checkValid = parseInt(tracks[keys[i]].title.substr(0, tracks[keys[i]].title.indexOf('-'))) || 0;
            if(checkValid > 0) {
               tracks[keys[i]].artist = tracks[keys[i]].title.substr(tracks[keys[i]].title.indexOf('-') + 1, tracks[keys[i]].title.substr(tracks[keys[i]].title.indexOf('-') + 1, tracks[keys[i]].title.length).indexOf('-'));
               if(tracks[keys[i]].artist == "")
                  tracks[keys[i]].artist = tracks[keys[i]].title.substr(0, tracks[keys[i]].title.indexOf('-'));
            } else
               tracks[keys[i]].artist = tracks[keys[i]].title.substr(0, tracks[keys[i]].title.indexOf('-'));
            tracks[keys[i]].titleWithoutArtist = tracks[keys[i]].title.substr(tracks[keys[i]].title.indexOf('-') + 1, tracks[keys[i]].title.length);
         } else {
            if(tracks[keys[i]].title.indexOf('-') > -1 && tracks[keys[i]].user.username.localeCompare(tracks[keys[i]].title.substr(0, tracks[keys[i]].title.indexOf('-') - 1)) == 0)
               tracks[keys[i]].titleWithoutArtist = tracks[keys[i]].title.substr(tracks[keys[i]].title.indexOf('-') + 1, tracks[keys[i]].title.length);
            else
               tracks[keys[i]].titleWithoutArtist = tracks[keys[i]].title;
            tracks[keys[i]].artist = tracks[keys[i]].user.username;
         }
      }
      return tracks;
   }
   
   var getTracks = function () {
      // update user's profile description
      var tracks = {}, offset = 0;
      if(!madeTracks)
         Meteor.call("getAccessToken", function(error, accessToken){
            accessTokenS = accessToken;
            Meteor.call("getMe", accessToken, function(error, me) {
               console.log(me.id)
               for(var i = 0; i < Math.ceil(me.public_favorites_count / 200); i++) {
                  Meteor.call("getFavorites", accessToken, i, function(error, favorites) {
                     i += favorites.length;
                     var moreTracks = getArtist(indexTracks(favorites));
                     var keys = Object.keys(tracks);
                     console.log(moreTracks);
                     var keys = Object.keys(moreTracks);
                     for (var x = 0; x < keys.length; x++ )
                        tracks[keys[x]] = moreTracks[keys[x]];
                     console.log(tracks);
                     Session.set("tracks", tracks);
                     Session.set("origTracks", tracks);
                  });
               }
               Meteor.call("getPlaylists", accessToken, function(error, playlists) {
                  $("#loadingTracks").hide();
                  $("#ui").css('visibility', 'visible'); 
                  Session.set("playlists", playlists);
                  Session.set("playlistChange", false);
               });
            });
         });
   };
   
   var indexTracks = function(tracksToIndex) {
      tracks = {};
      for(var i = 0; i < tracksToIndex.length; i++) {
         tracksToIndex[i].index = tIndex++;
         tracks[tracksToIndex[i].id] = tracksToIndex[i];
      }
      
      return tracks;
   }
   
   Template.app.tracks = function () {
      SC.initialize({
         client_id: 'fc6924c8838d01597bab5ab42807c4ae',
         redirect_uri: 'http://localhost:3000/_oauth/soundcloud?close',
         access_token: accessTokenS
      });
      var tracks = Session.get("tracks");
      if(tracks) {
         var keys = Object.keys(tracks);
         return keys.map(function(v) { return tracks[v]; });
      } else {
         return [];
      }
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
   
   var streamTrack = function(id, queue) {
      SC.get("/tracks/" + id, function(track){
         $("#currentTrackPlayer").css('visibility', 'visible'); 
         Session.set("ctTitle", track.title);
         Session.set("ctUploader", track.user.username);
         var waveform = new Waveform({
            container: document.getElementById("currentTrackPlayer"),
            innerColor: "#333"
         });
         waveform.dataFromSoundCloudTrack(track);
         var streamOptions = waveform.optionsForSyncedStream();
         streamOptions.onfinish = function() {
            playNextTrack();
         };
         sound = SC.stream("/tracks/" + id, 
                           streamOptions,
                           function(sound){
                              soundManager.stopAll();
                              currentTrack = sound;
                              currentTrackId = id;
                              if(queue)
                                 queueOn = true;
                              currentTrack.play({onload: function() {
                                 if(this.readyState == 2) 
                                    playNextTrack();
                              }})
                           })
         });
   };
   
   Template.app.events = ({
      // update user's profile description
      'click .trackItem' : function(event) {
         var tracks = Session.get("tracks");
         var node;
         Session.set("playing", true);
         if(event.target.classList[0] === "trackItem")
            node = event.target;
         else
            node = event.target.parentNode;
            
         if(event.altKey) {   
            tracks[node.classList[3]].playstatus = "selected";
            Session.set("tracks", tracks);
            addToPlaylistQueue.push({id: node.id});
         } else if (event.shiftKey) {
            $("#" + node.id).addClass("selectedForQueue");
            setTimeout(function(){
               $("#" + node.id).removeClass("selectedForQueue");
               setTimeout(function(){
                  $("#" + node.id).addClass("selectedForQueue");
                  setTimeout(function(){
                     $("#" + node.id).removeClass("selectedForQueue");
                  }, 300);
               }, 300);
            }, 300);
            var queue = Session.get("queue");
            var track = Session.get("tracks")[node.classList[3]];
            track.queueIndex = qIndex++;
            queue.push(track);
            Session.set("queue", queue);
         } else if(node.id === currentTrackId) {
            currentTrack.togglePause();
         } else {
            if(currentTrack) {
               currentTrack.stop();
               $("#currentTrackPlayer")[0].children[2].remove()
               if($("#" + currentTrackId).length)
                  tracks[currentTrackId].playstatus = "notplaying";
               if(queueOn && $("#" + currentTrackId + "-queue").length) {
                  var queue = Session.get("queue");
                  queueOn = false;
                  queue[$("#" + currentTrackId + "-queue")[0].classList[1]].qplaystatus = "notplaying";
                  Session.set("queue", queue);
               }
            }
            console.log(tracks[node.id]);
            tracks[node.id].playstatus = "playing";
            Session.set("tracks", tracks);
            
            streamTrack(node.id, false);
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
            Session.set("tracks",indexTracks(tracks.sort(function(a, b){ 
               return (a.user.username).localeCompare(b.user.username);
            })));
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
            Session.set("tracks",indexTracks(tracks.sort(function(a, b){ 
               return (a.artist).localeCompare(b.artist);
            })));
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
      'click #newPlaylistSubmit' : function() {
         var tracks = [22448500, 21928809].map(function(id) { return { id: id } });
         console.log(tracks);
         SC.post('/playlists', {
            playlist: { title: 'Test', 
            tracks: [{id: 111853048}] }
         });
      },
      'click .playlistRow' : function(event) {
         if(addToPlaylistQueue < 1) {
            if(event.target.id.localeCompare("favorites") === 0) {
               var tracks =  Session.get("origTracks");
               for(var i = 0; i < tracks.length; i++)                    
                  if(tracks[i].id === parseInt(currentTrackId)) {
                     tracks[i].playstatus = "playing";
                     break;
                  }
               
               Session.set("tracks", tracks);
            } else {
               tIndex = 0;
               SC.get('/playlists/' + event.target.id, function(playlist) {
                  var tracks = getArtist(indexTracks(playlist.tracks));
                  for(var i = 0; i < tracks.length; i++)             
                     if(tracks[i].id === parseInt(currentTrackId)) 
                        tracks[i].playstatus = "playing";
                     
                  Session.set("tracks", tracks);
               });
            }   
         } else {
            $("#" + event.target.id).addClass("selected");
            setTimeout(function(){
               $("#" + event.target.id).removeClass("selected");
               setTimeout(function(){
                  $("#" + event.target.id).addClass("selected");
                  setTimeout(function(){
                     $("#" + event.target.id).removeClass("selected");
                  }, 300);
               }, 300);
            }, 300);
            SC.get('/me/playlists/' + event.target.id, function(playlist) {
               var oldTracks = getIds(playlist.tracks), tracks = Session.get("tracks");
               oldTracks.push.apply(oldTracks, addToPlaylistQueue);
               for(var i = 0; i < addToPlaylistQueue.length; i++) 
                  tracks[parseInt($("#" + addToPlaylistQueue[i].id)[0].classList[3])].playstatus = "notplaying";
               addToPlaylistQueue = [];
               Session.set("tracks", tracks);
               SC.put('/me/playlists/' + event.target.id, { playlist: { tracks: oldTracks } }, function(playlist) {});    
            });           
         }
      },
      'click .queueRow' : function(event) {
         var queue = Session.get("queue");
         var tracks = Session.get("tracks");
         var id = event.target.id.substr(0, event.target.id.indexOf("-"));
         if(currentTrackId === id) {
            currentTrack.togglePause();
            return;
         }
         if(currentTrackId > -1) {
            currentTrack.stop();
            $("#currentTrackPlayer")[0].children[2].remove();
            if(!queueOn)
               tracks[$("#" + currentTrackId)[0].classList[3]].playstatus = "notplaying";
            else
               queue[$("#" + currentTrackId + "-queue")[0].classList[1]].qplaystatus = "notplaying";
         }

         queue[event.target.classList[1]].qplaystatus = "playing";
         Session.set("queue", queue);
         Session.set("tracks", tracks);
         
         streamTrack(id, true);
      },
      'click #playpause' : function() {
         currentTrack.togglePause();
      }
   });
   
   var playNextTrack = function() {
      var stream, tracks, nextIndex, currentIndex, nextToPlay, nextId;
      $("#currentTrackPlayer")[0].children[2].remove()
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
      streamTrack(nextId, queueOn);
   };
   
   Accounts.ui.config({
      requestPermissions: {
         soundcloud: [] 
      },
      passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
   });
   
   Meteor.Router.add({
      '/callback.html': 'callback',
      '/': function() {
         if(Meteor.user()) {
            $('html, body').css("background", "none");
            return 'app';
         } else {
            $('html, body').css("background", "darkorange");
            return 'login';
         };
      },
      '*': 'not_found'
   });
   
}
   
   if (Meteor.isServer) {
      Meteor.startup(function () {
         // code to run on server at startup
         //console.log(ServiceConfiguration.configurations.remove({}));
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
