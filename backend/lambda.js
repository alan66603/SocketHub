// AWS Lambda entry point: wraps the Express app with serverless-http.
const serverless = require("serverless-http");
const { app, connectDB } = require("./server");

// serverless-http hands Express the raw body as a Buffer on req.body, which
// Express 5's express.json() skips (it never sees a stream to read). Parse
// JSON here so controllers get a plain object, same as under app.listen().
const expressHandler = serverless(app, {
  request(req) {
    if (!Buffer.isBuffer(req.body)) return;
    if (!/json/i.test(req.headers["content-type"] || "")) return;
    try {
      req.body = req.body.length ? JSON.parse(req.body.toString("utf8")) : {};
    } catch {
      req.body = {}; // malformed JSON -> controllers' own validation returns 400
    }
    req._body = true; // tell body-parser the body is already parsed
  },
});

exports.handler = async (event, context) => {
  // Return as soon as the response is ready instead of waiting for the
  // MongoDB connection's open sockets to drain.
  context.callbackWaitsForEmptyEventLoop = false;
  await connectDB();
  return expressHandler(event, context);
};
