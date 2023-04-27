'use strict';

import './popup.css';

(function () {
  
  checkDB();

  function checkDB() {
     chrome.storage.local.get(["oidcClient"]).then((result) => {
        if(result.oidcClient != undefined) {
             console.log("Value currently is " + JSON.stringify(result.oidcClient));
            
             document.getElementById('opHost').value = result.oidcClient.op_host
             document.getElementById('clientId').value = result.oidcClient.client_id
             document.getElementById('clientSecret').value = result.oidcClient.client_secret
  
             document.getElementById('registerForm').style.display = "none";
             document.getElementById('oidcClientDetails').style.display = "block";
        } else {
           document.getElementById('registerForm').style.display = "block";
           document.getElementById('oidcClientDetails').style.display = "none";
        }
     });
  }
     
  async function resetClient() {
     chrome.storage.local.remove(["oidcClient","opConfiguration"],function(){
      var error = chrome.runtime.lastError;
         if (error) {
             console.error(error);
         } else {
            checkDB();
         }
     });
  }
  
  async function trigCodeFlowButton() {
    chrome.storage.local.get(["oidcClient"]).then((result) => {
      if(result.oidcClient != undefined) {
        let authzUrl =  result.oidcClient.authorization_endpoint +
                        '?scope=' + result.oidcClient.scope[0] + 
                        '&acr_values=' + result.oidcClient.acr_values[0] + 
                        '&response_type=' + result.oidcClient.response_type[0] + 
                        '&redirect_uri=' + result.oidcClient.redirect_uri[0] + 
                        '&client_id=' + result.oidcClient.client_id + 
                        '&state=' + uuidv4() + 
                        '&nonce=' + uuidv4();
      
      let additionalParams = result.oidcClient.additionalParams
  
      if(additionalParams != undefined && additionalParams.trim() != '') {
        let additionalParamJSON = JSON.parse(additionalParams)
        Object.keys(additionalParamJSON).forEach(key => {
        
          console.log(key+"~~~"+ additionalParamJSON[key]);
        authzUrl +=  `&${key}=${additionalParamJSON[key]}`
      });
      }                
        chrome.windows.create({url: authzUrl,focused: true, incognito: true});
      }
    });
  }
  function saveExistingClientDetailsInDB() {
   var existingClientId = document.getElementById('existingClientId').value
   var issuer = document.getElementById('issuer').value
   var redirectUri = document.getElementById('redirectUri').value
   var acrValues = document.getElementById('acrValues').value
   var additionalParam = document.getElementById('additionalParam').value
   var scope = document.getElementById('scope').value
   var authzUrl = document.getElementById('authzUrl').value

   chrome.storage.local.set({ 
      oidcClient: {'op_host': issuer,
         'client_id': existingClientId, 
         'client_secret': '----------',
         'scope': [scope],
         'redirect_uri': [redirectUri],
         'acr_values': [acrValues],
         'authorization_endpoint': authzUrl,
         'response_type': ['code'],
         'additionalParams': additionalParam
      }}).then(async () => 
      {
         console.log("oidcClient is set for client_id: " + existingClientId);
         checkDB();

      });
  }
  async function submitForm() {
    
     if (validateForm()) {
     var existingClientId = document.getElementById('existingClientId').value
     if(existingClientId.trim() != '') {
      saveExistingClientDetailsInDB();
        return;
     }
     var issuer = document.getElementById('issuer').value
     var redirectUri = document.getElementById('redirectUri').value
     var acrValues = document.getElementById('acrValues').value
     var additionalParam = document.getElementById('additionalParam').value
     var scope = document.getElementById('scope').value
  
     var registerObj = {}
     registerObj.issuer = issuer
  
     registerObj.redirect_uris =  [redirectUri]
     registerObj.default_acr_values = [acrValues]
     registerObj.additionalParam = additionalParam
     registerObj.scope = [scope]
  
     registerObj.response_types = ['code']
     registerObj.grant_types = ['authorization_code']
     registerObj.application_type = 'web'
     registerObj.client_name = 'Gluu-RP-' + uuidv4()
     registerObj.token_endpoint_auth_method = 'client_secret_post'
    try{
       const response = await register(issuer, registerObj)
   
      if(response.result == 'success') {
              checkDB();
        } else {
              document.getElementById('errorSpanTop').innerHTML = 'Error in registration.'
              document.getElementById('errorSpanBot').innerHTML = 'Error in registration.'
        }
  
     } catch(err) {
        console.error(err)
     }
       
      }
  }
  
  async function register(issuer, registerObj){
     return await new Promise(resolve => {
        chrome.runtime.sendMessage({
           type: "register_click_event",
           issuer: issuer,
           registerObj: registerObj
         },resolve);
        });
  }
  
  
  function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }
  
  function validateForm()  {
     document.getElementById('errorSpanTop').innerHTML = ''
     document.getElementById('errorSpanBot').innerHTML = ''
     var issuer = document.getElementById('issuer').value
     var redirectUri = document.getElementById('redirectUri').value
     var acrValues = document.getElementById('acrValues').value
     var additionalParam = document.getElementById('additionalParam').value
     var scope = document.getElementById('scope').value
  
     var emptyField = ''
     if(issuer.trim() == '') {
        emptyField += 'issuer '
        
     }
     if(redirectUri.trim() == '') {
        emptyField += 'redirect_uri '
        
     }
     if(acrValues.trim() == '') {
        emptyField += 'acr_values '
        
     }   
     if(scope.trim() == '') {
        emptyField += 'scope '
        
     }  
     if(emptyField.trim() != '') {
        document.getElementById('errorSpanTop').innerHTML = '<b>The following fields are mandatory</b>: ' + emptyField
        document.getElementById('errorSpanBot').innerHTML = '<b>The following fields are mandatory</b>: ' + emptyField
        return false;
     }
     return true;
  }
  
  function handleClick() {
   if(document.getElementById('clientExists').checked) {
      document.getElementById('existingClientIdDiv').style.display = "block";
   } else {
      document.getElementById('existingClientIdDiv').style.display = "none";
   }
  }
  
  document.addEventListener('DOMContentLoaded', function () {
     document.getElementById('sbmtButton').addEventListener('click', submitForm);
     document.getElementById('resetButton').addEventListener('click', resetClient);
     document.getElementById('trigCodeFlowButton').addEventListener('click', trigCodeFlowButton);
     document.getElementById('clientExists').addEventListener('click', handleClick);
  });

})();
