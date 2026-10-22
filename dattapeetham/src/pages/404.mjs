import { btn, icon } from '../components.mjs';
import { links } from '../site.mjs';

export default {
  slug: '404',
  file: '404.html',
  title: 'Page not found',
  description: 'This path leads elsewhere. Return to Avadhoota Datta Peetham.',
  bodyClass: 'is-404',
  render: () => `
<section class="section section-dark notfound" style="min-height:78vh;display:flex;align-items:center;overflow:hidden">
  <svg class="mark-watermark" viewBox="0 0 104 104" aria-hidden="true"><use href="#i-mandala"/></svg>
  <canvas class="fx-canvas" data-constellation aria-hidden="true"></canvas>
  <div class="wrap" style="position:relative">
    <span class="eyebrow">404 · A different path</span>
    <h1 data-split style="max-width:14ch">This path leads <span class="em-light">elsewhere</span>.</h1>
    <p class="lead" data-reveal="up">The page you were looking for may have moved in our new website. Every road still leads to the Ashram.</p>
    <div class="btn-row" data-reveal="up" style="margin-top:28px">
      ${btn('Return to the Ashram', 'index.html', 'gold', 'arrow', ' data-magnetic')}
      <button class="btn btn-ghost" type="button" data-search-open>${icon('search', 16)}<span>Search the site</span></button>
    </div>
    <nav class="notfound-links" aria-label="Main destinations" data-reveal="up">
      <a href="darshan.html#timings">${icon('clock', 18)}<span>Temples &amp; Darshan</span></a>
      <a href="visit.html">${icon('pin', 18)}<span>Plan Your Visit</span></a>
      <a href="events.html">${icon('calendar', 18)}<span>Events &amp; Festivals</span></a>
      <a href="contact.html">${icon('phone', 18)}<span>Contact</span></a>
    </nav>
    <p class="notfound-note" data-reveal="up">Booking a puja, donating or signing in? Those pages are on the Peetham’s booking system: <a href="${links.poojas}">Book a Puja</a> · <a href="${links.donations}">Donate</a> · <a href="${links.login}">Sign in</a>.</p>
  </div>
</section>`,
};
