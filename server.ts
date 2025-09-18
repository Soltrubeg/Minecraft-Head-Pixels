import { decode } from "https://deno.land/x/pngs@0.1.1/mod.ts";

const width = 64, blockSize = 8;
const faceStartX = 8, faceStartY = 8;
const helmetStartX = 40, helmetStartY = 8;
const toHex = (v: number) => v.toString(16).padStart(2, "0");

async function getFaceColors(uuid: string): Promise<string[]> {
  const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
  if (!res.ok) throw new Error("Invalid UUID");
  const profile = await res.json();
  const texturesValue = profile.properties.find((p: any) => p.name === "textures").value;
  const texturesJson = JSON.parse(atob(texturesValue));
  const skinUrl = texturesJson.textures.SKIN.url;

  const bytes = new Uint8Array(await fetch(skinUrl).then(r => r.arrayBuffer()));
  const { image } = decode(bytes);

  const colors: string[] = [];
  for (let y = 0; y < blockSize; y++) {
    for (let x = 0; x < blockSize; x++) {
      const idx = ((y + faceStartY) * width + (x + faceStartX)) * 4;
      const fr = image[idx], fg = image[idx+1], fb = image[idx+2];
      const hidx = ((y + helmetStartY) * width + (x + helmetStartX)) * 4;
      const hr = image[hidx], hg = image[hidx+1], hb = image[hidx+2], ha = image[hidx+3];

      let r, g, b;
      if (ha === 255) { r = hr; g = hg; b = hb; }
      else if (ha === 0) { r = fr; g = fg; b = fb; }
      else {
        const a = ha / 255;
        r = Math.round(hr * a + fr * (1 - a));
        g = Math.round(hg * a + fg * (1 - a));
        b = Math.round(hb * a + fb * (1 - a));
      }
      colors.push(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
    }
  }
  return colors;
}

Deno.serve(async (req) => {
  try {
    const uuid = new URL(req.url).searchParams.get("uuid");
    if (!uuid) {
      return new Response(JSON.stringify({ error: "Missing UUID" }), {
        status: 400,
        statusText: "Missing UUID",
        headers: { "Content-Type": "application/json" },
      });
    }
    const colors = await getFaceColors(uuid);
    return new Response(JSON.stringify(colors), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
