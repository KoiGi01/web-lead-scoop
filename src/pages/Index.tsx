// Landing page is served as static HTML at /landing.html
// This component only renders if the React SPA is somehow loaded for /
const Index = () => {
  window.location.replace('/landing.html');
  return null;
};

export default Index;
