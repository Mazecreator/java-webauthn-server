(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['base64url'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('base64url'));
  } else {
    root.webauthn = factory(root.base64url);
  }
})(this, function(base64url) {

  /**
   * Add Jackson JSON deserialization type hints to a PublicKeyCredential-like
   * plain object structure.
   */
  function addJacksonDeserializationHints(response) {
    var root = Object.assign({}, response, {
      '@jackson_type': 'com.yubico.webauthn.data.impl.PublicKeyCredential',
    });

    if ('attestationObject' in response.response) {
      return Object.assign({}, root, {
        response: Object.assign({}, response.response, {
          '@jackson_type': 'com.yubico.webauthn.data.impl.AuthenticatorAttestationResponse',
        }),
      });
    } else {
      return Object.assign({}, root, {
        response: Object.assign({}, response.response, {
          '@jackson_type': 'com.yubico.webauthn.data.impl.AuthenticatorAssertionResponse',
        }),
      });
    }
  }

  /**
   * Create a WebAuthn credential.
   *
   * @param request: object - A MakePublicKeyCredentialOptions object, except
   *   where binary values are base64url encoded strings instead of byte arrays
   *
   * @return the Promise returned by `navigator.credentials.create`
   */
  function createCredential(request) {
    var excludeCredentials = request.excludeCredentials.map(function(credential) {
      return Object.assign({}, credential, {
        id: base64url.toByteArray(credential.id),
      });
    });

    var makePublicKeyCredentialOptions = Object.assign(
      {},
      request,
      {
        challenge: base64url.toByteArray(request.challenge),
        excludeCredentials: excludeCredentials,
        excludeList: excludeCredentials, // For Firefox Nightly 57.0a1
        timeout: 10000,
      }
    );

    return navigator.credentials.create({
      publicKey: makePublicKeyCredentialOptions,
    });
  }

  /**
   * Perform a WebAuthn assertion.
   *
   * @param request: object - A PublicKeyCredentialRequestOptions object,
   *   except where binary values are base64url encoded strings instead of byte
   *   arrays
   *
   * @return the Promise returned by `navigator.credentials.get`
   */
  function getAssertion(request) {
    console.log('Get assertion', request);
    var allowCredentials = request.allowCredentials.map(function(credential) {
      return Object.assign({}, credential, {
        id: base64url.toByteArray(credential.id),
      });
    });

    var publicKeyCredentialRequestOptions = Object.assign(
      {},
      request,
      {
        allowCredentials: allowCredentials,
        allowList: allowCredentials,
        challenge: base64url.toByteArray(request.challenge),
        timeout: 10000,
      }
    );

    console.log('publicKeyCredentialRequestOptions', publicKeyCredentialRequestOptions);

    return navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });
  }

  /** Turn a PublicKeyCredential object into a plain object with base64url encoded binary values */
  function responseToObject(response) {
    if (response instanceof PublicKeyCredential) {
      if ('attestationObject' in response.response) {
        return {
          id: response.id,
          response: {
            attestationObject: base64url.fromByteArray(response.response.attestationObject),
            clientDataJSON: base64url.fromByteArray(response.response.clientDataJSON),
          },
        };
      } else if ('signature' in response.response) {
        return {
          id: response.id,
          response: {
            authenticatorData: base64url.fromByteArray(response.response.authenticatorData),
            clientDataJSON: base64url.fromByteArray(response.response.clientDataJSON),
            signature: base64url.fromByteArray(response.response.signature),
          },
        };
      } else {
        throw new Error("Argument.response must be an AuthenticatorAttestationResponse or AuthenticatorAssertionResponse, was: " + (typeof response.response));
      }
    } else {
      throw new Error("Argument must be a PublicKeyCredential, was: " + (typeof response));
    }
  }

  return {
    addJacksonDeserializationHints: addJacksonDeserializationHints,
    createCredential: createCredential,
    getAssertion: getAssertion,
    responseToObject: responseToObject,
  };

});
