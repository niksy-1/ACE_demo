'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const twilio = require('twilio');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  console.warn(
    'Missing Twilio env vars. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID.'
  );
}

const client = twilio(accountSid, authToken);

app.post('/api/verify/start', async (req, res) => {
  try {
    const phone = String(req.body.phone || '').trim();
    if (!phone) return res.status(400).json({ error: 'Phone is required' });
    if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
      return res
        .status(400)
        .json({ error: 'Phone must be E.164 like +14155551234' });
    }
    const v = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });
    res.json({ sid: v.sid, status: v.status });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Start verification failed' });
  }
});

app.post('/api/verify/check', async (req, res) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const code = String(req.body.code || '').trim();
    if (!phone || !code)
      return res.status(400).json({ error: 'Phone and code are required' });

    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });
    const approved = check.status === 'approved';
    res.json({ status: check.status, approved });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Check verification failed' });
  }
});

// Serve static files so you can open pages via http://localhost:3000/
const rootDir = path.resolve(__dirname, '..');
app.use(express.static(rootDir));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

