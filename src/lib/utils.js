// Get the url querystring variables 
function getUrlVars() {
  const url = new URL(window.location.href);
  let vars = {};
  for (const entry of url.searchParams.entries()) {
    vars[entry[0]] = entry[1];
  }

  return vars;
}

export {
  getUrlVars
};
