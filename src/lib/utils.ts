// Get the url querystring variables
export function getUrlVars() {
  const url = new URL(window.location.href);
  const vars: { [key: string]: any } = {};
  for (const entry of url.searchParams.entries()) {
    vars[entry[0]] = entry[1];
  }

  return vars;
}
