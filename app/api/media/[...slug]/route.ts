import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as fs from "fs";
import path from "path";

const MEDIA_DIRECTORY = path.resolve(process.cwd(), "public", "media");

function toWebStream(nodeStream: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk as Buffer));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
      return "audio/ogg";
    default:
      return "application/octet-stream";
  }
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;

  try {
    if (!slug || slug.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const resolvedPath = path.resolve(MEDIA_DIRECTORY, ...slug);
    const withinMediaDirectory =
      resolvedPath === MEDIA_DIRECTORY ||
      resolvedPath.startsWith(`${MEDIA_DIRECTORY}${path.sep}`);

    if (!withinMediaDirectory) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    await fs.promises.access(resolvedPath, fs.constants.R_OK);

    const mimeType = getMimeType(resolvedPath);
    const nodeStream = fs.createReadStream(resolvedPath);
    const webStream = toWebStream(nodeStream);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable", 
      },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && 
        ((error as { code: string }).code === 'ENOENT' || (error as { code: string }).code === 'EACCES')) {
        return new NextResponse("Media file not found or inaccessible", { status: 404 });
    }
    console.error("Error serving media:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
