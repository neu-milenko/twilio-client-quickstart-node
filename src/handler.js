/* eslint-disable max-len */
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const AccessToken = require('twilio').jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const nameGenerator = require('../name_generator');
const config = require('../config');

const toClient = `client${config.callerId}`;

exports.tokenGenerator = function tokenGenerator() {
  const identity = toClient || nameGenerator();

  const accessToken = new AccessToken(config.accountSid,
      config.apiKey, config.apiSecret);
  accessToken.identity = identity;
  const grant = new VoiceGrant({
    outgoingApplicationSid: config.twimlAppSid,
    incomingAllow: true,
  });
  accessToken.addGrant(grant);

  // Include identity and token in a JSON response
  return {
    identity: identity,
    token: accessToken.toJwt(),
  };
};

exports.voiceResponse = function voiceResponse(req) {
  console.log('/voice');
  console.log(req.body);

  const toNumber = req.body.To;
  const caller = req.body.Caller;

  // Create a TwiML voice response
  const twiml = new VoiceResponse();

  if (toNumber && toNumber !== config.callerId) {
    console.log(`Outbound call to ${toNumber}`);
    // Wrap the phone number or client name in the appropriate TwiML verb
    // if is a valid phone number
    const attr = isAValidPhoneNumber(toNumber) ? 'number' : 'client';

    const dial = twiml.dial({
      callerId: config.callerId,
    });
    dial[attr]({}, toNumber);
  } else {
    console.log(`Incoming call from ${caller}`);

    // Wrap the phone number or client name in the appropriate TwiML verb
    // if is a valid phone number
    const attr = isAValidPhoneNumber(toClient) ? 'number' : 'client';

    const dial = twiml.dial({
      callerId: config.callerId,
      callReason: caller,
    });
    dial[attr]({}, toClient);
  }

  return twiml.toString();
};

exports.smsRequest = function smsRequest(req, res) {
  console.log(req.path);
  console.log(req.body);

  const client = require('twilio')(config.accountSid, config.authToken);

  return client.messages
      .create({
        body: req.body.Message,
        from: config.callerId,
        statusCallback: config.statusHost + '/sms/status',
        to: req.body.To,
      });
};

const SESSION_STATE_COOKIE = 'x-twilio-session-state';

exports.smsResponse = function smsResponse(req, res) {
  console.log(req.path);
  console.log(`cookie: ${req.cookies[SESSION_STATE_COOKIE]}`);

  console.log(req.body);
  const smsCount = parseInt(req.cookies[SESSION_STATE_COOKIE] || '0');

  let message = 'Hello, thanks for the new message.';

  if (smsCount > 0) {
    message = `Hello, (${smsCount + 1}). What do you mean '${req.body.Body}'?`;
  }

  const twiml = new MessagingResponse();
  twiml.message(message);

  res.cookie(SESSION_STATE_COOKIE, smsCount + 1);

  return twiml.toString();
};

exports.smsEmpty = function smsEmpty(req, res) {
  console.log(req.path);
  console.log(`cookie: ${req.cookies[SESSION_STATE_COOKIE]}`);

  console.log(req.body);
  const smsCount = parseInt(req.cookies[SESSION_STATE_COOKIE] || '0');

  const twiml = new MessagingResponse();

  res.cookie(SESSION_STATE_COOKIE, smsCount + 1);

  return twiml.toString();
};

/**
* Checks if the given value is valid as phone number
* @param {Number|String} number
* @return {Boolean}
*/
function isAValidPhoneNumber(number) {
  return /^[\d\+\-\(\) ]+$/.test(number);
}
