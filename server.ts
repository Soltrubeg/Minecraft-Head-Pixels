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
  const decoded = decode(skinBytes);
  const { width, data } = decoded;
  const faceColors: string[] = [];
  for (let y = 8; y <= 15; y++) {
    for (let x = 8; x <= 15; x++) {
      const idx = (y * width + x) * 4;
      const r = decoded[idx];
      const g = decoded[idx + 1];
      const b = decoded[idx + 2];
      const a = decoded[idx + 3];
      faceColors.push([r,g,b].join(","));
    }
  }
  return faceColors;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get("uuid");
    if (!uuid) {
      return new Response(JSON.stringify({ error: "Missing uuid" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
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
