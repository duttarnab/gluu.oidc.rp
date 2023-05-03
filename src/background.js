'use strict';
const fetch = require('node-fetch');

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
   if (request.type == "register_click_event") {
      console.log("click event captured in current webpage");
      // Call the callback passed to chrome.action.onClicked

      getOpenidConfiguration(request.issuer).then(openapiConfig => {

         if (openapiConfig != undefined) {
            try {
               JSON.parse(openapiConfig)
            } catch (err) {
               console.error(err)
               sendResponse({ result: "error", message: "Error in registration!" });
            }
            chrome.storage.local.set({ opConfiguration: openapiConfig }).then(() => {
               console.log("openapiConfig is set to " + openapiConfig);
            });

            const registrationUrl = JSON.parse(openapiConfig).registration_endpoint

            registerOIDCClient(registrationUrl, request.registerObj).then(registrationResp => {

               if (registrationResp != undefined) {

                  chrome.storage.local.set({
                     oidcClient: {
                        'op_host': request.issuer,
                        'client_id': registrationResp.client_id,
                        'client_secret': registrationResp.client_secret,
                        'scope': request.registerObj.scope,
                        'redirect_uri': request.registerObj.redirect_uris,
                        'acr_values': request.registerObj.default_acr_values,
                        'authorization_endpoint': JSON.parse(openapiConfig).authorization_endpoint,
                        'response_type': request.registerObj.response_types,
                        'additionalParams': request.registerObj.additionalParam,
                        'post_logout_redirect_uris': request.registerObj.post_logout_redirect_uri,

                     }
                  }).then(async () => {
                     console.log("oidcClient is set for client_id: " + registrationResp.client_id);
                     sendResponse({ result: "success", message: "Regstration successful!" });

                  });
                  console.log('OIDC client registered successfully!')

               } else {
                  sendResponse({ result: "error", message: "Error in registration!" });
               }
            });
         } else {
            sendResponse({ result: "error", message: "Error in registration!" });
         }
      });
      return true;
      console.log("click event captured in current webpage...end");
      //chrome.windows.create({url: "https://admin-ui-test.gluu.org/jans-auth/authorize.htm?scope=openid+profile+user_name+email&acr_values=basic&response_type=code&redirect_uri=https%3A%2F%2Fadmin-ui-test.gluu.org%2Fadmin&state=07adc860-5ce8-4516-a15f-65f8c5b9a882&nonce=bf92bede-c1c4-43da-9cb0-83b14ecdb467&client_id=2001.bfd15f73-96cf-4ac7-a066-32c78d516c16",focused: true, incognito: true});
   }
});


async function registerOIDCClient(registration_endpoint, registerObj) {
   try {
      const response = await fetch(registration_endpoint, {
         method: "POST", // *GET, POST, PUT, DELETE, etc.
         mode: "cors", // no-cors, *cors, same-origin
         cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
         credentials: "same-origin", // include, *same-origin, omit
         headers: {
            "Content-Type": "application/json"
         },
         redirect: "follow", // manual, *follow, error
         referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
         body: JSON.stringify(registerObj), // body data type must match "Content-Type" header
      });
      return await response.json();

   } catch (err) {
      console.error(err)
   }

}

async function getOpenidConfiguration(issuer) {
   try {

      const endpoint = issuer + '/.well-known/openid-configuration';
      const res = await fetch(endpoint);
      return await res.text();
   } catch (err) {
      console.error(err)
   }

}

//browserify -r C:/Projects/gluu.oidc.rp/src/index.js > ./src/node-bundle.js