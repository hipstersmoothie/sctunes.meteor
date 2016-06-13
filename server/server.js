Meteor.startup(function () {
  ServiceConfiguration.configurations.remove({
    service: "soundCloud"
  });
    ServiceConfiguration.configurations.remove({
    service: "soundcloud"
  });
  if (Meteor.absoluteUrl() == "http://sctunes.meteor.com/") {
    ServiceConfiguration.configurations.upsert(
      { service: "soundCloud" },
      {
        $set: {
          clientId: "51c5ebff845639af50314b134ae1e904",
          loginStyle: "popup",
          secret: "22c194079b86e296a34f613d5b7062a3"
        }
      }
    );
    ServiceConfiguration.configurations.upsert(
      { service: "soundcloud" },
      {
        $set: {
          clientId: "51c5ebff845639af50314b134ae1e904",
          loginStyle: "popup",
          secret: "22c194079b86e296a34f613d5b7062a3"
        }
      }
    );
  } else {
    console.log("local");
    ServiceConfiguration.configurations.upsert(
      { service: "soundCloud" },
      {
        $set: {
          clientId: "628c0d8bc773cd70e1a32d0236cb79ce",
          loginStyle: "popup",
          secret: "602af612bf7810e0134dcc25b0e3fa69"
        }
      }
    );
    ServiceConfiguration.configurations.upsert(
      { service: "soundcloud" },
      {
        $set: {
          clientId: "628c0d8bc773cd70e1a32d0236cb79ce",
          loginStyle: "popup",
          secret: "602af612bf7810e0134dcc25b0e3fa69"
        }
      }
    );
  }
});

Meteor.methods({
  getAccessToken : function() {
    try {
      console.log(Meteor.user().services.soundCloud)
      return Meteor.user().services.soundCloud.accessToken;
    } catch(e) {
      return null;
    }
  },
  getMe : function() {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/me", {                                      
        params: {                                                                                    
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: "json"                                                                             
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
      throw new Error("Failed to fetch identity from Soundcloud. " + err.message);                   
    }
  },
  getFavorites : function(offset) {
    console.log(Meteor.user().services.soundCloud.accessToken )
    try {                                                                                            
      return {
        index : offset,
        data :  Meteor.http.get("https://api.soundcloud.com/me/favorites", {                                      
          params: {                                                                                    
              oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
              format: "json",
              limit: 200,
              offset: offset                                                                             
            }                                                                                            
          }).data
      };
     } catch (err) {                                                                                  
       throw new Error("Failed to fetch identity from Soundcloud. " + err.message);                   
     }
  },
  getLikedPlaylists : function() {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/e1/me/playlist_likes", {                                      
      params: {                                                                                    
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: "json",
          limit: 200
        }                                                                                            
      }).data;                                                                                       
     } catch (err) {                                                                                  
       throw new Error("Failed to fetch identity from Soundcloud. " + err.message);                   
     }
  },
  getPlaylists : function() {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/me/playlists", {                                      
      params: {                                                                                    
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: "json"                                                                     
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtists : function(index) {
    try {                                                                                            
      return {
        index : index,
        data :  Meteor.http.get("https://api.soundcloud.com/me/followings", {                                      
          params: {                                                                                    
              oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
              format: "json",
              limit: 200,
              offset: index * 200                                                                     
            }                                                                                            
          }).data
      };                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtist : function(id) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/users/" + id, {                                      
      params: {                                                                                    
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: "json"
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtistTracks : function(id, index) {
    try {                                                                           
      return Meteor.http.get("https://api.soundcloud.com/e1/users/" + id + "/stream", {                     
      params: {                                                                                    
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: "json",
          limit: 200,
          offset: index * 200 
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtistFavorites : function(id, index) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/e1/users/" + id + "/likes", {                                      
      params: {                                                                                    
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: "json",
          limit: 1000,
          //offset: index * 200 
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtistPlaylists : function(id) {
    try {                                                                                            
      return Meteor.http.get("https://api.soundcloud.com/users/" + id + "/playlists", {                                      
      params: {                                                                                    
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: "json",
          limit: 200,
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  getArtistFollowing : function(artist, index, artistIndex, calls) {
    try {                                                                                            
      return {
        artist : artist,
        index : index,
        artistIndex: artistIndex,
        calls : calls,
        data :  Meteor.http.get("https://api.soundcloud.com/users/" + artist.id + "/followings", {                                      
          params: {                                                                                    
              oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
              format: "json",
              limit: 200,
              offset: index * 200,
            }                                                                                            
          }).data
      };                                                                                             
    } catch (err) {                                                                                  
       throw new Error("Failed to fetch playlists from Soundcloud. " + err.message);                   
    }
  },
  newPlaylist : function(playlist) {
    try {                                                                                            
      return Meteor.http.post("https://api.soundcloud.com/me/playlists", {                                      
      params: {   
          data: playlist,                                                                                 
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: "json"                                                                     
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error("Failed to make playlist on Soundcloud. " + err.message);                   
    }
  }
});