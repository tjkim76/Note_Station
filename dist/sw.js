/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5a5d9309'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "sql-wasm.js",
    "revision": "9b629335d3339b01f5b0b1ff22774d55"
  }, {
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-512x512.png",
    "revision": "ef593e1899bd8f423f7e747439aa1d46"
  }, {
    "url": "pwa-192x192.png",
    "revision": "ef593e1899bd8f423f7e747439aa1d46"
  }, {
    "url": "index.html",
    "revision": "bec478694a9d58837ad6aebcf146f216"
  }, {
    "url": "favicon.ico",
    "revision": "d89746888da2d9510b64a9f031eaecd5"
  }, {
    "url": "assets/upload-COgRW9-f.js",
    "revision": null
  }, {
    "url": "assets/trash-5pbN9doL.js",
    "revision": null
  }, {
    "url": "assets/trash-2-PYgddBW5.js",
    "revision": null
  }, {
    "url": "assets/Sidebar-DB__TDWh.js",
    "revision": null
  }, {
    "url": "assets/search-6T5g-zxl.js",
    "revision": null
  }, {
    "url": "assets/pen-BUdYjEp0.js",
    "revision": null
  }, {
    "url": "assets/NoteList-jtwXDTjp.js",
    "revision": null
  }, {
    "url": "assets/Modals-C6lTkQtm.js",
    "revision": null
  }, {
    "url": "assets/MainEditor-ZgkIHsf0.css",
    "revision": null
  }, {
    "url": "assets/MainEditor-oSFbcZic.js",
    "revision": null
  }, {
    "url": "assets/keyboard-Bf8OWpxA.js",
    "revision": null
  }, {
    "url": "assets/index-CbfCBuWl.js",
    "revision": null
  }, {
    "url": "assets/index-BS-ysbLf.js",
    "revision": null
  }, {
    "url": "assets/index-B5oRhLwC.css",
    "revision": null
  }, {
    "url": "assets/check-JDRjR72W.js",
    "revision": null
  }, {
    "url": "favicon.ico",
    "revision": "d89746888da2d9510b64a9f031eaecd5"
  }, {
    "url": "pwa-192x192.png",
    "revision": "ef593e1899bd8f423f7e747439aa1d46"
  }, {
    "url": "pwa-512x512.png",
    "revision": "ef593e1899bd8f423f7e747439aa1d46"
  }, {
    "url": "manifest.webmanifest",
    "revision": "feaa1fe0bdb910270e23b8746bec0c3b"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
