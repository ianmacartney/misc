import { httpRouter } from "convex/server";
import { httpAction, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

const http = httpRouter();

// Test endpoint for probing HTTP action payload limits: streams the
// request body straight into Convex file storage without buffering it
// into a JS value first, so we can see how large a payload actually
// makes it through (vs. buffering it as JSON/bytes in memory).
http.route({
  path: "/upload",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const contentLength = req.headers.get("content-length");
    console.log("Incoming upload, content-length:", contentLength);

    try {
      // `req.blob()` streams the request body into a Blob without
      // materializing it as a single ArrayBuffer/string first, and
      // `ctx.storage.store` accepts that Blob directly.
      const blob = await req.blob();
      const storageId = await ctx.storage.store(blob);

      console.log("Stored file", storageId, "size:", blob.size);

      return new Response(
        JSON.stringify({ storageId, size: blob.size }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    } catch (error) {
      console.error("Upload failed:", error);
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  }),
});

// Test endpoint for probing the HTTP action *response* size limit
// (documented at 20 MiB): echoes the uploaded bytes straight back out.
http.route({
  path: "/echo",
  method: "POST",
  handler: httpAction(async (_ctx, req) => {
    const blob = await req.blob();
    console.log("Echoing back", blob.size, "bytes");
    return new Response(blob, {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    });
  }),
});

// Test endpoint for probing whether the request-size behavior differs
// for a less-streamable parsing path: `req.formData()` must buffer and
// parse multipart boundaries, vs. `req.blob()` which hands back raw bytes.
http.route({
  path: "/upload-form",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof Blob)) {
        return new Response(JSON.stringify({ error: "no file field" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      const storageId = await ctx.storage.store(file);
      console.log("Stored form file", storageId, "size:", file.size);
      return new Response(
        JSON.stringify({ storageId, size: file.size }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    } catch (error) {
      console.error("Form upload failed:", error);
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  }),
});

export default http;
