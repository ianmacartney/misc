import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

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

export default http;
