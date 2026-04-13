(function () {
  var measurementId = 'G-Z2M2G8LL46';

  if (!measurementId || window.__uscAnalyticsLoaded) {
    return;
  }

  window.__uscAnalyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];

  function gtag() {
    window.dataLayer.push(arguments);
  }

  window.gtag = window.gtag || gtag;

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    page_path: window.location.pathname + window.location.hash,
    page_location: window.location.href,
    page_title: document.title,
  });

  function trackPageView() {
    window.gtag('event', 'page_view', {
      page_path: window.location.pathname + window.location.hash,
      page_location: window.location.href,
      page_title: document.title,
    });
  }

  window.trackPageView = trackPageView;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView, { once: true });
  } else {
    trackPageView();
  }

  window.addEventListener('hashchange', trackPageView);
})();