#!/bin/sh
rm web-code-3000.lock;
npm run build;
npm run build-server;
npm run start -- --DEBUG=1;