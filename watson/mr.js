/**
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {
  var cfenv = require('cfenv');    

  var services = cfenv.getAppEnv().services, 
    service;

  if (services.message_resonance) service = services.message_resonance[0];

  if (service) {
    var cred = service.credentials;
    var username = cred.username;
    var password = cred.password;

    var watson = require('watson-developer-cloud');

    var message_resonance = watson.message_resonance({
      username: username,
      password: password,
      version: 'v1'
    });

    message_resonance.datasets({}, function (err, response) {
      if (err) {
        console.log(err);
      } else {
        RED.httpAdmin.get('/watson-message-resonance/vcap', function (req, res) {
          res.json(response);
        });
      }
    });
  } else {
    RED.httpAdmin.get('/watson-message-resonance/vcap', function (req, res) {
      res.json(service);
    });
  }

  function Node (config) {
    RED.nodes.createNode(this, config);
    var node = this;

    if (!service) {
      node.error('No message resonance service bound');
    } else {
      this.on('input', function (msg) {
        msg.dataset = config.dataset;

        if (msg.dataset == "") {                    
          node.warn('Dataset passed in on msg.dataset is invalid: message not analysed.');
          node.send(msg);
          return;
        }

        message_resonance.resonance({text: msg.payload, dataset: msg.dataset }, function (err, response) {
          if (err) {
            node.error(err);
            node.send(msg);
            return;
          }

          msg.resonance = response.resonances;
          node.send(msg);
        });
      });
    }
  }
  RED.nodes.registerType('watson-message-resonance',Node);
};
