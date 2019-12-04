// Get the url querystring variables 
function getUrlVars() {
  let vars = {};
  window.location.href.replace(/[?&]+([^=&]+)=([^&*#]*)/gi, function(m, key, value) {
      vars[key] = value;
  });
  return vars;
}

export {
  getUrlVars
};
