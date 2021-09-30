const Router = require('express').Router;
const {tokenGenerator,
  voiceResponse,
  smsRequest,
  smsResponse,
  smsEmpty} = require('./handler');

const router = new Router();

const WebSocket = require('ws');

/**
 * Generate a Capability Token for a Twilio Client user - it generates a random
 * username for the client requesting a token.
 */
router.get('/token', (req, res) => {
  res.send(tokenGenerator());
});

router.post('/voice/status', (req, res) => {
  console.log(req.path);
  console.log(req.body);
  router.wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (req.body.CallStatus === 'completed') {
        client.send(`Call completed. Duration ${req.body.CallDuration} sec`);
      }
      else {
        client.send(`Call status ${req.body.CallStatus}`);        
      }
    }
  });
  res.send();
});

router.post('/voice', (req, res) => {
  res.set('Content-Type', 'text/xml');
  res.send(voiceResponse(req));
});

router.post('/sms/reply', (req, res) => {
  router.wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(`Message from ${req.body.From}: ${req.body.Body}`);
    }
  });
  if (req.body.Body.indexOf('?') >= 0)
  {
    res.set('Content-Type', 'text/xml');
    res.send(smsResponse(req, res));
    return;
  }
  res.set('Content-Type', 'text/xml');
  res.send(smsEmpty(req, res));
});

router.post('/sms/status', (req, res) => {
  console.log(req.path);
  console.log(req.body);
  router.wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(`... ${req.body.SmsStatus}`);
    }
  });
  res.sendStatus(200);
});

router.post('/sms', async (req, res) => {
  const message = await smsRequest(req, res);
  console.log(message);
  res.set('Content-Type', 'text/plain');
  res.send(message.sid);
});

router.ws('/', function(ws, _req) {
  ws.on('message', function(msg) {
    console.log(router.wsi);
    ws.send(msg);
  });
});

module.exports = router;
