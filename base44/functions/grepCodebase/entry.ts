Deno.serve(async (req) => {
  const process = new Deno.Command("grep", {
    args: ["-rn", "Achievement", "pages", "components"],
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout, stderr } = await process.output();
  return Response.json({
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  });
});