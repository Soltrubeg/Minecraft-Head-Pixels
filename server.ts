import { decode } from "https://deno.land/x/pngs@0.1.1/mod.ts";

async function getFaceColors(uuid: string): Promise<string[]> {
  // fetch Mojang profile
  const profileRes = await fetch(
    `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
  );
  if (!profileRes.ok) throw new Error("Invalid UUID");
  const profile = await profileRes.json();
  const texturesValue = profile.properties.find((p: any) => p.name === "textures").value;
  const texturesJson = JSON.parse(atob(texturesValue));
  const skinUrl = texturesJson.textures.SKIN.url;
  const skinBytes = new Uint8Array(await fetch(skinUrl).then(r => r.arrayBuffer()));
  const decoded = decode(skinBytes)["image"];

 const width = 64;
const faceStartX = 8;
const faceStartY = 8;
const helmetStartX = 40;
const helmetStartY = 8;
const blockSize = 8;

const toHex = (v) => v.toString(16).padStart(2, "0");

const facePixels = [];
const helmetPixels = [];

for (let y = 0; y < blockSize; y++) {
  for (let x = 0; x < blockSize; x++) {
    let faceIdx = ((faceStartY + y) * width + (faceStartX + x)) * 4;
    const fr = decoded[faceIdx];
    const fg = decoded[faceIdx + 1];
    const fb = decoded[faceIdx + 2];
    const fa = decoded[faceIdx + 3];
    facePixels.push({ r: fr, g: fg, b: fb, a: fa });

    let helmetIdx = ((helmetStartY + y) * width + (helmetStartX + x)) * 4;
    const hr = decoded[helmetIdx];
    const hg = decoded[helmetIdx + 1];
    const hb = decoded[helmetIdx + 2];
    const ha = decoded[helmetIdx + 3];
    helmetPixels.push({ r: hr, g: hg, b: hb, a: ha });
  }
}

// Blend helmet over face
const finalPixelsHex = facePixels.map((facePixel, i) => {
  const helmetPixel = helmetPixels[i];

  if (helmetPixel.a === 255) {
    return `#${toHex(helmetPixel.r)}${toHex(helmetPixel.g)}${toHex(helmetPixel.b)}`;
  } else if (helmetPixel.a === 0) {
    return `#${toHex(facePixel.r)}${toHex(facePixel.g)}${toHex(facePixel.b)}`;
  } else {
    const alpha = helmetPixel.a / 255;
    const r = Math.round(helmetPixel.r * alpha + facePixel.r * (1 - alpha));
    const g = Math.round(helmetPixel.g * alpha + facePixel.g * (1 - alpha));
    const b = Math.round(helmetPixel.b * alpha + facePixel.b * (1 - alpha));
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
});

return finalPixelsHex

}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get("uuid");
    if (!uuid) {
      return new Response(JSON.stringify({ error: "Missing UUID" }), {
  status: 400,
  statusText: "Missing UUID",
  headers: { "content-type": "application/json" },
});

    }
    const colors = await getFaceColors(uuid);
    return new Response(JSON.stringify(colors), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
