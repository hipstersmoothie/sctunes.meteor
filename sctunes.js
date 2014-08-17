if (Meteor.isClient) {
	Meteor.startup(function() {
		Session.set("queue", []);
		Session.set("playlistMode", true);
		Session.set("ctTitle", null);
		Session.set("ctUploader", null);
		Session.set("ctArt", null);
		Session.set("loaded", false);
		Session.set("playing", false);
		Mousetrap.bind('q', function() { Session.set("playlistMode", false);});
		Mousetrap.bind('p', function() {
			$("#playlists").css('visibility', 'visible');
			Session.set("playlistMode", true);
		});
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
		Meteor.loginWithSoundcloud({}, function (err) {
			if (err)
				 Session.set('errorMessage', err.reason || 'Unknown error');
		});
	};

	/*
		Playlist Mode Functions
	 */

	Template.sidebar.playlistMode = function () {
		// update user's profile description
		return Session.get("playlistMode");
	};


	Template.sidebar.playlists = function () {
		// update user's profile description
		if(Session.get("playlistChange"))
			Session.set("playlistChange", false);
		return Session.get("playlists");
	};  

	var setPlayingToCurrent = function(tracks) {
		for(var i = 0; i < tracks.length; i++)
			if(tracks[i].id === parseInt(currentTrackId)) {
				tracks[i].playstatus = "playing";
				return tracks;
			}
		return tracks;
	};

	var blinkRow = function(id, blinkClass) {
		$("#" + id).addClass(blinkClass);
		setTimeout(function(){
			$("#" + id).removeClass(blinkClass);
			setTimeout(function(){
				$("#" + id).addClass(blinkClass);
				setTimeout(function(){
					$("#" + id).removeClass(blinkClass);
				}, 300);
			}, 300);
		}, 300);
	};

	Template.sidebar.events = ({
		'click #newPlaylistSubmit' : function() {
			 SC.connect(function() {
				 var tracks = [22448500, 21928809].map(function(id) { return { id: id }; });
				 SC.put('/playlists', {
					 playlist: { title: 'My Playlist', tracks: tracks }
				 });
			 });
		},
		'click .playlistRow' : function(event) {
			Session.set("loaded", false);
			if(addToPlaylistQueue < 1) {
				if(event.target.id.localeCompare("favorites") === 0) {
					Session.set("tracks", setPlayingToCurrent(Session.get("origTracks")));
					Session.set("loaded", true);
				} else {
					SC.get('/playlists/' + event.target.id, function(playlist) {
						Session.set("tracks", setPlayingToCurrent(getArtist(indexTracks(playlist.tracks, true))));
						Session.set("loaded", true);
					});
				}
			} else {
				blinkRow(event.target.id, "selected");
				SC.get('/me/playlists/' + event.target.id, function(playlist) {
					var oldTracks = getIds(playlist.tracks), tracks = Session.get("tracks");
					oldTracks.push.apply(oldTracks, addToPlaylistQueue);
					for(var i = 0; i < addToPlaylistQueue.length; i++) 
						tracks[$("#" + addToPlaylistQueue[i].id)[0].classList[3]].playstatus = "notplaying";
					addToPlaylistQueue = [];
				 	Session.set("tracks", tracks);
				 	Session.set("loaded", true);
				 	SC.put('/me/playlists/' + event.target.id, { playlist: { tracks: oldTracks } }, function(playlist) {});    
				});
			}
		},
		 'click .queueRow' : function(event) {
				var queue = Session.get("queue");
				var tracks = Session.get("tracks");
				var id = event.target.id.substr(0, event.target.id.indexOf("-"));
				Session.set("playing", true);
				 if(currentTrackId === id) {
						currentTrack.togglePause();
						return;
				 }
				 if(currentTrackId > -1) {
					 currentTrack.stop();
						$("#currentTrackPlayer")[0].children[0].remove();
						if(!queueOn)
					 tracks[$("#" + currentTrackId)[0].classList[3]].playstatus = "notplaying";
						else
					 queue[$("#" + currentTrackId + "-queue")[0].classList[1]].qplaystatus = "notplaying";
				}

				queue[event.target.classList[1]].qplaystatus = "playing";
				Session.set("queue", queue);
				Session.set("tracks", tracks);
				streamTrack(id, true);
		 }
	});

	/*
		Queue Mode Functions
	 */
	
	Template.sidebar.queue = function () {
		// update user's profile description
		return Session.get("queue");
	};

	/*
		PLayer 
	 */
	
	Template.player.currentTrack = function () {
			return Session.get("playing");
	 };

	Template.player.ctTitle = function () {
			return Session.get("ctTitle");
	};

	Template.player.ctUploader = function () {
	 return Session.get("ctUploader");
	};

	Template.player.ctArt = function () {
	 return Session.get("ctArt");
	};

	Template.player.events = ({
		'click #playpause' : function() {
			 currentTrack.togglePause();
		},
		'click #nextButton' : function() {
			playNextOrPrevTrack(true);
		},
		'click #prevButton' : function() {
			playNextOrPrevTrack(false);
		}
	});

	/*
		App Functions
	 */

	Template.app.loaded = function () {
		return Session.get("loaded");
	};

	Template.app.loggedIn = function () {
			if(Meteor.user()) {
				 getTracks();
				 $('body').css("background", "none");
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
	 
	Template.app.uploader = function () {
			return sortUploader;
	 };
	 
	var getArtist = function(tracks) {
		for(var i = 0; i < tracks.length; i++)  {
			var title = tracks[i].title;
			tracks[i].playstatus = "notplaying";
			if(title.indexOf(tracks[i].user.username) === -1 && tracks[i].title.indexOf('-') > -1) {
				var checkValid = parseInt(title.substr(0, title.indexOf('-'))) || 0;
				if(checkValid > 0) {
					tracks[i].artist = title.substr(title.indexOf('-') + 1, title.substr(title.indexOf('-') + 1, title.length).indexOf('-'));
					if(tracks[i].artist == "")
					tracks[i].artist = title.substr(0, title.indexOf('-'));
				} else
					tracks[i].artist = title.substr(0, title.indexOf('-'));
					tracks[i].titleWithoutArtist = title.substr(title.indexOf('-') + 1, title.length);
			} else {
				if(title.indexOf('-') > -1 && tracks[i].user.username.localeCompare(title.substr(0, title.indexOf('-') - 1)) == 0)
					tracks[i].titleWithoutArtist = title.substr(title.indexOf('-') + 1, title.length);
				else
					tracks[i].titleWithoutArtist = title;
				tracks[i].artist = tracks[i].user.username;
			}
		}
		return tracks;
	};

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
							var moreTracks = getArtist(indexTracks(favorites, false));
							var initializeKeys = tracks ? Object.keys(tracks) : 0;
							var keys = Object.keys(moreTracks);

							for (var x = 0; x < keys.length; x++ ) 
								tracks[x + initializeKeys.length] = moreTracks[keys[x]];
							
							Session.set("tracks", tracks);
							Session.set("origTracks", tracks);
						});
					}
					 Meteor.call("getPlaylists", accessToken, function(error, playlists) {
						console.log('here');
						 Session.set("loaded", true);
						 Session.set("playlists", playlists);
						 Session.set("playlistChange", false);
					 });
					});
			});
	};

	var indexTracks = function(tracksToIndex, newIndex) {
 		if(newIndex)
 			tIndex = 0;

		for(var i = 0; i < tracksToIndex.length; i++) 
			tracksToIndex[i].index = tIndex++;
		
		return tracksToIndex;
	};

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

	Template.app.favorites = function () {
	 // update user's profile description
	 return Session.get("favoritesView");
	};

	Template.app.titleDoesNotContainUsername = function (title, username) {
	 // update user's profile description
			if(title.indexOf(username) == -1)
				 return true;
			else
				 return false;
	};

	var shuffle = function(array) {
		for (var i = array.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = array[i];
				array[i] = array[j];
				array[j] = temp;
		}
		 return indexTracks(array, true);
	 };

	 var getIds = function(tracks) {
			var ret = [];
			for(var i = 0; i < tracks.length; i++)
				 ret.push({id: tracks[i].id});

			return ret;
	 };

	 var streamTrack = function(id, queue) {
			SC.get("/tracks/" + id, function(track){
				 Session.set("currentTrack, ")
				 Session.set("ctTitle", track.title);
				 Session.set("ctUploader", track.user.username);
				 Session.set("ctArt", track.artwork_url);
				 var waveform = new Waveform({
						container: document.getElementById("currentTrackPlayer"),
						innerColor: "#333"
				 });
				 waveform.dataFromSoundCloudTrack(track);
				 var streamOptions = waveform.optionsForSyncedStream();
				 streamOptions.onfinish = function() {
						playNextOrPrevTrack(true);
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
																		playNextOrPrevTrack(true);
															}});
													 });
				 });
	 };
	 
	Template.app.events = ({
	 // update user's profile description
			'click .trackItem' : function(event) {
				 var tracks = Session.get("tracks");
				 var node;
				 if(event.target.classList[0] === "trackItem")
						node = event.target;
				 else
						node = event.target.parentNode;
						
				 if(event.altKey) {
				 		if(tracks[node.classList[3]].playstatus === "selected")
				 			tracks[node.classList[3]].playstatus = "notplaying";
				 		else
							tracks[node.classList[3]].playstatus = "selected";
						Session.set("tracks", tracks);
						addToPlaylistQueue.push({id: node.id});
				 } else if (event.shiftKey) {
				 		blinkRow(node.id, "selectedForQueue");
						var queue = Session.get("queue");
						var track = Session.get("tracks")[node.classList[3]];
						track.queueIndex = qIndex++;
						queue.push(track);
						Session.set("queue", queue);
				 } else if(tracks[node.classList[3]].id === currentTrackId) {
						currentTrack.togglePause();
				 } else {
						Session.set("playing", true);
						if(currentTrack) {
							var currentRow = $("#" + currentTrackId);
							 currentTrack.stop();
							 $("#currentTrackPlayer")[0].children[0].remove();
							 if(currentRow.length)
									tracks[currentRow[0].classList[3]].playstatus = "notplaying";
							 if(queueOn && $("#" + currentTrackId + "-queue").length) {
									var queue = Session.get("queue");
									queueOn = false;
									queue[$("#" + currentTrackId + "-queue")[0].classList[1]].qplaystatus = "notplaying";
									Session.set("queue", queue);
							 }
						}
						tracks[node.classList[3]].playstatus = "playing";
						Session.set("tracks", tracks);
						streamTrack(tracks[node.classList[3]].id, false);
				 }
			},
			'change #sBU' : function(event) {
				 if(!sortUploader) {
						var tracks = Session.get("tracks");
						if(sortArtist) {
							 $(".sortByArtist").prop('checked', false);
							 sortArtist = false;
						}
						Session.set("tracks",indexTracks(tracks.sort(function(a, b){
																			 return (a.user.username).localeCompare(b.user.username);
																		}), true));
				 } else {
						Session.set("tracks", Session.get("origTracks"));
				 }
				 sortUploader = !sortUploader;
			},
			'change #sBA' : function(event) {
				console.log(sortArtist);
				 if(!sortArtist) {
						var tracks = Session.get("tracks");
						if(sortUploader) {
							 $(".sortByName").prop('checked', false);
							 sortUploader = false;
						}
						Session.set("tracks",indexTracks(tracks.sort(function(a, b){
																				console.log(a);
																			 return (a.artist).localeCompare(b.artist);
																		}), true));
				 } else {
						Session.set("tracks", Session.get("origTracks"));
				 }
				 sortArtist = !sortArtist;
			},
			'click #shuffle' : function() {
				 $(".sortByName").prop('checked', false);
				 $(".sortByArtist").prop('checked', false);
				 Session.set("tracks", shuffle(Session.get("tracks")));
			},
			'click #reset' : function() {
				 $(".sortByName").prop('checked', false);
				 $(".sortByArtist").prop('checked', false);
				 Session.set("tracks", Session.get("origTracks"));
			}
	});

	var playNextOrPrevTrack = function(increment) {
		 var stream, tracks, nextIndex, currentIndex, nextToPlay, nextId;
		 $("#currentTrackPlayer")[0].children[0].remove();
		 if(!queueOn) {
				tracks = Session.get("tracks");
				currentIndex = parseInt($("#" + currentTrackId)[0].classList[3]);
				nextToPlay = increment ? currentIndex + 1 : currentIndex - 1;
				if(nextToPlay === tracks.length)
					nextToPlay = 0;
				tracks[currentIndex].playstatus = "notplaying";
				tracks[nextToPlay].playstatus = "playing";
				nextId = tracks[nextToPlay].id;
				Session.set("tracks", tracks);
		 } else {
				tracks = Session.get("queue");
				currentIndex = parseInt($("#" + currentTrackId + "-queue")[0].classList[1]);
				nextToPlay = increment ? currentIndex + 1 : currentIndex - 1;
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
						return 'app';
				 } else {
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
