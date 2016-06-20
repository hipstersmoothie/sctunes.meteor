/* global Meteor, ServiceConfiguration */

Meteor.startup(function () {
  let config;

  ServiceConfiguration.configurations.remove({ service: 'soundCloud' });
  ServiceConfiguration.configurations.remove({ service: 'soundcloud' });

  if (Meteor.absoluteUrl() == 'https://sctunes.herokuapp.com/') {
    config = {
      clientId: '51c5ebff845639af50314b134ae1e904',
      loginStyle: 'popup',
      secret: '22c194079b86e296a34f613d5b7062a3'
    }

  } else {
    console.log('local');
    config = {
      clientId: '628c0d8bc773cd70e1a32d0236cb79ce',
      loginStyle: 'popup',
      secret: '602af612bf7810e0134dcc25b0e3fa69'
    }
  }

  ServiceConfiguration.configurations.upsert(
    { service : 'soundCloud' },
    { $set    : config }
  );
  ServiceConfiguration.configurations.upsert(
    { service : 'soundcloud' },
    { $set    : config }
  );
});

Meteor.methods({
  getMe : function() {
    try {                                                                                            
      return Meteor.http.get('https://api.soundcloud.com/me', {                                      
        params: {                                                                                    
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: 'json'                                                                             
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
      throw new Error('Failed to fetch identity from Soundcloud. ' + err.message);                   
    }
  },
  getArtist : function(id) {
    try {                                                                                            
      return Meteor.http.get('https://api.soundcloud.com/users/' + id, {                                      
      params: {                                                                                    
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: 'json'
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error('Failed to fetch playlists from Soundcloud. ' + err.message);                   
    }
  },
  newPlaylist : function(playlist) {
    try {                                                                                            
      return Meteor.http.post('https://api.soundcloud.com/me/playlists', {                                      
      params: {   
          data: playlist,                                                                                 
          oauth_token: Meteor.user().services.soundCloud.accessToken,                                                                  
          format: 'json'                                                                     
        }                                                                                            
      }).data;                                                                                       
    } catch (err) {                                                                                  
       throw new Error('Failed to make playlist on Soundcloud. ' + err.message);                   
    }
  }
});